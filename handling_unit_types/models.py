# handling_unit_types/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _

class HandlingUnitType(models.Model):
    """
    Defines types of handling units used for packaging and moving freight.
    e.g., PALLET, IBC, ISO_CONTAINER, DRUM, etc.
    """
    class HandlingUnitTypeCode(models.TextChoices):
        PALLET = 'PALLET', _('Pallet')
        IBC = 'IBC', _('Intermediate Bulk Container (IBC)')
        ISO_CONTAINER_20FT = 'ISO_20FT', _('ISO Container 20ft')
        ISO_CONTAINER_40FT = 'ISO_40FT', _('ISO Container 40ft')
        DRUM = 'DRUM', _('Drum')
        FLEXITANK = 'FLEXITANK', _('Flexitank')
        BOX = 'BOX', _('Box/Carton') # Added example
        BAG = 'BAG', _('Bag')       # Added example
        CYLINDER = 'CYLINDER', _('Cylinder') # Added example
        CUSTOM = 'CUSTOM', _('Custom/Other')
        # Add other common types as needed

    code = models.CharField(
        _("Handling Unit Type Code"),
        max_length=50,
        choices=HandlingUnitTypeCode.choices,
        primary_key=True,
        help_text=_("Unique code identifying the handling unit type.")
    )
    description = models.CharField(
        _("Description"),
        max_length=255,
        help_text=_("Full description of the handling unit type.")
    )
    # Nominal/Typical dimensions and weight of the empty handling unit itself, if applicable.
    # These are distinct from the gross weight/volume of a handling unit once filled with goods.
    nominal_volume_liters = models.FloatField(
        _("Nominal Volume (Liters)"),
        null=True, blank=True,
        help_text=_("Typical internal volume of the empty handling unit in liters, if applicable.")
    )
    nominal_weight_kg = models.FloatField(
        _("Nominal Tare Weight (kg)"),
        null=True, blank=True,
        help_text=_("Typical weight of the empty handling unit in kilograms (tare weight).")
    )
    # You could add nominal dimensions (length, width, height) as JSONField or separate FloatFields if needed
    # nominal_dimensions_cm = models.JSONField(null=True, blank=True, help_text=_("Typical L/W/H in cm: {\"l\": N, \"w\": N, \"h\": N}"))
    
    is_stackable = models.BooleanField(
        _("Is Stackable"),
        default=False,
        help_text=_("Can this type of handling unit typically be stacked when loaded?")
    )
    # material = models.CharField(max_length=50, null=True, blank=True, help_text="e.g., Wood, Plastic, Steel")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Handling Unit Type")
        verbose_name_plural = _("Handling Unit Types")
        ordering = ['description']

    def __str__(self):
        return self.get_code_display() # Returns the verbose name from choices
