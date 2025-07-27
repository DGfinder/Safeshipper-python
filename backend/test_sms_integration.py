#!/usr/bin/env python
"""
Test script for SMS and Push Notification integration.
Run this script to test Twilio SMS and FCM push notifications.
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')
django.setup()

from communications.sms_service import sms_service, push_notification_service
from communications.tasks import send_sms, send_push_notification


def test_sms_service():
    """Test SMS service directly"""
    print("=== Testing SMS Service ===")
    
    # Test phone number validation
    try:
        formatted = sms_service.validate_phone_number("(555) 123-4567")
        print(f"✓ Phone validation works: {formatted}")
    except Exception as e:
        print(f"✗ Phone validation failed: {e}")
    
    # Test SMS sending (mock mode)
    test_number = "+15551234567"
    test_message = "Hello from SafeShipper! This is a test SMS."
    
    result = sms_service.send_sms(test_number, test_message)
    print(f"SMS Result: {result}")
    
    if result['status'] == 'success':
        print("✓ SMS service test passed")
    else:
        print(f"✗ SMS service test failed: {result.get('error')}")


def test_push_notification_service():
    """Test push notification service directly"""
    print("\n=== Testing Push Notification Service ===")
    
    test_token = "mock_device_token_12345"
    test_title = "SafeShipper Alert"
    test_body = "This is a test push notification from SafeShipper."
    test_data = {"shipment_id": "12345", "type": "status_update"}
    
    result = push_notification_service.send_push_notification(
        device_token=test_token,
        title=test_title,
        body=test_body,
        data=test_data
    )
    print(f"Push Notification Result: {result}")
    
    if result['status'] == 'success':
        print("✓ Push notification service test passed")
    else:
        print(f"✗ Push notification service test failed: {result.get('error')}")


def test_celery_tasks():
    """Test Celery tasks (synchronous execution for testing)"""
    print("\n=== Testing Celery Tasks ===")
    
    # Test SMS task
    try:
        sms_result = send_sms("+15551234567", "Test SMS via Celery task")
        print(f"✓ SMS task executed successfully: {sms_result}")
    except Exception as e:
        print(f"✗ SMS task failed: {e}")
    
    # Test push notification task
    try:
        push_result = send_push_notification(
            "mock_token_123", 
            "Test Push", 
            "Test push via Celery task",
            {"test": "data"}
        )
        print(f"✓ Push notification task executed successfully: {push_result}")
    except Exception as e:
        print(f"✗ Push notification task failed: {e}")


def check_configuration():
    """Check if external services are configured"""
    print("\n=== Configuration Check ===")
    
    from django.conf import settings
    
    # Check Twilio configuration
    twilio_configured = all([
        getattr(settings, 'TWILIO_ACCOUNT_SID', ''),
        getattr(settings, 'TWILIO_AUTH_TOKEN', ''),
        getattr(settings, 'TWILIO_PHONE_NUMBER', '')
    ])
    
    if twilio_configured:
        print("✓ Twilio credentials configured")
    else:
        print("ℹ Twilio credentials not configured - using mock mode")
    
    # Check FCM configuration
    fcm_configured = bool(getattr(settings, 'FCM_SERVER_KEY', ''))
    
    if fcm_configured:
        print("✓ FCM server key configured")
    else:
        print("ℹ FCM server key not configured - using mock mode")
    
    # Check email configuration
    email_configured = bool(getattr(settings, 'EMAIL_HOST_USER', ''))
    
    if email_configured:
        print("✓ Email service configured")
    else:
        print("ℹ Email service not configured - using console backend")


if __name__ == "__main__":
    print("SafeShipper External Services Integration Test")
    print("=" * 50)
    
    check_configuration()
    test_sms_service()
    test_push_notification_service()
    test_celery_tasks()
    
    print("\n" + "=" * 50)
    print("Integration test completed!")
    print("\nTo enable real SMS/Push notifications:")
    print("1. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER")
    print("2. Set FCM_SERVER_KEY for push notifications")
    print("3. Install dependencies: pip install twilio pyfcm")