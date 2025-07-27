from django.apps import AppConfig


class EnterpriseAuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'enterprise_auth'
    verbose_name = 'Enterprise Authentication'
    
    def ready(self):
        import enterprise_auth.signals