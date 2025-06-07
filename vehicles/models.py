import uuid
from django.db import models
from locations.models import GeoLocation

class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        TRUCK = 'TRUCK', 'Truck'
        VAN = 'VAN', 'Van'
        TRAILER = 'TRAILER', 'Trailer'
        CONTAINER = 'CONTAINER', 'Container'
        TANKER = 'TANKER', 'Tanker'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration_number = models.CharField(max_length=32, unique=True)
    vehicle_type = models.CharField(max_length=16, choices=VehicleType.choices)
    capacity_kg = models.PositiveIntegerField()
    assigned_depot = models.ForeignKey(GeoLocation, on_delete=models.PROTECT, related_name='vehicles')

    def __str__(self):
        return f"{self.registration_number} ({self.get_vehicle_type_display()})"

    class Meta:
        ordering = ["registration_number"]
        verbose_name = "Vehicle"
        verbose_name_plural = "Vehicles"
