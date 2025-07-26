# communications/sms_service.py
import logging
from typing import Dict, List, Optional
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import re

logger = logging.getLogger(__name__)

# Import with fallback for development environments
try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioException
    TWILIO_AVAILABLE = True
except ImportError:
    logger.warning("Twilio not installed. SMS service will use mock mode.")
    TWILIO_AVAILABLE = False
    Client = None
    TwilioException = Exception

try:
    from pyfcm import FCMNotification
    FCM_AVAILABLE = True
except ImportError:
    logger.warning("PyFCM not installed. Push notification service will use mock mode.")
    FCM_AVAILABLE = False
    FCMNotification = None


class SMSService:
    """Service for sending SMS notifications via Twilio"""
    
    def __init__(self):
        """Initialize Twilio client"""
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        self.from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', '')
        
        if not all([self.account_sid, self.auth_token, self.from_number]) or not TWILIO_AVAILABLE:
            if not settings.DEBUG:
                logger.warning(
                    "Twilio credentials not configured or Twilio not installed. "
                    "SMS service will use mock mode."
                )
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)
    
    def validate_phone_number(self, phone_number: str) -> str:
        """
        Validate and format phone number for SMS.
        Returns formatted number in E.164 format.
        """
        # Remove all non-digit characters except + 
        clean_number = re.sub(r'[^\d+]', '', phone_number)
        
        # Add + if not present and not starting with country code
        if not clean_number.startswith('+'):
            # Assume US/Canada if 10 digits
            if len(clean_number) == 10:
                clean_number = '+1' + clean_number
            # Assume US/Canada if 11 digits starting with 1
            elif len(clean_number) == 11 and clean_number.startswith('1'):
                clean_number = '+' + clean_number
            else:
                raise ValueError(f"Invalid phone number format: {phone_number}")
        
        # Basic validation for E.164 format
        if not re.match(r'^\+[1-9]\d{1,14}$', clean_number):
            raise ValueError(f"Invalid phone number format: {phone_number}")
        
        return clean_number
    
    def send_sms(self, phone_number: str, message: str, **kwargs) -> Dict:
        """
        Send SMS message via Twilio
        
        Args:
            phone_number: Recipient phone number in any format
            message: SMS message content
            **kwargs: Additional Twilio message parameters
        
        Returns:
            Dict with status and message details
        """
        try:
            # Validate and format phone number
            formatted_number = self.validate_phone_number(phone_number)
            
            # Truncate message if too long (SMS limit is 1600 characters)
            if len(message) > 1600:
                message = message[:1597] + "..."
                logger.warning(f"SMS message truncated for {formatted_number}")
            
            # Mock mode for development/testing
            if not self.client:
                logger.info(f"[MOCK SMS] To: {formatted_number}, Message: {message}")
                return {
                    'status': 'success',
                    'message_sid': 'mock_sid_' + str(hash(message))[:8],
                    'recipient': formatted_number,
                    'message': message,
                    'cost': '0.00',
                    'mock': True
                }
            
            # Send actual SMS via Twilio
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=formatted_number,
                **kwargs
            )
            
            logger.info(f"SMS sent successfully. SID: {message_obj.sid}, To: {formatted_number}")
            
            return {
                'status': 'success',
                'message_sid': message_obj.sid,
                'recipient': formatted_number,
                'message': message,
                'cost': message_obj.price or '0.00',
                'mock': False
            }
            
        except ValueError as e:
            logger.error(f"Invalid phone number: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'error_type': 'validation_error',
                'recipient': phone_number,
                'message': message
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {phone_number}: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'error_type': 'twilio_error',
                'error_code': getattr(e, 'code', None),
                'recipient': phone_number,
                'message': message
            }
            
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {phone_number}: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'error_type': 'unknown_error',
                'recipient': phone_number,
                'message': message
            }
    
    def send_bulk_sms(self, recipients: List[str], message: str) -> Dict:
        """
        Send SMS to multiple recipients
        
        Args:
            recipients: List of phone numbers
            message: SMS message content
        
        Returns:
            Dict with overall status and individual results
        """
        results = []
        success_count = 0
        failed_count = 0
        
        for phone_number in recipients:
            result = self.send_sms(phone_number, message)
            results.append(result)
            
            if result['status'] == 'success':
                success_count += 1
            else:
                failed_count += 1
        
        return {
            'status': 'completed',
            'total_sent': len(recipients),
            'success_count': success_count,
            'failed_count': failed_count,
            'results': results
        }


