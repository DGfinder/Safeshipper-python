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

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Custom endpoint for updating shipment status with role-based validation."""
        shipment = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {"detail": "Status field is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            updated_shipment = update_shipment_status_service(
                shipment, new_status, request.user
            )
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
