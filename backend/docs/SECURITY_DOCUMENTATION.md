# SafeShipper Security Documentation

**Comprehensive security guide for the SafeShipper dangerous goods transportation platform**

This document outlines the complete security architecture, implementation details, and best practices for maintaining the highest levels of security in dangerous goods logistics operations.

---

## 🛡️ **Security Architecture Overview**

### **Multi-Layer Security Model**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SafeShipper Security Layers                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 Network Layer                                              │
│  ├─ TLS 1.3 Encryption                                        │
│  ├─ WAF Protection                                             │
│  ├─ DDoS Mitigation                                            │
│  └─ IP Whitelisting                                            │
│                                                                 │
│  🔐 Authentication Layer                                       │
│  ├─ JWT Tokens (RS256)                                        │
│  ├─ Multi-Factor Authentication                               │
│  ├─ OAuth 2.0 Integration                                     │
│  └─ Session Management                                         │
│                                                                 │
│  👤 Authorization Layer                                        │
│  ├─ Role-Based Access Control                                 │
│  ├─ Permission-Based Components                               │
│  ├─ Company Data Isolation                                    │
│  └─ Emergency Access Controls                                 │
│                                                                 │
│  🔒 Application Layer                                          │
│  ├─ Input Validation & Sanitization                          │
│  ├─ SQL Injection Prevention                                  │
│  ├─ XSS Protection                                            │
│  └─ CSRF Protection                                           │
│                                                                 │
│  💾 Data Layer                                                │
│  ├─ Encryption at Rest (AES-256)                             │
│  ├─ Database Row-Level Security                               │
│  ├─ Sensitive Data Masking                                    │
│  └─ Audit Trail Logging                                       │
│                                                                 │
│  📊 Monitoring Layer                                          │
│  ├─ Real-time Threat Detection                               │
│  ├─ Security Event Logging                                    │
│  ├─ Compliance Monitoring                                     │
│  └─ Incident Response                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 **Authentication Security**

### **JWT Token Implementation**

#### **Token Generation & Validation**
```python
import jwt
import secrets
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

class SafeShipperJWTManager:
    """Secure JWT token management for SafeShipper"""
    
    def __init__(self):
        self.algorithm = 'RS256'
        self.access_token_lifetime = timedelta(hours=1)
        self.refresh_token_lifetime = timedelta(days=30)
        self.private_key = self.load_private_key()
        self.public_key = self.load_public_key()
    
    def generate_tokens(self, user, company):
        """Generate access and refresh tokens"""
        
        # Token claims with security-focused data
        claims = {
            'user_id': str(user.id),
            'username': user.username,
            'company_id': str(company.id),
            'role': user.role,
            'permissions': self.get_user_permissions(user),
            'iat': datetime.utcnow(),
            'jti': secrets.token_urlsafe(32),  # Unique token ID for revocation
            'token_type': 'access'
        }
        
        # Access token (short-lived)
        access_claims = {
            **claims,
            'exp': datetime.utcnow() + self.access_token_lifetime,
            'token_type': 'access'
        }
        
        # Refresh token (long-lived, minimal claims)
        refresh_claims = {
            'user_id': str(user.id),
            'company_id': str(company.id),
            'exp': datetime.utcnow() + self.refresh_token_lifetime,
            'iat': datetime.utcnow(),
            'jti': secrets.token_urlsafe(32),
            'token_type': 'refresh'
        }
        
        access_token = jwt.encode(
            access_claims, 
            self.private_key, 
            algorithm=self.algorithm
        )
        
        refresh_token = jwt.encode(
            refresh_claims,
            self.private_key,
            algorithm=self.algorithm
        )
        
        # Store token metadata for revocation tracking
        self.store_token_metadata(access_claims)
        self.store_token_metadata(refresh_claims)
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': int(self.access_token_lifetime.total_seconds())
        }
    
    def validate_token(self, token, token_type='access'):
        """Validate and decode JWT token"""
        try:
            # Decode and validate token
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=[self.algorithm]
            )
            
            # Check token type
            if payload.get('token_type') != token_type:
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check if token is revoked
            if self.is_token_revoked(payload.get('jti')):
                raise jwt.InvalidTokenError("Token has been revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise jwt.InvalidTokenError("Token has expired")
        except jwt.InvalidTokenError:
            raise jwt.InvalidTokenError("Invalid token")
    
    def revoke_token(self, jti):
        """Revoke specific token"""
        # Add to revocation list (Redis/Database)
        cache.set(f"revoked_token:{jti}", True, timeout=86400 * 30)
    
    def revoke_all_user_tokens(self, user_id):
        """Revoke all tokens for a user (emergency logout)"""
        # Increment user token version to invalidate all existing tokens
        cache.incr(f"token_version:{user_id}")
```

