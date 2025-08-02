from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from .models import Incident, IncidentUpdate, IncidentDocument, CorrectiveAction
from audits.models import AuditLog, AuditActionType


@receiver(pre_save, sender=Incident)
def incident_pre_save_handler(sender, instance, **kwargs):
    """Handle incident pre-save operations"""
    if instance.pk:  # Existing incident
        try:
            old_instance = Incident.objects.get(pk=instance.pk)
            
            # Store old values for audit logging
            instance._audit_old_values = {
                'status': old_instance.status,
                'priority': old_instance.priority,
                'assigned_to_id': str(old_instance.assigned_to.id) if old_instance.assigned_to else None,
                'title': old_instance.title,
                'location': old_instance.location,
                'authority_notified': old_instance.authority_notified,
                'emergency_services_called': old_instance.emergency_services_called,
            }
            
            # Update timestamps based on status changes
            if old_instance.status != instance.status:
                if instance.status == 'resolved' and not instance.resolved_at:
                    instance.resolved_at = timezone.now()
                elif instance.status == 'closed' and not instance.closed_at:
                    instance.closed_at = timezone.now()
                
        except Incident.DoesNotExist:
            pass


@receiver(post_save, sender=Incident)
def incident_post_save_handler(sender, instance, created, **kwargs):
    """Create audit logs for incident changes"""
    user = getattr(instance, '_audit_user', None)
    ip_address = getattr(instance, '_audit_ip', None)
    
    if created:
        # Audit log for incident creation
        AuditLog.objects.create(
            action_type=AuditActionType.CREATE,
            action_description=f'Incident created: {instance.incident_number} - {instance.title}',
            user=user,
            user_role=user.role if user else None,
            content_object=instance,
            new_values={
                'incident_number': instance.incident_number,
                'title': instance.title,
                'priority': instance.priority,
                'status': instance.status,
                'location': instance.location,
                'reporter_id': str(instance.reporter.id) if instance.reporter else None,
                'assigned_to_id': str(instance.assigned_to.id) if instance.assigned_to else None,
                'company_id': str(instance.company.id) if instance.company else None,
            },
            ip_address=ip_address,
            additional_context={
                'incident_type': instance.incident_type.name,
                'occurred_at': instance.occurred_at.isoformat() if instance.occurred_at else None,
                'injuries_count': instance.injuries_count,
                'environmental_impact': instance.environmental_impact,
            }
        )
    else:
        # Audit log for incident updates
        old_values = getattr(instance, '_audit_old_values', {})
        new_values = {}
        changes = []
        
        # Check for specific changes
        if old_values.get('status') != instance.status:
            new_values['status'] = instance.status
            changes.append(f'Status: {old_values.get("status")} → {instance.status}')
            
            # Create specific audit log for status changes
            AuditLog.objects.create(
                action_type=AuditActionType.STATUS_CHANGE,
                action_description=f'Incident status changed: {old_values.get("status")} → {instance.status}',
                user=user,
                user_role=user.role if user else None,
                content_object=instance,
                old_values={'status': old_values.get('status')},
                new_values={'status': instance.status},
                ip_address=ip_address,
                additional_context={
                    'incident_number': instance.incident_number,
                    'title': instance.title,
                    'priority': instance.priority,
                }
            )
        
        if old_values.get('assigned_to_id') != (str(instance.assigned_to.id) if instance.assigned_to else None):
            new_assigned = str(instance.assigned_to.id) if instance.assigned_to else None
            new_values['assigned_to_id'] = new_assigned
            changes.append(f'Assignment changed')
            
            AuditLog.objects.create(
                action_type=AuditActionType.ASSIGNMENT_CHANGE,
                action_description=f'Incident assignment changed',
                user=user,
                user_role=user.role if user else None,
                content_object=instance,
                old_values={'assigned_to_id': old_values.get('assigned_to_id')},
                new_values={'assigned_to_id': new_assigned},
                ip_address=ip_address,
                additional_context={
                    'incident_number': instance.incident_number,
                    'old_assigned_name': instance._audit_old_values.get('assigned_to_name', 'Unassigned'),
                    'new_assigned_name': instance.assigned_to.get_full_name() if instance.assigned_to else 'Unassigned',
                }
            )
        
        if old_values.get('priority') != instance.priority:
            new_values['priority'] = instance.priority
            changes.append(f'Priority: {old_values.get("priority")} → {instance.priority}')
        
        if old_values.get('location') != instance.location:
            new_values['location'] = instance.location
            changes.append(f'Location updated')
            
            AuditLog.objects.create(
                action_type=AuditActionType.LOCATION_UPDATE,
                action_description=f'Incident location updated',
                user=user,
                user_role=user.role if user else None,
                content_object=instance,
                old_values={'location': old_values.get('location')},
                new_values={'location': instance.location},
                ip_address=ip_address,
                additional_context={'incident_number': instance.incident_number}
            )
        
        # General update audit log if there were changes
        if changes:
            AuditLog.objects.create(
                action_type=AuditActionType.UPDATE,
                action_description=f'Incident updated: {instance.incident_number} - {', '.join(changes)}',
                user=user,
                user_role=user.role if user else None,
                content_object=instance,
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
                additional_context={
                    'incident_number': instance.incident_number,
                    'title': instance.title,
                    'change_count': len(changes),
                }
            )


