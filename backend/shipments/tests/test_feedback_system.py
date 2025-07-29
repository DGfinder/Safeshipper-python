# shipments/tests/test_feedback_system.py

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import json

from companies.models import Company
from ..models import Shipment, ShipmentFeedback
from ..data_retention_service import FeedbackDataRetentionService
from ..incident_service import FeedbackIncidentService
from ..weekly_reports_service import WeeklyFeedbackReportService
from notifications.notification_preferences import FeedbackNotificationPreference

User = get_user_model()


class FeedbackModelTestCase(TestCase):
    """Test cases for ShipmentFeedback model"""
    
    def setUp(self):
        # Create test company
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
        
        # Create test users
        self.manager = User.objects.create_user(
            username='manager@test.com',
            email='manager@test.com',
            password='testpass123',
            role='MANAGER',
            company=self.company
        )
        
        self.driver = User.objects.create_user(
            username='driver@test.com',
            email='driver@test.com', 
            password='testpass123',
            role='DRIVER',
            company=self.company
        )
        
        # Create test shipment
        self.shipment = Shipment.objects.create(
            tracking_number='TEST12345',
            reference_number='REF001',
            customer=self.customer_company,
            carrier=self.company,
            assigned_driver=self.driver,
            origin_location='Sydney, NSW',
            destination_location='Melbourne, VIC',
            status='DELIVERED',
            actual_delivery_date=timezone.now() - timedelta(days=1)
        )
        
    def test_feedback_creation(self):
        """Test basic feedback creation"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Excellent service!"
        )
        
        self.assertEqual(feedback.delivery_success_score, 100)
        self.assertEqual(feedback.performance_category, "EXCELLENT")
        self.assertTrue(feedback.difot_score)
        self.assertFalse(feedback.requires_incident)
        
    def test_poor_feedback_scoring(self):
        """Test feedback scoring for poor performance"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=False,
            was_driver_professional=False,
            feedback_notes="Multiple issues with delivery"
        )
        
        self.assertEqual(feedback.delivery_success_score, 0)
        self.assertEqual(feedback.performance_category, "POOR")
        self.assertFalse(feedback.difot_score)
        self.assertTrue(feedback.requires_incident)
        
    def test_partial_feedback_scoring(self):
        """Test feedback scoring for partial compliance"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=False,
            feedback_notes="On time and complete but driver was unprofessional"
        )
        
        self.assertAlmostEqual(feedback.delivery_success_score, 66.67, places=1)
        self.assertEqual(feedback.performance_category, "POOR")  # < 67%
        self.assertTrue(feedback.difot_score)  # DIFOT only considers first two
        self.assertTrue(feedback.requires_incident)  # < 67%
        
    def test_manager_response(self):
        """Test adding manager response to feedback"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Late delivery"
        )
        
        # Test successful manager response
        feedback.add_manager_response("Will investigate route delays", self.manager)
        
        self.assertTrue(feedback.has_manager_response)
        self.assertEqual(feedback.manager_response, "Will investigate route delays")
        self.assertEqual(feedback.responded_by, self.manager)
        self.assertIsNotNone(feedback.responded_at)
        
        # Test validation - non-manager cannot respond
        with self.assertRaises(ValueError):
            feedback.add_manager_response("Invalid response", self.driver)


