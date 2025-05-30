# shipments/models.py
from django.db import models
from django.conf import settings # For AUTH_USER_MODEL if you add created_by etc.
import uuid
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone # For improved tracking_number

class ShipmentStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    BOOKED = "BOOKED", _("Booked") # Shipment confirmed and booked for transport
    AT_ORIGIN_FACILITY = "AT_ORIGIN_FACILITY", _("At Origin Facility") # Goods received at origin
    IN_TRANSIT = "IN_TRANSIT", _("In Transit")
    AT_DESTINATION_FACILITY = "AT_DESTINATION_FACILITY", _("At Destination Facility") # Arrived at destination hub
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", _("Out for Delivery")
    DELIVERED = "DELIVERED", _("Delivered")
    CANCELLED = "CANCELLED", _("Cancelled")
    EXCEPTION = "EXCEPTION", _("Exception / On Hold") # e.g., customs hold, damage

class FreightType(models.TextChoices): # As suggested by Terry's feedback
    GENERAL = "GENERAL", _("General Freight")
    BULK_SOLID = "BULK_SOLID", _("Bulk Solid (e.g., grain, loose)")
    BULK_LIQUID = "BULK_LIQUID", _("Bulk Liquid (e.g., tanker)")
    DANGEROUS_GOODS = "DANGEROUS_GOODS", _("Dangerous Goods (Packaged)")
    DANGEROUS_GOODS_BULK = "DG_BULK", _("Dangerous Goods (Bulk)")
    REFRIGERATED = "REFRIGERATED", _("Refrigerated Freight")
    LIVESTOCK = "LIVESTOCK", _("Livestock")
    AUTOMOTIVE = "AUTOMOTIVE", _("Automotive (Vehicles)")
    OVERSIZE_HEAVY = "OVERSIZE_HEAVY", _("Oversized / Heavy Lift") # Combining "Ugly"
    OTHER = "OTHER", _("Other Specialised Freight")

