# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
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

    # Contact Information
    phone_number = models.CharField(
        _("Phone Number"),
        max_length=20,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\+?[\d\s\-\(\)]{7,20}$',
                message=_('Phone number must be 7-20 digits and may include +, spaces, hyphens, and parentheses')
            )
        ],
        help_text=_('Primary contact phone number')
    )
    mobile_number = models.CharField(
        _("Mobile Number"),
        max_length=20,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\+?[\d\s\-\(\)]{7,20}$',
                message=_('Mobile number must be 7-20 digits and may include +, spaces, hyphens, and parentheses')
            )
        ],
        help_text=_('Mobile phone number')
    )

    # Emergency Contact Information
    emergency_contact_name = models.CharField(
        _("Emergency Contact Name"),
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Name of emergency contact person')
    )
    emergency_contact_phone = models.CharField(
        _("Emergency Contact Phone"),
        max_length=20,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\+?[\d\s\-\(\)]{7,20}$',
                message=_('Emergency contact phone must be 7-20 digits and may include +, spaces, hyphens, and parentheses')
            )
        ],
        help_text=_('Emergency contact phone number')
    )
    emergency_contact_relationship = models.CharField(
        _("Emergency Contact Relationship"),
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Relationship to emergency contact (e.g., spouse, parent, sibling)')
    )

    # Employee Information
    employee_id = models.CharField(
        _("Employee ID"),
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Company employee ID or badge number')
    )
    department = models.CharField(
        _("Department"),
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Department or division within the company')
    )
    position_title = models.CharField(
        _("Position Title"),
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Job title or position')
    )

    # License Information (important for drivers)
    driver_license_number = models.CharField(
        _("Driver License Number"),
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Driver license number')
    )
    driver_license_class = models.CharField(
        _("Driver License Class"),
        max_length=10,
        blank=True,
        null=True,
        help_text=_('Driver license class (e.g., CDL-A, MC, HC)')
    )
    driver_license_expiry = models.DateField(
        _("Driver License Expiry"),
        blank=True,
        null=True,
        help_text=_('Driver license expiry date')
    )
    dangerous_goods_license = models.CharField(
        _("Dangerous Goods License"),
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Dangerous goods transportation license number')
    )
    dangerous_goods_license_expiry = models.DateField(
        _("Dangerous Goods License Expiry"),
        blank=True,
        null=True,
        help_text=_('Dangerous goods license expiry date')
    )

    # Profile Information
    date_of_birth = models.DateField(
        _("Date of Birth"),
        blank=True,
        null=True,
        help_text=_('Date of birth')
    )
    address = models.TextField(
        _("Address"),
        blank=True,
        null=True,
        help_text=_('Home address')
    )
    hire_date = models.DateField(
        _("Hire Date"),
        blank=True,
        null=True,
        help_text=_('Date of hire/employment start')
    )

    class PreferredLanguage(models.TextChoices):
        ENGLISH = 'en', _('English')
        SPANISH = 'es', _('Spanish')
        FRENCH = 'fr', _('French')
        GERMAN = 'de', _('German')
        ITALIAN = 'it', _('Italian')
        PORTUGUESE = 'pt', _('Portuguese')
        CHINESE = 'zh', _('Chinese')
        JAPANESE = 'ja', _('Japanese')
        ARABIC = 'ar', _('Arabic')

    preferred_language = models.CharField(
        _("Preferred Language"),
        max_length=10,
        choices=PreferredLanguage.choices,
        default=PreferredLanguage.ENGLISH,
        help_text=_('Preferred language for system interface')
    )

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
