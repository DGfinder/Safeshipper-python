from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import (
    Vehicle, SafetyEquipmentType, VehicleSafetyEquipment,
    SafetyEquipmentInspection, SafetyEquipmentCertification
)
from .serializers import (
    VehicleSerializer, VehicleDetailSerializer, SafetyEquipmentTypeSerializer,
    VehicleSafetyEquipmentSerializer, SafetyEquipmentInspectionSerializer,
    SafetyEquipmentCertificationSerializer, VehicleSafetyComplianceSerializer
)
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
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return VehicleDetailSerializer
        return VehicleSerializer
    
    @action(detail=True, methods=['get'])
    def safety_compliance(self, request, pk=None):
        """Check vehicle safety equipment compliance for dangerous goods transport"""
        vehicle = self.get_object()
        adr_classes = request.query_params.getlist('adr_classes', ['ALL_CLASSES'])
        
        serializer = VehicleSafetyComplianceSerializer(
            vehicle, 
            context={'adr_classes': adr_classes}
        )
        return Response(serializer.data)


class SafetyEquipmentTypeViewSet(viewsets.ModelViewSet):
    """API endpoint for managing safety equipment types"""
    queryset = SafetyEquipmentType.objects.all()
    serializer_class = SafetyEquipmentTypeSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'is_active', 'required_by_vehicle_weight']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'category', 'created_at']
    ordering = ['category', 'name']

    def get_queryset(self):
        """Filter active equipment types by default"""
        queryset = super().get_queryset()
        if self.request.query_params.get('include_inactive') != 'true':
            queryset = queryset.filter(is_active=True)
        return queryset


class VehicleSafetyEquipmentViewSet(viewsets.ModelViewSet):
    """API endpoint for managing vehicle safety equipment instances"""
    queryset = VehicleSafetyEquipment.objects.select_related(
        'vehicle', 'equipment_type'
    ).prefetch_related('inspections', 'certifications')
    serializer_class = VehicleSafetyEquipmentSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = [
        'vehicle', 'equipment_type', 'status', 'equipment_type__category'
    ]
    search_fields = ['serial_number', 'manufacturer', 'model', 'vehicle__registration_number']
    ordering_fields = ['installation_date', 'expiry_date', 'next_inspection_date']
    ordering = ['-installation_date']

    def get_queryset(self):
        """Filter by vehicle if specified"""
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle_id')
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        return queryset

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get equipment expiring within the next 30 days"""
        from datetime import timedelta
        cutoff_date = timezone.now().date() + timedelta(days=30)
        
        equipment = self.get_queryset().filter(
            status='ACTIVE',
            expiry_date__lte=cutoff_date,
            expiry_date__gte=timezone.now().date()
        )
        
        serializer = self.get_serializer(equipment, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def inspection_due(self, request):
        """Get equipment with inspections due"""
        equipment = self.get_queryset().filter(
            status='ACTIVE',
            next_inspection_date__lte=timezone.now().date()
        )
        
        serializer = self.get_serializer(equipment, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def schedule_inspection(self, request, pk=None):
        """Schedule an inspection for this equipment"""
        equipment = self.get_object()
        inspection_date = request.data.get('inspection_date')
        inspection_type = request.data.get('inspection_type', 'ROUTINE')
        
        if not inspection_date:
            return Response(
                {'error': 'inspection_date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create inspection record
        inspection = SafetyEquipmentInspection.objects.create(
            equipment=equipment,
            inspection_type=inspection_type,
            inspection_date=inspection_date,
            inspector=request.user,
            result='PASSED'  # Default, will be updated during inspection
        )
        
        serializer = SafetyEquipmentInspectionSerializer(inspection)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SafetyEquipmentInspectionViewSet(viewsets.ModelViewSet):
    """API endpoint for managing safety equipment inspections"""
    queryset = SafetyEquipmentInspection.objects.select_related(
        'equipment', 'equipment__vehicle', 'inspector'
    )
    serializer_class = SafetyEquipmentInspectionSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = [
        'equipment', 'equipment__vehicle', 'inspection_type', 'result'
    ]
    search_fields = ['equipment__serial_number', 'equipment__vehicle__registration_number']
    ordering_fields = ['inspection_date', 'created_at']
    ordering = ['-inspection_date']

    def perform_create(self, serializer):
        """Set inspector to current user if not specified"""
        if not serializer.validated_data.get('inspector'):
            serializer.save(inspector=self.request.user)
        else:
            serializer.save()


class SafetyEquipmentCertificationViewSet(viewsets.ModelViewSet):
    """API endpoint for managing safety equipment certifications"""
    queryset = SafetyEquipmentCertification.objects.select_related(
        'equipment', 'equipment__vehicle'
    )
    serializer_class = SafetyEquipmentCertificationSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = [
        'equipment', 'equipment__vehicle', 'certification_type'
    ]
    search_fields = [
        'certificate_number', 'issuing_authority', 
        'equipment__serial_number', 'equipment__vehicle__registration_number'
    ]
    ordering_fields = ['issue_date', 'expiry_date', 'created_at']
    ordering = ['-issue_date']

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get certifications expiring within the next 60 days"""
        from datetime import timedelta
        cutoff_date = timezone.now().date() + timedelta(days=60)
        
        certifications = self.get_queryset().filter(
            expiry_date__lte=cutoff_date,
            expiry_date__gte=timezone.now().date()
        )
        
        serializer = self.get_serializer(certifications, many=True)
        return Response(serializer.data) 