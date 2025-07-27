# tracking/public_views.py
"""
Public tracking views that don't require authentication.
These endpoints provide customer-facing shipment tracking information.
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from shipments.models import Shipment
from shipments.serializers import ShipmentSerializer

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_tracking(request, tracking_number):
    """
    Public shipment tracking endpoint that doesn't require authentication.
    Returns customer-safe information about shipment status and location.
    
    This endpoint matches the frontend API expectation for public tracking.
    """
    try:
        # Get shipment by tracking number
        shipment = get_object_or_404(
            Shipment.objects.select_related(
                'customer', 
                'assigned_vehicle', 
                'assigned_driver'
            ).prefetch_related('items'),
            tracking_number=tracking_number
        )
        
        # Build public tracking response matching frontend expectations
        tracking_data = {
            'tracking_number': shipment.tracking_number,
            'status': shipment.status,
            'status_display': shipment.get_status_display(),
            'customer_reference': getattr(shipment, 'reference_number', ''),
            'origin_location': shipment.origin_location,
            'destination_location': shipment.destination_location,
            'estimated_delivery_date': shipment.estimated_delivery_date.isoformat() if shipment.estimated_delivery_date else None,
            'created_at': shipment.created_at.isoformat(),
            'updated_at': shipment.updated_at.isoformat(),
        }
        
        # Add vehicle location if available and recent
        vehicle_location = None
        if shipment.assigned_vehicle and hasattr(shipment.assigned_vehicle, 'last_known_location'):
            vehicle = shipment.assigned_vehicle
            if vehicle.last_known_location and vehicle.last_reported_at:
                # Only include location if it's fresh (within last 30 minutes)
                time_diff = timezone.now() - vehicle.last_reported_at
                is_fresh = time_diff.total_seconds() < 1800  # 30 minutes
                
                if vehicle.last_known_location.coords:
                    vehicle_location = {
                        'latitude': vehicle.last_known_location.coords[1],
                        'longitude': vehicle.last_known_location.coords[0],
                        'last_updated': vehicle.last_reported_at.isoformat(),
                        'is_fresh': is_fresh
                    }
        
        tracking_data['vehicle_location'] = vehicle_location
        
        # Add driver and vehicle info (non-sensitive)
        if shipment.assigned_driver:
            tracking_data['driver_name'] = shipment.assigned_driver.first_name or "Driver"
        else:
            tracking_data['driver_name'] = "Not assigned"
            
        if shipment.assigned_vehicle:
            tracking_data['vehicle_registration'] = shipment.assigned_vehicle.registration_number
        else:
            tracking_data['vehicle_registration'] = "Not assigned"
        
        # Build status timeline
        status_timeline = []
        
        # Created event
        status_timeline.append({
            'status': 'CREATED',
            'timestamp': shipment.created_at.isoformat(),
            'description': 'Shipment created and prepared for dispatch'
        })
        
        # Add status-specific events based on current status
        if shipment.status in ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']:
            # Estimate pickup time (created + 1 day for demo)
            pickup_time = shipment.created_at + timezone.timedelta(days=1)
            status_timeline.append({
                'status': 'IN_TRANSIT',
                'timestamp': pickup_time.isoformat(),
                'description': 'Shipment picked up and in transit'
            })
        
        if shipment.status in ['OUT_FOR_DELIVERY', 'DELIVERED']:
            # Estimate out for delivery time
            delivery_time = shipment.created_at + timezone.timedelta(days=2)
            status_timeline.append({
                'status': 'OUT_FOR_DELIVERY', 
                'timestamp': delivery_time.isoformat(),
                'description': 'Shipment out for delivery'
            })
        
        if shipment.status == 'DELIVERED':
            delivery_time = shipment.actual_delivery_date or timezone.now()
            status_timeline.append({
                'status': 'DELIVERED',
                'timestamp': delivery_time.isoformat(),
                'description': 'Shipment delivered successfully'
            })
        
        tracking_data['status_timeline'] = status_timeline
        
        # Add route info
        tracking_data['route_info'] = {
            'has_live_tracking': vehicle_location is not None,
            'tracking_available': shipment.status in ['IN_TRANSIT', 'OUT_FOR_DELIVERY'],
            'note': 'Live tracking available' if vehicle_location else 'Shipment tracking not available'
        }
        
        # Add documents (placeholder - would be real documents in production)
        tracking_data['documents'] = []
        if shipment.status in ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']:
            tracking_data['documents'].append({
                'id': f"manifest-{shipment.id}",
                'type': 'manifest',
                'type_display': 'Shipping Manifest',
                'filename': f"manifest_{shipment.tracking_number}.pdf",
                'status': 'available',
                'status_display': 'Available',
                'upload_date': shipment.created_at.isoformat(),
                'download_url': f"/api/v1/shipments/{shipment.id}/generate-report/"
            })
        
        # Add communications (customer-visible only)
        tracking_data['communications'] = []
        if hasattr(shipment, 'notes') and shipment.notes:
            tracking_data['communications'].append({
                'id': f"note-{shipment.id}",
                'type': 'notification',
                'type_display': 'Status Update',
                'subject': 'Shipment Update',
                'message': 'Your shipment is being processed.',
                'sent_at': shipment.updated_at.isoformat(),
                'sender': 'SafeShipper System',
                'status': 'delivered'
            })
        
        # Add items summary
        items = shipment.items.all()
        dangerous_goods_count = items.filter(is_dangerous_good=True).count()
        total_weight = sum(item.weight_kg or 0 for item in items)
        
        tracking_data['items_summary'] = {
            'total_items': items.count(),
            'total_weight_kg': total_weight,
            'has_dangerous_goods': dangerous_goods_count > 0,
            'dangerous_goods_count': dangerous_goods_count
        }
        
        # Add proof of delivery if delivered
        if shipment.status == 'DELIVERED':
            # This would come from actual POD records in production
            tracking_data['proof_of_delivery'] = {
                'delivery_date': (shipment.actual_delivery_date or timezone.now()).isoformat(),
                'recipient_name': 'Customer Representative',
                'recipient_signature_url': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'delivery_photos': [
                    'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=POD+Photo+1',
                    'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=POD+Photo+2'
                ],
                'delivery_notes': 'Package delivered to front door',
                'delivered_by': tracking_data['driver_name']
            }
        
        return Response(tracking_data, status=status.HTTP_200_OK)
        
    except Shipment.DoesNotExist:
        return Response(
            {
                'error': 'Tracking number not found', 
                'tracking_number': tracking_number,
                'message': 'Please check your tracking number and try again.'
            },
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in public tracking for {tracking_number}: {str(e)}")
        return Response(
            {
                'error': 'An error occurred while retrieving tracking information',
                'tracking_number': tracking_number
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def update_location(request):
    """
    Update vehicle location - used by mobile apps and GPS devices.
    This endpoint accepts location updates from drivers.
    """
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['vehicle_id', 'latitude', 'longitude']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return Response(
                {'error': f'Missing required fields: {missing_fields}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        vehicle_id = data['vehicle_id']
        latitude = float(data['latitude'])
        longitude = float(data['longitude'])
        
        # Validate coordinates
        if not (-90 <= latitude <= 90):
            return Response(
                {'error': 'Invalid latitude. Must be between -90 and 90.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not (-180 <= longitude <= 180):
            return Response(
                {'error': 'Invalid longitude. Must be between -180 and 180.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get vehicle
        from vehicles.models import Vehicle
        from django.contrib.gis.geos import Point
        
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update vehicle location
        vehicle.last_known_location = Point(longitude, latitude)
        vehicle.last_reported_at = timezone.now()
        vehicle.save(update_fields=['last_known_location', 'last_reported_at'])
        
        # Create GPS event record
        from tracking.models import GPSEvent
        
        GPSEvent.objects.create(
            vehicle=vehicle,
            location=Point(longitude, latitude),
            timestamp=timezone.now(),
            speed_kmh=data.get('speed_kmh', 0),
            heading_degrees=data.get('heading_degrees', 0),
            altitude_m=data.get('altitude_m', 0),
            accuracy_m=data.get('accuracy_m', 10),
            battery_level=data.get('battery_level'),
            signal_strength=data.get('signal_strength')
        )
        
        return Response({
            'message': 'Location updated successfully',
            'vehicle_id': vehicle_id,
            'timestamp': timezone.now().isoformat(),
            'coordinates': {
                'latitude': latitude,
                'longitude': longitude
            }
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response(
            {'error': f'Invalid coordinate values: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error updating location: {str(e)}")
        return Response(
            {'error': 'An error occurred while updating location'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )