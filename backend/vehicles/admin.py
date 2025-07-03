from django.contrib import admin
from .models import Vehicle

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('registration_number', 'vehicle_type', 'status', 'capacity_kg', 
                   'assigned_depot', 'owning_company', 'created_at')
    list_filter = ('vehicle_type', 'status', 'assigned_depot', 'owning_company')
    search_fields = ('registration_number', 'assigned_depot__name', 'owning_company__name')
    ordering = ('registration_number',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ['owning_company']

    fieldsets = (
        ('Basic Information', {
            'fields': ('registration_number', 'vehicle_type', 'status', 'capacity_kg')
        }),
        ('Relationships', {
            'fields': ('assigned_depot', 'owning_company')
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
