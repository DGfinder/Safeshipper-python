from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
import uuid
import json

class LoadPlan(models.Model):
    """
    Master load plan for optimizing space utilization in vehicles.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        OPTIMIZING = 'OPTIMIZING', _('Optimizing')
        OPTIMIZED = 'OPTIMIZED', _('Optimized')
        CONFIRMED = 'CONFIRMED', _('Confirmed')
        LOADING = 'LOADING', _('Loading in Progress')
        LOADED = 'LOADED', _('Loaded')
        IN_TRANSIT = 'IN_TRANSIT', _('In Transit')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')

    class OptimizationType(models.TextChoices):
        VOLUME = 'VOLUME', _('Maximize Volume')
        WEIGHT = 'WEIGHT', _('Maximize Weight')
        REVENUE = 'REVENUE', _('Maximize Revenue')
        MIXED = 'MIXED', _('Mixed Optimization')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core relationships
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='load_plans'
    )
    route = models.ForeignKey(
        'routes.Route',
        on_delete=models.CASCADE,
        related_name='load_plans',
        null=True,
        blank=True
    )
    
    # Plan details
    name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    optimization_type = models.CharField(
        max_length=20,
        choices=OptimizationType.choices,
        default=OptimizationType.MIXED
    )
    
    # Capacity constraints
    max_weight_kg = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("Maximum weight capacity in kg")
    )
    max_volume_m3 = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("Maximum volume capacity in cubic meters")
    )
    
    # Load dimensions (vehicle cargo area)
    cargo_length_cm = models.FloatField(validators=[MinValueValidator(0)])
    cargo_width_cm = models.FloatField(validators=[MinValueValidator(0)])
    cargo_height_cm = models.FloatField(validators=[MinValueValidator(0)])
    
    # Utilization metrics
    planned_weight_kg = models.FloatField(default=0, validators=[MinValueValidator(0)])
    planned_volume_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    weight_utilization_pct = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    volume_utilization_pct = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Revenue optimization
    estimated_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Estimated total revenue for this load")
    )
    revenue_per_km = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Revenue per kilometer")
    )
    
    # Optimization results
    optimization_score = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Overall optimization score (0-100)")
    )
    optimization_algorithm = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("Algorithm used for optimization")
    )
    optimization_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Detailed optimization results and parameters")
    )
    
    # DG compliance
    contains_dangerous_goods = models.BooleanField(default=False)
    dg_compliance_status = models.CharField(
        max_length=20,
        choices=[
            ('COMPLIANT', _('Compliant')),
            ('VIOLATIONS', _('Has Violations')),
            ('PENDING', _('Pending Review')),
        ],
        default='PENDING'
    )
    dg_violations = models.JSONField(
        default=list,
        blank=True,
        help_text=_("List of dangerous goods violations")
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    optimized_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    
    # Users
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_load_plans'
    )
    confirmed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_load_plans'
    )
    
    class Meta:
        verbose_name = _("Load Plan")
        verbose_name_plural = _("Load Plans")
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['vehicle', 'status']),
            models.Index(fields=['optimization_type']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Load Plan {self.name} - {self.vehicle.registration_number}"
    
    @property
    def available_weight_kg(self) -> float:
        """Calculate remaining weight capacity."""
        return max(0, self.max_weight_kg - self.planned_weight_kg)
    
    @property
    def available_volume_m3(self) -> float:
        """Calculate remaining volume capacity."""
        return max(0, self.max_volume_m3 - self.planned_volume_m3)
    
    @property
    def is_weight_constrained(self) -> bool:
        """Check if weight is the limiting factor."""
        return self.weight_utilization_pct >= self.volume_utilization_pct
    
    @property
    def total_items(self) -> int:
        """Get total number of items in the load plan."""
        return self.items.count()

class LoadPlanItem(models.Model):
    """
    Individual items within a load plan with 3D positioning.
    """
    class LoadStatus(models.TextChoices):
        PLANNED = 'PLANNED', _('Planned')
        LOADING = 'LOADING', _('Loading')
        LOADED = 'LOADED', _('Loaded')
        UNLOADING = 'UNLOADING', _('Unloading')
        DELIVERED = 'DELIVERED', _('Delivered')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    load_plan = models.ForeignKey(
        LoadPlan,
        on_delete=models.CASCADE,
        related_name='items'
    )
    consignment_item = models.ForeignKey(
        'shipments.ConsignmentItem',
        on_delete=models.CASCADE,
        related_name='load_plan_items'
    )
    
    # 3D positioning in vehicle
    position_x_cm = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("X position from vehicle front (cm)")
    )
    position_y_cm = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("Y position from vehicle left side (cm)")
    )
    position_z_cm = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text=_("Z position from vehicle floor (cm)")
    )
    
    # Item dimensions and weight
    length_cm = models.FloatField(validators=[MinValueValidator(0)])
    width_cm = models.FloatField(validators=[MinValueValidator(0)])
    height_cm = models.FloatField(validators=[MinValueValidator(0)])
    weight_kg = models.FloatField(validators=[MinValueValidator(0)])
    
    # Loading sequence
    load_sequence = models.PositiveIntegerField(
        help_text=_("Order in which items should be loaded (1=first)")
    )
    unload_sequence = models.PositiveIntegerField(
        help_text=_("Order in which items will be unloaded (1=first)")
    )
    
    # Status and constraints
    status = models.CharField(
        max_length=20,
        choices=LoadStatus.choices,
        default=LoadStatus.PLANNED
    )
    is_stackable = models.BooleanField(default=True)
    max_stack_weight_kg = models.FloatField(
        null=True,
        blank=True,
        help_text=_("Maximum weight that can be stacked on top")
    )
    requires_special_handling = models.BooleanField(default=False)
    
    # Segregation requirements (for DG)
    segregation_group = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("Segregation group for dangerous goods")
    )
    min_distance_from_dg_cm = models.FloatField(
        default=0,
        help_text=_("Minimum distance from other dangerous goods (cm)")
    )
    
    # Delivery information
    delivery_stop_number = models.PositiveIntegerField(
        help_text=_("Stop number where this item will be delivered")
    )
    delivery_location = models.ForeignKey(
        'locations.GeoLocation',
        on_delete=models.CASCADE,
        related_name='delivery_items'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    loaded_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = _("Load Plan Item")
        verbose_name_plural = _("Load Plan Items")
        indexes = [
            models.Index(fields=['load_plan', 'load_sequence']),
            models.Index(fields=['status']),
            models.Index(fields=['delivery_stop_number']),
        ]
        ordering = ['load_sequence']
        unique_together = [
            ['load_plan', 'load_sequence'],
            ['load_plan', 'consignment_item'],
        ]
    
    def __str__(self):
        return f"Item {self.load_sequence} in {self.load_plan.name}"
    
    @property
    def volume_m3(self) -> float:
        """Calculate item volume in cubic meters."""
        return (self.length_cm * self.width_cm * self.height_cm) / 1000000
    
    @property
    def position_dict(self) -> dict:
        """Get position as dictionary."""
        return {
            'x': self.position_x_cm,
            'y': self.position_y_cm,
            'z': self.position_z_cm
        }
    
    @property
    def dimensions_dict(self) -> dict:
        """Get dimensions as dictionary."""
        return {
            'length': self.length_cm,
            'width': self.width_cm,
            'height': self.height_cm
        }

class LoadingConstraint(models.Model):
    """
    Constraints for load planning optimization.
    """
    class ConstraintType(models.TextChoices):
        WEIGHT_DISTRIBUTION = 'WEIGHT_DIST', _('Weight Distribution')
        DG_SEGREGATION = 'DG_SEGREGATION', _('Dangerous Goods Segregation')
        FRAGILE_HANDLING = 'FRAGILE', _('Fragile Item Handling')
        TEMPERATURE_CONTROL = 'TEMPERATURE', _('Temperature Control')
        DELIVERY_SEQUENCE = 'DELIVERY_SEQ', _('Delivery Sequence')
        CUSTOMS_ZONE = 'CUSTOMS', _('Customs Zone Separation')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    load_plan = models.ForeignKey(
        LoadPlan,
        on_delete=models.CASCADE,
        related_name='constraints'
    )
    
    constraint_type = models.CharField(
        max_length=20,
        choices=ConstraintType.choices
    )
    description = models.TextField()
    parameters = models.JSONField(
        default=dict,
        help_text=_("Constraint-specific parameters")
    )
    is_mandatory = models.BooleanField(
        default=True,
        help_text=_("Whether this constraint must be satisfied")
    )
    penalty_score = models.FloatField(
        default=100,
        help_text=_("Penalty score if constraint is violated")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Loading Constraint")
        verbose_name_plural = _("Loading Constraints")
    
    def __str__(self):
        return f"{self.get_constraint_type_display()} for {self.load_plan.name}"
