from django.apps import AppConfig


class IoTDevicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'iot_devices'
    verbose_name = 'IoT Device Management'

    def ready(self):
        import iot_devices.signals