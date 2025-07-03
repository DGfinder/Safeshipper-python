# dangerous_goods/admin.py
from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule

@admin.register(DangerousGood)
class DangerousGoodAdmin(SimpleHistoryAdmin):
    list_display = (
        'un_number', 
        'proper_shipping_name', 
        'hazard_class', 
        'packing_group', 
        'subsidiary_risks',
        'erg_guide_number',
        'is_marine_pollutant',
        'is_environmentally_hazardous',
        'updated_at'
    )
    search_fields = ('un_number', 'proper_shipping_name', 'simplified_name', 'hazard_class')
    list_filter = ('hazard_class', 'packing_group', 'is_marine_pollutant', 'is_environmentally_hazardous')
    ordering = ('un_number',)
    fieldsets = (
        ('Primary Identification', {
            'fields': ('un_number', 'proper_shipping_name', 'simplified_name')
        }),
        ('Hazard Information', {
            'fields': ('hazard_class', 'subsidiary_risks', 'packing_group', 'hazard_labels_required', 'erg_guide_number')
        }),
        ('Regulatory Information', {
            'fields': ('special_provisions', 'is_marine_pollutant', 'is_environmentally_hazardous', 'description_notes')
        }),
        ('Quantity & Packing (Aircraft - Example)', {
            'fields': (('qty_ltd_passenger_aircraft', 'packing_instruction_passenger_aircraft'), 
                       ('qty_ltd_cargo_aircraft', 'packing_instruction_cargo_aircraft')),
            'classes': ('collapse',) # Make this section collapsible
        }),
    )
    # If you had many synonyms, an inline might be too much, but for a few it's okay.
    # Consider a separate admin for DGProductSynonym if it becomes too cluttered.
    # inlines = [DGProductSynonymInline] # Define DGProductSynonymInline if needed

@admin.register(DGProductSynonym)
class DGProductSynonymAdmin(admin.ModelAdmin):
    list_display = ('synonym', 'dangerous_good_link', 'source')
    search_fields = ('synonym', 'dangerous_good__un_number', 'dangerous_good__proper_shipping_name')
    list_filter = ('source', 'dangerous_good__hazard_class')
    autocomplete_fields = ['dangerous_good'] # Makes selecting the DG easier if you have many
    ordering = ('dangerous_good__un_number', 'synonym')

    def dangerous_good_link(self, obj):
        from django.urls import reverse
        from django.utils.html import format_html
        if obj.dangerous_good:
            link = reverse("admin:dangerous_goods_dangerousgood_change", args=[obj.dangerous_good.id])
            return format_html('<a href="{}">{}</a>', link, obj.dangerous_good)
        return None
    dangerous_good_link.short_description = 'Dangerous Good'


@admin.register(SegregationGroup)
class SegregationGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'description_summary')
    search_fields = ('name', 'code')
    filter_horizontal = ('dangerous_goods',) # Better UI for ManyToManyFields

    def description_summary(self, obj):
        return obj.description[:75] + "..." if obj.description and len(obj.description) > 75 else obj.description
    description_summary.short_description = 'Description'

@admin.register(SegregationRule)
class SegregationRuleAdmin(admin.ModelAdmin):
    list_display = ('id', 'rule_type', 'primary_hazard_class_display', 'secondary_hazard_class_display', 'primary_segregation_group', 'secondary_segregation_group', 'compatibility_status')
    list_filter = ('rule_type', 'compatibility_status', 'primary_hazard_class', 'secondary_hazard_class', 'primary_segregation_group')
    search_fields = ('primary_hazard_class', 'secondary_hazard_class', 'primary_segregation_group__name', 'secondary_segregation_group__name', 'notes')
    autocomplete_fields = ['primary_segregation_group', 'secondary_segregation_group']
    fieldsets = (
        (None, {'fields': ('rule_type', 'compatibility_status', 'notes')}),
        ('Class-Based Rule (if applicable)', {'fields': ('primary_hazard_class', 'secondary_hazard_class')}),
        ('Group-Based Rule (if applicable)', {'fields': ('primary_segregation_group', 'secondary_segregation_group')}),
    )

    def primary_hazard_class_display(self, obj):
        return obj.primary_hazard_class or "N/A"
    primary_hazard_class_display.short_description = "Primary Class"

    def secondary_hazard_class_display(self, obj):
        return obj.secondary_hazard_class or "N/A"
    secondary_hazard_class_display.short_description = "Secondary Class"