### **Multi-Factor Authentication (MFA)**

#### **TOTP Implementation**
```python
import pyotp
import qrcode
from io import BytesIO
import base64

class SafeShipperMFA:
    """Multi-Factor Authentication for SafeShipper"""
    
    def __init__(self):
        self.issuer = "SafeShipper"
        self.valid_window = 1  # Allow 1 time step before/after current
    
    def generate_secret(self, user):
        """Generate TOTP secret for user"""
        secret = pyotp.random_base32()
        
        # Store encrypted secret
        encrypted_secret = self.encrypt_secret(secret)
        user.mfa_secret = encrypted_secret
        user.mfa_enabled = False  # Requires verification first
        user.save()
        
        return secret
    
    def generate_qr_code(self, user, secret):
        """Generate QR code for authenticator app setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name=self.issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode()
    
    def verify_totp(self, user, token):
        """Verify TOTP token"""
        if not user.mfa_secret:
            return False
        
        secret = self.decrypt_secret(user.mfa_secret)
        totp = pyotp.TOTP(secret)
        
        # Check current token and allow some time drift
        is_valid = totp.verify(token, valid_window=self.valid_window)
        
        if is_valid:
            # Prevent token reuse
            self.mark_token_used(user.id, token)
        
        return is_valid
    
    def generate_backup_codes(self, user):
        """Generate backup codes for MFA recovery"""
        backup_codes = []
        
        for _ in range(10):
            code = secrets.token_hex(4).upper()  # 8-character hex codes
            backup_codes.append(code)
        
        # Store hashed backup codes
        hashed_codes = [self.hash_backup_code(code) for code in backup_codes]
        user.mfa_backup_codes = json.dumps(hashed_codes)
        user.save()
        
        return backup_codes
    
    def verify_backup_code(self, user, code):
        """Verify and consume backup code"""
        if not user.mfa_backup_codes:
            return False
        
        backup_codes = json.loads(user.mfa_backup_codes)
        code_hash = self.hash_backup_code(code)
        
        if code_hash in backup_codes:
            # Remove used backup code
            backup_codes.remove(code_hash)
            user.mfa_backup_codes = json.dumps(backup_codes)
            user.save()
            return True
        
        return False
```

---

## 👤 **Authorization & Access Control**

### **Role-Based Access Control (RBAC)**

