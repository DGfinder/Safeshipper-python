# communications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    ShipmentEventViewSet, ChannelViewSet, MessageViewSet,
    DirectMessageViewSet, NotificationPreferenceViewSet,
    NotificationQueueViewSet, EmergencyViewSet
)

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'events', ShipmentEventViewSet, basename='shipmentevent')
router.register(r'channels', ChannelViewSet, basename='channel')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'direct-messages', DirectMessageViewSet, basename='directmessage')
router.register(r'notification-preferences', NotificationPreferenceViewSet, basename='notificationpreference')
router.register(r'notification-queue', NotificationQueueViewSet, basename='notificationqueue')
router.register(r'emergency', EmergencyViewSet, basename='emergency')

urlpatterns = [
    path('', include(router.urls)),
]