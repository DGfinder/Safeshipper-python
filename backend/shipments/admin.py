# shipments/admin.py
from django.contrib import admin
from .models import Shipment, ConsignmentItem, ShipmentStatus # ShipmentStatus is used by model
from simple_history.admin import SimpleHistoryAdmin

@admin.action(description="Mark selected shipments as IN_TRANSIT")
def mark_in_transit(modeladmin, request, queryset):
    queryset.update(status=Shipment.ShipmentStatus.IN_TRANSIT)

@admin.action(description="Mark selected shipments as DELIVERED")
def mark_delivered(modeladmin, request, queryset):
    queryset.update(status=Shipment.ShipmentStatus.DELIVERED)

class ConsignmentItemInline(admin.TabularInline):
    model = ConsignmentItem
    extra = 1 
    fields = ('description', 'quantity', 'weight_kg', 
              'length_cm', 'width_cm', 'height_cm', 
              'is_dangerous_good', 'dangerous_good_entry') # Changed from specific DG fields to the FK
    autocomplete_fields = ['dangerous_good_entry'] # Good for selecting from many DGs

@admin.register(Shipment)
class ShipmentAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'reference_number', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('reference_number', 'id')
    readonly_fields = ('created_at', 'updated_at')
    history_list_display = ['status', 'reference_number']  # Fields to show in history view
    
    fieldsets = (
        (None, {
            'fields': ('reference_number', 'status', ('customer', 'carrier'), 'freight_type')
        }),
        ('Dates & Times', { # Changed names here to match model
            'fields': (('estimated_pickup_date', 'actual_pickup_date'), ('estimated_delivery_date', 'actual_delivery_date'))
        }),
        ('Weight & Pricing', { # Added based on new model fields
            'fields': (('dead_weight_kg', 'volumetric_weight_m3', 'chargeable_weight_kg'), ('contract_type', 'pricing_basis')),
            'classes': ('collapse',)
        }),
        ('Instructions', {
            'fields': ('instructions',),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('tracking_number', 'created_at', 'updated_at', 'requested_by'), # Added requested_by
            'classes': ('collapse',), 
        }),
    )
    inlines = [ConsignmentItemInline]
    autocomplete_fields = ['customer', 'carrier', 'freight_type', 'requested_by']


    def origin_address_summary(self, obj):
        return obj.origin_location.name if obj.origin_location else "N/A" # Assuming GeoLocation has a name
    origin_address_summary.short_description = "Origin"

    

@admin.register(ConsignmentItem)
class ConsignmentItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'shipment_info', 'description_summary', 'quantity', 
                    'weight_kg', 'is_dangerous_good', 
                    'get_un_number', 'get_hazard_class') # Changed to methods
    list_filter = ('is_dangerous_good', 'shipment__status', 'dangerous_good_entry__hazard_class') # Filter by linked DG's class
    search_fields = ('description', 'dangerous_good_entry__un_number', 'dangerous_good_entry__proper_shipping_name', 'shipment__tracking_number')
    ordering = ('-shipment__created_at', 'shipment__id', 'id')
    list_select_related = ['shipment', 'dangerous_good_entry'] 
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ['shipment', 'dangerous_good_entry']


    fieldsets = (
        ('Association', {'fields': ('shipment',)}),
        ('Item Details', {'fields': ('description', 'quantity', 'weight_kg', ('length_cm', 'width_cm', 'height_cm'))}),
        ('Dangerous Goods Information', {
            'fields': ('is_dangerous_good', 'dangerous_good_entry'), # Link to master DG entry
            'classes': ('collapse',),
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def shipment_info(self, obj):
        return obj.shipment.tracking_number if obj.shipment else "N/A"
    shipment_info.short_description = "Shipment Tracking #"
    shipment_info.admin_order_field = 'shipment__tracking_number'

    def description_summary(self, obj):
        return obj.description[:75] + '...' if len(obj.description) > 75 else obj.description
    description_summary.short_description = "Description"

    @admin.display(description='UN Number', ordering='dangerous_good_entry__un_number')
    def get_un_number(self, obj):
        return obj.dangerous_good_entry.un_number if obj.dangerous_good_entry else None
    
    @admin.display(description='Hazard Class', ordering='dangerous_good_entry__hazard_class')
    def get_hazard_class(self, obj):
        return obj.dangerous_good_entry.hazard_class if obj.dangerous_good_entry else None

