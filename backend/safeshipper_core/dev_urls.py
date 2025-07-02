# Development URL configuration - simplified
from django.urls import path, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Admin - temporarily disabled
    # path('admin/', admin.site.urls),
    
    # Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Application URLs - minimal set
    path('api/v1/', include([
        path('users/', include('users.urls')),
        path('dangerous-goods/', include('dangerous_goods.urls')),
        path('companies/', include('companies.urls')),
        path('vehicles/', include('vehicles.urls')),
        path('locations/', include('locations.urls')),
    ])),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) 