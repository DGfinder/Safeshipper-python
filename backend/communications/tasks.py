# communications/tasks.py
import logging
from typing import Dict, List, Optional, Any
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth import get_user_model
from .models import ShipmentEvent

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email(self, recipient_email: str, subject: str, message: str, html_message: Optional[str] = None):
    """
    Send email notification task using enhanced email service.
    Supports both plain text and HTML emails with production features.
    """
    try:
        from communications.email_service import email_service
        
        logger.info(f"Sending email to {recipient_email} with subject: {subject}")
        
        # Use the enhanced email service
        result = email_service.send_email(
            recipient=recipient_email,
            subject=subject,
            message=message,
            html_message=html_message
        )
        
        if result['status'] == 'success':
            logger.info(f"Email sent successfully to {recipient_email}")
            return result
        else:
            # Raise exception to trigger retry for transient errors
            error_type = result.get('error_type', 'unknown_error')
            if error_type == 'validation_error':
                # Don't retry validation errors
                logger.error(f"Email validation error for {recipient_email}: {result['error']}")
                return result
            
            # Retry for other errors
            raise Exception(result['error'])
        
    except Exception as exc:
        logger.error(f"Failed to send email to {recipient_email}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying email send to {recipient_email} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for email to {recipient_email}")
            return {'status': 'failed', 'recipient': recipient_email, 'error': str(exc)}


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_sms(self, phone_number: str, message: str):
    """
    Send SMS notification task via Twilio.
    Now includes real Twilio integration.
    """
    try:
        from communications.sms_service import sms_service
        
        logger.info(f"Sending SMS to {phone_number}")
        
        # Use the SMS service which handles Twilio integration
        result = sms_service.send_sms(phone_number, message)
        
        if result['status'] == 'success':
            logger.info(f"SMS sent successfully to {phone_number}")
            return result
        else:
            # If it's a validation error or other non-retriable error, don't retry
            if result.get('error_type') == 'validation_error':
                logger.error(f"SMS validation error for {phone_number}: {result['error']}")
                return result
            
            # For other errors, raise exception to trigger retry
            raise Exception(result['error'])
        
    except Exception as exc:
        logger.error(f"Failed to send SMS to {phone_number}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying SMS send to {phone_number} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for SMS to {phone_number}")
            return {'status': 'failed', 'recipient': phone_number, 'error': str(exc)}


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_notification(self, device_token: str, title: str, body: str, data: Optional[Dict] = None):
    """
    Send push notification task.
    TODO: Integrate with push notification service (FCM, APNS, etc.)
    """
    try:
        from communications.sms_service import push_notification_service
        
        logger.info(f"Sending push notification to device: {device_token[:10]}...")
        
        # Use the push notification service which handles FCM integration
        result = push_notification_service.send_push_notification(
            device_token=device_token,
            title=title,
            body=body,
            data=data
        )
        
        if result['status'] == 'success':
            logger.info(f"Push notification sent successfully to {device_token[:10]}...")
            return result
        else:
            # Raise exception to trigger retry
            raise Exception(result['error'])
        
    except Exception as exc:
        logger.error(f"Failed to send push notification to {device_token}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying push notification (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for push notification to {device_token}")
            return {'status': 'failed', 'device_token': device_token, 'error': str(exc)}


@shared_task
def send_shipment_event_notifications(event_id: str):
    """
    Send notifications for a shipment event to relevant users.
    This task is triggered when a new shipment event is created.
    """
    try:
        event = ShipmentEvent.objects.select_related(
            'user', 'shipment'
        ).prefetch_related(
            'mentions__mentioned_user'
        ).get(id=event_id)
        
        logger.info(f"Processing notifications for event {event_id}")
        
        # Get users to notify based on event type and shipment
        users_to_notify = _get_users_to_notify_for_event(event)
        
        # Send notifications to each user
        for user in users_to_notify:
            _send_event_notification_to_user(event, user)
        
        logger.info(f"Sent notifications for event {event_id} to {len(users_to_notify)} users")
        
    except ShipmentEvent.DoesNotExist:
        logger.error(f"ShipmentEvent {event_id} not found")
    except Exception as exc:
        logger.error(f"Failed to process notifications for event {event_id}: {str(exc)}")


