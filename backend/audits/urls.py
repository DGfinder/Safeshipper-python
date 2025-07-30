from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    AuditLogViewSet, ComplianceAuditLogViewSet, DangerousGoodsAuditLogViewSet,
    ComplianceMonitoringViewSet, ShipmentAuditLogListView, audit_summary, 
    export_audit_logs, user_activity_summary
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'logs', AuditLogViewSet, basename='auditlog')
router.register(r'compliance', ComplianceAuditLogViewSet, basename='complianceauditlog')
router.register(r'dangerous-goods', DangerousGoodsAuditLogViewSet, basename='dangerousgoodsauditlog')
router.register(r'monitoring', ComplianceMonitoringViewSet, basename='compliancemonitoring')

app_name = 'audits'

urlpatterns = [
    # ViewSet URLs
    path('api/', include(router.urls)),
    
    # Legacy endpoints (maintain backwards compatibility)
    path('shipments/<uuid:shipment_id>/logs/', ShipmentAuditLogListView.as_view(), name='shipment-audit-logs'),
    path('summary/', audit_summary, name='audit-summary'),
    path('export/', export_audit_logs, name='export-audit-logs'),
    path('users/<uuid:user_id>/activity/', user_activity_summary, name='user-activity-summary'),
]