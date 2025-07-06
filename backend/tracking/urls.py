from django.urls import path
from .api_views import (
    update_location, fleet_status, public_shipment_tracking, oyster_webhook,
    public_document_download, public_delivery_signature, public_delivery_photos,
    public_shipment_timeline, public_pod_info
)

urlpatterns = [
    # Driver location tracking
    path('update-location/', update_location, name='update_location'),
    
    # Fleet management
    path('fleet-status/', fleet_status, name='fleet_status'),
    path('oyster-webhook/', oyster_webhook, name='oyster_webhook'),
    
    # Public tracking endpoints
    path('public/shipment/<str:tracking_number>/', public_shipment_tracking, name='public_shipment_tracking'),
    path('public/shipment/<str:tracking_number>/timeline/', public_shipment_timeline, name='public_shipment_timeline'),
    path('public/shipment/<str:tracking_number>/documents/<uuid:document_id>/', public_document_download, name='public_document_download'),
    path('public/shipment/<str:tracking_number>/signature/', public_delivery_signature, name='public_delivery_signature'),
    path('public/shipment/<str:tracking_number>/photos/<uuid:photo_id>/', public_delivery_photos, name='public_delivery_photos'),
    path('public/shipment/<str:tracking_number>/pod/', public_pod_info, name='public_pod_info'),
]