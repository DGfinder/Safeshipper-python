# notifications/serializers.py
"""
Serializers for push notification models.
"""

from rest_framework import serializers
from .models import PushNotificationDevice, PushNotificationLog, NotificationTemplate
from .notification_preferences import FeedbackNotificationPreference, NotificationDigest


class PushNotificationDeviceSerializer(serializers.ModelSerializer):
    """Serializer for PushNotificationDevice model."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    days_since_registration = serializers.SerializerMethodField()
    
    class Meta:
        model = PushNotificationDevice
        fields = [
            'id',
            'user',
            'user_name',
            'expo_push_token',
            'device_platform',
            'device_identifier',
            'app_version',
            'is_active',
            'notification_preferences',
            'registered_at',
            'last_updated',
            'unregistered_at',
            'days_since_registration',
        ]
        read_only_fields = ['id', 'user', 'registered_at', 'last_updated']
    
    def get_days_since_registration(self, obj):
        """Calculate days since device was registered."""
        from django.utils import timezone
        if obj.registered_at:
            delta = timezone.now() - obj.registered_at
            return delta.days
        return None


class PushNotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for PushNotificationLog model."""
    
    device_info = serializers.SerializerMethodField()
    user_name = serializers.CharField(source='device.user.get_full_name', read_only=True)
    
    class Meta:
        model = PushNotificationLog
        fields = [
            'id',
            'device',
            'device_info',
            'user_name',
            'title',
            'body',
            'data',
            'status',
            'expo_ticket_id',
            'expo_receipt_id',
            'error_message',
            'error_code',
            'notification_type',
            'related_object_id',
            'created_at',
            'sent_at',
            'delivered_at',
        ]
        read_only_fields = ['id', 'created_at', 'sent_at', 'delivered_at']
    
    def get_device_info(self, obj):
        """Get basic device information."""
        return {
            'platform': obj.device.device_platform,
            'identifier': obj.device.device_identifier,
            'app_version': obj.device.app_version,
        }


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for NotificationTemplate model."""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'template_type',
            'title_template',
            'body_template',
            'is_active',
            'priority',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PushNotificationStatsSerializer(serializers.Serializer):
    """Serializer for push notification statistics."""
    
    total_devices = serializers.IntegerField()
    active_devices = serializers.IntegerField()
    ios_devices = serializers.IntegerField()
    android_devices = serializers.IntegerField()
    notifications_sent_today = serializers.IntegerField()
    notifications_sent_week = serializers.IntegerField()
    success_rate = serializers.FloatField()
    recent_errors = serializers.ListField(child=serializers.CharField())


class FeedbackNotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for feedback notification preferences with validation.
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    default_methods = serializers.SerializerMethodField()
    
    class Meta:
        model = FeedbackNotificationPreference
        fields = [
            'id',
            'user',
            'user_name',
            'user_role',
            'default_methods',
            
            # Feedback receipt notifications
            'feedback_received_enabled',
            'feedback_received_methods',
            'feedback_received_frequency',
            'feedback_severity_filter',
            
            # Manager response notifications
            'manager_response_enabled',
            'manager_response_methods',
            
            # Incident creation notifications
            'incident_created_enabled',
            'incident_created_methods',
            
            # Analytics and reporting
            'weekly_report_enabled',
            'weekly_report_methods',
            
            # Driver-specific notifications
            'driver_feedback_enabled',
            'driver_feedback_methods',
            'driver_feedback_positive_only',
            
            # Time-based restrictions
            'quiet_hours_enabled',
            'quiet_hours_start',
            'quiet_hours_end',
            'quiet_hours_timezone',
            'emergency_override_enabled',
            
            # Metadata
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'user_name', 'user_role', 'default_methods', 'created_at', 'updated_at']
    
    def get_default_methods(self, obj):
        """Get default notification methods for user's role."""
        return obj.default_methods_for_role
    
    def validate_feedback_received_methods(self, value):
        """Validate feedback received methods."""
        valid_methods = ['push', 'email', 'sms', 'in_app']
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of notification methods.")
        
        for method in value:
            if method not in valid_methods:
                raise serializers.ValidationError(f"Invalid method '{method}'. Valid options: {valid_methods}")
        
        return value
    
    def validate_manager_response_methods(self, value):
        """Validate manager response methods."""
        return self.validate_feedback_received_methods(value)
    
    def validate_incident_created_methods(self, value):
        """Validate incident created methods."""
        return self.validate_feedback_received_methods(value)
    
    def validate_weekly_report_methods(self, value):
        """Validate weekly report methods."""
        return self.validate_feedback_received_methods(value)
    
    def validate_driver_feedback_methods(self, value):
        """Validate driver feedback methods."""
        return self.validate_feedback_received_methods(value)
    
    def validate(self, data):
        """Cross-field validation."""
        # Validate quiet hours
        if data.get('quiet_hours_enabled'):
            if not data.get('quiet_hours_start') or not data.get('quiet_hours_end'):
                raise serializers.ValidationError({
                    'quiet_hours_start': 'Required when quiet hours enabled',
                    'quiet_hours_end': 'Required when quiet hours enabled'
                })
        
        return data


