import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone
from dangerous_goods.models import DangerousGood
from shipments.models import Shipment

User = get_user_model()

class EPGStatus(models.TextChoices):
    """Status of EPG document"""
    ACTIVE = 'ACTIVE', _('Active')
    DRAFT = 'DRAFT', _('Draft')
    UNDER_REVIEW = 'UNDER_REVIEW', _('Under Review')
    ARCHIVED = 'ARCHIVED', _('Archived')

class EmergencyType(models.TextChoices):
    """Types of emergency scenarios"""
    FIRE = 'FIRE', _('Fire/Explosion')
    SPILL = 'SPILL', _('Spill/Leak')
    EXPOSURE = 'EXPOSURE', _('Human Exposure')
    TRANSPORT_ACCIDENT = 'TRANSPORT_ACCIDENT', _('Transport Accident')
    CONTAINER_DAMAGE = 'CONTAINER_DAMAGE', _('Container Damage')
    ENVIRONMENTAL = 'ENVIRONMENTAL', _('Environmental Release')
    MULTI_HAZARD = 'MULTI_HAZARD', _('Multiple Hazards')

class SeverityLevel(models.TextChoices):
    """Severity levels for emergency procedures"""
    LOW = 'LOW', _('Low Risk')
    MEDIUM = 'MEDIUM', _('Medium Risk')
    HIGH = 'HIGH', _('High Risk')
    CRITICAL = 'CRITICAL', _('Critical Risk')

