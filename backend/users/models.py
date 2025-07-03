# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from simple_history.models import HistoricalRecords
# We need to import LocationType for limit_choices_to, assuming it's defined in locations.models
# To avoid circular imports if locations also imports users, use string reference or careful import order.
# For now, we'll use a string reference for LocationType in limit_choices_to.
# from locations.models import LocationType # Ideal if no circularity

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Includes fields for role, depot, and region specific to SafeShipper.
    """
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER', _('Compliance Officer')
        DISPATCHER = 'DISPATCHER', _('Dispatcher')
        WAREHOUSE_STAFF = 'WAREHOUSE', _('Warehouse Staff')
        DRIVER = 'DRIVER', _('Driver')
        CUSTOMER = 'CUSTOMER', _('Customer') # Added from schema
        READONLY = 'READONLY', _('Read-Only User')

    class LogisticsModel(models.TextChoices): # From schema for users_user
        ONE_PL = '1PL', _('1PL (1st Party Logistics)')
        THREE_PL = '3PL', _('3PL (3rd Party Logistics)')
        BROKER = 'BROKER', _('Broker')
        FORWARDER = 'FORWARDER', _('Forwarder')

    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.DRIVER, 
        help_text=_("User's role within the system.")
    )
    
    

    logistics_model = models.CharField(
        _("Logistics Model"),
        max_length=15,
        choices=LogisticsModel.choices,
        null=True, blank=True, # Making it optional for now
        help_text=_("The logistics model this user operates under (e.g., 1PL, 3PL).")
    )
    
    company = models.ForeignKey( # Adding based on common need, schema might imply via role
        'companies.Company',
        on_delete=models.SET_NULL, # Or models.CASCADE if user must belong to a company
        null=True,
        blank=True,
        related_name='employees',
        help_text=_("The company this user belongs to (if applicable, e.g., for carrier staff or customer users).")
    )

    # Ensure email is unique if it's the primary identifier
    email = models.EmailField(_('email address'), unique=True) # Making email unique as per best practice

    # If using email as the username field:
    # USERNAME_FIELD = 'email'
    # REQUIRED_FIELDS = ['username'] # Keep username if you want it separate, or remove if email is the only username

    # Add history tracking
    history = HistoricalRecords()

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        # Add any pre-save logic here
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ['username']
