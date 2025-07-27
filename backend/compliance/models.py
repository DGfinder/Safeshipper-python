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
        # Emergency incident types
        EMERGENCY_FIRE = 'EMERGENCY_FIRE', 'Fire Emergency'
        EMERGENCY_SPILL = 'EMERGENCY_SPILL', 'Chemical Spill Emergency'
        EMERGENCY_ACCIDENT = 'EMERGENCY_ACCIDENT', 'Vehicle Accident Emergency'
        EMERGENCY_MEDICAL = 'EMERGENCY_MEDICAL', 'Medical Emergency'
        EMERGENCY_SECURITY = 'EMERGENCY_SECURITY', 'Security Emergency'
        EMERGENCY_MECHANICAL = 'EMERGENCY_MECHANICAL', 'Mechanical Breakdown Emergency'
        EMERGENCY_WEATHER = 'EMERGENCY_WEATHER', 'Weather-Related Emergency'
        EMERGENCY_OTHER = 'EMERGENCY_OTHER', 'Other Emergency'
        # Accident prevention
        EMERGENCY_FALSE_ALARM = 'EMERGENCY_FALSE_ALARM', 'False Emergency Alarm'
        EMERGENCY_TEST = 'EMERGENCY_TEST', 'Emergency System Test'
    
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
    
    # Emergency-specific fields
    emergency_activation_method = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('PANIC_BUTTON', 'Panic Button'),
            ('VOICE_COMMAND', 'Voice Command'),
            ('AUTO_DETECTED', 'Auto Detected'),
            ('EXTERNAL_REPORT', 'External Report'),
            ('FALSE_ALARM', 'False Alarm')
        ],
        help_text="How the emergency was activated"
    )
    
    emergency_severity_level = models.CharField(
        max_length=15,
        blank=True,
        choices=[
            ('LOW', 'Low - Minor incident'),
            ('MEDIUM', 'Medium - Significant incident'),
            ('HIGH', 'High - Major incident'),
            ('CRITICAL', 'Critical - Life-threatening'),
            ('CATASTROPHIC', 'Catastrophic - Multi-agency response')
        ],
        help_text="Emergency severity assessment"
    )
    
    # Accident prevention tracking
    false_alarm_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of false alarms by this user (accident prevention)"
    )
    
    activation_verification = models.JSONField(
        default=dict,
        help_text="Emergency activation verification data (PIN, countdown, etc.)"
    )
    
    emergency_contacts_notified = models.JSONField(
        default=list,
        help_text="List of emergency contacts that were automatically notified"
    )
    
    emergency_services_notified = models.BooleanField(
        default=False,
        help_text="Whether emergency services (000) were automatically notified"
    )
    
    emergency_response_time = models.DurationField(
        null=True,
        blank=True,
        help_text="Time from emergency activation to first responder arrival"
    )
    
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
    
    @property
    def is_emergency(self) -> bool:
        """Check if this event is an emergency incident"""
        emergency_types = [
            self.EventType.EMERGENCY_FIRE,
            self.EventType.EMERGENCY_SPILL,
            self.EventType.EMERGENCY_ACCIDENT,
            self.EventType.EMERGENCY_MEDICAL,
            self.EventType.EMERGENCY_SECURITY,
            self.EventType.EMERGENCY_MECHANICAL,
            self.EventType.EMERGENCY_WEATHER,
            self.EventType.EMERGENCY_OTHER,
        ]
        return self.event_type in emergency_types
    
    @property
    def is_false_alarm(self) -> bool:
        """Check if this is a false alarm"""
        return self.event_type == self.EventType.EMERGENCY_FALSE_ALARM
    
    def mark_false_alarm(self, user: User, reason: str = ""):
        """Mark emergency as false alarm and update user's false alarm count"""
        self.event_type = self.EventType.EMERGENCY_FALSE_ALARM
        self.emergency_activation_method = 'FALSE_ALARM'
        self.resolved_by = user
        self.resolved_at = timezone.now()
        self.resolution_notes = f"Marked as false alarm: {reason}"
        
        # Increment false alarm count for accident prevention
        self.false_alarm_count += 1
        
        self.save(update_fields=[
            'event_type', 'emergency_activation_method', 'resolved_by', 
            'resolved_at', 'resolution_notes', 'false_alarm_count'
        ])
    
    def get_emergency_data_packet(self) -> Dict:
        """Assemble comprehensive emergency data packet from existing systems"""
        if not self.is_emergency:
            return {}
        
        session = self.monitoring_session
        shipment = session.shipment
        vehicle = session.vehicle
        driver = session.driver
        
        # Assemble emergency packet from existing data
        emergency_packet = {
            'emergency_id': str(self.id),
            'timestamp': self.timestamp.isoformat(),
            'incident_type': self.get_event_type_display(),
            'severity': self.emergency_severity_level or 'UNKNOWN',
            
            # Location data (from existing GPS tracking)
            'location': {
                'latitude': self.location.y if self.location else None,
                'longitude': self.location.x if self.location else None,
                'nearest_address': self.event_data.get('nearest_address', 'Unknown'),
                'landmark_description': self.event_data.get('landmark_description', ''),
            },
            
            # Shipment and cargo data (from existing manifest)
            'shipment': {
                'tracking_number': shipment.tracking_number,
                'dangerous_goods': self._get_dangerous_goods_summary(shipment),
                'emergency_response_guides': self._get_emergency_response_guides(shipment),
                'total_weight_kg': getattr(shipment, 'dead_weight_kg', 0),
                'origin': shipment.origin_location,
                'destination': shipment.destination_location,
            },
            
            # Vehicle data (from existing compliance)
            'vehicle': {
                'registration': vehicle.registration_number,
                'type': vehicle.get_vehicle_type_display(),
                'capacity_kg': vehicle.capacity_kg,
                'safety_equipment': self._get_safety_equipment_summary(vehicle),
            },
            
            # Driver data (from existing training system)
            'driver': {
                'name': driver.get_full_name(),
                'phone': getattr(driver, 'phone', ''),
                'qualifications': self._get_driver_qualifications(driver),
                'experience_years': self._get_driver_experience(driver),
            },
            
            # Emergency contacts (from existing EIP system)
            'emergency_contacts': self._get_emergency_contacts(shipment),
            
            # Response data
            'response_status': {
                'emergency_services_notified': self.emergency_services_notified,
                'contacts_notified': self.emergency_contacts_notified,
                'activation_method': self.emergency_activation_method,
                'verification_status': self.activation_verification,
            }
        }
        
        return emergency_packet
    
    def _get_dangerous_goods_summary(self, shipment) -> List[Dict]:
        """Get dangerous goods summary from shipment manifest"""
        dangerous_items = []
        
        for item in shipment.items.filter(is_dangerous_good=True):
            if item.dangerous_good_entry:
                dg = item.dangerous_good_entry
                dangerous_items.append({
                    'un_number': dg.un_number,
                    'proper_shipping_name': dg.proper_shipping_name,
                    'hazard_class': dg.hazard_class,
                    'packing_group': dg.packing_group,
                    'quantity': item.quantity,
                    'weight_kg': getattr(item, 'weight_kg', 0),
                    'erg_guide': dg.erg_guide_number,
                })
        
        return dangerous_items
    
    def _get_emergency_response_guides(self, shipment) -> List[str]:
        """Get ERG guide numbers from dangerous goods"""
        erg_guides = []
        
        for item in shipment.items.filter(is_dangerous_good=True):
            if item.dangerous_good_entry and item.dangerous_good_entry.erg_guide_number:
                if item.dangerous_good_entry.erg_guide_number not in erg_guides:
                    erg_guides.append(item.dangerous_good_entry.erg_guide_number)
        
        return erg_guides
    
    def _get_safety_equipment_summary(self, vehicle) -> List[Dict]:
        """Get vehicle safety equipment from existing compliance system"""
        equipment_summary = []
        
        try:
            equipment = vehicle.safety_equipment.filter(status='ACTIVE')
            for item in equipment:
                equipment_summary.append({
                    'type': item.equipment_type.name,
                    'location': item.location_on_vehicle,
                    'capacity': getattr(item, 'capacity', ''),
                    'expiry_date': item.expiry_date.isoformat() if item.expiry_date else None,
                    'compliant': item.is_compliant,
                })
        except:
            pass  # Graceful handling if safety equipment not available
        
        return equipment_summary
    
    def _get_driver_qualifications(self, driver) -> Dict:
        """Get driver qualifications from training system"""
        try:
            if hasattr(driver, 'competency_profile'):
                profile = driver.competency_profile
                return {
                    'overall_status': profile.overall_status,
                    'qualified_hazard_classes': profile.qualified_hazard_classes,
                    'compliance_percentage': float(profile.compliance_percentage),
                    'last_assessment': profile.last_assessment_date.isoformat() if profile.last_assessment_date else None,
                }
        except:
            pass
        
        return {'status': 'UNKNOWN'}
    
    def _get_driver_experience(self, driver) -> float:
        """Get driver experience from training system"""
        try:
            if hasattr(driver, 'competency_profile'):
                return float(driver.competency_profile.years_experience or 0)
        except:
            pass
        
        return 0.0
    
    def _get_emergency_contacts(self, shipment) -> List[Dict]:
        """Get emergency contacts from EIP system"""
        try:
            # This would integrate with the existing EIP emergency contacts
            from dangerous_goods.emergency_info_panel import EmergencyContact
            
            # Get dangerous goods classes from shipment
            hazard_classes = []
            for item in shipment.items.filter(is_dangerous_good=True):
                if item.dangerous_good_entry:
                    main_class = item.dangerous_good_entry.hazard_class.split('.')[0]
                    if main_class not in hazard_classes:
                        hazard_classes.append(main_class)
            
            # Find relevant emergency contacts
            contacts = EmergencyContact.objects.filter(
                models.Q(hazard_classes_covered__overlap=hazard_classes) |
                models.Q(hazard_classes_covered__contains=[]) |  # General contacts
                models.Q(is_24_7_available=True)
            ).order_by('priority')[:10]
            
            contact_list = []
            for contact in contacts:
                contact_list.append({
                    'organization': contact.organization_name,
                    'contact_name': contact.contact_name,
                    'phone': contact.phone_number,
                    'type': contact.get_contact_type_display(),
                    'coverage_area': contact.coverage_area,
                    'available_24_7': contact.is_24_7_available,
                })
            
            return contact_list
            
        except Exception as e:
            # Fallback emergency contacts
            return [
                {
                    'organization': 'Emergency Services',
                    'phone': '000',
                    'type': 'Primary Emergency',
                    'available_24_7': True,
                }
            ]


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