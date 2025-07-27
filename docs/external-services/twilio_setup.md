# 📱 Twilio SMS Integration Setup Guide

This comprehensive guide covers setting up Twilio SMS services for the SafeShipper platform, including SMS notifications, emergency alerts, and two-factor authentication.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Account Setup](#account-setup)
3. [Phone Number Configuration](#phone-number-configuration)
4. [API Credentials](#api-credentials)
5. [Backend Integration](#backend-integration)
6. [SMS Templates](#sms-templates)
7. [Testing & Debugging](#testing--debugging)
8. [Cost Optimization](#cost-optimization)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

SafeShipper uses Twilio for:
- **Shipment Notifications**: Status updates and delivery confirmations
- **Emergency Alerts**: Dangerous goods incidents and safety notifications
- **Two-Factor Authentication**: SMS-based 2FA for enhanced security
- **Driver Communications**: Real-time updates to drivers in the field

### Key Features Implemented

- Automatic phone number formatting and validation
- SMS template management
- Delivery status tracking
- Rate limiting and retry logic
- Cost tracking and alerts

---

## Account Setup

### Step 1: Create Twilio Account

1. Visit [Twilio Console](https://www.twilio.com/console)
2. Click "Sign up" and create a new account
3. Verify your email address
4. Complete phone verification (required for security)

### Step 2: Account Verification

For production use, complete full verification:

1. Navigate to "Settings" → "General"
2. Click "Verify your account"
3. Provide required information:
   - Business name: Your company name
   - Business website: https://yourdomain.com
   - Use case: "Logistics and Transportation Notifications"
   - Expected volume: Estimate monthly SMS count
4. Submit verification (usually approved within 24-48 hours)

### Step 3: Enable Geographic Permissions

1. Go to "Messaging" → "Settings" → "Geo permissions"
2. Enable countries where you'll send SMS:
   - United States (enabled by default)
   - Canada
   - Australia
   - Add other countries as needed
3. Note: Some countries require additional approval

---

## Phone Number Configuration

### Step 1: Purchase a Phone Number

1. Navigate to "Phone Numbers" → "Manage" → "Buy a number"
2. Select criteria:
   - **Country**: Choose based on your primary market
   - **Capabilities**: ✓ SMS, ✓ MMS (optional)
   - **Number type**: Local or Toll-free
3. For SafeShipper, recommended setup:
   - **US/Canada**: Toll-free number for better deliverability
   - **Local presence**: Local numbers for specific regions
4. Click "Buy" (typically $1-2/month per number)

### Step 2: Configure Messaging Service (Recommended)

For better deliverability and scaling:

1. Go to "Messaging" → "Services"
2. Click "Create Messaging Service"
3. Configure:
   ```
   Service Name: SafeShipper Production
   Use case: Notifications and Alerts
   ```
4. Add phone numbers to the service
5. Enable features:
   - ✓ Sticky Sender (consistent number per recipient)
   - ✓ Scaler (automatic traffic distribution)
   - ✓ Shortcode fallback

### Step 3: Setup Alphanumeric Sender ID (Optional)

For supported countries (UK, Australia, etc.):

1. Go to "Messaging" → "Services" → Your Service
2. Click "Sender Pool" → "Add Alphanumeric Sender ID"
3. Enter: "SAFESHIPPER" (11 characters max)
4. Save and verify approval status

---

## API Credentials

### Step 1: Locate Credentials

1. Go to "Account" → "API keys & tokens"
2. Find your credentials:
   - **Account SID**: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - **Auth Token**: Click to reveal (keep secret!)

### Step 2: Create API Key (Recommended for Production)

1. Click "Create API key"
2. Configure:
   ```
   Friendly name: SafeShipper Production API
   Key type: Standard
   ```
3. Save the:
   - **API Key SID**: SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - **API Key Secret**: (shown once, save securely!)

### Step 3: Set Environment Variables

Backend (.env):
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional

# Optional: For better security in production
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=your-api-key-secret
```

---

## Backend Integration

### SafeShipper SMS Service

The SMS service is already configured in `backend/communications/sms_service.py`. Here's how it works:

```python
from communications.sms_service import sms_service

# Send simple SMS
result = sms_service.send_sms(
    phone_number="+1234567890",
    message="Your shipment has been delivered!"
)

# Send templated SMS
result = sms_service.send_templated_sms(
    phone_number="+1234567890",
    template_id="shipment_delivered",
    context={
        "tracking_number": "SH123456",
        "recipient_name": "John Doe"
    }
)
```

### Configuration Options

Update `settings.py` for advanced features:

```python
# Twilio Advanced Configuration
TWILIO_CONFIG = {
    'USE_MESSAGING_SERVICE': True,  # Use Messaging Service instead of phone number
    'STATUS_CALLBACK_URL': 'https://api.yourdomain.com/webhooks/twilio/status/',
    'MAX_RETRY_ATTEMPTS': 3,
    'RETRY_DELAY': 60,  # seconds
    'RATE_LIMIT': {
        'PER_SECOND': 10,
        'PER_MINUTE': 100,
        'PER_HOUR': 1000,
    },
    'ALPHANUMERIC_SENDER_ID': 'SAFESHIPPER',  # For supported countries
}
```

---

## SMS Templates

### Creating SMS Templates

SafeShipper uses a template system for consistent messaging:

```python
# backend/communications/sms_templates.py
SMS_TEMPLATES = {
    'shipment_created': {
        'message': 'SafeShipper: Shipment {tracking_number} created. Track: {tracking_url}',
        'max_length': 160,
        'requires': ['tracking_number', 'tracking_url']
    },
    'shipment_delivered': {
        'message': 'SafeShipper: {tracking_number} delivered to {recipient_name}. Thank you!',
        'max_length': 160,
        'requires': ['tracking_number', 'recipient_name']
    },
    'emergency_alert': {
        'message': '🚨 EMERGENCY: {alert_type} at {location}. Contact: {emergency_contact}',
        'max_length': 160,
        'requires': ['alert_type', 'location', 'emergency_contact'],
        'priority': 'high'
    },
    'two_factor_auth': {
        'message': 'SafeShipper verification code: {code}. Valid for 10 minutes.',
        'max_length': 160,
        'requires': ['code'],
        'ttl': 600  # 10 minutes
    },
    'driver_update': {
        'message': 'Next delivery: {address}. ETA: {eta}. Contact: {customer_phone}',
        'max_length': 160,
        'requires': ['address', 'eta', 'customer_phone']
    }
}
```

### Template Best Practices

1. **Keep it short**: Stay under 160 characters (1 SMS segment)
2. **Include branding**: Start with "SafeShipper:" for recognition
3. **Use clear CTAs**: Include links or phone numbers
4. **Personalize**: Use recipient name when available
5. **Time-sensitive**: Include time/date for deliveries

---

## Testing & Debugging

### Step 1: Test Mode Setup

For development without sending real SMS:

```python
# settings.py
TWILIO_TEST_MODE = True  # Logs SMS instead of sending
TWILIO_TEST_NUMBERS = ['+15005550006']  # Twilio test numbers
```

### Step 2: Run Integration Tests

```bash
cd backend
python test_sms_integration.py
```

Expected output:
```
=== Testing SMS Service ===
✓ Phone validation works: +15551234567
✓ SMS service test passed
✓ SMS queued with SID: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Test with Twilio Test Credentials

Use Twilio's test credentials for CI/CD:

```env
# Test credentials (won't send real SMS)
TWILIO_ACCOUNT_SID=ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
TWILIO_AUTH_TOKEN=test-auth-token
TWILIO_PHONE_NUMBER=+15005550006
```

### Step 4: Monitor SMS Delivery

1. Check Twilio Console → "Monitor" → "Messaging"
2. View delivery status:
   - **Sent**: Message accepted by Twilio
   - **Delivered**: Confirmed delivery to device
   - **Failed**: Check error code
   - **Undelivered**: Carrier rejection

### Step 5: Setup Status Webhooks

```python
# views.py
@csrf_exempt
def twilio_status_webhook(request):
    """Handle Twilio delivery status callbacks"""
    message_sid = request.POST.get('MessageSid')
    status = request.POST.get('MessageStatus')
    error_code = request.POST.get('ErrorCode')
    
    # Update your database
    # Log for monitoring
    return HttpResponse(status=200)
```

---

## Cost Optimization

### SMS Pricing Structure

Typical Twilio pricing (varies by country):
- **US/Canada SMS**: $0.0075 per message
- **International SMS**: $0.02-0.50 per message
- **Phone numbers**: $1-2/month
- **Toll-free numbers**: $2/month + $0.013 per SMS

### Cost Optimization Strategies

1. **Message Segmentation**:
   - Keep messages under 160 characters
   - Long messages are split and charged per segment
   - Use URL shorteners for links

2. **Batch Notifications**:
   ```python
   # Instead of multiple SMS, combine updates
   "Your shipments SH123, SH124, SH125 have been delivered"
   ```

3. **Smart Routing**:
   - Use local numbers for better rates
   - Implement opt-in preferences
   - Allow users to choose notification frequency

4. **Rate Limiting**:
   ```python
   RATE_LIMITS = {
       'per_user_daily': 10,
       'per_user_hourly': 3,
       'emergency_only': False  # During high usage
   }
   ```

5. **Cost Monitoring**:
   ```python
   # Track usage
   def track_sms_cost(phone_number, message_length):
       segments = math.ceil(message_length / 160)
       cost = segments * get_rate_for_number(phone_number)
       # Log to monitoring system
   ```

### Budget Alerts

Set up Twilio budget alerts:
1. Console → "Billing" → "Usage triggers"
2. Create trigger:
   - Threshold: $100 (adjust as needed)
   - Alert: Email/SMS/Webhook
   - Action: Optional API suspension

---

## Production Deployment

### Pre-Production Checklist

- [ ] Complete Twilio account verification
- [ ] Purchase production phone numbers
- [ ] Configure Messaging Service
- [ ] Set up status webhooks
- [ ] Implement retry logic
- [ ] Add monitoring and alerting
- [ ] Test international numbers
- [ ] Review compliance requirements

### Security Configuration

1. **IP Whitelisting** (if available):
   ```python
   TWILIO_WEBHOOK_IPS = [
       '54.172.60.0/30',
       '54.244.51.0/30',
       # Add all Twilio IP ranges
   ]
   ```

2. **Webhook Validation**:
   ```python
   from twilio.request_validator import RequestValidator
   
   def validate_twilio_request(request):
       validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
       signature = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
       url = request.build_absolute_uri()
       post_data = request.POST.dict()
       return validator.validate(url, post_data, signature)
   ```

3. **Encryption**:
   - Store phone numbers encrypted in database
   - Use environment variables for credentials
   - Enable Twilio's encryption features

### Compliance Considerations

1. **Opt-in Requirements**:
   - Obtain explicit consent for SMS
   - Provide clear opt-out instructions
   - Maintain consent records

2. **Message Content**:
   - Include "Reply STOP to unsubscribe"
   - Identify your business clearly
   - Avoid promotional content in transactional SMS

3. **Data Protection**:
   - Don't send sensitive data via SMS
   - Implement message expiry
   - Log retention policies

### Scaling Considerations

1. **High Volume Setup**:
   - Use Messaging Services for load balancing
   - Implement queue-based sending
   - Consider Twilio's ISV program for better rates

2. **Failover Strategy**:
   ```python
   SMS_PROVIDERS = {
       'primary': 'twilio',
       'fallback': 'aws_sns',  # Alternative provider
       'emergency': 'email'    # Last resort
   }
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Unverified number" Error (Error 21608)

**Problem**: Trying to send to unverified number in trial mode.

**Solution**:
- Verify recipient numbers in Console → Phone Numbers → Verified Caller IDs
- Or upgrade to paid account for unrestricted sending

#### 2. "Message delivery failed" (Error 30003)

**Problem**: Carrier rejected the message.

**Solution**:
- Check if number is valid and can receive SMS
- Verify country is enabled in Geo permissions
- Try different message content (carrier filtering)

#### 3. "Rate limit exceeded" (Error 20429)

**Problem**: Sending too many messages too quickly.

**Solution**:
- Implement rate limiting in application
- Use Twilio's queue for automatic retry
- Spread sends over time

#### 4. "Invalid phone number" (Error 21211)

**Problem**: Phone number format is incorrect.

**Solution**:
```python
# Always format numbers in E.164
from phonenumbers import parse, format_number, PhoneNumberFormat

def format_phone(number, country='US'):
    parsed = parse(number, country)
    return format_number(parsed, PhoneNumberFormat.E164)
```

#### 5. Long Message Truncation

**Problem**: Messages over 160 characters are split.

**Solution**:
- Use URL shorteners
- Implement message preview
- Warn users about message length

### Debug Logging

Enable detailed logging:

```python
import logging
from twilio.rest import Client

logging.basicConfig(level=logging.DEBUG)
client = Client(account_sid, auth_token)
client.http_client.logger.setLevel(logging.DEBUG)
```

### Support Resources

- **Twilio Status**: https://status.twilio.com/
- **Error Codes**: https://www.twilio.com/docs/api/errors
- **Support**: support@twilio.com
- **Community**: https://www.twilio.com/community

---

## Next Steps

1. Complete Twilio account setup
2. Purchase appropriate phone numbers
3. Configure messaging service
4. Test with development credentials
5. Implement SMS templates
6. Set up monitoring and alerts
7. Deploy to production

---

**Last Updated**: 2025-07-27  
**Version**: 1.0.0