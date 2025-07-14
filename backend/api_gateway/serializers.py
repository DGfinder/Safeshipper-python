from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    APIKey, APIUsageLog, WebhookEndpoint, WebhookDelivery,
    DeveloperApplication, APIDocumentation
)

User = get_user_model()


class APIKeySerializer(serializers.ModelSerializer):
    """Serializer for API keys with security considerations"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    key_preview = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = APIKey
        fields = [
            'id', 'name', 'key_preview', 'key_prefix', 'organization',
            'scopes', 'allowed_ips', 'rate_limit', 'status', 'expires_at',
            'last_used_at', 'total_requests', 'total_errors', 'notes',
            'created_by', 'created_by_name', 'is_expired', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'key_preview', 'key_prefix', 'last_used_at', 'total_requests',
            'total_errors', 'created_by', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'key': {'write_only': True}  # Never return full key in responses
        }
    
    def get_key_preview(self, obj):
        """Return masked key for security"""
        if obj.key:
            return f"{obj.key[:12]}...{obj.key[-4:]}"
        return None
    
    def to_representation(self, instance):
        """Include full key only when creating"""
        data = super().to_representation(instance)
        
        # Include full key only in creation response
        if hasattr(self.context.get('view', {}), 'action'):
            if self.context['view'].action == 'create':
                data['key'] = instance.key
        
        return data


class APIUsageLogSerializer(serializers.ModelSerializer):
    """Serializer for API usage logs"""
    
    api_key_name = serializers.CharField(source='api_key.name', read_only=True)
    
    class Meta:
        model = APIUsageLog
        fields = [
            'id', 'api_key', 'api_key_name', 'endpoint', 'method',
            'ip_address', 'user_agent', 'status_code', 'response_time_ms',
            'bytes_sent', 'bytes_received', 'error_message', 'error_code',
            'timestamp', 'request_id'
        ]


class WebhookEndpointSerializer(serializers.ModelSerializer):
    """Serializer for webhook endpoints"""
    
    api_key_name = serializers.CharField(source='api_key.name', read_only=True)
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = WebhookEndpoint
        fields = [
            'id', 'api_key', 'api_key_name', 'name', 'url', 'event_types',
            'filters', 'timeout_seconds', 'max_retries', 'retry_delay_seconds',
            'status', 'last_delivery_at', 'last_error', 'total_deliveries',
            'successful_deliveries', 'failed_deliveries', 'success_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'last_delivery_at', 'last_error', 'total_deliveries',
            'successful_deliveries', 'failed_deliveries', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'secret': {'write_only': True}
        }
    
    def get_success_rate(self, obj):
        """Calculate success rate percentage"""
        if obj.total_deliveries > 0:
            return round((obj.successful_deliveries / obj.total_deliveries) * 100, 2)
        return 0.0


class WebhookDeliverySerializer(serializers.ModelSerializer):
    """Serializer for webhook delivery logs"""
    
    webhook_name = serializers.CharField(source='webhook.name', read_only=True)
    webhook_url = serializers.CharField(source='webhook.url', read_only=True)
    is_successful = serializers.SerializerMethodField()
    
    class Meta:
        model = WebhookDelivery
        fields = [
            'id', 'webhook', 'webhook_name', 'webhook_url', 'event_type',
            'event_id', 'status', 'attempt_count', 'max_attempts',
            'http_status', 'response_body', 'error_message', 'is_successful',
            'scheduled_for', 'delivered_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'response_body', 'error_message', 'delivered_at',
            'created_at', 'updated_at'
        ]
    
    def get_is_successful(self, obj):
        """Check if delivery was successful"""
        return obj.status == 'delivered' and 200 <= (obj.http_status or 0) < 300


class DeveloperApplicationSerializer(serializers.ModelSerializer):
    """Serializer for developer applications"""
    
    developer_name = serializers.CharField(source='developer.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    client_credentials = serializers.SerializerMethodField()
    
    class Meta:
        model = DeveloperApplication
        fields = [
            'id', 'name', 'description', 'application_type', 'website_url',
            'callback_urls', 'developer', 'developer_name', 'organization',
            'contact_email', 'client_credentials', 'requested_scopes',
            'approved_scopes', 'status', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at', 'review_notes', 'rate_limit', 'monthly_quota',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'client_credentials', 'approved_scopes', 'reviewed_by',
            'reviewed_at', 'review_notes', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'client_id': {'write_only': True},
            'client_secret': {'write_only': True}
        }
    
    def get_client_credentials(self, obj):
        """Return client credentials only for approved applications"""
        if obj.status == 'approved':
            return {
                'client_id': obj.client_id,
                'client_secret': obj.client_secret
            }
        return None


class APIDocumentationSerializer(serializers.ModelSerializer):
    """Serializer for API documentation"""
    
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = APIDocumentation
        fields = [
            'id', 'title', 'slug', 'content', 'doc_type', 'category',
            'tags', 'order', 'endpoint_path', 'http_methods', 'required_scopes',
            'version', 'api_version_introduced', 'api_version_deprecated',
            'status', 'author', 'author_name', 'published_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'author', 'published_at', 'created_at', 'updated_at'
        ]


class APIMetricsSerializer(serializers.Serializer):
    """Serializer for API usage metrics"""
    
    period = serializers.DictField()
    summary = serializers.DictField()
    status_codes = serializers.ListField()
    popular_endpoints = serializers.ListField()
    hourly_breakdown = serializers.ListField()


class SystemHealthSerializer(serializers.Serializer):
    """Serializer for system health metrics"""
    
    status = serializers.CharField()
    timestamp = serializers.DateTimeField()
    api_keys = serializers.DictField()
    requests = serializers.DictField()
    webhooks = serializers.DictField()


class APIErrorSerializer(serializers.Serializer):
    """Serializer for API error responses"""
    
    error = serializers.DictField()
    status = serializers.CharField(default='error')
    timestamp = serializers.DateTimeField()
    request_id = serializers.CharField(required=False)


class PaginatedResponseSerializer(serializers.Serializer):
    """Serializer for paginated API responses"""
    
    items = serializers.ListField()
    pagination = serializers.DictField()
    status = serializers.CharField(default='success')
    timestamp = serializers.DateTimeField()


class WebhookEventSerializer(serializers.Serializer):
    """Serializer for webhook event payloads"""
    
    event_type = serializers.CharField()
    event_id = serializers.UUIDField()
    timestamp = serializers.DateTimeField()
    data = serializers.DictField()


class RateLimitSerializer(serializers.Serializer):
    """Serializer for rate limit information"""
    
    limit = serializers.IntegerField()
    remaining = serializers.IntegerField()
    reset_time = serializers.IntegerField()
    retry_after = serializers.IntegerField(required=False)


# Request/Response serializers for documentation

class CreateAPIKeyRequestSerializer(serializers.Serializer):
    """Request serializer for creating API keys"""
    
    name = serializers.CharField(max_length=200)
    organization = serializers.CharField(max_length=200, required=False)
    scopes = serializers.ListField(child=serializers.CharField(), required=False)
    allowed_ips = serializers.ListField(child=serializers.IPAddressField(), required=False)
    rate_limit = serializers.IntegerField(default=1000)
    expires_at = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False)


class CreateWebhookRequestSerializer(serializers.Serializer):
    """Request serializer for creating webhooks"""
    
    api_key = serializers.UUIDField()
    name = serializers.CharField(max_length=200)
    url = serializers.URLField()
    event_types = serializers.ListField(child=serializers.CharField())
    filters = serializers.DictField(required=False)
    timeout_seconds = serializers.IntegerField(default=30)
    max_retries = serializers.IntegerField(default=3)


class CreateDeveloperApplicationRequestSerializer(serializers.Serializer):
    """Request serializer for developer applications"""
    
    name = serializers.CharField(max_length=200)
    description = serializers.CharField()
    application_type = serializers.ChoiceField(choices=[
        ('web', 'Web Application'),
        ('mobile', 'Mobile Application'),
        ('server', 'Server Application'),
        ('integration', 'System Integration')
    ])
    website_url = serializers.URLField(required=False)
    callback_urls = serializers.ListField(child=serializers.URLField(), required=False)
    organization = serializers.CharField(max_length=200, required=False)
    contact_email = serializers.EmailField()
    requested_scopes = serializers.ListField(child=serializers.CharField())


class APIResponseSerializer(serializers.Serializer):
    """Generic API response serializer"""
    
    status = serializers.CharField()
    data = serializers.JSONField()
    timestamp = serializers.DateTimeField()
    request_id = serializers.CharField(required=False)