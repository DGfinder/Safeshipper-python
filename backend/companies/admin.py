# companies/admin.py
from django.contrib import admin
from .models import Company, CompanyRelationship

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'company_type', 'registration_number', 'status', 'created_at')
    search_fields = ('name', 'registration_number') # Ensure search_fields is present
    list_filter = ('company_type', 'status')
    ordering = ('name',)
    fieldsets = (
        (None, {'fields': ('name', 'company_type', 'registration_number', 'status')}),
        ('Contact Information', {'fields': ('contact_info',), 'classes': ('collapse',)}),
    )

@admin.register(CompanyRelationship)
class CompanyRelationshipAdmin(admin.ModelAdmin):
    list_display = ('company_a', 'relationship_type', 'company_b', 'status', 'created_at')
    search_fields = ('company_a__name', 'company_b__name')
    list_filter = ('relationship_type', 'status')
    autocomplete_fields = ['company_a', 'company_b']
    ordering = ('company_a__name', 'company_b__name')
