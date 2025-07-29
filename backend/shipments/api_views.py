# shipments/api_views.py
import logging
from rest_framework import viewsets, permissions, filters, status
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils import timezone

logger = logging.getLogger(__name__)

from .models import Shipment, ConsignmentItem, ShipmentFeedback
from .serializers import (
    ShipmentSerializer, ShipmentListSerializer, ConsignmentItemSerializer,
    ShipmentFeedbackSerializer, ShipmentFeedbackListSerializer, ManagerResponseSerializer,
    FeedbackAnalyticsSerializer, DeliverySuccessStatsSerializer
)
from .permissions import (
    IsAdminOrAssignedDepotUserForShipment, 
    CanManageConsignmentItems,
    CanModifyShipment
)
from .services import (
    get_shipments_for_user, 
    create_shipment_with_items, 
    update_shipment_details,
    update_shipment_status_service,
    search_shipments
)
from .incident_service import create_incident_for_feedback, update_incident_for_feedback_response
from notifications.feedback_notification_service import (
    notify_feedback_received, notify_manager_response, notify_incident_created, notify_driver_feedback
)
from erp_integration.feedback_webhook_service import (
    send_feedback_webhook, send_incident_webhook
)
from .safety_validation import ShipmentSafetyValidator, ShipmentPreValidationService
from shared.rate_limiting import ShipmentCreationRateThrottle, DangerousGoodsRateThrottle


class ShipmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for shipment management with role-based access control.
    Enhanced for Phase 2 with improved filtering and permissions.
    """
    permission_classes = [permissions.IsAuthenticated, CanModifyShipment]
    throttle_classes = [ShipmentCreationRateThrottle]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'status': ['exact', 'in'],
        'customer': ['exact'],
        'carrier': ['exact'],
        'created_at': ['date', 'year', 'month', 'day', 'gte', 'lte'],
        'estimated_pickup_date': ['date', 'gte', 'lte'],
        'estimated_delivery_date': ['date', 'gte', 'lte'],
        'reference_number': ['exact', 'icontains'],
        'tracking_number': ['exact'],
        'freight_type': ['exact'],
        'contract_type': ['exact'],
    }
    search_fields = [
        'tracking_number', 
        'reference_number', 
        'origin_location', 
        'destination_location',
        'customer__name',
        'carrier__name',
        'items__description'
    ]
    ordering_fields = [
        'created_at', 
        'status', 
        'estimated_pickup_date', 
        'estimated_delivery_date',
        'customer__name',
        'carrier__name'
    ]
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Use lightweight serializer for list actions, full serializer for detail actions."""
        if self.action == 'list':
            return ShipmentListSerializer
        return ShipmentSerializer

    def get_queryset(self):
        """Return role-based filtered shipments with optimized queries."""
        return get_shipments_for_user(self.request.user).prefetch_related(
            'items__dangerous_good_entry'
        )

    def perform_create(self, serializer):
        """Enhanced shipment creation with role-based and DG compatibility validation."""
        try:
            from .vehicle_compatibility_service import VehicleDGCompatibilityService
            
            # Auto-assign fields based on user context
            extra_fields = {}
            
            # Set requesting user if not provided
            if not serializer.validated_data.get('requested_by'):
                extra_fields['requested_by'] = self.request.user
            
            # For CUSTOMER users, ensure they can only create shipments for their company
            if self.request.user.role == 'CUSTOMER':
                if serializer.validated_data.get('customer') != self.request.user.company:
                    raise serializers.ValidationError({
                        "customer": "You can only create shipments for your own company."
                    })
            
            # Enhanced pre-creation validation for dangerous goods
            items_data = self.request.data.get('items', [])
            if items_data:
                dangerous_items = [item for item in items_data if item.get('is_dangerous_good', False)]
                
                if dangerous_items:
                    # Validate dangerous goods compatibility before creation
                    shipment_data = dict(serializer.validated_data)
                    pre_validation = VehicleDGCompatibilityService.validate_shipment_before_creation(
                        shipment_data, items_data
                    )
                    
                    # Check for critical dangerous goods issues
                    if not pre_validation['can_create']:
                        critical_issues = pre_validation.get('critical_issues', [])
                        dg_issues = pre_validation.get('dangerous_goods_issues', [])
                        all_issues = critical_issues + dg_issues
                        
                        raise serializers.ValidationError({
                            "dangerous_goods": f"Dangerous goods validation failed: {'; '.join(all_issues[:3])}"  # First 3 issues
                        })
                    
                    # Add validation metadata to extra fields for audit purposes
                    extra_fields['validation_metadata'] = {
                        'dg_validation_passed': pre_validation['can_create'],
                        'dg_count': len(dangerous_items),
                        'equipment_requirements': len(pre_validation.get('equipment_requirements', [])),
                        'compatible_vehicles_found': len(pre_validation.get('recommended_vehicles', []))
                    }
            
            serializer.save(**extra_fields)
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        except Exception as e:
            raise serializers.ValidationError({"detail": "An error occurred while creating the shipment."})


    def perform_update(self, serializer):
        """Enhanced shipment update with role-based validation."""
        try:
            serializer.save()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        except PermissionDenied as e:
            raise serializers.ValidationError({"detail": str(e)}, code=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            raise serializers.ValidationError({"detail": "An error occurred while updating the shipment."})

    @action(detail=True, methods=['get'], url_path='events')
    def get_events(self, request, pk=None):
        """Get shipment events/activity log - matches frontend mock API structure."""
        shipment = self.get_object()
        
        # Build events from various sources
        events = []
        
        # Status change events (from audit logs if available)
        try:
            from simple_history.models import HistoricalRecords
            if hasattr(shipment, 'history'):
                for record in shipment.history.all()[:10]:  # Last 10 changes
                    if record.history_type in ['+', '~']:  # Created or Changed
                        events.append({
                            'id': f"status-{record.history_id}",
                            'timestamp': record.history_date.isoformat(),
                            'user': {
                                'name': f"{record.history_user.first_name} {record.history_user.last_name}".strip() if record.history_user else "System",
                                'role': getattr(record.history_user, 'role', 'SYSTEM') if record.history_user else 'SYSTEM'
                            },
                            'event_type': 'STATUS_CHANGE',
                            'details': f"Shipment status changed to {record.status}"
                        })
        except:
            pass
        
        # Comments from shipment notes
        if hasattr(shipment, 'notes') and shipment.notes:
            events.append({
                'id': f"comment-{shipment.id}",
                'timestamp': shipment.updated_at.isoformat(),
                'user': {
                    'name': f"{shipment.requested_by.first_name} {shipment.requested_by.last_name}".strip() if shipment.requested_by else "Unknown",
                    'role': getattr(shipment.requested_by, 'role', 'USER') if shipment.requested_by else 'USER'
                },
                'event_type': 'COMMENT',
                'details': shipment.notes
            })
        
        # Inspection events
        try:
            from inspections.models import HazardInspection
            inspections = HazardInspection.objects.filter(
                shipment=shipment
            ).order_by('-created_at')[:5]
            
            for inspection in inspections:
                events.append({
                    'id': f"inspection-{inspection.id}",
                    'timestamp': inspection.created_at.isoformat(),
                    'user': {
                        'name': f"{inspection.inspector.first_name} {inspection.inspector.last_name}".strip() if inspection.inspector else "Inspector",
                        'role': getattr(inspection.inspector, 'role', 'INSPECTOR') if inspection.inspector else 'INSPECTOR'
                    },
                    'event_type': 'INSPECTION',
                    'details': f"{inspection.inspection_type} inspection completed. Status: {inspection.status}"
                })
        except:
            pass
        
        # Sort events by timestamp (newest first)
        events.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response(events)

    @action(detail=True, methods=['post'], url_path='add-event')
    def add_event(self, request, pk=None):
        """Add a new event/comment to shipment - matches frontend mock API structure."""
        shipment = self.get_object()
        
        event_type = request.data.get('event_type', 'COMMENT')
        details = request.data.get('details', '')
        
        if not details:
            return Response(
                {'error': 'details field is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the event
        new_event = {
            'id': f"comment-{timezone.now().timestamp()}",
            'timestamp': timezone.now().isoformat(),
            'user': {
                'name': f"{request.user.first_name} {request.user.last_name}".strip(),
                'role': getattr(request.user, 'role', 'USER')
            },
            'event_type': event_type,
            'details': details
        }
        
        # Store as shipment note (simplified for now)
        if not shipment.notes:
            shipment.notes = details
        else:
            shipment.notes = f"{shipment.notes}\n\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] {details}"
        
        shipment.save(update_fields=['notes', 'updated_at'])
        
        return Response(new_event, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='inspections')
    def get_shipment_inspections(self, request, pk=None):
        """Get inspections for this shipment - matches frontend mock API structure."""
        shipment = self.get_object()
        
        try:
            from inspections.models import Inspection
            inspections = Inspection.objects.filter(
                shipment=shipment
            ).select_related('inspector').prefetch_related('items__photos').order_by('-created_at')
            
            inspections_data = []
            for inspection in inspections:
                items_data = []
                for item in inspection.items.all():
                    photos = []
                    if hasattr(item, 'photos'):
                        photos = [photo.image.url for photo in item.photos.all() if photo.image]
                    
                    items_data.append({
                        'id': str(item.id),
                        'description': item.description,
                        'status': item.result,
                        'photos': photos,
                        'notes': item.notes or '',
                    })
                
                inspections_data.append({
                    'id': str(inspection.id),
                    'shipment_id': str(inspection.shipment.id),
                    'inspector': {
                        'name': f"{inspection.inspector.first_name} {inspection.inspector.last_name}".strip(),
                        'role': getattr(inspection.inspector, 'role', 'INSPECTOR')
                    },
                    'inspection_type': inspection.inspection_type,
                    'timestamp': inspection.created_at.isoformat(),
                    'status': inspection.status,
                    'items': items_data,
                })
            
            return Response(inspections_data)
            
        except ImportError:
            # Inspections app not available
            return Response([])
        except Exception as e:
            logger.error(f"Error getting inspections for shipment {shipment.id}: {str(e)}")
            return Response(
                {'error': 'An error occurred while retrieving inspections'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='inspections')
    def create_shipment_inspection(self, request, pk=None):
        """Create a new inspection for this shipment - matches frontend mock API structure."""
        shipment = self.get_object()
        
        inspection_type = request.data.get('inspection_type', 'PRE_TRIP')
        items = request.data.get('items', [])
        
        if not items:
            return Response(
                {'error': 'items field is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from inspections.models import Inspection, InspectionItem
            
            # Create inspection
            inspection = Inspection.objects.create(
                shipment=shipment,
                inspector=request.user,
                inspection_type=inspection_type,
                status='COMPLETED',
                overall_result='PASS',  # Will be calculated from items
                started_at=timezone.now(),
                completed_at=timezone.now()
            )
            
            # Create inspection items
            items_data = []
            for item_data in items:
                item = InspectionItem.objects.create(
                    inspection=inspection,
                    description=item_data.get('description', ''),
                    result=item_data.get('status', 'PASS'),
                    notes=item_data.get('notes', ''),
                    is_required=True
                )
                items_data.append({
                    'id': str(item.id),
                    'description': item.description,
                    'status': item.result,
                    'photos': [],  # No photos in this simplified version
                    'notes': item.notes,
                })
            
            # Calculate overall result
            has_failures = any(item.result == 'FAIL' for item in inspection.items.all())
            inspection.overall_result = 'FAIL' if has_failures else 'PASS'
            inspection.save()
            
            # Return response in expected format
            response_data = {
                'id': str(inspection.id),
                'shipment_id': str(inspection.shipment.id),
                'inspector': {
                    'name': f"{inspection.inspector.first_name} {inspection.inspector.last_name}".strip(),
                    'role': getattr(inspection.inspector, 'role', 'INSPECTOR')
                },
                'inspection_type': inspection.inspection_type,
                'timestamp': inspection.created_at.isoformat(),
                'status': inspection.status,
                'items': items_data,
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ImportError:
            # Inspections app not available
            return Response(
                {'error': 'Inspections functionality not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Error creating inspection for shipment {shipment.id}: {str(e)}")
            return Response(
                {'error': 'An error occurred while creating the inspection'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='submit-pod')
    def submit_pod(self, request, pk=None):
        """Enhanced proof of delivery submission with comprehensive processing."""
        shipment = self.get_object()
        
        # Import POD service
        from .pod_capture_service import PODCaptureService
        
        # Extract POD data from request
        pod_data = {
            'recipient_name': request.data.get('recipient_name') or request.data.get('recipient', ''),
            'signature_file': request.data.get('signature_file') or request.data.get('signature', ''),
            'delivery_notes': request.data.get('delivery_notes', ''),
            'delivery_location': request.data.get('delivery_location', ''),
            'photos_data': request.data.get('photos_data', request.data.get('photos', []))
        }
        
        # Validate POD data
        validation_result = PODCaptureService.validate_mobile_pod_data(pod_data)
        if not validation_result['is_valid']:
            return Response({
                'error': 'Invalid POD data',
                'validation_errors': validation_result['errors'],
                'validation_warnings': validation_result.get('warnings', [])
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Process POD submission
        result = PODCaptureService.submit_proof_of_delivery(
            shipment_id=str(shipment.id),
            driver_user=request.user,
            pod_data=pod_data
        )
        
        if not result['success']:
            return Response({
                'error': result['error'],
                'details': result.get('validation_details', {})
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Return enhanced POD response
        response_data = {
            'id': result['pod_id'],
            'shipment_id': str(shipment.id),
            'shipment_tracking': shipment.tracking_number,
            'status': 'COMPLETED',
            'delivered_at': result['delivered_at'],
            'driver': {
                'name': f"{request.user.first_name} {request.user.last_name}".strip(),
                'id': str(request.user.id)
            },
            'recipient': result['pod_summary']['recipient_name'],
            'photos_processed': result['photos_processed'],
            'signature_processed': result['signature_processed'],
            'delivery_location': result['pod_summary']['delivery_location'],
            'validation_warnings': validation_result.get('warnings', []),
            'processing_summary': {
                'total_photos': result['photos_processed'],
                'signature_captured': result['signature_processed'],
                'shipment_status_updated': True,
                'notifications_triggered': True
            }
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='pod-details')
    def get_pod_details(self, request, pk=None):
        """Get detailed POD information for a shipment."""
        shipment = self.get_object()
        
        try:
            from .pod_capture_service import PODCaptureService
            
            if not hasattr(shipment, 'proof_of_delivery'):
                return Response({
                    'has_pod': False,
                    'message': 'No proof of delivery found for this shipment'
                }, status=status.HTTP_404_NOT_FOUND)
            
            pod_result = PODCaptureService.get_pod_summary(str(shipment.proof_of_delivery.id))
            
            if not pod_result['success']:
                return Response({
                    'error': pod_result['error']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'has_pod': True,
                'pod_details': pod_result['pod']
            })
            
        except Exception as e:
            logger.error(f"Error getting POD details for shipment {shipment.id}: {str(e)}")
            return Response({
                'error': 'Failed to retrieve POD details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='validate-pod-data')
    def validate_pod_data(self, request, pk=None):
        """Validate POD data before submission (mobile app pre-validation)."""
        shipment = self.get_object()
        
        try:
            from .pod_capture_service import PODCaptureService
            
            # Extract POD data for validation
            pod_data = {
                'recipient_name': request.data.get('recipient_name', ''),
                'signature_file': request.data.get('signature_file', ''),
                'delivery_notes': request.data.get('delivery_notes', ''),
                'delivery_location': request.data.get('delivery_location', ''),
                'photos_data': request.data.get('photos_data', [])
            }
            
            # Validate shipment can accept POD
            shipment_validation = PODCaptureService._validate_pod_submission(shipment, request.user)
            
            # Validate POD data structure
            data_validation = PODCaptureService.validate_mobile_pod_data(pod_data)
            
            return Response({
                'can_submit_pod': shipment_validation['can_submit'],
                'shipment_validation': shipment_validation,
                'data_validation': data_validation,
                'overall_valid': shipment_validation['can_submit'] and data_validation['is_valid'],
                'recommendations': {
                    'required_fields': ['recipient_name', 'signature_file'],
                    'recommended_fields': ['delivery_location', 'photos_data'],
                    'max_photos': 10,
                    'supported_signature_formats': ['base64', 'data:image/png', 'data:image/jpeg']
                }
            })
            
        except Exception as e:
            logger.error(f"Error validating POD data for shipment {shipment.id}: {str(e)}")
            return Response({
                'error': 'POD validation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Custom endpoint for updating shipment status with role-based validation and POD support."""
        shipment = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {"detail": "Status field is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Handle POD data if status is DELIVERED
            if new_status == 'DELIVERED':
                pod_data = request.data.get('proof_of_delivery')
                if pod_data:
                    from .serializers import ProofOfDeliveryCreateSerializer
                    pod_data['shipment'] = shipment.id
                    pod_serializer = ProofOfDeliveryCreateSerializer(
                        data=pod_data, 
                        context={'request': request}
                    )
                    if pod_serializer.is_valid():
                        pod_serializer.save()
                    else:
                        return Response(
                            {"proof_of_delivery_errors": pod_serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            
            updated_shipment = update_shipment_status_service(
                shipment, new_status, request.user
            )
            
            # Set actual delivery date when delivered
            if new_status == 'DELIVERED':
                from django.utils import timezone
                updated_shipment.actual_delivery_date = timezone.now()
                updated_shipment.save()
            
            serializer = self.get_serializer(updated_shipment)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {"detail": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except PermissionDenied as e:
            return Response(
                {"detail": str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=True, methods=['post'], url_path='assign-driver')
    def assign_driver(self, request, pk=None):
        """
        Enhanced driver assignment with qualification validation.
        Validates driver qualifications for dangerous goods before assignment.
        """
        shipment = self.get_object()
        driver_id = request.data.get('driver_id')
        force_assignment = request.data.get('force_assignment', False)  # Allow override for warnings
        
        if not driver_id:
            return Response(
                {'error': 'driver_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            from .driver_qualification_service import ShipmentDriverQualificationService
            
            User = get_user_model()
            driver = User.objects.get(id=driver_id)
            
            # Validate driver role if available
            if hasattr(driver, 'role') and driver.role != 'DRIVER':
                return Response(
                    {'error': 'Selected user is not a driver'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Perform comprehensive driver qualification validation
            validation_result = ShipmentDriverQualificationService.validate_driver_for_shipment(
                driver, shipment
            )
            
            # Check if driver can be assigned based on validation results
            if not validation_result['overall_qualified']:
                return Response({
                    'error': 'Driver is not qualified for this shipment',
                    'qualification_validation': validation_result,
                    'can_force_assign': False,
                    'blocking_issues': validation_result['critical_issues']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If driver has warnings but is qualified, check force assignment
            if validation_result['warnings'] and not force_assignment:
                return Response({
                    'error': 'Driver has qualification warnings',
                    'qualification_validation': validation_result,
                    'can_force_assign': True,
                    'warnings': validation_result['warnings'],
                    'message': 'Driver is qualified but has warnings. Use force_assignment=true to proceed.'
                }, status=status.HTTP_409_CONFLICT)
            
            # Driver is qualified - proceed with assignment
            shipment.assigned_driver = driver
            shipment.save(update_fields=['assigned_driver', 'updated_at'])
            
            # Log successful assignment with qualification details
            logger.info(
                f"Driver {driver.get_full_name()} (ID: {driver.id}) assigned to shipment {shipment.id}. "
                f"Qualification level: {validation_result.get('qualification_level', 'UNKNOWN')}"
            )
            
            # Return updated shipment with qualification details
            serializer = self.get_serializer(shipment)
            response_data = serializer.data
            response_data['driver_qualification'] = validation_result
            
            return Response(response_data)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Driver not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error assigning driver to shipment {shipment.id}: {str(e)}")
            return Response(
                {'error': 'An error occurred while assigning the driver'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='qualified-drivers')
    def get_qualified_drivers(self, request, pk=None):
        """
        Get list of drivers qualified for this specific shipment.
        Analyzes dangerous goods and returns drivers with appropriate qualifications.
        """
        shipment = self.get_object()
        
        try:
            from .driver_qualification_service import ShipmentDriverQualificationService
            
            qualified_drivers = ShipmentDriverQualificationService.get_qualified_drivers_for_shipment(shipment)
            
            return Response({
                'shipment_id': shipment.id,
                'qualified_drivers': qualified_drivers,
                'total_qualified': len(qualified_drivers),
                'validation_summary': {
                    'has_dangerous_goods': shipment.items.filter(is_dangerous_good=True).exists(),
                    'dangerous_goods_classes': [
                        item.dangerous_good_entry.hazard_class.split('.')[0]
                        for item in shipment.items.filter(is_dangerous_good=True)
                        if item.dangerous_good_entry and item.dangerous_good_entry.hazard_class
                    ]
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting qualified drivers for shipment {shipment.id}: {str(e)}")
            return Response(
                {'error': 'Unable to retrieve qualified drivers'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='validate-driver')
    def validate_driver_qualification(self, request, pk=None):
        """
        Validate if a specific driver is qualified for this shipment.
        Returns detailed qualification analysis without assignment.
        """
        shipment = self.get_object()
        driver_id = request.data.get('driver_id')
        
        if not driver_id:
            return Response(
                {'error': 'driver_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            from .driver_qualification_service import ShipmentDriverQualificationService
            
            User = get_user_model()
            driver = User.objects.get(id=driver_id)
            
            # Validate driver role
            if hasattr(driver, 'role') and driver.role != 'DRIVER':
                return Response(
                    {'error': 'Selected user is not a driver'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Perform qualification validation
            validation_result = ShipmentDriverQualificationService.validate_driver_for_shipment(
                driver, shipment
            )
            
            # Add assignment recommendation
            can_assign, blocking_issues = ShipmentDriverQualificationService.can_driver_be_assigned(
                driver, shipment, strict_mode=False
            )
            
            validation_result['assignment_recommendation'] = {
                'can_assign': can_assign,
                'blocking_issues': blocking_issues,
                'recommended_action': 'ASSIGN' if can_assign else 'DO_NOT_ASSIGN'
            }
            
            return Response({
                'shipment_id': shipment.id,
                'driver_id': driver.id,
                'validation_result': validation_result
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Driver not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error validating driver {driver_id} for shipment {shipment.id}: {str(e)}")
            return Response(
                {'error': 'Unable to validate driver qualification'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='finalize-from-manifest')
    def finalize_from_manifest(self, request, pk=None):
        """
        Finalize shipment with confirmed dangerous goods from manifest validation.
        
        Expected payload:
        {
            "document_id": "uuid",
            "confirmed_dangerous_goods": [
                {
                    "un_number": "UN1090",
                    "description": "ACETONE", 
                    "quantity": 5,
                    "weight_kg": 25.0
                }
            ]
        }
        """
        from documents.models import Document, DocumentStatus
        from documents.services import create_shipment_from_confirmed_dgs
        from dangerous_goods.services import check_list_compatibility
        
        shipment = self.get_object()
        
        # Validate shipment is in correct status
        if shipment.status != shipment.ShipmentStatus.AWAITING_VALIDATION:
            return Response(
                {"error": "Shipment must be in AWAITING_VALIDATION status to finalize from manifest"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document_id = request.data.get('document_id')
        confirmed_dgs = request.data.get('confirmed_dangerous_goods', [])
        
        if not document_id:
            return Response(
                {"error": "document_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not confirmed_dgs:
            return Response(
                {"error": "At least one confirmed dangerous good is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get and validate document
            document = Document.objects.get(id=document_id, shipment=shipment)
            
            if document.status != DocumentStatus.VALIDATED_WITH_ERRORS:
                return Response(
                    {"error": "Document must be in VALIDATED_WITH_ERRORS status"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate confirmed dangerous goods format
            for dg in confirmed_dgs:
                required_fields = ['un_number', 'description', 'quantity', 'weight_kg']
                missing_fields = [field for field in required_fields if field not in dg]
                if missing_fields:
                    return Response(
                        {"error": f"Missing required fields in dangerous goods: {missing_fields}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Check compatibility of confirmed dangerous goods
            un_numbers = [dg['un_number'] for dg in confirmed_dgs]
            compatibility_result = check_list_compatibility(un_numbers)
            
            if not compatibility_result['is_compatible']:
                return Response({
                    "error": "Confirmed dangerous goods are not compatible for transport",
                    "compatibility_result": compatibility_result
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create consignment items from confirmed DGs
            created_items = create_shipment_from_confirmed_dgs(
                shipment, confirmed_dgs, request.user
            )
            
            # Update document status to indicate completion
            document.status = DocumentStatus.VALIDATED_OK
            validation_results = document.validation_results or {}
            validation_results.update({
                'finalized_at': timezone.now().isoformat(),
                'finalized_by': request.user.id,
                'confirmed_dangerous_goods': confirmed_dgs,
                'created_items_count': len(created_items),
                'compatibility_check': compatibility_result
            })
            document.validation_results = validation_results
            document.save()
            
            # Refresh shipment to get updated data
            shipment.refresh_from_db()
            
            # Generate required documents (placeholder for now)
            generated_docs = self._generate_transport_documents(shipment, created_items)
            
            serializer = self.get_serializer(shipment)
            
            return Response({
                "message": f"Shipment finalized with {len(created_items)} dangerous goods items",
                "shipment": serializer.data,
                "created_items_count": len(created_items),
                "compatibility_status": "compatible",
                "generated_documents": generated_docs,
                "document_status": document.status
            }, status=status.HTTP_200_OK)
            
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found or not associated with this shipment"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error finalizing shipment {shipment.id} from manifest: {str(e)}")
            return Response(
                {"error": "An error occurred while finalizing the shipment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_transport_documents(self, shipment, dangerous_items):
        """
        Generate required transport documents for dangerous goods shipment.
        This is a placeholder implementation - in production this would generate
        actual PDF documents.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            generated_docs = []
            
            if dangerous_items:
                # DG Transport Document
                dg_doc = {
                    "type": "DG_TRANSPORT_DOCUMENT",
                    "name": f"DG Transport Document - {shipment.tracking_number}",
                    "description": "Dangerous Goods Transport Document with item details and compliance information",
                    "items_included": len(dangerous_items),
                    "status": "generated"
                }
                generated_docs.append(dg_doc)
                
                # Compatibility Report
                compat_doc = {
                    "type": "COMPATIBILITY_REPORT", 
                    "name": f"Compatibility Report - {shipment.tracking_number}",
                    "description": "Dangerous goods compatibility analysis report",
                    "items_analyzed": len(dangerous_items),
                    "status": "generated"
                }
                generated_docs.append(compat_doc)
                
                logger.info(f"Generated {len(generated_docs)} documents for shipment {shipment.id}")
            
            return generated_docs
            
        except Exception as e:
            logger.error(f"Failed to generate transport documents: {str(e)}")
            return []

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """Enhanced search endpoint with multiple filter criteria."""
        search_params = {
            'tracking_number': request.query_params.get('tracking_number'),
            'reference_number': request.query_params.get('reference_number'),
            'status': request.query_params.getlist('status'),
            'customer_id': request.query_params.get('customer_id'),
            'carrier_id': request.query_params.get('carrier_id'),
            'has_dangerous_goods': request.query_params.get('has_dangerous_goods'),
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
        }
        
        # Remove None values
        search_params = {k: v for k, v in search_params.items() if v is not None}
        
        # Convert string boolean to actual boolean
        if 'has_dangerous_goods' in search_params:
            search_params['has_dangerous_goods'] = search_params['has_dangerous_goods'].lower() == 'true'
        
        try:
            queryset = search_shipments(request.user, search_params)
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = ShipmentListSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = ShipmentListSerializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": "An error occurred during search."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='my-shipments', permission_classes=[permissions.IsAuthenticated])
    def my_shipments(self, request):
        """
        Driver endpoint to get only shipments assigned to the authenticated driver.
        Restricted to users with DRIVER role.
        """
        # Check if user is a driver
        if request.user.role != 'DRIVER':
            return Response(
                {"detail": "This endpoint is only accessible to drivers."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get shipments assigned to this driver
            queryset = Shipment.objects.filter(
                assigned_driver=request.user
            ).select_related(
                'customer',
                'carrier', 
                'assigned_vehicle',
                'freight_type'
            ).prefetch_related(
                'consignment_items'
            ).order_by('-created_at')
            
            # Filter by status if provided
            status_filter = request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            # Paginate results
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = ShipmentListSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = ShipmentListSerializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error getting driver shipments for {request.user.email}: {str(e)}")
            return Response(
                {"detail": "An error occurred while retrieving your shipments."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='generate-report')
    def generate_report(self, request, pk=None):
        """
        Generate comprehensive shipment report PDF
        """
        from django.http import HttpResponse
        from documents.pdf_generators import generate_shipment_report
        from audits.signals import log_custom_action
        from audits.models import AuditActionType
        
        shipment = self.get_object()
        
        # Check if user has permission to generate reports
        if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'DISPATCHER']:
            # Regular users can only generate reports for their own shipments
            if (shipment.requested_by != request.user and 
                shipment.assigned_driver != request.user):
                return Response(
                    {"detail": "You don't have permission to generate reports for this shipment."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            # Check if audit trail should be included
            include_audit = request.query_params.get('include_audit', 'true').lower() == 'true'
            
            # Generate PDF
            pdf_bytes = generate_shipment_report(shipment, include_audit_trail=include_audit)
            
            # Log the report generation
            log_custom_action(
                action_type=AuditActionType.EXPORT,
                description=f"Generated shipment report for {shipment.tracking_number}",
                content_object=shipment,
                request=request,
                metadata={'include_audit_trail': include_audit}
            )
            
            # Create HTTP response with PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="shipment_report_{shipment.tracking_number}.pdf"'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating shipment report for {shipment.id}: {str(e)}")
            return Response(
                {"detail": "An error occurred while generating the report."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='generate-compliance-certificate')
    def generate_compliance_certificate(self, request, pk=None):
        """
        Generate dangerous goods compliance certificate PDF
        """
        from django.http import HttpResponse
        from documents.pdf_generators import generate_compliance_certificate
        from audits.signals import log_custom_action
        from audits.models import AuditActionType
        
        shipment = self.get_object()
        
        # Check if user has permission to generate compliance certificates
        if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER']:
            return Response(
                {"detail": "Only compliance officers and admins can generate compliance certificates."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if shipment has dangerous goods
        if not shipment.items.filter(is_dangerous_good=True).exists():
            return Response(
                {"detail": "This shipment does not contain dangerous goods."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate PDF
            pdf_bytes = generate_compliance_certificate(shipment)
            
            # Log the certificate generation
            log_custom_action(
                action_type=AuditActionType.EXPORT,
                description=f"Generated compliance certificate for {shipment.tracking_number}",
                content_object=shipment,
                request=request
            )
            
            # Create HTTP response with PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="compliance_cert_{shipment.tracking_number}.pdf"'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating compliance certificate for {shipment.id}: {str(e)}")
            return Response(
                {"detail": "An error occurred while generating the compliance certificate."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='generate-dg-manifest')
    def generate_dg_manifest(self, request, pk=None):
        """
        Generate dangerous goods manifest PDF
        """
        from django.http import HttpResponse
        from documents.pdf_generators import generate_dg_manifest
        from audits.signals import log_custom_action
        from audits.models import AuditActionType
        
        shipment = self.get_object()
        
        # Check if user has permission to generate manifests
        if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'DISPATCHER']:
            return Response(
                {"detail": "You don't have permission to generate dangerous goods manifests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if shipment has dangerous goods
        if not shipment.items.filter(is_dangerous_good=True).exists():
            return Response(
                {"detail": "This shipment does not contain dangerous goods."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate PDF
            pdf_bytes = generate_dg_manifest(shipment)
            
            # Log the manifest generation
            log_custom_action(
                action_type=AuditActionType.EXPORT,
                description=f"Generated DG manifest for {shipment.tracking_number}",
                content_object=shipment,
                request=request
            )
            
            # Create HTTP response with PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="dg_manifest_{shipment.tracking_number}.pdf"'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating DG manifest for {shipment.id}: {str(e)}")
            return Response(
                {"detail": "An error occurred while generating the dangerous goods manifest."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='generate-consolidated-report')
    def generate_consolidated_report(self, request, pk=None):
        """
        Generate consolidated PDF report combining manifest, compliance certificate, 
        compatibility report, SDS, and emergency procedures into a single document
        """
        from django.http import HttpResponse
        from documents.services import generate_consolidated_report
        from audits.signals import log_custom_action
        from audits.models import AuditActionType
        
        shipment = self.get_object()
        
        # Check if user has permission to generate reports
        if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'DISPATCHER']:
            # Regular users can only generate reports for their own shipments
            if (shipment.requested_by != request.user and 
                shipment.assigned_driver != request.user):
                return Response(
                    {"detail": "You don't have permission to generate consolidated reports for this shipment."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            # Check which sections to include (optional query parameters)
            include_sections = {
                'shipment_report': request.query_params.get('include_shipment_report', 'true').lower() == 'true',
                'manifest': request.query_params.get('include_manifest', 'true').lower() == 'true',
                'compliance_certificate': request.query_params.get('include_compliance', 'true').lower() == 'true',
                'compatibility_report': request.query_params.get('include_compatibility', 'true').lower() == 'true',
                'sds_documents': request.query_params.get('include_sds', 'true').lower() == 'true',
                'emergency_procedures': request.query_params.get('include_epg', 'true').lower() == 'true',
            }
            
            # Generate consolidated PDF
            pdf_bytes = generate_consolidated_report(shipment, include_sections)
            
            # Log the report generation
            log_custom_action(
                action_type=AuditActionType.EXPORT,
                description=f"Generated consolidated transport report for {shipment.tracking_number}",
                content_object=shipment,
                request=request,
                metadata={
                    'report_type': 'consolidated',
                    'sections_included': [k for k, v in include_sections.items() if v]
                }
            )
            
            # Create HTTP response with PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="consolidated_report_{shipment.tracking_number}.pdf"'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating consolidated report for {shipment.id}: {str(e)}")
            return Response(
                {"detail": "An error occurred while generating the consolidated report."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='generate-batch-documents')
    def generate_batch_documents(self, request, pk=None):
        """
        Generate multiple documents for a shipment in a ZIP file
        """
        from django.http import HttpResponse
        from documents.pdf_generators import BatchReportGenerator
        from audits.signals import log_custom_action
        from audits.models import AuditActionType
        import zipfile
        import io
        
        shipment = self.get_object()
        
        # Check permissions
        if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'DISPATCHER']:
            return Response(
                {"detail": "You don't have permission to generate batch documents."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get requested document types
        document_types = request.data.get('document_types', ['shipment_report'])
        valid_types = ['shipment_report', 'compliance_certificate', 'dg_manifest']
        
        # Validate document types
        invalid_types = [dt for dt in document_types if dt not in valid_types]
        if invalid_types:
            return Response(
                {"detail": f"Invalid document types: {invalid_types}. Valid types: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if dangerous goods are required for certain document types
        has_dangerous_goods = shipment.items.filter(is_dangerous_good=True).exists()
        if not has_dangerous_goods and ('compliance_certificate' in document_types or 'dg_manifest' in document_types):
            return Response(
                {"detail": "This shipment does not contain dangerous goods. Cannot generate compliance certificate or DG manifest."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate documents
            batch_generator = BatchReportGenerator()
            reports = batch_generator.generate_batch_reports([shipment], document_types)
            
            if not reports:
                return Response(
                    {"detail": "No documents were generated."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Create ZIP file
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for filename, pdf_bytes in reports.items():
                    zip_file.writestr(filename, pdf_bytes)
            
            zip_buffer.seek(0)
            zip_bytes = zip_buffer.getvalue()
            
            # Log the batch generation
            log_custom_action(
                action_type=AuditActionType.EXPORT,
                description=f"Generated batch documents for {shipment.tracking_number}: {', '.join(document_types)}",
                content_object=shipment,
                request=request,
                metadata={'document_types': document_types, 'files_count': len(reports)}
            )
            
            # Create HTTP response with ZIP
            response = HttpResponse(zip_bytes, content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="shipment_documents_{shipment.tracking_number}.zip"'
            response['Content-Length'] = len(zip_bytes)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating batch documents for {shipment.id}: {str(e)}")
            return Response(
                {"detail": "An error occurred while generating the batch documents."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='safety-validation')
    def safety_validation(self, request, pk=None):
        """
        Validate shipment safety compliance including vehicle equipment and dangerous goods.
        
        Query parameters:
        - vehicle_id: UUID of vehicle to validate against (optional)
        """
        shipment = self.get_object()
        vehicle_id = request.query_params.get('vehicle_id')
        vehicle = None
        
        if vehicle_id:
            try:
                from vehicles.models import Vehicle
                vehicle = Vehicle.objects.get(id=vehicle_id)
            except Vehicle.DoesNotExist:
                return Response(
                    {"error": "Vehicle not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        try:
            validation_result = ShipmentSafetyValidator.validate_shipment_safety_compliance(
                shipment, vehicle
            )
            
            return Response(validation_result)
            
        except Exception as e:
            logger.error(f"Error validating shipment safety for {shipment.id}: {str(e)}")
            return Response(
                {"error": "An error occurred during safety validation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='compliant-vehicles')
    def compliant_vehicles(self, request, pk=None):
        """
        Get list of vehicles that are compliant for this shipment.
        
        Query parameters:
        - status: Filter vehicles by status (default: AVAILABLE)
        - depot: Filter vehicles by depot
        """
        shipment = self.get_object()
        
        try:
            from vehicles.models import Vehicle
            from .vehicle_compatibility_service import VehicleDGCompatibilityService
            
            # Get available vehicles with optional filtering
            vehicles_qs = Vehicle.objects.select_related('owning_company').prefetch_related(
                'safety_equipment__equipment_type'
            )
            
            vehicle_status = request.query_params.get('status', ['AVAILABLE', 'MAINTENANCE'])
            if isinstance(vehicle_status, str):
                vehicle_status = [vehicle_status]
            vehicles_qs = vehicles_qs.filter(status__in=vehicle_status)
            
            depot = request.query_params.get('depot')
            if depot:
                vehicles_qs = vehicles_qs.filter(assigned_depot=depot)
            
            # Query parameters for compatibility checking
            include_warnings = request.query_params.get('include_warnings', 'true').lower() == 'true'
            sort_by_score = request.query_params.get('sort_by_score', 'true').lower() == 'true'
            
            # Enhanced compatibility checking with new service
            compatible_vehicles = VehicleDGCompatibilityService.get_compatible_vehicles_for_shipment(
                shipment, vehicles_qs, include_warnings=include_warnings
            )
            
            # Legacy compatibility check for comparison
            legacy_compliant = ShipmentSafetyValidator.get_compliant_vehicles_for_shipment(
                shipment, vehicles_qs
            )
            
            # Add dangerous goods analysis for context
            dangerous_items = shipment.items.filter(is_dangerous_good=True)
            dg_analysis = {}
            if dangerous_items.exists():
                dg_analysis = VehicleDGCompatibilityService._analyze_dangerous_goods(dangerous_items)
            
            return Response({
                'shipment_id': str(shipment.id),
                'tracking_number': shipment.tracking_number,
                'dangerous_goods_analysis': dg_analysis,
                'compatibility_results': {
                    'enhanced_compatible_vehicles': compatible_vehicles,
                    'legacy_compliant_vehicles': legacy_compliant,
                    'total_vehicles_checked': vehicles_qs.count(),
                    'enhanced_compatible_count': len(compatible_vehicles),
                    'legacy_compliant_count': len(legacy_compliant)
                },
                'query_parameters': {
                    'status_filter': vehicle_status,
                    'depot_filter': depot,
                    'include_warnings': include_warnings,
                    'sort_by_score': sort_by_score
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting compliant vehicles for shipment {shipment.id}: {str(e)}")
            return Response(
                {"error": "An error occurred while finding compliant vehicles"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='assign-vehicle')
    def assign_vehicle(self, request, pk=None):
        """
        Assign a vehicle to the shipment with safety validation.
        
        Expected payload:
        {
            "vehicle_id": "uuid",
            "override_warnings": false
        }
        """
        shipment = self.get_object()
        vehicle_id = request.data.get('vehicle_id')
        override_warnings = request.data.get('override_warnings', False)
        
        if not vehicle_id:
            return Response(
                {"error": "vehicle_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from vehicles.models import Vehicle
            from .vehicle_compatibility_service import VehicleDGCompatibilityService
            
            vehicle = Vehicle.objects.get(id=vehicle_id)
            
            # Enhanced validation with new VehicleDGCompatibilityService
            compatibility_result = VehicleDGCompatibilityService.validate_vehicle_for_shipment(
                vehicle, shipment, strict_mode=not override_warnings
            )
            
            # Legacy validation as backup (maintain existing behavior)
            legacy_validation = ShipmentSafetyValidator.validate_vehicle_assignment(
                shipment, vehicle
            )
            
            # Combine validation results for comprehensive response
            combined_validation = {
                'enhanced_compatibility': compatibility_result,
                'legacy_validation': legacy_validation,
                'can_assign': compatibility_result['is_compatible'] and legacy_validation['can_assign'],
                'compatibility_level': compatibility_result['compatibility_level'],
                'validation_type': compatibility_result['validation_type']
            }
            
            # Check if vehicle cannot be assigned due to critical issues
            if not compatibility_result['is_compatible']:
                return Response({
                    "error": "Vehicle is not compatible with this shipment",
                    "compatibility_level": compatibility_result['compatibility_level'],
                    "critical_issues": compatibility_result['critical_issues'],
                    "missing_equipment": compatibility_result['missing_equipment'],
                    "expired_equipment": compatibility_result['expired_equipment'],
                    "recommendations": compatibility_result['recommendations'],
                    "validation_details": combined_validation
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for warnings that may require override
            if compatibility_result['warnings'] and not override_warnings:
                return Response({
                    "warning": "Vehicle is compatible but has warnings",
                    "compatibility_level": compatibility_result['compatibility_level'],
                    "warnings": compatibility_result['warnings'],
                    "dangerous_goods_analysis": compatibility_result.get('dangerous_goods_analysis', {}),
                    "equipment_status": compatibility_result.get('equipment_status', {}),
                    "recommendations": compatibility_result['recommendations'],
                    "can_override": True,
                    "message": "Set override_warnings=true to proceed with assignment despite warnings"
                }, status=status.HTTP_200_OK)
            
            # Assign vehicle to shipment
            shipment.assigned_vehicle = vehicle
            shipment.save()
            
            # Log the assignment
            from audits.signals import log_custom_action
            from audits.models import AuditActionType
            
            log_custom_action(
                action_type=AuditActionType.UPDATE,
                description=f"Assigned vehicle {vehicle.registration_number} to shipment {shipment.tracking_number}",
                content_object=shipment,
                request=request,
                metadata={
                    'vehicle_id': str(vehicle.id),
                    'vehicle_registration': vehicle.registration_number,
                    'compatibility_level': compatibility_result['compatibility_level'],
                    'validation_type': compatibility_result['validation_type'],
                    'warnings_overridden': override_warnings and len(compatibility_result['warnings']) > 0,
                    'equipment_compliance_percentage': compatibility_result.get('equipment_status', {}).get('compliance_percentage', 0)
                }
            )
            
            serializer = self.get_serializer(shipment)
            return Response({
                "message": f"Vehicle {vehicle.registration_number} successfully assigned to shipment",
                "shipment": serializer.data,
                "assignment_success": True,
                "compatibility_summary": {
                    "level": compatibility_result['compatibility_level'],
                    "validation_type": compatibility_result['validation_type'],
                    "warnings_count": len(compatibility_result['warnings']),
                    "recommendations": compatibility_result['recommendations'][:3]  # Top 3 recommendations
                },
                "validation_details": combined_validation
            })
            
        except Vehicle.DoesNotExist:
            return Response(
                {"error": "Vehicle not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error assigning vehicle to shipment {shipment.id}: {str(e)}")
            return Response(
                {"error": "An error occurred while assigning the vehicle"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='pre-validate')
    def pre_validate(self, request):
        """
        Pre-validate shipment data before creation.
        
        Expected payload:
        {
            "shipment_data": {...},
            "items_data": [...],
            "vehicle_id": "uuid" (optional)
        }
        """
        shipment_data = request.data.get('shipment_data', {})
        items_data = request.data.get('items_data', [])
        vehicle_id = request.data.get('vehicle_id')
        
        if not shipment_data:
            return Response(
                {"error": "shipment_data is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not items_data:
            return Response(
                {"error": "items_data is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .vehicle_compatibility_service import VehicleDGCompatibilityService
            
            # Enhanced pre-validation with new compatibility service
            enhanced_validation = VehicleDGCompatibilityService.validate_shipment_before_creation(
                shipment_data, items_data
            )
            
            # Legacy validation for comparison
            legacy_validation = ShipmentPreValidationService.validate_shipment_creation(
                shipment_data, items_data, vehicle_id
            )
            
            # Combine both validation results
            combined_result = {
                'enhanced_validation': enhanced_validation,
                'legacy_validation': legacy_validation,
                'overall_can_create': enhanced_validation['can_create'] and legacy_validation['can_create'],
                'validation_summary': {
                    'dangerous_goods_count': len([item for item in items_data if item.get('is_dangerous_good', False)]),
                    'total_items': len(items_data),
                    'has_compatibility_issues': bool(enhanced_validation['dangerous_goods_issues']),
                    'has_vehicle_recommendations': bool(enhanced_validation['recommended_vehicles']),
                    'equipment_requirements_count': len(enhanced_validation['equipment_requirements'])
                },
                'recommendations': {
                    'compatible_vehicles': enhanced_validation['recommended_vehicles'][:3],  # Top 3
                    'required_equipment': enhanced_validation['equipment_requirements'],
                    'capacity_warnings': enhanced_validation['capacity_warnings']
                }
            }
            
            return Response(combined_result)
            
        except Exception as e:
            logger.error(f"Error pre-validating shipment: {str(e)}")
            return Response(
                {"error": "An error occurred during pre-validation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='validate-vehicle-compatibility')
    def validate_vehicle_compatibility(self, request, pk=None):
        """
        Detailed vehicle compatibility validation for a specific vehicle and shipment.
        
        Expected payload:
        {
            "vehicle_id": "uuid",
            "strict_mode": false,
            "include_recommendations": true
        }
        """
        shipment = self.get_object()
        vehicle_id = request.data.get('vehicle_id')
        strict_mode = request.data.get('strict_mode', False)
        include_recommendations = request.data.get('include_recommendations', True)

        if not vehicle_id:
            return Response(
                {"error": "vehicle_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from vehicles.models import Vehicle
            from .vehicle_compatibility_service import VehicleDGCompatibilityService

            vehicle = Vehicle.objects.select_related('owning_company').prefetch_related(
                'safety_equipment__equipment_type'
            ).get(id=vehicle_id)

            # Comprehensive compatibility validation
            compatibility_result = VehicleDGCompatibilityService.validate_vehicle_for_shipment(
                vehicle, shipment, strict_mode=strict_mode
            )

            # Calculate compatibility score for ranking
            compatibility_score = VehicleDGCompatibilityService._calculate_compatibility_score(compatibility_result)

            # Response structure
            response_data = {
                'shipment_id': str(shipment.id),
                'vehicle_id': str(vehicle.id),
                'vehicle_registration': vehicle.registration_number,
                'compatibility_analysis': compatibility_result,
                'compatibility_score': compatibility_score,
                'assignment_recommendation': {
                    'can_assign': compatibility_result['is_compatible'],
                    'confidence_level': 'HIGH' if compatibility_score >= 90 else 'MEDIUM' if compatibility_score >= 70 else 'LOW',
                    'risk_level': 'LOW' if not compatibility_result['critical_issues'] else 'HIGH',
                    'action': 'ASSIGN' if compatibility_result['is_compatible'] else 'DO_NOT_ASSIGN'
                }
            }

            # Add additional analysis if requested
            if include_recommendations:
                response_data['detailed_analysis'] = {
                    'dangerous_goods_summary': compatibility_result.get('dangerous_goods_analysis', {}),
                    'equipment_compliance_breakdown': compatibility_result.get('equipment_status', {}),
                    'capacity_utilization': compatibility_result.get('capacity_analysis', {}),
                    'improvement_recommendations': compatibility_result.get('recommendations', [])
                }

            return Response(response_data)

        except Vehicle.DoesNotExist:
            return Response(
                {"error": "Vehicle not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error validating vehicle compatibility for shipment {shipment.id}, vehicle {vehicle_id}: {str(e)}")
            return Response(
                {"error": "An error occurred during vehicle compatibility validation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='feedback-analytics')
    def feedback_analytics(self, request):
        """
        Get customer feedback analytics for delivered shipments.
        Provides Delivery Success Score and feedback trends for management dashboard.
        
        Query parameters:
        - period: 'week', 'month', 'quarter', 'year' (default: 'month')
        - start_date: Start date for custom period (YYYY-MM-DD)
        - end_date: End date for custom period (YYYY-MM-DD)
        """
        from django.db.models import Avg, Count, Q
        from datetime import datetime, timedelta
        from django.utils import timezone
        from .models import ShipmentFeedback
        
        # Check permission - only managers and admins can access analytics
        if request.user.role not in ['ADMIN', 'MANAGER', 'DISPATCHER', 'COMPLIANCE_OFFICER']:
            return Response(
                {"detail": "You don't have permission to access feedback analytics."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get period parameters
            period = request.query_params.get('period', 'month')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            # Calculate date range
            end_date = timezone.now()
            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(tzinfo=timezone.get_current_timezone())
            
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.get_current_timezone())
            else:
                # Calculate start date based on period
                if period == 'week':
                    start_date = end_date - timedelta(days=7)
                elif period == 'month':
                    start_date = end_date - timedelta(days=30)
                elif period == 'quarter':
                    start_date = end_date - timedelta(days=90)
                elif period == 'year':
                    start_date = end_date - timedelta(days=365)
                else:
                    start_date = end_date - timedelta(days=30)  # Default to month
            
            # Get company-filtered feedback
            feedback_queryset = ShipmentFeedback.objects.filter(
                submitted_at__gte=start_date,
                submitted_at__lte=end_date
            )
            
            # Apply company filtering based on user role
            if request.user.role == 'CUSTOMER':
                feedback_queryset = feedback_queryset.filter(
                    shipment__customer=request.user.company
                )
            elif request.user.role in ['CARRIER', 'DRIVER']:
                feedback_queryset = feedback_queryset.filter(
                    shipment__carrier=request.user.company
                )
            # ADMIN, MANAGER, DISPATCHER, COMPLIANCE_OFFICER can see all feedback
            
            # Calculate overall metrics
            total_feedback = feedback_queryset.count()
            
            if total_feedback == 0:
                return Response({
                    'period': period,
                    'start_date': start_date.date().isoformat(),
                    'end_date': end_date.date().isoformat(),
                    'total_feedback_count': 0,
                    'delivery_success_score': 0,
                    'feedback_breakdown': {
                        'on_time': {'percentage': 0, 'count': 0},
                        'complete_undamaged': {'percentage': 0, 'count': 0},
                        'driver_professional': {'percentage': 0, 'count': 0}
                    },
                    'feedback_summary_distribution': {
                        'excellent': 0,
                        'good': 0,
                        'fair': 0,
                        'poor': 0
                    },
                    'trends': [],
                    'message': 'No feedback data available for the selected period'
                })
            
            # Calculate individual question metrics
            on_time_positive = feedback_queryset.filter(was_on_time=True).count()
            complete_undamaged_positive = feedback_queryset.filter(was_complete_and_undamaged=True).count()
            driver_professional_positive = feedback_queryset.filter(was_driver_professional=True).count()
            
            # Calculate delivery success score (average of all three questions)
            all_scores = []
            for feedback in feedback_queryset:
                score = feedback.delivery_success_score
                all_scores.append(score)
            
            delivery_success_score = sum(all_scores) / len(all_scores) if all_scores else 0
            
            # Calculate feedback summary distribution
            summary_counts = {'excellent': 0, 'good': 0, 'fair': 0, 'poor': 0}
            for feedback in feedback_queryset:
                summary = feedback.get_feedback_summary().lower()
                if summary in summary_counts:
                    summary_counts[summary] += 1
            
            # Calculate daily/weekly trends for the period
            trends = []
            if period in ['week', 'month']:
                # Daily trends
                current_date = start_date.date()
                while current_date <= end_date.date():
                    day_feedback = feedback_queryset.filter(
                        submitted_at__date=current_date
                    )
                    day_count = day_feedback.count()
                    day_score = 0
                    if day_count > 0:
                        day_scores = [f.delivery_success_score for f in day_feedback]
                        day_score = sum(day_scores) / len(day_scores)
                    
                    trends.append({
                        'date': current_date.isoformat(),
                        'feedback_count': day_count,
                        'success_score': round(day_score, 1)
                    })
                    current_date += timedelta(days=1)
            else:
                # Weekly trends for quarter/year
                current_date = start_date.date()
                while current_date <= end_date.date():
                    week_end = min(current_date + timedelta(days=6), end_date.date())
                    week_feedback = feedback_queryset.filter(
                        submitted_at__date__gte=current_date,
                        submitted_at__date__lte=week_end
                    )
                    week_count = week_feedback.count()
                    week_score = 0
                    if week_count > 0:
                        week_scores = [f.delivery_success_score for f in week_feedback]
                        week_score = sum(week_scores) / len(week_scores)
                    
                    trends.append({
                        'week_start': current_date.isoformat(),
                        'week_end': week_end.isoformat(),
                        'feedback_count': week_count,
                        'success_score': round(week_score, 1)
                    })
                    current_date += timedelta(days=7)
            
            return Response({
                'period': period,
                'start_date': start_date.date().isoformat(),
                'end_date': end_date.date().isoformat(),
                'total_feedback_count': total_feedback,
                'delivery_success_score': round(delivery_success_score, 1),
                'feedback_breakdown': {
                    'on_time': {
                        'percentage': round((on_time_positive / total_feedback) * 100, 1),
                        'count': on_time_positive
                    },
                    'complete_undamaged': {
                        'percentage': round((complete_undamaged_positive / total_feedback) * 100, 1),
                        'count': complete_undamaged_positive
                    },
                    'driver_professional': {
                        'percentage': round((driver_professional_positive / total_feedback) * 100, 1),
                        'count': driver_professional_positive
                    }
                },
                'feedback_summary_distribution': summary_counts,
                'trends': trends,
                'top_feedback_notes': self._get_recent_feedback_notes(feedback_queryset)
            })
            
        except Exception as e:
            logger.error(f"Error getting feedback analytics: {str(e)}")
            return Response(
                {"error": "An error occurred while retrieving feedback analytics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_recent_feedback_notes(self, feedback_queryset):
        """Get recent feedback notes with content"""
        recent_feedback = feedback_queryset.exclude(
            feedback_notes__isnull=True
        ).exclude(
            feedback_notes__exact=''
        ).order_by('-submitted_at')[:5]
        
        return [
            {
                'tracking_number': feedback.shipment.tracking_number,
                'submitted_at': feedback.submitted_at.isoformat(),
                'notes': feedback.feedback_notes,
                'success_score': feedback.delivery_success_score
            }
            for feedback in recent_feedback
        ]
    
    @action(detail=False, methods=['get'], url_path='feedback-alerts')
    def feedback_alerts(self, request):
        """
        Get feedback alerts for poor customer feedback scores.
        Returns alerts generated when feedback scores fall below acceptable thresholds.
        
        Query parameters:
        - period: 'week', 'month', 'quarter' (default: 'week')
        - status: 'all', 'unread', 'high', 'urgent' (default: 'all')
        - limit: Number of alerts to return (default: 20)
        """
        from communications.models import ShipmentEvent
        from .feedback_alert_service import FeedbackAlertService, FeedbackTrendAnalyzer
        from datetime import timedelta
        
        # Check permission - only managers and admins can access alerts
        if request.user.role not in ['ADMIN', 'MANAGER', 'DISPATCHER', 'COMPLIANCE_OFFICER']:
            return Response(
                {"detail": "You don't have permission to access feedback alerts."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get query parameters
            period = request.query_params.get('period', 'week')
            alert_status = request.query_params.get('status', 'all')
            limit = int(request.query_params.get('limit', 20))
            
            # Calculate date range
            if period == 'week':
                since_date = timezone.now() - timedelta(days=7)
            elif period == 'month':
                since_date = timezone.now() - timedelta(days=30)
            elif period == 'quarter':
                since_date = timezone.now() - timedelta(days=90)
            else:
                since_date = timezone.now() - timedelta(days=7)  # Default to week
            
            # Build base query for feedback alert events
            alerts_query = ShipmentEvent.objects.filter(
                event_type='ALERT',
                title__icontains='feedback',
                timestamp__gte=since_date
            ).select_related(
                'shipment__customer',
                'shipment__carrier',
                'user'
            ).prefetch_related(
                'shipment__customer_feedback'
            )
            
            # Apply company filtering based on user role
            if request.user.company:
                alerts_query = alerts_query.filter(
                    shipment__carrier=request.user.company
                )
            
            # Filter by alert status/priority
            if alert_status == 'high':
                alerts_query = alerts_query.filter(priority='HIGH')
            elif alert_status == 'urgent':
                alerts_query = alerts_query.filter(priority='URGENT')
            elif alert_status == 'unread':
                # Filter out alerts that have been read by this user
                from communications.models import EventRead
                read_event_ids = EventRead.objects.filter(
                    user=request.user
                ).values_list('event_id', flat=True)
                alerts_query = alerts_query.exclude(id__in=read_event_ids)
            
            # Apply limit and ordering
            alerts = alerts_query.order_by('-timestamp')[:limit]
            
            # Format alert data
            alert_data = []
            for alert in alerts:
                # Get associated feedback if available
                feedback = None
                if hasattr(alert.shipment, 'customer_feedback'):
                    feedback = alert.shipment.customer_feedback
                
                alert_info = {
                    'id': str(alert.id),
                    'shipment_id': str(alert.shipment.id),
                    'tracking_number': alert.shipment.tracking_number,
                    'title': alert.title,
                    'details': alert.details,
                    'priority': alert.priority,
                    'timestamp': alert.timestamp.isoformat(),
                    'customer_company': alert.shipment.customer.name,
                    'carrier_company': alert.shipment.carrier.name,
                    'is_read': EventRead.objects.filter(
                        event=alert, 
                        user=request.user
                    ).exists(),
                    'feedback_score': feedback.delivery_success_score if feedback else None,
                    'feedback_summary': feedback.get_feedback_summary() if feedback else None,
                    'feedback_details': {
                        'was_on_time': feedback.was_on_time if feedback else None,
                        'was_complete_and_undamaged': feedback.was_complete_and_undamaged if feedback else None,
                        'was_driver_professional': feedback.was_driver_professional if feedback else None,
                        'feedback_notes': feedback.feedback_notes if feedback else None,
                        'submitted_at': feedback.submitted_at.isoformat() if feedback else None,
                    } if feedback else None
                }
                alert_data.append(alert_info)
            
            # Get summary statistics
            total_alerts = alerts_query.count()
            unread_count = alerts_query.exclude(
                id__in=EventRead.objects.filter(
                    user=request.user
                ).values_list('event_id', flat=True)
            ).count()
            
            urgent_count = alerts_query.filter(priority='URGENT').count()
            high_count = alerts_query.filter(priority='HIGH').count()
            
            # Get trend analysis for the user's company
            company_trends = None
            if request.user.company:
                trend_data = FeedbackTrendAnalyzer.get_recent_feedback_trend(
                    request.user.company, 
                    days=7 if period == 'week' else 30
                )
                if trend_data['has_data']:
                    company_trends = {
                        'average_score': trend_data['average_score'],
                        'poor_score_rate': trend_data['poor_score_rate'],
                        'trend_status': trend_data['trend_status'],
                        'total_feedback': trend_data['total_feedback_count']
                    }
            
            return Response({
                'period': period,
                'status_filter': alert_status,
                'alerts': alert_data,
                'summary': {
                    'total_alerts': total_alerts,
                    'showing': len(alert_data),
                    'unread_count': unread_count,
                    'urgent_count': urgent_count,
                    'high_count': high_count
                },
                'company_trends': company_trends,
                'thresholds': {
                    'poor_score_threshold': FeedbackAlertService.POOR_SCORE_THRESHOLD,
                    'critical_score_threshold': FeedbackAlertService.CRITICAL_SCORE_THRESHOLD
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting feedback alerts: {str(e)}")
            return Response(
                {"error": "An error occurred while retrieving feedback alerts"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='mark-alerts-read')
    def mark_alerts_read(self, request):
        """
        Mark feedback alerts as read by the current user.
        
        Expected payload:
        {
            "alert_ids": ["uuid1", "uuid2", ...] // Optional, marks all if not provided
        }
        """
        from communications.models import ShipmentEvent, EventRead
        
        # Check permission
        if request.user.role not in ['ADMIN', 'MANAGER', 'DISPATCHER', 'COMPLIANCE_OFFICER']:
            return Response(
                {"detail": "You don't have permission to mark alerts as read."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            alert_ids = request.data.get('alert_ids', [])
            
            # Build query for feedback alerts
            alerts_query = ShipmentEvent.objects.filter(
                event_type='ALERT',
                title__icontains='feedback'
            )
            
            # Filter by specific alert IDs if provided
            if alert_ids:
                alerts_query = alerts_query.filter(id__in=alert_ids)
            
            # Apply company filtering
            if request.user.company:
                alerts_query = alerts_query.filter(
                    shipment__carrier=request.user.company
                )
            
            # Mark alerts as read
            marked_count = 0
            for alert in alerts_query:
                read_receipt, created = EventRead.objects.get_or_create(
                    event=alert,
                    user=request.user
                )
                if created:
                    marked_count += 1
            
            return Response({
                'message': f'Marked {marked_count} alerts as read',
                'marked_count': marked_count,
                'alert_ids_processed': alert_ids if alert_ids else 'all_unread'
            })
            
        except Exception as e:
            logger.error(f"Error marking alerts as read: {str(e)}")
            return Response(
                {"error": "An error occurred while marking alerts as read"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConsignmentItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for consignment item management with enhanced filtering.
    """
    serializer_class = ConsignmentItemSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageConsignmentItems]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'shipment__tracking_number': ['exact'],
        'shipment__customer': ['exact'],
        'shipment__carrier': ['exact'],
        'is_dangerous_good': ['exact'],
        'dangerous_good_entry__un_number': ['exact', 'icontains'],
        'dangerous_good_entry__hazard_class': ['exact', 'in'],
        'dangerous_good_entry__packing_group': ['exact', 'in'],
        'weight_kg': ['gte', 'lte'],
        'quantity': ['gte', 'lte'],
    }
    search_fields = [
        'description', 
        'dangerous_good_entry__un_number', 
        'dangerous_good_entry__proper_shipping_name',
        'shipment__tracking_number', 
        'shipment__reference_number'
    ]
    ordering_fields = ['created_at', 'shipment', 'is_dangerous_good', 'weight_kg', 'quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter items based on shipments accessible to the user."""
        accessible_shipments_qs = get_shipments_for_user(self.request.user)
        return ConsignmentItem.objects.filter(
            shipment__in=accessible_shipments_qs
        ).select_related(
            'shipment__customer', 
            'shipment__carrier',
            'dangerous_good_entry'
        )

    def perform_create(self, serializer):
        """Enhanced item creation with shipment permission validation."""
        shipment = serializer.validated_data.get('shipment')
        if not shipment:
            raise serializers.ValidationError({"shipment": "Shipment is required."})
        
        try:
            # Check permission on parent shipment
            permission_checker = IsAdminOrAssignedDepotUserForShipment()
            if not permission_checker.has_object_permission(self.request, self, shipment):
                raise PermissionDenied("You do not have permission to add items to this shipment.")
            
            serializer.save()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        except Exception as e:
            raise serializers.ValidationError({"detail": "An error occurred while creating the item."})

    def perform_update(self, serializer):
        """Enhanced item update with permission validation."""
        try:
            serializer.save()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        except Exception as e:
            raise serializers.ValidationError({"detail": "An error occurred while updating the item."})


# ===== FEEDBACK MANAGEMENT VIEWSETS =====

class ShipmentFeedbackViewSet(viewsets.ModelViewSet):
    """
    Enhanced feedback management ViewSet with manager response functionality,
    automatic incident creation, and comprehensive analytics integration.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'submitted_at': ['date', 'gte', 'lte'],
        'shipment__customer': ['exact'],
        'shipment__carrier': ['exact'],
        'shipment__assigned_driver': ['exact'],
        'shipment__origin_location': ['icontains'],
        'shipment__destination_location': ['icontains'],
        'shipment__freight_type': ['exact'],
        'responded_by': ['exact'],
        'responded_at': ['date', 'gte', 'lte'],
    }
    
    search_fields = [
        'shipment__tracking_number',
        'shipment__reference_number',
        'feedback_notes',
        'manager_response',
        'shipment__customer__name',
        'shipment__assigned_driver__first_name',
        'shipment__assigned_driver__last_name',
    ]
    
    ordering_fields = [
        'submitted_at', 'delivery_success_score', 'responded_at'
    ]
    ordering = ['-submitted_at']

    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action == 'list':
            return ShipmentFeedbackListSerializer
        return ShipmentFeedbackSerializer

    def get_queryset(self):
        """Return company-filtered feedback with optimized queries"""
        user = self.request.user
        
        # Company-based filtering for multi-tenant isolation
        queryset = ShipmentFeedback.objects.select_related(
            'shipment__customer',
            'shipment__carrier', 
            'shipment__assigned_driver',
            'responded_by'
        ).prefetch_related(
            'shipment__freight_type'
        )
        
        # Filter based on user role and company
        if user.role in ['ADMIN', 'MANAGER']:
            # Managers can see feedback for shipments their company handled
            queryset = queryset.filter(shipment__carrier=user.company)
        elif user.role == 'CUSTOMER':
            # Customers can see feedback for their own shipments
            queryset = queryset.filter(shipment__customer=user.company)
        elif user.role == 'DRIVER':
            # Drivers can see feedback for shipments they delivered
            queryset = queryset.filter(shipment__assigned_driver=user)
        else:
            # Other roles get limited access
            queryset = queryset.filter(shipment__carrier=user.company)
        
        return queryset

    def perform_create(self, serializer):
        """Handle feedback creation with automatic incident creation and notifications"""
        feedback = serializer.save()
        
        # Send notifications to managers/admins
        notify_feedback_received(feedback)
        
        # Send notification to driver if configured
        notify_driver_feedback(feedback)
        
        # Send ERP webhook for feedback created event
        try:
            send_feedback_webhook(feedback, 'created')
        except Exception as e:
            logger.error(f"Failed to send ERP webhook for feedback creation: {e}")
        
        # Automatic incident creation for poor feedback (< 67%)
        if feedback.requires_incident:
            incident = self._create_incident_for_poor_feedback(feedback)
            if incident:
                notify_incident_created(feedback, incident)
                # Send ERP webhook for incident created event
                try:
                    send_incident_webhook(feedback, incident)
                except Exception as e:
                    logger.error(f"Failed to send ERP webhook for incident creation: {e}")
        
        logger.info(f"Feedback created for shipment {feedback.shipment.tracking_number} with score {feedback.delivery_success_score}%")

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_response(self, request, pk=None):
        """
        Add manager response to feedback.
        Only managers and admins can respond to feedback.
        
        Expected payload:
        {
            "response_text": "Manager's internal response..."
        }
        """
        feedback = self.get_object()
        
        # Check if user can respond
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response(
                {"error": "Only managers and admins can respond to feedback"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check company permissions
        if feedback.shipment.carrier != request.user.company:
            return Response(
                {"error": "You can only respond to feedback for your company's shipments"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        serializer = ManagerResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Add manager response
            feedback.add_manager_response(
                serializer.validated_data['response_text'],
                request.user
            )
            
            # Update related incident with manager response
            update_incident_for_feedback_response(feedback)
            
            # Send notifications about manager response
            notify_manager_response(feedback)
            
            # Send ERP webhook for manager response event
            try:
                send_feedback_webhook(feedback, 'manager_response')
            except Exception as e:
                logger.error(f"Failed to send ERP webhook for manager response: {e}")
            
            # Return updated feedback
            response_serializer = ShipmentFeedbackSerializer(feedback)
            
            logger.info(f"Manager response added to feedback {feedback.id} by {request.user.get_full_name()}")
            
            return Response({
                "message": "Manager response added successfully",
                "feedback": response_serializer.data
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def analytics_summary(self, request):
        """
        Get analytics summary for feedback data.
        Provides quick overview metrics for dashboard widgets.
        """
        queryset = self.get_queryset()
        
        # Get time period from query params
        period = request.GET.get('period', '30d')
        
        # Calculate date range
        from datetime import timedelta
        from django.utils import timezone
        
        if period == '7d':
            start_date = timezone.now() - timedelta(days=7)
        elif period == '90d':
            start_date = timezone.now() - timedelta(days=90)
        elif period == 'qtd':
            # Quarter to date
            now = timezone.now()
            quarter_start = timezone.datetime(now.year, ((now.month - 1) // 3) * 3 + 1, 1)
            start_date = timezone.make_aware(quarter_start)
        else:  # default 30d
            start_date = timezone.now() - timedelta(days=30)
        
        # Filter by date range
        period_feedback = queryset.filter(submitted_at__gte=start_date)
        
        # Calculate metrics
        total_count = period_feedback.count()
        if total_count == 0:
            return Response({
                "period": period,
                "total_feedback_count": 0,
                "average_delivery_score": 0,
                "difot_rate": 0,
                "poor_feedback_count": 0,
                "requires_response_count": 0,
            })
        
        # Calculate scores and rates
        feedback_list = list(period_feedback)
        total_score = sum(f.delivery_success_score for f in feedback_list)
        average_score = total_score / total_count
        
        difot_count = sum(1 for f in feedback_list if f.difot_score)
        difot_rate = (difot_count / total_count) * 100
        
        poor_count = sum(1 for f in feedback_list if f.delivery_success_score < 70)
        needs_response_count = sum(1 for f in feedback_list if not f.has_manager_response and f.delivery_success_score < 70)
        
        return Response({
            "period": period,
            "total_feedback_count": total_count,
            "average_delivery_score": round(average_score, 1),
            "difot_rate": round(difot_rate, 1),
            "poor_feedback_count": poor_count,
            "requires_response_count": needs_response_count,
            "on_time_rate": round(sum(1 for f in feedback_list if f.was_on_time) / total_count * 100, 1),
            "complete_rate": round(sum(1 for f in feedback_list if f.was_complete_and_undamaged) / total_count * 100, 1),
            "professional_rate": round(sum(1 for f in feedback_list if f.was_driver_professional) / total_count * 100, 1),
        })

    @action(detail=False, methods=['get'])
    def export_data(self, request):
        """
        Export feedback data in various formats.
        Supports CSV, JSON formats with filtering.
        """
        # Check export permissions
        if not request.user.has_perm('shipments.analytics.export'):
            return Response(
                {"error": "You don't have permission to export feedback data"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.filter_queryset(self.get_queryset())
        export_format = request.GET.get('format', 'csv').lower()
        
        if export_format == 'csv':
            return self._export_csv(queryset)
        elif export_format == 'json':
            return self._export_json(queryset)
        else:
            return Response(
                {"error": "Unsupported export format. Use 'csv' or 'json'"},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _create_incident_for_poor_feedback(self, feedback):
        """Create automatic incident for poor feedback scores using incident service"""
        try:
            incident = create_incident_for_feedback(feedback)
            if incident:
                logger.info(f"Created incident {incident.incident_number} for poor feedback {feedback.id} with score {feedback.delivery_success_score}%")
                return incident
            else:
                logger.warning(f"No incident created for feedback {feedback.id} - may not meet incident criteria")
                
        except Exception as e:
            logger.error(f"Failed to create incident for feedback {feedback.id}: {str(e)}")

    def _export_csv(self, queryset):
        """Export feedback data as CSV"""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="feedback_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Tracking Number', 'Customer Name', 'Delivery Score', 'On Time', 
            'Complete & Undamaged', 'Professional Driver', 'Feedback Notes',
            'Submitted At', 'Has Manager Response', 'Response Date'
        ])
        
        for feedback in queryset:
            writer.writerow([
                feedback.shipment.tracking_number,
                feedback.shipment.customer.name,
                feedback.delivery_success_score,
                'Yes' if feedback.was_on_time else 'No',
                'Yes' if feedback.was_complete_and_undamaged else 'No', 
                'Yes' if feedback.was_driver_professional else 'No',
                feedback.feedback_notes,
                feedback.submitted_at.strftime('%Y-%m-%d %H:%M:%S'),
                'Yes' if feedback.has_manager_response else 'No',
                feedback.responded_at.strftime('%Y-%m-%d %H:%M:%S') if feedback.responded_at else '',
            ])
        
        return response

    def _export_json(self, queryset):
        """Export feedback data as JSON"""
        from django.http import JsonResponse
        
        serializer = ShipmentFeedbackSerializer(queryset, many=True)
        
        response = JsonResponse({
            'export_date': timezone.now().isoformat(),
            'total_records': queryset.count(),
            'data': serializer.data
        })
        response['Content-Disposition'] = f'attachment; filename="feedback_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json"'
        
        return response


class FeedbackAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Advanced analytics ViewSet for feedback data with comprehensive filtering,
    DIFOT calculations, and performance indicators.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FeedbackAnalyticsSerializer
    
    def get_queryset(self):
        """Return company-filtered feedback for analytics"""
        user = self.request.user
        
        queryset = ShipmentFeedback.objects.select_related(
            'shipment__customer',
            'shipment__carrier',
            'shipment__assigned_driver',
            'shipment__freight_type',
        )
        
        # Company-based filtering
        if user.role in ['ADMIN', 'MANAGER']:
            queryset = queryset.filter(shipment__carrier=user.company)
        elif user.role == 'CUSTOMER':
            queryset = queryset.filter(shipment__customer=user.company)
        else:
            queryset = queryset.filter(shipment__carrier=user.company)
            
        return queryset

    @action(detail=False, methods=['get'])
    def comprehensive_analytics(self, request):
        """
        Get comprehensive analytics with advanced filtering capabilities.
        
        Query Parameters:
        - period: 7d, 30d, 90d, qtd
        - driver_id: Filter by specific driver
        - customer_id: Filter by specific customer
        - route_origin: Filter by origin location
        - route_destination: Filter by destination location
        - freight_type_id: Filter by freight type
        """
        queryset = self.get_queryset()
        
        # Apply filters
        filters = self._build_analytics_filters(request.GET)
        if filters:
            queryset = queryset.filter(**filters)
        
        # Apply time period filter
        period_queryset = self._apply_time_filter(queryset, request.GET.get('period', '30d'))
        
        # Calculate analytics
        analytics_data = self._calculate_comprehensive_analytics(period_queryset)
        
        # Add trend data
        analytics_data['trend_data'] = self._calculate_trend_data(queryset, request.GET.get('period', '30d'))
        
        return Response(analytics_data)

    @action(detail=False, methods=['get'])
    def driver_performance(self, request):
        """
        Get driver-specific performance analytics.
        """
        queryset = self.get_queryset()
        period_queryset = self._apply_time_filter(queryset, request.GET.get('period', '30d'))
        
        # Group by driver
        driver_stats = {}
        for feedback in period_queryset.select_related('shipment__assigned_driver'):
            if not feedback.shipment.assigned_driver:
                continue
                
            driver = feedback.shipment.assigned_driver
            driver_key = str(driver.id)
            
            if driver_key not in driver_stats:
                driver_stats[driver_key] = {
                    'driver_name': driver.get_full_name(),
                    'total_deliveries': 0,
                    'scores': [],
                    'on_time_count': 0,
                    'complete_count': 0,
                    'professional_count': 0,
                    'poor_feedback_count': 0,
                }
            
            stats = driver_stats[driver_key]
            stats['total_deliveries'] += 1
            stats['scores'].append(feedback.delivery_success_score)
            
            if feedback.was_on_time:
                stats['on_time_count'] += 1
            if feedback.was_complete_and_undamaged:
                stats['complete_count'] += 1  
            if feedback.was_driver_professional:
                stats['professional_count'] += 1
            if feedback.delivery_success_score < 70:
                stats['poor_feedback_count'] += 1
        
        # Calculate driver analytics
        driver_analytics = []
        for driver_id, stats in driver_stats.items():
            if stats['total_deliveries'] > 0:
                avg_score = sum(stats['scores']) / len(stats['scores'])
                driver_analytics.append({
                    'driver_id': driver_id,
                    'driver_name': stats['driver_name'],
                    'total_deliveries': stats['total_deliveries'],
                    'average_score': round(avg_score, 1),
                    'on_time_rate': round((stats['on_time_count'] / stats['total_deliveries']) * 100, 1),
                    'complete_rate': round((stats['complete_count'] / stats['total_deliveries']) * 100, 1),
                    'professional_rate': round((stats['professional_count'] / stats['total_deliveries']) * 100, 1),
                    'poor_feedback_rate': round((stats['poor_feedback_count'] / stats['total_deliveries']) * 100, 1),
                    'needs_training': avg_score < 85,  # Flag for training
                })
        
        # Sort by average score descending
        driver_analytics.sort(key=lambda x: x['average_score'], reverse=True)
        
        return Response({
            'period': request.GET.get('period', '30d'),
            'total_drivers': len(driver_analytics),
            'drivers_needing_training': sum(1 for d in driver_analytics if d['needs_training']),
            'driver_performance': driver_analytics
        })

    @action(detail=False, methods=['get'])
    def route_analytics(self, request):
        """
        Get route-based performance analytics.
        """
        queryset = self.get_queryset()
        period_queryset = self._apply_time_filter(queryset, request.GET.get('period', '30d'))
        
        # Group by route (origin -> destination)
        route_stats = {}
        for feedback in period_queryset:
            route_key = f"{feedback.shipment.origin_location} -> {feedback.shipment.destination_location}"
            
            if route_key not in route_stats:
                route_stats[route_key] = {
                    'total_shipments': 0,
                    'scores': [],
                    'difot_count': 0,
                }
            
            stats = route_stats[route_key]
            stats['total_shipments'] += 1
            stats['scores'].append(feedback.delivery_success_score)
            
            if feedback.difot_score:
                stats['difot_count'] += 1
        
        # Calculate route analytics
        route_analytics = []
        for route, stats in route_stats.items():
            if stats['total_shipments'] > 0:
                avg_score = sum(stats['scores']) / len(stats['scores'])
                difot_rate = (stats['difot_count'] / stats['total_shipments']) * 100
                
                route_analytics.append({
                    'route': route,
                    'total_shipments': stats['total_shipments'],
                    'average_score': round(avg_score, 1),
                    'difot_rate': round(difot_rate, 1),
                    'performance_category': self._get_performance_category(avg_score),
                })
        
        # Sort by average score descending
        route_analytics.sort(key=lambda x: x['average_score'], reverse=True)
        
        return Response({
            'period': request.GET.get('period', '30d'),
            'total_routes': len(route_analytics),
            'route_performance': route_analytics
        })

    def _build_analytics_filters(self, query_params):
        """Build Django ORM filters from query parameters"""
        filters = {}
        
        if query_params.get('driver_id'):
            filters['shipment__assigned_driver_id'] = query_params['driver_id']
        
        if query_params.get('customer_id'):
            filters['shipment__customer_id'] = query_params['customer_id']
            
        if query_params.get('route_origin'):
            filters['shipment__origin_location__icontains'] = query_params['route_origin']
            
        if query_params.get('route_destination'):
            filters['shipment__destination_location__icontains'] = query_params['route_destination']
            
        if query_params.get('freight_type_id'):
            filters['shipment__freight_type_id'] = query_params['freight_type_id']
        
        return filters

    def _apply_time_filter(self, queryset, period):
        """Apply time period filter to queryset"""
        from datetime import timedelta
        from django.utils import timezone
        
        if period == '7d':
            start_date = timezone.now() - timedelta(days=7)
        elif period == '90d':
            start_date = timezone.now() - timedelta(days=90)
        elif period == 'qtd':
            now = timezone.now()
            quarter_start = timezone.datetime(now.year, ((now.month - 1) // 3) * 3 + 1, 1)
            start_date = timezone.make_aware(quarter_start)
        else:  # default 30d
            start_date = timezone.now() - timedelta(days=30)
        
        return queryset.filter(submitted_at__gte=start_date)

    def _calculate_comprehensive_analytics(self, queryset):
        """Calculate comprehensive analytics metrics"""
        feedback_list = list(queryset)
        total_count = len(feedback_list)
        
        if total_count == 0:
            return self._empty_analytics_response()
        
        # Basic metrics
        total_score = sum(f.delivery_success_score for f in feedback_list)
        average_score = total_score / total_count
        
        # Rate calculations
        on_time_count = sum(1 for f in feedback_list if f.was_on_time)
        complete_count = sum(1 for f in feedback_list if f.was_complete_and_undamaged)
        professional_count = sum(1 for f in feedback_list if f.was_driver_professional)
        difot_count = sum(1 for f in feedback_list if f.difot_score)
        
        # Performance category breakdown
        excellent_count = sum(1 for f in feedback_list if f.performance_category == 'EXCELLENT')
        good_count = sum(1 for f in feedback_list if f.performance_category == 'GOOD')
        needs_improvement_count = sum(1 for f in feedback_list if f.performance_category == 'NEEDS_IMPROVEMENT')
        poor_count = sum(1 for f in feedback_list if f.performance_category == 'POOR')
        
        return {
            'total_feedback_count': total_count,
            'average_delivery_score': round(average_score, 1),
            'difot_rate': round((difot_count / total_count) * 100, 1),
            'on_time_rate': round((on_time_count / total_count) * 100, 1),
            'complete_rate': round((complete_count / total_count) * 100, 1),
            'professional_rate': round((professional_count / total_count) * 100, 1),
            'excellent_count': excellent_count,
            'good_count': good_count,
            'needs_improvement_count': needs_improvement_count,
            'poor_count': poor_count,
        }

    def _calculate_trend_data(self, queryset, period):
        """Calculate trend data for charts"""
        from datetime import timedelta
        from django.utils import timezone
        import math
        
        # Determine number of data points based on period
        if period == '7d':
            days = 7
            interval_days = 1
        elif period == '90d':
            days = 90
            interval_days = 7  # Weekly intervals
        elif period == 'qtd':
            now = timezone.now()
            quarter_start = timezone.datetime(now.year, ((now.month - 1) // 3) * 3 + 1, 1)
            days = (now - timezone.make_aware(quarter_start)).days
            interval_days = max(1, math.ceil(days / 12))  # ~12 data points
        else:  # 30d
            days = 30
            interval_days = 2  # Every 2 days
        
        trend_data = []
        start_date = timezone.now() - timedelta(days=days)
        
        for i in range(0, days, interval_days):
            period_start = start_date + timedelta(days=i)
            period_end = start_date + timedelta(days=i + interval_days)
            
            period_feedback = queryset.filter(
                submitted_at__gte=period_start,
                submitted_at__lt=period_end
            )
            
            count = period_feedback.count()
            if count > 0:
                avg_score = sum(f.delivery_success_score for f in period_feedback) / count
                difot_rate = sum(1 for f in period_feedback if f.difot_score) / count * 100
            else:
                avg_score = 0
                difot_rate = 0
            
            trend_data.append({
                'date': period_start.strftime('%Y-%m-%d'),
                'average_score': round(avg_score, 1),
                'difot_rate': round(difot_rate, 1),
                'feedback_count': count,
            })
        
        return trend_data

    def _empty_analytics_response(self):
        """Return empty analytics response"""
        return {
            'total_feedback_count': 0,
            'average_delivery_score': 0,
            'difot_rate': 0,
            'on_time_rate': 0,
            'complete_rate': 0,
            'professional_rate': 0,
            'excellent_count': 0,
            'good_count': 0,
            'needs_improvement_count': 0,
            'poor_count': 0,
        }

    def _get_performance_category(self, score):
        """Get performance category from score"""
        if score > 95:
            return "EXCELLENT"
        elif score >= 85:
            return "GOOD"
        elif score >= 70:
            return "NEEDS_IMPROVEMENT"
        else:
            return "POOR"


from rest_framework.views import APIView

class DeliverySuccessStatsView(APIView):
    """
    Dashboard widget view for delivery success statistics with caching and trend calculations.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Get delivery success statistics for dashboard widgets.
        Includes current period, previous period comparison, and recent activity.
        """
        # Get user's company feedback
        user = request.user
        
        queryset = ShipmentFeedback.objects.select_related(
            'shipment__customer',
            'shipment__carrier',
            'shipment__assigned_driver'
        )
        
        # Company-based filtering
        if user.role in ['ADMIN', 'MANAGER']:
            queryset = queryset.filter(shipment__carrier=user.company)
        elif user.role == 'CUSTOMER':
            queryset = queryset.filter(shipment__customer=user.company)
        else:
            queryset = queryset.filter(shipment__carrier=user.company)
        
        # Calculate current and previous period stats
        period = request.GET.get('period', '30d')
        current_stats = self._calculate_period_stats(queryset, period, 0)
        previous_stats = self._calculate_period_stats(queryset, period, 1)
        
        # Calculate trends
        score_change = current_stats['average_score'] - previous_stats['average_score']
        trend_direction = 'up' if score_change > 1 else 'down' if score_change < -1 else 'stable'
        
        # Get recent feedback (last 10)
        recent_feedback = queryset.order_by('-submitted_at')[:10]
        
        stats_data = {
            'current_period_score': current_stats['average_score'],
            'previous_period_score': previous_stats['average_score'],
            'score_change': round(score_change, 1),
            'trend_direction': trend_direction,
            'total_feedback_count': current_stats['total_count'],
            'poor_feedback_count': current_stats['poor_count'],
            'requires_attention_count': current_stats['needs_response_count'],
            'difot_rate': current_stats['difot_rate'],
            'customer_satisfaction_rate': current_stats['satisfaction_rate'],
            'recent_feedback': ShipmentFeedbackListSerializer(recent_feedback, many=True).data
        }
        
        serializer = DeliverySuccessStatsSerializer(data=stats_data)
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.validated_data)

    def _calculate_period_stats(self, queryset, period, periods_ago=0):
        """Calculate statistics for a specific time period"""
        from datetime import timedelta
        from django.utils import timezone
        
        # Calculate date range
        if period == '7d':
            days = 7
        elif period == '90d':
            days = 90
        elif period == 'qtd':
            now = timezone.now()
            quarter_start = timezone.datetime(now.year, ((now.month - 1) // 3) * 3 + 1, 1)
            days = (now - timezone.make_aware(quarter_start)).days
        else:  # 30d
            days = 30
        
        # Adjust for periods ago
        end_date = timezone.now() - timedelta(days=days * periods_ago)
        start_date = end_date - timedelta(days=days)
        
        period_feedback = list(queryset.filter(
            submitted_at__gte=start_date,
            submitted_at__lt=end_date
        ))
        
        total_count = len(period_feedback)
        if total_count == 0:
            return {
                'average_score': 0,
                'total_count': 0,
                'poor_count': 0,
                'needs_response_count': 0,
                'difot_rate': 0,
                'satisfaction_rate': 0,
            }
        
        # Calculate metrics
        total_score = sum(f.delivery_success_score for f in period_feedback)
        average_score = total_score / total_count
        
        poor_count = sum(1 for f in period_feedback if f.delivery_success_score < 70)
        needs_response_count = sum(1 for f in period_feedback if not f.has_manager_response and f.delivery_success_score < 70)
        difot_count = sum(1 for f in period_feedback if f.difot_score)
        satisfied_count = sum(1 for f in period_feedback if f.delivery_success_score >= 85)
        
        return {
            'average_score': round(average_score, 1),
            'total_count': total_count,
            'poor_count': poor_count,
            'needs_response_count': needs_response_count,
            'difot_rate': round((difot_count / total_count) * 100, 1),
            'satisfaction_rate': round((satisfied_count / total_count) * 100, 1),
        }