@shared_task
def send_bulk_notifications(notification_data: List[Dict[str, Any]]):
    """
    Send bulk notifications efficiently.
    Each notification_data item should contain:
    - type: 'email', 'sms', 'push'
    - recipient: email/phone/device_token
    - content: notification content
    """
    results = []
    
    for notification in notification_data:
        try:
            notification_type = notification.get('type')
            recipient = notification.get('recipient')
            
            if notification_type == 'email':
                result = send_email.delay(
                    recipient_email=recipient,
                    subject=notification.get('subject', 'SafeShipper Notification'),
                    message=notification.get('message', ''),
                    html_message=notification.get('html_message')
                )
            elif notification_type == 'sms':
                result = send_sms.delay(
                    phone_number=recipient,
                    message=notification.get('message', '')
                )
            elif notification_type == 'push':
                result = send_push_notification.delay(
                    device_token=recipient,
                    title=notification.get('title', 'SafeShipper'),
                    body=notification.get('body', ''),
                    data=notification.get('data')
                )
            else:
                logger.error(f"Unknown notification type: {notification_type}")
                continue
                
            results.append({
                'type': notification_type,
                'recipient': recipient,
                'task_id': result.id,
                'status': 'queued'
            })
            
        except Exception as exc:
            logger.error(f"Failed to queue notification: {str(exc)}")
            results.append({
                'type': notification.get('type', 'unknown'),
                'recipient': notification.get('recipient', 'unknown'),
                'status': 'failed',
                'error': str(exc)
            })
    
    return results


@shared_task
def send_emergency_alert(shipment_id: str, alert_type: str, message: str, severity: str = 'HIGH'):
    """
    Send emergency alert for a shipment to all relevant stakeholders.
    This is a high-priority task that bypasses normal notification preferences.
    """
    try:
        from shipments.models import Shipment
        
        shipment = Shipment.objects.select_related(
            'assigned_driver', 'company'
        ).get(id=shipment_id)
        
        logger.critical(f"Processing emergency alert for shipment {shipment_id}: {alert_type}")
        
        # Get all stakeholders for emergency notifications
        emergency_contacts = _get_emergency_contacts_for_shipment(shipment)
        
        # Create high-priority event
        event = ShipmentEvent.objects.create(
            shipment=shipment,
            user=shipment.assigned_driver or shipment.company.primary_contact,
            event_type='ALERT',
            title=f'EMERGENCY: {alert_type}',
            details=message,
            priority='URGENT',
            is_automated=True
        )
        
        # Send immediate notifications via all channels
        for contact in emergency_contacts:
            # Send email
            if contact.get('email'):
                send_email.apply_async(
                    args=[
                        contact['email'],
                        f'EMERGENCY ALERT - {alert_type}',
                        f'Emergency alert for shipment {shipment.tracking_number}:\n\n{message}',
                        _render_emergency_email_template(shipment, alert_type, message)
                    ],
                    priority=9  # Highest priority
                )
            
            # Send SMS
            if contact.get('phone'):
                send_sms.apply_async(
                    args=[
                        contact['phone'],
                        f'EMERGENCY: {alert_type} - Shipment {shipment.tracking_number}. {message}'
                    ],
                    priority=9
                )
            
            # Send push notification
            if contact.get('device_token'):
                send_push_notification.apply_async(
                    args=[
                        contact['device_token'],
                        f'EMERGENCY: {alert_type}',
                        message,
                        {
                            'shipment_id': str(shipment_id),
                            'alert_type': alert_type,
                            'severity': severity,
                            'event_id': str(event.id)
                        }
                    ],
                    priority=9
                )
        
        logger.critical(f"Emergency alert sent to {len(emergency_contacts)} contacts for shipment {shipment_id}")
        
        return {
            'status': 'success',
            'shipment_id': shipment_id,
            'alert_type': alert_type,
            'contacts_notified': len(emergency_contacts),
            'event_id': str(event.id)
        }
        
    except Exception as exc:
        logger.critical(f"Failed to send emergency alert for shipment {shipment_id}: {str(exc)}")
        return {
            'status': 'failed',
            'shipment_id': shipment_id,
            'error': str(exc)
        }


def _get_users_to_notify_for_event(event: ShipmentEvent) -> List[User]:
    """Get users who should be notified about a shipment event."""
    users = set()
    
    # Always notify mentioned users
    for mention in event.mentions.all():
        users.add(mention.mentioned_user)
    
    # Notify based on event type
    if event.event_type in ['STATUS_CHANGE', 'DELIVERY_UPDATE']:
        # Notify customer contact
        if hasattr(event.shipment, 'customer_contact'):
            users.add(event.shipment.customer_contact)
        
        # Notify assigned driver
        if event.shipment.assigned_driver:
            users.add(event.shipment.assigned_driver)
    
    elif event.event_type == 'ALERT':
        # Notify all stakeholders for alerts
        if event.shipment.assigned_driver:
            users.add(event.shipment.assigned_driver)
        if hasattr(event.shipment, 'company'):
            users.add(event.shipment.company.primary_contact)
    
    # Remove the event creator to avoid self-notification
    users.discard(event.user)
    
    return list(users)


