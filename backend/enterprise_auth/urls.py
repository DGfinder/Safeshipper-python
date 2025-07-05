# enterprise_auth/urls.py
from django.urls import path, include
from . import views

app_name = 'enterprise_auth'

urlpatterns = [
    # SSO endpoints
    path('sso/providers/', views.sso_providers, name='sso-providers'),
    path('sso/google/', views.GoogleLogin.as_view(), name='google-login'),
    path('sso/microsoft/', views.MicrosoftLogin.as_view(), name='microsoft-login'),
    
    # MFA endpoints
    path('mfa/enroll/', views.enroll_mfa, name='mfa-enroll'),
    path('mfa/verify/', views.verify_mfa, name='mfa-verify'),
    path('mfa/devices/', views.mfa_devices, name='mfa-devices'),
    path('mfa/challenge/', views.mfa_challenge, name='mfa-challenge'),
    path('mfa/verify-login/', views.mfa_verify, name='mfa-verify-login'),
    
    # Include allauth URLs for SSO callbacks
    path('accounts/', include('allauth.urls')),
]