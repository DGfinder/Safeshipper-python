# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    EmergencyProcedureGuideViewSet,
    ShipmentEmergencyPlanViewSet,
    EmergencyIncidentViewSet
)

router = DefaultRouter()
router.register(r'emergency-procedure-guides', EmergencyProcedureGuideViewSet, basename='epg')
router.register(r'emergency-plans', ShipmentEmergencyPlanViewSet, basename='emergency-plan')
router.register(r'incidents', EmergencyIncidentViewSet, basename='incident')

urlpatterns = [
    path('', include(router.urls)),
]