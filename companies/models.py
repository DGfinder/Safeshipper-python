# companies/models.py
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _

class CompanyType(models.TextChoices):
    SHIPPER = 'SHIPPER', _('Shipper')
    CARRIER = 'CARRIER', _('Carrier')
    CUSTOMER = 'CUSTOMER', _('Customer')
    BROKER = 'BROKER', _('Broker')
    FORWARDER = 'FORWARDER', _('Forwarder')
    # Add other types as needed, e.g., SUPPLIER, PARTNER

class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        _("Company Name"), 
        max_length=255, 
        unique=True, # Assuming company names should be unique
        db_index=True
    )
    company_type = models.CharField(
        _("Company Type"),
        max_length=20,
        choices=CompanyType.choices,
        db_index=True
    )
    abn = models.CharField( # Australian Business Number
        _("ABN/Tax ID"), 
        max_length=50, 
        blank=True, 
        null=True, 
        unique=True, # ABNs should be unique if provided
        db_index=True
    )
    contact_info = models.JSONField(
        _("Contact Information"), 
        blank=True, 
        null=True,
        help_text=_("JSON field for various contact details like address, phone, contact persons.")
        # Example: {"address": "...", "phone": "...", "email": "...", "primary_contact": {"name": "...", "email": "..."}}
    )
    is_active = models.BooleanField(default=True, help_text=_("Is this company profile active?"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Consider adding created_by, updated_by ForeignKeys to settings.AUTH_USER_MODEL

    class Meta:
        verbose_name = _("Company")
        verbose_name_plural = _("Companies")
        ordering = ['name']

    def __str__(self):
        return self.name

class RelationshipType(models.TextChoices):
    CONTRACTED_TO = 'CONTRACTED_TO', _('Contracted To') # e.g., Shipper is contracted to Carrier
    WORKS_WITH = 'WORKS_WITH', _('Works With')         # General partnership
    OWNED_BY = 'OWNED_BY', _('Owned By')             # For corporate structure
    # Add other relationship types as needed

class CompanyRelationship(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_company = models.ForeignKey(
        Company,
        related_name='source_relationships',
        on_delete=models.CASCADE,
        verbose_name=_("Source Company")
    )
    target_company = models.ForeignKey(
        Company,
        related_name='target_relationships',
        on_delete=models.CASCADE,
        verbose_name=_("Target Company")
    )
    relationship_type = models.CharField(
        _("Relationship Type"),
        max_length=20,
        choices=RelationshipType.choices
    )
    is_active = models.BooleanField(
        _("Active Relationship"),
        default=True,
        help_text=_("Is this business relationship currently active?")
    )
    
    # You might add start_date, end_date for the relationship
    # start_date = models.DateField(null=True, blank=True)
    # end_date = models.DateField(null=True, blank=True)
    # details = models.TextField(blank=True, null=True) # Any specific notes about the relationship

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Company Relationship")
        verbose_name_plural = _("Company Relationships")
        unique_together = [['source_company', 'target_company', 'relationship_type']] # Prevents duplicate identical relationships
        ordering = ['source_company', 'target_company']

    def __str__(self):
        return f"{self.source_company} -> {self.get_relationship_type_display()} -> {self.target_company}"
