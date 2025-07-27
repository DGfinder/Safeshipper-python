# shipments/tests/test_api.py
import json
from datetime import datetime, timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.exceptions import ValidationError, PermissionDenied

from ..models import Shipment, ConsignmentItem, ShipmentStatus
from ..services import (
    create_shipment_with_items, 
    get_shipments_for_user, 
    update_shipment_status_service
)

User = get_user_model()

class ShipmentManagementAPITests(APITestCase):
    """Test shipment CRUD operations and role-based filtering"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users from different depots/companies for testing filtering
        self.admin_user = User.objects.create_user(
            username='admin_shipment',
            email='admin@shipment.com',
            password='AdminShip123!',
            role=User.Role.ADMIN,
            is_staff=True,
            depot='ADMIN_DEPOT'
        )
        
        self.depot_a_dispatcher = User.objects.create_user(
            username='depot_a_dispatcher',
            email='depota_dispatcher@shipment.com',
            password='DepotA123!',
            role=User.Role.DISPATCHER,
            depot='DEPOT_A'
        )
        
        self.depot_b_dispatcher = User.objects.create_user(
            username='depot_b_dispatcher',
            email='depotb_dispatcher@shipment.com',
            password='DepotB123!',
            role=User.Role.DISPATCHER,
            depot='DEPOT_B'
        )
        
        self.depot_a_driver = User.objects.create_user(
            username='depot_a_driver',
            email='depota_driver@shipment.com',
            password='DepotADriver123!',
            role=User.Role.DRIVER,
            depot='DEPOT_A'
        )
        
        self.depot_b_driver = User.objects.create_user(
            username='depot_b_driver',
            email='depotb_driver@shipment.com',
            password='DepotBDriver123!',
            role=User.Role.DRIVER,
            depot='DEPOT_B'
        )
        
        self.customer_user = User.objects.create_user(
            username='customer_user',
            email='customer@shipment.com',
            password='Customer123!',
            role=User.Role.CUSTOMER
        )
        
        # Create test shipments assigned to different depots
        self.shipment_depot_a_1 = Shipment.objects.create(
            reference_number='DEPOT_A_001',
            origin_address='123 Origin Street, City A',
            destination_address='456 Destination Ave, City B',
            assigned_depot='DEPOT_A',
            status=ShipmentStatus.PENDING,
            estimated_departure_date=datetime.now(timezone.utc)
        )
        
        self.shipment_depot_a_2 = Shipment.objects.create(
            reference_number='DEPOT_A_002',
            origin_address='789 Source Road, City A',
            destination_address='321 Target Street, City C',
            assigned_depot='DEPOT_A',
            status=ShipmentStatus.IN_TRANSIT,
            estimated_departure_date=datetime.now(timezone.utc)
        )
        
        self.shipment_depot_b_1 = Shipment.objects.create(
            reference_number='DEPOT_B_001',
            origin_address='555 Start Lane, City B',
            destination_address='777 End Boulevard, City D',
            assigned_depot='DEPOT_B',
            status=ShipmentStatus.DELIVERED,
            estimated_departure_date=datetime.now(timezone.utc)
        )
        
        # Add consignment items to shipments
        ConsignmentItem.objects.create(
            shipment=self.shipment_depot_a_1,
            description='Standard Electronics',
            quantity=5,
            weight_kg=10.5,
            is_dangerous_good=False
        )
        
        ConsignmentItem.objects.create(
            shipment=self.shipment_depot_a_2,
            description='Flammable Liquid - Acetone',
            quantity=2,
            weight_kg=25.0,
            is_dangerous_good=True,
            un_number='UN1090',
            proper_shipping_name='ACETONE',
            hazard_class='3',
            packing_group='II'
        )

    def test_admin_can_view_all_shipments(self):
        """Test that ADMIN users can see shipments from all depots"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('shipment-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # Should see all 3 shipments
        
        # Verify shipments from both depots are included
        reference_numbers = [shipment['reference_number'] for shipment in response.data]
        self.assertIn('DEPOT_A_001', reference_numbers)
        self.assertIn('DEPOT_A_002', reference_numbers)
        self.assertIn('DEPOT_B_001', reference_numbers)

    def test_dispatcher_sees_only_own_depot_shipments(self):
        """Test that DISPATCHER users only see shipments from their assigned depot"""
        # Test Depot A dispatcher
        self.client.force_authenticate(user=self.depot_a_dispatcher)
        url = reverse('shipment-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Should see only 2 DEPOT_A shipments
        
        reference_numbers = [shipment['reference_number'] for shipment in response.data]
        self.assertIn('DEPOT_A_001', reference_numbers)
        self.assertIn('DEPOT_A_002', reference_numbers)
        self.assertNotIn('DEPOT_B_001', reference_numbers)
        
        # Test Depot B dispatcher
        self.client.force_authenticate(user=self.depot_b_dispatcher)
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Should see only 1 DEPOT_B shipment
        
        reference_numbers = [shipment['reference_number'] for shipment in response.data]
        self.assertIn('DEPOT_B_001', reference_numbers)
        self.assertNotIn('DEPOT_A_001', reference_numbers)
        self.assertNotIn('DEPOT_A_002', reference_numbers)

    def test_driver_sees_only_own_depot_shipments(self):
        """Test that DRIVER users only see shipments from their assigned depot"""
        self.client.force_authenticate(user=self.depot_a_driver)
        url = reverse('shipment-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Should see only DEPOT_A shipments
        
        reference_numbers = [shipment['reference_number'] for shipment in response.data]
        self.assertIn('DEPOT_A_001', reference_numbers)
        self.assertIn('DEPOT_A_002', reference_numbers)
        self.assertNotIn('DEPOT_B_001', reference_numbers)

    def test_customer_has_no_depot_access(self):
        """Test that CUSTOMER users see no shipments (or only their own in full implementation)"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('shipment-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Customer should see 0 shipments as they have no depot assignment
        self.assertEqual(len(response.data), 0)

    def test_create_shipment_with_nested_items(self):
        """Test creating a shipment with nested consignment items"""
        self.client.force_authenticate(user=self.depot_a_dispatcher)
        url = reverse('shipment-list')
        
        shipment_payload = {
            'reference_number': 'NEW_SHIPMENT_001',
            'origin_address': 'New Origin Address',
            'destination_address': 'New Destination Address',
            'assigned_depot': 'DEPOT_A',
            'status': ShipmentStatus.PENDING,
            'items': [
                {
                    'description': 'Standard Goods',
                    'quantity': 10,
                    'weight_kg': 15.5,
                    'is_dangerous_good': False
                },
                {
                    'description': 'Dangerous Good - Gasoline',
                    'quantity': 1,
                    'weight_kg': 50.0,
                    'is_dangerous_good': True,
                    'un_number': 'UN1203',
                    'proper_shipping_name': 'GASOLINE',
                    'hazard_class': '3',
                    'packing_group': 'II'
                }
            ]
        }
        
        response = self.client.post(url, shipment_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reference_number'], 'NEW_SHIPMENT_001')
        self.assertEqual(response.data['assigned_depot'], 'DEPOT_A')
        
        # Verify shipment was created in database
        created_shipment = Shipment.objects.get(reference_number='NEW_SHIPMENT_001')
        self.assertEqual(created_shipment.items.count(), 2)
        
        # Verify dangerous good item has proper UN data
        dg_item = created_shipment.items.filter(is_dangerous_good=True).first()
        self.assertEqual(dg_item.un_number, 'UN1203')
        self.assertEqual(dg_item.proper_shipping_name, 'GASOLINE')
        self.assertEqual(dg_item.hazard_class, '3')

    def test_dispatcher_cannot_create_for_other_depot(self):
        """Test that dispatchers cannot create shipments for other depots"""
        self.client.force_authenticate(user=self.depot_a_dispatcher)
        url = reverse('shipment-list')
        
        # Try to create shipment for DEPOT_B
        invalid_payload = {
            'reference_number': 'INVALID_CROSS_DEPOT',
            'origin_address': 'Cross Depot Origin',
            'destination_address': 'Cross Depot Destination',
            'assigned_depot': 'DEPOT_B',  # Different from user's depot
            'status': ShipmentStatus.PENDING,
            'items': [
                {
                    'description': 'Test Item',
                    'quantity': 1,
                    'weight_kg': 5.0,
                    'is_dangerous_good': False
                }
            ]
        }
        
        response = self.client.post(url, invalid_payload, format='json')
        
        # Should either be forbidden or the depot should be forced to user's depot
        # This depends on implementation - testing for security
        if response.status_code == status.HTTP_201_CREATED:
            # If created, verify it was assigned to user's depot, not requested depot
            self.assertEqual(response.data['assigned_depot'], 'DEPOT_A')
        else:
            # Or it should be forbidden
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_shipment_in_depot(self):
        """Test that users can retrieve shipments from their depot"""
        self.client.force_authenticate(user=self.depot_a_dispatcher)
        url = reverse('shipment-detail', kwargs={'pk': self.shipment_depot_a_1.pk})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['reference_number'], 'DEPOT_A_001')
        self.assertIn('items', response.data)

    def test_retrieve_shipment_outside_depot_denied(self):
        """Test that users cannot retrieve shipments from other depots"""
        self.client.force_authenticate(user=self.depot_a_dispatcher)
        url = reverse('shipment-detail', kwargs={'pk': self.shipment_depot_b_1.pk})
        
        response = self.client.get(url)
        
        # Should be 404 because queryset filtering excludes other depot shipments
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_driver_can_update_shipment_status(self):
        """Test that DRIVER users can update shipment status appropriately"""
        self.client.force_authenticate(user=self.depot_a_driver)
        url = reverse('shipment-detail', kwargs={'pk': self.shipment_depot_a_1.pk})
        
        # Driver updating status from PENDING to IN_TRANSIT
        status_update = {
            'status': ShipmentStatus.IN_TRANSIT
        }
        
        response = self.client.patch(url, status_update, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ShipmentStatus.IN_TRANSIT)
        
        # Verify in database
        self.shipment_depot_a_1.refresh_from_db()
        self.assertEqual(self.shipment_depot_a_1.status, ShipmentStatus.IN_TRANSIT)

    def test_driver_cannot_update_shipment_to_invalid_status(self):
        """Test that DRIVER users cannot make invalid status transitions"""
        self.client.force_authenticate(user=self.depot_a_driver)
        url = reverse('shipment-detail', kwargs={'pk': self.shipment_depot_a_1.pk})
        
        # Try to go from PENDING directly to DELIVERED (skipping IN_TRANSIT)
        invalid_status_update = {
            'status': ShipmentStatus.DELIVERED
        }
        
        response = self.client.patch(url, invalid_status_update, format='json')
        
        # Should either be forbidden or validation error
        # depending on business logic implementation
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_403_FORBIDDEN
        ])

    def test_driver_cannot_update_other_depot_shipment(self):
        """Test that DRIVER users cannot update shipments from other depots"""
        self.client.force_authenticate(user=self.depot_a_driver)
        url = reverse('shipment-detail', kwargs={'pk': self.shipment_depot_b_1.pk})
        
        status_update = {'status': ShipmentStatus.CANCELLED}
        
        response = self.client.patch(url, status_update, format='json')
        
        # Should be 404 because of queryset filtering
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_dispatcher_can_update_shipment_details(self):
        """Test that DISPATCHER users can update shipment details and items"""
        self.client.force_authenticate(user=self.depot_a_dispatcher)
        url = reverse('shipment-detail', kwargs={'pk': self.shipment_depot_a_1.pk})
        
        update_payload = {
            'destination_address': 'Updated Destination Address',
            'status': ShipmentStatus.BOOKED,
            'items': [
                {
                    'description': 'Updated Electronics',
                    'quantity': 8,
                    'weight_kg': 12.0,
                    'is_dangerous_good': False
                },
                {
                    'description': 'New Additional Item',
                    'quantity': 2,
                    'weight_kg': 5.0,
                    'is_dangerous_good': False
                }
            ]
        }
        
        response = self.client.patch(url, update_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['destination_address'], 'Updated Destination Address')
        self.assertEqual(response.data['status'], ShipmentStatus.BOOKED)
        
        # Verify items were updated
        self.shipment_depot_a_1.refresh_from_db()
        self.assertEqual(self.shipment_depot_a_1.items.count(), 2)

    def test_unauthenticated_access_denied(self):
        """Test that all shipment endpoints require authentication"""
        url = reverse('shipment-list')
        
        # Test list
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test create
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test detail
        detail_url = reverse('shipment-detail', kwargs={'pk': self.shipment_depot_a_1.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_shipment_search_and_filtering(self):
        """Test search and filtering functionality for shipments"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('shipment-list')
        
        # Test search by reference number
        response = self.client.get(url, {'search': 'DEPOT_A_001'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reference_number'], 'DEPOT_A_001')
        
        # Test filter by status
        response = self.client.get(url, {'status': ShipmentStatus.IN_TRANSIT})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find the one shipment with IN_TRANSIT status
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reference_number'], 'DEPOT_A_002')
        
        # Test filter by depot
        response = self.client.get(url, {'assigned_depot': 'DEPOT_B'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reference_number'], 'DEPOT_B_001')


class ShipmentStatusTransitionTests(APITestCase):
    """Test shipment status transition logic and business rules"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.driver_user = User.objects.create_user(
            username='status_driver',
            email='driver@status.com',
            password='StatusDriver123!',
            role=User.Role.DRIVER,
            depot='TEST_DEPOT'
        )
        
        self.dispatcher_user = User.objects.create_user(
            username='status_dispatcher',
            email='dispatcher@status.com',
            password='StatusDispatcher123!',
            role=User.Role.DISPATCHER,
            depot='TEST_DEPOT'
        )
        
        # Create shipments in different states
        self.pending_shipment = Shipment.objects.create(
            reference_number='STATUS_PENDING',
            origin_address='Origin',
            destination_address='Destination',
            assigned_depot='TEST_DEPOT',
            status=ShipmentStatus.PENDING
        )
        
        self.in_transit_shipment = Shipment.objects.create(
            reference_number='STATUS_IN_TRANSIT',
            origin_address='Origin',
            destination_address='Destination',
            assigned_depot='TEST_DEPOT',
            status=ShipmentStatus.IN_TRANSIT
        )

    def test_driver_can_start_shipment(self):
        """Test driver can update PENDING to IN_TRANSIT"""
        self.client.force_authenticate(user=self.driver_user)
        url = reverse('shipment-detail', kwargs={'pk': self.pending_shipment.pk})
        
        response = self.client.patch(url, {'status': ShipmentStatus.IN_TRANSIT}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ShipmentStatus.IN_TRANSIT)

    def test_driver_can_complete_shipment(self):
        """Test driver can update IN_TRANSIT to DELIVERED"""
        self.client.force_authenticate(user=self.driver_user)
        url = reverse('shipment-detail', kwargs={'pk': self.in_transit_shipment.pk})
        
        response = self.client.patch(url, {'status': ShipmentStatus.DELIVERED}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ShipmentStatus.DELIVERED)

    def test_driver_cannot_cancel_shipment(self):
        """Test driver cannot cancel shipments (business rule)"""
        self.client.force_authenticate(user=self.driver_user)
        url = reverse('shipment-detail', kwargs={'pk': self.pending_shipment.pk})
        
        response = self.client.patch(url, {'status': ShipmentStatus.CANCELLED}, format='json')
        
        # Should be forbidden for drivers to cancel
        self.assertIn(response.status_code, [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_400_BAD_REQUEST
        ])

    def test_dispatcher_can_cancel_shipment(self):
        """Test dispatcher can cancel shipments"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('shipment-detail', kwargs={'pk': self.pending_shipment.pk})
        
        response = self.client.patch(url, {'status': ShipmentStatus.CANCELLED}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ShipmentStatus.CANCELLED)


class ShipmentServiceTests(TestCase):
    """Test shipment service layer functions"""
    
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='admin_service',
            email='admin@service.com',
            password='AdminService123!',
            depot='ADMIN_DEPOT'
        )
        
        self.depot_user = User.objects.create_user(
            username='depot_service',
            email='depot@service.com',
            password='DepotService123!',
            role=User.Role.DISPATCHER,
            depot='SERVICE_DEPOT'
        )
        
        self.other_depot_user = User.objects.create_user(
            username='other_depot_service',
            email='otherdepot@service.com',
            password='OtherDepot123!',
            role=User.Role.DISPATCHER,
            depot='OTHER_DEPOT'
        )

    def test_create_shipment_with_items_service(self):
        """Test create_shipment_with_items service function"""
        shipment_data = {
            'reference_number': 'SERVICE_TEST_001',
            'origin_address': 'Service Origin',
            'destination_address': 'Service Destination',
            'assigned_depot': 'SERVICE_DEPOT',
            'status': ShipmentStatus.PENDING
        }
        
        items_data = [
            {
                'description': 'Service Test Item 1',
                'quantity': 5,
                'weight_kg': 10.0,
                'is_dangerous_good': False
            },
            {
                'description': 'Service DG Item',
                'quantity': 1,
                'weight_kg': 25.0,
                'is_dangerous_good': True,
                'un_number': 'UN1090',
                'proper_shipping_name': 'ACETONE',
                'hazard_class': '3',
                'packing_group': 'II'
            }
        ]
        
        shipment = create_shipment_with_items(
            shipment_data=shipment_data,
            items_data=items_data,
            creating_user=self.depot_user
        )
        
        self.assertIsInstance(shipment, Shipment)
        self.assertEqual(shipment.reference_number, 'SERVICE_TEST_001')
        self.assertEqual(shipment.items.count(), 2)
        
        # Verify dangerous good item
        dg_item = shipment.items.filter(is_dangerous_good=True).first()
        self.assertEqual(dg_item.un_number, 'UN1090')

    def test_get_shipments_for_user_filtering(self):
        """Test get_shipments_for_user service filtering logic"""
        # Create shipments for different depots
        depot_shipment = Shipment.objects.create(
            reference_number='DEPOT_SHIPMENT',
            origin_address='Origin',
            destination_address='Destination',
            assigned_depot='SERVICE_DEPOT',
            status=ShipmentStatus.PENDING
        )
        
        other_depot_shipment = Shipment.objects.create(
            reference_number='OTHER_DEPOT_SHIPMENT',
            origin_address='Origin',
            destination_address='Destination',
            assigned_depot='OTHER_DEPOT',
            status=ShipmentStatus.PENDING
        )
        
        # Test admin sees all
        admin_shipments = get_shipments_for_user(self.admin_user)
        self.assertEqual(admin_shipments.count(), 2)
        
        # Test depot user sees only their depot
        depot_shipments = get_shipments_for_user(self.depot_user)
        self.assertEqual(depot_shipments.count(), 1)
        self.assertEqual(depot_shipments.first().reference_number, 'DEPOT_SHIPMENT')
        
        # Test other depot user sees only their depot
        other_shipments = get_shipments_for_user(self.other_depot_user)
        self.assertEqual(other_shipments.count(), 1)
        self.assertEqual(other_shipments.first().reference_number, 'OTHER_DEPOT_SHIPMENT')

    def test_update_shipment_status_service_permissions(self):
        """Test update_shipment_status_service permission logic"""
        shipment = Shipment.objects.create(
            reference_number='STATUS_TEST',
            origin_address='Origin',
            destination_address='Destination',
            assigned_depot='SERVICE_DEPOT',
            status=ShipmentStatus.PENDING
        )
        
        # User from same depot can update
        updated_shipment = update_shipment_status_service(
            shipment=shipment,
            new_status_value=ShipmentStatus.IN_TRANSIT,
            updating_user=self.depot_user
        )
        self.assertEqual(updated_shipment.status, ShipmentStatus.IN_TRANSIT)
        
        # User from different depot cannot update
        with self.assertRaises(PermissionDenied):
            update_shipment_status_service(
                shipment=shipment,
                new_status_value=ShipmentStatus.DELIVERED,
                updating_user=self.other_depot_user
            )

    def test_create_shipment_dangerous_good_validation(self):
        """Test that dangerous goods require proper UN data"""
        shipment_data = {
            'reference_number': 'DG_VALIDATION_TEST',
            'origin_address': 'Origin',
            'destination_address': 'Destination',
            'assigned_depot': 'SERVICE_DEPOT',
            'status': ShipmentStatus.PENDING
        }
        
        # Missing UN number for dangerous good should raise validation error
        invalid_items_data = [
            {
                'description': 'Invalid DG Item',
                'quantity': 1,
                'weight_kg': 10.0,
                'is_dangerous_good': True,
                'proper_shipping_name': 'Some Chemical',
                'hazard_class': '3'
                # Missing un_number
            }
        ]
        
        with self.assertRaises(ValidationError):
            create_shipment_with_items(
                shipment_data=shipment_data,
                items_data=invalid_items_data,
                creating_user=self.depot_user
            )