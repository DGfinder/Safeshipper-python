# users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from .forms import CustomUserCreationForm, CustomUserChangeForm 

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff',
                    'role', 'company', 'logistics_model', 'is_active')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'role', 'company', 'logistics_model')
    
    search_fields = BaseUserAdmin.search_fields + ('role', 'depot__name', 'region__name', 'company__name')

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role, Company & Location Context', {'fields': ('role', 'company', 'depot', 'region', 'logistics_model')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 
                       'role', 'company', 'logistics_model', 
                       'is_staff', 'is_active'),
        }),
    )
    
    ordering = ('username',)
    # Use filter_horizontal for groups and user_permissions, which is standard for UserAdmin.
    # Remove them from autocomplete_fields if they cause issues with default Permission admin.
    filter_horizontal = ('groups', 'user_permissions',)
    autocomplete_fields = ['company'] 
