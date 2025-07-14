from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ERPSystem, IntegrationEndpoint, DataSyncJob, ERPMapping,
    ERPEventLog, ERPDataBuffer, ERPConfiguration
)
from companies.models import Company

User = get_user_model()


class ERPSystemSerializer(serializers.ModelSerializer):
    """Serializer for ERP System configuration"""
    
    company_name = serializers.CharField(source='company.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    system_type_display = serializers.CharField(source='get_system_type_display', read_only=True)
    connection_type_display = serializers.CharField(source='get_connection_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Computed fields
    endpoint_count = serializers.SerializerMethodField()
    last_sync_status = serializers.SerializerMethodField()
    
    class Meta:
        model = ERPSystem
        fields = [
            'id', 'name', 'system_type', 'system_type_display',
            'connection_type', 'connection_type_display', 'company',
            'company_name', 'base_url', 'connection_config',
            'authentication_config', 'sync_frequency_minutes',
            'enabled_modules', 'legacy_field_mappings', 'status',
            'status_display', 'last_sync_at', 'last_error', 'error_count',
            'push_enabled', 'pull_enabled', 'bidirectional_sync',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'endpoint_count', 'last_sync_status'
        ]
        read_only_fields = [
            'id', 'last_sync_at', 'last_error', 'error_count',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'authentication_config': {'write_only': True}
        }
    
    def get_endpoint_count(self, obj):
        """Get count of active endpoints"""
        return obj.endpoints.filter(is_active=True).count()
    
    def get_last_sync_status(self, obj):
        """Get status of last sync job"""
        last_sync = obj.sync_jobs.order_by('-created_at').first()
        return last_sync.status if last_sync else None
    
    def validate_authentication_config(self, value):
        """Validate authentication configuration"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Authentication config must be a dictionary")
        
        auth_type = value.get('type')
        if auth_type not in ['api_key', 'bearer', 'basic', 'oauth2']:
            raise serializers.ValidationError("Invalid authentication type")
        
        if auth_type == 'api_key' and not value.get('api_key'):
            raise serializers.ValidationError("API key is required for api_key authentication")
        
        if auth_type == 'basic' and not (value.get('username') and value.get('password')):
            raise serializers.ValidationError("Username and password are required for basic authentication")
        
        return value


class IntegrationEndpointSerializer(serializers.ModelSerializer):
    """Serializer for integration endpoints"""
    
    erp_system_name = serializers.CharField(source='erp_system.name', read_only=True)
    endpoint_type_display = serializers.CharField(source='get_endpoint_type_display', read_only=True)
    http_method_display = serializers.CharField(source='get_http_method_display', read_only=True)
    sync_direction_display = serializers.CharField(source='get_sync_direction_display', read_only=True)
    
    # Computed fields
    mapping_count = serializers.SerializerMethodField()
    last_sync_at = serializers.SerializerMethodField()
    
    class Meta:
        model = IntegrationEndpoint
        fields = [
            'id', 'erp_system', 'erp_system_name', 'name', 'endpoint_type',
            'endpoint_type_display', 'path', 'http_method', 'http_method_display',
            'request_template', 'response_mapping', 'headers', 'sync_direction',
            'sync_direction_display', 'is_active', 'created_at', 'updated_at',
            'mapping_count', 'last_sync_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_mapping_count(self, obj):
        """Get count of active field mappings"""
        return obj.field_mappings.filter(is_active=True).count()
    
    def get_last_sync_at(self, obj):
        """Get timestamp of last sync"""
        last_sync = obj.sync_jobs.order_by('-created_at').first()
        return last_sync.created_at if last_sync else None


class ERPMappingSerializer(serializers.ModelSerializer):
    """Serializer for ERP field mappings"""
    
    erp_system_name = serializers.CharField(source='erp_system.name', read_only=True)
    endpoint_name = serializers.CharField(source='endpoint.name', read_only=True)
    mapping_type_display = serializers.CharField(source='get_mapping_type_display', read_only=True)
    
    class Meta:
        model = ERPMapping
        fields = [
            'id', 'erp_system', 'erp_system_name', 'endpoint', 'endpoint_name',
            'safeshipper_field', 'erp_field', 'mapping_type', 'mapping_type_display',
            'transformation_rules', 'default_value', 'is_required',
            'validation_rules', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_transformation_rules(self, value):
        """Validate transformation rules"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Transformation rules must be a dictionary")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        mapping_type = data.get('mapping_type')
        transformation_rules = data.get('transformation_rules', {})
        
        if mapping_type == 'constant' and not transformation_rules.get('constant_value'):
            raise serializers.ValidationError({
                'transformation_rules': 'Constant value is required for constant mapping type'
            })
        
        if mapping_type == 'lookup' and not transformation_rules.get('lookup_table'):
            raise serializers.ValidationError({
                'transformation_rules': 'Lookup table is required for lookup mapping type'
            })
        
        return data


class DataSyncJobSerializer(serializers.ModelSerializer):
    """Serializer for data sync jobs"""
    
    erp_system_name = serializers.CharField(source='erp_system.name', read_only=True)
    endpoint_name = serializers.CharField(source='endpoint.name', read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True)
    job_type_display = serializers.CharField(source='get_job_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    
    # Computed fields
    duration_seconds = serializers.SerializerMethodField()
    success_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = DataSyncJob
        fields = [
            'id', 'erp_system', 'erp_system_name', 'endpoint', 'endpoint_name',
            'job_type', 'job_type_display', 'direction', 'direction_display',
            'status', 'status_display', 'started_at', 'completed_at',
            'records_processed', 'records_successful', 'records_failed',
            'error_message', 'error_details', 'retry_count', 'max_retries',
            'request_payload', 'response_data', 'initiated_by', 'initiated_by_name',
            'created_at', 'duration_seconds', 'success_rate'
        ]
        read_only_fields = [
            'id', 'status', 'started_at', 'completed_at', 'records_processed',
            'records_successful', 'records_failed', 'error_message',
            'error_details', 'retry_count', 'response_data', 'created_at'
        ]
    
    def get_duration_seconds(self, obj):
        """Get job duration in seconds"""
        if obj.duration:
            return obj.duration.total_seconds()
        return None


class ERPEventLogSerializer(serializers.ModelSerializer):
    """Serializer for ERP event logs"""
    
    erp_system_name = serializers.CharField(source='erp_system.name', read_only=True)
    sync_job_id = serializers.CharField(source='sync_job.id', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = ERPEventLog
        fields = [
            'id', 'erp_system', 'erp_system_name', 'sync_job', 'sync_job_id',
            'event_type', 'event_type_display', 'severity', 'severity_display',
            'message', 'details', 'endpoint_path', 'record_id', 'timestamp',
            'user', 'user_name'
        ]
        read_only_fields = ['id', 'timestamp']


class ERPDataBufferSerializer(serializers.ModelSerializer):
    """Serializer for ERP data buffer"""
    
    erp_system_name = serializers.CharField(source='erp_system.name', read_only=True)
    endpoint_name = serializers.CharField(source='endpoint.name', read_only=True)
    buffer_type_display = serializers.CharField(source='get_buffer_type_display', read_only=True)
    
    class Meta:
        model = ERPDataBuffer
        fields = [
            'id', 'erp_system', 'erp_system_name', 'endpoint', 'endpoint_name',
            'buffer_type', 'buffer_type_display', 'object_type', 'object_id',
            'raw_data', 'transformed_data', 'external_id', 'is_processed',
            'processed_at', 'error_message', 'retry_count', 'created_at', 'expires_at'
        ]
        read_only_fields = ['id', 'processed_at', 'created_at']


class ERPConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for ERP configuration settings"""
    
    erp_system_name = serializers.CharField(source='erp_system.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    config_type_display = serializers.CharField(source='get_config_type_display', read_only=True)
    
    class Meta:
        model = ERPConfiguration
        fields = [
            'id', 'erp_system', 'erp_system_name', 'config_type', 'config_type_display',
            'config_key', 'config_value', 'description', 'is_sensitive',
            'is_editable', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'config_value': {'write_only': True}
        }
    
    def to_representation(self, instance):
        """Mask sensitive configuration values"""
        ret = super().to_representation(instance)
        if instance.is_sensitive:
            ret['config_value'] = '***MASKED***'
        return ret


# Summary serializers for dashboard views
class ERPSystemSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for ERP system summaries"""
    
    system_type_display = serializers.CharField(source='get_system_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    endpoint_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ERPSystem
        fields = [
            'id', 'name', 'system_type', 'system_type_display',
            'status', 'status_display', 'last_sync_at', 'endpoint_count'
        ]
    
    def get_endpoint_count(self, obj):
        return obj.endpoints.filter(is_active=True).count()


class SyncJobSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for sync job summaries"""
    
    erp_system_name = serializers.CharField(source='erp_system.name', read_only=True)
    endpoint_name = serializers.CharField(source='endpoint.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = DataSyncJob
        fields = [
            'id', 'erp_system_name', 'endpoint_name', 'status', 'status_display',
            'records_processed', 'records_successful', 'records_failed',
            'created_at', 'completed_at'
        ]


# Manifest import specific serializers
class ManifestImportRequestSerializer(serializers.Serializer):
    """Serializer for manifest import requests"""
    
    erp_system_id = serializers.UUIDField()
    external_reference = serializers.CharField(max_length=200)
    manifest_type = serializers.ChoiceField(choices=[
        ('shipment', 'Shipment Manifest'),
        ('invoice', 'Commercial Invoice'),
        ('packing_list', 'Packing List'),
        ('customs', 'Customs Declaration')
    ])
    import_dangerous_goods = serializers.BooleanField(default=True)
    create_shipment = serializers.BooleanField(default=True)
    preserve_external_ids = serializers.BooleanField(default=True)
    
    def validate_erp_system_id(self, value):
        """Validate that ERP system exists and is active"""
        try:
            erp_system = ERPSystem.objects.get(id=value)
            if erp_system.status != 'active':
                raise serializers.ValidationError("ERP system is not active")
            return value
        except ERPSystem.DoesNotExist:
            raise serializers.ValidationError("ERP system not found")


class ManifestImportResponseSerializer(serializers.Serializer):
    """Serializer for manifest import responses"""
    
    success = serializers.BooleanField()
    message = serializers.CharField()
    shipment_id = serializers.UUIDField(required=False)
    manifest_id = serializers.UUIDField(required=False)
    external_reference = serializers.CharField(required=False)
    dangerous_goods_found = serializers.IntegerField(required=False)
    errors = serializers.ListField(child=serializers.CharField(), required=False)
    warnings = serializers.ListField(child=serializers.CharField(), required=False)