#### **Permission System Implementation**
```python
from enum import Enum
from typing import List, Set
from dataclasses import dataclass

class PermissionLevel(Enum):
    """Permission levels for dangerous goods operations"""
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    ADMIN = "admin"
    EMERGENCY = "emergency"

@dataclass
class Permission:
    """Individual permission definition"""
    domain: str
    action: str
    scope: str = ""
    level: PermissionLevel = PermissionLevel.VIEW
    
    def __str__(self):
        parts = [self.domain, self.action]
        if self.scope:
            parts.append(self.scope)
        return ".".join(parts)

class SafeShipperPermissionSystem:
    """Comprehensive permission system for SafeShipper"""
    
    ROLE_HIERARCHY = {
        'VIEWER': 1,
        'DRIVER': 2,
        'OPERATOR': 3,
        'SUPERVISOR': 4,
        'MANAGER': 5,
        'ADMIN': 6,
        'SUPER_ADMIN': 7
    }
    
    # Emergency-specific permissions
    EMERGENCY_PERMISSIONS = {
        'emergency.procedures.view',
        'emergency.incidents.report',
        'emergency.incidents.respond',
        'emergency.contacts.view',
        'dangerous_goods.emergency.access'
    }
    
    # Critical safety permissions requiring elevated access
    CRITICAL_PERMISSIONS = {
        'dangerous_goods.compatibility.override',
        'emergency.incidents.resolve',
        'compliance.violations.acknowledge',
        'safety.equipment.disable'
    }
    
    def __init__(self):
        self.role_permissions = self.load_role_permissions()
    
    def check_permission(self, user, permission_string, resource=None):
        """Comprehensive permission checking"""
        
        # Super admin has all permissions
        if user.role == 'SUPER_ADMIN':
            return True
        
        # Check if user has explicit permission
        if self.user_has_permission(user, permission_string):
            # Additional checks for critical permissions
            if permission_string in self.CRITICAL_PERMISSIONS:
                return self.check_critical_permission(user, permission_string)
            
            # Check resource-level permissions
            if resource:
                return self.check_resource_permission(user, resource)
            
            return True
        
        # Check if permission can be inherited from role hierarchy
        return self.check_inherited_permission(user, permission_string)
    
    def check_critical_permission(self, user, permission):
        """Additional validation for critical safety permissions"""
        
        # Require MFA for critical operations
        if not user.mfa_enabled:
            return False
        
        # Check for recent MFA verification (within last 15 minutes)
        last_mfa_verification = cache.get(f"mfa_verified:{user.id}")
        if not last_mfa_verification:
            return False
        
        # Check for emergency override conditions
        if permission.startswith('emergency.'):
            return self.check_emergency_override(user, permission)
        
        return True
    
    def check_emergency_override(self, user, permission):
        """Special handling for emergency situations"""
        
        # Check if there's an active emergency incident
        active_incidents = EmergencyIncident.objects.filter(
            status__in=['REPORTED', 'IN_PROGRESS'],
            company=user.company
        ).exists()
        
        if active_incidents:
            # Allow elevated access during emergencies
            if user.role in ['MANAGER', 'ADMIN', 'SUPER_ADMIN']:
                # Log emergency access
                self.log_emergency_access(user, permission)
                return True
        
        return False
    
    def check_resource_permission(self, user, resource):
        """Check if user can access specific resource"""
        
        # Company-based data isolation
        if hasattr(resource, 'company'):
            if resource.company != user.company:
                return False
        
        # User-specific resource access
        if hasattr(resource, 'created_by'):
            if resource.created_by == user:
                return True
        
        # Check if resource is assigned to user
        if hasattr(resource, 'assigned_to'):
            if resource.assigned_to == user:
                return True
        
        return True
    
    def load_role_permissions(self):
        """Load role-based permissions from configuration"""
        return {
            'VIEWER': [
                'dangerous_goods.view',
                'sds.library.view',
                'shipments.view.own',
                'documents.view',
                'emergency.procedures.view'
            ],
            'DRIVER': [
                'dangerous_goods.view',
                'dangerous_goods.compatibility.check',
                'shipments.view.assigned',
                'emergency.incidents.report',
                'emergency.contacts.view',
                'tracking.location.update',
                'documents.upload.pod'
            ],
            'OPERATOR': [
                'dangerous_goods.view',
                'dangerous_goods.compatibility.check',
                'shipments.create',
                'shipments.edit',
                'manifests.create',
                'documents.upload',
                'sds.upload',
                'emergency.incidents.report',
                'emergency.incidents.respond'
            ],
            'SUPERVISOR': [
                'users.view.team',
                'analytics.operational',
                'compliance.monitoring.view',
                'emergency.incidents.manage',
                'training.assign'
            ],
            'MANAGER': [
                'users.manage',
                'analytics.advanced',
                'compliance.violations.review',
                'emergency.incidents.resolve',
                'emergency.procedures.create',
                'fleet.management'
            ],
            'ADMIN': [
                'users.admin',
                'system.configuration',
                'audit.logs.view',
                'emergency.system.admin',
                'compliance.system.admin'
            ]
        }

# Permission decorator for API views
def require_permission(permission_string):
    """Decorator to require specific permission for API endpoints"""
    def decorator(view_func):
        def wrapper(self, request, *args, **kwargs):
            permission_system = SafeShipperPermissionSystem()
            
            if not permission_system.check_permission(
                request.user, 
                permission_string,
                resource=kwargs.get('resource')
            ):
                return Response(
                    {'error': 'Insufficient permissions'}, 
                    status=403
                )
            
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator

# Usage in API views
class DangerousGoodViewSet(viewsets.ModelViewSet):
    @require_permission('dangerous_goods.compatibility.check')
    def check_compatibility(self, request):
        # Implementation
        pass
    
    @require_permission('dangerous_goods.emergency.access')
    def emergency_access(self, request):
        # Special emergency access
        pass
```

---

## 🔒 **Data Security**

### **Encryption Implementation**

