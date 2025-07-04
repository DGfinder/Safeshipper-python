# shipments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ShipmentViewSet, ConsignmentItemViewSet

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'', ShipmentViewSet, basename='shipment')  # Empty string since 'shipments/' is already in main URLs
router.register(r'items', ConsignmentItemViewSet, basename='consignmentitem')

urlpatterns = [
    path('', include(router.urls)),
]