class FeedbackAPITestCase(APITestCase):
    """Test cases for Feedback API endpoints"""
    
    def setUp(self):
        # Create test data (similar to model test setup)
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
        
        self.manager = User.objects.create_user(
            username='manager@test.com',
            email='manager@test.com',
            password='testpass123',
            role='MANAGER',
            company=self.company
        )
        
        self.customer_user = User.objects.create_user(
            username='customer@test.com',
            email='customer@test.com',
            password='testpass123', 
            role='CUSTOMER',
            company=self.customer_company
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST12345',
            customer=self.customer_company,
            carrier=self.company,
            origin_location='Sydney, NSW',
            destination_location='Melbourne, VIC',
            status='DELIVERED'
        )
        
        self.client = APIClient()
        
    def test_create_feedback_as_customer(self):
        """Test creating feedback as customer"""
        self.client.force_authenticate(user=self.customer_user)
        
        data = {
            'shipment': str(self.shipment.id),
            'was_on_time': True,
            'was_complete_and_undamaged': True,
            'was_driver_professional': True,
            'feedback_notes': 'Great service!'
        }
        
        with patch('shipments.api_views.notify_feedback_received') as mock_notify:
            with patch('shipments.api_views.send_feedback_webhook') as mock_webhook:
                response = self.client.post('/api/v1/shipments/feedback/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ShipmentFeedback.objects.count(), 1)
        
        feedback = ShipmentFeedback.objects.first()
        self.assertEqual(feedback.delivery_success_score, 100)
        self.assertFalse(feedback.requires_incident)
        
        # Verify notifications were called
        mock_notify.assert_called_once()
        mock_webhook.assert_called_once()
        
    def test_create_poor_feedback_triggers_incident(self):
        """Test that poor feedback triggers incident creation"""
        self.client.force_authenticate(user=self.customer_user)
        
        data = {
            'shipment': str(self.shipment.id),
            'was_on_time': False,
            'was_complete_and_undamaged': False,
            'was_driver_professional': False,
            'feedback_notes': 'Terrible service'
        }
        
        with patch('shipments.api_views.create_incident_for_feedback') as mock_incident:
            with patch('shipments.api_views.notify_incident_created') as mock_notify:
                mock_incident.return_value = MagicMock(incident_number='INC001')
                response = self.client.post('/api/v1/shipments/feedback/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        feedback = ShipmentFeedback.objects.first()
        self.assertTrue(feedback.requires_incident)
        
        # Verify incident creation was attempted
        mock_incident.assert_called_once_with(feedback)
        mock_notify.assert_called_once()
        
    def test_manager_add_response(self):
        """Test manager adding response to feedback"""
        # Create feedback first
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Late delivery"
        )
        
        self.client.force_authenticate(user=self.manager)
        
        data = {
            'response_text': 'We apologize for the delay and are investigating the cause.'
        }
        
        with patch('shipments.api_views.send_feedback_webhook') as mock_webhook:
            response = self.client.post(
                f'/api/v1/shipments/feedback/{feedback.id}/add_response/',
                data
            )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        feedback.refresh_from_db()
        self.assertTrue(feedback.has_manager_response)
        self.assertEqual(feedback.responded_by, self.manager)
        
        # Verify webhook was called
        mock_webhook.assert_called_once()
        
    def test_feedback_list_filtering(self):
        """Test feedback list API with filtering"""
        # Create multiple feedback records
        ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            submitted_at=timezone.now() - timedelta(days=5)
        )
        
        ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=False,
            was_driver_professional=False,
            submitted_at=timezone.now() - timedelta(days=2)
        )
        
        self.client.force_authenticate(user=self.manager)
        
        # Test date filtering
        date_filter = (timezone.now() - timedelta(days=3)).date()
        response = self.client.get(
            f'/api/v1/shipments/feedback/?submitted_at__gte={date_filter}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
    def test_feedback_analytics_endpoint(self):
        """Test feedback analytics API endpoint"""
        # Create test feedback data
        for i in range(10):
            ShipmentFeedback.objects.create(
                shipment=self.shipment,
                was_on_time=i % 2 == 0,  # 50% on time
                was_complete_and_undamaged=i % 3 == 0,  # 33% complete
                was_driver_professional=i % 4 == 0,  # 25% professional
                submitted_at=timezone.now() - timedelta(days=i)
            )
        
        self.client.force_authenticate(user=self.manager)
        
        response = self.client.get('/api/v1/shipments/feedback/analytics/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertIn('total_feedback', data)
        self.assertIn('average_score', data)
        self.assertIn('difot_rate', data)
        self.assertIn('performance_breakdown', data)
        self.assertEqual(data['total_feedback'], 10)


class FeedbackIncidentServiceTestCase(TestCase):
    """Test cases for FeedbackIncidentService"""
    
    def setUp(self):
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
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST12345',
            customer=self.customer_company,
            carrier=self.company,
            status='DELIVERED'
        )
        
    def test_incident_creation_for_poor_feedback(self):
        """Test incident creation for poor feedback scores"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=False,
            was_driver_professional=False,
            feedback_notes="Multiple issues"
        )
        
        with patch('shipments.incident_service.Incident') as mock_incident_model:
            with patch('shipments.incident_service.IncidentType') as mock_incident_type:
                mock_incident_type.objects.get_or_create.return_value = (
                    MagicMock(name="Poor Customer Feedback"), True
                )
                mock_incident = MagicMock()
                mock_incident.incident_number = 'INC001'
                mock_incident_model.objects.create.return_value = mock_incident
                
                service = FeedbackIncidentService()
                incident = service.create_feedback_incident(feedback)
                
                self.assertIsNotNone(incident)
                mock_incident_model.objects.create.assert_called_once()
                
    def test_no_incident_for_good_feedback(self):
        """Test that good feedback doesn't create incidents"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Excellent service"
        )
        
        service = FeedbackIncidentService()
        incident = service.create_feedback_incident(feedback)
        
        self.assertIsNone(incident)


