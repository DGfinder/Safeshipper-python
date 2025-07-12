# compliance/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    ComplianceZoneViewSet, ComplianceMonitoringSessionViewSet,
    ComplianceEventViewSet, ComplianceAlertViewSet, ComplianceReportViewSet,
    LiveTrackingView, ComplianceDashboardView, EmergencyResponseView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'zones', ComplianceZoneViewSet, basename='compliance-zone')
router.register(r'sessions', ComplianceMonitoringSessionViewSet, basename='monitoring-session')
router.register(r'events', ComplianceEventViewSet, basename='compliance-event')
router.register(r'alerts', ComplianceAlertViewSet, basename='compliance-alert')
router.register(r'reports', ComplianceReportViewSet, basename='compliance-report')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    
    # Real-time monitoring endpoints
    path('live-tracking/', LiveTrackingView.as_view(), name='live-tracking'),
    path('dashboard/', ComplianceDashboardView.as_view(), name='compliance-dashboard'),
    path('emergency-response/', EmergencyResponseView.as_view(), name='emergency-response'),
]