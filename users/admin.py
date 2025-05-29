# users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from .forms import CustomUserCreationForm, CustomUserChangeForm # We'll define these next

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Use our custom forms for creating and changing users in the admin
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    # Add custom fields to the display, search, and filter options
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'role', 'depot', 'area')
    list_filter = BaseUserAdmin.list_filter + ('role', 'depot', 'area', 'is_staff', 'is_superuser', 'is_active')
    
    search_fields = BaseUserAdmin.search_fields + ('role', 'depot', 'area')

    # Customize the fields displayed in the add/change forms
    # This adds your custom fields to the existing UserAdmin fieldsets
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role and Location', {'fields': ('role', 'depot', 'area')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {'fields': ('role', 'depot', 'area')}),
    )
    
    # If you want to make certain fields editable in the list display
    # list_editable = ('role', 'depot', 'area') # Use with caution

    ordering = ('username',)
