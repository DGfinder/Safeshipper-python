from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    ERPSystemViewSet, IntegrationEndpointViewSet, ERPMappingViewSet,
    DataSyncJobViewSet, ERPEventLogViewSet, ERPDataBufferViewSet,
    ERPConfigurationViewSet, ERPDashboardView, ManifestImportView
)

app_name = 'erp_integration'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'systems', ERPSystemViewSet, basename='erp-systems')
router.register(r'endpoints', IntegrationEndpointViewSet, basename='integration-endpoints')
router.register(r'mappings', ERPMappingViewSet, basename='erp-mappings')
router.register(r'sync-jobs', DataSyncJobViewSet, basename='sync-jobs')
router.register(r'event-logs', ERPEventLogViewSet, basename='event-logs')
router.register(r'data-buffer', ERPDataBufferViewSet, basename='data-buffer')
router.register(r'configurations', ERPConfigurationViewSet, basename='configurations')
router.register(r'dashboard', ERPDashboardView, basename='dashboard')
router.register(r'manifest-import', ManifestImportView, basename='manifest-import')

# URL patterns
urlpatterns = [
    path('api/', include(router.urls)),
    
    # Additional API endpoints can be added here
    # For example, webhook endpoints, health checks, etc.
]