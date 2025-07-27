from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from audits.models import AuditLog
from .models import ERPSystem, DataSyncJob, ERPEventLog


@receiver(post_save, sender=ERPSystem)
def log_erp_system_changes(sender, instance, created, **kwargs):
    """Log ERP system configuration changes"""
    action = 'created' if created else 'updated'
    
    AuditLog.log_action(
        action_type='CREATE' if created else 'UPDATE',
        description=f'ERP System {action}: {instance.name}',
        user=getattr(instance, '_current_user', None),
        content_object=instance,
        metadata={
            'erp_system_name': instance.name,
            'system_type': instance.system_type,
            'connection_type': instance.connection_type,
            'status': instance.status,
            'company_id': str(instance.company.id),
            'company_name': instance.company.name,
        }
    )


@receiver(post_delete, sender=ERPSystem)
def log_erp_system_deletion(sender, instance, **kwargs):
    """Log ERP system deletion"""
    AuditLog.log_action(
        action_type='DELETE',
        description=f'ERP System deleted: {instance.name}',
        user=getattr(instance, '_current_user', None),
        content_object=instance,
        metadata={
            'erp_system_name': instance.name,
            'system_type': instance.system_type,
            'connection_type': instance.connection_type,
            'company_id': str(instance.company.id),
            'company_name': instance.company.name,
        }
    )


@receiver(post_save, sender=DataSyncJob)
def log_sync_job_changes(sender, instance, created, **kwargs):
    """Log sync job status changes"""
    if created:
        AuditLog.log_action(
            action_type='CREATE',
            description=f'Sync job created for {instance.erp_system.name}',
            user=instance.initiated_by,
            content_object=instance,
            metadata={
                'erp_system_name': instance.erp_system.name,
                'endpoint_name': instance.endpoint.name,
                'job_type': instance.job_type,
                'direction': instance.direction,
                'status': instance.status,
            }
        )
    else:
        # Log status changes
        AuditLog.log_action(
            action_type='UPDATE',
            description=f'Sync job updated: {instance.status}',
            user=instance.initiated_by,
            content_object=instance,
            metadata={
                'erp_system_name': instance.erp_system.name,
                'endpoint_name': instance.endpoint.name,
                'job_type': instance.job_type,
                'direction': instance.direction,
                'status': instance.status,
                'records_processed': instance.records_processed,
                'records_successful': instance.records_successful,
                'records_failed': instance.records_failed,
            }
        )


@receiver(post_save, sender=ERPEventLog)
def trigger_notifications_on_errors(sender, instance, created, **kwargs):
    """Trigger notifications for critical ERP events"""
    if created and instance.severity in ['error', 'critical']:
        # Here you could trigger notifications to administrators
        # For now, we'll just log it
        AuditLog.log_action(
            action_type='CREATE',
            description=f'ERP Error logged: {instance.message}',
            user=instance.user,
            content_object=instance,
            metadata={
                'erp_system_name': instance.erp_system.name,
                'event_type': instance.event_type,
                'severity': instance.severity,
                'message': instance.message,
                'sync_job_id': str(instance.sync_job.id) if instance.sync_job else None,
            }
        )