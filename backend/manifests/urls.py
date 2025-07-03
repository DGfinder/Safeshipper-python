from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ManifestViewSet

router = DefaultRouter()
router.register(r"manifests", ManifestViewSet, basename="manifest")

urlpatterns = [
    path("", include(router.urls)),
]