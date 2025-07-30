# e2e_tests/test_integration_flows.py
"""
End-to-end tests for system integration flows in SafeShipper.
Tests data flows between different system components and external integrations.
"""

import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from django.test import override_settings
from django.core import mail
from rest_framework import status
from .utils import BaseE2ETestCase, E2ETestUtils


class IntegrationFlowE2ETests(BaseE2ETestCase):
    """
    End-to-end tests for system integration and data flow workflows.
    """
    
    def test_erp_integration_flow(self):
        """
        Test complete ERP system integration workflow.
        """
        # Step 1: Customer creates order in ERP system (simulated)
        self.authenticate_as('dispatcher')
        
        # Simulate ERP order data
        erp_order_data = {
            'erp_order_id': 'ERP-ORD-12345',
            'customer_id': 'CUST-98765',
            'order_date': '2024-01-15T10:00:00Z',
            'items': [
                {
                    'product_code': 'DG-GASOLINE-001',
                    'un_number': 'UN1203',
                    'quantity': 500,
                    'unit': 'L',
                    'product_name': 'Premium Gasoline'
                },
                {
                    'product_code': 'DG-BATTERY-002',
                    'un_number': 'UN3480',
                    'quantity': 100,
                    'unit': 'items',
                    'product_name': 'Lithium Ion Batteries'
                }
            ],
            'pickup_location': {
                'facility_code': 'WH-001',
                'address': '123 Industrial Blvd, Houston, TX 77001'
            },
            'delivery_location': {
                'facility_code': 'CUST-WH-005',
                'address': '456 Commerce St, Dallas, TX 75201'
            },
            'requested_pickup_date': '2024-01-18T08:00:00Z',
            'priority': 'standard'
        }
        
        # Step 2: ERP integration service processes order
        response = self.client.post('/api/v1/integrations/erp/orders/', erp_order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        integration_result = response.json()
        self.assertIn('shipment_id', integration_result)
        self.assertIn('erp_order_id', integration_result)
        
        shipment_id = integration_result['shipment_id']
        
        # Step 3: Verify shipment created with correct mapping
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        shipment = response.json()
        self.assertEqual(shipment['external_reference'], 'ERP-ORD-12345')
        self.assertEqual(len(shipment['dangerous_goods']), 2)
        
        # Verify dangerous goods mapping
        dg_un_numbers = [dg['un_number'] for dg in shipment['dangerous_goods']]
        self.assertIn('UN1203', dg_un_numbers)
        self.assertIn('UN3480', dg_un_numbers)
        
        # Step 4: Process shipment through workflow
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[1].id,
            'status': 'assigned'
        }
        
        response = self.client.patch(f'/api/v1/shipments/{shipment_id}/', assignment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 5: Send status updates back to ERP
        response = self.client.post(f'/api/v1/integrations/erp/shipments/{shipment_id}/sync-status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        sync_result = response.json()
        self.assertEqual(sync_result['erp_order_id'], 'ERP-ORD-12345')
        self.assertEqual(sync_result['status_updated'], True)
        
        # Step 6: Complete delivery and sync final status
        self.authenticate_as('driver')
        
        # Complete delivery
        pod_data = E2ETestUtils.create_proof_of_delivery_data()
        response = self.client.post(
            f'/api/v1/shipments/{shipment_id}/proof-of-delivery/',
            pod_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Update to delivered
        response = self.client.patch(
            f'/api/v1/shipments/{shipment_id}/',
            {'status': 'delivered'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 7: Final ERP sync with delivery confirmation
        self.authenticate_as('dispatcher')
        
        response = self.client.post(f'/api/v1/integrations/erp/shipments/{shipment_id}/delivery-confirmation/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        confirmation_result = response.json()
        self.assertTrue(confirmation_result['delivery_confirmed'])
        self.assertIsNotNone(confirmation_result['pod_reference'])
    
    @patch('external_apis.government.GovAPIClient')
    def test_government_api_integration_flow(self, mock_gov_api):
        """
        Test government API integration for regulatory reporting.
        """
        # Mock government API responses
        mock_client = MagicMock()
        mock_gov_api.return_value = mock_client
        
        mock_client.submit_manifest.return_value = {
            'submission_id': 'GOV-SUB-789',
            'status': 'accepted',
            'reference_number': 'REF-456789'
        }
        
        # Step 1: Create shipment requiring government reporting
        self.authenticate_as('dispatcher')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        shipment_data['requires_government_reporting'] = True
        shipment_data['border_crossing'] = True
        shipment_data['destination_country'] = 'CA'  # Canada
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        shipment_id = response.json()['id']
        
        # Step 2: Generate required government documentation
        response = self.client.post(f'/api/v1/integrations/government/shipments/{shipment_id}/generate-manifest/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        manifest_result = response.json()
        self.assertIn('manifest_id', manifest_result)
        self.assertIn('required_documents', manifest_result)
        
        # Step 3: Submit to government API
        response = self.client.post(f'/api/v1/integrations/government/shipments/{shipment_id}/submit/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        submission_result = response.json()
        self.assertEqual(submission_result['submission_id'], 'GOV-SUB-789')
        self.assertEqual(submission_result['status'], 'accepted')
        
        # Verify API was called with correct data
        mock_client.submit_manifest.assert_called_once()
        
        # Step 4: Check submission status
        mock_client.check_submission_status.return_value = {
            'submission_id': 'GOV-SUB-789',
            'status': 'approved',
            'approval_date': '2024-01-16T14:30:00Z',
            'permit_number': 'PERMIT-123456'
        }
        
        response = self.client.get(f'/api/v1/integrations/government/submissions/GOV-SUB-789/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        status_result = response.json()
        self.assertEqual(status_result['status'], 'approved')
        self.assertIsNotNone(status_result['permit_number'])
    
    def test_carrier_api_integration_flow(self):
        """
        Test third-party carrier API integration workflow.
        """
        # Step 1: Create shipment for external carrier
        self.authenticate_as('dispatcher')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN3480'])
        shipment_data['carrier_type'] = 'external'
        shipment_data['preferred_carrier'] = 'FedEx'
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Step 2: Get carrier rates and services
        rate_request = {
            'carrier': 'FedEx',
            'service_type': 'dangerous_goods',
            'origin_postal_code': '90210',
            'destination_postal_code': '10001',
            'packages': [
                {
                    'weight': 5.0,
                    'dimensions': {'length': 30, 'width': 20, 'height': 15},
                    'dangerous_goods': True,
                    'un_number': 'UN3480'
                }
            ]
        }
        
        response = self.client.post('/api/v1/integrations/carriers/rates/', rate_request, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        rates = response.json()
        self.assertIn('services', rates)
        self.assertGreater(len(rates['services']), 0)
        
        # Step 3: Book shipment with carrier
        selected_service = rates['services'][0]
        
        booking_data = {
            'shipment_id': shipment_id,
            'carrier': 'FedEx',
            'service_code': selected_service['service_code'],
            'rate_id': selected_service['rate_id'],
            'shipper_reference': f'SS-{shipment_id}',
            'dangerous_goods_declaration': True
        }
        
        response = self.client.post('/api/v1/integrations/carriers/bookings/', booking_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        booking_result = response.json()
        self.assertIn('tracking_number', booking_result)
        self.assertIn('carrier_reference', booking_result)
        
        # Step 4: Generate shipping labels
        response = self.client.get(f'/api/v1/integrations/carriers/bookings/{booking_result["booking_id"]}/labels/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        # Step 5: Track shipment progress
        tracking_number = booking_result['tracking_number']
        
        response = self.client.get(f'/api/v1/integrations/carriers/tracking/{tracking_number}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        tracking_data = response.json()
        E2ETestUtils.assert_response_contains_fields(tracking_data, [
            'tracking_number', 'status', 'events', 'estimated_delivery'
        ])
    
    def test_warehouse_management_integration_flow(self):
        """
        Test warehouse management system integration.
        """
        # Step 1: Create shipment requiring warehouse operations
        self.authenticate_as('dispatcher')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203', 'UN1993'])
        shipment_data['pickup_type'] = 'warehouse'
        shipment_data['warehouse_location'] = 'WH-NORTH-001'
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Step 2: Send pick request to warehouse system
        pick_request = {
            'shipment_id': shipment_id,
            'warehouse_code': 'WH-NORTH-001',
            'priority': 'normal',
            'dangerous_goods_handling': True,
            'items': [
                {
                    'sku': 'DG-GASOLINE-001',
                    'un_number': 'UN1203',
                    'quantity': 500,
                    'location': 'DG-A-001-001'
                },
                {
                    'sku': 'DG-FLAMMABLE-002', 
                    'un_number': 'UN1993',
                    'quantity': 200,
                    'location': 'DG-A-002-003'
                }
            ],
            'special_handling': [
                'dangerous_goods_certified_picker',
                'safety_equipment_required',
                'segregation_verification'
            ]
        }
        
        response = self.client.post('/api/v1/integrations/warehouse/pick-requests/', pick_request, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        pick_result = response.json()
        pick_request_id = pick_result['pick_request_id']
        
        # Step 3: Monitor pick progress
        response = self.client.get(f'/api/v1/integrations/warehouse/pick-requests/{pick_request_id}/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        pick_status = response.json()
        E2ETestUtils.assert_response_contains_fields(pick_status, [
            'pick_request_id', 'status', 'progress', 'picker_assigned',
            'estimated_completion', 'items_picked'
        ])
        
        # Step 4: Receive pick completion notification
        completion_data = {
            'pick_request_id': pick_request_id,
            'completion_timestamp': datetime.now().isoformat(),
            'picker_id': 'PICKER-001',
            'items_picked': [
                {
                    'sku': 'DG-GASOLINE-001',
                    'quantity_picked': 500,
                    'batch_numbers': ['BATCH-001', 'BATCH-002'],
                    'expiry_dates': ['2025-12-31']
                },
                {
                    'sku': 'DG-FLAMMABLE-002',
                    'quantity_picked': 200,
                    'batch_numbers': ['BATCH-003'],
                    'expiry_dates': ['2026-06-30']
                }
            ],
            'quality_check_passed': True,
            'dangerous_goods_verification': True,
            'ready_for_pickup': True
        }
        
        response = self.client.post(
            f'/api/v1/integrations/warehouse/pick-requests/{pick_request_id}/complete/',
            completion_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 5: Update shipment status
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/')
        updated_shipment = response.json()
        
        self.assertEqual(updated_shipment['pickup_status'], 'ready')
        self.assertTrue(updated_shipment['warehouse_pick_completed'])
    
    def test_iot_sensor_integration_flow(self):
        """
        Test IoT sensor data integration and monitoring.
        """
        # Step 1: Create shipment with IoT monitoring
        self.authenticate_as('dispatcher')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        shipment_data['iot_monitoring_enabled'] = True
        shipment_data['temperature_monitoring'] = True
        shipment_data['vibration_monitoring'] = True
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Assign vehicle with IoT sensors
        assignment_data = {
            'assigned_vehicle': self.test_vehicles[0].id,
            'status': 'in_transit'
        }
        
        response = self.client.patch(f'/api/v1/shipments/{shipment_id}/', assignment_data, format='json')
        
        # Step 2: Simulate IoT sensor data ingestion
        sensor_data_points = [
            {
                'sensor_id': 'TEMP-001',
                'shipment_id': shipment_id,
                'vehicle_id': self.test_vehicles[0].id,
                'sensor_type': 'temperature',
                'timestamp': datetime.now().isoformat(),
                'value': 22.5,
                'unit': 'celsius',
                'location': {'lat': 40.7128, 'lon': -74.0060}
            },
            {
                'sensor_id': 'VIB-001',
                'shipment_id': shipment_id,
                'vehicle_id': self.test_vehicles[0].id,
                'sensor_type': 'vibration',
                'timestamp': datetime.now().isoformat(),
                'value': 2.1,
                'unit': 'g_force',
                'location': {'lat': 40.7128, 'lon': -74.0060}
            }
        ]
        
        for sensor_data in sensor_data_points:
            response = self.client.post('/api/v1/integrations/iot/sensor-data/', sensor_data, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 3: Check sensor data aggregation
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/sensor-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        aggregated_data = response.json()
        self.assertIn('temperature_readings', aggregated_data)
        self.assertIn('vibration_readings', aggregated_data)
        
        # Step 4: Simulate threshold violation
        violation_data = {
            'sensor_id': 'TEMP-001',
            'shipment_id': shipment_id,
            'vehicle_id': self.test_vehicles[0].id,
            'sensor_type': 'temperature',
            'timestamp': datetime.now().isoformat(),
            'value': 45.0,  # High temperature
            'unit': 'celsius',
            'threshold_violated': True,
            'threshold_type': 'max_temperature',
            'threshold_value': 35.0
        }
        
        response = self.client.post('/api/v1/integrations/iot/sensor-data/', violation_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 5: Verify alert generation
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/alerts/')
        alerts = response.json()['results']
        
        temp_alert = next((a for a in alerts if a['alert_type'] == 'temperature_violation'), None)
        self.assertIsNotNone(temp_alert)
        self.assertEqual(temp_alert['severity'], 'high')
        
        # Verify notification sent
        self.assertTrue(E2ETestUtils.verify_email_sent('Temperature Alert'))
    
    def test_payment_integration_flow(self):
        """
        Test payment system integration workflow.
        """
        # Step 1: Create shipment with billing requirements
        self.authenticate_as('dispatcher')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN3480'])
        shipment_data['billing_type'] = 'invoice'
        shipment_data['customer_account'] = 'ACCT-12345'
        
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Step 2: Complete shipment delivery
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[1].id,
            'status': 'delivered'
        }
        
        response = self.client.patch(f'/api/v1/shipments/{shipment_id}/', assignment_data, format='json')
        
        # Step 3: Generate invoice
        invoice_data = {
            'shipment_id': shipment_id,
            'billing_address': {
                'company': 'Test Customer Corp',
                'street': '789 Business Ave',
                'city': 'Commerce City',
                'state': 'TX',
                'postal_code': '75001'
            },
            'line_items': [
                {
                    'description': 'Dangerous Goods Transportation - UN3480',
                    'quantity': 1,
                    'unit_price': 150.00,
                    'dangerous_goods_surcharge': 25.00
                },
                {
                    'description': 'Fuel Surcharge',
                    'quantity': 1,
                    'unit_price': 15.00
                }
            ],
            'taxes': [
                {
                    'tax_type': 'sales_tax',
                    'rate': 8.25,
                    'amount': 15.68
                }
            ]
        }
        
        response = self.client.post('/api/v1/integrations/billing/invoices/', invoice_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        invoice_result = response.json()
        invoice_id = invoice_result['invoice_id']
        
        # Step 4: Send invoice to customer
        response = self.client.post(f'/api/v1/integrations/billing/invoices/{invoice_id}/send/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 5: Process payment (simulated)
        payment_data = {
            'invoice_id': invoice_id,
            'payment_method': 'bank_transfer',
            'amount': 205.68,
            'reference_number': 'PAY-789456',
            'payment_date': datetime.now().isoformat()
        }
        
        response = self.client.post('/api/v1/integrations/billing/payments/', payment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 6: Verify payment reconciliation
        response = self.client.get(f'/api/v1/integrations/billing/invoices/{invoice_id}/status/')
        invoice_status = response.json()
        
        self.assertEqual(invoice_status['payment_status'], 'paid')
        self.assertEqual(invoice_status['amount_paid'], 205.68)
    
    def test_data_synchronization_flow(self):
        """
        Test data synchronization across integrated systems.
        """
        # Step 1: Create master data in SafeShipper
        self.authenticate_as('admin')
        
        # Create customer master data
        customer_data = {
            'customer_code': 'CUST-SYNC-001',
            'company_name': 'Sync Test Company',
            'contact_email': 'sync@testcompany.com',
            'dangerous_goods_certified': True,
            'certification_expiry': '2025-12-31',
            'addresses': [
                {
                    'type': 'billing',
                    'street': '123 Sync Street',
                    'city': 'Data City',
                    'state': 'TX',
                    'postal_code': '75001'
                }
            ]
        }
        
        response = self.client.post('/api/v1/customers/', customer_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        customer_id = response.json()['id']
        
        # Step 2: Sync customer data to ERP
        response = self.client.post(f'/api/v1/integrations/sync/customers/{customer_id}/to-erp/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        sync_result = response.json()
        self.assertTrue(sync_result['sync_successful'])
        self.assertIsNotNone(sync_result['erp_customer_id'])
        
        # Step 3: Update customer data
        update_data = {
            'contact_email': 'updated-sync@testcompany.com',
            'dangerous_goods_certified': True,
            'certification_expiry': '2026-12-31'
        }
        
        response = self.client.patch(f'/api/v1/customers/{customer_id}/', update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 4: Sync updates to all connected systems
        response = self.client.post(f'/api/v1/integrations/sync/customers/{customer_id}/sync-all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        sync_all_result = response.json()
        self.assertIn('erp_sync', sync_all_result)
        self.assertIn('billing_sync', sync_all_result)
        self.assertTrue(sync_all_result['erp_sync']['successful'])
        
        # Step 5: Verify data consistency
        response = self.client.get(f'/api/v1/integrations/sync/customers/{customer_id}/consistency-check/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        consistency_result = response.json()
        self.assertTrue(consistency_result['data_consistent'])
        self.assertEqual(len(consistency_result['discrepancies']), 0)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_automated_integration_monitoring(self):
        """
        Test automated monitoring of integration health and performance.
        """
        self.authenticate_as('admin')
        
        # Step 1: Run integration health check
        response = self.client.get('/api/v1/integrations/health-check/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        health_check = response.json()
        E2ETestUtils.assert_response_contains_fields(health_check, [
            'overall_status', 'integrations', 'last_check_timestamp'
        ])
        
        # Step 2: Test integration performance metrics
        response = self.client.get('/api/v1/integrations/performance-metrics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        metrics = response.json()
        E2ETestUtils.assert_response_contains_fields(metrics, [
            'average_response_times', 'error_rates', 'throughput',
            'availability_percentages'
        ])
        
        # Step 3: Generate integration status report
        response = self.client.get('/api/v1/integrations/status-report/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        status_report = response.json()
        self.assertIn('integration_summary', status_report)
        self.assertIn('recent_issues', status_report)
        self.assertIn('performance_trends', status_report)
        
        # Step 4: Test automated alerting for integration failures
        # This would be tested by simulating integration failures
        # and verifying that appropriate alerts are generated