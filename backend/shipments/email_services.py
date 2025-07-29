# shipments/email_services.py
"""
Email services for automated customer feedback solicitation.
Sends professional, branded emails to customers after delivery completion.
"""

import logging
from typing import Optional, Dict, Any
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Shipment, ShipmentFeedback
from companies.models import Company

logger = logging.getLogger(__name__)


class FeedbackEmailService:
    """Service for sending automated feedback request emails to customers."""
    
    @staticmethod
    def should_send_feedback_request(shipment: Shipment) -> bool:
        """
        Determine if a feedback request should be sent for this shipment.
        
        Rules:
        - Shipment must be DELIVERED
        - No existing feedback
        - Delivered within last 7 days (not too old)
        - Delivered at least 2 hours ago (allow time for customer to receive)
        """
        if shipment.status != 'DELIVERED':
            return False
            
        if hasattr(shipment, 'customer_feedback'):
            return False  # Already has feedback
            
        if not shipment.actual_delivery_date:
            return False  # No delivery date recorded
            
        now = timezone.now()
        delivery_date = shipment.actual_delivery_date
        
        # Must be delivered at least 2 hours ago
        min_wait_time = delivery_date + timedelta(hours=2)
        if now < min_wait_time:
            return False
            
        # Must be delivered within last 7 days
        max_age = delivery_date + timedelta(days=7)
        if now > max_age:
            return False
            
        return True
    
    @staticmethod
    def get_feedback_url(shipment: Shipment) -> str:
        """Generate the public tracking URL with feedback section."""
        base_url = getattr(settings, 'FRONTEND_BASE_URL', 'https://app.safeshipper.com')
        return f"{base_url}/track/{shipment.tracking_number}#feedback"
    
    @staticmethod
    def get_email_context(shipment: Shipment) -> Dict[str, Any]:
        """Build context data for email template."""
        feedback_url = FeedbackEmailService.get_feedback_url(shipment)
        
        # Get POD details if available
        pod_info = {}
        if hasattr(shipment, 'proof_of_delivery'):
            pod = shipment.proof_of_delivery
            pod_info = {
                'delivered_at': pod.delivered_at,
                'recipient_name': pod.recipient_name,
                'delivered_by': f"{pod.delivered_by.first_name} {pod.delivered_by.last_name}".strip()
            }
        
        return {
            'shipment': shipment,
            'tracking_number': shipment.tracking_number,
            'feedback_url': feedback_url,
            'pod_info': pod_info,
            'company_name': shipment.carrier.name,
            'customer_company': shipment.customer.name,
            'delivery_date': shipment.actual_delivery_date,
            'current_year': timezone.now().year,
        }
    
    @staticmethod
    def send_feedback_request_email(shipment: Shipment, customer_email: str) -> bool:
        """
        Send feedback request email to customer.
        
        Args:
            shipment: The delivered shipment
            customer_email: Customer's email address
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Check if we should send the email
            if not FeedbackEmailService.should_send_feedback_request(shipment):
                logger.info(f"Skipping feedback email for shipment {shipment.tracking_number} - conditions not met")
                return False
            
            # Build email context
            context = FeedbackEmailService.get_email_context(shipment)
            
            # Render email templates
            subject = f"How was your delivery? - {shipment.tracking_number}"
            
            # HTML email content
            html_content = render_to_string('emails/feedback_request.html', context)
            
            # Plain text fallback
            text_content = render_to_string('emails/feedback_request.txt', context)
            
            # Create email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@safeshipper.com'),
                to=[customer_email],
                headers={
                    'X-SafeShipper-Type': 'feedback-request',
                    'X-SafeShipper-Tracking': shipment.tracking_number,
                }
            )
            
            # Attach HTML version
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send()
            
            logger.info(f"Feedback request email sent successfully for shipment {shipment.tracking_number} to {customer_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send feedback email for shipment {shipment.tracking_number}: {str(e)}")
            return False
    
    @staticmethod
    def send_feedback_confirmation_email(shipment: Shipment, feedback: ShipmentFeedback, customer_email: str) -> bool:
        """
        Send confirmation email after customer submits feedback.
        
        Args:
            shipment: The shipment that received feedback
            feedback: The submitted feedback
            customer_email: Customer's email address
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            context = {
                'shipment': shipment,
                'feedback': feedback,
                'tracking_number': shipment.tracking_number,
                'company_name': shipment.carrier.name,
                'customer_company': shipment.customer.name,
                'success_score': feedback.delivery_success_score,
                'feedback_summary': feedback.get_feedback_summary(),
                'current_year': timezone.now().year,
            }
            
            subject = f"Thank you for your feedback - {shipment.tracking_number}"
            
            # HTML email content
            html_content = render_to_string('emails/feedback_confirmation.html', context)
            
            # Plain text fallback
            text_content = render_to_string('emails/feedback_confirmation.txt', context)
            
            # Create email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@safeshipper.com'),
                to=[customer_email],
                headers={
                    'X-SafeShipper-Type': 'feedback-confirmation',
                    'X-SafeShipper-Tracking': shipment.tracking_number,
                }
            )
            
            # Attach HTML version
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send()
            
            logger.info(f"Feedback confirmation email sent successfully for shipment {shipment.tracking_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send feedback confirmation email for shipment {shipment.tracking_number}: {str(e)}")
            return False


