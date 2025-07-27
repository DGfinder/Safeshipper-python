# enterprise_auth/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from simple_history.models import HistoricalRecords
import uuid

User = get_user_model()


class SSOProvider(models.Model):
    """Model to track different SSO providers and their configurations"""
    
    class ProviderType(models.TextChoices):
        GOOGLE = 'google', _('Google')
        MICROSOFT = 'microsoft', _('Microsoft')
        OKTA = 'okta', _('Okta')
        SAML = 'saml', _('SAML')
        AZURE_AD = 'azure_ad', _('Azure AD')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    provider_type = models.CharField(max_length=20, choices=ProviderType.choices)
    domain = models.CharField(max_length=255, help_text="Company domain for auto-routing")
    is_active = models.BooleanField(default=True)
    
    # Configuration fields
    client_id = models.CharField(max_length=255, blank=True)
    client_secret = models.CharField(max_length=500, blank=True)
    
    # SAML specific fields
    saml_entity_id = models.CharField(max_length=255, blank=True)
    saml_sso_url = models.URLField(blank=True)
    saml_certificate = models.TextField(blank=True)
    
    # Restrictions
    allowed_roles = models.JSONField(
        default=list,
        help_text="List of roles allowed to use this SSO provider"
    )
    require_company_email = models.BooleanField(
        default=True,
        help_text="Require users to have company domain email"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = _("SSO Provider")
        verbose_name_plural = _("SSO Providers")
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"


class UserSSOAccount(models.Model):
    """Link users to their SSO accounts"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sso_accounts')
    provider = models.ForeignKey(SSOProvider, on_delete=models.CASCADE)
    
    # SSO account details
    sso_user_id = models.CharField(max_length=255)
    sso_email = models.EmailField()
    sso_display_name = models.CharField(max_length=255, blank=True)
    
    # Metadata
    first_login = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = _("User SSO Account")
        verbose_name_plural = _("User SSO Accounts")
        unique_together = [['provider', 'sso_user_id']]
        ordering = ['-last_login']
    
    def __str__(self):
        return f"{self.user.email} via {self.provider.name}"


class MFADevice(models.Model):
    """Enhanced MFA device tracking"""
    
    class DeviceType(models.TextChoices):
        TOTP = 'totp', _('TOTP (Authenticator App)')
        SMS = 'sms', _('SMS')
        EMAIL = 'email', _('Email')
        BACKUP = 'backup', _('Backup Codes')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mfa_devices')
    device_type = models.CharField(max_length=10, choices=DeviceType.choices)
    name = models.CharField(max_length=100, help_text="User-friendly device name")
    
    # Device-specific data
    phone_number = models.CharField(max_length=20, blank=True)  # For SMS
    secret_key = models.CharField(max_length=255, blank=True)   # For TOTP
    backup_codes = models.JSONField(default=list, blank=True)   # For backup codes
    
    # Status
    is_confirmed = models.BooleanField(default=False)
    is_primary = models.BooleanField(default=False)
    
    # Usage tracking
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    use_count = models.PositiveIntegerField(default=0)
    
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = _("MFA Device")
        verbose_name_plural = _("MFA Devices")
        ordering = ['-is_primary', '-last_used']
    
    def __str__(self):
        return f"{self.user.email} - {self.name} ({self.get_device_type_display()})"


class AuthenticationLog(models.Model):
    """Comprehensive authentication event logging"""
    
    class EventType(models.TextChoices):
        LOGIN_SUCCESS = 'login_success', _('Login Success')
        LOGIN_FAILED = 'login_failed', _('Login Failed')
        SSO_LOGIN = 'sso_login', _('SSO Login')
        MFA_CHALLENGE = 'mfa_challenge', _('MFA Challenge')
        MFA_SUCCESS = 'mfa_success', _('MFA Success')
        MFA_FAILED = 'mfa_failed', _('MFA Failed')
        LOGOUT = 'logout', _('Logout')
        PASSWORD_RESET = 'password_reset', _('Password Reset')
        ACCOUNT_LOCKED = 'account_locked', _('Account Locked')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    
    # Request details
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=100, blank=True)
    
    # Authentication details
    username_attempted = models.CharField(max_length=255, blank=True)
    sso_provider = models.ForeignKey(SSOProvider, on_delete=models.SET_NULL, null=True, blank=True)
    mfa_device = models.ForeignKey(MFADevice, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Event metadata
    success = models.BooleanField()
    failure_reason = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Authentication Log")
        verbose_name_plural = _("Authentication Logs")
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['ip_address', '-timestamp']),
            models.Index(fields=['event_type', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.username_attempted or 'Unknown'} at {self.timestamp}"


class SecurityPolicy(models.Model):
    """Enterprise security policies and requirements"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    # MFA Requirements
    require_mfa_for_roles = models.JSONField(
        default=list,
        help_text="List of roles that require MFA"
    )
    mfa_grace_period_hours = models.PositiveIntegerField(
        default=24,
        help_text="Hours before MFA becomes mandatory for new users"
    )
    
    # Password Requirements
    min_password_length = models.PositiveIntegerField(default=8)
    require_password_complexity = models.BooleanField(default=True)
    password_expiry_days = models.PositiveIntegerField(default=90)
    
    # Session Management
    session_timeout_minutes = models.PositiveIntegerField(default=480)  # 8 hours
    max_concurrent_sessions = models.PositiveIntegerField(default=3)
    
    # Access Controls
    allowed_ip_ranges = models.JSONField(
        default=list,
        help_text="List of allowed IP ranges (CIDR notation)"
    )
    block_countries = models.JSONField(
        default=list,
        help_text="List of country codes to block"
    )
    
    # Audit Requirements
    log_all_access = models.BooleanField(default=True)
    alert_on_suspicious_activity = models.BooleanField(default=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = _("Security Policy")
        verbose_name_plural = _("Security Policies")
        ordering = ['name']
    
    def __str__(self):
        return self.name