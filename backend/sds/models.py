import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from dangerous_goods.models import DangerousGood
from documents.models import Document

User = get_user_model()

class SDSStatus(models.TextChoices):
    """Status of SDS document"""
    ACTIVE = 'ACTIVE', _('Active')
    EXPIRED = 'EXPIRED', _('Expired')
    SUPERSEDED = 'SUPERSEDED', _('Superseded')
    UNDER_REVIEW = 'UNDER_REVIEW', _('Under Review')
    DRAFT = 'DRAFT', _('Draft')

class SDSLanguage(models.TextChoices):
    """Languages available for SDS documents"""
    EN = 'EN', _('English')
    FR = 'FR', _('French (Français)')
    ES = 'ES', _('Spanish (Español)')
    DE = 'DE', _('German (Deutsch)')
    IT = 'IT', _('Italian (Italiano)')
    PT = 'PT', _('Portuguese (Português)')
    NL = 'NL', _('Dutch (Nederlands)')
    SV = 'SV', _('Swedish (Svenska)')
    NO = 'NO', _('Norwegian (Norsk)')
    DA = 'DA', _('Danish (Dansk)')

class SafetyDataSheet(models.Model):
    """
    Safety Data Sheet model linked to dangerous goods products.
    Manages SDS documents with versioning, expiration tracking, and multi-language support.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core identification
    dangerous_good = models.ForeignKey(
        DangerousGood,
        on_delete=models.CASCADE,
        related_name='safety_data_sheets',
        verbose_name=_("Associated Dangerous Good"),
        help_text=_("The dangerous good this SDS applies to")
    )
    
    # Product information
    product_name = models.CharField(
        _("Product Name"),
        max_length=255,
        help_text=_("Commercial product name as appears on SDS")
    )
    manufacturer = models.CharField(
        _("Manufacturer"),
        max_length=255,
        help_text=_("Name of the product manufacturer")
    )
    manufacturer_code = models.CharField(
        _("Manufacturer Product Code"),
        max_length=100,
        blank=True,
        help_text=_("Internal product code used by manufacturer")
    )
    
    # Document management
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='sds_record',
        verbose_name=_("SDS Document"),
        help_text=_("The actual SDS PDF document")
    )
    
    # Version and status
    version = models.CharField(
        _("SDS Version"),
        max_length=50,
        help_text=_("Version number of this SDS (e.g., 1.0, 2.3)")
    )
    revision_date = models.DateField(
        _("Revision Date"),
        help_text=_("Date when this SDS version was created")
    )
    supersedes_version = models.CharField(
        _("Supersedes Version"),
        max_length=50,
        blank=True,
        help_text=_("Previous version this SDS replaces")
    )
    
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=SDSStatus.choices,
        default=SDSStatus.ACTIVE,
        db_index=True
    )
    
    # Validity and compliance
    expiration_date = models.DateField(
        _("Expiration Date"),
        null=True,
        blank=True,
        help_text=_("Date when this SDS expires (if applicable)")
    )
    
    # Regulatory information
    language = models.CharField(
        _("Language"),
        max_length=2,
        choices=SDSLanguage.choices,
        default=SDSLanguage.EN,
        db_index=True
    )
    country_code = models.CharField(
        _("Country Code"),
        max_length=2,
        help_text=_("ISO country code for regulatory jurisdiction")
    )
    regulatory_standard = models.CharField(
        _("Regulatory Standard"),
        max_length=100,
        default="GHS",
        help_text=_("Standard this SDS complies with (e.g., GHS, OSHA, EU CLP)")
    )
    
    # Emergency contacts (JSON field for flexibility)
    emergency_contacts = models.JSONField(
        _("Emergency Contact Information"),
        default=dict,
        blank=True,
        help_text=_("Emergency contact numbers and information")
    )
    
    # Key safety information (extracted for quick access)
    flash_point_celsius = models.FloatField(
        _("Flash Point (°C)"),
        null=True,
        blank=True,
        help_text=_("Flash point in Celsius")
    )
    auto_ignition_temp_celsius = models.FloatField(
        _("Auto-Ignition Temperature (°C)"),
        null=True,
        blank=True,
        help_text=_("Auto-ignition temperature in Celsius")
    )
    
    # Physical properties
    physical_state = models.CharField(
        _("Physical State"),
        max_length=20,
        choices=[
            ('SOLID', _('Solid')),
            ('LIQUID', _('Liquid')),
            ('GAS', _('Gas')),
            ('AEROSOL', _('Aerosol')),
        ],
        null=True,
        blank=True
    )
    color = models.CharField(_("Color"), max_length=100, blank=True)
    odor = models.CharField(_("Odor"), max_length=100, blank=True)
    
    # Hazard information (stored as JSON for flexibility)
    hazard_statements = models.JSONField(
        _("Hazard Statements"),
        default=list,
        blank=True,
        help_text=_("List of H-codes and statements")
    )
    precautionary_statements = models.JSONField(
        _("Precautionary Statements"),
        default=list,
        blank=True,
        help_text=_("List of P-codes and statements")
    )
    
    # First aid information
    first_aid_measures = models.JSONField(
        _("First Aid Measures"),
        default=dict,
        blank=True,
        help_text=_("First aid instructions by exposure route")
    )
    
    # Fire fighting measures
    fire_fighting_measures = models.JSONField(
        _("Fire Fighting Measures"),
        default=dict,
        blank=True,
        help_text=_("Fire fighting procedures and extinguishing media")
    )
    
    # Spill cleanup procedures
    spill_cleanup_procedures = models.TextField(
        _("Spill Cleanup Procedures"),
        blank=True,
        help_text=_("Procedures for cleaning up spills")
    )
    
    # Storage and handling
    storage_requirements = models.TextField(
        _("Storage Requirements"),
        blank=True,
        help_text=_("Special storage conditions and requirements")
    )
    handling_precautions = models.TextField(
        _("Handling Precautions"),
        blank=True,
        help_text=_("Safe handling procedures")
    )
    
    # Disposal information
    disposal_methods = models.TextField(
        _("Disposal Methods"),
        blank=True,
        help_text=_("Safe disposal procedures")
    )
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='created_sds_records',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Safety Data Sheet")
        verbose_name_plural = _("Safety Data Sheets")
        indexes = [
            models.Index(fields=['dangerous_good', 'status']),
            models.Index(fields=['manufacturer', 'product_name']),
            models.Index(fields=['status', 'expiration_date']),
            models.Index(fields=['language', 'country_code']),
            models.Index(fields=['version', 'revision_date']),
        ]
        unique_together = [
            ['dangerous_good', 'version', 'language', 'country_code']
        ]
        ordering = ['-revision_date', '-version']
    
    def __str__(self):
        return f"{self.product_name} - {self.version} ({self.language})"
    
    @property
    def is_expired(self) -> bool:
        """Check if SDS has expired"""
        if not self.expiration_date:
            return False
        return timezone.now().date() > self.expiration_date
    
    @property
    def is_current(self) -> bool:
        """Check if this is the current version for this product/language"""
        return self.status == SDSStatus.ACTIVE and not self.is_expired
    
    @property
    def days_until_expiration(self) -> int:
        """Calculate days until expiration"""
        if not self.expiration_date:
            return 365  # Default if no expiration
        delta = self.expiration_date - timezone.now().date()
        return max(0, delta.days)
    
    def get_emergency_phone(self, country_code: str = None) -> str:
        """Get emergency phone number for specified country"""
        if not self.emergency_contacts:
            return ""
        
        country = country_code or self.country_code
        contacts = self.emergency_contacts
        
        # Try specific country first
        if country in contacts:
            return contacts[country].get('phone', '')
        
        # Fall back to general emergency number
        return contacts.get('general', {}).get('phone', '')

class SDSRequest(models.Model):
    """
    Model to track requests for SDS documents that are not yet in the system.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    dangerous_good = models.ForeignKey(
        DangerousGood,
        on_delete=models.CASCADE,
        related_name='sds_requests',
        verbose_name=_("Dangerous Good")
    )
    
    product_name = models.CharField(
        _("Product Name"),
        max_length=255,
        help_text=_("Specific product name for SDS request")
    )
    manufacturer = models.CharField(
        _("Manufacturer"),
        max_length=255,
        blank=True
    )
    
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sds_requests',
        verbose_name=_("Requested By")
    )
    
    language = models.CharField(
        _("Requested Language"),
        max_length=2,
        choices=SDSLanguage.choices,
        default=SDSLanguage.EN
    )
    country_code = models.CharField(
        _("Country Code"),
        max_length=2,
        help_text=_("Country for regulatory compliance")
    )
    
    urgency = models.CharField(
        _("Urgency"),
        max_length=20,
        choices=[
            ('LOW', _('Low - General Reference')),
            ('MEDIUM', _('Medium - Planned Shipment')),
            ('HIGH', _('High - Immediate Shipment')),
            ('CRITICAL', _('Critical - Emergency Response')),
        ],
        default='MEDIUM'
    )
    
    justification = models.TextField(
        _("Justification"),
        help_text=_("Reason for SDS request")
    )
    
    status = models.CharField(
        _("Request Status"),
        max_length=20,
        choices=[
            ('PENDING', _('Pending')),
            ('IN_PROGRESS', _('In Progress')),
            ('COMPLETED', _('Completed')),
            ('CANCELLED', _('Cancelled')),
            ('UNAVAILABLE', _('Unavailable')),
        ],
        default='PENDING',
        db_index=True
    )
    
    fulfilled_by = models.ForeignKey(
        SafetyDataSheet,
        on_delete=models.SET_NULL,
        related_name='fulfills_requests',
        null=True,
        blank=True,
        verbose_name=_("Fulfilled by SDS")
    )
    
    notes = models.TextField(_("Notes"), blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = _("SDS Request")
        verbose_name_plural = _("SDS Requests")
        indexes = [
            models.Index(fields=['status', 'urgency']),
            models.Index(fields=['dangerous_good', 'status']),
            models.Index(fields=['requested_by', 'status']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"SDS Request: {self.product_name} ({self.get_urgency_display()})"

class SDSAccessLog(models.Model):
    """
    Model to track SDS access for compliance and audit purposes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    sds = models.ForeignKey(
        SafetyDataSheet,
        on_delete=models.CASCADE,
        related_name='access_logs',
        verbose_name=_("Safety Data Sheet")
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sds_access_logs',
        verbose_name=_("User")
    )
    
    access_type = models.CharField(
        _("Access Type"),
        max_length=20,
        choices=[
            ('VIEW', _('Viewed')),
            ('DOWNLOAD', _('Downloaded')),
            ('PRINT', _('Printed')),
            ('SEARCH', _('Found in Search')),
        ],
        db_index=True
    )
    
    access_context = models.CharField(
        _("Access Context"),
        max_length=50,
        choices=[
            ('PLANNING', _('Shipment Planning')),
            ('INSPECTION', _('Inspection Process')),
            ('EMERGENCY', _('Emergency Response')),
            ('TRAINING', _('Training')),
            ('COMPLIANCE', _('Compliance Check')),
            ('GENERAL', _('General Reference')),
        ],
        default='GENERAL'
    )
    
    ip_address = models.GenericIPAddressField(
        _("IP Address"),
        null=True,
        blank=True
    )
    user_agent = models.TextField(
        _("User Agent"),
        blank=True
    )
    
    accessed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("SDS Access Log")
        verbose_name_plural = _("SDS Access Logs")
        indexes = [
            models.Index(fields=['sds', 'accessed_at']),
            models.Index(fields=['user', 'access_type']),
            models.Index(fields=['access_context', 'accessed_at']),
        ]
        ordering = ['-accessed_at']
    
    def __str__(self):
        return f"{self.user.username} {self.access_type} {self.sds.product_name}"