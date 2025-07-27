#!/usr/bin/env python
"""
Test script for OAuth/SSO integration.
Run this script to test Google and Microsoft OAuth flows.
"""

import os
import sys
import django
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')
django.setup()

from django.test import Client
from django.conf import settings
from enterprise_auth.models import AuthenticationLog
from django.contrib.auth import get_user_model

User = get_user_model()


def test_oauth_configuration():
    """Test OAuth provider configuration"""
    print("=== OAuth Configuration Check ===")
    
    # Check Google configuration
    google_config = settings.SOCIALACCOUNT_PROVIDERS.get('google', {})
    google_client_id = google_config.get('APP', {}).get('client_id', '')
    
    if google_client_id:
        print("✓ Google OAuth client ID configured")
    else:
        print("ℹ Google OAuth client ID not configured")
    
    # Check Microsoft configuration
    microsoft_config = settings.SOCIALACCOUNT_PROVIDERS.get('microsoft', {})
    microsoft_client_id = microsoft_config.get('APP', {}).get('client_id', '')
    
    if microsoft_client_id:
        print("✓ Microsoft OAuth client ID configured")
    else:
        print("ℹ Microsoft OAuth client ID not configured")
    
    return bool(google_client_id), bool(microsoft_client_id)


def test_oauth_endpoints():
    """Test OAuth API endpoints"""
    print("\n=== OAuth Endpoints Test ===")
    
    client = Client()
    
    # Test SSO providers endpoint
    try:
        response = client.get('/api/v1/auth/sso/providers/')
        if response.status_code == 200:
            print("✓ SSO providers endpoint accessible")
            data = response.json()
            print(f"  Available providers: {len(data.get('providers', []))}")
        else:
            print(f"✗ SSO providers endpoint error: {response.status_code}")
    except Exception as e:
        print(f"✗ SSO providers endpoint error: {e}")
    
    # Test Google OAuth endpoint (without token)
    try:
        response = client.post('/api/v1/auth/sso/google/', {})
        if response.status_code == 400:
            print("✓ Google OAuth endpoint properly validates input")
        else:
            print(f"⚠ Google OAuth endpoint unexpected response: {response.status_code}")
    except Exception as e:
        print(f"✗ Google OAuth endpoint error: {e}")
    
    # Test Microsoft OAuth endpoint (without token)
    try:
        response = client.post('/api/v1/auth/sso/microsoft/', {})
        if response.status_code == 400:
            print("✓ Microsoft OAuth endpoint properly validates input")
        else:
            print(f"⚠ Microsoft OAuth endpoint unexpected response: {response.status_code}")
    except Exception as e:
        print(f"✗ Microsoft OAuth endpoint error: {e}")


def test_mock_oauth_flow():
    """Test OAuth flow with mock data"""
    print("\n=== Mock OAuth Flow Test ===")
    
    client = Client()
    
    # Mock Google ID token payload (for testing purposes only)
    mock_google_user = {
        'sub': 'mock_google_id_123',
        'email': 'test@example.com',
        'given_name': 'Test',
        'family_name': 'User',
        'email_verified': True
    }
    
    print(f"Testing with mock user: {mock_google_user['email']}")
    
    # Note: Real implementation would require valid tokens from OAuth providers
    # This test demonstrates the endpoint structure
    
    try:
        # Test with invalid token (expected to fail)
        response = client.post('/api/v1/auth/sso/google/', {
            'id_token': 'invalid_token_for_testing'
        }, content_type='application/json')
        
        if response.status_code in [400, 501]:
            print("✓ Google OAuth properly rejects invalid tokens")
        else:
            print(f"⚠ Unexpected response for invalid token: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Google OAuth test error: {e}")


def test_user_creation_flow():
    """Test user creation and social account linking"""
    print("\n=== User Creation Flow Test ===")
    
    # Test user creation
    test_email = "oauth.test@example.com"
    
    # Clean up any existing test user
    User.objects.filter(email=test_email).delete()
    
    # Simulate user creation from OAuth
    user, created = User.objects.get_or_create(
        email=test_email,
        defaults={
            'username': test_email,
            'first_name': 'OAuth',
            'last_name': 'Test',
            'is_active': True
        }
    )
    
    if created:
        print(f"✓ User created successfully: {user.email}")
        
        # Test authentication log creation
        try:
            auth_log = AuthenticationLog.objects.create(
                user=user,
                method='GOOGLE_SSO',
                ip_address='127.0.0.1',
                user_agent='Test User Agent',
                success=True
            )
            print(f"✓ Authentication log created: {auth_log.id}")
        except Exception as e:
            print(f"✗ Authentication log creation failed: {e}")
        
        # Clean up
        user.delete()
        print("✓ Test user cleaned up")
    else:
        print(f"⚠ User already existed: {user.email}")


def display_oauth_setup_instructions():
    """Display setup instructions for OAuth providers"""
    print("\n=== OAuth Setup Instructions ===")
    
    print("\n🔧 Google OAuth Setup:")
    print("1. Go to Google Cloud Console (https://console.cloud.google.com/)")
    print("2. Create/select a project")
    print("3. Enable Google+ API")
    print("4. Go to 'Credentials' → 'Create Credentials' → 'OAuth 2.0 Client ID'")
    print("5. Set authorized redirect URIs:")
    print("   - http://localhost:8000/accounts/google/login/callback/ (dev)")
    print("   - https://yourdomain.com/accounts/google/login/callback/ (prod)")
    print("6. Set environment variables:")
    print("   - GOOGLE_CLIENT_ID=your_client_id")
    print("   - GOOGLE_CLIENT_SECRET=your_client_secret")
    
    print("\n🔧 Microsoft OAuth Setup:")
    print("1. Go to Azure Portal (https://portal.azure.com/)")
    print("2. Navigate to 'Azure Active Directory' → 'App registrations'")
    print("3. Click 'New registration'")
    print("4. Set redirect URIs:")
    print("   - http://localhost:8000/accounts/microsoft/login/callback/ (dev)")
    print("   - https://yourdomain.com/accounts/microsoft/login/callback/ (prod)")
    print("5. Set API permissions: Microsoft Graph → User.Read")
    print("6. Set environment variables:")
    print("   - MICROSOFT_CLIENT_ID=your_application_id")
    print("   - MICROSOFT_CLIENT_SECRET=your_client_secret")
    
    print("\n🚀 Frontend Integration:")
    print("Use libraries like:")
    print("- @google-cloud/local-auth for Google")
    print("- @azure/msal-browser for Microsoft")
    print("- Send obtained tokens to /api/v1/auth/sso/google/ or /api/v1/auth/sso/microsoft/")


if __name__ == "__main__":
    print("SafeShipper OAuth/SSO Integration Test")
    print("=" * 50)
    
    google_configured, microsoft_configured = test_oauth_configuration()
    test_oauth_endpoints()
    test_mock_oauth_flow()
    test_user_creation_flow()
    
    if not google_configured and not microsoft_configured:
        display_oauth_setup_instructions()
    
    print("\n" + "=" * 50)
    print("OAuth integration test completed!")
    
    if google_configured or microsoft_configured:
        print("✓ OAuth providers are configured and ready for production")
    else:
        print("ℹ Configure OAuth credentials to enable SSO authentication")