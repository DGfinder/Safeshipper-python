# shipments/tests/test_notification_integration.py

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from datetime import timedelta

from companies.models import Company
from ..models import Shipment, ShipmentFeedback
from notifications.feedback_notification_service import FeedbackNotificationService
from notifications.notification_preferences import FeedbackNotificationPreference
from notifications.sms_service import TwilioSMSService

User = get_user_model()


class FeedbackNotificationIntegrationTestCase(TestCase):
    """Test cases for feedback notification system integration"""
    
    def setUp(self):
        # Create test company and users
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
            company=self.company,
            phone_number='+61412345678'
        )
        
        self.driver = User.objects.create_user(
            username='driver@test.com',
            email='driver@test.com', 
            password='testpass123',
            role='DRIVER',
            company=self.company,
            phone_number='+61487654321'
        )
        
        # Create notification preferences
        self.manager_prefs = FeedbackNotificationPreference.objects.create(
            user=self.manager,
            feedback_received_enabled=True,
            feedback_received_methods=['email', 'sms', 'push'],
            feedback_received_frequency='immediate',
            critical_threshold_enabled=True,
            emergency_override_enabled=True
        )
        
        self.driver_prefs = FeedbackNotificationPreference.objects.create(
            user=self.driver,
            driver_feedback_enabled=True,
            driver_feedback_methods=['push', 'email'],
            driver_feedback_frequency='immediate'
        )
        
        # Create test shipment
        self.shipment = Shipment.objects.create(
            tracking_number='TEST12345',
            customer=self.customer_company,
            carrier=self.company,
            assigned_driver=self.driver,
            status='DELIVERED'
        )
        
        self.service = FeedbackNotificationService()
        
    @patch('notifications.feedback_notification_service.send_mail')
    @patch('notifications.feedback_notification_service.ExpoPushNotificationService')
    def test_manager_notification_for_feedback_received(self, mock_expo_service, mock_send_mail):
        """Test manager receives notifications when feedback is received"""
        
        # Create feedback
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Late delivery but good service"
        )
        
        mock_send_mail.return_value = True
        mock_expo_instance = MagicMock()
        mock_expo_service.return_value = mock_expo_instance
        mock_expo_instance.send_notification.return_value = True
        
        # Send notifications
        self.service.notify_feedback_received(feedback)
        
        # Verify email was sent
        mock_send_mail.assert_called_once()
        
        # Verify email was sent to manager
        call_args = mock_send_mail.call_args
        self.assertIn(self.manager.email, call_args[1]['recipient_list'])
        
    @patch('notifications.sms_service.TwilioSMSService.send_feedback_alert')
    def test_sms_notification_for_critical_feedback(self, mock_sms_send):
        """Test SMS notification for critical feedback scores"""
        
        # Create critical feedback (score < 33%)
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=False,
            was_driver_professional=False,
            feedback_notes="Multiple serious issues"
        )
        
        mock_sms_send.return_value = {'success': True, 'message_sid': 'SM123456'}
        
        # Send notifications
        self.service._send_sms_notification(
            self.manager, 'feedback_received', feedback, {}
        )
        
        # Verify SMS was sent
        mock_sms_send.assert_called_once()
        
        # Verify SMS parameters
        call_args = mock_sms_send.call_args
        self.assertEqual(call_args[1]['phone_number'], self.manager.phone_number)
        self.assertEqual(call_args[1]['score'], 0)  # Critical score
        self.assertEqual(call_args[1]['feedback_type'], 'critical_feedback')
        
    @patch('notifications.feedback_notification_service.send_mail')
    def test_driver_notification_for_positive_feedback(self, mock_send_mail):
        """Test driver receives notification for positive feedback"""
        
        # Create positive feedback
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True,
            feedback_notes="Excellent service!"
        )
        
        mock_send_mail.return_value = True
        
        # Send driver notification
        self.service.notify_driver_feedback(feedback)
        
        # Verify email was sent to driver
        mock_send_mail.assert_called_once()
        call_args = mock_send_mail.call_args
        self.assertIn(self.driver.email, call_args[1]['recipient_list'])
        
    def test_notification_preferences_filtering(self):
        """Test that notification preferences properly filter notifications"""
        
        # Disable feedback notifications for manager
        self.manager_prefs.feedback_received_enabled = False
        self.manager_prefs.save()
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True, 
            was_driver_professional=True
        )
        
        with patch('notifications.feedback_notification_service.send_mail') as mock_send_mail:
            self.service.notify_feedback_received(feedback)
            
            # Should not send email since notifications are disabled
            mock_send_mail.assert_not_called()
            
    def test_emergency_override_for_critical_feedback(self):
        """Test emergency override works for critical feedback"""
        
        # Disable regular notifications but keep emergency override
        self.manager_prefs.feedback_received_enabled = False
        self.manager_prefs.emergency_override_enabled = True
        self.manager_prefs.save()
        
        # Create critical feedback that triggers emergency override
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=False,
            was_complete_and_undamaged=False,
            was_driver_professional=False,
            feedback_notes="Critical service failure"
        )
        
        with patch('notifications.feedback_notification_service.send_mail') as mock_send_mail:
            mock_send_mail.return_value = True
            
            # Send notification as emergency (is_emergency=True)
            self.service._send_feedback_notification(
                self.manager, 'feedback_received', feedback, {}, is_emergency=True
            )
            
            # Should send email despite disabled regular notifications
            mock_send_mail.assert_called_once()
            
    @patch('notifications.feedback_notification_service.NotificationDigest')
    def test_digest_notification_accumulation(self, mock_digest_model):
        """Test that digest notifications properly accumulate"""
        
        # Set manager to daily digest
        self.manager_prefs.feedback_received_frequency = 'daily'
        self.manager_prefs.save()
        
        mock_digest_instance = MagicMock()
        mock_digest_model.objects.get_or_create.return_value = (mock_digest_instance, True)
        mock_digest_instance.content = {'notifications': []}
        
        feedback = ShipmentFeedback.objects.create(
            shipment=self.shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=True
        )
        
        # Send notification (should go to digest, not immediate)
        self.service._send_feedback_notification(
            self.manager, 'feedback_received', feedback, {}
        )
        
        # Verify digest was created/updated
        mock_digest_model.objects.get_or_create.assert_called_once()
        mock_digest_instance.save.assert_called_once()


