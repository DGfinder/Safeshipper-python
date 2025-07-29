# notifications/management/commands/test_push_notifications.py
"""
Management command to test the mobile push notification system.
Tests device registration, notification sending, and feedback integration.
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from companies.models import Company
from notifications.models import PushNotificationDevice
from notifications.services import PushNotificationService
from shipments.models import Shipment, ShipmentFeedback
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the mobile push notification system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=str,
            help='Company ID to test notifications for (defaults to first company)'
        )
        parser.add_argument(
            '--test-token',
            type=str,
            default='ExponentPushToken[test-token-123456789]',
            help='Test push token to use (default: test token)'
        )
        parser.add_argument(
            '--skip-device-registration',
            action='store_true',
            help='Skip device registration test'
        )
        parser.add_argument(
            '--skip-feedback-notification',
            action='store_true',
            help='Skip feedback notification test'
        )
        parser.add_argument(
            '--test-score',
            type=float,
            default=65.0,
            help='Feedback score to test with (default: 65.0)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing SafeShipper Mobile Push Notification System'))
        self.stdout.write('=' * 70)

        try:
            # Get or find company
            company = self._get_company(options['company_id'])
            self.stdout.write(f"Testing with company: {company.name}")

            # Get or create test user
            test_user = self._get_or_create_test_user(company)
            self.stdout.write(f"Using test user: {test_user.get_full_name()} ({test_user.email})")

            # Test device registration
            if not options['skip_device_registration']:
                self._test_device_registration(test_user, options['test_token'])

            # Test basic notification sending
            self._test_basic_notification(test_user, options['test_token'])

            # Test feedback notification integration
            if not options['skip_feedback_notification']:
                self._test_feedback_notification_integration(company, test_user, options['test_score'])

            # Test device status and preferences
            self._test_device_management(test_user)

            self.stdout.write(self.style.SUCCESS('\n✅ Mobile push notification system test completed successfully'))

        except Exception as e:
            raise CommandError(f'Test failed: {str(e)}')

    def _get_company(self, company_id):
        """Get company for testing."""
        if company_id:
            try:
                return Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                raise CommandError(f'Company with ID {company_id} not found')
        else:
            company = Company.objects.first()
            if not company:
                raise CommandError('No companies found in database')
            return company

    def _get_or_create_test_user(self, company):
        """Get or create test user for notifications."""
        test_email = f"push-test@{company.name.lower().replace(' ', '')}.com"
        
        try:
            return User.objects.get(email=test_email)
        except User.DoesNotExist:
            return User.objects.create_user(
                username=f"pushtest_{company.id}",
                email=test_email,
                first_name="Push",
                last_name="Test User",
                company=company,
                role='DRIVER',
                is_active=True
            )

    def _test_device_registration(self, user, test_token):
        """Test device registration functionality."""
        self.stdout.write('\nTesting Device Registration:')
        self.stdout.write('-' * 30)

        # Clean up any existing test devices
        PushNotificationDevice.objects.filter(
            user=user,
            expo_push_token=test_token
        ).delete()

        # Test device registration
        device, created = PushNotificationDevice.objects.update_or_create(
            user=user,
            device_identifier='test-device-123',
            defaults={
                'expo_push_token': test_token,
                'device_platform': 'android',
                'app_version': '1.0.0',
                'is_active': True,
                'last_updated': timezone.now()
            }
        )

        if created:
            self.stdout.write(f"✅ Device registered successfully: {device.id}")
        else:
            self.stdout.write(f"✅ Device updated successfully: {device.id}")

        # Test preferences
        device.notification_preferences = {
            'feedback_notifications': True,
            'shipment_updates': True,
            'emergency_alerts': True
        }
        device.save()

        self.stdout.write(f"✅ Device preferences set: {device.notification_preferences}")

        return device

    def _test_basic_notification(self, user, test_token):
        """Test basic notification sending."""
        self.stdout.write('\nTesting Basic Notification Sending:')
        self.stdout.write('-' * 40)

        # Initialize push service
        push_service = PushNotificationService()

        # Test single notification
        result = push_service.send_notification(
            expo_push_token=test_token,
            title="SafeShipper Test Notification",
            body="This is a test push notification from the SafeShipper system",
            data={
                'type': 'test',
                'timestamp': timezone.now().isoformat(),
                'test_id': str(uuid.uuid4())
            },
            priority='normal'
        )

        if result.get('success'):
            self.stdout.write(f"✅ Test notification sent successfully")
            if result.get('ticket_id'):
                self.stdout.write(f"   Ticket ID: {result['ticket_id']}")
        else:
            self.stdout.write(self.style.WARNING(f"⚠️  Test notification failed: {result.get('error')}"))

        # Test multi-user notification
        user_ids = [str(user.id)]
        batch_result = push_service.send_notifications_to_users(
            user_ids=user_ids,
            title="SafeShipper Batch Test",
            body="This is a batch notification test",
            data={'type': 'batch_test'},
            notification_type='feedback_notifications',
            priority='normal'
        )

        if batch_result.get('success'):
            self.stdout.write(f"✅ Batch notification sent: {batch_result['sent_count']} devices")
        else:
            self.stdout.write(self.style.WARNING(f"⚠️  Batch notification failed: {batch_result.get('error')}"))

    def _test_feedback_notification_integration(self, company, user, test_score):
        """Test feedback notification integration."""
        self.stdout.write('\nTesting Feedback Notification Integration:')
        self.stdout.write('-' * 45)

        # Create test shipment
        shipment = self._create_test_shipment(company, user)
        self.stdout.write(f"Created test shipment: {shipment.tracking_number}")

        # Create test feedback
        feedback = self._create_test_feedback(shipment, test_score)
        self.stdout.write(f"Created test feedback with score: {feedback.delivery_success_score}%")

        # Test feedback notifications
        push_service = PushNotificationService()

        # Test driver notification
        driver_result = push_service.send_feedback_notification(feedback, 'driver')
        if driver_result.get('success'):
            self.stdout.write(f"✅ Driver feedback notification sent: {driver_result['sent_count']} devices")
        else:
            self.stdout.write(f"⚠️  Driver feedback notification: {driver_result.get('error', 'No driver found')}")

        # Test manager notification (if poor score)
        if test_score < 70:
            manager_result = push_service.send_feedback_notification(feedback, 'manager')
            if manager_result.get('success'):
                self.stdout.write(f"✅ Manager alert notification sent: {manager_result['sent_count']} devices")
            else:
                self.stdout.write(f"⚠️  Manager alert notification: {manager_result.get('error', 'No managers found')}")

        return feedback

    def _test_device_management(self, user):
        """Test device management functionality."""
        self.stdout.write('\nTesting Device Management:')
        self.stdout.write('-' * 28)

        # Get all devices for user
        devices = PushNotificationDevice.objects.filter(user=user)
        self.stdout.write(f"User has {devices.count()} registered devices")

        for device in devices:
            self.stdout.write(f"  Device: {device.device_platform} - {device.device_identifier}")
            self.stdout.write(f"    Active: {device.is_active}")
            self.stdout.write(f"    Preferences: {device.notification_preferences}")
            self.stdout.write(f"    Last Updated: {device.last_updated}")

        # Test preference checking
        if devices.exists():
            device = devices.first()
            can_receive_feedback = device.should_receive_notification('feedback_notifications')
            can_receive_shipments = device.should_receive_notification('shipment_updates')
            
            self.stdout.write(f"✅ Can receive feedback notifications: {can_receive_feedback}")
            self.stdout.write(f"✅ Can receive shipment updates: {can_receive_shipments}")

    def _create_test_shipment(self, company, user):
        """Create a test shipment."""
        # Get or create customer company
        customer_company = Company.objects.exclude(id=company.id).first()
        if not customer_company:
            customer_company = Company.objects.create(
                name="Test Customer for Push Notifications",
                company_type="CUSTOMER",
                abn="98765432109"
            )

        return Shipment.objects.create(
            tracking_number=f"PUSH-{timezone.now().strftime('%Y%m%d-%H%M%S')}",
            customer=customer_company,
            carrier=company,
            origin_location="Test Origin",
            destination_location="Test Destination",
            status='DELIVERED',
            requested_by=user,
            assigned_driver=user,  # Driver is the test user
            actual_delivery_date=timezone.now() - timezone.timedelta(hours=1)
        )

    def _create_test_feedback(self, shipment, score):
        """Create test feedback with specified score."""
        # Delete existing feedback if any
        ShipmentFeedback.objects.filter(shipment=shipment).delete()

        # Calculate boolean values to achieve desired score
        target_positive_count = round((score / 100) * 3)

        return ShipmentFeedback.objects.create(
            shipment=shipment,
            was_on_time=target_positive_count >= 1,
            was_complete_and_undamaged=target_positive_count >= 2,
            was_driver_professional=target_positive_count >= 3,
            feedback_notes=f"Test push notification feedback with target score of {score}%. Generated for mobile notification testing."
        )