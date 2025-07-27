# enterprise_auth/services.py
import qrcode
import io
import base64
import secrets
import string
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django_otp.plugins.otp_static.models import StaticDevice
from django_otp.plugins.otp_totp.models import TOTPDevice
import pyotp
import logging

from .models import MFADevice, SSOProvider, UserSSOAccount, AuthenticationLog, SecurityPolicy

User = get_user_model()
logger = logging.getLogger(__name__)


class MFAService:
    """Service for managing Multi-Factor Authentication"""
    
    def setup_totp(self, user, device_name="TOTP Device"):
        """Setup TOTP (Time-based One-Time Password) device"""
        try:
            # Generate secret key
            secret_key = pyotp.random_base32()
            
            # Generate backup codes
            backup_codes = self._generate_backup_codes()
            
            # Create MFA device record
            device = MFADevice.objects.create(
                user=user,
                device_type='totp',
                name=device_name,
                secret_key=secret_key,
                backup_codes=backup_codes,
                is_confirmed=False
            )
            
            logger.info(f"TOTP device created for user {user.email}")
            return device
            
        except Exception as e:
            logger.error(f"TOTP setup error for user {user.email}: {str(e)}")
            raise
    
    def setup_sms(self, user, device_name, phone_number):
        """Setup SMS-based MFA device"""
        try:
            # Generate backup codes
            backup_codes = self._generate_backup_codes()
            
            # Create MFA device record
            device = MFADevice.objects.create(
                user=user,
                device_type='sms',
                name=device_name,
                phone_number=phone_number,
                backup_codes=backup_codes,
                is_confirmed=False
            )
            
            logger.info(f"SMS device created for user {user.email}")
            return device
            
        except Exception as e:
            logger.error(f"SMS setup error for user {user.email}: {str(e)}")
            raise
    
    def generate_qr_code(self, device):
        """Generate QR code for TOTP device setup"""
        try:
            if device.device_type != 'totp':
                raise ValueError("QR codes only available for TOTP devices")
            
            totp = pyotp.TOTP(device.secret_key)
            provisioning_uri = totp.provisioning_uri(
                name=device.user.email,
                issuer_name=getattr(settings, 'OTP_TOTP_ISSUER', 'SafeShipper')
            )
            
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            qr_code_data = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{qr_code_data}"
            
        except Exception as e:
            logger.error(f"QR code generation error: {str(e)}")
            raise
    
    def verify_device(self, device, code):
        """Verify MFA code for any device type"""
        try:
            if device.device_type == 'totp':
                return self._verify_totp(device, code)
            elif device.device_type == 'sms':
                return self._verify_sms(device, code)
            elif device.device_type == 'backup':
                return self._verify_backup_code(device, code)
            
            return False
            
        except Exception as e:
            logger.error(f"MFA verification error: {str(e)}")
            return False
    
    def _verify_totp(self, device, code):
        """Verify TOTP code"""
        try:
            totp = pyotp.TOTP(device.secret_key)
            
            # Verify with some time window tolerance
            return totp.verify(code, valid_window=1)
            
        except Exception as e:
            logger.error(f"TOTP verification error: {str(e)}")
            return False
    
    def _verify_sms(self, device, code):
        """Verify SMS code (placeholder - would integrate with SMS service)"""
        # This is a placeholder implementation
        # In production, you would verify against a code sent via SMS
        # For now, we'll store the sent code temporarily and verify against it
        
        # Get stored verification code (this would be stored temporarily)
        stored_code = getattr(device, '_temp_sms_code', None)
        
        if stored_code and stored_code == code:
            # Clear the temporary code
            delattr(device, '_temp_sms_code')
            return True
        
        return False
    
    def _verify_backup_code(self, device, code):
        """Verify backup code"""
        if code in device.backup_codes:
            # Remove used backup code
            device.backup_codes.remove(code)
            device.save()
            return True
        
        return False
    
    def send_sms_code(self, device):
        """Send SMS verification code (placeholder)"""
        if device.device_type != 'sms':
            raise ValueError("Device is not SMS type")
        
        # Generate 6-digit code
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        # Store temporarily (in production, this would be in cache/database)
        device._temp_sms_code = code
        
        # Here you would integrate with SMS service like Twilio
        logger.info(f"SMS code generated for {device.phone_number}: {code}")
        
        return code
    
    def _generate_backup_codes(self, count=10):
        """Generate backup recovery codes"""
        codes = []
        for _ in range(count):
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            codes.append(code)
        return codes
    
    def is_mfa_required(self, user):
        """Check if MFA is required for user based on role and policy"""
        try:
            # Get active security policy
            policy = SecurityPolicy.objects.filter(is_active=True).first()
            
            if not policy:
                # Default MFA requirements
                mfa_required_roles = ['ADMIN', 'COMPLIANCE_OFFICER']
            else:
                mfa_required_roles = policy.require_mfa_for_roles
            
            return user.role in mfa_required_roles
            
        except Exception as e:
            logger.error(f"MFA requirement check error: {str(e)}")
            return False


