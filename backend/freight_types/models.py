# freight_types/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _

class FreightType(models.Model):
    """
    Defines the various categories of freight that can be handled.
    Corresponds to `freight_type` in the schema.
    """
    class Code(models.TextChoices):
        GENERAL = 'GENERAL', _('General Cargo')
        BULK_SOLID = 'BULK_SOLID', _('Bulk Solid')
        BULK_LIQUID = 'BULK_LIQUID', _('Bulk Liquid')
        DANGEROUS_GOODS = 'DG', _('Dangerous Goods (Category)') # Schema uses DG
        LIVESTOCK = 'LIVESTOCK', _('Livestock')
        REFRIGERATED = 'REFRIGERATED', _('Refrigerated / Temperature Controlled')
        AUTOMOTIVE = 'AUTOMOTIVE', _('Automotive (Vehicles)')
        UGLY = 'UGLY', _('Ugly / Oversized / Out-of-Gauge Freight') # From schema
        # Consider adding more specific common types if needed, e.g.,
        # PERISHABLE_NON_REFRIG = 'PERISHABLE_NR', _('Perishable Goods (Non-Refrigerated)')
        # PHARMACEUTICAL = 'PHARMA', _('Pharmaceuticals')
        # HIGH_VALUE = 'HIGH_VALUE', _('High Value Goods')

    code = models.CharField(
        _("Freight Type Code"),
        max_length=50, 
        choices=Code.choices,
        primary_key=True, # As per schema
        help_text=_("Unique code identifying the freight type.")
    )
    description = models.CharField(
        _("Description"),
        max_length=255,
        help_text=_("Full description of the freight type.")
    )
    is_dg_category = models.BooleanField( # Renamed from schema's 'is_dg' to be more specific
        _("Is Dangerous Good Category"),
        default=False,
        help_text=_("Indicates if this freight type *itself* is the 'Dangerous Goods' category. Specific items within other types can also be DGs.")
    )
    
    # Additional potentially useful fields for an enterprise system:
    requires_special_handling = models.BooleanField(
        _("Requires Special Handling"),
        default=False,
        help_text=_("Does this type of freight generally require special handling procedures beyond standard?")
    )
    # For example, linking to default handling instructions or compatible vehicle features
    # default_handling_instructions = models.TextField(blank=True, null=True)
    # typical_handling_unit_types = models.ManyToManyField('handling_unit_types.HandlingUnitType', blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Freight Type")
        verbose_name_plural = _("Freight Types")
        ordering = ['description']

    def save(self, *args, **kwargs):
        # Automatically set is_dg_category to True if the code is DANGEROUS_GOODS
        if self.code == self.Code.DANGEROUS_GOODS:
            self.is_dg_category = True
        super().save(*args, **kwargs)

    def __str__(self):
        return self.get_code_display() # Shows the verbose name from choices
