# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _ # For choices

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Includes fields for role, depot, and area specific to SafeShipper.
    """
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin') # Platform administrator
        DISPATCHER = 'DISPATCHER', _('Dispatcher') # Manages shipments, drivers for a depot/area
        WAREHOUSE_STAFF = 'WAREHOUSE', _('Warehouse Staff') # Handles goods in warehouse
        DRIVER = 'DRIVER', _('Driver') # Transports shipments
        # Consider adding a general 'CUSTOMER_USER' or 'CLIENT_USER' if external users access the system
        # Consider a 'MANAGER' role if different from 'ADMIN' or 'DISPATCHER'
    
    # Keep username, email, first_name, last_name, is_staff, is_active, date_joined from AbstractUser.
    # is_superuser will typically be for the highest level of admin.
    # is_staff can be used for users who can access the Django admin site.

    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.DRIVER, # Sensible default, or perhaps another role
        help_text=_("User's role within the system.")
    )
    
    # For depot and area, consider if these should eventually be ForeignKeys 
    # to 'locations.Depot' and 'locations.Area' models once those are defined.
    # Using CharField for now is acceptable for initial development.
    depot = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        help_text=_("The primary depot or operational center the user is associated with.")
    )
    area = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        help_text=_("The geographical or operational area the user is responsible for or belongs to.")
    )

    # You might want to override the default email field to be unique and required if it's a primary identifier.
    # email = models.EmailField(_('email address'), unique=True)
    # USERNAME_FIELD = 'email' # if using email as username
    # REQUIRED_FIELDS = ['username'] # if using email as username, username might still be required by AbstractUser

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ['username']

    # Example properties for easier role checking, though permissions are better for logic:
    # @property
    # def is_admin_role(self):
    #     return self.role == self.Role.ADMIN

    # @property
    # def is_dispatcher_role(self):
    #     return self.role == self.Role.DISPATCHER
