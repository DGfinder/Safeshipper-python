# shipments/admin.py
from django.contrib import admin
from .models import Shipment, ConsignmentItem, ShipmentStatus

class ConsignmentItemInline(admin.TabularInline):
    model = ConsignmentItem
    extra = 1 # Number of empty forms to display for new items
    fields = ('description', 'quantity', 'weight_kg', 
              'length_cm', 'width_cm', 'height_cm', 
              'is_dangerous_good', 'un_number', 'proper_shipping_name', 
              'hazard_class', 'packing_group')
    # For a cleaner inline form, you might group DG fields
    # readonly_fields = ('created_at', 'updated_at') # If you want to show these

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = (
        'tracking_number', 
        'reference_number',
        'origin_address_summary', 
        'destination_address_summary', 
        'assigned_depot',
        'status', 
        'estimated_departure_date', 
        'created_at'
    )
    list_filter = ('status', 'assigned_depot', 'created_at', 'estimated_departure_date')
    search_fields = ('tracking_number', 'reference_number', 'origin_address', 'destination_address', 'assigned_depot')
    ordering = ('-created_at',)
    readonly_fields = ('tracking_number', 'created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('reference_number', 'origin_address', 'destination_address', 'assigned_depot', 'status')
        }),
        ('Dates & Times', {
            'fields': ('estimated_departure_date', 'actual_departure_date', 'estimated_arrival_date', 'actual_arrival_date')
        }),
        ('System Information', {
            'fields': ('tracking_number', 'created_at', 'updated_at'),
            'classes': ('collapse',), 
        }),
    )
    inlines = [ConsignmentItemInline]

    def origin_address_summary(self, obj):
        return obj.origin_address[:50] + "..." if len(obj.origin_address) > 50 else obj.origin_address
    origin_address_summary.short_description = "Origin"

    def destination_address_summary(self, obj):
        return obj.destination_address[:50] + "..." if len(obj.destination_address) > 50 else obj.destination_address
    destination_address_summary.short_description = "Destination"


@admin.register(ConsignmentItem)
class ConsignmentItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'shipment_info', 'description_summary', 'quantity', 'weight_kg', 'is_dangerous_good', 'un_number', 'hazard_class')
    list_filter = ('is_dangerous_good', 'hazard_class', 'shipment__status', 'shipment__assigned_depot')
    search_fields = ('description', 'un_number', 'proper_shipping_name', 'shipment__tracking_number', 'shipment__reference_number')
    ordering = ('-shipment__created_at', 'shipment', 'id') # Order by shipment creation date first
    list_select_related = ['shipment'] # Optimizes fetching shipment data for list_display

    def shipment_info(self, obj):
        return obj.shipment.tracking_number if obj.shipment else "N/A"
    shipment_info.short_description = "Shipment Tracking #"
    shipment_info.admin_order_field = 'shipment__tracking_number'

    def description_summary(self, obj):
        return obj.description[:75] + '...' if len(obj.description) > 75 else obj.description
    description_summary.short_description = "Description"

    fieldsets = (
        ('Association', {
            'fields': ('shipment',)
        }),
        ('Item Details', {
            'fields': ('description', 'quantity', 'weight_kg', ('length_cm', 'width_cm', 'height_cm'))
        }),
        ('Dangerous Goods Information', {
            'fields': ('is_dangerous_good', 'un_number', 'proper_shipping_name', 'hazard_class', 'packing_group'),
            'classes': ('collapse',), # Make this section collapsible
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
