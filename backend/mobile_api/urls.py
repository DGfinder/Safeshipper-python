from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MobileShipmentViewSet, MobileDangerousGoodsViewSet

app_name = 'mobile_api'

router = DefaultRouter()
router.register(r'shipments', MobileShipmentViewSet, basename='mobile-shipments')
router.register(r'dangerous-goods', MobileDangerousGoodsViewSet, basename='mobile-dangerous-goods')

urlpatterns = [
    path('', include(router.urls)),
]