# users/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User # Make sure your custom User model is imported

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        # Ensure all fields listed here exist on your User model
        # Replaced 'area' with 'region'. Added 'logistics_model' and 'company'.
        fields = ('username', 'email', 'first_name', 'last_name', 
                  'role', 'logistics_model', 'company')

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        # Ensure all fields listed here exist on your User model
        # Replaced 'area' with 'region'. Added 'logistics_model' and 'company'.
        fields = ('username', 'email', 'first_name', 'last_name', 
                  'role', 'logistics_model', 'company',
                  'is_active', 'is_staff', 
                  # 'is_superuser', # Usually managed separately
                  'groups', 'user_permissions')
