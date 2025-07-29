# shipments/management/commands/test_feedback_alerts.py
"""
Management command to test the feedback alert system.
Creates test feedback with poor scores and verifies alert functionality.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.contrib.auth import get_user_model
from companies.models import Company
from shipments.models import Shipment, ShipmentFeedback
from shipments.feedback_alert_service import FeedbackAlertService, FeedbackTrendAnalyzer

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the feedback alert system with sample data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=str,
            help='Company ID to test alerts for (defaults to first company)'
        )
        parser.add_argument(
            '--score',
            type=float,
            default=60.0,
            help='Feedback score to test with (default: 60.0)'
        )
        parser.add_argument(
            '--send-emails',
            action='store_true',
            help='Actually send alert emails (default: dry run)'
        )
        parser.add_argument(
            '--analyze-trends',
            action='store_true',
            help='Analyze feedback trends for the company'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing SafeShipper Feedback Alert System'))
        self.stdout.write('=' * 60)

        try:
            # Get or find company
            company = self._get_company(options['company_id'])
            self.stdout.write(f"Testing with company: {company.name}")

            # Test trend analysis if requested
            if options['analyze_trends']:
                self._test_trend_analysis(company)

            # Create or find test shipment
            shipment = self._get_or_create_test_shipment(company)
            self.stdout.write(f"Using shipment: {shipment.tracking_number}")

            # Create test feedback
            feedback = self._create_test_feedback(shipment, options['score'])
            self.stdout.write(f"Created feedback with score: {feedback.delivery_success_score}%")

            # Test alert system
            self._test_alert_system(feedback, options['send_emails'])

            self.stdout.write(self.style.SUCCESS('✅ Feedback alert system test completed successfully'))

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

    def _get_or_create_test_shipment(self, company):
        """Get or create a test shipment."""
        # Try to find an existing delivered shipment without feedback
        existing_shipment = Shipment.objects.filter(
            carrier=company,
            status='DELIVERED'
        ).exclude(
            id__in=ShipmentFeedback.objects.values_list('shipment_id', flat=True)
        ).first()

        if existing_shipment:
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
                username=f"testuser_{company.id}",
                email=f"test@{company.name.lower().replace(' ', '')}.com",
                company=company,
                role='MANAGER'
            )

        shipment = Shipment.objects.create(
            tracking_number=f"TEST-{timezone.now().strftime('%Y%m%d-%H%M%S')}",
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
            'feedback_notes': f"Test feedback with target score of {score}%. This is automated test data."
        }

        feedback = ShipmentFeedback.objects.create(**feedback_data)
        
        # Verify the calculated score matches our target (approximately)
        calculated_score = feedback.delivery_success_score
        self.stdout.write(f"Target score: {score}%, Actual score: {calculated_score}%")

        return feedback

    def _test_alert_system(self, feedback, send_emails):
        """Test the alert system with the created feedback."""
        self.stdout.write('\nTesting Alert System:')
        self.stdout.write('-' * 30)

        # Test threshold check
        should_alert = FeedbackAlertService.should_trigger_alert(feedback)
        self.stdout.write(f"Should trigger alert: {should_alert}")

        if should_alert:
            priority = FeedbackAlertService.get_alert_priority(feedback)
            self.stdout.write(f"Alert priority: {priority}")

            # Get managers
            managers = FeedbackAlertService.get_company_managers(feedback.shipment.carrier)
            self.stdout.write(f"Managers to notify: {len(managers)}")
            for manager in managers:
                self.stdout.write(f"  - {manager.get_full_name()} ({manager.email}) - {manager.role}")

            if not send_emails:
                self.stdout.write(self.style.WARNING('⚠️  Email sending disabled (dry run mode). Use --send-emails to actually send alerts.'))
                return

            # Process the alert
            result = FeedbackAlertService.process_feedback_alert(feedback)
            
            self.stdout.write('\nAlert Processing Results:')
            self.stdout.write(f"Alert triggered: {result.get('alert_triggered')}")
            if result.get('alert_triggered'):
                self.stdout.write(f"Priority: {result.get('priority')}")
                self.stdout.write(f"Managers notified: {result.get('managers_notified')}")
                self.stdout.write(f"Event created: {result.get('event_created')}")
                
                email_results = result.get('email_results', {})
                self.stdout.write(f"Emails sent: {email_results.get('emails_sent', 0)}")
                self.stdout.write(f"Emails failed: {email_results.get('emails_failed', 0)}")
                
                if email_results.get('failed_recipients'):
                    self.stdout.write(self.style.ERROR('Failed recipients:'))
                    for failed in email_results['failed_recipients']:
                        self.stdout.write(f"  - {failed['email']}: {failed['error']}")
                
                self.stdout.write(f"Notifications queued: {result.get('notifications_queued', 0)}")
            else:
                self.stdout.write(f"Reason: {result.get('reason')}")

        else:
            self.stdout.write(f"No alert triggered (score {feedback.delivery_success_score}% is above {FeedbackAlertService.POOR_SCORE_THRESHOLD}% threshold)")

    def _test_trend_analysis(self, company):
        """Test trend analysis functionality."""
        self.stdout.write('\nTesting Trend Analysis:')
        self.stdout.write('-' * 30)

        # Get recent trends
        trend_data = FeedbackTrendAnalyzer.get_recent_feedback_trend(company, days=7)
        
        if trend_data['has_data']:
            self.stdout.write(f"Period: Last {trend_data['period_days']} days")
            self.stdout.write(f"Total feedback: {trend_data['total_feedback_count']}")
            self.stdout.write(f"Average score: {trend_data['average_score']}%")
            self.stdout.write(f"Poor scores: {trend_data['poor_score_count']} ({trend_data['poor_score_rate']}%)")
            self.stdout.write(f"On-time rate: {trend_data['on_time_rate']}%")
            self.stdout.write(f"Complete rate: {trend_data['complete_rate']}%")
            self.stdout.write(f"Professional rate: {trend_data['professional_rate']}%")
            self.stdout.write(f"Trend status: {trend_data['trend_status']}")
        else:
            self.stdout.write(trend_data['message'])

        # Check for declining trends
        declining_trend = FeedbackTrendAnalyzer.check_declining_trends(company)
        if declining_trend:
            self.stdout.write(self.style.WARNING('\n⚠️  DECLINING TREND DETECTED:'))
            self.stdout.write(f"Score decline: {declining_trend['score_decline']}%")
            self.stdout.write(f"Poor rate increase: {declining_trend['poor_rate_increase']}%")
        else:
            self.stdout.write(self.style.SUCCESS('\n✅ No concerning trends detected'))