#### **Data at Rest Encryption**
```python
from cryptography.fernet import Fernet, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class SafeShipperEncryption:
    """Advanced encryption for SafeShipper sensitive data"""
    
    def __init__(self):
        self.master_key = self.load_master_key()
        self.cipher_suite = self.create_cipher_suite()
    
    def load_master_key(self):
        """Load or generate master encryption key"""
        master_key = os.getenv('SAFESHIPPER_MASTER_KEY')
        if not master_key:
            # Generate new master key (store securely in production)
            master_key = Fernet.generate_key()
            logger.warning("Generated new master key - store securely!")
        
        return master_key.encode() if isinstance(master_key, str) else master_key
    
    def create_cipher_suite(self):
        """Create multi-layer encryption suite"""
        # Use multiple keys for key rotation capability
        keys = [
            self.master_key,
            self.derive_key(self.master_key, b"emergency_data"),
            self.derive_key(self.master_key, b"customer_data")
        ]
        
        ciphers = [Fernet(key) for key in keys]
        return MultiFernet(ciphers)
    
    def derive_key(self, master_key, salt):
        """Derive encryption key from master key"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(master_key))
        return key
    
    def encrypt_sensitive_field(self, data):
        """Encrypt sensitive data field"""
        if data is None:
            return None
        
        if isinstance(data, str):
            data = data.encode()
        
        encrypted_data = self.cipher_suite.encrypt(data)
        return base64.b64encode(encrypted_data).decode()
    
    def decrypt_sensitive_field(self, encrypted_data):
        """Decrypt sensitive data field"""
        if encrypted_data is None:
            return None
        
        try:
            decoded_data = base64.b64decode(encrypted_data)
            decrypted_data = self.cipher_suite.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return None

# Model mixin for encrypted fields
class EncryptedFieldsMixin:
    """Mixin for models with encrypted fields"""
    
    ENCRYPTED_FIELDS = []
    
    def save(self, *args, **kwargs):
        """Encrypt sensitive fields before saving"""
        encryption = SafeShipperEncryption()
        
        for field in self.ENCRYPTED_FIELDS:
            value = getattr(self, field, None)
            if value and not value.startswith('enc:'):
                encrypted_value = encryption.encrypt_sensitive_field(value)
                setattr(self, field, f"enc:{encrypted_value}")
        
        super().save(*args, **kwargs)
    
    def get_decrypted_field(self, field_name):
        """Get decrypted value for encrypted field"""
        if field_name not in self.ENCRYPTED_FIELDS:
            return getattr(self, field_name)
        
        encrypted_value = getattr(self, field_name)
        if encrypted_value and encrypted_value.startswith('enc:'):
            encryption = SafeShipperEncryption()
            return encryption.decrypt_sensitive_field(encrypted_value[4:])
        
        return encrypted_value

# Example usage in models
class EmergencyContact(EncryptedFieldsMixin, models.Model):
    ENCRYPTED_FIELDS = ['phone', 'email', 'emergency_details']
    
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=255)  # Encrypted
    email = models.CharField(max_length=255)  # Encrypted
    emergency_details = models.TextField(blank=True)  # Encrypted
    
    def get_phone_display(self):
        """Get decrypted phone for display"""
        return self.get_decrypted_field('phone')
```

### **Database Security**

#### **Row-Level Security (RLS)**
```sql
-- PostgreSQL Row Level Security for multi-tenant data isolation
-- Enable RLS on all major tables

-- Companies table (reference for all RLS policies)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Shipments table with company-based RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipment_company_policy ON shipments
    FOR ALL
    TO application_role
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- Emergency procedures with company isolation
ALTER TABLE emergency_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY emergency_procedures_company_policy ON emergency_procedures
    FOR ALL
    TO application_role
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- Emergency incidents with additional user-based access
ALTER TABLE emergency_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY emergency_incidents_company_policy ON emergency_incidents
    FOR ALL
    TO application_role
    USING (
        company_id = current_setting('app.current_company_id')::UUID
        OR reported_by_id = current_setting('app.current_user_id')::UUID
    );

-- User access based on role
CREATE POLICY emergency_incidents_role_policy ON emergency_incidents
    FOR SELECT
    TO application_role
    USING (
        current_setting('app.current_user_role') IN ('ADMIN', 'MANAGER', 'EMERGENCY_COORDINATOR')
        OR reported_by_id = current_setting('app.current_user_id')::UUID
    );

-- Documents with user and company filtering
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_access_policy ON documents
    FOR ALL
    TO application_role
    USING (
        company_id = current_setting('app.current_company_id')::UUID
        AND (
            uploaded_by_id = current_setting('app.current_user_id')::UUID
            OR current_setting('app.current_user_role') IN ('ADMIN', 'MANAGER')
            OR document_type IN ('EMERGENCY_PROCEDURE', 'SAFETY_DATA_SHEET')
        )
    );

-- Dangerous goods (read-only for all authenticated users)
ALTER TABLE dangerous_goods ENABLE ROW LEVEL SECURITY;

CREATE POLICY dangerous_goods_read_policy ON dangerous_goods
    FOR SELECT
    TO application_role
    USING (true);  -- Read access for all authenticated users

-- Prevent modifications to dangerous goods data
CREATE POLICY dangerous_goods_write_policy ON dangerous_goods
    FOR ALL
    TO application_role
    USING (current_setting('app.current_user_role') = 'SUPER_ADMIN');
```

