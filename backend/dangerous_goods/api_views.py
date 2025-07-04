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
