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
# Removed problematic health_check import
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from tracking.public_views import public_tracking

# Simple health check endpoint
class HealthCheckView(APIView):
    """
    Simple health check endpoint for container health monitoring.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'service': 'safeshipper-backend',
            'timestamp': timezone.now()
        })

# Basic search endpoint for popular searches
class PopularSearchesView(APIView):
    """
    Simple endpoint to return popular search terms for the search component.
    """
    def get(self, request):
        # Return basic popular searches - this can be enhanced later
        popular_searches = [
            "lithium battery shipments",
            "Class 3 flammable liquids", 
            "expired documents",
            "delayed shipments",
            "Sydney to Melbourne",
            "compliance violations",
            "ready for dispatch",
            "dangerous goods manifest"
        ]
        
        limit = int(request.GET.get('limit', 10))
        return Response({
            'popular_searches': popular_searches[:limit]
        })

# safeshipper_core/urls.py
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
    path('health/', HealthCheckView.as_view(), name='health_check'),
    
    # Monitoring
    path('', include('django_prometheus.urls')),
    
    # Application URLs
    path('api/v1/', include([
        path('shipments/', include('shipments.urls')),
        path('users/', include('users.urls')),
        path('dashboard/', include('dashboards.urls')),  # Re-enabled for Phase 3A analytics
        path('dangerous-goods/', include('dangerous_goods.urls')),  # Re-enabled after fixing shipments dependencies
        path('companies/', include('companies.urls')),
        path('freight-types/', include('freight_types.urls')),
        path('vehicles/', include('vehicles.urls')),
        path('tracking/', include('tracking.urls')),  # Re-enabled for GPS tracking
        path('documents/', include('documents.urls')),  # Re-enabled after fixing shipments dependencies
        path('audits/', include('audits.urls')),  # Re-enabled for Phase 5A comprehensive audit system
        path('auth/', include('enterprise_auth.urls')),  # Re-enabled for Phase 3D security
        path('iot/', include('iot_devices.urls')),  # Re-enabled for IoT device management
        path('inspections/', include('inspections.urls')),  # Re-enabled for Phase 5B quality management
        path('training/', include('training.urls')),  # Re-enabled for Phase 5C training & certification management
        path('gateway/', include('api_gateway.urls')),  # Re-enabled for Phase 7A API gateway & developer platform
        path('erp-integration/', include('erp_integration.urls')),  # Re-enabled for Phase 7B ERP integration framework
        path('mobile/', include('mobile_api.urls')),  # Re-enabled for Phase 8B mobile API foundation
        path('communications/', include('communications.urls')),  # Re-enabled after fixing migrations
        path('manifests/', include('manifests.urls')),  # Re-enabled after fixing documents dependencies
        # Basic search endpoints
        path('search/popular/', PopularSearchesView.as_view(), name='popular-searches'),
        # Public tracking endpoint (matches frontend expectation)
        path('public/tracking/<str:tracking_number>/', 
             public_tracking, name='public_shipment_tracking'),
        # Temporarily disabled apps:
        path('locations/', include('locations.urls')),  # Re-enabled
        path('hazard-assessments/', include('hazard_assessments.urls')),  # Re-enabled after migration fix
        path('load-plans/', include('load_plans.urls')),  # Re-enabled for Phase 3B load planning
        path('emergency-procedures/', include('emergency_procedures.urls')),  # Re-enabled after migration fix
        path('handling-unit-types/', include('handling_unit_types.urls')),  # Re-enabled after migration fix
        path('sds/', include('sds.urls')),  # Re-enabled after fixing dangerous_goods dependencies
        path('epg/', include('epg.urls')),  # Re-enabled after fixing shipments dependencies
        path('routes/', include('routes.urls')),  # Re-enabled for Phase 3B route optimization
        path('capacity-marketplace/', include('capacity_marketplace.urls')),  # Re-enabled for Phase 3C marketplace
        path('search/', include('search.urls')),  # Unified search API system
        # Compatibility endpoint redirects for mobile app
        # path('compatibility/', include('dangerous_goods.urls')),  # Temporarily disabled due to dangerous_goods app being disabled
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
