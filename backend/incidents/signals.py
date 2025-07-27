from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Incident, IncidentUpdate


@receiver(pre_save, sender=Incident)
def incident_status_change(sender, instance, **kwargs):
    """Create incident update when status changes"""
    if instance.pk:  # Existing incident
        try:
            old_instance = Incident.objects.get(pk=instance.pk)
            
            # Check for status changes
            if old_instance.status != instance.status:
                # Update timestamps based on status
                if instance.status == 'resolved' and not instance.resolved_at:
                    instance.resolved_at = timezone.now()
                elif instance.status == 'closed' and not instance.closed_at:
                    instance.closed_at = timezone.now()
                
        except Incident.DoesNotExist:
            pass


@receiver(post_save, sender=Incident)
def create_incident_update(sender, instance, created, **kwargs):
    """Create incident update record for status changes"""
    if not created:  # Only for updates, not new incidents
        # This would be called from the view when status changes
        pass