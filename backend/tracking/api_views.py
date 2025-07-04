from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone
from django.contrib.gis.geos import Point
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