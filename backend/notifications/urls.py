# notifications/urls.py
"""
URL configuration for notifications app.
"""

from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # Push notification device management
    path('register-push-token/', views.register_push_token, name='register_push_token'),
    path('unregister-push-token/', views.unregister_push_token, name='unregister_push_token'),
    path('push-preferences/', views.push_preferences, name='push_preferences'),
    path('device-status/', views.device_status, name='device_status'),
    
    # Testing (development only)
    path('test-notification/', views.test_notification, name='test_notification'),
]