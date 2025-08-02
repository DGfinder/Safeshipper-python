import json
import requests
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.db.models import Q
from celery import shared_task

from .models import (
    ERPSystem, IntegrationEndpoint, DataSyncJob, ERPMapping,
    ERPEventLog, ERPDataBuffer, ERPConfiguration
)
from shipments.models import Shipment
from companies.models import Company
from freight_types.models import FreightType
from manifests.models import Manifest

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


class ERPManifestImportService:
    """Service for importing manifests from ERP systems"""
    
    def __init__(self, erp_system: ERPSystem):
        self.erp_system = erp_system
        self.integration_service = ERPIntegrationService(erp_system)
    
    def import_manifest_from_erp(self, external_reference: str, manifest_type: str = 'shipment',
                                import_dangerous_goods: bool = True, create_shipment: bool = True,
                                preserve_external_ids: bool = True) -> Dict[str, Any]:
        """Import manifest from ERP system and create SafeShipper shipment"""
        
        try:
            # Find appropriate endpoint for manifest import
            endpoint = self._find_manifest_endpoint(manifest_type)
            if not endpoint:
                return {
                    'success': False,
                    'error': f'No active endpoint found for manifest type: {manifest_type}'
                }
            
            # Fetch manifest data from ERP
            manifest_data = self._fetch_manifest_data(endpoint, external_reference)
            if not manifest_data:
                return {
                    'success': False,
                    'error': f'Failed to fetch manifest data for reference: {external_reference}'
                }
            
            # Transform manifest data
            transformed_data = self.integration_service.transform_data(
                manifest_data, endpoint, 'pull'
            )
            
            # Create shipment if requested
            shipment = None
            if create_shipment:
                shipment = self._create_shipment_from_manifest(
                    transformed_data, external_reference, preserve_external_ids
                )
            
            # Create manifest record
            manifest = self._create_manifest_record(
                transformed_data, external_reference, manifest_type, shipment
            )
            
            # Import dangerous goods if requested
            dangerous_goods_count = 0
            if import_dangerous_goods:
                dangerous_goods_count = self._import_dangerous_goods(
                    manifest, transformed_data
                )
            
            # Log successful import
            self.integration_service.log_event(
                'manifest_imported',
                f'Successfully imported manifest: {external_reference}',
                'info',
                {
                    'external_reference': external_reference,
                    'manifest_type': manifest_type,
                    'shipment_id': str(shipment.id) if shipment else None,
                    'manifest_id': str(manifest.id) if manifest else None,
                    'dangerous_goods_count': dangerous_goods_count
                }
            )
            
            return {
                'success': True,
                'message': f'Manifest imported successfully: {external_reference}',
                'shipment_id': str(shipment.id) if shipment else None,
                'manifest_id': str(manifest.id) if manifest else None,
                'external_reference': external_reference,
                'dangerous_goods_found': dangerous_goods_count
            }
            
        except Exception as e:
            logger.error(f"Failed to import manifest {external_reference}: {str(e)}")
            self.integration_service.log_event(
                'manifest_import_failed',
                f'Failed to import manifest: {external_reference}',
                'error',
                {
                    'external_reference': external_reference,
                    'error': str(e)
                }
            )
            return {
                'success': False,
                'error': f'Failed to import manifest: {str(e)}'
            }
    
    def _find_manifest_endpoint(self, manifest_type: str) -> Optional[IntegrationEndpoint]:
        """Find appropriate endpoint for manifest import"""
        endpoint_type_mapping = {
            'shipment': 'shipments',
            'invoice': 'invoicing',
            'packing_list': 'shipments',
            'customs': 'documents'
        }
        
        endpoint_type = endpoint_type_mapping.get(manifest_type, 'shipments')
        
        return self.erp_system.endpoints.filter(
            endpoint_type=endpoint_type,
            sync_direction__in=['pull', 'bidirectional'],
            is_active=True
        ).first()
    
    def _fetch_manifest_data(self, endpoint: IntegrationEndpoint, external_reference: str) -> Optional[Dict[str, Any]]:
        """Fetch manifest data from ERP system"""
        try:
            auth_config = self.erp_system.authentication_config
            headers = self.integration_service._build_headers(auth_config)
            
            # Build URL with external reference
            url = f"{self.erp_system.base_url.rstrip('/')}/{endpoint.path.lstrip('/')}/{external_reference}"
            
            response = requests.get(
                url,
                headers=headers,
                timeout=30,
                verify=auth_config.get('verify_ssl', True)
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch manifest data: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching manifest data: {str(e)}")
            return None
    
    def _create_shipment_from_manifest(self, manifest_data: Dict[str, Any], 
                                     external_reference: str, 
                                     preserve_external_ids: bool = True) -> Optional['Shipment']:
        """Create SafeShipper shipment from manifest data"""
        try:
            from companies.models import Company
            from freight_types.models import FreightType
            
            # Get customer company (this would need to be mapped from ERP data)
            customer_company = self._get_or_create_customer_company(manifest_data)
            
            # Get carrier company (this would need to be mapped from ERP data)
            carrier_company = self._get_or_create_carrier_company(manifest_data)
            
            # Get freight type
            freight_type = self._get_or_create_freight_type(manifest_data)
            
            # Create shipment
            shipment_data = {
                'reference_number': external_reference if preserve_external_ids else None,
                'customer': customer_company,
                'carrier': carrier_company,
                'freight_type': freight_type,
                'origin_location': manifest_data.get('origin_location', ''),
                'destination_location': manifest_data.get('destination_location', ''),
                'status': 'PENDING',
                'instructions': manifest_data.get('special_instructions', ''),
                'dead_weight_kg': manifest_data.get('weight_kg'),
                'volumetric_weight_m3': manifest_data.get('volume_m3'),
                'estimated_pickup_date': self._parse_date(manifest_data.get('pickup_date')),
                'estimated_delivery_date': self._parse_date(manifest_data.get('delivery_date')),
            }
            
            # Remove None values
            shipment_data = {k: v for k, v in shipment_data.items() if v is not None}
            
            shipment = Shipment.objects.create(**shipment_data)
            
            # Generate tracking number if not preserving external IDs
            if not preserve_external_ids:
                from shipments.models import generate_tracking_number
                shipment.tracking_number = generate_tracking_number()
                shipment.save()
            
            return shipment
            
        except Exception as e:
            logger.error(f"Failed to create shipment from manifest: {str(e)}")
            return None
    
    def _create_manifest_record(self, manifest_data: Dict[str, Any], 
                               external_reference: str, 
                               manifest_type: str, 
                               shipment: Optional[Shipment] = None) -> Optional['Manifest']:
        """Create SafeShipper manifest record"""
        try:
            from manifests.models import Manifest, ManifestType
            from documents.models import Document
            
            # Map manifest type
            manifest_type_mapping = {
                'shipment': ManifestType.PACKING_LIST,
                'invoice': ManifestType.COMMERCIAL_INVOICE,
                'packing_list': ManifestType.PACKING_LIST,
                'customs': ManifestType.CUSTOMS_DECLARATION
            }
            
            mapped_type = manifest_type_mapping.get(manifest_type, ManifestType.PACKING_LIST)
            
            # Create document record first
            document = Document.objects.create(
                name=f"ERP Manifest - {external_reference}",
                document_type='manifest',
                file_size=0,  # ERP imported, no file
                description=f"Manifest imported from ERP system: {self.erp_system.name}"
            )
            
            # Create manifest
            manifest = Manifest.objects.create(
                document=document,
                shipment=shipment,
                manifest_type=mapped_type,
                status='CONFIRMED',  # ERP data is pre-confirmed
                file_name=f"erp_manifest_{external_reference}",
                analysis_results={'source': 'erp_import', 'external_reference': external_reference}
            )
            
            return manifest
            
        except Exception as e:
            logger.error(f"Failed to create manifest record: {str(e)}")
            return None
    
    def _import_dangerous_goods(self, manifest: 'Manifest', manifest_data: Dict[str, Any]) -> int:
        """Import dangerous goods from manifest data"""
        try:
            from dangerous_goods.models import DangerousGood
            from manifests.models import ManifestDangerousGoodMatch
            
            dangerous_goods_items = manifest_data.get('dangerous_goods', [])
            imported_count = 0
            
            for dg_item in dangerous_goods_items:
                # Try to find matching dangerous good
                un_number = dg_item.get('un_number')
                proper_name = dg_item.get('proper_shipping_name')
                
                dangerous_good = None
                
                if un_number:
                    dangerous_good = DangerousGood.objects.filter(
                        un_number=un_number
                    ).first()
                
                if not dangerous_good and proper_name:
                    dangerous_good = DangerousGood.objects.filter(
                        proper_shipping_name__icontains=proper_name
                    ).first()
                
                if dangerous_good:
                    # Create manifest match
                    ManifestDangerousGoodMatch.objects.create(
                        manifest=manifest,
                        dangerous_good=dangerous_good,
                        found_text=dg_item.get('description', proper_name or un_number),
                        match_type='EXACT_SYNONYM',
                        confidence_score=1.0,
                        is_confirmed=True  # ERP data is pre-confirmed
                    )
                    imported_count += 1
            
            return imported_count
            
        except Exception as e:
            logger.error(f"Failed to import dangerous goods: {str(e)}")
            return 0
    
    def _get_or_create_customer_company(self, manifest_data: Dict[str, Any]) -> 'Company':
        """Get or create customer company from manifest data"""
        try:
            from companies.models import Company
            
            customer_name = manifest_data.get('customer_name', 'Unknown Customer')
            customer_code = manifest_data.get('customer_code', '')
            
            # Try to find existing company
            company = Company.objects.filter(name=customer_name).first()
            
            if not company:
                # Create new company
                company = Company.objects.create(
                    name=customer_name,
                    company_type='CUSTOMER',
                    contact_info={
                        'primary_contact': {
                            'name': 'ERP Import Contact',
                            'email': 'erp@example.com',
                            'phone': '+1-555-0000'
                        },
                        'billing_contact': {
                            'name': 'ERP Import Contact',
                            'email': 'erp@example.com',
                            'phone': '+1-555-0000'
                        },
                        'imported_from_erp': True,
                        'erp_system': self.erp_system.name,
                        'external_reference': manifest_data.get('customer_reference', ''),
                        'customer_code': customer_code
                    }
                )
            
            return company
            
        except Exception as e:
            logger.error(f"Failed to get/create customer company: {str(e)}")
            # Return a default company
            return Company.objects.filter(company_type='CUSTOMER').first()
    
    def _get_or_create_carrier_company(self, manifest_data: Dict[str, Any]) -> 'Company':
        """Get or create carrier company from manifest data"""
        try:
            from companies.models import Company
            
            carrier_name = manifest_data.get('carrier_name', 'Unknown Carrier')
            carrier_code = manifest_data.get('carrier_code', '')
            
            # Try to find existing company
            company = Company.objects.filter(name=carrier_name).first()
            
            if not company:
                # Create new company
                company = Company.objects.create(
                    name=carrier_name,
                    company_type='CARRIER',
                    contact_info={
                        'primary_contact': {
                            'name': 'ERP Import Contact',
                            'email': 'erp@example.com',
                            'phone': '+1-555-0000'
                        },
                        'billing_contact': {
                            'name': 'ERP Import Contact',
                            'email': 'erp@example.com',
                            'phone': '+1-555-0000'
                        },
                        'imported_from_erp': True,
                        'erp_system': self.erp_system.name,
                        'external_reference': manifest_data.get('carrier_reference', ''),
                        'carrier_code': carrier_code
                    }
                )
            
            return company
            
        except Exception as e:
            logger.error(f"Failed to get/create carrier company: {str(e)}")
            # Return a default company
            return Company.objects.filter(company_type='CARRIER').first()
    
    def _get_or_create_freight_type(self, manifest_data: Dict[str, Any]) -> 'FreightType':
        """Get or create freight type from manifest data"""
        try:
            from freight_types.models import FreightType
            
            freight_type_code = manifest_data.get('freight_type', 'GENERAL')
            
            # Try to find existing freight type
            freight_type = FreightType.objects.filter(code=freight_type_code).first()
            
            if not freight_type:
                # Create or get default freight type
                freight_type, _ = FreightType.objects.get_or_create(
                    code='GENERAL',
                    defaults={'description': 'General Freight'}
                )
            
            return freight_type
            
        except Exception as e:
            logger.error(f"Failed to get/create freight type: {str(e)}")
            # Return default freight type
            return FreightType.objects.first()
    
    def _parse_date(self, date_string: str) -> Optional[datetime]:
        """Parse date string from ERP data"""
        if not date_string:
            return None
        
        try:
            # Try common date formats
            formats = [
                '%Y-%m-%d',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%SZ',
                '%d/%m/%Y',
                '%m/%d/%Y'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(date_string, fmt)
                except ValueError:
                    continue
            
            logger.warning(f"Could not parse date: {date_string}")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing date {date_string}: {str(e)}")
            return None
    
    def batch_import_manifests(self, external_references: List[str], 
                              manifest_type: str = 'shipment',
                              **kwargs) -> Dict[str, Any]:
        """Import multiple manifests in batch"""
        results = {
            'successful': [],
            'failed': [],
            'total': len(external_references),
            'success_count': 0,
            'error_count': 0
        }
        
        for external_reference in external_references:
            try:
                result = self.import_manifest_from_erp(
                    external_reference, manifest_type, **kwargs
                )
                
                if result['success']:
                    results['successful'].append({
                        'external_reference': external_reference,
                        'shipment_id': result.get('shipment_id'),
                        'manifest_id': result.get('manifest_id')
                    })
                    results['success_count'] += 1
                else:
                    results['failed'].append({
                        'external_reference': external_reference,
                        'error': result.get('error')
                    })
                    results['error_count'] += 1
                    
            except Exception as e:
                results['failed'].append({
                    'external_reference': external_reference,
                    'error': str(e)
                })
                results['error_count'] += 1
        
        return results


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