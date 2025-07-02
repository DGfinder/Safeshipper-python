import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
# Temporarily disabled GIS functionality to avoid GDAL dependency
# from django.contrib.gis.db import models as gis_models
# from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import ValidationError
import json


class Country(models.Model):
    """
    Represents a country, using ISO 3166-1 alpha-2 codes.
    Corresponds to `geo_country` in the schema.
    """
    code = models.CharField(
        _("ISO 3166-1 Alpha-2 Code"),
        max_length=2,
        primary_key=True,
        help_text=_("Two-letter country code (e.g., AU, US, GB).")
    )
    name = models.CharField(
        _("Country Name"),
        max_length=100,
        unique=True,
        db_index=True
    )
    continent_region = models.CharField(
        _("Continent/Major Region"),
        max_length=100,
        blank=True,
        null=True,
        help_text=_("The continent or major geopolitical region the country belongs to.")
    )

    class Meta:
        verbose_name = _("Country")
        verbose_name_plural = _("Countries")
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Region(models.Model):
    """
    Represents an operational or administrative region, which can span multiple depots/locations.
    Corresponds to `regions_region` in the schema.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        _("Region Name"),
        max_length=150,
        unique=True,
        db_index=True,
        help_text=_("Name of the operational or administrative region (e.g., 'NSW Metro').")
    )
    description = models.TextField(_("Description"), blank=True, null=True)

    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name='regions',
        verbose_name=_("Country"),
        help_text=_("Country this region belongs to."),
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Operational Region")
        verbose_name_plural = _("Operational Regions")
        ordering = ['name']

    def __str__(self):
        return self.name


class LocationType(models.TextChoices):
    DEPOT = 'DEPOT', _('Depot')
    CUSTOMER_SITE = 'CUSTOMER_SITE', _('Customer Site')
    PORT = 'PORT', _('Port')
    AIRPORT = 'AIRPORT', _('Airport')
    WAREHOUSE = 'WAREHOUSE', _('Warehouse')
    RAIL_YARD = 'RAIL_YARD', _('Rail Yard')
    BORDER_CROSSING = 'BORDER_CROSSING', _('Border Crossing')
    OTHER = 'OTHER', _('Other Site')


class GeoLocation(models.Model):
    """
    Model for storing geographic locations with geofencing capabilities.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    location_type = models.CharField(
        max_length=50,
        choices=[
            ('CUSTOMER_SITE', 'Customer Site'),
            ('DEPOT', 'Depot'),
            ('WAREHOUSE', 'Warehouse'),
            ('PORT', 'Port'),
            ('AIRPORT', 'Airport'),
            ('CUSTOMS', 'Customs Facility'),
            ('OTHER', 'Other'),
        ]
    )
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    
    # Geographic coordinates (temporarily using simple fields instead of GIS)
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7,
        null=True,
        blank=True,
        help_text="Latitude coordinate"
    )
    longitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7,
        null=True,
        blank=True,
        help_text="Longitude coordinate"
    )
    
    # Geofence boundary (polygon)
    geofence = models.JSONField(
        null=True,
        blank=True,
        help_text="GeoJSON polygon defining the location boundary"
    )
    
    # Demurrage settings
    demurrage_enabled = models.BooleanField(
        default=False,
        help_text="Whether demurrage tracking is enabled for this location"
    )
    free_time_hours = models.PositiveIntegerField(
        default=24,
        help_text="Number of free hours before demurrage charges apply"
    )
    demurrage_rate_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Hourly demurrage rate in the default currency"
    )
    
    # Metadata
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='locations'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['location_type']),
            models.Index(fields=['country', 'city']),
            models.Index(fields=['is_active']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_location_type_display()})"
    
    def clean(self):
        """
        Validate the geofence data if provided.
        """
        if self.geofence:
            try:
                # Basic validation of GeoJSON structure (without GIS library)
                if not isinstance(self.geofence, dict):
                    raise ValidationError("Geofence must be a valid GeoJSON object")
                
                if self.geofence.get('type') != 'Polygon':
                    raise ValidationError("Geofence must be a GeoJSON Polygon")
                
                coordinates = self.geofence.get('coordinates')
                if not coordinates or not isinstance(coordinates, list):
                    raise ValidationError("Invalid coordinates in geofence")
                
                # Basic validation without GIS functionality
                if len(coordinates) == 0 or len(coordinates[0]) < 3:
                    raise ValidationError("Polygon must have at least 3 coordinate pairs")
                
                # Ensure polygon is closed (first and last points are the same)
                if coordinates[0][0] != coordinates[0][-1]:
                    raise ValidationError("Polygon must be closed (first and last points must match)")
                
            except (ValueError, TypeError, json.JSONDecodeError) as e:
                raise ValidationError(f"Invalid geofence data: {str(e)}")
    
    def save(self, *args, **kwargs):
        """
        Ensure geofence is valid before saving.
        """
        self.full_clean()
        super().save(*args, **kwargs)
    
    def is_point_inside(self, latitude: float, longitude: float) -> bool:
        """
        Check if a point is inside the geofence.
        
        Args:
            latitude: Point latitude
            longitude: Point longitude
            
        Returns:
            bool: True if point is inside geofence, False otherwise
        """
        if not self.geofence:
            return False
        
        try:
            # Simplified point-in-polygon algorithm (ray casting)
            # This is a basic implementation without full GIS functionality
            coordinates = self.geofence.get('coordinates', [])
            if not coordinates:
                return False
            
            polygon = coordinates[0]  # Get the outer ring
            x, y = longitude, latitude
            n = len(polygon)
            inside = False
            
            p1x, p1y = polygon[0]
            for i in range(1, n + 1):
                p2x, p2y = polygon[i % n]
                if y > min(p1y, p2y):
                    if y <= max(p1y, p2y):
                        if x <= max(p1x, p2x):
                            if p1y != p2y:
                                xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                            if p1x == p2x or x <= xinters:
                                inside = not inside
                p1x, p1y = p2x, p2y
            
            return inside
        except Exception as e:
            # Log the error but return False to be safe
            print(f"Error checking point in geofence: {str(e)}")
            return False
