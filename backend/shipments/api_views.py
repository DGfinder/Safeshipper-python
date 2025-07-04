# shipments/api_views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError, PermissionDenied

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
