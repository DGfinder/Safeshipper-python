from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from erp_integration.models import ERPSystem, IntegrationEndpoint, ERPMapping, ERPConfiguration
from erp_integration.services import ERPDataMappingService
from companies.models import Company
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Set up sample ERP systems for testing and demonstration'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--system-type',
            choices=['sap', 'oracle', 'netsuite', 'dynamics', 'all'],
            default='all',
            help='Type of ERP system to set up (default: all)'
        )
        parser.add_argument(
            '--company-name',
            default='Demo Company Ltd',
            help='Name of the company to associate with ERP systems'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip creation if ERP system already exists'
        )
    
    def handle(self, *args, **options):
        system_type = options['system_type']
        company_name = options['company_name']
        skip_existing = options['skip_existing']
        
        # Get or create company
        company, created = Company.objects.get_or_create(
            name=company_name,
            defaults={
                'company_type': 'CUSTOMER',
                'contact_info': {
                    'primary_contact': {
                        'name': 'Demo User',
                        'email': 'demo@example.com',
                        'phone': '+1-555-0123'
                    },
                    'billing_contact': {
                        'name': 'Demo User',
                        'email': 'demo@example.com',
                        'phone': '+1-555-0123'
                    }
                }
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created company: {company.name}')
            )
        
        # Get or create admin user
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        # Set up ERP systems
        if system_type == 'all':
            systems = ['sap', 'oracle', 'netsuite', 'dynamics']
        else:
            systems = [system_type]
        
        for system in systems:
            try:
                with transaction.atomic():
                    self._setup_erp_system(system, company, admin_user, skip_existing)
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to set up {system}: {str(e)}')
                )
    
    def _setup_erp_system(self, system_type: str, company: Company, admin_user: User, skip_existing: bool):
        """Set up a specific ERP system"""
        
        # Check if system already exists
        if skip_existing and ERPSystem.objects.filter(
            system_type=system_type, 
            company=company
        ).exists():
            self.stdout.write(
                self.style.WARNING(f'ERP system {system_type} already exists, skipping...')
            )
            return
        
        # ERP system configurations
        erp_configs = {
            'sap': {
                'name': 'SAP ERP Central Component',
                'base_url': 'https://demo-sap.example.com/api/v1',
                'connection_config': {
                    'client': '100',
                    'language': 'EN',
                    'timeout': 30
                },
                'authentication_config': {
                    'type': 'basic',
                    'username': 'DEMO_USER',
                    'password': 'demo_password',
                    'verify_ssl': True
                },
                'enabled_modules': ['shipments', 'invoicing', 'inventory', 'master_data']
            },
            'oracle': {
                'name': 'Oracle ERP Cloud',
                'base_url': 'https://demo-oracle.example.com/fscmRestApi/resources',
                'connection_config': {
                    'version': '11.13.18.05',
                    'instance': 'DEMO_INSTANCE',
                    'timeout': 30
                },
                'authentication_config': {
                    'type': 'basic',
                    'username': 'demo.user',
                    'password': 'demo_password',
                    'verify_ssl': True
                },
                'enabled_modules': ['shipments', 'orders', 'invoicing', 'financials']
            },
            'netsuite': {
                'name': 'NetSuite ERP',
                'base_url': 'https://demo.restlets.api.netsuite.com',
                'connection_config': {
                    'account': 'DEMO_ACCOUNT',
                    'version': '2023.2',
                    'timeout': 30
                },
                'authentication_config': {
                    'type': 'bearer',
                    'token': 'demo_access_token',
                    'verify_ssl': True
                },
                'enabled_modules': ['shipments', 'orders', 'inventory', 'customers']
            },
            'dynamics': {
                'name': 'Microsoft Dynamics 365',
                'base_url': 'https://demo.api.businesscentral.dynamics.com/v2.0',
                'connection_config': {
                    'tenant_id': 'demo-tenant-id',
                    'environment': 'sandbox',
                    'timeout': 30
                },
                'authentication_config': {
                    'type': 'oauth2',
                    'client_id': 'demo_client_id',
                    'client_secret': 'demo_client_secret',
                    'tenant_id': 'demo-tenant-id',
                    'verify_ssl': True
                },
                'enabled_modules': ['shipments', 'orders', 'invoicing', 'documents']
            }
        }
        
        config = erp_configs[system_type]
        
        # Create ERP system
        erp_system = ERPSystem.objects.create(
            name=config['name'],
            system_type=system_type,
            connection_type='rest_api',
            company=company,
            base_url=config['base_url'],
            connection_config=config['connection_config'],
            authentication_config=config['authentication_config'],
            sync_frequency_minutes=60,
            enabled_modules=config['enabled_modules'],
            status='testing',
            push_enabled=True,
            pull_enabled=True,
            bidirectional_sync=False,
            created_by=admin_user
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'Created ERP system: {erp_system.name}')
        )
        
        # Create integration endpoints
        self._create_endpoints(erp_system, system_type)
        
        # Create system configurations
        self._create_system_configurations(erp_system, system_type, admin_user)
        
        self.stdout.write(
            self.style.SUCCESS(f'Completed setup for {system_type}')
        )
    
    def _create_endpoints(self, erp_system: ERPSystem, system_type: str):
        """Create integration endpoints for the ERP system"""
        
        endpoints_config = {
            'sap': [
                {
                    'name': 'Shipment Management',
                    'endpoint_type': 'shipments',
                    'path': 'shipments',
                    'http_method': 'POST',
                    'sync_direction': 'bidirectional'
                },
                {
                    'name': 'Invoice Processing',
                    'endpoint_type': 'invoicing',
                    'path': 'invoices',
                    'http_method': 'POST',
                    'sync_direction': 'pull'
                }
            ],
            'oracle': [
                {
                    'name': 'Logistics Orders',
                    'endpoint_type': 'orders',
                    'path': 'logisticsOrdersForShipment',
                    'http_method': 'POST',
                    'sync_direction': 'bidirectional'
                },
                {
                    'name': 'Shipment Tracking',
                    'endpoint_type': 'shipments',
                    'path': 'shipmentTracking',
                    'http_method': 'GET',
                    'sync_direction': 'pull'
                }
            ],
            'netsuite': [
                {
                    'name': 'Sales Orders',
                    'endpoint_type': 'orders',
                    'path': 'record/salesorder',
                    'http_method': 'POST',
                    'sync_direction': 'bidirectional'
                },
                {
                    'name': 'Fulfillment Orders',
                    'endpoint_type': 'shipments',
                    'path': 'record/itemfulfillment',
                    'http_method': 'POST',
                    'sync_direction': 'bidirectional'
                }
            ],
            'dynamics': [
                {
                    'name': 'Sales Shipments',
                    'endpoint_type': 'shipments',
                    'path': 'salesShipments',
                    'http_method': 'POST',
                    'sync_direction': 'bidirectional'
                },
                {
                    'name': 'Purchase Orders',
                    'endpoint_type': 'orders',
                    'path': 'purchaseOrders',
                    'http_method': 'POST',
                    'sync_direction': 'pull'
                }
            ]
        }
        
        for endpoint_config in endpoints_config.get(system_type, []):
            endpoint = IntegrationEndpoint.objects.create(
                erp_system=erp_system,
                name=endpoint_config['name'],
                endpoint_type=endpoint_config['endpoint_type'],
                path=endpoint_config['path'],
                http_method=endpoint_config['http_method'],
                sync_direction=endpoint_config['sync_direction'],
                request_template={
                    'headers': {'Content-Type': 'application/json'},
                    'format': 'json'
                },
                response_mapping={
                    'success_field': 'success',
                    'data_field': 'data',
                    'error_field': 'error'
                },
                is_active=True
            )
            
            # Create standard field mappings
            ERPDataMappingService.create_standard_mappings(erp_system, endpoint)
            
            self.stdout.write(
                self.style.SUCCESS(f'  Created endpoint: {endpoint.name}')
            )
    
    def _create_system_configurations(self, erp_system: ERPSystem, system_type: str, admin_user: User):
        """Create system-specific configurations"""
        
        configs = {
            'sap': [
                {
                    'config_type': 'system',
                    'config_key': 'sap_client',
                    'config_value': '100',
                    'description': 'SAP client number'
                },
                {
                    'config_type': 'system',
                    'config_key': 'sap_language',
                    'config_value': 'EN',
                    'description': 'SAP system language'
                },
                {
                    'config_type': 'mapping',
                    'config_key': 'date_format',
                    'config_value': 'YYYY-MM-DD',
                    'description': 'Date format for SAP integration'
                }
            ],
            'oracle': [
                {
                    'config_type': 'system',
                    'config_key': 'oracle_version',
                    'config_value': '11.13.18.05',
                    'description': 'Oracle ERP version'
                },
                {
                    'config_type': 'system',
                    'config_key': 'oracle_instance',
                    'config_value': 'DEMO_INSTANCE',
                    'description': 'Oracle instance name'
                }
            ],
            'netsuite': [
                {
                    'config_type': 'system',
                    'config_key': 'netsuite_account',
                    'config_value': 'DEMO_ACCOUNT',
                    'description': 'NetSuite account ID'
                },
                {
                    'config_type': 'system',
                    'config_key': 'netsuite_version',
                    'config_value': '2023.2',
                    'description': 'NetSuite API version'
                }
            ],
            'dynamics': [
                {
                    'config_type': 'system',
                    'config_key': 'tenant_id',
                    'config_value': 'demo-tenant-id',
                    'description': 'Microsoft tenant ID',
                    'is_sensitive': True
                },
                {
                    'config_type': 'system',
                    'config_key': 'environment',
                    'config_value': 'sandbox',
                    'description': 'Dynamics 365 environment'
                }
            ]
        }
        
        for config in configs.get(system_type, []):
            ERPConfiguration.objects.create(
                erp_system=erp_system,
                config_type=config['config_type'],
                config_key=config['config_key'],
                config_value=config['config_value'],
                description=config['description'],
                is_sensitive=config.get('is_sensitive', False),
                is_editable=True,
                created_by=admin_user
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'  Created config: {config["config_key"]}')
            )