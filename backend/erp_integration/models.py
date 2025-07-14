import uuid
import json
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import URLValidator
from companies.models import Company
from shipments.models import Shipment

User = get_user_model()

class ERPSystem(models.Model):
    """External ERP system configurations"""
    
    SYSTEM_TYPES = [
        ('sap', 'SAP'),
        ('oracle', 'Oracle ERP'),
        ('netsuite', 'NetSuite'),
        ('dynamics', 'Microsoft Dynamics'),
        ('workday', 'Workday'),
        ('sage', 'Sage'),
        ('custom', 'Custom System'),
        ('generic', 'Generic REST API'),
    ]
    
    CONNECTION_TYPES = [
        ('rest_api', 'REST API'),
        ('soap', 'SOAP Web Service'),
        ('sftp', 'SFTP File Transfer'),
        ('database', 'Direct Database'),
        ('message_queue', 'Message Queue'),
        ('webhook', 'Webhook'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('testing', 'Testing'),
        ('maintenance', 'Maintenance'),
        ('error', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    system_type = models.CharField(max_length=20, choices=SYSTEM_TYPES)
    connection_type = models.CharField(max_length=20, choices=CONNECTION_TYPES)
    
    # Company association
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='erp_systems')
    
    # Connection details
    base_url = models.URLField(blank=True, help_text="Base URL for API connections")
    connection_config = models.JSONField(default=dict, help_text="Connection configuration details")
    authentication_config = models.JSONField(default=dict, help_text="Authentication credentials and settings")
    
    # Integration settings
    sync_frequency_minutes = models.IntegerField(default=60, help_text="Sync frequency in minutes")
    enabled_modules = models.JSONField(default=list, help_text="List of enabled integration modules")
    legacy_field_mappings = models.JSONField(default=dict, help_text="Legacy field mapping configurations")
    
    # Status and monitoring
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    error_count = models.IntegerField(default=0)
    
    # Data flow settings
    push_enabled = models.BooleanField(default=True, help_text="Push data to ERP system")
    pull_enabled = models.BooleanField(default=True, help_text="Pull data from ERP system")
    bidirectional_sync = models.BooleanField(default=False, help_text="Enable bidirectional synchronization")
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['company', 'name']
        unique_together = ['company', 'name']
    
    def __str__(self):
        return f"{self.company.name} - {self.name} ({self.get_system_type_display()})"


class IntegrationEndpoint(models.Model):
    """Specific integration endpoints for ERP systems"""
    
    ENDPOINT_TYPES = [
        ('customers', 'Customer Management'),
        ('orders', 'Order Management'),
        ('shipments', 'Shipment Tracking'),
        ('invoicing', 'Invoicing'),
        ('inventory', 'Inventory Management'),
        ('financials', 'Financial Data'),
        ('master_data', 'Master Data'),
        ('documents', 'Document Management'),
    ]
    
    HTTP_METHODS = [
        ('GET', 'GET'),
        ('POST', 'POST'),
        ('PUT', 'PUT'),
        ('PATCH', 'PATCH'),
        ('DELETE', 'DELETE'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    erp_system = models.ForeignKey(ERPSystem, on_delete=models.CASCADE, related_name='endpoints')
    
    # Endpoint configuration
    name = models.CharField(max_length=200)
    endpoint_type = models.CharField(max_length=20, choices=ENDPOINT_TYPES)
    path = models.CharField(max_length=500, help_text="API endpoint path")
    http_method = models.CharField(max_length=10, choices=HTTP_METHODS, default='POST')
    
    # Request/Response configuration
    request_template = models.JSONField(default=dict, help_text="Request template/schema")
    response_mapping = models.JSONField(default=dict, help_text="Response field mappings")
    headers = models.JSONField(default=dict, help_text="Required headers")
    
    # Sync settings
    sync_direction = models.CharField(max_length=20, choices=[
        ('push', 'Push to ERP'),
        ('pull', 'Pull from ERP'),
        ('bidirectional', 'Bidirectional')
    ], default='push')
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['erp_system', 'endpoint_type', 'name']
        unique_together = ['erp_system', 'endpoint_type', 'name']
    
    def __str__(self):
        return f"{self.erp_system.name} - {self.name}"


class DataSyncJob(models.Model):
    """Data synchronization job tracking"""
    
    JOB_TYPES = [
        ('manual', 'Manual Sync'),
        ('scheduled', 'Scheduled Sync'),
        ('triggered', 'Event Triggered'),
        ('bulk', 'Bulk Import/Export'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('partial', 'Partially Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    erp_system = models.ForeignKey(ERPSystem, on_delete=models.CASCADE, related_name='sync_jobs')
    endpoint = models.ForeignKey(IntegrationEndpoint, on_delete=models.CASCADE, related_name='sync_jobs')
    
    # Job details
    job_type = models.CharField(max_length=20, choices=JOB_TYPES)
    direction = models.CharField(max_length=20, choices=[
        ('push', 'Push to ERP'),
        ('pull', 'Pull from ERP')
    ])
    
    # Execution details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Data tracking
    records_processed = models.IntegerField(default=0)
    records_successful = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    
    # Error handling
    error_message = models.TextField(blank=True)
    error_details = models.JSONField(default=dict)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    # Payload and response
    request_payload = models.JSONField(default=dict)
    response_data = models.JSONField(default=dict)
    
    # Metadata
    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['erp_system', 'status']),
            models.Index(fields=['endpoint', 'created_at']),
            models.Index(fields=['status', 'started_at']),
        ]
    
    def __str__(self):
        return f"{self.erp_system.name} - {self.endpoint.name} ({self.status})"
    
    @property
    def duration(self):
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    @property
    def success_rate(self):
        if self.records_processed > 0:
            return (self.records_successful / self.records_processed) * 100
        return 0


class ERPMapping(models.Model):
    """Field mappings between SafeShipper and ERP systems"""
    
    MAPPING_TYPES = [
        ('direct', 'Direct Field Mapping'),
        ('transform', 'Data Transformation'),
        ('lookup', 'Lookup Table'),
        ('calculated', 'Calculated Field'),
        ('constant', 'Constant Value'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    erp_system = models.ForeignKey(ERPSystem, on_delete=models.CASCADE, related_name='field_mappings')
    endpoint = models.ForeignKey(IntegrationEndpoint, on_delete=models.CASCADE, related_name='field_mappings')
    
    # Mapping configuration
    safeshipper_field = models.CharField(max_length=200, help_text="SafeShipper field path")
    erp_field = models.CharField(max_length=200, help_text="ERP system field path")
    mapping_type = models.CharField(max_length=20, choices=MAPPING_TYPES, default='direct')
    
    # Transformation rules
    transformation_rules = models.JSONField(default=dict, help_text="Transformation rules and logic")
    default_value = models.CharField(max_length=500, blank=True)
    
    # Validation
    is_required = models.BooleanField(default=False)
    validation_rules = models.JSONField(default=dict)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['erp_system', 'endpoint', 'safeshipper_field']
        unique_together = ['endpoint', 'safeshipper_field', 'erp_field']
    
    def __str__(self):
        return f"{self.safeshipper_field} -> {self.erp_field}"


class ERPEventLog(models.Model):
    """Event logging for ERP integration activities"""
    
    EVENT_TYPES = [
        ('sync_started', 'Sync Started'),
        ('sync_completed', 'Sync Completed'),
        ('sync_failed', 'Sync Failed'),
        ('data_pushed', 'Data Pushed'),
        ('data_pulled', 'Data Pulled'),
        ('mapping_error', 'Mapping Error'),
        ('connection_error', 'Connection Error'),
        ('authentication_error', 'Authentication Error'),
        ('configuration_changed', 'Configuration Changed'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    erp_system = models.ForeignKey(ERPSystem, on_delete=models.CASCADE, related_name='event_logs')
    sync_job = models.ForeignKey(DataSyncJob, on_delete=models.CASCADE, null=True, blank=True, related_name='event_logs')
    
    # Event details
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='info')
    message = models.TextField()
    details = models.JSONField(default=dict)
    
    # Context
    endpoint_path = models.CharField(max_length=500, blank=True)
    record_id = models.CharField(max_length=100, blank=True)
    
    # Metadata
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['erp_system', 'event_type']),
            models.Index(fields=['severity', 'timestamp']),
            models.Index(fields=['sync_job', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.erp_system.name} ({self.severity})"


class ERPDataBuffer(models.Model):
    """Temporary data buffer for ERP synchronization"""
    
    BUFFER_TYPES = [
        ('outbound', 'Outbound to ERP'),
        ('inbound', 'Inbound from ERP'),
        ('failed', 'Failed Records'),
        ('pending', 'Pending Processing'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    erp_system = models.ForeignKey(ERPSystem, on_delete=models.CASCADE, related_name='data_buffer')
    endpoint = models.ForeignKey(IntegrationEndpoint, on_delete=models.CASCADE, related_name='data_buffer')
    
    # Buffer details
    buffer_type = models.CharField(max_length=20, choices=BUFFER_TYPES)
    object_type = models.CharField(max_length=50, help_text="Type of object (shipment, customer, etc.)")
    object_id = models.UUIDField(help_text="ID of the source object")
    
    # Data
    raw_data = models.JSONField(help_text="Original data before transformation")
    transformed_data = models.JSONField(help_text="Data after transformation")
    external_id = models.CharField(max_length=200, blank=True, help_text="External system ID")
    
    # Processing status
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Buffer record expiration time")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['erp_system', 'buffer_type']),
            models.Index(fields=['object_type', 'object_id']),
            models.Index(fields=['is_processed', 'created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.object_type} ({self.object_id}) - {self.buffer_type}"


class ERPConfiguration(models.Model):
    """Global ERP integration configuration settings"""
    
    CONFIG_TYPES = [
        ('global', 'Global Settings'),
        ('system', 'System Specific'),
        ('endpoint', 'Endpoint Specific'),
        ('mapping', 'Mapping Rules'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    erp_system = models.ForeignKey(ERPSystem, on_delete=models.CASCADE, related_name='configurations')
    
    # Configuration details
    config_type = models.CharField(max_length=20, choices=CONFIG_TYPES)
    config_key = models.CharField(max_length=200)
    config_value = models.JSONField()
    description = models.TextField(blank=True)
    
    # Validation
    is_sensitive = models.BooleanField(default=False, help_text="Contains sensitive data")
    is_editable = models.BooleanField(default=True)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['erp_system', 'config_type', 'config_key']
        unique_together = ['erp_system', 'config_key']
    
    def __str__(self):
        return f"{self.erp_system.name} - {self.config_key}"