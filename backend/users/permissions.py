# users/permissions.py
from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

class IsAdminUserOrReadOnly(permissions.IsAdminUser):
    """
    Allows full access to admin users, read-only access to others.
    """
    def has_permission(self, request, view):
        is_admin = super().has_permission(request, view)
        return request.method in permissions.SAFE_METHODS or is_admin

class IsSelfOrAdmin(permissions.BasePermission):
    """
    Allows access only to the user themselves or admin users.
    """
    def has_object_permission(self, request, view, obj):
        # obj is the User instance here
        return obj == request.user or request.user.is_staff or request.user.is_superuser

class CanManageUsers(permissions.BasePermission):
    """
    Permission to define who can create, list, update users.
    Example: Only Admins can list all users or create new Admin/Dispatcher users.
    Dispatchers might create Driver/Warehouse users for their depot.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if view.action == 'list': # Who can see the list of all users?
            return request.user.is_staff or request.user.is_superuser
        
        if view.action == 'create':
            # Allow admins to create any role.
            if request.user.role == User.Role.ADMIN or request.user.is_superuser:
                return True
            # Non-admins cannot create privileged users
            data = request.data
            target_role = data.get('role')
            privileged_roles = [User.Role.ADMIN, User.Role.COMPLIANCE_OFFICER, User.Role.DISPATCHER]
            if target_role in privileged_roles:
                return False
            # Optionally allow dispatchers to create drivers/warehouse only
            # if request.user.role == User.Role.DISPATCHER:
            #     return target_role in [User.Role.DRIVER, User.Role.WAREHOUSE_STAFF]
            return False # By default, non-admins cannot create users via this generic endpoint.

        # For retrieve, update, partial_update, destroy, has_object_permission will be called.
        return True 

    def has_object_permission(self, request, view, obj):
        # obj is the User instance being accessed/modified.
        if not request.user or not request.user.is_authenticated:
            return False

        # Admins can do anything to any user object.
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Users can view/modify their own profile.
        if obj == request.user:
            # Prevent self-escalation of role or staff status in update actions
            if request.method in ['PUT', 'PATCH']:
                data = request.data
                if 'role' in data and data['role'] != obj.role:
                    return False
                if 'is_staff' in data and bool(data['is_staff']) != obj.is_staff:
                    return False
            return True
        
        # Example: A dispatcher might be able to manage users within their own depot.
        # This requires more complex object-level logic, possibly involving django-guardian
        # or custom checks here if obj.depot and request.user.depot are involved.
        # if request.user.role == User.Role.DISPATCHER and obj.depot == request.user.depot:
        #    # And ensure dispatcher cannot escalate privileges of users in their depot
        #    if request.method in ['PUT', 'PATCH']:
        #        # Check incoming data to prevent role escalation
        #        new_role = request.data.get('role')
        #        if new_role and new_role not in [User.Role.DRIVER, User.Role.WAREHOUSE_STAFF]:
        #            return False
        #    return True
        
        return False # Default deny
