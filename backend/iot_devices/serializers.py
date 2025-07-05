from rest_framework import serializers
from .models import (
    DeviceType, IoTDevice, SensorData, DeviceAlert, 
    DeviceCommand, DeviceGroup
)


class DeviceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceType
        fields = '__all__'


class IoTDeviceSerializer(serializers.ModelSerializer):
    device_type_name = serializers.CharField(source='device_type.name', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = IoTDevice
        fields = [
            'id', 'device_id', 'name', 'device_type', 'device_type_name',
            'location', 'coordinates', 'assigned_to', 'assigned_to_username',
            'serial_number', 'firmware_version', 'hardware_version',
            'status', 'last_seen', 'battery_level', 'signal_strength',
            'configuration', 'reporting_interval', 'shipment', 'vehicle',
            'is_online', 'created_at', 'updated_at'
        ]
        read_only_fields = ['api_key', 'api_secret', 'created_at', 'updated_at']


class SensorDataSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    
    class Meta:
        model = SensorData
        fields = [
            'id', 'device', 'device_name', 'sensor_type', 'value', 'unit',
            'additional_data', 'quality_score', 'is_anomaly',
            'timestamp', 'received_at'
        ]


class DeviceAlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    acknowledged_by_username = serializers.CharField(source='acknowledged_by.username', read_only=True)
    
    class Meta:
        model = DeviceAlert
        fields = [
            'id', 'device', 'device_name', 'alert_type', 'severity',
            'title', 'description', 'trigger_value', 'threshold_value',
            'sensor_type', 'status', 'acknowledged_by', 'acknowledged_by_username',
            'acknowledged_at', 'resolved_at', 'triggered_at', 'created_at'
        ]


class DeviceCommandSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    sent_by_username = serializers.CharField(source='sent_by.username', read_only=True)
    
    class Meta:
        model = DeviceCommand
        fields = [
            'id', 'device', 'device_name', 'command_type', 'command_data',
            'status', 'sent_by', 'sent_by_username', 'response_data',
            'error_message', 'created_at', 'sent_at', 'acknowledged_at',
            'executed_at'
        ]


class DeviceGroupSerializer(serializers.ModelSerializer):
    device_count = serializers.IntegerField(read_only=True)
    online_device_count = serializers.IntegerField(read_only=True)
    managed_by_username = serializers.CharField(source='managed_by.username', read_only=True)
    
    class Meta:
        model = DeviceGroup
        fields = [
            'id', 'name', 'description', 'devices', 'device_count',
            'online_device_count', 'managed_by', 'managed_by_username',
            'group_configuration', 'created_at', 'updated_at'
        ]


# Bulk data serializers for high-performance ingestion
class BulkSensorDataSerializer(serializers.Serializer):
    """Serializer for bulk sensor data ingestion"""
    sensor_type = serializers.CharField(max_length=20)
    value = serializers.FloatField()
    unit = serializers.CharField(max_length=20)
    additional_data = serializers.JSONField(required=False, default=dict)
    quality_score = serializers.FloatField(default=1.0, min_value=0.0, max_value=1.0)
    timestamp = serializers.DateTimeField(required=False)


class DeviceHeartbeatSerializer(serializers.Serializer):
    """Serializer for device heartbeat data"""
    battery_level = serializers.IntegerField(required=False, min_value=0, max_value=100)
    signal_strength = serializers.IntegerField(required=False)
    firmware_version = serializers.CharField(required=False, max_length=50)
    location = serializers.JSONField(required=False)
    status_info = serializers.JSONField(required=False, default=dict)


class CommandResponseSerializer(serializers.Serializer):
    """Serializer for command responses from devices"""
    command_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=[
        ('acknowledged', 'Acknowledged'),
        ('executed', 'Executed'),
        ('failed', 'Failed')
    ])
    response_data = serializers.JSONField(required=False, default=dict)
    error_message = serializers.CharField(required=False, allow_blank=True)


# Dashboard and analytics serializers
class DeviceStatsSerializer(serializers.Serializer):
    """Serializer for device statistics"""
    total_devices = serializers.IntegerField()
    online_devices = serializers.IntegerField()
    offline_devices = serializers.IntegerField()
    devices_with_alerts = serializers.IntegerField()
    low_battery_devices = serializers.IntegerField()
    
    
class SensorStatsSerializer(serializers.Serializer):
    """Serializer for sensor statistics"""
    sensor_type = serializers.CharField()
    device_count = serializers.IntegerField()
    latest_reading = serializers.FloatField()
    average_reading = serializers.FloatField()
    min_reading = serializers.FloatField()
    max_reading = serializers.FloatField()
    reading_count = serializers.IntegerField()
    last_updated = serializers.DateTimeField()