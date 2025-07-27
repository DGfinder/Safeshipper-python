from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from shipments.models import Shipment
from companies.models import Company
from freight_types.models import FreightType
from inspections.models import (
    Inspection, InspectionItem, InspectionTemplate, 
    InspectionTemplateItem, InspectionPhoto
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample inspection data for testing and demonstration'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample inspection data...')
        
        # Get or create required objects
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                username='admin_inspector',
                email='admin@safeshipper.com',
                password='admin123',
                first_name='Admin',
                last_name='Inspector'
            )
            self.stdout.write(f'Created admin user: {admin_user.username}')
        
        # Create test companies if they don't exist
        customer_company, created = Company.objects.get_or_create(
            name='Test Customer Co',
            defaults={
                'company_type': 'CUSTOMER',
                'status': 'ACTIVE',
                'contact_info': {
                    'primary_contact': {
                        'name': 'John Smith',
                        'email': 'customer@example.com',
                        'phone': '+61-2-9999-0001'
                    },
                    'billing_contact': {
                        'name': 'Jane Doe',
                        'email': 'billing@example.com',
                        'phone': '+61-2-9999-0002'
                    }
                }
            }
        )
        
        carrier_company, created = Company.objects.get_or_create(
            name='Test Carrier Ltd',
            defaults={
                'company_type': 'CARRIER',
                'status': 'ACTIVE',
                'contact_info': {
                    'primary_contact': {
                        'name': 'Bob Wilson',
                        'email': 'carrier@example.com',
                        'phone': '+61-2-8888-0001'
                    },
                    'billing_contact': {
                        'name': 'Alice Brown',
                        'email': 'billing.carrier@example.com',
                        'phone': '+61-2-8888-0002'
                    }
                }
            }
        )
        
        # Create freight type if it doesn't exist
        freight_type, created = FreightType.objects.get_or_create(
            code='DG',
            defaults={
                'description': 'Dangerous Goods (Category)',
                'is_dg_category': True,
                'requires_special_handling': True
            }
        )
        
        # Create sample shipments
        shipments = []
        for i in range(5):
            shipment, created = Shipment.objects.get_or_create(
                reference_number=f'SAMPLE-{i+1:03d}',
                defaults={
                    'tracking_number': f'TRK{i+1:06d}',
                    'customer': customer_company,
                    'carrier': carrier_company,
                    'origin_location': f'Sydney Depot {i+1}',
                    'destination_location': f'Melbourne Hub {i+1}',
                    'freight_type': freight_type,
                    'status': 'IN_TRANSIT',
                    'requested_by': admin_user
                }
            )
            shipments.append(shipment)
            if created:
                self.stdout.write(f'Created shipment: {shipment.tracking_number}')
        
        # Create inspection templates
        pre_trip_template, created = InspectionTemplate.objects.get_or_create(
            name='Standard Pre-Trip Inspection',
            inspection_type='PRE_TRIP',
            defaults={
                'description': 'Standard pre-trip safety checklist',
                'is_active': True
            }
        )
        
        if created:
            # Add template items for pre-trip inspection
            template_items = [
                ('Vehicle exterior condition', 'VEHICLE', True, 1),
                ('Tire condition and pressure', 'VEHICLE', True, 2),
                ('Lights and indicators', 'VEHICLE', True, 3),
                ('Dangerous goods documentation', 'DOCUMENTATION', True, 4),
                ('Emergency equipment present', 'SAFETY', True, 5),
                ('Cargo securing equipment', 'CARGO', True, 6),
                ('Driver certification valid', 'DOCUMENTATION', True, 7),
            ]
            
            for description, category, is_mandatory, order in template_items:
                InspectionTemplateItem.objects.create(
                    template=pre_trip_template,
                    description=description,
                    category=category,
                    is_mandatory=is_mandatory,
                    order=order
                )
            
            self.stdout.write(f'Created pre-trip template with {len(template_items)} items')
        
        # Create sample inspections
        inspection_types = ['PRE_TRIP', 'POST_TRIP', 'LOADING', 'UNLOADING', 'SAFETY_CHECK']
        
        for i, shipment in enumerate(shipments):
            inspection_type = inspection_types[i % len(inspection_types)]
            
            # Create inspection
            inspection = Inspection.objects.create(
                shipment=shipment,
                inspector=admin_user,
                inspection_type=inspection_type,
                status='COMPLETED',
                started_at=timezone.now() - timedelta(hours=2),
                completed_at=timezone.now() - timedelta(hours=1),
                overall_result='PASS' if i < 3 else 'FAIL',
                notes=f'Sample {inspection_type.lower().replace("_", " ")} inspection for {shipment.tracking_number}'
            )
            
            # Create inspection items
            sample_items = [
                ('Vehicle condition check', 'VEHICLE', 'PASS' if i < 3 else 'FAIL'),
                ('Documentation review', 'DOCUMENTATION', 'PASS'),
                ('Safety equipment verification', 'SAFETY', 'PASS'),
                ('Cargo inspection', 'CARGO', 'PASS' if i != 4 else 'FAIL'),
            ]
            
            for description, category, result in sample_items:
                item = InspectionItem.objects.create(
                    inspection=inspection,
                    description=description,
                    category=category,
                    is_mandatory=True,
                    result=result,
                    checked_at=timezone.now() - timedelta(hours=1, minutes=30),
                    notes=f'Sample inspection item: {description}'
                )
                
                # Add corrective action for failed items
                if result == 'FAIL':
                    item.corrective_action = 'Corrective action required before dispatch'
                    item.save()
            
            self.stdout.write(
                f'Created {inspection_type} inspection for shipment {shipment.tracking_number}'
            )
        
        # Create loading inspection template
        loading_template, created = InspectionTemplate.objects.get_or_create(
            name='Dangerous Goods Loading Checklist',
            inspection_type='LOADING',
            defaults={
                'description': 'Checklist for loading dangerous goods',
                'is_active': True
            }
        )
        
        if created:
            loading_items = [
                ('Segregation requirements verified', 'CARGO', True, 1),
                ('Package labeling correct', 'CARGO', True, 2),
                ('Loading sequence followed', 'CARGO', True, 3),
                ('Emergency response equipment accessible', 'SAFETY', True, 4),
            ]
            
            for description, category, is_mandatory, order in loading_items:
                InspectionTemplateItem.objects.create(
                    template=loading_template,
                    description=description,
                    category=category,
                    is_mandatory=is_mandatory,
                    order=order
                )
            
            self.stdout.write(f'Created loading template with {len(loading_items)} items')
        
        # Summary
        total_inspections = Inspection.objects.count()
        total_items = InspectionItem.objects.count()
        total_templates = InspectionTemplate.objects.count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Sample inspection data created successfully:\n'
                f'- {total_inspections} inspections\n'
                f'- {total_items} inspection items\n'
                f'- {total_templates} inspection templates'
            )
        )