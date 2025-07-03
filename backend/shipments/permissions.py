# shipments/permissions.py
from rest_framework import permissions
# from django.contrib.auth import get_user_model # Not strictly needed if using request.user

# User = get_user_model() # If you need to reference User.ROLE_CHOICES etc.

class IsAdminOrAssignedDepotUserForShipment(permissions.BasePermission):
    """
    Custom permission for Shipment objects:
    - Admins/staff have full access.
    - Authenticated users can perform actions on shipments assigned to their depot.
    - List views are generally allowed for authenticated users (queryset is filtered by view).
    """

    def has_permission(self, request, view):
        # Allow any authenticated user to attempt the action.
        # Object-level permission will determine if they can act on a specific object.
        # For list views (GET without pk), queryset filtering in the view is primary.
        # For create (POST), this allows authenticated users to try; service layer might add further checks.
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # obj is a Shipment instance here
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff or request.user.is_superuser:
            return True # Admin/staff can do anything

        # Check if the shipment is assigned to the user's depot
        # Assumes your custom User model (settings.AUTH_USER_MODEL) has a 'depot' attribute
        user_depot = getattr(request.user, 'depot', None)
        shipment_assigned_depot = getattr(obj, 'assigned_depot', None)

        if user_depot and shipment_assigned_depot:
            return user_depot == shipment_assigned_depot
        
        # Fallback: if no depot match, deny unless admin (already handled).
        # You might add other conditions, e.g., if user created the shipment (if you add 'created_by' field)
        return False


class CanManageConsignmentItems(permissions.BasePermission):
    """
    Custom permission for ConsignmentItem objects:
    - Users can manage items if they can manage the parent shipment.
    """
    admin_or_depot_shipment_permission = IsAdminOrAssignedDepotUserForShipment()

    def has_permission(self, request, view):
        # Allow authenticated users to attempt list/create.
        # Queryset filtering in viewset is important for list.
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # obj is a ConsignmentItem instance here
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Delegate to the shipment's permission check
        if obj.shipment:
            return self.admin_or_depot_shipment_permission.has_object_permission(request, view, obj.shipment)
        
        # If item has no shipment (should not happen for existing objects), deny.
        # For creation, this check might not be hit directly, relies on has_permission and view logic.
        return False

# Example of a more role-based permission if needed later for specific actions
# from .models import User # Assuming your custom user model is in users.models
# class IsDispatcherOrAdmin(permissions.BasePermission):
#     def has_permission(self, request, view):
#         if not request.user or not request.user.is_authenticated:
#             return False
#         return request.user.role in [User.ROLE_CHOICES.ADMIN, User.ROLE_CHOICES.DISPATCHER]
