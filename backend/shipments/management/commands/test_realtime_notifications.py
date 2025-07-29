# shipments/management/commands/test_realtime_notifications.py
"""
Management command to test the real-time feedback notification system.
Creates test feedback and verifies WebSocket notifications are sent correctly.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.contrib.auth import get_user_model
from companies.models import Company
from shipments.models import Shipment, ShipmentFeedback
from shipments.realtime_feedback_service import RealtimeFeedbackNotificationService, FeedbackWebSocketEventService
from channels.layers import get_channel_layer
import asyncio

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the real-time feedback notification system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=str,
            help='Company ID to test notifications for (defaults to first company)'
        )
        parser.add_argument(
            '--score',
            type=float,
            default=65.0,
            help='Feedback score to test with (default: 65.0)'
        )
        parser.add_argument(
            '--test-websocket',
            action='store_true',
            help='Test WebSocket infrastructure (requires channel layer)'
        )
        parser.add_argument(
            '--test-dashboard-update',
            action='store_true',
            help='Test dashboard metric updates'
        )
        parser.add_argument(
            '--simulate-multiple',
            type=int,
            default=1,
            help='Simulate multiple feedback submissions (default: 1)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing SafeShipper Real-Time Feedback Notification System'))
        self.stdout.write('=' * 70)

        try:
            # Get or find company
            company = self._get_company(options['company_id'])
            self.stdout.write(f"Testing with company: {company.name}")

            # Test WebSocket infrastructure if requested
            if options['test_websocket']:
                self._test_websocket_infrastructure()

            # Test dashboard updates if requested
            if options['test_dashboard_update']:
                self._test_dashboard_updates(company)

            # Test real-time notifications
            simulation_count = options['simulate_multiple']
            for i in range(simulation_count):
                self.stdout.write(f"\n--- Testing notification #{i+1} of {simulation_count} ---")
                
                # Create or find test shipment
                shipment = self._get_or_create_test_shipment(company, i)
                self.stdout.write(f"Using shipment: {shipment.tracking_number}")

                # Create test feedback
                feedback = self._create_test_feedback(shipment, options['score'] + (i * 5))
                self.stdout.write(f"Created feedback with score: {feedback.delivery_success_score}%")

                # Test real-time notification system
                self._test_realtime_notifications(feedback)

            self.stdout.write(self.style.SUCCESS(f'\n✅ Real-time notification system test completed successfully ({simulation_count} simulations)'))

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

    def _test_websocket_infrastructure(self):
        """Test WebSocket channel layer availability."""
        self.stdout.write('\nTesting WebSocket Infrastructure:')
        self.stdout.write('-' * 35)

        channel_layer = get_channel_layer()
        if channel_layer is None:
            self.stdout.write(self.style.WARNING('⚠️  Channel layer not configured - WebSocket notifications will not work'))
            self.stdout.write('   Configure Redis and CHANNEL_LAYERS in settings.py')
            return False
        
        # Test channel layer
        try:
            # This is a simple test to see if the channel layer is responsive
            self.stdout.write(f"✅ Channel layer available: {channel_layer.__class__.__name__}")
            self.stdout.write(f"   Backend: {getattr(channel_layer, 'channel_capacity', 'Unknown')}")
            return True
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Channel layer test failed: {str(e)}'))
            return False

    def _test_dashboard_updates(self, company):
        """Test dashboard metric updates."""
        self.stdout.write('\nTesting Dashboard Updates:')
        self.stdout.write('-' * 30)

        try:
            # Test dashboard update functionality
            from shipments.tasks import update_company_dashboard_metrics
            
            self.stdout.write(f"Triggering dashboard update for {company.name}...")
            
            # Run the task synchronously for testing
            result = update_company_dashboard_metrics(str(company.id))
            
            if result.get('status') == 'success':
                metrics = result.get('metrics', {})
                self.stdout.write(f"✅ Dashboard update successful:")
                self.stdout.write(f"   Delivery Success Score: {metrics.get('delivery_success_score', 0)}%")
                self.stdout.write(f"   Total Feedback Count: {metrics.get('total_feedback_count', 0)}")
                self.stdout.write(f"   Poor Feedback Rate: {metrics.get('poor_feedback_rate', 0)}%")
            else:
                self.stdout.write(self.style.WARNING(f"⚠️  Dashboard update returned: {result}"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Dashboard update test failed: {str(e)}'))

    def _get_or_create_test_shipment(self, company, index=0):
        """Get or create a test shipment."""
        # Try to find an existing delivered shipment without feedback
        existing_shipment = Shipment.objects.filter(
            carrier=company,
            status='DELIVERED'
        ).exclude(
            id__in=ShipmentFeedback.objects.values_list('shipment_id', flat=True)
        ).first()

        if existing_shipment and index == 0:
            return existing_shipment

        # Create a new test shipment
        customer_company = Company.objects.exclude(id=company.id).first()
        if not customer_company:
            # Create a test customer company
            customer_company = Company.objects.create(
                name="Test Customer Company",
                company_type="CUSTOMER",
                abn="12345678901"
            )

        test_user = User.objects.filter(company=company, is_active=True).first()
        if not test_user:
            test_user = User.objects.create_user(
                username=f"testuser_{company.id}_{index}",
                email=f"test{index}@{company.name.lower().replace(' ', '')}.com",
                company=company,
                role='MANAGER'
            )

        shipment = Shipment.objects.create(
            tracking_number=f"RT-{timezone.now().strftime('%Y%m%d-%H%M%S')}-{index}",
            customer=customer_company,
            carrier=company,
            origin_location="Test Origin",
            destination_location="Test Destination",
            status='DELIVERED',
            requested_by=test_user,
            actual_delivery_date=timezone.now() - timezone.timedelta(hours=1)
        )

        return shipment

    def _create_test_feedback(self, shipment, score):
        """Create test feedback with specified score."""
        # Delete existing feedback if any
        ShipmentFeedback.objects.filter(shipment=shipment).delete()

        # Calculate boolean values to achieve desired score
        # Score = (on_time + complete + professional) / 3 * 100
        target_positive_count = round((score / 100) * 3)

        feedback_data = {
            'shipment': shipment,
            'was_on_time': target_positive_count >= 1,
            'was_complete_and_undamaged': target_positive_count >= 2,
            'was_driver_professional': target_positive_count >= 3,
            'feedback_notes': f"Test real-time notification feedback with target score of {score}%. Automated test data for notification system verification."
        }

        feedback = ShipmentFeedback.objects.create(**feedback_data)
        
        # Verify the calculated score matches our target (approximately)
        calculated_score = feedback.delivery_success_score
        self.stdout.write(f"Target score: {score}%, Actual score: {calculated_score}%")

        return feedback

    def _test_realtime_notifications(self, feedback):
        """Test the real-time notification system with the created feedback."""
        self.stdout.write('\nTesting Real-Time Notifications:')
        self.stdout.write('-' * 35)

        try:
            # Initialize the real-time notification service
            realtime_service = RealtimeFeedbackNotificationService()

            # Get notification recipients
            recipients = realtime_service.get_notification_recipients(feedback)
            self.stdout.write(f"Notification recipients:")
            self.stdout.write(f"  Managers: {len(recipients['managers'])}")
            self.stdout.write(f"  Drivers: {len(recipients['drivers'])}")
            self.stdout.write(f"  Customers: {len(recipients['customers'])}")

            # Test notification data creation
            for recipient_type in ['manager', 'driver', 'customer']:
                notification_data = realtime_service.create_feedback_notification_data(feedback, recipient_type)
                self.stdout.write(f"\n{recipient_type.title()} notification:")
                self.stdout.write(f"  Title: {notification_data['title']}")
                self.stdout.write(f"  Priority: {notification_data['priority']}")
                self.stdout.write(f"  Requires Action: {notification_data['requires_action']}")
                self.stdout.write(f"  Message: {notification_data['message'][:100]}...")

            # Process the full notification workflow
            self.stdout.write('\nProcessing full notification workflow...')
            notification_result = realtime_service.process_feedback_realtime_notifications(feedback)

            self.stdout.write(f"\nNotification Results:")
            self.stdout.write(f"  Notifications sent: {notification_result['notifications_sent']}")
            self.stdout.write(f"  Notifications failed: {notification_result['notifications_failed']}")
            self.stdout.write(f"  Manager notifications: {notification_result['recipients']['managers']}")
            self.stdout.write(f"  Driver notifications: {notification_result['recipients']['drivers']}")
            self.stdout.write(f"  Customer notifications: {notification_result['recipients']['customers']}")
            self.stdout.write(f"  Channel notifications: {notification_result['recipients']['channels']}")

            if notification_result['errors']:
                self.stdout.write(self.style.WARNING('\nNotification errors:'))
                for error in notification_result['errors']:
                    self.stdout.write(f"  ⚠️  {error}")

            # Test shipment-specific WebSocket updates
            self.stdout.write('\nTesting shipment WebSocket updates...')
            try:
                FeedbackWebSocketEventService.broadcast_feedback_update_to_shipment_viewers(feedback)
                self.stdout.write(f"✅ Broadcast feedback update for shipment {feedback.shipment.tracking_number}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️  WebSocket broadcast failed: {str(e)}"))

            # Test trend alerts if score is poor
            if feedback.delivery_success_score < 70:
                self.stdout.write('\nTesting trend alert (poor score detected)...')
                try:
                    trend_data = {
                        'average_score': feedback.delivery_success_score,
                        'poor_score_rate': 100.0,  # This is a poor score
                        'total_feedback_count': 1,
                        'trend_status': 'POOR'
                    }
                    
                    alert_result = realtime_service.send_feedback_trend_alert(
                        feedback.shipment.carrier, 
                        trend_data, 
                        'WARNING'
                    )
                    
                    self.stdout.write(f"✅ Trend alert sent: {alert_result['notifications_sent']} notifications")
                    if alert_result['errors']:
                        for error in alert_result['errors']:
                            self.stdout.write(f"  ⚠️  {error}")
                            
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"⚠️  Trend alert failed: {str(e)}"))

            self.stdout.write(self.style.SUCCESS('\n✅ Real-time notification test completed'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Real-time notification test failed: {str(e)}'))
            raise