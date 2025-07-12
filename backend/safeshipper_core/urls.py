"""
URL configuration for safeshipper_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from health_check.views import MainView

# safeshipper_core/urls.py
# ... other imports ...
urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Health Checks
    path('health/', MainView.as_view(), name='health_check'),
    
    # Monitoring
    path('', include('django_prometheus.urls')),
    
    # Application URLs (minimal set for frontend)
    path('api/v1/', include([
        path('shipments/', include('shipments.urls')),
        path('users/', include('users.urls')),
        path('dashboard/', include('dashboards.urls')),
        path('dangerous-goods/', include('dangerous_goods.urls')),
        path('companies/', include('companies.urls')),
        path('freight-types/', include('freight_types.urls')),
        path('vehicles/', include('vehicles.urls')),
        # path('tracking/', include('tracking.urls')),  # Temporarily disabled due to GIS dependencies
        path('documents/', include('documents.urls')),  # Enabled for manifest functionality
        path('audits/', include('audits.urls')),  # Enabled for audit functionality
        path('auth/', include('enterprise_auth.urls')),  # Enterprise authentication
        path('iot/', include('iot_devices.urls')),  # IoT device management
        path('inspections/', include('inspections.urls')),  # Inspection management
        path('communications/', include('communications.urls')),  # Communication and activity logs
        path('manifests/', include('manifests.urls')),  # Enabled for DG manifest processing
        # Temporarily disabled apps:
        # path('locations/', include('locations.urls')),
        # path('hazard-assessments/', include('hazard_assessments.urls')),
        # path('load-plans/', include('load_plans.urls')),
        # path('emergency-procedures/', include('emergency_procedures.urls')),
        # path('handling-unit-types/', include('handling_unit_types.urls')),
        path('sds/', include('sds.urls')),  # Enabled for Safety Data Sheets
        path('epg/', include('epg.urls')),  # Enabled for Emergency Procedure Guides
        # Compatibility endpoint redirects for mobile app
        path('compatibility/', include('dangerous_goods.urls')),  # Mobile app compatibility endpoint
    ])),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Debug toolbar (disabled for now)
    # import debug_toolbar
    # urlpatterns += [
    #     path('__debug__/', include(debug_toolbar.urls)),
    # ]
