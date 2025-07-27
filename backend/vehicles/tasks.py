# vehicles/tasks.py
import logging
from typing import Dict, List, Optional, Any
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import timedelta, datetime
from django.core.cache import cache

from .models import Vehicle, VehicleMaintenanceRecord, VehicleSafetyEquipment
from .safety_services import safety_equipment_service
from communications.tasks import send_email, send_emergency_alert

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def perform_vehicle_safety_inspection(self, vehicle_id: str, inspection_type: str = 'routine'):
    """
    Perform comprehensive safety inspection for a vehicle including
    dangerous goods equipment, maintenance status, and compliance checks.
    
    Args:
        vehicle_id: UUID of the vehicle to inspect
        inspection_type: Type of inspection ('routine', 'pre_trip', 'annual', 'emergency')
    """
    try:
        logger.info(f"Starting {inspection_type} safety inspection for vehicle {vehicle_id}")
        
        vehicle = Vehicle.objects.prefetch_related(
            'safety_equipment',
            'maintenance_records'
        ).get(id=vehicle_id)
        
        inspection_results = {
            'vehicle_id': vehicle_id,
            'inspection_type': inspection_type,
            'inspection_timestamp': timezone.now().isoformat(),
            'inspector': 'automated_system',
            'overall_status': 'PASS',
            'safety_equipment_status': {},
            'maintenance_status': {},
            'compliance_status': {},
            'issues': [],
            'warnings': [],
            'recommendations': []
        }
        
        # 1. Safety equipment inspection
        equipment_status = _inspect_safety_equipment(vehicle)
        inspection_results['safety_equipment_status'] = equipment_status
        
        # 2. Maintenance status check
        maintenance_status = _check_maintenance_status(vehicle)
        inspection_results['maintenance_status'] = maintenance_status
        
        # 3. Compliance verification
        compliance_status = _verify_vehicle_compliance(vehicle)
        inspection_results['compliance_status'] = compliance_status
        
        # 4. Document expiration checks
        document_issues = _check_document_expiration(vehicle)
        inspection_results['warnings'].extend(document_issues)
        
        # Collect all issues
        all_issues = []
        all_issues.extend(equipment_status.get('issues', []))
        all_issues.extend(maintenance_status.get('issues', []))
        all_issues.extend(compliance_status.get('issues', []))
        
        inspection_results['issues'] = all_issues
        
        # Determine overall status
        critical_issues = [issue for issue in all_issues if issue.get('severity') == 'CRITICAL']
        high_issues = [issue for issue in all_issues if issue.get('severity') == 'HIGH']
        
        if critical_issues:
            inspection_results['overall_status'] = 'FAIL'
            vehicle.safety_status = 'OUT_OF_SERVICE'
        elif high_issues:
            inspection_results['overall_status'] = 'WARNING'
            vehicle.safety_status = 'REQUIRES_ATTENTION'
        else:
            inspection_results['overall_status'] = 'PASS'
            vehicle.safety_status = 'OPERATIONAL'
        
        # Update vehicle with inspection results
        vehicle.last_safety_inspection = timezone.now()
        vehicle.safety_inspection_results = inspection_results
        vehicle.save(update_fields=[
            'last_safety_inspection',
            'safety_inspection_results',
            'safety_status'
        ])
        
        # Send alerts for critical issues
        if critical_issues:
            _send_vehicle_safety_alerts(vehicle, inspection_results)
        
        # Schedule maintenance if needed
        if maintenance_status.get('requires_maintenance'):
            schedule_vehicle_maintenance.delay(vehicle_id, 'preventive')
        
        logger.info(f"Safety inspection completed for vehicle {vehicle_id}: {inspection_results['overall_status']}")
        
        return inspection_results
        
    except Vehicle.DoesNotExist:
        logger.error(f"Vehicle {vehicle_id} not found")
        raise
    except Exception as exc:
        logger.error(f"Safety inspection failed for vehicle {vehicle_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'vehicle_id': vehicle_id,
                'overall_status': 'ERROR',
                'error': str(exc)
            }

