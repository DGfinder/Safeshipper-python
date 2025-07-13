# Enhanced SDS Database Models for Australian Data Sources
# This file extends the existing SDS models with comprehensive data source tracking,
# quality control, and automated import capabilities

import uuid
import json
from enum import Enum
from decimal import Decimal
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField

from .models import SafetyDataSheet, DangerousGood

User = get_user_model()


class DataSourceType(models.TextChoices):
    """Types of data sources for SDS information"""
    GOVERNMENT = 'GOVERNMENT', _('Government Agency')
    COMMERCIAL = 'COMMERCIAL', _('Commercial Provider')
    MANUFACTURER = 'MANUFACTURER', _('Manufacturer Direct')
    USER_UPLOAD = 'USER_UPLOAD', _('User Upload')
    INDUSTRY_ASSOCIATION = 'INDUSTRY_ASSOCIATION', _('Industry Association')
    CROWDSOURCED = 'CROWDSOURCED', _('Crowdsourced')


class DataSourceStatus(models.TextChoices):
    """Status of data source integration"""
    ACTIVE = 'ACTIVE', _('Active')
    INACTIVE = 'INACTIVE', _('Inactive')
    TESTING = 'TESTING', _('Testing')
    ERROR = 'ERROR', _('Error')
    MAINTENANCE = 'MAINTENANCE', _('Maintenance')


