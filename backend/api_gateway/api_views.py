from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import (
    APIKey, APIUsageLog, WebhookEndpoint, WebhookDelivery,
    DeveloperApplication, APIDocumentation
)
from .serializers import (
    APIKeySerializer, APIUsageLogSerializer, WebhookEndpointSerializer,
    WebhookDeliverySerializer, DeveloperApplicationSerializer,
    APIDocumentationSerializer, APIMetricsSerializer
)
from .utils import get_api_metrics, get_system_health, format_api_response
from .permissions import IsAPIKeyOwnerOrAdmin, HasAPIScope


class APIKeyViewSet(viewsets.ModelViewSet):
    """
    API Key management for developers
    """
    serializer_class = APIKeySerializer
    permission_classes = [permissions.IsAuthenticated, IsAPIKeyOwnerOrAdmin]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return APIKey.objects.all()
        return APIKey.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @extend_schema(
        summary="Regenerate API key",
        description="Generate a new API key for this record",
        responses={200: APIKeySerializer}
    )
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """Regenerate API key"""
        api_key = self.get_object()
        
        # Revoke old key
        api_key.status = 'revoked'
        api_key.save()
        
        # Create new key
        new_key = APIKey.objects.create(
            name=f"{api_key.name} (Regenerated)",
            created_by=api_key.created_by,
            organization=api_key.organization,
            scopes=api_key.scopes,
            allowed_ips=api_key.allowed_ips,
            rate_limit=api_key.rate_limit,
            expires_at=api_key.expires_at
        )
        
        serializer = self.get_serializer(new_key)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get API key usage metrics",
        parameters=[
            OpenApiParameter(
                name='hours',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Number of hours to include in metrics (default: 24)'
            )
        ],
        responses={200: APIMetricsSerializer}
    )
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Get usage metrics for this API key"""
        api_key = self.get_object()
        hours = int(request.query_params.get('hours', 24))
        
        metrics = get_api_metrics(str(api_key.id), hours)
        return Response(metrics)
    
    @extend_schema(
        summary="Revoke API key",
        description="Permanently revoke this API key"
    )
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke API key"""
        api_key = self.get_object()
        api_key.revoke()
        
        return Response({'message': 'API key revoked successfully'})


class APIUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API usage logs for monitoring and debugging
    """
    serializer_class = APIUsageLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['api_key', 'endpoint', 'method', 'status_code']
    search_fields = ['endpoint', 'ip_address', 'user_agent']
    ordering_fields = ['timestamp', 'response_time_ms', 'status_code']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return APIUsageLog.objects.all()
        
        # Users can only see logs for their own API keys
        user_api_keys = APIKey.objects.filter(created_by=self.request.user)
        return APIUsageLog.objects.filter(api_key__in=user_api_keys)


class WebhookEndpointViewSet(viewsets.ModelViewSet):
    """
    Webhook endpoint management
    """
    serializer_class = WebhookEndpointSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return WebhookEndpoint.objects.all()
        
        # Users can only manage webhooks for their own API keys
        user_api_keys = APIKey.objects.filter(created_by=self.request.user)
        return WebhookEndpoint.objects.filter(api_key__in=user_api_keys)
    
    @extend_schema(
        summary="Test webhook endpoint",
        description="Send a test event to verify webhook configuration"
    )
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test webhook endpoint with sample payload"""
        from .utils import send_webhook
        
        webhook = self.get_object()
        
        test_event = {
            'test': True,
            'message': 'This is a test webhook from SafeShipper API',
            'timestamp': timezone.now().isoformat()
        }
        
        result = send_webhook(webhook, 'webhook.test', test_event)
        
        return Response({
            'message': 'Test webhook sent',
            'delivery_id': result['delivery_id'],
            'status': result['status']
        })
    
    @extend_schema(
        summary="Get webhook deliveries",
        description="Get recent delivery attempts for this webhook"
    )
    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        """Get recent webhook deliveries"""
        webhook = self.get_object()
        deliveries = webhook.deliveries.order_by('-created_at')[:50]
        
        serializer = WebhookDeliverySerializer(deliveries, many=True)
        return Response(serializer.data)


