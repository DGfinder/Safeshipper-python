# emergency_procedures/models.py
import uuid
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

class EmergencyType(models.TextChoices):
    """Types of emergencies that can occur during dangerous goods transport"""
    SPILL = 'SPILL', _('Chemical Spill')
    FIRE = 'FIRE', _('Fire/Explosion')
    LEAK = 'LEAK', _('Container Leak')
    ACCIDENT = 'ACCIDENT', _('Vehicle Accident')
    HEALTH = 'HEALTH', _('Health Emergency')
    SECURITY = 'SECURITY', _('Security Incident')
    ENVIRONMENTAL = 'ENVIRONMENTAL', _('Environmental Hazard')
    EQUIPMENT = 'EQUIPMENT', _('Equipment Failure')
    WEATHER = 'WEATHER', _('Weather Emergency')
    OTHER = 'OTHER', _('Other Emergency')

class EmergencyStatus(models.TextChoices):
    """Status of emergency procedures"""
    ACTIVE = 'ACTIVE', _('Active')
    RESOLVED = 'RESOLVED', _('Resolved')
    UNDER_REVIEW = 'UNDER_REVIEW', _('Under Review')
    ARCHIVED = 'ARCHIVED', _('Archived')

class EmergencyProcedure(models.Model):
    """
    Emergency response procedures for different types of dangerous goods incidents.
    Based on ADG (Australian Dangerous Goods) Code emergency response requirements.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    title = models.CharField(
        _("Procedure Title"),
        max_length=255,
        help_text=_("Clear, descriptive title for the emergency procedure")
    )
    emergency_type = models.CharField(
        _("Emergency Type"),
        max_length=20,
        choices=EmergencyType.choices,
        db_index=True
    )
    procedure_code = models.CharField(
        _("Procedure Code"),
        max_length=20,
        unique=True,
        help_text=_("Unique code for this procedure (e.g., EP-SPILL-001)")
    )
    
    # Hazard Class Associations
    applicable_hazard_classes = models.JSONField(
        _("Applicable Hazard Classes"),
        default=list,
        help_text=_("List of dangerous goods hazard classes this procedure applies to")
    )
    specific_un_numbers = models.JSONField(
        _("Specific UN Numbers"),
        default=list,
        blank=True,
        help_text=_("Specific UN numbers this procedure is designed for (optional)")
    )
    
    # Procedure Content
    immediate_actions = models.TextField(
        _("Immediate Actions"),
        help_text=_("First steps to take immediately when emergency occurs")
    )
    safety_precautions = models.TextField(
        _("Safety Precautions"),
        help_text=_("Safety measures to protect personnel and public")
    )
    containment_procedures = models.TextField(
        _("Containment Procedures"),
        help_text=_("Steps to contain the emergency and prevent spread")
    )
    cleanup_procedures = models.TextField(
        _("Cleanup Procedures"),
        help_text=_("Detailed cleanup and decontamination procedures")
    )
    
    # Contact Information
    emergency_contacts = models.JSONField(
        _("Emergency Contacts"),
        default=dict,
        help_text=_("Emergency contact numbers and notification procedures")
    )
    
    # Regulatory Information
    regulatory_references = models.TextField(
        _("Regulatory References"),
        blank=True,
        help_text=_("Relevant ADG, UN, or other regulatory references")
    )
    
    # Equipment and Materials
    required_equipment = models.JSONField(
        _("Required Equipment"),
        default=list,
        help_text=_("List of equipment and materials needed for this procedure")
    )
    
    # Training Requirements
    training_requirements = models.TextField(
        _("Training Requirements"),
        blank=True,
        help_text=_("Required training for personnel executing this procedure")
    )
    
    # Environmental Considerations
    environmental_impact = models.TextField(
        _("Environmental Impact Assessment"),
        blank=True,
        help_text=_("Potential environmental impacts and mitigation measures")
    )
    
    # Documentation Requirements
    reporting_requirements = models.TextField(
        _("Reporting Requirements"),
        blank=True,
        help_text=_("Required reports and documentation after emergency")
    )
    
    # Procedure Metadata
    severity_level = models.CharField(
        _("Severity Level"),
        max_length=20,
        choices=[
            ('LOW', _('Low')),
            ('MEDIUM', _('Medium')),
            ('HIGH', _('High')),
            ('CRITICAL', _('Critical')),
        ],
        default='MEDIUM'
    )
    
    response_time_minutes = models.PositiveIntegerField(
        _("Expected Response Time (minutes)"),
        validators=[MinValueValidator(1), MaxValueValidator(480)],
        help_text=_("Expected time to initiate response procedures")
    )
    
    # Version Control
    version = models.CharField(
        _("Version"),
        max_length=10,
        default="1.0",
        help_text=_("Version number of this procedure")
    )
    effective_date = models.DateField(
        _("Effective Date"),
        default=timezone.now,
        help_text=_("Date when this procedure becomes effective")
    )
    review_date = models.DateField(
        _("Next Review Date"),
        help_text=_("Date when this procedure should be reviewed")
    )
    
    # Status and Approval
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=EmergencyStatus.choices,
        default=EmergencyStatus.ACTIVE,
        db_index=True
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='approved_emergency_procedures',
        null=True,
        blank=True,
        verbose_name=_("Approved By")
    )
    approval_date = models.DateTimeField(
        _("Approval Date"),
        null=True,
        blank=True
    )
    
    # Audit Trail
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='created_emergency_procedures',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Emergency Procedure")
        verbose_name_plural = _("Emergency Procedures")
        indexes = [
            models.Index(fields=['emergency_type', 'status']),
            models.Index(fields=['severity_level', 'response_time_minutes']),
            models.Index(fields=['effective_date', 'review_date']),
            models.Index(fields=['status', 'approval_date']),
        ]
        ordering = ['emergency_type', 'severity_level', 'procedure_code']
    
    def __str__(self):
        return f"{self.procedure_code}: {self.title}"
    
    @property
    def is_current(self) -> bool:
        """Check if procedure is current and effective"""
        return (
            self.status == EmergencyStatus.ACTIVE and
            self.effective_date <= timezone.now().date() and
            (not self.review_date or self.review_date >= timezone.now().date())
        )
    
    @property
    def needs_review(self) -> bool:
        """Check if procedure needs review"""
        return self.review_date and self.review_date <= timezone.now().date()
    
    @property
    def days_until_review(self) -> int:
        """Calculate days until next review"""
        if not self.review_date:
            return 365  # Default if no review date set
        delta = self.review_date - timezone.now().date()
        return max(0, delta.days)

class EmergencyIncident(models.Model):
    """
    Records of actual emergency incidents and the procedures used to respond.
    Used for tracking effectiveness and continuous improvement.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Incident Information
    incident_number = models.CharField(
        _("Incident Number"),
        max_length=50,
        unique=True,
        help_text=_("Unique incident tracking number")
    )
    emergency_type = models.CharField(
        _("Emergency Type"),
        max_length=20,
        choices=EmergencyType.choices
    )
    
    # Related Records
    procedure_used = models.ForeignKey(
        EmergencyProcedure,
        on_delete=models.SET_NULL,
        related_name='incidents',
        null=True,
        blank=True,
        verbose_name=_("Emergency Procedure Used")
    )
    
    # Incident Details
    description = models.TextField(
        _("Incident Description"),
        help_text=_("Detailed description of what happened")
    )
    location = models.CharField(
        _("Location"),
        max_length=255,
        help_text=_("Where the incident occurred")
    )
    coordinates = gis_models.PointField(
        _("GPS Coordinates"),
        null=True,
        blank=True,
        help_text=_("Exact GPS coordinates of incident location")
    )
    
    # Timing
    reported_at = models.DateTimeField(
        _("Reported At"),
        help_text=_("When the incident was first reported")
    )
    response_started_at = models.DateTimeField(
        _("Response Started At"),
        null=True,
        blank=True,
        help_text=_("When emergency response procedures were initiated")
    )
    resolved_at = models.DateTimeField(
        _("Resolved At"),
        null=True,
        blank=True,
        help_text=_("When the incident was fully resolved")
    )
    
    # Severity and Impact
    severity_level = models.CharField(
        _("Actual Severity"),
        max_length=20,
        choices=[
            ('LOW', _('Low')),
            ('MEDIUM', _('Medium')),
            ('HIGH', _('High')),
            ('CRITICAL', _('Critical')),
        ]
    )
    
    # Dangerous Goods Information
    dangerous_goods_involved = models.JSONField(
        _("Dangerous Goods Involved"),
        default=list,
        help_text=_("List of dangerous goods involved in the incident")
    )
    quantities_involved = models.JSONField(
        _("Quantities Involved"),
        default=dict,
        help_text=_("Quantities of dangerous goods involved")
    )
    
    # Response Information
    responding_personnel = models.JSONField(
        _("Responding Personnel"),
        default=list,
        help_text=_("List of personnel who responded to the incident")
    )
    equipment_used = models.JSONField(
        _("Equipment Used"),
        default=list,
        help_text=_("Equipment and materials used in response")
    )
    external_agencies = models.JSONField(
        _("External Agencies"),
        default=list,
        help_text=_("External agencies involved (fire dept, police, etc.)")
    )
    
    # Outcomes and Lessons Learned
    casualties = models.PositiveIntegerField(
        _("Casualties"),
        default=0,
        help_text=_("Number of people injured or affected")
    )
    property_damage = models.DecimalField(
        _("Property Damage (AUD)"),
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Estimated property damage in Australian dollars")
    )
    environmental_impact = models.TextField(
        _("Environmental Impact"),
        blank=True,
        help_text=_("Description of environmental impact")
    )
    
    # Post-Incident Analysis
    procedure_effectiveness = models.CharField(
        _("Procedure Effectiveness"),
        max_length=20,
        choices=[
            ('EXCELLENT', _('Excellent')),
            ('GOOD', _('Good')),
            ('FAIR', _('Fair')),
            ('POOR', _('Poor')),
        ],
        null=True,
        blank=True
    )
    lessons_learned = models.TextField(
        _("Lessons Learned"),
        blank=True,
        help_text=_("Key lessons learned from this incident")
    )
    improvements_recommended = models.TextField(
        _("Improvements Recommended"),
        blank=True,
        help_text=_("Recommended improvements to procedures or training")
    )
    
    # Status and Closure
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=[
            ('OPEN', _('Open')),
            ('INVESTIGATING', _('Under Investigation')),
            ('RESOLVED', _('Resolved')),
            ('CLOSED', _('Closed')),
        ],
        default='OPEN',
        db_index=True
    )
    
    # Audit Trail
    reported_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='reported_incidents',
        null=True,
        blank=True,
        verbose_name=_("Reported By")
    )
    incident_commander = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='commanded_incidents',
        null=True,
        blank=True,
        verbose_name=_("Incident Commander")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Emergency Incident")
        verbose_name_plural = _("Emergency Incidents")
        indexes = [
            models.Index(fields=['emergency_type', 'severity_level']),
            models.Index(fields=['reported_at', 'status']),
            models.Index(fields=['procedure_used', 'procedure_effectiveness']),
            models.Index(fields=['location', 'reported_at']),
        ]
        ordering = ['-reported_at']
    
    def __str__(self):
        return f"{self.incident_number}: {self.get_emergency_type_display()}"
    
    @property
    def response_time_minutes(self) -> int:
        """Calculate actual response time in minutes"""
        if self.response_started_at and self.reported_at:
            delta = self.response_started_at - self.reported_at
            return int(delta.total_seconds() / 60)
        return 0
    
    @property
    def resolution_time_hours(self) -> float:
        """Calculate time to resolution in hours"""
        if self.resolved_at and self.reported_at:
            delta = self.resolved_at - self.reported_at
            return round(delta.total_seconds() / 3600, 2)
        return 0.0

