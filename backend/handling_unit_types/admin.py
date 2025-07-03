# handling_unit_types/admin.py
from django.contrib import admin
from .models import HandlingUnitType

@admin.register(HandlingUnitType)
class HandlingUnitTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'nominal_volume_liters', 'nominal_weight_kg', 'is_stackable', 'created_at')
    search_fields = ('code', 'description')
    list_filter = ('is_stackable',)
    ordering = ('description',)
