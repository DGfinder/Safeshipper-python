# 💳 Stripe Payment Integration Setup Guide

This comprehensive guide covers setting up Stripe payment processing for the SafeShipper platform, including subscription billing, usage-based pricing, and payment method management.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Account Setup](#account-setup)
3. [API Configuration](#api-configuration)
4. [Product & Pricing Setup](#product--pricing-setup)
5. [Backend Integration](#backend-integration)
6. [Frontend Integration](#frontend-integration)
7. [Webhook Configuration](#webhook-configuration)
8. [Testing & Development](#testing--development)
9. [PCI Compliance](#pci-compliance)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)

---

## Overview

SafeShipper uses Stripe for:
- **Subscription Management**: Monthly/annual platform subscriptions
- **Usage-Based Billing**: Per-shipment and per-mile charges
- **Payment Methods**: Credit/debit cards, ACH transfers, wire transfers
- **Invoice Management**: Automated invoicing and payment collection
- **Financial Reporting**: Revenue analytics and reconciliation

### Billing Models Supported

1. **Platform Subscription**: Base monthly/annual fee
2. **Usage-Based**: Per shipment, per mile, per dangerous goods handling
3. **Tiered Pricing**: Volume discounts for large customers
4. **Custom Contracts**: Enterprise pricing with net terms

---

## Account Setup

### Step 1: Create Stripe Account

1. Visit [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Create account with business email
3. Complete email verification

### Step 2: Activate Your Account

Complete business verification for live payments:

1. Navigate to "Settings" → "Business details"
2. Provide required information:
   ```
   Business Type: Company/Corporation
   Industry: Transportation and Logistics
   Business Description: "Digital platform for dangerous goods shipping management"
   Website: https://yourdomain.com
   ```
3. Add business documentation:
   - EIN/Tax ID
   - Business registration
   - Bank account for payouts

### Step 3: Configure Business Settings

1. **Payout Schedule**:
   - Settings → Payouts
   - Choose: Daily, Weekly, or Manual
   - Set minimum payout amount

2. **Statement Descriptor**:
   - Settings → Business details → Public details
   - Set to: "SAFESHIPPER" or "SAFESHIPPER.COM"

3. **Customer Emails**:
   - Settings → Business details → Customer emails
   - Enable receipt emails
   - Customize email templates

---

## API Configuration

### Step 1: Get API Keys

1. Navigate to "Developers" → "API keys"
2. You'll see two sets of keys:
   - **Test mode**: For development (sk_test_...)
   - **Live mode**: For production (sk_live_...)

### Step 2: Create Restricted Keys (Recommended)

For enhanced security, create restricted API keys:

1. Click "Create restricted key"
2. Name: "SafeShipper Backend Production"
3. Set permissions:
   ```
   Customers:           Write
   Payment Intents:     Write
   Payment Methods:     Write
   Subscriptions:       Write
   Invoices:           Write
   Webhook Endpoints:   Read
   Products:           Read
   Prices:             Read
   ```
4. Save the restricted key

### Step 3: Set Environment Variables

Backend (.env):
```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
STRIPE_SECRET_KEY=sk_test_...      # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...    # From webhook endpoint setup
STRIPE_API_VERSION=2023-10-16      # Pin API version

# Optional: Restricted keys for specific services
STRIPE_BILLING_KEY=rk_live_...     # For billing service only
```

Frontend (.env.local):
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Product & Pricing Setup

### Step 1: Create Products

Navigate to "Products" → "Add product":

#### 1. Platform Subscription
```
Name: SafeShipper Platform
Description: Complete dangerous goods shipping management platform
Statement descriptor: SAFESHIPPER SUB
```

#### 2. Usage-Based Products
```
Name: Shipment Processing
Description: Per-shipment processing fee
Unit label: shipment
Statement descriptor: SAFESHIPPER SHIP

Name: Dangerous Goods Handling
Description: Additional fee for DG shipments
Unit label: dg_shipment
Statement descriptor: SAFESHIPPER DG

Name: Mileage Charges
Description: Per-mile transportation fee
Unit label: mile
Statement descriptor: SAFESHIPPER MILE
```

### Step 2: Configure Pricing

#### Subscription Tiers

1. **Starter Plan** ($299/month):
   ```
   Product: SafeShipper Platform
   Pricing model: Standard pricing
   Price: $299.00
   Billing period: Monthly
   ```

2. **Professional Plan** ($799/month):
   ```
   Product: SafeShipper Platform
   Pricing model: Standard pricing
   Price: $799.00
   Billing period: Monthly
   Features: Include via metadata
   ```

3. **Enterprise Plan** (Custom):
   ```
   Product: SafeShipper Platform
   Pricing model: Custom
   Contact sales for pricing
   ```

#### Usage-Based Pricing

1. **Shipment Processing**:
   ```
   Pricing model: Tiered graduated
   Billing method: Per unit
   Tiers:
   - First 100: $2.00/shipment
   - Next 400: $1.50/shipment
   - Next 500: $1.00/shipment
   - 1001+: $0.75/shipment
   ```

2. **Dangerous Goods Surcharge**:
   ```
   Pricing model: Standard
   Price: $5.00 per DG shipment
   ```

### Step 3: Create Tax Settings

1. Go to "Settings" → "Tax"
2. Enable "Automatic tax calculation"
3. Add tax registrations for relevant jurisdictions
4. Set product tax codes:
   - Platform subscription: `txcd_10103000` (SaaS)
   - Shipping services: `txcd_92000000` (Freight)

---

## Backend Integration

### Step 1: Install Stripe SDK

```bash
pip install stripe
```

### Step 2: Create Payment Service

Create `backend/payments/stripe_service.py`:

```python
import stripe
from django.conf import settings
from typing import Dict, Optional

stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = settings.STRIPE_API_VERSION


class StripeService:
    """Handles all Stripe payment operations"""
    
    def create_customer(self, user, company) -> str:
        """Create Stripe customer for a user"""
        customer = stripe.Customer.create(
            email=user.email,
            name=f"{user.first_name} {user.last_name}",
            metadata={
                'user_id': str(user.id),
                'company_id': str(company.id),
                'company_name': company.name
            }
        )
        return customer.id
    
    def create_subscription(self, customer_id: str, price_id: str, 
                          trial_days: int = 14) -> Dict:
        """Create subscription with trial period"""
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{'price': price_id}],
            trial_period_days=trial_days,
            metadata={
                'platform': 'safeshipper',
                'environment': settings.ENVIRONMENT
            }
        )
        return subscription
    
    def create_usage_record(self, subscription_item_id: str, 
                          quantity: int, action: str = 'increment') -> Dict:
        """Record usage for metered billing"""
        return stripe.SubscriptionItem.create_usage_record(
            subscription_item_id,
            quantity=quantity,
            action=action,
            timestamp=int(time.time())
        )
    
    def create_payment_intent(self, amount: int, currency: str = 'usd',
                            customer_id: Optional[str] = None) -> Dict:
        """Create payment intent for one-time charges"""
        return stripe.PaymentIntent.create(
            amount=amount,  # Amount in cents
            currency=currency,
            customer=customer_id,
            automatic_payment_methods={'enabled': True},
            metadata={
                'platform': 'safeshipper'
            }
        )
    
    def create_setup_intent(self, customer_id: str) -> Dict:
        """Create setup intent for saving payment methods"""
        return stripe.SetupIntent.create(
            customer=customer_id,
            automatic_payment_methods={'enabled': True},
            usage='off_session'  # For future charges
        )


stripe_service = StripeService()
```

### Step 3: Create Billing Models

```python
# backend/payments/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomerProfile(models.Model):
    """Stripe customer profile"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    stripe_customer_id = models.CharField(max_length=255, unique=True)
    default_payment_method = models.CharField(max_length=255, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Subscription(models.Model):
    """Active subscriptions"""
    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE)
    stripe_subscription_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=50)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancel_at_period_end = models.BooleanField(default=False)
    

class UsageRecord(models.Model):
    """Track usage for billing"""
    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE)
    record_type = models.CharField(max_length=50)  # shipment, dg_handling, mileage
    quantity = models.IntegerField()
    unit_amount = models.DecimalField(max_digits=10, decimal_places=2)
    recorded_at = models.DateTimeField(auto_now_add=True)
    synced_to_stripe = models.BooleanField(default=False)
```

---

## Frontend Integration

### Step 1: Install Stripe.js

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 2: Setup Stripe Provider

```typescript
// app/providers.tsx
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function Providers({ children }) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
```

### Step 3: Create Payment Form Component

```typescript
// components/billing/PaymentForm.tsx
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

export function PaymentForm({ clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing/success`,
      },
    });

    if (error) {
      setError(error.message);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <div className="error">{error}</div>}
      <button disabled={!stripe || processing}>
        {processing ? 'Processing...' : 'Subscribe'}
      </button>
    </form>
  );
}
```

### Step 4: Create Billing Dashboard

```typescript
// components/billing/BillingDashboard.tsx
export function BillingDashboard() {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: fetchSubscription
  });

  const { data: usage } = useQuery({
    queryKey: ['usage', new Date().toISOString().slice(0, 7)],
    queryFn: fetchCurrentMonthUsage
  });

  return (
    <div className="billing-dashboard">
      <SubscriptionCard subscription={subscription} />
      <UsageCard usage={usage} />
      <PaymentMethodsCard />
      <InvoiceHistory />
    </div>
  );
}
```

---

## Webhook Configuration

### Step 1: Create Webhook Endpoint

1. Go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Configure:
   ```
   Endpoint URL: https://api.yourdomain.com/webhooks/stripe/
   Events to send:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
   - payment_intent.succeeded
   - payment_method.attached
   ```
4. Copy the webhook signing secret

### Step 2: Implement Webhook Handler

```python
# backend/payments/webhooks.py
import stripe
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        return HttpResponseBadRequest('Invalid payload')
    except stripe.error.SignatureVerificationError:
        return HttpResponseBadRequest('Invalid signature')

    # Handle events
    if event['type'] == 'customer.subscription.created':
        handle_subscription_created(event['data']['object'])
    elif event['type'] == 'customer.subscription.updated':
        handle_subscription_updated(event['data']['object'])
    elif event['type'] == 'invoice.payment_succeeded':
        handle_payment_succeeded(event['data']['object'])
    elif event['type'] == 'invoice.payment_failed':
        handle_payment_failed(event['data']['object'])

    return HttpResponse(status=200)
```

---

## Testing & Development

### Step 1: Use Test Mode

Always use test mode keys during development:
- Test cards: https://stripe.com/docs/testing
- Common test cards:
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`
  - 3D Secure: `4000 0025 0000 3155`

### Step 2: Test Different Scenarios

```python
# backend/test_stripe_integration.py
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def test_stripe_integration():
    """Test Stripe API connectivity and basic operations"""
    
    print("=== Stripe Integration Test ===")
    
    # Test 1: API connectivity
    try:
        stripe.Account.retrieve()
        print("✓ Successfully connected to Stripe API")
    except Exception as e:
        print(f"✗ Failed to connect to Stripe: {e}")
        return
    
    # Test 2: Create test customer
    try:
        customer = stripe.Customer.create(
            email="test@safeshipper.com",
            description="Test customer for SafeShipper"
        )
        print(f"✓ Created test customer: {customer.id}")
    except Exception as e:
        print(f"✗ Failed to create customer: {e}")
        return
    
    # Test 3: Create payment intent
    try:
        intent = stripe.PaymentIntent.create(
            amount=1000,  # $10.00
            currency='usd',
            customer=customer.id
        )
        print(f"✓ Created payment intent: {intent.id}")
    except Exception as e:
        print(f"✗ Failed to create payment intent: {e}")
    
    # Test 4: List products
    try:
        products = stripe.Product.list(limit=3)
        print(f"✓ Found {len(products.data)} products")
    except Exception as e:
        print(f"✗ Failed to list products: {e}")
    
    # Cleanup
    try:
        stripe.Customer.delete(customer.id)
        print("✓ Cleaned up test data")
    except:
        pass
    
    print("\n=== Test Complete ===")


if __name__ == "__main__":
    test_stripe_integration()
```

### Step 3: Use Stripe CLI for Testing

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
curl -L https://github.com/stripe/stripe-cli/releases/download/v1.x.x/stripe_1.x.x_linux_x86_64.tar.gz | tar xz
```

Test webhooks locally:
```bash
# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8000/webhooks/stripe/

# Trigger test events
stripe trigger payment_intent.succeeded
```

---

## PCI Compliance

### Security Requirements

SafeShipper maintains PCI compliance by:

1. **Never storing card details**: Use Stripe Elements/Payment Element
2. **Using HTTPS everywhere**: SSL/TLS encryption required
3. **Tokenization**: Convert card details to tokens on Stripe's servers
4. **Regular updates**: Keep Stripe SDKs updated

### Implementation Guidelines

1. **Frontend Security**:
   ```typescript
   // NEVER do this:
   const cardNumber = document.getElementById('card-number').value;
   
   // ALWAYS use Stripe Elements:
   const { error, paymentMethod } = await stripe.createPaymentMethod({
     type: 'card',
     card: elements.getElement(CardElement)
   });
   ```

2. **Backend Security**:
   ```python
   # NEVER log sensitive data
   # NEVER store card details in your database
   # ALWAYS use Stripe tokens/IDs
   ```

3. **Compliance Checklist**:
   - [ ] SSL certificate installed and valid
   - [ ] Using Stripe Elements for card collection
   - [ ] No card data in server logs
   - [ ] Regular security updates
   - [ ] Employee training on PCI compliance

---

## Production Deployment

### Pre-Launch Checklist

- [ ] Complete Stripe account activation
- [ ] Set up all products and prices
- [ ] Configure tax settings
- [ ] Test all payment flows
- [ ] Set up webhook endpoints
- [ ] Configure fraud prevention rules
- [ ] Enable Stripe Radar (fraud detection)
- [ ] Set up financial reporting
- [ ] Review and accept Stripe terms

### Production Configuration

1. **Environment Variables**:
   ```env
   # Production values
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_ENVIRONMENT=production
   ```

2. **Security Headers**:
   ```python
   # Add Content Security Policy
   CSP_DIRECTIVES = {
       'frame-src': ["'self'", 'https://js.stripe.com'],
       'script-src': ["'self'", 'https://js.stripe.com'],
       'connect-src': ["'self'", 'https://api.stripe.com'],
   }
   ```

3. **Monitoring Setup**:
   - Enable Stripe Radar for fraud detection
   - Set up webhook monitoring
   - Configure payment failure alerts
   - Track key metrics (MRR, churn, failed payments)

### Going Live Checklist

1. **Switch to Live Mode**:
   - Update all API keys to live versions
   - Update webhook endpoints to live mode
   - Test with real card (small amount)

2. **Customer Communication**:
   - Update terms of service
   - Add billing information to website
   - Prepare customer support for billing questions

3. **Financial Setup**:
   - Verify bank account for payouts
   - Set up accounting integration
   - Configure tax reporting

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "No such customer" Error

**Problem**: Customer ID doesn't exist or wrong API keys.

**Solution**:
- Verify using correct environment (test vs live)
- Check customer was created in same environment
- Ensure customer ID is saved correctly

#### 2. "Card declined" Errors

**Problem**: Payment method rejected.

**Solution**:
```python
# Handle specific decline codes
if error.code == 'card_declined':
    if error.decline_code == 'insufficient_funds':
        message = "Insufficient funds. Please try another card."
    elif error.decline_code == 'expired_card':
        message = "Card expired. Please update your payment method."
    else:
        message = "Card declined. Please try another payment method."
```

#### 3. Webhook Signature Verification Failures

**Problem**: Webhook signature doesn't match.

**Solution**:
- Ensure using raw request body (not parsed)
- Verify webhook secret is correct
- Check for proxy modifications to request

#### 4. Subscription State Issues

**Problem**: Subscription status out of sync.

**Solution**:
```python
# Implement reconciliation
def reconcile_subscription(subscription_id):
    stripe_sub = stripe.Subscription.retrieve(subscription_id)
    local_sub = Subscription.objects.get(stripe_subscription_id=subscription_id)
    
    if stripe_sub.status != local_sub.status:
        local_sub.status = stripe_sub.status
        local_sub.save()
```

### Debug Mode

Enable detailed logging:
```python
# settings.py
STRIPE_LOG_LEVEL = 'debug'  # Only in development!

# Enable in code
stripe.log = 'debug'
stripe.max_network_retries = 2
```

### Support Resources

- **Stripe Status**: https://status.stripe.com/
- **API Reference**: https://stripe.com/docs/api
- **Support**: support@stripe.com
- **Discord Community**: https://discord.gg/stripe

---

## Next Steps

1. Create Stripe account and complete activation
2. Set up products and pricing
3. Configure webhook endpoints
4. Implement payment collection flow
5. Test complete billing cycle
6. Set up monitoring and alerts
7. Launch in production

---

**Last Updated**: 2025-07-27  
**Version**: 1.0.0