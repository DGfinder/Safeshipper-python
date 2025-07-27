# communications/models.py
from django.db import models
from django.contrib.auth import get_user_model
from shipments.models import Shipment
import uuid

User = get_user_model()

class ShipmentEvent(models.Model):
    """
    Centralized communication log for shipments - tracks all events, comments, and status changes
    """
    EVENT_TYPES = [
        ('COMMENT', 'Comment'),
        ('STATUS_CHANGE', 'Status Change'),
        ('INSPECTION', 'Inspection Event'),
        ('LOCATION_UPDATE', 'Location Update'),
        ('DOCUMENT_UPLOAD', 'Document Upload'),
        ('PHOTO_UPLOAD', 'Photo Upload'),
        ('DELIVERY_UPDATE', 'Delivery Update'),
        ('ALERT', 'Alert/Warning'),
        ('SYSTEM', 'System Event'),
    ]
    
    PRIORITY_LEVELS = [
        ('LOW', 'Low'),
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(
        Shipment, 
        on_delete=models.CASCADE, 
        related_name='events'
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='shipment_events'
    )
    
    # Event details
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    title = models.CharField(max_length=255, blank=True)
    details = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='NORMAL')
    
    # Optional attachments
    attachment_url = models.URLField(max_length=500, blank=True)
    attachment_type = models.CharField(max_length=50, blank=True)  # 'photo', 'document', etc.
    
    # Metadata
    timestamp = models.DateTimeField(auto_now_add=True)
    is_internal = models.BooleanField(default=False)  # Hide from customers
    is_automated = models.BooleanField(default=False)  # System-generated
    
    # Related records
    related_inspection = models.ForeignKey(
        'inspections.Inspection', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['shipment', 'event_type']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['priority', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.get_event_type_display()} - {self.shipment.tracking_number}"

    @property
    def user_display_name(self):
        """Display name for the user who created this event"""
        if self.user.first_name and self.user.last_name:
            return f"{self.user.first_name} {self.user.last_name}"
        return self.user.username or self.user.email

    @property
    def user_role_display(self):
        """Display role of the user"""
        return getattr(self.user, 'role', 'USER').replace('_', ' ').title()

    @property
    def is_recent(self):
        """Check if event was created in the last hour"""
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() - self.timestamp < timedelta(hours=1)

    @classmethod
    def create_status_change_event(cls, shipment, user, old_status, new_status):
        """Helper method to create status change events"""
        return cls.objects.create(
            shipment=shipment,
            user=user,
            event_type='STATUS_CHANGE',
            title=f'Status changed from {old_status} to {new_status}',
            details=f'Shipment status updated from {old_status.replace("_", " ").title()} to {new_status.replace("_", " ").title()}',
            is_automated=False
        )

    @classmethod
    def create_inspection_event(cls, shipment, user, inspection, result):
        """Helper method to create inspection events"""
        return cls.objects.create(
            shipment=shipment,
            user=user,
            event_type='INSPECTION',
            title=f'{inspection.get_inspection_type_display()} completed',
            details=f'{inspection.get_inspection_type_display()} completed with result: {result}',
            related_inspection=inspection,
            is_automated=True
        )

    @classmethod
    def create_location_update_event(cls, shipment, user, location_info):
        """Helper method to create location update events"""
        return cls.objects.create(
            shipment=shipment,
            user=user,
            event_type='LOCATION_UPDATE',
            title='Location updated',
            details=f'Vehicle location updated: {location_info}',
            is_automated=True,
            is_internal=True
        )


class EventRead(models.Model):
    """
    Track which users have read which events (for notification purposes)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        ShipmentEvent, 
        on_delete=models.CASCADE, 
        related_name='read_receipts'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['event', 'user']
        indexes = [
            models.Index(fields=['user', 'read_at']),
        ]

    def __str__(self):
        return f"{self.user} read {self.event}"


class EventMention(models.Model):
    """
    Track user mentions in event comments (for notifications)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        ShipmentEvent, 
        on_delete=models.CASCADE, 
        related_name='mentions'
    )
    mentioned_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='event_mentions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['event', 'mentioned_user']

    def __str__(self):
        return f"{self.mentioned_user} mentioned in {self.event}"


# ============================================================================
# ENHANCED COMMUNICATION MODELS FOR COMPREHENSIVE MESSAGING SYSTEM
# ============================================================================

