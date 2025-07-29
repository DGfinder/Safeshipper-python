# notifications/notification_preferences.py

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class FeedbackNotificationPreference(models.Model):
    """
    Detailed notification preferences specifically for feedback system.
    This extends the basic notification preferences with feedback-specific settings.
    """
    NOTIFICATION_METHODS = [
        ('push', 'Push Notification'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('in_app', 'In-App Notification'),
    ]
    
    FREQUENCY_CHOICES = [
        ('immediate', 'Immediate'),
        ('hourly', 'Hourly Digest'),
        ('daily', 'Daily Digest'),
        ('weekly', 'Weekly Digest'),
        ('disabled', 'Disabled'),
    ]
    
    SEVERITY_LEVELS = [
        ('all', 'All Feedback'),
        ('poor_only', 'Poor Feedback Only (<67%)'),
        ('critical_only', 'Critical Issues Only (<33%)'),
        ('disabled', 'Disabled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='feedback_notification_preferences',
        help_text="User these preferences belong to"
    )
    
    # Feedback Receipt Notifications (for managers/admins)
    feedback_received_enabled = models.BooleanField(
        default=True,
        help_text="Receive notifications when new feedback is submitted"
    )
    feedback_received_methods = models.JSONField(
        default=list,
        help_text="Methods for feedback receipt notifications: ['push', 'email']"
    )
    feedback_received_frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='immediate',
        help_text="How often to receive feedback notifications"
    )
    feedback_severity_filter = models.CharField(
        max_length=20,
        choices=SEVERITY_LEVELS,
        default='all',
        help_text="Which feedback to get notified about based on severity"
    )
    
    # Manager Response Notifications (for customers and staff)
    manager_response_enabled = models.BooleanField(
        default=True,
        help_text="Receive notifications when managers respond to feedback"
    )
    manager_response_methods = models.JSONField(
        default=list,
        help_text="Methods for manager response notifications"
    )
    
    # Incident Creation Notifications
    incident_created_enabled = models.BooleanField(
        default=True,
        help_text="Receive notifications when incidents are created from feedback"
    )
    incident_created_methods = models.JSONField(
        default=list,
        help_text="Methods for incident creation notifications"
    )
    
    # Analytics and Reporting
    weekly_report_enabled = models.BooleanField(
        default=True,
        help_text="Receive weekly feedback performance reports"
    )
    weekly_report_methods = models.JSONField(
        default=list,
        help_text="Methods for weekly report delivery"
    )
    
    # Driver-specific notifications
    driver_feedback_enabled = models.BooleanField(
        default=True,
        help_text="Drivers: receive notifications about feedback on your deliveries"
    )
    driver_feedback_methods = models.JSONField(
        default=list,
        help_text="Methods for driver feedback notifications"
    )
    driver_feedback_positive_only = models.BooleanField(
        default=False,
        help_text="Only notify drivers about positive feedback"
    )
    
    # Time-based restrictions
    quiet_hours_enabled = models.BooleanField(
        default=False,
        help_text="Enable quiet hours (no notifications during specified times)"
    )
    quiet_hours_start = models.TimeField(
        null=True,
        blank=True,
        help_text="Start of quiet hours (e.g., 22:00)"
    )
    quiet_hours_end = models.TimeField(
        null=True,
        blank=True,
        help_text="End of quiet hours (e.g., 07:00)"
    )
    quiet_hours_timezone = models.CharField(
        max_length=50,
        default='Australia/Sydney',
        help_text="Timezone for quiet hours"
    )
    
    # Emergency override
    emergency_override_enabled = models.BooleanField(
        default=True,
        help_text="Allow emergency notifications even during quiet hours"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications_feedback_preferences'
        verbose_name = 'Feedback Notification Preference'
        verbose_name_plural = 'Feedback Notification Preferences'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['feedback_received_enabled']),
            models.Index(fields=['weekly_report_enabled']),
        ]
    
    def __str__(self):
        return f"Feedback Notification Preferences for {self.user.get_full_name()}"
    
    @property
    def default_methods_for_role(self):
        """Return default notification methods based on user role."""
        role_defaults = {
            'ADMIN': ['push', 'email'],
            'MANAGER': ['push', 'email'],
            'CUSTOMER': ['email'],
            'DRIVER': ['push'],
        }
        return role_defaults.get(self.user.role, ['push'])
    
    def clean(self):
        """Validate preference settings."""
        super().clean()
        
        # Validate quiet hours
        if self.quiet_hours_enabled:
            if not self.quiet_hours_start or not self.quiet_hours_end:
                raise ValidationError({
                    'quiet_hours_start': 'Start and end times required when quiet hours enabled',
                    'quiet_hours_end': 'Start and end times required when quiet hours enabled'
                })
    
    def save(self, *args, **kwargs):
        """Override save to set defaults based on user role."""
        # Set default methods if not provided
        if not self.feedback_received_methods:
            self.feedback_received_methods = self.default_methods_for_role
        if not self.manager_response_methods:
            self.manager_response_methods = self.default_methods_for_role
        if not self.incident_created_methods:
            self.incident_created_methods = self.default_methods_for_role
        if not self.weekly_report_methods:
            self.weekly_report_methods = ['email']  # Reports are typically email-based
        if not self.driver_feedback_methods:
            self.driver_feedback_methods = ['push']  # Drivers prefer push notifications
            
        super().save(*args, **kwargs)
    
    def should_notify(self, notification_type: str, feedback_score: int = None, is_emergency: bool = False) -> bool:
        """
        Check if user should receive a notification based on preferences.
        
        Args:
            notification_type: Type of notification
            feedback_score: Score of the feedback (if applicable)
            is_emergency: Whether this is an emergency notification
            
        Returns:
            bool: True if user should be notified
        """
        # Emergency override
        if is_emergency and self.emergency_override_enabled:
            return True
        
        # Check quiet hours
        if self.quiet_hours_enabled and not is_emergency:
            current_time = timezone.localtime().time()
            if self.quiet_hours_start <= self.quiet_hours_end:
                # Same day quiet hours (e.g., 22:00 to 23:59)
                if self.quiet_hours_start <= current_time <= self.quiet_hours_end:
                    return False
            else:
                # Overnight quiet hours (e.g., 22:00 to 07:00)
                if current_time >= self.quiet_hours_start or current_time <= self.quiet_hours_end:
                    return False
        
        # Check specific notification type preferences
        if notification_type == 'feedback_received':
            if not self.feedback_received_enabled:
                return False
            
            # Check severity filter
            if feedback_score is not None:
                if self.feedback_severity_filter == 'disabled':
                    return False
                elif self.feedback_severity_filter == 'poor_only' and feedback_score >= 67:
                    return False
                elif self.feedback_severity_filter == 'critical_only' and feedback_score >= 33:
                    return False
        
        elif notification_type == 'manager_response':
            return self.manager_response_enabled
        
        elif notification_type == 'incident_created':
            return self.incident_created_enabled
        
        elif notification_type == 'weekly_report':
            return self.weekly_report_enabled
        
        elif notification_type == 'driver_feedback':
            if not self.driver_feedback_enabled:
                return False
            # Check if only positive feedback should be notified
            if self.driver_feedback_positive_only and feedback_score is not None and feedback_score < 85:
                return False
        
        return True
    
    def get_notification_methods(self, notification_type: str) -> list:
        """
        Get the preferred notification methods for a specific notification type.
        
        Args:
            notification_type: Type of notification
            
        Returns:
            list: List of notification methods ['push', 'email', 'sms']
        """
        method_mapping = {
            'feedback_received': self.feedback_received_methods,
            'manager_response': self.manager_response_methods,
            'incident_created': self.incident_created_methods,
            'weekly_report': self.weekly_report_methods,
            'driver_feedback': self.driver_feedback_methods,
        }
        
        return method_mapping.get(notification_type, self.default_methods_for_role)


class NotificationDigest(models.Model):
    """
    Model for tracking notification digests to prevent duplicate sends.
    """
    DIGEST_TYPES = [
        ('hourly', 'Hourly'),
        ('daily', 'Daily'), 
        ('weekly', 'Weekly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notification_digests'
    )
    digest_type = models.CharField(max_length=20, choices=DIGEST_TYPES)
    digest_period = models.CharField(
        max_length=50,
        help_text="Period identifier (e.g., '2024-01-15-14' for hourly, '2024-01-15' for daily)"
    )
    notification_count = models.IntegerField(default=0)
    content = models.JSONField(
        default=dict,
        help_text="Digest content with aggregated notifications"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications_digests'
        verbose_name = 'Notification Digest'
        verbose_name_plural = 'Notification Digests'
        indexes = [
            models.Index(fields=['user', 'digest_type', 'digest_period']),
            models.Index(fields=['sent_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'digest_type', 'digest_period'],
                name='unique_user_digest_period'
            )
        ]
    
    def __str__(self):
        return f"{self.digest_type.title()} digest for {self.user.get_full_name()} - {self.digest_period}"