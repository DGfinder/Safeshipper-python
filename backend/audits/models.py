import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

User = get_user_model()


class AuditActionType(models.TextChoices):
    """Types of actions that can be audited"""
    CREATE = 'CREATE', _('Created')
    UPDATE = 'UPDATE', _('Updated')
    DELETE = 'DELETE', _('Deleted')
    STATUS_CHANGE = 'STATUS_CHANGE', _('Status Changed')
    DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD', _('Document Uploaded')
    DOCUMENT_DELETE = 'DOCUMENT_DELETE', _('Document Deleted')
    ASSIGNMENT_CHANGE = 'ASSIGNMENT_CHANGE', _('Assignment Changed')
    LOCATION_UPDATE = 'LOCATION_UPDATE', _('Location Updated')
    ACCESS_GRANTED = 'ACCESS_GRANTED', _('Access Granted')
    ACCESS_DENIED = 'ACCESS_DENIED', _('Access Denied')
    LOGIN = 'LOGIN', _('User Login')
    LOGOUT = 'LOGOUT', _('User Logout')
    EXPORT = 'EXPORT', _('Data Exported')
    IMPORT = 'IMPORT', _('Data Imported')
    VALIDATION = 'VALIDATION', _('Validation Performed')
    COMMUNICATION = 'COMMUNICATION', _('Communication Sent')


class AuditLog(models.Model):
    """
    Comprehensive audit log for tracking all significant actions in the system.
    This complements django-simple-history by providing business logic context.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Action details
    action_type = models.CharField(
        _("Action Type"),
        max_length=50,
        choices=AuditActionType.choices,
        db_index=True
    )
    action_description = models.TextField(
        _("Action Description"),
        help_text=_("Human-readable description of the action performed")
    )
    
    # User context
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name=_("User")
    )
    user_role = models.CharField(
        _("User Role"),
        max_length=30,
        blank=True,
        help_text=_("User's role at the time of action")
    )
    
    # Generic relation to any model
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.CharField(max_length=255, null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Change details
    old_values = models.JSONField(
        _("Old Values"),
        null=True,
        blank=True,
        help_text=_("Previous values before change")
    )
    new_values = models.JSONField(
        _("New Values"),
        null=True,
        blank=True,
        help_text=_("New values after change")
    )
    
    # Context information
    ip_address = models.GenericIPAddressField(
        _("IP Address"),
        null=True,
        blank=True
    )
    user_agent = models.TextField(
        _("User Agent"),
        blank=True,
        help_text=_("Browser/client information")
    )
    session_key = models.CharField(
        _("Session Key"),
        max_length=255,
        blank=True,
        help_text=_("Session identifier")
    )
    
    # Additional metadata
    metadata = models.JSONField(
        _("Additional Metadata"),
        null=True,
        blank=True,
        help_text=_("Additional context-specific information")
    )
    
    # Timestamps
    timestamp = models.DateTimeField(
        _("Timestamp"),
        default=timezone.now,
        db_index=True
    )
    
    class Meta:
        verbose_name = _("Audit Log")
        verbose_name_plural = _("Audit Logs")
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        user_str = str(self.user) if self.user else "System"
        return f"{user_str} - {self.get_action_type_display()} - {self.timestamp}"
    
    @classmethod
    def log_action(cls, action_type, description, user=None, content_object=None, 
                   old_values=None, new_values=None, ip_address=None, 
                   user_agent=None, session_key=None, metadata=None):
        """
        Convenience method for creating audit log entries
        """
        audit_log = cls(
            action_type=action_type,
            action_description=description,
            user=user,
            user_role=user.role if user else '',
            content_object=content_object,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent or '',
            session_key=session_key or '',
            metadata=metadata or {}
        )
        audit_log.save()
        return audit_log


class ShipmentAuditLog(models.Model):
    """
    Specialized audit log for shipment-specific actions with enhanced tracking
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    shipment = models.ForeignKey(
        'shipments.Shipment',
        on_delete=models.CASCADE,
        related_name='audit_logs',
        verbose_name=_("Shipment")
    )
    
    # Link to main audit log
    audit_log = models.ForeignKey(
        AuditLog,
        on_delete=models.CASCADE,
        related_name='shipment_audits'
    )
    
    # Shipment-specific fields
    previous_status = models.CharField(
        _("Previous Status"),
        max_length=25,
        blank=True,
        help_text=_("Previous shipment status")
    )
    new_status = models.CharField(
        _("New Status"),
        max_length=25,
        blank=True,
        help_text=_("New shipment status")
    )
    
    # Location tracking
    location_at_time = models.CharField(
        _("Location at Time"),
        max_length=255,
        blank=True,
        help_text=_("Shipment location when action occurred")
    )
    
    # Vehicle/driver context
    assigned_vehicle = models.CharField(
        _("Assigned Vehicle"),
        max_length=255,
        blank=True,
        help_text=_("Vehicle assigned at time of action")
    )
    assigned_driver = models.CharField(
        _("Assigned Driver"),
        max_length=255,
        blank=True,
        help_text=_("Driver assigned at time of action")
    )
    
    # Business impact
    impact_level = models.CharField(
        _("Impact Level"),
        max_length=20,
        choices=[
            ('LOW', _('Low')),
            ('MEDIUM', _('Medium')),
            ('HIGH', _('High')),
            ('CRITICAL', _('Critical'))
        ],
        default='LOW',
        help_text=_("Business impact level of this action")
    )
    
    class Meta:
        verbose_name = _("Shipment Audit Log")
        verbose_name_plural = _("Shipment Audit Logs")
        ordering = ['-audit_log__timestamp']
        indexes = [
            models.Index(fields=['shipment', 'audit_log']),
            models.Index(fields=['previous_status', 'new_status']),
        ]
    
    def __str__(self):
        return f"Shipment {self.shipment.tracking_number} - {self.audit_log.action_description}"


