# shipments/feedback_alert_service.py
"""
Manager Alert Service for Poor Customer Feedback Scores.
Automatically notifies managers when feedback scores fall below acceptable thresholds.
"""

import logging
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import timedelta

from .models import Shipment, ShipmentFeedback
from communications.models import ShipmentEvent, NotificationQueue
from users.models import User
from companies.models import Company

logger = logging.getLogger(__name__)


class FeedbackAlertService:
    """Service for managing feedback-based alerts and notifications."""
    
    # Alert thresholds
    POOR_SCORE_THRESHOLD = 70.0  # Scores below this trigger alerts
    CRITICAL_SCORE_THRESHOLD = 50.0  # Scores below this trigger urgent alerts
    
    @staticmethod
    def should_trigger_alert(feedback: ShipmentFeedback) -> bool:
        """
        Determine if an alert should be triggered for this feedback.
        
        Args:
            feedback: The ShipmentFeedback instance
            
        Returns:
            bool: True if alert should be sent, False otherwise
        """
        score = feedback.delivery_success_score
        return score < FeedbackAlertService.POOR_SCORE_THRESHOLD
    
    @staticmethod
    def get_alert_priority(feedback: ShipmentFeedback) -> str:
        """
        Determine the alert priority based on feedback score.
        
        Args:
            feedback: The ShipmentFeedback instance
            
        Returns:
            str: Priority level ('HIGH', 'URGENT')
        """
        score = feedback.delivery_success_score
        if score < FeedbackAlertService.CRITICAL_SCORE_THRESHOLD:
            return 'URGENT'
        else:
            return 'HIGH'
    
    @staticmethod
    def get_company_managers(company: Company) -> List[User]:
        """
        Get all managers and admins for a company who should receive alerts.
        
        Args:
            company: The Company instance
            
        Returns:
            List[User]: Users with manager or admin roles
        """
        # Get users with manager or admin roles for this company
        manager_roles = ['MANAGER', 'ADMIN', 'DISPATCHER', 'COMPLIANCE_OFFICER']
        
        managers = User.objects.filter(
            company=company,
            role__in=manager_roles,
            is_active=True
        ).select_related('company')
        
        return list(managers)
    
    @staticmethod
    def create_feedback_alert_event(feedback: ShipmentFeedback, created_by: Optional[User] = None) -> ShipmentEvent:
        """
        Create a shipment event for the poor feedback alert.
        
        Args:
            feedback: The ShipmentFeedback instance
            created_by: User creating the event (defaults to shipment carrier's first admin)
            
        Returns:
            ShipmentEvent: The created event
        """
        if not created_by:
            # Use the first admin/manager from the carrier company as the event creator
            created_by = User.objects.filter(
                company=feedback.shipment.carrier,
                role__in=['ADMIN', 'MANAGER'],
                is_active=True
            ).first()
            
            if not created_by:
                # Fallback to shipment's requested_by user
                created_by = feedback.shipment.requested_by
        
        score = feedback.delivery_success_score
        priority = FeedbackAlertService.get_alert_priority(feedback)
        
        # Create detailed event description
        issues = []
        if not feedback.was_on_time:
            issues.append("delivery was not on time")
        if not feedback.was_complete_and_undamaged:
            issues.append("shipment was incomplete or damaged")
        if not feedback.was_driver_professional:
            issues.append("driver was unprofessional")
        
        issue_description = ", ".join(issues) if issues else "multiple service issues"
        
        title = f"Poor Customer Feedback Alert - {score:.0f}% Score"
        details = f"""Customer feedback received for shipment {feedback.shipment.tracking_number} indicates service issues.

Delivery Success Score: {score:.1f}%
Issues Reported: {issue_description.title()}

Customer Response Summary:
• On-time delivery: {'✓ Yes' if feedback.was_on_time else '✗ No'}
• Complete and undamaged: {'✓ Yes' if feedback.was_complete_and_undamaged else '✗ No'}
• Driver professional: {'✓ Yes' if feedback.was_driver_professional else '✗ No'}

{f'Customer Comments: "{feedback.feedback_notes}"' if feedback.feedback_notes else 'No additional comments provided.'}

Submitted: {feedback.submitted_at.strftime('%B %d, %Y at %I:%M %p')}

This alert was generated automatically because the feedback score fell below the {FeedbackAlertService.POOR_SCORE_THRESHOLD}% threshold. Please review this shipment and take appropriate corrective actions."""
        
        # Create the shipment event
        event = ShipmentEvent.objects.create(
            shipment=feedback.shipment,
            user=created_by,
            event_type='ALERT',
            title=title,
            details=details,
            priority=priority,
            is_automated=True,
            is_internal=True
        )
        
        logger.info(f"Created feedback alert event {event.id} for shipment {feedback.shipment.tracking_number} with score {score:.1f}%")
        
        return event
    
    @staticmethod
    def send_manager_alert_emails(feedback: ShipmentFeedback, managers: List[User]) -> Dict[str, Any]:
        """
        Send email alerts to managers about poor feedback scores.
        
        Args:
            feedback: The ShipmentFeedback instance
            managers: List of managers to notify
            
        Returns:
            Dict: Results of email sending operation
        """
        results = {
            'emails_sent': 0,
            'emails_failed': 0,
            'failed_recipients': []
        }
        
        score = feedback.delivery_success_score
        priority = FeedbackAlertService.get_alert_priority(feedback)
        
        # Build email context
        context = {
            'feedback': feedback,
            'shipment': feedback.shipment,
            'score': score,
            'priority': priority,
            'tracking_number': feedback.shipment.tracking_number,
            'customer_company': feedback.shipment.customer.name,
            'carrier_company': feedback.shipment.carrier.name,
            'submission_time': feedback.submitted_at,
            'current_year': timezone.now().year,
            'threshold': FeedbackAlertService.POOR_SCORE_THRESHOLD,
            'is_critical': score < FeedbackAlertService.CRITICAL_SCORE_THRESHOLD,
            'dashboard_url': getattr(settings, 'FRONTEND_BASE_URL', 'https://app.safeshipper.com') + '/dashboard',
            'shipment_url': f"{getattr(settings, 'FRONTEND_BASE_URL', 'https://app.safeshipper.com')}/shipments/{feedback.shipment.id}",
        }
        
        # Determine email subject based on priority
        if priority == 'URGENT':
            subject = f"🚨 URGENT: Critical Customer Feedback Alert - {score:.0f}% Score for {feedback.shipment.tracking_number}"
        else:
            subject = f"⚠️ Poor Customer Feedback Alert - {score:.0f}% Score for {feedback.shipment.tracking_number}"
        
        for manager in managers:
            try:
                # Add manager-specific context
                manager_context = {
                    **context,
                    'manager': manager,
                    'manager_name': manager.get_full_name() or manager.username,
                }
                
                # Render email templates
                html_content = render_to_string('emails/feedback_alert.html', manager_context)
                text_content = render_to_string('emails/feedback_alert.txt', manager_context)
                
                # Create email
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'alerts@safeshipper.com'),
                    to=[manager.email],
                    headers={
                        'X-SafeShipper-Type': 'feedback-alert',
                        'X-SafeShipper-Priority': priority,
                        'X-SafeShipper-Tracking': feedback.shipment.tracking_number,
                        'X-SafeShipper-Score': str(score),
                    }
                )
                
                # Attach HTML version
                email.attach_alternative(html_content, "text/html")
                
                # Send email
                email.send()
                
                results['emails_sent'] += 1
                logger.info(f"Sent feedback alert email to manager {manager.email} for shipment {feedback.shipment.tracking_number}")
                
            except Exception as e:
                results['emails_failed'] += 1
                results['failed_recipients'].append({
                    'email': manager.email,
                    'error': str(e)
                })
                logger.error(f"Failed to send feedback alert email to {manager.email}: {str(e)}")
        
        return results
    
    @staticmethod
    def queue_notification_alerts(feedback: ShipmentFeedback, managers: List[User]) -> int:
        """
        Queue in-app notification alerts for managers.
        
        Args:
            feedback: The ShipmentFeedback instance
            managers: List of managers to notify
            
        Returns:
            int: Number of notifications queued
        """
        score = feedback.delivery_success_score
        priority = 1 if score < FeedbackAlertService.CRITICAL_SCORE_THRESHOLD else 3  # 1=highest priority
        
        notification_count = 0
        
        for manager in managers:
            try:
                # Create notification message
                if score < FeedbackAlertService.CRITICAL_SCORE_THRESHOLD:
                    message = f"🚨 CRITICAL: Customer feedback score of {score:.0f}% for shipment {feedback.shipment.tracking_number} requires immediate attention."
                else:
                    message = f"⚠️ Poor customer feedback score of {score:.0f}% received for shipment {feedback.shipment.tracking_number}. Please review."
                
                # Queue notification
                NotificationQueue.objects.create(
                    user=manager,
                    notification_type='SHIPMENT_UPDATE',
                    delivery_method='IN_APP',
                    subject=f"Feedback Alert - {feedback.shipment.tracking_number}",
                    message=message,
                    metadata={
                        'shipment_id': str(feedback.shipment.id),
                        'tracking_number': feedback.shipment.tracking_number,
                        'feedback_score': score,
                        'alert_type': 'poor_feedback',
                        'priority': 'URGENT' if score < FeedbackAlertService.CRITICAL_SCORE_THRESHOLD else 'HIGH'
                    },
                    recipient_address=manager.email,
                    priority=priority,
                    scheduled_at=timezone.now()
                )
                
                notification_count += 1
                logger.info(f"Queued feedback alert notification for manager {manager.email}")
                
            except Exception as e:
                logger.error(f"Failed to queue notification for manager {manager.email}: {str(e)}")
        
        return notification_count
    
    @classmethod
    def process_feedback_alert(cls, feedback: ShipmentFeedback) -> Dict[str, Any]:
        """
        Main method to process a feedback alert.
        Creates events, sends emails, and queues notifications.
        
        Args:
            feedback: The ShipmentFeedback instance
            
        Returns:
            Dict: Results of the alert processing
        """
        if not cls.should_trigger_alert(feedback):
            return {
                'alert_triggered': False,
                'reason': f'Score {feedback.delivery_success_score:.1f}% is above threshold of {cls.POOR_SCORE_THRESHOLD}%'
            }
        
        try:
            # Get managers to notify
            managers = cls.get_company_managers(feedback.shipment.carrier)
            if not managers:
                logger.warning(f"No managers found for company {feedback.shipment.carrier.name} to receive feedback alert")
                return {
                    'alert_triggered': False,
                    'reason': 'No managers found to notify'
                }
            
            # Create shipment event
            event = cls.create_feedback_alert_event(feedback)
            
            # Send email alerts
            email_results = cls.send_manager_alert_emails(feedback, managers)
            
            # Queue in-app notifications
            notifications_queued = cls.queue_notification_alerts(feedback, managers)
            
            results = {
                'alert_triggered': True,
                'feedback_score': feedback.delivery_success_score,
                'priority': cls.get_alert_priority(feedback),
                'managers_notified': len(managers),
                'event_created': event.id,
                'email_results': email_results,
                'notifications_queued': notifications_queued,
                'shipment_tracking': feedback.shipment.tracking_number
            }
            
            logger.info(f"Successfully processed feedback alert for shipment {feedback.shipment.tracking_number}: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Failed to process feedback alert for shipment {feedback.shipment.tracking_number}: {str(e)}")
            return {
                'alert_triggered': False,
                'reason': f'Processing failed: {str(e)}'
            }


