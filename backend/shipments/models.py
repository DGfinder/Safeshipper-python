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
from dangerous_goods.models import DangerousGood  # Re-enabled after dangerous_goods app re-enabled

class ShipmentStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    AWAITING_VALIDATION = "AWAITING_VALIDATION", _("Awaiting Validation")
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
    
    # Legacy location fields (maintained for backward compatibility)
    origin_location = models.CharField(max_length=255, help_text="Origin location name (temporary)")
    destination_location = models.CharField(max_length=255, help_text="Destination location name (temporary)")
    
    # New GeoLocation foreign key fields
    origin_geolocation = models.ForeignKey(
        GeoLocation,
        on_delete=models.PROTECT,
        related_name='origin_shipments',
        null=True,
        blank=True,
        help_text=_("Geographic location for shipment origin")
    )
    destination_geolocation = models.ForeignKey(
        GeoLocation,
        on_delete=models.PROTECT,
        related_name='destination_shipments',
        null=True,
        blank=True,
        help_text=_("Geographic location for shipment destination")
    )
    freight_type = models.ForeignKey(FreightType, on_delete=models.PROTECT, related_name='shipments')
    status = models.CharField(
        _("Shipment Status"), max_length=25, choices=ShipmentStatus.choices,
        default=ShipmentStatus.PENDING, db_index=True
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='requested_shipments', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name=_("Requested By User")
    )
    # assigned_depot = models.ForeignKey(
    #     'locations.GeoLocation', related_name='depot_managed_shipments', on_delete=models.SET_NULL,
    #     null=True, blank=True, limit_choices_to={'location_type': 'DEPOT'},
    #     verbose_name=_("Assigned Depot")
    # )

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
    
    # Vehicle and driver assignment for mobile tracking
    # Temporarily disabled - vehicles app disabled
    assigned_vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_shipments',
        help_text=_("Vehicle assigned to transport this shipment")
    )
    assigned_driver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_shipments',
        limit_choices_to={'role': 'DRIVER'},
        help_text=_("Driver assigned to transport this shipment")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Add history tracking
    history = HistoricalRecords()

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            self.tracking_number = f"SS{str(uuid.uuid4()).replace('-', '').upper()[:14]}"
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
            models.Index(fields=['reference_number']),
            models.Index(fields=['customer']),
            models.Index(fields=['carrier']),
            models.Index(fields=['created_at']),
            models.Index(fields=['origin_geolocation']),
            models.Index(fields=['destination_geolocation']),
        ]

