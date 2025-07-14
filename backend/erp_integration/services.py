import json
import requests
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from celery import shared_task

from .models import (
    ERPSystem, IntegrationEndpoint, DataSyncJob, ERPMapping,
    ERPEventLog, ERPDataBuffer, ERPConfiguration
)
from shipments.models import Shipment
from companies.models import Company

logger = logging.getLogger(__name__)


class ERPIntegrationService:
    """Core service for ERP integration operations"""
    
    def __init__(self, erp_system: ERPSystem):
        self.erp_system = erp_system
        self.config = self._load_configuration()
    
    def _load_configuration(self) -> Dict[str, Any]:
        """Load ERP system configuration"""
        config = {}
        for conf in self.erp_system.configurations.all():
            config[conf.config_key] = conf.config_value
        return config
    
    def test_connection(self) -> Dict[str, Any]:
        """Test connection to ERP system"""
        try:
            if self.erp_system.connection_type == 'rest_api':
                return self._test_rest_connection()
            elif self.erp_system.connection_type == 'soap':
                return self._test_soap_connection()
            elif self.erp_system.connection_type == 'database':
                return self._test_database_connection()
            else:
                return {'success': False, 'error': 'Unsupported connection type'}
                
        except Exception as e:
            logger.error(f"Connection test failed for {self.erp_system.name}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _test_rest_connection(self) -> Dict[str, Any]:
        """Test REST API connection"""
        auth_config = self.erp_system.authentication_config
        headers = self._build_headers(auth_config)
        
        # Use health check endpoint if configured, otherwise use base URL
        test_url = self.config.get('health_check_endpoint', self.erp_system.base_url)
        
        response = requests.get(
            test_url,
            headers=headers,
            timeout=30,
            verify=auth_config.get('verify_ssl', True)
        )
        
        if response.status_code == 200:
            return {'success': True, 'response_time': response.elapsed.total_seconds()}
        else:
            return {
                'success': False,
                'error': f'HTTP {response.status_code}: {response.text}'
            }
    
    def _test_soap_connection(self) -> Dict[str, Any]:
        """Test SOAP connection"""
        # Implementation for SOAP testing
        return {'success': True, 'message': 'SOAP connection test not implemented'}
    
    def _test_database_connection(self) -> Dict[str, Any]:
        """Test database connection"""
        # Implementation for database testing
        return {'success': True, 'message': 'Database connection test not implemented'}
    
    def _build_headers(self, auth_config: Dict[str, Any]) -> Dict[str, str]:
        """Build HTTP headers for API requests"""
        headers = {'Content-Type': 'application/json'}
        
        auth_type = auth_config.get('type')
        
        if auth_type == 'api_key':
            key = auth_config.get('api_key')
            header_name = auth_config.get('header_name', 'X-API-Key')
            headers[header_name] = key
        
        elif auth_type == 'bearer':
            token = auth_config.get('token')
            headers['Authorization'] = f'Bearer {token}'
        
        elif auth_type == 'basic':
            import base64
            username = auth_config.get('username')
            password = auth_config.get('password')
            credentials = base64.b64encode(f'{username}:{password}'.encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        # Add custom headers
        custom_headers = auth_config.get('custom_headers', {})
        headers.update(custom_headers)
        
        return headers
    
    def sync_data(self, endpoint: IntegrationEndpoint, direction: str, 
                  data: Optional[Dict[str, Any]] = None) -> DataSyncJob:
        """Initiate data synchronization"""
        
        # Create sync job
        sync_job = DataSyncJob.objects.create(
            erp_system=self.erp_system,
            endpoint=endpoint,
            job_type='manual',
            direction=direction,
            status='pending'
        )
        
        # Queue async task
        sync_data_async.delay(sync_job.id, data)
        
        return sync_job
    
    def transform_data(self, data: Dict[str, Any], endpoint: IntegrationEndpoint, 
                      direction: str) -> Dict[str, Any]:
        """Transform data using field mappings"""
        mappings = endpoint.field_mappings.filter(is_active=True)
        transformed = {}
        
        for mapping in mappings:
            try:
                if direction == 'push':
                    # SafeShipper -> ERP
                    source_field = mapping.safeshipper_field
                    target_field = mapping.erp_field
                else:
                    # ERP -> SafeShipper
                    source_field = mapping.erp_field
                    target_field = mapping.safeshipper_field
                
                # Extract source value
                source_value = self._extract_field_value(data, source_field)
                
                # Apply transformation
                transformed_value = self._apply_transformation(
                    source_value, mapping.transformation_rules, mapping.mapping_type
                )
                
                # Set target value
                self._set_field_value(transformed, target_field, transformed_value)
                
            except Exception as e:
                logger.error(f"Mapping error for {mapping}: {str(e)}")
                continue
        
        return transformed
    
    def _extract_field_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """Extract value from nested data structure using dot notation"""
        keys = field_path.split('.')
        value = data
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
            
            if value is None:
                break
        
        return value
    
    def _set_field_value(self, data: Dict[str, Any], field_path: str, value: Any):
        """Set value in nested data structure using dot notation"""
        keys = field_path.split('.')
        current = data
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
    
    def _apply_transformation(self, value: Any, rules: Dict[str, Any], 
                            mapping_type: str) -> Any:
        """Apply transformation rules to a value"""
        if mapping_type == 'direct':
            return value
        
        elif mapping_type == 'constant':
            return rules.get('constant_value')
        
        elif mapping_type == 'lookup':
            lookup_table = rules.get('lookup_table', {})
            return lookup_table.get(str(value), value)
        
        elif mapping_type == 'calculated':
            # Simple calculation rules
            operation = rules.get('operation')
            if operation == 'multiply':
                factor = rules.get('factor', 1)
                return float(value) * factor if value is not None else None
            elif operation == 'format_date':
                format_string = rules.get('format', '%Y-%m-%d')
                if isinstance(value, datetime):
                    return value.strftime(format_string)
                return value
        
        elif mapping_type == 'transform':
            # Custom transformation logic
            transform_type = rules.get('type')
            if transform_type == 'currency_conversion':
                rate = rules.get('conversion_rate', 1)
                return float(value) * rate if value is not None else None
            elif transform_type == 'status_mapping':
                status_map = rules.get('status_mapping', {})
                return status_map.get(value, value)
        
        return value
    
    def log_event(self, event_type: str, message: str, severity: str = 'info',
                  details: Optional[Dict[str, Any]] = None, sync_job: Optional[DataSyncJob] = None):
        """Log ERP integration event"""
        ERPEventLog.objects.create(
            erp_system=self.erp_system,
            sync_job=sync_job,
            event_type=event_type,
            severity=severity,
            message=message,
            details=details or {}
        )


class ShipmentSyncService:
    """Service for synchronizing shipment data with ERP systems"""
    
    def __init__(self, erp_system: ERPSystem):
        self.erp_system = erp_system
        self.integration_service = ERPIntegrationService(erp_system)
    
    def sync_shipment_to_erp(self, shipment: Shipment) -> bool:
        """Sync shipment data to ERP system"""
        try:
            # Find shipment endpoint
            endpoint = self.erp_system.endpoints.filter(
                endpoint_type='shipments',
                sync_direction__in=['push', 'bidirectional'],
                is_active=True
            ).first()
            
            if not endpoint:
                logger.warning(f"No active shipment endpoint for {self.erp_system.name}")
                return False
            
            # Prepare shipment data
            shipment_data = self._prepare_shipment_data(shipment)
            
            # Transform data
            transformed_data = self.integration_service.transform_data(
                shipment_data, endpoint, 'push'
            )
            
            # Send to ERP
            return self._send_to_erp(endpoint, transformed_data)
            
        except Exception as e:
            logger.error(f"Failed to sync shipment {shipment.id} to {self.erp_system.name}: {str(e)}")
            self.integration_service.log_event(
                'sync_failed',
                f"Failed to sync shipment {shipment.tracking_number}",
                'error',
                {'shipment_id': str(shipment.id), 'error': str(e)}
            )
            return False
    
    def _prepare_shipment_data(self, shipment: Shipment) -> Dict[str, Any]:
        """Prepare shipment data for ERP sync"""
        return {
            'id': str(shipment.id),
            'tracking_number': shipment.tracking_number,
            'reference_number': shipment.reference_number,
            'status': shipment.status,
            'customer': {
                'id': str(shipment.customer.id),
                'name': shipment.customer.name
            },
            'carrier': {
                'id': str(shipment.carrier.id),
                'name': shipment.carrier.name
            },
            'origin_location': shipment.origin_location,
            'destination_location': shipment.destination_location,
            'freight_type': shipment.freight_type.code if shipment.freight_type else None,
            'created_at': shipment.created_at.isoformat(),
            'updated_at': shipment.updated_at.isoformat()
        }
    
    def _send_to_erp(self, endpoint: IntegrationEndpoint, data: Dict[str, Any]) -> bool:
        """Send data to ERP endpoint"""
        try:
            auth_config = self.erp_system.authentication_config
            headers = self.integration_service._build_headers(auth_config)
            
            # Build full URL
            url = f"{self.erp_system.base_url.rstrip('/')}/{endpoint.path.lstrip('/')}"
            
            # Send request
            response = requests.request(
                method=endpoint.http_method,
                url=url,
                json=data,
                headers=headers,
                timeout=60
            )
            
            if response.status_code in [200, 201, 202]:
                self.integration_service.log_event(
                    'data_pushed',
                    f"Successfully pushed data to {endpoint.name}",
                    'info',
                    {'endpoint': endpoint.name, 'response_code': response.status_code}
                )
                return True
            else:
                logger.error(f"ERP request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send data to ERP: {str(e)}")
            return False


class ERPDataMappingService:
    """Service for managing ERP data mappings and transformations"""
    
    @staticmethod
    def create_standard_mappings(erp_system: ERPSystem, endpoint: IntegrationEndpoint):
        """Create standard field mappings for common ERP integrations"""
        
        if endpoint.endpoint_type == 'shipments':
            mappings = [
                {
                    'safeshipper_field': 'tracking_number',
                    'erp_field': 'shipment_number',
                    'mapping_type': 'direct',
                    'is_required': True
                },
                {
                    'safeshipper_field': 'status',
                    'erp_field': 'status_code',
                    'mapping_type': 'lookup',
                    'transformation_rules': {
                        'lookup_table': {
                            'PENDING': 'P',
                            'IN_TRANSIT': 'T',
                            'DELIVERED': 'D',
                            'EXCEPTION': 'E'
                        }
                    }
                },
                {
                    'safeshipper_field': 'customer.name',
                    'erp_field': 'customer_name',
                    'mapping_type': 'direct'
                },
                {
                    'safeshipper_field': 'created_at',
                    'erp_field': 'created_date',
                    'mapping_type': 'calculated',
                    'transformation_rules': {
                        'operation': 'format_date',
                        'format': '%Y-%m-%d'
                    }
                }
            ]
            
            for mapping_data in mappings:
                ERPMapping.objects.get_or_create(
                    erp_system=erp_system,
                    endpoint=endpoint,
                    safeshipper_field=mapping_data['safeshipper_field'],
                    erp_field=mapping_data['erp_field'],
                    defaults=mapping_data
                )
    
    @staticmethod
    def validate_mappings(endpoint: IntegrationEndpoint) -> List[str]:
        """Validate field mappings for an endpoint"""
        errors = []
        mappings = endpoint.field_mappings.filter(is_active=True)
        
        required_mappings = mappings.filter(is_required=True)
        for mapping in required_mappings:
            if not mapping.safeshipper_field or not mapping.erp_field:
                errors.append(f"Required mapping incomplete: {mapping}")
        
        return errors


@shared_task
def sync_data_async(sync_job_id: str, data: Optional[Dict[str, Any]] = None):
    """Async task for data synchronization"""
    try:
        sync_job = DataSyncJob.objects.get(id=sync_job_id)
        sync_job.status = 'running'
        sync_job.started_at = timezone.now()
        sync_job.save()
        
        integration_service = ERPIntegrationService(sync_job.erp_system)
        
        if sync_job.direction == 'push':
            result = _execute_push_sync(sync_job, integration_service, data)
        else:
            result = _execute_pull_sync(sync_job, integration_service)
        
        # Update job status
        sync_job.status = 'completed' if result['success'] else 'failed'
        sync_job.completed_at = timezone.now()
        sync_job.records_processed = result.get('processed', 0)
        sync_job.records_successful = result.get('successful', 0)
        sync_job.records_failed = result.get('failed', 0)
        
        if not result['success']:
            sync_job.error_message = result.get('error', 'Unknown error')
        
        sync_job.save()
        
        # Log completion
        integration_service.log_event(
            'sync_completed',
            f"Sync job completed: {sync_job.records_successful}/{sync_job.records_processed} successful",
            'info' if result['success'] else 'error',
            sync_job=sync_job
        )
        
    except Exception as e:
        logger.error(f"Sync job {sync_job_id} failed: {str(e)}")
        try:
            sync_job = DataSyncJob.objects.get(id=sync_job_id)
            sync_job.status = 'failed'
            sync_job.error_message = str(e)
            sync_job.completed_at = timezone.now()
            sync_job.save()
        except:
            pass


def _execute_push_sync(sync_job: DataSyncJob, integration_service: ERPIntegrationService,
                      data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Execute push synchronization"""
    try:
        endpoint = sync_job.endpoint
        
        if data:
            # Single record sync
            transformed_data = integration_service.transform_data(data, endpoint, 'push')
            success = _send_data_to_erp(sync_job.erp_system, endpoint, transformed_data)
            return {
                'success': success,
                'processed': 1,
                'successful': 1 if success else 0,
                'failed': 0 if success else 1
            }
        else:
            # Bulk sync from buffer
            buffer_records = ERPDataBuffer.objects.filter(
                erp_system=sync_job.erp_system,
                endpoint=endpoint,
                buffer_type='outbound',
                is_processed=False
            )[:100]  # Process in batches
            
            processed = 0
            successful = 0
            failed = 0
            
            for record in buffer_records:
                try:
                    transformed_data = integration_service.transform_data(
                        record.transformed_data, endpoint, 'push'
                    )
                    
                    if _send_data_to_erp(sync_job.erp_system, endpoint, transformed_data):
                        record.is_processed = True
                        record.processed_at = timezone.now()
                        successful += 1
                    else:
                        record.retry_count += 1
                        record.error_message = "Failed to send to ERP"
                        failed += 1
                    
                    record.save()
                    processed += 1
                    
                except Exception as e:
                    record.retry_count += 1
                    record.error_message = str(e)
                    record.save()
                    failed += 1
                    processed += 1
            
            return {
                'success': failed == 0,
                'processed': processed,
                'successful': successful,
                'failed': failed
            }
            
    except Exception as e:
        return {'success': False, 'error': str(e)}


def _execute_pull_sync(sync_job: DataSyncJob, integration_service: ERPIntegrationService) -> Dict[str, Any]:
    """Execute pull synchronization"""
    try:
        # Implementation for pulling data from ERP
        return {
            'success': True,
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'message': 'Pull sync not implemented'
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def _send_data_to_erp(erp_system: ERPSystem, endpoint: IntegrationEndpoint,
                     data: Dict[str, Any]) -> bool:
    """Send data to ERP system endpoint"""
    try:
        integration_service = ERPIntegrationService(erp_system)
        auth_config = erp_system.authentication_config
        headers = integration_service._build_headers(auth_config)
        
        url = f"{erp_system.base_url.rstrip('/')}/{endpoint.path.lstrip('/')}"
        
        response = requests.request(
            method=endpoint.http_method,
            url=url,
            json=data,
            headers=headers,
            timeout=60
        )
        
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        logger.error(f"Failed to send data to ERP: {str(e)}")
        return False


@shared_task
def cleanup_old_sync_jobs():
    """Clean up old sync job records"""
    cutoff_date = timezone.now() - timedelta(days=30)
    
    deleted_count = DataSyncJob.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['completed', 'failed', 'cancelled']
    ).delete()[0]
    
    logger.info(f"Cleaned up {deleted_count} old sync job records")
    return deleted_count


@shared_task
def cleanup_expired_buffer_data():
    """Clean up expired buffer data"""
    now = timezone.now()
    
    deleted_count = ERPDataBuffer.objects.filter(
        expires_at__lt=now
    ).delete()[0]
    
    logger.info(f"Cleaned up {deleted_count} expired buffer records")
    return deleted_count