#### **Database Connection Security**
```python
# Secure database connection with connection pooling
import psycopg2
from psycopg2 import pool
import ssl

class SecureDatabaseConnection:
    """Secure database connection management"""
    
    def __init__(self):
        self.connection_pool = self.create_connection_pool()
    
    def create_connection_pool(self):
        """Create secure connection pool"""
        return psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=20,
            host=settings.DB_HOST,
            database=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            port=settings.DB_PORT,
            sslmode='require',
            sslcert=settings.SSL_CERT_PATH,
            sslkey=settings.SSL_KEY_PATH,
            sslrootcert=settings.SSL_CA_PATH,
            connect_timeout=10,
            options="-c search_path=safeshipper_schema"
        )
    
    def get_connection(self, user_context):
        """Get connection with user context for RLS"""
        conn = self.connection_pool.getconn()
        
        try:
            with conn.cursor() as cursor:
                # Set user context for Row Level Security
                cursor.execute(
                    "SELECT set_config('app.current_user_id', %s, true)",
                    (str(user_context['user_id']),)
                )
                cursor.execute(
                    "SELECT set_config('app.current_company_id', %s, true)",
                    (str(user_context['company_id']),)
                )
                cursor.execute(
                    "SELECT set_config('app.current_user_role', %s, true)",
                    (user_context['role'],)
                )
            
            return conn
            
        except Exception as e:
            self.connection_pool.putconn(conn)
            raise e
```

---

## 🚨 **Security Monitoring & Incident Response**

### **Real-Time Threat Detection**

