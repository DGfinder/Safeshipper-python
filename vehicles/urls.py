from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import VehicleViewSet

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('', include(router.urls)),
]