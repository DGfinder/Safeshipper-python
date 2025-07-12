from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    Vehicle, SafetyEquipmentType, VehicleSafetyEquipment,
    SafetyEquipmentInspection, SafetyEquipmentCertification
)

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


@admin.register(SafetyEquipmentType)
class SafetyEquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'minimum_capacity', 'certification_standard', 
                   'inspection_interval_months', 'is_active')
    list_filter = ('category', 'is_active', 'has_expiry_date', 'required_by_vehicle_weight')
    search_fields = ('name', 'description', 'certification_standard')
    ordering = ('category', 'name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'description', 'is_active')
        }),
        ('ADR Requirements', {
            'fields': ('required_for_adr_classes', 'required_by_vehicle_weight')
        }),
        ('Specifications', {
            'fields': ('minimum_capacity', 'certification_standard')
        }),
        ('Lifecycle Management', {
            'fields': ('has_expiry_date', 'inspection_interval_months', 
                      'replacement_interval_months')
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class SafetyEquipmentInspectionInline(admin.TabularInline):
    model = SafetyEquipmentInspection
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('inspection_type', 'inspection_date', 'inspector', 'result', 
             'next_inspection_due', 'maintenance_completed', 'created_at')


class SafetyEquipmentCertificationInline(admin.TabularInline):
    model = SafetyEquipmentCertification
    extra = 0
    readonly_fields = ('is_valid', 'created_at')
    fields = ('certification_type', 'certificate_number', 'issuing_authority',
             'issue_date', 'expiry_date', 'is_valid', 'created_at')


@admin.register(VehicleSafetyEquipment)
class VehicleSafetyEquipmentAdmin(admin.ModelAdmin):
    list_display = ('vehicle_link', 'equipment_type', 'serial_number', 'capacity',
                   'status', 'expiry_date', 'compliance_status', 'installation_date')
    list_filter = ('status', 'equipment_type__category', 'equipment_type',
                   'expiry_date', 'next_inspection_date')
    search_fields = ('vehicle__registration_number', 'equipment_type__name',
                    'serial_number', 'manufacturer', 'model')
    ordering = ('-installation_date',)
    readonly_fields = ('id', 'is_expired', 'inspection_overdue', 'is_compliant',
                      'created_at', 'updated_at')
    autocomplete_fields = ['vehicle', 'equipment_type']
    inlines = [SafetyEquipmentInspectionInline, SafetyEquipmentCertificationInline]
    
    fieldsets = (
        ('Equipment Details', {
            'fields': ('vehicle', 'equipment_type', 'serial_number',
                      'manufacturer', 'model', 'capacity')
        }),
        ('Installation & Lifecycle', {
            'fields': ('installation_date', 'expiry_date', 'status',
                      'location_on_vehicle')
        }),
        ('Inspection Status', {
            'fields': ('last_inspection_date', 'next_inspection_date')
        }),
        ('Compliance', {
            'fields': ('certification_number', 'compliance_notes',
                      'is_expired', 'inspection_overdue', 'is_compliant')
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def vehicle_link(self, obj):
        """Create a link to the vehicle admin page"""
        url = reverse('admin:vehicles_vehicle_change', args=[obj.vehicle.pk])
        return format_html('<a href="{}">{}</a>', url, obj.vehicle.registration_number)
    vehicle_link.short_description = 'Vehicle'
    
    def compliance_status(self, obj):
        """Show compliance status with color coding"""
        if obj.is_compliant:
            return format_html('<span style="color: green;">✓ Compliant</span>')
        elif obj.is_expired:
            return format_html('<span style="color: red;">✗ Expired</span>')
        elif obj.inspection_overdue:
            return format_html('<span style="color: orange;">⚠ Inspection Due</span>')
        else:
            return format_html('<span style="color: gray;">— Unknown</span>')
    compliance_status.short_description = 'Compliance'


@admin.register(SafetyEquipmentInspection)
class SafetyEquipmentInspectionAdmin(admin.ModelAdmin):
    list_display = ('equipment_link', 'inspection_type', 'inspection_date',
                   'inspector', 'result', 'next_inspection_due', 'maintenance_completed')
    list_filter = ('inspection_type', 'result', 'maintenance_completed',
                   'inspection_date', 'equipment__equipment_type__category')
    search_fields = ('equipment__vehicle__registration_number',
                    'equipment__equipment_type__name', 'equipment__serial_number',
                    'inspector__username', 'inspector__first_name', 'inspector__last_name')
    ordering = ('-inspection_date',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ['equipment', 'inspector']
    
    fieldsets = (
        ('Inspection Details', {
            'fields': ('equipment', 'inspection_type', 'inspection_date', 'inspector')
        }),
        ('Results', {
            'fields': ('result', 'findings', 'actions_required')
        }),
        ('Follow-up', {
            'fields': ('next_inspection_due', 'maintenance_completed')
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def equipment_link(self, obj):
        """Create a link to the equipment admin page"""
        url = reverse('admin:vehicles_vehiclesafetyequipment_change', args=[obj.equipment.pk])
        return format_html('<a href="{}">{} - {}</a>', 
                          url, obj.equipment.vehicle.registration_number, 
                          obj.equipment.equipment_type.name)
    equipment_link.short_description = 'Equipment'


@admin.register(SafetyEquipmentCertification)
class SafetyEquipmentCertificationAdmin(admin.ModelAdmin):
    list_display = ('equipment_link', 'certification_type', 'certificate_number',
                   'issuing_authority', 'issue_date', 'expiry_date', 'validity_status')
    list_filter = ('certification_type', 'issuing_authority', 'issue_date', 'expiry_date')
    search_fields = ('equipment__vehicle__registration_number',
                    'equipment__equipment_type__name', 'certificate_number',
                    'issuing_authority', 'standard_reference')
    ordering = ('-issue_date',)
    readonly_fields = ('id', 'is_valid', 'created_at', 'updated_at')
    autocomplete_fields = ['equipment']
    
    fieldsets = (
        ('Certification Details', {
            'fields': ('equipment', 'certification_type', 'certificate_number',
                      'issuing_authority', 'standard_reference')
        }),
        ('Validity', {
            'fields': ('issue_date', 'expiry_date', 'is_valid')
        }),
        ('Documentation', {
            'fields': ('document_file', 'notes')
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def equipment_link(self, obj):
        """Create a link to the equipment admin page"""
        url = reverse('admin:vehicles_vehiclesafetyequipment_change', args=[obj.equipment.pk])
        return format_html('<a href="{}">{} - {}</a>', 
                          url, obj.equipment.vehicle.registration_number, 
                          obj.equipment.equipment_type.name)
    equipment_link.short_description = 'Equipment'
    
    def validity_status(self, obj):
        """Show certification validity with color coding"""
        if obj.is_valid:
            return format_html('<span style="color: green;">✓ Valid</span>')
        else:
            return format_html('<span style="color: red;">✗ Expired</span>')
    validity_status.short_description = 'Status'
