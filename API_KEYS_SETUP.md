# 🔐 SafeShipper API Keys & Services Setup Guide

This guide provides comprehensive instructions for obtaining and configuring all external API keys and services required for the SafeShipper platform.

## 📚 Detailed Setup Guides

For comprehensive setup instructions, refer to our detailed guides:

- **[OAuth Setup (Google/Microsoft)](docs/external-services/oauth_setup.md)** - Complete OAuth authentication setup
- **[Twilio SMS Setup](docs/external-services/twilio_setup.md)** - SMS notifications and emergency alerts
- **[Stripe Payment Integration](docs/external-services/stripe_setup.md)** - Payment processing and billing
- **[AWS S3 File Storage](docs/external-services/aws_s3_setup.md)** - Cloud file storage and CDN
- **[Development Fallbacks](docs/external-services/development_fallbacks.md)** - Working without external services
- **[Security Best Practices](docs/external-services/security_best_practices.md)** - Security guidelines and compliance

## 📋 Quick Setup Checklist

### Required Services (Essential for core functionality)
- [ ] PostgreSQL Database
- [ ] Redis Cache/Message Broker
- [ ] Django Secret Key

### Optional Services (Enhanced functionality)
- [ ] Email Service (SendGrid/AWS SES)
- [ ] SMS Service (Twilio) - [Setup Guide](docs/external-services/twilio_setup.md)
- [ ] File Storage (AWS S3) - [Setup Guide](docs/external-services/aws_s3_setup.md)
- [ ] Payment Processing (Stripe) - [Setup Guide](docs/external-services/stripe_setup.md)
- [ ] OAuth Authentication (Google/Microsoft) - [Setup Guide](docs/external-services/oauth_setup.md)
- [ ] Mapping Services (Google Maps)
- [ ] AI Services (OpenAI)
- [ ] Push Notifications (Firebase)

---

## 🚀 Quick Start for Development

For local development, you can start with minimal configuration:

1. Copy environment files:
   ```bash
   cp backend/env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. Set up basic database and cache:
   - PostgreSQL with PostGIS extension
   - Redis server

3. Generate secure keys:
   ```bash
   # Django secret key
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

4. The system will work with mock services for optional features.

---

## 🔑 Core Services Setup

### 1. Database (PostgreSQL with PostGIS)

**Required for:** All data storage

**Setup:**
```bash
# Install PostgreSQL and PostGIS
sudo apt-get install postgresql postgresql-contrib postgis

# Create database
sudo -u postgres createdb safeshipper
sudo -u postgres psql -c "CREATE EXTENSION postgis;" safeshipper
```

**Environment Variables:**
```env
DB_ENGINE=django.contrib.gis.db.backends.postgis
DB_NAME=safeshipper
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432
```

### 2. Redis (Cache & Message Broker)

**Required for:** Background tasks, caching, real-time features

**Setup:**
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
```

**Environment Variables:**
```env
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### 3. Security Keys

**Required for:** Authentication and security

**Generate secure keys:**
```bash
# Django SECRET_KEY (256 bits)
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# JWT signing key
openssl rand -base64 32
```

**Environment Variables:**
```env
SECRET_KEY=your-generated-secret-key
JWT_SIGNING_KEY=your-generated-jwt-key
NEXTAUTH_SECRET=your-generated-nextauth-secret
```

---

## 📧 Email Services

### Option 1: SendGrid (Recommended)

**Purpose:** Transactional emails, notifications

