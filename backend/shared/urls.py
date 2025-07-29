# shared/urls.py
"""
URL patterns for shared SafeShipper API endpoints.
"""

from django.urls import path
from .views import (
    RateLimitStatusView,
    RateLimitManagementView,
    ValidationStatusView,
    CacheManagementView,
    SystemHealthView,
    DetailedHealthView,
    ServiceHealthView
)

app_name = 'shared'

urlpatterns = [
    # Rate limiting endpoints
    path('rate-limits/status/', RateLimitStatusView.as_view(), name='rate-limit-status'),
    path('rate-limits/manage/', RateLimitManagementView.as_view(), name='rate-limit-management'),
    
    # Cache management endpoints
    path('cache/manage/', CacheManagementView.as_view(), name='cache-management'),
    
    # Validation status endpoint
    path('validation/status/', ValidationStatusView.as_view(), name='validation-status'),
    
    # Health check endpoints
    path('health/', SystemHealthView.as_view(), name='system-health'),
    path('health/detailed/', DetailedHealthView.as_view(), name='detailed-health'),
    path('health/service/<str:service_name>/', ServiceHealthView.as_view(), name='service-health'),
]