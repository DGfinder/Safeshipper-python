# shipments/tests/test_erp_webhook_integration.py

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
import json
import requests

from companies.models import Company
from ..models import Shipment, ShipmentFeedback
from erp_integration.models import ERPSystem, IntegrationEndpoint, ERPMapping, DataSyncJob, ERPEventLog
from erp_integration.feedback_webhook_service import FeedbackWebhookService

User = get_user_model()


class ERPWebhookIntegrationTestCase(TestCase):
    """Test cases for ERP webhook integration"""
    
    def setUp(self):
        # Create test companies
        self.company = Company.objects.create(
            name="Test Carrier",
            company_type="CARRIER",
            is_active=True
        )
        
        self.customer_company = Company.objects.create(
            name="Test Customer", 
            company_type="CUSTOMER",
            is_active=True
        )
        
        # Create test user
        self.manager = User.objects.create_user(
            username='manager@test.com',
            email='manager@test.com',
            password='testpass123',
            role='MANAGER',
            company=self.company
        )
        
        # Create ERP system
        self.erp_system = ERPSystem.objects.create(
            name="Test ERP System",
            system_type='sap',
            connection_type='rest_api',
            company=self.company,
            base_url='https://test-erp.example.com',
            status='active',
            push_enabled=True,
            enabled_modules=['feedback_webhooks'],
            authentication_config={
                'type': 'api_key',
                'api_key': 'test-api-key-123',
                'header_name': 'X-API-Key'
            },
            created_by=self.manager
        )
        
        # Create feedback webhook endpoints
        self.feedback_endpoint = IntegrationEndpoint.objects.create(
            erp_system=self.erp_system,
            name='feedback_received',
            endpoint_type='feedback_webhooks',
            path='/api/v1/webhooks/safeshipper/feedback/received',
            http_method='POST',
            headers={'Content-Type': 'application/json'},
            is_active=True
        )
        
        self.incident_endpoint = IntegrationEndpoint.objects.create(
            erp_system=self.erp_system,
            name='feedback_incident',
            endpoint_type='feedback_webhooks',
            path='/api/v1/webhooks/safeshipper/feedback/incident',
            http_method='POST',
            headers={'Content-Type': 'application/json'},
            is_active=True
        )
        
        # Create test shipment
        self.shipment = Shipment.objects.create(
            tracking_number='WEBHOOK123',
            customer=self.customer_company,
            carrier=self.company,
            status='DELIVERED',
            origin_location='Sydney, NSW',
            destination_location='Melbourne, VIC'
        )
        
        self.webhook_service = FeedbackWebhookService()
        
    @patch('requests.request')
    def test_send_feedback_created_webhook_success(self, mock_request):
        """Test successful feedback created webhook"""
        
        # Mock successful HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {'Content-Type': 'application/json'}
        mock_response.text = '{"status": "success"}'
        mock_request.return_value = mock_response
        
        # Create feedback
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Great service!"
        )
        
        # Send webhook
        self.webhook_service.send_feedback_created_webhook(feedback)
        
        # Verify request was made
        mock_request.assert_called_once()
        
        # Verify request parameters
        call_args = mock_request.call_args
        self.assertEqual(call_args[1]['method'], 'POST')
        self.assertEqual(
            call_args[1]['url'], 
            'https://test-erp.example.com/api/v1/webhooks/safeshipper/feedback/received'
        )
        
        # Verify authentication header
        headers = call_args[1]['headers']
        self.assertEqual(headers['X-API-Key'], 'test-api-key-123')
        
        # Verify payload structure
        payload = call_args[1]['json']
        self.assertEqual(payload['event_type'], 'created')
        self.assertEqual(payload['feedback_id'], str(feedback.id))
        self.assertIn('shipment', payload)
        self.assertIn('feedback', payload)
        self.assertIn('_metadata', payload)
        
        # Verify sync job was created
        sync_jobs = DataSyncJob.objects.filter(erp_system=self.erp_system)
        self.assertEqual(sync_jobs.count(), 1)
        
        sync_job = sync_jobs.first()
        self.assertEqual(sync_job.status, 'completed')
        self.assertEqual(sync_job.records_successful, 1)
        
    @patch('requests.request')
    def test_send_webhook_with_field_mapping(self, mock_request):
        """Test webhook with custom field mappings"""
        
        # Create field mapping
        ERPMapping.objects.create(
            erp_system=self.erp_system,
            endpoint=self.feedback_endpoint,
            safeshipper_field='feedback.delivery_success_score',
            erp_field='customer_satisfaction_score',
            mapping_type='direct',
            is_active=True
        )
        
        ERPMapping.objects.create(
            erp_system=self.erp_system,
            endpoint=self.feedback_endpoint,
            safeshipper_field='shipment.tracking_number',
            erp_field='shipment_ref',
            mapping_type='transform',
            transformation_rules={'prefix': 'SF-'},
            is_active=True
        )
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_request.return_value = mock_response
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=False,
            was_driver_professional=True
        )
        
        self.webhook_service.send_feedback_created_webhook(feedback)
        
        # Verify field mappings were applied
        call_args = mock_request.call_args
        payload = call_args[1]['json']
        
        # Should have mapped fields
        self.assertEqual(payload['customer_satisfaction_score'], feedback.delivery_success_score)
        self.assertEqual(payload['shipment_ref'], 'SF-WEBHOOK123')
        
    @patch('requests.request')
    def test_webhook_retry_on_server_error(self, mock_request):
        """Test webhook retry logic on server errors"""
        
        # Mock server error on first attempt, success on second
        error_response = MagicMock()
        error_response.status_code = 500
        error_response.text = 'Internal Server Error'
        
        success_response = MagicMock()
        success_response.status_code = 200
        success_response.text = '{"status": "success"}'
        
        mock_request.side_effect = [error_response, success_response]
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True
        )
        
        self.webhook_service.send_feedback_created_webhook(feedback)
        
        # Verify retry occurred (2 calls)
        self.assertEqual(mock_request.call_count, 2)
        
        # Verify final success
        sync_job = DataSyncJob.objects.filter(erp_system=self.erp_system).first()
        self.assertEqual(sync_job.status, 'completed')
        self.assertEqual(sync_job.retry_count, 1)
        
    @patch('requests.request')
    def test_webhook_failure_handling(self, mock_request):
        """Test webhook failure handling and logging"""
        
        # Mock permanent failure
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        mock_request.return_value = mock_response
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=False,
            was_driver_professional=False
        )
        
        self.webhook_service.send_feedback_created_webhook(feedback)
        
        # Verify failure was logged
        sync_job = DataSyncJob.objects.filter(erp_system=self.erp_system).first()
        self.assertEqual(sync_job.status, 'failed')
        self.assertEqual(sync_job.records_failed, 1)
        self.assertIn('HTTP 400', sync_job.error_message)
        
        # Verify error event was logged
        error_logs = ERPEventLog.objects.filter(
            erp_system=self.erp_system,
            event_type='sync_failed'
        )
        self.assertEqual(error_logs.count(), 1)
        
    def test_get_feedback_enabled_erp_systems(self):
        """Test filtering ERP systems with feedback webhooks enabled"""
        
        # Create another ERP system without feedback webhooks
        other_erp = ERPSystem.objects.create(
            name="Other ERP System",
            system_type='oracle',
            connection_type='rest_api',
            company=self.company,
            status='active',
            push_enabled=True,
            enabled_modules=['shipments'],  # No feedback_webhooks
            created_by=self.manager
        )
        
        # Get feedback-enabled systems
        enabled_systems = self.webhook_service._get_feedback_enabled_erp_systems(self.company)
        
        # Should only return the system with feedback webhooks enabled
        self.assertEqual(enabled_systems.count(), 1)
        self.assertEqual(enabled_systems.first(), self.erp_system)
        
    def test_data_transformation_rules(self):
        """Test various data transformation rules"""
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True
        )
        
        # Test format transformation
        result = self.webhook_service._apply_transformation(
            85, {'format': 'Score: {value}%'}
        )
        self.assertEqual(result, 'Score: 85%')
        
        # Test multiplication transformation
        result = self.webhook_service._apply_transformation(
            0.85, {'multiply': 100}
        )
        self.assertEqual(result, 85.0)
        
        # Test mapping transformation
        result = self.webhook_service._apply_transformation(
            'EXCELLENT', {'map': {'EXCELLENT': 'A+', 'GOOD': 'B+', 'POOR': 'F'}}
        )
        self.assertEqual(result, 'A+')
        
        # Test prefix transformation
        result = self.webhook_service._apply_transformation(
            'WEBHOOK123', {'prefix': 'REF-'}
        )
        self.assertEqual(result, 'REF-WEBHOOK123')
        
    @patch('requests.request')
    def test_manager_response_webhook(self, mock_request):
        """Test manager response webhook"""
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_request.return_value = mock_response
        
        # Create manager response endpoint
        response_endpoint = IntegrationEndpoint.objects.create(
            erp_system=self.erp_system,
            name='feedback_response',
            endpoint_type='feedback_webhooks',
            path='/api/v1/webhooks/safeshipper/feedback/response',
            http_method='POST',
            is_active=True
        )
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Late delivery"
        )
        
        # Add manager response
        feedback.add_manager_response("Investigating route delays", self.manager)
        
        # Send webhook
        self.webhook_service.send_manager_response_webhook(feedback)
        
        # Verify webhook was sent
        mock_request.assert_called_once()
        
        # Verify payload includes manager response
        payload = mock_request.call_args[1]['json']
        self.assertEqual(payload['event_type'], 'manager_response')
        self.assertIn('manager_response', payload)
        self.assertEqual(
            payload['manager_response']['response_text'],
            "Investigating route delays"
        )
        
    @patch('requests.request')
    def test_weekly_report_webhook(self, mock_request):
        """Test weekly report webhook"""
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_request.return_value = mock_response
        
        # Create weekly report endpoint
        report_endpoint = IntegrationEndpoint.objects.create(
            erp_system=self.erp_system,
            name='feedback_report',
            endpoint_type='feedback_webhooks',
            path='/api/v1/webhooks/safeshipper/reports/weekly',
            http_method='POST',
            is_active=True
        )
        
        # Mock report data
        report_data = {
            'company': {'name': 'Test Carrier', 'id': str(self.company.id)},
            'period': {
                'start_date': '2024-01-01T00:00:00Z',
                'end_date': '2024-01-08T00:00:00Z'
            },
            'overall_stats': {
                'total_feedback_count': 50,
                'average_score': 87.5,
                'difot_rate': 92.0
            }
        }
        
        # Send webhook
        self.webhook_service.send_weekly_report_webhook(self.company, report_data)
        
        # Verify webhook was sent
        mock_request.assert_called_once()
        
        # Verify payload structure
        payload = mock_request.call_args[1]['json']
        self.assertEqual(payload['event_type'], 'weekly_report')
        self.assertIn('summary', payload)
        self.assertEqual(payload['summary']['total_feedback'], 50)
        
    def test_connection_timeout_handling(self):
        """Test handling of connection timeouts"""
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True
        )
        
        with patch('requests.request') as mock_request:
            mock_request.side_effect = requests.exceptions.Timeout("Connection timeout")
            
            self.webhook_service.send_feedback_created_webhook(feedback)
            
            # Verify failure was logged
            sync_job = DataSyncJob.objects.filter(erp_system=self.erp_system).first()
            self.assertEqual(sync_job.status, 'failed')
            self.assertIn('Connection timeout', sync_job.error_message)
            
    def test_multiple_erp_systems(self):
        """Test webhook delivery to multiple ERP systems"""
        
        # Create second ERP system
        second_erp = ERPSystem.objects.create(
            name="Second ERP System",
            system_type='netsuite',
            connection_type='rest_api',
            company=self.company,
            base_url='https://second-erp.example.com',
            status='active',
            push_enabled=True,
            enabled_modules=['feedback_webhooks'],
            authentication_config={'type': 'bearer', 'token': 'bearer-token-123'},
            created_by=self.manager
        )
        
        # Create endpoint for second ERP
        IntegrationEndpoint.objects.create(
            erp_system=second_erp,
            name='feedback_received',
            endpoint_type='feedback_webhooks',
            path='/webhooks/feedback',
            http_method='POST',
            is_active=True
        )
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True
        )
        
        with patch('requests.request') as mock_request:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_request.return_value = mock_response
            
            self.webhook_service.send_feedback_created_webhook(feedback)
            
            # Should have made 2 requests (one to each ERP system)
            self.assertEqual(mock_request.call_count, 2)
            
            # Verify different URLs were called
            call_urls = [call[1]['url'] for call in mock_request.call_args_list]
            self.assertIn('https://test-erp.example.com/api/v1/webhooks/safeshipper/feedback/received', call_urls)
            self.assertIn('https://second-erp.example.com/webhooks/feedback', call_urls)
            
            # Verify different authentication methods
            call_headers = [call[1]['headers'] for call in mock_request.call_args_list]
            api_key_headers = [h for h in call_headers if 'X-API-Key' in h]
            bearer_headers = [h for h in call_headers if 'Authorization' in h]
            
            self.assertEqual(len(api_key_headers), 1)
            self.assertEqual(len(bearer_headers), 1)
            self.assertEqual(bearer_headers[0]['Authorization'], 'Bearer bearer-token-123')