# shipments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    ShipmentViewSet, 
    ConsignmentItemViewSet,
    ShipmentFeedbackViewSet,
    FeedbackAnalyticsViewSet,
    DeliverySuccessStatsView
)

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'', ShipmentViewSet, basename='shipment')  # Empty string since 'shipments/' is already in main URLs
router.register(r'items', ConsignmentItemViewSet, basename='consignmentitem')
router.register(r'feedback', ShipmentFeedbackViewSet, basename='shipment-feedback')
router.register(r'analytics', FeedbackAnalyticsViewSet, basename='feedback-analytics')

urlpatterns = [
    path('', include(router.urls)),
    # Dashboard stats endpoint
    path('delivery-stats/', DeliverySuccessStatsView.as_view(), name='delivery-success-stats'),
]