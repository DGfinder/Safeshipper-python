# inspections/models.py
from django.db import models
from django.contrib.auth import get_user_model
from shipments.models import Shipment
import uuid

User = get_user_model()

class Inspection(models.Model):
    """
    Model for hazard inspections performed by drivers and loaders
    """
    INSPECTION_TYPES = [
        ('PRE_TRIP', 'Pre-Trip Inspection'),
        ('POST_TRIP', 'Post-Trip Inspection'),
        ('LOADING', 'Loading Inspection'),
        ('UNLOADING', 'Unloading Inspection'),
        ('SAFETY_CHECK', 'Safety Check'),
    ]
    
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(
        Shipment, 
        on_delete=models.CASCADE, 
        related_name='inspections'
    )
    inspector = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='conducted_inspections'
    )
    inspection_type = models.CharField(max_length=20, choices=INSPECTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Summary
    overall_result = models.CharField(
        max_length=10, 
        choices=[('PASS', 'Pass'), ('FAIL', 'Fail')], 
        null=True, 
        blank=True
    )
    notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shipment', 'inspection_type']),
            models.Index(fields=['inspector', 'created_at']),
        ]

    def __str__(self):
        return f"{self.get_inspection_type_display()} - {self.shipment.tracking_number}"

    @property
    def duration_minutes(self):
        """Calculate inspection duration in minutes"""
        if self.completed_at and self.started_at:
            delta = self.completed_at - self.started_at
            return round(delta.total_seconds() / 60, 1)
        return None

    @property
    def passed_items_count(self):
        """Count of inspection items that passed"""
        return self.items.filter(result='PASS').count()

    @property
    def failed_items_count(self):
        """Count of inspection items that failed"""
        return self.items.filter(result='FAIL').count()

    @property
    def total_photos_count(self):
        """Total number of photos across all inspection items"""
        return sum(item.photos.count() for item in self.items.all())


class InspectionItem(models.Model):
    """
    Individual inspection checklist items
    """
    RESULT_CHOICES = [
        ('PASS', 'Pass'),
        ('FAIL', 'Fail'),
        ('N/A', 'Not Applicable'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.ForeignKey(
        Inspection, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    
    # Checklist item details
    description = models.CharField(max_length=255)
    category = models.CharField(max_length=50, blank=True)  # e.g., 'VEHICLE', 'CARGO', 'DOCUMENTATION'
    is_mandatory = models.BooleanField(default=True)
    
    # Results
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, null=True, blank=True)
    notes = models.TextField(blank=True)
    corrective_action = models.TextField(blank=True)
    
    # Timing
    checked_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['inspection', 'category']),
            models.Index(fields=['result']),
        ]

    def __str__(self):
        return f"{self.description} - {self.result or 'Pending'}"

    @property
    def has_photos(self):
        """Check if this item has associated photos"""
        return self.photos.exists()


class InspectionPhoto(models.Model):
    """
    Photos associated with inspection items
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection_item = models.ForeignKey(
        InspectionItem, 
        on_delete=models.CASCADE, 
        related_name='photos'
    )
    
    # File storage
    image_url = models.URLField(max_length=500)  # Azure Blob Storage URL
    thumbnail_url = models.URLField(max_length=500, blank=True)
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Size in bytes
    
    # Metadata
    caption = models.CharField(max_length=255, blank=True)
    taken_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        ordering = ['taken_at']

    def __str__(self):
        return f"Photo for {self.inspection_item.description}"

    @property
    def file_size_mb(self):
        """File size in megabytes"""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return None


# Predefined inspection checklists
class InspectionTemplate(models.Model):
    """
    Template for standard inspection checklists
    """
    name = models.CharField(max_length=100)
    inspection_type = models.CharField(max_length=20, choices=Inspection.INSPECTION_TYPES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['inspection_type', 'name']

    def __str__(self):
        return f"{self.get_inspection_type_display()} - {self.name}"


class InspectionTemplateItem(models.Model):
    """
    Individual items within an inspection template
    """
    template = models.ForeignKey(
        InspectionTemplate, 
        on_delete=models.CASCADE, 
        related_name='template_items'
    )
    description = models.CharField(max_length=255)
    category = models.CharField(max_length=50, blank=True)
    is_mandatory = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    help_text = models.TextField(blank=True)

    class Meta:
        ordering = ['order', 'description']

    def __str__(self):
        return self.description