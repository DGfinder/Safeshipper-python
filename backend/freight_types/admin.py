# freight_types/admin.py
from django.contrib import admin
from .models import FreightType

@admin.register(FreightType)
class FreightTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'is_dg_category', 'requires_special_handling', 'created_at')
    search_fields = ('code', 'description') # Ensure search_fields
    list_filter = ('is_dg_category', 'requires_special_handling')
    ordering = ('description',)
