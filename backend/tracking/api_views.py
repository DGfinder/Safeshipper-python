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