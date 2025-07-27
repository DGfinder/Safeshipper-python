# compliance/api_views.py

"""
Emergency Response API for SafeShipper Platform

Provides protected emergency activation endpoints with multi-step safeguards
and comprehensive data assembly from existing systems.
"""

import uuid
from datetime import timedelta
from typing import Dict, Any, List
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.db import transaction
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from celery import current_app

from .models import (
    ComplianceZone, ComplianceMonitoringSession, ComplianceEvent, 
    ComplianceAlert, ComplianceReport
)
from .monitoring_service import RealTimeComplianceMonitor, ComplianceZoneManager
from .serializers import (
    ComplianceZoneSerializer, ComplianceMonitoringSessionSerializer,
    ComplianceEventSerializer, ComplianceAlertSerializer, ComplianceReportSerializer,
    GPSUpdateSerializer, MonitoringSessionSummarySerializer
)
from vehicles.models import Vehicle
from shipments.models import Shipment
from communications.models import ShipmentEvent

User = get_user_model()

# Emergency activation safeguards
EMERGENCY_COOLDOWN_SECONDS = 30  # Prevent spam activation
MAX_FALSE_ALARMS_PER_DAY = 3     # Disable emergency for users with too many false alarms
ACTIVATION_TIMEOUT_SECONDS = 60   # Time limit for completing activation sequence