class SMSServiceTestCase(TestCase):
    """Test cases for SMS service integration"""
    
    def setUp(self):
        self.sms_service = TwilioSMSService()
        
    @patch('twilio.rest.Client')
    def test_send_feedback_alert_success(self, mock_twilio_client):
        """Test successful SMS sending for feedback alert"""
        
        # Mock Twilio client
        mock_client_instance = MagicMock()
        mock_twilio_client.return_value = mock_client_instance
        
        mock_message = MagicMock()
        mock_message.sid = 'SM123456789'
        mock_client_instance.messages.create.return_value = mock_message
        
        # Send SMS
        result = self.sms_service.send_feedback_alert(
            phone_number='+61412345678',
            feedback_type='poor_feedback',
            tracking_number='TEST123',
            customer_name='Test Customer',
            score=45,
            manager_name='Test Manager'
        )
        
        # Verify success
        self.assertTrue(result['success'])
        self.assertEqual(result['message_sid'], 'SM123456789')
        
        # Verify Twilio was called with correct parameters
        mock_client_instance.messages.create.assert_called_once()
        call_args = mock_client_instance.messages.create.call_args
        self.assertEqual(call_args[1]['to'], '+61412345678')
        self.assertIn('TEST123', call_args[1]['body'])
        
    @patch('twilio.rest.Client')
    def test_send_driver_feedback_alert(self, mock_twilio_client):
        """Test SMS notification to drivers about their feedback"""
        
        mock_client_instance = MagicMock()
        mock_twilio_client.return_value = mock_client_instance
        
        mock_message = MagicMock()
        mock_message.sid = 'SM987654321'
        mock_client_instance.messages.create.return_value = mock_message
        
        # Send positive feedback SMS to driver
        result = self.sms_service.send_driver_feedback_alert(
            phone_number='+61487654321',
            tracking_number='TEST456',
            customer_name='Happy Customer',
            score=95,
            is_positive=True
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['message_sid'], 'SM987654321')
        
        # Verify message content is positive
        call_args = mock_client_instance.messages.create.call_args
        message_body = call_args[1]['body']
        self.assertIn('Great job', message_body)
        self.assertIn('95%', message_body)
        
    def test_phone_number_validation(self):
        """Test phone number validation"""
        
        # Test valid numbers
        valid_numbers = [
            '+61412345678',
            '+1234567890',
            '+44123456789'
        ]
        
        for number in valid_numbers:
            self.assertTrue(self.sms_service.validate_phone_number(number))
            
        # Test invalid numbers
        invalid_numbers = [
            '123',  # Too short
            'not-a-number',
            '+',
            ''
        ]
        
        for number in invalid_numbers:
            self.assertFalse(self.sms_service.validate_phone_number(number))


