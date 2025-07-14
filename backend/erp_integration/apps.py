from django.apps import AppConfig

class ErpIntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'erp_integration'
    verbose_name = 'ERP Integration Framework'
    
    def ready(self):
        import erp_integration.signals