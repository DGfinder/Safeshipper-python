# 🔐 OAuth Authentication Setup Guide

This guide provides detailed implementation instructions for setting up OAuth authentication with Google and Microsoft in the SafeShipper platform.

## 📋 Overview

SafeShipper supports OAuth authentication through:
- **Google OAuth2** (Google Sign-In)
- **Microsoft Azure AD** (Microsoft/Office 365 Sign-In)

Both integrations work with Django on the backend and Next.js/NextAuth.js on the frontend.

---

## 🔧 Backend Configuration (Django)

### Django Settings

The OAuth providers are configured in `backend/safeshipper_core/settings.py`:

```python
# OAuth2 Provider Settings
OAUTH2_PROVIDERS = {
    'google': {
        'client_id': config('GOOGLE_CLIENT_ID', default=''),
        'secret': config('GOOGLE_CLIENT_SECRET', default=''),
        'scope': ['openid', 'email', 'profile'],
        'redirect_uri': f"{FRONTEND_URL}/api/auth/callback/google"
    },
    'microsoft': {
        'client_id': config('MICROSOFT_CLIENT_ID', default=''),
        'secret': config('MICROSOFT_CLIENT_SECRET', default=''),
        'scope': ['openid', 'email', 'profile'],
        'redirect_uri': f"{FRONTEND_URL}/api/auth/callback/microsoft"
    }
}
```

### Required Environment Variables

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx

# Microsoft Azure AD
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🌐 Frontend Configuration (Next.js)

### NextAuth.js Configuration

Create or update `frontend/pages/api/auth/[...nextauth].js`:

```javascript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist OAuth provider info
      if (account) {
        token.provider = account.provider
        token.access_token = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.provider = token.provider
      session.access_token = token.access_token
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
})
```

### Frontend Environment Variables

```env
# NextAuth.js configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# OAuth providers (public keys)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# OAuth providers (private keys)
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=common
```

---

## 🔍 Google OAuth2 Setup (Detailed)

### Step 1: Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Note the project ID

### Step 2: Enable APIs

1. Navigate to "APIs & Services" → "Library"
2. Enable the following APIs:
   - Google+ API
   - Google Identity and Access Management (IAM) API

### Step 3: Create OAuth2 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure:

**Name:** SafeShipper OAuth Client

**Authorized JavaScript origins:**
```
http://localhost:3000
https://your-domain.com
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

### Step 4: OAuth Consent Screen

1. Go to "OAuth consent screen"
2. Choose "External" (for public apps) or "Internal" (for workspace apps)
3. Configure:

**App Information:**
- App name: SafeShipper
- User support email: your-email@domain.com
- App domain: your-domain.com

**Scopes:**
- `openid`
- `email` 
- `profile`

**Test users:** Add test email addresses for development

### Step 5: Domain Verification (Production)

For production domains:
1. Search Console → Add property
2. Verify domain ownership
3. Add verified domain to OAuth consent screen

---

## 🏢 Microsoft Azure AD Setup (Detailed)

### Step 1: Create Azure AD Application

1. Visit [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory"
3. Go to "App registrations" → "New registration"

### Step 2: Configure Application

**Name:** SafeShipper OAuth

**Supported account types:**
- Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts

**Redirect URI:**
- Type: Web
- URI: `http://localhost:3000/api/auth/callback/azure-ad`

### Step 3: Configure Authentication

1. Go to "Authentication" in your app registration
2. Add additional redirect URIs:
```
https://your-domain.com/api/auth/callback/azure-ad
```

3. Configure advanced settings:
   - Access tokens: ✓ Checked
   - ID tokens: ✓ Checked

### Step 4: API Permissions

1. Go to "API permissions"
2. Add permissions:
   - Microsoft Graph → Delegated permissions
   - `openid`, `email`, `profile`, `User.Read`

3. Grant admin consent (if required)

### Step 5: Create Client Secret

1. Go to "Certificates & secrets"
2. "New client secret"
3. Description: SafeShipper Production
4. Expires: 24 months (recommended)
5. Copy the secret value immediately

### Step 6: Branding (Optional)

1. Go to "Branding"
2. Add logo and publisher information
3. Configure home page URL: `https://your-domain.com`

---

## 🔧 Backend Integration

### Django OAuth Views

Create custom OAuth views in `backend/users/oauth_views.py`:

