from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Vehicle
from .serializers import VehicleSerializer
from .services import (
    create_vehicle,
    assign_driver_to_vehicle,
    list_available_vehicles_for_depot,
    get_vehicle_by_registration
)

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow staff users to edit vehicles.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class VehicleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing vehicles.
    
    list:
    Return a list of all vehicles.
    
    retrieve:
    Return the details of a specific vehicle.
    
    create:
    Create a new vehicle (staff only).
    
    update:
    Update a vehicle's details (staff only).
    
    partial_update:
    Partially update a vehicle's details (staff only).
    
    destroy:
    Delete a vehicle (staff only).
    """
    queryset = Vehicle.objects.all().select_related('assigned_depot', 'owning_company')
    serializer_class = VehicleSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vehicle_type', 'status', 'assigned_depot', 'owning_company']
    search_fields = ['registration_number']
    ordering_fields = ['registration_number', 'created_at', 'updated_at']
    ordering = ['registration_number']

    def perform_create(self, serializer):
        """Create a vehicle using the service layer."""
        data = serializer.validated_data
        vehicle = create_vehicle(data)
        serializer.instance = vehicle

    @action(detail=True, methods=['post'])
    def assign_driver(self, request, pk=None):
        """Assign a driver to a vehicle."""
        vehicle = self.get_object()
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
            
            updated_vehicle = assign_driver_to_vehicle(vehicle, driver)
            serializer = self.get_serializer(updated_vehicle)
            return Response(serializer.data)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Driver not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def available_at_depot(self, request):
        """List available vehicles at a specific depot."""
        depot_id = request.query_params.get('depot_id')
        
        if not depot_id:
            return Response(
                {'error': 'depot_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            from locations.models import GeoLocation
            depot = GeoLocation.objects.get(id=depot_id, type='DEPOT')
            vehicles = list_available_vehicles_for_depot(depot)
            serializer = self.get_serializer(vehicles, many=True)
            return Response(serializer.data)
            
        except GeoLocation.DoesNotExist:
            return Response(
                {'error': 'Depot not found'}, 
                status=status.HTTP_404_NOT_FOUND
            ) 