class ComplianceAuditLog(models.Model):
    """
    Specialized audit log for compliance-related actions with enhanced dangerous goods tracking
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to main audit log
    audit_log = models.ForeignKey(
        AuditLog,
        on_delete=models.CASCADE,
        related_name='compliance_audits'
    )
    
    # Company-based data filtering for multi-tenant architecture
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='compliance_audits',
        verbose_name=_("Company"),
        help_text=_("Company this compliance audit belongs to")
    )
    
    # Compliance-specific fields with enhanced dangerous goods regulations
    regulation_type = models.CharField(
        _("Regulation Type"),
        max_length=50,
        choices=[
            ('ADG_CODE', _('Australian Dangerous Goods Code')),
            ('IATA_DGR', _('IATA Dangerous Goods Regulations')),
            ('IMDG', _('International Maritime Dangerous Goods')),
            ('ADR', _('European Agreement on Dangerous Goods')),
            ('DOT_HAZMAT', _('DOT Hazardous Materials Regulations')),
            ('UN_TDG', _('UN Recommendations on Transport of DG')),
            ('CUSTOM', _('Custom Compliance Rule'))
        ],
        blank=True,
        db_index=True
    )
    
    compliance_status = models.CharField(
        _("Compliance Status"),
        max_length=20,
        choices=[
            ('COMPLIANT', _('Compliant')),
            ('NON_COMPLIANT', _('Non-Compliant')),
            ('WARNING', _('Warning')),
            ('UNDER_REVIEW', _('Under Review')),
            ('REMEDIATED', _('Remediated')),
            ('EXEMPTION_GRANTED', _('Exemption Granted'))
        ],
        blank=True,
        db_index=True
    )
    
    # Dangerous goods specific compliance fields
    un_numbers_affected = models.JSONField(
        _("UN Numbers Affected"),
        default=list,
        blank=True,
        help_text=_("List of UN numbers affected by this compliance event")
    )
    
    hazard_classes_affected = models.JSONField(
        _("Hazard Classes Affected"),
        default=list,
        blank=True,
        help_text=_("List of hazard classes affected by this compliance event")
    )
    
    shipment_reference = models.CharField(
        _("Shipment Reference"),
        max_length=100,
        blank=True,
        help_text=_("Reference to affected shipment if applicable")
    )
    
    vehicle_reference = models.CharField(
        _("Vehicle Reference"),
        max_length=100,
        blank=True,
        help_text=_("Reference to affected vehicle if applicable")
    )
    
    driver_reference = models.CharField(
        _("Driver Reference"),
        max_length=100,
        blank=True,
        help_text=_("Reference to affected driver if applicable")
    )
    
    violation_details = models.TextField(
        _("Violation Details"),
        blank=True,
        help_text=_("Details of any compliance violations")
    )
    
    risk_assessment_score = models.DecimalField(
        _("Risk Assessment Score"),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Risk score from 0-100 based on violation severity")
    )
    
    regulatory_citation = models.CharField(
        _("Regulatory Citation"),
        max_length=200,
        blank=True,
        help_text=_("Specific regulation section or code citation")
    )
    
    remediation_required = models.BooleanField(
        _("Remediation Required"),
        default=False,
        help_text=_("Whether remediation action is required")
    )
    
    remediation_deadline = models.DateTimeField(
        _("Remediation Deadline"),
        null=True,
        blank=True,
        help_text=_("Deadline for remediation if required")
    )
    
    remediation_status = models.CharField(
        _("Remediation Status"),
        max_length=20,
        choices=[
            ('NOT_REQUIRED', _('Not Required')),
            ('PENDING', _('Pending')),
            ('IN_PROGRESS', _('In Progress')),
            ('COMPLETED', _('Completed')),
            ('OVERDUE', _('Overdue')),
            ('ESCALATED', _('Escalated'))
        ],
        default='NOT_REQUIRED',
        help_text=_("Current status of remediation efforts")
    )
    
    regulatory_authority_notified = models.BooleanField(
        _("Regulatory Authority Notified"),
        default=False,
        help_text=_("Whether regulatory authority has been notified")
    )
    
    notification_reference = models.CharField(
        _("Notification Reference"),
        max_length=100,
        blank=True,
        help_text=_("Reference number from regulatory authority notification")
    )
    
    # Financial impact tracking
    estimated_financial_impact = models.DecimalField(
        _("Estimated Financial Impact"),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Estimated financial impact in local currency")
    )
    
    actual_financial_impact = models.DecimalField(
        _("Actual Financial Impact"),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Actual financial impact in local currency")
    )
    
    # Audit trail integrity
    compliance_hash = models.CharField(
        _("Compliance Hash"),
        max_length=64,
        blank=True,
        help_text=_("SHA-256 hash for audit trail integrity verification")
    )
    
    class Meta:
        verbose_name = _("Compliance Audit Log")
        verbose_name_plural = _("Compliance Audit Logs")
        ordering = ['-audit_log__timestamp']
        indexes = [
            models.Index(fields=['company', 'compliance_status', 'audit_log']),
            models.Index(fields=['regulation_type', 'compliance_status']),
            models.Index(fields=['remediation_status', 'remediation_deadline']),
            models.Index(fields=['risk_assessment_score']),
            models.Index(fields=['audit_log__timestamp', 'company']),
            models.Index(fields=['shipment_reference']),
            models.Index(fields=['vehicle_reference']),
            models.Index(fields=['driver_reference']),
        ]
    
    def __str__(self):
        return f"Compliance - {self.regulation_type} - {self.compliance_status}"
    
    def save(self, *args, **kwargs):
        """Override save to generate compliance hash for integrity verification"""
        if not self.compliance_hash:
            import hashlib
            import json
            
            # Create hash from key compliance data
            hash_data = {
                'audit_log_id': str(self.audit_log.id),
                'regulation_type': self.regulation_type,
                'compliance_status': self.compliance_status,
                'un_numbers_affected': sorted(self.un_numbers_affected) if self.un_numbers_affected else [],
                'violation_details': self.violation_details,
                'timestamp': self.audit_log.timestamp.isoformat() if self.audit_log else '',
            }
            
            hash_string = json.dumps(hash_data, sort_keys=True)
            self.compliance_hash = hashlib.sha256(hash_string.encode()).hexdigest()
        
        super().save(*args, **kwargs)
    
    def verify_integrity(self):
        """Verify the integrity of the compliance audit record"""
        import hashlib
        import json
        
        # Recreate hash from current data
        hash_data = {
            'audit_log_id': str(self.audit_log.id),
            'regulation_type': self.regulation_type,
            'compliance_status': self.compliance_status,
            'un_numbers_affected': sorted(self.un_numbers_affected) if self.un_numbers_affected else [],
            'violation_details': self.violation_details,
            'timestamp': self.audit_log.timestamp.isoformat() if self.audit_log else '',
        }
        
        hash_string = json.dumps(hash_data, sort_keys=True)
        expected_hash = hashlib.sha256(hash_string.encode()).hexdigest()
        
        return self.compliance_hash == expected_hash


class DangerousGoodsAuditLog(models.Model):
    """
    Specialized audit log for dangerous goods specific operations and compliance
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to main audit log
    audit_log = models.ForeignKey(
        AuditLog,
        on_delete=models.CASCADE,
        related_name='dangerous_goods_audits'
    )
    
    # Company-based data filtering
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='dg_audits',
        verbose_name=_("Company")
    )
    
    # Dangerous goods identification
    un_number = models.CharField(
        _("UN Number"),
        max_length=10,
        blank=True,
        help_text=_("UN identification number")
    )
    
    proper_shipping_name = models.CharField(
        _("Proper Shipping Name"),
        max_length=200,
        blank=True,
        help_text=_("Official shipping name for the dangerous good")
    )
    
    hazard_class = models.CharField(
        _("Hazard Class"),
        max_length=10,
        blank=True,
        help_text=_("Primary hazard class")
    )
    
    subsidiary_hazard_classes = models.JSONField(
        _("Subsidiary Hazard Classes"),
        default=list,
        blank=True,
        help_text=_("List of subsidiary hazard classes")
    )
    
    packing_group = models.CharField(
        _("Packing Group"),
        max_length=5,
        blank=True,
        help_text=_("Packing group (I, II, III)")
    )
    
    # Operation details
    operation_type = models.CharField(
        _("Operation Type"),
        max_length=50,
        choices=[
            ('CLASSIFICATION_UPDATE', _('Classification Update')),
            ('QUANTITY_CHANGE', _('Quantity Change')),
            ('PACKAGING_CHANGE', _('Packaging Change')),
            ('PLACARD_UPDATE', _('Placard Update')),
            ('SEGREGATION_REVIEW', _('Segregation Review')),
            ('EMERGENCY_PROCEDURE', _('Emergency Procedure')),
            ('INSPECTION_RESULT', _('Inspection Result')),
            ('TRAINING_COMPLETION', _('Training Completion')),
            ('CERTIFICATION_UPDATE', _('Certification Update')),
            ('INCIDENT_REPORT', _('Incident Report'))
        ],
        help_text=_("Type of dangerous goods operation")
    )
    
    operation_details = models.JSONField(
        _("Operation Details"),
        default=dict,
        help_text=_("Detailed information about the operation")
    )
    
    # Quantity and packaging
    quantity_before = models.DecimalField(
        _("Quantity Before"),
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_("Quantity before the change")
    )
    
    quantity_after = models.DecimalField(
        _("Quantity After"),
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_("Quantity after the change")
    )
    
    quantity_unit = models.CharField(
        _("Quantity Unit"),
        max_length=10,
        blank=True,
        choices=[
            ('KG', _('Kilograms')),
            ('L', _('Litres')),
            ('UNITS', _('Units')),
            ('PACKAGES', _('Packages'))
        ],
        help_text=_("Unit of measurement for quantity")
    )
    
    packaging_type_before = models.CharField(
        _("Packaging Type Before"),
        max_length=100,
        blank=True,
        help_text=_("Packaging type before the change")
    )
    
    packaging_type_after = models.CharField(
        _("Packaging Type After"),
        max_length=100,
        blank=True,
        help_text=_("Packaging type after the change")
    )
    
    # Compliance verification
    adg_compliant = models.BooleanField(
        _("ADG Compliant"),
        default=True,
        help_text=_("Whether the operation maintains ADG compliance")
    )
    
    iata_compliant = models.BooleanField(
        _("IATA Compliant"),
        default=True,
        help_text=_("Whether the operation maintains IATA compliance")
    )
    
    imdg_compliant = models.BooleanField(
        _("IMDG Compliant"),
        default=True,
        help_text=_("Whether the operation maintains IMDG compliance")
    )
    
    compliance_notes = models.TextField(
        _("Compliance Notes"),
        blank=True,
        help_text=_("Additional compliance notes and observations")
    )
    
    # Safety and emergency information
    emergency_response_guide = models.CharField(
        _("Emergency Response Guide"),
        max_length=10,
        blank=True,
        help_text=_("ERG guide number")
    )
    
    safety_data_sheet_version = models.CharField(
        _("SDS Version"),
        max_length=20,
        blank=True,
        help_text=_("Version of Safety Data Sheet at time of operation")
    )
    
    # Transport document references
    transport_document_number = models.CharField(
        _("Transport Document Number"),
        max_length=100,
        blank=True,
        help_text=_("Reference to transport document")
    )
    
    manifest_reference = models.CharField(
        _("Manifest Reference"),
        max_length=100,
        blank=True,
        help_text=_("Reference to shipping manifest")
    )
    
    # Regulatory notifications
    regulatory_notification_required = models.BooleanField(
        _("Regulatory Notification Required"),
        default=False,
        help_text=_("Whether regulatory notification is required")
    )
    
    regulatory_notification_sent = models.BooleanField(
        _("Regulatory Notification Sent"),
        default=False,
        help_text=_("Whether regulatory notification has been sent")
    )
    
    notification_reference_number = models.CharField(
        _("Notification Reference Number"),
        max_length=100,
        blank=True,
        help_text=_("Reference number from regulatory notification")
    )
    
    class Meta:
        verbose_name = _("Dangerous Goods Audit Log")
        verbose_name_plural = _("Dangerous Goods Audit Logs")
        ordering = ['-audit_log__timestamp']
        indexes = [
            models.Index(fields=['company', 'un_number']),
            models.Index(fields=['hazard_class', 'packing_group']),
            models.Index(fields=['operation_type', 'audit_log__timestamp']),
            models.Index(fields=['adg_compliant', 'iata_compliant', 'imdg_compliant']),
            models.Index(fields=['regulatory_notification_required', 'regulatory_notification_sent']),
            models.Index(fields=['transport_document_number']),
            models.Index(fields=['manifest_reference']),
        ]
    
    def __str__(self):
        return f"DG Audit - {self.un_number} - {self.operation_type}"


