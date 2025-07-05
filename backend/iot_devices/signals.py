from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.cache import cache
from .models import SensorData, DeviceAlert, IoTDevice


@receiver(post_save, sender=SensorData)
def update_device_cache(sender, instance, created, **kwargs):
    """Update device cache when new sensor data is received"""
    if created:
        cache_key = f"device_latest_readings_{instance.device.device_id}"
        cached_data = cache.get(cache_key, {})
        
        # Update the specific sensor type
        cached_data[instance.sensor_type] = {
            'value': instance.value,
            'unit': instance.unit,
            'timestamp': instance.timestamp.isoformat(),
            'quality_score': instance.quality_score
        }
        
        # Cache for 1 hour
        cache.set(cache_key, cached_data, 3600)


@receiver(post_save, sender=DeviceAlert)
def handle_critical_alerts(sender, instance, created, **kwargs):
    """Handle critical alerts by sending notifications"""
    if created and instance.severity == 'critical':
        # Here you could integrate with notification systems
        # like email, SMS, Slack, etc.
        pass


@receiver(pre_save, sender=IoTDevice)
def update_device_status_on_heartbeat(sender, instance, **kwargs):
    """Update device status when last_seen is updated"""
    if instance.pk:  # Existing device
        try:
            old_instance = IoTDevice.objects.get(pk=instance.pk)
            if old_instance.last_seen != instance.last_seen:
                # Device sent heartbeat, update status if needed
                if instance.status == 'offline':
                    instance.status = 'active'
        except IoTDevice.DoesNotExist:
            pass