class WeeklyReportsServiceTestCase(TestCase):
    """Test cases for WeeklyFeedbackReportService"""
    
    def setUp(self):
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
        
        self.manager = User.objects.create_user(
            username='manager@test.com',
            email='manager@test.com',
            password='testpass123',
            role='MANAGER',
            company=self.company
        )
        
        # Create notification preferences
        FeedbackNotificationPreference.objects.create(
            user=self.manager,
            weekly_report_enabled=True,
            weekly_report_methods=['email']
        )
        
        self.driver = User.objects.create_user(
            username='driver@test.com',
            email='driver@test.com',
            password='testpass123',
            role='DRIVER',
            company=self.company
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST12345',
            customer=self.customer_company,
            carrier=self.company,
            assigned_driver=self.driver,
            status='DELIVERED'
        )
        
        # Create test feedback data
        self.create_test_feedback_data()
        
    def create_test_feedback_data(self):
        """Create test feedback data for reports"""
        base_date = timezone.now() - timedelta(days=7)
        
        for i in range(7):  # One week of data
            ShipmentFeedback.objects.create(
                shipment=self.shipment,
                was_on_time=i % 2 == 0,  # Alternating pattern
                was_complete_and_undamaged=i % 3 != 0,  # Different pattern
                was_driver_professional=i % 4 != 0,  # Different pattern
                submitted_at=base_date + timedelta(days=i),
                feedback_notes=f"Day {i} feedback"
            )
            
    def test_generate_company_report(self):
        """Test generating weekly company report"""
        service = WeeklyFeedbackReportService()
        
        start_date = timezone.now() - timedelta(days=7)
        end_date = timezone.now()
        
        report = service.generate_company_report(
            self.company, start_date, end_date
        )
        
        self.assertIn('company', report)
        self.assertIn('overall_stats', report)
        self.assertIn('daily_trends', report)
        self.assertIn('driver_performance', report)
        
        # Check overall stats
        overall = report['overall_stats']
        self.assertEqual(overall['total_feedback_count'], 7)
        self.assertGreaterEqual(overall['average_score'], 0)
        self.assertLessEqual(overall['average_score'], 100)
        
        # Check daily trends
        self.assertEqual(len(report['daily_trends']), 7)
        
    def test_send_weekly_reports(self):
        """Test sending weekly reports via email"""
        service = WeeklyFeedbackReportService()
        
        with patch('django.core.mail.send_mail') as mock_send_mail:
            with patch('shipments.weekly_reports_service.send_weekly_report_webhook') as mock_webhook:
                mock_send_mail.return_value = True
                
                results = service.send_weekly_reports([self.company.id])
                
                self.assertEqual(results['sent_count'], 1)
                self.assertEqual(results['failed_count'], 0)
                
                mock_send_mail.assert_called_once()
                mock_webhook.assert_called_once()