class EmergencyContact(models.Model):
    """
    Emergency contact information for different types of incidents and locations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Contact Information
    organization_name = models.CharField(
        _("Organization Name"),
        max_length=255,
        help_text=_("Name of the emergency response organization")
    )
    contact_type = models.CharField(
        _("Contact Type"),
        max_length=20,
        choices=[
            ('FIRE', _('Fire Department')),
            ('POLICE', _('Police')),
            ('AMBULANCE', _('Ambulance/Medical')),
            ('HAZMAT', _('Hazmat Team')),
            ('POISON', _('Poison Control')),
            ('SPILL', _('Spill Response')),
            ('CLEANUP', _('Cleanup Contractor')),
            ('REGULATORY', _('Regulatory Authority')),
            ('COMPANY', _('Company Emergency')),
            ('OTHER', _('Other')),
        ]
    )
    
    # Phone Numbers
    primary_phone = models.CharField(
        _("Primary Phone"),
        max_length=20,
        help_text=_("Primary emergency contact number")
    )
    secondary_phone = models.CharField(
        _("Secondary Phone"),
        max_length=20,
        blank=True,
        help_text=_("Secondary emergency contact number")
    )
    
    # Service Area
    service_area = models.CharField(
        _("Service Area"),
        max_length=255,
        help_text=_("Geographic area this contact serves")
    )
    coordinates = gis_models.PointField(
        _("Location"),
        null=True,
        blank=True,
        help_text=_("Location of emergency response facility")
    )
    
    # Capabilities
    capabilities = models.JSONField(
        _("Capabilities"),
        default=list,
        help_text=_("List of response capabilities")
    )
    available_24_7 = models.BooleanField(
        _("Available 24/7"),
        default=True,
        help_text=_("Whether this contact is available 24 hours")
    )
    
    # Contact Details
    contact_person = models.CharField(
        _("Contact Person"),
        max_length=255,
        blank=True,
        help_text=_("Specific person to contact")
    )
    email = models.EmailField(
        _("Email"),
        blank=True,
        help_text=_("Emergency contact email")
    )
    notes = models.TextField(
        _("Notes"),
        blank=True,
        help_text=_("Additional notes about this contact")
    )
    
    # Status
    is_active = models.BooleanField(
        _("Is Active"),
        default=True,
        db_index=True
    )
    last_verified = models.DateField(
        _("Last Verified"),
        help_text=_("Date when contact information was last verified")
    )
    
    # Audit Trail
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Emergency Contact")
        verbose_name_plural = _("Emergency Contacts")
        indexes = [
            models.Index(fields=['contact_type', 'is_active']),
            models.Index(fields=['service_area', 'contact_type']),
            models.Index(fields=['available_24_7', 'last_verified']),
        ]
        ordering = ['contact_type', 'organization_name']
    
    def __str__(self):
        return f"{self.organization_name} ({self.get_contact_type_display()})"
    
    @property
    def needs_verification(self) -> bool:
        """Check if contact needs verification (older than 6 months)"""
        if not self.last_verified:
            return True
        delta = timezone.now().date() - self.last_verified
        return delta.days > 180