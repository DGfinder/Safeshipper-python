# enterprise_auth/serializers.py
from rest_framework import serializers
from .models import SSOProvider, UserSSOAccount, MFADevice, AuthenticationLog, SecurityPolicy


class SSOProviderSerializer(serializers.ModelSerializer):
    """Serializer for SSO Provider (public info only)"""
    
    class Meta:
        model = SSOProvider
        fields = [
            'id', 'name', 'provider_type', 'domain', 'is_active',
            'require_company_email'
        ]
        read_only_fields = ['id']


class SSOProviderDetailSerializer(serializers.ModelSerializer):
    """Detailed SSO Provider serializer for admin use"""
    
    class Meta:
        model = SSOProvider
        fields = [
            'id', 'name', 'provider_type', 'domain', 'is_active',
            'client_id', 'saml_entity_id', 'saml_sso_url',
            'allowed_roles', 'require_company_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'client_secret': {'write_only': True},
            'saml_certificate': {'write_only': True}
        }


class UserSSOAccountSerializer(serializers.ModelSerializer):
    """Serializer for user SSO account information"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    provider_type = serializers.CharField(source='provider.provider_type', read_only=True)
    
    class Meta:
        model = UserSSOAccount
        fields = [
            'id', 'provider_name', 'provider_type', 'sso_email',
            'sso_display_name', 'first_login', 'last_login', 'is_active'
        ]
        read_only_fields = ['id', 'first_login', 'last_login']


class MFADeviceSerializer(serializers.ModelSerializer):
    """Serializer for MFA devices (excludes sensitive data)"""
    
    class Meta:
        model = MFADevice
        fields = [
            'id', 'device_type', 'name', 'is_confirmed', 'is_primary',
            'created_at', 'last_used', 'use_count'
        ]
        read_only_fields = ['id', 'created_at', 'last_used', 'use_count']


class MFADeviceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating MFA devices"""
    
    class Meta:
        model = MFADevice
        fields = ['device_type', 'name', 'phone_number']
        
    def validate_device_type(self, value):
        if value not in ['totp', 'sms', 'email']:
            raise serializers.ValidationError("Invalid device type")
        return value
        
    def validate_phone_number(self, value):
        device_type = self.initial_data.get('device_type')
        if device_type == 'sms' and not value:
            raise serializers.ValidationError("Phone number required for SMS devices")
        return value


class AuthenticationLogSerializer(serializers.ModelSerializer):
    """Serializer for authentication logs"""
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    provider_name = serializers.CharField(source='sso_provider.name', read_only=True)
    device_name = serializers.CharField(source='mfa_device.name', read_only=True)
    
    class Meta:
        model = AuthenticationLog
        fields = [
            'id', 'username', 'user_email', 'event_type', 'ip_address',
            'username_attempted', 'provider_name', 'device_name',
            'success', 'failure_reason', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class SecurityPolicySerializer(serializers.ModelSerializer):
    """Serializer for security policies"""
    
    class Meta:
        model = SecurityPolicy
        fields = [
            'id', 'name', 'description', 'require_mfa_for_roles',
            'mfa_grace_period_hours', 'min_password_length',
            'require_password_complexity', 'password_expiry_days',
            'session_timeout_minutes', 'max_concurrent_sessions',
            'allowed_ip_ranges', 'block_countries',
            'log_all_access', 'alert_on_suspicious_activity',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MFASetupSerializer(serializers.Serializer):
    """Serializer for MFA setup requests"""
    device_type = serializers.ChoiceField(choices=['totp', 'sms', 'email'])
    device_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20, required=False)
    
    def validate(self, data):
        if data['device_type'] == 'sms' and not data.get('phone_number'):
            raise serializers.ValidationError("Phone number required for SMS devices")
        return data


class MFAVerifySerializer(serializers.Serializer):
    """Serializer for MFA verification requests"""
    device_id = serializers.UUIDField()
    code = serializers.CharField(max_length=10)


class SSOLoginSerializer(serializers.Serializer):
    """Serializer for SSO login requests"""
    provider = serializers.CharField(max_length=50)
    access_token = serializers.CharField(max_length=500)
    id_token = serializers.CharField(max_length=1000, required=False)


class MFAChallengeSerializer(serializers.Serializer):
    """Serializer for MFA challenge during login"""
    username = serializers.CharField(max_length=255)
    password = serializers.CharField(max_length=255)


class MFALoginVerifySerializer(serializers.Serializer):
    """Serializer for MFA verification during login"""
    temp_token = serializers.CharField(max_length=500)
    device_id = serializers.UUIDField()
    code = serializers.CharField(max_length=10)


class UserSecurityStatusSerializer(serializers.Serializer):
    """Serializer for user security status"""
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    has_mfa = serializers.BooleanField(read_only=True)
    mfa_device_count = serializers.IntegerField(read_only=True)
    sso_account_count = serializers.IntegerField(read_only=True)
    last_login = serializers.DateTimeField(read_only=True)
    requires_mfa = serializers.BooleanField(read_only=True)
    password_expires_at = serializers.DateTimeField(read_only=True)
    is_security_compliant = serializers.BooleanField(read_only=True)