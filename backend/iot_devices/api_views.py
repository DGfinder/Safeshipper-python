from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import json
import logging
from datetime import timedelta
from typing import List, Dict, Any

from .models import IoTDevice, SensorData, DeviceAlert, DeviceCommand
from .serializers import (
    SensorDataSerializer, DeviceAlertSerializer, 
    IoTDeviceSerializer, DeviceCommandSerializer
)

logger = logging.getLogger(__name__)


class IoTDeviceAuthentication(BaseAuthentication):
    """Custom authentication for IoT devices using API keys"""
    
    def authenticate(self, request):
        device_id = request.META.get('HTTP_X_DEVICE_ID')
        api_key = request.META.get('HTTP_X_API_KEY')
        
        if not device_id or not api_key:
            return None
        
        try:
            device = IoTDevice.objects.get(device_id=device_id, api_key=api_key)
            return (device, None)
        except IoTDevice.DoesNotExist:
            raise AuthenticationFailed('Invalid device credentials')


@api_view(['POST'])
@authentication_classes([IoTDeviceAuthentication])
@permission_classes([AllowAny])
def ingest_sensor_data(request):
    """
    High-performance endpoint for bulk sensor data ingestion
    Expects JSON array of sensor readings
    """
    try:
        device = request.user  # IoTDevice instance from authentication
        
        # Update device last_seen
        device.last_seen = timezone.now()
        device.save(update_fields=['last_seen'])
        
        # Parse bulk data
        if isinstance(request.data, list):
            sensor_readings = request.data
        else:
            sensor_readings = [request.data]
        
        # Validate and process readings
        created_readings = []
        alerts_to_create = []
        
        with transaction.atomic():
            for reading_data in sensor_readings:
                # Validate required fields
                required_fields = ['sensor_type', 'value', 'unit']
                if not all(field in reading_data for field in required_fields):
                    continue
                
                # Create sensor data record
                sensor_data = SensorData(
                    device=device,
                    sensor_type=reading_data['sensor_type'],
                    value=float(reading_data['value']),
                    unit=reading_data['unit'],
                    additional_data=reading_data.get('additional_data', {}),
                    quality_score=reading_data.get('quality_score', 1.0),
                    timestamp=timezone.now() if 'timestamp' not in reading_data 
                             else timezone.datetime.fromisoformat(reading_data['timestamp'].replace('Z', '+00:00'))
                )
                
                # Check for anomalies and alerts
                alert = check_sensor_thresholds(device, sensor_data)
                if alert:
                    alerts_to_create.append(alert)
                
                created_readings.append(sensor_data)
            
            # Bulk create sensor data
            if created_readings:
                SensorData.objects.bulk_create(created_readings, batch_size=100)
            
            # Create alerts
            if alerts_to_create:
                DeviceAlert.objects.bulk_create(alerts_to_create)
        
        # Update device status
        device.update_status()
        
        # Cache latest readings for quick access
        cache_latest_readings(device, created_readings)
        
        return Response({
            'status': 'success',
            'processed': len(created_readings),
            'alerts_created': len(alerts_to_create),
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error ingesting sensor data from {device.device_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([IoTDeviceAuthentication])
@permission_classes([AllowAny])
def device_heartbeat(request):
    """Lightweight heartbeat endpoint for device status updates"""
    try:
        device = request.user
        
        # Update device status
        device.last_seen = timezone.now()
        
        # Update optional fields from request
        if 'battery_level' in request.data:
            device.battery_level = request.data['battery_level']
        
        if 'signal_strength' in request.data:
            device.signal_strength = request.data['signal_strength']
        
        if 'firmware_version' in request.data:
            device.firmware_version = request.data['firmware_version']
        
        if 'location' in request.data:
            device.coordinates = request.data['location']
        
        device.save()
        device.update_status()
        
        # Check for pending commands
        pending_commands = DeviceCommand.objects.filter(
            device=device, 
            status='pending'
        ).order_by('created_at')[:10]
        
        commands_data = []
        for command in pending_commands:
            commands_data.append({
                'id': str(command.id),
                'command_type': command.command_type,
                'command_data': command.command_data
            })
            
            # Mark as sent
            command.status = 'sent'
            command.sent_at = timezone.now()
            command.save()
        
        return Response({
            'status': 'success',
            'device_status': device.status,
            'commands': commands_data,
            'server_time': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing heartbeat from {device.device_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([IoTDeviceAuthentication])
@permission_classes([AllowAny])
def command_response(request):
    """Endpoint for devices to respond to commands"""
    try:
        device = request.user
        command_id = request.data.get('command_id')
        response_status = request.data.get('status', 'executed')
        response_data = request.data.get('response_data', {})
        error_message = request.data.get('error_message', '')
        
        command = get_object_or_404(DeviceCommand, id=command_id, device=device)
        
        command.status = response_status
        command.response_data = response_data
        command.error_message = error_message
        
        if response_status == 'acknowledged':
            command.acknowledged_at = timezone.now()
        elif response_status in ['executed', 'failed']:
            command.executed_at = timezone.now()
        
        command.save()
        
        return Response({
            'status': 'success',
            'command_id': command_id
        })
        
    except Exception as e:
        logger.error(f"Error processing command response from {device.device_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


def check_sensor_thresholds(device: IoTDevice, sensor_data: SensorData) -> DeviceAlert:
    """Check sensor data against thresholds and create alerts if needed"""
    
    # Get device-specific thresholds from configuration
    thresholds = device.configuration.get('thresholds', {})
    sensor_thresholds = thresholds.get(sensor_data.sensor_type, {})
    
    if not sensor_thresholds:
        return None
    
    # Check various threshold types
    alerts = []
    
    # High threshold
    if 'high_critical' in sensor_thresholds and sensor_data.value > sensor_thresholds['high_critical']:
        alerts.append(('critical', 'high_critical', sensor_thresholds['high_critical']))
    elif 'high_warning' in sensor_thresholds and sensor_data.value > sensor_thresholds['high_warning']:
        alerts.append(('warning', 'high_warning', sensor_thresholds['high_warning']))
    
    # Low threshold
    if 'low_critical' in sensor_thresholds and sensor_data.value < sensor_thresholds['low_critical']:
        alerts.append(('critical', 'low_critical', sensor_thresholds['low_critical']))
    elif 'low_warning' in sensor_thresholds and sensor_data.value < sensor_thresholds['low_warning']:
        alerts.append(('warning', 'low_warning', sensor_thresholds['low_warning']))
    
    # Create alert for the highest severity
    if alerts:
        severity, alert_type, threshold_value = alerts[0]  # Assuming first is highest severity
        
        return DeviceAlert(
            device=device,
            alert_type=f"{sensor_data.sensor_type}_{alert_type}",
            severity=severity,
            title=f"{sensor_data.sensor_type.title()} {alert_type.replace('_', ' ').title()}",
            description=f"{sensor_data.sensor_type} reading of {sensor_data.value} {sensor_data.unit} "
                       f"exceeds {alert_type.replace('_', ' ')} threshold of {threshold_value} {sensor_data.unit}",
            trigger_value=sensor_data.value,
            threshold_value=threshold_value,
            sensor_type=sensor_data.sensor_type
        )
    
    return None


def cache_latest_readings(device: IoTDevice, readings: List[SensorData]):
    """Cache latest sensor readings for quick dashboard access"""
    cache_key = f"device_latest_readings_{device.device_id}"
    
    # Group readings by sensor type and keep only the latest
    latest_by_sensor = {}
    for reading in readings:
        if (reading.sensor_type not in latest_by_sensor or 
            reading.timestamp > latest_by_sensor[reading.sensor_type].timestamp):
            latest_by_sensor[reading.sensor_type] = reading
    
    # Convert to cacheable format
    cache_data = {}
    for sensor_type, reading in latest_by_sensor.items():
        cache_data[sensor_type] = {
            'value': reading.value,
            'unit': reading.unit,
            'timestamp': reading.timestamp.isoformat(),
            'quality_score': reading.quality_score
        }
    
    # Cache for 1 hour
    cache.set(cache_key, cache_data, 3600)


# Standard REST API views for device management

class IoTDeviceListCreateView(generics.ListCreateAPIView):
    """List and create IoT devices"""
    queryset = IoTDevice.objects.all()
    serializer_class = IoTDeviceSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        device_type = self.request.query_params.get('device_type')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if device_type:
            queryset = queryset.filter(device_type__name__icontains=device_type)
        
        return queryset.select_related('device_type', 'assigned_to')


class IoTDeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete an IoT device"""
    queryset = IoTDevice.objects.all()
    serializer_class = IoTDeviceSerializer


class DeviceAlertsListView(generics.ListAPIView):
    """List device alerts"""
    serializer_class = DeviceAlertSerializer
    
    def get_queryset(self):
        device_id = self.kwargs.get('device_id')
        queryset = DeviceAlert.objects.filter(device_id=device_id)
        
        status_filter = self.request.query_params.get('status')
        severity_filter = self.request.query_params.get('severity')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if severity_filter:
            queryset = queryset.filter(severity=severity_filter)
        
        return queryset.select_related('device')


class SensorDataListView(generics.ListAPIView):
    """List sensor data for a device"""
    serializer_class = SensorDataSerializer
    
    def get_queryset(self):
        device_id = self.kwargs.get('device_id')
        queryset = SensorData.objects.filter(device_id=device_id)
        
        sensor_type = self.request.query_params.get('sensor_type')
        hours = self.request.query_params.get('hours', 24)
        
        if sensor_type:
            queryset = queryset.filter(sensor_type=sensor_type)
        
        # Time filter
        since = timezone.now() - timedelta(hours=int(hours))
        queryset = queryset.filter(timestamp__gte=since)
        
        return queryset.order_by('-timestamp')


@api_view(['POST'])
def send_device_command(request, device_id):
    """Send a command to an IoT device"""
    try:
        device = get_object_or_404(IoTDevice, id=device_id)
        
        command = DeviceCommand.objects.create(
            device=device,
            command_type=request.data['command_type'],
            command_data=request.data.get('command_data', {}),
            sent_by=request.user
        )
        
        serializer = DeviceCommandSerializer(command)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)