class FeedbackTrendAnalyzer:
    """Analyze feedback trends and trigger alerts for declining performance."""
    
    @staticmethod
    def get_recent_feedback_trend(company: Company, days: int = 7) -> Dict[str, Any]:
        """
        Analyze recent feedback trends for a company.
        
        Args:
            company: The Company instance
            days: Number of days to analyze (default: 7)
            
        Returns:
            Dict: Trend analysis results
        """
        since_date = timezone.now() - timedelta(days=days)
        
        # Get recent feedback for company's shipments
        recent_feedback = ShipmentFeedback.objects.filter(
            shipment__carrier=company,
            submitted_at__gte=since_date
        ).select_related('shipment')
        
        if not recent_feedback.exists():
            return {
                'has_data': False,
                'period_days': days,
                'message': 'No recent feedback data available'
            }
        
        # Calculate trend metrics
        total_count = recent_feedback.count()
        scores = [fb.delivery_success_score for fb in recent_feedback]
        average_score = sum(scores) / len(scores)
        
        poor_scores_count = sum(1 for score in scores if score < FeedbackAlertService.POOR_SCORE_THRESHOLD)
        poor_score_rate = (poor_scores_count / total_count) * 100
        
        # Calculate individual metrics
        on_time_rate = (recent_feedback.filter(was_on_time=True).count() / total_count) * 100
        complete_rate = (recent_feedback.filter(was_complete_and_undamaged=True).count() / total_count) * 100
        professional_rate = (recent_feedback.filter(was_driver_professional=True).count() / total_count) * 100
        
        return {
            'has_data': True,
            'period_days': days,
            'total_feedback_count': total_count,
            'average_score': round(average_score, 1),
            'poor_score_count': poor_scores_count,
            'poor_score_rate': round(poor_score_rate, 1),
            'on_time_rate': round(on_time_rate, 1),
            'complete_rate': round(complete_rate, 1),
            'professional_rate': round(professional_rate, 1),
            'trend_status': cls._determine_trend_status(average_score, poor_score_rate)
        }
    
    @staticmethod
    def _determine_trend_status(average_score: float, poor_score_rate: float) -> str:
        """Determine the overall trend status based on metrics."""
        if average_score >= 90 and poor_score_rate <= 5:
            return 'EXCELLENT'
        elif average_score >= 80 and poor_score_rate <= 15:
            return 'GOOD'
        elif average_score >= 70 and poor_score_rate <= 25:
            return 'FAIR'
        elif average_score >= 60 and poor_score_rate <= 40:
            return 'POOR'
        else:
            return 'CRITICAL'
    
    @classmethod
    def check_declining_trends(cls, company: Company) -> Optional[Dict[str, Any]]:
        """
        Check if company has declining feedback trends that warrant attention.
        
        Args:
            company: The Company instance
            
        Returns:
            Dict or None: Alert information if trends are concerning, None otherwise
        """
        current_week = cls.get_recent_feedback_trend(company, days=7)
        previous_week = cls.get_recent_feedback_trend(company, days=14)  # Last 2 weeks
        
        if not (current_week['has_data'] and previous_week['has_data']):
            return None
        
        # Compare trends
        score_decline = previous_week['average_score'] - current_week['average_score']
        poor_rate_increase = current_week['poor_score_rate'] - previous_week['poor_score_rate']
        
        # Trigger alert if significant decline
        if score_decline >= 10 or poor_rate_increase >= 20:
            return {
                'alert_type': 'declining_trend',
                'current_week': current_week,
                'previous_week': previous_week,
                'score_decline': round(score_decline, 1),
                'poor_rate_increase': round(poor_rate_increase, 1),
                'requires_attention': True
            }
        
        return None