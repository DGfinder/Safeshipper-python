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

from .models import Shipment, ConsignmentItem
from .serializers import ShipmentSerializer, ShipmentListSerializer, ConsignmentItemSerializer
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
from .safety_validation import ShipmentSafetyValidator, ShipmentPreValidationService


class ShipmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for shipment management with role-based access control.
    Enhanced for Phase 2 with improved filtering and permissions.
    """
    permission_classes = [permissions.IsAuthenticated, CanModifyShipment]
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
        """Enhanced shipment creation with role-based validation."""
        try:
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
        """Submit proof of delivery - matches frontend mock API structure."""
        shipment = self.get_object()
        
        signature = request.data.get('signature')
        photos = request.data.get('photos', [])
        recipient = request.data.get('recipient')
        
        if not signature:
            return Response(
                {'error': 'signature is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not recipient:
            return Response(
                {'error': 'recipient is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create POD data
        pod_data = {
            'id': f"pod-{timezone.now().timestamp()}",
            'shipment_id': str(shipment.id),
            'signature': signature,
            'photos': photos,
            'recipient': recipient,
            'timestamp': timezone.now().isoformat(),
            'driver': {
                'name': f"{request.user.first_name} {request.user.last_name}".strip(),
                'id': str(request.user.id)
            }
        }
        
        # Update shipment status to DELIVERED
        shipment.status = 'DELIVERED'
        shipment.actual_delivery_date = timezone.now()
        
        # Store POD data in shipment notes (simplified for now)
        pod_note = f"[POD] Delivered to {recipient} at {timezone.now().strftime('%Y-%m-%d %H:%M')}"
        if not shipment.notes:
            shipment.notes = pod_note
        else:
            shipment.notes = f"{shipment.notes}\n\n{pod_note}"
        
        shipment.save(update_fields=['status', 'actual_delivery_date', 'notes', 'updated_at'])
        
        return Response(pod_data, status=status.HTTP_201_CREATED)

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
        """Assign a driver to the shipment - matches frontend API structure."""
        shipment = self.get_object()
        driver_id = request.data.get('driver_id')
        
        if not driver_id:
            return Response(
                {'error': 'driver_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            driver = User.objects.get(id=driver_id)
            
            # Validate driver role if available
            if hasattr(driver, 'role') and driver.role != 'DRIVER':
                return Response(
                    {'error': 'Selected user is not a driver'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Assign driver to shipment
            shipment.assigned_driver = driver
            shipment.save(update_fields=['assigned_driver', 'updated_at'])
            
            # Return updated shipment
            serializer = self.get_serializer(shipment)
            return Response(serializer.data)
            
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
            
            # Get available vehicles with optional filtering
            vehicles_qs = Vehicle.objects.all()
            
            vehicle_status = request.query_params.get('status', 'AVAILABLE')
            vehicles_qs = vehicles_qs.filter(status=vehicle_status)
            
            depot = request.query_params.get('depot')
            if depot:
                vehicles_qs = vehicles_qs.filter(assigned_depot=depot)
            
            compliant_vehicles = ShipmentSafetyValidator.get_compliant_vehicles_for_shipment(
                shipment, vehicles_qs
            )
            
            return Response({
                'shipment_id': shipment.id,
                'tracking_number': shipment.tracking_number,
                'compliant_vehicles': compliant_vehicles,
                'total_vehicles_checked': vehicles_qs.count(),
                'compliant_count': len(compliant_vehicles)
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
            vehicle = Vehicle.objects.get(id=vehicle_id)
            
            # Validate vehicle assignment
            validation_result = ShipmentSafetyValidator.validate_vehicle_assignment(
                shipment, vehicle
            )
            
            if not validation_result['can_assign']:
                return Response({
                    "error": "Vehicle cannot be assigned to this shipment",
                    "reason": validation_result['reason'],
                    "validation_details": validation_result
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for warnings
            vehicle_compliance = validation_result.get('vehicle_compliance', {})
            warnings = vehicle_compliance.get('warnings', [])
            
            if warnings and not override_warnings:
                return Response({
                    "warning": "Vehicle has warnings but can be assigned",
                    "warnings": warnings,
                    "can_override": True,
                    "message": "Set override_warnings=true to proceed with assignment"
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
                    'validation_passed': validation_result['can_assign'],
                    'warnings_overridden': override_warnings and len(warnings) > 0
                }
            )
            
            serializer = self.get_serializer(shipment)
            return Response({
                "message": f"Vehicle {vehicle.registration_number} successfully assigned to shipment",
                "shipment": serializer.data,
                "validation_result": validation_result
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
            validation_result = ShipmentPreValidationService.validate_shipment_creation(
                shipment_data, items_data, vehicle_id
            )
            
            return Response(validation_result)
            
        except Exception as e:
            logger.error(f"Error pre-validating shipment: {str(e)}")
            return Response(
                {"error": "An error occurred during pre-validation"},
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
