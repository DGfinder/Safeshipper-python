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