# compliance/models.py

"""
Real-time Compliance Monitoring with GPS-based verification for ADG dangerous goods transport.

This module provides comprehensive monitoring of dangerous goods transport compliance
including GPS-based route verification, real-time status monitoring, automated alerts,
and regulatory compliance validation according to ADG Code 7.9.
"""

import uuid
from typing import Dict, List, Optional
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model

from vehicles.models import Vehicle
from shipments.models import Shipment
from dangerous_goods.models import DangerousGood

User = get_user_model()


class ComplianceZone(models.Model):
    """Defined compliance zones with specific restrictions for dangerous goods transport"""
    
    class ZoneType(models.TextChoices):
        RESTRICTED = 'RESTRICTED', 'Restricted Area'
        PROHIBITED = 'PROHIBITED', 'Prohibited Area'
        SPECIAL_ROUTE = 'SPECIAL_ROUTE', 'Special Route Required'
        SCHOOL_ZONE = 'SCHOOL_ZONE', 'School Zone'
        RESIDENTIAL = 'RESIDENTIAL', 'Residential Area'
        INDUSTRIAL = 'INDUSTRIAL', 'Industrial Area'
        TUNNEL = 'TUNNEL', 'Tunnel Restriction'
        BRIDGE = 'BRIDGE', 'Bridge Restriction'
        EMERGENCY_SERVICES = 'EMERGENCY_SERVICES', 'Emergency Services Area'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, help_text="Zone name or identifier")
    zone_type = models.CharField(max_length=20, choices=ZoneType.choices)
    
    # Geographic boundary
    boundary = gis_models.PolygonField(
        geography=True,
        help_text="Geographic boundary of the compliance zone"
    )
    
    # Restrictions
    restricted_hazard_classes = models.JSONField(
        default=list,
        help_text="List of dangerous goods classes restricted in this zone"
    )
    
    prohibited_hazard_classes = models.JSONField(
        default=list,
        help_text="List of dangerous goods classes completely prohibited"
    )
    
    # Time-based restrictions
    time_restrictions = models.JSONField(
        default=dict,
        help_text="Time-based restrictions (hours, days, etc.)"
    )
    
    # Speed and route requirements
    max_speed_kmh = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum speed allowed in this zone"
    )
    
    requires_escort = models.BooleanField(
        default=False,
        help_text="Whether escort vehicle is required"
    )
    
    requires_notification = models.BooleanField(
        default=False,
        help_text="Whether authorities must be notified"
    )
    
    # Regulatory information
    regulatory_authority = models.CharField(
        max_length=100,
        blank=True,
        help_text="Authority that enforces this zone"
    )
    
    regulatory_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Regulation or law reference"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Detailed description of restrictions and requirements"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Compliance Zone"
        verbose_name_plural = "Compliance Zones"
        indexes = [
            models.Index(fields=['zone_type', 'is_active']),
            models.Index(fields=['regulatory_authority']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_zone_type_display()})"
    
    def is_hazard_class_allowed(self, hazard_class: str) -> bool:
        """Check if a hazard class is allowed in this zone"""
        if hazard_class in self.prohibited_hazard_classes:
            return False
        
        if self.restricted_hazard_classes and hazard_class in self.restricted_hazard_classes:
            # Check time restrictions
            if self.time_restrictions:
                current_time = timezone.now()
                # Add time restriction logic here
                pass
        
        return True


