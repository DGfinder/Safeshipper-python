# communications/signals.py
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import ShipmentEvent, EventMention
from .tasks import send_shipment_event_notifications, send_emergency_alert

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=ShipmentEvent)
def handle_shipment_event_created(sender, instance, created, **kwargs):
    """
    Handle new shipment events by triggering appropriate notifications.
    """
    if not created:
        return
    
    try:
        logger.info(f"New shipment event created: {instance.id} - {instance.event_type}")
        
        # Skip notifications for some internal events
        if instance.is_internal and instance.event_type in ['LOCATION_UPDATE']:
            logger.debug(f"Skipping notifications for internal event: {instance.id}")
            return
        
        # Handle emergency alerts with high priority
        if instance.event_type == 'ALERT' and instance.priority in ['URGENT', 'HIGH']:
            logger.warning(f"Processing emergency alert: {instance.id}")
            send_emergency_alert.apply_async(
                args=[
                    str(instance.shipment.id),
                    instance.title or 'General Alert',
                    instance.details,
                    instance.priority
                ],
                priority=9  # Highest priority
            )
        else:
            # Send regular event notifications
            send_shipment_event_notifications.delay(str(instance.id))
        
    except Exception as exc:
        logger.error(f"Failed to process notifications for event {instance.id}: {str(exc)}")


@receiver(post_save, sender=EventMention)
def handle_event_mention_created(sender, instance, created, **kwargs):
    """
    Handle new event mentions by sending targeted notifications.
    """
    if not created:
        return
    
    try:
        logger.info(f"New mention created for user {instance.mentioned_user.id} in event {instance.event.id}")
        
        # Send immediate notification to mentioned user
        from .tasks import send_email, send_push_notification
        
        user = instance.mentioned_user
        event = instance.event
        
        # Send email notification
        if user.email:
            subject = f"You were mentioned in {event.shipment.tracking_number}"
            message = f"""
            You were mentioned in a {event.get_event_type_display().lower()} for shipment {event.shipment.tracking_number}:
            
            "{event.details}"
            
            Mentioned by: {event.user_display_name}
            Time: {event.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
            
            View the full conversation in your SafeShipper dashboard.
            """
            
            send_email.delay(
                recipient_email=user.email,
                subject=subject,
                message=message.strip()
            )
        
        # Send push notification if user has device tokens
        # TODO: Implement device token management
        # if hasattr(user, 'device_tokens'):
        #     for device_token in user.device_tokens.all():
        #         send_push_notification.delay(
        #             device_token=device_token.token,
        #             title="You were mentioned",
        #             body=f"In shipment {event.shipment.tracking_number}",
        #             data={
        #                 'event_id': str(event.id),
        #                 'shipment_id': str(event.shipment.id),
        #                 'type': 'mention'
        #             }
        #         )
        
    except Exception as exc:
        logger.error(f"Failed to process mention notification for {instance.id}: {str(exc)}")


# Signal handlers for shipment status changes
@receiver(post_save, sender='shipments.Shipment')
def handle_shipment_status_change(sender, instance, created, **kwargs):
    """
    Handle shipment status changes by creating communication events.
    """
    if created:
        return
    
    try:
        # Check if status has changed
        if hasattr(instance, '_original_status'):
            old_status = instance._original_status
            new_status = instance.status
            
            if old_status != new_status:
                logger.info(f"Shipment {instance.id} status changed from {old_status} to {new_status}")
                
                # Create a status change event
                event = ShipmentEvent.objects.create(
                    shipment=instance,
                    user=getattr(instance, '_updated_by', instance.assigned_driver),
                    event_type='STATUS_CHANGE',
                    title=f'Status changed to {new_status.replace("_", " ").title()}',
                    details=f'Shipment status updated from {old_status.replace("_", " ").title()} to {new_status.replace("_", " ").title()}',
                    priority='NORMAL' if new_status not in ['DELAYED', 'CANCELLED'] else 'HIGH',
                    is_automated=True
                )
                
                logger.info(f"Created status change event: {event.id}")
    
    except Exception as exc:
        logger.error(f"Failed to handle shipment status change for {instance.id}: {str(exc)}")