@receiver(post_delete, sender=Incident)
def incident_delete_handler(sender, instance, **kwargs):
    """Create audit log for incident deletion"""
    user = getattr(instance, '_audit_user', None)
    ip_address = getattr(instance, '_audit_ip', None)
    
    AuditLog.objects.create(
        action_type=AuditActionType.DELETE,
        action_description=f'Incident deleted: {instance.incident_number} - {instance.title}',
        user=user,
        user_role=user.role if user else None,
        content_type=ContentType.objects.get_for_model(Incident),
        object_id=str(instance.id),
        old_values={
            'incident_number': instance.incident_number,
            'title': instance.title,
            'status': instance.status,
            'priority': instance.priority,
            'location': instance.location,
        },
        ip_address=ip_address,
        additional_context={
            'company_id': str(instance.company.id) if instance.company else None,
            'reporter_id': str(instance.reporter.id) if instance.reporter else None,
        }
    )


@receiver(post_save, sender=IncidentDocument)
def incident_document_save_handler(sender, instance, created, **kwargs):
    """Create audit log for document upload"""
    if created:
        user = getattr(instance, '_audit_user', instance.uploaded_by)
        ip_address = getattr(instance, '_audit_ip', None)
        
        AuditLog.objects.create(
            action_type=AuditActionType.DOCUMENT_UPLOAD,
            action_description=f'Document uploaded to incident {instance.incident.incident_number}: {instance.title}',
            user=user,
            user_role=user.role if user else None,
            content_object=instance,
            new_values={
                'document_type': instance.document_type,
                'title': instance.title,
                'incident_id': str(instance.incident.id),
                'file_name': instance.file.name if instance.file else None,
            },
            ip_address=ip_address,
            additional_context={
                'incident_number': instance.incident.incident_number,
                'file_size': instance.file.size if instance.file else None,
            }
        )


@receiver(post_delete, sender=IncidentDocument)
def incident_document_delete_handler(sender, instance, **kwargs):
    """Create audit log for document deletion"""
    user = getattr(instance, '_audit_user', None)
    ip_address = getattr(instance, '_audit_ip', None)
    
    AuditLog.objects.create(
        action_type=AuditActionType.DOCUMENT_DELETE,
        action_description=f'Document deleted from incident {instance.incident.incident_number}: {instance.title}',
        user=user,
        user_role=user.role if user else None,
        content_type=ContentType.objects.get_for_model(IncidentDocument),
        object_id=str(instance.id),
        old_values={
            'document_type': instance.document_type,
            'title': instance.title,
            'incident_id': str(instance.incident.id),
            'file_name': instance.file.name if instance.file else None,
        },
        ip_address=ip_address,
        additional_context={'incident_number': instance.incident.incident_number}
    )


@receiver(post_save, sender=CorrectiveAction)  
def corrective_action_save_handler(sender, instance, created, **kwargs):
    """Create audit log for corrective action changes"""
    user = getattr(instance, '_audit_user', None)
    ip_address = getattr(instance, '_audit_ip', None)
    
    if created:
        AuditLog.objects.create(
            action_type=AuditActionType.CREATE,
            action_description=f'Corrective action created for incident {instance.incident.incident_number}: {instance.title}',
            user=user,
            user_role=user.role if user else None,
            content_object=instance,
            new_values={
                'title': instance.title,
                'status': instance.status,
                'due_date': instance.due_date.isoformat() if instance.due_date else None,
                'assigned_to_id': str(instance.assigned_to.id) if instance.assigned_to else None,
                'incident_id': str(instance.incident.id),
            },
            ip_address=ip_address,
            additional_context={
                'incident_number': instance.incident.incident_number,
                'assigned_to_name': instance.assigned_to.get_full_name() if instance.assigned_to else None,
            }
        )