from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from ..models import Vehicle, VehicleType, VehicleStatus

User = get_user_model()

class VehicleModelTests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.vehicle_data = {
            'registration_number': 'ABC123',
            'vehicle_type': VehicleType.TRUCK,
            'status': VehicleStatus.ACTIVE,
            'make': 'Test Make',
            'model': 'Test Model',
            'year': 2020,
            'created_by': self.user,
            'updated_by': self.user
        }

    def test_create_vehicle(self):
        """Test creating a vehicle with valid data"""
        vehicle = Vehicle.objects.create(**self.vehicle_data)
        self.assertEqual(vehicle.registration_number, 'ABC123')
        self.assertEqual(vehicle.vehicle_type, VehicleType.TRUCK)
        self.assertEqual(vehicle.status, VehicleStatus.ACTIVE)
        self.assertEqual(vehicle.make, 'Test Make')
        self.assertEqual(vehicle.model, 'Test Model')
        self.assertEqual(vehicle.year, 2020)

    def test_unique_registration_number(self):
        """Test that registration numbers must be unique"""
        Vehicle.objects.create(**self.vehicle_data)
        with self.assertRaises(ValidationError):
            Vehicle.objects.create(**self.vehicle_data)

    def test_vehicle_type_choices(self):
        """Test that vehicle type must be a valid choice"""
        self.vehicle_data['vehicle_type'] = 'INVALID_TYPE'
        with self.assertRaises(ValidationError):
            Vehicle.objects.create(**self.vehicle_data)

    def test_vehicle_status_choices(self):
        """Test that vehicle status must be a valid choice"""
        self.vehicle_data['status'] = 'INVALID_STATUS'
        with self.assertRaises(ValidationError):
            Vehicle.objects.create(**self.vehicle_data)

    def test_year_validation(self):
        """Test year validation"""
        # Test year too old
        self.vehicle_data['year'] = 1899
        with self.assertRaises(ValidationError):
            Vehicle.objects.create(**self.vehicle_data)

        # Test year in future
        self.vehicle_data['year'] = 2100
        with self.assertRaises(ValidationError):
            Vehicle.objects.create(**self.vehicle_data)

    def test_timestamps(self):
        """Test that timestamps are automatically set"""
        vehicle = Vehicle.objects.create(**self.vehicle_data)
        self.assertIsNotNone(vehicle.created_at)
        self.assertIsNotNone(vehicle.updated_at)
        self.assertEqual(vehicle.created_at, vehicle.updated_at)

    def test_str_representation(self):
        """Test the string representation of the vehicle"""
        vehicle = Vehicle.objects.create(**self.vehicle_data)
        expected_str = f"{vehicle.registration_number} ({vehicle.make} {vehicle.model})"
        self.assertEqual(str(vehicle), expected_str) 