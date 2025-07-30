# e2e_tests/utils.py
"""
End-to-end testing utilities for SafeShipper platform.
Provides setup, teardown, and helper functions for comprehensive testing.
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from faker import Faker
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken

fake = Faker()
User = get_user_model()


class E2ETestSetup:
    """
    Setup utilities for end-to-end testing scenarios.
    Creates realistic test data and user accounts.
    """
    
    @staticmethod
    def create_test_company():
        """Create a test company for multi-tenant testing."""
        from companies.models import Company
        
        return Company.objects.create(
            name=f"Test Transport Co - {fake.company_suffix()}",
            business_number=fake.bothify(text="##########"),
            address_line1=fake.street_address(),
            city=fake.city(),
            state=fake.state_abbr(),
            postal_code=fake.postcode(),
            country="US",
            phone=fake.phone_number(),
            email=fake.company_email(),
            is_active=True
        )
    
    @staticmethod
    def create_test_users(company):
        """Create test users with different roles for comprehensive testing."""
        users = {}
        
        # Admin user
        users['admin'] = User.objects.create_user(
            username='test_admin',
            email='admin@testcompany.com',
            password='test_password_123',
            first_name='Admin',
            last_name='User',
            company=company,
            role='admin'
        )
        
        # Dispatcher user
        users['dispatcher'] = User.objects.create_user(
            username='test_dispatcher',
            email='dispatcher@testcompany.com',
            password='test_password_123',
            first_name='Sarah',
            last_name='Johnson',
            company=company,
            role='dispatcher'
        )
        
        # Driver user
        users['driver'] = User.objects.create_user(
            username='test_driver',
            email='driver@testcompany.com',
            password='test_password_123',
            first_name='Mike',
            last_name='Wilson',
            company=company,
            role='driver'
        )
        
        # Compliance officer
        users['compliance'] = User.objects.create_user(
            username='test_compliance',
            email='compliance@testcompany.com',
            password='test_password_123',
            first_name='Jennifer',
            last_name='Smith',
            company=company,
            role='compliance_officer'
        )
        
        # Customer user
        users['customer'] = User.objects.create_user(
            username='test_customer',
            email='customer@clientcompany.com',
            password='test_password_123',
            first_name='Robert',
            last_name='Davis',
            company=company,
            role='customer'
        )
        
        return users
    
    @staticmethod
    def create_test_vehicles(company):
        """Create test vehicles for fleet management testing."""
        from fleet.models import Vehicle, VehicleType
        
        vehicles = []
        
        # Create vehicle types
        vehicle_types = [
            VehicleType.objects.get_or_create(
                name="Tanker Truck",
                defaults={
                    "description": "Specialized tank vehicle for liquid dangerous goods",
                    "compatible_hazard_classes": ["3", "8"],
                    "max_capacity_liters": 30000
                }
            )[0],
            VehicleType.objects.get_or_create(
                name="Box Truck",
                defaults={
                    "description": "Enclosed box truck for packaged dangerous goods",
                    "compatible_hazard_classes": ["3", "4.1", "6.1", "8", "9"],
                    "max_capacity_kg": 5000
                }
            )[0],
            VehicleType.objects.get_or_create(
                name="Flatbed Truck",
                defaults={
                    "description": "Open flatbed truck for large containers",
                    "compatible_hazard_classes": ["3", "4.1", "4.2", "4.3", "5.1", "5.2"],
                    "max_capacity_kg": 8000
                }
            )[0]
        ]
        
        # Create test vehicles
        for i, vehicle_type in enumerate(vehicle_types):
            vehicle = Vehicle.objects.create(
                company=company,
                vehicle_type=vehicle_type,
                license_plate=fake.license_plate(),
                vin=fake.bothify(text="?????????????????"),
                make=fake.random_element(["Freightliner", "Peterbilt", "Kenworth", "Volvo"]),
                model=fake.random_element(["Cascadia", "579", "T680", "VNL"]),
                year=fake.random_int(min=2018, max=2024),
                certification_number=fake.bothify(text="CERT-########"),
                certification_expiry=fake.future_date(end_date="+2y"),
                inspection_due_date=fake.future_date(end_date="+6m"),
                is_active=True
            )
            vehicles.append(vehicle)
        
        return vehicles
    
    @staticmethod
    def create_test_dangerous_goods():
        """Create test dangerous goods for testing."""
        from dangerous_goods.models import DangerousGood
        
        test_dg_data = [
            {
                "un_number": "UN1203",
                "proper_shipping_name": "Gasoline",
                "hazard_class": "3",
                "packing_group": "II",
                "description": "Motor spirit, petrol",
                "special_provisions": "144, 177, 380",
                "limited_quantities": "5 L",
                "excepted_quantities": "E2"
            },
            {
                "un_number": "UN1993",
                "proper_shipping_name": "Flammable liquid, n.o.s.",
                "hazard_class": "3",
                "packing_group": "III",
                "description": "Flammable liquid not otherwise specified",
                "special_provisions": "274, 601",
                "limited_quantities": "5 L",
                "excepted_quantities": "E1"
            },
            {
                "un_number": "UN3480",
                "proper_shipping_name": "Lithium ion batteries",
                "hazard_class": "9",
                "packing_group": None,
                "description": "Lithium ion batteries including lithium ion polymer batteries",
                "special_provisions": "188, 230, 310, 376, 377, 384, 387",
                "limited_quantities": "0",
                "excepted_quantities": "E0"
            },
            {
                "un_number": "UN1230",
                "proper_shipping_name": "Methanol",
                "hazard_class": "3",
                "packing_group": "II",
                "description": "Methyl alcohol",
                "special_provisions": "144",
                "limited_quantities": "1 L",
                "excepted_quantities": "E2"
            },
            {
                "un_number": "UN1170",
                "proper_shipping_name": "Ethanol",
                "hazard_class": "3",
                "packing_group": "III",
                "description": "Ethyl alcohol, ethanol solution",
                "special_provisions": "144, 601",
                "limited_quantities": "5 L",
                "excepted_quantities": "E1"
            }
        ]
        
        dangerous_goods = []
        for dg_data in test_dg_data:
            dg, created = DangerousGood.objects.get_or_create(
                un_number=dg_data["un_number"],
                defaults=dg_data
            )
            dangerous_goods.append(dg)
        
        return dangerous_goods
    
    @staticmethod
    def create_test_training_modules():
        """Create test training modules for compliance testing."""
        from training.models import TrainingModule
        
        modules = []
        
        training_data = [
            {
                "title": "Dangerous Goods Handling Fundamentals",
                "description": "Basic training for handling dangerous goods safely",
                "content": "Comprehensive training on DG classification and handling",
                "required_for_roles": ["driver", "dispatcher"],
                "validity_period_days": 365,
                "is_mandatory": True
            },
            {
                "title": "Emergency Response Procedures",
                "description": "Training on emergency response for dangerous goods incidents",
                "content": "Emergency procedures and incident response protocols",
                "required_for_roles": ["driver", "dispatcher", "compliance_officer"],
                "validity_period_days": 730,
                "is_mandatory": True
            },
            {
                "title": "Hazmat Transportation Regulations",
                "description": "Regulatory compliance training for hazmat transportation",
                "content": "ADG Code and regulatory requirements training",
                "required_for_roles": ["compliance_officer", "admin"],
                "validity_period_days": 1095,
                "is_mandatory": True
            }
        ]
        
        for module_data in training_data:
            module = TrainingModule.objects.create(**module_data)
            modules.append(module)
        
        return modules
    
    @staticmethod
    def create_driver_qualifications(driver_user):
        """Create driver qualifications and certifications."""
        from fleet.models import DriverQualification
        
        qualifications = []
        
        qual_data = [
            {
                "qualification_type": "dangerous_goods_license",
                "license_number": "DG-" + fake.bothify(text="########"),
                "issued_date": fake.past_date(start_date="-2y"),
                "expiry_date": fake.future_date(end_date="+1y"),
                "issuing_authority": "State Transport Authority",
                "is_active": True
            },
            {
                "qualification_type": "commercial_drivers_license",
                "license_number": "CDL-" + fake.bothify(text="########"),
                "issued_date": fake.past_date(start_date="-5y"),
                "expiry_date": fake.future_date(end_date="+2y"),
                "issuing_authority": "Department of Motor Vehicles",
                "is_active": True
            }
        ]
        
        for qual in qual_data:
            qualification = DriverQualification.objects.create(
                driver=driver_user,
                **qual
            )
            qualifications.append(qualification)
        
        return qualifications


class E2ETestUtils:
    """
    Utility functions for end-to-end testing workflows.
    """
    
    @staticmethod
    def authenticate_user(client: APIClient, user) -> str:
        """Authenticate user and return JWT token."""
        refresh = RefreshToken.for_user(user)
        token = str(refresh.access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return token
    
    @staticmethod
    def create_test_shipment_data(dangerous_goods_list: List = None) -> Dict[str, Any]:
        """Create realistic shipment data for testing."""
        if not dangerous_goods_list:
            dangerous_goods_list = ["UN1203"]  # Default to gasoline
        
        return {
            "reference_number": fake.bothify(text="SH-########"),
            "origin_address": {
                "company_name": fake.company(),
                "contact_person": fake.name(),
                "phone": fake.phone_number(),
                "email": fake.email(),
                "street": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "postal_code": fake.postcode(),
                "country": "US"
            },
            "destination_address": {
                "company_name": fake.company(),
                "contact_person": fake.name(),
                "phone": fake.phone_number(),
                "email": fake.email(),
                "street": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "postal_code": fake.postcode(),
                "country": "US"
            },
            "dangerous_goods": [
                {
                    "un_number": un_number,
                    "quantity": fake.random_int(min=1, max=500),
                    "unit": fake.random_element(["L", "KG", "items"]),
                    "packaging_group": fake.random_element(["I", "II", "III"]),
                    "packaging_type": fake.random_element(["drums", "boxes", "containers"]),
                    "net_weight": fake.random_int(min=10, max=1000),
                    "gross_weight": fake.random_int(min=15, max=1200)
                } for un_number in dangerous_goods_list
            ],
            "scheduled_pickup": fake.future_datetime(end_date="+7d").isoformat(),
            "requested_delivery": fake.future_datetime(end_date="+14d").isoformat(),
            "priority": fake.random_element(["normal", "high", "urgent"]),
            "special_instructions": fake.paragraph(nb_sentences=3),
            "customer_reference": fake.bothify(text="CUST-######"),
            "service_type": fake.random_element(["standard", "express", "same_day"])
        }
    
    @staticmethod
    def create_test_incident_data() -> Dict[str, Any]:
        """Create realistic incident data for testing."""
        return {
            "title": f"Incident - {fake.sentence(nb_words=4)}",
            "description": fake.paragraph(nb_sentences=5),
            "incident_type": fake.random_element(["spill", "fire", "exposure", "transport_accident", "equipment_failure"]),
            "severity": fake.random_element(["low", "medium", "high", "critical"]),
            "location": {
                "latitude": float(fake.latitude()),
                "longitude": float(fake.longitude()),
                "address": fake.address(),
                "landmark": fake.sentence(nb_words=3)
            },
            "dangerous_goods_involved": [
                {
                    "un_number": fake.random_element(["UN1203", "UN1993", "UN3480"]),
                    "estimated_quantity": fake.random_int(min=1, max=100),
                    "unit": fake.random_element(["L", "KG"])
                }
            ],
            "weather_conditions": fake.random_element(["clear", "rainy", "foggy", "windy"]),
            "temperature": fake.random_int(min=-10, max=40),
            "wind_speed": fake.random_int(min=0, max=30),
            "reported_by": fake.name(),
            "contact_phone": fake.phone_number(),
            "emergency_services_contacted": fake.boolean(),
            "evacuation_required": fake.boolean()
        }
    
    @staticmethod
    def wait_for_async_task(task_id: str, timeout: int = 30) -> bool:
        """Wait for async Celery task to complete."""
        from celery.result import AsyncResult
        
        result = AsyncResult(task_id)
        start_time = time.time()
        
        while not result.ready() and time.time() - start_time < timeout:
            time.sleep(0.5)
        
        return result.ready()
    
    @staticmethod
    def verify_audit_log_entry(action: str, user, object_id: str = None) -> bool:
        """Verify that an audit log entry was created."""
        from audits.models import AuditLog
        
        try:
            log_entry = AuditLog.objects.filter(
                action=action,
                user=user
            ).latest('created_at')
            
            if object_id:
                return str(log_entry.object_id) == str(object_id)
            return True
        except AuditLog.DoesNotExist:
            return False
    
    @staticmethod
    def verify_email_sent(subject_contains: str) -> bool:
        """Verify that an email was sent with specific subject."""
        from django.core import mail
        
        for email in mail.outbox:
            if subject_contains.lower() in email.subject.lower():
                return True
        return False
    
    @staticmethod
    def simulate_mobile_location_update(latitude: float, longitude: float) -> Dict[str, Any]:
        """Simulate mobile device location update."""
        return {
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": fake.random_int(min=1, max=10),
            "timestamp": datetime.now().isoformat(),
            "speed": fake.random_int(min=0, max=120),  # km/h
            "heading": fake.random_int(min=0, max=360)  # degrees
        }
    
    @staticmethod
    def create_proof_of_delivery_data() -> Dict[str, Any]:
        """Create proof of delivery data for testing."""
        return {
            "delivery_timestamp": datetime.now().isoformat(),
            "recipient_name": fake.name(),
            "recipient_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "delivery_photos": [
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            ],
            "delivery_notes": fake.paragraph(nb_sentences=2),
            "condition_on_delivery": fake.random_element(["good", "damaged", "partial"]),
            "damaged_items": [] if fake.boolean() else [fake.sentence(nb_words=4)],
            "location": {
                "latitude": float(fake.latitude()),
                "longitude": float(fake.longitude())
            }
        }
    
    @staticmethod
    def assert_response_contains_fields(response_data: Dict, required_fields: List[str]):
        """Assert that response contains all required fields."""
        missing_fields = []
        for field in required_fields:
            if '.' in field:
                # Handle nested fields
                keys = field.split('.')
                current_data = response_data
                try:
                    for key in keys:
                        current_data = current_data[key]
                except (KeyError, TypeError):
                    missing_fields.append(field)
            elif field not in response_data:
                missing_fields.append(field)
        
        if missing_fields:
            raise AssertionError(f"Response missing required fields: {missing_fields}")
    
    @staticmethod
    def assert_audit_trail_exists(user, action: str, object_type: str, object_id: str = None):
        """Assert that audit trail entry exists for action."""
        from audits.models import AuditLog
        
        filter_kwargs = {
            'user': user,
            'action': action,
            'object_type': object_type
        }
        
        if object_id:
            filter_kwargs['object_id'] = object_id
        
        if not AuditLog.objects.filter(**filter_kwargs).exists():
            raise AssertionError(f"Audit trail entry not found for {action} on {object_type}")
    
    @staticmethod
    def cleanup_test_data():
        """Clean up test data after test completion."""
        # This would be implemented to clean up test-specific data
        # without affecting other tests or production data
        pass


class BaseE2ETestCase(APITestCase):
    """
    Base test case for end-to-end testing with common setup and utilities.
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test class with common test data."""
        super().setUpClass()
        cls.setup_test_environment()
    
    @classmethod
    def setup_test_environment(cls):
        """Set up complete test environment."""
        # Create test company
        cls.test_company = E2ETestSetup.create_test_company()
        
        # Create test users
        cls.test_users = E2ETestSetup.create_test_users(cls.test_company)
        
        # Create test vehicles
        cls.test_vehicles = E2ETestSetup.create_test_vehicles(cls.test_company)
        
        # Create test dangerous goods
        cls.test_dangerous_goods = E2ETestSetup.create_test_dangerous_goods()
        
        # Create test training modules
        cls.test_training_modules = E2ETestSetup.create_test_training_modules()
        
        # Create driver qualifications
        cls.driver_qualifications = E2ETestSetup.create_driver_qualifications(
            cls.test_users['driver']
        )
    
    def setUp(self):
        """Set up individual test."""
        super().setUp()
        self.utils = E2ETestUtils()
        
        # Clear email outbox
        from django.core import mail
        mail.outbox = []
    
    def authenticate_as(self, user_type: str):
        """Authenticate as specific user type."""
        user = self.test_users[user_type]
        return E2ETestUtils.authenticate_user(self.client, user)
    
    def tearDown(self):
        """Clean up after individual test."""
        super().tearDown()
        E2ETestUtils.cleanup_test_data()
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test class data."""
        super().tearDownClass()
        # Additional cleanup if needed