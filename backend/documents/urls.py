# documents/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import DocumentViewSet

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]