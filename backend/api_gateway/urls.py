from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    APIKeyViewSet, APIUsageLogViewSet, WebhookEndpointViewSet,
    DeveloperApplicationViewSet, APIDocumentationViewSet,
    SystemHealthView, APIStatusView, WebhookEventsView
)

app_name = 'api_gateway'

# Create router for viewsets
router = DefaultRouter()
router.register(r'keys', APIKeyViewSet, basename='apikey')
router.register(r'usage-logs', APIUsageLogViewSet, basename='apiusagelog')
router.register(r'webhooks', WebhookEndpointViewSet, basename='webhookendpoint')
router.register(r'applications', DeveloperApplicationViewSet, basename='developerapplication')
router.register(r'docs', APIDocumentationViewSet, basename='apidocumentation')

urlpatterns = [
    # API Gateway management endpoints
    path('', include(router.urls)),
    
    # System status and health
    path('status/', APIStatusView.as_view(), name='api-status'),
    path('health/', SystemHealthView.as_view(), name='system-health'),
    
    # Webhook information
    path('webhook-events/', WebhookEventsView.as_view(), name='webhook-events'),
]