@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def schedule_vehicle_maintenance(self, vehicle_id: str, maintenance_type: str, priority: str = 'medium'):
    """
    Schedule maintenance for a vehicle based on usage, time, or safety requirements.
    
    Args:
        vehicle_id: UUID of the vehicle
        maintenance_type: Type of maintenance ('preventive', 'corrective', 'emergency')
        priority: Priority level ('low', 'medium', 'high', 'critical')
    """
    try:
        vehicle = Vehicle.objects.get(id=vehicle_id)
        
        # Determine maintenance requirements
        maintenance_requirements = _assess_maintenance_requirements(vehicle, maintenance_type)
        
        # Calculate scheduled date based on priority
        scheduled_date = timezone.now()
        if priority == 'critical':
            scheduled_date += timedelta(days=1)
        elif priority == 'high':
            scheduled_date += timedelta(days=3)
        elif priority == 'medium':
            scheduled_date += timedelta(days=7)
        else:  # low priority
            scheduled_date += timedelta(days=14)
        
        # Create maintenance record
        maintenance_record = VehicleMaintenanceRecord.objects.create(
            vehicle=vehicle,
            maintenance_type=maintenance_type,
            priority=priority.upper(),
            scheduled_date=scheduled_date,
            description=maintenance_requirements.get('description', ''),
            estimated_cost=maintenance_requirements.get('estimated_cost', 0),
            required_parts=maintenance_requirements.get('required_parts', []),
            status='SCHEDULED'
        )
        
        # Update vehicle maintenance status
        vehicle.next_maintenance_due = scheduled_date
        vehicle.maintenance_status = 'SCHEDULED'
        vehicle.save(update_fields=['next_maintenance_due', 'maintenance_status'])
        
        # Send notifications to maintenance team
        _send_maintenance_notifications(vehicle, maintenance_record)
        
        logger.info(f"Scheduled {maintenance_type} maintenance for vehicle {vehicle_id} on {scheduled_date}")
        
        return {
            'vehicle_id': vehicle_id,
            'maintenance_record_id': str(maintenance_record.id),
            'maintenance_type': maintenance_type,
            'scheduled_date': scheduled_date.isoformat(),
            'priority': priority,
            'status': 'scheduled'
        }
        
    except Exception as exc:
        logger.error(f"Maintenance scheduling failed for vehicle {vehicle_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'vehicle_id': vehicle_id,
                'status': 'failed',
                'error': str(exc)
            }

@shared_task
def check_vehicle_compliance_status(vehicle_id: str):
    """
    Check vehicle compliance status for dangerous goods transport.
    
    Args:
        vehicle_id: UUID of the vehicle to check
    """
    try:
        vehicle = Vehicle.objects.get(id=vehicle_id)
        
        compliance_checks = {
            'dg_certification': _check_dg_certification(vehicle),
            'insurance_validity': _check_insurance_validity(vehicle),
            'registration_status': _check_registration_status(vehicle),
            'driver_qualifications': _check_assigned_driver_qualifications(vehicle),
            'safety_equipment': _check_safety_equipment_compliance(vehicle)
        }
        
        # Determine overall compliance status
        non_compliant_items = [
            check_name for check_name, check_result in compliance_checks.items()
            if not check_result.get('compliant', True)
        ]
        
        overall_compliant = len(non_compliant_items) == 0
        
        compliance_summary = {
            'vehicle_id': vehicle_id,
            'overall_compliant': overall_compliant,
            'check_timestamp': timezone.now().isoformat(),
            'compliance_checks': compliance_checks,
            'non_compliant_items': non_compliant_items
        }
        
        # Update vehicle compliance status
        vehicle.compliance_status = 'COMPLIANT' if overall_compliant else 'NON_COMPLIANT'
        vehicle.compliance_check_date = timezone.now()
        vehicle.compliance_details = compliance_summary
        vehicle.save(update_fields=[
            'compliance_status',
            'compliance_check_date',
            'compliance_details'
        ])
        
        # Send alerts for non-compliance
        if not overall_compliant:
            _send_compliance_alerts(vehicle, compliance_summary)
        
        logger.info(f"Compliance check completed for vehicle {vehicle_id}: {'COMPLIANT' if overall_compliant else 'NON_COMPLIANT'}")
        
        return compliance_summary
        
    except Exception as e:
        logger.error(f"Compliance check failed for vehicle {vehicle_id}: {str(e)}")
        raise

