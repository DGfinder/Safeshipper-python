from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from erp_integration.models import ERPSystem, IntegrationEndpoint
from erp_integration.services import ERPManifestImportService
from companies.models import Company
import json
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Test manifest import functionality with sample data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--erp-system',
            help='Name of the ERP system to test (if not specified, uses first available)'
        )
        parser.add_argument(
            '--external-reference',
            default='TEST_MANIFEST_001',
            help='External reference number for the test manifest'
        )
        parser.add_argument(
            '--manifest-type',
            choices=['shipment', 'invoice', 'packing_list', 'customs'],
            default='shipment',
            help='Type of manifest to import'
        )
        parser.add_argument(
            '--create-sample-data',
            action='store_true',
            help='Create sample manifest data for testing'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without creating actual records'
        )
    
    def handle(self, *args, **options):
        erp_system_name = options['erp_system']
        external_reference = options['external_reference']
        manifest_type = options['manifest_type']
        create_sample_data = options['create_sample_data']
        dry_run = options['dry_run']
        
        # Get ERP system
        if erp_system_name:
            try:
                erp_system = ERPSystem.objects.get(name=erp_system_name)
            except ERPSystem.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'ERP system "{erp_system_name}" not found')
                )
                return
        else:
            erp_system = ERPSystem.objects.filter(status='active').first()
            if not erp_system:
                erp_system = ERPSystem.objects.first()
            
            if not erp_system:
                self.stdout.write(
                    self.style.ERROR('No ERP systems found. Run setup_erp_systems first.')
                )
                return
        
        self.stdout.write(
            self.style.SUCCESS(f'Using ERP system: {erp_system.name}')
        )
        
        # Create sample manifest data if requested
        if create_sample_data:
            self._create_sample_manifest_data(erp_system, external_reference, manifest_type)
        
        # Test manifest import
        if not dry_run:
            self._test_manifest_import(erp_system, external_reference, manifest_type)
        else:
            self.stdout.write(
                self.style.WARNING('Dry run mode - no actual import performed')
            )
    
    def _create_sample_manifest_data(self, erp_system: ERPSystem, external_reference: str, manifest_type: str):
        """Create sample manifest data for testing"""
        
        sample_data = {
            'shipment': {
                'external_reference': external_reference,
                'customer_name': 'ACME Corporation',
                'customer_code': 'ACME001',
                'customer_reference': 'CUST-2024-001',
                'carrier_name': 'FastShip Logistics',
                'carrier_code': 'FSL001',
                'carrier_reference': 'CARR-2024-001',
                'origin_location': 'Sydney, NSW, Australia',
                'destination_location': 'Melbourne, VIC, Australia',
                'freight_type': 'GENERAL',
                'weight_kg': 150.5,
                'volume_m3': 2.3,
                'pickup_date': '2024-07-15',
                'delivery_date': '2024-07-17',
                'special_instructions': 'Handle with care - fragile items',
                'dangerous_goods': [
                    {
                        'un_number': 'UN1203',
                        'proper_shipping_name': 'Gasoline',
                        'hazard_class': '3',
                        'packing_group': 'II',
                        'quantity': '25L',
                        'description': 'Gasoline for motor vehicles'
                    },
                    {
                        'un_number': 'UN1950',
                        'proper_shipping_name': 'Aerosols',
                        'hazard_class': '2.1',
                        'packing_group': None,
                        'quantity': '12 cans',
                        'description': 'Aerosol spray cans'
                    }
                ],
                'line_items': [
                    {
                        'item_code': 'ITEM001',
                        'description': 'Automotive fuel',
                        'quantity': 1,
                        'unit': 'container',
                        'weight_kg': 25.0,
                        'value_aud': 45.00
                    },
                    {
                        'item_code': 'ITEM002',
                        'description': 'Spray paint cans',
                        'quantity': 12,
                        'unit': 'cans',
                        'weight_kg': 6.0,
                        'value_aud': 84.00
                    }
                ]
            },
            'invoice': {
                'external_reference': external_reference,
                'customer_name': 'ACME Corporation',
                'customer_code': 'ACME001',
                'invoice_number': f'INV-{external_reference}',
                'invoice_date': '2024-07-14',
                'due_date': '2024-08-14',
                'currency': 'AUD',
                'total_amount': 1250.00,
                'tax_amount': 125.00,
                'freight_charges': 85.00,
                'line_items': [
                    {
                        'item_code': 'FREIGHT001',
                        'description': 'Freight charges Sydney to Melbourne',
                        'quantity': 1,
                        'unit_price': 85.00,
                        'total_amount': 85.00
                    }
                ]
            },
            'packing_list': {
                'external_reference': external_reference,
                'customer_name': 'ACME Corporation',
                'packing_date': '2024-07-14',
                'total_packages': 3,
                'total_weight_kg': 150.5,
                'total_volume_m3': 2.3,
                'packages': [
                    {
                        'package_id': 'PKG001',
                        'package_type': 'Box',
                        'dimensions': '50x40x30cm',
                        'weight_kg': 25.0,
                        'contents': 'Automotive fuel container'
                    },
                    {
                        'package_id': 'PKG002',
                        'package_type': 'Carton',
                        'dimensions': '30x20x15cm',
                        'weight_kg': 6.0,
                        'contents': 'Aerosol spray cans (12 units)'
                    }
                ]
            }
        }
        
        manifest_data = sample_data.get(manifest_type, sample_data['shipment'])
        
        self.stdout.write(
            self.style.SUCCESS(f'Sample manifest data created:')
        )
        self.stdout.write(json.dumps(manifest_data, indent=2))
        
        # Store sample data for later use (in a real implementation, this would be stored in the ERP system)
        self._sample_data = manifest_data
    
    def _test_manifest_import(self, erp_system: ERPSystem, external_reference: str, manifest_type: str):
        """Test the manifest import functionality"""
        
        self.stdout.write(
            self.style.SUCCESS(f'Testing manifest import for: {external_reference}')
        )
        
        # Create manifest import service
        manifest_import_service = ERPManifestImportService(erp_system)
        
        # Mock the _fetch_manifest_data method to return our sample data
        if hasattr(self, '_sample_data'):
            original_fetch_method = manifest_import_service._fetch_manifest_data
            
            def mock_fetch_manifest_data(endpoint, ref):
                self.stdout.write(
                    self.style.SUCCESS(f'Mock fetching manifest data for: {ref}')
                )
                return self._sample_data
            
            manifest_import_service._fetch_manifest_data = mock_fetch_manifest_data
        
        try:
            # Perform the import
            result = manifest_import_service.import_manifest_from_erp(
                external_reference=external_reference,
                manifest_type=manifest_type,
                import_dangerous_goods=True,
                create_shipment=True,
                preserve_external_ids=True
            )
            
            # Display results
            if result['success']:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Manifest import successful!')
                )
                self.stdout.write(
                    self.style.SUCCESS(f'  External Reference: {result["external_reference"]}')
                )
                if result.get('shipment_id'):
                    self.stdout.write(
                        self.style.SUCCESS(f'  Shipment ID: {result["shipment_id"]}')
                    )
                if result.get('manifest_id'):
                    self.stdout.write(
                        self.style.SUCCESS(f'  Manifest ID: {result["manifest_id"]}')
                    )
                if result.get('dangerous_goods_found'):
                    self.stdout.write(
                        self.style.SUCCESS(f'  Dangerous Goods Found: {result["dangerous_goods_found"]}')
                    )
                
                # Display created records
                self._display_created_records(result)
                
            else:
                self.stdout.write(
                    self.style.ERROR(f'✗ Manifest import failed: {result["error"]}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Exception during manifest import: {str(e)}')
            )
    
    def _display_created_records(self, result):
        """Display details of created records"""
        
        self.stdout.write(
            self.style.SUCCESS(f'\nCreated Records:')
        )
        
        # Display shipment details
        if result.get('shipment_id'):
            try:
                from shipments.models import Shipment
                shipment = Shipment.objects.get(id=result['shipment_id'])
                
                self.stdout.write(
                    self.style.SUCCESS(f'  Shipment:')
                )
                self.stdout.write(f'    Tracking Number: {shipment.tracking_number}')
                self.stdout.write(f'    Reference Number: {shipment.reference_number}')
                self.stdout.write(f'    Status: {shipment.status}')
                self.stdout.write(f'    Customer: {shipment.customer.name}')
                self.stdout.write(f'    Carrier: {shipment.carrier.name}')
                self.stdout.write(f'    Origin: {shipment.origin_location}')
                self.stdout.write(f'    Destination: {shipment.destination_location}')
                
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'    Could not display shipment details: {str(e)}')
                )
        
        # Display manifest details
        if result.get('manifest_id'):
            try:
                from manifests.models import Manifest
                manifest = Manifest.objects.get(id=result['manifest_id'])
                
                self.stdout.write(
                    self.style.SUCCESS(f'  Manifest:')
                )
                self.stdout.write(f'    Type: {manifest.get_manifest_type_display()}')
                self.stdout.write(f'    Status: {manifest.get_status_display()}')
                self.stdout.write(f'    File Name: {manifest.file_name}')
                
                # Display dangerous goods matches
                dg_matches = manifest.dg_matches.all()
                if dg_matches.exists():
                    self.stdout.write(
                        self.style.SUCCESS(f'  Dangerous Goods Matches:')
                    )
                    for match in dg_matches:
                        self.stdout.write(
                            f'    - {match.dangerous_good.un_number}: {match.dangerous_good.proper_shipping_name}'
                        )
                
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'    Could not display manifest details: {str(e)}')
                )