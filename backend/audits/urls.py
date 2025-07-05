from django.urls import path
from .api_views import (
    AuditLogListView, AuditLogDetailView, ShipmentAuditLogListView,
    ComplianceAuditLogListView, audit_summary, export_audit_logs,
    user_activity_summary
)

app_name = 'audits'

urlpatterns = [
    # Audit log endpoints
    path('logs/', AuditLogListView.as_view(), name='audit-logs'),
    path('logs/<uuid:pk>/', AuditLogDetailView.as_view(), name='audit-log-detail'),
    
    # Shipment-specific audit logs
    path('shipments/<uuid:shipment_id>/logs/', ShipmentAuditLogListView.as_view(), name='shipment-audit-logs'),
    
    # Compliance audit logs
    path('compliance/', ComplianceAuditLogListView.as_view(), name='compliance-audit-logs'),
    
    # Summary and analytics
    path('summary/', audit_summary, name='audit-summary'),
    path('export/', export_audit_logs, name='export-audit-logs'),
    path('users/<uuid:user_id>/activity/', user_activity_summary, name='user-activity-summary'),
]