#### **Security Event Monitoring**
```python
import structlog
from datetime import datetime, timedelta
from collections import defaultdict

class SafeShipperSecurityMonitor:
    """Real-time security monitoring and threat detection"""
    
    def __init__(self):
        self.security_logger = structlog.get_logger("security")
        self.threat_indicators = defaultdict(list)
        self.alert_thresholds = {
            'failed_logins': 5,
            'permission_violations': 3,
            'data_access_anomalies': 10,
            'emergency_access_requests': 2
        }
    
    def log_security_event(self, event_type, user, details):
        """Log security event with structured data"""
        
        event_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'user_id': str(user.id) if user else None,
            'username': user.username if user else None,
            'company_id': str(user.company.id) if user and user.company else None,
            'ip_address': details.get('ip_address'),
            'user_agent': details.get('user_agent'),
            'details': details,
            'severity': self.calculate_severity(event_type, details)
        }
        
        self.security_logger.info("security_event", **event_data)
        
        # Check for threat patterns
        self.analyze_threat_patterns(event_type, user, event_data)
    
    def analyze_threat_patterns(self, event_type, user, event_data):
        """Analyze events for threat patterns"""
        
        if event_type == 'failed_login':
            self.track_failed_logins(user, event_data)
        elif event_type == 'permission_violation':
            self.track_permission_violations(user, event_data)
        elif event_type == 'emergency_access':
            self.track_emergency_access(user, event_data)
        elif event_type == 'data_access_anomaly':
            self.track_data_access_anomalies(user, event_data)
    
    def track_failed_logins(self, user, event_data):
        """Track failed login attempts"""
        
        key = f"failed_logins:{event_data['ip_address']}"
        self.threat_indicators[key].append(event_data['timestamp'])
        
        # Clean old entries (older than 1 hour)
        cutoff = datetime.utcnow() - timedelta(hours=1)
        self.threat_indicators[key] = [
            ts for ts in self.threat_indicators[key]
            if datetime.fromisoformat(ts) > cutoff
        ]
        
        # Check threshold
        if len(self.threat_indicators[key]) >= self.alert_thresholds['failed_logins']:
            self.trigger_security_alert('brute_force_attempt', {
                'ip_address': event_data['ip_address'],
                'attempt_count': len(self.threat_indicators[key])
            })
    
    def track_permission_violations(self, user, event_data):
        """Track permission violations by user"""
        
        if not user:
            return
        
        key = f"permission_violations:{user.id}"
        self.threat_indicators[key].append(event_data['timestamp'])
        
        # Clean old entries (older than 4 hours)
        cutoff = datetime.utcnow() - timedelta(hours=4)
        self.threat_indicators[key] = [
            ts for ts in self.threat_indicators[key]
            if datetime.fromisoformat(ts) > cutoff
        ]
        
        # Check threshold
        if len(self.threat_indicators[key]) >= self.alert_thresholds['permission_violations']:
            self.trigger_security_alert('privilege_escalation_attempt', {
                'user_id': str(user.id),
                'violation_count': len(self.threat_indicators[key])
            })
    
    def track_emergency_access(self, user, event_data):
        """Track emergency access usage"""
        
        if not user:
            return
        
        key = f"emergency_access:{user.id}"
        self.threat_indicators[key].append(event_data['timestamp'])
        
        # Emergency access should be rare - shorter window
        cutoff = datetime.utcnow() - timedelta(hours=2)
        self.threat_indicators[key] = [
            ts for ts in self.threat_indicators[key]
            if datetime.fromisoformat(ts) > cutoff
        ]
        
        # Lower threshold for emergency access
        if len(self.threat_indicators[key]) >= self.alert_thresholds['emergency_access_requests']:
            self.trigger_security_alert('suspicious_emergency_access', {
                'user_id': str(user.id),
                'access_count': len(self.threat_indicators[key])
            })
    
    def trigger_security_alert(self, alert_type, details):
        """Trigger security alert and response"""
        
        alert_data = {
            'alert_type': alert_type,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details,
            'severity': 'HIGH' if 'emergency' in alert_type else 'MEDIUM'
        }
        
        # Log high-priority security alert
        self.security_logger.critical("security_alert", **alert_data)
        
        # Trigger automated response
        self.initiate_security_response(alert_type, alert_data)
    
    def initiate_security_response(self, alert_type, alert_data):
        """Initiate automated security response"""
        
        if alert_type == 'brute_force_attempt':
            # Temporarily block IP address
            self.block_ip_address(alert_data['details']['ip_address'])
        
        elif alert_type == 'privilege_escalation_attempt':
            # Flag user account for review
            self.flag_user_account(alert_data['details']['user_id'])
        
        elif alert_type == 'suspicious_emergency_access':
            # Notify security team immediately
            self.notify_security_team(alert_data)
        
        # Send alert to security monitoring system
        self.send_siem_alert(alert_data)

# Security middleware for automatic monitoring
class SecurityMonitoringMiddleware:
    """Middleware for automatic security event monitoring"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_monitor = SafeShipperSecurityMonitor()
    
    def __call__(self, request):
        # Monitor request
        self.monitor_request(request)
        
        response = self.get_response(request)
        
        # Monitor response
        self.monitor_response(request, response)
        
        return response
    
    def monitor_request(self, request):
        """Monitor incoming request for security events"""
        
        # Check for suspicious patterns
        if self.is_suspicious_request(request):
            self.security_monitor.log_security_event(
                'suspicious_request',
                getattr(request, 'user', None),
                {
                    'path': request.path,
                    'method': request.method,
                    'ip_address': self.get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'reason': 'Suspicious request pattern detected'
                }
            )
    
    def monitor_response(self, request, response):
        """Monitor response for security events"""
        
        # Log permission violations (403 responses)
        if response.status_code == 403:
            self.security_monitor.log_security_event(
                'permission_violation',
                getattr(request, 'user', None),
                {
                    'path': request.path,
                    'method': request.method,
                    'ip_address': self.get_client_ip(request),
                    'attempted_resource': request.path
                }
            )
        
        # Log authentication failures (401 responses)
        elif response.status_code == 401:
            self.security_monitor.log_security_event(
                'authentication_failure',
                None,
                {
                    'path': request.path,
                    'method': request.method,
                    'ip_address': self.get_client_ip(request)
                }
            )
```

