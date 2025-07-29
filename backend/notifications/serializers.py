# notifications/serializers.py
"""
Serializers for push notification models.
"""

from rest_framework import serializers
from .models import PushNotificationDevice, PushNotificationLog, NotificationTemplate


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