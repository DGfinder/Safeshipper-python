from django.db.models.signals import post_save, post_delete, pre_save
from django.db import models
from django.dispatch import receiver
from django.utils import timezone
from celery import shared_task
import logging

from shipments.models import Shipment
from documents.models import Document
from audits.models import ComplianceAuditLog
from inspections.models import Inspection
from training.models import TrainingRecord
from .models import WebhookEndpoint, WebhookDelivery
from .utils import send_webhook

logger = logging.getLogger(__name__)


@shared_task
def send_webhook_async(webhook_id, event_type, event_data):
    """Async task to send webhook notifications"""
    try:
        webhook = WebhookEndpoint.objects.get(id=webhook_id)
        result = send_webhook(webhook, event_type, event_data)
        logger.info(f"Webhook sent: {event_type} to {webhook.name} - {result['status']}")
        return result
    except Exception as e:
        logger.error(f"Failed to send webhook {webhook_id}: {str(e)}")
        raise


def trigger_webhook_event(event_type, event_data):
    """Trigger webhook event for all matching endpoints"""
    # Find webhooks that should receive this event
    webhooks = WebhookEndpoint.objects.filter(
        status='active'
    ).filter(
        models.Q(event_types__contains=[event_type]) |
        models.Q(event_types__contains=['*'])
    )
    
    for webhook in webhooks:
        # Apply filters if configured
        if webhook.filters:
            if not _passes_filters(event_data, webhook.filters):
                continue
        
        # Send webhook asynchronously
        send_webhook_async.delay(str(webhook.id), event_type, event_data)


def _passes_filters(event_data, filters):
    """Check if event data passes webhook filters"""
    for key, expected_value in filters.items():
        if key not in event_data:
            return False
        
        actual_value = event_data[key]
        
        # Support different filter types
        if isinstance(expected_value, list):
            if actual_value not in expected_value:
                return False
        elif isinstance(expected_value, dict):
            # Range filters, etc.
            if 'min' in expected_value and actual_value < expected_value['min']:
                return False
            if 'max' in expected_value and actual_value > expected_value['max']:
                return False
        else:
            if actual_value != expected_value:
                return False
    
    return True


# Shipment webhook events
@receiver(post_save, sender=Shipment)
def shipment_webhook_handler(sender, instance, created, **kwargs):
    """Handle shipment-related webhook events"""
    if created:
        event_data = {
            'shipment_id': str(instance.id),
            'tracking_number': instance.tracking_number,
            'reference_number': instance.reference_number,
            'status': instance.status,
            'customer_id': str(instance.customer.id) if instance.customer else None,
            'carrier_id': str(instance.carrier.id) if instance.carrier else None,
            'origin_location': instance.origin_location,
            'destination_location': instance.destination_location,
            'created_at': instance.created_at.isoformat()
        }
        trigger_webhook_event('shipment.created', event_data)
    else:
        # Check if status changed
        if hasattr(instance, '_state') and instance._state.adding is False:
            try:
                old_instance = Shipment.objects.get(id=instance.id)
                if old_instance.status != instance.status:
                    event_data = {
                        'shipment_id': str(instance.id),
                        'tracking_number': instance.tracking_number,
                        'old_status': old_instance.status,
                        'new_status': instance.status,
                        'updated_at': instance.updated_at.isoformat()
                    }
                    trigger_webhook_event('shipment.status_changed', event_data)
                    
                    # Special event for delivered shipments
                    if instance.status == 'DELIVERED':
                        event_data['delivered_at'] = instance.updated_at.isoformat()
                        trigger_webhook_event('shipment.delivered', event_data)
            except Shipment.DoesNotExist:
                pass


# Document webhook events
@receiver(post_save, sender=Document)
def document_webhook_handler(sender, instance, created, **kwargs):
    """Handle document-related webhook events"""
    if not created and instance.status in ['VALIDATED', 'VALIDATED_WITH_ERRORS']:
        event_data = {
            'document_id': str(instance.id),
            'shipment_id': str(instance.shipment.id) if instance.shipment else None,
            'document_type': instance.document_type,
            'validation_status': instance.status,
            'original_filename': instance.original_filename,
            'validated_at': instance.updated_at.isoformat()
        }
        
        if instance.status == 'VALIDATED_WITH_ERRORS':
            event_data['errors'] = instance.validation_errors
        
        trigger_webhook_event('document.validated', event_data)


# Audit/Compliance webhook events
@receiver(post_save, sender=ComplianceAuditLog)
def compliance_audit_webhook_handler(sender, instance, created, **kwargs):
    """Handle compliance audit webhook events"""
    if created and instance.compliance_status == 'NON_COMPLIANT':
        event_data = {
            'audit_id': str(instance.id),
            'regulation_type': instance.regulation_type,
            'violation_severity': instance.violation_severity,
            'compliance_status': instance.compliance_status,
            'findings': instance.findings,
            'recommendations': instance.recommendations,
            'created_at': instance.created_at.isoformat()
        }
        trigger_webhook_event('audit.compliance_violation', event_data)