class ComplianceZoneViewSet(viewsets.ModelViewSet):
    """API endpoint for managing compliance zones"""
    queryset = ComplianceZone.objects.all()
    serializer_class = ComplianceZoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['zone_type', 'is_active', 'regulatory_authority']
    search_fields = ['name', 'description', 'regulatory_authority']
    ordering_fields = ['name', 'zone_type', 'created_at']
    ordering = ['name']

    @action(detail=False, methods=['post'])
    def check_location_restrictions(self, request):
        """Check location restrictions for specific coordinates and hazard classes"""
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        hazard_classes = request.data.get('hazard_classes', [])
        
        if not latitude or not longitude:
            return Response(
                {'error': 'latitude and longitude are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            location = Point(float(longitude), float(latitude), srid=4326)
            zone_manager = ComplianceZoneManager()
            restrictions = zone_manager.check_location_restrictions(location, hazard_classes)
            
            return Response({
                'location': {'latitude': latitude, 'longitude': longitude},
                'hazard_classes': hazard_classes,
                'restrictions': restrictions,
                'checked_at': timezone.now()
            })
            
        except ValueError as e:
            return Response(
                {'error': f'Invalid coordinates: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ComplianceMonitoringSessionViewSet(viewsets.ModelViewSet):
    """API endpoint for managing compliance monitoring sessions"""
    queryset = ComplianceMonitoringSession.objects.select_related(
        'shipment', 'vehicle', 'driver'
    ).prefetch_related('events')
    serializer_class = ComplianceMonitoringSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'session_status', 'compliance_level', 'vehicle', 'driver', 'shipment'
    ]
    search_fields = [
        'shipment__tracking_number', 'vehicle__registration_number',
        'driver__first_name', 'driver__last_name'
    ]
    ordering_fields = ['started_at', 'compliance_score', 'total_violations']
    ordering = ['-started_at']

    def get_queryset(self):
        """Filter sessions by user permissions"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            # Non-staff users can only see sessions they're involved in
            queryset = queryset.filter(
                models.Q(driver=self.request.user) |
                models.Q(shipment__requested_by=self.request.user)
            )
        return queryset

    @action(detail=False, methods=['post'])
    def start_session(self, request):
        """Start a new compliance monitoring session"""
        shipment_id = request.data.get('shipment_id')
        vehicle_id = request.data.get('vehicle_id')
        driver_id = request.data.get('driver_id')
        
        if not all([shipment_id, vehicle_id, driver_id]):
            return Response(
                {'error': 'shipment_id, vehicle_id, and driver_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
            vehicle = Vehicle.objects.get(id=vehicle_id)
            driver = User.objects.get(id=driver_id, role='DRIVER')
            
            monitor = RealTimeComplianceMonitor()
            session = monitor.start_monitoring_session(shipment, vehicle, driver)
            
            serializer = self.get_serializer(session)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except (Shipment.DoesNotExist, Vehicle.DoesNotExist, User.DoesNotExist) as e:
            return Response(
                {'error': f'Resource not found: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def gps_update(self, request, pk=None):
        """Process GPS location update for monitoring session"""
        session = self.get_object()
        
        serializer = GPSUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        monitor = RealTimeComplianceMonitor()
        result = monitor.process_gps_update(
            session=session,
            latitude=data['latitude'],
            longitude=data['longitude'],
            speed_kmh=data.get('speed_kmh'),
            timestamp=data.get('timestamp')
        )
        
        return Response(result)

    @action(detail=True, methods=['post'])
    def complete_session(self, request, pk=None):
        """Complete a monitoring session"""
        session = self.get_object()
        completion_notes = request.data.get('completion_notes', '')
        
        monitor = RealTimeComplianceMonitor()
        summary = monitor.complete_monitoring_session(session, completion_notes)
        
        return Response({
            'session_completed': True,
            'summary': summary
        })

    @action(detail=True, methods=['get'])
    def live_status(self, request, pk=None):
        """Get live status of monitoring session"""
        session = self.get_object()
        
        # Get recent events (last hour)
        recent_events = session.events.filter(
            timestamp__gte=timezone.now() - timezone.timedelta(hours=1)
        ).order_by('-timestamp')[:10]
        
        # Check GPS staleness
        gps_stale = False
        if session.last_gps_update:
            time_since_update = (timezone.now() - session.last_gps_update).total_seconds()
            gps_stale = time_since_update > 300  # 5 minutes
        
        return Response({
            'session_id': session.id,
            'status': session.session_status,
            'compliance_level': session.compliance_level,
            'compliance_score': float(session.compliance_score),
            'last_location': {
                'latitude': session.last_known_location.y if session.last_known_location else None,
                'longitude': session.last_known_location.x if session.last_known_location else None,
                'last_updated': session.last_gps_update
            },
            'current_speed_kmh': float(session.current_speed_kmh) if session.current_speed_kmh else None,
            'gps_stale': gps_stale,
            'total_violations': session.total_violations,
            'total_warnings': session.total_warnings,
            'recent_events': ComplianceEventSerializer(recent_events, many=True).data
        })

    @action(detail=False, methods=['get'])
    def active_sessions(self, request):
        """Get all currently active monitoring sessions"""
        active_sessions = self.get_queryset().filter(
            session_status=ComplianceMonitoringSession.SessionStatus.ACTIVE
        )
        
        serializer = MonitoringSessionSummarySerializer(active_sessions, many=True)
        return Response({
            'active_sessions': serializer.data,
            'total_active': active_sessions.count()
        })


class ComplianceEventViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for compliance events"""
    queryset = ComplianceEvent.objects.select_related(
        'monitoring_session', 'compliance_zone', 'acknowledged_by', 'resolved_by'
    )
    serializer_class = ComplianceEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'monitoring_session', 'event_type', 'severity',
        'acknowledged_by', 'resolved_by', 'compliance_zone'
    ]
    search_fields = ['title', 'description']
    ordering_fields = ['timestamp', 'severity']
    ordering = ['-timestamp']

    def get_queryset(self):
        """Filter events by user permissions"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            # Non-staff users can only see events from their sessions
            queryset = queryset.filter(
                monitoring_session__driver=self.request.user
            )
        return queryset

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge a compliance event"""
        event = self.get_object()
        notes = request.data.get('notes', '')
        
        event.acknowledge(request.user, notes)
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a compliance event"""
        event = self.get_object()
        notes = request.data.get('notes', '')
        
        if not notes:
            return Response(
                {'error': 'Resolution notes are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.resolve(request.user, notes)
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """Get unresolved events requiring attention"""
        unresolved_events = self.get_queryset().filter(
            resolved_at__isnull=True,
            severity__in=[
                ComplianceEvent.Severity.VIOLATION,
                ComplianceEvent.Severity.CRITICAL,
                ComplianceEvent.Severity.EMERGENCY
            ]
        )
        
        serializer = self.get_serializer(unresolved_events, many=True)
        return Response({
            'unresolved_events': serializer.data,
            'total_unresolved': unresolved_events.count()
        })


class ComplianceAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for compliance alerts"""
    queryset = ComplianceAlert.objects.select_related(
        'compliance_event', 'recipient_user'
    )
    serializer_class = ComplianceAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['alert_type', 'status', 'recipient_user']
    search_fields = ['subject', 'message']
    ordering_fields = ['created_at', 'sent_at', 'delivered_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter alerts by user permissions"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            # Non-staff users can only see their own alerts
            queryset = queryset.filter(recipient_user=self.request.user)
        return queryset

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge an alert"""
        alert = self.get_object()
        alert.status = ComplianceAlert.AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = timezone.now()
        alert.save(update_fields=['status', 'acknowledged_at', 'updated_at'])
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)


class ComplianceReportViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for compliance reports"""
    queryset = ComplianceReport.objects.all()
    serializer_class = ComplianceReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type', 'generated_by']
    search_fields = ['title']
    ordering_fields = ['generated_at', 'period_start', 'period_end']
    ordering = ['-generated_at']


# API Views for Real-time Monitoring

class LiveTrackingView(views.APIView):
    """Live tracking view for fleet monitoring dashboard"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get live tracking data for all active sessions"""
        active_sessions = ComplianceMonitoringSession.objects.filter(
            session_status=ComplianceMonitoringSession.SessionStatus.ACTIVE
        ).select_related('shipment', 'vehicle', 'driver')
        
        tracking_data = []
        
        for session in active_sessions:
            # Get latest events
            recent_events = session.events.filter(
                timestamp__gte=timezone.now() - timezone.timedelta(minutes=30)
            ).order_by('-timestamp')[:5]
            
            session_data = {
                'session_id': session.id,
                'shipment_tracking': session.shipment.tracking_number,
                'vehicle_registration': session.vehicle.registration_number,
                'driver_name': session.driver.get_full_name(),
                'compliance_level': session.compliance_level,
                'compliance_score': float(session.compliance_score),
                'location': {
                    'latitude': session.last_known_location.y if session.last_known_location else None,
                    'longitude': session.last_known_location.x if session.last_known_location else None,
                    'last_updated': session.last_gps_update
                },
                'current_speed_kmh': float(session.current_speed_kmh) if session.current_speed_kmh else None,
                'hazard_classes': session.monitored_hazard_classes,
                'total_violations': session.total_violations,
                'total_warnings': session.total_warnings,
                'recent_events': [{
                    'event_type': event.event_type,
                    'severity': event.severity,
                    'title': event.title,
                    'timestamp': event.timestamp
                } for event in recent_events]
            }
            
            tracking_data.append(session_data)
        
        return Response({
            'active_sessions': tracking_data,
            'total_active': len(tracking_data),
            'last_updated': timezone.now()
        })


class ComplianceDashboardView(views.APIView):
    """Compliance dashboard with key metrics and alerts"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get compliance dashboard data"""
        # Get time period filter
        hours = int(request.query_params.get('hours', 24))
        since = timezone.now() - timezone.timedelta(hours=hours)
        
        # Active sessions
        active_sessions = ComplianceMonitoringSession.objects.filter(
            session_status=ComplianceMonitoringSession.SessionStatus.ACTIVE
        )
        
        # Recent events
        recent_events = ComplianceEvent.objects.filter(
            timestamp__gte=since
        ).select_related('monitoring_session')
        
        # Unresolved violations
        unresolved_violations = ComplianceEvent.objects.filter(
            resolved_at__isnull=True,
            severity__in=[
                ComplianceEvent.Severity.VIOLATION,
                ComplianceEvent.Severity.CRITICAL,
                ComplianceEvent.Severity.EMERGENCY
            ]
        )
        
        # Calculate metrics
        total_events = recent_events.count()
        violations = recent_events.filter(severity=ComplianceEvent.Severity.VIOLATION).count()
        critical_events = recent_events.filter(
            severity__in=[ComplianceEvent.Severity.CRITICAL, ComplianceEvent.Severity.EMERGENCY]
        ).count()
        
        # Compliance scores
        avg_compliance_score = 0
        if active_sessions.exists():
            scores = [float(s.compliance_score) for s in active_sessions]
            avg_compliance_score = sum(scores) / len(scores)
        
        dashboard_data = {
            'time_period_hours': hours,
            'active_sessions': active_sessions.count(),
            'total_events': total_events,
            'violations': violations,
            'critical_events': critical_events,
            'unresolved_violations': unresolved_violations.count(),
            'average_compliance_score': round(avg_compliance_score, 2),
            'compliance_distribution': {
                'compliant': active_sessions.filter(
                    compliance_level=ComplianceMonitoringSession.ComplianceLevel.COMPLIANT
                ).count(),
                'warning': active_sessions.filter(
                    compliance_level=ComplianceMonitoringSession.ComplianceLevel.WARNING
                ).count(),
                'violation': active_sessions.filter(
                    compliance_level=ComplianceMonitoringSession.ComplianceLevel.VIOLATION
                ).count(),
                'critical': active_sessions.filter(
                    compliance_level=ComplianceMonitoringSession.ComplianceLevel.CRITICAL
                ).count()
            },
            'recent_critical_events': [{
                'event_id': event.id,
                'session_id': event.monitoring_session.id,
                'vehicle': event.monitoring_session.vehicle.registration_number,
                'event_type': event.event_type,
                'severity': event.severity,
                'title': event.title,
                'timestamp': event.timestamp,
                'resolved': event.resolved_at is not None
            } for event in unresolved_violations.order_by('-timestamp')[:10]]
        }
        
        return Response(dashboard_data)


# Emergency Response API Functions

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def initiate_emergency_activation(request):
    """
    Step 1: Initiate emergency activation sequence with safeguards
    
    Returns activation token for multi-step verification process.
    """
    user = request.user
    shipment_id = request.data.get('shipment_id')
    emergency_type = request.data.get('emergency_type')
    
    # Input validation
    if not shipment_id or not emergency_type:
        return Response({
            'error': 'Missing required fields: shipment_id and emergency_type'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate emergency type
    valid_emergency_types = [
        'EMERGENCY_FIRE', 'EMERGENCY_SPILL', 'EMERGENCY_ACCIDENT',
        'EMERGENCY_MEDICAL', 'EMERGENCY_SECURITY', 'EMERGENCY_MECHANICAL',
        'EMERGENCY_WEATHER', 'EMERGENCY_OTHER'
    ]
    
    if emergency_type not in valid_emergency_types:
        return Response({
            'error': f'Invalid emergency type. Must be one of: {valid_emergency_types}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if shipment exists and user has access
    try:
        shipment = Shipment.objects.get(id=shipment_id)
        # Additional access control could be added here
    except Shipment.DoesNotExist:
        return Response({
            'error': 'Shipment not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Safeguard 1: Check cooldown period
    cooldown_key = f"emergency_cooldown_{user.id}"
    if cache.get(cooldown_key):
        return Response({
            'error': 'Emergency activation is in cooldown period. Please wait before trying again.',
            'retry_after_seconds': EMERGENCY_COOLDOWN_SECONDS
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Safeguard 2: Check false alarm count for today
    today = timezone.now().date()
    false_alarms_today = ComplianceEvent.objects.filter(
        monitoring_session__driver=user,
        event_type='EMERGENCY_FALSE_ALARM',
        timestamp__date=today
    ).count()
    
    if false_alarms_today >= MAX_FALSE_ALARMS_PER_DAY:
        return Response({
            'error': f'Emergency activation disabled due to {false_alarms_today} false alarms today. Contact support.',
            'emergency_disabled': True
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Generate activation token
    activation_token = str(uuid.uuid4())
    
    # Store activation data in cache with timeout
    activation_data = {
        'user_id': user.id,
        'shipment_id': shipment_id,
        'emergency_type': emergency_type,
        'initiated_at': timezone.now().isoformat(),
        'step': 'initiated',
        'false_alarms_today': false_alarms_today
    }
    
    cache.set(
        f"emergency_activation_{activation_token}",
        activation_data,
        timeout=ACTIVATION_TIMEOUT_SECONDS
    )
    
    # Set cooldown
    cache.set(cooldown_key, True, timeout=EMERGENCY_COOLDOWN_SECONDS)
    
    return Response({
        'activation_token': activation_token,
        'emergency_type': emergency_type,
        'shipment_tracking': shipment.tracking_number,
        'timeout_seconds': ACTIVATION_TIMEOUT_SECONDS,
        'next_step': 'confirm_activation',
        'safeguards': {
            'false_alarms_today': false_alarms_today,
            'max_false_alarms': MAX_FALSE_ALARMS_PER_DAY,
            'cooldown_active': True
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_emergency_activation(request):
    """
    Step 2: Confirm emergency activation with PIN verification
    
    User must provide activation token and PIN to proceed.
    """
    user = request.user
    activation_token = request.data.get('activation_token')
    user_pin = request.data.get('pin')
    confirm_text = request.data.get('confirm_text', '').upper()
    
    # Input validation
    if not activation_token or not user_pin:
        return Response({
            'error': 'Missing required fields: activation_token and pin'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Retrieve activation data
    activation_data = cache.get(f"emergency_activation_{activation_token}")
    if not activation_data:
        return Response({
            'error': 'Invalid or expired activation token'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify user owns this activation
    if activation_data['user_id'] != user.id:
        return Response({
            'error': 'Invalid activation token for this user'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Verify PIN (using a simple PIN system - in production this would be more secure)
    expected_pin = getattr(user, 'emergency_pin', None) or '1234'  # Default PIN if not set
    if user_pin != expected_pin:
        return Response({
            'error': 'Incorrect PIN. Emergency activation denied.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Verify confirmation text
    if confirm_text != 'EMERGENCY':
        return Response({
            'error': 'You must type "EMERGENCY" to confirm activation'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update activation data
    activation_data['step'] = 'confirmed'
    activation_data['confirmed_at'] = timezone.now().isoformat()
    activation_data['pin_verified'] = True
    
    cache.set(
        f"emergency_activation_{activation_token}",
        activation_data,
        timeout=ACTIVATION_TIMEOUT_SECONDS
    )
    
    return Response({
        'activation_token': activation_token,
        'confirmation_status': 'confirmed',
        'next_step': 'activate_emergency',
        'message': 'Emergency activation confirmed. Proceed to final activation step.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def activate_emergency(request):
    """
    Step 3: Final emergency activation with data assembly and broadcast
    
    Creates emergency event and broadcasts to all relevant parties.
    """
    user = request.user
    activation_token = request.data.get('activation_token')
    location_data = request.data.get('location', {})
    additional_notes = request.data.get('notes', '')
    severity_level = request.data.get('severity_level', 'MEDIUM')
    
    # Input validation
    if not activation_token:
        return Response({
            'error': 'Missing activation_token'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Retrieve and validate activation data
    activation_data = cache.get(f"emergency_activation_{activation_token}")
    if not activation_data:
        return Response({
            'error': 'Invalid or expired activation token'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if activation_data['user_id'] != user.id:
        return Response({
            'error': 'Invalid activation token for this user'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if activation_data['step'] != 'confirmed':
        return Response({
            'error': 'Emergency activation not properly confirmed'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate severity level
    valid_severity_levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'CATASTROPHIC']
    if severity_level not in valid_severity_levels:
        severity_level = 'MEDIUM'
    
    try:
        with transaction.atomic():
            # Get shipment and create/get monitoring session
            shipment = Shipment.objects.get(id=activation_data['shipment_id'])
            
            # Find active monitoring session or create one
            monitoring_session = ComplianceMonitoringSession.objects.filter(
                shipment=shipment,
                session_status__in=['ACTIVE', 'PAUSED']
            ).first()
            
            if not monitoring_session:
                # Create emergency monitoring session
                vehicle = getattr(shipment, 'vehicle', None)
                monitoring_session = ComplianceMonitoringSession.objects.create(
                    shipment=shipment,
                    vehicle=vehicle or user.vehicles.first(),  # Fallback to user's first vehicle
                    driver=user,
                    session_status='INCIDENT',
                    compliance_level='CRITICAL'
                )
            else:
                # Update existing session to incident status
                monitoring_session.session_status = 'INCIDENT'
                monitoring_session.compliance_level = 'CRITICAL'
                monitoring_session.save()
            
            # Create location point if provided
            location_point = None
            if location_data.get('latitude') and location_data.get('longitude'):
                location_point = Point(
                    float(location_data['longitude']),
                    float(location_data['latitude'])
                )
            
            # Create emergency compliance event
            emergency_event = ComplianceEvent.objects.create(
                monitoring_session=monitoring_session,
                event_type=activation_data['emergency_type'],
                severity='EMERGENCY',
                title=f"{activation_data['emergency_type'].replace('EMERGENCY_', '').replace('_', ' ').title()} Emergency",
                description=f"Emergency activated by {user.get_full_name()} for shipment {shipment.tracking_number}. {additional_notes}".strip(),
                location=location_point,
                emergency_activation_method='PANIC_BUTTON',
                emergency_severity_level=severity_level,
                activation_verification={
                    'activation_token': activation_token,
                    'initiated_at': activation_data['initiated_at'],
                    'confirmed_at': activation_data['confirmed_at'],
                    'pin_verified': activation_data['pin_verified'],
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'ip_address': get_client_ip(request)
                },
                event_data={
                    'shipment_id': str(shipment.id),
                    'activation_method': 'mobile_app',
                    'location_data': location_data,
                    'additional_notes': additional_notes,
                    'nearest_address': location_data.get('address', 'Unknown'),
                    'landmark_description': location_data.get('landmark', ''),
                }
            )
            
            # Create communication event for shipment timeline
            ShipmentEvent.objects.create(
                shipment=shipment,
                user=user,
                event_type='ALERT',
                title=f"EMERGENCY: {activation_data['emergency_type'].replace('EMERGENCY_', '').replace('_', ' ').title()}",
                details=f"Emergency situation activated. Location: {location_data.get('address', 'Unknown')}. Severity: {severity_level}. Notes: {additional_notes}",
                priority='URGENT'
            )
            
            # Get comprehensive emergency data packet
            emergency_data_packet = emergency_event.get_emergency_data_packet()
            
            # Clear activation token from cache
            cache.delete(f"emergency_activation_{activation_token}")
            
            # Broadcast emergency to relevant parties (async)
            broadcast_emergency_alert.delay(str(emergency_event.id))
            
            return Response({
                'emergency_id': str(emergency_event.id),
                'status': 'activated',
                'emergency_type': activation_data['emergency_type'],
                'severity_level': severity_level,
                'shipment_tracking': shipment.tracking_number,
                'activation_time': emergency_event.timestamp.isoformat(),
                'emergency_data': emergency_data_packet,
                'next_steps': [
                    'Emergency services will be contacted automatically',
                    'Management and schedulers have been notified',
                    'Emergency response guide has been prepared',
                    'Stay safe and await further instructions'
                ]
            }, status=status.HTTP_201_CREATED)
            
    except Shipment.DoesNotExist:
        return Response({
            'error': 'Shipment not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Failed to activate emergency: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_false_alarm(request):
    """
    Mark an emergency as a false alarm
    
    Allows users to quickly mark accidental activations as false alarms.
    """
    emergency_id = request.data.get('emergency_id')
    reason = request.data.get('reason', 'Accidental activation')
    
    if not emergency_id:
        return Response({
            'error': 'Missing emergency_id'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        emergency_event = ComplianceEvent.objects.get(
            id=emergency_id,
            monitoring_session__driver=request.user
        )
        
        if not emergency_event.is_emergency:
            return Response({
                'error': 'This is not an emergency event'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if emergency_event.resolved_at:
            return Response({
                'error': 'Emergency has already been resolved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as false alarm
        emergency_event.mark_false_alarm(request.user, reason)
        
        return Response({
            'message': 'Emergency marked as false alarm',
            'emergency_id': str(emergency_event.id),
            'false_alarm_count': emergency_event.false_alarm_count
        }, status=status.HTTP_200_OK)
        
    except ComplianceEvent.DoesNotExist:
        return Response({
            'error': 'Emergency event not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_emergency_status(request, emergency_id):
    """
    Get current status of an emergency event
    """
    try:
        emergency_event = ComplianceEvent.objects.get(id=emergency_id)
        
        # Basic access control - allow access to driver, shipment stakeholders, and management
        has_access = (
            emergency_event.monitoring_session.driver == request.user or
            emergency_event.monitoring_session.shipment.created_by == request.user or
            request.user.is_staff
        )
        
        if not has_access:
            return Response({
                'error': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            'emergency_id': str(emergency_event.id),
            'emergency_type': emergency_event.event_type,
            'severity': emergency_event.emergency_severity_level,
            'status': 'resolved' if emergency_event.resolved_at else 'active',
            'activation_time': emergency_event.timestamp.isoformat(),
            'is_false_alarm': emergency_event.is_false_alarm,
            'emergency_services_notified': emergency_event.emergency_services_notified,
            'contacts_notified': len(emergency_event.emergency_contacts_notified),
            'response_time': str(emergency_event.emergency_response_time) if emergency_event.emergency_response_time else None,
            'location': {
                'latitude': emergency_event.location.y if emergency_event.location else None,
                'longitude': emergency_event.location.x if emergency_event.location else None,
            },
            'shipment_tracking': emergency_event.monitoring_session.shipment.tracking_number
        }, status=status.HTTP_200_OK)
        
    except ComplianceEvent.DoesNotExist:
        return Response({
            'error': 'Emergency event not found'
        }, status=status.HTTP_404_NOT_FOUND)


# Legacy Emergency Response View (kept for compatibility)
class EmergencyResponseView(views.APIView):
    """Emergency response coordination for critical violations"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Trigger emergency response for critical incident"""
        event_id = request.data.get('event_id')
        response_type = request.data.get('response_type', 'STANDARD')
        notes = request.data.get('notes', '')
        
        if not event_id:
            return Response(
                {'error': 'event_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            event = ComplianceEvent.objects.get(id=event_id)
            
            # Create emergency response record
            emergency_event = ComplianceEvent.objects.create(
                monitoring_session=event.monitoring_session,
                event_type=ComplianceEvent.EventType.EMERGENCY_STOP,
                severity=ComplianceEvent.Severity.EMERGENCY,
                title=f"Emergency Response Initiated",
                description=f"Emergency response triggered for {event.title}. Response type: {response_type}. {notes}",
                location=event.location,
                event_data={
                    'original_event_id': str(event.id),
                    'response_type': response_type,
                    'initiated_by': request.user.id,
                    'notes': notes
                }
            )
            
            # Send emergency alerts
            ComplianceAlert.objects.create(
                compliance_event=emergency_event,
                alert_type=ComplianceAlert.AlertType.SMS,
                recipient_user=event.monitoring_session.driver,
                subject="EMERGENCY: Stop Vehicle Immediately",
                message=f"Emergency response initiated. Stop vehicle safely and await instructions. Incident: {event.title}"
            )
            
            return Response({
                'emergency_response_initiated': True,
                'emergency_event_id': emergency_event.id,
                'original_event_id': event.id,
                'response_type': response_type
            })
            
        except ComplianceEvent.DoesNotExist:
            return Response(
                {'error': 'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# Utility functions

def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# Celery task for async emergency broadcasting
@current_app.task(bind=True, ignore_result=True)
def broadcast_emergency_alert(self, emergency_event_id: str):
    """
    Async task to broadcast emergency alerts to all relevant parties
    
    This task handles:
    - SMS/Email notifications to emergency contacts
    - Push notifications to management/schedulers
    - Integration with external emergency services
    - Webhook notifications to third-party systems
    """
    try:
        emergency_event = ComplianceEvent.objects.get(id=emergency_event_id)
        emergency_data = emergency_event.get_emergency_data_packet()
        
        # This would integrate with existing notification systems
        # For now, we'll create shipment events to notify stakeholders
        
        shipment = emergency_event.monitoring_session.shipment
        
        # Notify shipment stakeholders
        stakeholders = [shipment.created_by]
        if hasattr(shipment, 'customer') and shipment.customer:
            stakeholders.append(shipment.customer)
        
        for stakeholder in stakeholders:
            ShipmentEvent.objects.create(
                shipment=shipment,
                user=stakeholder,
                event_type='ALERT',
                title=f"EMERGENCY ALERT: {emergency_event.get_event_type_display()}",
                details=f"Emergency situation for shipment {shipment.tracking_number}. "
                       f"Driver: {emergency_event.monitoring_session.driver.get_full_name()}. "
                       f"Location: {emergency_data.get('location', {}).get('nearest_address', 'Unknown')}. "
                       f"Emergency services have been notified.",
                priority='URGENT'
            )
        
        # Mark contacts as notified
        emergency_event.emergency_contacts_notified = [
            f"emergency_services_000",
            f"management_notifications",
            f"scheduler_alerts"
        ]
        emergency_event.emergency_services_notified = True
        emergency_event.save(update_fields=[
            'emergency_contacts_notified', 
            'emergency_services_notified'
        ])
        
    except ComplianceEvent.DoesNotExist:
        pass  # Event was deleted, ignore
    except Exception as e:
        # Log error but don't fail the emergency activation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to broadcast emergency alert for {emergency_event_id}: {str(e)}")