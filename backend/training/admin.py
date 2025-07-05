from django.contrib import admin
from django.utils.html import format_html
from .models import (
    TrainingCategory, TrainingProgram, TrainingSession, 
    TrainingEnrollment, TrainingRecord, ComplianceRequirement,
    ComplianceStatus
)


@admin.register(TrainingCategory)
class TrainingCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_mandatory', 'renewal_period_months']
    list_filter = ['is_mandatory']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(TrainingProgram)
class TrainingProgramAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'category', 'delivery_method', 'difficulty_level',
        'duration_hours', 'is_mandatory', 'is_active'
    ]
    list_filter = [
        'category', 'delivery_method', 'difficulty_level',
        'is_mandatory', 'compliance_required', 'is_active'
    ]
    search_fields = ['name', 'description', 'learning_objectives']
    ordering = ['category', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'category', 'delivery_method', 'difficulty_level')
        }),
        ('Duration & Requirements', {
            'fields': ('duration_hours', 'prerequisites', 'instructor')
        }),
        ('Content', {
            'fields': ('learning_objectives', 'content_outline', 'materials_url')
        }),
        ('Compliance', {
            'fields': ('is_mandatory', 'compliance_required', 'passing_score')
        }),
        ('Certificate', {
            'fields': ('certificate_validity_months',)
        }),
        ('Status', {
            'fields': ('is_active',)
        })
    )
    
    filter_horizontal = ['prerequisites']


class TrainingEnrollmentInline(admin.TabularInline):
    model = TrainingEnrollment
    extra = 0
    readonly_fields = ['enrolled_at', 'completed_at']


@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = [
        'session_name', 'program', 'instructor', 'scheduled_date',
        'enrolled_count', 'max_participants', 'status'
    ]
    list_filter = ['status', 'scheduled_date', 'program__category']
    search_fields = ['session_name', 'program__name', 'instructor__username']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-scheduled_date']
    date_hierarchy = 'scheduled_date'
    
    inlines = [TrainingEnrollmentInline]
    
    def enrolled_count(self, obj):
        return obj.enrolled_count
    enrolled_count.short_description = 'Enrolled'


@admin.register(TrainingEnrollment)
class TrainingEnrollmentAdmin(admin.ModelAdmin):
    list_display = [
        'employee', 'session', 'status', 'enrolled_at', 
        'completed_at', 'score', 'passed'
    ]
    list_filter = ['status', 'passed', 'enrolled_at', 'completed_at']
    search_fields = ['employee__username', 'session__program__name']
    readonly_fields = ['enrolled_at', 'completed_at']
    ordering = ['-enrolled_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'employee', 'session', 'session__program'
        )


@admin.register(TrainingRecord)
class TrainingRecordAdmin(admin.ModelAdmin):
    list_display = [
        'employee', 'program', 'certificate_number', 'score',
        'certificate_issued_at', 'certificate_expires_at', 'status'
    ]
    list_filter = ['status', 'passed', 'certificate_issued_at', 'certificate_expires_at']
    search_fields = ['employee__username', 'program__name', 'certificate_number']
    readonly_fields = ['certificate_number', 'certificate_issued_at']
    ordering = ['-certificate_issued_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'employee', 'program', 'enrollment'
        )


@admin.register(ComplianceRequirement)
class ComplianceRequirementAdmin(admin.ModelAdmin):
    list_display = ['name', 'deadline_days', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    ordering = ['name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description')
        }),
        ('Applicability', {
            'fields': ('applicable_roles', 'applicable_departments')
        }),
        ('Requirements', {
            'fields': ('required_programs', 'deadline_days')
        }),
        ('Status', {
            'fields': ('is_active',)
        })
    )
    
    filter_horizontal = ['required_programs']


@admin.register(ComplianceStatus)
class ComplianceStatusAdmin(admin.ModelAdmin):
    list_display = ['employee', 'requirement', 'status', 'due_date', 'last_checked']
    list_filter = ['status', 'due_date', 'last_checked']
    search_fields = ['employee__username', 'requirement__name']
    readonly_fields = ['last_checked']
    ordering = ['due_date']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'employee', 'requirement'
        )
    
    actions = ['check_compliance']
    
    def check_compliance(self, request, queryset):
        """Check compliance for selected records"""
        for status in queryset:
            status.check_compliance()
        self.message_user(request, f"Compliance checked for {queryset.count()} records.")
    check_compliance.short_description = "Check compliance status"