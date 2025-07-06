# communications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ShipmentEventViewSet

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'events', ShipmentEventViewSet, basename='shipmentevent')

urlpatterns = [
    path('', include(router.urls)),
]