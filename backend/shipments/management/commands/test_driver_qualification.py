# shipments/management/commands/test_driver_qualification.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from companies.models import Company
from freight_types.models import FreightType
from dangerous_goods.models import DangerousGood
from training.models import TrainingProgram, TrainingCategory
from training.adg_driver_qualifications import DriverLicense, ADGDriverCertificate, DriverCompetencyProfile
from shipments.models import Shipment, ConsignmentItem
from shipments.driver_qualification_service import ShipmentDriverQualificationService

User = get_user_model()


class Command(BaseCommand):
    help = 'Test driver qualification validation system with sample data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-data',
            action='store_true',
            help='Create sample test data before running tests'
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up test data after running tests'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting driver qualification validation tests...'))
        
        if options['create_data']:
            self.create_test_data()
        
        self.run_qualification_tests()
        
        if options['cleanup']:
            self.cleanup_test_data()
        
        self.stdout.write(self.style.SUCCESS('Driver qualification validation tests completed!'))

    def create_test_data(self):
        """Create comprehensive test data for qualification validation"""
        self.stdout.write('Creating test data...')
        
        # Create companies
        self.customer_company, _ = Company.objects.get_or_create(
            name="SafeShipper Test Customer",
            defaults={'company_type': 'CUSTOMER'}
        )
        self.carrier_company, _ = Company.objects.get_or_create(
            name="SafeShipper Test Carrier",
            defaults={'company_type': 'CARRIER'}
        )
        
        # Create freight type
        self.freight_type, _ = FreightType.objects.get_or_create(
            name="Test General Freight",
            defaults={'description': 'Test freight type for qualification validation'}
        )
        
        # Create dangerous goods
        self.class_3_dg, _ = DangerousGood.objects.get_or_create(
            un_number="UN1203",
            defaults={
                'proper_shipping_name': 'Gasoline',
                'hazard_class': '3',
                'packing_group': 'II'
            }
        )
        
        self.class_8_dg, _ = DangerousGood.objects.get_or_create(
            un_number="UN1789",
            defaults={
                'proper_shipping_name': 'Hydrochloric acid',
                'hazard_class': '8',
                'packing_group': 'II'
            }
        )
        
        # Create training programs
        self.dg_category, _ = TrainingCategory.objects.get_or_create(
            name="Test Dangerous Goods Training",
            defaults={'is_mandatory': True}
        )
        
        self.class_3_training, _ = TrainingProgram.objects.get_or_create(
            name="Test Class 3 Training",
            defaults={
                'category': self.dg_category,
                'delivery_method': 'blended',
                'difficulty_level': 'intermediate',
                'duration_hours': 8,
                'is_mandatory': True,
                'compliance_required': True,
                'passing_score': 80,
                'certificate_validity_months': 12
            }
        )
        
        # Create test drivers
        self.create_test_drivers()
        
        # Create test shipments
        self.create_test_shipments()
        
        self.stdout.write(self.style.SUCCESS('Test data created successfully!'))

    def create_test_drivers(self):
        """Create drivers with different qualification levels"""
        
        # 1. Fully qualified driver (Class 3 certified)
        self.qualified_driver, created = User.objects.get_or_create(
            username='test_qualified_driver',
            defaults={
                'email': 'qualified@test.com',
                'role': 'DRIVER',
                'first_name': 'John',
                'last_name': 'Qualified'
            }
        )
        
        if created:
            # Valid HR license
            DriverLicense.objects.create(
                driver=self.qualified_driver,
                license_number='TEST_HR_001',
                license_class='HR',
                state_issued='NSW',
                issue_date=timezone.now().date() - timedelta(days=730),
                expiry_date=timezone.now().date() + timedelta(days=365),
                status=DriverLicense.LicenseStatus.VALID
            )
            
            # Valid Class 3 ADG certificate
            ADGDriverCertificate.objects.create(
                driver=self.qualified_driver,
                certificate_type=ADGDriverCertificate.CertificateType.CLASS_SPECIFIC,
                certificate_number='TEST_ADG_001',
                issuing_authority='Test Training Provider',
                issue_date=timezone.now().date() - timedelta(days=30),
                expiry_date=timezone.now().date() + timedelta(days=335),
                hazard_classes_covered=['3'],
                competency_areas=['packaging', 'loading', 'documentation'],
                status=ADGDriverCertificate.CertificateStatus.VALID,
                training_program=self.class_3_training
            )
            
            # Competency profile
            DriverCompetencyProfile.objects.create(
                driver=self.qualified_driver,
                overall_status=DriverCompetencyProfile.OverallStatus.FULLY_QUALIFIED,
                qualified_hazard_classes=['3'],
                years_experience=5.0,
                compliance_percentage=100.0
            )
        
        # 2. Partially qualified driver (license only, no ADG certification)
        self.partial_driver, created = User.objects.get_or_create(
            username='test_partial_driver',
            defaults={
                'email': 'partial@test.com',
                'role': 'DRIVER',
                'first_name': 'Jane',
                'last_name': 'Partial'
            }
        )
        
        if created:
            # Valid license but no ADG certification
            DriverLicense.objects.create(
                driver=self.partial_driver,
                license_number='TEST_LR_002',
                license_class='LR',
                state_issued='VIC',
                issue_date=timezone.now().date() - timedelta(days=365),
                expiry_date=timezone.now().date() + timedelta(days=730),
                status=DriverLicense.LicenseStatus.VALID
            )
            
            # Competency profile shows partial qualification
            DriverCompetencyProfile.objects.create(
                driver=self.partial_driver,
                overall_status=DriverCompetencyProfile.OverallStatus.PARTIALLY_QUALIFIED,
                qualified_hazard_classes=[],
                years_experience=2.0,
                compliance_percentage=40.0
            )
        
        # 3. Unqualified driver (basic license, no training)
        self.unqualified_driver, created = User.objects.get_or_create(
            username='test_unqualified_driver',
            defaults={
                'email': 'unqualified@test.com',
                'role': 'DRIVER',
                'first_name': 'Bob',
                'last_name': 'Unqualified'
            }
        )
        
        if created:
            # Basic C class license only
            DriverLicense.objects.create(
                driver=self.unqualified_driver,
                license_number='TEST_C_003',
                license_class='C',
                state_issued='QLD',
                issue_date=timezone.now().date() - timedelta(days=365),
                expiry_date=timezone.now().date() + timedelta(days=365),
                status=DriverLicense.LicenseStatus.VALID
            )
            
            # Competency profile shows not qualified
            DriverCompetencyProfile.objects.create(
                driver=self.unqualified_driver,
                overall_status=DriverCompetencyProfile.OverallStatus.NOT_QUALIFIED,
                qualified_hazard_classes=[],
                years_experience=0.5,
                compliance_percentage=20.0
            )
        
        # 4. Driver with expiring qualifications
        self.expiring_driver, created = User.objects.get_or_create(
            username='test_expiring_driver',
            defaults={
                'email': 'expiring@test.com',
                'role': 'DRIVER',
                'first_name': 'Alice',
                'last_name': 'Expiring'
            }
        )
        
        if created:
            # License expiring soon
            DriverLicense.objects.create(
                driver=self.expiring_driver,
                license_number='TEST_HR_004',
                license_class='HR',
                state_issued='WA',
                issue_date=timezone.now().date() - timedelta(days=365),
                expiry_date=timezone.now().date() + timedelta(days=20),  # Expires in 20 days
                status=DriverLicense.LicenseStatus.EXPIRING_SOON
            )
            
            # ADG certificate also expiring
            ADGDriverCertificate.objects.create(
                driver=self.expiring_driver,
                certificate_type=ADGDriverCertificate.CertificateType.CLASS_SPECIFIC,
                certificate_number='TEST_ADG_004',
                issuing_authority='Test Training Provider',
                issue_date=timezone.now().date() - timedelta(days=335),
                expiry_date=timezone.now().date() + timedelta(days=25),  # Expires in 25 days
                hazard_classes_covered=['3'],
                competency_areas=['packaging', 'loading'],
                status=ADGDriverCertificate.CertificateStatus.EXPIRING_SOON,
                training_program=self.class_3_training
            )
            
            DriverCompetencyProfile.objects.create(
                driver=self.expiring_driver,
                overall_status=DriverCompetencyProfile.OverallStatus.FULLY_QUALIFIED,
                qualified_hazard_classes=['3'],
                years_experience=3.0,
                compliance_percentage=85.0
            )

    def create_test_shipments(self):
        """Create test shipments with different dangerous goods profiles"""
        
        # 1. Non-dangerous goods shipment
        self.non_dg_shipment = Shipment.objects.create(
            tracking_number='TEST_NON_DG_001',
            customer=self.customer_company,
            carrier=self.carrier_company,
            origin_location='Sydney',
            destination_location='Melbourne',
            freight_type=self.freight_type,
            status='PENDING'
        )
        
        ConsignmentItem.objects.create(
            shipment=self.non_dg_shipment,
            description='Regular office supplies',
            quantity=5,
            weight_kg=25.0,
            is_dangerous_good=False
        )
        
        # 2. Class 3 dangerous goods shipment
        self.class_3_shipment = Shipment.objects.create(
            tracking_number='TEST_CLASS3_001',
            customer=self.customer_company,
            carrier=self.carrier_company,
            origin_location='Brisbane',
            destination_location='Perth',
            freight_type=self.freight_type,
            status='PENDING'
        )
        
        ConsignmentItem.objects.create(
            shipment=self.class_3_shipment,
            description='Gasoline for industrial use',
            quantity=4,
            weight_kg=200.0,
            is_dangerous_good=True,
            dangerous_good_entry=self.class_3_dg
        )
        
        # 3. Class 8 dangerous goods shipment
        self.class_8_shipment = Shipment.objects.create(
            tracking_number='TEST_CLASS8_001',
            customer=self.customer_company,
            carrier=self.carrier_company,
            origin_location='Adelaide',
            destination_location='Darwin',
            freight_type=self.freight_type,
            status='PENDING'
        )
        
        ConsignmentItem.objects.create(
            shipment=self.class_8_shipment,
            description='Hydrochloric acid solution',
            quantity=2,
            weight_kg=100.0,
            is_dangerous_good=True,
            dangerous_good_entry=self.class_8_dg
        )
        
        # 4. Mixed dangerous goods shipment (Class 3 + Class 8)
        self.mixed_dg_shipment = Shipment.objects.create(
            tracking_number='TEST_MIXED_001',
            customer=self.customer_company,
            carrier=self.carrier_company,
            origin_location='Hobart',
            destination_location='Canberra',
            freight_type=self.freight_type,
            status='PENDING'
        )
        
        ConsignmentItem.objects.create(
            shipment=self.mixed_dg_shipment,
            description='Petroleum spirit',
            quantity=1,
            weight_kg=50.0,
            is_dangerous_good=True,
            dangerous_good_entry=self.class_3_dg
        )
        
        ConsignmentItem.objects.create(
            shipment=self.mixed_dg_shipment,
            description='Cleaning acid',
            quantity=1,
            weight_kg=25.0,
            is_dangerous_good=True,
            dangerous_good_entry=self.class_8_dg
        )

    def run_qualification_tests(self):
        """Run comprehensive qualification validation tests"""
        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.WARNING('DRIVER QUALIFICATION VALIDATION TESTS'))
        self.stdout.write('='*80)
        
        # Test scenarios
        test_scenarios = [
            {
                'name': 'Non-DG Shipment Validation',
                'shipment_attr': 'non_dg_shipment',
                'drivers': ['qualified_driver', 'partial_driver', 'unqualified_driver', 'expiring_driver']
            },
            {
                'name': 'Class 3 DG Shipment Validation',
                'shipment_attr': 'class_3_shipment',
                'drivers': ['qualified_driver', 'partial_driver', 'unqualified_driver', 'expiring_driver']
            },
            {
                'name': 'Class 8 DG Shipment Validation',
                'shipment_attr': 'class_8_shipment',
                'drivers': ['qualified_driver', 'partial_driver', 'unqualified_driver']  # Class 8 requires different cert
            },
            {
                'name': 'Mixed DG Shipment Validation',
                'shipment_attr': 'mixed_dg_shipment',
                'drivers': ['qualified_driver', 'partial_driver']
            }
        ]
        
        for scenario in test_scenarios:
            self.run_scenario_tests(scenario)
        
        # Test qualified drivers retrieval
        self.test_qualified_drivers_retrieval()

    def run_scenario_tests(self, scenario):
        """Run validation tests for a specific scenario"""
        self.stdout.write(f'\n{"-"*60}')
        self.stdout.write(self.style.HTTP_INFO(f'Testing: {scenario["name"]}'))
        self.stdout.write(f'{"-"*60}')
        
        shipment = getattr(self, scenario['shipment_attr'])
        
        # Display shipment details
        self.stdout.write(f'Shipment: {shipment.tracking_number}')
        self.stdout.write(f'Route: {shipment.origin_location} → {shipment.destination_location}')
        
        # Show dangerous goods in shipment
        dg_items = shipment.items.filter(is_dangerous_good=True)
        if dg_items.exists():
            self.stdout.write('Dangerous Goods:')
            for item in dg_items:
                dg = item.dangerous_good_entry
                self.stdout.write(f'  • {dg.un_number} - {dg.proper_shipping_name} (Class {dg.hazard_class})')
        else:
            self.stdout.write('No dangerous goods')
        
        self.stdout.write('')
        
        # Test each driver
        for driver_attr in scenario['drivers']:
            driver = getattr(self, driver_attr)
            self.test_driver_validation(driver, shipment)

    def test_driver_validation(self, driver, shipment):
        """Test validation for a specific driver-shipment combination"""
        try:
            # Validate driver qualifications
            result = ShipmentDriverQualificationService.validate_driver_for_shipment(driver, shipment)
            
            # Display results
            status_color = self.style.SUCCESS if result['overall_qualified'] else self.style.ERROR
            status_text = '✓ QUALIFIED' if result['overall_qualified'] else '✗ NOT QUALIFIED'
            
            self.stdout.write(f'Driver: {driver.get_full_name()} ({driver.username})')
            self.stdout.write(f'  Status: {status_color(status_text)}')
            self.stdout.write(f'  Level: {result["qualification_level"]}')
            self.stdout.write(f'  Type: {result["validation_type"]}')
            
            if result.get('compliance_percentage') is not None:
                percentage_color = self.style.SUCCESS if result['compliance_percentage'] >= 80 else self.style.WARNING
                self.stdout.write(f'  Compliance: {percentage_color(f"{result["compliance_percentage"]:.1f}%")}')
            
            if result['dangerous_goods_classes']:
                self.stdout.write(f'  DG Classes: {", ".join(result["dangerous_goods_classes"])}')
            
            # Show critical issues
            if result['critical_issues']:
                self.stdout.write(f'  {self.style.ERROR("Critical Issues:")}')
                for issue in result['critical_issues']:
                    self.stdout.write(f'    • {issue}')
            
            # Show warnings
            if result['warnings']:
                self.stdout.write(f'  {self.style.WARNING("Warnings:")}')
                for warning in result['warnings']:
                    self.stdout.write(f'    • {warning}')
            
            # Show recommendations
            if result['recommendations']:
                self.stdout.write(f'  Recommendations:')
                for rec in result['recommendations']:
                    self.stdout.write(f'    • {rec}')
            
            # Test assignment capability
            can_assign, blocking_issues = ShipmentDriverQualificationService.can_driver_be_assigned(
                driver, shipment, strict_mode=False
            )
            
            assign_color = self.style.SUCCESS if can_assign else self.style.ERROR
            assign_text = 'CAN ASSIGN' if can_assign else 'CANNOT ASSIGN'
            self.stdout.write(f'  Assignment: {assign_color(assign_text)}')
            
            if blocking_issues:
                self.stdout.write(f'  Blocking Issues: {", ".join(blocking_issues[:2])}')
            
            self.stdout.write('')
            
        except Exception as e:
            self.stdout.write(f'Driver: {driver.get_full_name()}')
            self.stdout.write(f'  {self.style.ERROR(f"ERROR: {str(e)}")}')
            self.stdout.write('')

    def test_qualified_drivers_retrieval(self):
        """Test retrieval of qualified drivers for shipments"""
        self.stdout.write(f'\n{"-"*60}')
        self.stdout.write(self.style.HTTP_INFO('Testing: Qualified Drivers Retrieval'))
        self.stdout.write(f'{"-"*60}')
        
        shipments = [
            ('Non-DG Shipment', self.non_dg_shipment),
            ('Class 3 DG Shipment', self.class_3_shipment),
            ('Class 8 DG Shipment', self.class_8_shipment),
            ('Mixed DG Shipment', self.mixed_dg_shipment)
        ]
        
        for name, shipment in shipments:
            self.stdout.write(f'\n{name} ({shipment.tracking_number}):')
            
            try:
                qualified_drivers = ShipmentDriverQualificationService.get_qualified_drivers_for_shipment(shipment)
                
                if qualified_drivers:
                    self.stdout.write(f'  Found {len(qualified_drivers)} qualified driver(s):')
                    for driver_info in qualified_drivers:
                        compliance = driver_info['compliance_percentage']
                        compliance_color = self.style.SUCCESS if compliance >= 90 else self.style.WARNING
                        
                        self.stdout.write(f'    • {driver_info["driver_name"]} ({compliance_color(f"{compliance:.1f}%")})')
                        
                        if driver_info['warnings']:
                            self.stdout.write(f'      Warnings: {len(driver_info["warnings"])}')
                else:
                    self.stdout.write(f'  {self.style.WARNING("No qualified drivers found")}')
                    
            except Exception as e:
                self.stdout.write(f'  {self.style.ERROR(f"ERROR: {str(e)}")}')

    def cleanup_test_data(self):
        """Clean up test data"""
        self.stdout.write('\nCleaning up test data...')
        
        # Delete test shipments (will cascade to items)
        test_shipments = Shipment.objects.filter(tracking_number__startswith='TEST_')
        self.stdout.write(f'Deleting {test_shipments.count()} test shipments...')
        test_shipments.delete()
        
        # Delete test drivers and their qualifications
        test_drivers = User.objects.filter(username__startswith='test_')
        self.stdout.write(f'Deleting {test_drivers.count()} test drivers...')
        test_drivers.delete()
        
        # Delete test companies
        test_companies = Company.objects.filter(name__startswith='SafeShipper Test')
        self.stdout.write(f'Deleting {test_companies.count()} test companies...')
        test_companies.delete()
        
        # Delete test freight types
        test_freight_types = FreightType.objects.filter(name__startswith='Test')
        self.stdout.write(f'Deleting {test_freight_types.count()} test freight types...')
        test_freight_types.delete()
        
        # Delete test training programs and categories
        test_programs = TrainingProgram.objects.filter(name__startswith='Test')
        self.stdout.write(f'Deleting {test_programs.count()} test training programs...')
        test_programs.delete()
        
        test_categories = TrainingCategory.objects.filter(name__startswith='Test')
        self.stdout.write(f'Deleting {test_categories.count()} test training categories...')
        test_categories.delete()
        
        self.stdout.write(self.style.SUCCESS('Test data cleanup completed!'))