class SDSDataSource(models.Model):
    """
    Registry of all SDS data sources with connection and quality metadata
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Source identification
    name = models.CharField(
        _("Source Name"),
        max_length=200,
        unique=True,
        help_text=_("Official name of the data source")
    )
    short_name = models.CharField(
        _("Short Name"),
        max_length=50,
        unique=True,
        help_text=_("Abbreviated identifier for the source")
    )
    source_type = models.CharField(
        _("Source Type"),
        max_length=30,
        choices=DataSourceType.choices,
        db_index=True
    )
    
    # Contact and access information
    organization = models.CharField(
        _("Organization"),
        max_length=200,
        help_text=_("Organization that owns/maintains this source")
    )
    website_url = models.URLField(
        _("Website URL"),
        blank=True,
        validators=[URLValidator()]
    )
    api_endpoint = models.URLField(
        _("API Endpoint"),
        blank=True,
        help_text=_("Base URL for API access")
    )
    documentation_url = models.URLField(
        _("Documentation URL"),
        blank=True,
        help_text=_("Link to API or data documentation")
    )
    
    # Geographic and regulatory scope
    country_codes = ArrayField(
        models.CharField(max_length=2),
        size=10,
        default=list,
        help_text=_("ISO country codes this source covers")
    )
    regulatory_jurisdictions = ArrayField(
        models.CharField(max_length=100),
        size=20,
        default=list,
        help_text=_("Regulatory jurisdictions covered")
    )
    
    # Data characteristics
    estimated_records = models.PositiveIntegerField(
        _("Estimated Records"),
        null=True,
        blank=True,
        help_text=_("Approximate number of SDS records available")
    )
    update_frequency = models.CharField(
        _("Update Frequency"),
        max_length=20,
        choices=[
            ('REAL_TIME', _('Real-time')),
            ('HOURLY', _('Hourly')),
            ('DAILY', _('Daily')),
            ('WEEKLY', _('Weekly')),
            ('MONTHLY', _('Monthly')),
            ('QUARTERLY', _('Quarterly')),
            ('ANNUALLY', _('Annually')),
            ('MANUAL', _('Manual')),
        ],
        default='MONTHLY'
    )
    
    # Quality metrics
    data_quality_score = models.FloatField(
        _("Data Quality Score"),
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        default=0.8,
        help_text=_("Overall data quality score (0.0-1.0)")
    )
    reliability_score = models.FloatField(
        _("Reliability Score"),
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        default=0.8,
        help_text=_("Source reliability score (0.0-1.0)")
    )
    
    # Technical configuration
    requires_authentication = models.BooleanField(
        _("Requires Authentication"),
        default=True,
        help_text=_("Whether this source requires API keys or authentication")
    )
    rate_limit_per_hour = models.PositiveIntegerField(
        _("Rate Limit (per hour)"),
        null=True,
        blank=True,
        help_text=_("API rate limit in requests per hour")
    )
    
    # Cost information
    cost_model = models.CharField(
        _("Cost Model"),
        max_length=20,
        choices=[
            ('FREE', _('Free')),
            ('SUBSCRIPTION', _('Subscription')),
            ('PER_REQUEST', _('Per Request')),
            ('TIERED', _('Tiered Pricing')),
            ('ENTERPRISE', _('Enterprise Agreement')),
        ],
        default='FREE'
    )
    annual_cost_aud = models.DecimalField(
        _("Annual Cost (AUD)"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Estimated annual cost in Australian dollars")
    )
    
    # Status and monitoring
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=DataSourceStatus.choices,
        default=DataSourceStatus.TESTING,
        db_index=True
    )
    last_successful_sync = models.DateTimeField(
        _("Last Successful Sync"),
        null=True,
        blank=True
    )
    last_error = models.TextField(
        _("Last Error"),
        blank=True,
        help_text=_("Description of the most recent error")
    )
    consecutive_failures = models.PositiveIntegerField(
        _("Consecutive Failures"),
        default=0,
        help_text=_("Number of consecutive sync failures")
    )
    
    # Configuration and credentials (encrypted in production)
    configuration = models.JSONField(
        _("Configuration"),
        default=dict,
        blank=True,
        help_text=_("Source-specific configuration parameters")
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_sds_sources'
    )
    
    class Meta:
        verbose_name = _("SDS Data Source")
        verbose_name_plural = _("SDS Data Sources")
        indexes = [
            models.Index(fields=['source_type', 'status']),
            models.Index(fields=['status', 'last_successful_sync']),
            models.Index(fields=['organization', 'source_type']),
        ]
        ordering = ['organization', 'name']
    
    def __str__(self):
        return f"{self.organization} - {self.name}"
    
    @property
    def is_healthy(self) -> bool:
        """Check if the data source is healthy (recent successful sync, no consecutive failures)"""
        if self.status != DataSourceStatus.ACTIVE:
            return False
        
        if self.consecutive_failures >= 3:
            return False
        
        if self.last_successful_sync:
            # Consider unhealthy if no sync in the last week
            threshold = timezone.now() - timedelta(days=7)
            return self.last_successful_sync > threshold
        
        return False
    
    @property
    def next_sync_due(self) -> Optional[datetime]:
        """Calculate when the next sync is due based on update frequency"""
        if not self.last_successful_sync:
            return timezone.now()
        
        frequency_deltas = {
            'REAL_TIME': timedelta(minutes=5),
            'HOURLY': timedelta(hours=1),
            'DAILY': timedelta(days=1),
            'WEEKLY': timedelta(weeks=1),
            'MONTHLY': timedelta(days=30),
            'QUARTERLY': timedelta(days=90),
            'ANNUALLY': timedelta(days=365),
        }
        
        delta = frequency_deltas.get(self.update_frequency)
        if delta:
            return self.last_successful_sync + delta
        
        return None  # Manual sources don't have automatic sync schedules


class SDSDataImport(models.Model):
    """
    Track individual import sessions from data sources
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    data_source = models.ForeignKey(
        SDSDataSource,
        on_delete=models.CASCADE,
        related_name='import_sessions'
    )
    
    # Import session details
    import_type = models.CharField(
        _("Import Type"),
        max_length=20,
        choices=[
            ('FULL', _('Full Import')),
            ('INCREMENTAL', _('Incremental Update')),
            ('VERIFICATION', _('Verification Check')),
            ('MANUAL', _('Manual Import')),
        ],
        default='INCREMENTAL'
    )
    
    trigger = models.CharField(
        _("Trigger"),
        max_length=20,
        choices=[
            ('SCHEDULED', _('Scheduled')),
            ('MANUAL', _('Manual')),
            ('API_WEBHOOK', _('API Webhook')),
            ('ERROR_RECOVERY', _('Error Recovery')),
        ],
        default='SCHEDULED'
    )
    
    # Processing metrics
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    
    # Results
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=[
            ('RUNNING', _('Running')),
            ('COMPLETED', _('Completed')),
            ('FAILED', _('Failed')),
            ('PARTIAL', _('Partial Success')),
            ('CANCELLED', _('Cancelled')),
        ],
        default='RUNNING'
    )
    
    records_processed = models.PositiveIntegerField(default=0)
    records_created = models.PositiveIntegerField(default=0)
    records_updated = models.PositiveIntegerField(default=0)
    records_skipped = models.PositiveIntegerField(default=0)
    records_errors = models.PositiveIntegerField(default=0)
    
    # Detailed results
    error_summary = models.TextField(blank=True)
    warning_summary = models.TextField(blank=True)
    import_log = models.JSONField(
        default=list,
        help_text=_("Detailed log of import activities")
    )
    
    # Metadata
    initiated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='initiated_sds_imports'
    )
    
    class Meta:
        verbose_name = _("SDS Data Import")
        verbose_name_plural = _("SDS Data Imports")
        indexes = [
            models.Index(fields=['data_source', 'status']),
            models.Index(fields=['started_at', 'status']),
            models.Index(fields=['import_type', 'status']),
        ]
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.data_source.short_name} Import {self.started_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate of the import"""
        if self.records_processed == 0:
            return 0.0
        return (self.records_created + self.records_updated) / self.records_processed


class EnhancedSafetyDataSheet(SafetyDataSheet):
    """
    Enhanced SDS model with data source tracking and quality metrics
    """
    # Data provenance
    primary_source = models.ForeignKey(
        SDSDataSource,
        on_delete=models.PROTECT,
        related_name='primary_sds_records',
        help_text=_("Primary source of this SDS data")
    )
    
    secondary_sources = models.ManyToManyField(
        SDSDataSource,
        through='SDSSourceContribution',
        related_name='secondary_sds_records',
        blank=True,
        help_text=_("Additional sources that provided data for this SDS")
    )
    
    # Data quality metrics
    data_completeness_score = models.FloatField(
        _("Data Completeness Score"),
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        default=0.5,
        help_text=_("How complete the SDS data is (0.0-1.0)")
    )
    
    data_accuracy_score = models.FloatField(
        _("Data Accuracy Score"),
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        null=True,
        blank=True,
        help_text=_("Estimated accuracy based on source reliability and validation")
    )
    
    confidence_score = models.FloatField(
        _("Overall Confidence Score"),
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        default=0.7,
        help_text=_("Combined confidence in the SDS data quality")
    )
    
    # Verification status
    verification_status = models.CharField(
        _("Verification Status"),
        max_length=20,
        choices=[
            ('UNVERIFIED', _('Unverified')),
            ('AUTO_VERIFIED', _('Auto-verified')),
            ('PEER_REVIEWED', _('Peer Reviewed')),
            ('EXPERT_VERIFIED', _('Expert Verified')),
            ('MANUFACTURER_CONFIRMED', _('Manufacturer Confirmed')),
        ],
        default='UNVERIFIED',
        db_index=True
    )
    
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_sds_records'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Australian-specific fields
    australian_regulatory_status = models.CharField(
        _("Australian Regulatory Status"),
        max_length=30,
        choices=[
            ('APPROVED', _('Approved for Australian use')),
            ('RESTRICTED', _('Restricted use in Australia')),
            ('PROHIBITED', _('Prohibited in Australia')),
            ('UNDER_REVIEW', _('Under regulatory review')),
            ('UNKNOWN', _('Status unknown')),
        ],
        default='UNKNOWN',
        help_text=_("Regulatory status in Australia")
    )
    
    adg_classification_verified = models.BooleanField(
        _("ADG Classification Verified"),
        default=False,
        help_text=_("Whether ADG classification has been verified against official sources")
    )
    
    # Import tracking
    imported_from = models.ForeignKey(
        SDSDataImport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imported_sds_records'
    )
    
    last_source_update = models.DateTimeField(
        _("Last Source Update"),
        null=True,
        blank=True,
        help_text=_("When this SDS was last updated from its source")
    )
    
    source_update_frequency = models.CharField(
        _("Source Update Frequency"),
        max_length=20,
        choices=[
            ('REAL_TIME', _('Real-time')),
            ('DAILY', _('Daily')),
            ('WEEKLY', _('Weekly')),
            ('MONTHLY', _('Monthly')),
            ('QUARTERLY', _('Quarterly')),
            ('STATIC', _('Static/One-time')),
        ],
        default='MONTHLY'
    )
    
    # Deduplication and linking
    duplicate_of = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='duplicates',
        help_text=_("If this is identified as a duplicate, link to the primary record")
    )
    
    similarity_hash = models.CharField(
        _("Similarity Hash"),
        max_length=64,
        blank=True,
        db_index=True,
        help_text=_("Hash for duplicate detection based on key fields")
    )
    
    class Meta:
        verbose_name = _("Enhanced Safety Data Sheet")
        verbose_name_plural = _("Enhanced Safety Data Sheets")
        indexes = [
            models.Index(fields=['primary_source', 'verification_status']),
            models.Index(fields=['confidence_score', 'verification_status']),
            models.Index(fields=['australian_regulatory_status']),
            models.Index(fields=['similarity_hash']),
            models.Index(fields=['last_source_update']),
        ]


class SDSSourceContribution(models.Model):
    """
    Through model for tracking how multiple sources contribute to a single SDS record
    """
    sds = models.ForeignKey(EnhancedSafetyDataSheet, on_delete=models.CASCADE)
    source = models.ForeignKey(SDSDataSource, on_delete=models.CASCADE)
    
    contribution_type = models.CharField(
        _("Contribution Type"),
        max_length=20,
        choices=[
            ('PRIMARY_DATA', _('Primary SDS Data')),
            ('VERIFICATION', _('Data Verification')),
            ('ENRICHMENT', _('Data Enrichment')),
            ('CORRECTION', _('Data Correction')),
            ('TRANSLATION', _('Translation')),
        ]
    )
    
    fields_contributed = ArrayField(
        models.CharField(max_length=100),
        help_text=_("List of SDS fields this source contributed to")
    )
    
    contribution_confidence = models.FloatField(
        _("Contribution Confidence"),
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        default=0.8
    )
    
    contributed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['sds', 'source', 'contribution_type']
        ordering = ['-contributed_at']


class SDSQualityCheck(models.Model):
    """
    Track quality checks performed on SDS records
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    sds = models.ForeignKey(
        EnhancedSafetyDataSheet,
        on_delete=models.CASCADE,
        related_name='quality_checks'
    )
    
    check_type = models.CharField(
        _("Check Type"),
        max_length=30,
        choices=[
            ('COMPLETENESS', _('Data Completeness')),
            ('ACCURACY', _('Data Accuracy')),
            ('CONSISTENCY', _('Internal Consistency')),
            ('REGULATORY', _('Regulatory Compliance')),
            ('DUPLICATE', _('Duplicate Detection')),
            ('FORMAT', _('Format Validation')),
        ]
    )
    
    check_result = models.CharField(
        _("Check Result"),
        max_length=20,
        choices=[
            ('PASSED', _('Passed')),
            ('FAILED', _('Failed')),
            ('WARNING', _('Warning')),
            ('INFO', _('Information')),
        ]
    )
    
    score = models.FloatField(
        _("Quality Score"),
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        null=True,
        blank=True,
        help_text=_("Numeric quality score for this check")
    )
    
    details = models.JSONField(
        default=dict,
        help_text=_("Detailed results and findings from the quality check")
    )
    
    automated = models.BooleanField(
        _("Automated Check"),
        default=True,
        help_text=_("Whether this was an automated or manual quality check")
    )
    
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='performed_quality_checks'
    )
    performed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("SDS Quality Check")
        verbose_name_plural = _("SDS Quality Checks")
        indexes = [
            models.Index(fields=['sds', 'check_type']),
            models.Index(fields=['check_result', 'performed_at']),
            models.Index(fields=['automated', 'check_type']),
        ]
        ordering = ['-performed_at']
    
    def __str__(self):
        return f"{self.sds.product_name} - {self.get_check_type_display()}: {self.get_check_result_display()}"


