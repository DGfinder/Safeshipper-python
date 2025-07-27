# emergency_procedures/permissions.py
from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

class EmergencyProcedurePermissions(permissions.BasePermission):
    """
    Comprehensive permission system for emergency procedures management.
    
    Permissions based on user roles:
    - Emergency Coordinators: Full access to all procedures
    - Safety Officers: Can view, create, and approve procedures
    - Drivers: Can view active procedures and submit incident reports
    - Customers: Can view basic emergency procedures for their shipments
    """
    
    def has_permission(self, request, view):
        """Check if user has permission to access emergency procedures"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get user role from profile or permissions
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        action = view.action
        
        # Emergency Coordinators have full access
        if user_role == 'emergency_coordinator':
            return True
        
        # Safety Officers have broad access
        if user_role == 'safety_officer':
            # Can do everything except delete procedures
            return action != 'destroy'
        
        # Drivers can view procedures and create incidents
        if user_role == 'driver':
            return action in ['list', 'retrieve', 'quick_reference', 'search_by_emergency_type']
        
        # Customers can view basic emergency procedures
        if user_role == 'customer':
            return action in ['list', 'retrieve', 'quick_reference']
        
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Default deny
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permissions for specific procedure objects"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        # Emergency Coordinators can access all procedures
        if user_role == 'emergency_coordinator':
            return True
        
        # Safety Officers can access all except deletion
        if user_role == 'safety_officer':
            if view.action == 'destroy':
                return False
            return True
        
        # Drivers can only view active procedures
        if user_role == 'driver':
            return view.action in ['retrieve'] and obj.status == 'ACTIVE'
        
        # Customers can only view basic info of active procedures
        if user_role == 'customer':
            return view.action in ['retrieve'] and obj.status == 'ACTIVE'
        
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        return False

class EmergencyIncidentPermissions(permissions.BasePermission):
    """
    Permission system for emergency incident management.
    
    Permissions based on user roles:
    - Emergency Coordinators: Full access to all incidents
    - Safety Officers: Can manage incidents and generate reports
    - Drivers: Can report incidents and view their own incidents
    - Customers: Can view incidents related to their shipments
    """
    
    def has_permission(self, request, view):
        """Check if user has permission to access incident management"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        action = view.action
        
        # Emergency Coordinators have full access
        if user_role == 'emergency_coordinator':
            return True
        
        # Safety Officers can manage incidents
        if user_role == 'safety_officer':
            return action in [
                'list', 'retrieve', 'create', 'update', 'partial_update',
                'start_response', 'resolve_incident', 'analytics', 'recent'
            ]
        
        # Drivers can report and view incidents
        if user_role == 'driver':
            return action in ['list', 'retrieve', 'create', 'recent']
        
        # Customers can view incidents
        if user_role == 'customer':
            return action in ['list', 'retrieve', 'recent']
        
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permissions for specific incident objects"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        # Emergency Coordinators can access all incidents
        if user_role == 'emergency_coordinator':
            return True
        
        # Safety Officers can access all incidents
        if user_role == 'safety_officer':
            return True
        
        # Drivers can only access incidents they reported or are assigned to
        if user_role == 'driver':
            if obj.reported_by == request.user or obj.incident_commander == request.user:
                return True
            # Can view but not modify other incidents
            return view.action in ['retrieve']
        
        # Customers can view incidents related to their shipments
        if user_role == 'customer':
            # This would need to be enhanced with shipment relationship checks
            return view.action in ['retrieve']
        
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        return False

class EmergencyContactPermissions(permissions.BasePermission):
    """
    Permission system for emergency contact management.
    
    Permissions based on user roles:
    - Emergency Coordinators: Full access to manage contacts
    - Safety Officers: Can view and verify contacts
    - Drivers: Can view contact information
    - Customers: Can view basic contact information
    """
    
    def has_permission(self, request, view):
        """Check if user has permission to access emergency contacts"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        action = view.action
        
        # Emergency Coordinators have full access
        if user_role == 'emergency_coordinator':
            return True
        
        # Safety Officers can view, verify, and manage contacts
        if user_role == 'safety_officer':
            return action in [
                'list', 'retrieve', 'create', 'update', 'partial_update',
                'by_location', 'emergency_numbers', 'verify_contact', 'needing_verification'
            ]
        
        # Drivers can view contacts and get emergency numbers
        if user_role == 'driver':
            return action in ['list', 'retrieve', 'by_location', 'emergency_numbers']
        
        # Customers can view basic contact information
        if user_role == 'customer':
            return action in ['list', 'retrieve', 'emergency_numbers']
        
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permissions for specific contact objects"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        # Emergency Coordinators can access all contacts
        if user_role == 'emergency_coordinator':
            return True
        
        # Safety Officers can access all contacts
        if user_role == 'safety_officer':
            # Cannot delete contacts
            return view.action != 'destroy'
        
        # Drivers and customers can only view active contacts
        if user_role in ['driver', 'customer']:
            return view.action in ['retrieve'] and obj.is_active
        
        # Admin users have full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        return False

class IsEmergencyCoordinator(permissions.BasePermission):
    """Permission class to check if user is an emergency coordinator"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        return user_role == 'emergency_coordinator' or request.user.is_staff

class IsSafetyOfficer(permissions.BasePermission):
    """Permission class to check if user is a safety officer"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        return user_role in ['safety_officer', 'emergency_coordinator'] or request.user.is_staff

class CanReportIncidents(permissions.BasePermission):
    """Permission class to check if user can report incidents"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        if hasattr(request.user, 'profile'):
            user_role = getattr(request.user.profile, 'role', user_role)
        
        # All authenticated users can report incidents
        return user_role in ['driver', 'safety_officer', 'emergency_coordinator'] or request.user.is_staff