def _send_event_notification_to_user(event: ShipmentEvent, user: User):
    """Send notification about an event to a specific user."""
    try:
        # Check user notification preferences
        # TODO: Implement user notification preferences model
        
        # For now, send email notifications
        if user.email:
            subject = f"SafeShipper: {event.get_event_type_display()} - {event.shipment.tracking_number}"
            message = f"""
            New {event.get_event_type_display().lower()} for shipment {event.shipment.tracking_number}:
            
            {event.details}
            
            Event created by: {event.user_display_name}
            Time: {event.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
            Priority: {event.get_priority_display()}
            """
            
            send_email.delay(
                recipient_email=user.email,
                subject=subject,
                message=message.strip()
            )
    
    except Exception as exc:
        logger.error(f"Failed to send notification to user {user.id}: {str(exc)}")


def _get_emergency_contacts_for_shipment(shipment) -> List[Dict[str, str]]:
    """Get emergency contacts for a shipment."""
    contacts = []
    
    # Add assigned driver
    if shipment.assigned_driver:
        contacts.append({
            'name': shipment.assigned_driver.get_full_name(),
            'email': shipment.assigned_driver.email,
            'phone': getattr(shipment.assigned_driver, 'phone_number', None),
            'role': 'Driver'
        })
    
    # Add company contact
    if hasattr(shipment, 'company') and shipment.company.primary_contact:
        contacts.append({
            'name': shipment.company.primary_contact.get_full_name(),
            'email': shipment.company.primary_contact.email,
            'phone': getattr(shipment.company.primary_contact, 'phone_number', None),
            'role': 'Company Contact'
        })
    
    # TODO: Add customer contacts, emergency services, etc.
    
    return contacts


def _render_emergency_email_template(shipment, alert_type: str, message: str) -> str:
    """Render HTML email template for emergency alerts."""
    try:
        return render_to_string('communications/emails/emergency_alert.html', {
            'shipment': shipment,
            'alert_type': alert_type,
            'message': message,
            'timestamp': shipment.created_at
        })
    except Exception:
        # Fallback to plain text if template rendering fails
        return f"""
        <html>
        <body>
            <h2 style="color: red;">EMERGENCY ALERT: {alert_type}</h2>
            <p><strong>Shipment:</strong> {shipment.tracking_number}</p>
            <p><strong>Message:</strong> {message}</p>
            <p><strong>Time:</strong> {shipment.created_at}</p>
        </body>
        </html>
        """


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def send_welcome_email(self, user_id: int):
    """Send welcome email to new user"""
    try:
        from communications.email_service import email_service
        
        user = User.objects.get(id=user_id)
        result = email_service.send_welcome_email(user)
        
        logger.info(f"Welcome email sent to {user.email}: {result['status']}")
        return result
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for welcome email")
        return {'status': 'failed', 'error': 'User not found'}
    except Exception as exc:
        logger.error(f"Failed to send welcome email to user {user_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        return {'status': 'failed', 'error': str(exc)}


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def send_password_reset_email(self, user_id: int, reset_token: str):
    """Send password reset email"""
    try:
        from communications.email_service import email_service
        
        user = User.objects.get(id=user_id)
        result = email_service.send_password_reset_email(user, reset_token)
        
        logger.info(f"Password reset email sent to {user.email}: {result['status']}")
        return result
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for password reset email")
        return {'status': 'failed', 'error': 'User not found'}
    except Exception as exc:
        logger.error(f"Failed to send password reset email to user {user_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        return {'status': 'failed', 'error': str(exc)}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_bulk_email_task(self, recipients: List[str], subject: str, message: str, html_message: Optional[str] = None):
    """Send bulk email with batching"""
    try:
        from communications.email_service import email_service
        
        logger.info(f"Sending bulk email to {len(recipients)} recipients")
        
        result = email_service.send_bulk_email(
            recipients=recipients,
            subject=subject,
            message=message,
            html_message=html_message
        )
        
        logger.info(f"Bulk email completed: {result['success_count']} success, {result['failed_count']} failed")
        return result
        
    except Exception as exc:
        logger.error(f"Failed to send bulk email: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        return {'status': 'failed', 'error': str(exc), 'total_recipients': len(recipients)}