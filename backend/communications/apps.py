# communications/apps.py
from django.apps import AppConfig


class CommunicationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'communications'
    verbose_name = 'Communications & Notifications'
    
    def ready(self):
        """
        Import signals when the app is ready.
        This ensures that signal handlers are registered.
        """
        try:
            import communications.signals  # noqa
        except ImportError:
            pass