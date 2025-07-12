# compliance/monitoring_service.py

"""
Real-time Compliance Monitoring Service for ADG dangerous goods transport.

This service provides:
- GPS-based route monitoring and validation
- Real-time compliance checking against ADG regulations
- Automated alert generation and notification
- Zone restriction enforcement
- Speed and route compliance monitoring
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from django.contrib.gis.geos import Point, LineString
from django.contrib.gis.measure import Distance
from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from .models import (
    ComplianceZone, ComplianceMonitoringSession, ComplianceEvent, 
    ComplianceAlert
)
from vehicles.models import Vehicle
from shipments.models import Shipment
from dangerous_goods.models import DangerousGood

logger = logging.getLogger(__name__)


class RealTimeComplianceMonitor:
    """Real-time compliance monitoring service for dangerous goods transport"""
    
    # Speed limits and thresholds
    DEFAULT_SPEED_LIMIT_KMH = 80
    SPEED_WARNING_THRESHOLD = 0.9  # 90% of speed limit
    SPEED_VIOLATION_THRESHOLD = 1.1  # 110% of speed limit
    
    # Route deviation thresholds
    ROUTE_DEVIATION_WARNING_METERS = 500
    ROUTE_DEVIATION_VIOLATION_METERS = 1000
    
    # GPS update frequency requirements
    GPS_UPDATE_INTERVAL_SECONDS = 30
    GPS_STALE_THRESHOLD_SECONDS = 300  # 5 minutes
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    def start_monitoring_session(self, shipment: Shipment, vehicle: Vehicle, 
                                driver, planned_route: Optional[LineString] = None) -> ComplianceMonitoringSession:
        """Start a new compliance monitoring session for a dangerous goods shipment"""
        
        with transaction.atomic():
            # Extract dangerous goods classes from shipment
            hazard_classes = self._extract_hazard_classes(shipment)
            
            # Create monitoring session
            session = ComplianceMonitoringSession.objects.create(
                shipment=shipment,
                vehicle=vehicle,
                driver=driver,
                planned_route=planned_route,
                monitored_hazard_classes=hazard_classes,
                scheduled_completion=shipment.estimated_delivery_date
            )
            
            # Create initial event
            self._create_event(
                session=session,
                event_type=ComplianceEvent.EventType.SYSTEM_ALERT,
                severity=ComplianceEvent.Severity.INFO,
                title="Monitoring Session Started",
                description=f"Real-time compliance monitoring started for shipment {shipment.tracking_number}",
                location=vehicle.last_known_location
            )
            
            self.logger.info(f"Started monitoring session {session.id} for shipment {shipment.tracking_number}")
            return session
    
    def process_gps_update(self, session: ComplianceMonitoringSession, 
                          latitude: float, longitude: float, 
                          speed_kmh: float = None, timestamp: datetime = None) -> Dict:
        """Process a GPS location update and perform compliance checks"""
        
        if timestamp is None:
            timestamp = timezone.now()
        
        location = Point(longitude, latitude, srid=4326)
        
        # Update session with new location
        session.last_known_location = location
        session.last_gps_update = timestamp
        if speed_kmh is not None:
            session.current_speed_kmh = speed_kmh
        session.save(update_fields=['last_known_location', 'last_gps_update', 'current_speed_kmh', 'updated_at'])
        
        # Update vehicle location
        session.vehicle.update_location(latitude, longitude, timestamp)
        
        # Create GPS update event
        gps_event = self._create_event(
            session=session,
            event_type=ComplianceEvent.EventType.GPS_UPDATE,
            severity=ComplianceEvent.Severity.INFO,
            title="GPS Location Update",
            description=f"Vehicle location updated: {latitude:.6f}, {longitude:.6f}",
            location=location,
            event_data={
                'latitude': latitude,
                'longitude': longitude,
                'speed_kmh': speed_kmh,
                'timestamp': timestamp.isoformat()
            }
        )
        
        # Perform compliance checks
        compliance_results = self._perform_compliance_checks(session, location, speed_kmh)
        
        # Update session compliance metrics if violations detected
        if compliance_results['violations'] or compliance_results['warnings']:
            self._update_session_compliance(session, compliance_results)
        
        return {
            'session_id': session.id,
            'location_updated': True,
            'compliance_results': compliance_results,
            'gps_event_id': gps_event.id
        }
    
    def _perform_compliance_checks(self, session: ComplianceMonitoringSession, 
                                 location: Point, speed_kmh: Optional[float]) -> Dict:
        """Perform comprehensive compliance checks for the current location and speed"""
        
        violations = []
        warnings = []
        
        # 1. Speed compliance check
        if speed_kmh is not None:
            speed_results = self._check_speed_compliance(session, location, speed_kmh)
            violations.extend(speed_results['violations'])
            warnings.extend(speed_results['warnings'])
        
        # 2. Zone compliance check
        zone_results = self._check_zone_compliance(session, location)
        violations.extend(zone_results['violations'])
        warnings.extend(zone_results['warnings'])
        
        # 3. Route deviation check
        if session.planned_route:
            route_results = self._check_route_compliance(session, location)
            violations.extend(route_results['violations'])
            warnings.extend(route_results['warnings'])
        
        # 4. GPS update frequency check
        frequency_results = self._check_gps_frequency(session)
        violations.extend(frequency_results['violations'])
        warnings.extend(frequency_results['warnings'])
        
        return {
            'violations': violations,
            'warnings': warnings,
            'total_issues': len(violations) + len(warnings),
            'location': {
                'latitude': location.y,
                'longitude': location.x
            }
        }
    
    def _check_speed_compliance(self, session: ComplianceMonitoringSession, 
                              location: Point, speed_kmh: float) -> Dict:
        """Check speed compliance against speed limits and dangerous goods restrictions"""
        
        violations = []
        warnings = []
        
        # Get applicable speed limit
        speed_limit = self._get_applicable_speed_limit(location, session.monitored_hazard_classes)
        
        # Check for speed violations
        if speed_kmh > (speed_limit * self.SPEED_VIOLATION_THRESHOLD):
            violation_event = self._create_event(
                session=session,
                event_type=ComplianceEvent.EventType.SPEED_VIOLATION,
                severity=ComplianceEvent.Severity.VIOLATION,
                title="Speed Limit Violation",
                description=f"Vehicle exceeding speed limit: {speed_kmh:.1f} km/h (limit: {speed_limit} km/h)",
                location=location,
                event_data={
                    'current_speed': speed_kmh,
                    'speed_limit': speed_limit,
                    'violation_percentage': (speed_kmh / speed_limit) * 100
                }
            )
            violations.append(violation_event)
            
            # Send immediate alert for serious speed violations
            if speed_kmh > (speed_limit * 1.25):  # 25% over limit
                self._send_critical_alert(session, violation_event)
        
        elif speed_kmh > (speed_limit * self.SPEED_WARNING_THRESHOLD):
            warning_event = self._create_event(
                session=session,
                event_type=ComplianceEvent.EventType.SPEED_VIOLATION,
                severity=ComplianceEvent.Severity.WARNING,
                title="Speed Warning",
                description=f"Vehicle approaching speed limit: {speed_kmh:.1f} km/h (limit: {speed_limit} km/h)",
                location=location,
                event_data={
                    'current_speed': speed_kmh,
                    'speed_limit': speed_limit,
                    'warning_percentage': (speed_kmh / speed_limit) * 100
                }
            )
            warnings.append(warning_event)
        
        return {'violations': violations, 'warnings': warnings}
    
    def _check_zone_compliance(self, session: ComplianceMonitoringSession, 
                             location: Point) -> Dict:
        """Check compliance with restricted/prohibited zones"""
        
        violations = []
        warnings = []
        
        # Find zones that contain this location
        zones = ComplianceZone.objects.filter(
            boundary__contains=location,
            is_active=True
        )
        
        for zone in zones:
            # Check if any monitored hazard classes are restricted/prohibited
            for hazard_class in session.monitored_hazard_classes:
                if not zone.is_hazard_class_allowed(hazard_class):
                    
                    if hazard_class in zone.prohibited_hazard_classes:
                        # Critical violation - prohibited zone
                        violation_event = self._create_event(
                            session=session,
                            event_type=ComplianceEvent.EventType.ZONE_VIOLATION,
                            severity=ComplianceEvent.Severity.CRITICAL,
                            title="Prohibited Zone Entry",
                            description=f"Vehicle entered prohibited zone '{zone.name}' with Class {hazard_class} dangerous goods",
                            location=location,
                            compliance_zone=zone,
                            event_data={
                                'zone_name': zone.name,
                                'zone_type': zone.zone_type,
                                'hazard_class': hazard_class,
                                'prohibition_type': 'PROHIBITED'
                            }
                        )
                        violations.append(violation_event)
                        
                        # Send immediate critical alert
                        self._send_critical_alert(session, violation_event)
                    
                    elif hazard_class in zone.restricted_hazard_classes:
                        # Warning - restricted zone
                        warning_event = self._create_event(
                            session=session,
                            event_type=ComplianceEvent.EventType.ZONE_VIOLATION,
                            severity=ComplianceEvent.Severity.WARNING,
                            title="Restricted Zone Entry",
                            description=f"Vehicle entered restricted zone '{zone.name}' with Class {hazard_class} dangerous goods",
                            location=location,
                            compliance_zone=zone,
                            event_data={
                                'zone_name': zone.name,
                                'zone_type': zone.zone_type,
                                'hazard_class': hazard_class,
                                'prohibition_type': 'RESTRICTED'
                            }
                        )
                        warnings.append(warning_event)
        
        return {'violations': violations, 'warnings': warnings}
    
    def _check_route_compliance(self, session: ComplianceMonitoringSession, 
                              location: Point) -> Dict:
        """Check for route deviations from planned route"""
        
        violations = []
        warnings = []
        
        if not session.planned_route:
            return {'violations': violations, 'warnings': warnings}
        
        # Calculate distance from planned route
        distance_from_route = session.planned_route.distance(location)
        distance_meters = distance_from_route.m if hasattr(distance_from_route, 'm') else distance_from_route
        
        if distance_meters > self.ROUTE_DEVIATION_VIOLATION_METERS:
            violation_event = self._create_event(
                session=session,
                event_type=ComplianceEvent.EventType.ROUTE_DEVIATION,
                severity=ComplianceEvent.Severity.VIOLATION,
                title="Major Route Deviation",
                description=f"Vehicle deviated {distance_meters:.0f}m from planned route",
                location=location,
                event_data={
                    'deviation_distance_meters': distance_meters,
                    'planned_route_length': session.planned_route.length,
                    'deviation_severity': 'MAJOR'
                }
            )
            violations.append(violation_event)
        
        elif distance_meters > self.ROUTE_DEVIATION_WARNING_METERS:
            warning_event = self._create_event(
                session=session,
                event_type=ComplianceEvent.EventType.ROUTE_DEVIATION,
                severity=ComplianceEvent.Severity.WARNING,
                title="Route Deviation Warning",
                description=f"Vehicle deviated {distance_meters:.0f}m from planned route",
                location=location,
                event_data={
                    'deviation_distance_meters': distance_meters,
                    'planned_route_length': session.planned_route.length,
                    'deviation_severity': 'MINOR'
                }
            )
            warnings.append(warning_event)
        
        return {'violations': violations, 'warnings': warnings}
    
    def _check_gps_frequency(self, session: ComplianceMonitoringSession) -> Dict:
        """Check GPS update frequency compliance"""
        
        violations = []
        warnings = []
        
        if session.last_gps_update:
            time_since_update = (timezone.now() - session.last_gps_update).total_seconds()
            
            if time_since_update > self.GPS_STALE_THRESHOLD_SECONDS:
                violation_event = self._create_event(
                    session=session,
                    event_type=ComplianceEvent.EventType.SYSTEM_ALERT,
                    severity=ComplianceEvent.Severity.VIOLATION,
                    title="GPS Communication Lost",
                    description=f"No GPS updates received for {time_since_update:.0f} seconds",
                    event_data={
                        'time_since_update_seconds': time_since_update,
                        'threshold_seconds': self.GPS_STALE_THRESHOLD_SECONDS,
                        'last_update': session.last_gps_update.isoformat()
                    }
                )
                violations.append(violation_event)
        
        return {'violations': violations, 'warnings': warnings}
    
    def _get_applicable_speed_limit(self, location: Point, hazard_classes: List[str]) -> int:
        """Get applicable speed limit for location and dangerous goods classes"""
        
        # Check for zone-specific speed limits
        zones = ComplianceZone.objects.filter(
            boundary__contains=location,
            is_active=True,
            max_speed_kmh__isnull=False
        ).order_by('max_speed_kmh')  # Get most restrictive
        
        if zones.exists():
            zone = zones.first()
            return zone.max_speed_kmh
        
        # Apply dangerous goods specific speed limits
        dg_speed_limits = {
            '1': 60,  # Explosives - lower speed limit
            '2': 70,  # Gases
            '3': 70,  # Flammable liquids
            '7': 60,  # Radioactive - lower speed limit
        }
        
        for hazard_class in hazard_classes:
            if hazard_class in dg_speed_limits:
                return dg_speed_limits[hazard_class]
        
        return self.DEFAULT_SPEED_LIMIT_KMH
    
    def _extract_hazard_classes(self, shipment: Shipment) -> List[str]:
        """Extract dangerous goods hazard classes from shipment"""
        
        hazard_classes = []
        
        for item in shipment.items.filter(is_dangerous_good=True):
            if item.dangerous_good_entry and item.dangerous_good_entry.hazard_class:
                # Extract main class number (e.g., "3.2" -> "3")
                main_class = item.dangerous_good_entry.hazard_class.split('.')[0]
                if main_class not in hazard_classes:
                    hazard_classes.append(main_class)
        
        return hazard_classes
    
    def _create_event(self, session: ComplianceMonitoringSession, event_type: str, 
                     severity: str, title: str, description: str, 
                     location: Point = None, compliance_zone = None, 
                     event_data: Dict = None) -> ComplianceEvent:
        """Create a compliance event"""
        
        event = ComplianceEvent.objects.create(
            monitoring_session=session,
            event_type=event_type,
            severity=severity,
            title=title,
            description=description,
            location=location,
            compliance_zone=compliance_zone,
            event_data=event_data or {}
        )
        
        self.logger.info(f"Created {severity} event: {title} for session {session.id}")
        return event
    
    def _update_session_compliance(self, session: ComplianceMonitoringSession, 
                                 compliance_results: Dict):
        """Update session compliance metrics based on new violations/warnings"""
        
        violation_count = len(compliance_results['violations'])
        warning_count = len(compliance_results['warnings'])
        
        session.total_violations += violation_count
        session.total_warnings += warning_count
        session.alert_count += violation_count + warning_count
        session.last_alert_at = timezone.now()
        
        # Update compliance score
        session.update_compliance_score()
        
        self.logger.info(
            f"Updated session {session.id} compliance: "
            f"{violation_count} violations, {warning_count} warnings"
        )
    
    def _send_critical_alert(self, session: ComplianceMonitoringSession, 
                           event: ComplianceEvent):
        """Send immediate alert for critical compliance violations"""
        
        # Create alert for driver
        ComplianceAlert.objects.create(
            compliance_event=event,
            alert_type=ComplianceAlert.AlertType.PUSH,
            recipient_user=session.driver,
            subject=f"CRITICAL: {event.title}",
            message=f"Immediate attention required: {event.description}"
        )
        
        # Create alert for fleet manager (if available)
        # This would integrate with user management to find fleet managers
        
        # Create dashboard alert
        ComplianceAlert.objects.create(
            compliance_event=event,
            alert_type=ComplianceAlert.AlertType.DASHBOARD,
            subject=f"Critical Violation - {session.shipment.tracking_number}",
            message=f"Vehicle {session.vehicle.registration_number}: {event.description}"
        )
        
        self.logger.critical(
            f"Critical alert sent for session {session.id}: {event.title}"
        )
    
    def complete_monitoring_session(self, session: ComplianceMonitoringSession, 
                                  completion_notes: str = "") -> Dict:
        """Complete a monitoring session and generate final report"""
        
        session.session_status = ComplianceMonitoringSession.SessionStatus.COMPLETED
        session.completed_at = timezone.now()
        session.save(update_fields=['session_status', 'completed_at', 'updated_at'])
        
        # Create completion event
        completion_event = self._create_event(
            session=session,
            event_type=ComplianceEvent.EventType.SYSTEM_ALERT,
            severity=ComplianceEvent.Severity.INFO,
            title="Monitoring Session Completed",
            description=f"Monitoring completed for shipment {session.shipment.tracking_number}. " + completion_notes,
            location=session.last_known_location
        )
        
        # Generate session summary
        summary = self._generate_session_summary(session)
        
        self.logger.info(f"Completed monitoring session {session.id}")
        return summary
    
    def _generate_session_summary(self, session: ComplianceMonitoringSession) -> Dict:
        """Generate comprehensive session summary"""
        
        events = session.events.all()
        duration = None
        
        if session.completed_at and session.started_at:
            duration = session.completed_at - session.started_at
        
        summary = {
            'session_id': session.id,
            'shipment_tracking_number': session.shipment.tracking_number,
            'vehicle_registration': session.vehicle.registration_number,
            'driver_name': session.driver.get_full_name(),
            'duration_hours': duration.total_seconds() / 3600 if duration else None,
            'compliance_score': float(session.compliance_score),
            'compliance_level': session.compliance_level,
            'total_events': events.count(),
            'total_violations': session.total_violations,
            'total_warnings': session.total_warnings,
            'hazard_classes_monitored': session.monitored_hazard_classes,
            'events_by_type': {},
            'events_by_severity': {}
        }
        
        # Aggregate events by type and severity
        for event in events:
            event_type = event.event_type
            severity = event.severity
            
            if event_type not in summary['events_by_type']:
                summary['events_by_type'][event_type] = 0
            summary['events_by_type'][event_type] += 1
            
            if severity not in summary['events_by_severity']:
                summary['events_by_severity'][severity] = 0
            summary['events_by_severity'][severity] += 1
        
        return summary


class ComplianceZoneManager:
    """Manager for compliance zones and geo-fencing"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    def check_location_restrictions(self, location: Point, 
                                  hazard_classes: List[str]) -> Dict:
        """Check if location has restrictions for given hazard classes"""
        
        zones = ComplianceZone.objects.filter(
            boundary__contains=location,
            is_active=True
        )
        
        restrictions = {
            'restricted_zones': [],
            'prohibited_zones': [],
            'special_requirements': [],
            'overall_allowed': True
        }
        
        for zone in zones:
            zone_info = {
                'zone_id': zone.id,
                'name': zone.name,
                'type': zone.zone_type,
                'authority': zone.regulatory_authority
            }
            
            for hazard_class in hazard_classes:
                if hazard_class in zone.prohibited_hazard_classes:
                    restrictions['prohibited_zones'].append({
                        **zone_info,
                        'hazard_class': hazard_class,
                        'restriction_type': 'PROHIBITED'
                    })
                    restrictions['overall_allowed'] = False
                
                elif hazard_class in zone.restricted_hazard_classes:
                    restrictions['restricted_zones'].append({
                        **zone_info,
                        'hazard_class': hazard_class,
                        'restriction_type': 'RESTRICTED'
                    })
                
                # Check special requirements
                if zone.requires_escort or zone.requires_notification:
                    restrictions['special_requirements'].append({
                        **zone_info,
                        'requires_escort': zone.requires_escort,
                        'requires_notification': zone.requires_notification
                    })
        
        return restrictions
    
    def get_safe_route(self, start_point: Point, end_point: Point, 
                      hazard_classes: List[str]) -> Optional[LineString]:
        """Generate a safe route avoiding restricted zones (placeholder for route optimization)"""
        
        # This is a placeholder for route optimization logic
        # In a real implementation, this would integrate with routing services
        # and calculate routes that avoid prohibited/restricted zones
        
        self.logger.info(
            f"Route calculation requested from {start_point} to {end_point} "
            f"for hazard classes {hazard_classes}"
        )
        
        # For now, return a simple straight line
        # In production, this would use external routing APIs
        return LineString([start_point, end_point], srid=4326)