# enterprise_auth/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from simple_history.admin import SimpleHistoryAdmin
from .models import (
    SSOProvider, UserSSOAccount, MFADevice, 
    AuthenticationLog, SecurityPolicy
)


@admin.register(SSOProvider)
class SSOProviderAdmin(SimpleHistoryAdmin):
    """Admin interface for SSO Providers"""
    
    list_display = [
        'name', 'provider_type', 'domain', 'is_active', 
        'require_company_email', 'user_count', 'created_at'
    ]
    list_filter = ['provider_type', 'is_active', 'require_company_email', 'created_at']
    search_fields = ['name', 'domain']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'provider_type', 'domain', 'is_active')
        }),
        ('OAuth Configuration', {
            'fields': ('client_id', 'client_secret'),
            'classes': ('collapse',)
        }),
        ('SAML Configuration', {
            'fields': ('saml_entity_id', 'saml_sso_url', 'saml_certificate'),
            'classes': ('collapse',)
        }),
        ('Access Control', {
            'fields': ('allowed_roles', 'require_company_email')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_count(self, obj):
        """Display number of users using this provider"""
        count = obj.usersso_accounts.count()
        if count > 0:
            url = reverse('admin:enterprise_auth_usersso_account_changelist')
            return format_html(
                '<a href="{}?provider__id__exact={}">{} users</a>',
                url, obj.id, count
            )
        return "0 users"
    user_count.short_description = "Connected Users"


@admin.register(UserSSOAccount)
class UserSSOAccountAdmin(SimpleHistoryAdmin):
    """Admin interface for User SSO Accounts"""
    
    list_display = [
        'user_link', 'provider_name', 'sso_email', 
        'is_active', 'last_login', 'first_login'
    ]
    list_filter = ['provider__provider_type', 'is_active', 'last_login']
    search_fields = ['user__email', 'user__username', 'sso_email', 'provider__name']
    readonly_fields = ['first_login', 'last_login']
    
    def user_link(self, obj):
        """Link to user admin page"""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = "User"
    
    def provider_name(self, obj):
        """Display provider name"""
        return obj.provider.name
    provider_name.short_description = "Provider"


@admin.register(MFADevice)
class MFADeviceAdmin(SimpleHistoryAdmin):
    """Admin interface for MFA Devices"""
    
    list_display = [
        'user_link', 'device_type', 'name', 'is_confirmed', 
        'is_primary', 'use_count', 'last_used', 'created_at'
    ]
    list_filter = ['device_type', 'is_confirmed', 'is_primary', 'created_at']
    search_fields = ['user__email', 'user__username', 'name']
    readonly_fields = ['created_at', 'last_used', 'use_count', 'secret_key']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('user', 'device_type', 'name', 'is_confirmed', 'is_primary')
        }),
        ('Configuration', {
            'fields': ('phone_number', 'secret_key', 'backup_codes'),
            'classes': ('collapse',)
        }),
        ('Usage Statistics', {
            'fields': ('created_at', 'last_used', 'use_count'),
            'classes': ('collapse',)
        })
    )
    
    def user_link(self, obj):
        """Link to user admin page"""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = "User"
    
    def save_model(self, request, obj, form, change):
        """Ensure only one primary device per user"""
        if obj.is_primary:
            # Set other devices as non-primary
            MFADevice.objects.filter(
                user=obj.user, 
                is_primary=True
            ).exclude(id=obj.id).update(is_primary=False)
        
        super().save_model(request, obj, form, change)


@admin.register(AuthenticationLog)
class AuthenticationLogAdmin(admin.ModelAdmin):
    """Admin interface for Authentication Logs"""
    
    list_display = [
        'timestamp', 'event_type', 'user_link', 'username_attempted',
        'ip_address', 'success', 'provider_name', 'device_name'
    ]
    list_filter = [
        'event_type', 'success', 'sso_provider__provider_type',
        'mfa_device__device_type', 'timestamp'
    ]
    search_fields = [
        'user__email', 'username_attempted', 'ip_address',
        'sso_provider__name', 'mfa_device__name'
    ]
    readonly_fields = [
        'id', 'timestamp', 'user', 'event_type', 'ip_address',
        'user_agent', 'session_key', 'username_attempted',
        'sso_provider', 'mfa_device', 'success', 'failure_reason', 'metadata'
    ]
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    # Make it read-only
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def user_link(self, obj):
        """Link to user admin page"""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "-"
    user_link.short_description = "User"
    
    def provider_name(self, obj):
        """Display SSO provider name"""
        return obj.sso_provider.name if obj.sso_provider else "-"
    provider_name.short_description = "SSO Provider"
    
    def device_name(self, obj):
        """Display MFA device name"""
        return obj.mfa_device.name if obj.mfa_device else "-"
    device_name.short_description = "MFA Device"
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related(
            'user', 'sso_provider', 'mfa_device'
        )


@admin.register(SecurityPolicy)
class SecurityPolicyAdmin(SimpleHistoryAdmin):
    """Admin interface for Security Policies"""
    
    list_display = [
        'name', 'is_active', 'mfa_roles_display', 
        'session_timeout_minutes', 'password_expiry_days', 'updated_at'
    ]
    list_filter = ['is_active', 'require_password_complexity', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('MFA Requirements', {
            'fields': ('require_mfa_for_roles', 'mfa_grace_period_hours')
        }),
        ('Password Policy', {
            'fields': (
                'min_password_length', 'require_password_complexity', 
                'password_expiry_days'
            )
        }),
        ('Session Management', {
            'fields': ('session_timeout_minutes', 'max_concurrent_sessions')
        }),
        ('Access Controls', {
            'fields': ('allowed_ip_ranges', 'block_countries')
        }),
        ('Audit Settings', {
            'fields': ('log_all_access', 'alert_on_suspicious_activity')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def mfa_roles_display(self, obj):
        """Display MFA required roles"""
        if obj.require_mfa_for_roles:
            return ", ".join(obj.require_mfa_for_roles)
        return "None"
    mfa_roles_display.short_description = "MFA Required Roles"
    
    def save_model(self, request, obj, form, change):
        """Ensure only one active policy"""
        if obj.is_active:
            # Set other policies as inactive
            SecurityPolicy.objects.filter(
                is_active=True
            ).exclude(id=obj.id).update(is_active=False)
        
        super().save_model(request, obj, form, change)


# Customize admin site
admin.site.site_header = "SafeShipper Enterprise Administration"
admin.site.site_title = "SafeShipper Admin"
admin.site.index_title = "Enterprise Security Management"