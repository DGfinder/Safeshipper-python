# notifications/push_notification_service.py

import requests
import json
import logging
from django.conf import settings
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ExpoPushNotificationService:
    """
    Service for sending push notifications via Expo Push Notification service.
    """
    
    EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
    MAX_BATCH_SIZE = 100  # Expo's maximum batch size
    
    def __init__(self):
        self.access_token = getattr(settings, 'EXPO_ACCESS_TOKEN', None)
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        })
        
        if self.access_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.access_token}',
            })
    
    def send_notification(
        self,
        expo_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        badge: Optional[int] = None,
        sound: str = 'default',
        priority: str = 'default',
        channel_id: Optional[str] = None
    ) -> bool:
        """
        Send a push notification to a single device.
        
        Args:
            expo_token: Expo push token for the target device
            title: Notification title
            body: Notification body text
            data: Additional data to include with the notification
            badge: Badge count (iOS only)
            sound: Sound to play ('default' or None for silent)
            priority: Notification priority ('default', 'normal', 'high')
            channel_id: Android notification channel ID
            
        Returns:
            bool: True if notification was sent successfully
        """
        return self.send_batch_notifications([{
            'to': expo_token,
            'title': title,
            'body': body,
            'data': data or {},
            'badge': badge,
            'sound': sound,
            'priority': priority,
            'channelId': channel_id,
        }])
    
    def send_batch_notifications(self, notifications: List[Dict]) -> bool:
        """
        Send multiple push notifications in a batch.
        
        Args:
            notifications: List of notification dictionaries
            
        Returns:
            bool: True if all notifications were sent successfully
        """
        if not notifications:
            logger.warning("No notifications to send")
            return True
        
        # Validate Expo tokens
        valid_notifications = []
        for notification in notifications:
            if self._is_valid_expo_token(notification.get('to')):
                valid_notifications.append(notification)
            else:
                logger.warning(f"Invalid Expo token: {notification.get('to')}")
        
        if not valid_notifications:
            logger.warning("No valid notifications to send")
            return False
        
        # Split into batches if necessary
        all_successful = True
        for i in range(0, len(valid_notifications), self.MAX_BATCH_SIZE):
            batch = valid_notifications[i:i + self.MAX_BATCH_SIZE]
            success = self._send_batch(batch)
            if not success:
                all_successful = False
        
        return all_successful
    
    def _send_batch(self, notifications: List[Dict]) -> bool:
        """
        Send a batch of notifications to Expo.
        
        Args:
            notifications: List of notification dictionaries (max 100)
            
        Returns:
            bool: True if batch was sent successfully
        """
        try:
            # Prepare payload for Expo
            payload = notifications
            
            logger.debug(f"Sending {len(notifications)} notifications to Expo")
            
            # Send request to Expo
            response = self.session.post(
                self.EXPO_PUSH_URL,
                json=payload,
                timeout=30
            )
            
            # Check response
            if response.status_code == 200:
                response_data = response.json()
                
                # Check for errors in the response
                if 'data' in response_data:
                    tickets = response_data['data']
                    
                    # Log any errors
                    for i, ticket in enumerate(tickets):
                        if ticket.get('status') == 'error':
                            error_details = ticket.get('details', {})
                            logger.error(
                                f"Expo push notification error for notification {i}: "
                                f"{error_details.get('error', 'Unknown error')}"
                            )
                    
                    # Return True if at least some notifications were successful
                    successful_count = sum(1 for ticket in tickets if ticket.get('status') == 'ok')
                    logger.info(f"Successfully sent {successful_count}/{len(tickets)} notifications")
                    
                    return successful_count > 0
                else:
                    logger.error(f"Unexpected Expo response format: {response_data}")
                    return False
            else:
                logger.error(f"Expo API error: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error sending notifications to Expo: {e}")
            return False
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error from Expo response: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending notifications to Expo: {e}")
            return False
    
    def _is_valid_expo_token(self, token: str) -> bool:
        """
        Validate if a token is a valid Expo push token.
        
        Args:
            token: Token to validate
            
        Returns:
            bool: True if token appears to be valid
        """
        if not token or not isinstance(token, str):
            return False
        
        # Expo push tokens start with 'ExponentPushToken[' and end with ']'
        # or are in the format 'ExpoPushToken[...]'
        # or are legacy format (44 character string)
        
        if token.startswith(('ExponentPushToken[', 'ExpoPushToken[')):
            return token.endswith(']') and len(token) > 20
        
        # Legacy format (44 characters, alphanumeric with dashes/underscores)
        if len(token) == 44:
            return token.replace('-', '').replace('_', '').isalnum()
        
        # New format: 22 character tokens
        if len(token) == 22:
            return token.isalnum()
        
        return False
    
    def get_push_receipts(self, ticket_ids: List[str]) -> Dict:
        """
        Get receipts for previously sent push notifications.
        
        Args:
            ticket_ids: List of ticket IDs from previous push sends
            
        Returns:
            Dict: Receipt data from Expo
        """
        try:
            response = self.session.post(
                'https://exp.host/--/api/v2/push/getReceipts',
                json={'ids': ticket_ids},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Error getting push receipts: {response.status_code} - {response.text}")
                return {}
                
        except Exception as e:
            logger.error(f"Error getting push receipts: {e}")
            return {}
    
    def send_feedback_notification(
        self,
        expo_token: str,
        feedback_type: str,
        tracking_number: str,
        customer_name: str,
        score: int,
        additional_data: Optional[Dict] = None
    ) -> bool:
        """
        Send a feedback-specific push notification.
        
        Args:
            expo_token: Expo push token
            feedback_type: Type of feedback notification
            tracking_number: Shipment tracking number
            customer_name: Customer name
            score: Feedback score
            additional_data: Additional data to include
            
        Returns:
            bool: True if notification was sent successfully
        """
        # Prepare notification content based on type
        title_templates = {
            'feedback_received': f'New Feedback: {score}%',
            'manager_response': 'Manager Response Added',
            'incident_created': f'Incident Created - {score}%',
            'driver_feedback': f'Customer Feedback: {score}%',
        }
        
        body_templates = {
            'feedback_received': f'Feedback received for {tracking_number} from {customer_name}',
            'manager_response': f'Manager responded to feedback for {tracking_number}',
            'incident_created': f'Incident created for poor feedback on {tracking_number}',
            'driver_feedback': f'You received feedback for delivery {tracking_number}',
        }
        
        title = title_templates.get(feedback_type, 'SafeShipper Notification')
        body = body_templates.get(feedback_type, f'New notification for {tracking_number}')
        
        # Prepare notification data
        notification_data = {
            'type': feedback_type,
            'tracking_number': tracking_number,
            'customer_name': customer_name,
            'score': score,
            'timestamp': str(int(time.time())),
        }
        
        if additional_data:
            notification_data.update(additional_data)
        
        # Determine priority and sound based on score
        priority = 'high' if score < 67 else 'default'
        sound = 'default' if score < 67 else 'default'
        
        return self.send_notification(
            expo_token=expo_token,
            title=title,
            body=body,
            data=notification_data,
            priority=priority,
            sound=sound,
            channel_id='feedback_notifications'
        )


# Import time for timestamp generation
import time