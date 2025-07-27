#!/usr/bin/env python
"""
Test script for Stripe payment integration.
Run this script to test Stripe API connectivity and payment flows.
"""

import os
import sys
import django
import json
from decimal import Decimal

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')
django.setup()

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

# Test data
TEST_CUSTOMER_EMAIL = "test.stripe@safeshipper.com"
TEST_AMOUNT = 2000  # $20.00 in cents


def check_stripe_configuration():
    """Check if Stripe is properly configured"""
    print("=== Stripe Configuration Check ===")
    
    # Check API keys
    if not hasattr(settings, 'STRIPE_SECRET_KEY') or not settings.STRIPE_SECRET_KEY:
        print("❌ STRIPE_SECRET_KEY not configured")
        return False
    
    if not hasattr(settings, 'STRIPE_PUBLISHABLE_KEY') or not settings.STRIPE_PUBLISHABLE_KEY:
        print("❌ STRIPE_PUBLISHABLE_KEY not configured")
        return False
    
    # Check if using test keys
    is_test_mode = settings.STRIPE_SECRET_KEY.startswith('sk_test_')
    print(f"✓ Stripe configured in {'TEST' if is_test_mode else 'LIVE'} mode")
    
    if not is_test_mode and settings.DEBUG:
        print("⚠️  WARNING: Using live Stripe keys in debug mode")
    
    # Set API key
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    return True


def test_api_connectivity():
    """Test basic Stripe API connectivity"""
    print("\n=== API Connectivity Test ===")
    
    try:
        # Test API connectivity
        account = stripe.Account.retrieve()
        print(f"✓ Connected to Stripe API")
        print(f"  Account ID: {account.id}")
        print(f"  Country: {account.country}")
        print(f"  Email: {account.email or 'Not set'}")
        return True
    except stripe.error.AuthenticationError:
        print("❌ Authentication failed - check your API key")
        return False
    except stripe.error.APIConnectionError:
        print("❌ Network error - check your internet connection")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_customer_operations():
    """Test customer creation and management"""
    print("\n=== Customer Operations Test ===")
    
    # Clean up any existing test customer
    try:
        existing_customers = stripe.Customer.list(email=TEST_CUSTOMER_EMAIL, limit=1)
        for customer in existing_customers.data:
            stripe.Customer.delete(customer.id)
            print(f"🧹 Deleted existing test customer: {customer.id}")
    except Exception as e:
        print(f"⚠️  Warning during cleanup: {e}")
    
    try:
        # Create customer
        customer = stripe.Customer.create(
            email=TEST_CUSTOMER_EMAIL,
            name="Test Customer",
            description="Test customer for SafeShipper integration testing",
            metadata={
                'platform': 'safeshipper',
                'test': 'true'
            }
        )
        print(f"✓ Created customer: {customer.id}")
        
        # Retrieve customer
        retrieved_customer = stripe.Customer.retrieve(customer.id)
        print(f"✓ Retrieved customer: {retrieved_customer.email}")
        
        # Update customer
        updated_customer = stripe.Customer.modify(
            customer.id,
            name="Test Customer Updated"
        )
        print(f"✓ Updated customer name: {updated_customer.name}")
        
        return customer.id
        
    except Exception as e:
        print(f"❌ Customer operations failed: {e}")
        return None


def test_payment_intent():
    """Test payment intent creation and confirmation"""
    print("\n=== Payment Intent Test ===")
    
    try:
        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=TEST_AMOUNT,
            currency='usd',
            automatic_payment_methods={'enabled': True},
            metadata={
                'platform': 'safeshipper',
                'test': 'true'
            }
        )
        print(f"✓ Created payment intent: {payment_intent.id}")
        print(f"  Amount: ${payment_intent.amount / 100:.2f}")
        print(f"  Status: {payment_intent.status}")
        print(f"  Client Secret: {payment_intent.client_secret[:20]}...")
        
        # Test with test card (will only work in test mode)
        if payment_intent.client_secret.startswith('pi_'):
            print("💳 Use test card 4242424242424242 to complete payment")
        
        return payment_intent.id
        
    except Exception as e:
        print(f"❌ Payment intent creation failed: {e}")
        return None