# Track original status for comparison
@receiver(post_save, sender='shipments.Shipment')
def track_shipment_original_status(sender, instance, **kwargs):
    """
    Track the original status of shipments for comparison.
    """
    try:
        if hasattr(instance, '_state') and instance._state.adding:
            # This is a new instance, store the initial status
            instance._original_status = instance.status
        else:
            # This is an update, get the current status from database
            if instance.pk:
                try:
                    original = sender.objects.get(pk=instance.pk)
                    instance._original_status = original.status
                except sender.DoesNotExist:
                    instance._original_status = instance.status
    except Exception as exc:
        logger.error(f"Failed to track original status for shipment {instance.id}: {str(exc)}")


# Signal handlers for dangerous goods alerts
@receiver(post_save, sender='dangerous_goods.DangerousGood')
def handle_dangerous_goods_alerts(sender, instance, created, **kwargs):
    """
    Handle dangerous goods-related alerts and compliance notifications.
    """
    if not created:
        return
    
    try:
        # Check if this dangerous good requires special alerts
        if hasattr(instance, 'requires_special_handling') and instance.requires_special_handling:
            logger.warning(f"Special handling dangerous good detected: {instance.id}")
            
            # Find related shipments
            # TODO: Implement relationship between dangerous goods and shipments
            # shipments = instance.shipments.all()
            # for shipment in shipments:
            #     ShipmentEvent.objects.create(
            #         shipment=shipment,
            #         user=shipment.created_by,
            #         event_type='ALERT',
            #         title='Special Handling Required',
            #         details=f'Dangerous good {instance.proper_shipping_name} requires special handling procedures.',
            #         priority='HIGH',
            #         is_automated=True
            #     )
    
    except Exception as exc:
        logger.error(f"Failed to handle dangerous goods alert for {instance.id}: {str(exc)}")


# Signal handler for inspection events
@receiver(post_save, sender='inspections.Inspection')
def handle_inspection_completed(sender, instance, created, **kwargs):
    """
    Handle completed inspections by creating communication events.
    """
    if not instance.completed_at:
        return
    
    try:
        # Check if this inspection just completed
        if not created and instance.completed_at:
            logger.info(f"Inspection {instance.id} completed with result: {instance.overall_result}")
            
            # Create inspection event
            if instance.shipment:
                event = ShipmentEvent.objects.create(
                    shipment=instance.shipment,
                    user=instance.inspector or instance.shipment.assigned_driver,
                    event_type='INSPECTION',
                    title=f'{instance.get_inspection_type_display()} Completed',
                    details=f'{instance.get_inspection_type_display()} completed with result: {instance.overall_result}. {instance.notes or ""}',
                    priority='HIGH' if instance.overall_result == 'FAIL' else 'NORMAL',
                    related_inspection=instance,
                    is_automated=True
                )
                
                logger.info(f"Created inspection event: {event.id}")
    
    except Exception as exc:
        logger.error(f"Failed to handle inspection completion for {instance.id}: {str(exc)}")


# Signal handler for user login events (for security notifications)
from django.contrib.auth.signals import user_logged_in

@receiver(user_logged_in)
def handle_user_login(sender, request, user, **kwargs):
    """
    Handle user login events for security notifications.
    """
    try:
        # Check for suspicious login patterns
        from django.contrib.sessions.models import Session
        from django.utils import timezone
        
        # Get user's recent sessions
        recent_sessions = Session.objects.filter(
            expire_date__gte=timezone.now()
        ).count()
        
        # If user has many concurrent sessions, send security alert
        if recent_sessions > 5:  # Configurable threshold
            logger.warning(f"User {user.id} has {recent_sessions} concurrent sessions")
            
            # TODO: Send security notification
            # send_email.delay(
            #     recipient_email=user.email,
            #     subject="Security Alert: Multiple Active Sessions",
            #     message=f"We detected {recent_sessions} active sessions on your account. If this wasn't you, please contact support immediately."
            # )
    
    except Exception as exc:
        logger.error(f"Failed to handle login notification for user {user.id}: {str(exc)}")