# e2e_tests/test_shipment_lifecycle.py
"""
End-to-end tests for complete shipment lifecycle in SafeShipper.
Tests the entire dangerous goods shipment process from creation to delivery.
"""

import json
from datetime import datetime, timedelta
from django.test import override_settings
from django.core import mail
from rest_framework import status
from .utils import BaseE2ETestCase, E2ETestUtils


class ShipmentLifecycleE2ETests(BaseE2ETestCase):
    """
    Comprehensive end-to-end tests for shipment lifecycle.
    Tests complete workflow from shipment creation to delivery confirmation.
    """
    
    def test_complete_shipment_lifecycle_success_flow(self):
        """
        Test complete successful shipment lifecycle from creation to delivery.
        
        Workflow:
        1. Customer creates shipment request
        2. Dispatcher reviews and assigns driver/vehicle
        3. Driver accepts and starts transit
        4. Driver updates location during transport
        5. Driver completes delivery with POD
        6. System generates compliance documentation
        """
        # Step 1: Customer creates shipment request
        self.authenticate_as('customer')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203', 'UN3480'])
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        shipment = response.json()
        shipment_id = shipment['id']
        
        # Verify shipment was created with correct status
        self.assertEqual(shipment['status'], 'pending')
        self.assertEqual(len(shipment['dangerous_goods']), 2)
        
        # Verify audit log entry
        E2ETestUtils.assert_audit_trail_exists(
            self.test_users['customer'], 
            'create', 
            'shipment', 
            shipment_id
        )
        
        # Step 2: Dispatcher reviews and assigns resources
        self.authenticate_as('dispatcher')
        
        # Get shipment details for review
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify dangerous goods compatibility
        dg_check_response = self.client.get(
            f'/api/v1/dangerous-goods/compatibility-check/',
            {'un_numbers': 'UN1203,UN3480', 'vehicle_type': 'box_truck'}
        )
        self.assertEqual(dg_check_response.status_code, status.HTTP_200_OK)
        
        # Assign driver and vehicle
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[1].id,  # Box truck
            'status': 'assigned'
        }
        
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/', 
            assignment_data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify assignment notification sent
        self.assertTrue(E2ETestUtils.verify_email_sent('Shipment Assignment'))
        
        # Step 3: Driver accepts shipment and starts transit
        self.authenticate_as('driver')
        
        # Driver views assigned shipments
        response = self.client.get('/api/v1/shipments/?assigned_to_me=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assigned_shipments = response.json()['results']
        self.assertTrue(any(s['id'] == shipment_id for s in assigned_shipments))
        
        # Driver accepts shipment
        response = self.client.post(f'/api/v1/shipments/{shipment_id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Start pickup process
        pickup_data = {
            'status': 'in_transit',
            'pickup_timestamp': datetime.now().isoformat(),
            'pickup_location': E2ETestUtils.simulate_mobile_location_update(40.7128, -74.0060),
            'pickup_notes': 'Dangerous goods loaded and secured'
        }
        
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/', 
            pickup_data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 4: Driver updates location during transport
        transit_locations = [
            (40.7589, -73.9851),  # Times Square
            (40.6782, -73.9442),  # Brooklyn
            (40.6501, -73.9496)   # Red Hook
        ]
        
        for lat, lon in transit_locations:
            location_data = E2ETestUtils.simulate_mobile_location_update(lat, lon)
            
            response = self.client.post(
                f'/api/v1/shipments/{shipment_id}/update-location/',
                location_data,
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify tracking events created
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/tracking/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tracking_data = response.json()
        self.assertGreaterEqual(len(tracking_data['events']), 3)
        
        # Step 5: Driver completes delivery with POD
        pod_data = E2ETestUtils.create_proof_of_delivery_data()
        
        response = self.client.post(
            f'/api/v1/shipments/{shipment_id}/proof-of-delivery/',
            pod_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Update shipment to delivered status
        delivery_data = {
            'status': 'delivered',
            'delivered_timestamp': datetime.now().isoformat(),
            'delivery_notes': 'Delivery completed successfully'
        }
        
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/',
            delivery_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 6: Generate compliance documentation
        self.authenticate_as('compliance')
        
        # Generate shipment report
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/generate-pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        # Verify final shipment state
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/')
        final_shipment = response.json()
        
        self.assertEqual(final_shipment['status'], 'delivered')
        self.assertIsNotNone(final_shipment['proof_of_delivery'])
        self.assertTrue(final_shipment['is_complete'])
        
        # Verify delivery notification sent to customer
        self.assertTrue(E2ETestUtils.verify_email_sent('Delivery Confirmation'))
    
    def test_shipment_lifecycle_with_incident_reporting(self):
        """
        Test shipment lifecycle with incident reporting and emergency response.
        """
        # Create and assign shipment
        self.authenticate_as('dispatcher')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[0].id,
            'status': 'in_transit'
        }
        
        self.client.patch(f'/api/v1/shipments/{shipment_id}/', assignment_data, format='json')
        
        # Driver reports incident during transport
        self.authenticate_as('driver')
        
        incident_data = E2ETestUtils.create_test_incident_data()
        incident_data['related_shipment'] = shipment_id
        
        response = self.client.post('/api/v1/incidents/', incident_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        incident_id = response.json()['id']
        
        # Get emergency procedures for dangerous goods involved
        response = self.client.get(
            '/api/v1/emergency-procedures/quick-reference/',
            {'hazard_class': '3', 'incident_type': 'spill'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update incident with response actions
        response_data = {
            'status': 'responding',
            'response_actions': ['emergency_services_contacted', 'area_secured'],
            'responder_notes': 'Emergency services en route, area cordoned off'
        }
        
        response = self.client.patch(
            f'/api/v1/incidents/{incident_id}/',
            response_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify incident notification sent to compliance team
        self.assertTrue(E2ETestUtils.verify_email_sent('Incident Report'))
        
        # Verify shipment status updated due to incident
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/')
        shipment = response.json()
        self.assertEqual(shipment['status'], 'incident_reported')
    
    def test_shipment_lifecycle_with_training_validation(self):
        """
        Test shipment lifecycle with driver training validation.
        """
        # Create shipment requiring special training
        self.authenticate_as('dispatcher')
        
        # Create shipment with high-risk dangerous goods
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203', 'UN1230'])
        shipment_data['requires_special_training'] = True
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Attempt to assign driver - should validate training first
        response = self.client.get(
            f'/api/v1/drivers/{self.test_users["driver"].id}/qualifications/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        qualifications = response.json()
        
        # Verify driver has required training
        self.assertTrue(any(
            q['qualification_type'] == 'dangerous_goods_license' 
            for q in qualifications['qualifications']
        ))
        
        # Assign driver after training validation
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[0].id,
            'status': 'assigned'
        }
        
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/',
            assignment_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify training record was checked and logged
        E2ETestUtils.assert_audit_trail_exists(
            self.test_users['dispatcher'],
            'training_validation',
            'driver_assignment'
        )
    
    def test_shipment_lifecycle_with_vehicle_compatibility_check(self):
        """
        Test shipment lifecycle with vehicle compatibility validation.
        """
        self.authenticate_as('dispatcher')
        
        # Create shipment with specific dangerous goods
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN3480'])  # Lithium batteries
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Check vehicle compatibility first
        response = self.client.get(
            '/api/v1/fleet/compatibility-check/',
            {
                'un_numbers': 'UN3480',
                'vehicle_id': self.test_vehicles[1].id  # Box truck
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        compatibility = response.json()
        self.assertTrue(compatibility['is_compatible'])
        
        # Assign compatible vehicle
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[1].id,  # Compatible box truck
            'status': 'assigned'
        }
        
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/',
            assignment_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify compatibility check was logged
        E2ETestUtils.assert_audit_trail_exists(
            self.test_users['dispatcher'],
            'compatibility_check',
            'vehicle_assignment'
        )
    
    def test_shipment_lifecycle_with_multi_stop_delivery(self):
        """
        Test shipment lifecycle with multiple delivery stops.
        """
        self.authenticate_as('dispatcher')
        
        # Create shipment with multiple destinations
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        shipment_data['delivery_stops'] = [
            {
                'sequence': 1,
                'address': {
                    "street": "123 First St",
                    "city": "New York",
                    "state": "NY",
                    "postal_code": "10001"
                },
                'contact_person': 'John Doe',
                'phone': '555-1234',
                'delivery_instructions': 'Loading dock entrance'
            },
            {
                'sequence': 2,
                'address': {
                    "street": "456 Second Ave",
                    "city": "Brooklyn",
                    "state": "NY", 
                    "postal_code": "11201"
                },
                'contact_person': 'Jane Smith',
                'phone': '555-5678',
                'delivery_instructions': 'Front office delivery'
            }
        ]
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        shipment_id = response.json()['id']
        
        # Assign resources
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[0].id,
            'status': 'in_transit'
        }
        
        self.client.patch(f'/api/v1/shipments/{shipment_id}/', assignment_data, format='json')
        
        # Driver completes first delivery
        self.authenticate_as('driver')
        
        first_delivery_data = {
            'stop_sequence': 1,
            'delivery_timestamp': datetime.now().isoformat(),
            'recipient_name': 'John Doe',
            'recipient_signature': 'signature_data_1',
            'delivery_notes': 'First delivery completed'
        }
        
        response = self.client.post(
            f'/api/v1/shipments/{shipment_id}/delivery-stop/',
            first_delivery_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Driver completes second delivery
        second_delivery_data = {
            'stop_sequence': 2,
            'delivery_timestamp': datetime.now().isoformat(),
            'recipient_name': 'Jane Smith',
            'recipient_signature': 'signature_data_2',
            'delivery_notes': 'Final delivery completed'
        }
        
        response = self.client.post(
            f'/api/v1/shipments/{shipment_id}/delivery-stop/',
            second_delivery_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Update shipment to fully delivered
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/',
            {'status': 'delivered'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify all delivery stops completed
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/')
        final_shipment = response.json()
        
        self.assertEqual(final_shipment['status'], 'delivered')
        self.assertEqual(len(final_shipment['delivery_stops']), 2)
        self.assertTrue(all(stop['is_completed'] for stop in final_shipment['delivery_stops']))
    
    def test_shipment_lifecycle_failure_scenarios(self):
        """
        Test shipment lifecycle failure scenarios and error handling.
        """
        # Test 1: Invalid dangerous goods assignment
        self.authenticate_as('dispatcher')
        
        invalid_shipment_data = E2ETestUtils.create_test_shipment_data(['UN9999'])  # Invalid UN number
        
        response = self.client.post('/api/v1/shipments/', invalid_shipment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dangerous_goods', response.json())
        
        # Test 2: Incompatible vehicle assignment
        valid_shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        response = self.client.post('/api/v1/shipments/', valid_shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Try to assign incompatible vehicle (tanker for batteries)
        incompatible_assignment = {
            'assigned_vehicle': self.test_vehicles[0].id,  # Tanker
            'dangerous_goods_override': False  # Don't allow override
        }
        
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/',
            incompatible_assignment,
            format='json'
        )
        # Should succeed for gasoline (UN1203) with tanker
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test 3: Driver without proper qualifications
        from fleet.models import DriverQualification
        
        # Remove driver qualifications temporarily
        DriverQualification.objects.filter(driver=self.test_users['driver']).delete()
        
        unqualified_assignment = {
            'assigned_driver': self.test_users['driver'].id,
            'require_qualification_check': True
        }
        
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/',
            unqualified_assignment,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('driver_qualifications', response.json())
        
        # Restore qualifications for cleanup
        E2ETestSetup.create_driver_qualifications(self.test_users['driver'])
    
    def test_shipment_lifecycle_performance_requirements(self):
        """
        Test that shipment lifecycle meets performance requirements.
        """
        import time
        
        self.authenticate_as('dispatcher')
        
        # Measure shipment creation time
        start_time = time.time()
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        
        creation_time = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertLess(creation_time, 2.0)  # Should create within 2 seconds
        
        shipment_id = response.json()['id']
        
        # Measure shipment retrieval time
        start_time = time.time()
        
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/')
        
        retrieval_time = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(retrieval_time, 0.5)  # Should retrieve within 500ms
        
        # Measure PDF generation time
        start_time = time.time()
        
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/generate-pdf/')
        
        pdf_generation_time = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(pdf_generation_time, 5.0)  # Should generate PDF within 5 seconds