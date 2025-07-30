# shared/permissions.py
"""
Shared permissions for SafeShipper system services.
Defines access control for monitoring, maintenance, and administrative functions.
"""

from rest_framework import permissions
from django.contrib.auth.models import Group


class IsAdminOrSystemMonitor(permissions.BasePermission):
    """
    Permission to allow access to system monitoring and maintenance endpoints.
    Allows:
    - Superusers
    - Users in 'System Administrators' group
    - Users in 'System Monitors' group
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers always have access
        if request.user.is_superuser:
            return True
        
        # Check for admin or monitor groups
        admin_groups = ['System Administrators', 'System Monitors', 'IT Support']
        user_groups = request.user.groups.values_list('name', flat=True)
        
        return any(group in admin_groups for group in user_groups)
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class CanManageDataRetention(permissions.BasePermission):
    """
    Permission for data retention management operations.
    More restrictive than monitoring - only for actual data management.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Only superusers and system administrators can manage data retention
        if request.user.is_superuser:
            return True
        
        # Check for system administrator group
        admin_groups = ['System Administrators']
        user_groups = request.user.groups.values_list('name', flat=True)
        
        return any(group in admin_groups for group in user_groups)


class CanViewSystemHealth(permissions.BasePermission):
    """
    Permission for viewing system health information.
    Less restrictive than management permissions.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow broader access for health monitoring
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Allow various operational roles to view health
        monitor_groups = [
            'System Administrators', 'System Monitors', 'IT Support',
            'Operations Team', 'Management', 'Compliance Officers'
        ]
        user_groups = request.user.groups.values_list('name', flat=True)
        
        return any(group in monitor_groups for group in user_groups)


class IsComplianceOfficer(permissions.BasePermission):
    """
    Permission for compliance-related operations.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Check for compliance-related groups
        compliance_groups = [
            'Compliance Officers', 'System Administrators', 
            'Safety Officers', 'Management'
        ]
        user_groups = request.user.groups.values_list('name', flat=True)
        
        return any(group in compliance_groups for group in user_groups)
