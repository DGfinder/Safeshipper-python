from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ManifestViewSet, ManifestUploadAPIView

router = DefaultRouter()
router.register(r"manifests", ManifestViewSet, basename="manifest")

urlpatterns = [
    path("", include(router.urls)),
    # Custom endpoint for manifest upload and analysis
    path("manifests/upload-and-analyze/", ManifestUploadAPIView.as_view({'post': 'create'}), name="manifest-upload-analyze"),
    path("manifests/upload-and-analyze/<uuid:pk>/status/", ManifestUploadAPIView.as_view({'get': 'status'}), name="manifest-upload-status"),
]