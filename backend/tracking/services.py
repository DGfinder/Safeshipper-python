# services.py for tracking app

from typing import Dict, Optional, List, Tuple
from django.db import transaction
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.db.models import Q
import logging

from .models import GPSEvent, LocationVisit
from locations.models import GeoLocation
from vehicles.models import Vehicle
from shipments.models import Shipment

logger = logging.getLogger(__name__)

def process_gps_event(event_data: Dict) -> GPSEvent:
    """
    Process an incoming GPS event and handle geofence checks.
    
    Args:
        event_data: Dictionary containing GPS event data
            Required keys: vehicle_id, latitude, longitude, timestamp
            Optional keys: shipment_id, speed, heading, accuracy, etc.
    
    Returns:
        GPSEvent: The created GPS event
    
    Raises:
        ValueError: If required data is missing or invalid
    """
    try:
        # Extract required fields
        vehicle_id = event_data.get('vehicle_id')
        latitude = event_data.get('latitude')
        longitude = event_data.get('longitude')
        timestamp = event_data.get('timestamp')
        
        if not all([vehicle_id, latitude, longitude, timestamp]):
            raise ValueError("Missing required GPS event data")
        
        # Get or validate related objects
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            raise ValueError(f"Vehicle {vehicle_id} not found")
        
        shipment = None
        if shipment_id := event_data.get('shipment_id'):
            try:
                shipment = Shipment.objects.get(id=shipment_id)
            except Shipment.DoesNotExist:
                logger.warning(f"Shipment {shipment_id} not found for GPS event")
        
        # Create GPS event
        with transaction.atomic():
            event = GPSEvent.objects.create(
                vehicle=vehicle,
                shipment=shipment,
                latitude=latitude,
                longitude=longitude,
                timestamp=timestamp,
                speed=event_data.get('speed'),
                heading=event_data.get('heading'),
                accuracy=event_data.get('accuracy'),
                battery_level=event_data.get('battery_level'),
                signal_strength=event_data.get('signal_strength'),
                source=event_data.get('source', 'GPS_DEVICE'),
                raw_data=event_data
            )
            
            # Check geofence entry/exit
            check_geofence_entry_exit(event)
            
            return event
            
    except Exception as e:
        logger.error(f"Error processing GPS event: {str(e)}")
        raise

def check_geofence_entry_exit(gps_event: GPSEvent) -> List[LocationVisit]:
    """
    Check if the GPS event represents entry into or exit from any geofences.
    Creates or updates LocationVisit records accordingly.
    
    Args:
        gps_event: The GPS event to check
    
    Returns:
        List[LocationVisit]: List of affected location visits
    """
    affected_visits = []
    
    try:
        # Get all active geofences
        geofences = GeoLocation.objects.filter(
            is_active=True,
            geofence__isnull=False
        )
        
        # Check each geofence
        for location in geofences:
            is_inside = location.is_point_inside(
                gps_event.latitude,
                gps_event.longitude
            )
            
            # Get active visit for this location and vehicle
            active_visit = LocationVisit.objects.filter(
                location=location,
                vehicle=gps_event.vehicle,
                status='ACTIVE',
                exit_time__isnull=True
            ).first()
            
            if is_inside and not active_visit:
                # New entry - create visit
                visit = LocationVisit.objects.create(
                    location=location,
                    vehicle=gps_event.vehicle,
                    shipment=gps_event.shipment,
                    entry_time=gps_event.timestamp,
                    entry_event=gps_event,
                    status='ACTIVE'
                )
                affected_visits.append(visit)
                logger.info(
                    f"Vehicle {gps_event.vehicle} entered {location} "
                    f"at {gps_event.timestamp}"
                )
                
            elif not is_inside and active_visit:
                # Exit - update visit
                active_visit.exit_time = gps_event.timestamp
                active_visit.exit_event = gps_event
                active_visit.status = 'COMPLETED'
                
                # Calculate demurrage if enabled
                if location.demurrage_enabled:
                    demurrage = calculate_demurrage_for_visit(active_visit)
                    if demurrage:
                        active_visit.demurrage_hours = demurrage['hours']
                        active_visit.demurrage_charge = demurrage['charge']
                
                active_visit.save()
                affected_visits.append(active_visit)
                logger.info(
                    f"Vehicle {gps_event.vehicle} exited {location} "
                    f"at {gps_event.timestamp}"
                )
        
        return affected_visits
        
    except Exception as e:
        logger.error(f"Error checking geofence entry/exit: {str(e)}")
        raise

def get_active_visits(
    vehicle: Optional[Vehicle] = None,
    location: Optional[GeoLocation] = None,
    shipment: Optional[Shipment] = None
) -> List[LocationVisit]:
    """
    Get all active location visits matching the given criteria.
    
    Args:
        vehicle: Optional vehicle to filter by
        location: Optional location to filter by
        shipment: Optional shipment to filter by
    
    Returns:
        List[LocationVisit]: List of active visits
    """
    query = Q(status='ACTIVE', exit_time__isnull=True)
    
    if vehicle:
        query &= Q(vehicle=vehicle)
    if location:
        query &= Q(location=location)
    if shipment:
        query &= Q(shipment=shipment)
    
    return LocationVisit.objects.filter(query).select_related(
        'location',
        'vehicle',
        'shipment',
        'entry_event'
    )

