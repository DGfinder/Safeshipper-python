from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
import uuid

class Route(models.Model):
    """
    Multi-stop route for vehicle optimization.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        OPTIMIZED = 'OPTIMIZED', _('Optimized')
        ASSIGNED = 'ASSIGNED', _('Assigned to Vehicle')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')

    class OptimizationType(models.TextChoices):
        SHORTEST_DISTANCE = 'SHORTEST_DISTANCE', _('Minimize Distance')
        FASTEST_TIME = 'FASTEST_TIME', _('Minimize Time')
        LOWEST_COST = 'LOWEST_COST', _('Minimize Cost')
        BALANCED = 'BALANCED', _('Balanced Optimization')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic route information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    
    # Vehicle assignment
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='routes'
    )
    driver = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='routes'
    )
    
    # Route optimization
    optimization_type = models.CharField(
        max_length=20,
        choices=OptimizationType.choices,
        default=OptimizationType.BALANCED
    )
    optimization_score = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Route metrics
    total_distance_km = models.FloatField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    estimated_duration_hours = models.FloatField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    estimated_fuel_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    estimated_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    
    # Time windows
    planned_start_time = models.DateTimeField()
    planned_end_time = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    # Constraints
    max_working_hours = models.FloatField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(24)]
    )
    requires_rest_break = models.BooleanField(default=True)
    
    # Optimization metadata
    optimization_algorithm = models.CharField(max_length=50, blank=True)
    optimization_metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    optimized_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = _("Route")
        verbose_name_plural = _("Routes")
        indexes = [
            models.Index(fields=['status', 'planned_start_time']),
            models.Index(fields=['vehicle', 'status']),
        ]
        ordering = ['-planned_start_time']
    
    def __str__(self):
        return f"Route {self.name} - {self.vehicle.registration_number}"
    
    @property
    def total_stops(self) -> int:
        """Get total number of stops in this route."""
        return self.stops.count()
    
    @property
    def efficiency_score(self) -> float:
        """Calculate route efficiency score."""
        if self.total_distance_km > 0 and self.estimated_revenue > 0:
            return float(self.estimated_revenue) / self.total_distance_km
        return 0

class RouteStop(models.Model):
    """
    Individual stop within a route.
    """
    class StopType(models.TextChoices):
        PICKUP = 'PICKUP', _('Pickup')
        DELIVERY = 'DELIVERY', _('Delivery')
        BOTH = 'BOTH', _('Pickup & Delivery')
        REST_BREAK = 'REST_BREAK', _('Rest Break')
        FUEL_STOP = 'FUEL_STOP', _('Fuel Stop')
        DEPOT = 'DEPOT', _('Depot')

    class Status(models.TextChoices):
        PLANNED = 'PLANNED', _('Planned')
        IN_TRANSIT = 'IN_TRANSIT', _('En Route')
        ARRIVED = 'ARRIVED', _('Arrived')
        COMPLETED = 'COMPLETED', _('Completed')
        SKIPPED = 'SKIPPED', _('Skipped')
        FAILED = 'FAILED', _('Failed')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='stops'
    )
    location = models.ForeignKey(
        'locations.GeoLocation',
        on_delete=models.CASCADE,
        related_name='route_stops'
    )
    
    # Stop details
    stop_type = models.CharField(
        max_length=15,
        choices=StopType.choices,
        default=StopType.DELIVERY
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PLANNED
    )
    sequence_number = models.PositiveIntegerField()
    
    # Time windows
    earliest_arrival = models.DateTimeField()
    latest_arrival = models.DateTimeField()
    planned_arrival = models.DateTimeField()
    planned_departure = models.DateTimeField()
    actual_arrival = models.DateTimeField(null=True, blank=True)
    actual_departure = models.DateTimeField(null=True, blank=True)
    
    # Service time
    estimated_service_time_minutes = models.PositiveIntegerField(default=30)
    actual_service_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    # Distance and travel time from previous stop
    distance_from_previous_km = models.FloatField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    travel_time_from_previous_minutes = models.PositiveIntegerField(default=0)
    
    # Associated shipments
    shipments = models.ManyToManyField(
        'shipments.Shipment',
        through='RouteStopShipment',
        related_name='route_stops'
    )
    
    # Special requirements
    requires_appointment = models.BooleanField(default=False)
    contact_phone = models.CharField(max_length=20, blank=True)
    special_instructions = models.TextField(blank=True)
    
    # Weight and volume at this stop
    pickup_weight_kg = models.FloatField(default=0, validators=[MinValueValidator(0)])
    delivery_weight_kg = models.FloatField(default=0, validators=[MinValueValidator(0)])
    pickup_volume_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    delivery_volume_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Route Stop")
        verbose_name_plural = _("Route Stops")
        indexes = [
            models.Index(fields=['route', 'sequence_number']),
            models.Index(fields=['status', 'planned_arrival']),
        ]
        ordering = ['route', 'sequence_number']
        unique_together = [['route', 'sequence_number']]
    
    def __str__(self):
        return f"Stop {self.sequence_number}: {self.location.name}"
    
    @property
    def is_on_time(self) -> bool:
        """Check if stop was completed on time."""
        if not self.actual_arrival or not self.latest_arrival:
            return False
        return self.actual_arrival <= self.latest_arrival

class RouteStopShipment(models.Model):
    """
    Through model linking route stops to shipments.
    """
    class Action(models.TextChoices):
        PICKUP = 'PICKUP', _('Pickup')
        DELIVERY = 'DELIVERY', _('Delivery')

    route_stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE)
    shipment = models.ForeignKey('shipments.Shipment', on_delete=models.CASCADE)
    action = models.CharField(max_length=10, choices=Action.choices)
    
    # Items being picked up or delivered
    items_count = models.PositiveIntegerField(default=0)
    weight_kg = models.FloatField(default=0, validators=[MinValueValidator(0)])
    volume_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    
    # Completion tracking
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    signature_required = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = _("Route Stop Shipment")
        verbose_name_plural = _("Route Stop Shipments")
        unique_together = [['route_stop', 'shipment', 'action']]
    
    def __str__(self):
        return f"{self.get_action_display()} {self.shipment.tracking_number} at {self.route_stop.location.name}"

class RouteOptimizationResult(models.Model):
    """
    Results from route optimization algorithms.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='optimization_results'
    )
    
    # Algorithm details
    algorithm_name = models.CharField(max_length=100)
    algorithm_version = models.CharField(max_length=20)
    optimization_parameters = models.JSONField(default=dict)
    
    # Results
    total_distance_km = models.FloatField(validators=[MinValueValidator(0)])
    total_time_hours = models.FloatField(validators=[MinValueValidator(0)])
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    fuel_consumption_liters = models.FloatField(validators=[MinValueValidator(0)])
    
    # Optimization metrics
    improvement_percentage = models.FloatField(
        validators=[MinValueValidator(-100), MaxValueValidator(100)],
        help_text=_("Percentage improvement over baseline")
    )
    feasibility_score = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Constraint violations
    time_window_violations = models.PositiveIntegerField(default=0)
    capacity_violations = models.PositiveIntegerField(default=0)
    working_time_violations = models.PositiveIntegerField(default=0)
    
    # Alternative routes
    alternative_routes = models.JSONField(
        default=list,
        help_text=_("Alternative route configurations")
    )
    
    # Performance metrics
    computation_time_seconds = models.FloatField(validators=[MinValueValidator(0)])
    iterations = models.PositiveIntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Route Optimization Result")
        verbose_name_plural = _("Route Optimization Results")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Optimization for {self.route.name} - {self.algorithm_name}" 