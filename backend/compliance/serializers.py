# compliance/serializers.py

from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.auth import get_user_model

from .models import (
    ComplianceZone, ComplianceMonitoringSession, ComplianceEvent,
    ComplianceAlert, ComplianceReport
)

User = get_user_model()


class ComplianceZoneSerializer(GeoFeatureModelSerializer):
    """Serializer for compliance zones with geographic boundaries"""
    
    class Meta:
        model = ComplianceZone
        geo_field = 'boundary'
        fields = [
            'id', 'name', 'zone_type', 'restricted_hazard_classes',
            'prohibited_hazard_classes', 'time_restrictions', 'max_speed_kmh',
            'requires_escort', 'requires_notification', 'regulatory_authority',
            'regulatory_reference', 'description', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ComplianceMonitoringSessionSerializer(serializers.ModelSerializer):
    """Serializer for compliance monitoring sessions"""
    
    shipment_tracking_number = serializers.CharField(source='shipment.tracking_number', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    
    session_status_display = serializers.CharField(source='get_session_status_display', read_only=True)
    compliance_level_display = serializers.CharField(source='get_compliance_level_display', read_only=True)
    
    # Location data
    current_location = serializers.SerializerMethodField()
    
    # Duration calculations
    session_duration_hours = serializers.SerializerMethodField()
    time_until_completion = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceMonitoringSession
        fields = [
            'id', 'shipment', 'shipment_tracking_number', 'vehicle', 'vehicle_registration',
            'driver', 'driver_name', 'session_status', 'session_status_display',
            'compliance_level', 'compliance_level_display', 'current_location',
            'started_at', 'scheduled_completion', 'completed_at',
            'session_duration_hours', 'time_until_completion',
            'total_violations', 'total_warnings', 'compliance_score',
            'monitored_hazard_classes', 'last_gps_update', 'current_speed_kmh',
            'alert_count', 'last_alert_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_violations', 'total_warnings', 'compliance_score',
            'alert_count', 'last_alert_at', 'created_at', 'updated_at'
        ]
    
    def get_current_location(self, obj):
        """Get current GPS location"""
        if obj.last_known_location:
            return {
                'latitude': obj.last_known_location.y,
                'longitude': obj.last_known_location.x,
                'last_updated': obj.last_gps_update
            }
        return None
    
    def get_session_duration_hours(self, obj):
        """Calculate session duration in hours"""
        if obj.completed_at:
            duration = obj.completed_at - obj.started_at
        else:
            from django.utils import timezone
            duration = timezone.now() - obj.started_at
        
        return round(duration.total_seconds() / 3600, 2)
    
    def get_time_until_completion(self, obj):
        """Calculate time until scheduled completion"""
        if obj.scheduled_completion and not obj.completed_at:
            from django.utils import timezone
            time_diff = obj.scheduled_completion - timezone.now()
            
            if time_diff.total_seconds() > 0:
                return round(time_diff.total_seconds() / 3600, 2)  # Hours
            else:
                return 0  # Overdue
        return None


class ComplianceEventSerializer(serializers.ModelSerializer):
    """Serializer for compliance events"""
    
    monitoring_session_info = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    compliance_zone_name = serializers.CharField(source='compliance_zone.name', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    # Location data
    event_location = serializers.SerializerMethodField()
    
    # Time since event
    time_since_event = serializers.SerializerMethodField()
    resolution_time_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceEvent
        fields = [
            'id', 'monitoring_session', 'monitoring_session_info',
            'event_type', 'event_type_display', 'severity', 'severity_display',
            'event_location', 'timestamp', 'time_since_event',
            'title', 'description', 'compliance_zone', 'compliance_zone_name',
            'event_data', 'acknowledged_by', 'acknowledged_by_name', 'acknowledged_at',
            'resolved_by', 'resolved_by_name', 'resolved_at', 'resolution_time_hours',
            'resolution_notes', 'automated_action_taken', 'automated_action_details',
            'created_at'
        ]
        read_only_fields = [
            'id', 'timestamp', 'automated_action_taken', 'automated_action_details',
            'created_at'
        ]
    
    def get_monitoring_session_info(self, obj):
        """Get basic monitoring session information"""
        return {
            'session_id': obj.monitoring_session.id,
            'shipment_tracking': obj.monitoring_session.shipment.tracking_number,
            'vehicle_registration': obj.monitoring_session.vehicle.registration_number,
            'driver_name': obj.monitoring_session.driver.get_full_name()
        }
    
    def get_event_location(self, obj):
        """Get event location coordinates"""
        if obj.location:
            return {
                'latitude': obj.location.y,
                'longitude': obj.location.x
            }
        return None
    
    def get_time_since_event(self, obj):
        """Calculate time since event occurred"""
        from django.utils import timezone
        time_diff = timezone.now() - obj.timestamp
        return round(time_diff.total_seconds() / 3600, 2)  # Hours
    
    def get_resolution_time_hours(self, obj):
        """Calculate time taken to resolve event"""
        if obj.resolved_at and obj.timestamp:
            time_diff = obj.resolved_at - obj.timestamp
            return round(time_diff.total_seconds() / 3600, 2)
        return None


class ComplianceAlertSerializer(serializers.ModelSerializer):
    """Serializer for compliance alerts"""
    
    compliance_event_info = serializers.SerializerMethodField()
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    recipient_name = serializers.CharField(source='recipient_user.get_full_name', read_only=True)
    
    # Delivery metrics
    delivery_time_minutes = serializers.SerializerMethodField()
    acknowledgment_time_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceAlert
        fields = [
            'id', 'compliance_event', 'compliance_event_info',
            'alert_type', 'alert_type_display', 'status', 'status_display',
            'recipient_user', 'recipient_name', 'recipient_email', 'recipient_phone',
            'subject', 'message', 'sent_at', 'delivered_at', 'acknowledged_at',
            'delivery_time_minutes', 'acknowledgment_time_minutes',
            'retry_count', 'max_retries', 'response_data', 'error_message',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sent_at', 'delivered_at', 'acknowledged_at',
            'retry_count', 'response_data', 'error_message',
            'created_at', 'updated_at'
        ]
    
    def get_compliance_event_info(self, obj):
        """Get compliance event information"""
        return {
            'event_id': obj.compliance_event.id,
            'event_type': obj.compliance_event.event_type,
            'severity': obj.compliance_event.severity,
            'title': obj.compliance_event.title,
            'timestamp': obj.compliance_event.timestamp
        }
    
    def get_delivery_time_minutes(self, obj):
        """Calculate delivery time in minutes"""
        if obj.delivered_at and obj.sent_at:
            time_diff = obj.delivered_at - obj.sent_at
            return round(time_diff.total_seconds() / 60, 2)
        return None
    
    def get_acknowledgment_time_minutes(self, obj):
        """Calculate acknowledgment time in minutes"""
        if obj.acknowledged_at and obj.delivered_at:
            time_diff = obj.acknowledged_at - obj.delivered_at
            return round(time_diff.total_seconds() / 60, 2)
        return None


class ComplianceReportSerializer(serializers.ModelSerializer):
    """Serializer for compliance reports"""
    
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)
    
    # Period calculations
    period_duration_days = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceReport
        fields = [
            'id', 'report_type', 'report_type_display', 'title',
            'period_start', 'period_end', 'period_duration_days',
            'total_sessions', 'total_events', 'total_violations', 'total_warnings',
            'average_compliance_score', 'analytics_data',
            'generated_by', 'generated_by_name', 'generated_at', 'report_file'
        ]
        read_only_fields = ['id', 'generated_at']
    
    def get_period_duration_days(self, obj):
        """Calculate report period duration in days"""
        duration = obj.period_end - obj.period_start
        return duration.days


# Input/Output Serializers

class GPSUpdateSerializer(serializers.Serializer):
    """Serializer for GPS location updates"""
    
    latitude = serializers.FloatField(
        min_value=-90.0,
        max_value=90.0,
        help_text="Latitude coordinate (-90 to 90)"
    )
    
    longitude = serializers.FloatField(
        min_value=-180.0,
        max_value=180.0,
        help_text="Longitude coordinate (-180 to 180)"
    )
    
    speed_kmh = serializers.FloatField(
        min_value=0.0,
        max_value=200.0,
        required=False,
        allow_null=True,
        help_text="Current speed in km/h"
    )
    
    timestamp = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text="GPS timestamp (defaults to current time)"
    )
    
    heading = serializers.FloatField(
        min_value=0.0,
        max_value=360.0,
        required=False,
        allow_null=True,
        help_text="Heading direction in degrees (0-360)"
    )
    
    accuracy_meters = serializers.FloatField(
        min_value=0.0,
        required=False,
        allow_null=True,
        help_text="GPS accuracy in meters"
    )


class MonitoringSessionSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for monitoring session summaries"""
    
    shipment_tracking_number = serializers.CharField(source='shipment.tracking_number', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    
    current_location = serializers.SerializerMethodField()
    session_duration_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceMonitoringSession
        fields = [
            'id', 'shipment_tracking_number', 'vehicle_registration', 'driver_name',
            'session_status', 'compliance_level', 'compliance_score',
            'current_location', 'current_speed_kmh', 'session_duration_hours',
            'total_violations', 'total_warnings', 'monitored_hazard_classes',
            'last_gps_update'
        ]
    
    def get_current_location(self, obj):
        """Get current GPS location"""
        if obj.last_known_location:
            return {
                'latitude': obj.last_known_location.y,
                'longitude': obj.last_known_location.x
            }
        return None
    
    def get_session_duration_hours(self, obj):
        """Calculate session duration in hours"""
        from django.utils import timezone
        if obj.completed_at:
            duration = obj.completed_at - obj.started_at
        else:
            duration = timezone.now() - obj.started_at
        
        return round(duration.total_seconds() / 3600, 2)


class LocationRestrictionCheckSerializer(serializers.Serializer):
    """Serializer for location restriction check requests"""
    
    latitude = serializers.FloatField(
        min_value=-90.0,
        max_value=90.0
    )
    
    longitude = serializers.FloatField(
        min_value=-180.0,
        max_value=180.0
    )
    
    hazard_classes = serializers.ListField(
        child=serializers.CharField(max_length=5),
        required=False,
        default=[]
    )


class ComplianceDashboardSerializer(serializers.Serializer):
    """Serializer for compliance dashboard data"""
    
    time_period_hours = serializers.IntegerField(read_only=True)
    active_sessions = serializers.IntegerField(read_only=True)
    total_events = serializers.IntegerField(read_only=True)
    violations = serializers.IntegerField(read_only=True)
    critical_events = serializers.IntegerField(read_only=True)
    unresolved_violations = serializers.IntegerField(read_only=True)
    average_compliance_score = serializers.FloatField(read_only=True)
    
    compliance_distribution = serializers.DictField(read_only=True)
    recent_critical_events = serializers.ListField(read_only=True)


class EmergencyResponseSerializer(serializers.Serializer):
    """Serializer for emergency response requests"""
    
    event_id = serializers.UUIDField()
    
    response_type = serializers.ChoiceField(
        choices=[
            ('STANDARD', 'Standard Response'),
            ('EMERGENCY_STOP', 'Emergency Stop'),
            ('EVACUATION', 'Evacuation'),
            ('HAZMAT_TEAM', 'Hazmat Team Response'),
            ('FIRE_BRIGADE', 'Fire Brigade'),
            ('POLICE', 'Police Response')
        ],
        default='STANDARD'
    )
    
    notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True
    )


# Detailed Report Serializers

class SessionComplianceReportSerializer(serializers.Serializer):
    """Detailed compliance report for a single session"""
    
    session_summary = MonitoringSessionSummarySerializer(read_only=True)
    
    events_by_type = serializers.DictField(read_only=True)
    events_by_severity = serializers.DictField(read_only=True)
    
    timeline_events = ComplianceEventSerializer(many=True, read_only=True)
    
    route_analysis = serializers.DictField(read_only=True)
    speed_analysis = serializers.DictField(read_only=True)
    zone_violations = serializers.DictField(read_only=True)
    
    recommendations = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )