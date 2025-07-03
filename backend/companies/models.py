# companies/models.py
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
import json

class Company(models.Model):
    """
    Model representing a company in the system (customer, carrier, supplier, etc.).
    """
    class CompanyType(models.TextChoices):
        CUSTOMER = 'CUSTOMER', _('Customer')
        CARRIER = 'CARRIER', _('Carrier')
        SUPPLIER = 'SUPPLIER', _('Supplier')
        WAREHOUSE = 'WAREHOUSE', _('Warehouse')
        BROKER = 'BROKER', _('Broker')
        CUSTOMS = 'CUSTOMS', _('Customs Agent')
        OTHER = 'OTHER', _('Other')
    
    class CompanyStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        INACTIVE = 'INACTIVE', _('Inactive')
        SUSPENDED = 'SUSPENDED', _('Suspended')
        PENDING = 'PENDING', _('Pending Approval')
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        _("Company Name"),
        max_length=255,
        db_index=True
    )
    trading_name = models.CharField(
        _("Trading Name"),
        max_length=255,
        blank=True,
        help_text=_("Alternative name used for trading")
    )
    company_type = models.CharField(
        _("Company Type"),
        max_length=20,
        choices=CompanyType.choices,
        db_index=True
    )
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=CompanyStatus.choices,
        default=CompanyStatus.PENDING,
        db_index=True
    )
    
    # Registration and identification
    registration_number = models.CharField(
        _("Registration Number"),
        max_length=50,
        blank=True,
        help_text=_("Company registration number (e.g., ABN, ACN)")
    )
    tax_number = models.CharField(
        _("Tax Number"),
        max_length=50,
        blank=True,
        help_text=_("Tax identification number (e.g., GST, VAT)")
    )
    
    # Contact information
    contact_info = models.JSONField(
        _("Contact Information"),
        default=dict,
        help_text=_("""
            JSON structure containing:
            - primary_contact: {name, email, phone, position}
            - billing_contact: {name, email, phone, position}
            - emergency_contact: {name, email, phone, position}
            - addresses: [{type, street, city, state, country, postal_code}]
            - phones: [{type, number, extension}]
            - emails: [{type, address}]
        """)
    )
    
    # Business details
    website = models.URLField(
        _("Website"),
        blank=True
    )
    industry = models.CharField(
        _("Industry"),
        max_length=100,
        blank=True
    )
    business_hours = models.JSONField(
        _("Business Hours"),
        default=dict,
        help_text=_("JSON structure for business hours by day")
    )
    
    # Financial and operational settings
    credit_limit = models.DecimalField(
        _("Credit Limit"),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    payment_terms_days = models.PositiveIntegerField(
        _("Payment Terms (Days)"),
        default=30
    )
    currency = models.CharField(
        _("Default Currency"),
        max_length=3,
        default='USD'
    )
    
    # Compliance and certification
    certifications = models.JSONField(
        _("Certifications"),
        default=list,
        help_text=_("List of certifications and their expiry dates")
    )
    insurance_info = models.JSONField(
        _("Insurance Information"),
        default=dict,
        help_text=_("Insurance policy details and coverage")
    )
    
    # Metadata
    notes = models.TextField(
        _("Notes"),
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Company")
        verbose_name_plural = _("Companies")
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['company_type', 'status']),
            models.Index(fields=['registration_number']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def clean(self):
        """
        Validate contact_info JSON structure.
        """
        if self.contact_info:
            required_contacts = ['primary_contact', 'billing_contact']
            for contact in required_contacts:
                if contact not in self.contact_info:
                    raise models.ValidationError(
                        f"Missing required contact: {contact}"
                    )
    
    @property
    def primary_contact(self) -> dict:
        """Get primary contact information."""
        return self.contact_info.get('primary_contact', {})
    
    @property
    def billing_contact(self) -> dict:
        """Get billing contact information."""
        return self.contact_info.get('billing_contact', {})
    
    @property
    def addresses(self) -> list:
        """Get all addresses."""
        return self.contact_info.get('addresses', [])
    
    def get_address_by_type(self, address_type: str) -> dict:
        """Get address of specific type."""
        for addr in self.addresses:
            if addr.get('type') == address_type:
                return addr
        return {}

class CompanyRelationship(models.Model):
    """
    Model representing relationships between companies
    (e.g., customer-carrier relationships, partnerships).
    """
    class RelationshipType(models.TextChoices):
        CUSTOMER_CARRIER = 'CUSTOMER_CARRIER', _('Customer-Carrier')
        PARTNER = 'PARTNER', _('Partner')
        SUBSIDIARY = 'SUBSIDIARY', _('Subsidiary')
        AFFILIATE = 'AFFILIATE', _('Affiliate')
        SUPPLIER = 'SUPPLIER', _('Supplier')
        OTHER = 'OTHER', _('Other')
    
    class RelationshipStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        INACTIVE = 'INACTIVE', _('Inactive')
        PENDING = 'PENDING', _('Pending Approval')
        SUSPENDED = 'SUSPENDED', _('Suspended')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationship definition
    company_a = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='relationships_as_a',
        null=True
    )
    company_b = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='relationships_as_b',
        null=True
    )
    relationship_type = models.CharField(
        _("Relationship Type"),
        max_length=20,
        choices=RelationshipType.choices
    )
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=RelationshipStatus.choices,
        default=RelationshipStatus.PENDING
    )
    
    # Relationship details
    contract_number = models.CharField(
        _("Contract Number"),
        max_length=100,
        blank=True
    )
    contract_start_date = models.DateField(
        _("Contract Start Date"),
        null=True,
        blank=True
    )
    contract_end_date = models.DateField(
        _("Contract End Date"),
        null=True,
        blank=True
    )
    
    # Terms and conditions
    terms = models.JSONField(
        _("Terms and Conditions"),
        default=dict,
        help_text=_("""
            JSON structure containing:
            - payment_terms: {days, currency, method}
            - service_levels: {response_time, availability}
            - special_conditions: [string]
        """)
    )
    
    # Metadata
    notes = models.TextField(
        _("Notes"),
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Company Relationship")
        verbose_name_plural = _("Company Relationships")
        unique_together = [['company_a', 'company_b', 'relationship_type']]
        indexes = [
            models.Index(fields=['relationship_type', 'status']),
            models.Index(fields=['contract_start_date', 'contract_end_date']),
        ]
    
    def __str__(self):
        return f"{self.company_a} - {self.company_b} ({self.get_relationship_type_display()})"
    
    def clean(self):
        """
        Validate that company_a and company_b are different.
        """
        if self.company_a_id == self.company_b_id:
            raise models.ValidationError(
                _("A company cannot have a relationship with itself")
            )
    
    @property
    def is_active(self) -> bool:
        """Check if the relationship is active."""
        return self.status == self.RelationshipStatus.ACTIVE
    
    @property
    def is_contract_valid(self) -> bool:
        """Check if the contract is currently valid."""
        if not self.contract_start_date:
            return False
        if not self.contract_end_date:
            return True
        from django.utils import timezone
        today = timezone.now().date()
        return self.contract_start_date <= today <= self.contract_end_date