# Inspection webhook events
@receiver(post_save, sender=Inspection)
def inspection_webhook_handler(sender, instance, created, **kwargs):
    """Handle inspection webhook events"""
    if not created and instance.status == 'COMPLETED':
        event_data = {
            'inspection_id': str(instance.id),
            'shipment_id': str(instance.shipment.id),
            'inspector_id': str(instance.inspector.id),
            'inspection_type': instance.inspection_type,
            'overall_result': instance.overall_result,
            'completed_at': instance.completed_at.isoformat() if instance.completed_at else None,
            'notes': instance.notes
        }
        
        if instance.overall_result == 'FAIL':
            # Include failed items
            failed_items = []
            for item in instance.items.filter(result='FAIL'):
                failed_items.append({
                    'description': item.description,
                    'category': item.category,
                    'corrective_action': item.corrective_action
                })
            event_data['failed_items'] = failed_items
            
            trigger_webhook_event('inspection.failed', event_data)
        else:
            trigger_webhook_event('inspection.completed', event_data)


# Training webhook events
@receiver(post_save, sender=TrainingRecord)
def training_record_webhook_handler(sender, instance, created, **kwargs):
    """Handle training record webhook events"""
    if not created and hasattr(instance, '_status_changed'):
        if instance.status == 'expired':
            event_data = {
                'record_id': str(instance.id),
                'employee_id': str(instance.employee.id),
                'employee_name': instance.employee.get_full_name(),
                'program_id': str(instance.program.id),
                'program_name': instance.program.name,
                'certificate_number': instance.certificate_number,
                'expired_at': instance.certificate_expires_at.isoformat() if instance.certificate_expires_at else None,
                'updated_at': instance.updated_at.isoformat()
            }
            trigger_webhook_event('training.certification_expired', event_data)


# Monitor status changes for training records
@receiver(pre_save, sender=TrainingRecord)
def training_record_status_monitor(sender, instance, **kwargs):
    """Monitor training record status changes"""
    if instance.pk:
        try:
            old_instance = TrainingRecord.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                instance._status_changed = True
        except TrainingRecord.DoesNotExist:
            pass


# Webhook delivery retry mechanism
@receiver(post_save, sender=WebhookDelivery)
def webhook_retry_handler(sender, instance, created, **kwargs):
    """Handle webhook delivery retries"""
    if not created and instance.status == 'failed':
        if instance.attempt_count < instance.max_attempts:
            # Schedule retry
            from datetime import timedelta
            
            retry_delay = instance.webhook.retry_delay_seconds
            next_attempt_time = timezone.now() + timedelta(seconds=retry_delay)
            
            # Create new delivery for retry
            WebhookDelivery.objects.create(
                webhook=instance.webhook,
                event_type=instance.event_type,
                event_id=instance.event_id,
                payload=instance.payload,
                max_attempts=instance.max_attempts,
                scheduled_for=next_attempt_time
            )


# API key usage monitoring
@receiver(post_save, sender='api_gateway.APIUsageLog')
def api_usage_monitoring(sender, instance, created, **kwargs):
    """Monitor API usage for alerts and quotas"""
    if created:
        api_key = instance.api_key
        
        # Check if API key is approaching rate limits
        from django.core.cache import cache
        import time
        
        current_hour = int(time.time() // 3600)
        cache_key = f"api_rate_limit:{api_key.id}"
        usage_data = cache.get(cache_key, {})
        current_usage = usage_data.get(str(current_hour), 0)
        
        # Send warning webhook at 80% of rate limit
        warning_threshold = api_key.rate_limit * 0.8
        if current_usage >= warning_threshold:
            event_data = {
                'api_key_id': str(api_key.id),
                'api_key_name': api_key.name,
                'current_usage': current_usage,
                'rate_limit': api_key.rate_limit,
                'usage_percentage': (current_usage / api_key.rate_limit) * 100,
                'reset_time': (current_hour + 1) * 3600
            }
            trigger_webhook_event('api.rate_limit_warning', event_data)


# System health monitoring
@shared_task
def system_health_webhook():
    """Send periodic system health updates"""
    from .utils import get_system_health
    
    health_data = get_system_health()
    
    # Only send webhook if system is not healthy
    if health_data['status'] != 'healthy':
        trigger_webhook_event('system.health_status', health_data)


# Cleanup old webhook deliveries
@shared_task
def cleanup_webhook_deliveries():
    """Clean up old webhook delivery records"""
    from datetime import timedelta
    
    cutoff_date = timezone.now() - timedelta(days=30)
    
    deleted_count = WebhookDelivery.objects.filter(
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Cleaned up {deleted_count} old webhook delivery records")
    
    return deleted_count