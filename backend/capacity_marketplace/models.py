from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid

class CapacityListing(models.Model):
    """
    Available spare capacity in vehicles for marketplace trading.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        ACTIVE = 'ACTIVE', _('Active - Available for booking')
        PARTIALLY_BOOKED = 'PARTIALLY_BOOKED', _('Partially Booked')
        FULLY_BOOKED = 'FULLY_BOOKED', _('Fully Booked')
        IN_TRANSIT = 'IN_TRANSIT', _('In Transit')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')
        EXPIRED = 'EXPIRED', _('Expired')

    class CapacityType(models.TextChoices):
        WEIGHT_ONLY = 'WEIGHT_ONLY', _('Weight Capacity Only')
        VOLUME_ONLY = 'VOLUME_ONLY', _('Volume Capacity Only')
        MIXED = 'MIXED', _('Weight + Volume Capacity')
        FULL_TRUCK_LOAD = 'FTL', _('Full Truck Load')
        LESS_THAN_TRUCK_LOAD = 'LTL', _('Less Than Truck Load')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core information
    title = models.CharField(max_length=255, help_text=_("Listing title"))
    description = models.TextField(blank=True)
    capacity_type = models.CharField(
        max_length=20,
        choices=CapacityType.choices,
        default=CapacityType.MIXED
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    
    # Vehicle and carrier information
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='capacity_listings'
    )
    carrier = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='capacity_listings'
    )
    driver = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='capacity_listings'
    )
    
    # Route information
    origin_location = models.ForeignKey(
        'locations.GeoLocation',
        on_delete=models.CASCADE,
        related_name='origin_capacity_listings'
    )
    destination_location = models.ForeignKey(
        'locations.GeoLocation',
        on_delete=models.CASCADE,
        related_name='destination_capacity_listings'
    )
    route_distance_km = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("Total route distance in kilometers")
    )
    
    # Capacity details
    available_weight_kg = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("Available weight capacity in kg")
    )
    available_volume_m3 = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("Available volume capacity in cubic meters")
    )
    
    # Cargo space dimensions
    cargo_length_cm = models.FloatField(validators=[MinValueValidator(0)])
    cargo_width_cm = models.FloatField(validators=[MinValueValidator(0)])
    cargo_height_cm = models.FloatField(validators=[MinValueValidator(0)])
    
    # Pricing
    base_price_per_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Base price per kilogram")
    )
    base_price_per_m3 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Base price per cubic meter")
    )
    flat_rate_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Flat rate for full capacity booking")
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Dynamic pricing
    demand_multiplier = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(10.0)],
        help_text=_("Dynamic pricing multiplier based on demand")
    )
    surge_pricing_active = models.BooleanField(
        default=False,
        help_text=_("Whether surge pricing is currently active")
    )
    
    # Timing
    pickup_time_earliest = models.DateTimeField(db_index=True)
    pickup_time_latest = models.DateTimeField(db_index=True)
    estimated_delivery_time = models.DateTimeField()
    
    # Restrictions and requirements
    accepts_dangerous_goods = models.BooleanField(default=False)
    accepted_dg_classes = models.JSONField(
        default=list,
        blank=True,
        help_text=_("List of accepted dangerous goods classes")
    )
    temperature_controlled = models.BooleanField(default=False)
    temperature_range = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Temperature range: {'min': -20, 'max': 25}")
    )
    
    # Equipment and features
    equipment_features = models.JSONField(
        default=list,
        blank=True,
        help_text=_("Available equipment: ['tailgate_lift', 'tracking', 'secure_storage']")
    )
    insurance_coverage = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Insurance coverage amount")
    )
    
    # Booking metrics
    total_bookings = models.PositiveIntegerField(default=0)
    confirmed_bookings = models.PositiveIntegerField(default=0)
    utilization_percentage = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Revenue tracking
    estimated_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    actual_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    
    # Metadata
    listing_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Ratings and feedback
    average_rating = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    total_ratings = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = _("Capacity Listing")
        verbose_name_plural = _("Capacity Listings")
        indexes = [
            models.Index(fields=['status', 'pickup_time_earliest']),
            models.Index(fields=['origin_location', 'destination_location']),
            models.Index(fields=['capacity_type', 'available_weight_kg']),
            models.Index(fields=['accepts_dangerous_goods']),
            models.Index(fields=['listing_expires_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.vehicle.registration_number}"
    
    @property
    def is_active(self) -> bool:
        """Check if listing is currently active and bookable."""
        return (
            self.status == self.Status.ACTIVE and
            self.listing_expires_at > timezone.now() and
            self.pickup_time_latest > timezone.now()
        )
    
    @property
    def remaining_capacity_percentage(self) -> float:
        """Calculate remaining capacity percentage."""
        return 100 - self.utilization_percentage
    
    @property
    def price_per_km_per_kg(self) -> float:
        """Calculate price efficiency metric."""
        if self.route_distance_km > 0:
            return float(self.base_price_per_kg) / self.route_distance_km
        return 0

class CapacityBooking(models.Model):
    """
    Booking of spare capacity by shippers.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending Approval')
        CONFIRMED = 'CONFIRMED', _('Confirmed')
        PAID = 'PAID', _('Paid')
        IN_TRANSIT = 'IN_TRANSIT', _('In Transit')
        DELIVERED = 'DELIVERED', _('Delivered')
        CANCELLED = 'CANCELLED', _('Cancelled')
        DISPUTED = 'DISPUTED', _('Disputed')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core relationships
    capacity_listing = models.ForeignKey(
        CapacityListing,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    shipper = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='capacity_bookings'
    )
    booked_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='capacity_bookings'
    )
    
    # Booking details
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    booking_reference = models.CharField(
        max_length=100,
        unique=True,
        editable=False
    )
    
    # Capacity booked
    booked_weight_kg = models.FloatField(
        validators=[MinValueValidator(0)]
    )
    booked_volume_m3 = models.FloatField(
        validators=[MinValueValidator(0)]
    )
    
    # Items to be shipped
    items_description = models.TextField()
    number_of_items = models.PositiveIntegerField()
    special_requirements = models.JSONField(
        default=list,
        blank=True,
        help_text=_("Special handling requirements")
    )
    
    # Pricing
    quoted_price = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    final_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    platform_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Pickup/delivery details
    pickup_location = models.ForeignKey(
        'locations.GeoLocation',
        on_delete=models.CASCADE,
        related_name='pickup_bookings'
    )
    delivery_location = models.ForeignKey(
        'locations.GeoLocation',
        on_delete=models.CASCADE,
        related_name='delivery_bookings'
    )
    
    requested_pickup_time = models.DateTimeField()
    confirmed_pickup_time = models.DateTimeField(null=True, blank=True)
    actual_pickup_time = models.DateTimeField(null=True, blank=True)
    actual_delivery_time = models.DateTimeField(null=True, blank=True)
    
    # Contact information
    shipper_contact = models.JSONField(
        help_text=_("Contact details for pickup/delivery")
    )
    delivery_instructions = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking and feedback
    tracking_url = models.URLField(blank=True)
    shipper_rating = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    carrier_rating = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    feedback_notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = _("Capacity Booking")
        verbose_name_plural = _("Capacity Bookings")
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['capacity_listing', 'status']),
            models.Index(fields=['shipper', 'status']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Booking {self.booking_reference} - {self.shipper.name}"
    
    def save(self, *args, **kwargs):
        if not self.booking_reference:
            self.booking_reference = f"CB{timezone.now().strftime('%Y%m%d')}{str(self.id)[:8].upper()}"
        super().save(*args, **kwargs)

class MarketplaceMetrics(models.Model):
    """
    Marketplace performance metrics and analytics.
    """
    class MetricType(models.TextChoices):
        DAILY = 'DAILY', _('Daily Metrics')
        WEEKLY = 'WEEKLY', _('Weekly Metrics')
        MONTHLY = 'MONTHLY', _('Monthly Metrics')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    metric_type = models.CharField(
        max_length=10,
        choices=MetricType.choices,
        default=MetricType.DAILY
    )
    date = models.DateField(db_index=True)
    
    # Capacity metrics
    total_capacity_listed_kg = models.FloatField(default=0)
    total_capacity_booked_kg = models.FloatField(default=0)
    capacity_utilization_rate = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Financial metrics
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    platform_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Activity metrics
    new_listings = models.PositiveIntegerField(default=0)
    new_bookings = models.PositiveIntegerField(default=0)
    confirmed_bookings = models.PositiveIntegerField(default=0)
    cancelled_bookings = models.PositiveIntegerField(default=0)
    
    # User metrics
    active_carriers = models.PositiveIntegerField(default=0)
    active_shippers = models.PositiveIntegerField(default=0)
    new_carrier_signups = models.PositiveIntegerField(default=0)
    new_shipper_signups = models.PositiveIntegerField(default=0)
    
    # Quality metrics
    average_rating = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    on_time_delivery_rate = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Marketplace Metrics")
        verbose_name_plural = _("Marketplace Metrics")
        unique_together = [['metric_type', 'date']]
        indexes = [
            models.Index(fields=['metric_type', 'date']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.get_metric_type_display()} - {self.date}"

class PriceOptimization(models.Model):
    """
    AI-driven price optimization for capacity listings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    capacity_listing = models.OneToOneField(
        CapacityListing,
        on_delete=models.CASCADE,
        related_name='price_optimization'
    )
    
    # Market analysis
    market_demand_score = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Market demand score (0-100)")
    )
    competitor_price_avg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Average competitor price for similar routes")
    )
    historical_booking_rate = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Historical booking rate percentage")
    )
    
    # Optimization results
    recommended_price_per_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    recommended_price_per_m3 = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    price_confidence_score = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Confidence in price recommendation (0-100)")
    )
    
    # Factors influencing price
    factors = models.JSONField(
        default=dict,
        help_text=_("Factors influencing price: demand, competition, season, etc.")
    )
    
    # Performance tracking
    predicted_booking_probability = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    actual_booking_rate = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Price Optimization")
        verbose_name_plural = _("Price Optimizations")
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Price Optimization for {self.capacity_listing.title}" 