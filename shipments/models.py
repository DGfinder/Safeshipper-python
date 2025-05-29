# shipments/models.py
from django.db import models
from django.conf import settings # To potentially link to the User model for created_by, etc.
import uuid # For generating tracking numbers
from django.core.exceptions import ValidationError # For model validation

# Using Django's TextChoices for status fields is a good practice
class ShipmentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    IN_TRANSIT = "IN_TRANSIT", "In Transit"
    DELIVERED = "DELIVERED", "Delivered"
    CANCELLED = "CANCELLED", "Cancelled"
    AT_DEPOT = "AT_DEPOT", "At Depot"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
    # Add other statuses as needed

class Shipment(models.Model):
    """
    Represents a single shipment.
    """
    # External reference number, could be from a client or another system
    reference_number = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        help_text="External reference number for the shipment.",
        db_index=True # Often searched
    )
    
    # System-generated unique tracking number
    tracking_number = models.CharField(
        max_length=100, 
        unique=True, 
        editable=False, 
        help_text="Unique system-generated tracking number.",
        db_index=True # Crucial for lookups
    )
    
    origin_address = models.TextField(help_text="Full origin address.")
    destination_address = models.TextField(help_text="Full destination address.")
    
    # TODO: Phase 2 - Convert to ForeignKey:
    # assigned_depot = models.ForeignKey(
    #     'locations.Depot', # Assuming a 'Depot' model in a 'locations' app
    #     on_delete=models.SET_NULL, 
    #     null=True, 
    #     blank=True,
    #     related_name='assigned_shipments',
    #     help_text="Depot responsible for this shipment."
    # )
    assigned_depot = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        help_text="Depot responsible for this shipment. (Temporary - to be FK to locations.Depot)",
        db_index=True # Likely filtered by depot
    )
    
    status = models.CharField(
        max_length=20,
        choices=ShipmentStatus.choices,
        default=ShipmentStatus.PENDING,
        help_text="Current status of the shipment.",
        db_index=True # Often filtered by status
    )
    
    estimated_departure_date = models.DateTimeField(null=True, blank=True)
    actual_departure_date = models.DateTimeField(null=True, blank=True)
    estimated_arrival_date = models.DateTimeField(null=True, blank=True)
    actual_arrival_date = models.DateTimeField(null=True, blank=True)
    
    # TODO: Phase 2 - Link to the user who created/owns this shipment
    # created_by = models.ForeignKey(
    #     settings.AUTH_USER_MODEL, 
    #     on_delete=models.SET_NULL, # Or models.PROTECT, depending on business rules
    #     null=True, 
    #     blank=True, # Allow creation by system or anonymous if needed
    #     related_name="created_shipments"
    # )
    # company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name="shipments") # Example if you have a Company app

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            # Generate a more robust tracking number, e.g., Prefix + YearMonth + UUID part
            # Example: "SHP-202505-" + str(uuid.uuid4()).split("-")[0].upper()
            # For now, keeping the simpler one
            self.tracking_number = str(uuid.uuid4()).replace("-", "").upper()[:12] # Example: 12-char uppercase UUID
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Shipment {self.tracking_number} ({self.get_status_display()})"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Shipment"
        verbose_name_plural = "Shipments"
        indexes = [
            models.Index(fields=['tracking_number']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_depot']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['created_at']),
        ]

class ConsignmentItem(models.Model):
    """
    Represents an item within a shipment.
    """
    shipment = models.ForeignKey(Shipment, related_name='items', on_delete=models.CASCADE)
    description = models.TextField(help_text="Description of the item.")
    quantity = models.PositiveIntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Weight in kilograms.")
    
    length_cm = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text="Length in centimeters.")
    width_cm = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text="Width in centimeters.")
    height_cm = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text="Height in centimeters.")

    is_dangerous_good = models.BooleanField(default=False, help_text="Is this item a dangerous good?")
    un_number = models.CharField(max_length=10, blank=True, null=True, help_text="UN number for the dangerous good (e.g., UN1234).")
    proper_shipping_name = models.CharField(max_length=255, blank=True, null=True, help_text="Proper shipping name for the DG.")
    # TODO: Phase 2 - Consider ForeignKey to a 'DangerousGoodClassification' model
    # hazard_class = models.ForeignKey('dangerous_goods.DGClassification', ...) 
    hazard_class = models.CharField(max_length=10, blank=True, null=True, help_text="Hazard class or division (e.g., 3, 5.1).")
    packing_group = models.CharField(max_length=5, blank=True, null=True, help_text="Packing group (e.g., I, II, III).")
    # subsidiary_risks = models.CharField(max_length=50, blank=True, null=True, help_text="Comma-separated subsidiary risks, if any.")
    # technical_name_required = models.BooleanField(default=False)
    # technical_name = models.CharField(max_length=255, blank=True, null=True)


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """
        Custom model validation.
        """
        super().clean()
        if self.is_dangerous_good:
            if not self.un_number:
                raise ValidationError({'un_number': 'UN Number is required for dangerous goods.'})
            if not self.proper_shipping_name:
                raise ValidationError({'proper_shipping_name': 'Proper Shipping Name is required for dangerous goods.'})
            if not self.hazard_class:
                raise ValidationError({'hazard_class': 'Hazard Class is required for dangerous goods.'})
            # Packing group might not always be required for all DG classes,
            # so validation might be more nuanced or handled in services/serializers.
            # if not self.packing_group:
            #     raise ValidationError({'packing_group': 'Packing Group is required for dangerous goods.'})

        # TODO: Future - Add validation for UN number format or against a known list of DG codes
        # This would likely involve a service call or a separate lookup table/model.

    def __str__(self):
        return f"{self.quantity} x {self.description[:50]}"

    class Meta:
        ordering = ['id'] 
        verbose_name = "Consignment Item"
        verbose_name_plural = "Consignment Items"
        indexes = [
            models.Index(fields=['shipment']),
            models.Index(fields=['is_dangerous_good']),
            models.Index(fields=['un_number']),
        ]
