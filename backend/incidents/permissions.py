# incidents/permissions.py
from rest_framework import permissions
from rest_framework.permissions import BasePermission


class IncidentPermissions(BasePermission):
    """
    Custom permissions for incident management
    
    Permissions:
    - ADMIN: Full access to all incidents
    - COMPLIANCE_OFFICER: Full access to all incidents  
    - SAFETY_OFFICER: Full access to all incidents
    - MANAGER: Can view all, create/edit own or assigned incidents
    - DISPATCHER: Can view all, create incidents
    - DRIVER: Can view own incidents and create incident reports
    - CUSTOMER: Can view incidents related to their shipments only
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        
        # Admin roles have full access
        if user_role in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']:
            return True
        
        # Manager and dispatcher can view and create
        if user_role in ['MANAGER', 'DISPATCHER']:
            return view.action in ['list', 'retrieve', 'create', 'update', 'partial_update']
        
        # Drivers can view own incidents and create reports
        if user_role == 'DRIVER':
            return view.action in ['list', 'retrieve', 'create']
        
        # Customers can view related incidents
        if user_role == 'CUSTOMER':
            return view.action in ['list', 'retrieve']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user_role = getattr(request.user, 'role', None)
        
        # Admin roles have full access
        if user_role in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']:
            return True
        
        # Managers can access incidents they're assigned to or reported
        if user_role == 'MANAGER':
            return (obj.assigned_to == request.user or 
                   obj.reporter == request.user or
                   view.action in ['retrieve'])
        
        # Dispatchers can view all, but only edit/delete if they're the reporter
        if user_role == 'DISPATCHER':
            if view.action in ['retrieve']:
                return True
            return obj.reporter == request.user
        
        # Drivers can only access their own incidents
        if user_role == 'DRIVER':
            return (obj.reporter == request.user or 
                   obj.assigned_to == request.user or
                   (obj.vehicle and obj.vehicle.driver == request.user) or
                   (obj.shipment and obj.shipment.assigned_driver == request.user))
        
        # Customers can only view incidents related to their shipments
        if user_role == 'CUSTOMER':
            if view.action in ['retrieve']:
                return (obj.shipment and 
                       obj.shipment.customer and 
                       obj.shipment.customer.user == request.user)
        
        return False


class IncidentTypePermissions(BasePermission):
    """
    Permissions for incident type management
    
    Only admin roles can create/modify incident types
    All authenticated users can view active incident types
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        
        # Only admin roles can create/modify incident types
        if view.action in ['create', 'update', 'partial_update', 'destroy']:
            return user_role in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']
        
        # All authenticated users can view incident types
        return True


class IncidentDocumentPermissions(BasePermission):
    """
    Permissions for incident documents
    
    Documents can be uploaded by incident participants and admin roles
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return True  # Object-level permissions will handle the specifics
    
    def has_object_permission(self, request, view, obj):
        user_role = getattr(request.user, 'role', None)
        incident = obj.incident
        
        # Admin roles have full access
        if user_role in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']:
            return True
        
        # Users involved in the incident can access documents
        if (incident.reporter == request.user or 
            incident.assigned_to == request.user or
            request.user in incident.witnesses.all()):
            return True
        
        # Vehicle driver or shipment driver can access
        if ((incident.vehicle and incident.vehicle.driver == request.user) or
            (incident.shipment and incident.shipment.assigned_driver == request.user)):
            return True
        
        # Document uploader can access their own documents
        if obj.uploaded_by == request.user:
            return True
        
        return False


class CorrectiveActionPermissions(BasePermission):
    """
    Permissions for corrective actions
    
    Can be created/managed by admin roles and assigned users
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        
        # Admin roles have full access
        if user_role in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER', 'MANAGER']:
            return True
        
        # Other roles can view
        return view.action in ['list', 'retrieve']
    
    def has_object_permission(self, request, view, obj):
        user_role = getattr(request.user, 'role', None)
        
        # Admin roles have full access
        if user_role in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']:
            return True
        
        # Managers can manage corrective actions for their incidents
        if user_role == 'MANAGER':
            return (obj.assigned_to == request.user or
                   obj.incident.assigned_to == request.user)
        
        # Assigned users can update status and completion
        if obj.assigned_to == request.user:
            return view.action in ['retrieve', 'update', 'partial_update']
        
        # Others can only view
        return view.action in ['retrieve']


class CanReportIncident(BasePermission):
    """
    Permission to report incidents
    
    Most user roles can report incidents, with some restrictions
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        
        # These roles can report incidents
        return user_role in [
            'ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER', 
            'MANAGER', 'DISPATCHER', 'DRIVER'
        ]


class CanAssignIncident(BasePermission):
    """
    Permission to assign incidents to users
    
    Only management and admin roles can assign incidents
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        
        return user_role in [
            'ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER', 'MANAGER'
        ]


class CanCloseIncident(BasePermission):
    """
    Permission to close incidents
    
    Only admin and compliance roles can close incidents
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', None)
        
        return user_role in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']


# Company-based data filtering mixin
class CompanyFilterMixin:
    """
    Mixin to filter incidents by company
    Ensures multi-tenant data isolation
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by company for multi-tenant isolation
        if hasattr(self.request.user, 'company') and self.request.user.company:
            queryset = queryset.filter(reporter__company=self.request.user.company)
        
        # Additional role-based filtering
        user_role = getattr(self.request.user, 'role', None)
        
        if user_role == 'DRIVER':
            # Drivers only see incidents they're involved in
            queryset = queryset.filter(
                models.Q(reporter=self.request.user) |
                models.Q(assigned_to=self.request.user) |
                models.Q(witnesses=self.request.user) |
                models.Q(vehicle__driver=self.request.user) |
                models.Q(shipment__assigned_driver=self.request.user)
            ).distinct()
        
        elif user_role == 'CUSTOMER':
            # Customers only see incidents related to their shipments
            queryset = queryset.filter(
                shipment__customer__user=self.request.user
            )
        
        return queryset