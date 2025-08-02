# dangerous_goods/api_views.py
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone

from .models import (
    DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule,
    ADGPlacardRule, PlacardRequirement, PlacardCalculationLog,
    DigitalPlacard, PlacardVerification, PlacardTemplate
)
from .emergency_info_panel import EmergencyContact, EmergencyProcedure
from .transport_documents import TransportDocument, ADGTransportDocumentGenerator
from .limited_quantity_handler import LimitedQuantityLimit, LimitedQuantityHandler
from .serializers import (
    DangerousGoodSerializer,
    DGProductSynonymSerializer,
    SegregationGroupSerializer,
    SegregationRuleSerializer
)
from .permissions import CanManageDGData
from .services import (
    get_dangerous_good_by_un_number, 
    check_dg_compatibility, 
    match_synonym_to_dg,
    check_list_compatibility
)
from .placard_calculator import ADGPlacardCalculator
from .placard_generator import ADGPlacardGenerator
from .emergency_info_panel import EIPGenerator
from shared.rate_limiting import DangerousGoodsRateThrottle
from shared.caching_service import DangerousGoodsCacheService
# from sds.models import SafetyDataSheet
# from sds.services import SDSDocumentProcessor

class DangerousGoodViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for Dangerous Goods information.
    Provides searchable list of all dangerous goods for frontend selection fields.
    """
    queryset = DangerousGood.objects.all().order_by('un_number')
    serializer_class = DangerousGoodSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DangerousGoodsRateThrottle]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'un_number': ['exact', 'icontains', 'startswith'],
        'proper_shipping_name': ['icontains'],
        'hazard_class': ['exact', 'in'],
        'packing_group': ['exact', 'in'],
        'is_marine_pollutant': ['exact'],
        'is_environmentally_hazardous': ['exact'],
    }
    search_fields = ['un_number', 'proper_shipping_name', 'simplified_name']
    ordering_fields = ['un_number', 'proper_shipping_name', 'hazard_class']
    
    def list(self, request, *args, **kwargs):
        """List dangerous goods with caching for filtered queries."""
        # Build filter parameters for cache key
        filter_params = {}
        for key, value in request.query_params.items():
            if key not in ['page', 'page_size']:  # Exclude pagination params from cache
                filter_params[key] = value
        
        # Check cache for this specific filter combination
        cached_list = DangerousGoodsCacheService.get_dangerous_goods_list(filter_params)
        if cached_list:
            # Return cached data with pagination if needed
            page = self.paginate_queryset(cached_list)
            if page is not None:
                return self.get_paginated_response(page)
            return Response(cached_list)
        
        # Fall back to normal queryset processing
        response = super().list(request, *args, **kwargs)
        
        # Cache the results for future requests
        if response.status_code == 200:
            data_to_cache = response.data
            if isinstance(data_to_cache, dict) and 'results' in data_to_cache:
                # Paginated response - cache the results
                DangerousGoodsCacheService.cache_dangerous_goods_list(filter_params, data_to_cache['results'])
            else:
                # Non-paginated response
                DangerousGoodsCacheService.cache_dangerous_goods_list(filter_params, data_to_cache)
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve single dangerous good with caching."""
        instance = self.get_object()
        
        # Check cache by UN number if available
        if hasattr(instance, 'un_number'):
            cached_dg = DangerousGoodsCacheService.get_dangerous_good_by_un(instance.un_number)
            if cached_dg:
                return Response(cached_dg)
        
        # Fall back to normal serialization
        serializer = self.get_serializer(instance)
        result_data = serializer.data
        
        # Cache the result by UN number
        if hasattr(instance, 'un_number'):
            DangerousGoodsCacheService.cache_dangerous_good_by_un(instance.un_number, result_data)
        
        return Response(result_data)

    @action(detail=False, methods=['get'], url_path='lookup-by-synonym')
    def lookup_by_synonym(self, request):
        """Look up dangerous good by synonym or alternative name with caching."""
        query = request.query_params.get('query', None)
        if not query:
            return Response({'error': 'Query parameter "query" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check cache first
        cached_result = DangerousGoodsCacheService.get_synonym_match(query)
        if cached_result:
            return Response(cached_result)

        dg = match_synonym_to_dg(query)
        if dg:
            serializer = self.get_serializer(dg)
            result_data = serializer.data
            
            # Cache the result
            DangerousGoodsCacheService.cache_synonym_match(query, result_data)
            
            return Response(result_data)
        
        # Cache negative result to prevent repeated lookups
        negative_result = {'message': 'No matching dangerous good found for the synonym.'}
        DangerousGoodsCacheService.cache_synonym_match(query, negative_result)
        
        return Response(negative_result, status=status.HTTP_404_NOT_FOUND)


class DGCompatibilityCheckView(views.APIView):
    """
    API endpoint for checking compatibility between multiple dangerous goods.
    Accepts a POST request with a list of UN numbers and returns compatibility results.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DangerousGoodsRateThrottle]

    def post(self, request):
        """
        Check compatibility between a list of UN numbers with caching.
        
        Expected payload:
        {
            "un_numbers": ["1090", "1381", "1203"]
        }
        
        Returns:
        {
            "is_compatible": false,
            "conflicts": [
                {
                    "un_number_1": "1090",
                    "un_number_2": "1381", 
                    "reason": "Class 3 Flammable Liquids are incompatible with Class 4.2 Spontaneously Combustible materials."
                }
            ]
        }
        """
        un_numbers = request.data.get('un_numbers', [])
        
        if not un_numbers:
            return Response(
                {"error": "Field 'un_numbers' is required and must be a non-empty list."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(un_numbers, list):
            return Response(
                {"error": "Field 'un_numbers' must be a list."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(un_numbers) < 2:
            return Response(
                {"error": "At least 2 UN numbers are required for compatibility checking."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Check cache first
            cached_result = DangerousGoodsCacheService.get_compatibility_result(un_numbers)
            if cached_result:
                return Response(cached_result, status=status.HTTP_200_OK)
            
            # Use the service function to check compatibility
            result = check_list_compatibility(un_numbers)
            
            # Cache the result
            DangerousGoodsCacheService.cache_compatibility_result(un_numbers, result)
            
            return Response(result, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {"error": f"An error occurred while checking compatibility: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# PHAnalysisView class removed due to SDS dependencies


class DGProductSynonymViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing DG Product Synonyms.
    """
    queryset = DGProductSynonym.objects.select_related('dangerous_good').all()
    serializer_class = DGProductSynonymSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageDGData] # Use CanManageDGData
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['dangerous_good__un_number', 'source', 'synonym']
    search_fields = ['synonym', 'dangerous_good__un_number', 'dangerous_good__proper_shipping_name']
    ordering_fields = ['synonym', 'dangerous_good__un_number', 'created_at']
    ordering = ['-created_at']


class SegregationGroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Segregation Groups.
    """
    queryset = SegregationGroup.objects.prefetch_related('dangerous_goods').all()
    serializer_class = SegregationGroupSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageDGData] # Use CanManageDGData
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['code', 'name']
    search_fields = ['code', 'name', 'description', 'dangerous_goods__un_number']
    ordering_fields = ['name', 'code']

class SegregationRuleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Segregation Rules.
    """
    queryset = SegregationRule.objects.select_related('primary_segregation_group', 'secondary_segregation_group').all()
    serializer_class = SegregationRuleSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageDGData] # Use CanManageDGData
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'rule_type': ['exact'],
        'compatibility_status': ['exact', 'in'],
        'primary_hazard_class': ['exact', 'in'],
        'secondary_hazard_class': ['exact', 'in'],
        'primary_segregation_group__code': ['exact'],
        'secondary_segregation_group__code': ['exact'],
    }
    search_fields = ['primary_hazard_class', 'secondary_hazard_class', 'notes', 'primary_segregation_group__name', 'secondary_segregation_group__name']
    ordering_fields = ['rule_type', 'compatibility_status']

    @action(detail=False, methods=['post'], url_path='check-compatibility', permission_classes=[permissions.IsAuthenticated])
    def check_dg_item_compatibility(self, request):
        un_number1 = request.data.get('un_number1')
        un_number2 = request.data.get('un_number2')

        if not un_number1 or not un_number2:
            return Response({"error": "Both 'un_number1' and 'un_number2' are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check cache for individual DG lookups
        cached_dg1 = DangerousGoodsCacheService.get_dangerous_good_by_un(un_number1)
        cached_dg2 = DangerousGoodsCacheService.get_dangerous_good_by_un(un_number2)
        
        if cached_dg1:
            dg1 = cached_dg1
        else:
            dg1 = get_dangerous_good_by_un_number(un_number1)
            if dg1:
                # Cache the dangerous good data
                serializer = DangerousGoodSerializer(dg1)
                DangerousGoodsCacheService.cache_dangerous_good_by_un(un_number1, serializer.data)
        
        if cached_dg2:
            dg2 = cached_dg2
        else:
            dg2 = get_dangerous_good_by_un_number(un_number2)
            if dg2:
                # Cache the dangerous good data
                serializer = DangerousGoodSerializer(dg2)
                DangerousGoodsCacheService.cache_dangerous_good_by_un(un_number2, serializer.data)

        if not dg1:
            return Response({"error": f"UN Number '{un_number1}' not found."}, status=status.HTTP_404_NOT_FOUND)
        if not dg2:
            return Response({"error": f"UN Number '{un_number2}' not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if we have cached compatibility result
        cached_compatibility = DangerousGoodsCacheService.get_compatibility_result([un_number1, un_number2])
        if cached_compatibility:
            return Response(cached_compatibility)
        
        compatibility_result = check_dg_compatibility(dg1, dg2)
        
        # Cache the compatibility result
        DangerousGoodsCacheService.cache_compatibility_result([un_number1, un_number2], compatibility_result)
        
        return Response(compatibility_result)


class ADGPlacardCalculationView(views.APIView):
    """
    API endpoint for calculating ADG Code 7.9 placard requirements for shipments.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Calculate placard requirements for a shipment.
        
        Expected payload:
        {
            "shipment_id": "uuid-string-here"
        }
        
        Returns:
        {
            "shipment_id": "uuid",
            "placard_status": "REQUIRED",
            "required_placards": ["CLASS_DIAMOND", "EMERGENCY_INFO_PANEL"],
            "calculation_summary": {
                "total_dg_weight_kg": 1250.5,
                "total_dg_volume_l": 800.0,
                "combined_quantity_kg": 1350.5,
                "has_large_receptacles": true,
                "class_2_1_quantity_kg": 300.0
            },
            "rules_triggered": [
                {
                    "rule_type": "STANDARD_DG",
                    "description": "Total aggregate quantity ≥ 1000kg/L",
                    "threshold": 1000,
                    "measured_quantity": 1250.5,
                    "regulatory_reference": "ADG Code 7.9 Table 5.3.1(g)"
                }
            ],
            "calculation_details": {...},
            "calculated_at": "2025-01-12T10:30:00Z"
        }
        """
        from shipments.models import Shipment
        
        shipment_id = request.data.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {"error": "Field 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Calculate placard requirements
            calculator = ADGPlacardCalculator()
            placard_req = calculator.calculate_placard_requirement(shipment, request.user)
            
            # Build response
            response_data = {
                "shipment_id": str(shipment.id),
                "tracking_number": shipment.tracking_number,
                "placard_status": placard_req.placard_status,
                "required_placards": placard_req.required_placard_types,
                "required_placards_display": placard_req.get_required_placards_display(),
                "calculation_summary": {
                    "total_dg_weight_kg": placard_req.total_dg_weight_kg,
                    "total_dg_volume_l": placard_req.total_dg_volume_l,
                    "total_lq_weight_kg": placard_req.total_lq_weight_kg,
                    "combined_quantity_kg": placard_req.combined_quantity_kg,
                    "has_large_receptacles": placard_req.has_large_receptacles,
                    "class_2_1_quantity_kg": placard_req.class_2_1_quantity_kg,
                    "dangerous_goods_count": shipment.items.filter(is_dangerous_good=True).count()
                },
                "rules_triggered": placard_req.calculation_details.get('rules_triggered', []),
                "calculation_details": placard_req.calculation_details,
                "calculated_at": placard_req.calculated_at,
                "calculated_by": placard_req.calculated_by.username if placard_req.calculated_by else None
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred during placard calculation: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request):
        """
        Get existing placard calculation for a shipment.
        
        Query parameters:
        - shipment_id: UUID of the shipment
        """
        from shipments.models import Shipment
        
        shipment_id = request.query_params.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {"error": "Query parameter 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
            
            # Check if placard calculation exists
            try:
                placard_req = PlacardRequirement.objects.get(shipment=shipment)
                
                response_data = {
                    "shipment_id": str(shipment.id),
                    "tracking_number": shipment.tracking_number,
                    "placard_status": placard_req.placard_status,
                    "required_placards": placard_req.required_placard_types,
                    "required_placards_display": placard_req.get_required_placards_display(),
                    "calculation_summary": {
                        "total_dg_weight_kg": placard_req.total_dg_weight_kg,
                        "total_dg_volume_l": placard_req.total_dg_volume_l,
                        "total_lq_weight_kg": placard_req.total_lq_weight_kg,
                        "combined_quantity_kg": placard_req.combined_quantity_kg,
                        "has_large_receptacles": placard_req.has_large_receptacles,
                        "class_2_1_quantity_kg": placard_req.class_2_1_quantity_kg
                    },
                    "calculation_details": placard_req.calculation_details,
                    "calculated_at": placard_req.calculated_at,
                    "calculated_by": placard_req.calculated_by.username if placard_req.calculated_by else None
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            except PlacardRequirement.DoesNotExist:
                return Response(
                    {"message": "No placard calculation found for this shipment."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ADGPlacardRuleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for ADG Placard Rules.
    Used for viewing current placard calculation rules.
    """
    queryset = ADGPlacardRule.objects.filter(is_active=True).order_by('priority')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['placard_type', 'hazard_class', 'is_active']
    search_fields = ['description', 'regulatory_reference']
    ordering_fields = ['priority', 'placard_type', 'threshold_quantity']
    
    def get_serializer_class(self):
        # Simple serializer for now - can be enhanced later
        from rest_framework import serializers
        
        class ADGPlacardRuleSerializer(serializers.ModelSerializer):
            class Meta:
                model = ADGPlacardRule
                fields = '__all__'
        
        return ADGPlacardRuleSerializer


class PlacardCalculationLogView(views.APIView):
    """
    API endpoint for viewing placard calculation audit logs.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get calculation logs for a placard requirement.
        
        Query parameters:
        - shipment_id: UUID of the shipment
        """
        from shipments.models import Shipment
        
        shipment_id = request.query_params.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {"error": "Query parameter 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
            placard_req = PlacardRequirement.objects.get(shipment=shipment)
            
            # Get calculation logs
            logs = PlacardCalculationLog.objects.filter(
                placard_requirement=placard_req
            ).order_by('created_at')
            
            log_data = []
            for log in logs:
                log_data.append({
                    'rule_description': log.rule_applied.description if log.rule_applied else 'General Calculation',
                    'rule_triggered': log.rule_triggered,
                    'measured_quantity': log.measured_quantity,
                    'threshold_quantity': log.threshold_quantity,
                    'calculation_notes': log.calculation_notes,
                    'created_at': log.created_at
                })
            
            response_data = {
                'shipment_id': str(shipment.id),
                'tracking_number': shipment.tracking_number,
                'calculation_logs': log_data,
                'log_count': len(log_data)
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except PlacardRequirement.DoesNotExist:
            return Response(
                {"error": "No placard calculation found for this shipment."}, 
                status=status.HTTP_404_NOT_FOUND
            )


class DigitalPlacardGenerationView(views.APIView):
    """
    API endpoint for generating digital placards from placard requirements.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Generate digital placards for a shipment.
        
        Expected payload:
        {
            "shipment_id": "uuid-string-here"
        }
        
        Returns:
        {
            "shipment_id": "uuid",
            "placards_generated": [
                {
                    "placard_id": "PLC-ABC12345",
                    "placard_type": "CLASS_DIAMOND",
                    "qr_code_url": "https://...",
                    "placard_image_url": "https://...",
                    "placement_location": "front,rear",
                    "hazard_classes": ["3", "8"]
                }
            ],
            "generation_summary": {
                "total_placards": 2,
                "successful": 2,
                "failed": 0
            }
        }
        """
        from shipments.models import Shipment
        
        shipment_id = request.data.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {"error": "Field 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if placard requirement exists
        try:
            placard_req = PlacardRequirement.objects.get(shipment=shipment)
        except PlacardRequirement.DoesNotExist:
            return Response(
                {"error": "No placard requirement found. Calculate placard requirements first."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if placard_req.placard_status != PlacardRequirement.PlacardStatus.REQUIRED:
            return Response(
                {"error": "No placards required for this shipment."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate digital placards
            generator = ADGPlacardGenerator()
            placards = generator.generate_placards_for_requirement(placard_req, request.user)
            
            # Build response
            placard_data = []
            successful = 0
            failed = 0
            
            for placard in placards:
                if placard:
                    placard_data.append({
                        "placard_id": placard.placard_id,
                        "placard_type": placard.placard_type,
                        "placard_type_display": placard.get_placard_type_display(),
                        "qr_code_url": placard.qr_code_url,
                        "placard_image_url": placard.placard_image_url,
                        "placard_pdf_url": placard.placard_pdf_url,
                        "placement_location": placard.placement_location,
                        "hazard_classes": placard.get_hazard_classes(),
                        "status": placard.status,
                        "valid_until": placard.valid_until,
                        "created_at": placard.created_at
                    })
                    successful += 1
                else:
                    failed += 1
            
            response_data = {
                "shipment_id": str(shipment.id),
                "tracking_number": shipment.tracking_number,
                "placards_generated": placard_data,
                "generation_summary": {
                    "total_placards": len(placard_req.required_placard_types),
                    "successful": successful,
                    "failed": failed
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred during placard generation: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DigitalPlacardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for viewing digital placards.
    """
    queryset = DigitalPlacard.objects.select_related(
        'placard_requirement__shipment'
    ).prefetch_related('dangerous_goods').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['placard_type', 'status', 'placard_requirement__shipment']
    search_fields = ['placard_id', 'placard_requirement__shipment__tracking_number']
    ordering_fields = ['created_at', 'placard_id', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class DigitalPlacardSerializer(serializers.ModelSerializer):
            shipment_tracking_number = serializers.CharField(
                source='placard_requirement.shipment.tracking_number', 
                read_only=True
            )
            hazard_classes = serializers.SerializerMethodField()
            placard_type_display = serializers.CharField(
                source='get_placard_type_display', 
                read_only=True
            )
            is_valid = serializers.BooleanField(read_only=True)
            
            class Meta:
                model = DigitalPlacard
                fields = '__all__'
            
            def get_hazard_classes(self, obj):
                return obj.get_hazard_classes()
        
        return DigitalPlacardSerializer


class PlacardVerificationView(views.APIView):
    """
    API endpoint for verifying placards using QR code or manual verification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Verify a placard.
        
        Expected payload:
        {
            "placard_id": "PLC-ABC12345",
            "verification_type": "QR_SCAN",
            "verification_result": "VALID",
            "verification_location": "GPS coordinates or address",
            "vehicle_registration": "ABC123",
            "scanned_data": "raw QR data",
            "notes": "Additional notes"
        }
        """
        placard_id = request.data.get('placard_id')
        verification_type = request.data.get('verification_type', 'QR_SCAN')
        verification_result = request.data.get('verification_result')
        
        if not placard_id or not verification_result:
            return Response(
                {"error": "Fields 'placard_id' and 'verification_result' are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            digital_placard = DigitalPlacard.objects.get(placard_id=placard_id)
        except DigitalPlacard.DoesNotExist:
            return Response(
                {"error": "Digital placard not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Create verification record
            verification = PlacardVerification.objects.create(
                digital_placard=digital_placard,
                verification_type=verification_type,
                verification_result=verification_result,
                verification_location=request.data.get('verification_location', ''),
                vehicle_registration=request.data.get('vehicle_registration', ''),
                scanned_data=request.data.get('scanned_data', ''),
                notes=request.data.get('notes', ''),
                verified_by=request.user
            )
            
            # Update placard status if needed
            if verification_result == PlacardVerification.VerificationResult.EXPIRED:
                digital_placard.status = DigitalPlacard.PlacardStatus.EXPIRED
                digital_placard.save()
            
            response_data = {
                "verification_id": verification.id,
                "placard_id": placard_id,
                "verification_result": verification_result,
                "placard_status": digital_placard.status,
                "is_valid": digital_placard.is_valid,
                "verified_at": verification.verified_at,
                "verified_by": request.user.username
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred during verification: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request):
        """
        Get placard information for verification (public endpoint for QR code scans).
        
        Query parameters:
        - placard_id: ID of the placard to verify
        """
        placard_id = request.query_params.get('placard_id')
        
        if not placard_id:
            return Response(
                {"error": "Query parameter 'placard_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            digital_placard = DigitalPlacard.objects.select_related(
                'placard_requirement__shipment'
            ).get(placard_id=placard_id)
            
            # Public verification data (limited information)
            response_data = {
                "placard_id": digital_placard.placard_id,
                "placard_type": digital_placard.get_placard_type_display(),
                "tracking_number": digital_placard.placard_requirement.shipment.tracking_number,
                "hazard_classes": digital_placard.get_hazard_classes(),
                "is_valid": digital_placard.is_valid,
                "status": digital_placard.get_status_display(),
                "valid_until": digital_placard.valid_until,
                "placement_location": digital_placard.placement_location,
                "generated_at": digital_placard.created_at
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except DigitalPlacard.DoesNotExist:
            return Response(
                {"error": "Placard not found or invalid ID."}, 
                status=status.HTTP_404_NOT_FOUND
            )


class PlacardTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for placard templates.
    """
    queryset = PlacardTemplate.objects.filter(is_active=True)
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['template_type', 'adg_compliant']
    search_fields = ['template_name', 'regulatory_reference']
    ordering_fields = ['template_type', 'template_name']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class PlacardTemplateSerializer(serializers.ModelSerializer):
            template_type_display = serializers.CharField(
                source='get_template_type_display', 
                read_only=True
            )
            dimensions = serializers.SerializerMethodField()
            
            class Meta:
                model = PlacardTemplate
                fields = '__all__'
            
            def get_dimensions(self, obj):
                return obj.get_dimensions()
        
        return PlacardTemplateSerializer


class EmergencyInformationPanelView(views.APIView):
    """
    API endpoint for generating Emergency Information Panel (EIP) content.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Generate Emergency Information Panel content for a digital placard.
        
        Query parameters:
        - placard_id: ID of the digital placard to generate EIP for
        
        Returns:
        {
            "placard_id": "PLC-ABC12345",
            "shipment_info": {
                "tracking_number": "SS123456789",
                "carrier": "SafeShipper Transport",
                "origin": "Sydney, NSW",
                "destination": "Melbourne, VIC"
            },
            "dangerous_goods_summary": {
                "un_numbers": ["UN1203", "UN1090"],
                "hazard_classes": ["3", "2.1"],
                "shipping_names": ["UN1203: Gasoline", "UN1090: Acetone"],
                "total_count": 2
            },
            "emergency_contacts": [
                {
                    "type": "Emergency Services",
                    "organization": "Emergency Services",
                    "phone": "000",
                    "description": "Fire, Police, Ambulance"
                }
            ],
            "immediate_procedures": [
                "STOP - Assess the situation",
                "Call emergency services: 000",
                "Evacuate area if necessary"
            ],
            "hazard_information": {...},
            "isolation_distances": {...},
            "fire_response": [...],
            "spill_response": [...],
            "medical_response": [...]
        }
        """
        placard_id = request.query_params.get('placard_id')
        
        if not placard_id:
            return Response(
                {"error": "Query parameter 'placard_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            digital_placard = DigitalPlacard.objects.select_related(
                'placard_requirement__shipment'
            ).prefetch_related('dangerous_goods').get(placard_id=placard_id)
            
        except DigitalPlacard.DoesNotExist:
            return Response(
                {"error": "Digital placard not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if this is an Emergency Information Panel placard
        if digital_placard.placard_type != PlacardRequirement.PlacardTypeRequired.EMERGENCY_INFO_PANEL:
            return Response(
                {"error": "This endpoint is only for Emergency Information Panel placards."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate EIP content
            eip_generator = EIPGenerator()
            eip_content = eip_generator.generate_eip_content(digital_placard)
            
            return Response(eip_content, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred generating EIP content: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """
        Generate EIP content for specific dangerous goods (for testing/preview).
        
        Expected payload:
        {
            "un_numbers": ["UN1203", "UN1090"],
            "shipment_details": {
                "tracking_number": "TEST123",
                "origin": "Test Origin",
                "destination": "Test Destination"
            }
        }
        """
        un_numbers = request.data.get('un_numbers', [])
        shipment_details = request.data.get('shipment_details', {})
        
        if not un_numbers:
            return Response(
                {"error": "Field 'un_numbers' is required and must be a non-empty list."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get dangerous goods
            dangerous_goods = DangerousGood.objects.filter(un_number__in=un_numbers)
            
            if not dangerous_goods.exists():
                return Response(
                    {"error": "No dangerous goods found for the provided UN numbers."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Generate test EIP content
            eip_generator = EIPGenerator()
            
            # Create mock digital placard data
            mock_eip_content = {
                'placard_id': 'TEST-EIP',
                'shipment_info': shipment_details,
                'dangerous_goods_summary': eip_generator._get_dg_summary(list(dangerous_goods)),
                'emergency_contacts': eip_generator._get_emergency_contacts(list(dangerous_goods)),
                'immediate_procedures': eip_generator._get_immediate_procedures(list(dangerous_goods)),
                'hazard_information': eip_generator._get_hazard_information(list(dangerous_goods)),
                'isolation_distances': eip_generator._get_isolation_distances(list(dangerous_goods)),
                'fire_response': eip_generator._get_fire_response_procedures(list(dangerous_goods)),
                'spill_response': eip_generator._get_spill_response_procedures(list(dangerous_goods)),
                'medical_response': eip_generator._get_medical_response_procedures(list(dangerous_goods)),
                'generated_at': timezone.now().isoformat(),
                'is_test': True
            }
            
            return Response(mock_eip_content, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred generating test EIP content: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmergencyContactViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for emergency contacts.
    """
    queryset = EmergencyContact.objects.filter(is_active=True).order_by('priority')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['contact_type', 'coverage_area', 'is_24_7_available']
    search_fields = ['organization_name', 'contact_name', 'coverage_area']
    ordering_fields = ['priority', 'organization_name', 'contact_type']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class EmergencyContactSerializer(serializers.ModelSerializer):
            contact_type_display = serializers.CharField(
                source='get_contact_type_display', 
                read_only=True
            )
            
            class Meta:
                model = EmergencyContact
                fields = '__all__'
        
        return EmergencyContactSerializer


class EmergencyProcedureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for emergency procedures.
    """
    queryset = EmergencyProcedure.objects.select_related('dangerous_good').filter(is_active=True)
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['procedure_type', 'dangerous_good__un_number', 'hazard_class']
    search_fields = ['procedure_title', 'dangerous_good__un_number', 'dangerous_good__proper_shipping_name']
    ordering_fields = ['priority', 'procedure_type', 'dangerous_good__un_number']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class EmergencyProcedureSerializer(serializers.ModelSerializer):
            procedure_type_display = serializers.CharField(
                source='get_procedure_type_display', 
                read_only=True
            )
            dangerous_good_display = serializers.SerializerMethodField()
            
            class Meta:
                model = EmergencyProcedure
                fields = '__all__'
            
            def get_dangerous_good_display(self, obj):
                if obj.dangerous_good:
                    return f"{obj.dangerous_good.un_number} - {obj.dangerous_good.proper_shipping_name}"
                return f"Class {obj.hazard_class}" if obj.hazard_class else "General"
        
        return EmergencyProcedureSerializer


class TransportDocumentGenerationView(views.APIView):
    """
    API endpoint for generating ADG Part 11 compliant transport documents.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Generate transport documents for a shipment.
        
        Expected payload:
        {
            "shipment_id": "uuid-string-here",
            "document_type": "DG_DECLARATION",
            "consignor_details": {
                "name": "Company Name",
                "address": "Full Address",
                "phone": "+61 xxx xxx xxx"
            },
            "emergency_contact": {
                "name": "Emergency Service",
                "phone": "000"
            }
        }
        
        Returns:
        {
            "document_id": "DOC-20250112-ABC12345",
            "document_type": "DANGEROUS_GOODS_DECLARATION",
            "status": "DRAFT",
            "adg_compliant": true,
            "validation_errors": [],
            "pdf_url": "https://...",
            "document_content": {...},
            "created_at": "2025-01-12T10:30:00Z"
        }
        """
        from shipments.models import Shipment
        
        shipment_id = request.data.get('shipment_id')
        document_type = request.data.get('document_type', 'DG_DECLARATION')
        
        if not shipment_id:
            return Response(
                {"error": "Field 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if shipment has dangerous goods
        dg_items = shipment.items.filter(is_dangerous_good=True)
        if not dg_items.exists():
            return Response(
                {"error": "No dangerous goods found in shipment. Transport documents are only required for dangerous goods."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate transport document
            generator = ADGTransportDocumentGenerator()
            
            if document_type == 'DG_DECLARATION':
                transport_doc = generator.generate_dangerous_goods_declaration(shipment, request.user)
            else:
                transport_doc = generator.generate_transport_document(shipment, request.user)
            
            # Override with provided details if any
            consignor_details = request.data.get('consignor_details', {})
            if consignor_details:
                if 'name' in consignor_details:
                    transport_doc.consignor_name = consignor_details['name']
                if 'address' in consignor_details:
                    transport_doc.consignor_address = consignor_details['address']
                if 'phone' in consignor_details:
                    transport_doc.consignor_phone = consignor_details['phone']
            
            emergency_contact = request.data.get('emergency_contact', {})
            if emergency_contact:
                if 'name' in emergency_contact:
                    transport_doc.emergency_contact_name = emergency_contact['name']
                if 'phone' in emergency_contact:
                    transport_doc.emergency_contact_phone = emergency_contact['phone']
            
            transport_doc.save()
            
            # Build response
            response_data = {
                "document_id": transport_doc.document_number,
                "document_type": transport_doc.document_type,
                "document_type_display": transport_doc.get_document_type_display(),
                "status": transport_doc.status,
                "status_display": transport_doc.get_status_display(),
                "adg_compliant": transport_doc.adg_compliant,
                "validation_errors": transport_doc.validation_errors,
                "pdf_url": transport_doc.pdf_url,
                "document_content": transport_doc.document_content,
                "consignor_name": transport_doc.consignor_name,
                "consignee_name": transport_doc.consignee_name,
                "emergency_contact": {
                    "name": transport_doc.emergency_contact_name,
                    "phone": transport_doc.emergency_contact_phone
                },
                "created_at": transport_doc.created_at,
                "created_by": request.user.username
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred generating transport document: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TransportDocumentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing transport documents.
    """
    queryset = TransportDocument.objects.select_related('shipment', 'created_by', 'approved_by').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['document_type', 'status', 'adg_compliant', 'shipment']
    search_fields = ['document_number', 'consignor_name', 'consignee_name', 'shipment__tracking_number']
    ordering_fields = ['created_at', 'document_date', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class TransportDocumentSerializer(serializers.ModelSerializer):
            document_type_display = serializers.CharField(
                source='get_document_type_display', 
                read_only=True
            )
            status_display = serializers.CharField(
                source='get_status_display', 
                read_only=True
            )
            shipment_tracking_number = serializers.CharField(
                source='shipment.tracking_number', 
                read_only=True
            )
            created_by_name = serializers.CharField(
                source='created_by.username', 
                read_only=True
            )
            approved_by_name = serializers.CharField(
                source='approved_by.username', 
                read_only=True
            )
            
            class Meta:
                model = TransportDocument
                fields = '__all__'
        
        return TransportDocumentSerializer
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve_document(self, request, pk=None):
        """
        Approve a transport document.
        """
        transport_doc = self.get_object()
        
        if transport_doc.status != TransportDocument.DocumentStatus.PENDING_APPROVAL:
            return Response(
                {"error": "Document must be in 'Pending Approval' status to approve."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not transport_doc.adg_compliant:
            return Response(
                {"error": "Document must be ADG compliant before approval.", "validation_errors": transport_doc.validation_errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        generator = ADGTransportDocumentGenerator()
        success = generator.approve_document(transport_doc, request.user)
        
        if success:
            return Response({
                "message": "Document approved successfully.",
                "status": transport_doc.status,
                "approved_by": request.user.username,
                "approved_at": transport_doc.approved_at
            })
        else:
            return Response(
                {"error": "Failed to approve document."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], url_path='issue')
    def issue_document(self, request, pk=None):
        """
        Issue an approved transport document.
        """
        transport_doc = self.get_object()
        
        generator = ADGTransportDocumentGenerator()
        success = generator.issue_document(transport_doc)
        
        if success:
            return Response({
                "message": "Document issued successfully.",
                "status": transport_doc.status,
                "document_number": transport_doc.document_number
            })
        else:
            return Response(
                {"error": "Document must be approved before issuing."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        """
        Download PDF version of transport document.
        """
        transport_doc = self.get_object()
        
        if not transport_doc.pdf_url:
            return Response(
                {"error": "PDF not available for this document."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            "pdf_url": transport_doc.pdf_url,
            "document_number": transport_doc.document_number,
            "document_type": transport_doc.get_document_type_display()
        })


class TransportDocumentValidationView(views.APIView):
    """
    API endpoint for validating transport document compliance.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Validate transport document data against ADG Part 11 requirements.
        
        Expected payload:
        {
            "document_id": "DOC-20250112-ABC12345"
        }
        
        Returns:
        {
            "document_id": "DOC-20250112-ABC12345",
            "is_valid": true,
            "adg_compliant": true,
            "validation_errors": [],
            "validation_warnings": [],
            "compliance_score": 100
        }
        """
        document_id = request.data.get('document_id')
        
        if not document_id:
            return Response(
                {"error": "Field 'document_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            transport_doc = TransportDocument.objects.get(document_number=document_id)
        except TransportDocument.DoesNotExist:
            return Response(
                {"error": "Transport document not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Re-validate document
            generator = ADGTransportDocumentGenerator()
            validation_errors = generator._validate_document(transport_doc)
            
            # Update document with new validation results
            transport_doc.validation_errors = validation_errors
            transport_doc.adg_compliant = len(validation_errors) == 0
            transport_doc.save()
            
            # Calculate compliance score
            total_checks = 10  # Base number of compliance checks
            failed_checks = len(validation_errors)
            compliance_score = max(0, ((total_checks - failed_checks) / total_checks) * 100)
            
            response_data = {
                "document_id": transport_doc.document_number,
                "is_valid": len(validation_errors) == 0,
                "adg_compliant": transport_doc.adg_compliant,
                "validation_errors": validation_errors,
                "validation_warnings": [],  # Could be enhanced with warnings
                "compliance_score": round(compliance_score, 1),
                "validated_at": timezone.now().isoformat()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred during validation: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LimitedQuantityValidationView(views.APIView):
    """
    API endpoint for validating Limited Quantity (LQ) consignment items.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Validate if consignment items qualify for Limited Quantity transport.
        
        Expected payload:
        {
            "shipment_id": "uuid-string-here",
            "item_ids": ["item-id-1", "item-id-2"] // optional, validates all if not provided
        }
        
        Returns:
        {
            "shipment_id": "uuid",
            "validation_results": [
                {
                    "item_id": "item-id-1",
                    "description": "Item description",
                    "un_number": "UN1203",
                    "is_valid_lq": true,
                    "can_be_lq": true,
                    "reasons": [],
                    "warnings": ["Item qualifies for LQ but is not marked as Limited Quantity"],
                    "max_allowed_quantity": "5.0 L",
                    "actual_quantity": "2.0 L"
                }
            ],
            "shipment_summary": {
                "total_lq_weight": 150.5,
                "lq_placard_required": false,
                "mixed_load": true
            }
        }
        """
        from shipments.models import Shipment, ConsignmentItem
        
        shipment_id = request.data.get('shipment_id')
        item_ids = request.data.get('item_ids', [])
        
        if not shipment_id:
            return Response(
                {"error": "Field 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Get items to validate
            if item_ids:
                items = shipment.items.filter(id__in=item_ids, is_dangerous_good=True)
            else:
                items = shipment.items.filter(is_dangerous_good=True)
            
            # Validate each item
            lq_handler = LimitedQuantityHandler()
            validation_results = []
            
            for item in items:
                validation = lq_handler.validate_lq_consignment_item(item)
                
                validation_results.append({
                    "item_id": str(item.id),
                    "description": item.description,
                    "un_number": item.dangerous_good_entry.un_number if item.dangerous_good_entry else None,
                    "current_lq_status": item.get_dg_quantity_type_display(),
                    "is_valid_lq": validation['is_valid_lq'],
                    "can_be_lq": validation['can_be_lq'],
                    "reasons": validation['reasons'],
                    "warnings": validation['warnings'],
                    "max_allowed_quantity": validation['max_allowed_quantity'],
                    "actual_quantity": validation['actual_quantity']
                })
            
            # Get shipment summary
            shipment_summary = lq_handler.calculate_lq_placard_requirements(shipment)
            
            response_data = {
                "shipment_id": str(shipment.id),
                "tracking_number": shipment.tracking_number,
                "validation_results": validation_results,
                "shipment_summary": {
                    "has_lq": shipment_summary['has_lq'],
                    "total_lq_weight": shipment_summary['total_lq_weight_kg'],
                    "total_lq_packages": shipment_summary['total_lq_packages'],
                    "lq_placard_required": shipment_summary['lq_placard_required'],
                    "mixed_load": shipment_summary['mixed_load'],
                    "combined_calculation_required": shipment_summary['combined_calculation_required']
                },
                "validated_at": timezone.now().isoformat()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred during LQ validation: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LimitedQuantityMarkingView(views.APIView):
    """
    API endpoint for generating Limited Quantity marking requirements.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get Limited Quantity marking requirements for a shipment.
        
        Query parameters:
        - shipment_id: UUID of the shipment
        
        Returns:
        {
            "shipment_id": "uuid",
            "lq_mark_required": true,
            "orientation_arrows_required": false,
            "marking_specifications": {...},
            "package_requirements": [...],
            "compliance_notes": [...]
        }
        """
        from shipments.models import Shipment
        
        shipment_id = request.query_params.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {"error": "Query parameter 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            lq_handler = LimitedQuantityHandler()
            marking_requirements = lq_handler.generate_lq_marking_requirements(shipment)
            
            # Add shipment context
            marking_requirements['shipment_id'] = str(shipment.id)
            marking_requirements['tracking_number'] = shipment.tracking_number
            
            # Add compliance notes
            marking_requirements['compliance_notes'] = [
                "ADG Code Chapter 3.4 - Limited Quantities",
                "Packages must be marked with LQ mark if gross mass ≥ 30kg or if specified",
                "UN numbers must be marked on packages",
                "Proper shipping names not required for LQ packages"
            ]
            
            if marking_requirements['orientation_arrows_required']:
                marking_requirements['compliance_notes'].append(
                    "Orientation arrows required on two opposite vertical sides"
                )
            
            return Response(marking_requirements, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred generating marking requirements: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LimitedQuantityLimitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for Limited Quantity limits.
    """
    queryset = LimitedQuantityLimit.objects.select_related('dangerous_good').filter(is_lq_permitted=True)
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['dangerous_good__hazard_class', 'is_lq_permitted', 'requires_orientation_arrows']
    search_fields = ['dangerous_good__un_number', 'dangerous_good__proper_shipping_name', 'lq_code']
    ordering_fields = ['dangerous_good__un_number', 'max_quantity_inner_package']
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class LimitedQuantityLimitSerializer(serializers.ModelSerializer):
            dangerous_good_display = serializers.SerializerMethodField()
            un_number = serializers.CharField(source='dangerous_good.un_number', read_only=True)
            proper_shipping_name = serializers.CharField(source='dangerous_good.proper_shipping_name', read_only=True)
            hazard_class = serializers.CharField(source='dangerous_good.hazard_class', read_only=True)
            packing_group = serializers.CharField(source='dangerous_good.packing_group', read_only=True)
            
            class Meta:
                model = LimitedQuantityLimit
                fields = '__all__'
            
            def get_dangerous_good_display(self, obj):
                return f"{obj.dangerous_good.un_number} - {obj.dangerous_good.proper_shipping_name}"
        
        return LimitedQuantityLimitSerializer


class LQComplianceReportView(views.APIView):
    """
    API endpoint for generating comprehensive LQ compliance reports.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Generate comprehensive Limited Quantity compliance report for a shipment.
        
        Query parameters:
        - shipment_id: UUID of the shipment
        
        Returns comprehensive compliance report with all LQ requirements.
        """
        from shipments.models import Shipment
        
        shipment_id = request.query_params.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {"error": "Query parameter 'shipment_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {"error": "Shipment not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            lq_handler = LimitedQuantityHandler()
            
            # Generate all LQ-related analyses
            validation_results = []
            lq_items = shipment.items.filter(is_dangerous_good=True)
            
            for item in lq_items:
                validation = lq_handler.validate_lq_consignment_item(item)
                validation_results.append({
                    'item': {
                        'id': str(item.id),
                        'description': item.description,
                        'un_number': item.dangerous_good_entry.un_number if item.dangerous_good_entry else None
                    },
                    'validation': validation
                })
            
            placard_analysis = lq_handler.calculate_lq_placard_requirements(shipment)
            marking_requirements = lq_handler.generate_lq_marking_requirements(shipment)
            
            # Generate compliance summary
            total_items = len(validation_results)
            valid_lq_items = sum(1 for v in validation_results if v['validation']['is_valid_lq'])
            can_be_lq_items = sum(1 for v in validation_results if v['validation']['can_be_lq'])
            
            compliance_score = 0
            if total_items > 0:
                compliance_score = (valid_lq_items / total_items) * 100
            
            # Compile comprehensive report
            report = {
                "shipment_info": {
                    "shipment_id": str(shipment.id),
                    "tracking_number": shipment.tracking_number,
                    "total_dg_items": total_items
                },
                "lq_validation": {
                    "item_validations": validation_results,
                    "summary": {
                        "total_items": total_items,
                        "valid_lq_items": valid_lq_items,
                        "can_be_lq_items": can_be_lq_items,
                        "compliance_score": round(compliance_score, 1)
                    }
                },
                "placard_requirements": placard_analysis,
                "marking_requirements": marking_requirements,
                "regulatory_compliance": {
                    "adg_chapter": "3.4 - Limited Quantities",
                    "key_requirements": [
                        "Maximum quantity per inner packaging must not exceed LQ limits",
                        "Maximum gross mass per package: 30kg",
                        "Proper marking with LQ mark if required",
                        "UN number marking required on packages",
                        "Orientation arrows if specified for the dangerous good"
                    ]
                },
                "generated_at": timezone.now().isoformat()
            }
            
            return Response(report, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred generating LQ compliance report: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
