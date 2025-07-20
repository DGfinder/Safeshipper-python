# SafeShipper Security Guide

This document outlines the security measures, configurations, and best practices implemented in the SafeShipper application.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Demo Mode Security](#demo-mode-security)
3. [Environment Configuration](#environment-configuration)
4. [JWT Security](#jwt-security)
5. [API Security](#api-security)
6. [Data Protection](#data-protection)
7. [Deployment Security](#deployment-security)
8. [Security Monitoring](#security-monitoring)

## Authentication & Authorization

### Token Management

The application uses JWT tokens for authentication with the following security measures:

- **Access Token**: Short-lived (15 minutes default) for API requests
- **Refresh Token**: Longer-lived (1 day default) for token renewal
- **Token Rotation**: Refresh tokens are rotated on each use
- **Token Blacklisting**: Old tokens are blacklisted after rotation

### Configuration

```bash
# JWT Settings (Environment Variables)
JWT_ACCESS_TOKEN_LIFETIME=15        # Minutes
JWT_REFRESH_TOKEN_LIFETIME=1        # Days
JWT_ALGORITHM=HS256                 # Signing algorithm
JWT_SIGNING_KEY=your-secret-key     # Dedicated signing key
```

### Multi-Factor Authentication (MFA)

- TOTP-based 2FA using django-otp
- Backup codes for account recovery
- Device registration and trust management

## Demo Mode Security

### Session Controls

Demo mode includes enhanced security controls to prevent misuse:

```bash
# Demo Mode Configuration
NEXT_PUBLIC_DEMO_SESSION_TIMEOUT=60         # Session timeout in minutes
NEXT_PUBLIC_DEMO_MAX_SESSIONS=3             # Max concurrent sessions
NEXT_PUBLIC_ALLOW_DEMO_IN_PRODUCTION=false  # Disable demo in production
```

### Action Restrictions

The following actions are restricted in demo mode:

- `user_management` - Creating, editing, or deleting users
- `system_configuration` - Modifying system settings
- `delete_shipments` - Permanently deleting shipment records
- `delete_customers` - Permanently deleting customer data
- `modify_audit_logs` - Altering audit trail records

### Password Security

Demo passwords are environment-configurable:

```bash
# Demo Password Configuration
NEXT_PUBLIC_DEMO_ADMIN_PASSWORD=SecurePassword123!
NEXT_PUBLIC_DEMO_DISPATCHER_PASSWORD=SecurePassword123!
NEXT_PUBLIC_DEMO_DRIVER_PASSWORD=SecurePassword123!
NEXT_PUBLIC_DEMO_INSPECTOR_PASSWORD=SecurePassword123!
NEXT_PUBLIC_DEMO_MANAGER_PASSWORD=SecurePassword123!
NEXT_PUBLIC_DEMO_CUSTOMER_PASSWORD=SecurePassword123!
NEXT_PUBLIC_DEMO_FALLBACK_PASSWORD=Demo2024!Default
```

## Environment Configuration

### Required Environment Variables

```bash
# Core Security
SECRET_KEY=your-django-secret-key-min-50-chars
DEBUG=false
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database Security
DB_ENGINE=django.contrib.gis.db.backends.postgis
DB_NAME=safeshipper_prod
DB_USER=safeshipper_user
DB_PASSWORD=secure-db-password
DB_HOST=db.your-domain.com
DB_PORT=5432

# API Configuration
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
NEXT_PUBLIC_API_MODE=production

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Social Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### Development vs Production

**Development Settings:**
- DEBUG=true
- Simplified authentication
- Local database (SQLite)
- Relaxed CORS settings

**Production Settings:**
- DEBUG=false
- Full security headers enabled
- PostgreSQL with SSL
- Strict CORS configuration
- HTTPS enforcement

## JWT Security

### Token Configuration

```python
# Backend JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('JWT_SIGNING_KEY', default=SECRET_KEY),
}
```

### Best Practices

1. **Short Token Lifetimes**: Access tokens expire quickly
2. **Secure Storage**: Tokens stored in httpOnly cookies (production)
3. **Token Rotation**: Refresh tokens are single-use
4. **Blacklisting**: Compromised tokens are immediately blacklisted

## API Security

### Rate Limiting

```python
# DRF Throttling Configuration
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day'
    }
}
```

### Security Headers

```python
# Django Security Settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

### Input Validation

- All API inputs are validated using Django REST Framework serializers
- SQL injection protection through ORM usage
- XSS protection through output encoding
- CSRF protection enabled for state-changing operations

## Data Protection

### Database Security

- **Encryption at Rest**: Database-level encryption
- **SSL Connections**: All database connections use SSL
- **Backup Encryption**: Automated encrypted backups
- **Access Controls**: Role-based database access

### File Storage

```python
# AWS S3 Configuration
AWS_DEFAULT_ACL = 'private'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True
```

### Audit Logging

- All user actions are logged
- Immutable audit trail
- Automated log analysis
- Compliance reporting

## Deployment Security

### Container Security

```dockerfile
# Use specific version tags
FROM python:3.11-slim-bullseye

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

# Security scanning
COPY --chown=app:app . /app
```

### Network Security

- **HTTPS Only**: All traffic encrypted in transit
- **VPC Configuration**: Isolated network environments
- **Firewall Rules**: Restrictive ingress/egress rules
- **Load Balancer**: SSL termination at load balancer

### Secrets Management

- **Environment Variables**: Sensitive data in env vars
- **Secret Rotation**: Regular rotation of API keys
- **Vault Integration**: Enterprise secret management
- **No Hardcoded Secrets**: Code review enforcement

## Security Monitoring

### Logging Configuration

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/security.log',
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'security': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Monitoring Metrics

- **Authentication Events**: Login attempts, failures, MFA usage
- **API Usage**: Request patterns, rate limit hits
- **Error Rates**: Application and security errors
- **Performance**: Response times and throughput

### Incident Response

1. **Detection**: Automated alerts for security events
2. **Analysis**: Log analysis and threat assessment
3. **Containment**: Immediate threat mitigation
4. **Recovery**: System restoration procedures
5. **Lessons Learned**: Post-incident review and improvements

## Security Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Secret keys rotated and secured
- [ ] Security headers verified
- [ ] SSL certificates installed
- [ ] Database access restricted
- [ ] Backup procedures tested

### Regular Maintenance

- [ ] Security patches applied
- [ ] Access reviews completed
- [ ] Log analysis performed
- [ ] Penetration testing conducted
- [ ] Incident response plan updated

### Compliance

- [ ] Data privacy controls implemented
- [ ] Audit logging enabled
- [ ] Retention policies enforced
- [ ] Access controls documented
- [ ] Security training completed

## Contact Information

For security issues or questions:

- **Security Team**: security@safeshipper.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Bug Bounty**: https://security.safeshipper.com/bounty

## Version History

- **v1.0.0** - Initial security implementation
- **v1.1.0** - Added demo mode restrictions
- **v1.2.0** - Enhanced JWT configuration
- **v1.3.0** - Comprehensive security documentation

---

**Last Updated**: 2024-07-20  
**Next Review**: 2024-10-20