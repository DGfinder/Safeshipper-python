    # locations/services.py
    from django.db.models import QuerySet
    from .models import Country, Region, GeoLocation # Import your location models
    from typing import List # For type hinting

    def list_all_countries() -> QuerySet[Country]:
        """
        Returns a queryset of all countries, ordered by name.
        
        Returns:
            QuerySet[Country]: A queryset containing all countries, ordered by name
        """
        return Country.objects.all().order_by('name').select_related(
            # Add any related fields that might be needed
        ).prefetch_related(
            # Add any many-to-many relationships that might be needed
        )

    # Add other location-related service functions here as needed:
    # def get_regions_for_country(country_code: str) -> QuerySet[Region]:
    #     return Region.objects.filter(country__code=country_code).order_by('name')

    # def get_depots_in_region(region_id: str) -> QuerySet[GeoLocation]:
    #     return GeoLocation.objects.filter(operational_regions__id=region_id, location_type=GeoLocation.LocationType.DEPOT).order_by('name')
    