# users/apps.py
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    # If you have signals specific to the users app and define them in users/signals.py,
    # you would import them here inside the ready() method:
    # def ready(self):
    #     import users.signals 