class EmergencyProcedureGuide(models.Model):
    """
    Emergency Procedure Guide model for dangerous goods emergency response.
    Can be linked to specific dangerous goods or be generic for hazard classes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core identification
    dangerous_good = models.ForeignKey(
        DangerousGood,
        on_delete=models.CASCADE,
        related_name='emergency_guides',
        null=True,
        blank=True,
        verbose_name=_("Specific Dangerous Good"),
        help_text=_("Specific dangerous good this EPG applies to (leave blank for generic hazard class EPG)")
    )
    
    # EPG identification
    epg_number = models.CharField(
        _("EPG Number"),
        max_length=20,
        unique=True,
        help_text=_("Unique EPG identifier (e.g., EPG-001, ERG-128)")
    )
    title = models.CharField(
        _("Title"),
        max_length=255,
        help_text=_("Descriptive title for the emergency procedure")
    )
    
    # Hazard classification
    hazard_class = models.CharField(
        _("Hazard Class"),
        max_length=10,
        db_index=True,
        help_text=_("Primary hazard class this EPG covers")
    )
    subsidiary_risks = models.JSONField(
        _("Subsidiary Risks"),
        default=list,
        blank=True,
        help_text=_("Additional hazard classes covered")
    )
    
    # Emergency types covered
    emergency_types = models.JSONField(
        _("Emergency Types"),
        default=list,
        help_text=_("Types of emergencies this EPG addresses")
    )
    
    # Procedure content
    immediate_actions = models.TextField(
        _("Immediate Actions"),
        help_text=_("First response actions to take immediately")
    )
    
    personal_protection = models.TextField(
        _("Personal Protection"),
        help_text=_("Personal protective equipment and safety measures")
    )
    
    fire_procedures = models.TextField(
        _("Fire Fighting Procedures"),
        blank=True,
        help_text=_("Fire suppression and firefighting procedures")
    )
    
    spill_procedures = models.TextField(
        _("Spill Response Procedures"),
        blank=True,
        help_text=_("Spill containment and cleanup procedures")
    )
    
    medical_procedures = models.TextField(
        _("Medical Response"),
        blank=True,
        help_text=_("First aid and medical response procedures")
    )
    
    evacuation_procedures = models.TextField(
        _("Evacuation Procedures"),
        blank=True,
        help_text=_("Evacuation distances and procedures")
    )
    
    # Communication and notification
    notification_requirements = models.TextField(
        _("Notification Requirements"),
        help_text=_("Who to contact and when")
    )
    
    emergency_contacts = models.JSONField(
        _("Emergency Contacts"),
        default=dict,
        help_text=_("Emergency contact information by region/country")
    )
    
    # Isolation and public protection
    isolation_distances = models.JSONField(
        _("Isolation Distances"),
        default=dict,
        blank=True,
        help_text=_("Isolation distances for different scenarios (meters)")
    )
    
    protective_action_distances = models.JSONField(
        _("Protective Action Distances"),
        default=dict,
        blank=True,
        help_text=_("Evacuation/shelter distances for different conditions")
    )
    
    # Environmental protection
    environmental_precautions = models.TextField(
        _("Environmental Precautions"),
        blank=True,
        help_text=_("Environmental protection measures")
    )
    
    water_pollution_response = models.TextField(
        _("Water Pollution Response"),
        blank=True,
        help_text=_("Procedures for water contamination")
    )
    
    # Special considerations
    transport_specific_guidance = models.TextField(
        _("Transport-Specific Guidance"),
        blank=True,
        help_text=_("Special considerations for transport incidents")
    )
    
    weather_considerations = models.TextField(
        _("Weather Considerations"),
        blank=True,
        help_text=_("How weather affects emergency response")
    )
    
    # Metadata
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=EPGStatus.choices,
        default=EPGStatus.DRAFT,
        db_index=True
    )
    
    severity_level = models.CharField(
        _("Severity Level"),
        max_length=20,
        choices=SeverityLevel.choices,
        default=SeverityLevel.MEDIUM,
        db_index=True
    )
    
    version = models.CharField(
        _("Version"),
        max_length=20,
        default="1.0",
        help_text=_("EPG version number")
    )
    
    effective_date = models.DateField(
        _("Effective Date"),
        default=timezone.now,
        help_text=_("Date when this EPG becomes effective")
    )
    
    review_date = models.DateField(
        _("Next Review Date"),
        null=True,
        blank=True,
        help_text=_("Date for next review/update")
    )
    
    # Regulatory compliance
    regulatory_references = models.JSONField(
        _("Regulatory References"),
        default=list,
        blank=True,
        help_text=_("Regulatory standards and references")
    )
    
    country_code = models.CharField(
        _("Country Code"),
        max_length=2,
        default="US",
        help_text=_("Country-specific regulatory context")
    )
    
    # Creation tracking
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='created_epgs',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Emergency Procedure Guide")
        verbose_name_plural = _("Emergency Procedure Guides")
        indexes = [
            models.Index(fields=['hazard_class', 'status']),
            models.Index(fields=['dangerous_good', 'status']),
            models.Index(fields=['severity_level', 'effective_date']),
            models.Index(fields=['country_code', 'hazard_class']),
        ]
        ordering = ['epg_number', '-effective_date']
    
    def __str__(self):
        return f"{self.epg_number} - {self.title}"
    
    @property
    def is_active(self) -> bool:
        """Check if EPG is currently active"""
        return (
            self.status == EPGStatus.ACTIVE and 
            self.effective_date <= timezone.now().date()
        )
    
    @property
    def is_due_for_review(self) -> bool:
        """Check if EPG is due for review"""
        if not self.review_date:
            return False
        return timezone.now().date() >= self.review_date

class ShipmentEmergencyPlan(models.Model):
    """
    Generated emergency plan for a specific shipment based on its dangerous goods content.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    shipment = models.OneToOneField(
        Shipment,
        on_delete=models.CASCADE,
        related_name='emergency_plan',
        verbose_name=_("Shipment")
    )
    
    # Plan identification
    plan_number = models.CharField(
        _("Plan Number"),
        max_length=50,
        unique=True,
        help_text=_("Unique emergency plan identifier")
    )
    
    # Referenced EPGs
    referenced_epgs = models.ManyToManyField(
        EmergencyProcedureGuide,
        related_name='referenced_in_plans',
        verbose_name=_("Referenced EPGs"),
        help_text=_("EPGs used to generate this plan")
    )
    
    # Generated content
    executive_summary = models.TextField(
        _("Executive Summary"),
        help_text=_("Summary of key emergency information")
    )
    
    hazard_assessment = models.JSONField(
        _("Hazard Assessment"),
        default=dict,
        help_text=_("Assessment of all hazards in the shipment")
    )
    
    immediate_response_actions = models.TextField(
        _("Immediate Response Actions"),
        help_text=_("Consolidated immediate actions for all hazards")
    )
    
    specialized_procedures = models.JSONField(
        _("Specialized Procedures"),
        default=dict,
        help_text=_("Procedures specific to dangerous goods in shipment")
    )
    
    # Route-specific information
    route_emergency_contacts = models.JSONField(
        _("Route Emergency Contacts"),
        default=dict,
        help_text=_("Emergency contacts along the route")
    )
    
    hospital_locations = models.JSONField(
        _("Hospital Locations"),
        default=list,
        blank=True,
        help_text=_("Hospitals along the route")
    )
    
    special_considerations = models.TextField(
        _("Special Considerations"),
        blank=True,
        help_text=_("Route-specific or shipment-specific considerations")
    )
    
    # Communication plan
    notification_matrix = models.JSONField(
        _("Notification Matrix"),
        default=dict,
        help_text=_("Who to contact for different emergency types")
    )
    
    # Plan status
    status = models.CharField(
        _("Plan Status"),
        max_length=20,
        choices=[
            ('GENERATED', _('Generated')),
            ('REVIEWED', _('Reviewed')),
            ('APPROVED', _('Approved')),
            ('ACTIVE', _('Active')),
            ('EXPIRED', _('Expired')),
        ],
        default='GENERATED',
        db_index=True
    )
    
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='generated_emergency_plans',
        null=True,
        blank=True
    )
    
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='reviewed_emergency_plans',
        null=True,
        blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='approved_emergency_plans',
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = _("Shipment Emergency Plan")
        verbose_name_plural = _("Shipment Emergency Plans")
        indexes = [
            models.Index(fields=['shipment', 'status']),
            models.Index(fields=['status', 'generated_at']),
        ]
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"Emergency Plan {self.plan_number} - {self.shipment.tracking_number}"

