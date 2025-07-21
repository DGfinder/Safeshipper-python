"""
Django admin configuration for tracking models with spatial indexing insights.
"""

from django.contrib import admin
from django.contrib.gis import admin as gis_admin
from django.db import connection
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import GPSEvent, LocationVisit


@admin.register(GPSEvent)
class GPSEventAdmin(gis_admin.OSMGeoAdmin):
    """
    Admin interface for GPS events with spatial visualization.
    """
    list_display = ['vehicle', 'timestamp', 'latitude', 'longitude', 'speed', 'accuracy', 'source']
    list_filter = ['source', 'timestamp', 'vehicle__owning_company']
    search_fields = ['vehicle__registration_number', 'vehicle__owning_company__name']
    readonly_fields = ['coordinates', 'created_at', 'raw_data']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Location Data', {
            'fields': ('vehicle', 'shipment', 'latitude', 'longitude', 'coordinates')
        }),
        ('Movement Data', {
            'fields': ('speed', 'heading', 'accuracy', 'battery_level', 'signal_strength')
        }),
        ('Metadata', {
            'fields': ('timestamp', 'created_at', 'source', 'raw_data'),
            'classes': ('collapse',)
        }),
    )
    
    # Spatial visualization
    default_lon = 151.2093  # Sydney longitude
    default_lat = -33.8688  # Sydney latitude
    default_zoom = 10
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related(
            'vehicle', 'vehicle__owning_company', 'shipment'
        )
    
    def changelist_view(self, request, extra_context=None):
        """Add spatial indexing performance info to changelist."""
        extra_context = extra_context or {}
        
        # Get index usage statistics
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        indexname, 
                        idx_scan,
                        idx_tup_read,
                        idx_tup_fetch,
                        pg_size_pretty(pg_relation_size(indexrelid)) as size
                    FROM pg_stat_user_indexes 
                    WHERE relname = 'tracking_gpsevent' 
                    AND (indexname LIKE '%spatial%' OR indexname LIKE '%gist%' OR indexname LIKE '%brin%')
                    ORDER BY idx_scan DESC
                    LIMIT 5
                """)
                
                index_stats = cursor.fetchall()
                extra_context['spatial_index_stats'] = index_stats
        except:
            extra_context['spatial_index_stats'] = []
        
        return super().changelist_view(request, extra_context)


@admin.register(LocationVisit)
class LocationVisitAdmin(admin.ModelAdmin):
    """
    Admin interface for location visits with duration calculations.
    """
    list_display = ['location', 'vehicle', 'entry_time', 'exit_time', 'duration_display', 'status']
    list_filter = ['status', 'location__location_type', 'entry_time']
    search_fields = ['location__name', 'vehicle__registration_number']
    readonly_fields = ['duration_hours', 'created_at', 'updated_at']
    date_hierarchy = 'entry_time'
    
    fieldsets = (
        ('Visit Details', {
            'fields': ('location', 'vehicle', 'shipment')
        }),
        ('Timing', {
            'fields': ('entry_time', 'exit_time', 'duration_hours')
        }),
        ('Events', {
            'fields': ('entry_event', 'exit_event'),
            'classes': ('collapse',)
        }),
        ('Billing', {
            'fields': ('demurrage_hours', 'demurrage_charge'),
            'classes': ('collapse',)
        }),
        ('Status & Notes', {
            'fields': ('status', 'notes', 'created_at', 'updated_at')
        }),
    )
    
    def duration_display(self, obj):
        """Display visit duration in a friendly format."""
        if obj.duration_hours:
            hours = int(obj.duration_hours)
            minutes = int((obj.duration_hours - hours) * 60)
            
            if hours > 0:
                return f"{hours}h {minutes}m"
            else:
                return f"{minutes}m"
        elif obj.is_active:
            return mark_safe('<span style="color: green;">Active</span>')
        else:
            return "Unknown"
    
    duration_display.short_description = "Duration"
    
    def get_queryset(self, request):
        """Optimize queryset."""
        return super().get_queryset(request).select_related(
            'location', 'vehicle', 'shipment', 'entry_event', 'exit_event'
        )