class PushNotificationService:
    """Service for sending push notifications via Firebase Cloud Messaging"""
    
    def __init__(self):
        """Initialize FCM service"""
        self.server_key = getattr(settings, 'FCM_SERVER_KEY', '')
        
        if not self.server_key or not FCM_AVAILABLE:
            if not settings.DEBUG:
                logger.warning(
                    "FCM server key not configured or PyFCM not installed. "
                    "Push notification service will use mock mode."
                )
            self.fcm = None
        else:
            self.fcm = FCMNotification(api_key=self.server_key)
    
    def send_push_notification(
        self, 
        device_token: str, 
        title: str, 
        body: str, 
        data: Optional[Dict] = None,
        **kwargs
    ) -> Dict:
        """
        Send push notification to a single device
        
        Args:
            device_token: FCM device registration token
            title: Notification title
            body: Notification body
            data: Additional data payload
            **kwargs: Additional FCM parameters
        
        Returns:
            Dict with status and notification details
        """
        try:
            # Mock mode for development/testing
            if not self.fcm:
                logger.info(f"[MOCK PUSH] Token: {device_token[:10]}..., Title: {title}, Body: {body}")
                return {
                    'status': 'success',
                    'message_id': 'mock_msg_' + str(hash(title + body))[:8],
                    'device_token': device_token,
                    'title': title,
                    'body': body,
                    'data': data,
                    'mock': True
                }
            
            # Send actual push notification via FCM
            result = self.fcm.notify_single_device(
                registration_id=device_token,
                message_title=title,
                message_body=body,
                data_message=data,
                **kwargs
            )
            
            if result.get('success') == 1:
                logger.info(f"Push notification sent successfully to {device_token[:10]}...")
                return {
                    'status': 'success',
                    'message_id': result.get('message_id'),
                    'device_token': device_token,
                    'title': title,
                    'body': body,
                    'data': data,
                    'mock': False
                }
            else:
                error_msg = result.get('results', [{}])[0].get('error', 'Unknown error')
                logger.error(f"Push notification failed for {device_token[:10]}...: {error_msg}")
                return {
                    'status': 'failed',
                    'error': error_msg,
                    'device_token': device_token,
                    'title': title,
                    'body': body,
                    'data': data
                }
                
        except Exception as e:
            logger.error(f"Error sending push notification to {device_token[:10]}...: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'device_token': device_token,
                'title': title,
                'body': body,
                'data': data
            }
    
    def send_bulk_push_notification(
        self, 
        device_tokens: List[str], 
        title: str, 
        body: str, 
        data: Optional[Dict] = None
    ) -> Dict:
        """
        Send push notification to multiple devices
        
        Args:
            device_tokens: List of FCM device registration tokens
            title: Notification title
            body: Notification body
            data: Additional data payload
        
        Returns:
            Dict with overall status and individual results
        """
        if not self.fcm:
            # Mock mode
            logger.info(f"[MOCK BULK PUSH] {len(device_tokens)} devices, Title: {title}")
            return {
                'status': 'success',
                'total_sent': len(device_tokens),
                'success_count': len(device_tokens),
                'failed_count': 0,
                'mock': True
            }
        
        try:
            result = self.fcm.notify_multiple_devices(
                registration_ids=device_tokens,
                message_title=title,
                message_body=body,
                data_message=data
            )
            
            success_count = result.get('success', 0)
            failed_count = result.get('failure', 0)
            
            logger.info(f"Bulk push notification completed: {success_count} success, {failed_count} failed")
            
            return {
                'status': 'completed',
                'total_sent': len(device_tokens),
                'success_count': success_count,
                'failed_count': failed_count,
                'results': result.get('results', []),
                'mock': False
            }
            
        except Exception as e:
            logger.error(f"Error sending bulk push notification: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'total_sent': len(device_tokens),
                'success_count': 0,
                'failed_count': len(device_tokens)
            }


# Service instances
sms_service = SMSService()
push_notification_service = PushNotificationService()