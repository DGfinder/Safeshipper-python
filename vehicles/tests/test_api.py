from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from ..models import Vehicle, VehicleType, VehicleStatus

User = get_user_model()

class VehicleAPITests(TestCase):
    def setUp(self):
        """Set up test data and API client"""
        # Create test users
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='userpass123'
        )
        
        # Set up API client
        self.client = APIClient()
        
        # Create test vehicle
        self.vehicle = Vehicle.objects.create(
            registration_number='ABC123',
            vehicle_type=VehicleType.TRUCK,
            status=VehicleStatus.ACTIVE,
            make='Test Make',
            model='Test Model',
            year=2020,
            created_by=self.admin_user,
            updated_by=self.admin_user
        )
        
        # Define API endpoints
        self.list_url = reverse('api:vehicle-list')
        self.detail_url = reverse('api:vehicle-detail', kwargs={'pk': self.vehicle.pk})
        
        # Define test data
        self.valid_payload = {
            'registration_number': 'XYZ789',
            'vehicle_type': VehicleType.TRUCK,
            'status': VehicleStatus.ACTIVE,
            'make': 'New Make',
            'model': 'New Model',
            'year': 2021
        }
        self.invalid_payload = {
            'registration_number': '',  # Invalid: empty registration
            'vehicle_type': 'INVALID',  # Invalid: not a valid choice
            'status': 'INVALID',        # Invalid: not a valid choice
            'make': '',                 # Invalid: empty make
            'model': '',                # Invalid: empty model
            'year': 1899                # Invalid: year too old
        }

    def test_list_vehicles_unauthorized(self):
        """Test that unauthorized users cannot list vehicles"""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_vehicles_authorized(self):
        """Test that authorized users can list vehicles"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_vehicle_unauthorized(self):
        """Test that unauthorized users cannot create vehicles"""
        response = self.client.post(self.list_url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_vehicle_authorized(self):
        """Test that authorized users can create vehicles"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.list_url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_vehicle_invalid_data(self):
        """Test creating a vehicle with invalid data"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.list_url, self.invalid_payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_vehicle_unauthorized(self):
        """Test that unauthorized users cannot retrieve vehicles"""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_vehicle_authorized(self):
        """Test that authorized users can retrieve vehicles"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['registration_number'], self.vehicle.registration_number)

    def test_update_vehicle_unauthorized(self):
        """Test that unauthorized users cannot update vehicles"""
        response = self.client.put(self.detail_url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_vehicle_authorized(self):
        """Test that authorized users can update vehicles"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.put(self.detail_url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_vehicle_unauthorized(self):
        """Test that unauthorized users cannot delete vehicles"""
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_vehicle_authorized(self):
        """Test that authorized users can delete vehicles"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT) 