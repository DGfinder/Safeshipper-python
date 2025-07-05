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
            user_role=user.role if user else None,
            content_object=content_object,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            session_key=session_key,
            metadata=metadata
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
            models.Index(fields=['shipment', 'audit_log__timestamp']),
            models.Index(fields=['previous_status', 'new_status']),
        ]
    
    def __str__(self):
        return f"Shipment {self.shipment.tracking_number} - {self.audit_log.action_description}"


class ComplianceAuditLog(models.Model):
    """
    Specialized audit log for compliance-related actions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to main audit log
    audit_log = models.ForeignKey(
        AuditLog,
        on_delete=models.CASCADE,
        related_name='compliance_audits'
    )
    
    # Compliance-specific fields
    regulation_type = models.CharField(
        _("Regulation Type"),
        max_length=50,
        choices=[
            ('IATA_DGR', _('IATA Dangerous Goods Regulations')),
            ('IMDG', _('International Maritime Dangerous Goods')),
            ('ADR', _('European Agreement on Dangerous Goods')),
            ('CUSTOM', _('Custom Compliance Rule'))
        ],
        blank=True
    )
    
    compliance_status = models.CharField(
        _("Compliance Status"),
        max_length=20,
        choices=[
            ('COMPLIANT', _('Compliant')),
            ('NON_COMPLIANT', _('Non-Compliant')),
            ('WARNING', _('Warning')),
            ('UNDER_REVIEW', _('Under Review'))
        ],
        blank=True
    )
    
    violation_details = models.TextField(
        _("Violation Details"),
        blank=True,
        help_text=_("Details of any compliance violations")
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
    
    class Meta:
        verbose_name = _("Compliance Audit Log")
        verbose_name_plural = _("Compliance Audit Logs")
        ordering = ['-audit_log__timestamp']
        indexes = [
            models.Index(fields=['compliance_status', 'audit_log__timestamp']),
            models.Index(fields=['regulation_type']),
        ]
    
    def __str__(self):
        return f"Compliance - {self.regulation_type} - {self.compliance_status}"