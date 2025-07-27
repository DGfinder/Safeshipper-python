import uuid
import secrets
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import RegexValidator
from datetime import timedelta

User = get_user_model()

class APIKey(models.Model):
    """API keys for external system integration"""
    
    SCOPE_CHOICES = [
        ('read', 'Read Only'),
        ('write', 'Write Access'),
        ('admin', 'Administrative Access'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('revoked', 'Revoked'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, help_text="Descriptive name for this API key")
    key = models.CharField(max_length=128, unique=True, editable=False)
    key_prefix = models.CharField(max_length=8, editable=False)
    
    # Owner and organization
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_api_keys')
    organization = models.CharField(max_length=200, blank=True)
    
    # Permissions and scope
    scopes = models.JSONField(default=list, help_text="List of allowed API scopes")
    allowed_ips = models.JSONField(default=list, help_text="Whitelist of allowed IP addresses")
    rate_limit = models.IntegerField(default=1000, help_text="Requests per hour")
    
    # Status and validity
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Usage tracking
    total_requests = models.BigIntegerField(default=0)
    total_errors = models.BigIntegerField(default=0)
    
    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['key_prefix']),
            models.Index(fields=['status', 'expires_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.key_prefix}...)"
    
    def save(self, *args, **kwargs):
        if not self.key:
            # Generate API key: ss_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
            key_body = secrets.token_urlsafe(32)[:32]
            self.key = f"ss_live_{key_body}"
            self.key_prefix = self.key[:8]
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        return self.expires_at and timezone.now() > self.expires_at
    
    @property
    def is_active(self):
        return (self.status == 'active' and 
                not self.is_expired)
    
    def revoke(self):
        self.status = 'revoked'
        self.save()


class APIUsageLog(models.Model):
    """Log API usage for monitoring and billing"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    api_key = models.ForeignKey(APIKey, on_delete=models.CASCADE, related_name='usage_logs')
    
    # Request details
    endpoint = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Response details
    status_code = models.IntegerField()
    response_time_ms = models.IntegerField()
    bytes_sent = models.BigIntegerField(default=0)
    bytes_received = models.BigIntegerField(default=0)
    
    # Error details
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    
    # Metadata
    timestamp = models.DateTimeField(auto_now_add=True)
    request_id = models.CharField(max_length=36, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['api_key', 'timestamp']),
            models.Index(fields=['endpoint', 'timestamp']),
            models.Index(fields=['status_code', 'timestamp']),
        ]


class WebhookEndpoint(models.Model):
    """Webhook endpoints for event notifications"""
    
    EVENT_TYPES = [
        ('shipment.created', 'Shipment Created'),
        ('shipment.updated', 'Shipment Updated'),
        ('shipment.delivered', 'Shipment Delivered'),
        ('document.validated', 'Document Validated'),
        ('audit.compliance_violation', 'Compliance Violation'),
        ('inspection.failed', 'Inspection Failed'),
        ('training.certification_expired', 'Certification Expired'),
        ('*', 'All Events'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    api_key = models.ForeignKey(APIKey, on_delete=models.CASCADE, related_name='webhooks')
    
    # Configuration
    name = models.CharField(max_length=200)
    url = models.URLField(max_length=500)
    secret = models.CharField(max_length=128, editable=False)
    
    # Event filtering
    event_types = models.JSONField(default=list, help_text="List of event types to send")
    filters = models.JSONField(default=dict, help_text="Additional filters for events")
    
    # Delivery settings
    timeout_seconds = models.IntegerField(default=30)
    max_retries = models.IntegerField(default=3)
    retry_delay_seconds = models.IntegerField(default=60)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_delivery_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    
    # Statistics
    total_deliveries = models.BigIntegerField(default=0)
    successful_deliveries = models.BigIntegerField(default=0)
    failed_deliveries = models.BigIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} -> {self.url}"
    
    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)


class WebhookDelivery(models.Model):
    """Individual webhook delivery attempts"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webhook = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='deliveries')
    
    # Event details
    event_type = models.CharField(max_length=100)
    event_id = models.UUIDField()
    payload = models.JSONField()
    
    # Delivery details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attempt_count = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    
    # Response details
    http_status = models.IntegerField(null=True, blank=True)
    response_headers = models.JSONField(default=dict)
    response_body = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    
    # Timing
    scheduled_for = models.DateTimeField(default=timezone.now)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['webhook', 'status']),
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['scheduled_for', 'status']),
        ]
    
    def __str__(self):
        return f"{self.event_type} -> {self.webhook.name} ({self.status})"


class DeveloperApplication(models.Model):
    """Developer applications for API access management"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    
    TYPE_CHOICES = [
        ('web', 'Web Application'),
        ('mobile', 'Mobile Application'),
        ('server', 'Server Application'),
        ('integration', 'System Integration'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Application details
    name = models.CharField(max_length=200)
    description = models.TextField()
    application_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    website_url = models.URLField(blank=True)
    callback_urls = models.JSONField(default=list)
    
    # Developer information
    developer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='developer_applications')
    organization = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField()
    
    # OAuth credentials
    client_id = models.CharField(max_length=128, unique=True, editable=False)
    client_secret = models.CharField(max_length=128, editable=False)
    
    # Permissions
    requested_scopes = models.JSONField(default=list)
    approved_scopes = models.JSONField(default=list)
    
    # Status and review
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Usage limits
    rate_limit = models.IntegerField(default=1000)
    monthly_quota = models.BigIntegerField(default=10000)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        if not self.client_id:
            self.client_id = f"ss_app_{secrets.token_urlsafe(16)}"
        if not self.client_secret:
            self.client_secret = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)


class APIDocumentation(models.Model):
    """API documentation and changelog management"""
    
    TYPE_CHOICES = [
        ('endpoint', 'API Endpoint'),
        ('guide', 'Integration Guide'),
        ('tutorial', 'Tutorial'),
        ('changelog', 'Changelog Entry'),
        ('reference', 'Reference'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Content
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    content = models.TextField()
    doc_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Organization
    category = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list)
    order = models.IntegerField(default=0)
    
    # API specific
    endpoint_path = models.CharField(max_length=500, blank=True)
    http_methods = models.JSONField(default=list)
    required_scopes = models.JSONField(default=list)
    
    # Versioning
    version = models.CharField(max_length=20, default='1.0')
    api_version_introduced = models.CharField(max_length=20, blank=True)
    api_version_deprecated = models.CharField(max_length=20, blank=True)
    
    # Publishing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    published_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['category', 'order', 'title']
        indexes = [
            models.Index(fields=['doc_type', 'status']),
            models.Index(fields=['category', 'order']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_doc_type_display()})"