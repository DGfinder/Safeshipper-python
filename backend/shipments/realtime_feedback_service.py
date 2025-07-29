# shipments/realtime_feedback_service.py
"""
Real-time notification service for customer feedback events.
Integrates with SafeShipper's WebSocket infrastructure to provide instant notifications.
"""

import logging
from typing import Dict, Any, List, Optional
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Shipment, ShipmentFeedback
from communications.models import NotificationQueue, Channel, ChannelMembership
from companies.models import Company

logger = logging.getLogger(__name__)
User = get_user_model()


class RealtimeFeedbackNotificationService:
    """Service for sending real-time notifications about feedback events."""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    @staticmethod
    def get_notification_recipients(feedback: ShipmentFeedback) -> Dict[str, List[User]]:
        """
        Get all users who should receive real-time notifications for this feedback.
        
        Args:
            feedback: The ShipmentFeedback instance
            
        Returns:
            Dict with different recipient categories
        """
        carrier_company = feedback.shipment.carrier
        customer_company = feedback.shipment.customer
        
        # Get managers and admins from carrier company
        managers = User.objects.filter(
            company=carrier_company,
            role__in=['MANAGER', 'ADMIN', 'DISPATCHER', 'COMPLIANCE_OFFICER'],
            is_active=True
        )
        
        # Get the assigned driver if available
        drivers = []
        if feedback.shipment.assigned_driver:
            drivers = [feedback.shipment.assigned_driver]
        
        # Get customer company users if they should be notified
        customer_users = User.objects.filter(
            company=customer_company,
            role__in=['ADMIN', 'MANAGER'],
            is_active=True
        )[:3]  # Limit to avoid spam
        
        return {
            'managers': list(managers),
            'drivers': drivers,
            'customers': list(customer_users)
        }
    
    def create_feedback_notification_data(self, feedback: ShipmentFeedback, recipient_type: str) -> Dict[str, Any]:
        """
        Create notification data structure for feedback events.
        
        Args:
            feedback: The ShipmentFeedback instance
            recipient_type: Type of recipient ('manager', 'driver', 'customer')
            
        Returns:
            Dict containing notification data
        """
        score = feedback.delivery_success_score
        is_poor_score = score < 70
        is_critical_score = score < 50
        
        # Base notification data
        base_data = {
            'id': str(feedback.id),
            'type': 'feedback_received',
            'timestamp': timezone.now().isoformat(),
            'shipment': {
                'id': str(feedback.shipment.id),
                'tracking_number': feedback.shipment.tracking_number,
                'customer_company': feedback.shipment.customer.name,
                'carrier_company': feedback.shipment.carrier.name,
            },
            'feedback': {
                'score': score,
                'was_on_time': feedback.was_on_time,
                'was_complete_and_undamaged': feedback.was_complete_and_undamaged,
                'was_driver_professional': feedback.was_driver_professional,
                'summary': feedback.get_feedback_summary(),
                'has_comments': bool(feedback.feedback_notes),
                'submitted_at': feedback.submitted_at.isoformat(),
            },
            'priority': 'urgent' if is_critical_score else 'high' if is_poor_score else 'normal',
            'requires_action': is_poor_score,
        }
        
        # Customize notification based on recipient type
        if recipient_type == 'manager':
            base_data.update({
                'title': f"Customer Feedback: {score:.0f}% Score",
                'message': self._get_manager_notification_message(feedback, score, is_poor_score),
                'action_url': f"/shipments/{feedback.shipment.id}",
                'action_label': "View Shipment Details",
                'show_alert_banner': is_poor_score,
            })
        elif recipient_type == 'driver':
            base_data.update({
                'title': f"Customer Feedback for Your Delivery",
                'message': self._get_driver_notification_message(feedback, score),
                'action_url': f"/mobile/feedback/{feedback.shipment.tracking_number}",
                'action_label': "View Feedback",
                'show_alert_banner': False,  # Drivers don't need alert banners
            })
        elif recipient_type == 'customer':
            base_data.update({
                'title': f"Feedback Received - Thank You!",
                'message': f"Your feedback for shipment {feedback.shipment.tracking_number} has been received. Delivery Success Score: {score:.0f}%",
                'action_url': f"/track/{feedback.shipment.tracking_number}",
                'action_label': "View Shipment",
                'show_alert_banner': False,
            })
        
        return base_data
    
    def _get_manager_notification_message(self, feedback: ShipmentFeedback, score: float, is_poor_score: bool) -> str:
        """Generate notification message for managers."""
        if is_poor_score:
            issues = []
            if not feedback.was_on_time:
                issues.append("delivery timing")
            if not feedback.was_complete_and_undamaged:
                issues.append("shipment condition")
            if not feedback.was_driver_professional:
                issues.append("driver service")
            
            if issues:
                issue_text = " and ".join(issues)
                return f"Poor customer feedback received for {feedback.shipment.tracking_number}. Issues reported with {issue_text}. Score: {score:.0f}%"
            else:
                return f"Poor customer feedback received for {feedback.shipment.tracking_number}. Score: {score:.0f}%"
        else:
            return f"Customer feedback received for {feedback.shipment.tracking_number}. Score: {score:.0f}%"
    
    def _get_driver_notification_message(self, feedback: ShipmentFeedback, score: float) -> str:
        """Generate notification message for drivers."""
        if score >= 90:
            return f"Excellent customer feedback! Your delivery received a {score:.0f}% satisfaction score. Great job!"
        elif score >= 70:
            return f"Good customer feedback received for your delivery. Score: {score:.0f}%"
        else:
            return f"Customer feedback received for your delivery. Score: {score:.0f}%. Please review for improvement opportunities."
    
    def send_realtime_notification(self, user: User, notification_data: Dict[str, Any]) -> bool:
        """
        Send real-time notification to a specific user via WebSocket.
        
        Args:
            user: The User to notify
            notification_data: The notification data to send
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.channel_layer:
                logger.warning("Channel layer not available for real-time notifications")
                return False
            
            # Send to user's personal WebSocket group
            user_group = f"user_{user.id}"
            
            async_to_sync(self.channel_layer.group_send)(
                user_group,
                {
                    'type': 'notification',
                    'notification': notification_data
                }
            )
            
            logger.info(f"Sent real-time feedback notification to user {user.id} ({user.email})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send real-time notification to user {user.id}: {str(e)}")
            return False
    
    def send_channel_notification(self, channel_id: str, notification_data: Dict[str, Any]) -> bool:
        """
        Send notification to a specific channel (for team notifications).
        
        Args:
            channel_id: The channel ID to send to
            notification_data: The notification data to send
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.channel_layer:
                logger.warning("Channel layer not available for channel notifications")
                return False
            
            channel_group = f"channel_{channel_id}"
            
            async_to_sync(self.channel_layer.group_send)(
                channel_group,
                {
                    'type': 'notification',
                    'notification': notification_data
                }
            )
            
            logger.info(f"Sent feedback notification to channel {channel_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send channel notification to {channel_id}: {str(e)}")
            return False
    
    def process_feedback_realtime_notifications(self, feedback: ShipmentFeedback) -> Dict[str, Any]:
        """
        Main method to process all real-time notifications for a feedback event.
        
        Args:
            feedback: The ShipmentFeedback instance
            
        Returns:
            Dict with results of notification sending
        """
        results = {
            'feedback_id': str(feedback.id),
            'tracking_number': feedback.shipment.tracking_number,
            'score': feedback.delivery_success_score,
            'notifications_sent': 0,
            'notifications_failed': 0,
            'recipients': {
                'managers': 0,
                'drivers': 0,
                'customers': 0,
                'channels': 0
            },
            'errors': []
        }
        
        try:
            # Get all recipients
            recipients = self.get_notification_recipients(feedback)
            
            # Send notifications to managers
            for manager in recipients['managers']:
                notification_data = self.create_feedback_notification_data(feedback, 'manager')
                if self.send_realtime_notification(manager, notification_data):
                    results['notifications_sent'] += 1
                    results['recipients']['managers'] += 1
                else:
                    results['notifications_failed'] += 1
                    results['errors'].append(f"Failed to notify manager {manager.email}")
            
            # Send notifications to drivers
            for driver in recipients['drivers']:
                notification_data = self.create_feedback_notification_data(feedback, 'driver')
                if self.send_realtime_notification(driver, notification_data):
                    results['notifications_sent'] += 1
                    results['recipients']['drivers'] += 1
                else:
                    results['notifications_failed'] += 1
                    results['errors'].append(f"Failed to notify driver {driver.email}")
            
            # Send notifications to customer users (optional)
            for customer in recipients['customers']:
                notification_data = self.create_feedback_notification_data(feedback, 'customer')
                if self.send_realtime_notification(customer, notification_data):
                    results['notifications_sent'] += 1
                    results['recipients']['customers'] += 1
                else:
                    results['notifications_failed'] += 1
                    results['errors'].append(f"Failed to notify customer {customer.email}")
            
            # Send to relevant team channels if they exist
            team_channels = self.get_relevant_team_channels(feedback)
            for channel_id in team_channels:
                notification_data = self.create_feedback_notification_data(feedback, 'manager')
                notification_data['channel_notification'] = True
                if self.send_channel_notification(channel_id, notification_data):
                    results['recipients']['channels'] += 1
                else:
                    results['errors'].append(f"Failed to notify channel {channel_id}")
            
            logger.info(f"Processed real-time feedback notifications for {feedback.shipment.tracking_number}: {results}")
            
        except Exception as e:
            error_msg = f"Error processing real-time feedback notifications: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)
        
        return results
    
    def get_relevant_team_channels(self, feedback: ShipmentFeedback) -> List[str]:
        """
        Get relevant team channels that should receive feedback notifications.
        
        Args:
            feedback: The ShipmentFeedback instance
            
        Returns:
            List of channel IDs
        """
        try:
            carrier_company = feedback.shipment.carrier
            
            # Look for company-specific channels and general channels
            relevant_channels = Channel.objects.filter(
                related_company=carrier_company,
                channel_type__in=['COMPANY', 'COMPLIANCE', 'GENERAL'],
                is_archived=False
            ).values_list('id', flat=True)
            
            # Also include shipment-specific channels if they exist
            shipment_channels = Channel.objects.filter(
                related_shipment=feedback.shipment,
                is_archived=False
            ).values_list('id', flat=True)
            
            all_channels = list(relevant_channels) + list(shipment_channels)
            return [str(channel_id) for channel_id in all_channels]
            
        except Exception as e:
            logger.error(f"Error getting relevant team channels: {str(e)}")
            return []
    
    def send_feedback_trend_alert(self, company: Company, trend_data: Dict[str, Any], alert_level: str = 'INFO') -> Dict[str, Any]:
        """
        Send real-time alert about feedback trends to company managers.
        
        Args:
            company: The Company instance
            trend_data: Trend analysis data
            alert_level: Alert level ('INFO', 'WARNING', 'CRITICAL')
            
        Returns:
            Dict with notification results
        """
        results = {
            'company': company.name,
            'alert_level': alert_level,
            'notifications_sent': 0,
            'notifications_failed': 0,
            'errors': []
        }
        
        try:
            # Get company managers
            managers = User.objects.filter(
                company=company,
                role__in=['MANAGER', 'ADMIN', 'COMPLIANCE_OFFICER'],
                is_active=True
            )
            
            # Create trend notification data
            notification_data = {
                'id': f"trend_alert_{company.id}_{timezone.now().timestamp()}",
                'type': 'feedback_trend_alert',
                'timestamp': timezone.now().isoformat(),
                'title': f"Feedback Trend Alert - {company.name}",
                'message': self._format_trend_message(trend_data, alert_level),
                'priority': alert_level.lower(),
                'company': {
                    'id': str(company.id),
                    'name': company.name
                },
                'trend_data': trend_data,
                'action_url': "/dashboard?tab=feedback-analytics",
                'action_label': "View Analytics Dashboard",
                'show_alert_banner': alert_level in ['WARNING', 'CRITICAL'],
            }
            
            # Send to all managers
            for manager in managers:
                if self.send_realtime_notification(manager, notification_data):
                    results['notifications_sent'] += 1
                else:
                    results['notifications_failed'] += 1
                    results['errors'].append(f"Failed to notify manager {manager.email}")
            
            logger.info(f"Sent feedback trend alert to {company.name}: {results}")
            
        except Exception as e:
            error_msg = f"Error sending feedback trend alert: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)
        
        return results
    
    def _format_trend_message(self, trend_data: Dict[str, Any], alert_level: str) -> str:
        """Format trend alert message based on data and alert level."""
        if alert_level == 'CRITICAL':
            return (f"Critical: Feedback trends show significant decline. "
                   f"Average score: {trend_data.get('average_score', 0)}%, "
                   f"Poor ratings: {trend_data.get('poor_score_rate', 0)}%. "
                   f"Immediate action required.")
        elif alert_level == 'WARNING':
            return (f"Warning: Feedback trends declining. "
                   f"Average score: {trend_data.get('average_score', 0)}%, "
                   f"Poor ratings: {trend_data.get('poor_score_rate', 0)}%. "
                   f"Please review operations.")
        else:
            return (f"Feedback trend update: "
                   f"Average score: {trend_data.get('average_score', 0)}%, "
                   f"Total feedback: {trend_data.get('total_feedback_count', 0)}")


