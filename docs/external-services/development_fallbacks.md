# 🔧 Development Fallbacks Documentation

This guide explains how SafeShipper works without external services and how to progressively add real integrations during development.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Mock Service Architecture](#mock-service-architecture)
3. [Email Services](#email-services)
4. [SMS & Push Notifications](#sms--push-notifications)
5. [File Storage](#file-storage)
6. [Payment Processing](#payment-processing)
7. [OAuth Authentication](#oauth-authentication)
8. [Search & Analytics](#search--analytics)
9. [Progressive Enhancement](#progressive-enhancement)
10. [Testing Strategies](#testing-strategies)

---

## Overview

SafeShipper is designed to work seamlessly without external services during development. This "graceful degradation" approach allows developers to:

- Start coding immediately without API key setup
- Test core functionality without external dependencies
- Gradually add real services as needed
- Simulate various service failure scenarios

### Mock Service Philosophy

All external services have fallback implementations that:
- ✅ Provide functional equivalents for development
- ✅ Log intended actions for debugging
- ✅ Simulate success/failure scenarios
- ✅ Allow easy switching to real services
- ✅ Maintain consistent APIs

---

## Mock Service Architecture

### Service Detection Pattern

SafeShipper uses environment variables to automatically detect and switch between mock and real services:

```python
# communications/services.py
class ServiceFactory:
    @staticmethod
    def get_email_service():
        if settings.EMAIL_HOST_USER:
            return RealEmailService()
        return MockEmailService()
    
    @staticmethod
    def get_sms_service():
        if settings.TWILIO_ACCOUNT_SID:
            return TwilioSMSService()
        return MockSMSService()
```

### Mock Service Base Class

```python
# base/mock_service.py
class MockService:
    def __init__(self, service_name):
        self.service_name = service_name
        self.logger = logging.getLogger(f'mock.{service_name}')
    
    def log_action(self, action, data):
        """Log mock service actions for debugging"""
        self.logger.info(f"[MOCK {self.service_name}] {action}: {data}")
    
    def simulate_delay(self, min_ms=100, max_ms=500):
        """Simulate real service latency"""
        delay = random.uniform(min_ms, max_ms) / 1000
        time.sleep(delay)
    
    def simulate_failure(self, failure_rate=0.05):
        """Randomly simulate service failures"""
        if random.random() < failure_rate:
            raise ServiceUnavailableError(f"Mock {self.service_name} failure")
```

---

## Email Services

### Mock Email Implementation

SafeShipper defaults to console email backend for development:

```python
# settings.py
EMAIL_BACKEND = config(
    'EMAIL_BACKEND', 
    default='django.core.mail.backends.console.EmailBackend' if DEBUG 
    else 'django.core.mail.backends.smtp.EmailBackend'
)
```

### Enhanced Mock Email Service

```python
# communications/mock_email.py
class MockEmailService:
    def __init__(self):
        self.sent_emails = []
        self.logger = logging.getLogger('mock.email')
    
    def send_email(self, recipient, subject, message, **kwargs):
        """Mock email sending with detailed logging"""
        email_data = {
            'to': recipient,
            'subject': subject,
            'message': message[:100] + '...' if len(message) > 100 else message,
            'timestamp': datetime.now().isoformat()
        }
        
        self.sent_emails.append(email_data)
        self.logger.info(f"📧 EMAIL SENT: {email_data}")
        
        # Simulate different outcomes
        if 'test-failure@example.com' in recipient:
            return {'status': 'failed', 'error': 'Mock email failure'}
        
        return {'status': 'success', 'message_id': f'mock-{uuid.uuid4()}'}
    
    def send_template_email(self, recipient, template, context, subject):
        """Mock template email with context logging"""
        self.logger.info(f"📧 TEMPLATE EMAIL: {template} to {recipient}")
        self.logger.info(f"📧 CONTEXT: {json.dumps(context, indent=2)}")
        
        return self.send_email(recipient, subject, f"Template: {template}")
```

### Development Email Testing

```python
# For testing email flows without spam
def test_email_flow():
    """Test email templates and flows"""
    from communications.email_service import email_service
    
    # Test welcome email
    result = email_service.send_welcome_email(user)
    print(f"Welcome email result: {result}")
    
    # Test password reset
    result = email_service.send_password_reset_email(user, "test-token")
    print(f"Password reset result: {result}")
```

---

## SMS & Push Notifications

### Mock SMS Service

```python
# communications/mock_sms.py
class MockSMSService:
    def __init__(self):
        self.sent_messages = []
        self.logger = logging.getLogger('mock.sms')
    
    def send_sms(self, phone_number, message):
        """Mock SMS sending with validation"""
        # Validate phone number format
        try:
            formatted = self.validate_phone_number(phone_number)
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}
        
        sms_data = {
            'to': formatted,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'segments': math.ceil(len(message) / 160)
        }
        
        self.sent_messages.append(sms_data)
        self.logger.info(f"📱 SMS SENT: {sms_data}")
        
        # Simulate carrier-specific responses
        if formatted.startswith('+1555'):  # Test numbers
            return {'status': 'failed', 'error': 'Invalid number'}
        
        return {
            'status': 'success',
            'message_sid': f'mock-sms-{uuid.uuid4()}',
            'segments': sms_data['segments']
        }
    
    def validate_phone_number(self, phone):
        """Basic phone validation for mock service"""
        import re
        # Remove all non-digits
        cleaned = re.sub(r'\D', '', phone)
        
        if len(cleaned) == 10:
            return f"+1{cleaned}"  # US number
        elif len(cleaned) == 11 and cleaned.startswith('1'):
            return f"+{cleaned}"
        else:
            raise ValueError(f"Invalid phone number format: {phone}")
```

### Mock Push Notification Service

```python
# communications/mock_push.py
class MockPushService:
    def __init__(self):
        self.sent_notifications = []
        self.logger = logging.getLogger('mock.push')
    
    def send_push_notification(self, device_token, title, body, data=None):
        """Mock push notification"""
        notification = {
            'device_token': device_token[:10] + '...',  # Don't log full token
            'title': title,
            'body': body,
            'data': data or {},
            'timestamp': datetime.now().isoformat()
        }
        
        self.sent_notifications.append(notification)
        self.logger.info(f"🔔 PUSH SENT: {notification}")
        
        return {
            'status': 'success',
            'message_id': f'mock-push-{uuid.uuid4()}'
        }
```

---

## File Storage

### Mock File Storage

SafeShipper falls back to local file storage when S3 is not configured:

```python
# settings.py
if not AWS_ACCESS_KEY_ID:
    # Use local file storage
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    MEDIA_URL = '/media/'
```

### Enhanced Mock Storage Service

```python
# storage/mock_storage.py
class MockS3Service:
    def __init__(self):
        self.base_path = settings.MEDIA_ROOT
        self.logger = logging.getLogger('mock.s3')
        os.makedirs(self.base_path, exist_ok=True)
    
    def generate_presigned_upload_url(self, file_name, file_type, folder='temp'):
        """Mock presigned URL generation"""
        key = f"{folder}/{uuid.uuid4()}/{file_name}"
        upload_path = os.path.join(self.base_path, key)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(upload_path), exist_ok=True)
        
        self.logger.info(f"📁 MOCK UPLOAD URL: {key}")
        
        return {
            'upload_url': f'/api/v1/storage/mock-upload/',
            'fields': {
                'key': key,
                'content_type': file_type
            },
            'key': key
        }
    
    def move_file(self, source_key, dest_key):
        """Mock file move operation"""
        source_path = os.path.join(self.base_path, source_key)
        dest_path = os.path.join(self.base_path, dest_key)
        
        try:
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.move(source_path, dest_path)
            self.logger.info(f"📁 MOVED: {source_key} → {dest_key}")
            return True
        except Exception as e:
            self.logger.error(f"📁 MOVE FAILED: {e}")
            return False
    
    def generate_download_url(self, key, expires_in=3600, filename=None):
        """Mock download URL generation"""
        file_path = os.path.join(self.base_path, key)
        if os.path.exists(file_path):
            url = f"/media/{key}"
            self.logger.info(f"📁 DOWNLOAD URL: {url}")
            return url
        return None
```

---

## Payment Processing

### Mock Payment Service

```python
# payments/mock_stripe.py
class MockStripeService:
    def __init__(self):
        self.customers = {}
        self.payments = {}
        self.subscriptions = {}
        self.logger = logging.getLogger('mock.stripe')
    
    def create_customer(self, user, company):
        """Mock customer creation"""
        customer_id = f"cus_mock_{uuid.uuid4().hex[:14]}"
        customer_data = {
            'id': customer_id,
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}",
            'created': datetime.now().isoformat()
        }
        
        self.customers[customer_id] = customer_data
        self.logger.info(f"💳 CUSTOMER CREATED: {customer_id}")
        return customer_id
    
    def create_payment_intent(self, amount, currency='usd', customer_id=None):
        """Mock payment intent creation"""
        payment_id = f"pi_mock_{uuid.uuid4().hex[:14]}"
        payment_data = {
            'id': payment_id,
            'amount': amount,
            'currency': currency,
            'status': 'succeeded',  # Always succeed in mock
            'customer': customer_id
        }
        
        self.payments[payment_id] = payment_data
        self.logger.info(f"💳 PAYMENT INTENT: ${amount/100:.2f} {currency.upper()}")
        
        return payment_data
    
    def create_subscription(self, customer_id, price_id, trial_days=14):
        """Mock subscription creation"""
        subscription_id = f"sub_mock_{uuid.uuid4().hex[:14]}"
        subscription_data = {
            'id': subscription_id,
            'customer': customer_id,
            'status': 'trialing' if trial_days > 0 else 'active',
            'trial_end': (datetime.now() + timedelta(days=trial_days)).isoformat()
        }
        
        self.subscriptions[subscription_id] = subscription_data
        self.logger.info(f"💳 SUBSCRIPTION: {subscription_id} (trial: {trial_days} days)")
        
        return subscription_data
```

### Payment Testing Interface

```python
# Development-only payment testing endpoints
@api_view(['POST'])
def mock_payment_webhook(request):
    """Simulate Stripe webhooks for testing"""
    event_type = request.data.get('type')
    
    if event_type == 'payment_intent.succeeded':
        # Simulate successful payment
        pass
    elif event_type == 'invoice.payment_failed':
        # Simulate failed payment
        pass
    
    return Response({'received': True})
```

---

## OAuth Authentication

### Mock OAuth Service

```python
# enterprise_auth/mock_oauth.py
class MockOAuthService:
    def __init__(self):
        self.mock_users = {
            'google': {
                'test@example.com': {
                    'id': 'mock_google_123',
                    'email': 'test@example.com',
                    'given_name': 'Test',
                    'family_name': 'User',
                    'picture': 'https://via.placeholder.com/150'
                }
            },
            'microsoft': {
                'test@example.com': {
                    'id': 'mock_ms_456',
                    'mail': 'test@example.com',
                    'givenName': 'Test',
                    'surname': 'User'
                }
            }
        }
        self.logger = logging.getLogger('mock.oauth')
    
    def validate_google_token(self, id_token):
        """Mock Google token validation"""
        # Check for test token
        if id_token == 'mock_google_token':
            user_data = self.mock_users['google']['test@example.com']
            self.logger.info(f"🔐 GOOGLE AUTH: {user_data['email']}")
            return user_data
        
        raise ValueError("Invalid token - use 'mock_google_token' for testing")
    
    def validate_microsoft_token(self, access_token):
        """Mock Microsoft token validation"""
        if access_token == 'mock_microsoft_token':
            user_data = self.mock_users['microsoft']['test@example.com']
            self.logger.info(f"🔐 MICROSOFT AUTH: {user_data['mail']}")
            return user_data
        
        raise ValueError("Invalid token - use 'mock_microsoft_token' for testing")
```

### OAuth Testing Helper

```typescript
// Frontend OAuth testing helper
export const mockOAuthHelpers = {
  async testGoogleLogin() {
    const response = await fetch('/api/v1/auth/sso/google/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: 'mock_google_token' })
    });
    return response.json();
  },

  async testMicrosoftLogin() {
    const response = await fetch('/api/v1/auth/sso/microsoft/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: 'mock_microsoft_token' })
    });
    return response.json();
  }
};
```

---

## Search & Analytics

### Mock Elasticsearch Service

```python
# search/mock_elasticsearch.py
class MockElasticsearchService:
    def __init__(self):
        self.documents = {}
        self.logger = logging.getLogger('mock.elasticsearch')
    
    def index_document(self, index, doc_id, body):
        """Mock document indexing"""
        if index not in self.documents:
            self.documents[index] = {}
        
        self.documents[index][doc_id] = body
        self.logger.info(f"🔍 INDEXED: {index}/{doc_id}")
        
        return {'result': 'created', '_id': doc_id}
    
    def search(self, index, body):
        """Mock search with basic matching"""
        query = body.get('query', {})
        
        # Simple text matching
        results = []
        if index in self.documents:
            for doc_id, doc in self.documents[index].items():
                if self._matches_query(doc, query):
                    results.append({
                        '_id': doc_id,
                        '_source': doc,
                        '_score': random.uniform(0.5, 1.0)
                    })
        
        self.logger.info(f"🔍 SEARCH: {index} returned {len(results)} results")
        
        return {
            'hits': {
                'total': {'value': len(results)},
                'hits': results[:10]  # Limit to 10 results
            }
        }
    
    def _matches_query(self, doc, query):
        """Basic query matching for mock service"""
        if 'match_all' in query:
            return True
        
        if 'match' in query:
            for field, value in query['match'].items():
                if field in doc and str(value).lower() in str(doc[field]).lower():
                    return True
        
        return False
```

---

## Progressive Enhancement

### Service Configuration Strategy

1. **Start with Mocks**: Begin development with all mock services
2. **Add One Service**: Enable one real service at a time
3. **Test Integration**: Verify each service works correctly
4. **Monitor & Debug**: Use logging to track service usage
5. **Production Ready**: All services configured and tested

### Environment Configuration Levels

```python
# Development stages
DEVELOPMENT_STAGES = {
    'local': {
        'email': 'mock',
        'sms': 'mock',
        'storage': 'local',
        'payments': 'mock',
        'oauth': 'mock'
    },
    'staging': {
        'email': 'real',
        'sms': 'mock',
        'storage': 'real',
        'payments': 'test',
        'oauth': 'real'
    },
    'production': {
        'email': 'real',
        'sms': 'real',
        'storage': 'real',
        'payments': 'live',
        'oauth': 'real'
    }
}
```

### Service Status Dashboard

Create a development dashboard to see service status:

```python
# development/views.py
def service_status_view(request):
    """Development-only view showing service configuration"""
    if not settings.DEBUG:
        raise Http404
    
    status = {
        'email': 'real' if settings.EMAIL_HOST_USER else 'mock',
        'sms': 'real' if settings.TWILIO_ACCOUNT_SID else 'mock',
        'storage': 'real' if settings.AWS_ACCESS_KEY_ID else 'local',
        'payments': 'real' if settings.STRIPE_SECRET_KEY else 'mock',
        'search': 'real' if settings.ELASTICSEARCH_DSL else 'mock'
    }
    
    return JsonResponse({
        'environment': settings.ENVIRONMENT,
        'debug': settings.DEBUG,
        'services': status
    })
```

---

## Testing Strategies

### Mock Service Testing

```python
# tests/test_mock_services.py
class TestMockServices(TestCase):
    def test_mock_email_service(self):
        """Test mock email service functionality"""
        service = MockEmailService()
        
        result = service.send_email(
            'test@example.com',
            'Test Subject',
            'Test message'
        )
        
        self.assertEqual(result['status'], 'success')
        self.assertEqual(len(service.sent_emails), 1)
    
    def test_mock_sms_service(self):
        """Test mock SMS service functionality"""
        service = MockSMSService()
        
        result = service.send_sms('+1234567890', 'Test message')
        
        self.assertEqual(result['status'], 'success')
        self.assertIn('message_sid', result)
    
    def test_service_switching(self):
        """Test automatic service switching"""
        # Should use mock when no credentials
        email_service = ServiceFactory.get_email_service()
        self.assertIsInstance(email_service, MockEmailService)
        
        # Should use real service when credentials present
        with override_settings(EMAIL_HOST_USER='test@example.com'):
            email_service = ServiceFactory.get_email_service()
            self.assertIsInstance(email_service, RealEmailService)
```

### Integration Testing

```python
# tests/test_integration.py
class TestServiceIntegration(TestCase):
    def test_email_flow_with_mock(self):
        """Test complete email flow using mock service"""
        user = UserFactory()
        
        # Should work without real email configuration
        result = send_welcome_email.delay(user.id)
        
        self.assertTrue(result.successful())
    
    def test_payment_flow_with_mock(self):
        """Test payment flow using mock Stripe"""
        customer = CustomerFactory()
        
        # Should create mock payment
        result = create_subscription.delay(customer.id, 'price_123')
        
        self.assertTrue(result.successful())
```

---

## Best Practices

### 1. Consistent Logging

All mock services should log their actions clearly:

```python
# Good logging format
self.logger.info(f"📧 EMAIL SENT: {recipient} - {subject}")
self.logger.info(f"📱 SMS SENT: {phone} - {len(message)} chars")
self.logger.info(f"💳 PAYMENT: ${amount/100:.2f} - {status}")
```

### 2. Realistic Behavior

Mock services should simulate real-world scenarios:

```python
# Simulate failures
def simulate_realistic_behavior(self):
    # 5% random failure rate
    if random.random() < 0.05:
        raise ServiceUnavailableError()
    
    # Realistic delays
    time.sleep(random.uniform(0.1, 0.5))
    
    # Rate limiting simulation
    if self.request_count > 100:
        raise RateLimitExceededError()
```

### 3. Easy Configuration

Make it simple to switch between mock and real services:

```python
# Environment variable based switching
USE_REAL_EMAIL = config('USE_REAL_EMAIL', default=False, cast=bool)
USE_REAL_SMS = config('USE_REAL_SMS', default=False, cast=bool)
USE_REAL_PAYMENTS = config('USE_REAL_PAYMENTS', default=False, cast=bool)
```

### 4. Development Helpers

Provide tools to inspect mock service activity:

```python
# Management command to show mock service activity
class Command(BaseCommand):
    def handle(self, *args, **options):
        # Show recent mock activities
        # Clear mock service logs
        # Reset mock service state
```

---

## Next Steps

1. Review current mock service implementations
2. Test core workflows with mock services only
3. Add one real service at a time
4. Monitor service logs during development
5. Document any service-specific quirks
6. Prepare for production deployment

---

**Last Updated**: 2025-07-27  
**Version**: 1.0.0