class ComplianceMonitoringSession(models.Model):
    """Real-time monitoring session for a dangerous goods shipment"""
    
    class SessionStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active Monitoring'
        PAUSED = 'PAUSED', 'Paused'
        COMPLETED = 'COMPLETED', 'Completed'
        TERMINATED = 'TERMINATED', 'Terminated'
        INCIDENT = 'INCIDENT', 'Incident Detected'
    
    class ComplianceLevel(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'Fully Compliant'
        WARNING = 'WARNING', 'Warning Level'
        VIOLATION = 'VIOLATION', 'Violation Detected'
        CRITICAL = 'CRITICAL', 'Critical Violation'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name='monitoring_sessions'
    )
    
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='monitoring_sessions'
    )
    
    driver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='monitored_sessions',
        limit_choices_to={'role': 'DRIVER'}
    )
    
    # Session details
    session_status = models.CharField(
        max_length=15,
        choices=SessionStatus.choices,
        default=SessionStatus.ACTIVE
    )
    
    compliance_level = models.CharField(
        max_length=15,
        choices=ComplianceLevel.choices,
        default=ComplianceLevel.COMPLIANT
    )
    
    # Route and GPS tracking
    planned_route = gis_models.LineStringField(
        geography=True,
        null=True,
        blank=True,
        help_text="Planned route for the shipment"
    )
    
    actual_route = gis_models.LineStringField(
        geography=True,
        null=True,
        blank=True,
        help_text="Actual GPS-tracked route"
    )
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    scheduled_completion = models.DateTimeField(
        null=True,
        blank=True
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Compliance metrics
    total_violations = models.IntegerField(default=0)
    total_warnings = models.IntegerField(default=0)
    compliance_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Dangerous goods being monitored
    monitored_hazard_classes = models.JSONField(
        default=list,
        help_text="List of hazard classes being monitored"
    )
    
    # Last known status
    last_gps_update = models.DateTimeField(null=True, blank=True)
    last_known_location = gis_models.PointField(
        geography=True,
        null=True,
        blank=True
    )
    
    current_speed_kmh = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Alerts and notifications
    alert_count = models.IntegerField(default=0)
    last_alert_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Compliance Monitoring Session"
        verbose_name_plural = "Compliance Monitoring Sessions"
        indexes = [
            models.Index(fields=['session_status', 'compliance_level']),
            models.Index(fields=['started_at', 'completed_at']),
            models.Index(fields=['shipment', 'vehicle']),
        ]
    
    def __str__(self):
        return f"Monitoring {self.shipment.tracking_number} - {self.get_compliance_level_display()}"
    
    def update_compliance_score(self):
        """Calculate and update compliance score based on violations and warnings"""
        base_score = 100.0
        
        # Deduct points for violations and warnings
        violation_penalty = self.total_violations * 10  # 10 points per violation
        warning_penalty = self.total_warnings * 2      # 2 points per warning
        
        self.compliance_score = max(0, base_score - violation_penalty - warning_penalty)
        
        # Update compliance level based on score
        if self.compliance_score >= 95:
            self.compliance_level = self.ComplianceLevel.COMPLIANT
        elif self.compliance_score >= 80:
            self.compliance_level = self.ComplianceLevel.WARNING
        elif self.compliance_score >= 60:
            self.compliance_level = self.ComplianceLevel.VIOLATION
        else:
            self.compliance_level = self.ComplianceLevel.CRITICAL
        
        self.save(update_fields=['compliance_score', 'compliance_level', 'updated_at'])


class ComplianceEvent(models.Model):
    """Individual compliance events detected during monitoring"""
    
    class EventType(models.TextChoices):
        GPS_UPDATE = 'GPS_UPDATE', 'GPS Location Update'
        SPEED_VIOLATION = 'SPEED_VIOLATION', 'Speed Limit Violation'
        ZONE_VIOLATION = 'ZONE_VIOLATION', 'Restricted Zone Entry'
        ROUTE_DEVIATION = 'ROUTE_DEVIATION', 'Route Deviation'
        DRIVER_ALERT = 'DRIVER_ALERT', 'Driver Alert/Notification'
        SYSTEM_ALERT = 'SYSTEM_ALERT', 'System Generated Alert'
        MANUAL_OVERRIDE = 'MANUAL_OVERRIDE', 'Manual Override'
        INCIDENT_REPORT = 'INCIDENT_REPORT', 'Incident Reported'
        CHECKPOINT = 'CHECKPOINT', 'Checkpoint Reached'
        EMERGENCY_STOP = 'EMERGENCY_STOP', 'Emergency Stop'
    
    class Severity(models.TextChoices):
        INFO = 'INFO', 'Information'
        WARNING = 'WARNING', 'Warning'
        VIOLATION = 'VIOLATION', 'Violation'
        CRITICAL = 'CRITICAL', 'Critical'
        EMERGENCY = 'EMERGENCY', 'Emergency'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    monitoring_session = models.ForeignKey(
        ComplianceMonitoringSession,
        on_delete=models.CASCADE,
        related_name='events'
    )
    
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    severity = models.CharField(max_length=15, choices=Severity.choices)
    
    # Location and timing
    location = gis_models.PointField(
        geography=True,
        null=True,
        blank=True,
        help_text="GPS location where event occurred"
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Event details
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Related compliance zone (if applicable)
    compliance_zone = models.ForeignKey(
        ComplianceZone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events'
    )
    
    # Event data
    event_data = models.JSONField(
        default=dict,
        help_text="Additional event-specific data (speed, coordinates, etc.)"
    )
    
    # Response and resolution
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_events'
    )
    
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_events'
    )
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    # Automated response
    automated_action_taken = models.BooleanField(default=False)
    automated_action_details = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Compliance Event"
        verbose_name_plural = "Compliance Events"
        indexes = [
            models.Index(fields=['monitoring_session', 'timestamp']),
            models.Index(fields=['event_type', 'severity']),
            models.Index(fields=['acknowledged_at', 'resolved_at']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.get_severity_display()}"
    
    def acknowledge(self, user: User, notes: str = ""):
        """Acknowledge the event"""
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        if notes:
            self.resolution_notes = notes
        self.save(update_fields=['acknowledged_by', 'acknowledged_at', 'resolution_notes'])
    
    def resolve(self, user: User, notes: str):
        """Resolve the event"""
        self.resolved_by = user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save(update_fields=['resolved_by', 'resolved_at', 'resolution_notes'])


class ComplianceAlert(models.Model):
    """Alert notifications for compliance violations and incidents"""
    
    class AlertType(models.TextChoices):
        EMAIL = 'EMAIL', 'Email Alert'
        SMS = 'SMS', 'SMS Alert'
        PUSH = 'PUSH', 'Push Notification'
        WEBHOOK = 'WEBHOOK', 'Webhook Call'
        DASHBOARD = 'DASHBOARD', 'Dashboard Alert'
    
    class AlertStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SENT = 'SENT', 'Sent'
        DELIVERED = 'DELIVERED', 'Delivered'
        FAILED = 'FAILED', 'Failed'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    compliance_event = models.ForeignKey(
        ComplianceEvent,
        on_delete=models.CASCADE,
        related_name='alerts'
    )
    
    alert_type = models.CharField(max_length=15, choices=AlertType.choices)
    status = models.CharField(max_length=15, choices=AlertStatus.choices, default=AlertStatus.PENDING)
    
    # Recipients
    recipient_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    recipient_email = models.EmailField(blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    
    # Alert content
    subject = models.CharField(max_length=200)
    message = models.TextField()
    
    # Delivery tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    # Retry logic
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    # Response tracking
    response_data = models.JSONField(
        default=dict,
        help_text="Response data from delivery service"
    )
    
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Compliance Alert"
        verbose_name_plural = "Compliance Alerts"
        indexes = [
            models.Index(fields=['status', 'alert_type']),
            models.Index(fields=['sent_at', 'delivered_at']),
            models.Index(fields=['compliance_event']),
        ]
    
    def __str__(self):
        return f"{self.get_alert_type_display()} - {self.subject}"
    
    def mark_sent(self):
        """Mark alert as sent"""
        self.status = self.AlertStatus.SENT
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at', 'updated_at'])
    
    def mark_delivered(self):
        """Mark alert as delivered"""
        self.status = self.AlertStatus.DELIVERED
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at', 'updated_at'])
    
    def mark_failed(self, error_msg: str):
        """Mark alert as failed"""
        self.status = self.AlertStatus.FAILED
        self.error_message = error_msg
        self.retry_count += 1
        self.save(update_fields=['status', 'error_message', 'retry_count', 'updated_at'])


class ComplianceReport(models.Model):
    """Compliance reporting and analytics"""
    
    class ReportType(models.TextChoices):
        DAILY = 'DAILY', 'Daily Report'
        WEEKLY = 'WEEKLY', 'Weekly Report'
        MONTHLY = 'MONTHLY', 'Monthly Report'
        INCIDENT = 'INCIDENT', 'Incident Report'
        CUSTOM = 'CUSTOM', 'Custom Report'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    report_type = models.CharField(max_length=15, choices=ReportType.choices)
    title = models.CharField(max_length=200)
    
    # Report period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Report data
    total_sessions = models.IntegerField(default=0)
    total_events = models.IntegerField(default=0)
    total_violations = models.IntegerField(default=0)
    total_warnings = models.IntegerField(default=0)
    
    average_compliance_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00
    )
    
    # Detailed analytics
    analytics_data = models.JSONField(
        default=dict,
        help_text="Detailed analytics and metrics"
    )
    
    # Report generation
    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    generated_at = models.DateTimeField(auto_now_add=True)
    
    # File attachments
    report_file = models.FileField(
        upload_to='compliance_reports/',
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = "Compliance Report"
        verbose_name_plural = "Compliance Reports"
        indexes = [
            models.Index(fields=['report_type', 'period_start']),
            models.Index(fields=['generated_at']),
        ]
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"{self.title} ({self.period_start.date()} - {self.period_end.date()})"