class EmergencyIncident(models.Model):
    """
    Record of actual emergency incidents for learning and EPG improvement.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Incident identification
    incident_number = models.CharField(
        _("Incident Number"),
        max_length=50,
        unique=True
    )
    
    # Related shipment/EPG
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.SET_NULL,
        related_name='emergency_incidents',
        null=True,
        blank=True,
        verbose_name=_("Related Shipment")
    )
    
    emergency_plan = models.ForeignKey(
        ShipmentEmergencyPlan,
        on_delete=models.SET_NULL,
        related_name='incidents',
        null=True,
        blank=True,
        verbose_name=_("Emergency Plan Used")
    )
    
    # Incident details
    incident_type = models.CharField(
        _("Incident Type"),
        max_length=30,
        choices=EmergencyType.choices
    )
    
    severity = models.CharField(
        _("Actual Severity"),
        max_length=20,
        choices=SeverityLevel.choices
    )
    
    location = models.CharField(
        _("Incident Location"),
        max_length=255,
        help_text=_("Where the incident occurred")
    )
    
    incident_datetime = models.DateTimeField(
        _("Incident Date/Time"),
        help_text=_("When the incident occurred")
    )
    
    # Response and outcome
    response_actions_taken = models.TextField(
        _("Response Actions Taken"),
        help_text=_("What was actually done in response")
    )
    
    response_effectiveness = models.CharField(
        _("Response Effectiveness"),
        max_length=20,
        choices=[
            ('EXCELLENT', _('Excellent')),
            ('GOOD', _('Good')),
            ('ADEQUATE', _('Adequate')),
            ('POOR', _('Poor')),
            ('FAILED', _('Failed')),
        ]
    )
    
    lessons_learned = models.TextField(
        _("Lessons Learned"),
        blank=True,
        help_text=_("Key takeaways from the incident")
    )
    
    epg_improvements = models.TextField(
        _("Suggested EPG Improvements"),
        blank=True,
        help_text=_("How EPGs could be improved based on this incident")
    )
    
    # Reporting
    reported_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='reported_incidents',
        null=True,
        blank=True
    )
    reported_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Emergency Incident")
        verbose_name_plural = _("Emergency Incidents")
        indexes = [
            models.Index(fields=['incident_type', 'severity']),
            models.Index(fields=['incident_datetime']),
            models.Index(fields=['shipment', 'incident_type']),
        ]
        ordering = ['-incident_datetime']
    
    def __str__(self):
        return f"Incident {self.incident_number} - {self.get_incident_type_display()}"