---

## 📋 **Security Compliance & Auditing**

### **Audit Trail Implementation**

#### **Comprehensive Audit Logging**
```python
from django.contrib.contenttypes.models import ContentType
from django.db import models
import json

class AuditEvent(models.Model):
    """Comprehensive audit trail for SafeShipper operations"""
    
    EVENT_TYPES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('PERMISSION_CHANGE', 'Permission Change'),
        ('EMERGENCY_ACCESS', 'Emergency Access'),
        ('EXPORT', 'Data Export'),
        ('IMPORT', 'Data Import')
    ]
    
    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical')
    ]
    
    timestamp = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='LOW')
    
    # User and company context
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    company = models.ForeignKey('companies.Company', on_delete=models.SET_NULL, null=True)
    
    # Resource information
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True)
    object_id = models.UUIDField(null=True, blank=True)
    object_repr = models.CharField(max_length=200)
    
    # Request context
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    request_path = models.CharField(max_length=500)
    
    # Event details
    description = models.TextField()
    changed_fields = models.JSONField(default=dict)
    additional_data = models.JSONField(default=dict)
    
    class Meta:
        indexes = [
            models.Index(fields=['timestamp', 'company']),
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['severity', 'timestamp'])
        ]

class SafeShipperAuditor:
    """Comprehensive auditing system for SafeShipper"""
    
    def __init__(self):
        self.high_risk_models = [
            'EmergencyProcedure',
            'EmergencyIncident', 
            'DangerousGood',
            'User',
            'Company'
        ]
        
        self.critical_fields = {
            'User': ['role', 'is_active', 'is_staff', 'permissions'],
            'EmergencyProcedure': ['is_active', 'emergency_type', 'procedure_steps'],
            'EmergencyIncident': ['status', 'severity_level', 'response_team']
        }
    
    def log_model_change(self, instance, action, user, request, old_values=None):
        """Log model changes with comprehensive context"""
        
        model_name = instance.__class__.__name__
        severity = self.calculate_severity(model_name, action, instance)
        
        # Detect changed fields
        changed_fields = {}
        if old_values and action == 'UPDATE':
            changed_fields = self.detect_changed_fields(instance, old_values)
        
        # Create audit event
        AuditEvent.objects.create(
            event_type=action,
            severity=severity,
            user=user,
            company=getattr(user, 'company', None),
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.id,
            object_repr=str(instance)[:200],
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            request_path=request.path,
            description=f"{action} {model_name}: {str(instance)}",
            changed_fields=changed_fields,
            additional_data={
                'model': model_name,
                'is_dangerous_goods_related': self.is_dangerous_goods_related(instance),
                'requires_compliance_review': self.requires_compliance_review(instance, changed_fields)
            }
        )
    
    def calculate_severity(self, model_name, action, instance):
        """Calculate event severity based on model and action"""
        
        if model_name in self.high_risk_models:
            if action in ['DELETE', 'PERMISSION_CHANGE']:
                return 'CRITICAL'
            elif action == 'UPDATE':
                return 'HIGH'
            else:
                return 'MEDIUM'
        
        if model_name.startswith('Emergency'):
            return 'HIGH'
        
        return 'LOW'
    
    def detect_changed_fields(self, instance, old_values):
        """Detect which fields changed and their values"""
        
        changed_fields = {}
        model_name = instance.__class__.__name__
        critical_fields = self.critical_fields.get(model_name, [])
        
        for field in instance._meta.fields:
            field_name = field.name
            new_value = getattr(instance, field_name)
            old_value = old_values.get(field_name)
            
            if new_value != old_value:
                # Mark as critical if it's a critical field
                is_critical = field_name in critical_fields
                
                changed_fields[field_name] = {
                    'old_value': str(old_value) if old_value else None,
                    'new_value': str(new_value) if new_value else None,
                    'is_critical_field': is_critical
                }
        
        return changed_fields
    
    def log_dangerous_goods_operation(self, operation_type, un_numbers, result, user, request):
        """Log dangerous goods specific operations"""
        
        AuditEvent.objects.create(
            event_type='VIEW',  # DG operations are typically read operations
            severity='MEDIUM',
            user=user,
            company=getattr(user, 'company', None),
            object_repr=f"DG Operation: {operation_type}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            request_path=request.path,
            description=f"Dangerous goods {operation_type} operation",
            additional_data={
                'operation_type': operation_type,
                'un_numbers': un_numbers,
                'is_compatible': result.get('is_compatible', True),
                'conflicts_detected': len(result.get('conflicts', [])),
                'compliance_status': 'PASS' if result.get('is_compatible', True) else 'FAIL'
            }
        )
    
    def log_emergency_access(self, user, resource, justification, request):
        """Log emergency access events"""
        
        AuditEvent.objects.create(
            event_type='EMERGENCY_ACCESS',
            severity='CRITICAL',
            user=user,
            company=getattr(user, 'company', None),
            object_repr=f"Emergency access to {resource}",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            request_path=request.path,
            description=f"Emergency access granted to {resource}",
            additional_data={
                'justification': justification,
                'emergency_type': 'SYSTEM_ACCESS',
                'requires_review': True,
                'auto_expire_hours': 4  # Emergency access expires automatically
            }
        )

# Audit middleware
class AuditMiddleware:
    """Middleware for automatic audit logging"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.auditor = SafeShipperAuditor()
    
    def __call__(self, request):
        # Store request start time for performance tracking
        request.audit_start_time = timezone.now()
        
        response = self.get_response(request)
        
        # Log high-risk operations
        if self.is_auditable_request(request, response):
            self.log_request_audit(request, response)
        
        return response
    
    def is_auditable_request(self, request, response):
        """Determine if request should be audited"""
        
        # Audit all dangerous goods operations
        if 'dangerous-goods' in request.path:
            return True
        
        # Audit all emergency procedures
        if 'emergency' in request.path:
            return True
        
        # Audit all user management operations
        if 'users' in request.path and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return True
        
        # Audit failed requests
        if response.status_code >= 400:
            return True
        
        return False
```

