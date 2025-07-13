# locations/admin.py
from django.contrib import admin
from .models import Country, Region, GeoLocation, LocationType # Ensure LocationType is imported if used

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'continent_region')
    search_fields = ('code', 'name', 'continent_region') # Essential for autocomplete
    ordering = ('name',)

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ('name', 'country', 'description_summary', 'created_at')
    search_fields = ('name', 'country__name', 'description')
    list_filter = ('country',) # This should work if CountryAdmin is registered
    ordering = ('name',)
    autocomplete_fields = ['country'] # This links to CountryAdmin

    def description_summary(self, obj):
        return (obj.description[:75] + '...') if obj.description and len(obj.description) > 75 else obj.description
    description_summary.short_description = "Description"

@admin.register(GeoLocation)
class GeoLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'location_type', 'country', 'is_active_display', 'created_at')
    search_fields = ('name', 'country', 'address')  # Fixed field names 
    list_filter = ('location_type', 'country', 'is_active')
    ordering = ('name',)
    # filter_horizontal = ('operational_regions',)  # Field doesn't exist
    # Remove 'owning_company' from autocomplete_fields if it's not an actual field on GeoLocation model
    # or ensure CompanyAdmin is registered with search_fields if 'owning_company' FK exists.
    # autocomplete_fields = ['country'] # Country is CharField, not FK in this model
    
    fieldsets = (
        (None, {'fields': ('name', 'location_type', 'country', 'is_active')}),
        ('Address & Coordinates', {'fields': ('address', ('latitude', 'longitude'))}),
        ('Depot Specific Info', {
            'fields': ('demurrage_enabled', 'free_time_hours'),  # Updated with actual fields 
            'classes': ('collapse',),
            # Add 'owning_company' here if you add the ForeignKey to the GeoLocation model
        }),
    )

    @admin.display(boolean=True, description='Is Active?')
    def is_active_display(self, obj):
        return obj.is_active

    # @admin.display(boolean=True, description='Is Depot?')
    # def is_depot_display(self, obj): # Removed - no is_depot property exists
    #     return obj.is_depot
