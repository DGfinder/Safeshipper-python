from django.urls import path
from . import api_views

urlpatterns = [
    # High-performance IoT ingestion endpoints
    path('ingest/sensor-data/', api_views.ingest_sensor_data, name='ingest-sensor-data'),
    path('heartbeat/', api_views.device_heartbeat, name='device-heartbeat'),
    path('command-response/', api_views.command_response, name='command-response'),
    
    # Device management endpoints
    path('devices/', api_views.IoTDeviceListCreateView.as_view(), name='device-list-create'),
    path('devices/<uuid:pk>/', api_views.IoTDeviceDetailView.as_view(), name='device-detail'),
    path('devices/<uuid:device_id>/alerts/', api_views.DeviceAlertsListView.as_view(), name='device-alerts'),
    path('devices/<uuid:device_id>/sensor-data/', api_views.SensorDataListView.as_view(), name='device-sensor-data'),
    path('devices/<uuid:device_id>/send-command/', api_views.send_device_command, name='send-command'),
]