# inspections/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    InspectionViewSet,
    InspectionItemViewSet,
    InspectionPhotoViewSet,
    InspectionTemplateViewSet
)

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'', InspectionViewSet, basename='inspection')
router.register(r'items', InspectionItemViewSet, basename='inspectionitem')
router.register(r'photos', InspectionPhotoViewSet, basename='inspectionphoto')
router.register(r'templates', InspectionTemplateViewSet, basename='inspectiontemplate')

urlpatterns = [
    path('', include(router.urls)),
]