def test_subscription_operations():
    """Test subscription creation and management"""
    print("\n=== Subscription Operations Test ===")
    
    try:
        # First, check if we have any products
        products = stripe.Product.list(limit=3)
        if not products.data:
            print("ℹ️  No products found - creating test product and price")
            
            # Create test product
            product = stripe.Product.create(
                name='SafeShipper Test Plan',
                description='Test subscription for SafeShipper platform'
            )
            print(f"✓ Created test product: {product.id}")
            
            # Create test price
            price = stripe.Price.create(
                product=product.id,
                unit_amount=2999,  # $29.99
                currency='usd',
                recurring={'interval': 'month'}
            )
            print(f"✓ Created test price: {price.id}")
        else:
            # Use first available product
            product = products.data[0]
            print(f"✓ Using existing product: {product.name}")
            
            # Get price for product
            prices = stripe.Price.list(product=product.id, limit=1)
            if prices.data:
                price = prices.data[0]
                print(f"✓ Using existing price: ${price.unit_amount / 100:.2f}")
            else:
                print("❌ No prices found for product")
                return None
        
        # Create customer for subscription
        customer = stripe.Customer.create(
            email=f"sub.{TEST_CUSTOMER_EMAIL}",
            name="Subscription Test Customer"
        )
        print(f"✓ Created subscription customer: {customer.id}")
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{'price': price.id}],
            trial_period_days=14,
            metadata={
                'platform': 'safeshipper',
                'test': 'true'
            }
        )
        print(f"✓ Created subscription: {subscription.id}")
        print(f"  Status: {subscription.status}")
        print(f"  Trial ends: {subscription.trial_end}")
        
        return subscription.id
        
    except Exception as e:
        print(f"❌ Subscription operations failed: {e}")
        return None


def test_webhook_endpoints():
    """Test webhook endpoint configuration"""
    print("\n=== Webhook Configuration Test ===")
    
    try:
        # List existing webhooks
        webhooks = stripe.WebhookEndpoint.list(limit=10)
        print(f"✓ Found {len(webhooks.data)} webhook endpoints")
        
        for webhook in webhooks.data:
            print(f"  - {webhook.url} (status: {webhook.status})")
            print(f"    Events: {', '.join(webhook.enabled_events[:3])}{'...' if len(webhook.enabled_events) > 3 else ''}")
        
        if not webhooks.data:
            print("ℹ️  No webhook endpoints configured")
            print("   Consider setting up webhooks for production use")
        
        return True
        
    except Exception as e:
        print(f"❌ Webhook endpoint check failed: {e}")
        return False


def test_event_handling():
    """Test Stripe event handling"""
    print("\n=== Event Handling Test ===")
    
    try:
        # List recent events
        events = stripe.Event.list(limit=5)
        print(f"✓ Retrieved {len(events.data)} recent events")
        
        for event in events.data:
            print(f"  - {event.type} ({event.created})")
        
        if not events.data:
            print("ℹ️  No recent events found")
        
        return True
        
    except Exception as e:
        print(f"❌ Event handling test failed: {e}")
        return False


def test_error_handling():
    """Test error handling scenarios"""
    print("\n=== Error Handling Test ===")
    
    test_results = []
    
    # Test invalid customer ID
    try:
        stripe.Customer.retrieve('cus_invalid_id')
        test_results.append("❌ Should have failed with invalid customer ID")
    except stripe.error.InvalidRequestError:
        test_results.append("✓ Correctly handled invalid customer ID")
    except Exception as e:
        test_results.append(f"❌ Unexpected error for invalid customer: {e}")
    
    # Test invalid amount
    try:
        stripe.PaymentIntent.create(amount=-100, currency='usd')
        test_results.append("❌ Should have failed with negative amount")
    except stripe.error.InvalidRequestError:
        test_results.append("✓ Correctly handled invalid amount")
    except Exception as e:
        test_results.append(f"❌ Unexpected error for invalid amount: {e}")
    
    # Test invalid currency
    try:
        stripe.PaymentIntent.create(amount=1000, currency='invalid')
        test_results.append("❌ Should have failed with invalid currency")
    except stripe.error.InvalidRequestError:
        test_results.append("✓ Correctly handled invalid currency")
    except Exception as e:
        test_results.append(f"❌ Unexpected error for invalid currency: {e}")
    
    for result in test_results:
        print(f"  {result}")
    
    return all("✓" in result for result in test_results)


def cleanup_test_data():
    """Clean up test data created during testing"""
    print("\n=== Cleanup Test Data ===")
    
    try:
        # Clean up test customers
        customers = stripe.Customer.list(email=TEST_CUSTOMER_EMAIL, limit=10)
        for customer in customers.data:
            stripe.Customer.delete(customer.id)
            print(f"🧹 Deleted test customer: {customer.id}")
        
        # Clean up subscription test customers
        sub_customers = stripe.Customer.list(email=f"sub.{TEST_CUSTOMER_EMAIL}", limit=10)
        for customer in sub_customers.data:
            stripe.Customer.delete(customer.id)
            print(f"🧹 Deleted subscription test customer: {customer.id}")
        
        print("✓ Cleanup completed")
        
    except Exception as e:
        print(f"⚠️  Warning during cleanup: {e}")


def display_setup_instructions():
    """Display Stripe setup instructions"""
    print("\n=== Stripe Setup Instructions ===")
    
    print("\n🔧 Initial Setup:")
    print("1. Create account at https://dashboard.stripe.com/register")
    print("2. Complete business verification for live payments")
    print("3. Get API keys from Dashboard → Developers → API keys")
    print("4. Set environment variables:")
    print("   - STRIPE_PUBLISHABLE_KEY=pk_test_...")
    print("   - STRIPE_SECRET_KEY=sk_test_...")
    print("   - STRIPE_WEBHOOK_SECRET=whsec_... (after webhook setup)")
    
    print("\n🔗 Webhook Setup:")
    print("1. Go to Dashboard → Developers → Webhooks")
    print("2. Add endpoint: https://api.yourdomain.com/webhooks/stripe/")
    print("3. Select events:")
    print("   - customer.subscription.created")
    print("   - customer.subscription.updated")
    print("   - invoice.payment_succeeded")
    print("   - invoice.payment_failed")
    print("   - payment_intent.succeeded")
    
    print("\n💳 Test Cards (Test Mode Only):")
    print("- Success: 4242 4242 4242 4242")
    print("- Decline: 4000 0000 0000 0002")
    print("- 3D Secure: 4000 0025 0000 3155")
    
    print("\n🏭 Production Checklist:")
    print("- [ ] Complete Stripe account activation")
    print("- [ ] Switch to live API keys")
    print("- [ ] Configure webhooks for production URL")
    print("- [ ] Set up proper error handling")
    print("- [ ] Implement PCI compliance measures")
    print("- [ ] Test with real payment methods")


def main():
    """Main test function"""
    print("SafeShipper Stripe Integration Test")
    print("=" * 50)
    
    # Check configuration
    if not check_stripe_configuration():
        print("\n❌ Stripe not configured properly")
        display_setup_instructions()
        return
    
    test_results = {}
    
    # Run tests
    test_results['api_connectivity'] = test_api_connectivity()
    test_results['customer_operations'] = test_customer_operations() is not None
    test_results['payment_intent'] = test_payment_intent() is not None
    test_results['subscription_operations'] = test_subscription_operations() is not None
    test_results['webhook_configuration'] = test_webhook_endpoints()
    test_results['event_handling'] = test_event_handling()
    test_results['error_handling'] = test_error_handling()
    
    # Cleanup
    cleanup_test_data()
    
    # Summary
    print("\n" + "=" * 50)
    print("STRIPE INTEGRATION TEST SUMMARY")
    print("=" * 50)
    
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Stripe integration is working correctly.")
    elif passed_tests >= total_tests * 0.7:
        print("⚠️  Most tests passed. Check failed tests above.")
    else:
        print("❌ Multiple test failures. Check configuration and setup.")
    
    if not test_results.get('api_connectivity'):
        print("\n💡 If API connectivity failed:")
        print("   - Verify STRIPE_SECRET_KEY is correct")
        print("   - Check internet connection")
        print("   - Ensure API key has required permissions")
    
    print(f"\n📖 For detailed setup instructions, see:")
    print(f"   docs/external-services/stripe_setup.md")


if __name__ == "__main__":
    main()