@shared_task(bind=True, max_retries=3)
def update_vehicle_location(self, vehicle_id: str, latitude: float, longitude: float, timestamp: str = None):
    """
    Update vehicle location and trigger related processing.
    
    Args:
        vehicle_id: UUID of the vehicle
        latitude: GPS latitude
        longitude: GPS longitude
        timestamp: GPS timestamp (ISO format)
    """
    try:
        from tracking.models import GPSEvent
        from tracking.tasks import check_geofence_intersections
        
        vehicle = Vehicle.objects.get(id=vehicle_id)
        
        # Parse timestamp
        if timestamp:
            gps_timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        else:
            gps_timestamp = timezone.now()
        
        # Create GPS event
        gps_event = GPSEvent.objects.create(
            vehicle=vehicle,
            coordinates=f'POINT({longitude} {latitude})',
            timestamp=gps_timestamp,
            speed=0,  # Would be provided by GPS device
            heading=0,  # Would be provided by GPS device
            accuracy_meters=5  # Would be provided by GPS device
        )
        
        # Update vehicle's last known location
        vehicle.last_known_location = gps_event.coordinates
        vehicle.last_location_update = gps_timestamp
        vehicle.save(update_fields=['last_known_location', 'last_location_update'])
        
        # Trigger geofence checking
        check_geofence_intersections.delay(gps_event.id)
        
        # Update cache for real-time tracking
        cache.set(
            f'vehicle_location:{vehicle_id}',
            {
                'latitude': latitude,
                'longitude': longitude,
                'timestamp': gps_timestamp.isoformat(),
                'vehicle_id': vehicle_id
            },
            timeout=3600  # 1 hour
        )
        
        logger.debug(f"Updated location for vehicle {vehicle_id}: {latitude}, {longitude}")
        
        return {
            'vehicle_id': vehicle_id,
            'gps_event_id': gps_event.id,
            'status': 'success'
        }
        
    except Exception as exc:
        logger.error(f"Location update failed for vehicle {vehicle_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        raise

@shared_task
def generate_vehicle_utilization_report(company_id: str = None, date_range_days: int = 30):
    """
    Generate vehicle utilization report for analysis.
    
    Args:
        company_id: Optional company ID to filter vehicles
        date_range_days: Number of days to analyze
    """
    try:
        from django.db.models import Count, Avg, Q
        from shipments.models import Shipment
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=date_range_days)
        
        # Get vehicles to analyze
        vehicles_query = Vehicle.objects.all()
        if company_id:
            vehicles_query = vehicles_query.filter(owning_company_id=company_id)
        
        utilization_data = []
        
        for vehicle in vehicles_query:
            # Calculate utilization metrics
            shipments_count = Shipment.objects.filter(
                assigned_vehicle=vehicle,
                created_at__range=(start_date, end_date)
            ).count()
            
            # Calculate active days (days with GPS events)
            from tracking.models import GPSEvent
            active_days = GPSEvent.objects.filter(
                vehicle=vehicle,
                timestamp__range=(start_date, end_date)
            ).dates('timestamp', 'day').count()
            
            utilization_percent = (active_days / date_range_days) * 100 if date_range_days > 0 else 0
            
            utilization_data.append({
                'vehicle_id': str(vehicle.id),
                'vehicle_rego': vehicle.registration_number,
                'shipments_count': shipments_count,
                'active_days': active_days,
                'total_days': date_range_days,
                'utilization_percent': utilization_percent,
                'maintenance_days': 0,  # Would calculate from maintenance records
                'status': vehicle.operational_status
            })
        
        report = {
            'company_id': company_id,
            'date_range': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': date_range_days
            },
            'vehicle_utilization': utilization_data,
            'summary': {
                'total_vehicles': len(utilization_data),
                'average_utilization': sum(v['utilization_percent'] for v in utilization_data) / len(utilization_data) if utilization_data else 0,
                'total_shipments': sum(v['shipments_count'] for v in utilization_data)
            },
            'generated_at': timezone.now().isoformat()
        }
        
        # Cache report
        cache_key = f'vehicle_utilization:{company_id or "all"}:{date_range_days}'
        cache.set(cache_key, report, timeout=3600)  # 1 hour
        
        logger.info(f"Generated vehicle utilization report for {len(utilization_data)} vehicles")
        
        return report
        
    except Exception as e:
        logger.error(f"Vehicle utilization report generation failed: {str(e)}")
        raise

