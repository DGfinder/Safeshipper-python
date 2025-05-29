# shipments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ShipmentViewSet, ConsignmentItemViewSet

router = DefaultRouter()
router.register(r'shipments', ShipmentViewSet, basename='shipment')  # <-- ADD basename
router.register(r'items', ConsignmentItemViewSet, basename='consignmentitem') # <-- ADD basename

urlpatterns = [
    path('', include(router.urls)),
]