class NotificationDigestSerializer(serializers.ModelSerializer):
    """
    Serializer for notification digests (read-only).
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    notification_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificationDigest
        fields = [
            'id',
            'user',
            'user_name',
            'digest_type',
            'digest_period',
            'notification_count',
            'notification_summary',
            'sent_at',
            'created_at',
        ]
        read_only_fields = ['__all__']
    
    def get_notification_summary(self, obj):
        """Get summary of notifications in digest."""
        notifications = obj.content.get('notifications', [])
        
        if not notifications:
            return {}
        
        # Calculate summary statistics
        total_count = len(notifications)
        score_sum = sum(n.get('score', 0) for n in notifications)
        avg_score = score_sum / total_count if total_count > 0 else 0
        
        poor_count = sum(1 for n in notifications if n.get('score', 100) < 67)
        excellent_count = sum(1 for n in notifications if n.get('score', 0) >= 95)
        
        return {
            'total_notifications': total_count,
            'average_score': round(avg_score, 1),
            'poor_feedback_count': poor_count,
            'excellent_feedback_count': excellent_count,
            'score_range': {
                'min': min(n.get('score', 0) for n in notifications) if notifications else 0,
                'max': max(n.get('score', 0) for n in notifications) if notifications else 0,
            }
        }


class NotificationPreferencesUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk updating notification preferences.
    """
    feedback_received_enabled = serializers.BooleanField(required=False)
    feedback_received_methods = serializers.ListField(
        child=serializers.ChoiceField(choices=['push', 'email', 'sms', 'in_app']),
        required=False
    )
    feedback_received_frequency = serializers.ChoiceField(
        choices=['immediate', 'hourly', 'daily', 'weekly', 'disabled'],
        required=False
    )
    feedback_severity_filter = serializers.ChoiceField(
        choices=['all', 'poor_only', 'critical_only', 'disabled'],
        required=False
    )
    manager_response_enabled = serializers.BooleanField(required=False)
    manager_response_methods = serializers.ListField(
        child=serializers.ChoiceField(choices=['push', 'email', 'sms', 'in_app']),
        required=False
    )
    quiet_hours_enabled = serializers.BooleanField(required=False)
    quiet_hours_start = serializers.TimeField(required=False)
    quiet_hours_end = serializers.TimeField(required=False)
    emergency_override_enabled = serializers.BooleanField(required=False)
    
    def validate(self, data):
        """Validate the update data."""
        # Validate quiet hours
        if data.get('quiet_hours_enabled') and (
            'quiet_hours_start' not in data or 'quiet_hours_end' not in data
        ):
            raise serializers.ValidationError(
                "quiet_hours_start and quiet_hours_end are required when enabling quiet hours"
            )
        
        return data