**Setup:**
1. Visit [SendGrid](https://sendgrid.com/)
2. Create account and verify your domain
3. Generate API key from Settings → API Keys

**Environment Variables:**
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
EMAIL_USE_TLS=True
```

### Option 2: AWS SES

**Setup:**
1. AWS Console → Simple Email Service
2. Verify your domain/email addresses
3. Create SMTP credentials

**Environment Variables:**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_HOST_USER=your-ses-smtp-username
EMAIL_HOST_PASSWORD=your-ses-smtp-password
```

---

## 📱 SMS & Push Notifications

### Twilio SMS Service

**Purpose:** SMS notifications, emergency alerts

**Setup:**
1. Visit [Twilio Console](https://console.twilio.com/)
2. Create account and verify phone number
3. Purchase a phone number
4. Copy Account SID and Auth Token

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Cost:** ~$1/month for phone number + usage fees

### Firebase Cloud Messaging (Push Notifications)

**Purpose:** Mobile app push notifications

**Setup:**
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Add web app to project
4. Generate service account key
5. Copy server key and configuration

**Environment Variables:**
```env
FCM_SERVER_KEY=your-firebase-server-key
NEXT_PUBLIC_FCM_VAPID_KEY=your-firebase-vapid-key
NEXT_PUBLIC_FCM_PROJECT_ID=your-firebase-project-id
```

---

## ☁️ Cloud Storage (AWS S3)

**Purpose:** File uploads, document storage, static assets

**Setup:**
1. Visit [AWS Console](https://console.aws.amazon.com/)
2. Create S3 bucket
3. Create IAM user with S3 permissions
4. Generate access keys

**IAM Policy (minimum permissions):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

**Environment Variables:**
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_STORAGE_BUCKET_NAME=safeshipper-files
AWS_S3_REGION_NAME=us-east-1
```

**Cost:** ~$0.023/GB/month + transfer fees

---

## 💳 Payment Processing (Stripe)

**Purpose:** Payment processing, billing

**Setup:**
1. Visit [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create account and complete verification
3. Get publishable and secret keys
4. Set up webhooks

**Environment Variables:**
```env
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
```

**Webhook Endpoint:** `https://your-domain.com/api/webhooks/stripe/`

---

## 🔐 OAuth Authentication

### Google OAuth2

**Purpose:** Google Sign-In

**Setup:**
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs

**Authorized Redirect URIs:**
- `http://localhost:3000/api/auth/callback/google` (development)
- `https://your-domain.com/api/auth/callback/google` (production)

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
```

### Microsoft Azure AD

**Purpose:** Microsoft/Office 365 Sign-In

**Setup:**
1. Visit [Azure Portal](https://portal.azure.com/)
2. Azure Active Directory → App registrations
3. New registration
4. Add redirect URIs and API permissions

**Environment Variables:**
```env
MICROSOFT_CLIENT_ID=your-azure-app-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-azure-app-id
```

---

## 🗺️ Mapping Services

### Google Maps API

**Purpose:** Enhanced mapping, geocoding, directions

**Setup:**
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API, Geocoding API, Directions API
3. Create API key
4. Restrict API key to your domains

**Environment Variables:**
```env
GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Required APIs:**
- Maps JavaScript API
- Geocoding API
- Directions API
- Places API (optional)

**Cost:** $200/month free tier, then usage-based pricing

### Alternative: Mapbox

**Purpose:** Alternative mapping service

**Setup:**
1. Visit [Mapbox](https://www.mapbox.com/)
2. Create account
3. Generate access token

**Environment Variables:**
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbG...
```

---

## 🤖 AI/ML Services

### OpenAI API

**Purpose:** Document processing, content generation

**Setup:**
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create account and add payment method
3. Generate API key

**Environment Variables:**
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Cost:** Usage-based, starts at ~$0.002/1K tokens

---

## 📊 Analytics & Monitoring

### Google Analytics

**Purpose:** Web analytics

**Setup:**
1. Visit [Google Analytics](https://analytics.google.com/)
2. Create property
3. Get tracking ID

**Environment Variables:**
```env
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
```

### Sentry (Error Monitoring)

**Purpose:** Error tracking and performance monitoring

**Setup:**
1. Visit [Sentry](https://sentry.io/)
2. Create project
3. Get DSN

**Environment Variables:**
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx
```

---

## 🚀 Production Deployment Considerations

### Security Best Practices

1. **Never commit API keys to git**
2. **Use environment-specific keys** (test vs production)
3. **Rotate keys regularly**
4. **Use IAM roles instead of keys when possible** (AWS)
5. **Restrict API keys by domain/IP** when possible

### Environment Variables for Production

```env
# Security
DEBUG=False
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True

# Production URLs
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Production API keys (use production credentials)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

### Docker Production Setup

Use Docker secrets or environment files:

```yaml
# docker-compose.prod.yml
services:
  backend:
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
    secrets:
      - db_password
      - stripe_secret_key
```

---

## 🔧 Development vs Production

### Development Mode
- Mock services enabled by default
- Console email backend
- Local file storage
- Test API keys (where applicable)

### Production Mode
- All external services required
- SMTP email backend
- Cloud file storage (S3)
- Production API keys
- Enhanced security settings

---

## ❓ Troubleshooting

### Common Issues

1. **Database connection errors**
   - Ensure PostgreSQL is running
   - Check PostGIS extension is installed
   - Verify connection credentials

2. **Redis connection errors**
   - Ensure Redis server is running
   - Check Redis URL format

3. **Email not sending**
   - Verify SMTP settings
   - Check email service credentials
   - Ensure domain is verified (SendGrid/SES)

4. **API key errors**
   - Verify keys are correctly copied
   - Check API key restrictions/permissions
   - Ensure billing is set up (for paid services)

### Testing API Keys

Run the provided test scripts:

```bash
# Test email configuration
python backend/test_email_integration.py

# Test SMS configuration  
python backend/test_sms_integration.py

# Test OAuth configuration
python backend/test_oauth_integration.py
```

---

## 📞 Support

- **General Setup Issues:** Check the main README.md
- **Deployment Issues:** See DEPLOYMENT.md
- **Security Questions:** See SECURITY.md
- **API Documentation:** Visit `/api/docs/` when server is running

---

**Last Updated:** 2025-07-26  
**Version:** 1.0.0