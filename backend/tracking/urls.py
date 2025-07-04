from django.urls import path
from .api_views import update_location, oyster_webhook

urlpatterns = [
    path('update-location/', update_location, name='update_location'),
    path('oyster-webhook/', oyster_webhook, name='oyster_webhook'),
]