class FeedbackWebSocketEventService:
    """Service for managing WebSocket events specific to feedback."""
    
    @staticmethod
    def broadcast_feedback_update_to_shipment_viewers(feedback: ShipmentFeedback):
        """
        Broadcast feedback updates to users currently viewing the shipment.
        
        Args:
            feedback: The ShipmentFeedback instance
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            # Create update data
            update_data = {
                'type': 'feedback_update',
                'timestamp': timezone.now().isoformat(),
                'shipment_id': str(feedback.shipment.id),
                'tracking_number': feedback.shipment.tracking_number,
                'feedback': {
                    'id': str(feedback.id),
                    'score': feedback.delivery_success_score,
                    'summary': feedback.get_feedback_summary(),
                    'submitted_at': feedback.submitted_at.isoformat(),
                    'details': {
                        'was_on_time': feedback.was_on_time,
                        'was_complete_and_undamaged': feedback.was_complete_and_undamaged,
                        'was_driver_professional': feedback.was_driver_professional,
                        'has_comments': bool(feedback.feedback_notes),
                    }
                }
            }
            
            # Broadcast to shipment-specific group
            shipment_group = f"shipment_{feedback.shipment.id}"
            async_to_sync(channel_layer.group_send)(
                shipment_group,
                {
                    'type': 'feedback_update',
                    'data': update_data
                }
            )
            
            logger.info(f"Broadcasted feedback update for shipment {feedback.shipment.tracking_number}")
            
        except Exception as e:
            logger.error(f"Error broadcasting feedback update: {str(e)}")
    
    @staticmethod
    def broadcast_dashboard_metric_update(company: Company, new_metrics: Dict[str, Any]):
        """
        Broadcast updated dashboard metrics to company users.
        
        Args:
            company: The Company instance
            new_metrics: Updated metric data
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            # Create metric update data
            update_data = {
                'type': 'dashboard_metrics_update',
                'timestamp': timezone.now().isoformat(),
                'company_id': str(company.id),
                'metrics': new_metrics,
                'component': 'delivery_success_widget'
            }
            
            # Broadcast to company dashboard group
            company_group = f"company_dashboard_{company.id}"
            async_to_sync(channel_layer.group_send)(
                company_group,
                {
                    'type': 'dashboard_update',
                    'data': update_data
                }
            )
            
            logger.info(f"Broadcasted dashboard metrics update for company {company.name}")
            
        except Exception as e:
            logger.error(f"Error broadcasting dashboard update: {str(e)}")