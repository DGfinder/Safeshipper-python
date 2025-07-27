# 🔐 OAuth Authentication Setup Guide

This comprehensive guide covers setting up OAuth authentication for Google and Microsoft in the SafeShipper platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Google OAuth Setup](#google-oauth-setup)
3. [Microsoft Azure AD Setup](#microsoft-azure-ad-setup)
4. [Backend Configuration](#backend-configuration)
5. [Frontend Integration](#frontend-integration)
6. [Testing OAuth Flow](#testing-oauth-flow)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Overview

SafeShipper supports OAuth authentication for:
- **Google Sign-In**: For Google Workspace and personal Google accounts
- **Microsoft Sign-In**: For Microsoft 365 and Azure AD accounts

Both providers are integrated using Django-allauth on the backend and can be consumed by both the Next.js frontend and React Native mobile app.

---

## Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "SafeShipper Production" (or appropriate name)
4. Click "Create"

### Step 2: Enable Required APIs

1. In the project dashboard, go to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google+ API** (required for OAuth)
   - **People API** (for profile information)
3. Click "Enable" for each API

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose user type:
   - **Internal**: For G Suite/Workspace organizations only
   - **External**: For any Google account (recommended)
3. Fill in the application information:
   ```
   App name: SafeShipper
   User support email: support@yourdomain.com
   App logo: Upload your logo (optional)
   Application home page: https://yourdomain.com
   Application privacy policy: https://yourdomain.com/privacy
   Application terms of service: https://yourdomain.com/terms
   ```
4. Add authorized domains:
   - `yourdomain.com`
   - `localhost` (for development)
5. Add scopes:
   - `email`
   - `profile`
   - `openid`
6. Save and continue

### Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "SafeShipper Web Client"
5. Add Authorized JavaScript origins:
   ```
   http://localhost:3000          (frontend dev)
   http://localhost:8000          (backend dev)
   https://yourdomain.com         (production)
   https://api.yourdomain.com     (production API)
   ```
6. Add Authorized redirect URIs:
   ```
   # Development
   http://localhost:8000/accounts/google/login/callback/
   http://localhost:3000/api/auth/callback/google
   
   # Production
   https://api.yourdomain.com/accounts/google/login/callback/
   https://yourdomain.com/api/auth/callback/google
   ```
7. Click "Create"
8. Save the **Client ID** and **Client Secret**

### Step 5: Set Environment Variables

Backend (.env):
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Frontend (.env.local):
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Microsoft Azure AD Setup

### Step 1: Access Azure Portal

1. Visit [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. Navigate to "Azure Active Directory"

### Step 2: Register Application

1. Go to "App registrations" → "New registration"
2. Fill in the details:
   ```
   Name: SafeShipper
   Supported account types: 
     - Single tenant (your org only)
     - Multitenant (any Azure AD)
     - Personal Microsoft accounts (recommended for broad access)
   ```
3. Redirect URI:
   - Platform: Web
   - URL: `http://localhost:8000/accounts/microsoft/login/callback/`
4. Click "Register"
5. Copy the **Application (client) ID**

### Step 3: Configure Authentication

1. In your app registration, go to "Authentication"
2. Add additional redirect URIs:
   ```
   # Development
   http://localhost:8000/accounts/microsoft/login/callback/
   http://localhost:3000/api/auth/callback/microsoft
   
   # Production
   https://api.yourdomain.com/accounts/microsoft/login/callback/
   https://yourdomain.com/api/auth/callback/microsoft
   
   # Mobile (for React Native)
   msauth://com.safeshipper/callback
   ```
3. Enable "ID tokens" and "Access tokens"
4. Set "Supported account types" based on your needs
5. Save changes

### Step 4: Create Client Secret

1. Go to "Certificates & secrets" → "New client secret"
2. Description: "SafeShipper Production Secret"
3. Expires: Choose appropriate expiry (recommend 24 months)
4. Click "Add"
5. **Important**: Copy the secret value immediately (it won't be shown again)

### Step 5: Configure API Permissions

1. Go to "API permissions"
2. Ensure these Microsoft Graph permissions are added:
   - `User.Read` (Sign in and read user profile)
   - `email` (View users' email address)
   - `profile` (View users' basic profile)
3. Click "Grant admin consent" if required by your organization

### Step 6: Set Environment Variables

Backend (.env):
```env
MICROSOFT_CLIENT_ID=your-application-id
MICROSOFT_CLIENT_SECRET=your-client-secret
```

Frontend (.env.local):
```env
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-application-id
MICROSOFT_CLIENT_SECRET=your-client-secret
```

---

## Backend Configuration

### Django Settings Verification

The SafeShipper backend is pre-configured for OAuth. Verify these settings in `backend/safeshipper_core/settings.py`:

```python
INSTALLED_APPS = [
    # ... other apps
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.microsoft',
]

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'OAUTH_PKCE_ENABLED': True,
        'APP': {
            'client_id': config('GOOGLE_CLIENT_ID', default=''),
            'secret': config('GOOGLE_CLIENT_SECRET', default=''),
        }
    },
    'microsoft': {
        'SCOPE': ['User.Read'],
        'AUTH_PARAMS': {'response_type': 'code'},
        'APP': {
            'client_id': config('MICROSOFT_CLIENT_ID', default=''),
            'secret': config('MICROSOFT_CLIENT_SECRET', default=''),
        }
    }
}
```

### API Endpoints

The following endpoints are available for OAuth:

- `GET /api/v1/auth/sso/providers/` - List available OAuth providers
- `POST /api/v1/auth/sso/google/` - Google OAuth authentication
- `POST /api/v1/auth/sso/microsoft/` - Microsoft OAuth authentication

---

## Frontend Integration

### Next.js Frontend

Install required packages:
```bash
npm install @react-oauth/google @azure/msal-browser
```

#### Google Sign-In Component

```typescript
// components/auth/GoogleSignIn.tsx
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';

export function GoogleSignIn() {
  const { loginWithGoogle } = useAuth();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const result = await loginWithGoogle(tokenResponse.access_token);
        // Handle successful login
      } catch (error) {
        console.error('Google login failed:', error);
      }
    },
    onError: () => {
      console.error('Google login failed');
    }
  });

  return (
    <button onClick={() => login()} className="oauth-button">
      <img src="/google-icon.svg" alt="Google" />
      Sign in with Google
    </button>
  );
}
```

#### Microsoft Sign-In Component

```typescript
// components/auth/MicrosoftSignIn.tsx
import { useMsal } from '@azure/msal-react';
import { useAuth } from '@/hooks/useAuth';

export function MicrosoftSignIn() {
  const { instance } = useMsal();
  const { loginWithMicrosoft } = useAuth();

  const handleLogin = async () => {
    try {
      const response = await instance.loginPopup({
        scopes: ['User.Read']
      });
      
      await loginWithMicrosoft(response.idToken);
      // Handle successful login
    } catch (error) {
      console.error('Microsoft login failed:', error);
    }
  };

  return (
    <button onClick={handleLogin} className="oauth-button">
      <img src="/microsoft-icon.svg" alt="Microsoft" />
      Sign in with Microsoft
    </button>
  );
}
```

### React Native Mobile App

Install required packages:
```bash
npm install react-native-google-signin react-native-msal
```

#### Google Sign-In Setup

```typescript
// Configure Google Sign-In
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.GOOGLE_CLIENT_ID,
  offlineAccess: true,
});

// Sign-In function
const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo;
    
    // Send token to backend
    const response = await api.post('/auth/sso/google/', { id_token: idToken });
    // Handle response
  } catch (error) {
    console.error('Google sign-in error:', error);
  }
};
```

---

## Testing OAuth Flow

### Manual Testing Steps

1. **Test Google OAuth**:
   ```bash
   # Run the test script
   cd backend
   python test_oauth_integration.py
   ```

2. **Test with curl**:
   ```bash
   # Get available providers
   curl http://localhost:8000/api/v1/auth/sso/providers/
   
   # Test Google OAuth (requires valid token)
   curl -X POST http://localhost:8000/api/v1/auth/sso/google/ \
     -H "Content-Type: application/json" \
     -d '{"id_token": "your-google-id-token"}'
   ```

3. **Frontend Testing**:
   - Visit http://localhost:3000/login
   - Click "Sign in with Google" or "Sign in with Microsoft"
   - Complete OAuth flow
   - Verify JWT tokens are received and stored

### Automated Testing

Create test users in Google/Microsoft:
1. Google: Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Microsoft: Use [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Redirect URI mismatch" Error

**Problem**: OAuth provider reports redirect URI doesn't match.

**Solution**:
- Ensure exact match including protocol (http vs https)
- Check for trailing slashes
- Verify port numbers match
- Update both provider console and application config

#### 2. "Invalid client" Error

**Problem**: Client ID or secret is incorrect.

**Solution**:
- Verify environment variables are loaded correctly
- Check for extra spaces in credentials
- Ensure credentials match the correct environment (dev/prod)
- Regenerate credentials if necessary

#### 3. CORS Issues

**Problem**: Browser blocks OAuth requests.

**Solution**:
- Add OAuth provider domains to CORS settings:
  ```python
  CORS_ALLOWED_ORIGINS = [
      'https://accounts.google.com',
      'https://login.microsoftonline.com',
  ]
  ```

#### 4. Token Validation Failures

**Problem**: Backend rejects valid OAuth tokens.

**Solution**:
- Ensure system time is synchronized (NTP)
- Check token expiry settings
- Verify OAuth scopes match requirements
- Update provider SDK libraries

#### 5. User Creation Failures

**Problem**: OAuth successful but user creation fails.

**Solution**:
- Check database constraints
- Verify email uniqueness
- Review user model required fields
- Check authentication backend order

### Debug Mode

Enable detailed OAuth debugging:

```python
# settings.py
SOCIALACCOUNT_DEBUG = True  # Only in development!
LOGGING = {
    'loggers': {
        'allauth': {
            'handlers': ['console'],
            'level': 'DEBUG',
        }
    }
}
```

---

## Security Best Practices

### 1. Credential Management

- **Never commit credentials** to version control
- Use separate credentials for each environment
- Rotate secrets regularly (every 90 days)
- Use secret management services in production:
  - AWS Secrets Manager
  - Azure Key Vault
  - HashiCorp Vault

### 2. Token Security

- Store tokens securely:
  - Backend: Redis with encryption
  - Frontend: Secure HTTP-only cookies
  - Mobile: Encrypted device storage
- Implement token refresh logic
- Set appropriate token lifetimes

### 3. Scope Limitations

- Request minimum required scopes
- Never request write permissions unless needed
- Document why each scope is required

### 4. Production Checklist

- [ ] HTTPS enabled for all OAuth endpoints
- [ ] Redirect URIs use HTTPS in production
- [ ] PKCE enabled for OAuth flows
- [ ] Rate limiting implemented
- [ ] Audit logging for OAuth events
- [ ] Monitor for suspicious OAuth activity
- [ ] Regular security audits
- [ ] Incident response plan

### 5. Compliance Considerations

- GDPR: User consent for data processing
- Privacy Policy: Clearly state OAuth data usage
- Data Retention: Define OAuth data lifecycle
- User Rights: Implement account deletion

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://docs.microsoft.com/azure/active-directory/develop/)
- [Django-allauth Documentation](https://django-allauth.readthedocs.io/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

**Last Updated**: 2025-07-27  
**Version**: 1.0.0