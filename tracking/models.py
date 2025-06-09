from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class GPSEvent(models.Model):
    """
    Model for storing GPS location updates from vehicles/assets.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='gps_events'
    )
    shipment = models.ForeignKey(
        'shipments.Shipment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gps_events'
    )
    
    # Location data
    latitude = models.FloatField(
        validators=[MinValueValidator(-90), MaxValueValidator(90)]
    )
    longitude = models.FloatField(
        validators=[MinValueValidator(-180), MaxValueValidator(180)]
    )
    coordinates = gis_models.PointField(
        geography=True,
        help_text="Spatial point for the GPS event"
    )
    
    # Additional data
    speed = models.FloatField(
        null=True,
        blank=True,
        help_text="Speed in km/h"
    )
    heading = models.FloatField(
        null=True,
        blank=True,
        help_text="Heading in degrees (0-360)"
    )
    accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text="GPS accuracy in meters"
    )
    battery_level = models.FloatField(
        null=True,
        blank=True,
        help_text="Battery level percentage (0-100)"
    )
    signal_strength = models.IntegerField(
        null=True,
        blank=True,
        help_text="Signal strength in dBm"
    )
    
    # Metadata
    timestamp = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(
        max_length=50,
        default='GPS_DEVICE',
        choices=[
            ('GPS_DEVICE', 'GPS Device'),
            ('MOBILE_APP', 'Mobile App'),
            ('MANUAL', 'Manual Entry'),
        ]
    )
    raw_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Raw data from the GPS device"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['vehicle', 'timestamp']),
            models.Index(fields=['shipment', 'timestamp']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"GPS Event for {self.vehicle} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        """
        Create the spatial point from lat/long before saving.
        """
        if self.latitude is not None and self.longitude is not None:
            self.coordinates = gis_models.Point(
                x=self.longitude,
                y=self.latitude,
                srid=4326
            )
        super().save(*args, **kwargs)

class LocationVisit(models.Model):
    """
    Model for tracking vehicle visits to locations with geofences.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        'locations.GeoLocation',
        on_delete=models.CASCADE,
        related_name='visits'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='location_visits'
    )
    shipment = models.ForeignKey(
        'shipments.Shipment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='location_visits'
    )
    
    # Visit timing
    entry_time = models.DateTimeField(db_index=True)
    exit_time = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True
    )
    
    # Entry/exit events
    entry_event = models.ForeignKey(
        GPSEvent,
        on_delete=models.SET_NULL,
        null=True,
        related_name='entry_visits'
    )
    exit_event = models.ForeignKey(
        GPSEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exit_visits'
    )
    
    # Demurrage calculation
    demurrage_hours = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Calculated demurrage hours"
    )
    demurrage_charge = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Calculated demurrage charge"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        default='ACTIVE',
        choices=[
            ('ACTIVE', 'Active Visit'),
            ('COMPLETED', 'Completed Visit'),
            ('CANCELLED', 'Cancelled Visit'),
        ]
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['location', 'entry_time']),
            models.Index(fields=['vehicle', 'entry_time']),
            models.Index(fields=['shipment', 'entry_time']),
            models.Index(fields=['status']),
        ]
        ordering = ['-entry_time']
    
    def __str__(self):
        return f"Visit to {self.location} by {self.vehicle} at {self.entry_time}"
    
    @property
    def duration_hours(self) -> float:
        """
        Calculate the duration of the visit in hours.
        Returns None if the visit is still active (no exit time).
        """
        if not self.exit_time:
            return None
        duration = self.exit_time - self.entry_time
        return duration.total_seconds() / 3600  # Convert to hours
    
    @property
    def is_active(self) -> bool:
        """
        Check if the visit is still active (no exit time).
        """
        return self.exit_time is None and self.status == 'ACTIVE'
    
    def calculate_demurrage(self) -> dict:
        """
        Calculate demurrage for this visit.
        Returns a dict with hours and charge.
        """
        if not self.exit_time or not self.location.demurrage_enabled:
            return None
        
        duration = self.duration_hours
        if duration is None:
            return None
        
        # Subtract free time
        chargeable_hours = max(0, duration - self.location.free_time_hours)
        
        # Calculate charge if there are chargeable hours
        charge = None
        if chargeable_hours > 0 and self.location.demurrage_rate_per_hour:
            charge = chargeable_hours * self.location.demurrage_rate_per_hour
        
        return {
            'hours': chargeable_hours,
            'charge': charge
        }
