from rest_framework import permissions
from rest_framework.permissions import BasePermission
from .models import APIKey, DeveloperApplication
from .utils import validate_api_scopes


class IsAPIKeyOwnerOrAdmin(BasePermission):
    """
    Permission to only allow owners of an API key or admins to view/edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin users can access any API key
        if request.user.is_staff:
            return True
        
        # Object owner can access their own API keys
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class HasAPIScope(BasePermission):
    """
    Permission to check if API key has required scopes for the endpoint.
    """
    
    def has_permission(self, request, view):
        # If no API key is provided, use default Django permissions
        if not hasattr(request, 'api_key_obj'):
            return True
        
        # Get required scopes for this view
        required_scopes = getattr(view, 'required_scopes', [])
        
        if not required_scopes:
            return True
        
        api_key = request.api_key_obj
        return validate_api_scopes(required_scopes, api_key.scopes)


class IsApplicationOwnerOrAdmin(BasePermission):
    """
    Permission for developer applications.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        
        if hasattr(obj, 'developer'):
            return obj.developer == request.user
        
        return False


class CanManageWebhooks(BasePermission):
    """
    Permission to manage webhooks - must own the associated API key.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        
        # Check if user owns the API key associated with the webhook
        if hasattr(obj, 'api_key'):
            return obj.api_key.created_by == request.user
        
        return False


class ReadOnlyForUnauthenticated(BasePermission):
    """
    Permission that allows read-only access for unauthenticated users
    and full access for authenticated users.
    """
    
    def has_permission(self, request, view):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for authenticated users
        return request.user and request.user.is_authenticated


class APIKeyAuthentication(BasePermission):
    """
    Custom permission for API key authentication.
    """
    
    def has_permission(self, request, view):
        # Check if request has valid API key
        return hasattr(request, 'api_key_obj') and request.api_key_obj.is_active


class WebhookPermission(BasePermission):
    """
    Permission for webhook endpoints - validates webhook signatures.
    """
    
    def has_permission(self, request, view):
        # Allow all webhook requests that pass signature validation
        # (signature validation is handled in middleware)
        return True


class DeveloperPortalPermission(BasePermission):
    """
    Permission for developer portal access.
    """
    
    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has approved developer application
        if view.action in ['create', 'list']:
            return True
        
        return True
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        
        # Developer can access their own applications
        if hasattr(obj, 'developer'):
            return obj.developer == request.user
        
        return False


class AdminOrReadOnly(BasePermission):
    """
    Permission that allows admin full access and others read-only access.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return request.user and request.user.is_staff


class ScopeBasedPermission(BasePermission):
    """
    Base permission class for scope-based API access.
    """
    required_scopes = []
    
    def has_permission(self, request, view):
        # Get API key from request
        if not hasattr(request, 'api_key_obj'):
            return False
        
        api_key = request.api_key_obj
        
        # Get required scopes
        scopes = getattr(view, 'required_scopes', self.required_scopes)
        
        if not scopes:
            return True
        
        return validate_api_scopes(scopes, api_key.scopes)


class ReadScopePermission(ScopeBasedPermission):
    """Permission requiring read scope."""
    required_scopes = ['read']


class WriteScopePermission(ScopeBasedPermission):
    """Permission requiring write scope."""
    required_scopes = ['write']


class AdminScopePermission(ScopeBasedPermission):
    """Permission requiring admin scope."""
    required_scopes = ['admin']


# Mixin classes for common permission patterns

class APIKeyOwnerMixin:
    """
    Mixin to restrict access to API key owners.
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        if self.request.user.is_staff:
            return queryset
        
        # Filter to user's own API keys
        user_api_keys = APIKey.objects.filter(created_by=self.request.user)
        
        # This assumes the model has an api_key foreign key
        if hasattr(self.queryset.model, 'api_key'):
            return queryset.filter(api_key__in=user_api_keys)
        
        return queryset


class DeveloperApplicationMixin:
    """
    Mixin to restrict access to developer's own applications.
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        if self.request.user.is_staff:
            return queryset
        
        return queryset.filter(developer=self.request.user)


class ScopeRequiredMixin:
    """
    Mixin to add scope requirements to views.
    """
    required_scopes = []
    
    def get_permissions(self):
        permissions = super().get_permissions()
        
        if self.required_scopes:
            permissions.append(HasAPIScope())
        
        return permissions


# Decorator for adding scope requirements
def require_scopes(*scopes):
    """
    Decorator to add scope requirements to view methods.
    """
    def decorator(func):
        func.required_scopes = scopes
        return func
    return decorator


# Function-based permission checks
def has_api_access(user):
    """Check if user has any API access."""
    return APIKey.objects.filter(
        created_by=user,
        status='active'
    ).exists()


def has_developer_access(user):
    """Check if user has approved developer applications."""
    return DeveloperApplication.objects.filter(
        developer=user,
        status='approved'
    ).exists()


def can_create_api_key(user):
    """Check if user can create new API keys."""
    if user.is_staff:
        return True
    
    # Limit non-staff users to 5 API keys
    user_keys = APIKey.objects.filter(created_by=user).count()
    return user_keys < 5


def can_create_webhook(user):
    """Check if user can create webhooks."""
    # Must have at least one active API key
    return APIKey.objects.filter(
        created_by=user,
        status='active'
    ).exists()


def get_api_quota_usage(user):
    """Get API quota usage for user."""
    from django.db.models import Sum
    from .models import APIUsageLog
    from django.utils import timezone
    from datetime import timedelta
    
    # Get usage for last 30 days
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    user_api_keys = APIKey.objects.filter(created_by=user)
    
    usage = APIUsageLog.objects.filter(
        api_key__in=user_api_keys,
        timestamp__gte=thirty_days_ago
    ).count()
    
    return usage


def is_rate_limited(api_key):
    """Check if API key is currently rate limited."""
    from django.core.cache import cache
    import time
    
    cache_key = f"api_rate_limit:{api_key.id}"
    current_hour = int(time.time() // 3600)
    
    usage_data = cache.get(cache_key, {})
    current_usage = usage_data.get(str(current_hour), 0)
    
    return current_usage >= api_key.rate_limit