class AustralianGovernmentSDSSync(models.Model):
    """
    Specific model for tracking Australian government data synchronization
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    agency = models.CharField(
        _("Government Agency"),
        max_length=50,
        choices=[
            ('SAFE_WORK_AU', _('Safe Work Australia')),
            ('ACCC', _('Australian Competition and Consumer Commission')),
            ('APVMA', _('Australian Pesticides and Veterinary Medicines Authority')),
            ('TGA', _('Therapeutic Goods Administration')),
            ('NICNAS', _('National Industrial Chemicals Notification and Assessment Scheme')),
        ]
    )
    
    dataset_name = models.CharField(
        _("Dataset Name"),
        max_length=200,
        help_text=_("Name of the specific dataset being synchronized")
    )
    
    last_sync_date = models.DateTimeField(
        _("Last Sync Date"),
        null=True,
        blank=True
    )
    
    next_scheduled_sync = models.DateTimeField(
        _("Next Scheduled Sync"),
        null=True,
        blank=True
    )
    
    sync_frequency = models.CharField(
        _("Sync Frequency"),
        max_length=20,
        choices=[
            ('DAILY', _('Daily')),
            ('WEEKLY', _('Weekly')),
            ('MONTHLY', _('Monthly')),
            ('QUARTERLY', _('Quarterly')),
        ],
        default='MONTHLY'
    )
    
    api_endpoint = models.URLField(
        _("API Endpoint"),
        blank=True,
        help_text=_("Government API endpoint for this dataset")
    )
    
    download_url = models.URLField(
        _("Download URL"),
        blank=True,
        help_text=_("Direct download URL for dataset files")
    )
    
    last_file_hash = models.CharField(
        _("Last File Hash"),
        max_length=64,
        blank=True,
        help_text=_("Hash of the last downloaded file for change detection")
    )
    
    records_in_source = models.PositiveIntegerField(
        _("Records in Source"),
        null=True,
        blank=True,
        help_text=_("Number of records in the government source")
    )
    
    records_imported = models.PositiveIntegerField(
        _("Records Imported"),
        default=0,
        help_text=_("Number of records successfully imported to our database")
    )
    
    sync_status = models.CharField(
        _("Sync Status"),
        max_length=20,
        choices=[
            ('PENDING', _('Pending')),
            ('RUNNING', _('Running')),
            ('COMPLETED', _('Completed')),
            ('FAILED', _('Failed')),
            ('PARTIAL', _('Partial Success')),
        ],
        default='PENDING'
    )
    
    last_error = models.TextField(
        _("Last Error"),
        blank=True,
        help_text=_("Description of the most recent sync error")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Australian Government SDS Sync")
        verbose_name_plural = _("Australian Government SDS Syncs")
        unique_together = ['agency', 'dataset_name']
        indexes = [
            models.Index(fields=['agency', 'sync_status']),
            models.Index(fields=['next_scheduled_sync']),
            models.Index(fields=['last_sync_date']),
        ]
        ordering = ['agency', 'dataset_name']
    
    def __str__(self):
        return f"{self.get_agency_display()} - {self.dataset_name}"
    
    @property
    def is_sync_due(self) -> bool:
        """Check if a sync is due based on the schedule"""
        if not self.next_scheduled_sync:
            return True
        return timezone.now() >= self.next_scheduled_sync
    
    def calculate_next_sync(self) -> datetime:
        """Calculate the next sync date based on frequency"""
        base_date = self.last_sync_date or timezone.now()
        
        frequency_deltas = {
            'DAILY': timedelta(days=1),
            'WEEKLY': timedelta(weeks=1),
            'MONTHLY': timedelta(days=30),
            'QUARTERLY': timedelta(days=90),
        }
        
        delta = frequency_deltas.get(self.sync_frequency, timedelta(days=30))
        return base_date + delta


# Add indexes for better performance on the existing SafetyDataSheet model
class SafetyDataSheetIndex(models.Model):
    """
    Additional indexes for the existing SafetyDataSheet model
    """
    class Meta:
        managed = False  # Don't create a table for this
        db_table = 'sds_safetydatasheet'  # Point to existing table
        indexes = [
            # Australian-specific indexes
            models.Index(fields=['country_code'], name='sds_country_code_idx'),
            models.Index(fields=['status', 'country_code'], name='sds_status_country_idx'),
            models.Index(fields=['dangerous_good', 'country_code'], name='sds_dg_country_idx'),
            
            # Data quality indexes
            models.Index(fields=['revision_date', 'status'], name='sds_revision_status_idx'),
            models.Index(fields=['manufacturer', 'status'], name='sds_manufacturer_status_idx'),
            
            # Search optimization
            models.Index(fields=['product_name', 'manufacturer'], name='sds_product_search_idx'),
            
            # pH-specific indexes for Class 8 materials
            models.Index(fields=['ph_source', 'ph_extraction_confidence'], name='sds_ph_quality_idx'),
        ]