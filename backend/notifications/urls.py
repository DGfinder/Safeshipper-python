# notifications/urls.py
"""
URL configuration for notifications app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'feedback-preferences', views.FeedbackNotificationPreferenceViewSet, basename='feedback-preferences')
router.register(r'digests', views.NotificationDigestViewSet, basename='digests')

app_name = 'notifications'

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Push notification device management
    path('register-push-token/', views.register_push_token, name='register_push_token'),
    path('unregister-push-token/', views.unregister_push_token, name='unregister_push_token'),
    path('push-preferences/', views.push_preferences, name='push_preferences'),
    path('device-status/', views.device_status, name='device_status'),
    
    # Testing (development only)
    path('test-notification/', views.test_notification, name='test_notification'),
]