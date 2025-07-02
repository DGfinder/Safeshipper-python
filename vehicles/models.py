import uuid
from django.db import models
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
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.registration_number} ({self.get_vehicle_type_display()})"

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