def calculate_visit_duration(visit: LocationVisit) -> Optional[float]:
    """
    Calculate the duration of a location visit in hours.
    
    Args:
        visit: The location visit to calculate duration for
    
    Returns:
        Duration in hours, or None if visit is still active
    """
    if not visit.exit_time:
        return None
    
    duration = visit.exit_time - visit.entry_time
    return duration.total_seconds() / 3600  # Convert to hours

def calculate_demurrage_for_visit(visit: LocationVisit) -> Optional[Dict]:
    """
    Calculate demurrage charges for a location visit.
    
    Args:
        visit: The location visit to calculate demurrage for
    
    Returns:
        Dict containing demurrage hours and charge, or None if not applicable
    """
    if not visit.exit_time or not visit.location.demurrage_enabled:
        return None
    
    duration = calculate_visit_duration(visit)
    if duration is None:
        return None
    
    # Subtract free time
    chargeable_hours = max(0, duration - visit.location.free_time_hours)
    
    # Calculate charge if there are chargeable hours
    charge = None
    if chargeable_hours > 0 and visit.location.demurrage_rate_per_hour:
        charge = chargeable_hours * visit.location.demurrage_rate_per_hour
    
    return {
        'hours': chargeable_hours,
        'charge': charge
    }

def get_vehicle_location_history(
    vehicle: Vehicle,
    start_time: Optional[timezone.datetime] = None,
    end_time: Optional[timezone.datetime] = None,
    limit: int = 1000
) -> List[Dict]:
    """
    Get a vehicle's location history with geofence information.
    
    Args:
        vehicle: The vehicle to get history for
        start_time: Optional start time filter
        end_time: Optional end time filter
        limit: Maximum number of events to return
    
    Returns:
        List of dicts containing location events and geofence status
    """
    query = Q(vehicle=vehicle)
    if start_time:
        query &= Q(timestamp__gte=start_time)
    if end_time:
        query &= Q(timestamp__lte=end_time)
    
    events = GPSEvent.objects.filter(query).order_by('-timestamp')[:limit]
    
    history = []
    for event in events:
        # Get any active visits at this time
        active_visits = LocationVisit.objects.filter(
            Q(exit_time__isnull=True) | Q(exit_time__gte=event.timestamp),
            vehicle=vehicle,
            entry_time__lte=event.timestamp
        ).select_related('location')
        
        history.append({
            'timestamp': event.timestamp,
            'latitude': event.latitude,
            'longitude': event.longitude,
            'speed': event.speed,
            'heading': event.heading,
            'active_locations': [
                {
                    'location_id': visit.location.id,
                    'location_name': visit.location.name,
                    'location_type': visit.location.location_type,
                    'entry_time': visit.entry_time
                }
                for visit in active_visits
            ]
        })
    
    return history

def update_vehicle_location(
    vehicle: Vehicle,
    latitude: float,
    longitude: float,
    accuracy: Optional[float] = None,
    speed: Optional[float] = None,
    heading: Optional[float] = None,
    timestamp: Optional[timezone.datetime] = None,
    source: str = 'MOBILE_APP'
) -> Dict:
    """
    Update a vehicle's location and create GPS event record.
    This is the main service function for the mobile app location updates.
    
    Args:
        vehicle: Vehicle to update
        latitude: GPS latitude
        longitude: GPS longitude
        accuracy: GPS accuracy in meters (optional)
        speed: Speed in km/h (optional)
        heading: Heading in degrees (optional)
        timestamp: GPS timestamp (optional, defaults to now)
        source: Source of the location update
    
    Returns:
        Dict containing result information
    """
    try:
        if timestamp is None:
            timestamp = timezone.now()
        
        with transaction.atomic():
            # Update vehicle's last known location
            vehicle.update_location(latitude, longitude, timestamp)
            
            # Get active shipment for this vehicle
            active_shipment = vehicle.assigned_shipments.filter(
                status__in=['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'READY_FOR_DISPATCH']
            ).first()
            
            # Create GPS event record
            gps_event = GPSEvent.objects.create(
                vehicle=vehicle,
                shipment=active_shipment,
                latitude=latitude,
                longitude=longitude,
                timestamp=timestamp,
                speed=speed,
                heading=heading,
                accuracy=accuracy,
                source=source,
                raw_data={
                    'latitude': latitude,
                    'longitude': longitude,
                    'accuracy': accuracy,
                    'speed': speed,
                    'heading': heading,
                    'timestamp': timestamp.isoformat(),
                    'source': source
                }
            )
            
            # Check for geofence entry/exit
            affected_visits = check_geofence_entry_exit(gps_event)
            
            result = {
                'success': True,
                'vehicle_id': str(vehicle.id),
                'gps_event_id': str(gps_event.id),
                'timestamp': timestamp.isoformat(),
                'active_shipment_id': str(active_shipment.id) if active_shipment else None,
                'geofence_events': len(affected_visits),
                'location': {
                    'latitude': latitude,
                    'longitude': longitude
                }
            }
            
            logger.info(
                f"Location updated for vehicle {vehicle.registration_number}: "
                f"({latitude}, {longitude}) at {timestamp}"
            )
            
            return result
            
    except Exception as e:
        logger.error(f"Error updating vehicle location: {str(e)}")
        raise
