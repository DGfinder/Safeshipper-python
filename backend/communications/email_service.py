# communications/email_service.py
import logging
from typing import Dict, List, Optional, Union
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth import get_user_model
import os

logger = logging.getLogger(__name__)
User = get_user_model()


class EmailService:
    """Service for sending emails with templates and production-ready features"""
    
    def __init__(self):
        """Initialize email service"""
        self.from_email = settings.DEFAULT_FROM_EMAIL
        self.is_production = not settings.DEBUG
    
    def send_email(
        self,
        recipient: Union[str, List[str]],
        subject: str,
        message: str,
        html_message: Optional[str] = None,
        from_email: Optional[str] = None,
        attachments: Optional[List] = None,
        **kwargs
    ) -> Dict:
        """
        Send email with enhanced features
        
        Args:
            recipient: Email address(es) - string or list
            subject: Email subject
            message: Plain text message
            html_message: HTML message (optional)
            from_email: Sender email (optional, uses default)
            attachments: List of file attachments
            **kwargs: Additional email parameters
        
        Returns:
            Dict with status and details
        """
        try:
            # Normalize recipient to list
            if isinstance(recipient, str):
                recipient_list = [recipient]
            else:
                recipient_list = recipient
            
            # Validate recipients
            if not recipient_list:
                return {
                    'status': 'failed',
                    'error': 'No recipients provided',
                    'error_type': 'validation_error'
                }
            
            sender_email = from_email or self.from_email
            
            # Use EmailMultiAlternatives for advanced features
            if html_message or attachments:
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=message,
                    from_email=sender_email,
                    to=recipient_list
                )
                
                if html_message:
                    email.attach_alternative(html_message, "text/html")
                
                if attachments:
                    for attachment in attachments:
                        if isinstance(attachment, dict):
                            # Attachment as dict with filename, content, mimetype
                            email.attach(
                                attachment['filename'],
                                attachment['content'],
                                attachment.get('mimetype')
                            )
                        elif isinstance(attachment, tuple):
                            # Attachment as tuple (filename, content, mimetype)
                            email.attach(*attachment)
                        else:
                            # File path
                            email.attach_file(attachment)
                
                result = email.send()
            else:
                # Simple email
                result = send_mail(
                    subject=subject,
                    message=message,
                    from_email=sender_email,
                    recipient_list=recipient_list,
                    html_message=html_message,
                    fail_silently=False,
                    **kwargs
                )
            
            if result:
                logger.info(f"Email sent successfully to {len(recipient_list)} recipients")
                return {
                    'status': 'success',
                    'recipients': recipient_list,
                    'subject': subject,
                    'sent_count': len(recipient_list)
                }
            else:
                logger.error(f"Failed to send email to {recipient_list}")
                return {
                    'status': 'failed',
                    'error': 'Email sending failed',
                    'recipients': recipient_list
                }
                
        except Exception as e:
            logger.error(f"Email service error: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'error_type': 'email_error',
                'recipients': recipient_list if 'recipient_list' in locals() else []
            }
    
    def send_template_email(
        self,
        recipient: Union[str, List[str]],
        template_name: str,
        context: Dict,
        subject: str,
        from_email: Optional[str] = None
    ) -> Dict:
        """
        Send email using Django templates
        
        Args:
            recipient: Email address(es)
            template_name: Template file name (without .html)
            context: Template context data
            subject: Email subject
            from_email: Sender email (optional)
        
        Returns:
            Dict with status and details
        """
        try:
            # Render HTML template
            html_template_path = f'emails/{template_name}.html'
            text_template_path = f'emails/{template_name}.txt'
            
            try:
                html_message = render_to_string(html_template_path, context)
            except Exception:
                html_message = None
                logger.warning(f"HTML template {html_template_path} not found")
            
            try:
                text_message = render_to_string(text_template_path, context)
            except Exception:
                # Generate text from HTML if text template doesn't exist
                if html_message:
                    text_message = strip_tags(html_message)
                else:
                    text_message = "Please enable HTML email to view this message."
                logger.warning(f"Text template {text_template_path} not found, using HTML fallback")
            
            return self.send_email(
                recipient=recipient,
                subject=subject,
                message=text_message,
                html_message=html_message,
                from_email=from_email
            )
            
        except Exception as e:
            logger.error(f"Template email error: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'error_type': 'template_error'
            }
    
    def send_welcome_email(self, user: User) -> Dict:
        """Send welcome email to new user"""
        context = {
            'user': user,
            'company_name': 'SafeShipper',
            'login_url': f"{settings.FRONTEND_URL}/login" if hasattr(settings, 'FRONTEND_URL') else '/login',
            'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@safeshipper.com')
        }
        
        return self.send_template_email(
            recipient=user.email,
            template_name='welcome',
            context=context,
            subject='Welcome to SafeShipper!'
        )
    
    def send_password_reset_email(self, user: User, reset_token: str) -> Dict:
        """Send password reset email"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        context = {
            'user': user,
            'reset_url': reset_url,
            'company_name': 'SafeShipper',
            'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@safeshipper.com'),
            'expiry_hours': 24
        }
        
        return self.send_template_email(
            recipient=user.email,
            template_name='password_reset',
            context=context,
            subject='SafeShipper Password Reset'
        )
    
    def send_shipment_notification(self, user: User, shipment_data: Dict) -> Dict:
        """Send shipment status notification"""
        context = {
            'user': user,
            'shipment': shipment_data,
            'tracking_url': f"{getattr(settings, 'FRONTEND_URL', '')}/track/{shipment_data.get('tracking_number')}",
            'company_name': 'SafeShipper'
        }
        
        status = shipment_data.get('status', 'updated').lower()
        subject_map = {
            'pending': 'Shipment Created',
            'in_transit': 'Shipment In Transit',
            'delivered': 'Shipment Delivered',
            'delayed': 'Shipment Delayed'
        }
        
        subject = f"SafeShipper: {subject_map.get(status, 'Shipment Updated')}"
        
        return self.send_template_email(
            recipient=user.email,
            template_name='shipment_notification',
            context=context,
            subject=subject
        )
    
    def send_emergency_alert(self, recipients: List[str], alert_data: Dict) -> Dict:
        """Send emergency alert email"""
        context = {
            'alert': alert_data,
            'company_name': 'SafeShipper',
            'emergency_contact': getattr(settings, 'EMERGENCY_CONTACT', '+1-800-SAFESHIPPER')
        }
        
        return self.send_template_email(
            recipient=recipients,
            template_name='emergency_alert',
            context=context,
            subject=f"🚨 EMERGENCY ALERT: {alert_data.get('type', 'Safety Incident')}"
        )
    
    def send_bulk_email(
        self,
        recipients: List[str],
        subject: str,
        message: str,
        html_message: Optional[str] = None,
        batch_size: int = 50
    ) -> Dict:
        """
        Send bulk email with batching for better performance
        
        Args:
            recipients: List of email addresses
            subject: Email subject
            message: Plain text message
            html_message: HTML message (optional)
            batch_size: Number of emails per batch
        
        Returns:
            Dict with overall status and batch results
        """
        total_recipients = len(recipients)
        batch_results = []
        success_count = 0
        failed_count = 0
        
        # Process in batches
        for i in range(0, total_recipients, batch_size):
            batch = recipients[i:i + batch_size]
            
            try:
                result = self.send_email(
                    recipient=batch,
                    subject=subject,
                    message=message,
                    html_message=html_message
                )
                
                batch_results.append({
                    'batch_index': i // batch_size,
                    'batch_size': len(batch),
                    'result': result
                })
                
                if result['status'] == 'success':
                    success_count += len(batch)
                else:
                    failed_count += len(batch)
                    
            except Exception as e:
                logger.error(f"Batch email error for batch {i//batch_size}: {e}")
                batch_results.append({
                    'batch_index': i // batch_size,
                    'batch_size': len(batch),
                    'result': {
                        'status': 'failed',
                        'error': str(e)
                    }
                })
                failed_count += len(batch)
        
        return {
            'status': 'completed',
            'total_recipients': total_recipients,
            'success_count': success_count,
            'failed_count': failed_count,
            'batch_results': batch_results
        }


# Service instance
email_service = EmailService()