# compliance/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    ComplianceZoneViewSet, ComplianceMonitoringSessionViewSet,
    ComplianceEventViewSet, ComplianceAlertViewSet, ComplianceReportViewSet,
    LiveTrackingView, ComplianceDashboardView, EmergencyResponseView,
    # Emergency Response API endpoints
    initiate_emergency_activation, confirm_emergency_activation,
    activate_emergency, mark_false_alarm, get_emergency_status
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
    
    # Emergency Response API (multi-step activation with safeguards)
    path('emergency/initiate/', initiate_emergency_activation, name='initiate-emergency'),
    path('emergency/confirm/', confirm_emergency_activation, name='confirm-emergency'),
    path('emergency/activate/', activate_emergency, name='activate-emergency'),
    path('emergency/false-alarm/', mark_false_alarm, name='mark-false-alarm'),
    path('emergency/status/<uuid:emergency_id>/', get_emergency_status, name='emergency-status'),
]