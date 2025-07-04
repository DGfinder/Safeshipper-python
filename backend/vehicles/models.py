import uuid
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.utils import timezone
# from locations.models import GeoLocation  # Temporarily disabled
from companies.models import Company

class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        SEMI = 'SEMI', 'Semi-Trailer'
        RIGID = 'RIGID', 'Rigid Truck'
        TANKER = 'TANKER', 'Tanker'
        VAN = 'VAN', 'Van'
        TRAILER = 'TRAILER', 'Trailer'
        CONTAINER = 'CONTAINER', 'Container'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        IN_USE = 'IN_USE', 'In Use'
        MAINTENANCE = 'MAINTENANCE', 'In Maintenance'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'Out of Service'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration_number = models.CharField(max_length=32, unique=True, db_index=True)
    vehicle_type = models.CharField(max_length=16, choices=VehicleType.choices)
    capacity_kg = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)
    # assigned_depot = models.ForeignKey(
    #     GeoLocation,
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='vehicles',
    #     limit_choices_to={'type': 'DEPOT'}
    # )
    assigned_depot = models.CharField(max_length=255, blank=True, null=True, help_text="Depot name (temporary)")
    owning_company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicles'
    )
    
    # Live tracking fields
    last_known_location = gis_models.PointField(
        geography=True,
        null=True,
        blank=True,
        help_text="Last reported GPS location of the vehicle"
    )
    last_reported_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the last location report"
    )
    
    # Driver assignment for mobile app
    assigned_driver = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_vehicles',
        limit_choices_to={'role': 'DRIVER'},
        help_text="Currently assigned driver"
    )
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.registration_number} ({self.get_vehicle_type_display()})"
    
    @property
    def current_location(self):
        """Get the current location as lat/lng dictionary"""
        if self.last_known_location:
            return {
                'latitude': self.last_known_location.y,
                'longitude': self.last_known_location.x,
                'last_updated': self.last_reported_at.isoformat() if self.last_reported_at else None
            }
        return None
    
    @property
    def is_location_stale(self):
        """Check if the last location report is older than 30 minutes"""
        if not self.last_reported_at:
            return True
        from django.utils import timezone
        return (timezone.now() - self.last_reported_at).total_seconds() > 1800  # 30 minutes
    
    def update_location(self, latitude, longitude, timestamp=None):
        """Update the vehicle's location"""
        if timestamp is None:
            timestamp = timezone.now()
        
        self.last_known_location = gis_models.Point(longitude, latitude, srid=4326)
        self.last_reported_at = timestamp
        self.save(update_fields=['last_known_location', 'last_reported_at', 'updated_at'])

    class Meta:
        ordering = ["registration_number"]
        verbose_name = "Vehicle"
        verbose_name_plural = "Vehicles"
        indexes = [
            models.Index(fields=['registration_number']),
            models.Index(fields=['vehicle_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
