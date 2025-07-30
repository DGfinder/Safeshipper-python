# communications/routing.py
from django.urls import re_path
from . import consumers
from tracking.consumers import TrackingConsumer
from audits.consumers import ComplianceMonitoringConsumer

websocket_urlpatterns = [
    re_path(r'ws/chat/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/tracking/$', TrackingConsumer.as_asgi()),
    re_path(r'ws/compliance/$', ComplianceMonitoringConsumer.as_asgi()),
]