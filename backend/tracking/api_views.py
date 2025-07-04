from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.db import models
from vehicles.models import Vehicle
from .models import GPSEvent
from .services import update_vehicle_location
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def update_location(request):
    """
    Mobile app endpoint for drivers to update their vehicle's GPS location.
    Expected payload: {
        "latitude": float,
        "longitude": float,
        "accuracy": float (optional),
        "speed": float (optional),
        "heading": float (optional),
        "timestamp": ISO datetime string (optional)
    }
    """
    try:
        # Validate user is a driver
        if request.user.role != 'DRIVER':
            return Response(
                {'error': 'Only drivers can update location'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Extract location data
        data = request.data
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is None or longitude is None:
            return Response(
                {'error': 'Latitude and longitude are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate coordinates
        try:
            lat = float(latitude)
            lng = float(longitude)
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                raise ValueError("Invalid coordinates")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid latitude or longitude values'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get optional fields
        accuracy = data.get('accuracy')
        speed = data.get('speed')
        heading = data.get('heading')
        timestamp_str = data.get('timestamp')
        
        # Parse timestamp
        if timestamp_str:
            try:
                from django.utils.dateparse import parse_datetime
                timestamp = parse_datetime(timestamp_str)
                if not timestamp:
                    raise ValueError("Invalid timestamp format")
            except ValueError:
                return Response(
                    {'error': 'Invalid timestamp format. Use ISO format (YYYY-MM-DDTHH:MM:SSZ)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            timestamp = timezone.now()
        
        # Find the driver's assigned vehicle
        try:
            vehicle = Vehicle.objects.get(assigned_driver=request.user)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'No vehicle assigned to this driver'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Vehicle.MultipleObjectsReturned:
            # If multiple vehicles, get the first one (should be handled better in production)
            vehicle = Vehicle.objects.filter(assigned_driver=request.user).first()
        
        # Update vehicle location using service
        result = update_vehicle_location(
            vehicle=vehicle,
            latitude=lat,
            longitude=lng,
            accuracy=accuracy,
            speed=speed,
            heading=heading,
            timestamp=timestamp,
            source='MOBILE_APP'
        )
        
        logger.info(f"Location updated for driver {request.user.email}, vehicle {vehicle.registration_number}")
        
        return Response({
            'message': 'Location updated successfully',
            'vehicle_id': str(vehicle.id),
            'vehicle_registration': vehicle.registration_number,
            'timestamp': timestamp.isoformat(),
            'coordinates': {
                'latitude': lat,
                'longitude': lng
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Location update error for user {request.user.email}: {str(e)}")
        return Response(
            {'error': 'An error occurred while updating location'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def fleet_status(request):
    """
    Management endpoint to get real-time fleet status with vehicle locations.
    Returns all vehicles that are currently active with their latest location data.
    """
    try:
        from vehicles.models import Vehicle
        from shipments.models import Shipment
        
        # Get all vehicles that have active shipments or recent location updates
        active_vehicles = Vehicle.objects.filter(
            models.Q(assigned_shipments__status__in=[
                'READY_FOR_DISPATCH', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'
            ]) | 
            models.Q(last_reported_at__isnull=False)
        ).select_related(
            'assigned_driver',
            'owning_company'
        ).prefetch_related(
            'assigned_shipments'
        ).distinct()
        
        fleet_data = []
        
        for vehicle in active_vehicles:
            # Get the most recent active shipment
            active_shipment = vehicle.assigned_shipments.filter(
                status__in=['READY_FOR_DISPATCH', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
            ).first()
            
            # Check if location data is recent (within last 2 hours)
            location_is_fresh = False
            if vehicle.last_reported_at:
                from django.utils import timezone
                time_diff = timezone.now() - vehicle.last_reported_at
                location_is_fresh = time_diff.total_seconds() < 7200  # 2 hours
            
            vehicle_data = {
                'id': str(vehicle.id),
                'registration_number': vehicle.registration_number,
                'vehicle_type': vehicle.vehicle_type,
                'status': vehicle.status,
                'location': vehicle.current_location,  # Uses the property we created
                'location_is_fresh': location_is_fresh,
                'assigned_driver': {
                    'id': str(vehicle.assigned_driver.id) if vehicle.assigned_driver else None,
                    'name': f"{vehicle.assigned_driver.first_name} {vehicle.assigned_driver.last_name}" if vehicle.assigned_driver else None,
                    'email': vehicle.assigned_driver.email if vehicle.assigned_driver else None,
                } if vehicle.assigned_driver else None,
                'active_shipment': {
                    'id': str(active_shipment.id),
                    'tracking_number': active_shipment.tracking_number,
                    'status': active_shipment.status,
                    'origin_location': active_shipment.origin_location,
                    'destination_location': active_shipment.destination_location,
                    'customer_name': active_shipment.customer.name,
                    'estimated_delivery_date': active_shipment.estimated_delivery_date.isoformat() if active_shipment.estimated_delivery_date else None,
                } if active_shipment else None,
                'company': {
                    'id': str(vehicle.owning_company.id) if vehicle.owning_company else None,
                    'name': vehicle.owning_company.name if vehicle.owning_company else None,
                } if vehicle.owning_company else None,
            }
            
            fleet_data.append(vehicle_data)
        
        # Sort by vehicle registration for consistent ordering
        fleet_data.sort(key=lambda x: x['registration_number'])
        
        response_data = {
            'vehicles': fleet_data,
            'total_vehicles': len(fleet_data),
            'timestamp': timezone.now().isoformat(),
        }
        
        logger.info(f"Fleet status requested by {request.user.email}: {len(fleet_data)} vehicles")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Fleet status error for user {request.user.email}: {str(e)}")
        return Response(
            {'error': 'An error occurred while retrieving fleet status'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def oyster_webhook(request):
    """
    Webhook endpoint for Oyster IoT devices
    Receives real-time GPS data and broadcasts to connected clients
    """
    try:
        device_data = request.data
        
        # Validate device data
        required_fields = ['deviceId', 'lat', 'lng', 'timestamp']
        if not all(field in device_data for field in required_fields):
            return Response({'error': 'Missing required fields'}, status=400)
        
        # Find associated vehicle
        try:
            vehicle = Vehicle.objects.get(tracking_device_id=device_data['deviceId'])
        except Vehicle.DoesNotExist:
            return Response({'error': 'Vehicle not found'}, status=404)
        
        # Create location record
        location = VehicleLocation.objects.create(
            vehicle=vehicle,
            latitude=device_data['lat'],
            longitude=device_data['lng'],
            accuracy=device_data.get('accuracy', 0),
            speed=device_data.get('speed', 0),
            heading=device_data.get('heading', 0),
            battery_level=device_data.get('battery', 100),
            signal_strength=device_data.get('signal', 100),
            timestamp=device_data['timestamp']
        )
        
        # Check geofence violations
        geofence_events = check_geofence_violations(vehicle, location)
        
        # Broadcast to WebSocket clients
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"vehicle_{vehicle.id}",
            {
                "type": "location_update",
                "data": {
                    "vehicleId": vehicle.id,
                    "location": {
                        "lat": location.latitude,
                        "lng": location.longitude,
                        "accuracy": location.accuracy,
                        "timestamp": location.timestamp.isoformat()
                    },
                    "telemetry": {
                        "speed": location.speed,
                        "heading": location.heading,
                        "battery": location.battery_level,
                        "signal": location.signal_strength
                    },
                    "geofenceEvents": [
                        {
                            "type": event.event_type,
                            "geofence": event.geofence.name,
                            "timestamp": event.timestamp.isoformat()
                        } for event in geofence_events
                    ]
                }
            }
        )
        
        return Response({'status': 'success'}, status=200)
        
    except Exception as e:
        logger.error(f"Oyster webhook error: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)

def check_geofence_violations(vehicle, location):
    """Check if vehicle location violates any geofences"""
    violations = []
    
    # Get active geofences for this vehicle
    geofences = Geofence.objects.filter(
        vehicles=vehicle,
        is_active=True
    )
    
    for geofence in geofences:
        # Check if point is inside geofence polygon
        point = Point(location.longitude, location.latitude)
        
        if geofence.fence_type == 'inclusion':
            # Vehicle should be inside - violation if outside
            if not geofence.boundary.contains(point):
                violation = GeofenceEvent.objects.create(
                    vehicle=vehicle,
                    geofence=geofence,
                    event_type='exit',
                    location=location
                )
                violations.append(violation)
                
        elif geofence.fence_type == 'exclusion':
            # Vehicle should be outside - violation if inside
            if geofence.boundary.contains(point):
                violation = GeofenceEvent.objects.create(
                    vehicle=vehicle,
                    geofence=geofence,
                    event_type='enter',
                    location=location
                )
                violations.append(violation)
    
    return violations

@api_view(['GET'])
@permission_classes([AllowAny])
def public_shipment_tracking(request, tracking_number):
    """
    Public endpoint for customers to track their shipments.
    Returns shipment status and location data without requiring authentication.
    """
    try:
        from shipments.models import Shipment
        
        # Find shipment by tracking number
        try:
            shipment = Shipment.objects.select_related(
                'assigned_vehicle',
                'assigned_vehicle__assigned_driver',
                'customer'
            ).get(tracking_number=tracking_number)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Build response data (customer-safe information only)
        response_data = {
            'tracking_number': shipment.tracking_number,
            'status': shipment.status,
            'customer_reference': shipment.customer_reference,
            'origin_location': shipment.origin_location,
            'destination_location': shipment.destination_location,
            'estimated_delivery_date': shipment.estimated_delivery_date.isoformat() if shipment.estimated_delivery_date else None,
            'created_at': shipment.created_at.isoformat(),
            'updated_at': shipment.updated_at.isoformat(),
        }
        
        # Add vehicle location if available and shipment is in transit
        if shipment.assigned_vehicle and shipment.status in ['IN_TRANSIT', 'OUT_FOR_DELIVERY']:
            vehicle = shipment.assigned_vehicle
            
            # Check if location data is recent (within last 2 hours)
            location_is_fresh = False
            if vehicle.last_reported_at:
                time_diff = timezone.now() - vehicle.last_reported_at
                location_is_fresh = time_diff.total_seconds() < 7200
            
            if vehicle.current_location and location_is_fresh:
                response_data['vehicle_location'] = {
                    'latitude': vehicle.current_location['lat'],
                    'longitude': vehicle.current_location['lng'],
                    'last_updated': vehicle.last_reported_at.isoformat(),
                    'is_fresh': location_is_fresh
                }
            
            # Add driver name (first name only for privacy)
            if vehicle.assigned_driver:
                response_data['driver_name'] = vehicle.assigned_driver.first_name
            
            response_data['vehicle_registration'] = vehicle.registration_number[-4:]  # Last 4 digits only
        
        # Add status timeline (basic milestones)
        status_timeline = []
        
        # Always show shipment created
        status_timeline.append({
            'status': 'CREATED',
            'timestamp': shipment.created_at.isoformat(),
            'description': 'Shipment created and prepared for dispatch'
        })
        
        # Add current status if different from created
        if shipment.status != 'CREATED':
            status_descriptions = {
                'READY_FOR_DISPATCH': 'Shipment ready for pickup',
                'IN_TRANSIT': 'Shipment picked up and in transit',
                'OUT_FOR_DELIVERY': 'Shipment out for delivery',
                'DELIVERED': 'Shipment delivered successfully',
                'CANCELLED': 'Shipment cancelled',
                'DELAYED': 'Shipment delayed',
            }
            
            status_timeline.append({
                'status': shipment.status,
                'timestamp': shipment.updated_at.isoformat(),
                'description': status_descriptions.get(shipment.status, shipment.status.replace('_', ' ').title())
            })
        
        response_data['status_timeline'] = status_timeline
        
        # Add estimated route if vehicle has location
        if 'vehicle_location' in response_data:
            response_data['route_info'] = {
                'has_live_tracking': True,
                'tracking_available': True,
                'privacy_note': 'Location data is updated every few minutes while in transit'
            }
        else:
            response_data['route_info'] = {
                'has_live_tracking': False,
                'tracking_available': False,
                'note': 'Live tracking will be available once the shipment is in transit'
            }
        
        logger.info(f"Public shipment tracking requested for {tracking_number}")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Public shipment tracking error for {tracking_number}: {str(e)}")
        return Response(
            {'error': 'An error occurred while retrieving tracking information'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )