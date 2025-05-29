# dangerous_goods/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ( # Assuming your viewsets are in api_views.py
    DangerousGoodViewSet, 
    DGProductSynonymViewSet, 
    SegregationGroupViewSet,
    SegregationRuleViewSet
)

router = DefaultRouter()
router.register(r'data', DangerousGoodViewSet, basename='dangerousgood')
router.register(r'synonyms', DGProductSynonymViewSet, basename='dgproductsynonym')
router.register(r'segregation-groups', SegregationGroupViewSet, basename='segregationgroup')
router.register(r'segregation-rules', SegregationRuleViewSet, basename='segregationrule')
# The custom action 'check_dg_item_compatibility' will be available at /api/dangerous-goods/segregation-rules/check-compatibility/
# The custom action 'lookup_by_synonym' will be available at /api/dangerous-goods/data/lookup-by-synonym/


urlpatterns = [
    path('', include(router.urls)),
]
