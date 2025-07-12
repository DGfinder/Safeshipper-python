from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    VehicleViewSet, SafetyEquipmentTypeViewSet, VehicleSafetyEquipmentViewSet,
    SafetyEquipmentInspectionViewSet, SafetyEquipmentCertificationViewSet
)

router = DefaultRouter()
router.register(r'', VehicleViewSet, basename='vehicle')
router.register(r'safety-equipment-types', SafetyEquipmentTypeViewSet, basename='safety-equipment-type')
router.register(r'safety-equipment', VehicleSafetyEquipmentViewSet, basename='vehicle-safety-equipment')
router.register(r'safety-inspections', SafetyEquipmentInspectionViewSet, basename='safety-equipment-inspection')
router.register(r'safety-certifications', SafetyEquipmentCertificationViewSet, basename='safety-equipment-certification')

urlpatterns = [
    path('', include(router.urls)),
]