"""
SECURITY WARNING: This management command contains development passwords.
DO NOT use in production without changing all passwords and API keys.
This is intended for development and demo environments only.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api_gateway.models import (
    APIKey, WebhookEndpoint, DeveloperApplication, APIDocumentation
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up sample API gateway data for testing and demonstration'

    def handle(self, *args, **options):
        self.stdout.write('Setting up API gateway data...')
        
        # Get or create admin user
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            # WARNING: Change password in production deployment
            admin_user = User.objects.create_superuser(
                username='api_admin',
                email='api@safeshipper.com',
                password='CHANGE_IN_PRODUCTION_123!',
                first_name='API',
                last_name='Administrator'
            )
            self.stdout.write(f'Created API admin user: {admin_user.username}')
        
        # Create sample developer user
        developer_user, created = User.objects.get_or_create(
            username='developer_1',
            defaults={
                'first_name': 'John',
                'last_name': 'Developer',
                'email': 'developer@example.com',
                'is_active': True
            }
        )
        if created:
            # WARNING: Change password in production deployment
            developer_user.set_password('CHANGE_IN_PRODUCTION_dev123!')
            developer_user.save()
            self.stdout.write(f'Created developer user: {developer_user.username}')
        
        # Create sample API keys
        api_keys_data = [
            {
                'name': 'Production API Key',
                'organization': 'SafeShipper Corp',
                'scopes': ['read', 'write'],
                'rate_limit': 5000,
                'created_by': admin_user
            },
            {
                'name': 'Development API Key',
                'organization': 'Dev Testing',
                'scopes': ['read'],
                'rate_limit': 1000,
                'expires_at': timezone.now() + timedelta(days=90),
                'created_by': developer_user
            },
            {
                'name': 'Mobile App API Key',
                'organization': 'SafeShipper Mobile',
                'scopes': ['read', 'write'],
                'allowed_ips': ['192.168.1.100', '10.0.0.50'],
                'rate_limit': 2000,
                'created_by': admin_user
            }
        ]
        
        api_keys = []
        for key_data in api_keys_data:
            api_key, created = APIKey.objects.get_or_create(
                name=key_data['name'],
                defaults=key_data
            )
            api_keys.append(api_key)
            if created:
                self.stdout.write(f'Created API key: {api_key.name}')
        
        # Create sample webhooks
        webhooks_data = [
            {
                'name': 'Shipment Status Webhook',
                'url': 'https://customer-api.example.com/webhooks/shipments',
                'event_types': ['shipment.created', 'shipment.status_changed', 'shipment.delivered'],
                'api_key': api_keys[0]
            },
            {
                'name': 'Compliance Alert Webhook',
                'url': 'https://compliance-system.example.com/alerts',
                'event_types': ['audit.compliance_violation', 'inspection.failed'],
                'filters': {'severity': ['high', 'critical']},
                'api_key': api_keys[0]
            },
            {
                'name': 'Training Notifications',
                'url': 'https://hr-system.example.com/training-alerts',
                'event_types': ['training.certification_expired'],
                'api_key': api_keys[2]
            }
        ]
        
        for webhook_data in webhooks_data:
            webhook, created = WebhookEndpoint.objects.get_or_create(
                name=webhook_data['name'],
                defaults=webhook_data
            )
            if created:
                self.stdout.write(f'Created webhook: {webhook.name}')
        
        # Create sample developer applications
        applications_data = [
            {
                'name': 'Fleet Management Dashboard',
                'description': 'Web application for managing fleet operations',
                'application_type': 'web',
                'website_url': 'https://fleet.example.com',
                'callback_urls': ['https://fleet.example.com/auth/callback'],
                'developer': developer_user,
                'organization': 'Fleet Solutions Inc.',
                'contact_email': 'developer@fleetsolutions.com',
                'requested_scopes': ['read', 'write'],
                'status': 'approved'
            },
            {
                'name': 'Mobile Driver App',
                'description': 'Mobile application for drivers',
                'application_type': 'mobile',
                'developer': developer_user,
                'organization': 'Mobile Solutions',
                'contact_email': 'mobile@example.com',
                'requested_scopes': ['read'],
                'status': 'pending'
            },
            {
                'name': 'ERP Integration',
                'description': 'Integration with enterprise ERP system',
                'application_type': 'server',
                'developer': admin_user,
                'organization': 'Enterprise Corp',
                'contact_email': 'integration@enterprise.com',
                'requested_scopes': ['read', 'write', 'admin'],
                'status': 'approved'
            }
        ]
        
        for app_data in applications_data:
            app, created = DeveloperApplication.objects.get_or_create(
                name=app_data['name'],
                defaults=app_data
            )
            if created:
                # Set approved scopes for approved applications
                if app.status == 'approved':
                    app.approved_scopes = app.requested_scopes
                    app.reviewed_by = admin_user
                    app.reviewed_at = timezone.now()
                    app.save()
                self.stdout.write(f'Created developer application: {app.name}')
        
        # Create sample API documentation
        docs_data = [
            {
                'title': 'Getting Started with SafeShipper API',
                'slug': 'getting-started',
                'content': '''# Getting Started

Welcome to the SafeShipper API! This guide will help you get started with integrating our logistics and dangerous goods management platform.

## Authentication

All API requests require authentication using API keys. Include your API key in the Authorization header:

```
Authorization: Bearer ss_live_your_api_key_here
```

## Rate Limits

API requests are rate limited based on your subscription plan:
- Free tier: 1,000 requests/hour
- Professional: 5,000 requests/hour
- Enterprise: 10,000 requests/hour

## Base URL

All API requests should be made to:
```
https://api.safeshipper.com/api/v1/
```

## Response Format

All responses are returned in JSON format with the following structure:

```json
{
  "status": "success",
  "data": {...},
  "timestamp": "2024-01-01T00:00:00Z",
  "request_id": "req_123456"
}
```
''',
                'doc_type': 'guide',
                'category': 'Getting Started',
                'status': 'published',
                'author': admin_user,
                'published_at': timezone.now()
            },
            {
                'title': 'Shipments API',
                'slug': 'shipments-api',
                'content': '''# Shipments API

The Shipments API allows you to create, retrieve, update, and track shipments in the SafeShipper system.

## Endpoints

### List Shipments
```
GET /api/v1/shipments/
```

### Create Shipment
```
POST /api/v1/shipments/
```

### Get Shipment
```
GET /api/v1/shipments/{id}/
```

### Update Shipment
```
PUT /api/v1/shipments/{id}/
```

## Example Request

```json
{
  "reference_number": "REF-001",
  "customer": "customer_id",
  "carrier": "carrier_id",
  "origin_location": "Sydney, NSW",
  "destination_location": "Melbourne, VIC",
  "freight_type": "DG"
}
```
''',
                'doc_type': 'endpoint',
                'category': 'API Reference',
                'endpoint_path': '/api/v1/shipments/',
                'http_methods': ['GET', 'POST', 'PUT', 'DELETE'],
                'required_scopes': ['read', 'write'],
                'status': 'published',
                'author': admin_user,
                'published_at': timezone.now()
            },
            {
                'title': 'Webhook Events',
                'slug': 'webhook-events',
                'content': '''# Webhook Events

SafeShipper can send webhook notifications when certain events occur in your account.

## Event Types

### Shipment Events
- `shipment.created` - New shipment created
- `shipment.status_changed` - Shipment status updated
- `shipment.delivered` - Shipment delivered

### Compliance Events
- `audit.compliance_violation` - Compliance violation detected
- `inspection.failed` - Inspection failed
- `training.certification_expired` - Training certification expired

## Payload Structure

```json
{
  "event_type": "shipment.created",
  "event_id": "evt_123456",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "shipment_id": "ship_123456",
    "tracking_number": "TRK123456"
  }
}
```

## Signature Verification

All webhook requests include a signature in the `X-SafeShipper-Signature` header for verification.
''',
                'doc_type': 'guide',
                'category': 'Webhooks',
                'status': 'published',
                'author': admin_user,
                'published_at': timezone.now()
            },
            {
                'title': 'API v1.1.0 Release',
                'slug': 'api-v1-1-0-release',
                'content': '''# API v1.1.0 Release

## New Features
- Enhanced webhook filtering capabilities
- Improved rate limiting with burst allowance
- New compliance audit endpoints
- Training certification management API

## Breaking Changes
- None

## Deprecations
- None

## Bug Fixes
- Fixed timezone handling in webhook timestamps
- Improved error messages for invalid API keys
''',
                'doc_type': 'changelog',
                'category': 'Changelog',
                'version': '1.1.0',
                'status': 'published',
                'author': admin_user,
                'published_at': timezone.now()
            }
        ]
        
        for doc_data in docs_data:
            doc, created = APIDocumentation.objects.get_or_create(
                slug=doc_data['slug'],
                defaults=doc_data
            )
            if created:
                self.stdout.write(f'Created documentation: {doc.title}')
        
        # Summary
        total_keys = APIKey.objects.count()
        total_webhooks = WebhookEndpoint.objects.count()
        total_apps = DeveloperApplication.objects.count()
        total_docs = APIDocumentation.objects.count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'API Gateway setup completed successfully:\n'
                f'- {total_keys} API keys\n'
                f'- {total_webhooks} webhook endpoints\n'
                f'- {total_apps} developer applications\n'
                f'- {total_docs} documentation pages'
            )
        )
        
        # Display sample API key for testing
        first_key = APIKey.objects.first()
        if first_key:
            self.stdout.write(
                self.style.WARNING(
                    f'\nSample API Key for testing:\n'
                    f'Key: {first_key.key}\n'
                    f'Name: {first_key.name}\n'
                    f'Scopes: {", ".join(first_key.scopes)}'
                )
            )