# notifications/services.py
"""
Service for sending push notifications via Expo Push Notification API.
"""

import logging
import requests
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from .models import PushNotificationDevice, PushNotificationLog

logger = logging.getLogger(__name__)


class PushNotificationService:
    """
    Service for sending push notifications to mobile devices via Expo.
    """
    
    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    EXPO_RECEIPT_URL = "https://exp.host/--/api/v2/push/getReceipts"
    
    def __init__(self):
        self.expo_access_token = getattr(settings, 'EXPO_ACCESS_TOKEN', None)
        self.batch_size = getattr(settings, 'EXPO_PUSH_BATCH_SIZE', 100)
    
    def send_notification(
        self,
        expo_push_token: str,
        title: str,
        body: str,
        data: Dict[str, Any] = None,
        sound: str = 'default',
        badge: int = None,
        priority: str = 'normal'
    ) -> Dict[str, Any]:
        """
        Send a single push notification.
        
        Args:
            expo_push_token: Expo push token for the device
            title: Notification title
            body: Notification body
            data: Additional data to include
            sound: Sound to play ('default' or None)
            badge: Badge count
            priority: Notification priority ('normal', 'high')
        
        Returns:
            Dict with success status and result
        """
        try:
            # Validate token format
            if not self._is_valid_expo_token(expo_push_token):
                return {
                    'success': False,
                    'error': 'Invalid Expo push token format'
                }
            
            # Prepare notification payload
            message = {
                'to': expo_push_token,
                'title': title,
                'body': body,
                'data': data or {},
                'priority': priority,
            }
            
            # Add optional fields
            if sound:
                message['sound'] = sound
            if badge is not None:
                message['badge'] = badge
            
            # Send notification
            response = self._send_to_expo([message])
            
            if response.get('success'):
                ticket_data = response.get('data', [{}])[0]
                return {
                    'success': True,
                    'ticket_id': ticket_data.get('id'),
                    'status': ticket_data.get('status')
                }
            else:
                return {
                    'success': False,
                    'error': response.get('error', 'Unknown error')
                }
        
        except Exception as e:
            logger.error(f"Error sending push notification: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_notifications_to_users(
        self,
        user_ids: List[str],
        title: str,
        body: str,
        data: Dict[str, Any] = None,
        notification_type: str = 'general',
        related_object_id: str = None,
        priority: str = 'normal'
    ) -> Dict[str, Any]:
        """
        Send notifications to multiple users.
        
        Args:
            user_ids: List of user IDs to send to
            title: Notification title
            body: Notification body
            data: Additional data
            notification_type: Type of notification for preferences
            related_object_id: ID of related object
            priority: Notification priority
        
        Returns:
            Dict with results summary
        """
        try:
            # Get active devices for users
            devices = PushNotificationDevice.objects.filter(
                user_id__in=user_ids,
                is_active=True
            ).select_related('user')
            
            if not devices.exists():
                return {
                    'success': False,
                    'error': 'No active devices found for specified users',
                    'sent_count': 0,
                    'failed_count': 0
                }
            
            # Filter devices by notification preferences
            eligible_devices = []
            for device in devices:
                if device.should_receive_notification(notification_type):
                    eligible_devices.append(device)
            
            if not eligible_devices:
                return {
                    'success': False,
                    'error': 'No eligible devices after preference filtering',
                    'sent_count': 0,
                    'failed_count': 0
                }
            
            # Send notifications in batches
            results = self._send_batch_notifications(
                eligible_devices,
                title,
                body,
                data,
                notification_type,
                related_object_id,
                priority
            )
            
            return results
        
        except Exception as e:
            logger.error(f"Error sending batch notifications: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'sent_count': 0,
                'failed_count': 0
            }
    
    def send_feedback_notification(
        self,
        feedback,
        recipient_type: str = 'driver'
    ) -> Dict[str, Any]:
        """
        Send feedback-related notification.
        
        Args:
            feedback: ShipmentFeedback instance
            recipient_type: Type of recipient ('driver', 'manager', 'customer')
        
        Returns:
            Dict with results
        """
        try:
            # Determine recipients based on type
            if recipient_type == 'driver':
                # Send to driver of the shipment
                user_ids = []
                if feedback.shipment.assigned_driver:
                    user_ids = [str(feedback.shipment.assigned_driver.id)]
            elif recipient_type == 'manager':
                # Send to managers in the carrier company
                from django.contrib.auth import get_user_model
                User = get_user_model()
                managers = User.objects.filter(
                    company=feedback.shipment.carrier,
                    role__in=['MANAGER', 'ADMIN'],
                    is_active=True
                )
                user_ids = [str(u.id) for u in managers]
            elif recipient_type == 'customer':
                # Send to customer contact
                user_ids = []
                if hasattr(feedback.shipment, 'customer_contact'):
                    user_ids = [str(feedback.shipment.customer_contact.id)]
            else:
                return {
                    'success': False,
                    'error': f'Invalid recipient type: {recipient_type}'
                }
            
            if not user_ids:
                return {
                    'success': False,
                    'error': f'No users found for recipient type: {recipient_type}',
                    'sent_count': 0,
                    'failed_count': 0
                }
            
            # Prepare notification content
            score = feedback.delivery_success_score
            tracking_number = feedback.shipment.tracking_number
            
            if recipient_type == 'driver':
                title = f"Feedback Received - {tracking_number}"
                body = f"You received a {score}% delivery score for shipment {tracking_number}"
            elif recipient_type == 'manager':
                if score < 70:
                    title = f"Poor Feedback Alert - {tracking_number}"
                    body = f"Low delivery score ({score}%) requires attention for {tracking_number}"
                else:
                    title = f"Feedback Update - {tracking_number}"
                    body = f"Shipment {tracking_number} received {score}% delivery score"
            else:  # customer
                title = "Thank you for your feedback"
                body = f"Your feedback for shipment {tracking_number} has been received"
            
            data = {
                'type': 'feedback_received',
                'shipment_id': str(feedback.shipment.id),
                'tracking_number': tracking_number,
                'feedback_id': str(feedback.id),
                'feedback_score': score,
                'recipient_type': recipient_type
            }
            
            # Send notifications
            return self.send_notifications_to_users(
                user_ids=user_ids,
                title=title,
                body=body,
                data=data,
                notification_type='feedback_notifications',
                related_object_id=str(feedback.id),
                priority='high' if score < 70 else 'normal'
            )
        
        except Exception as e:
            logger.error(f"Error sending feedback notification: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'sent_count': 0,
                'failed_count': 0
            }
    
    def _send_batch_notifications(
        self,
        devices: List[PushNotificationDevice],
        title: str,
        body: str,
        data: Dict[str, Any],
        notification_type: str,
        related_object_id: str,
        priority: str
    ) -> Dict[str, Any]:
        """Send notifications to multiple devices in batches."""
        sent_count = 0
        failed_count = 0
        errors = []
        
        # Prepare messages for all devices
        messages = []
        device_map = {}  # Map message index to device
        
        for i, device in enumerate(devices):
            message = {
                'to': device.expo_push_token,
                'title': title,
                'body': body,
                'data': data or {},
                'priority': priority,
                'sound': 'default'
            }
            messages.append(message)
            device_map[i] = device
        
        # Send in batches
        batch_start = 0
        while batch_start < len(messages):
            batch_end = min(batch_start + self.batch_size, len(messages))
            batch_messages = messages[batch_start:batch_end]
            
            try:
                response = self._send_to_expo(batch_messages)
                
                if response.get('success'):
                    # Process each response in the batch
                    batch_data = response.get('data', [])
                    
                    for i, result in enumerate(batch_data):
                        device_index = batch_start + i
                        device = device_map[device_index]
                        
                        # Create log entry
                        log_entry = PushNotificationLog.objects.create(
                            device=device,
                            title=title,
                            body=body,
                            data=data or {},
                            notification_type=notification_type,
                            related_object_id=related_object_id,
                            status='pending'
                        )
                        
                        if result.get('status') == 'ok':
                            log_entry.mark_sent(result.get('id'))
                            sent_count += 1
                        else:
                            error_msg = result.get('message', 'Unknown error')
                            log_entry.mark_failed(error_msg)
                            failed_count += 1
                            errors.append(f"Device {device.device_identifier}: {error_msg}")
                
                else:
                    # Entire batch failed
                    error_msg = response.get('error', 'Batch send failed')
                    
                    for i in range(len(batch_messages)):
                        device_index = batch_start + i
                        device = device_map[device_index]
                        
                        log_entry = PushNotificationLog.objects.create(
                            device=device,
                            title=title,
                            body=body,
                            data=data or {},
                            notification_type=notification_type,
                            related_object_id=related_object_id,
                            status='failed',
                            error_message=error_msg
                        )
                        failed_count += 1
                    
                    errors.append(f"Batch {batch_start}-{batch_end}: {error_msg}")
            
            except Exception as e:
                # Handle batch exception
                error_msg = str(e)
                
                for i in range(len(batch_messages)):
                    device_index = batch_start + i
                    device = device_map[device_index]
                    
                    log_entry = PushNotificationLog.objects.create(
                        device=device,
                        title=title,
                        body=body,
                        data=data or {},
                        notification_type=notification_type,
                        related_object_id=related_object_id,
                        status='failed',
                        error_message=error_msg
                    )
                    failed_count += 1
                
                errors.append(f"Batch {batch_start}-{batch_end}: {error_msg}")
                logger.error(f"Error sending notification batch: {error_msg}")
            
            batch_start = batch_end
        
        return {
            'success': sent_count > 0,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total_devices': len(devices),
            'errors': errors if errors else None
        }
    
    def _send_to_expo(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Send messages to Expo push service."""
        try:
            headers = {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            }
            
            # Add access token if available
            if self.expo_access_token:
                headers['Authorization'] = f'Bearer {self.expo_access_token}'
            
            response = requests.post(
                self.EXPO_PUSH_URL,
                json=messages,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json().get('data', [])
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
        
        except requests.RequestException as e:
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }
    
    def _is_valid_expo_token(self, token: str) -> bool:
        """Validate Expo push token format."""
        if not token:
            return False
        
        # Basic validation for Expo push token
        return (
            token.startswith('ExponentPushToken[') and
            token.endswith(']') and
            len(token) > 20
        )
    
    def get_push_receipts(self, ticket_ids: List[str]) -> Dict[str, Any]:
        """
        Get push notification receipts from Expo.
        
        Args:
            ticket_ids: List of ticket IDs to get receipts for
        
        Returns:
            Dict with receipt data
        """
        try:
            headers = {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            }
            
            if self.expo_access_token:
                headers['Authorization'] = f'Bearer {self.expo_access_token}'
            
            response = requests.post(
                self.EXPO_RECEIPT_URL,
                json={'ids': ticket_ids},
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json().get('data', {})
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
        
        except Exception as e:
            logger.error(f"Error getting push receipts: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }