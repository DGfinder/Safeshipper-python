import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import RegexValidator, EmailValidator
from companies.models import Company
from shipments.models import Shipment

User = get_user_model()

class CustomerProfile(models.Model):
    """Extended customer profile for portal users"""
    
    NOTIFICATION_PREFERENCES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('webhook', 'Webhook'),
    ]
    
    DASHBOARD_LAYOUTS = [
        ('compact', 'Compact View'),
        ('detailed', 'Detailed View'),
        ('cards', 'Card Layout'),
        ('list', 'List View'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='customer_profiles')
    
    # Contact preferences
    preferred_contact_method = models.CharField(max_length=20, choices=NOTIFICATION_PREFERENCES, default='email')
    notification_preferences = models.JSONField(default=dict, help_text="Notification settings by event type")
    
    # Portal preferences
    dashboard_layout = models.CharField(max_length=20, choices=DASHBOARD_LAYOUTS, default='detailed')
    default_filters = models.JSONField(default=dict, help_text="Saved filter preferences")
    
    # Communication settings
    language = models.CharField(max_length=10, default='en', help_text="Preferred language code")
    timezone = models.CharField(max_length=50, default='UTC')
    
    # API access
    api_access_enabled = models.BooleanField(default=False)
    webhook_url = models.URLField(blank=True, help_text="Customer webhook endpoint")
    webhook_secret = models.CharField(max_length=128, blank=True)
    
    # Business information
    business_hours = models.JSONField(default=dict, help_text="Business hours by day")
    emergency_contact = models.JSONField(default=dict, help_text="Emergency contact information")
    
    # Portal settings
    show_pricing = models.BooleanField(default=True)
    show_documents = models.BooleanField(default=True)
    show_tracking_details = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['company__name', 'user__last_name']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.company.name}"


