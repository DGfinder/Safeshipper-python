import uuid
from django.db import models
from django.conf import settings
from django.forms import ValidationError
from django.utils.translation import gettext_lazy as _
from companies.models import Company
from locations.models import GeoLocation
from freight_types.models import FreightType
from simple_history.models import HistoricalRecords
from users.models import User
from vehicles.models import Vehicle
from dangerous_goods.models import DangerousGood

class ShipmentStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    PLANNING = "PLANNING", _("Planning")
    READY_FOR_DISPATCH = "READY_FOR_DISPATCH", _("Ready for Dispatch")
    IN_TRANSIT = "IN_TRANSIT", _("In Transit")
    AT_HUB = "AT_HUB", _("At Hub/Depot")
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", _("Out for Delivery")
    DELIVERED = "DELIVERED", _("Delivered")
    EXCEPTION = "EXCEPTION", _("Exception/Issue")
    CANCELLED = "CANCELLED", _("Cancelled")
    COMPLETED = "COMPLETED", _("Completed")

class Shipment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_number = models.CharField(
        _("Tracking Number"), max_length=100, unique=True, editable=False, db_index=True,
        help_text=_("Unique system-generated tracking number.")
    )
    reference_number = models.CharField(
        _("Reference Number"), max_length=100, blank=True, null=True, db_index=True,
        help_text=_("External reference (e.g., customer PO, booking ID).")
    )
    customer = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='customer_shipments')
    carrier = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='carrier_shipments')
    origin_location = models.ForeignKey(GeoLocation, on_delete=models.PROTECT, related_name='origin_shipments')
    destination_location = models.ForeignKey(GeoLocation, on_delete=models.PROTECT, related_name='destination_shipments')
    freight_type = models.ForeignKey(FreightType, on_delete=models.PROTECT, related_name='shipments')
    status = models.CharField(
        _("Shipment Status"), max_length=25, choices=ShipmentStatus.choices,
        default=ShipmentStatus.PENDING, db_index=True
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='requested_shipments', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name=_("Requested By User")
    )
    assigned_depot = models.ForeignKey(
        'locations.GeoLocation', related_name='depot_managed_shipments', on_delete=models.SET_NULL,
        null=True, blank=True, limit_choices_to={'location_type': 'DEPOT'},
        verbose_name=_("Assigned Depot")
    )

    class ContractType(models.TextChoices):
        SPOT = 'SPOT', _('Spot Rate')
        CONTRACT = 'CONTRACT', _('Contract Rate')
        FLAT_RATE = 'FLAT_RATE', _('Flat Rate')

    contract_type = models.CharField(
        _("Contract Type"), max_length=15, choices=ContractType.choices, null=True, blank=True
    )

    class PricingBasis(models.TextChoices):
        DEAD_WEIGHT = 'DEAD_WEIGHT', _('Dead Weight (kg)')
        VOLUMETRIC = 'VOLUMETRIC', _('Volumetric Weight (kg)')
        PER_UNIT = 'PER_UNIT', _('Per Handling Unit')
        FLAT_RATE = 'FLAT_RATE', _('Flat Rate per Shipment')

    pricing_basis = models.CharField(
        _("Pricing Basis"), max_length=20, choices=PricingBasis.choices, null=True, blank=True
    )

    dead_weight_kg = models.FloatField(_("Total Dead Weight (kg)"), null=True, blank=True)
    volumetric_weight_m3 = models.FloatField(_("Total Volumetric Weight (m^3)"), null=True, blank=True)
    chargeable_weight_kg = models.FloatField(_("Chargeable Weight (kg)"), null=True, blank=True)

    estimated_pickup_date = models.DateTimeField(_("Estimated Pickup Date/Time"), null=True, blank=True)
    actual_pickup_date = models.DateTimeField(_("Actual Pickup Date/Time"), null=True, blank=True)
    estimated_delivery_date = models.DateTimeField(_("Estimated Delivery Date/Time"), null=True, blank=True)
    actual_delivery_date = models.DateTimeField(_("Actual Delivery Date/Time"), null=True, blank=True)

    instructions = models.TextField(_("Special Instructions"), blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Add history tracking
    history = HistoricalRecords()

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            self.tracking_number = str(uuid.uuid4()).replace("-", "").upper()[:16]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Shipment {self.id} - {self.reference_number}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Shipment")
        verbose_name_plural = _("Shipments")
        indexes = [
            models.Index(fields=['tracking_number']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_depot']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['customer']),
            models.Index(fields=['carrier']),
            models.Index(fields=['created_at']),
        ]

class ConsignmentItem(models.Model):
    shipment = models.ForeignKey(Shipment, related_name='items', on_delete=models.CASCADE)
    description = models.TextField(help_text=_("Description of the item."))
    quantity = models.PositiveIntegerField(default=1)
    weight_kg = models.DecimalField(_("Weight per unit (kg)"), max_digits=10, decimal_places=2, null=True, blank=True)
    length_cm = models.DecimalField(_("Length per unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    width_cm = models.DecimalField(_("Width per unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(_("Height per unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    is_dangerous_good = models.BooleanField(default=False, help_text=_("Is this item a dangerous good?"))
    dangerous_good_entry = models.ForeignKey(
        'dangerous_goods.DangerousGood', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='consignment_items',
        help_text=_("Link to the master DangerousGood entry if this item is a DG.")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.is_dangerous_good and not self.dangerous_good_entry:
            raise ValidationError({'dangerous_good_entry': _('A Dangerous Good entry must be selected if marked as a dangerous good.')})

    def __str__(self):
        return f"{self.quantity} x {self.description[:50]}"

    class Meta:
        ordering = ['id']
        verbose_name = _("Consignment Item")
        verbose_name_plural = _("Consignment Items")
