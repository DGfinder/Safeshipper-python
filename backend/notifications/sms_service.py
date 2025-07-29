# notifications/sms_service.py

import logging
from django.conf import settings
from typing import Optional, Dict, List
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
import re

logger = logging.getLogger(__name__)


class TwilioSMSService:
    """
    Service for sending SMS notifications via Twilio.
    Handles critical alerts and emergency notifications for the SafeShipper feedback system.
    """
    
    def __init__(self):
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        self.from_number = getattr(settings, 'TWILIO_FROM_NUMBER', None)
        
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                self.enabled = True
                logger.info("Twilio SMS service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                self.client = None
                self.enabled = False
        else:
            logger.warning("Twilio credentials not configured - SMS service disabled")
            self.client = None
            self.enabled = False
    
    def is_valid_phone_number(self, phone_number: str) -> bool:
        """
        Validate phone number format.
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            bool: True if phone number is valid
        """
        if not phone_number:
            return False
        
        # Remove spaces, dashes, parentheses
        cleaned = re.sub(r'[\s\-\(\)]', '', phone_number)
        
        # Check if it starts with + and has 10-15 digits
        if cleaned.startswith('+'):
            return len(cleaned) >= 11 and len(cleaned) <= 16 and cleaned[1:].isdigit()
        
        # Check for 10-digit US numbers
        if len(cleaned) == 10 and cleaned.isdigit():
            return True
        
        # Check for 11-digit numbers starting with 1
        if len(cleaned) == 11 and cleaned.startswith('1') and cleaned[1:].isdigit():
            return True
        
        return False
    
    def format_phone_number(self, phone_number: str) -> str:
        """
        Format phone number to E.164 format for Twilio.
        
        Args:
            phone_number: Phone number to format
            
        Returns:
            str: Formatted phone number with country code
        """
        if not phone_number:
            return phone_number
        
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d\+]', '', phone_number)
        
        # If already in E.164 format, return as is
        if cleaned.startswith('+'):
            return cleaned
        
        # Add +1 for US/CA numbers
        if len(cleaned) == 10:
            return f'+1{cleaned}'
        elif len(cleaned) == 11 and cleaned.startswith('1'):
            return f'+{cleaned}'
        
        # Default to +61 for Australian numbers if in production
        if len(cleaned) == 10 and getattr(settings, 'DEFAULT_COUNTRY_CODE', None) == 'AU':
            return f'+61{cleaned}'
        
        return f'+1{cleaned}'  # Default to US
    
    def send_sms(
        self,
        to_number: str,
        message: str,
        from_number: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Send SMS message via Twilio.
        
        Args:
            to_number: Recipient phone number
            message: SMS message content
            from_number: Sender phone number (optional, uses default)
            
        Returns:
            Dict containing success status and message details
        """
        if not self.enabled:
            logger.warning("SMS service not enabled - skipping SMS send")
            return {
                'success': False,
                'error': 'SMS service not configured',
                'error_code': 'SERVICE_DISABLED'
            }
        
        # Validate phone number
        if not self.is_valid_phone_number(to_number):
            logger.error(f"Invalid phone number format: {to_number}")
            return {
                'success': False,
                'error': 'Invalid phone number format',
                'error_code': 'INVALID_PHONE_NUMBER'
            }
        
        # Format phone number
        formatted_to = self.format_phone_number(to_number)
        formatted_from = from_number or self.from_number
        
        # Validate message length (Twilio limit is 1600 characters)
        if len(message) > 1600:
            logger.warning(f"Message too long ({len(message)} chars), truncating")
            message = message[:1597] + '...'
        
        try:
            # Send SMS via Twilio
            twilio_message = self.client.messages.create(
                body=message,
                from_=formatted_from,
                to=formatted_to
            )
            
            logger.info(f"SMS sent successfully to {formatted_to}, SID: {twilio_message.sid}")
            
            return {
                'success': True,
                'message_sid': twilio_message.sid,
                'status': twilio_message.status,
                'to_number': formatted_to,
                'from_number': formatted_from,
                'message_length': len(message)
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {formatted_to}: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'TWILIO_ERROR'),
                'to_number': formatted_to
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {formatted_to}: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNKNOWN_ERROR',
                'to_number': formatted_to
            }
    
    def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message_template: str,
        from_number: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Send SMS to multiple recipients with personalized messages.
        
        Args:
            recipients: List of dicts with 'phone_number' and optional context data
            message_template: Message template with {variable} placeholders
            from_number: Sender phone number (optional)
            
        Returns:
            Dict with success/failure counts and detailed results
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'SMS service not configured',
                'sent_count': 0,
                'failed_count': len(recipients),
                'results': []
            }
        
        results = []
        sent_count = 0
        failed_count = 0
        
        for recipient in recipients:
            phone_number = recipient.get('phone_number')
            if not phone_number:
                failed_count += 1
                results.append({
                    'phone_number': 'N/A',
                    'success': False,
                    'error': 'Phone number not provided'
                })
                continue
            
            # Format personalized message
            try:
                personalized_message = message_template.format(**recipient)
            except KeyError as e:
                logger.warning(f"Missing template variable {e} for {phone_number}")
                personalized_message = message_template
            
            # Send SMS
            result = self.send_sms(phone_number, personalized_message, from_number)
            result['phone_number'] = phone_number
            results.append(result)
            
            if result['success']:
                sent_count += 1
            else:
                failed_count += 1
        
        return {
            'success': sent_count > 0,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total_recipients': len(recipients),
            'results': results
        }
    
    def get_message_status(self, message_sid: str) -> Dict[str, any]:
        """
        Get the delivery status of a sent message.
        
        Args:
            message_sid: Twilio message SID
            
        Returns:
            Dict with message status information
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'SMS service not configured'
            }
        
        try:
            message = self.client.messages(message_sid).fetch()
            
            return {
                'success': True,
                'sid': message.sid,
                'status': message.status,
                'error_code': message.error_code,
                'error_message': message.error_message,
                'date_sent': message.date_sent.isoformat() if message.date_sent else None,
                'date_updated': message.date_updated.isoformat() if message.date_updated else None,
                'price': message.price,
                'price_unit': message.price_unit
            }
            
        except TwilioException as e:
            logger.error(f"Error fetching message status for {message_sid}: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'TWILIO_ERROR')
            }
    
    def send_feedback_alert(
        self,
        phone_number: str,
        feedback_type: str,
        tracking_number: str,
        customer_name: str,
        score: int,
        manager_name: str
    ) -> Dict[str, any]:
        """
        Send feedback-specific SMS alert.
        
        Args:
            phone_number: Recipient phone number
            feedback_type: Type of feedback alert
            tracking_number: Shipment tracking number
            customer_name: Customer name
            score: Feedback score
            manager_name: Manager receiving the alert
            
        Returns:
            Dict with send result
        """
        message_templates = {
            'critical_feedback': (
                f"🚨 CRITICAL FEEDBACK ALERT\n"
                f"Score: {score}%\n"
                f"Shipment: {tracking_number}\n"
                f"Customer: {customer_name}\n"
                f"Immediate attention required.\n"
                f"Login to SafeShipper for details."
            ),
            'poor_feedback': (
                f"⚠️ Poor Feedback Alert\n"
                f"Score: {score}%\n"
                f"Shipment: {tracking_number}\n"
                f"Customer: {customer_name}\n"
                f"Please review and respond.\n"
                f"SafeShipper App"
            ),
            'incident_created': (
                f"🔴 Incident Created\n"
                f"Poor feedback ({score}%) resulted in automatic incident.\n"
                f"Shipment: {tracking_number}\n"
                f"Customer: {customer_name}\n"
                f"Check SafeShipper for incident details."
            ),
            'manager_response_needed': (
                f"📋 Manager Response Needed\n"
                f"Customer feedback requires your attention.\n"
                f"Score: {score}%\n"
                f"Shipment: {tracking_number}\n"
                f"Customer: {customer_name}\n"
                f"Please respond via SafeShipper."
            )
        }
        
        message = message_templates.get(feedback_type, 
            f"SafeShipper Alert: Feedback received ({score}%) for {tracking_number}. "
            f"Customer: {customer_name}. Check the app for details."
        )
        
        return self.send_sms(phone_number, message)
    
    def send_driver_feedback_alert(
        self,
        phone_number: str,
        tracking_number: str,
        customer_name: str,
        score: int,
        is_positive: bool
    ) -> Dict[str, any]:
        """
        Send feedback alert to driver.
        
        Args:
            phone_number: Driver's phone number
            tracking_number: Shipment tracking number
            customer_name: Customer name
            score: Feedback score
            is_positive: Whether feedback is positive
            
        Returns:
            Dict with send result
        """
        if is_positive:
            message = (
                f"⭐ Great job!\n"
                f"Customer gave you {score}% feedback\n"
                f"Delivery: {tracking_number}\n"
                f"Customer: {customer_name}\n"
                f"Keep up the excellent work!\n"
                f"SafeShipper Team"
            )
        else:
            message = (
                f"📝 Customer Feedback\n"
                f"Score: {score}%\n"
                f"Delivery: {tracking_number}\n"
                f"Customer: {customer_name}\n"
                f"Check SafeShipper app for details and improvement areas."
            )
        
        return self.send_sms(phone_number, message)


