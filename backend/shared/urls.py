# shared/urls.py
"""
URL patterns for shared SafeShipper API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RateLimitStatusView,
    RateLimitManagementView,
    ValidationStatusView,
    CacheManagementView,
    SystemHealthView,
    DetailedHealthView,
    ServiceHealthView
)
from .api_views import DataRetentionViewSet, SystemHealthViewSet
from .production_health import ProductionHealthView, ProductionReadinessView, ProductionLivenessView

app_name = 'shared'

# DRF Router for ViewSets
router = DefaultRouter()
router.register(r'data-retention', DataRetentionViewSet, basename='data-retention')
router.register(r'system-health', SystemHealthViewSet, basename='system-health-api')

urlpatterns = [
    # DRF API endpoints
    path('api/', include(router.urls)),
    
    # Production health check endpoints
    path('health/', ProductionHealthView.as_view(), name='production-health'),
    path('health/ready/', ProductionReadinessView.as_view(), name='readiness-probe'),
    path('health/live/', ProductionLivenessView.as_view(), name='liveness-probe'),
    
    # Rate limiting endpoints
    path('rate-limits/status/', RateLimitStatusView.as_view(), name='rate-limit-status'),
    path('rate-limits/manage/', RateLimitManagementView.as_view(), name='rate-limit-management'),
    
    # Cache management endpoints
    path('cache/manage/', CacheManagementView.as_view(), name='cache-management'),
    
    # Validation status endpoint
    path('validation/status/', ValidationStatusView.as_view(), name='validation-status'),
    
    # Legacy health check endpoints
    path('health/system/', SystemHealthView.as_view(), name='system-health'),
    path('health/detailed/', DetailedHealthView.as_view(), name='detailed-health'),
    path('health/service/<str:service_name>/', ServiceHealthView.as_view(), name='service-health'),
]