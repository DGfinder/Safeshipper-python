import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from documents.models import Document  # Re-enabled after documents app re-enabled
from shipments.models import Shipment
from dangerous_goods.models import DangerousGood

User = get_user_model()

class ManifestType(models.TextChoices):
    """Types of manifests that can be processed"""
    DG_MANIFEST = 'DG_MANIFEST', _('Dangerous Goods Manifest')
    PACKING_LIST = 'PACKING_LIST', _('Packing List')
    COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE', _('Commercial Invoice')
    CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION', _('Customs Declaration')
    COMBINED_MANIFEST = 'COMBINED_MANIFEST', _('Combined Manifest')

class ManifestStatus(models.TextChoices):
    """Status of manifest processing"""
    UPLOADED = 'UPLOADED', _('Uploaded')
    ANALYZING = 'ANALYZING', _('Analyzing for Dangerous Goods')
    AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION', _('Awaiting User Confirmation')
    CONFIRMED = 'CONFIRMED', _('Confirmed by User')
    PROCESSING_FAILED = 'PROCESSING_FAILED', _('Processing Failed')
    FINALIZED = 'FINALIZED', _('Finalized - Shipment Created')

class Manifest(models.Model):
    """
    Core manifest model that extends Document functionality with manifest-specific features
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name='manifest',
        verbose_name=_("Associated Document")
    )  # Re-enabled after documents app re-enabled
    
    # Temporary fields to bypass Document model
    file_name = models.CharField(_("File Name"), max_length=255, blank=True)
    file_size = models.PositiveIntegerField(_("File Size"), null=True, blank=True)
    mime_type = models.CharField(_("MIME Type"), max_length=100, blank=True)
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name='manifests',
        verbose_name=_("Shipment")
    )
    
    # Manifest-specific fields
    manifest_type = models.CharField(
        _("Manifest Type"),
        max_length=50,
        choices=ManifestType.choices,
        db_index=True
    )
    status = models.CharField(
        _("Processing Status"),
        max_length=50,
        choices=ManifestStatus.choices,
        default=ManifestStatus.UPLOADED,
        db_index=True
    )
    
    # Processing metadata
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='processed_manifests',
        verbose_name=_("Processed By"),
        null=True,
        blank=True
    )
    confirmed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='confirmed_manifests',
        verbose_name=_("Confirmed By"),
        null=True,
        blank=True
    )
    
    # Analysis results
    analysis_results = models.JSONField(
        _("Analysis Results"),
        null=True,
        blank=True,
        help_text=_("Results from dangerous goods analysis")
    )
    confirmed_dangerous_goods = models.JSONField(
        _("Confirmed Dangerous Goods"),
        null=True,
        blank=True,
        help_text=_("User-confirmed dangerous goods from the manifest")
    )
    
    # Processing timestamps
    analysis_started_at = models.DateTimeField(_("Analysis Started"), null=True, blank=True)
    analysis_completed_at = models.DateTimeField(_("Analysis Completed"), null=True, blank=True)
    confirmed_at = models.DateTimeField(_("Confirmed At"), null=True, blank=True)
    finalized_at = models.DateTimeField(_("Finalized At"), null=True, blank=True)
    
    # Standard fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Manifest")
        verbose_name_plural = _("Manifests")
        indexes = [
            models.Index(fields=['manifest_type', 'status']),
            models.Index(fields=['shipment', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_manifest_type_display()} - {self.shipment.tracking_number}"
    
    @property
    def is_processing(self) -> bool:
        """Check if the manifest is currently being processed"""
        return self.status == self.ManifestStatus.ANALYZING
    
    @property
    def needs_confirmation(self) -> bool:
        """Check if the manifest needs user confirmation"""
        return self.status == self.ManifestStatus.AWAITING_CONFIRMATION
    
    @property
    def is_finalized(self) -> bool:
        """Check if the manifest has been finalized"""
        return self.status == self.ManifestStatus.FINALIZED

class ManifestDangerousGoodMatch(models.Model):
    """
    Model to track individual dangerous goods matches found in manifests
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    manifest = models.ForeignKey(
        Manifest,
        on_delete=models.CASCADE,
        related_name='dg_matches',
        verbose_name=_("Manifest")
    )
    dangerous_good = models.ForeignKey(
        DangerousGood,
        on_delete=models.CASCADE,
        related_name='manifest_matches',
        verbose_name=_("Dangerous Good")
    )
    
    # Match details
    found_text = models.CharField(
        _("Found Text"),
        max_length=255,
        help_text=_("The actual text that was found in the manifest")
    )
    match_type = models.CharField(
        _("Match Type"),
        max_length=50,
        choices=[
            ('UN_NUMBER', _('UN Number')),
            ('EXACT_SYNONYM', _('Exact Synonym')),
            ('PROPER_NAME', _('Proper Shipping Name')),
            ('FUZZY_MATCH', _('Fuzzy Match')),
        ],
        db_index=True
    )
    confidence_score = models.FloatField(
        _("Confidence Score"),
        help_text=_("Confidence score from 0.0 to 1.0")
    )
    
    # Position information
    page_number = models.PositiveIntegerField(
        _("Page Number"),
        null=True,
        blank=True,
        help_text=_("Page number where the match was found")
    )
    position_data = models.JSONField(
        _("Position Data"),
        null=True,
        blank=True,
        help_text=_("Coordinates or other position information for highlighting")
    )
    
    # Confirmation status
    is_confirmed = models.BooleanField(
        _("Is Confirmed"),
        default=False,
        help_text=_("Whether this match has been confirmed by the user")
    )
    confirmed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='confirmed_dg_matches',
        verbose_name=_("Confirmed By"),
        null=True,
        blank=True
    )
    confirmed_at = models.DateTimeField(_("Confirmed At"), null=True, blank=True)
    
    # Standard fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Manifest Dangerous Good Match")
        verbose_name_plural = _("Manifest Dangerous Good Matches")
        unique_together = ['manifest', 'dangerous_good', 'found_text']
        indexes = [
            models.Index(fields=['manifest', 'is_confirmed']),
            models.Index(fields=['dangerous_good', 'match_type']),
            models.Index(fields=['confidence_score']),
        ]
        ordering = ['-confidence_score', 'found_text']
    
    def __str__(self):
        return f"{self.found_text} -> {self.dangerous_good.un_number} ({self.confidence_score:.2f})"
