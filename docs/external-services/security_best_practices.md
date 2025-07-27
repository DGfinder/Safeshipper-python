# 🔒 External Services Security Best Practices

This guide outlines security best practices for managing external service integrations in the SafeShipper platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Credential Management](#credential-management)
3. [API Key Security](#api-key-security)
4. [Network Security](#network-security)
5. [Data Protection](#data-protection)
6. [Access Control](#access-control)
7. [Monitoring & Auditing](#monitoring--auditing)
8. [Incident Response](#incident-response)
9. [Compliance Requirements](#compliance-requirements)
10. [Security Checklist](#security-checklist)

---

## Overview

SafeShipper integrates with multiple external services, each requiring careful security consideration. This document establishes security standards for:

- Credential storage and rotation
- API communication security
- Data protection in transit and at rest
- Access logging and monitoring
- Incident response procedures
- Compliance with industry standards

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimum necessary access rights
3. **Zero Trust**: Verify everything, trust nothing
4. **Fail Secure**: Default to secure state on failure
5. **Regular Auditing**: Continuous security monitoring

---

## Credential Management

### 1. Environment Variable Security

**✅ DO:**
```bash
# Use secure environment variable management
SECRET_KEY=$(openssl rand -base64 32)
STRIPE_SECRET_KEY=sk_live_...
AWS_SECRET_ACCESS_KEY=...
```

**❌ DON'T:**
```python
# Never hardcode credentials
STRIPE_SECRET_KEY = "sk_live_actual_key_here"  # NEVER DO THIS
```

### 2. Secret Management Services

#### Production Recommendations

1. **AWS Secrets Manager**:
   ```python
   import boto3
   
   def get_secret(secret_name):
       client = boto3.client('secretsmanager')
       response = client.get_secret_value(SecretId=secret_name)
       return response['SecretString']
   
   STRIPE_SECRET_KEY = get_secret('stripe-secret-key')
   ```

2. **Azure Key Vault**:
   ```python
   from azure.keyvault.secrets import SecretClient
   from azure.identity import DefaultAzureCredential
   
   credential = DefaultAzureCredential()
   client = SecretClient(vault_url="https://vault.vault.azure.net/", credential=credential)
   
   TWILIO_AUTH_TOKEN = client.get_secret("twilio-auth-token").value
   ```

3. **HashiCorp Vault**:
   ```python
   import hvac
   
   client = hvac.Client(url='https://vault.company.com')
   client.token = os.environ['VAULT_TOKEN']
   
   secrets = client.secrets.kv.v2.read_secret_version(path='safeshipper/prod')
   GOOGLE_CLIENT_SECRET = secrets['data']['data']['google_client_secret']
   ```

### 3. Credential Rotation

Implement automated credential rotation:

```python
# utils/credential_rotation.py
class CredentialRotationService:
    def __init__(self):
        self.rotation_schedule = {
            'stripe_keys': 90,      # days
            'twilio_tokens': 180,   # days
            'oauth_secrets': 365,   # days
            'jwt_keys': 30,         # days
        }
    
    def should_rotate(self, credential_type, last_rotated):
        """Check if credential needs rotation"""
        days_since_rotation = (datetime.now() - last_rotated).days
        return days_since_rotation >= self.rotation_schedule[credential_type]
    
    def rotate_stripe_keys(self):
        """Rotate Stripe API keys"""
        # Create new restricted key
        new_key = stripe.APIKey.create(
            name=f"SafeShipper {datetime.now().strftime('%Y-%m-%d')}"
        )
        
        # Update secret manager
        self.update_secret('stripe-secret-key', new_key.secret)
        
        # Schedule old key deletion (after grace period)
        self.schedule_key_deletion(old_key.id, days=7)
    
    def rotate_jwt_signing_key(self):
        """Rotate JWT signing key with zero downtime"""
        # Generate new key
        new_key = generate_secure_key()
        
        # Add to key rotation (support multiple keys temporarily)
        current_keys = get_jwt_keys()
        current_keys.append(new_key)
        
        # Update with new primary key
        update_jwt_keys(current_keys, primary=new_key)
        
        # Remove old keys after rotation period
        schedule_key_cleanup(current_keys[:-1], days=1)
```

---

## API Key Security

### 1. Key Types and Restrictions

#### Stripe API Keys
```python
# Use restricted keys with minimal permissions
STRIPE_RESTRICTED_PERMISSIONS = [
    'customers:write',
    'payment_intents:write',
    'subscriptions:write',
    'invoices:write',
    'webhook_endpoints:read'
]

# Never use full account access keys in production
```

#### AWS IAM Policies
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3MinimalAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::safeshipper-production/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-server-side-encryption": "AES256"
                }
            }
        }
    ]
}
```

#### Google OAuth Scopes
```python
# Request minimum required scopes
GOOGLE_OAUTH_SCOPES = [
    'openid',
    'email',
    'profile'
]

# Avoid broad scopes like 'https://www.googleapis.com/auth/userinfo.profile'
```

### 2. API Key Validation

```python
# utils/api_validation.py
class APIKeyValidator:
    def __init__(self):
        self.key_patterns = {
            'stripe_secret': r'^sk_(test|live)_[A-Za-z0-9]{99}$',
            'stripe_public': r'^pk_(test|live)_[A-Za-z0-9]{99}$',
            'twilio_sid': r'^AC[a-z0-9]{32}$',
            'aws_access_key': r'^AKIA[A-Z0-9]{16}$',
            'google_client_id': r'^[0-9]+-[a-z0-9]{32}\.apps\.googleusercontent\.com$'
        }
    
    def validate_key_format(self, key_type, key_value):
        """Validate API key format"""
        pattern = self.key_patterns.get(key_type)
        if not pattern:
            raise ValueError(f"Unknown key type: {key_type}")
        
        if not re.match(pattern, key_value):
            raise ValueError(f"Invalid {key_type} format")
    
    def validate_key_environment(self, key_value):
        """Ensure test keys aren't used in production"""
        if settings.ENVIRONMENT == 'production':
            test_patterns = ['test_', 'sk_test_', 'pk_test_']
            for pattern in test_patterns:
                if pattern in key_value:
                    raise ValueError("Test keys cannot be used in production")
    
    def check_key_permissions(self, service, key):
        """Verify key has only required permissions"""
        if service == 'stripe':
            return self._check_stripe_permissions(key)
        elif service == 'aws':
            return self._check_aws_permissions(key)
        # Add other services as needed
```

### 3. Key Storage Security

```python
# settings/security.py
class SecureSettings:
    def __init__(self):
        self.encrypted_settings = {}
        self.encryption_key = self._get_encryption_key()
    
    def _get_encryption_key(self):
        """Get encryption key from secure location"""
        # Use key derivation from master key
        master_key = os.environ.get('MASTER_ENCRYPTION_KEY')
        if not master_key:
            raise ValueError("Master encryption key not found")
        
        return PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'safeshipper_salt',
            iterations=100000
        ).derive(master_key.encode())
    
    def encrypt_setting(self, key, value):
        """Encrypt sensitive setting"""
        fernet = Fernet(base64.urlsafe_b64encode(self.encryption_key))
        encrypted_value = fernet.encrypt(value.encode())
        self.encrypted_settings[key] = encrypted_value.decode()
    
    def decrypt_setting(self, key):
        """Decrypt sensitive setting"""
        if key not in self.encrypted_settings:
            raise KeyError(f"Setting {key} not found")
        
        fernet = Fernet(base64.urlsafe_b64encode(self.encryption_key))
        encrypted_value = self.encrypted_settings[key].encode()
        return fernet.decrypt(encrypted_value).decode()
```

---

## Network Security

### 1. HTTPS/TLS Configuration

```python
# settings/security.py
# Enforce HTTPS in production
SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS Configuration
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Content Security Policy
CSP_DEFAULT_SRC = ["'self'"]
CSP_SCRIPT_SRC = [
    "'self'",
    'https://js.stripe.com',
    'https://checkout.stripe.com'
]
CSP_CONNECT_SRC = [
    "'self'",
    'https://api.stripe.com',
    'https://uploads.stripe.com'
]
```

### 2. API Endpoint Security

```python
# api/middleware.py
class APISecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limiter = RateLimiter()
    
    def __call__(self, request):
        # Rate limiting
        if not self.rate_limiter.allow_request(request):
            return HttpResponse(status=429)
        
        # API key validation
        if request.path.startswith('/api/'):
            if not self.validate_api_access(request):
                return HttpResponse(status=401)
        
        # Request signing validation for webhooks
        if request.path.startswith('/webhooks/'):
            if not self.validate_webhook_signature(request):
                return HttpResponse(status=400)
        
        response = self.get_response(request)
        
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        
        return response
    
    def validate_webhook_signature(self, request):
        """Validate webhook signatures from external services"""
        if 'stripe' in request.path:
            return self.validate_stripe_signature(request)
        elif 'twilio' in request.path:
            return self.validate_twilio_signature(request)
        return False
```

### 3. Webhook Security

```python
# webhooks/security.py
class WebhookValidator:
    def __init__(self):
        self.validators = {
            'stripe': self.validate_stripe_webhook,
            'twilio': self.validate_twilio_webhook
        }
    
    def validate_stripe_webhook(self, request):
        """Validate Stripe webhook signature"""
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
        
        try:
            stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
            return True
        except (ValueError, stripe.error.SignatureVerificationError):
            logger.warning(f"Invalid Stripe webhook signature from {request.META.get('REMOTE_ADDR')}")
            return False
    
    def validate_twilio_webhook(self, request):
        """Validate Twilio webhook signature"""
        from twilio.request_validator import RequestValidator
        
        validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
        signature = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
        url = request.build_absolute_uri()
        post_data = request.POST.dict()
        
        is_valid = validator.validate(url, post_data, signature)
        if not is_valid:
            logger.warning(f"Invalid Twilio webhook signature from {request.META.get('REMOTE_ADDR')}")
        
        return is_valid
```

---

## Data Protection

### 1. Data Encryption

```python
# utils/encryption.py
class DataProtection:
    def __init__(self):
        self.field_encryption = FieldEncryption()
        self.transit_encryption = TransitEncryption()
    
    def encrypt_sensitive_data(self, data):
        """Encrypt PII and sensitive data"""
        sensitive_fields = [
            'ssn', 'tax_id', 'bank_account', 'credit_card',
            'phone_number', 'email', 'address'
        ]
        
        encrypted_data = data.copy()
        for field in sensitive_fields:
            if field in data:
                encrypted_data[field] = self.field_encryption.encrypt(data[field])
        
        return encrypted_data
    
    def prepare_for_external_api(self, data):
        """Sanitize data before sending to external APIs"""
        # Remove internal IDs and sensitive information
        safe_data = {
            k: v for k, v in data.items()
            if not k.startswith('internal_') and k not in SENSITIVE_FIELDS
        }
        
        # Hash or tokenize identifying information
        if 'email' in safe_data:
            safe_data['email_hash'] = hashlib.sha256(
                safe_data['email'].encode()
            ).hexdigest()
            del safe_data['email']
        
        return safe_data
```

### 2. Data Minimization

```python
# api/serializers.py
class ExternalAPISerializer(serializers.ModelSerializer):
    """Serializer for external API data with data minimization"""
    
    class Meta:
        model = Shipment
        fields = [
            'tracking_number',  # Safe to share
            'status',          # Business necessary
            'destination_city', # Generalized location
            # Exclude: exact addresses, customer details, pricing
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Additional data sanitization
        if 'destination_city' in data:
            # Only include city, not full address
            data['destination_city'] = self.sanitize_location(data['destination_city'])
        
        return data
    
    def sanitize_location(self, location):
        """Remove precise location information"""
        # Example: "123 Main St, Seattle, WA" -> "Seattle, WA"
        parts = location.split(',')
        return ', '.join(parts[-2:]).strip() if len(parts) >= 2 else location
```

### 3. Data Retention

```python
# tasks/data_retention.py
class DataRetentionManager:
    def __init__(self):
        self.retention_policies = {
            'webhook_logs': 90,        # days
            'api_request_logs': 30,    # days
            'temporary_files': 7,      # days
            'expired_tokens': 1,       # days
        }
    
    def cleanup_expired_data(self):
        """Remove data that exceeds retention period"""
        for data_type, retention_days in self.retention_policies.items():
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            
            if data_type == 'webhook_logs':
                WebhookLog.objects.filter(created_at__lt=cutoff_date).delete()
            elif data_type == 'api_request_logs':
                APIRequestLog.objects.filter(timestamp__lt=cutoff_date).delete()
            elif data_type == 'temporary_files':
                self.cleanup_temp_files(cutoff_date)
    
    def cleanup_temp_files(self, cutoff_date):
        """Remove temporary files from S3"""
        s3_service = S3Service()
        temp_files = s3_service.list_files('temp/')
        
        for file_info in temp_files:
            if file_info['last_modified'] < cutoff_date:
                s3_service.delete_file(file_info['key'])
                logger.info(f"Deleted expired temp file: {file_info['key']}")
```

---

## Access Control

### 1. API Access Controls

```python
# permissions.py
class ExternalServicePermission(BasePermission):
    """Permission class for external service access"""
    
    def has_permission(self, request, view):
        # Check if user has permission for this external service
        service_name = getattr(view, 'service_name', None)
        if not service_name:
            return False
        
        return request.user.has_perm(f'external_services.use_{service_name}')
    
    def has_object_permission(self, request, view, obj):
        # Check object-level permissions
        if hasattr(obj, 'company'):
            return obj.company == request.user.company
        return True


class APIKeyAccessControl:
    def __init__(self):
        self.key_permissions = {
            'stripe_read': ['customer:read', 'subscription:read'],
            'stripe_write': ['customer:write', 'payment:create'],
            's3_read': ['file:read'],
            's3_write': ['file:write', 'file:delete']
        }
    
    def check_key_permission(self, api_key, required_permission):
        """Check if API key has required permission"""
        key_type = self.identify_key_type(api_key)
        allowed_permissions = self.key_permissions.get(key_type, [])
        return required_permission in allowed_permissions
```

### 2. Service Account Management

```python
# management/service_accounts.py
class ServiceAccountManager:
    def __init__(self):
        self.service_accounts = {}
    
    def create_service_account(self, service_name, permissions):
        """Create service account with specific permissions"""
        account = {
            'id': f"sa_{service_name}_{uuid.uuid4().hex[:8]}",
            'service': service_name,
            'permissions': permissions,
            'created_at': datetime.now(),
            'last_used': None,
            'status': 'active'
        }
        
        self.service_accounts[account['id']] = account
        return account
    
    def rotate_service_account_keys(self, account_id):
        """Rotate keys for service account"""
        account = self.service_accounts.get(account_id)
        if not account:
            raise ValueError("Service account not found")
        
        # Generate new keys
        new_keys = self.generate_account_keys(account)
        
        # Update external service with new keys
        self.update_external_service_keys(account['service'], new_keys)
        
        # Log the rotation
        logger.info(f"Rotated keys for service account: {account_id}")
        
        return new_keys
```

---

## Monitoring & Auditing

### 1. Security Event Logging

```python
# logging/security_logger.py
class SecurityLogger:
    def __init__(self):
        self.security_logger = logging.getLogger('security')
    
    def log_api_access(self, service, action, user=None, result='success', details=None):
        """Log external API access attempts"""
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'service': service,
            'action': action,
            'user_id': user.id if user else None,
            'result': result,
            'details': details or {},
            'ip_address': self.get_client_ip(),
            'user_agent': self.get_user_agent()
        }
        
        self.security_logger.info(f"API_ACCESS: {json.dumps(log_data)}")
    
    def log_credential_access(self, credential_type, accessed_by, purpose):
        """Log credential access for audit trail"""
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'event_type': 'CREDENTIAL_ACCESS',
            'credential_type': credential_type,
            'accessed_by': accessed_by,
            'purpose': purpose,
            'ip_address': self.get_client_ip()
        }
        
        self.security_logger.warning(f"CREDENTIAL_ACCESS: {json.dumps(log_data)}")
    
    def log_security_violation(self, violation_type, details):
        """Log security violations"""
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'event_type': 'SECURITY_VIOLATION',
            'violation_type': violation_type,
            'details': details,
            'ip_address': self.get_client_ip(),
            'severity': 'HIGH'
        }
        
        self.security_logger.error(f"SECURITY_VIOLATION: {json.dumps(log_data)}")
        
        # Trigger alerts for high-severity violations
        self.trigger_security_alert(log_data)
```

### 2. Anomaly Detection

```python
# monitoring/anomaly_detection.py
class AnomalyDetector:
    def __init__(self):
        self.baseline_metrics = {}
        self.alert_thresholds = {
            'api_request_rate': 2.0,    # 2x normal rate
            'failed_auth_rate': 0.1,    # 10% failure rate
            'unusual_locations': 5,      # requests from >5 new countries/day
        }
    
    def detect_api_anomalies(self, service_name):
        """Detect unusual API usage patterns"""
        current_metrics = self.get_current_metrics(service_name)
        baseline = self.baseline_metrics.get(service_name, {})
        
        anomalies = []
        
        # Check request rate
        if 'request_rate' in current_metrics and 'request_rate' in baseline:
            rate_ratio = current_metrics['request_rate'] / baseline['request_rate']
            if rate_ratio > self.alert_thresholds['api_request_rate']:
                anomalies.append({
                    'type': 'high_request_rate',
                    'ratio': rate_ratio,
                    'threshold': self.alert_thresholds['api_request_rate']
                })
        
        # Check failure rate
        failure_rate = current_metrics.get('failure_rate', 0)
        if failure_rate > self.alert_thresholds['failed_auth_rate']:
            anomalies.append({
                'type': 'high_failure_rate',
                'rate': failure_rate,
                'threshold': self.alert_thresholds['failed_auth_rate']
            })
        
        return anomalies
    
    def check_geographic_anomalies(self):
        """Detect requests from unusual locations"""
        today = datetime.now().date()
        new_countries = self.get_new_request_countries(today)
        
        if len(new_countries) > self.alert_thresholds['unusual_locations']:
            return {
                'type': 'unusual_geographic_activity',
                'new_countries': new_countries,
                'count': len(new_countries)
            }
        
        return None
```

### 3. Real-time Monitoring

```python
# monitoring/real_time_monitor.py
class RealTimeSecurityMonitor:
    def __init__(self):
        self.redis_client = redis.Redis()
        self.alert_manager = AlertManager()
    
    def monitor_api_health(self):
        """Monitor external API health and security"""
        services = ['stripe', 'twilio', 'aws_s3', 'google_oauth']
        
        for service in services:
            # Check API response times
            response_time = self.check_api_response_time(service)
            if response_time > 5000:  # 5 seconds
                self.alert_manager.send_alert(
                    'API_SLOW_RESPONSE',
                    f"{service} API response time: {response_time}ms"
                )
            
            # Check error rates
            error_rate = self.get_error_rate(service, window_minutes=5)
            if error_rate > 0.05:  # 5% error rate
                self.alert_manager.send_alert(
                    'HIGH_API_ERROR_RATE',
                    f"{service} error rate: {error_rate:.2%}"
                )
            
            # Check rate limit usage
            rate_limit_usage = self.get_rate_limit_usage(service)
            if rate_limit_usage > 0.8:  # 80% of rate limit
                self.alert_manager.send_alert(
                    'RATE_LIMIT_WARNING',
                    f"{service} rate limit usage: {rate_limit_usage:.2%}"
                )
```

---

## Incident Response

### 1. Security Incident Classification

```python
# security/incident_response.py
class SecurityIncidentResponse:
    SEVERITY_LEVELS = {
        'LOW': {
            'description': 'Minor security event, no immediate threat',
            'response_time': 24,  # hours
            'escalation': False
        },
        'MEDIUM': {
            'description': 'Security event requiring investigation',
            'response_time': 4,   # hours
            'escalation': True
        },
        'HIGH': {
            'description': 'Active security threat or data breach',
            'response_time': 1,   # hour
            'escalation': True,
            'immediate_action': True
        },
        'CRITICAL': {
            'description': 'Severe security breach or system compromise',
            'response_time': 0.25,  # 15 minutes
            'escalation': True,
            'immediate_action': True,
            'executive_notification': True
        }
    }
    
    def classify_incident(self, incident_data):
        """Classify security incident severity"""
        incident_type = incident_data.get('type')
        
        # Critical incidents
        if incident_type in ['credential_compromise', 'data_breach', 'system_compromise']:
            return 'CRITICAL'
        
        # High incidents
        elif incident_type in ['unauthorized_access', 'api_abuse', 'payment_fraud']:
            return 'HIGH'
        
        # Medium incidents
        elif incident_type in ['repeated_failures', 'suspicious_activity']:
            return 'MEDIUM'
        
        # Low incidents
        else:
            return 'LOW'
    
    def handle_credential_compromise(self, service, credential_type):
        """Handle compromised credentials"""
        steps = [
            f"1. Immediately disable compromised {credential_type} for {service}",
            "2. Generate new credentials",
            "3. Update all systems with new credentials",
            "4. Review access logs for unauthorized usage",
            "5. Notify security team and service provider",
            "6. Update incident response documentation"
        ]
        
        # Execute immediate actions
        self.disable_credentials(service, credential_type)
        self.generate_new_credentials(service, credential_type)
        
        # Log incident
        self.log_security_incident('CREDENTIAL_COMPROMISE', {
            'service': service,
            'credential_type': credential_type,
            'steps_taken': steps,
            'timestamp': datetime.now().isoformat()
        })
        
        return steps
```

### 2. Automated Response Actions

```python
# security/automated_response.py
class AutomatedSecurityResponse:
    def __init__(self):
        self.response_actions = {
            'rate_limit_exceeded': self.handle_rate_limit_exceeded,
            'invalid_signatures': self.handle_invalid_signatures,
            'geo_anomaly': self.handle_geographic_anomaly,
            'credential_exposure': self.handle_credential_exposure
        }
    
    def handle_rate_limit_exceeded(self, service, details):
        """Automatically handle rate limit issues"""
        # Temporarily reduce request frequency
        self.throttle_service_requests(service, reduction_factor=0.5)
        
        # Check if legitimate traffic spike or attack
        if details.get('source_ips_count', 0) > 100:
            # Likely DDoS - enable additional protection
            self.enable_ddos_protection(service)
        
        # Alert operations team
        self.send_alert('RATE_LIMIT_EXCEEDED', {
            'service': service,
            'action_taken': 'throttling_enabled',
            'details': details
        })
    
    def handle_invalid_signatures(self, service, failure_count):
        """Handle repeated signature validation failures"""
        if failure_count > 50:  # Threshold for potential attack
            # Temporarily block webhook endpoint
            self.block_webhook_endpoint(service, duration_minutes=15)
            
            # Verify webhook secret hasn't been compromised
            self.verify_webhook_secret(service)
            
            # Alert security team
            self.send_security_alert('POTENTIAL_SIGNATURE_ATTACK', {
                'service': service,
                'failure_count': failure_count,
                'action_taken': 'webhook_blocked'
            })
    
    def handle_credential_exposure(self, exposed_credentials):
        """Handle accidentally exposed credentials"""
        for cred in exposed_credentials:
            # Immediately revoke credential
            self.revoke_credential(cred['service'], cred['type'], cred['value'])
            
            # Generate replacement
            new_cred = self.generate_replacement_credential(cred['service'], cred['type'])
            
            # Update systems
            self.update_credential_in_systems(cred['service'], cred['type'], new_cred)
            
            # Log incident
            self.log_credential_incident(cred)
```

---

## Compliance Requirements

### 1. SOC 2 Compliance

```python
# compliance/soc2.py
class SOC2Compliance:
    def __init__(self):
        self.control_requirements = {
            'CC6.1': 'Logical access controls',
            'CC6.2': 'Authentication and access management',
            'CC6.3': 'Authorization controls',
            'CC6.7': 'Data transmission controls',
            'CC6.8': 'Data disposal controls'
        }
    
    def audit_access_controls(self):
        """Audit logical access controls (CC6.1)"""
        findings = []
        
        # Check API key management
        api_keys = self.get_all_api_keys()
        for key in api_keys:
            if not self.has_expiration_date(key):
                findings.append(f"API key {key['service']} lacks expiration date")
            
            if not self.has_minimum_permissions(key):
                findings.append(f"API key {key['service']} has excessive permissions")
        
        # Check user access reviews
        if not self.has_recent_access_review():
            findings.append("No access review completed in last 90 days")
        
        return findings
    
    def audit_data_transmission(self):
        """Audit data transmission controls (CC6.7)"""
        findings = []
        
        # Check all external API calls use encryption
        unencrypted_endpoints = self.find_unencrypted_endpoints()
        if unencrypted_endpoints:
            findings.append(f"Unencrypted endpoints found: {unencrypted_endpoints}")
        
        # Check certificate validity
        expired_certs = self.check_certificate_expiry()
        if expired_certs:
            findings.append(f"Expired certificates: {expired_certs}")
        
        return findings
```

### 2. GDPR Compliance

```python
# compliance/gdpr.py
class GDPRCompliance:
    def __init__(self):
        self.data_processors = [
            'stripe',    # Payment processing
            'twilio',    # SMS communications
            'google',    # OAuth authentication
            'aws',       # Data storage
        ]
    
    def audit_data_processing(self):
        """Audit data processing activities"""
        report = {}
        
        for processor in self.data_processors:
            report[processor] = {
                'legal_basis': self.get_legal_basis(processor),
                'data_types': self.get_data_types_processed(processor),
                'retention_period': self.get_retention_period(processor),
                'transfer_mechanism': self.get_transfer_mechanism(processor),
                'dpa_status': self.check_dpa_status(processor)
            }
        
        return report
    
    def handle_data_subject_request(self, request_type, user_id):
        """Handle GDPR data subject requests"""
        if request_type == 'access':
            return self.export_user_data_from_processors(user_id)
        elif request_type == 'deletion':
            return self.delete_user_data_from_processors(user_id)
        elif request_type == 'portability':
            return self.export_portable_user_data(user_id)
    
    def delete_user_data_from_processors(self, user_id):
        """Delete user data from external processors"""
        deletion_results = {}
        
        # Stripe customer data
        stripe_customer = self.get_stripe_customer(user_id)
        if stripe_customer:
            stripe.Customer.delete(stripe_customer.stripe_id)
            deletion_results['stripe'] = 'deleted'
        
        # AWS S3 user files
        user_files = self.get_user_s3_files(user_id)
        for file_key in user_files:
            s3_service.delete_file(file_key)
        deletion_results['aws_s3'] = f'{len(user_files)} files deleted'
        
        return deletion_results
```

---

## Security Checklist

### 🔒 Credential Security
- [ ] All API keys stored in secure environment variables
- [ ] No credentials committed to version control
- [ ] Restricted API keys used (minimal permissions)
- [ ] Regular credential rotation schedule implemented
- [ ] Credential access logging enabled
- [ ] Emergency credential revocation procedures documented

### 🌐 Network Security
- [ ] All external API calls use HTTPS/TLS
- [ ] Certificate validation enabled
- [ ] Webhook signature validation implemented
- [ ] Rate limiting configured
- [ ] IP allowlisting where possible
- [ ] DDoS protection enabled

### 🛡️ Data Protection
- [ ] Sensitive data encrypted in transit and at rest
- [ ] Data minimization practices implemented
- [ ] PII tokenization or hashing where appropriate
- [ ] Secure data deletion procedures
- [ ] Data retention policies enforced
- [ ] Cross-border data transfer compliance

### 👤 Access Control
- [ ] Principle of least privilege enforced
- [ ] Multi-factor authentication enabled
- [ ] Regular access reviews conducted
- [ ] Service account permissions audited
- [ ] API access logging implemented
- [ ] Emergency access procedures documented

### 📊 Monitoring & Auditing
- [ ] Security event logging configured
- [ ] Anomaly detection implemented
- [ ] Real-time monitoring alerts
- [ ] Regular security assessments
- [ ] Incident response procedures tested
- [ ] Compliance audit trails maintained

### 🚨 Incident Response
- [ ] Incident classification procedures
- [ ] Automated response actions configured
- [ ] Emergency contact list updated
- [ ] Incident response playbooks documented
- [ ] Regular incident response drills
- [ ] Post-incident review process

### 📋 Compliance
- [ ] SOC 2 controls implemented
- [ ] GDPR data processing agreements
- [ ] PCI DSS requirements met (if applicable)
- [ ] Regular compliance audits scheduled
- [ ] Data processor agreements updated
- [ ] Privacy policy reflects external services

---

## Emergency Procedures

### Immediate Actions for Security Incidents

1. **Credential Compromise**:
   ```bash
   # Immediate revocation
   ./scripts/revoke_credentials.sh <service> <credential_type>
   
   # Generate new credentials
   ./scripts/generate_credentials.sh <service>
   
   # Update all systems
   ./scripts/update_credentials.sh <service>
   ```

2. **Data Breach**:
   ```bash
   # Isolate affected systems
   ./scripts/isolate_systems.sh
   
   # Stop data processing
   ./scripts/stop_data_processing.sh
   
   # Notify authorities (if required)
   ./scripts/breach_notification.sh
   ```

3. **Service Compromise**:
   ```bash
   # Disable service access
   ./scripts/disable_service.sh <service>
   
   # Review audit logs
   ./scripts/audit_logs.sh --service <service> --timeframe 24h
   
   # Assess impact
   ./scripts/impact_assessment.sh <service>
   ```

### Contact Information

- **Security Team**: security@safeshipper.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **Incident Commander**: [Name/Contact]
- **Legal Counsel**: [Contact Information]

---

**Last Updated**: 2025-07-27  
**Version**: 1.0.0