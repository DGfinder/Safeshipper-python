import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


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
    Represents a specific geographic location (depot, customer site, port, etc.).
    Consolidates `geo_location` and `depots_depot` from the schema.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        _("Location Name"),
        max_length=255,
        db_index=True,
        help_text=_("Name of the location (e.g., 'Sydney Main Depot', 'Port Botany').")
    )
    location_type = models.CharField(
        _("Location Type"),
        max_length=20,
        choices=LocationType.choices,
        db_index=True
    )
    latitude = models.FloatField(
        _("Latitude"),
        null=True,
        blank=True,
        help_text=_("Latitude in decimal degrees (e.g., -33.8688).")
    )
    longitude = models.FloatField(
        _("Longitude"),
        null=True,
        blank=True,
        help_text=_("Longitude in decimal degrees (e.g., 151.2093).")
    )
    address_structured = models.JSONField(
        _("Structured Address"),
        blank=True,
        null=True,
        help_text=_("JSON: street, city, state/province, postal_code, etc.")
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        verbose_name=_("Country"),
        db_index=True
    )

    safe_fill_limits = models.JSONField(
        _("Safe Fill Limits (Depot)"),
        blank=True,
        null=True,
        help_text=_("JSON field for safe fill limits if this location is a depot.")
    )
    operational_regions = models.ManyToManyField(
        Region,
        related_name='depots',
        blank=True,
        verbose_name=_("Operational Regions (if Depot)"),
        help_text=_("Regions this depot serves or belongs to.")
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Geographic Location")
        verbose_name_plural = _("Geographic Locations")
        ordering = ['name']
        unique_together = [['name', 'country', 'location_type']]

    def __str__(self):
        return f"{self.name} ({self.get_location_type_display()})"

    @property
    def is_depot(self):
        return self.location_type == LocationType.DEPOT
