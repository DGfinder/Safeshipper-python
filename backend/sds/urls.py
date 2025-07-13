from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import SafetyDataSheetViewSet, SDSUploadViewSet

router = DefaultRouter()
router.register(r"safety-data-sheets", SafetyDataSheetViewSet, basename="safety-data-sheet")
router.register(r"upload", SDSUploadViewSet, basename="sds-upload")

urlpatterns = [
    path("", include(router.urls)),
]