```python
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import requests

@api_view(['POST'])
@permission_classes([AllowAny])
def google_oauth_callback(request):
    """Handle Google OAuth callback"""
    code = request.data.get('code')
    
    # Exchange code for tokens
    token_response = requests.post('https://oauth2.googleapis.com/token', {
        'client_id': settings.OAUTH2_PROVIDERS['google']['client_id'],
        'client_secret': settings.OAUTH2_PROVIDERS['google']['secret'],
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': settings.OAUTH2_PROVIDERS['google']['redirect_uri']
    })
    
    if token_response.status_code == 200:
        tokens = token_response.json()
        access_token = tokens['access_token']
        
        # Get user info
        user_response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if user_response.status_code == 200:
            user_data = user_response.json()
            # Create or get user, generate JWT tokens
            # ... implementation details
            
    return Response({'error': 'OAuth authentication failed'}, status=400)
```

### URL Configuration

Add to `backend/users/urls.py`:

```python
from django.urls import path
from . import oauth_views

urlpatterns = [
    # ... existing patterns
    path('oauth/google/callback/', oauth_views.google_oauth_callback),
    path('oauth/microsoft/callback/', oauth_views.microsoft_oauth_callback),
]
```

---

## 🎨 Frontend Integration

### Login Component

Create `frontend/src/components/auth/OAuthLogin.tsx`:

```typescript
import { signIn, getSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function OAuthLogin() {
  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  const handleMicrosoftLogin = () => {
    signIn('azure-ad', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full"
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
      
      <Button 
        onClick={handleMicrosoftLogin}
        variant="outline" 
        className="w-full"
      >
        <MicrosoftIcon className="mr-2 h-4 w-4" />
        Continue with Microsoft
      </Button>
    </div>
  )
}
```

### Session Management

Use NextAuth.js session management:

```typescript
import { useSession } from 'next-auth/react'

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    provider: session?.provider
  }
}
```

---

## 🧪 Testing OAuth Integration

### Test OAuth Flows

1. **Development Testing:**
   ```bash
   # Start both services
   cd backend && python manage.py runserver
   cd frontend && npm run dev
   ```

2. **Test Google OAuth:**
   - Visit `http://localhost:3000/login`
   - Click "Continue with Google"
   - Complete OAuth flow
   - Verify user creation in Django admin

3. **Test Microsoft OAuth:**
   - Click "Continue with Microsoft"
   - Sign in with Microsoft account
   - Verify successful authentication

### Debug Common Issues

1. **Invalid redirect URI:**
   - Check exact match in provider console
   - Ensure protocol (http/https) matches

2. **Invalid client ID:**
   - Verify environment variables are set
   - Check for typos in client ID

3. **Scope errors:**
   - Ensure required scopes are requested
   - Check user consent for required permissions

---

## 🔒 Security Considerations

### Production Security

1. **Environment Variables:**
   - Never commit OAuth secrets to git
   - Use different credentials for dev/staging/prod
   - Rotate secrets regularly

2. **Redirect URI Security:**
   - Only allow HTTPS in production
   - Whitelist exact redirect URIs
   - Avoid wildcard domains

3. **Token Security:**
   - Store tokens securely (httpOnly cookies)
   - Implement token refresh
   - Use shortest possible token lifetimes

### Monitoring & Logging

```python
import logging

logger = logging.getLogger(__name__)

def oauth_callback(request):
    logger.info(f"OAuth callback initiated from IP: {request.META.get('REMOTE_ADDR')}")
    
    try:
        # OAuth processing
        pass
    except Exception as e:
        logger.error(f"OAuth authentication failed: {str(e)}")
        # Handle error
```

---

## 📊 Usage Analytics

### Track OAuth Usage

```python
from django.contrib.auth.signals import user_logged_in

def track_oauth_login(sender, request, user, **kwargs):
    """Track OAuth login events"""
    if hasattr(request, 'oauth_provider'):
        # Log OAuth provider usage
        logger.info(f"User {user.id} logged in via {request.oauth_provider}")

user_logged_in.connect(track_oauth_login)
```

---

## 🆘 Troubleshooting

### Common Error Messages

1. **"invalid_client"**
   - Check client ID and secret
   - Verify credentials in provider console

2. **"redirect_uri_mismatch"**
   - Ensure exact URI match in provider settings
   - Check for trailing slashes

3. **"access_denied"**
   - User denied permissions
   - Check required scopes

4. **"invalid_grant"**
   - Authorization code expired or already used
   - Implement proper error handling

### Debug Mode

Enable OAuth debugging:

```env
# Backend
DEBUG=True
LOG_LEVEL=DEBUG

# Frontend  
NEXTAUTH_DEBUG=1
```

### Test Scripts

Run OAuth integration tests:

```bash
# Test OAuth configuration
python backend/test_oauth_integration.py

# Verify environment variables
python backend/manage.py check_oauth_config
```

---

## 📚 Additional Resources

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Django OAuth Toolkit](https://django-oauth-toolkit.readthedocs.io/)

---

**Last Updated:** 2025-07-26  
**Version:** 1.0.0