class Channel(models.Model):
    """
    Communication channels for group conversations and team collaboration.
    Supports different types of channels for various purposes.
    """
    CHANNEL_TYPES = [
        ('GENERAL', 'General Discussion'),
        ('SHIPMENT', 'Shipment-Specific'),
        ('EMERGENCY', 'Emergency Response'),
        ('COMPLIANCE', 'Compliance & Audit'),
        ('DIRECT', 'Direct Message'),
        ('COMPANY', 'Company Internal'),
        ('DRIVER', 'Driver Communication'),
        ('CUSTOMER', 'Customer Support'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    channel_type = models.CharField(max_length=20, choices=CHANNEL_TYPES, default='GENERAL')
    
    # Channel membership
    participants = models.ManyToManyField(
        User, 
        through='ChannelMembership',
        related_name='channels'
    )
    
    # Ownership and creation
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_channels'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Channel settings
    is_private = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    # Related objects
    related_shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='communication_channels'
    )
    related_company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='communication_channels'
    )
    
    # Emergency settings
    is_emergency_channel = models.BooleanField(default=False)
    emergency_level = models.IntegerField(
        choices=[(1, 'Low'), (2, 'Medium'), (3, 'High'), (4, 'Critical'), (5, 'Emergency')],
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['channel_type', 'created_at']),
            models.Index(fields=['is_private', 'is_archived']),
            models.Index(fields=['related_shipment', 'channel_type']),
            models.Index(fields=['is_emergency_channel', 'emergency_level']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_channel_type_display()})"

    @property
    def last_message(self):
        """Get the last message in this channel"""
        return self.messages.order_by('-created_at').first()

    @property
    def participant_count(self):
        """Get the number of active participants"""
        return self.memberships.filter(is_active=True).count()


class ChannelMembership(models.Model):
    """
    Membership information for users in channels.
    Tracks permissions and activity within channels.
    """
    ROLE_CHOICES = [
        ('MEMBER', 'Member'),
        ('MODERATOR', 'Moderator'),
        ('ADMIN', 'Administrator'),
        ('OWNER', 'Owner'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='memberships')
    
    # Membership details
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MEMBER')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_muted = models.BooleanField(default=False)
    
    # Notification preferences for this channel
    notify_on_all_messages = models.BooleanField(default=True)
    notify_on_mentions = models.BooleanField(default=True)
    notify_on_keywords = models.BooleanField(default=False)
    keywords = models.TextField(blank=True, help_text="Comma-separated keywords to watch for")
    
    # Read tracking
    last_read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'channel']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['channel', 'role']),
        ]

    def __str__(self):
        return f"{self.user} in {self.channel.name} ({self.role})"


class Message(models.Model):
    """
    Universal message model for all types of communication.
    Supports text, files, and rich content.
    """
    MESSAGE_TYPES = [
        ('TEXT', 'Text Message'),
        ('FILE', 'File Attachment'),
        ('IMAGE', 'Image'),
        ('VOICE', 'Voice Message'),
        ('LOCATION', 'Location Share'),
        ('SYSTEM', 'System Message'),
        ('EMERGENCY', 'Emergency Alert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(
        Channel, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    
    # Message content
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='TEXT')
    content = models.TextField(blank=True)
    
    # File attachments
    file_url = models.URLField(max_length=500, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=100, blank=True)
    
    # Location data
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_name = models.CharField(max_length=255, blank=True)
    
    # Threading
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    thread_id = models.UUIDField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Message status
    is_deleted = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    
    # Emergency and priority
    is_emergency = models.BooleanField(default=False)
    priority = models.CharField(
        max_length=10,
        choices=ShipmentEvent.PRIORITY_LEVELS,
        default='NORMAL'
    )
    
    # Rich content metadata
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['channel', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['thread_id', 'created_at']),
            models.Index(fields=['is_emergency', 'priority']),
            models.Index(fields=['message_type', 'created_at']),
        ]

    def __str__(self):
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"{self.sender} in {self.channel.name}: {content_preview}"

    @property
    def is_thread_starter(self):
        """Check if this message starts a thread"""
        return self.reply_to is None and self.replies.exists()

    @property
    def thread_message_count(self):
        """Get the number of replies in this thread"""
        if self.thread_id:
            return Message.objects.filter(thread_id=self.thread_id).count()
        return self.replies.count()


