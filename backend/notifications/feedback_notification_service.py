# notifications/feedback_notification_service.py

from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.template.loader import render_to_string
from django.core.mail import send_mail
from .models import PushNotificationDevice, PushNotificationLog, NotificationTemplate
from .notification_preferences import FeedbackNotificationPreference, NotificationDigest
from .push_notification_service import ExpoPushNotificationService
import logging
from typing import List, Dict, Optional

User = get_user_model()
logger = logging.getLogger(__name__)


class FeedbackNotificationService:
    """
    Service for managing feedback-related notifications across multiple channels.
    Handles push notifications, emails, SMS, and digest notifications.
    """
    
    def __init__(self):
        self.expo_service = ExpoPushNotificationService()
    
    def notify_feedback_received(self, feedback):
        """
        Send notifications when new feedback is received.
        Notifies managers and admins of the carrier company.
        
        Args:
            feedback: ShipmentFeedback instance
        """
        try:
            # Get managers and admins for the carrier company
            carrier_managers = User.objects.filter(
                company=feedback.shipment.carrier,
                role__in=['MANAGER', 'ADMIN'],
                is_active=True
            ).select_related('feedback_notification_preferences')
            
            for manager in carrier_managers:
                self._send_feedback_notification(
                    user=manager,
                    notification_type='feedback_received',
                    feedback=feedback,
                    context={
                        'feedback': feedback,
                        'shipment': feedback.shipment,
                        'customer': feedback.shipment.customer,
                        'score': feedback.delivery_success_score,
                        'is_poor': feedback.requires_incident,
                        'manager_name': manager.get_full_name(),
                    }
                )
                
            logger.info(f"Sent feedback received notifications for feedback {feedback.id}")
            
        except Exception as e:
            logger.error(f"Error sending feedback received notifications: {e}")
    
    def notify_manager_response(self, feedback):
        """
        Send notifications when a manager responds to feedback.
        May notify the customer (if configured) and internal staff.
        
        Args:
            feedback: ShipmentFeedback instance with manager response
        """
        try:
            # Notify assigned driver if they exist
            if feedback.shipment.assigned_driver:
                self._send_feedback_notification(
                    user=feedback.shipment.assigned_driver,
                    notification_type='manager_response',
                    feedback=feedback,
                    context={
                        'feedback': feedback,
                        'shipment': feedback.shipment,
                        'manager_name': feedback.responded_by.get_full_name(),
                        'response': feedback.manager_response,
                        'driver_name': feedback.shipment.assigned_driver.get_full_name(),
                    }
                )
            
            # Note: Customer notifications for manager responses are typically
            # not sent as these are internal responses. This can be configured
            # based on business requirements.
            
            logger.info(f"Sent manager response notifications for feedback {feedback.id}")
            
        except Exception as e:
            logger.error(f"Error sending manager response notifications: {e}")
    
    def notify_incident_created(self, feedback, incident):
        """
        Send notifications when an incident is automatically created from poor feedback.
        
        Args:
            feedback: ShipmentFeedback instance
            incident: Incident instance that was created
        """
        try:
            # Notify carrier management team
            carrier_managers = User.objects.filter(
                company=feedback.shipment.carrier,
                role__in=['MANAGER', 'ADMIN'],
                is_active=True
            ).select_related('feedback_notification_preferences')
            
            for manager in carrier_managers:
                self._send_feedback_notification(
                    user=manager,
                    notification_type='incident_created',
                    feedback=feedback,
                    context={
                        'feedback': feedback,
                        'incident': incident,
                        'shipment': feedback.shipment,
                        'customer': feedback.shipment.customer,
                        'score': feedback.delivery_success_score,
                        'manager_name': manager.get_full_name(),
                        'incident_number': incident.incident_number,
                    },
                    is_emergency=True  # Poor feedback incidents are high priority
                )
            
            logger.info(f"Sent incident created notifications for incident {incident.incident_number}")
            
        except Exception as e:
            logger.error(f"Error sending incident created notifications: {e}")
    
    def notify_driver_feedback(self, feedback):
        """
        Send notifications to drivers about feedback on their deliveries.
        
        Args:
            feedback: ShipmentFeedback instance
        """
        try:
            if not feedback.shipment.assigned_driver:
                return
                
            driver = feedback.shipment.assigned_driver
            
            self._send_feedback_notification(
                user=driver,
                notification_type='driver_feedback',
                feedback=feedback,
                context={
                    'feedback': feedback,
                    'shipment': feedback.shipment,
                    'customer': feedback.shipment.customer,
                    'score': feedback.delivery_success_score,
                    'driver_name': driver.get_full_name(),
                    'is_positive': feedback.delivery_success_score >= 85,
                    'performance_category': feedback.performance_category,
                }
            )
            
            logger.info(f"Sent driver feedback notification to {driver.get_full_name()}")
            
        except Exception as e:
            logger.error(f"Error sending driver feedback notifications: {e}")
    
    def _send_feedback_notification(self, user: User, notification_type: str, feedback, context: Dict, is_emergency: bool = False):
        """
        Send a feedback notification to a specific user via their preferred methods.
        
        Args:
            user: User to notify
            notification_type: Type of notification
            feedback: ShipmentFeedback instance
            context: Template context data
            is_emergency: Whether this is an emergency notification
        """
        try:
            # Get or create user preferences
            preferences, created = FeedbackNotificationPreference.objects.get_or_create(
                user=user,
                defaults={}
            )
            
            # Check if user should receive this notification
            if not preferences.should_notify(
                notification_type=notification_type,
                feedback_score=feedback.delivery_success_score,
                is_emergency=is_emergency
            ):
                logger.debug(f"User {user.get_full_name()} opted out of {notification_type} notifications")
                return
            
            # Get preferred notification methods
            methods = preferences.get_notification_methods(notification_type)
            
            # Check for digest frequency (non-emergency only)
            if not is_emergency and preferences.feedback_received_frequency != 'immediate':
                self._add_to_digest(user, notification_type, feedback, context, preferences.feedback_received_frequency)
                return
            
            # Send immediate notifications
            for method in methods:
                if method == 'push':
                    self._send_push_notification(user, notification_type, feedback, context)
                elif method == 'email':
                    self._send_email_notification(user, notification_type, feedback, context)
                elif method == 'sms':
                    self._send_sms_notification(user, notification_type, feedback, context)
                elif method == 'in_app':
                    self._create_in_app_notification(user, notification_type, feedback, context)
            
        except Exception as e:
            logger.error(f"Error sending {notification_type} notification to {user.get_full_name()}: {e}")
    
    def _send_push_notification(self, user: User, notification_type: str, feedback, context: Dict):
        """Send push notification to user's devices."""
        try:
            # Get user's active devices
            devices = PushNotificationDevice.objects.filter(
                user=user,
                is_active=True
            )
            
            if not devices.exists():
                logger.debug(f"No active devices for user {user.get_full_name()}")
                return
            
            # Get notification template
            template = self._get_notification_template(notification_type)
            if not template:
                logger.warning(f"No template found for notification type: {notification_type}")
                return
            
            # Render notification content
            title = template.render_title(context)
            body = template.render_body(context)
            
            # Prepare notification data
            notification_data = {
                'type': notification_type,
                'feedback_id': str(feedback.id),
                'shipment_id': str(feedback.shipment.id),
                'tracking_number': feedback.shipment.tracking_number,
                'score': feedback.delivery_success_score,
                'url': f'/feedback/{feedback.id}',  # Deep link for mobile app
            }
            
            # Send to each device
            for device in devices:
                if device.should_receive_notification(f'{notification_type}_notifications'):
                    # Create log entry
                    log_entry = PushNotificationLog.objects.create(
                        device=device,
                        title=title,
                        body=body,
                        data=notification_data,
                        notification_type=notification_type,
                        related_object_id=str(feedback.id)
                    )
                    
                    # Send via Expo
                    success = self.expo_service.send_notification(
                        expo_token=device.expo_push_token,
                        title=title,
                        body=body,
                        data=notification_data
                    )
                    
                    if success:
                        log_entry.mark_sent()
                    else:
                        log_entry.mark_failed("Failed to send via Expo service")
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
    
    def _send_email_notification(self, user: User, notification_type: str, feedback, context: Dict):
        """Send email notification to user."""
        try:
            # Get email template
            template_name = f'notifications/email/{notification_type}.html'
            subject_template = f'notifications/email/{notification_type}_subject.txt'
            
            # Add user to context
            context['user'] = user
            context['base_url'] = settings.FRONTEND_URL
            
            # Render email content
            try:
                subject = render_to_string(subject_template, context).strip()
                html_content = render_to_string(template_name, context)
                
                # Send email
                send_mail(
                    subject=subject,
                    message='',  # Plain text version can be added if needed
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    html_message=html_content,
                    fail_silently=False
                )
                
                logger.info(f"Sent email notification to {user.email}")
                
            except Exception as template_error:
                logger.warning(f"Email template not found, using fallback for {notification_type}: {template_error}")
                
                # Fallback email content
                subject = f"SafeShipper: {notification_type.replace('_', ' ').title()}"
                message = f"""
                Dear {user.get_full_name()},
                
                You have a new notification regarding feedback for shipment {feedback.shipment.tracking_number}.
                
                Customer: {feedback.shipment.customer.name}
                Delivery Score: {feedback.delivery_success_score}%
                
                Please log in to the SafeShipper platform to view details.
                
                Best regards,
                SafeShipper Team
                """
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False
                )
            
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
    
    def _send_sms_notification(self, user: User, notification_type: str, feedback, context: Dict):
        """Send SMS notification to user via Twilio."""
        try:
            from .sms_service import TwilioSMSService
            
            # Check if user has a phone number
            phone_number = getattr(user, 'phone_number', None) or getattr(user, 'mobile_phone', None)
            if not phone_number:
                logger.debug(f"No phone number for user {user.get_full_name()}, skipping SMS")
                return
            
            sms_service = TwilioSMSService()
            
            if notification_type == 'feedback_received':
                result = sms_service.send_feedback_alert(
                    phone_number=phone_number,
                    feedback_type='critical_feedback' if feedback.delivery_success_score < 33 else 'poor_feedback',
                    tracking_number=feedback.shipment.tracking_number,
                    customer_name=feedback.shipment.customer.name,
                    score=feedback.delivery_success_score,
                    manager_name=user.get_full_name()
                )
            elif notification_type == 'incident_created':
                result = sms_service.send_feedback_alert(
                    phone_number=phone_number,
                    feedback_type='incident_created',
                    tracking_number=feedback.shipment.tracking_number,
                    customer_name=feedback.shipment.customer.name,
                    score=feedback.delivery_success_score,
                    manager_name=user.get_full_name()
                )
            elif notification_type == 'driver_feedback':
                result = sms_service.send_driver_feedback_alert(
                    phone_number=phone_number,
                    tracking_number=feedback.shipment.tracking_number,
                    customer_name=feedback.shipment.customer.name,
                    score=feedback.delivery_success_score,
                    is_positive=feedback.delivery_success_score >= 85
                )
            else:
                # Generic SMS notification
                message = f"SafeShipper Alert: {notification_type.replace('_', ' ').title()} for shipment {feedback.shipment.tracking_number}. Check the app for details."
                result = sms_service.send_sms(phone_number, message)
            
            if result.get('success'):
                logger.info(f"SMS sent successfully to {user.get_full_name()}: {result.get('message_sid')}")
            else:
                logger.error(f"Failed to send SMS to {user.get_full_name()}: {result.get('error')}")
            
        except Exception as e:
            logger.error(f"Error sending SMS notification: {e}")
    
    def _create_in_app_notification(self, user: User, notification_type: str, feedback, context: Dict):
        """Create in-app notification (placeholder)."""
        try:
            # This could integrate with a separate in-app notifications system
            logger.info(f"In-app notification for {notification_type} to {user.get_full_name()} (placeholder)")
            
        except Exception as e:
            logger.error(f"Error creating in-app notification: {e}")
    
    def _get_notification_template(self, notification_type: str) -> Optional[NotificationTemplate]:
        """Get notification template for the given type."""
        try:
            return NotificationTemplate.objects.filter(
                template_type=notification_type,
                is_active=True
            ).first()
        except Exception as e:
            logger.error(f"Error getting notification template: {e}")
            return None
    
    def _add_to_digest(self, user: User, notification_type: str, feedback, context: Dict, frequency: str):
        """Add notification to digest for batch sending."""
        try:
            # Generate period identifier based on frequency
            now = timezone.now()
            if frequency == 'hourly':
                period = now.strftime('%Y-%m-%d-%H')
            elif frequency == 'daily':
                period = now.strftime('%Y-%m-%d')
            elif frequency == 'weekly':
                # Use ISO week
                year, week, _ = now.isocalendar()
                period = f'{year}-W{week:02d}'
            else:
                logger.warning(f"Unknown digest frequency: {frequency}")
                return
            
            # Get or create digest
            digest, created = NotificationDigest.objects.get_or_create(
                user=user,
                digest_type=frequency,
                digest_period=period,
                defaults={'content': {'notifications': []}}
            )
            
            # Add notification to digest
            notification_data = {
                'type': notification_type,
                'feedback_id': str(feedback.id),
                'tracking_number': feedback.shipment.tracking_number,
                'customer_name': feedback.shipment.customer.name,
                'score': feedback.delivery_success_score,
                'timestamp': timezone.now().isoformat(),
                'context': context,
            }
            
            digest.content['notifications'].append(notification_data)
            digest.notification_count += 1
            digest.save()
            
            logger.debug(f"Added notification to {frequency} digest for {user.get_full_name()}")
            
        except Exception as e:
            logger.error(f"Error adding notification to digest: {e}")
    
    def send_pending_digests(self, digest_type: str):
        """
        Send pending digest notifications.
        This should be called by a scheduled task (Celery).
        
        Args:
            digest_type: Type of digest ('hourly', 'daily', 'weekly')
        """
        try:
            # Find unsent digests for the completed period
            now = timezone.now()
            
            if digest_type == 'hourly':
                # Send digests for the previous hour
                cutoff_time = now.replace(minute=0, second=0, microsecond=0)
                period_filter = (cutoff_time - timezone.timedelta(hours=1)).strftime('%Y-%m-%d-%H')
            elif digest_type == 'daily':
                # Send digests for the previous day
                cutoff_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
                period_filter = (cutoff_time - timezone.timedelta(days=1)).strftime('%Y-%m-%d')
            elif digest_type == 'weekly':
                # Send digests for the previous week
                year, week, _ = (now - timezone.timedelta(weeks=1)).isocalendar()
                period_filter = f'{year}-W{week:02d}'
            else:
                logger.error(f"Unknown digest type: {digest_type}")
                return
            
            # Get pending digests
            pending_digests = NotificationDigest.objects.filter(
                digest_type=digest_type,
                digest_period=period_filter,
                sent_at__isnull=True,
                notification_count__gt=0
            ).select_related('user')
            
            for digest in pending_digests:
                self._send_digest_email(digest)
                digest.sent_at = timezone.now()
                digest.save()
            
            logger.info(f"Sent {pending_digests.count()} {digest_type} digests")
            
        except Exception as e:
            logger.error(f"Error sending {digest_type} digests: {e}")
    
    def _send_digest_email(self, digest: NotificationDigest):
        """Send digest email to user."""
        try:
            template_name = f'notifications/email/digest_{digest.digest_type}.html'
            subject_template = f'notifications/email/digest_{digest.digest_type}_subject.txt'
            
            context = {
                'user': digest.user,
                'digest': digest,
                'notifications': digest.content.get('notifications', []),
                'count': digest.notification_count,
                'period': digest.digest_period,
                'base_url': settings.FRONTEND_URL,
            }
            
            try:
                subject = render_to_string(subject_template, context).strip()
                html_content = render_to_string(template_name, context)
                
                send_mail(
                    subject=subject,
                    message='',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[digest.user.email],
                    html_message=html_content,
                    fail_silently=False
                )
                
                logger.info(f"Sent {digest.digest_type} digest to {digest.user.email}")
                
            except Exception as template_error:
                logger.warning(f"Digest template not found, using fallback: {template_error}")
                
                # Fallback digest email
                subject = f"SafeShipper: {digest.digest_type.title()} Feedback Summary"
                notifications_text = "\n".join([
                    f"- {notif['tracking_number']}: {notif['score']}% from {notif['customer_name']}"
                    for notif in digest.content.get('notifications', [])
                ])
                
                message = f"""
                Dear {digest.user.get_full_name()},
                
                Here's your {digest.digest_type} feedback summary with {digest.notification_count} notifications:
                
                {notifications_text}
                
                Please log in to the SafeShipper platform for full details.
                
                Best regards,
                SafeShipper Team
                """
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[digest.user.email],
                    fail_silently=False
                )
            
        except Exception as e:
            logger.error(f"Error sending digest email: {e}")


# Convenience functions for use in feedback ViewSet and signals
def notify_feedback_received(feedback):
    """Send notifications when feedback is received."""
    service = FeedbackNotificationService()
    service.notify_feedback_received(feedback)


def notify_manager_response(feedback):
    """Send notifications when manager responds to feedback."""
    service = FeedbackNotificationService()
    service.notify_manager_response(feedback)


def notify_incident_created(feedback, incident):
    """Send notifications when incident is created from feedback."""
    service = FeedbackNotificationService()
    service.notify_incident_created(feedback, incident)


def notify_driver_feedback(feedback):
    """Send notifications to driver about feedback."""
    service = FeedbackNotificationService()
    service.notify_driver_feedback(feedback)