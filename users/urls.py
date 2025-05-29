# users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import UserViewSet # Assuming your viewset is in api_views.py

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    # You might add other user-related paths here later,
    # e.g., for custom password change, email verification, etc.
]
