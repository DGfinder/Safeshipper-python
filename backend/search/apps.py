# search/apps.py
from django.apps import AppConfig

class SearchConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'search'
    verbose_name = 'Unified Search System'
    
    def ready(self):
        """Initialize search services when app is ready"""
        pass