---

## 🎯 **Security Best Practices Checklist**

### **Development Security Checklist**

- [ ] **Authentication & Authorization**
  - [ ] JWT tokens use RS256 algorithm with key rotation
  - [ ] MFA required for critical operations
  - [ ] Permission-based access control implemented
  - [ ] Company-based data isolation enforced
  - [ ] Emergency access controls with automatic expiry

- [ ] **Data Protection**
  - [ ] Sensitive data encrypted at rest (AES-256)
  - [ ] PII and emergency contact data encrypted
  - [ ] Database connections use TLS 1.3
  - [ ] Row-level security policies implemented
  - [ ] Regular security key rotation

- [ ] **API Security**
  - [ ] Rate limiting on all endpoints
  - [ ] Input validation and sanitization
  - [ ] SQL injection prevention (ORM only)
  - [ ] XSS protection implemented
  - [ ] CSRF tokens for state-changing operations

- [ ] **Monitoring & Auditing**
  - [ ] Comprehensive audit trail for all operations
  - [ ] Real-time security event monitoring
  - [ ] Threat pattern detection and alerting
  - [ ] Failed login attempt tracking
  - [ ] Emergency access logging and review

- [ ] **Infrastructure Security**
  - [ ] TLS 1.3 for all communications
  - [ ] Security headers configured (HSTS, CSP, etc.)
  - [ ] Regular security updates and patching
  - [ ] Backup encryption and secure storage
  - [ ] Network segmentation and firewall rules

### **Emergency Security Procedures**

#### **Security Incident Response Plan**
1. **Immediate Response** (0-1 hour)
   - Identify and contain the threat
   - Preserve evidence and logs
   - Notify security team and management
   - Activate incident response team

2. **Assessment** (1-4 hours)
   - Assess scope and impact
   - Determine if customer data is affected
   - Evaluate business continuity requirements
   - Document findings

3. **Containment & Recovery** (4-24 hours)
   - Implement containment measures
   - Remove malicious code or access
   - Restore systems from clean backups
   - Verify system integrity

4. **Communication** (As needed)
   - Notify affected customers
   - Report to regulatory authorities if required
   - Update stakeholders on resolution progress
   - Prepare public communications if necessary

5. **Post-Incident** (1-4 weeks)
   - Conduct thorough post-mortem
   - Update security policies and procedures
   - Implement additional security controls
   - Train staff on lessons learned

---

**This comprehensive security documentation ensures SafeShipper maintains the highest levels of security for dangerous goods transportation operations, protecting sensitive data and ensuring regulatory compliance across all aspects of the platform.**