class DataRetentionServiceTestCase(TestCase):
    """Test cases for FeedbackDataRetentionService"""
    
    def setUp(self):
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
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST12345',
            customer=self.customer_company,
            carrier=self.company,
            status='DELIVERED'
        )
        
        self.service = FeedbackDataRetentionService()
        
    def test_identify_feedback_for_deletion(self):
        """Test identifying feedback records for deletion"""
        # Create old feedback (over 24 months)
        old_date = timezone.now() - timedelta(days=750)  # Over 24 months
        old_feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            submitted_at=old_date
        )
        
        # Create recent feedback
        recent_feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            submitted_at=timezone.now() - timedelta(days=30)
        )
        
        candidates = self.service.identify_feedback_for_deletion()
        
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]['feedback_id'], old_feedback.id)
        
    def test_identify_feedback_for_anonymization(self):
        """Test identifying feedback records for anonymization"""
        # Create feedback over 18 months old but under 24 months
        anon_date = timezone.now() - timedelta(days=550)  # ~18 months
        anon_feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            submitted_at=anon_date,
            feedback_notes="Personal information to anonymize"
        )
        
        candidates = self.service.identify_feedback_for_anonymization()
        
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]['feedback_id'], anon_feedback.id)
        
    def test_anonymize_feedback_batch(self):
        """Test anonymizing feedback records"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Personal information to anonymize",
            manager_response="Manager response with details"
        )
        
        results = self.service.anonymize_feedback_batch([feedback.id])
        
        self.assertEqual(results['successful'], 1)
        self.assertEqual(results['failed'], 0)
        
        feedback.refresh_from_db()
        self.assertTrue(feedback.feedback_notes.startswith('[ANONYMIZED'))
        self.assertTrue(feedback.manager_response.startswith('[ANONYMIZED'))
        self.assertIsNotNone(feedback.anonymized_at)
        
    def test_delete_feedback_batch(self):
        """Test deleting feedback records"""
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True
        )
        
        feedback_id = feedback.id
        
        results = self.service.delete_feedback_batch([feedback_id])
        
        self.assertEqual(results['successful'], 1)
        self.assertEqual(results['failed'], 0)
        self.assertEqual(len(results['archived_data']), 1)
        
        # Verify deletion
        self.assertFalse(ShipmentFeedback.objects.filter(id=feedback_id).exists())
        
    def test_retention_policy_status(self):
        """Test getting retention policy status"""
        # Create feedback of various ages
        ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            submitted_at=timezone.now() - timedelta(days=30)  # Recent
        )
        
        ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            submitted_at=timezone.now() - timedelta(days=750),  # Old
            feedback_notes="Old feedback"
        )
        
        status = self.service.get_retention_policy_status()
        
        self.assertIn('total_feedback_records', status)
        self.assertIn('compliance_percentage', status)
        self.assertIn('retention_period_months', status)
        self.assertEqual(status['total_feedback_records'], 2)


class FeedbackIntegrationTestCase(APITestCase):
    """Integration tests for complete feedback workflow"""
    
    def setUp(self):
        # Create complete test environment
        self.company = Company.objects.create(
            name="Integration Test Carrier",
            company_type="CARRIER",
            is_active=True
        )
        
        self.customer_company = Company.objects.create(
            name="Integration Test Customer",
            company_type="CUSTOMER",
            is_active=True
        )
        
        self.manager = User.objects.create_user(
            username='manager@integration.com',
            email='manager@integration.com',
            password='testpass123',
            role='MANAGER',
            company=self.company
        )
        
        self.customer_user = User.objects.create_user(
            username='customer@integration.com',
            email='customer@integration.com',
            password='testpass123',
            role='CUSTOMER',
            company=self.customer_company
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='INTEGRATION123',
            customer=self.customer_company,
            carrier=self.company,
            status='DELIVERED'
        )
        
        self.client = APIClient()
        
    @patch('shipments.api_views.notify_feedback_received')
    @patch('shipments.api_views.notify_driver_feedback')
    @patch('shipments.api_views.send_feedback_webhook')
    def test_complete_feedback_workflow(self, mock_webhook, mock_driver_notify, mock_feedback_notify):
        """Test complete feedback workflow from creation to manager response"""
        
        # Step 1: Customer submits feedback
        self.client.force_authenticate(user=self.customer_user)
        
        feedback_data = {
            'shipment': str(self.shipment.id),
            'was_on_time': False,
            'was_complete_and_undamaged': True,
            'was_driver_professional': True,
            'feedback_notes': 'Late but otherwise good service'
        }
        
        response = self.client.post('/api/v1/shipments/feedback/', feedback_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        feedback = ShipmentFeedback.objects.get(shipment=self.shipment)
        self.assertAlmostEqual(feedback.delivery_success_score, 66.67, places=1)
        
        # Verify notifications were triggered
        mock_feedback_notify.assert_called_once_with(feedback)
        mock_driver_notify.assert_called_once_with(feedback)
        mock_webhook.assert_called_once_with(feedback, 'created')
        
        # Step 2: Manager views and responds to feedback
        self.client.force_authenticate(user=self.manager)
        
        # Get feedback list
        response = self.client.get('/api/v1/shipments/feedback/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        # Add manager response
        with patch('shipments.api_views.notify_manager_response') as mock_response_notify:
            with patch('shipments.api_views.send_feedback_webhook') as mock_response_webhook:
                response_data = {
                    'response_text': 'Thank you for the feedback. We are working to improve our on-time performance.'
                }
                
                response = self.client.post(
                    f'/api/v1/shipments/feedback/{feedback.id}/add_response/',
                    response_data
                )
                
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                
                mock_response_notify.assert_called_once_with(feedback)
                mock_response_webhook.assert_called_once_with(feedback, 'manager_response')
        
        # Step 3: Verify analytics endpoint
        response = self.client.get('/api/v1/shipments/feedback/analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        analytics = response.data
        self.assertEqual(analytics['total_feedback'], 1)
        self.assertAlmostEqual(analytics['average_score'], 66.67, places=1)
        
        # Step 4: Export functionality
        response = self.client.get('/api/v1/shipments/feedback/export/?format=json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        export_data = json.loads(response.content)
        self.assertEqual(len(export_data), 1)
        self.assertEqual(export_data[0]['tracking_number'], 'INTEGRATION123')


if __name__ == '__main__':
    import django
    django.setup()
    
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["shipments.tests.test_feedback_system"])