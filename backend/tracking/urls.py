from django.urls import path
from .api_views import update_location, fleet_status, public_shipment_tracking, oyster_webhook

urlpatterns = [
    path('update-location/', update_location, name='update_location'),
    path('fleet-status/', fleet_status, name='fleet_status'),
    path('public/shipment/<str:tracking_number>/', public_shipment_tracking, name='public_shipment_tracking'),
    path('oyster-webhook/', oyster_webhook, name='oyster_webhook'),
]