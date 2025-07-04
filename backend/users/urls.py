from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import UserViewSet
from .auth_views import (
    login, logout, me, register, forgot_password,
    SafeShipperTokenObtainPairView
)

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')  # This creates /api/v1/users/ endpoints

# Authentication endpoints
auth_patterns = [
    path('login/', login, name='auth_login'),
    path('logout/', logout, name='auth_logout'),
    path('me/', me, name='auth_me'),
    path('register/', register, name='auth_register'),
    path('forgot-password/', forgot_password, name='auth_forgot_password'),
    path('token/', SafeShipperTokenObtainPairView.as_view(), name='token_obtain_pair'),
]

urlpatterns = [
    # Authentication endpoints at /api/v1/users/auth/
    path('auth/', include(auth_patterns)),
    # User management endpoints at /api/v1/users/
    path('', include(router.urls)),
]