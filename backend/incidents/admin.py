from django.contrib import admin
from django.utils.html import format_html
from .models import (
    IncidentType, Incident, IncidentDocument, 
    IncidentUpdate, CorrectiveAction
)


@admin.register(IncidentType)
class IncidentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'severity', 'is_active']
    list_filter = ['category', 'severity', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['category', 'name']


class IncidentDocumentInline(admin.TabularInline):
    model = IncidentDocument
    extra = 0
    readonly_fields = ['uploaded_at', 'uploaded_by']


class IncidentUpdateInline(admin.TabularInline):
    model = IncidentUpdate
    extra = 0
    readonly_fields = ['created_at', 'created_by']


class CorrectiveActionInline(admin.TabularInline):
    model = CorrectiveAction
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = [
        'incident_number', 'title', 'incident_type', 'status', 
        'priority', 'occurred_at', 'reporter'
    ]
    list_filter = [
        'status', 'priority', 'incident_type', 'occurred_at', 
        'environmental_impact'
    ]
    search_fields = ['incident_number', 'title', 'description', 'location']
    readonly_fields = ['incident_number', 'created_at', 'updated_at']
    ordering = ['-occurred_at']
    date_hierarchy = 'occurred_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('incident_number', 'title', 'description', 'incident_type')
        }),
        ('Location & Timing', {
            'fields': ('location', 'coordinates', 'occurred_at', 'reported_at')
        }),
        ('People Involved', {
            'fields': ('reporter', 'assigned_to', 'witnesses')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority')
        }),
        ('Impact Assessment', {
            'fields': ('injuries_count', 'property_damage_estimate', 'environmental_impact')
        }),
        ('Resolution', {
            'fields': ('resolution_notes', 'resolved_at', 'closed_at')
        }),
        ('Related Entities', {
            'fields': ('shipment', 'vehicle')
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [IncidentDocumentInline, IncidentUpdateInline, CorrectiveActionInline]
    
    def save_model(self, request, obj, form, change):
        if not change:  # New incident
            obj.reporter = request.user
        super().save_model(request, obj, form, change)


@admin.register(IncidentDocument)
class IncidentDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'incident', 'document_type', 'uploaded_by', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['title', 'description', 'incident__incident_number']
    readonly_fields = ['uploaded_at', 'uploaded_by']
    
    def save_model(self, request, obj, form, change):
        if not change:  # New document
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(IncidentUpdate)
class IncidentUpdateAdmin(admin.ModelAdmin):
    list_display = ['incident', 'update_type', 'created_by', 'created_at']
    list_filter = ['update_type', 'created_at']
    search_fields = ['incident__incident_number', 'description']
    readonly_fields = ['created_at', 'created_by']
    
    def save_model(self, request, obj, form, change):
        if not change:  # New update
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CorrectiveAction)
class CorrectiveActionAdmin(admin.ModelAdmin):
    list_display = ['title', 'incident', 'assigned_to', 'status', 'due_date', 'completed_at']
    list_filter = ['status', 'due_date', 'completed_at']
    search_fields = ['title', 'description', 'incident__incident_number']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('incident', 'assigned_to')