class DeveloperApplicationViewSet(viewsets.ModelViewSet):
    """
    Developer application management for OAuth and extended API access
    """
    serializer_class = DeveloperApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return DeveloperApplication.objects.all()
        return DeveloperApplication.objects.filter(developer=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(developer=self.request.user)
    
    @extend_schema(
        summary="Submit application for review",
        description="Submit developer application for admin review"
    )
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit application for review"""
        application = self.get_object()
        
        if application.status != 'pending':
            return Response(
                {'error': 'Application is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Application is already in pending status, no change needed
        return Response({'message': 'Application submitted for review'})
    
    @extend_schema(
        summary="Approve application",
        description="Approve developer application (admin only)"
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        """Approve application (admin only)"""
        application = self.get_object()
        
        application.status = 'approved'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.approved_scopes = application.requested_scopes
        application.save()
        
        return Response({'message': 'Application approved'})
    
    @extend_schema(
        summary="Reject application",
        description="Reject developer application (admin only)"
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        """Reject application (admin only)"""
        application = self.get_object()
        
        application.status = 'rejected'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.review_notes = request.data.get('notes', '')
        application.save()
        
        return Response({'message': 'Application rejected'})


class APIDocumentationViewSet(viewsets.ModelViewSet):
    """
    API documentation management
    """
    serializer_class = APIDocumentationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['doc_type', 'category', 'status']
    search_fields = ['title', 'content', 'tags']
    ordering_fields = ['order', 'title', 'updated_at']
    ordering = ['category', 'order', 'title']
    
    def get_queryset(self):
        if self.request.user and self.request.user.is_staff:
            return APIDocumentation.objects.all()
        return APIDocumentation.objects.filter(status='published')
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    @extend_schema(
        summary="Publish documentation",
        description="Publish draft documentation"
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def publish(self, request, pk=None):
        """Publish documentation"""
        doc = self.get_object()
        
        if not request.user.is_staff and doc.author != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        doc.status = 'published'
        doc.published_at = timezone.now()
        doc.save()
        
        return Response({'message': 'Documentation published'})


class SystemHealthView(APIView):
    """
    System health and status endpoint
    """
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Get system health",
        description="Get overall API system health and metrics"
    )
    def get(self, request):
        """Get system health metrics"""
        health_data = get_system_health()
        return Response(health_data)


class APIStatusView(APIView):
    """
    API status and version information
    """
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Get API status",
        description="Get API version and status information"
    )
    def get(self, request):
        """Get API status and version"""
        from django.conf import settings
        
        return Response({
            'status': 'operational',
            'version': getattr(settings, 'API_VERSION', '1.0'),
            'environment': getattr(settings, 'ENVIRONMENT', 'production'),
            'timestamp': timezone.now().isoformat(),
            'uptime': 'Available',
            'features': {
                'webhooks': True,
                'rate_limiting': True,
                'api_keys': True,
                'oauth': True,
                'documentation': True
            }
        })


class WebhookEventsView(APIView):
    """
    Webhook event types and documentation
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Get available webhook events",
        description="List all available webhook event types"
    )
    def get(self, request):
        """Get available webhook event types"""
        events = [
            {
                'type': 'shipment.created',
                'description': 'Triggered when a new shipment is created',
                'payload_example': {
                    'shipment_id': 'uuid',
                    'tracking_number': 'string',
                    'status': 'string'
                }
            },
            {
                'type': 'shipment.updated',
                'description': 'Triggered when a shipment is updated',
                'payload_example': {
                    'shipment_id': 'uuid',
                    'changes': 'object'
                }
            },
            {
                'type': 'document.validated',
                'description': 'Triggered when a document is validated',
                'payload_example': {
                    'document_id': 'uuid',
                    'validation_status': 'string'
                }
            },
            {
                'type': 'audit.compliance_violation',
                'description': 'Triggered when a compliance violation is detected',
                'payload_example': {
                    'violation_id': 'uuid',
                    'severity': 'string'
                }
            }
        ]
        
        return Response({'events': events})