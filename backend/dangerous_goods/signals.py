# dangerous_goods/apps.py
from django.apps import AppConfig

class DangerousGoodsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dangerous_goods'

    # If you have signals:
    # def ready(self):
    #     import dangerous_goods.signals