def send_critical_feedback_sms(phone_number: str, feedback_data: Dict) -> bool:
    """
    Convenience function to send critical feedback SMS.
    
    Args:
        phone_number: Recipient phone number
        feedback_data: Dict with feedback information
        
    Returns:
        bool: True if SMS sent successfully
    """
    sms_service = TwilioSMSService()
    
    result = sms_service.send_feedback_alert(
        phone_number=phone_number,
        feedback_type='critical_feedback',
        tracking_number=feedback_data.get('tracking_number', 'N/A'),
        customer_name=feedback_data.get('customer_name', 'N/A'),
        score=feedback_data.get('score', 0),
        manager_name=feedback_data.get('manager_name', 'Manager')
    )
    
    return result.get('success', False)


def send_incident_created_sms(phone_number: str, feedback_data: Dict) -> bool:
    """
    Convenience function to send incident created SMS.
    
    Args:
        phone_number: Recipient phone number
        feedback_data: Dict with feedback information
        
    Returns:
        bool: True if SMS sent successfully
    """
    sms_service = TwilioSMSService()
    
    result = sms_service.send_feedback_alert(
        phone_number=phone_number,
        feedback_type='incident_created',
        tracking_number=feedback_data.get('tracking_number', 'N/A'),
        customer_name=feedback_data.get('customer_name', 'N/A'),
        score=feedback_data.get('score', 0),
        manager_name=feedback_data.get('manager_name', 'Manager')
    )
    
    return result.get('success', False)