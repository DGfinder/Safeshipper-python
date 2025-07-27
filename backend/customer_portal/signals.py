from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from audits.models import AuditLog
from .models import (
    CustomerProfile, SelfServiceRequest, CustomerNotification,
    CustomerFeedback, PortalUsageAnalytics
)

User = get_user_model()


@receiver(post_save, sender=CustomerProfile)
def log_customer_profile_changes(sender, instance, created, **kwargs):
    """Log customer profile changes"""
    action = 'created' if created else 'updated'
    
    AuditLog.log_action(
        user=instance.user,
        action=f'customer_profile_{action}',
        target_model='CustomerProfile',
        target_id=str(instance.id),
        description=f'Customer profile {action} for {instance.user.get_full_name()}',
        metadata={
            'customer_id': str(instance.id),
            'user_id': str(instance.user.id),
            'company_id': str(instance.company.id),
            'company_name': instance.company.name,
            'preferred_contact_method': instance.preferred_contact_method,
            'dashboard_layout': instance.dashboard_layout,
        }
    )


@receiver(post_save, sender=SelfServiceRequest)
def log_self_service_request_changes(sender, instance, created, **kwargs):
    """Log self-service request changes"""
    action = 'created' if created else 'updated'
    
    AuditLog.log_action(
        user=instance.customer_profile.user,
        action=f'self_service_request_{action}',
        target_model='SelfServiceRequest',
        target_id=str(instance.id),
        description=f'Self-service request {action}: {instance.title}',
        metadata={
            'request_type': instance.request_type,
            'priority': instance.priority,
            'status': instance.status,
            'customer_id': str(instance.customer_profile.id),
            'shipment_id': str(instance.shipment.id) if instance.shipment else None,
            'assigned_to': str(instance.assigned_to.id) if instance.assigned_to else None,
        }
    )


@receiver(post_save, sender=CustomerNotification)
def log_customer_notification_changes(sender, instance, created, **kwargs):
    """Log customer notification changes"""
    if created:
        AuditLog.log_action(
            user=None,  # System-generated
            action='customer_notification_created',
            target_model='CustomerNotification',
            target_id=str(instance.id),
            description=f'Customer notification sent: {instance.title}',
            metadata={
                'notification_type': instance.notification_type,
                'priority': instance.priority,
                'customer_id': str(instance.customer_profile.id),
                'shipment_id': str(instance.shipment.id) if instance.shipment else None,
                'delivered_via': instance.delivered_via,
            }
        )
    else:
        # Log when notifications are read
        if instance.read_at and not getattr(instance, '_read_logged', False):
            AuditLog.log_action(
                user=instance.customer_profile.user,
                action='customer_notification_read',
                target_model='CustomerNotification',
                target_id=str(instance.id),
                description=f'Customer notification read: {instance.title}',
                metadata={
                    'notification_type': instance.notification_type,
                    'customer_id': str(instance.customer_profile.id),
                    'read_at': instance.read_at.isoformat(),
                }
            )
            instance._read_logged = True


@receiver(post_save, sender=CustomerFeedback)
def log_customer_feedback_changes(sender, instance, created, **kwargs):
    """Log customer feedback changes"""
    action = 'created' if created else 'updated'
    
    AuditLog.log_action(
        user=instance.customer_profile.user,
        action=f'customer_feedback_{action}',
        target_model='CustomerFeedback',
        target_id=str(instance.id),
        description=f'Customer feedback {action}: {instance.title}',
        metadata={
            'feedback_type': instance.feedback_type,
            'rating': instance.rating,
            'customer_id': str(instance.customer_profile.id),
            'shipment_id': str(instance.shipment.id) if instance.shipment else None,
            'service_request_id': str(instance.service_request.id) if instance.service_request else None,
            'follow_up_required': instance.follow_up_required,
        }
    )


@receiver(post_save, sender=PortalUsageAnalytics)
def log_portal_usage_analytics(sender, instance, created, **kwargs):
    """Log portal usage for analytics tracking"""
    if created:
        # Only log significant actions, not every page view
        significant_actions = [
            'shipment_created', 'quote_requested', 'feedback_submitted',
            'self_service_request_created', 'document_downloaded'
        ]
        
        if instance.action_type in significant_actions:
            AuditLog.log_action(
                user=instance.customer_profile.user,
                action='portal_usage_tracked',
                target_model='PortalUsageAnalytics',
                target_id=str(instance.id),
                description=f'Portal usage tracked: {instance.action_type}',
                metadata={
                    'action_type': instance.action_type,
                    'page_url': instance.page_url,
                    'customer_id': str(instance.customer_profile.id),
                    'duration_seconds': instance.duration_seconds,
                }
            )


@receiver(post_save, sender=User)
def create_customer_profile_for_customer_users(sender, instance, created, **kwargs):
    """Automatically create customer profile for customer users"""
    if created and hasattr(instance, 'role') and instance.role == 'customer':
        # Check if customer profile already exists
        if not hasattr(instance, 'customer_profile'):
            # We need to determine the company for the customer
            # This should be handled by the user creation process
            pass  # Implementation depends on how companies are assigned to users