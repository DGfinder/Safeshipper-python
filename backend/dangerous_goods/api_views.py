# dangerous_goods/api_views.py
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule
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
from sds.models import SafetyDataSheet
from sds.services import SDSDocumentProcessor

class DangerousGoodViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for Dangerous Goods information.
    Provides searchable list of all dangerous goods for frontend selection fields.
    """
    queryset = DangerousGood.objects.all().order_by('un_number')
    serializer_class = DangerousGoodSerializer
    permission_classes = [permissions.IsAuthenticated]
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

    @action(detail=False, methods=['get'], url_path='lookup-by-synonym')
    def lookup_by_synonym(self, request):
        """Look up dangerous good by synonym or alternative name."""
        query = request.query_params.get('query', None)
        if not query:
            return Response({'error': 'Query parameter "query" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        dg = match_synonym_to_dg(query)
        if dg:
            serializer = self.get_serializer(dg)
            return Response(serializer.data)
        return Response({'message': 'No matching dangerous good found for the synonym.'}, status=status.HTTP_404_NOT_FOUND)


class DGCompatibilityCheckView(views.APIView):
    """
    API endpoint for checking compatibility between multiple dangerous goods.
    Accepts a POST request with a list of UN numbers and returns compatibility results.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Check compatibility between a list of UN numbers.
        
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
            # Use the service function to check compatibility
            result = check_list_compatibility(un_numbers)
            return Response(result, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {"error": f"An error occurred while checking compatibility: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PHAnalysisView(views.APIView):
    """
    API endpoint for pH analysis of Class 8 (corrosive) dangerous goods.
    Provides pH-based segregation recommendations, especially for food packaging compatibility.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Analyze pH level and provide segregation recommendations for a dangerous good.
        
        Expected payload:
        {
            "material_id": "uuid-string-here"
        }
        
        Returns:
        {
            "ph_value": 2.5,
            "classification": "acidic",
            "description": "This material has a pH of 2.5, classifying it as acidic and requiring specific segregation measures.",
            "segregation_requirements": [
                "Keep separated from alkaline materials",
                "Maintain minimum 5-meter distance from food packaging"
            ],
            "safety_recommendations": [
                "Use appropriate containment measures",
                "Ensure proper ventilation"
            ],
            "food_packaging_compatibility": {
                "compatible_with_food": false,
                "segregation_required": true,
                "risk_level": "high",
                "reasons": ["Highly corrosive pH value: 2.5"],
                "recommendations": [
                    "Keep separated from food and food packaging",
                    "Minimum 5-meter separation required"
                ]
            },
            "created_at": "2025-01-12T10:30:00Z"
        }
        """
        material_id = request.data.get('material_id')
        
        if not material_id:
            return Response(
                {"error": "Field 'material_id' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the dangerous good
            dangerous_good = DangerousGood.objects.get(id=material_id)
            
            # Only process Class 8 (corrosive) materials
            if dangerous_good.hazard_class != '8':
                return Response(
                    {"error": "pH analysis is only available for Class 8 (corrosive) dangerous goods."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the most recent SDS for this dangerous good
            try:
                sds = SafetyDataSheet.objects.filter(
                    dangerous_good=dangerous_good,
                    status='ACTIVE'
                ).order_by('-revision_date').first()
                
                if not sds:
                    return Response(
                        {"error": "No active Safety Data Sheet found for this material."}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
            except SafetyDataSheet.DoesNotExist:
                return Response(
                    {"error": "No Safety Data Sheet found for this material."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if pH data already exists, if not try to extract it
            if not sds.has_ph_data:
                processor = SDSDocumentProcessor()
                # Try to extract pH data from the SDS document
                if not processor.process_sds_for_ph(sds):
                    return Response(
                        {"error": "No pH information could be extracted from the SDS document."}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                # Refresh the SDS instance to get updated pH data
                sds.refresh_from_db()
            
            # Ensure we have pH data
            if not sds.has_ph_data:
                return Response(
                    {"error": "No pH information available for this material."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Build the response
            ph_value = sds.ph_value
            ph_classification = sds.ph_classification
            
            # Generate description based on pH
            if ph_value < 2:
                description = f"This material has a pH of {ph_value}, classifying it as strongly acidic and requiring stringent segregation measures."
            elif ph_value < 7:
                description = f"This material has a pH of {ph_value}, classifying it as acidic and requiring careful handling and segregation."
            elif ph_value <= 7.5:
                description = f"This material has a pH of {ph_value}, classifying it as neutral but still requiring standard corrosive material precautions."
            elif ph_value <= 12.5:
                description = f"This material has a pH of {ph_value}, classifying it as alkaline and requiring appropriate segregation from acidic materials."
            else:
                description = f"This material has a pH of {ph_value}, classifying it as strongly alkaline and requiring stringent segregation measures."
            
            # Generate segregation requirements based on pH compatibility
            segregation_requirements = []
            safety_recommendations = []
            
            # Standard Class 8 (corrosive) food separation applies to all pH levels
            segregation_requirements.append("Maintain standard Class 8 separation from food and food packaging (3-5 meters)")
            
            if ph_value < 2:  # Strongly acidic
                segregation_requirements.extend([
                    "CRITICAL: Never store with alkaline materials (pH > 12.5) - risk of violent reaction",
                    "Maintain minimum 15-meter separation from strongly alkaline materials",
                    "Keep separated from alkaline materials (pH > 10) by minimum 10 meters",
                    "Use separate storage area with independent ventilation",
                    "Install emergency acid neutralization systems"
                ])
                safety_recommendations.extend([
                    "Use acid-resistant storage containers and floors",
                    "Emergency neutralization materials (sodium bicarbonate) readily available",
                    "Train personnel in acid spill response procedures",
                    "Install acid vapor detection systems if needed"
                ])
            elif ph_value < 4:  # Moderately acidic
                segregation_requirements.extend([
                    "Keep separated from strongly alkaline materials (pH > 12.5) by minimum 10 meters",
                    "Maintain separation from alkaline materials (pH > 10) by minimum 5 meters",
                    "Use appropriate acid-resistant containment systems"
                ])
                safety_recommendations.extend([
                    "Use appropriate acid-resistant containment",
                    "Ensure proper ventilation systems",
                    "Emergency neutralization materials on-site"
                ])
            elif ph_value < 7:  # Mildly acidic
                segregation_requirements.extend([
                    "Maintain separation from strongly alkaline materials (pH > 12.5)",
                    "Use appropriate containment measures for acidic materials"
                ])
                safety_recommendations.extend([
                    "Regular monitoring of storage conditions",
                    "Appropriate personal protective equipment",
                    "Standard spill response procedures"
                ])
            elif ph_value <= 12.5:  # Alkaline
                segregation_requirements.extend([
                    "Keep separated from strongly acidic materials (pH < 2) by minimum 10 meters",
                    "Maintain separation from acidic materials (pH < 4) by minimum 5 meters",
                    "Use alkaline-resistant storage systems"
                ])
                safety_recommendations.extend([
                    "Use caustic-resistant materials for storage",
                    "Ensure proper ventilation",
                    "Emergency acid neutralization procedures available"
                ])
            else:  # Strongly alkaline (pH > 12.5)
                segregation_requirements.extend([
                    "CRITICAL: Never store with acidic materials (pH < 2) - risk of violent reaction",
                    "Maintain minimum 15-meter separation from strongly acidic materials",
                    "Keep separated from acidic materials (pH < 4) by minimum 10 meters",
                    "Require specialized alkaline-resistant storage with independent ventilation",
                    "Install emergency alkali neutralization systems"
                ])
                safety_recommendations.extend([
                    "Use specialized caustic-resistant containment",
                    "Emergency neutralization materials (weak acid solutions) available",
                    "Specialized training for caustic material handling",
                    "Install caustic vapor detection if required"
                ])
            
            # Get food packaging compatibility assessment
            processor = SDSDocumentProcessor()
            food_compatibility = processor.check_food_packaging_compatibility(sds)
            
            response_data = {
                "ph_value": ph_value,
                "classification": ph_classification,
                "description": description,
                "segregation_requirements": segregation_requirements,
                "safety_recommendations": safety_recommendations,
                "food_packaging_compatibility": food_compatibility,
                "measurement_conditions": sds.ph_measurement_conditions or "Standard conditions",
                "extraction_confidence": sds.ph_extraction_confidence or 0.0,
                "data_source": sds.get_ph_source_display() if sds.ph_source else "Unknown",
                "created_at": sds.ph_updated_at
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except DangerousGood.DoesNotExist:
            return Response(
                {"error": "Dangerous good not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred during pH analysis: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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

        dg1 = get_dangerous_good_by_un_number(un_number1)
        dg2 = get_dangerous_good_by_un_number(un_number2)

        if not dg1:
            return Response({"error": f"UN Number '{un_number1}' not found."}, status=status.HTTP_404_NOT_FOUND)
        if not dg2:
            return Response({"error": f"UN Number '{un_number2}' not found."}, status=status.HTTP_404_NOT_FOUND)

        compatibility_result = check_dg_compatibility(dg1, dg2)
        return Response(compatibility_result)