class NotificationPreferencesTestCase(TestCase):
    """Test cases for notification preferences"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='testpass123',
            role='MANAGER'
        )
        
    def test_default_notification_preferences(self):
        """Test default notification preferences for different roles"""
        
        # Create preferences
        prefs = FeedbackNotificationPreference.objects.create(user=self.user)
        
        # Test default values based on role
        self.assertTrue(prefs.feedback_received_enabled)
        self.assertEqual(prefs.feedback_received_frequency, 'immediate')
        self.assertIn('email', prefs.feedback_received_methods)
        
    def test_should_notify_logic(self):
        """Test notification filtering logic"""
        
        prefs = FeedbackNotificationPreference.objects.create(
            user=self.user,
            feedback_received_enabled=True,
            critical_threshold_enabled=True,
            critical_threshold=70,
            emergency_override_enabled=True
        )
        
        # Test normal feedback (should notify)
        self.assertTrue(prefs.should_notify('feedback_received', 85, False))
        
        # Test feedback below critical threshold (should notify)
        self.assertTrue(prefs.should_notify('feedback_received', 65, False))
        
        # Disable regular notifications
        prefs.feedback_received_enabled = False
        prefs.save()
        
        # Test normal feedback (should not notify)
        self.assertFalse(prefs.should_notify('feedback_received', 85, False))
        
        # Test emergency override (should notify even when disabled)
        self.assertTrue(prefs.should_notify('feedback_received', 30, True))
        
    def test_get_notification_methods(self):
        """Test getting notification methods for different notification types"""
        
        prefs = FeedbackNotificationPreference.objects.create(
            user=self.user,
            feedback_received_methods=['email', 'sms'],
            incident_created_methods=['push', 'sms'],
            manager_response_methods=['email']
        )
        
        # Test getting methods for different types
        feedback_methods = prefs.get_notification_methods('feedback_received')
        self.assertEqual(set(feedback_methods), {'email', 'sms'})
        
        incident_methods = prefs.get_notification_methods('incident_created')
        self.assertEqual(set(incident_methods), {'push', 'sms'})
        
        response_methods = prefs.get_notification_methods('manager_response')
        self.assertEqual(set(response_methods), {'email'})
        
    def test_quiet_hours_functionality(self):
        """Test quiet hours functionality"""
        
        prefs = FeedbackNotificationPreference.objects.create(
            user=self.user,
            quiet_hours_enabled=True,
            quiet_hours_start='22:00',
            quiet_hours_end='08:00',
            emergency_override_enabled=True
        )
        
        # Test during quiet hours
        with patch('django.utils.timezone.now') as mock_now:
            # Mock time during quiet hours (2 AM)
            mock_now.return_value = timezone.now().replace(hour=2, minute=0)
            
            # Regular notification should be suppressed
            self.assertFalse(prefs.should_notify('feedback_received', 85, False))
            
            # Emergency should override quiet hours
            self.assertTrue(prefs.should_notify('feedback_received', 30, True))
            
        # Test outside quiet hours
        with patch('django.utils.timezone.now') as mock_now:
            # Mock time outside quiet hours (10 AM)
            mock_now.return_value = timezone.now().replace(hour=10, minute=0)
            
            # Should notify normally
            self.assertTrue(prefs.should_notify('feedback_received', 85, False))