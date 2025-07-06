from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ManifestViewSet, ManifestUploadAPIView

router = DefaultRouter()
router.register(r"manifests", ManifestViewSet, basename="manifest")
router.register(r"manifest-upload", ManifestUploadAPIView, basename="manifest-upload")

urlpatterns = [
    path("api/v1/", include(router.urls)),
]