# Helper functions for vehicle inspection and compliance

def _inspect_safety_equipment(vehicle):
    """Inspect vehicle safety equipment"""
    equipment_status = {
        'compliant': True,
        'issues': [],
        'equipment_checks': {}
    }
    
    # Check each piece of safety equipment
    safety_equipment = vehicle.safety_equipment.all()
    
    for equipment in safety_equipment:
        check_result = safety_equipment_service.inspect_equipment(equipment)
        equipment_status['equipment_checks'][equipment.equipment_type] = check_result
        
        if not check_result.get('functional', True):
            equipment_status['issues'].append({
                'type': 'equipment_failure',
                'severity': 'HIGH',
                'equipment_type': equipment.equipment_type,
                'message': f'{equipment.equipment_type} failed inspection',
                'details': check_result
            })
            equipment_status['compliant'] = False
    
    return equipment_status

def _check_maintenance_status(vehicle):
    """Check vehicle maintenance status"""
    maintenance_status = {
        'requires_maintenance': False,
        'overdue_maintenance': False,
        'issues': [],
        'next_due_date': None
    }
    
    if vehicle.next_maintenance_due:
        maintenance_status['next_due_date'] = vehicle.next_maintenance_due.isoformat()
        
        if vehicle.next_maintenance_due <= timezone.now().date():
            maintenance_status['overdue_maintenance'] = True
            maintenance_status['requires_maintenance'] = True
            maintenance_status['issues'].append({
                'type': 'overdue_maintenance',
                'severity': 'HIGH',
                'message': f'Maintenance overdue since {vehicle.next_maintenance_due}',
                'days_overdue': (timezone.now().date() - vehicle.next_maintenance_due).days
            })
    
    return maintenance_status

def _verify_vehicle_compliance(vehicle):
    """Verify vehicle regulatory compliance"""
    compliance_status = {
        'compliant': True,
        'issues': []
    }
    
    # Check dangerous goods certification
    if vehicle.is_dg_certified:
        if vehicle.dg_certification_expiry and vehicle.dg_certification_expiry <= timezone.now().date():
            compliance_status['issues'].append({
                'type': 'expired_dg_certification',
                'severity': 'CRITICAL',
                'message': 'Dangerous goods certification has expired',
                'expiry_date': vehicle.dg_certification_expiry.isoformat()
            })
            compliance_status['compliant'] = False
    
    return compliance_status

def _check_document_expiration(vehicle):
    """Check for expiring vehicle documents"""
    warnings = []
    
    # Check registration expiration
    if vehicle.registration_expiry:
        days_until_expiry = (vehicle.registration_expiry - timezone.now().date()).days
        if days_until_expiry <= 30:
            warnings.append({
                'type': 'registration_expiring',
                'severity': 'MEDIUM',
                'message': f'Vehicle registration expires in {days_until_expiry} days',
                'expiry_date': vehicle.registration_expiry.isoformat()
            })
    
    return warnings

