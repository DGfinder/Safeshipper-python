from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# router.register(r'sample', DocumentsViewSet)

urlpatterns = [
    path('', include(router.urls)),
]