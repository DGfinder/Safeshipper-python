from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    DeviceType, IoTDevice, SensorData, DeviceAlert,
    DeviceCommand, DeviceGroup
)


@admin.register(DeviceType)
class DeviceTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'manufacturer', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'manufacturer', 'model_number']
    ordering = ['category', 'name']


class SensorDataInline(admin.TabularInline):
    model = SensorData
    extra = 0
    readonly_fields = ['timestamp', 'received_at']
    ordering = ['-timestamp']
    
    def get_queryset(self, request):
        # Limit to recent data to avoid performance issues
        return super().get_queryset(request)[:10]


class DeviceAlertInline(admin.TabularInline):
    model = DeviceAlert
    extra = 0
    readonly_fields = ['triggered_at', 'created_at']
    ordering = ['-triggered_at']


class DeviceCommandInline(admin.TabularInline):
    model = DeviceCommand
    extra = 0
    readonly_fields = ['created_at', 'sent_at', 'executed_at']
    ordering = ['-created_at']


@admin.register(IoTDevice)
class IoTDeviceAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'device_id', 'device_type', 'status', 'last_seen',
        'battery_level', 'is_online', 'location'
    ]
    list_filter = [
        'status', 'device_type', 'last_seen', 'assigned_to'
    ]
    search_fields = ['name', 'device_id', 'serial_number', 'location']
    readonly_fields = [
        'api_key', 'api_secret', 'is_online', 'created_at', 'updated_at'
    ]
    ordering = ['-last_seen']
    date_hierarchy = 'last_seen'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'device_id', 'device_type', 'status')
        }),
        ('Authentication', {
            'fields': ('api_key', 'api_secret'),
            'classes': ('collapse',)
        }),
        ('Location & Assignment', {
            'fields': ('location', 'coordinates', 'assigned_to')
        }),
        ('Hardware Information', {
            'fields': ('serial_number', 'firmware_version', 'hardware_version')
        }),
        ('Status & Health', {
            'fields': ('last_seen', 'battery_level', 'signal_strength', 'is_online')
        }),
        ('Configuration', {
            'fields': ('configuration', 'reporting_interval')
        }),
        ('Relationships', {
            'fields': ('shipment', 'vehicle')
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [DeviceAlertInline, DeviceCommandInline]
    
    def is_online(self, obj):
        if obj.is_online:
            return format_html('<span style="color: green;">●</span> Online')
        return format_html('<span style="color: red;">●</span> Offline')
    is_online.short_description = 'Status'
    
    def battery_level(self, obj):
        if obj.battery_level is not None:
            if obj.battery_level < 20:
                color = 'red'
            elif obj.battery_level < 50:
                color = 'orange'
            else:
                color = 'green'
            return format_html(
                '<span style="color: {};">{} %</span>',
                color, obj.battery_level
            )
        return '-'
    battery_level.short_description = 'Battery'
    
    actions = ['update_device_status', 'send_ping_command']
    
    def update_device_status(self, request, queryset):
        """Update device status for selected devices"""
        for device in queryset:
            device.update_status()
        self.message_user(request, f"Updated status for {queryset.count()} devices.")
    update_device_status.short_description = "Update device status"
    
    def send_ping_command(self, request, queryset):
        """Send ping command to selected devices"""
        from .models import DeviceCommand
        
        commands_created = 0
        for device in queryset:
            DeviceCommand.objects.create(
                device=device,
                command_type='ping',
                command_data={},
                sent_by=request.user
            )
            commands_created += 1
        
        self.message_user(request, f"Sent ping command to {commands_created} devices.")
    send_ping_command.short_description = "Send ping command"


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = [
        'device', 'sensor_type', 'value', 'unit', 'quality_score',
        'is_anomaly', 'timestamp'
    ]
    list_filter = [
        'sensor_type', 'is_anomaly', 'timestamp', 'device__device_type'
    ]
    search_fields = ['device__name', 'device__device_id']
    readonly_fields = ['received_at']
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('device')


@admin.register(DeviceAlert)
class DeviceAlertAdmin(admin.ModelAdmin):
    list_display = [
        'device', 'alert_type', 'severity', 'title', 'status',
        'triggered_at', 'acknowledged_by'
    ]
    list_filter = [
        'severity', 'status', 'alert_type', 'triggered_at'
    ]
    search_fields = ['device__name', 'title', 'description']
    readonly_fields = ['triggered_at', 'created_at']
    ordering = ['-triggered_at']
    date_hierarchy = 'triggered_at'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'device', 'acknowledged_by'
        )
    
    actions = ['acknowledge_alerts', 'resolve_alerts']
    
    def acknowledge_alerts(self, request, queryset):
        """Acknowledge selected alerts"""
        from django.utils import timezone
        
        count = queryset.filter(status='active').update(
            status='acknowledged',
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        self.message_user(request, f"Acknowledged {count} alerts.")
    acknowledge_alerts.short_description = "Acknowledge selected alerts"
    
    def resolve_alerts(self, request, queryset):
        """Resolve selected alerts"""
        from django.utils import timezone
        
        count = queryset.exclude(status='resolved').update(
            status='resolved',
            resolved_at=timezone.now()
        )
        self.message_user(request, f"Resolved {count} alerts.")
    resolve_alerts.short_description = "Resolve selected alerts"


@admin.register(DeviceCommand)
class DeviceCommandAdmin(admin.ModelAdmin):
    list_display = [
        'device', 'command_type', 'status', 'sent_by',
        'created_at', 'executed_at'
    ]
    list_filter = ['status', 'command_type', 'created_at']
    search_fields = ['device__name', 'device__device_id', 'command_type']
    readonly_fields = ['created_at', 'sent_at', 'acknowledged_at', 'executed_at']
    ordering = ['-created_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'device', 'sent_by'
        )


@admin.register(DeviceGroup)
class DeviceGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'device_count', 'online_device_count', 'managed_by']
    search_fields = ['name', 'description']
    filter_horizontal = ['devices']
    
    def device_count(self, obj):
        return obj.device_count
    device_count.short_description = 'Total Devices'
    
    def online_device_count(self, obj):
        count = obj.online_device_count
        total = obj.device_count
        if total > 0:
            percentage = (count / total) * 100
            if percentage >= 80:
                color = 'green'
            elif percentage >= 50:
                color = 'orange'
            else:
                color = 'red'
            return format_html(
                '<span style="color: {};">{}/{} ({}%)</span>',
                color, count, total, round(percentage)
            )
        return '0/0'
    online_device_count.short_description = 'Online Devices'