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
from .adg_safety_services import ADGComplianceValidator, ADGSafetyEquipmentService

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
    queryset = Vehicle.objects.all().select_related('owning_company')
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

    @action(detail=False, methods=['get'], url_path='fleet-status')
    def fleet_status(self, request):
        """Get real-time fleet status for dashboard - matches frontend mock API structure."""
        from django.contrib.auth import get_user_model
        from shipments.models import Shipment
        from django.db.models import Q, Prefetch
        from rest_framework.validators import ValidationError
        
        # Input validation
        try:
            # Validate optional query parameters
            limit = int(request.query_params.get('limit', 100))
            if limit < 1 or limit > 1000:
                return Response(
                    {'error': 'Limit must be between 1 and 1000'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': 'Limit must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        User = get_user_model()
        user_role = getattr(request.user, 'role', 'USER')
        user_id = str(request.user.id)
        
        # Build queryset with proper filtering based on user role
        queryset = Vehicle.objects.select_related(
            'owning_company', 'assigned_driver'
        ).prefetch_related(
            Prefetch(
                'assigned_shipments',
                queryset=Shipment.objects.filter(
                    status__in=['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'AT_HUB']
                ).select_related('customer', 'freight_type').first()
            )
        )
        
        # Apply role-based filtering
        if user_role == 'DRIVER':
            queryset = queryset.filter(assigned_driver=request.user)
        elif hasattr(request.user, 'company') and request.user.company:
            queryset = queryset.filter(owning_company=request.user.company)
        
        vehicles_data = []
        for vehicle in queryset:
            # Get active shipment if any
            active_shipment = vehicle.assigned_shipments.first() if hasattr(vehicle, 'assigned_shipments') else None
            active_shipment_data = None
            
            if active_shipment:
                # Build dangerous goods data
                dangerous_goods = []
                try:
                    from dangerous_goods.models import DangerousGood
                    from manifests.models import ConsignmentItem
                    
                    # Get dangerous goods from shipment items
                    items = ConsignmentItem.objects.filter(
                        shipment=active_shipment, 
                        dangerous_good__isnull=False
                    ).select_related('dangerous_good')
                    
                    for item in items:
                        dg = item.dangerous_good
                        dangerous_goods.append({
                            'unNumber': dg.un_number,
                            'properShippingName': dg.proper_shipping_name,
                            'class': dg.hazard_class,
                            'packingGroup': dg.packing_group,
                            'quantity': f"{item.quantity} {item.unit}",
                        })
                except:
                    # Handle gracefully if models don't exist yet
                    pass
                
                active_shipment_data = {
                    'id': str(active_shipment.id),
                    'trackingNumber': active_shipment.tracking_number,
                    'status': active_shipment.status,
                    'origin': active_shipment.origin_location,
                    'destination': active_shipment.destination_location,
                    'customerName': active_shipment.customer.name if active_shipment.customer else '',
                    'estimatedDelivery': active_shipment.estimated_delivery_date.isoformat() if active_shipment.estimated_delivery_date else None,
                    'hasDangerousGoods': len(dangerous_goods) > 0,
                    'dangerousGoods': dangerous_goods,
                    'emergencyContact': getattr(active_shipment, 'emergency_contact', ''),
                    'specialInstructions': getattr(active_shipment, 'special_instructions', ''),
                }
            
            # Determine vehicle status
            vehicle_status = 'AVAILABLE'
            if active_shipment:
                if active_shipment.status == 'IN_TRANSIT':
                    vehicle_status = 'IN_TRANSIT'
                elif active_shipment.status == 'OUT_FOR_DELIVERY':
                    vehicle_status = 'DELIVERING'
                elif active_shipment.status == 'AT_HUB':
                    vehicle_status = 'AT_HUB'
            
            # Build vehicle location (use dummy data for now)
            location = {
                'latitude': -31.9505 + (hash(str(vehicle.id)) % 1000) / 10000,  # Perth area
                'longitude': 115.8605 + (hash(str(vehicle.id)) % 1000) / 10000,
                'address': f'Location for {vehicle.registration_number}',
                'lastUpdated': timezone.now().isoformat(),
            }
            
            vehicles_data.append({
                'id': str(vehicle.id),
                'registration': vehicle.registration_number,
                'type': vehicle.vehicle_type,
                'status': vehicle_status,
                'location': location,
                'locationIsFresh': True,
                'assignedDriver': {
                    'id': str(vehicle.assigned_driver.id),
                    'name': f"{vehicle.assigned_driver.first_name} {vehicle.assigned_driver.last_name}".strip(),
                    'email': vehicle.assigned_driver.email,
                } if vehicle.assigned_driver else None,
                'activeShipment': active_shipment_data,
                'make': getattr(vehicle, 'make', ''),
                'year': getattr(vehicle, 'year', None),
                'configuration': getattr(vehicle, 'configuration', ''),
                'maxWeight': getattr(vehicle, 'gvm_kg', None),
                'maxLength': getattr(vehicle, 'max_length_m', None),
                'axles': getattr(vehicle, 'axles', None),
                'engineSpec': getattr(vehicle, 'engine_details', ''),
                'gearbox': getattr(vehicle, 'transmission', ''),
                'fuel': getattr(vehicle, 'fuel_type', ''),
                'odometer': getattr(vehicle, 'odometer_km', None),
                'nextService': getattr(vehicle, 'next_service_date', None),
                'lastInspection': getattr(vehicle, 'last_inspection_date', None),
            })
        
        return Response({
            'vehicles': vehicles_data,
            'timestamp': timezone.now().isoformat(),
        })
    
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


# ADG-specific API endpoints

@action(detail=True, methods=['get'], url_path='adg-compliance')
def adg_safety_compliance(self, request, pk=None):
    """Check vehicle ADG Code 7.9 safety equipment compliance"""
    vehicle = self.get_object()
    adg_classes = request.query_params.getlist('adg_classes', ['ALL_CLASSES'])
    
    compliance_result = ADGComplianceValidator.validate_comprehensive_adg_compliance(
        vehicle, adg_classes
    )
    
    return Response(compliance_result)


@action(detail=False, methods=['get'], url_path='adg-fleet-report')
def adg_fleet_compliance_report(self, request):
    """Generate comprehensive ADG fleet compliance report"""
    company_id = request.query_params.get('company_id')
    
    report = ADGSafetyEquipmentService.generate_adg_fleet_compliance_report(company_id)
    
    return Response(report)


@action(detail=False, methods=['get'], url_path='adg-inspections-due')
def adg_inspections_due(self, request):
    """Get ADG equipment inspections due in the next N days"""
    days_ahead = int(request.query_params.get('days_ahead', 30))
    
    inspections = ADGSafetyEquipmentService.get_upcoming_adg_inspections(days_ahead)
    
    return Response({
        'inspections_due': inspections,
        'total_count': len(inspections),
        'days_ahead': days_ahead,
        'regulatory_framework': 'ADG Code 7.9'
    })


# Add ADG methods to the VehicleViewSet class
VehicleViewSet.adg_safety_compliance = adg_safety_compliance
VehicleViewSet.adg_fleet_compliance_report = adg_fleet_compliance_report
VehicleViewSet.adg_inspections_due = adg_inspections_due 