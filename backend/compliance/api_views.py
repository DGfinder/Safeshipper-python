# compliance/api_views.py

from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.contrib.auth import get_user_model

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

User = get_user_model()


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