class ConsignmentItem(models.Model):
    
    class DGQuantityType(models.TextChoices):
        STANDARD_DG = 'STANDARD_DG', _('Standard Dangerous Goods')
        LIMITED_QUANTITY = 'LIMITED_QUANTITY', _('Limited Quantity (LQ)')
        DOMESTIC_CONSUMABLE = 'DOMESTIC_CONSUMABLE', _('Domestic Consumable (DC)')
        EXCEPTED_QUANTITY = 'EXCEPTED_QUANTITY', _('Excepted Quantity (EQ)')
        
    class ReceptacleType(models.TextChoices):
        PACKAGE = 'PACKAGE', _('Package/Box')
        DRUM = 'DRUM', _('Drum')
        IBC = 'IBC', _('Intermediate Bulk Container')
        TANK = 'TANK', _('Tank/Portable Tank')
        CYLINDER = 'CYLINDER', _('Gas Cylinder')
        BAG = 'BAG', _('Bag/Sack')
        BOTTLE = 'BOTTLE', _('Bottle/Container')
        OTHER = 'OTHER', _('Other')
    
    shipment = models.ForeignKey(Shipment, related_name='items', on_delete=models.CASCADE)
    description = models.TextField(help_text=_("Description of the item."))
    quantity = models.PositiveIntegerField(default=1)
    weight_kg = models.DecimalField(_("Weight per unit (kg)"), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Volume fields for placard calculations
    volume_l = models.DecimalField(_("Volume per unit (L)"), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Receptacle information for ADG placard calculations
    receptacle_type = models.CharField(
        _("Receptacle Type"),
        max_length=20,
        choices=ReceptacleType.choices,
        default=ReceptacleType.PACKAGE,
        help_text=_("Type of receptacle/packaging")
    )
    
    receptacle_capacity_kg = models.DecimalField(
        _("Receptacle Capacity (kg)"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Maximum capacity of individual receptacle in kg")
    )
    
    receptacle_capacity_l = models.DecimalField(
        _("Receptacle Capacity (L)"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Maximum capacity of individual receptacle in litres")
    )
    
    length_cm = models.DecimalField(_("Length per unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    width_cm = models.DecimalField(_("Width per unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(_("Height per unit (cm)"), max_digits=7, decimal_places=2, null=True, blank=True)
    is_dangerous_good = models.BooleanField(default=False, help_text=_("Is this item a dangerous good?"))
    dangerous_good_entry = models.ForeignKey(
        'dangerous_goods.DangerousGood', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='consignment_items',
        help_text=_("Link to the master DangerousGood entry if this item is a DG.")
    )  # Re-enabled after dangerous_goods app re-enabled
    
    # ADG-specific fields for placard calculations
    dg_quantity_type = models.CharField(
        _("DG Quantity Type"),
        max_length=25,
        choices=DGQuantityType.choices,
        default=DGQuantityType.STANDARD_DG,
        help_text=_("Type of dangerous goods quantity classification")
    )
    
    # Special provisions that might affect placarding
    is_aerosol = models.BooleanField(
        _("Is Aerosol"),
        default=False,
        help_text=_("True if this is an aerosol product (affects Class 2.1 placarding)")
    )
    
    is_fumigated_unit = models.BooleanField(
        _("Is Fumigated Unit"),
        default=False,
        help_text=_("True if this is UN3359 Fumigated Unit")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        # Re-enabled after dangerous_goods app re-enabled
        if self.is_dangerous_good and not self.dangerous_good_entry:
            raise ValidationError({'dangerous_good_entry': _('A Dangerous Good entry must be selected if marked as a dangerous good.')})

    def __str__(self):
        return f"{self.quantity} x {self.description[:50]}"
    
    @property
    def total_weight_kg(self):
        """Calculate total weight for all units of this item"""
        if self.weight_kg and self.quantity:
            return float(self.weight_kg) * self.quantity
        return 0
    
    @property
    def total_volume_l(self):
        """Calculate total volume for all units of this item"""
        if self.volume_l and self.quantity:
            return float(self.volume_l) * self.quantity
        return 0
    
    @property
    def has_large_receptacle(self):
        """Check if any receptacle exceeds 500kg/L (ADG large receptacle threshold)"""
        if self.receptacle_capacity_kg and self.receptacle_capacity_kg > 500:
            return True
        if self.receptacle_capacity_l and self.receptacle_capacity_l > 500:
            return True
        return False
    
    @property
    def is_class_2_1_flammable_gas(self):
        """Check if this is Class 2.1 flammable gas (excluding aerosols)"""
        if (self.is_dangerous_good and 
            self.dangerous_good_entry and 
            self.dangerous_good_entry.hazard_class == '2.1' and 
            not self.is_aerosol):
            return True
        return False
    
    def get_placard_relevant_quantity(self):
        """Get quantity relevant for placard calculations based on DG type"""
        result = {
            'weight_kg': self.total_weight_kg,
            'volume_l': self.total_volume_l,
            'is_limited_quantity': self.dg_quantity_type == self.DGQuantityType.LIMITED_QUANTITY,
            'is_domestic_consumable': self.dg_quantity_type == self.DGQuantityType.DOMESTIC_CONSUMABLE,
            'is_standard_dg': self.dg_quantity_type == self.DGQuantityType.STANDARD_DG,
            'has_large_receptacle': self.has_large_receptacle,
            'is_class_2_1_flammable': self.is_class_2_1_flammable_gas,
            'is_fumigated': self.is_fumigated_unit
        }
        return result

    class Meta:
        ordering = ['id']
        verbose_name = _("Consignment Item")
        verbose_name_plural = _("Consignment Items")


class ProofOfDelivery(models.Model):
    """
    Model for storing proof of delivery information including signature and photos
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.OneToOneField(
        Shipment,
        on_delete=models.CASCADE,
        related_name='proof_of_delivery'
    )
    
    # Delivery details
    delivered_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='delivered_shipments'
    )
    delivered_at = models.DateTimeField(auto_now_add=True)
    
    # Recipient information
    recipient_name = models.CharField(max_length=255)
    recipient_signature_url = models.URLField(max_length=500)  # Base64 or cloud storage URL
    
    # Notes and additional info
    delivery_notes = models.TextField(blank=True)
    delivery_location = models.CharField(max_length=255, blank=True)  # GPS coordinates or address
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-delivered_at']
        verbose_name = _("Proof of Delivery")
        verbose_name_plural = _("Proofs of Delivery")

    def __str__(self):
        return f"POD for {self.shipment.tracking_number}"

    @property
    def photo_count(self):
        """Count of delivery photos"""
        return self.photos.count()


class ProofOfDeliveryPhoto(models.Model):
    """
    Photos captured during delivery as proof
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proof_of_delivery = models.ForeignKey(
        ProofOfDelivery,
        on_delete=models.CASCADE,
        related_name='photos'
    )
    
    # File storage
    image_url = models.URLField(max_length=500)  # Cloud storage URL
    thumbnail_url = models.URLField(max_length=500, blank=True)
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Size in bytes
    
    # Metadata
    caption = models.CharField(max_length=255, blank=True)
    taken_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['taken_at']

    def __str__(self):
        return f"POD Photo for {self.proof_of_delivery.shipment.tracking_number}"

    @property
    def file_size_mb(self):
        """File size in megabytes"""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return None


class ShipmentFeedback(models.Model):
    """
    Customer feedback collected after delivery completion.
    Three-question survey for customer satisfaction and service quality measurement.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.OneToOneField(
        Shipment,
        on_delete=models.CASCADE,
        related_name='customer_feedback'
    )
    
    # Three core feedback questions
    was_on_time = models.BooleanField(
        _("Was the delivery on time?"),
        help_text=_("Customer feedback: Was the shipment delivered on time?")
    )
    was_complete_and_undamaged = models.BooleanField(
        _("Was the shipment complete and undamaged?"),
        help_text=_("Customer feedback: Did the shipment arrive complete and without damage?")
    )
    was_driver_professional = models.BooleanField(
        _("Was the driver professional?"),
        help_text=_("Customer feedback: Was the delivery driver professional and courteous?")
    )
    
    # Additional feedback and metadata
    feedback_notes = models.TextField(
        _("Additional Comments"),
        blank=True,
        max_length=1000,
        help_text=_("Optional customer comments about the delivery experience")
    )
    
    # Submission tracking
    submitted_at = models.DateTimeField(
        _("Submitted At"),
        auto_now_add=True,
        help_text=_("When the feedback was submitted")
    )
    customer_ip = models.GenericIPAddressField(
        _("Customer IP Address"),
        null=True,
        blank=True,
        help_text=_("IP address of the customer submitting feedback")
    )
    
    # Manager response functionality (new fields for production)
    manager_response = models.TextField(
        _("Manager Response"),
        blank=True,
        max_length=2000,
        help_text=_("Internal response from manager regarding this feedback (not sent to customer)")
    )
    responded_at = models.DateTimeField(
        _("Response Date"),
        null=True,
        blank=True,
        help_text=_("When the manager responded to this feedback")
    )
    responded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedback_responses',
        limit_choices_to={'role__in': ['MANAGER', 'ADMIN']},
        help_text=_("Manager who responded to this feedback")
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = _("Shipment Feedback")
        verbose_name_plural = _("Shipment Feedback")
        indexes = [
            models.Index(fields=['submitted_at']),
            models.Index(fields=['shipment']),
        ]

    def __str__(self):
        return f"Feedback for {self.shipment.tracking_number}"

    @property
    def delivery_success_score(self):
        """
        Calculate delivery success score as percentage.
        Average of the three boolean questions converted to percentage.
        """
        score_sum = sum([
            1 if self.was_on_time else 0,
            1 if self.was_complete_and_undamaged else 0,
            1 if self.was_driver_professional else 0
        ])
        return round((score_sum / 3) * 100, 1)
    
    @property
    def company(self):
        """Get company for multi-tenant filtering"""
        return self.shipment.customer
    
    def get_feedback_summary(self):
        """Get human-readable feedback summary"""
        positive_count = sum([
            1 if self.was_on_time else 0,
            1 if self.was_complete_and_undamaged else 0,
            1 if self.was_driver_professional else 0
        ])
        
        if positive_count == 3:
            return "Excellent"
        elif positive_count == 2:
            return "Good"  
        elif positive_count == 1:
            return "Fair"
        else:
            return "Poor"
    
    @property
    def difot_score(self):
        """
        DIFOT (Delivered In-Full, On-Time) calculation.
        Key logistics KPI based on first two feedback questions.
        """
        return self.was_on_time and self.was_complete_and_undamaged
    
    @property
    def requires_incident(self):
        """Check if feedback score requires automatic incident creation (< 67%)"""
        return self.delivery_success_score < 67
    
    @property
    def has_manager_response(self):
        """Check if manager has responded to this feedback"""
        return bool(self.manager_response and self.responded_at and self.responded_by)
    
    @property
    def performance_category(self):
        """Get performance category based on configurable thresholds"""
        score = self.delivery_success_score
        if score > 95:
            return "EXCELLENT"
        elif score >= 85:
            return "GOOD" 
        elif score >= 70:
            return "NEEDS_IMPROVEMENT"
        else:
            return "POOR"
    
    def add_manager_response(self, response_text, manager_user):
        """Add manager response with proper validation"""
        from django.utils import timezone
        
        if not manager_user.role in ['MANAGER', 'ADMIN']:
            raise ValueError("Only managers and admins can respond to feedback")
        
        self.manager_response = response_text
        self.responded_at = timezone.now()
        self.responded_by = manager_user
        self.save(update_fields=['manager_response', 'responded_at', 'responded_by', 'updated_at'])
