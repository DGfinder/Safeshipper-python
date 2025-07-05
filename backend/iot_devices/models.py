from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import secrets

User = get_user_model()


class DeviceType(models.Model):
    """Types of IoT devices"""
    CATEGORY_CHOICES = [
        ('sensor', 'Sensor'),
        ('tracker', 'Tracker'),
        ('monitor', 'Monitor'),
        ('controller', 'Controller'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField()
    manufacturer = models.CharField(max_length=100, blank=True)
    model_number = models.CharField(max_length=100, blank=True)
    
    # Capabilities
    supported_sensors = models.JSONField(default=list)  # List of sensor types
    communication_protocols = models.JSONField(default=list)  # WiFi, Bluetooth, LoRa, etc.
    power_source = models.CharField(max_length=50, blank=True)  # Battery, USB, Solar, etc.
    
    # Configuration
    default_config = models.JSONField(default=dict)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class IoTDevice(models.Model):
    """Individual IoT device instances"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Maintenance'),
        ('error', 'Error'),
        ('offline', 'Offline'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    device_type = models.ForeignKey(DeviceType, on_delete=models.CASCADE)
    
    # Authentication
    api_key = models.CharField(max_length=64, unique=True, blank=True)
    api_secret = models.CharField(max_length=128, blank=True)
    
    # Location and assignment
    location = models.CharField(max_length=200, blank=True)
    coordinates = models.JSONField(null=True, blank=True)  # {lat, lng, alt}
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Hardware info
    serial_number = models.CharField(max_length=100, blank=True)
    firmware_version = models.CharField(max_length=50, blank=True)
    hardware_version = models.CharField(max_length=50, blank=True)
    
    # Status and health
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    last_seen = models.DateTimeField(null=True, blank=True)
    battery_level = models.IntegerField(
        null=True, blank=True, 
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    signal_strength = models.IntegerField(null=True, blank=True)  # RSSI in dBm
    
    # Configuration
    configuration = models.JSONField(default=dict)
    reporting_interval = models.IntegerField(default=300)  # seconds
    
    # Relationships
    shipment = models.ForeignKey('shipments.Shipment', on_delete=models.SET_NULL, null=True, blank=True)
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_seen']
        indexes = [
            models.Index(fields=['device_id']),
            models.Index(fields=['status']),
            models.Index(fields=['last_seen']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.device_id})"
    
    def save(self, *args, **kwargs):
        if not self.api_key:
            self.api_key = secrets.token_urlsafe(32)
        if not self.api_secret:
            self.api_secret = secrets.token_urlsafe(64)
        super().save(*args, **kwargs)
    
    @property
    def is_online(self):
        """Check if device is considered online based on last_seen"""
        if not self.last_seen:
            return False
        threshold = timezone.now() - timezone.timedelta(minutes=10)
        return self.last_seen > threshold
    
    def update_status(self):
        """Update device status based on last_seen and other factors"""
        if not self.is_online:
            self.status = 'offline'
        elif self.battery_level is not None and self.battery_level < 10:
            self.status = 'maintenance'
        elif self.status == 'offline' and self.is_online:
            self.status = 'active'
        self.save()


class SensorData(models.Model):
    """Time-series sensor data from IoT devices"""
    SENSOR_TYPES = [
        ('temperature', 'Temperature'),
        ('humidity', 'Humidity'),
        ('pressure', 'Pressure'),
        ('location', 'GPS Location'),
        ('acceleration', 'Accelerometer'),
        ('gyroscope', 'Gyroscope'),
        ('magnetometer', 'Magnetometer'),
        ('light', 'Light Level'),
        ('sound', 'Sound Level'),
        ('gas', 'Gas Detection'),
        ('shock', 'Shock Detection'),
        ('vibration', 'Vibration'),
        ('proximity', 'Proximity'),
        ('weight', 'Weight/Load'),
        ('voltage', 'Voltage'),
        ('current', 'Current'),
        ('custom', 'Custom Sensor'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(IoTDevice, on_delete=models.CASCADE, related_name='sensor_data')
    sensor_type = models.CharField(max_length=20, choices=SENSOR_TYPES)
    
    # Data
    value = models.FloatField()
    unit = models.CharField(max_length=20)
    
    # Additional data fields for complex sensors
    additional_data = models.JSONField(default=dict, blank=True)
    
    # Quality and metadata
    quality_score = models.FloatField(
        default=1.0, 
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    is_anomaly = models.BooleanField(default=False)
    
    # Timestamp
    timestamp = models.DateTimeField(default=timezone.now)
    received_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', 'sensor_type', '-timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['is_anomaly']),
        ]
    
    def __str__(self):
        return f"{self.device.name} - {self.sensor_type}: {self.value} {self.unit}"


class DeviceAlert(models.Model):
    """Alerts and notifications from IoT devices"""
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(IoTDevice, on_delete=models.CASCADE, related_name='alerts')
    
    # Alert details
    alert_type = models.CharField(max_length=50)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Alert data
    trigger_value = models.FloatField(null=True, blank=True)
    threshold_value = models.FloatField(null=True, blank=True)
    sensor_type = models.CharField(max_length=20, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    triggered_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-triggered_at']
        indexes = [
            models.Index(fields=['device', 'status']),
            models.Index(fields=['severity', 'status']),
            models.Index(fields=['triggered_at']),
        ]
    
    def __str__(self):
        return f"{self.device.name} - {self.title} ({self.severity})"


class DeviceCommand(models.Model):
    """Commands sent to IoT devices"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('acknowledged', 'Acknowledged'),
        ('executed', 'Executed'),
        ('failed', 'Failed'),
        ('timeout', 'Timeout'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(IoTDevice, on_delete=models.CASCADE, related_name='commands')
    
    # Command details
    command_type = models.CharField(max_length=50)
    command_data = models.JSONField(default=dict)
    
    # Execution
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Response
    response_data = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.device.name} - {self.command_type} ({self.status})"


class DeviceGroup(models.Model):
    """Logical grouping of IoT devices"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Grouping criteria
    devices = models.ManyToManyField(IoTDevice, related_name='groups')
    
    # Management
    managed_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Configuration
    group_configuration = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @property
    def device_count(self):
        return self.devices.count()
    
    @property
    def online_device_count(self):
        return self.devices.filter(status='active').count()