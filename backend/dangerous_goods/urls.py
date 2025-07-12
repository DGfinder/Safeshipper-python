# dangerous_goods/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import DangerousGoodViewSet, DGCompatibilityCheckView, PHAnalysisView

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'', DangerousGoodViewSet, basename='dangerousgood')

urlpatterns = [
    path('', include(router.urls)),
    path('check-compatibility/', DGCompatibilityCheckView.as_view(), name='dg-compatibility-check'),
    path('ph-analysis/', PHAnalysisView.as_view(), name='ph-analysis'),
]
