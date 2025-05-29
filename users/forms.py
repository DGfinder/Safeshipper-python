# users/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User # Make sure your custom User model is imported

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        # UserCreationForm.Meta.fields is typically ('username',)
        # Password fields are handled by the form's structure, not listed in Meta.fields.
        # Explicitly list all fields you want on the creation form.
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'depot', 'area')

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        # Explicitly list all fields you want on the change form for clarity and control.
        # This list includes standard fields from UserChangeForm plus your custom ones.
        fields = ('username', 'email', 'first_name', 'last_name', 
                  'role', 'depot', 'area', 
                  'is_active', 'is_staff', 'is_superuser', 
                  'groups', 'user_permissions') 
                  # 'last_login' and 'date_joined' are typically read-only in admin
                  # and handled by UserAdmin directly if shown.