class MessageRead(models.Model):
    """
    Track which users have read which messages.
    Used for unread message counts and read receipts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        related_name='read_receipts'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['message', 'user']
        indexes = [
            models.Index(fields=['user', 'read_at']),
            models.Index(fields=['message', 'read_at']),
        ]

    def __str__(self):
        return f"{self.user} read {self.message.id}"


class MessageReaction(models.Model):
    """
    Emoji reactions to messages.
    """
    REACTION_TYPES = [
        ('👍', 'Thumbs Up'),
        ('👎', 'Thumbs Down'),
        ('❤️', 'Heart'),
        ('😂', 'Laugh'),
        ('😮', 'Surprised'),
        ('😢', 'Sad'),
        ('😡', 'Angry'),
        ('✅', 'Check'),
        ('❌', 'X'),
        ('⚠️', 'Warning'),
        ('🚨', 'Emergency'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        related_name='reactions'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reaction = models.CharField(max_length=10, choices=REACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['message', 'user', 'reaction']

    def __str__(self):
        return f"{self.user} reacted {self.reaction} to {self.message.id}"


class DirectMessage(models.Model):
    """
    Direct messages between two users.
    Creates a private channel automatically.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user1 = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='direct_messages_as_user1'
    )
    user2 = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='direct_messages_as_user2'
    )
    channel = models.OneToOneField(
        Channel, 
        on_delete=models.CASCADE, 
        related_name='direct_message_info'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Activity tracking
    last_message_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['user1', 'user2']
        indexes = [
            models.Index(fields=['user1', 'is_active']),
            models.Index(fields=['user2', 'is_active']),
            models.Index(fields=['last_message_at']),
        ]

    def __str__(self):
        return f"DM between {self.user1} and {self.user2}"

    @classmethod
    def get_or_create_dm(cls, user1, user2):
        """Get or create a direct message channel between two users"""
        # Ensure consistent ordering
        if user1.id > user2.id:
            user1, user2 = user2, user1
        
        dm, created = cls.objects.get_or_create(
            user1=user1,
            user2=user2,
            defaults={
                'channel': Channel.objects.create(
                    name=f"DM: {user1.get_full_name()} & {user2.get_full_name()}",
                    channel_type='DIRECT',
                    is_private=True,
                    created_by=user1
                )
            }
        )
        
        if created:
            # Add both users as participants
            ChannelMembership.objects.create(user=user1, channel=dm.channel, role='OWNER')
            ChannelMembership.objects.create(user=user2, channel=dm.channel, role='OWNER')
        
        return dm


class NotificationPreference(models.Model):
    """
    User preferences for different types of notifications.
    Controls how and when users receive notifications.
    """
    NOTIFICATION_TYPES = [
        ('SHIPMENT_UPDATE', 'Shipment Updates'),
        ('DIRECT_MESSAGE', 'Direct Messages'),
        ('CHANNEL_MESSAGE', 'Channel Messages'),
        ('MENTION', 'Mentions'),
        ('EMERGENCY', 'Emergency Alerts'),
        ('SYSTEM', 'System Notifications'),
        ('COMPLIANCE', 'Compliance Alerts'),
        ('INSPECTION', 'Inspection Updates'),
    ]
    
    DELIVERY_METHODS = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('PUSH', 'Push Notification'),
        ('IN_APP', 'In-App Notification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_preferences')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    delivery_method = models.CharField(max_length=10, choices=DELIVERY_METHODS)
    
    # Preferences
    is_enabled = models.BooleanField(default=True)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Frequency settings
    immediate = models.BooleanField(default=True)
    digest_daily = models.BooleanField(default=False)
    digest_weekly = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'notification_type', 'delivery_method']
        indexes = [
            models.Index(fields=['user', 'is_enabled']),
            models.Index(fields=['notification_type', 'delivery_method']),
        ]

    def __str__(self):
        return f"{self.user} - {self.get_notification_type_display()} via {self.get_delivery_method_display()}"


class NotificationQueue(models.Model):
    """
    Queue for managing notification delivery.
    Tracks the status and retry attempts for notifications.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(
        max_length=20, 
        choices=NotificationPreference.NOTIFICATION_TYPES
    )
    delivery_method = models.CharField(
        max_length=10, 
        choices=NotificationPreference.DELIVERY_METHODS
    )
    
    # Notification content
    subject = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    html_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Delivery details
    recipient_address = models.CharField(max_length=255)  # email, phone, device_token
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    priority = models.IntegerField(default=5)  # 1=highest, 10=lowest
    
    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Retry logic
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    last_error = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Related objects
    related_message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    related_event = models.ForeignKey(
        ShipmentEvent, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )

    class Meta:
        ordering = ['priority', 'created_at']
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['priority', 'created_at']),
            models.Index(fields=['delivery_method', 'status']),
        ]

    def __str__(self):
        return f"Notification to {self.user} - {self.get_notification_type_display()} ({self.status})"

    def can_retry(self):
        """Check if this notification can be retried"""
        return self.retry_count < self.max_retries and self.status == 'FAILED'