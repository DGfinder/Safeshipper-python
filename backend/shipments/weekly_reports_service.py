# shipments/weekly_reports_service.py

from django.utils import timezone
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q, Avg, Count, Case, When, IntegerField, F, FloatField
from django.contrib.auth import get_user_model
from .models import ShipmentFeedback
from notifications.notification_preferences import FeedbackNotificationPreference
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional
import json

User = get_user_model()
logger = logging.getLogger(__name__)


class WeeklyFeedbackReportService:
    """
    Service for generating and sending weekly feedback performance reports.
    """
    
    def __init__(self):
        self.report_period_days = 7
        
    def generate_company_report(self, company, start_date: datetime, end_date: datetime) -> Dict:
        """
        Generate comprehensive weekly feedback report for a company.
        
        Args:
            company: Company instance
            start_date: Report period start date
            end_date: Report period end date
            
        Returns:
            Dict containing report data
        """
        try:
            # Get feedback data for the period
            feedback_queryset = ShipmentFeedback.objects.filter(
                shipment__carrier=company,
                submitted_at__gte=start_date,
                submitted_at__lt=end_date
            ).select_related(
                'shipment__customer',
                'shipment__assigned_driver',
                'responded_by'
            )
            
            # Overall statistics
            overall_stats = self._calculate_overall_stats(feedback_queryset)
            
            # Performance trends
            daily_trends = self._calculate_daily_trends(feedback_queryset, start_date, end_date)
            
            # Driver performance
            driver_performance = self._calculate_driver_performance(feedback_queryset)
            
            # Customer satisfaction by customer
            customer_breakdown = self._calculate_customer_breakdown(feedback_queryset)
            
            # Route performance
            route_performance = self._calculate_route_performance(feedback_queryset)
            
            # Manager response statistics
            response_stats = self._calculate_response_stats(feedback_queryset)
            
            # Incidents created from feedback
            incident_stats = self._calculate_incident_stats(feedback_queryset)
            
            # Performance categories breakdown
            performance_breakdown = self._calculate_performance_breakdown(feedback_queryset)
            
            # Previous period comparison
            previous_period_comparison = self._calculate_previous_period_comparison(
                company, start_date, end_date
            )
            
            report_data = {
                'company': {
                    'name': company.name,
                    'id': str(company.id)
                },
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'week_number': start_date.isocalendar()[1],
                    'year': start_date.year
                },
                'overall_stats': overall_stats,
                'daily_trends': daily_trends,
                'driver_performance': driver_performance,
                'customer_breakdown': customer_breakdown,
                'route_performance': route_performance,
                'response_stats': response_stats,
                'incident_stats': incident_stats,
                'performance_breakdown': performance_breakdown,
                'previous_period_comparison': previous_period_comparison,
                'generated_at': timezone.now().isoformat()
            }
            
            logger.info(f"Generated weekly report for {company.name} covering {start_date.date()} to {end_date.date()}")
            return report_data
            
        except Exception as e:
            logger.error(f"Error generating weekly report for {company.name}: {e}")
            return {}
    
    def _calculate_overall_stats(self, queryset) -> Dict:
        """Calculate overall statistics for the period."""
        total_feedback = queryset.count()
        
        if total_feedback == 0:
            return {
                'total_feedback_count': 0,
                'average_score': 0,
                'difot_rate': 0,
                'on_time_rate': 0,
                'complete_rate': 0,
                'professional_rate': 0
            }
        
        # Calculate averages and rates
        stats = queryset.aggregate(
            avg_score=Avg(
                Case(
                    When(was_on_time=True, was_complete_and_undamaged=True, was_driver_professional=True, then=100),
                    When(was_on_time=True, was_complete_and_undamaged=True, then=67),
                    When(was_on_time=True, was_driver_professional=True, then=67),
                    When(was_complete_and_undamaged=True, was_driver_professional=True, then=67),
                    When(was_on_time=True, then=33),
                    When(was_complete_and_undamaged=True, then=33),
                    When(was_driver_professional=True, then=33),
                    default=0,
                    output_field=FloatField()
                )
            ),
            on_time_count=Count(Case(When(was_on_time=True, then=1), output_field=IntegerField())),
            complete_count=Count(Case(When(was_complete_and_undamaged=True, then=1), output_field=IntegerField())),
            professional_count=Count(Case(When(was_driver_professional=True, then=1), output_field=IntegerField())),
            difot_count=Count(Case(
                When(was_on_time=True, was_complete_and_undamaged=True, then=1),
                output_field=IntegerField()
            ))
        )
        
        return {
            'total_feedback_count': total_feedback,
            'average_score': round(stats['avg_score'] or 0, 1),
            'difot_rate': round((stats['difot_count'] / total_feedback) * 100, 1),
            'on_time_rate': round((stats['on_time_count'] / total_feedback) * 100, 1),
            'complete_rate': round((stats['complete_count'] / total_feedback) * 100, 1),
            'professional_rate': round((stats['professional_count'] / total_feedback) * 100, 1)
        }
    
    def _calculate_daily_trends(self, queryset, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Calculate daily performance trends."""
        daily_data = []
        current_date = start_date.date()
        end_date_only = end_date.date()
        
        while current_date < end_date_only:
            day_feedback = queryset.filter(
                submitted_at__date=current_date
            )
            
            day_stats = self._calculate_overall_stats(day_feedback)
            day_stats['date'] = current_date.isoformat()
            day_stats['day_name'] = current_date.strftime('%A')
            
            daily_data.append(day_stats)
            current_date += timedelta(days=1)
        
        return daily_data
    
    def _calculate_driver_performance(self, queryset) -> List[Dict]:
        """Calculate performance statistics by driver."""
        driver_stats = queryset.values(
            'shipment__assigned_driver__id',
            'shipment__assigned_driver__first_name',
            'shipment__assigned_driver__last_name'
        ).annotate(
            feedback_count=Count('id'),
            avg_score=Avg(
                Case(
                    When(was_on_time=True, was_complete_and_undamaged=True, was_driver_professional=True, then=100),
                    When(was_on_time=True, was_complete_and_undamaged=True, then=67),
                    When(was_on_time=True, was_driver_professional=True, then=67),
                    When(was_complete_and_undamaged=True, was_driver_professional=True, then=67),
                    When(was_on_time=True, then=33),
                    When(was_complete_and_undamaged=True, then=33),
                    When(was_driver_professional=True, then=33),
                    default=0,
                    output_field=FloatField()
                )
            ),
            difot_rate=Avg(
                Case(
                    When(was_on_time=True, was_complete_and_undamaged=True, then=100),
                    default=0,
                    output_field=FloatField()
                )
            ),
            excellent_count=Count(Case(
                When(was_on_time=True, was_complete_and_undamaged=True, was_driver_professional=True, then=1),
                output_field=IntegerField()
            )),
            poor_count=Count(Case(
                When(was_on_time=False, was_complete_and_undamaged=False, then=1),
                When(was_on_time=False, was_driver_professional=False, then=1),
                When(was_complete_and_undamaged=False, was_driver_professional=False, then=1),
                output_field=IntegerField()
            ))
        ).filter(
            shipment__assigned_driver__isnull=False
        ).order_by('-avg_score')
        
        driver_performance = []
        for driver in driver_stats:
            if driver['feedback_count'] > 0:
                driver_performance.append({
                    'driver_id': driver['shipment__assigned_driver__id'],
                    'driver_name': f"{driver['shipment__assigned_driver__first_name']} {driver['shipment__assigned_driver__last_name']}".strip(),
                    'feedback_count': driver['feedback_count'],
                    'average_score': round(driver['avg_score'] or 0, 1),
                    'difot_rate': round(driver['difot_rate'] or 0, 1),
                    'excellent_count': driver['excellent_count'],
                    'poor_count': driver['poor_count'],
                    'performance_category': self._get_performance_category(driver['avg_score'] or 0)
                })
        
        return driver_performance
    
    def _calculate_customer_breakdown(self, queryset) -> List[Dict]:
        """Calculate satisfaction statistics by customer."""
        customer_stats = queryset.values(
            'shipment__customer__id',
            'shipment__customer__name'
        ).annotate(
            feedback_count=Count('id'),
            avg_score=Avg(
                Case(
                    When(was_on_time=True, was_complete_and_undamaged=True, was_driver_professional=True, then=100),
                    When(was_on_time=True, was_complete_and_undamaged=True, then=67),
                    When(was_on_time=True, was_driver_professional=True, then=67),
                    When(was_complete_and_undamaged=True, was_driver_professional=True, then=67),
                    When(was_on_time=True, then=33),
                    When(was_complete_and_undamaged=True, then=33),
                    When(was_driver_professional=True, then=33),
                    default=0,
                    output_field=FloatField()
                )
            )
        ).order_by('-avg_score')
        
        customer_breakdown = []
        for customer in customer_stats:
            if customer['feedback_count'] > 0:
                customer_breakdown.append({
                    'customer_id': customer['shipment__customer__id'],
                    'customer_name': customer['shipment__customer__name'],
                    'feedback_count': customer['feedback_count'],
                    'average_score': round(customer['avg_score'] or 0, 1),
                    'satisfaction_level': self._get_satisfaction_level(customer['avg_score'] or 0)
                })
        
        return customer_breakdown
    
    def _calculate_route_performance(self, queryset) -> List[Dict]:
        """Calculate performance by route (origin-destination pairs)."""
        route_stats = queryset.values(
            'shipment__origin_location',
            'shipment__destination_location'
        ).annotate(
            feedback_count=Count('id'),
            avg_score=Avg(
                Case(
                    When(was_on_time=True, was_complete_and_undamaged=True, was_driver_professional=True, then=100),
                    When(was_on_time=True, was_complete_and_undamaged=True, then=67),
                    When(was_on_time=True, was_driver_professional=True, then=67),
                    When(was_complete_and_undamaged=True, was_driver_professional=True, then=67),
                    When(was_on_time=True, then=33),
                    When(was_complete_and_undamaged=True, then=33),
                    When(was_driver_professional=True, then=33),
                    default=0,
                    output_field=FloatField()
                )
            ),
            on_time_rate=Avg(
                Case(When(was_on_time=True, then=100), default=0, output_field=FloatField())
            )
        ).filter(
            feedback_count__gte=2  # Only include routes with at least 2 feedback entries
        ).order_by('-avg_score')
        
        route_performance = []
        for route in route_stats:
            route_performance.append({
                'route': f"{route['shipment__origin_location']} → {route['shipment__destination_location']}",
                'origin': route['shipment__origin_location'],
                'destination': route['shipment__destination_location'],
                'feedback_count': route['feedback_count'],
                'average_score': round(route['avg_score'] or 0, 1),
                'on_time_rate': round(route['on_time_rate'] or 0, 1)
            })
        
        return route_performance
    
    def _calculate_response_stats(self, queryset) -> Dict:
        """Calculate manager response statistics."""
        total_feedback = queryset.count()
        responded_feedback = queryset.filter(manager_response__isnull=False).count()
        
        if total_feedback == 0:
            return {
                'total_feedback': 0,
                'responded_count': 0,
                'response_rate': 0,
                'avg_response_time_hours': 0
            }
        
        # Calculate average response time
        responded_queryset = queryset.filter(
            manager_response__isnull=False,
            responded_at__isnull=False
        )
        
        response_times = []
        for feedback in responded_queryset:
            if feedback.responded_at and feedback.submitted_at:
                time_diff = feedback.responded_at - feedback.submitted_at
                response_times.append(time_diff.total_seconds() / 3600)  # Convert to hours
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        return {
            'total_feedback': total_feedback,
            'responded_count': responded_feedback,
            'response_rate': round((responded_feedback / total_feedback) * 100, 1),
            'avg_response_time_hours': round(avg_response_time, 1)
        }
    
    def _calculate_incident_stats(self, queryset) -> Dict:
        """Calculate incident creation statistics."""
        total_feedback = queryset.count()
        poor_feedback = queryset.filter(
            Q(was_on_time=False) | Q(was_complete_and_undamaged=False) | Q(was_driver_professional=False)
        ).count()
        
        # Calculate feedback that would trigger incidents (< 67%)
        incident_threshold_feedback = 0
        for feedback in queryset:
            score = 0
            if feedback.was_on_time:
                score += 33.33
            if feedback.was_complete_and_undamaged:
                score += 33.33
            if feedback.was_driver_professional:
                score += 33.33
            
            if score < 67:
                incident_threshold_feedback += 1
        
        return {
            'total_feedback': total_feedback,
            'poor_feedback_count': poor_feedback,
            'incident_threshold_count': incident_threshold_feedback,
            'incident_rate': round((incident_threshold_feedback / total_feedback) * 100, 1) if total_feedback > 0 else 0
        }
    
    def _calculate_performance_breakdown(self, queryset) -> Dict:
        """Calculate breakdown by performance categories."""
        total_feedback = queryset.count()
        
        if total_feedback == 0:
            return {
                'excellent': {'count': 0, 'percentage': 0},
                'good': {'count': 0, 'percentage': 0},
                'needs_improvement': {'count': 0, 'percentage': 0},
                'poor': {'count': 0, 'percentage': 0}
            }
        
        categories = {'excellent': 0, 'good': 0, 'needs_improvement': 0, 'poor': 0}
        
        for feedback in queryset:
            score = 0
            if feedback.was_on_time:
                score += 33.33
            if feedback.was_complete_and_undamaged:
                score += 33.33
            if feedback.was_driver_professional:
                score += 33.33
            
            if score > 95:
                categories['excellent'] += 1
            elif score >= 85:
                categories['good'] += 1
            elif score >= 70:
                categories['needs_improvement'] += 1
            else:
                categories['poor'] += 1
        
        return {
            'excellent': {
                'count': categories['excellent'],
                'percentage': round((categories['excellent'] / total_feedback) * 100, 1)
            },
            'good': {
                'count': categories['good'],
                'percentage': round((categories['good'] / total_feedback) * 100, 1)
            },
            'needs_improvement': {
                'count': categories['needs_improvement'],
                'percentage': round((categories['needs_improvement'] / total_feedback) * 100, 1)
            },
            'poor': {
                'count': categories['poor'],
                'percentage': round((categories['poor'] / total_feedback) * 100, 1)
            }
        }
    
    def _calculate_previous_period_comparison(self, company, start_date: datetime, end_date: datetime) -> Dict:
        """Calculate comparison with previous period."""
        try:
            period_length = end_date - start_date
            previous_start = start_date - period_length
            previous_end = start_date
            
            previous_feedback = ShipmentFeedback.objects.filter(
                shipment__carrier=company,
                submitted_at__gte=previous_start,
                submitted_at__lt=previous_end
            )
            
            previous_stats = self._calculate_overall_stats(previous_feedback)
            
            # Calculate current period stats for comparison
            current_feedback = ShipmentFeedback.objects.filter(
                shipment__carrier=company,
                submitted_at__gte=start_date,
                submitted_at__lt=end_date
            )
            current_stats = self._calculate_overall_stats(current_feedback)
            
            return {
                'previous_period': previous_stats,
                'current_period': current_stats,
                'changes': {
                    'average_score': round(current_stats['average_score'] - previous_stats['average_score'], 1),
                    'difot_rate': round(current_stats['difot_rate'] - previous_stats['difot_rate'], 1),
                    'feedback_count': current_stats['total_feedback_count'] - previous_stats['total_feedback_count']
                },
                'period_info': {
                    'previous_start': previous_start.isoformat(),
                    'previous_end': previous_end.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating previous period comparison: {e}")
            return {}
    
    def _get_performance_category(self, score: float) -> str:
        """Get performance category for a score."""
        if score > 95:
            return "Excellent"
        elif score >= 85:
            return "Good"
        elif score >= 70:
            return "Needs Improvement"
        else:
            return "Poor"
    
    def _get_satisfaction_level(self, score: float) -> str:
        """Get customer satisfaction level for a score."""
        if score >= 90:
            return "Highly Satisfied"
        elif score >= 75:
            return "Satisfied"
        elif score >= 60:
            return "Neutral"
        else:
            return "Dissatisfied"
    
    def send_weekly_reports(self, target_companies: List = None):
        """
        Generate and send weekly reports to all companies (or specified companies).
        
        Args:
            target_companies: Optional list of company IDs to send reports to
        """
        try:
            # Calculate date range for the previous week
            today = timezone.now().date()
            start_of_week = today - timedelta(days=today.weekday() + 7)  # Previous Monday
            end_of_week = start_of_week + timedelta(days=7)  # Following Monday
            
            start_datetime = timezone.make_aware(
                datetime.combine(start_of_week, datetime.min.time())
            )
            end_datetime = timezone.make_aware(
                datetime.combine(end_of_week, datetime.min.time())
            )
            
            # Get companies to send reports to
            from companies.models import Company
            companies_query = Company.objects.filter(is_active=True)
            
            if target_companies:
                companies_query = companies_query.filter(id__in=target_companies)
            
            sent_count = 0
            failed_count = 0
            
            for company in companies_query:
                try:
                    # Generate report
                    report_data = self.generate_company_report(company, start_datetime, end_datetime)
                    
                    if not report_data or report_data.get('overall_stats', {}).get('total_feedback_count', 0) == 0:
                        logger.info(f"No feedback data for {company.name} in the report period - skipping report")
                        continue
                    
                    # Send report to users who want weekly reports
                    recipients = self._get_report_recipients(company)
                    
                    if recipients:
                        success = self._send_report_email(company, report_data, recipients)
                        if success:
                            sent_count += 1
                        else:
                            failed_count += 1
                    else:
                        logger.info(f"No report recipients configured for {company.name}")
                    
                    # Send ERP webhook for weekly report
                    try:
                        from erp_integration.feedback_webhook_service import send_weekly_report_webhook
                        send_weekly_report_webhook(company, report_data)
                    except Exception as e:
                        logger.error(f"Failed to send ERP webhook for weekly report: {e}")
                        
                except Exception as e:
                    logger.error(f"Error processing weekly report for {company.name}: {e}")
                    failed_count += 1
            
            logger.info(f"Weekly report generation completed: {sent_count} sent, {failed_count} failed")
            return {'sent_count': sent_count, 'failed_count': failed_count}
            
        except Exception as e:
            logger.error(f"Error in send_weekly_reports: {e}")
            return {'sent_count': 0, 'failed_count': 1}
    
    def _get_report_recipients(self, company) -> List[User]:
        """Get list of users who should receive weekly reports for a company."""
        try:
            # Get managers and admins who have weekly reports enabled
            users_with_preferences = User.objects.filter(
                company=company,
                role__in=['MANAGER', 'ADMIN'],
                is_active=True,
                feedback_notification_preferences__weekly_report_enabled=True
            ).select_related('feedback_notification_preferences')
            
            recipients = []
            for user in users_with_preferences:
                if user.email and 'email' in user.feedback_notification_preferences.weekly_report_methods:
                    recipients.append(user)
            
            return recipients
            
        except Exception as e:
            logger.error(f"Error getting report recipients for {company.name}: {e}")
            return []
    
    def _send_report_email(self, company, report_data: Dict, recipients: List[User]) -> bool:
        """Send weekly report email to recipients."""
        try:
            # Prepare email context
            context = {
                'company': company,
                'report': report_data,
                'period_text': f"Week of {report_data['period'].get('start_date', '').split('T')[0]}",
                'base_url': settings.FRONTEND_URL
            }
            
            # Render email templates
            try:
                subject = render_to_string('emails/weekly_feedback_report_subject.txt', context).strip()
                html_content = render_to_string('emails/weekly_feedback_report.html', context)
                text_content = render_to_string('emails/weekly_feedback_report.txt', context)
            except Exception as template_error:
                logger.warning(f"Email template not found, using fallback: {template_error}")
                
                # Fallback email content
                subject = f"SafeShipper Weekly Feedback Report - {company.name}"
                html_content = self._generate_fallback_html_report(report_data)
                text_content = self._generate_fallback_text_report(report_data)
            
            # Send email to all recipients
            recipient_emails = [user.email for user in recipients]
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=recipient_emails
            )
            email.attach_alternative(html_content, "text/html")
            
            email.send()
            
            logger.info(f"Weekly report sent to {len(recipient_emails)} recipients for {company.name}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending weekly report email for {company.name}: {e}")
            return False
    
    def _generate_fallback_html_report(self, report_data: Dict) -> str:
        """Generate fallback HTML report content."""
        overall = report_data.get('overall_stats', {})
        
        html = f"""
        <html>
        <body>
            <h1>Weekly Feedback Report</h1>
            <h2>{report_data.get('company', {}).get('name', 'Company')}</h2>
            <p><strong>Period:</strong> {report_data.get('period', {}).get('start_date', '').split('T')[0]} to {report_data.get('period', {}).get('end_date', '').split('T')[0]}</p>
            
            <h3>Overall Performance</h3>
            <ul>
                <li><strong>Total Feedback:</strong> {overall.get('total_feedback_count', 0)}</li>
                <li><strong>Average Score:</strong> {overall.get('average_score', 0)}%</li>
                <li><strong>DIFOT Rate:</strong> {overall.get('difot_rate', 0)}%</li>
                <li><strong>On-Time Rate:</strong> {overall.get('on_time_rate', 0)}%</li>
                <li><strong>Complete Rate:</strong> {overall.get('complete_rate', 0)}%</li>
                <li><strong>Professional Rate:</strong> {overall.get('professional_rate', 0)}%</li>
            </ul>
            
            <p>For detailed analytics and insights, please log in to the SafeShipper platform.</p>
            
            <p>Best regards,<br>SafeShipper Team</p>
        </body>
        </html>
        """
        return html
    
    def _generate_fallback_text_report(self, report_data: Dict) -> str:
        """Generate fallback text report content."""
        overall = report_data.get('overall_stats', {})
        
        text = f"""
Weekly Feedback Report
{report_data.get('company', {}).get('name', 'Company')}

Period: {report_data.get('period', {}).get('start_date', '').split('T')[0]} to {report_data.get('period', {}).get('end_date', '').split('T')[0]}

Overall Performance:
- Total Feedback: {overall.get('total_feedback_count', 0)}
- Average Score: {overall.get('average_score', 0)}%
- DIFOT Rate: {overall.get('difot_rate', 0)}%
- On-Time Rate: {overall.get('on_time_rate', 0)}%
- Complete Rate: {overall.get('complete_rate', 0)}%
- Professional Rate: {overall.get('professional_rate', 0)}%

For detailed analytics and insights, please log in to the SafeShipper platform.

Best regards,
SafeShipper Team
        """
        return text.strip()


def generate_weekly_reports():
    """Convenience function for Celery task."""
    service = WeeklyFeedbackReportService()
    return service.send_weekly_reports()