def _assess_maintenance_requirements(vehicle, maintenance_type):
    """Assess maintenance requirements for a vehicle"""
    requirements = {
        'description': f'{maintenance_type.title()} maintenance for {vehicle.registration_number}',
        'estimated_cost': 500,  # Would be calculated based on vehicle type and maintenance history
        'required_parts': []
    }
    
    if maintenance_type == 'preventive':
        requirements['description'] = 'Routine preventive maintenance including fluids, filters, and safety checks'
        requirements['required_parts'] = ['engine_oil', 'oil_filter', 'air_filter']
    elif maintenance_type == 'emergency':
        requirements['description'] = 'Emergency maintenance due to safety concerns'
        requirements['estimated_cost'] = 1000
    
    return requirements

def _send_vehicle_safety_alerts(vehicle, inspection_results):
    """Send safety alerts for vehicle issues"""
    critical_issues = [issue for issue in inspection_results['issues'] if issue.get('severity') == 'CRITICAL']
    
    if critical_issues:
        send_emergency_alert.delay(
            str(vehicle.id),
            'VEHICLE_SAFETY_FAILURE',
            f'Critical safety issues detected in vehicle {vehicle.registration_number}',
            'HIGH'
        )

def _send_maintenance_notifications(vehicle, maintenance_record):
    """Send maintenance scheduling notifications"""
    # This would send notifications to maintenance managers
    logger.info(f"Maintenance scheduled for vehicle {vehicle.registration_number}: {maintenance_record.maintenance_type}")

def _send_compliance_alerts(vehicle, compliance_summary):
    """Send compliance violation alerts"""
    non_compliant_items = compliance_summary['non_compliant_items']
    
    if non_compliant_items:
        send_emergency_alert.delay(
            str(vehicle.id),
            'COMPLIANCE_VIOLATION',
            f'Vehicle {vehicle.registration_number} has compliance issues: {", ".join(non_compliant_items)}',
            'HIGH'
        )

# Compliance check helper functions

def _check_dg_certification(vehicle):
    """Check dangerous goods certification"""
    if not vehicle.is_dg_certified:
        return {'compliant': True, 'reason': 'Not required for this vehicle type'}
    
    if vehicle.dg_certification_expiry and vehicle.dg_certification_expiry <= timezone.now().date():
        return {
            'compliant': False,
            'reason': 'DG certification expired',
            'expiry_date': vehicle.dg_certification_expiry.isoformat()
        }
    
    return {'compliant': True}

def _check_insurance_validity(vehicle):
    """Check insurance validity"""
    # This would integrate with insurance provider APIs
    return {'compliant': True, 'reason': 'Insurance check not implemented'}

def _check_registration_status(vehicle):
    """Check vehicle registration status"""
    if vehicle.registration_expiry and vehicle.registration_expiry <= timezone.now().date():
        return {
            'compliant': False,
            'reason': 'Vehicle registration expired',
            'expiry_date': vehicle.registration_expiry.isoformat()
        }
    
    return {'compliant': True}

def _check_assigned_driver_qualifications(vehicle):
    """Check if assigned driver has proper qualifications"""
    # This would check driver certifications
    return {'compliant': True, 'reason': 'Driver qualification check not implemented'}

def _check_safety_equipment_compliance(vehicle):
    """Check safety equipment compliance"""
    required_equipment = safety_equipment_service.get_required_equipment(vehicle)
    actual_equipment = vehicle.safety_equipment.values_list('equipment_type', flat=True)
    
    missing_equipment = [eq for eq in required_equipment if eq not in actual_equipment]
    
    if missing_equipment:
        return {
            'compliant': False,
            'reason': f'Missing required safety equipment: {", ".join(missing_equipment)}',
            'missing_equipment': missing_equipment
        }
    
    return {'compliant': True}