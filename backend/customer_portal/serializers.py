from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CustomerProfile, CustomerDashboard, CustomerNotification,
    SelfServiceRequest, CustomerFeedback, PortalUsageAnalytics
)
from companies.models import Company

User = get_user_model()


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Serializer for customer profiles"""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'user', 'user_name', 'user_email', 'company', 'company_name',
            'preferred_contact_method', 'notification_preferences', 'dashboard_layout',
            'default_filters', 'language', 'timezone', 'api_access_enabled',
            'webhook_url', 'business_hours', 'emergency_contact', 'show_pricing',
            'show_documents', 'show_tracking_details', 'last_login_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'last_login_at', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'webhook_secret': {'write_only': True}
        }


class CustomerDashboardSerializer(serializers.ModelSerializer):
    """Serializer for customer dashboard configurations"""
    
    widget_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerDashboard
        fields = [
            'id', 'name', 'is_default', 'layout_config', 'enabled_widgets',
            'widget_settings', 'default_date_range', 'auto_refresh_interval',
            'widget_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_widget_count(self, obj):
        """Get count of enabled widgets"""
        return len(obj.enabled_widgets)


class CustomerNotificationSerializer(serializers.ModelSerializer):
    """Serializer for customer notifications"""
    
    shipment_tracking = serializers.CharField(source='shipment.tracking_number', read_only=True)
    time_since_sent = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerNotification
        fields = [
            'id', 'notification_type', 'title', 'message', 'priority',
            'shipment', 'shipment_tracking', 'status', 'delivered_via',
            'action_url', 'action_text', 'sent_at', 'read_at', 'expires_at',
            'time_since_sent', 'is_expired'
        ]
        read_only_fields = [
            'id', 'sent_at', 'read_at', 'delivered_via'
        ]
    
    def get_time_since_sent(self, obj):
        """Get human-readable time since notification was sent"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.sent_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff < timedelta(days=1):
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = diff.days
            return f"{days} day{'s' if days != 1 else ''} ago"
    
    def get_is_expired(self, obj):
        """Check if notification has expired"""
        if obj.expires_at:
            from django.utils import timezone
            return timezone.now() > obj.expires_at
        return False


class SelfServiceRequestSerializer(serializers.ModelSerializer):
    """Serializer for self-service requests"""
    
    shipment_tracking = serializers.CharField(source='shipment.tracking_number', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    days_since_submitted = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = SelfServiceRequest
        fields = [
            'id', 'request_type', 'title', 'description', 'priority',
            'request_data', 'attachments', 'shipment', 'shipment_tracking',
            'status', 'assigned_to', 'assigned_to_name', 'response_message',
            'submitted_at', 'due_date', 'completed_at', 'response_sla_hours',
            'resolution_sla_hours', 'days_since_submitted', 'is_overdue'
        ]
        read_only_fields = [
            'id', 'assigned_to', 'response_message', 'internal_notes',
            'submitted_at', 'completed_at'
        ]
    
    def get_days_since_submitted(self, obj):
        """Get days since request was submitted"""
        from django.utils import timezone
        diff = timezone.now() - obj.submitted_at
        return diff.days


class CustomerFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for customer feedback"""
    
    shipment_tracking = serializers.CharField(source='shipment.tracking_number', read_only=True)
    service_request_title = serializers.CharField(source='service_request.title', read_only=True)
    
    class Meta:
        model = CustomerFeedback
        fields = [
            'id', 'feedback_type', 'title', 'description', 'rating',
            'shipment', 'shipment_tracking', 'service_request', 'service_request_title',
            'categories', 'tags', 'follow_up_required', 'follow_up_notes',
            'responded_at', 'submitted_at', 'is_public'
        ]
        read_only_fields = [
            'id', 'follow_up_notes', 'responded_at', 'submitted_at'
        ]


class PortalAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for portal usage analytics"""
    
    class Meta:
        model = PortalUsageAnalytics
        fields = [
            'id', 'action_type', 'page_url', 'action_data',
            'timestamp', 'duration_seconds'
        ]
        read_only_fields = ['id', 'timestamp']


# Dashboard data serializers
class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary data"""
    
    total_shipments = serializers.IntegerField()
    active_shipments = serializers.IntegerField()
    delivered_shipments = serializers.IntegerField()
    pending_documents = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    open_requests = serializers.IntegerField()
    recent_feedback_rating = serializers.FloatField()


class ShipmentStatusSummarySerializer(serializers.Serializer):
    """Serializer for shipment status summary"""
    
    status = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class RecentActivitySerializer(serializers.Serializer):
    """Serializer for recent activity items"""
    
    type = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    timestamp = serializers.DateTimeField()
    url = serializers.URLField(required=False)
    icon = serializers.CharField(required=False)


class CustomerQuoteRequestSerializer(serializers.Serializer):
    """Serializer for customer quote requests"""
    
    origin_location = serializers.CharField(max_length=255)
    destination_location = serializers.CharField(max_length=255)
    freight_type = serializers.CharField(max_length=50)
    estimated_weight = serializers.DecimalField(max_digits=10, decimal_places=2)
    estimated_volume = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    pickup_date = serializers.DateField()
    delivery_date = serializers.DateField(required=False)
    special_requirements = serializers.CharField(required=False, allow_blank=True)
    contact_name = serializers.CharField(max_length=200)
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20)


class CustomerPickupRequestSerializer(serializers.Serializer):
    """Serializer for customer pickup requests"""
    
    pickup_address = serializers.CharField(max_length=500)
    pickup_date = serializers.DateField()
    pickup_time_window = serializers.CharField(max_length=100)
    contact_name = serializers.CharField(max_length=200)
    contact_phone = serializers.CharField(max_length=20)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    freight_description = serializers.CharField(max_length=500)
    estimated_weight = serializers.DecimalField(max_digits=10, decimal_places=2)
    packaging_type = serializers.CharField(max_length=100)


class NotificationPreferencesSerializer(serializers.Serializer):
    """Serializer for notification preferences"""
    
    shipment_updates = serializers.BooleanField(default=True)
    delivery_confirmations = serializers.BooleanField(default=True)
    exception_alerts = serializers.BooleanField(default=True)
    document_requests = serializers.BooleanField(default=True)
    invoice_notifications = serializers.BooleanField(default=True)
    promotional_emails = serializers.BooleanField(default=False)
    
    email_enabled = serializers.BooleanField(default=True)
    sms_enabled = serializers.BooleanField(default=False)
    push_enabled = serializers.BooleanField(default=True)


class CustomerDashboardDataSerializer(serializers.Serializer):
    """Serializer for complete customer dashboard data"""
    
    summary = DashboardSummarySerializer()
    shipment_status_breakdown = ShipmentStatusSummarySerializer(many=True)
    recent_activity = RecentActivitySerializer(many=True)
    notifications = CustomerNotificationSerializer(many=True)
    quick_actions = serializers.ListField()
    last_updated = serializers.DateTimeField()


class CustomerSupportTicketSerializer(serializers.Serializer):
    """Serializer for customer support tickets"""
    
    subject = serializers.CharField(max_length=200)
    category = serializers.ChoiceField(choices=[
        ('technical', 'Technical Issue'),
        ('billing', 'Billing Question'),
        ('shipment', 'Shipment Issue'),
        ('account', 'Account Question'),
        ('general', 'General Inquiry')
    ])
    priority = serializers.ChoiceField(choices=[
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent')
    ], default='normal')
    description = serializers.CharField()
    attachments = serializers.ListField(child=serializers.URLField(), required=False)
    shipment_reference = serializers.CharField(max_length=100, required=False)