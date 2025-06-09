from django.db import models
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
import uuid

class PricingRate(models.Model):
    """
    Model for storing various types of pricing rates (spot, contract, etc.).
    """
    class RateType(models.TextChoices):
        SPOT = 'SPOT', _('Spot Rate')
        CONTRACT = 'CONTRACT', _('Contract Rate')
        FLAT_RATE = 'FLAT_RATE', _('Flat Rate')
        VOLUME = 'VOLUME', _('Volume-Based Rate')
        ZONE = 'ZONE', _('Zone-Based Rate')
        CUSTOM = 'CUSTOM', _('Custom Rate')
    
    class RateStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        INACTIVE = 'INACTIVE', _('Inactive')
        PENDING = 'PENDING', _('Pending Approval')
        EXPIRED = 'EXPIRED', _('Expired')
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        _("Rate Name"),
        max_length=255,
        help_text=_("Descriptive name for this rate")
    )
    rate_type = models.CharField(
        _("Rate Type"),
        max_length=20,
        choices=RateType.choices,
        db_index=True
    )
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=RateStatus.choices,
        default=RateStatus.PENDING,
        db_index=True
    )
    
    # Relationships
    carrier = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='carrier_rates',
        verbose_name=_("Carrier"),
        help_text=_("Company providing the service")
    )
    customer = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='customer_rates',
        null=True,
        blank=True,
        verbose_name=_("Customer"),
        help_text=_("Specific customer for this rate (if applicable)")
    )
    region = models.ForeignKey(
        'locations.Region',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rates',
        verbose_name=_("Region"),
        help_text=_("Geographic region this rate applies to (if applicable)")
    )
    
    # Rate details
    per_kg_rate = models.DecimalField(
        _("Rate per Kilogram"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Base rate per kilogram")
    )
    volumetric_factor = models.DecimalField(
        _("Volumetric Factor"),
        max_digits=5,
        decimal_places=2,
        default=167,  # Standard IATA factor (1:167)
        help_text=_("Volume to weight conversion factor (e.g., 167 for air freight)")
    )
    min_charge = models.DecimalField(
        _("Minimum Charge"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Minimum charge for any shipment")
    )
    max_charge = models.DecimalField(
        _("Maximum Charge"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Maximum charge for any shipment")
    )
    
    # Volume breaks
    volume_breaks = models.JSONField(
        _("Volume Breaks"),
        default=list,
        blank=True,
        help_text=_("""
            List of volume break points and their rates:
            [{"min_kg": 100, "max_kg": 500, "rate": 2.50}, ...]
        """)
    )
    
    # Validity period
    valid_from = models.DateTimeField(
        _("Valid From"),
        db_index=True
    )
    valid_to = models.DateTimeField(
        _("Valid To"),
        null=True,
        blank=True,
        db_index=True
    )
    
    # Additional charges
    additional_charges = models.JSONField(
        _("Additional Charges"),
        default=list,
        blank=True,
        help_text=_("""
            List of additional charges:
            [{"name": "Fuel Surcharge", "type": "PERCENTAGE", "value": 15}, ...]
        """)
    )
    
    # Currency and payment
    currency = models.CharField(
        _("Currency"),
        max_length=3,
        default='USD'
    )
    payment_terms_days = models.PositiveIntegerField(
        _("Payment Terms (Days)"),
        default=30
    )
    
    # Metadata
    notes = models.TextField(
        _("Notes"),
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Pricing Rate")
        verbose_name_plural = _("Pricing Rates")
        indexes = [
            models.Index(fields=['rate_type', 'status']),
            models.Index(fields=['carrier', 'customer']),
            models.Index(fields=['valid_from', 'valid_to']),
        ]
        ordering = ['-valid_from', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_rate_type_display()})"
    
    def clean(self):
        """
        Validate rate data.
        """
        if self.valid_to and self.valid_from >= self.valid_to:
            raise models.ValidationError(
                _("Valid to date must be after valid from date")
            )
        
        if self.min_charge and self.max_charge and self.min_charge > self.max_charge:
            raise models.ValidationError(
                _("Minimum charge cannot be greater than maximum charge")
            )
    
    @property
    def is_active(self) -> bool:
        """
        Check if the rate is currently active.
        """
        from django.utils import timezone
        now = timezone.now()
        
        if self.status != self.RateStatus.ACTIVE:
            return False
        
        if now < self.valid_from:
            return False
        
        if self.valid_to and now > self.valid_to:
            return False
        
        return True
    
    def calculate_charge(
        self,
        weight: float,
        volume: float = None,
        apply_additional_charges: bool = True
    ) -> dict:
        """
        Calculate the charge for a shipment.
        
        Args:
            weight: Weight in kilograms
            volume: Volume in cubic meters (optional)
            apply_additional_charges: Whether to include additional charges
            
        Returns:
            Dict containing charge details
        """
        # Calculate volumetric weight if volume provided
        volumetric_weight = None
        if volume is not None:
            volumetric_weight = volume * self.volumetric_factor
        
        # Use the greater of actual and volumetric weight
        chargeable_weight = max(weight, volumetric_weight or 0)
        
        # Find applicable volume break
        rate = self.per_kg_rate
        if self.volume_breaks:
            for break_point in sorted(self.volume_breaks, key=lambda x: x['min_kg']):
                if break_point['min_kg'] <= chargeable_weight <= break_point.get('max_kg', float('inf')):
                    rate = break_point['rate']
                    break
        
        # Calculate base charge
        base_charge = chargeable_weight * rate
        
        # Apply min/max constraints
        if self.min_charge:
            base_charge = max(base_charge, self.min_charge)
        if self.max_charge:
            base_charge = min(base_charge, self.max_charge)
        
        # Calculate additional charges
        additional_charges = []
        total_additional = 0
        
        if apply_additional_charges and self.additional_charges:
            for charge in self.additional_charges:
                if charge['type'] == 'PERCENTAGE':
                    amount = base_charge * (charge['value'] / 100)
                else:  # FIXED
                    amount = charge['value']
                
                additional_charges.append({
                    'name': charge['name'],
                    'type': charge['type'],
                    'value': charge['value'],
                    'amount': amount
                })
                total_additional += amount
        
        # Calculate total
        total_charge = base_charge + total_additional
        
        return {
            'weight': weight,
            'volumetric_weight': volumetric_weight,
            'chargeable_weight': chargeable_weight,
            'base_rate': rate,
            'base_charge': base_charge,
            'additional_charges': additional_charges,
            'total_additional': total_additional,
            'total_charge': total_charge,
            'currency': self.currency
        } 