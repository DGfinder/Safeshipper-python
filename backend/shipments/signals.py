import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Shipment, ShipmentFeedback
from .feedback_alert_service import FeedbackAlertService
from .realtime_feedback_service import RealtimeFeedbackNotificationService, FeedbackWebSocketEventService

logger = logging.getLogger(__name__)

# Shipment signal handlers for production use

@receiver(post_save, sender=ShipmentFeedback)
def feedback_post_save_receiver(sender, instance, created, **kwargs):
    """
    Handle ShipmentFeedback creation to trigger alerts and real-time notifications.
    """
    if created:
        logger.info(f"Customer feedback submitted for shipment {instance.shipment.tracking_number} with score {instance.delivery_success_score:.1f}%")
        
        # Process feedback alerts (email alerts for poor scores)
        try:
            alert_result = FeedbackAlertService.process_feedback_alert(instance)
            
            if alert_result.get('alert_triggered'):
                logger.info(f"Processed feedback alert for shipment {instance.shipment.tracking_number}: {alert_result}")
            else:
                logger.debug(f"No alert triggered for shipment {instance.shipment.tracking_number}: {alert_result.get('reason', 'Unknown reason')}")
                
        except Exception as e:
            logger.error(f"Failed to process feedback alert for shipment {instance.shipment.tracking_number}: {str(e)}")
        
        # Process real-time notifications (WebSocket notifications for all feedback)
        try:
            realtime_service = RealtimeFeedbackNotificationService()
            notification_result = realtime_service.process_feedback_realtime_notifications(instance)
            
            logger.info(f"Processed real-time feedback notifications for shipment {instance.shipment.tracking_number}: "
                       f"{notification_result['notifications_sent']} sent, {notification_result['notifications_failed']} failed")
            
            if notification_result['errors']:
                logger.warning(f"Real-time notification errors for {instance.shipment.tracking_number}: {notification_result['errors']}")
                
        except Exception as e:
            logger.error(f"Failed to process real-time feedback notifications for shipment {instance.shipment.tracking_number}: {str(e)}")
        
        # Broadcast feedback update to users viewing the shipment
        try:
            FeedbackWebSocketEventService.broadcast_feedback_update_to_shipment_viewers(instance)
        except Exception as e:
            logger.error(f"Failed to broadcast feedback update for shipment {instance.shipment.tracking_number}: {str(e)}")
        
        # Send mobile push notifications
        try:
            from notifications.services import PushNotificationService
            push_service = PushNotificationService()
            
            # Send to driver
            driver_result = push_service.send_feedback_notification(instance, 'driver')
            if driver_result.get('success'):
                logger.info(f"Sent feedback push notification to driver: {driver_result['sent_count']} notifications")
            else:
                logger.debug(f"No driver push notifications sent: {driver_result.get('error', 'Unknown reason')}")
            
            # Send to managers if poor score
            if instance.delivery_success_score < 70:
                manager_result = push_service.send_feedback_notification(instance, 'manager')
                if manager_result.get('success'):
                    logger.info(f"Sent poor feedback alert to managers: {manager_result['sent_count']} notifications")
                else:
                    logger.debug(f"No manager push notifications sent: {manager_result.get('error', 'Unknown reason')}")
                    
        except Exception as e:
            logger.error(f"Failed to send mobile push notifications for feedback {instance.id}: {str(e)}")
        
        # Update dashboard metrics for the carrier company
        try:
            # Trigger dashboard metrics update (this could be done asynchronously)
            from .tasks import update_company_dashboard_metrics
            if hasattr(instance.shipment, 'carrier'):
                update_company_dashboard_metrics.delay(str(instance.shipment.carrier.id))
        except Exception as e:
            logger.debug(f"Dashboard metrics update not available or failed: {str(e)}")

# Example of a shipment signal receiver (you can uncomment and adapt later)
# @receiver(post_save, sender=Shipment)
# def shipment_post_save_receiver(sender, instance, created, **kwargs):
#     if created:
#         logger.info(f"Shipment {instance.tracking_number} was created")
#     else:
#         logger.info(f"Shipment {instance.tracking_number} was updated")
#     # Add any logic here that should run after a Shipment is saved
#     # For example, sending a notification, updating an external system, etc.