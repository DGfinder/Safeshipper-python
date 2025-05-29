from django.apps import AppConfig
import logging

class ShipmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shipments'

    def ready(self):
        # Put one-time startup logic here
        import shipments.signals  # noqa
        logging.getLogger(__name__).info("Shipments app loaded.")
