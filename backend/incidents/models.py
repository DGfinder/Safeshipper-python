from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class IncidentType(models.Model):
    """Types of incidents that can occur"""
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    category = models.CharField(max_length=50)  # e.g., 'hazmat', 'vehicle', 'personnel'
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class Incident(models.Model):
    """Safety incident tracking"""
    STATUS_CHOICES = [
        ('reported', 'Reported'),
        ('investigating', 'Under Investigation'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    incident_type = models.ForeignKey(IncidentType, on_delete=models.CASCADE)
    
    # Location and timing
    location = models.CharField(max_length=200)
    coordinates = models.JSONField(null=True, blank=True)  # {lat, lng}
    occurred_at = models.DateTimeField()
    reported_at = models.DateTimeField(default=timezone.now)
    
    # People involved
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_incidents')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    witnesses = models.ManyToManyField(User, blank=True, related_name='witnessed_incidents')
    
    # Status and priority
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='reported')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Impact assessment
    injuries_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    property_damage_estimate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    environmental_impact = models.BooleanField(default=False)
    
    # Resolution
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # Related entities
    shipment = models.ForeignKey('shipments.Shipment', on_delete=models.SET_NULL, null=True, blank=True)
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-occurred_at']
        indexes = [
            models.Index(fields=['incident_number']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['occurred_at']),
        ]
    
    def __str__(self):
        return f"{self.incident_number} - {self.title}"
    
    def save(self, *args, **kwargs):
        if not self.incident_number:
            # Generate incident number: INC-YYYY-NNNN
            year = timezone.now().year
            last_incident = Incident.objects.filter(
                incident_number__startswith=f'INC-{year}-'
            ).order_by('-incident_number').first()
            
            if last_incident:
                last_number = int(last_incident.incident_number.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1
            
            self.incident_number = f'INC-{year}-{new_number:04d}'
        
        super().save(*args, **kwargs)


class IncidentDocument(models.Model):
    """Documents related to incidents"""
    DOCUMENT_TYPES = [
        ('photo', 'Photo'),
        ('report', 'Report'),
        ('witness_statement', 'Witness Statement'),
        ('insurance_claim', 'Insurance Claim'),
        ('corrective_action', 'Corrective Action Plan'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='incident_documents/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.incident.incident_number} - {self.title}"


class IncidentUpdate(models.Model):
    """Timeline of incident updates"""
    UPDATE_TYPES = [
        ('status_change', 'Status Change'),
        ('assignment', 'Assignment'),
        ('investigation', 'Investigation Note'),
        ('resolution', 'Resolution'),
        ('closure', 'Closure'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='updates')
    update_type = models.CharField(max_length=50, choices=UPDATE_TYPES)
    description = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.incident.incident_number} - {self.update_type}"


class CorrectiveAction(models.Model):
    """Corrective actions to prevent incident recurrence"""
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='corrective_actions')
    title = models.CharField(max_length=200)
    description = models.TextField()
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_corrective_actions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    due_date = models.DateField()
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['due_date']
    
    def __str__(self):
        return f"{self.incident.incident_number} - {self.title}"