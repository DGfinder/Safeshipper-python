# users/services.py
from django.db import transaction, models # Ensure models is imported for QuerySet
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
# from django.conf import settings # Not strictly needed here unless using settings directly
from typing import TYPE_CHECKING, List, Dict, Optional

# This block is for static type checking (Pylance/MyPy)
# It allows importing types that would cause circular dependencies at runtime.
if TYPE_CHECKING:
    from .models import User  # Assuming your User model is in 'users.models'
    # If your User model is elsewhere (e.g. directly from django.contrib.auth.models if not custom yet)
    # or in a different app, adjust the import path accordingly.
    # For a custom user model defined in 'users.models.py', '.models' is correct.

# It's generally safer to call get_user_model() inside functions if needed for runtime logic,
# or assign it to a variable that's not directly used in global-scope type hints.
# For type hints in function signatures, using the string literal 'User' (a forward reference)
# in conjunction with the TYPE_CHECKING block is the standard way.

@transaction.atomic
def create_user_account(data: Dict, performing_user: Optional['User'] = None) -> 'User':
    """
    Service function to create a new user.
    Handles password hashing and applies default values.
    `performing_user` is the user making the request, for permission checks if needed.
    """
    UserRuntime = get_user_model() # Get the User model at runtime for ORM operations

    # Permission check: Example - only admin/superuser can create other admins or staff
    if performing_user and not (performing_user.is_staff or performing_user.is_superuser):
        if data.get('is_staff') or data.get('is_superuser') or data.get('role') == UserRuntime.Role.ADMIN: # Use UserRuntime here
            raise PermissionDenied("You do not have permission to create users with these privileges.")
        
        # Dispatchers might only be allowed to create users for their own depot
        if data.get('role') in [UserRuntime.Role.DRIVER, UserRuntime.Role.WAREHOUSE_STAFF] and performing_user.role == UserRuntime.Role.DISPATCHER:
            if 'depot' not in data or data['depot'] != performing_user.depot:
                raise DjangoValidationError(f"Dispatchers can only create users for their own depot ({performing_user.depot}).")
        elif performing_user.role != UserRuntime.Role.DISPATCHER and data.get('role') in [UserRuntime.Role.DRIVER, UserRuntime.Role.WAREHOUSE_STAFF]:
             raise DjangoValidationError(f"Only Dispatchers or Admins can create Driver/Warehouse Staff.")

    username = data.get('username')
    email = data.get('email')
    password = data.get('password') 

    if not username or not email or not password:
        raise DjangoValidationError("Username, email, and password are required.")

    if UserRuntime.objects.filter(username=username).exists():
        raise DjangoValidationError(f"User with username '{username}' already exists.")
    if UserRuntime.objects.filter(email=email).exists():
        raise DjangoValidationError(f"User with email '{email}' already exists.")

    user = UserRuntime.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        role=data.get('role', UserRuntime.Role.DRIVER), 
        is_active=data.get('is_active', True)
    )
    return user

def update_user_profile(user_to_update: 'User', data: Dict, performing_user: 'User') -> 'User':
    """
    Service function to update a user's profile.
    `performing_user` is the user making the request.
    """
    UserRuntime = get_user_model() # Get User model at runtime

    if not (performing_user.is_staff or performing_user.is_superuser or user_to_update == performing_user):
        raise PermissionDenied("You do not have permission to update this profile.")

    allowed_self_update_fields = ['first_name', 'last_name', 'email']
    admin_only_fields = ['username', 'role', 'is_active', 'is_staff', 'is_superuser']

    for field, value in data.items():
        if performing_user.is_staff or performing_user.is_superuser:
            if hasattr(user_to_update, field) and field not in ['password', 'id']: 
                setattr(user_to_update, field, value)
        elif user_to_update == performing_user:
            if field in allowed_self_update_fields and hasattr(user_to_update, field):
                setattr(user_to_update, field, value)
            elif field in admin_only_fields and hasattr(user_to_update, field) and getattr(user_to_update, field) != value:
                 # Check if user is trying to change a field they are not allowed to
                 raise PermissionDenied(f"You cannot update the field '{field}'.")
        # else: # Should be caught by initial permission check
            # pass

    if 'email' in data and data['email'] != user_to_update.email: # Check if email is actually being changed
        if UserRuntime.objects.filter(email=data['email']).exclude(pk=user_to_update.pk).exists():
            raise DjangoValidationError(f"User with email '{data['email']}' already exists.")

    user_to_update.save()
    return user_to_update
