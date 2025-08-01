from django.apps import AppConfig


class TrainingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'training'
    verbose_name = 'Training Management'

    def ready(self):
        import training.signals