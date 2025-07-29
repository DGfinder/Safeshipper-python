# training/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    TrainingCategoryViewSet, TrainingProgramViewSet, TrainingRecordViewSet,
    DriverLicenseViewSet, ADGDriverCertificateViewSet, DriverCompetencyProfileViewSet,
    DriverQualificationValidationView, FleetCompetencyReportView, QualifiedDriversForShipmentView,
    TrainingModuleViewSet, UserTrainingRecordViewSet, UserModuleProgressViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'categories', TrainingCategoryViewSet, basename='training-category')
router.register(r'programs', TrainingProgramViewSet, basename='training-program')
router.register(r'records', TrainingRecordViewSet, basename='training-record')
router.register(r'driver-licenses', DriverLicenseViewSet, basename='driver-license')
router.register(r'adg-certificates', ADGDriverCertificateViewSet, basename='adg-certificate')
router.register(r'competency-profiles', DriverCompetencyProfileViewSet, basename='competency-profile')

# Enhanced Training Management API endpoints
router.register(r'modules', TrainingModuleViewSet, basename='training-module')
router.register(r'user-records', UserTrainingRecordViewSet, basename='user-training-record')
router.register(r'module-progress', UserModuleProgressViewSet, basename='module-progress')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    
    # ADG Driver Qualification API endpoints
    path('validate-driver-qualification/', DriverQualificationValidationView.as_view(), name='validate-driver-qualification'),
    path('fleet-competency-report/', FleetCompetencyReportView.as_view(), name='fleet-competency-report'),
    path('qualified-drivers-for-shipment/', QualifiedDriversForShipmentView.as_view(), name='qualified-drivers-for-shipment'),
]