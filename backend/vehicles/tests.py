from django.test import TestCase
from vehicles.models import Vehicle
from vehicles import services
from locations.models import GeoLocation
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

# Create your tests here.

class VehicleModelTests(TestCase):
    def test_vehicle_creation_and_str(self):
        depot = GeoLocation.objects.create(name='Depot 1')
        vehicle = Vehicle.objects.create(
            registration_number='ABC123',
            vehicle_type=Vehicle.VehicleType.TRUCK,
            capacity_kg=10000,
            assigned_depot=depot
        )
        self.assertEqual(str(vehicle), 'ABC123 (Truck)')

class VehicleServiceTests(TestCase):
    def setUp(self):
        self.depot = GeoLocation.objects.create(name='Depot 2')
        self.vehicle_data = {
            'registration_number': 'XYZ789',
            'vehicle_type': Vehicle.VehicleType.VAN,
            'capacity_kg': 5000,
            'assigned_depot': self.depot
        }

    def test_create_vehicle(self):
        vehicle = services.create_vehicle(self.vehicle_data)
        self.assertEqual(vehicle.registration_number, 'XYZ789')

    def test_get_vehicle_by_registration(self):
        vehicle = services.create_vehicle(self.vehicle_data)
        found = services.get_vehicle_by_registration('XYZ789')
        self.assertEqual(found.id, vehicle.id)

    def test_list_available_vehicles_for_depot(self):
        vehicle = services.create_vehicle(self.vehicle_data)
        vehicles = services.list_available_vehicles_for_depot(self.depot)
        self.assertIn(vehicle, vehicles)

class VehicleAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.staff_user = User.objects.create_user(username='staff', password='pass', is_staff=True)
        self.regular_user = User.objects.create_user(username='user', password='pass', is_staff=False)
        self.depot = GeoLocation.objects.create(name='Depot 3')
        self.vehicle = Vehicle.objects.create(
            registration_number='TEST123',
            vehicle_type=Vehicle.VehicleType.TRUCK,
            capacity_kg=12000,
            assigned_depot=self.depot
        )

    def test_list_vehicles(self):
        # Placeholder for list test
        pass

    def test_create_vehicle(self):
        # Placeholder for create test
        pass

    def test_retrieve_vehicle(self):
        # Placeholder for retrieve test
        pass

    def test_update_vehicle(self):
        # Placeholder for update test
        pass

    def test_delete_vehicle(self):
        # Placeholder for delete test
        pass
