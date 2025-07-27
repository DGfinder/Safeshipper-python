from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from .models import AuditLog, ShipmentAuditLog, ComplianceAuditLog, AuditActionType
from shipments.models import Shipment, ConsignmentItem
from documents.models import Document
from users.models import User
import json
import threading

# Thread-local storage for request context
_thread_local = threading.local()


def get_request_context():
    """Get the current request context from thread-local storage"""
    return getattr(_thread_local, 'request_context', None)


def set_request_context(user=None, ip_address=None, user_agent=None, session_key=None):
    """Set the current request context in thread-local storage"""
    _thread_local.request_context = {
        'user': user,
        'ip_address': ip_address,
        'user_agent': user_agent,
        'session_key': session_key
    }


def clear_request_context():
    """Clear the current request context from thread-local storage"""
    _thread_local.request_context = None


def serialize_for_audit(instance, fields_to_track=None):
    """
    Serialize model instance for audit logging
    """
    if fields_to_track is None:
        fields_to_track = [f.name for f in instance._meta.fields if f.name not in ['id', 'created_at', 'updated_at']]
    
    data = {}
    for field_name in fields_to_track:
        try:
            value = getattr(instance, field_name)
            if hasattr(value, 'pk'):  # Foreign key
                data[field_name] = {'id': str(value.pk), 'str': str(value)}
            elif hasattr(value, 'isoformat'):  # DateTime
                data[field_name] = value.isoformat()
            else:
                data[field_name] = str(value)
        except AttributeError:
            data[field_name] = None
    
    return data


@receiver(pre_save, sender=Shipment)
def capture_shipment_pre_save(sender, instance, **kwargs):
    """Capture shipment state before changes"""
    if instance.pk:
        try:
            old_instance = Shipment.objects.get(pk=instance.pk)
            # Store old values in thread-local storage
            if not hasattr(_thread_local, 'shipment_old_values'):
                _thread_local.shipment_old_values = {}
            _thread_local.shipment_old_values[str(instance.pk)] = {
                'status': old_instance.status,
                'assigned_driver': str(old_instance.assigned_driver) if old_instance.assigned_driver else None,
                'assigned_vehicle': str(old_instance.assigned_vehicle) if old_instance.assigned_vehicle else None,
                'origin_location': old_instance.origin_location,
                'destination_location': old_instance.destination_location,
                'reference_number': old_instance.reference_number,
            }
        except Shipment.DoesNotExist:
            pass


@receiver(post_save, sender=Shipment)
def log_shipment_changes(sender, instance, created, **kwargs):
    """Log shipment creation and updates"""
    context = get_request_context()
    
    if created:
        # Log shipment creation
        audit_log = AuditLog.log_action(
            action_type=AuditActionType.CREATE,
            description=f"Shipment created with tracking number {instance.tracking_number}",
            user=context.get('user') if context else None,
            content_object=instance,
            new_values=serialize_for_audit(instance),
            ip_address=context.get('ip_address') if context else None,
            user_agent=context.get('user_agent') if context else None,
            session_key=context.get('session_key') if context else None,
        )
        
        # Create shipment-specific audit log
        ShipmentAuditLog.objects.create(
            shipment=instance,
            audit_log=audit_log,
            new_status=instance.status,
            location_at_time=instance.origin_location,
            assigned_vehicle=str(instance.assigned_vehicle) if instance.assigned_vehicle else '',
            assigned_driver=str(instance.assigned_driver) if instance.assigned_driver else '',
            impact_level='MEDIUM'
        )
    else:
        # Log updates
        old_values = getattr(_thread_local, 'shipment_old_values', {}).get(str(instance.pk), {})
        
        if old_values:
            current_values = {
                'status': instance.status,
                'assigned_driver': str(instance.assigned_driver) if instance.assigned_driver else None,
                'assigned_vehicle': str(instance.assigned_vehicle) if instance.assigned_vehicle else None,
                'origin_location': instance.origin_location,
                'destination_location': instance.destination_location,
                'reference_number': instance.reference_number,
            }
            
            changes = []
            for key, old_val in old_values.items():
                new_val = current_values.get(key)
                if old_val != new_val:
                    changes.append(f"{key}: {old_val} → {new_val}")
            
            if changes:
                action_type = AuditActionType.STATUS_CHANGE if 'status' in [c.split(':')[0] for c in changes] else AuditActionType.UPDATE
                
                audit_log = AuditLog.log_action(
                    action_type=action_type,
                    description=f"Shipment {instance.tracking_number} updated: {', '.join(changes)}",
                    user=context.get('user') if context else None,
                    content_object=instance,
                    old_values=old_values,
                    new_values=current_values,
                    ip_address=context.get('ip_address') if context else None,
                    user_agent=context.get('user_agent') if context else None,
                    session_key=context.get('session_key') if context else None,
                )
                
                # Determine impact level
                impact_level = 'HIGH' if old_values.get('status') != instance.status else 'MEDIUM'
                
                # Create shipment-specific audit log
                ShipmentAuditLog.objects.create(
                    shipment=instance,
                    audit_log=audit_log,
                    previous_status=old_values.get('status', ''),
                    new_status=instance.status,
                    location_at_time=instance.origin_location,
                    assigned_vehicle=str(instance.assigned_vehicle) if instance.assigned_vehicle else '',
                    assigned_driver=str(instance.assigned_driver) if instance.assigned_driver else '',
                    impact_level=impact_level
                )
    
    # Clean up thread-local storage
    if hasattr(_thread_local, 'shipment_old_values'):
        _thread_local.shipment_old_values.pop(str(instance.pk), None)


