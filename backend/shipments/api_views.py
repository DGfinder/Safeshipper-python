# shipments/api_views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework import serializers
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Shipment, ConsignmentItem # ShipmentStatus is used by serializer & services
from .serializers import ShipmentSerializer, ConsignmentItemSerializer
from .permissions import IsAdminOrAssignedDepotUserForShipment, CanManageConsignmentItems
from .services import get_shipments_for_user, create_shipment_with_items, update_shipment_details
from django.core.exceptions import ValidationError, PermissionDenied


class ShipmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows shipments to be viewed or edited.
    """
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrAssignedDepotUserForShipment]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'status': ['exact', 'in'],
        'assigned_depot': ['exact', 'icontains'],
        'created_at': ['date', 'year', 'month', 'day', 'gte', 'lte'],
        'estimated_departure_date': ['date', 'gte', 'lte'],
        'estimated_arrival_date': ['date', 'gte', 'lte'],
        'reference_number': ['exact', 'icontains'],
        'tracking_number': ['exact'],
    }
    search_fields = ['tracking_number', 'reference_number', 'origin_address', 'destination_address', 'assigned_depot', 'items__description', 'items__un_number']
    ordering_fields = ['created_at', 'status', 'assigned_depot', 'estimated_departure_date', 'estimated_arrival_date']
    ordering = ['-created_at'] # Default ordering

    def get_queryset(self):
        """
        This view should return a list of shipments based on user's scope.
        """
        return get_shipments_for_user(self.request.user).prefetch_related('items')

    def perform_create(self, serializer):
        """
        Custom creation logic using the service layer.
        """
        try:
            # Extract items data if present, it's handled by the serializer's .create()
            # shipment_data = serializer.validated_data # This already includes items if serializer handles it
            # items_data = shipment_data.pop('items', [])
            
            # If serializer's create method is robust, just call serializer.save()
            # and pass the user for context if needed by the service.
            # For now, assuming serializer.save() calls the model's save which handles tracking_number.
            # If assigned_depot needs to be set from user, it should be handled in serializer or service.
            
            # The ShipmentSerializer's create method now handles items.
            # We can pass the user to serializer.save if we want to use it there.
            # Example: serializer.save(creating_user=self.request.user)
            # For now, assuming assigned_depot is part of the request payload or set by user's profile implicitly.
            serializer.save()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        except Exception as e:
            # Log the exception e
            raise serializers.ValidationError({"detail": "An error occurred while creating the shipment."})


    def perform_update(self, serializer):
        """
        Custom update logic using the service layer (if more complex logic is needed than serializer).
        The serializer's update method already handles nested item updates.
        """
        try:
            # The ShipmentSerializer's update method handles items.
            # Pass user if service layer needs it for permission checks within update.
            # serializer.save(updating_user=self.request.user)
            serializer.save()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        except PermissionDenied as e:
            raise serializers.ValidationError({"detail": str(e)}, code=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            # Log the exception e
            raise serializers.ValidationError({"detail": "An error occurred while updating the shipment."})


class ConsignmentItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows consignment items to be viewed or edited.
    """
    serializer_class = ConsignmentItemSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageConsignmentItems] # Apply specific item permissions
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'shipment__tracking_number': ['exact'],
        'shipment__assigned_depot': ['exact'],
        'is_dangerous_good': ['exact'],
        'un_number': ['exact', 'icontains'],
        'hazard_class': ['exact', 'in'],
        'packing_group': ['exact', 'in'],
    }
    search_fields = ['description', 'un_number', 'proper_shipping_name', 'shipment__tracking_number', 'shipment__reference_number']
    ordering_fields = ['created_at', 'shipment', 'is_dangerous_good']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter items based on shipments accessible to the user.
        """
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return ConsignmentItem.objects.all().select_related('shipment')
        
        accessible_shipments_qs = get_shipments_for_user(user)
        return ConsignmentItem.objects.filter(shipment__in=accessible_shipments_qs).select_related('shipment')

    def perform_create(self, serializer):
        # Ensure the shipment for the item exists and user has permission for that shipment
        shipment_id = serializer.validated_data.get('shipment').id
        try:
            shipment = Shipment.objects.get(pk=shipment_id)
            # Check permission on parent shipment
            permission_checker = IsAdminOrAssignedDepotUserForShipment()
            if not permission_checker.has_object_permission(self.request, self, shipment):
                raise PermissionDenied("You do not have permission to add items to this shipment.")
            serializer.save()
        except Shipment.DoesNotExist:
            raise serializers.ValidationError({"shipment": "Shipment not found."})
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))


    def perform_update(self, serializer):
        # Ensure user has permission for the item's shipment
        # The CanManageConsignmentItems permission already checks this via has_object_permission
        try:
            serializer.save()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
