from django.db import models
from django.contrib.auth import get_user_model
# from django.contrib.gis.db import models as gis_models  # Temporarily disabled for setup
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
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
    address = models.TextField(blank=True, help_text="Full address of incident location")
    coordinates = models.JSONField(null=True, blank=True)  # {lat, lng}
    # Location coordinates (temporarily using regular fields)
    location_lat = models.FloatField(null=True, blank=True, help_text="Latitude of incident location")
    location_lng = models.FloatField(null=True, blank=True, help_text="Longitude of incident location")
    occurred_at = models.DateTimeField()
    reported_at = models.DateTimeField(default=timezone.now)
    
    # Company and organization
    company = models.ForeignKey(
        'companies.Company', 
        on_delete=models.CASCADE, 
        related_name='incidents',
        help_text="Company that owns this incident"
    )
    
    # People involved
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_incidents')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    witnesses = models.ManyToManyField(User, blank=True, related_name='witnessed_incidents')
    # Investigation team
    investigators = models.ManyToManyField(
        User, 
        blank=True, 
        related_name='investigating_incidents',
        help_text="Team members investigating this incident"
    )
    
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
    
    # Dangerous goods involved
    dangerous_goods_involved = models.ManyToManyField(
        'dangerous_goods.DangerousGood',
        through='IncidentDangerousGood',
        blank=True,
        related_name='incidents',
        help_text="Dangerous goods involved in this incident"
    )
    
    # Regulatory compliance
    authority_notified = models.BooleanField(
        default=False,
        help_text="Whether regulatory authorities have been notified"
    )
    authority_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference number from regulatory authority"
    )
    regulatory_deadline = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Deadline for regulatory reporting or response"
    )
    
    # Investigation details
    root_cause = models.TextField(
        blank=True,
        help_text="Identified root cause of the incident"
    )
    contributing_factors = models.JSONField(
        default=list,
        help_text="List of contributing factors"
    )
    
    # Emergency response
    emergency_services_called = models.BooleanField(
        default=False,
        help_text="Whether emergency services were called"
    )
    emergency_response_time = models.DurationField(
        null=True,
        blank=True,
        help_text="Time taken for emergency services to respond"
    )
    
    # Compliance and quality
    safety_officer_notified = models.BooleanField(
        default=False,
        help_text="Whether safety officer was notified"
    )
    quality_impact = models.CharField(
        max_length=50,
        choices=[
            ('none', 'No Impact'),
            ('minor', 'Minor Impact'),
            ('moderate', 'Moderate Impact'),
            ('major', 'Major Impact'),
            ('severe', 'Severe Impact'),
        ],
        default='none',
        help_text="Impact on product/service quality"
    )
    
    # Weather and conditions at time of incident 
    weather_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Weather conditions at time of incident"
    )
    
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
            models.Index(fields=['company']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['reporter']),
            models.Index(fields=['authority_notified']),
            models.Index(fields=['emergency_services_called']),
            # Spatial index for location queries
            # Note: PostGIS spatial indexes are created automatically
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
    
    def get_severity_display(self):
        """Get display name for incident severity based on priority and type"""
        if self.priority == 'critical':
            return 'Critical'
        elif self.priority == 'high':
            return 'High'
        elif self.priority == 'medium':
            return 'Medium'
        else:
            return 'Low'
    
    def get_duration_open(self):
        """Get how long the incident has been open"""
        if self.status == 'closed' and self.closed_at:
            return self.closed_at - self.reported_at
        else:
            return timezone.now() - self.reported_at
    
    def requires_regulatory_notification(self):
        """Check if incident requires regulatory notification"""
        # Critical incidents always require notification
        if self.priority == 'critical':
            return True
        
        # Environmental impact requires notification
        if self.environmental_impact:
            return True
        
        # Injuries require notification
        if self.injuries_count > 0:
            return True
        
        # High-value property damage requires notification
        if self.property_damage_estimate and self.property_damage_estimate > 10000:
            return True
        
        return False
    
    def is_overdue(self):
        """Check if incident response is overdue"""
        # Critical incidents - 4 hours
        if self.priority == 'critical':
            return timezone.now() > self.reported_at + timezone.timedelta(hours=4)
        
        # High priority - 24 hours
        if self.priority == 'high':
            return timezone.now() > self.reported_at + timezone.timedelta(hours=24)
        
        # Medium/Low priority - 72 hours
        return timezone.now() > self.reported_at + timezone.timedelta(hours=72)


class IncidentDangerousGood(models.Model):
    """Through model for dangerous goods involved in incidents"""
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    dangerous_good = models.ForeignKey('dangerous_goods.DangerousGood', on_delete=models.CASCADE)
    quantity_involved = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text="Quantity of dangerous good involved in incident"
    )
    quantity_unit = models.CharField(
        max_length=20,
        default='kg',
        help_text="Unit of measurement for quantity"
    )
    packaging_type = models.CharField(
        max_length=100,
        blank=True,
        help_text="Type of packaging involved"
    )
    release_amount = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Amount released during incident"
    )
    containment_status = models.CharField(
        max_length=50,
        choices=[
            ('contained', 'Fully Contained'),
            ('partial', 'Partially Contained'),
            ('released', 'Released to Environment'),
            ('unknown', 'Unknown'),
        ],
        default='unknown',
        help_text="Containment status of the dangerous good"
    )
    
    class Meta:
        unique_together = ['incident', 'dangerous_good']
    
    def __str__(self):
        return f"{self.incident.incident_number} - {self.dangerous_good.un_number}"


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