class FeedbackBatchProcessor:
    """Batch processor for sending feedback requests to multiple shipments."""
    
    @staticmethod  
    def get_eligible_shipments() -> list:
        """Get all shipments eligible for feedback requests."""
        # Get delivered shipments from the last 7 days without feedback
        seven_days_ago = timezone.now() - timedelta(days=7)
        two_hours_ago = timezone.now() - timedelta(hours=2)
        
        eligible_shipments = Shipment.objects.filter(
            status='DELIVERED',
            actual_delivery_date__gte=seven_days_ago,
            actual_delivery_date__lte=two_hours_ago,
        ).exclude(
            # Exclude shipments that already have feedback
            id__in=ShipmentFeedback.objects.values_list('shipment_id', flat=True)
        ).select_related(
            'customer', 'carrier', 'proof_of_delivery'
        )
        
        return list(eligible_shipments)
    
    @staticmethod
    def process_feedback_requests(dry_run: bool = False) -> Dict[str, Any]:
        """
        Process all eligible shipments and send feedback requests.
        
        Args:
            dry_run: If True, don't actually send emails, just return what would be sent
            
        Returns:
            Dict with processing results
        """
        eligible_shipments = FeedbackBatchProcessor.get_eligible_shipments()
        
        results = {
            'total_eligible': len(eligible_shipments),
            'emails_sent': 0,
            'emails_failed': 0,
            'emails_skipped': 0,
            'dry_run': dry_run,
            'processed_shipments': []
        }
        
        for shipment in eligible_shipments:
            # Try to get customer email from various sources
            customer_email = FeedbackBatchProcessor.get_customer_email(shipment)
            
            if not customer_email:
                results['emails_skipped'] += 1
                results['processed_shipments'].append({
                    'tracking_number': shipment.tracking_number,
                    'status': 'skipped',
                    'reason': 'No customer email found'
                })
                continue
            
            if dry_run:
                results['emails_sent'] += 1
                results['processed_shipments'].append({
                    'tracking_number': shipment.tracking_number,
                    'customer_email': customer_email,
                    'status': 'would_send',
                    'reason': 'Dry run mode'
                })
                continue
            
            # Send the email
            success = FeedbackEmailService.send_feedback_request_email(shipment, customer_email)
            
            if success:
                results['emails_sent'] += 1
                results['processed_shipments'].append({
                    'tracking_number': shipment.tracking_number,
                    'customer_email': customer_email,
                    'status': 'sent',
                    'reason': 'Email sent successfully'
                })
            else:
                results['emails_failed'] += 1
                results['processed_shipments'].append({
                    'tracking_number': shipment.tracking_number,
                    'customer_email': customer_email,
                    'status': 'failed',
                    'reason': 'Email sending failed'
                })
        
        logger.info(f"Feedback batch processing completed: {results['emails_sent']} sent, "
                   f"{results['emails_failed']} failed, {results['emails_skipped']} skipped")
        
        return results
    
    @staticmethod
    def get_customer_email(shipment: Shipment) -> Optional[str]:
        """
        Extract customer email from shipment data.
        
        Priority order:
        1. Shipment-specific customer contact
        2. Customer company primary contact
        3. Requested by user email
        """
        # Check if shipment has specific customer contact info
        if hasattr(shipment, 'customer_contact_email') and shipment.customer_contact_email:
            return shipment.customer_contact_email
        
        # Check customer company for primary contact
        if shipment.customer and hasattr(shipment.customer, 'primary_contact_email'):
            return shipment.customer.primary_contact_email
        
        # Fallback to the user who requested the shipment
        if shipment.requested_by and shipment.requested_by.email:
            return shipment.requested_by.email
        
        return None