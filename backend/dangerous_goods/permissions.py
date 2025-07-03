# dangerous_goods/permissions.py
from rest_framework import permissions

class CanManageDGData(permissions.BasePermission):
    """
    Custom permission:
    - Allows read-only access (GET, HEAD, OPTIONS) for any authenticated user.
    - Allows write access (POST, PUT, PATCH, DELETE) only for admin/staff users.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated for any access
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow safe methods for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For unsafe methods, only allow if user is staff or superuser
        return request.user.is_staff or request.user.is_superuser

    def has_object_permission(self, request, view, obj):
        # Object-level permissions can be more granular if needed.
        # For now, if they have permission for the action type (safe vs unsafe),
        # they have permission for the object.
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True
            
        return request.user.is_staff or request.user.is_superuser

# Alias for clarity if used elsewhere, or directly use CanManageDGData
# IsAdminOrReadOnlyForDG = CanManageDGData # You can use this alias if you prefer the name