class SSOService:
    """Service for managing Single Sign-On"""
    
    def get_provider_for_domain(self, email_domain):
        """Get SSO provider configured for a specific domain"""
        try:
            return SSOProvider.objects.filter(
                domain__icontains=email_domain,
                is_active=True
            ).first()
        except Exception as e:
            logger.error(f"Provider lookup error for domain {email_domain}: {str(e)}")
            return None
    
    def create_or_update_sso_account(self, user, provider, sso_data):
        """Create or update SSO account linking"""
        try:
            sso_account, created = UserSSOAccount.objects.get_or_create(
                user=user,
                provider=provider,
                defaults={
                    'sso_user_id': sso_data.get('id', ''),
                    'sso_email': sso_data.get('email', user.email),
                    'sso_display_name': sso_data.get('name', ''),
                }
            )
            
            if not created:
                # Update existing account
                sso_account.sso_email = sso_data.get('email', user.email)
                sso_account.sso_display_name = sso_data.get('name', '')
                sso_account.last_login = timezone.now()
                sso_account.save()
            
            logger.info(f"SSO account {'created' if created else 'updated'} for {user.email}")
            return sso_account
            
        except Exception as e:
            logger.error(f"SSO account creation error: {str(e)}")
            raise
    
    def validate_domain_restriction(self, provider, email):
        """Validate if email domain is allowed for SSO provider"""
        if not provider.require_company_email:
            return True
        
        email_domain = email.split('@')[1].lower()
        provider_domain = provider.domain.lower()
        
        return email_domain == provider_domain or email_domain.endswith('.' + provider_domain)
    
    def get_available_providers(self, email=None):
        """Get available SSO providers, optionally filtered by email domain"""
        try:
            providers = SSOProvider.objects.filter(is_active=True)
            
            if email:
                email_domain = email.split('@')[1].lower()
                # Filter providers that accept this domain
                providers = providers.filter(
                    models.Q(domain__icontains=email_domain) | 
                    models.Q(require_company_email=False)
                )
            
            return providers
            
        except Exception as e:
            logger.error(f"Available providers error: {str(e)}")
            return SSOProvider.objects.none()


class SecurityPolicyService:
    """Service for managing security policies and compliance"""
    
    def get_active_policy(self):
        """Get the currently active security policy"""
        return SecurityPolicy.objects.filter(is_active=True).first()
    
    def check_user_compliance(self, user):
        """Check if user meets security policy requirements"""
        try:
            policy = self.get_active_policy()
            if not policy:
                return True  # No policy = compliant
            
            compliance_issues = []
            
            # Check MFA requirement
            if user.role in policy.require_mfa_for_roles:
                if not user.mfa_devices.filter(is_confirmed=True).exists():
                    compliance_issues.append("MFA required but not configured")
            
            # Check password expiry
            if policy.password_expiry_days > 0:
                if hasattr(user, 'password_changed_at'):
                    password_age = (timezone.now() - user.password_changed_at).days
                    if password_age > policy.password_expiry_days:
                        compliance_issues.append("Password expired")
            
            # Check session limits (would require session tracking)
            # Check IP restrictions (would require IP validation)
            
            return len(compliance_issues) == 0, compliance_issues
            
        except Exception as e:
            logger.error(f"Compliance check error for user {user.email}: {str(e)}")
            return False, ["Compliance check failed"]
    
    def enforce_session_timeout(self, user, session_key):
        """Enforce session timeout policy"""
        try:
            policy = self.get_active_policy()
            if not policy:
                return True
            
            # Implementation would check session age against policy.session_timeout_minutes
            # This is a placeholder for session management logic
            
            return True
            
        except Exception as e:
            logger.error(f"Session timeout enforcement error: {str(e)}")
            return False
    
    def log_security_event(self, user, event_type, details=None):
        """Log security-related events"""
        try:
            AuthenticationLog.objects.create(
                user=user,
                event_type=event_type,
                ip_address=details.get('ip_address', '') if details else '',
                user_agent=details.get('user_agent', '') if details else '',
                success=details.get('success', True) if details else True,
                failure_reason=details.get('failure_reason', '') if details else '',
                metadata=details or {}
            )
            
        except Exception as e:
            logger.error(f"Security event logging error: {str(e)}")


class AuthenticationService:
    """Comprehensive authentication service"""
    
    def __init__(self):
        self.mfa_service = MFAService()
        self.sso_service = SSOService()
        self.policy_service = SecurityPolicyService()
    
    def authenticate_with_mfa(self, user, request_data):
        """Authenticate user with MFA if required"""
        try:
            # Check if MFA is required
            if self.mfa_service.is_mfa_required(user):
                mfa_devices = user.mfa_devices.filter(is_confirmed=True)
                
                if not mfa_devices.exists():
                    return {
                        'success': False,
                        'requires_mfa_setup': True,
                        'message': 'MFA setup required for your role'
                    }
                
                # Return MFA challenge
                return {
                    'success': False,
                    'requires_mfa': True,
                    'available_devices': [
                        {
                            'id': device.id,
                            'type': device.device_type,
                            'name': device.name,
                            'is_primary': device.is_primary
                        }
                        for device in mfa_devices
                    ]
                }
            
            # No MFA required
            return {
                'success': True,
                'requires_mfa': False,
                'user': user
            }
            
        except Exception as e:
            logger.error(f"MFA authentication error: {str(e)}")
            return {
                'success': False,
                'error': 'Authentication service error'
            }