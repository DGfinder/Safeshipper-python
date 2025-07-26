#!/usr/bin/env python
"""
Test script for Email service integration.
Run this script to test email functionality including templates and tasks.
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from communications.email_service import email_service
from communications.tasks import send_email, send_welcome_email, send_password_reset_email

User = get_user_model()


def test_email_configuration():
    """Test email backend configuration"""
    print("=== Email Configuration Check ===")
    
    email_backend = settings.EMAIL_BACKEND
    print(f"Email Backend: {email_backend}")
    
    if 'console' in email_backend.lower():
        print("ℹ Using console backend - emails will be printed to console")
    elif 'smtp' in email_backend.lower():
        host = getattr(settings, 'EMAIL_HOST', 'Not configured')
        port = getattr(settings, 'EMAIL_PORT', 'Not configured')
        use_tls = getattr(settings, 'EMAIL_USE_TLS', False)
        user = getattr(settings, 'EMAIL_HOST_USER', 'Not configured')
        
        print(f"✓ SMTP Configuration:")
        print(f"  Host: {host}")
        print(f"  Port: {port}")
        print(f"  TLS: {use_tls}")
        print(f"  User: {user if user else 'Not configured'}")
        
        # Check for production email services
        if 'sendgrid' in host.lower():
            print("✓ SendGrid email service detected")
        elif 'ses' in host.lower() or 'amazonaws' in host.lower():
            print("✓ AWS SES email service detected")
        elif 'smtp.gmail.com' in host.lower():
            print("⚠ Gmail SMTP detected (not recommended for production)")
        else:
            print(f"ℹ Custom SMTP server: {host}")
    else:
        print(f"ℹ Custom email backend: {email_backend}")
    
    from_email = settings.DEFAULT_FROM_EMAIL
    print(f"Default From Email: {from_email}")


def test_basic_email_sending():
    """Test basic email sending functionality"""
    print("\n=== Basic Email Sending Test ===")
    
    test_email = "test@example.com"
    
    # Test plain text email
    result = email_service.send_email(
        recipient=test_email,
        subject="SafeShipper Test Email",
        message="This is a test email from SafeShipper email service."
    )
    
    print(f"Plain text email result: {result['status']}")
    if result['status'] == 'success':
        print(f"✓ Successfully sent to {result['sent_count']} recipient(s)")
    else:
        print(f"✗ Error: {result.get('error', 'Unknown error')}")
    
    # Test HTML email
    html_content = """
    <html>
    <body>
        <h2>SafeShipper Test Email</h2>
        <p>This is a <strong>test HTML email</strong> from SafeShipper.</p>
        <ul>
            <li>Feature 1: Dangerous goods tracking</li>
            <li>Feature 2: SDS management</li>
            <li>Feature 3: Compliance documentation</li>
        </ul>
    </body>
    </html>
    """
    
    result = email_service.send_email(
        recipient=test_email,
        subject="SafeShipper HTML Test Email",
        message="This is the plain text version of the email.",
        html_message=html_content
    )
    
    print(f"HTML email result: {result['status']}")


def test_template_emails():
    """Test template-based email sending"""
    print("\n=== Template Email Test ===")
    
    # Create a test user
    test_user, created = User.objects.get_or_create(
        email='template.test@example.com',
        defaults={
            'username': 'template.test@example.com',
            'first_name': 'Template',
            'last_name': 'Test',
            'is_active': True
        }
    )
    
    if created:
        print(f"✓ Created test user: {test_user.email}")
    else:
        print(f"ℹ Using existing test user: {test_user.email}")
    
    # Test welcome email
    try:
        welcome_result = email_service.send_welcome_email(test_user)
        print(f"Welcome email result: {welcome_result['status']}")
        if welcome_result['status'] == 'success':
            print("✓ Welcome email template rendered successfully")
        else:
            print(f"✗ Welcome email error: {welcome_result.get('error')}")
    except Exception as e:
        print(f"✗ Welcome email exception: {e}")
    
    # Test password reset email
    try:
        test_token = "test_reset_token_12345"
        reset_result = email_service.send_password_reset_email(test_user, test_token)
        print(f"Password reset email result: {reset_result['status']}")
        if reset_result['status'] == 'success':
            print("✓ Password reset email template rendered successfully")
        else:
            print(f"✗ Password reset email error: {reset_result.get('error')}")
    except Exception as e:
        print(f"✗ Password reset email exception: {e}")
    
    # Clean up test user
    if created:
        test_user.delete()
        print("✓ Test user cleaned up")


def test_bulk_email():
    """Test bulk email functionality"""
    print("\n=== Bulk Email Test ===")
    
    test_recipients = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
        'user4@example.com',
        'user5@example.com'
    ]
    
    result = email_service.send_bulk_email(
        recipients=test_recipients,
        subject="SafeShipper Bulk Email Test",
        message="This is a bulk email test from SafeShipper.",
        batch_size=2  # Small batch size for testing
    )
    
    print(f"Bulk email result: {result['status']}")
    print(f"Total recipients: {result['total_recipients']}")
    print(f"Success count: {result['success_count']}")
    print(f"Failed count: {result['failed_count']}")
    
    if result['status'] == 'completed':
        print(f"✓ Bulk email completed with {len(result['batch_results'])} batches")
    else:
        print(f"⚠ Bulk email had issues: {result}")


def test_celery_email_tasks():
    """Test email tasks (synchronous execution for testing)"""
    print("\n=== Celery Email Tasks Test ===")
    
    try:
        # Test basic email task
        email_result = send_email(
            "task.test@example.com", 
            "SafeShipper Task Email", 
            "This email was sent via Celery task."
        )
        print(f"✓ Email task executed: {email_result['status']}")
    except Exception as e:
        print(f"✗ Email task failed: {e}")
    
    # Create a test user for task testing
    task_user, created = User.objects.get_or_create(
        email='task.user@example.com',
        defaults={
            'username': 'task.user@example.com',
            'first_name': 'Task',
            'last_name': 'User',
            'is_active': True
        }
    )
    
    try:
        # Test welcome email task
        welcome_result = send_welcome_email(task_user.id)
        print(f"✓ Welcome email task executed: {welcome_result['status']}")
    except Exception as e:
        print(f"✗ Welcome email task failed: {e}")
    
    try:
        # Test password reset email task
        reset_result = send_password_reset_email(task_user.id, "task_test_token")
        print(f"✓ Password reset email task executed: {reset_result['status']}")
    except Exception as e:
        print(f"✗ Password reset email task failed: {e}")
    
    # Clean up
    if created:
        task_user.delete()
        print("✓ Task test user cleaned up")


def display_email_setup_instructions():
    """Display setup instructions for production email services"""
    print("\n=== Production Email Setup Instructions ===")
    
    print("\n🔧 SendGrid Setup (Recommended):")
    print("1. Sign up at https://sendgrid.com/")
    print("2. Create an API key in Settings → API Keys")
    print("3. Set environment variables:")
    print("   - EMAIL_HOST=smtp.sendgrid.net")
    print("   - EMAIL_PORT=587")
    print("   - EMAIL_USE_TLS=True")
    print("   - EMAIL_HOST_USER=apikey")
    print("   - EMAIL_HOST_PASSWORD=your_sendgrid_api_key")
    
    print("\n🔧 AWS SES Setup:")
    print("1. Set up AWS SES in AWS Console")
    print("2. Verify your domain/email addresses")
    print("3. Create SMTP credentials")
    print("4. Set environment variables:")
    print("   - EMAIL_HOST=email-smtp.us-east-1.amazonaws.com")
    print("   - EMAIL_PORT=587")
    print("   - EMAIL_USE_TLS=True")
    print("   - EMAIL_HOST_USER=your_ses_username")
    print("   - EMAIL_HOST_PASSWORD=your_ses_password")
    
    print("\n🔧 Google Workspace Setup:")
    print("1. Enable 2-Step Verification for your Google account")
    print("2. Generate an App Password")
    print("3. Set environment variables:")
    print("   - EMAIL_HOST=smtp.gmail.com")
    print("   - EMAIL_PORT=587")
    print("   - EMAIL_USE_TLS=True")
    print("   - EMAIL_HOST_USER=your_email@yourdomain.com")
    print("   - EMAIL_HOST_PASSWORD=your_app_password")
    
    print("\n📧 Email Template Customization:")
    print("Templates are located in backend/templates/emails/")
    print("- welcome.html / welcome.txt")
    print("- password_reset.html / password_reset.txt")
    print("- Create additional templates as needed")


if __name__ == "__main__":
    print("SafeShipper Email Service Integration Test")
    print("=" * 50)
    
    test_email_configuration()
    test_basic_email_sending()
    test_template_emails()
    test_bulk_email()
    test_celery_email_tasks()
    
    # Show setup instructions if console backend is being used
    if 'console' in settings.EMAIL_BACKEND.lower():
        display_email_setup_instructions()
    
    print("\n" + "=" * 50)
    print("Email integration test completed!")
    
    if 'console' not in settings.EMAIL_BACKEND.lower():
        print("✓ Production email service is configured")
    else:
        print("ℹ Configure production email service for live deployments")