class Shipment(models.Model):
    """
    Represents a single shipment, which can contain multiple consignment items.
    """
    reference_number = models.CharField(
        max_length=100, blank=True, null=True,
        help_text=_("External or customer reference number for the shipment."),
        db_index=True
    )
    tracking_number = models.CharField(
        max_length=100, unique=True, editable=False,
        help_text=_("Unique system-generated tracking number."),
        db_index=True
    )
    origin_address = models.TextField(help_text=_("Full origin address, including postcode."))
    destination_address = models.TextField(help_text=_("Full destination address, including postcode."))
    
    # TODO: Phase 2 - Convert to ForeignKey: 'locations.Depot'
    assigned_depot = models.CharField(
        max_length=100, blank=True, null=True,
        help_text=_("Depot responsible for this shipment. (Temporary - to be FK to locations.Depot)"),
        db_index=True
    )
    status = models.CharField(
        max_length=30, choices=ShipmentStatus.choices, default=ShipmentStatus.PENDING,
        help_text=_("Current status of the shipment."), db_index=True
    )
    freight_type = models.CharField( # Terry's suggestion
        max_length=25, choices=FreightType.choices, default=FreightType.GENERAL,
        help_text=_("Primary type of freight in this shipment.")
    )
    # This flag could be set by a service based on the nature of its consignment items
    is_overall_bulk_shipment = models.BooleanField( # Terry's suggestion (bulk_flag)
        default=False,
        help_text=_("Is this entire shipment considered a bulk transport (e.g., a full tanker of one DG liquid, or >X kg/L of a single DG)?")
    )
    
    # TODO: Consider ForeignKeys to 'vehicles.Vehicle' or a 'vehicles.TransportLeg' model
    # primary_vehicle = models.ForeignKey('vehicles.Vehicle', null=True, blank=True, on_delete=models.SET_NULL)
    # mode_of_transport = models.CharField(max_length=20, choices=ModeOfTransport.choices, blank=True, null=True) # Define ModeOfTransport enum

    estimated_departure_date = models.DateTimeField(null=True, blank=True)
    actual_departure_date = models.DateTimeField(null=True, blank=True)
    estimated_arrival_date = models.DateTimeField(null=True, blank=True)
    actual_arrival_date = models.DateTimeField(null=True, blank=True)
    
    # Audit trail fields
    # created_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='created_shipments', null=True, blank=True, on_delete=models.SET_NULL)
    # updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='updated_shipments', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            date_part = timezone.now().strftime('%Y%m%d')
            uuid_part = str(uuid.uuid4()).split("-")[0].upper() # 8 char UUID part
            self.tracking_number = f"SFS-{date_part}-{uuid_part}" # SafeShipperFormat
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Shipment {self.tracking_number} ({self.get_status_display()})"

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Shipment")
        verbose_name_plural = _("Shipments")
        indexes = [
            models.Index(fields=['tracking_number']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_depot']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['created_at']),
            models.Index(fields=['freight_type']),
        ]

class ConsignmentItem(models.Model):
    """
    Represents an individual item or handling unit within a shipment.
    """
    shipment = models.ForeignKey(Shipment, related_name='items', on_delete=models.CASCADE)
    description = models.TextField(help_text=_("Description of the item."))
    quantity = models.PositiveIntegerField(default=1, help_text=_("Number of identical units for this item line."))
    
    # Weight and Volume per single handling unit of this item line
    weight_kg_per_unit = models.DecimalField(
        _("Weight per Unit (kg)"), max_digits=10, decimal_places=3, null=True, blank=True,
        help_text=_("Weight of a single handling unit in kilograms.")
    )
    length_cm_per_unit = models.DecimalField(_("Length per Unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    width_cm_per_unit = models.DecimalField(_("Width per Unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    height_cm_per_unit = models.DecimalField(_("Height per Unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    
    handling_unit_type = models.CharField( # Terry's suggestion (container_type)
        max_length=50, blank=True, null=True,
        help_text=_("Type of handling unit (e.g., Pallet, Drum, IBC, Box, Loose).")
    )
    
    # Bulk flag for this specific line item (e.g., one drum of 600L)
    is_bulk_item = models.BooleanField( # Terry's suggestion + your rule
        default=False, 
        help_text=_("Is this item considered bulk (e.g., >500kg or >500L in its handling unit)? Usually set by services.")
    )

    # Dangerous Goods Information
    is_dangerous_good = models.BooleanField(default=False, help_text=_("Is this item a dangerous good?"))
    
    # TODO: Phase 2 - ForeignKey to 'dangerous_goods.DangerousGood'
    # dangerous_good_master = models.ForeignKey('dangerous_goods.DangerousGood', null=True, blank=True, on_delete=models.SET_NULL, related_name="consignment_items")
    un_number = models.CharField(max_length=10, blank=True, null=True, help_text=_("UN number (e.g., UN1230)."))
    proper_shipping_name = models.CharField(max_length=1024, blank=True, null=True, help_text=_("Proper shipping name for the DG.")) # Increased length
    hazard_class = models.CharField(max_length=20, blank=True, null=True, help_text=_("Hazard class or division.")) # Increased length
    subsidiary_risks = models.CharField(max_length=100, blank=True, null=True, help_text=_("Comma-separated subsidiary risks."))
    packing_group = models.CharField(max_length=5, blank=True, null=True, help_text=_("Packing group (I, II, III).")) # Could use PackingGroup choices from DG app if imported
    
    fire_risk_override = models.BooleanField( # Terry's suggestion
        null=True, # Tri-state: True (is fire risk), False (is NOT fire risk), None (use DG master data)
        blank=True, 
        help_text=_("Manually override fire risk status for this item. If None, refer to master DG data's is_fire_risk.")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_weight_kg(self):
        if self.weight_kg_per_unit is not None and self.quantity is not None:
            return self.weight_kg_per_unit * self.quantity
        return None

    @property
    def total_volume_litres_per_unit(self): # Litres per unit
        if self.length_cm_per_unit and self.width_cm_per_unit and self.height_cm_per_unit:
            return (self.length_cm_per_unit * self.width_cm_per_unit * self.height_cm_per_unit) / 1000
        return None
        
    @property
    def total_volume_litres(self): # Total litres for all units of this item
        vol_per_unit = self.total_volume_litres_per_unit
        if vol_per_unit is not None and self.quantity is not None:
            return vol_per_unit * self.quantity
        return None

    def clean(self):
        super().clean()
        if self.is_dangerous_good:
            if not self.un_number:
                raise ValidationError({'un_number': _('UN Number is required for dangerous goods.')})
            if not self.proper_shipping_name:
                raise ValidationError({'proper_shipping_name': _('Proper Shipping Name is required for dangerous goods.')})
            if not self.hazard_class:
                raise ValidationError({'hazard_class': _('Hazard Class is required for dangerous goods.')})
        
        # Logic to set is_bulk_item based on your rule (e.g., >500kg or >500L)
        # This is better handled in a service or signal *after* quantity and weight/dims are known.
        # For demonstration, a basic check:
        # if self.total_weight_kg is not None and self.total_weight_kg > 500:
        #     self.is_bulk_item = True
        # elif self.total_volume_litres is not None and self.total_volume_litres > 500:
        #     self.is_bulk_item = True
        # else:
        #     self.is_bulk_item = False # Explicitly set if not meeting criteria

    def __str__(self):
        return f"{self.quantity} x {self.description[:50]}"

    class Meta:
        ordering = ['id'] 
        verbose_name = _("Consignment Item")
        verbose_name_plural = _("Consignment Items")
        indexes = [
            models.Index(fields=['shipment']),
            models.Index(fields=['is_dangerous_good']),
            models.Index(fields=['un_number']),
        ]
