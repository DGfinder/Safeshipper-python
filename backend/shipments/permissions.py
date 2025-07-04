# shipments/permissions.py
from rest_framework import permissions

class IsAdminOrAssignedDepotUserForShipment(permissions.BasePermission):
    """
    Enhanced permission for Shipment objects with role-based access control.
    Supports Phase 2 requirements for role-specific permissions.
    """

    def has_permission(self, request, view):
        """Allow authenticated users to attempt actions."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check role-based permissions for specific shipment objects."""
        if not request.user or not request.user.is_authenticated:
            return False

        # ADMIN users have full access
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True

        # DISPATCHER and COMPLIANCE_OFFICER can access shipments from their company
        if request.user.role in ['DISPATCHER', 'COMPLIANCE_OFFICER']:
            return (obj.customer == request.user.company or 
                    obj.carrier == request.user.company)

        # DRIVER has read-only access to shipments from their company
        if request.user.role == 'DRIVER':
            # Drivers can view but not modify (handled in view layer)
            return (obj.customer == request.user.company or 
                    obj.carrier == request.user.company)

        # CUSTOMER users can view their own shipments
        if request.user.role == 'CUSTOMER':
            return obj.customer == request.user.company

        return False


class CanManageConsignmentItems(permissions.BasePermission):
    """
    Enhanced permission for ConsignmentItem objects with role-based access control.
    Delegates to shipment permission checking.
    """
    
    def has_permission(self, request, view):
        """Allow authenticated users to attempt actions."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check permissions by delegating to the parent shipment."""
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Delegate to the shipment's permission check
        if obj.shipment:
            shipment_permission = IsAdminOrAssignedDepotUserForShipment()
            return shipment_permission.has_object_permission(request, view, obj.shipment)
        
        return False


class IsDispatcherOrAdmin(permissions.BasePermission):
    """
    Permission for actions requiring DISPATCHER or ADMIN role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['ADMIN', 'DISPATCHER'] or request.user.is_superuser


class IsComplianceOfficerOrAdmin(permissions.BasePermission):
    """
    Permission for actions requiring COMPLIANCE_OFFICER or ADMIN role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['ADMIN', 'COMPLIANCE_OFFICER'] or request.user.is_superuser


class CanModifyShipment(permissions.BasePermission):
    """
    Permission for shipment modification based on role and HTTP method.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # ADMIN can do anything
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
            
        # For safe methods (GET, HEAD, OPTIONS), use standard permission
        if request.method in permissions.SAFE_METHODS:
            base_permission = IsAdminOrAssignedDepotUserForShipment()
            return base_permission.has_object_permission(request, view, obj)
        
        # For modification methods (POST, PUT, PATCH, DELETE)
        # DISPATCHER and COMPLIANCE_OFFICER can modify shipments from their company
        if request.user.role in ['DISPATCHER', 'COMPLIANCE_OFFICER']:
            return (obj.customer == request.user.company or 
                    obj.carrier == request.user.company)
        
        # DRIVER and CUSTOMER cannot modify shipments
        return False
