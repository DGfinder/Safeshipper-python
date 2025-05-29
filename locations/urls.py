from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# router.register(r'sample', LocationsViewSet)

urlpatterns = [
    path('', include(router.urls)),
]