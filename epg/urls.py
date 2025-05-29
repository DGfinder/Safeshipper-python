from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# router.register(r'sample', EpgViewSet)

urlpatterns = [
    path('', include(router.urls)),
]