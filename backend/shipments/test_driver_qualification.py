# shipments/test_driver_qualification.py

import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from freight_types.models import FreightType
from dangerous_goods.models import DangerousGood
from training.models import TrainingProgram, TrainingCategory
from training.adg_driver_qualifications import DriverLicense, ADGDriverCertificate, DriverCompetencyProfile
from .models import Shipment, ConsignmentItem
from .driver_qualification_service import ShipmentDriverQualificationService

User = get_user_model()


class DriverQualificationServiceTest(TestCase):
    """Test the driver qualification validation service"""
    
    def setUp(self):
        """Set up test data"""
        # Create companies
        self.customer_company = Company.objects.create(
            name="Test Customer",
            company_type="CUSTOMER"
        )
        self.carrier_company = Company.objects.create(
            name="Test Carrier", 
            company_type="CARRIER"
        )
        
        # Create freight type
        self.freight_type = FreightType.objects.create(
            name="General Freight",
            description="General freight type"
        )
        
        # Create users
        self.qualified_driver = User.objects.create_user(
            username="qualified_driver",
            email="qualified@test.com",
            role="DRIVER",
            first_name="John",
            last_name="Qualified"
        )
        
        self.unqualified_driver = User.objects.create_user(
            username="unqualified_driver", 
            email="unqualified@test.com",
            role="DRIVER",
            first_name="Jane",
            last_name="Unqualified"
        )
        
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            role="MANAGER"
        )
        
        # Create dangerous good
        self.dangerous_good = DangerousGood.objects.create(
            un_number="UN1203",
            proper_shipping_name="Gasoline",
            hazard_class="3",
            packing_group="II"
        )
        
        # Create training category and program for DG
        self.training_category = TrainingCategory.objects.create(
            name="Dangerous Goods",
            is_mandatory=True
        )
        
        self.dg_training_program = TrainingProgram.objects.create(
            name="Class 3 Flammable Liquids Training",
            category=self.training_category,
            delivery_method="blended",
            difficulty_level="intermediate",
            duration_hours=8,
            is_mandatory=True,
            compliance_required=True,
            passing_score=80,
            certificate_validity_months=12
        )
        
        # Set up qualified driver with valid license and certificate
        self.setup_qualified_driver()
        
        # Create test shipments
        self.create_test_shipments()
    
    def setup_qualified_driver(self):
        """Set up qualified driver with valid licenses and certificates"""
        # Valid driver license
        DriverLicense.objects.create(
            driver=self.qualified_driver,
            license_number="DL123456",
            license_class="HR",
            state_issued="NSW",
            issue_date=timezone.now().date() - timedelta(days=365),
            expiry_date=timezone.now().date() + timedelta(days=365),
            status=DriverLicense.LicenseStatus.VALID
        )
        
        # Valid ADG certificate for Class 3
        ADGDriverCertificate.objects.create(
            driver=self.qualified_driver,
            certificate_type=ADGDriverCertificate.CertificateType.CLASS_SPECIFIC,
            certificate_number="ADG123456",
            issuing_authority="Test Authority",
            issue_date=timezone.now().date() - timedelta(days=30),
            expiry_date=timezone.now().date() + timedelta(days=335),
            hazard_classes_covered=['3'],
            competency_areas=['packaging', 'loading', 'documentation'],
            status=ADGDriverCertificate.CertificateStatus.VALID,
            training_program=self.dg_training_program
        )
        
        # Create competency profile
        DriverCompetencyProfile.objects.create(
            driver=self.qualified_driver,
            overall_status=DriverCompetencyProfile.OverallStatus.FULLY_QUALIFIED,
            qualified_hazard_classes=['3'],
            years_experience=5.0,
            compliance_percentage=100.0
        )
    
    def create_test_shipments(self):
        """Create test shipments with and without dangerous goods"""
        # Non-dangerous goods shipment
        self.non_dg_shipment = Shipment.objects.create(
            customer=self.customer_company,
            carrier=self.carrier_company,
            origin_location="Sydney",
            destination_location="Melbourne", 
            freight_type=self.freight_type,
            status="PENDING"
        )
        
        ConsignmentItem.objects.create(
            shipment=self.non_dg_shipment,
            description="Regular freight item",
            quantity=1,
            weight_kg=50.0,
            is_dangerous_good=False
        )
        
        # Dangerous goods shipment (Class 3)
        self.dg_shipment = Shipment.objects.create(
            customer=self.customer_company,
            carrier=self.carrier_company,
            origin_location="Brisbane",
            destination_location="Perth",
            freight_type=self.freight_type,
            status="PENDING"
        )
        
        ConsignmentItem.objects.create(
            shipment=self.dg_shipment,
            description="Gasoline",
            quantity=2,
            weight_kg=100.0,
            is_dangerous_good=True,
            dangerous_good_entry=self.dangerous_good
        )
    
    def test_validate_qualified_driver_for_non_dg_shipment(self):
        """Test validation of qualified driver for non-dangerous goods shipment"""
        result = ShipmentDriverQualificationService.validate_driver_for_shipment(
            self.qualified_driver, self.non_dg_shipment
        )
        
        self.assertEqual(result['validation_type'], 'NON_DANGEROUS_GOODS')
        self.assertTrue(result['overall_qualified'])
        self.assertEqual(result['qualification_level'], 'BASIC')
        self.assertEqual(len(result['dangerous_goods_classes']), 0)
        self.assertEqual(len(result['critical_issues']), 0)
    
    def test_validate_qualified_driver_for_dg_shipment(self):
        """Test validation of qualified driver for dangerous goods shipment"""
        result = ShipmentDriverQualificationService.validate_driver_for_shipment(
            self.qualified_driver, self.dg_shipment
        )
        
        self.assertEqual(result['validation_type'], 'DANGEROUS_GOODS')
        self.assertTrue(result['overall_qualified'])
        self.assertEqual(result['qualification_level'], 'DANGEROUS_GOODS')
        self.assertIn('3', result['dangerous_goods_classes'])
        self.assertEqual(len(result['critical_issues']), 0)
        self.assertGreater(result['compliance_percentage'], 90)
    
    def test_validate_unqualified_driver_for_dg_shipment(self):
        """Test validation of unqualified driver for dangerous goods shipment"""
        result = ShipmentDriverQualificationService.validate_driver_for_shipment(
            self.unqualified_driver, self.dg_shipment
        )
        
        self.assertEqual(result['validation_type'], 'DANGEROUS_GOODS')
        self.assertFalse(result['overall_qualified'])
        self.assertIn('INSUFFICIENT', result['qualification_level'])
        self.assertIn('3', result['dangerous_goods_classes'])
        self.assertGreater(len(result['critical_issues']), 0)
    
    def test_get_qualified_drivers_for_non_dg_shipment(self):
        """Test getting qualified drivers for non-dangerous goods shipment"""
        qualified_drivers = ShipmentDriverQualificationService.get_qualified_drivers_for_shipment(
            self.non_dg_shipment
        )
        
        # Should include drivers with valid licenses
        driver_ids = [driver['driver_id'] for driver in qualified_drivers]
        self.assertIn(self.qualified_driver.id, driver_ids)
    
    def test_get_qualified_drivers_for_dg_shipment(self):
        """Test getting qualified drivers for dangerous goods shipment"""
        qualified_drivers = ShipmentDriverQualificationService.get_qualified_drivers_for_shipment(
            self.dg_shipment
        )
        
        # Should only include qualified driver
        driver_ids = [driver['driver_id'] for driver in qualified_drivers]
        self.assertIn(self.qualified_driver.id, driver_ids)
        self.assertNotIn(self.unqualified_driver.id, driver_ids)
    
    def test_can_driver_be_assigned_qualified(self):
        """Test assignment check for qualified driver"""
        can_assign, issues = ShipmentDriverQualificationService.can_driver_be_assigned(
            self.qualified_driver, self.dg_shipment
        )
        
        self.assertTrue(can_assign)
        self.assertEqual(len(issues), 0)
    
    def test_can_driver_be_assigned_unqualified(self):
        """Test assignment check for unqualified driver"""
        can_assign, issues = ShipmentDriverQualificationService.can_driver_be_assigned(
            self.unqualified_driver, self.dg_shipment
        )
        
        self.assertFalse(can_assign)
        self.assertGreater(len(issues), 0)