@receiver(post_delete, sender=Shipment)
def log_shipment_deletion(sender, instance, **kwargs):
    """Log shipment deletion"""
    context = get_request_context()
    
    AuditLog.log_action(
        action_type=AuditActionType.DELETE,
        description=f"Shipment {instance.tracking_number} deleted",
        user=context.get('user') if context else None,
        old_values=serialize_for_audit(instance),
        ip_address=context.get('ip_address') if context else None,
        user_agent=context.get('user_agent') if context else None,
        session_key=context.get('session_key') if context else None,
    )


@receiver(post_save, sender=Document)
def log_document_changes(sender, instance, created, **kwargs):
    """Log document uploads and changes"""
    context = get_request_context()
    
    if created:
        action_type = AuditActionType.DOCUMENT_UPLOAD
        description = f"Document uploaded: {instance.original_filename} ({instance.get_document_type_display()})"
        
        # If it's a compliance document, create compliance audit log
        if instance.document_type in ['DG_MANIFEST', 'DG_DECLARATION']:
            audit_log = AuditLog.log_action(
                action_type=action_type,
                description=description,
                user=context.get('user') if context else None,
                content_object=instance,
                new_values=serialize_for_audit(instance),
                ip_address=context.get('ip_address') if context else None,
                user_agent=context.get('user_agent') if context else None,
                session_key=context.get('session_key') if context else None,
            )
            
            ComplianceAuditLog.objects.create(
                audit_log=audit_log,
                regulation_type='IATA_DGR' if instance.document_type == 'DG_MANIFEST' else 'CUSTOM',
                compliance_status='UNDER_REVIEW',
                remediation_required=False
            )
        else:
            AuditLog.log_action(
                action_type=action_type,
                description=description,
                user=context.get('user') if context else None,
                content_object=instance,
                new_values=serialize_for_audit(instance),
                ip_address=context.get('ip_address') if context else None,
                user_agent=context.get('user_agent') if context else None,
                session_key=context.get('session_key') if context else None,
            )
    else:
        # Log document updates (status changes, etc.)
        AuditLog.log_action(
            action_type=AuditActionType.UPDATE,
            description=f"Document updated: {instance.original_filename} - Status: {instance.get_status_display()}",
            user=context.get('user') if context else None,
            content_object=instance,
            new_values=serialize_for_audit(instance),
            ip_address=context.get('ip_address') if context else None,
            user_agent=context.get('user_agent') if context else None,
            session_key=context.get('session_key') if context else None,
        )


@receiver(post_delete, sender=Document)
def log_document_deletion(sender, instance, **kwargs):
    """Log document deletion"""
    context = get_request_context()
    
    AuditLog.log_action(
        action_type=AuditActionType.DOCUMENT_DELETE,
        description=f"Document deleted: {instance.original_filename}",
        user=context.get('user') if context else None,
        old_values=serialize_for_audit(instance),
        ip_address=context.get('ip_address') if context else None,
        user_agent=context.get('user_agent') if context else None,
        session_key=context.get('session_key') if context else None,
    )


@receiver(post_save, sender=User)
def log_user_changes(sender, instance, created, **kwargs):
    """Log user creation and updates"""
    context = get_request_context()
    
    if created:
        AuditLog.log_action(
            action_type=AuditActionType.CREATE,
            description=f"User created: {instance.username} ({instance.get_role_display()})",
            user=context.get('user') if context else None,
            content_object=instance,
            new_values=serialize_for_audit(instance, ['username', 'email', 'role', 'is_active']),
            ip_address=context.get('ip_address') if context else None,
            user_agent=context.get('user_agent') if context else None,
            session_key=context.get('session_key') if context else None,
        )
    else:
        # Only log significant changes
        AuditLog.log_action(
            action_type=AuditActionType.UPDATE,
            description=f"User updated: {instance.username}",
            user=context.get('user') if context else None,
            content_object=instance,
            new_values=serialize_for_audit(instance, ['username', 'email', 'role', 'is_active']),
            ip_address=context.get('ip_address') if context else None,
            user_agent=context.get('user_agent') if context else None,
            session_key=context.get('session_key') if context else None,
        )


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log user login"""
    AuditLog.log_action(
        action_type=AuditActionType.LOGIN,
        description=f"User logged in: {user.username}",
        user=user,
        content_object=user,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        session_key=request.session.session_key,
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout"""
    if user:
        AuditLog.log_action(
            action_type=AuditActionType.LOGOUT,
            description=f"User logged out: {user.username}",
            user=user,
            content_object=user,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            session_key=request.session.session_key,
        )


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# Utility function to log custom actions
def log_custom_action(action_type, description, user=None, content_object=None,
                     old_values=None, new_values=None, metadata=None, request=None):
    """
    Utility function to log custom audit actions from views
    """
    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        session_key = request.session.session_key
        if not user:
            user = getattr(request, 'user', None)
    else:
        ip_address = None
        user_agent = None
        session_key = None
    
    return AuditLog.log_action(
        action_type=action_type,
        description=description,
        user=user,
        content_object=content_object,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
        session_key=session_key,
        metadata=metadata
    )