class CustomerDashboard(models.Model):
    """Customer dashboard configurations and widgets"""
    
    WIDGET_TYPES = [
        ('shipment_status', 'Shipment Status Overview'),
        ('recent_shipments', 'Recent Shipments'),
        ('tracking_map', 'Live Tracking Map'),
        ('cost_summary', 'Cost Summary'),
        ('compliance_alerts', 'Compliance Alerts'),
        ('document_status', 'Document Status'),
        ('performance_metrics', 'Performance Metrics'),
        ('quick_actions', 'Quick Actions'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_profile = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='dashboards')
    
    # Dashboard configuration
    name = models.CharField(max_length=100, default='My Dashboard')
    is_default = models.BooleanField(default=True)
    layout_config = models.JSONField(default=dict, help_text="Widget layout and positioning")
    
    # Widget configuration
    enabled_widgets = models.JSONField(default=list, help_text="List of enabled widget types")
    widget_settings = models.JSONField(default=dict, help_text="Settings for each widget")
    
    # Filters and preferences
    default_date_range = models.CharField(max_length=20, default='30_days')
    auto_refresh_interval = models.IntegerField(default=300, help_text="Auto-refresh interval in seconds")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['customer_profile', 'name']
        unique_together = ['customer_profile', 'name']
    
    def __str__(self):
        return f"{self.customer_profile.user.get_full_name()} - {self.name}"


class CustomerNotification(models.Model):
    """Customer notifications and alerts"""
    
    NOTIFICATION_TYPES = [
        ('shipment_update', 'Shipment Update'),
        ('delivery_confirmation', 'Delivery Confirmation'),
        ('exception_alert', 'Exception Alert'),
        ('document_required', 'Document Required'),
        ('compliance_issue', 'Compliance Issue'),
        ('invoice_ready', 'Invoice Ready'),
        ('system_maintenance', 'System Maintenance'),
        ('account_update', 'Account Update'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('unread', 'Unread'),
        ('read', 'Read'),
        ('archived', 'Archived'),
        ('dismissed', 'Dismissed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_profile = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='notifications')
    
    # Notification content
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='normal')
    
    # Related objects
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, null=True, blank=True)
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.UUIDField(null=True, blank=True)
    
    # Delivery and status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unread')
    delivered_via = models.JSONField(default=list, help_text="Delivery channels used")
    
    # Actions
    action_url = models.URLField(blank=True, help_text="URL for notification action")
    action_text = models.CharField(max_length=50, blank=True, help_text="Action button text")
    
    # Timing
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['customer_profile', 'status']),
            models.Index(fields=['notification_type', 'sent_at']),
            models.Index(fields=['priority', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.customer_profile.user.get_full_name()}"
    
    def mark_as_read(self):
        if self.status == 'unread':
            self.status = 'read'
            self.read_at = timezone.now()
            self.save()


class SelfServiceRequest(models.Model):
    """Self-service requests from customers"""
    
    REQUEST_TYPES = [
        ('quote_request', 'Quote Request'),
        ('pickup_request', 'Pickup Request'),
        ('delivery_change', 'Delivery Address Change'),
        ('document_upload', 'Document Upload'),
        ('support_ticket', 'Support Ticket'),
        ('account_update', 'Account Information Update'),
        ('service_inquiry', 'Service Inquiry'),
        ('billing_inquiry', 'Billing Inquiry'),
    ]
    
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_profile = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='service_requests')
    
    # Request details
    request_type = models.CharField(max_length=30, choices=REQUEST_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='normal')
    
    # Request data
    request_data = models.JSONField(default=dict, help_text="Structured request data")
    attachments = models.JSONField(default=list, help_text="List of attachment URLs")
    
    # Related objects
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, null=True, blank=True)
    
    # Status and processing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_requests')
    
    # Response
    response_message = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    
    # Timing
    submitted_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # SLA tracking
    response_sla_hours = models.IntegerField(default=24)
    resolution_sla_hours = models.IntegerField(default=72)
    
    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['customer_profile', 'status']),
            models.Index(fields=['request_type', 'submitted_at']),
            models.Index(fields=['assigned_to', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.customer_profile.user.get_full_name()}"
    
    @property
    def is_overdue(self):
        if self.due_date and self.status not in ['completed', 'cancelled']:
            return timezone.now() > self.due_date
        return False


class CustomerFeedback(models.Model):
    """Customer feedback and ratings"""
    
    FEEDBACK_TYPES = [
        ('service_rating', 'Service Rating'),
        ('delivery_rating', 'Delivery Rating'),
        ('platform_feedback', 'Platform Feedback'),
        ('feature_request', 'Feature Request'),
        ('bug_report', 'Bug Report'),
        ('general_feedback', 'General Feedback'),
    ]
    
    RATING_CHOICES = [
        (1, '1 - Poor'),
        (2, '2 - Fair'),
        (3, '3 - Good'),
        (4, '4 - Very Good'),
        (5, '5 - Excellent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_profile = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='feedback')
    
    # Feedback details
    feedback_type = models.CharField(max_length=30, choices=FEEDBACK_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    
    # Related objects
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, null=True, blank=True)
    service_request = models.ForeignKey(SelfServiceRequest, on_delete=models.CASCADE, null=True, blank=True)
    
    # Categories and tags
    categories = models.JSONField(default=list, help_text="Feedback categories")
    tags = models.JSONField(default=list, help_text="Feedback tags")
    
    # Follow-up
    follow_up_required = models.BooleanField(default=False)
    follow_up_notes = models.TextField(blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_public = models.BooleanField(default=False, help_text="Can be used as testimonial")
    
    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['customer_profile', 'rating']),
            models.Index(fields=['feedback_type', 'submitted_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.rating}/5" if self.rating else self.title


class PortalUsageAnalytics(models.Model):
    """Track portal usage and customer engagement"""
    
    ACTION_TYPES = [
        ('login', 'Login'),
        ('view_dashboard', 'View Dashboard'),
        ('track_shipment', 'Track Shipment'),
        ('download_document', 'Download Document'),
        ('submit_request', 'Submit Request'),
        ('update_profile', 'Update Profile'),
        ('view_invoice', 'View Invoice'),
        ('search', 'Search'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_profile = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='usage_analytics')
    
    # Action details
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    page_url = models.URLField()
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField()
    
    # Context
    session_id = models.CharField(max_length=100, blank=True)
    action_data = models.JSONField(default=dict, help_text="Additional action context")
    
    # Timing
    timestamp = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['customer_profile', 'timestamp']),
            models.Index(fields=['action_type', 'timestamp']),
            models.Index(fields=['session_id']),
        ]
    
    def __str__(self):
        return f"{self.action_type} - {self.customer_profile.user.get_full_name()}"