class DriverQualificationAPITest(TestCase):
    """Test the driver qualification API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create companies
        self.customer_company = Company.objects.create(
            name="Test Customer",
            company_type="CUSTOMER"
        )
        self.carrier_company = Company.objects.create(
            name="Test Carrier", 
            company_type="CARRIER"
        )
        
        # Create freight type
        self.freight_type = FreightType.objects.create(
            name="General Freight",
            description="General freight type"
        )
        
        # Create users
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            role="MANAGER"
        )
        
        self.driver = User.objects.create_user(
            username="driver",
            email="driver@test.com",
            role="DRIVER",
            first_name="Test",
            last_name="Driver"
        )
        
        # Create test shipment
        self.shipment = Shipment.objects.create(
            customer=self.customer_company,
            carrier=self.carrier_company,
            origin_location="Sydney",
            destination_location="Melbourne",
            freight_type=self.freight_type,
            status="PENDING"
        )
        
        # Authenticate as manager
        self.client.force_authenticate(user=self.manager)
    
    def test_assign_driver_api_missing_driver_id(self):
        """Test assign driver API with missing driver_id"""
        url = f'/api/v1/shipments/{self.shipment.id}/assign-driver/'
        response = self.client.post(url, {})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('driver_id is required', response.data['error'])
    
    def test_assign_driver_api_invalid_driver(self):
        """Test assign driver API with invalid driver ID"""
        url = f'/api/v1/shipments/{self.shipment.id}/assign-driver/'
        response = self.client.post(url, {'driver_id': str(uuid.uuid4())})
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Driver not found', response.data['error'])
    
    def test_assign_driver_api_non_driver_role(self):
        """Test assign driver API with non-driver user"""
        url = f'/api/v1/shipments/{self.shipment.id}/assign-driver/'
        response = self.client.post(url, {'driver_id': str(self.manager.id)})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not a driver', response.data['error'])
    
    def test_get_qualified_drivers_api(self):
        """Test get qualified drivers API endpoint"""
        url = f'/api/v1/shipments/{self.shipment.id}/qualified-drivers/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('shipment_id', response.data)
        self.assertIn('qualified_drivers', response.data)
        self.assertIn('total_qualified', response.data)
        self.assertIn('validation_summary', response.data)
    
    def test_validate_driver_api_missing_driver_id(self):
        """Test validate driver API with missing driver_id"""
        url = f'/api/v1/shipments/{self.shipment.id}/validate-driver/'
        response = self.client.post(url, {})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('driver_id is required', response.data['error'])
    
    def test_validate_driver_api_success(self):
        """Test validate driver API with valid driver"""
        url = f'/api/v1/shipments/{self.shipment.id}/validate-driver/'
        response = self.client.post(url, {'driver_id': str(self.driver.id)})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('shipment_id', response.data)
        self.assertIn('driver_id', response.data)
        self.assertIn('validation_result', response.data)
        
        # Check validation result structure
        validation_result = response.data['validation_result']
        self.assertIn('overall_qualified', validation_result)
        self.assertIn('qualification_level', validation_result)
        self.assertIn('assignment_recommendation', validation_result)