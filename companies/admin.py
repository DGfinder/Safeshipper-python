# companies/admin.py
from django.contrib import admin
from .models import Company, CompanyRelationship

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'company_type', 'abn', 'is_active', 'created_at')
    search_fields = ('name', 'abn') # Ensure search_fields is present
    list_filter = ('company_type', 'is_active')
    ordering = ('name',)
    fieldsets = (
        (None, {'fields': ('name', 'company_type', 'abn', 'is_active')}),
        ('Contact Information', {'fields': ('contact_info',), 'classes': ('collapse',)}),
    )

@admin.register(CompanyRelationship)
class CompanyRelationshipAdmin(admin.ModelAdmin):
    list_display = ('source_company', 'relationship_type', 'target_company', 'is_active', 'created_at')
    search_fields = ('source_company__name', 'target_company__name')
    list_filter = ('relationship_type', 'is_active')
    autocomplete_fields = ['source_company', 'target_company']
    ordering = ('source_company__name', 'target_company__name')