class AuditMetrics(models.Model):
    """
    Model for storing audit metrics and analytics data
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Company-based data filtering
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='audit_metrics',
        verbose_name=_("Company")
    )
    
    # Time period for metrics
    date = models.DateField(
        _("Date"),
        help_text=_("Date for which metrics are calculated"),
        db_index=True
    )
    
    period_type = models.CharField(
        _("Period Type"),
        max_length=20,
        choices=[
            ('DAILY', _('Daily')),
            ('WEEKLY', _('Weekly')),
            ('MONTHLY', _('Monthly')),
            ('QUARTERLY', _('Quarterly')),
            ('YEARLY', _('Yearly'))
        ],
        default='DAILY',
        help_text=_("Type of time period for metrics")
    )
    
    # General audit metrics
    total_audit_events = models.PositiveIntegerField(
        _("Total Audit Events"),
        default=0,
        help_text=_("Total number of audit events in period")
    )
    
    security_events = models.PositiveIntegerField(
        _("Security Events"),
        default=0,
        help_text=_("Number of security-related audit events")
    )
    
    compliance_events = models.PositiveIntegerField(
        _("Compliance Events"),
        default=0,
        help_text=_("Number of compliance-related audit events")
    )
    
    dangerous_goods_events = models.PositiveIntegerField(
        _("Dangerous Goods Events"),
        default=0,
        help_text=_("Number of dangerous goods related audit events")
    )
    
    failed_login_attempts = models.PositiveIntegerField(
        _("Failed Login Attempts"),
        default=0,
        help_text=_("Number of failed login attempts")
    )
    
    # Compliance metrics
    compliance_violations = models.PositiveIntegerField(
        _("Compliance Violations"),
        default=0,
        help_text=_("Number of compliance violations detected")
    )
    
    compliance_warnings = models.PositiveIntegerField(
        _("Compliance Warnings"),
        default=0,
        help_text=_("Number of compliance warnings issued")
    )
    
    remediation_actions_required = models.PositiveIntegerField(
        _("Remediation Actions Required"),
        default=0,
        help_text=_("Number of remediation actions required")
    )
    
    remediation_actions_completed = models.PositiveIntegerField(
        _("Remediation Actions Completed"),
        default=0,
        help_text=_("Number of remediation actions completed")
    )
    
    # Performance metrics
    average_compliance_score = models.DecimalField(
        _("Average Compliance Score"),
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text=_("Average compliance score for the period")
    )
    
    highest_risk_score = models.DecimalField(
        _("Highest Risk Score"),
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text=_("Highest risk assessment score in period")
    )
    
    # User activity metrics
    unique_users_active = models.PositiveIntegerField(
        _("Unique Users Active"),
        default=0,
        help_text=_("Number of unique users with audit events")
    )
    
    most_active_user = models.CharField(
        _("Most Active User"),
        max_length=255,
        blank=True,
        help_text=_("User with most audit events in period")
    )
    
    # System metrics
    data_export_events = models.PositiveIntegerField(
        _("Data Export Events"),
        default=0,
        help_text=_("Number of data export events")
    )
    
    system_configuration_changes = models.PositiveIntegerField(
        _("System Configuration Changes"),
        default=0,
        help_text=_("Number of system configuration changes")
    )
    
    # Dangerous goods specific metrics
    un_numbers_processed = models.PositiveIntegerField(
        _("UN Numbers Processed"),
        default=0,
        help_text=_("Number of different UN numbers processed")
    )
    
    hazard_classes_involved = models.JSONField(
        _("Hazard Classes Involved"),
        default=list,
        help_text=_("List of hazard classes involved in audit events")
    )
    
    emergency_procedures_activated = models.PositiveIntegerField(
        _("Emergency Procedures Activated"),
        default=0,
        help_text=_("Number of emergency procedures activated")
    )
    
    # Metadata
    calculation_timestamp = models.DateTimeField(
        _("Calculation Timestamp"),
        default=timezone.now,
        help_text=_("When these metrics were calculated")
    )
    
    raw_data_hash = models.CharField(
        _("Raw Data Hash"),
        max_length=64,
        blank=True,
        help_text=_("Hash of raw data used for calculation verification")
    )
    
    class Meta:
        verbose_name = _("Audit Metrics")
        verbose_name_plural = _("Audit Metrics")
        ordering = ['-date']
        unique_together = [['company', 'date', 'period_type']]
        indexes = [
            models.Index(fields=['company', 'date', 'period_type']),
            models.Index(fields=['date', 'total_audit_events']),
            models.Index(fields=['compliance_violations', 'date']),
            models.Index(fields=['average_compliance_score', 'date']),
        ]
    
    def __str__(self):
        return f"Audit Metrics - {self.company.name} - {self.date} ({self.period_type})"