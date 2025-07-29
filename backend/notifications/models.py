# notifications/models.py
"""
Models for managing push notifications and device registrations.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class PushNotificationDevice(models.Model):
    """
    Model for storing mobile device push notification tokens and preferences.
    """
    PLATFORM_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='push_notification_devices',
        help_text="User who owns this device"
    )
    
    # Device Information
    expo_push_token = models.CharField(
        max_length=500,
        help_text="Expo push notification token"
    )
    device_platform = models.CharField(
        max_length=10,
        choices=PLATFORM_CHOICES,
        help_text="Mobile platform (iOS or Android)"
    )
    device_identifier = models.CharField(
        max_length=255,
        help_text="Unique device identifier"
    )
    app_version = models.CharField(
        max_length=50,
        default='1.0.0',
        help_text="Version of the mobile app"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this device is actively registered for notifications"
    )
    
    # Notification Preferences
    notification_preferences = models.JSONField(
        default=dict,
        help_text="User's notification preferences for this device"
    )
    
    # Timestamps
    registered_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the device was first registered"
    )
    last_updated = models.DateTimeField(
        auto_now=True,
        help_text="When the device information was last updated"
    )
    unregistered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the device was unregistered"
    )
    
    class Meta:
        db_table = 'notifications_push_devices'
        verbose_name = 'Push Notification Device'
        verbose_name_plural = 'Push Notification Devices'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['expo_push_token']),
            models.Index(fields=['device_identifier']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'device_identifier'],
                name='unique_user_device'
            )
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.device_platform} ({self.device_identifier[:8]}...)"
    
    @property
    def default_notification_preferences(self):
        """Return default notification preferences."""
        return {
            'feedback_notifications': True,
            'shipment_updates': True,
            'emergency_alerts': True,
        }
    
    def save(self, *args, **kwargs):
        """Override save to set default preferences if not provided."""
        if not self.notification_preferences:
            self.notification_preferences = self.default_notification_preferences
        super().save(*args, **kwargs)
    
    def should_receive_notification(self, notification_type: str) -> bool:
        """
        Check if this device should receive a specific type of notification.
        
        Args:
            notification_type: Type of notification (e.g., 'feedback_notifications')
        
        Returns:
            bool: True if device should receive the notification
        """
        if not self.is_active:
            return False
        
        preferences = self.notification_preferences or {}
        
        # Default to True if preference not explicitly set
        return preferences.get(notification_type, True)


class PushNotificationLog(models.Model):
    """
    Model for logging sent push notifications for audit and debugging.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('delivered', 'Delivered'),
        ('error', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(
        PushNotificationDevice,
        on_delete=models.CASCADE,
        related_name='notification_logs',
        help_text="Device the notification was sent to"
    )
    
    # Notification Content
    title = models.CharField(
        max_length=255,
        help_text="Notification title"
    )
    body = models.TextField(
        help_text="Notification body text"
    )
    data = models.JSONField(
        default=dict,
        help_text="Additional notification data"
    )
    
    # Delivery Information
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Notification delivery status"
    )
    expo_ticket_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Expo push notification ticket ID"
    )
    expo_receipt_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Expo push notification receipt ID"
    )
    
    # Error Information
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Error message if delivery failed"
    )
    error_code = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Error code from Expo"
    )
    
    # Context
    notification_type = models.CharField(
        max_length=50,
        help_text="Type of notification (feedback, shipment, emergency, etc.)"
    )
    related_object_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="ID of related object (shipment, feedback, etc.)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the notification was created"
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the notification was sent"
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the notification was delivered"
    )
    
    class Meta:
        db_table = 'notifications_push_logs'
        verbose_name = 'Push Notification Log'
        verbose_name_plural = 'Push Notification Logs'
        indexes = [
            models.Index(fields=['device', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['related_object_id']),
            models.Index(fields=['-created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} to {self.device.user.get_full_name()} ({self.status})"
    
    def mark_sent(self, ticket_id: str = None):
        """Mark notification as sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        if ticket_id:
            self.expo_ticket_id = ticket_id
        self.save(update_fields=['status', 'sent_at', 'expo_ticket_id'])
    
    def mark_delivered(self, receipt_id: str = None):
        """Mark notification as delivered."""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        if receipt_id:
            self.expo_receipt_id = receipt_id
        self.save(update_fields=['status', 'delivered_at', 'expo_receipt_id'])
    
    def mark_failed(self, error_message: str, error_code: str = None):
        """Mark notification as failed with error details."""
        self.status = 'failed'
        self.error_message = error_message
        if error_code:
            self.error_code = error_code
        self.save(update_fields=['status', 'error_message', 'error_code'])


class NotificationTemplate(models.Model):
    """
    Model for storing reusable notification templates.
    """
    TEMPLATE_TYPES = [
        ('feedback_received', 'Feedback Received'),
        ('feedback_request', 'Feedback Request'),
        ('shipment_update', 'Shipment Update'),
        ('emergency_alert', 'Emergency Alert'),
        ('delivery_complete', 'Delivery Complete'),
        ('pickup_reminder', 'Pickup Reminder'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=100,
        help_text="Template name"
    )
    template_type = models.CharField(
        max_length=50,
        choices=TEMPLATE_TYPES,
        help_text="Type of notification template"
    )
    
    # Template Content
    title_template = models.CharField(
        max_length=255,
        help_text="Title template with variable placeholders"
    )
    body_template = models.TextField(
        help_text="Body template with variable placeholders"
    )
    
    # Configuration
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this template is active"
    )
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('normal', 'Normal'),
            ('high', 'High'),
            ('urgent', 'Urgent'),
        ],
        default='normal',
        help_text="Notification priority"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications_templates'
        verbose_name = 'Notification Template'
        verbose_name_plural = 'Notification Templates'
        indexes = [
            models.Index(fields=['template_type', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'template_type'],
                name='unique_template_name_type'
            )
        ]
    
    def __str__(self):
        return f"{self.name} ({self.template_type})"
    
    def render_title(self, context: dict) -> str:
        """Render title template with provided context."""
        return self.title_template.format(**context)
    
    def render_body(self, context: dict) -> str:
        """Render body template with provided context."""
        return self.body_template.format(**context)