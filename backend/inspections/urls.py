# inspections/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    InspectionViewSet,
    InspectionItemViewSet,
    InspectionPhotoViewSet,
    InspectionTemplateViewSet,
    CreateInspectionFromTemplateView,
    UpdateInspectionItemView,
    CompleteInspectionView,
    InspectionTemplatesView
)

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'', InspectionViewSet, basename='inspection')
router.register(r'items', InspectionItemViewSet, basename='inspectionitem')
router.register(r'photos', InspectionPhotoViewSet, basename='inspectionphoto')
router.register(r'templates', InspectionTemplateViewSet, basename='inspectiontemplate')

urlpatterns = [
    path('', include(router.urls)),
    # Enhanced hazard inspection endpoints
    path('hazard-inspection/create-from-template/', 
         CreateInspectionFromTemplateView.as_view(), 
         name='hazard-inspection-create'),
    path('hazard-inspection/update-item/', 
         UpdateInspectionItemView.as_view(), 
         name='hazard-inspection-update-item'),
    path('hazard-inspection/complete/', 
         CompleteInspectionView.as_view(), 
         name='hazard-inspection-complete'),
    path('hazard-inspection/templates/', 
         InspectionTemplatesView.as_view(), 
         name='hazard-inspection-templates'),
]