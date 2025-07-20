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
            
            if not (-90 <= lat <= 90):
                return Response(
                    {'error': 'Invalid latitude. Must be between -90 and 90'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not (-180 <= lng <= 180):
                return Response(
                    {'error': 'Invalid longitude. Must be between -180 and 180'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (TypeError, ValueError):
            return Response(
                {'error': 'Latitude and longitude must be valid numbers'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get driver's assigned vehicle
        try:
            vehicle = Vehicle.objects.get(assigned_driver=request.user)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'No vehicle assigned to this driver'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Update vehicle location
        location_point = Point(lng, lat, srid=4326)
        accuracy = data.get('accuracy')
        speed = data.get('speed')
        heading = data.get('heading')
        
        # Parse timestamp or use current time
        timestamp_str = data.get('timestamp')
        if timestamp_str:
            try:
                from dateutil import parser
                timestamp = parser.parse(timestamp_str)
            except:
                timestamp = timezone.now()
        else:
            timestamp = timezone.now()

        # Use service to update location
        update_vehicle_location(
            vehicle=vehicle,
            location=location_point,
            timestamp=timestamp,
            accuracy=accuracy,
            speed=speed,
            heading=heading,
            source='MOBILE_APP'
        )

        return Response({
            'status': 'success',
            'message': 'Location updated successfully',
            'vehicle_id': str(vehicle.id),
            'timestamp': timestamp.isoformat()
        })

    except Exception as e:
        logger.error(f"Error updating location for user {request.user.id}: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint
def public_tracking(request, tracking_number):
    """
    Public tracking endpoint - matches frontend mock API structure.
    No authentication required for customer tracking.
    """
    # Input validation
    if not tracking_number or len(tracking_number.strip()) == 0:
        return Response(
            {'error': 'Tracking number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Sanitize tracking number (remove special characters, limit length)
    import re
    tracking_number = re.sub(r'[^a-zA-Z0-9\-_]', '', tracking_number.strip())
    if len(tracking_number) > 50:
        return Response(
            {'error': 'Tracking number too long'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        from shipments.models import Shipment
        from documents.models import Document
        
        # Find shipment by tracking number
        try:
            shipment = Shipment.objects.select_related(
                'customer', 'carrier', 'assigned_vehicle', 'assigned_vehicle__assigned_driver'
            ).get(tracking_number=tracking_number)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get vehicle location if available
        vehicle_location = None
        if shipment.assigned_vehicle:
            # Get latest GPS event for the vehicle
            latest_gps = GPSEvent.objects.filter(
                vehicle=shipment.assigned_vehicle
            ).order_by('-timestamp').first()
            
            if latest_gps:
                vehicle_location = {
                    'latitude': latest_gps.location.y,
                    'longitude': latest_gps.location.x,
                    'last_updated': latest_gps.timestamp.isoformat(),
                    'is_fresh': (timezone.now() - latest_gps.timestamp).seconds < 1800  # Fresh if < 30 min
                }
        
        # Build status timeline
        status_timeline = []
        
        # Add creation event
        status_timeline.append({
            'status': 'CREATED',
            'timestamp': shipment.created_at.isoformat(),
            'description': 'Shipment created and prepared for dispatch'
        })
        
        # Add current status if different
        if shipment.status != 'PENDING':
            description_map = {
                'IN_TRANSIT': 'Shipment picked up and in transit',
                'OUT_FOR_DELIVERY': 'Out for delivery',
                'DELIVERED': 'Shipment delivered successfully',
                'AT_HUB': 'Shipment at distribution hub',
                'EXCEPTION': 'Exception occurred during transit'
            }
            
            status_timeline.append({
                'status': shipment.status,
                'timestamp': shipment.updated_at.isoformat(),
                'description': description_map.get(shipment.status, f'Status changed to {shipment.status}')
            })
        
        # Get documents
        documents = []
        try:
            docs = Document.objects.filter(shipment=shipment)
            for doc in docs:
                documents.append({
                    'id': str(doc.id),
                    'type': doc.document_type,
                    'type_display': doc.get_document_type_display() if hasattr(doc, 'get_document_type_display') else doc.document_type,
                    'filename': doc.filename if hasattr(doc, 'filename') else f"{doc.document_type}.pdf",
                    'status': 'available',
                    'status_display': 'Available',
                    'upload_date': doc.created_at.isoformat(),
                    'download_url': doc.file.url if hasattr(doc, 'file') and doc.file else '#'
                })
        except:
            pass
        
        # Get communications/notifications
        communications = []
        if shipment.status == 'DELIVERED':
            communications.append({
                'id': f"sms-{shipment.id}",
                'type': 'sms',
                'type_display': 'SMS Notification',
                'subject': 'Shipment Status Update',
                'message': 'Your shipment has been delivered successfully.',
                'sent_at': shipment.updated_at.isoformat(),
                'sender': 'SafeShipper System',
                'status': 'delivered'
            })
        
        # Calculate items summary
        total_items = 0
        total_weight = 0
        has_dangerous_goods = False
        dangerous_goods_count = 0
        
        try:
            from manifests.models import ConsignmentItem
            items = ConsignmentItem.objects.filter(shipment=shipment)
            total_items = items.count()
            total_weight = sum(item.weight_kg or 0 for item in items)
            has_dangerous_goods = items.filter(dangerous_good__isnull=False).exists()
            dangerous_goods_count = items.filter(dangerous_good__isnull=False).count()
        except:
            pass
        
        # Get proof of delivery if delivered
        proof_of_delivery = None
        if shipment.status == 'DELIVERED':
            # Extract POD from notes (simplified implementation)
            if shipment.notes and '[POD]' in shipment.notes:
                proof_of_delivery = {
                    'delivery_date': shipment.actual_delivery_date.isoformat() if shipment.actual_delivery_date else shipment.updated_at.isoformat(),
                    'recipient_name': 'Customer Representative',  # Extract from notes if needed
                    'recipient_signature_url': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    'delivery_photos': [],
                    'delivery_notes': shipment.notes,
                    'delivered_by': f"{shipment.assigned_vehicle.assigned_driver.first_name} {shipment.assigned_vehicle.assigned_driver.last_name}".strip() if shipment.assigned_vehicle and shipment.assigned_vehicle.assigned_driver else "Driver"
                }
        
        # Build complete response
        response_data = {
            'tracking_number': shipment.tracking_number,
            'status': shipment.status,
            'status_display': shipment.get_status_display(),
            'customer_reference': shipment.reference_number or '',
            'origin_location': shipment.origin_location,
            'destination_location': shipment.destination_location,
            'estimated_delivery_date': shipment.estimated_delivery_date.isoformat() if shipment.estimated_delivery_date else None,
            'created_at': shipment.created_at.isoformat(),
            'updated_at': shipment.updated_at.isoformat(),
            'vehicle_location': vehicle_location,
            'driver_name': shipment.assigned_vehicle.assigned_driver.first_name if shipment.assigned_vehicle and shipment.assigned_vehicle.assigned_driver else None,
            'vehicle_registration': shipment.assigned_vehicle.registration_number if shipment.assigned_vehicle else None,
            'status_timeline': status_timeline,
            'route_info': {
                'has_live_tracking': vehicle_location is not None,
                'tracking_available': vehicle_location is not None,
                'note': 'Live tracking available' if vehicle_location else 'Tracking will be available once shipment is in transit'
            },
            'documents': documents,
            'communications': communications,
            'items_summary': {
                'total_items': total_items,
                'total_weight_kg': total_weight,
                'has_dangerous_goods': has_dangerous_goods,
                'dangerous_goods_count': dangerous_goods_count
            },
            'proof_of_delivery': proof_of_delivery
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in public tracking for {tracking_number}: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
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
            'status_display': shipment.get_status_display(),
            'customer_reference': shipment.reference_number,  # Fixed field name
            'origin_location': shipment.origin_location,
            'destination_location': shipment.destination_location,
            'estimated_pickup_date': shipment.estimated_pickup_date.isoformat() if shipment.estimated_pickup_date else None,
            'actual_pickup_date': shipment.actual_pickup_date.isoformat() if shipment.actual_pickup_date else None,
            'estimated_delivery_date': shipment.estimated_delivery_date.isoformat() if shipment.estimated_delivery_date else None,
            'actual_delivery_date': shipment.actual_delivery_date.isoformat() if shipment.actual_delivery_date else None,
            'created_at': shipment.created_at.isoformat(),
            'updated_at': shipment.updated_at.isoformat(),
        }
        
        # Add public documents (manifests, certificates, etc.)
        from documents.models import Document
        public_documents = Document.objects.filter(
            shipment=shipment,
            document_type__in=['DG_MANIFEST', 'DG_DECLARATION', 'COMMERCIAL_INVOICE']
        ).values('id', 'document_type', 'original_filename', 'created_at', 'status')
        
        response_data['documents'] = [
            {
                'id': str(doc['id']),
                'type': doc['document_type'],
                'type_display': dict(Document.DocumentType.choices)[doc['document_type']],
                'filename': doc['original_filename'],
                'status': doc['status'],
                'status_display': dict(Document.DocumentStatus.choices)[doc['status']],
                'upload_date': doc['created_at'].isoformat(),
                'download_url': f'/api/v1/public/tracking/{tracking_number}/documents/{doc["id"]}/'
            }
            for doc in public_documents
        ]
        
        # Add communication log (customer-visible messages only)
        try:
            from communications.models import Communication
            communications = Communication.objects.filter(
                shipment=shipment,
                communication_type__in=['SMS', 'EMAIL', 'NOTIFICATION'],
                is_customer_visible=True
            ).order_by('-created_at')[:10]
            
            response_data['communications'] = [
                {
                    'id': str(comm.id),
                    'type': comm.communication_type,
                    'type_display': comm.get_communication_type_display(),
                    'subject': comm.subject,
                    'message': comm.message[:200] + '...' if len(comm.message) > 200 else comm.message,
                    'sent_at': comm.created_at.isoformat(),
                    'sender': 'SafeShipper Team',
                    'status': comm.status if hasattr(comm, 'status') else 'sent'
                }
                for comm in communications
            ]
        except ImportError:
            # Communications app might not exist yet
            response_data['communications'] = []
        
        # Add proof of delivery if shipment is delivered
        if shipment.status == 'DELIVERED':
            try:
                from delivery.models import ProofOfDelivery
                pod = ProofOfDelivery.objects.filter(shipment=shipment).first()
                if pod:
                    response_data['proof_of_delivery'] = {
                        'delivery_date': pod.delivered_at.isoformat() if hasattr(pod, 'delivered_at') else shipment.actual_delivery_date.isoformat(),
                        'recipient_name': pod.recipient_name if hasattr(pod, 'recipient_name') else None,
                        'recipient_signature_url': f'/api/v1/public/tracking/{tracking_number}/signature/' if hasattr(pod, 'signature_image') else None,
                        'delivery_photos': [
                            f'/api/v1/public/tracking/{tracking_number}/photos/{i}/'
                            for i in range(1, 4)  # Up to 3 photos
                        ] if hasattr(pod, 'delivery_photos') else [],
                        'delivery_notes': pod.delivery_notes if hasattr(pod, 'delivery_notes') else None,
                        'delivered_by': shipment.assigned_driver.first_name if shipment.assigned_driver else 'SafeShipper Driver'
                    }
            except ImportError:
                # Delivery app might not exist yet, use basic info
                response_data['proof_of_delivery'] = {
                    'delivery_date': shipment.actual_delivery_date.isoformat() if shipment.actual_delivery_date else None,
                    'delivered_by': shipment.assigned_driver.first_name if shipment.assigned_driver else 'SafeShipper Driver',
                    'status': 'delivered'
                }
        
        # Add shipment items summary (non-sensitive info only)
        items = shipment.items.all()
        response_data['items_summary'] = {
            'total_items': items.count(),
            'total_weight_kg': sum((item.weight_kg or 0) * item.quantity for item in items),
            'has_dangerous_goods': items.filter(is_dangerous_good=True).exists(),
            'dangerous_goods_count': items.filter(is_dangerous_good=True).count()
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


@api_view(['GET'])
@permission_classes([AllowAny])
def public_document_download(request, tracking_number, document_id):
    """
    Public endpoint for customers to download shipment documents
    """
    try:
        from shipments.models import Shipment
        from documents.models import Document
        from django.http import HttpResponse, Http404
        
        # Find shipment and document
        try:
            shipment = Shipment.objects.get(tracking_number=tracking_number)
            document = Document.objects.get(
                id=document_id, 
                shipment=shipment,
                document_type__in=['DG_MANIFEST', 'DG_DECLARATION', 'COMMERCIAL_INVOICE']
            )
        except (Shipment.DoesNotExist, Document.DoesNotExist):
            return Response(
                {'error': 'Document not found or not accessible'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if document is validated and ready for public access
        if document.status not in ['VALIDATED_OK', 'VALIDATED_WITH_ERRORS']:
            return Response(
                {'error': 'Document is not yet available for download'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Serve the file
        try:
            response = HttpResponse(document.file.read(), content_type=document.mime_type)
            response['Content-Disposition'] = f'attachment; filename="{document.original_filename}"'
            response['Content-Length'] = document.file_size
            
            logger.info(f"Public document download: {tracking_number}/{document_id}")
            return response
            
        except Exception as e:
            logger.error(f"Error serving document {document_id}: {str(e)}")
            return Response(
                {'error': 'Document temporarily unavailable'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Public document download error for {tracking_number}/{document_id}: {str(e)}")
        return Response(
            {'error': 'An error occurred while retrieving the document'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_delivery_signature(request, tracking_number):
    """
    Public endpoint for customers to view delivery signature
    """
    try:
        from shipments.models import Shipment
        from django.http import HttpResponse
        
        # Find shipment
        try:
            shipment = Shipment.objects.get(tracking_number=tracking_number)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if shipment is delivered
        if shipment.status != 'DELIVERED':
            return Response(
                {'error': 'Signature not available - shipment not yet delivered'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            from shipments.models import ProofOfDelivery
            pod = ProofOfDelivery.objects.get(shipment=shipment)
            
            if not pod.recipient_signature_url:
                return Response(
                    {'error': 'Signature not available'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Return signature URL or base64 data
            signature_data = {
                'signature_url': pod.recipient_signature_url,
                'recipient_name': pod.recipient_name,
                'delivered_at': pod.delivered_at.isoformat(),
                'delivered_by': pod.delivered_by.get_full_name() if pod.delivered_by else 'Unknown',
            }
            
            logger.info(f"Public signature access: {tracking_number}")
            return Response(signature_data)
            
        except ProofOfDelivery.DoesNotExist:
            return Response(
                {'error': 'Signature not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': 'Signature temporarily unavailable'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Public delivery signature error for {tracking_number}: {str(e)}")
        return Response(
            {'error': 'An error occurred while retrieving the signature'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_delivery_photos(request, tracking_number, photo_id):
    """
    Public endpoint for customers to view delivery photos
    """
    try:
        from shipments.models import Shipment
        from django.http import HttpResponse
        
        # Find shipment
        try:
            shipment = Shipment.objects.get(tracking_number=tracking_number)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if shipment is delivered
        if shipment.status != 'DELIVERED':
            return Response(
                {'error': 'Delivery photos not available - shipment not yet delivered'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            from shipments.models import ProofOfDelivery, ProofOfDeliveryPhoto
            pod = ProofOfDelivery.objects.get(shipment=shipment)
            
            # Get specific photo by ID
            try:
                photo = ProofOfDeliveryPhoto.objects.get(
                    proof_of_delivery=pod,
                    id=photo_id
                )
            except ProofOfDeliveryPhoto.DoesNotExist:
                return Response(
                    {'error': 'Photo not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Return photo data
            photo_data = {
                'image_url': photo.image_url,
                'thumbnail_url': photo.thumbnail_url,
                'caption': photo.caption,
                'taken_at': photo.taken_at.isoformat(),
                'file_name': photo.file_name,
                'file_size_mb': photo.file_size_mb,
            }
            
            logger.info(f"Public delivery photo access: {tracking_number}/{photo_id}")
            return Response(photo_data)
            
        except ProofOfDelivery.DoesNotExist:
            return Response(
                {'error': 'Delivery photos not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': 'Photo temporarily unavailable'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Public delivery photo error for {tracking_number}/{photo_id}: {str(e)}")
        return Response(
            {'error': 'An error occurred while retrieving the photo'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_shipment_timeline(request, tracking_number):
    """
    Public endpoint for detailed shipment timeline and events
    """
    try:
        from shipments.models import Shipment
        
        # Find shipment
        try:
            shipment = Shipment.objects.get(tracking_number=tracking_number)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Build comprehensive timeline
        timeline = []
        
        # Shipment created
        timeline.append({
            'event': 'SHIPMENT_CREATED',
            'title': 'Shipment Created',
            'description': 'Your shipment has been created and is being prepared for dispatch.',
            'timestamp': shipment.created_at.isoformat(),
            'location': shipment.origin_location,
            'completed': True
        })
        
        # Document validation (if available)
        documents = shipment.documents.filter(status='VALIDATED_OK')
        if documents.exists():
            timeline.append({
                'event': 'DOCUMENTS_VALIDATED',
                'title': 'Documentation Validated',
                'description': f'{documents.count()} document(s) have been validated and approved.',
                'timestamp': documents.first().updated_at.isoformat(),
                'location': shipment.origin_location,
                'completed': True
            })
        
        # Ready for dispatch
        if shipment.status not in ['PENDING', 'AWAITING_VALIDATION']:
            timeline.append({
                'event': 'READY_FOR_DISPATCH',
                'title': 'Ready for Pickup',
                'description': 'Shipment is ready and scheduled for pickup.',
                'timestamp': shipment.estimated_pickup_date.isoformat() if shipment.estimated_pickup_date else shipment.updated_at.isoformat(),
                'location': shipment.origin_location,
                'completed': shipment.status not in ['PENDING', 'AWAITING_VALIDATION', 'PLANNING']
            })
        
        # Picked up
        if shipment.actual_pickup_date or shipment.status in ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']:
            timeline.append({
                'event': 'PICKUP_COMPLETED',
                'title': 'Pickup Completed',
                'description': 'Shipment has been picked up and is now in transit.',
                'timestamp': shipment.actual_pickup_date.isoformat() if shipment.actual_pickup_date else shipment.updated_at.isoformat(),
                'location': shipment.origin_location,
                'completed': True
            })
        
        # In transit
        if shipment.status in ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']:
            timeline.append({
                'event': 'IN_TRANSIT',
                'title': 'In Transit',
                'description': 'Shipment is on its way to the destination.',
                'timestamp': shipment.updated_at.isoformat(),
                'location': 'En route',
                'completed': True
            })
        
        # Out for delivery
        if shipment.status in ['OUT_FOR_DELIVERY', 'DELIVERED']:
            timeline.append({
                'event': 'OUT_FOR_DELIVERY',
                'title': 'Out for Delivery',
                'description': 'Shipment is out for delivery and will arrive soon.',
                'timestamp': shipment.updated_at.isoformat(),
                'location': 'Near destination',
                'completed': True
            })
        
        # Delivered
        if shipment.status == 'DELIVERED':
            timeline.append({
                'event': 'DELIVERED',
                'title': 'Delivered',
                'description': 'Shipment has been successfully delivered.',
                'timestamp': shipment.actual_delivery_date.isoformat() if shipment.actual_delivery_date else shipment.updated_at.isoformat(),
                'location': shipment.destination_location,
                'completed': True
            })
        
        # Future estimated delivery
        elif shipment.estimated_delivery_date and shipment.status != 'DELIVERED':
            timeline.append({
                'event': 'ESTIMATED_DELIVERY',
                'title': 'Estimated Delivery',
                'description': 'Expected delivery date and time.',
                'timestamp': shipment.estimated_delivery_date.isoformat(),
                'location': shipment.destination_location,
                'completed': False,
                'estimated': True
            })
        
        response_data = {
            'tracking_number': shipment.tracking_number,
            'current_status': shipment.status,
            'current_status_display': shipment.get_status_display(),
            'timeline': timeline,
            'total_events': len(timeline),
            'completed_events': len([event for event in timeline if event['completed']]),
            'estimated_events': len([event for event in timeline if event.get('estimated', False)])
        }
        
        logger.info(f"Public shipment timeline requested for {tracking_number}")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Public shipment timeline error for {tracking_number}: {str(e)}")
        return Response(
            {'error': 'An error occurred while retrieving the timeline'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_pod_info(request, tracking_number):
    """
    Public endpoint for customers to view complete proof of delivery information
    """
    try:
        from shipments.models import Shipment, ProofOfDelivery
        # from shipments.serializers import ProofOfDeliverySerializer
        
        # Find shipment
        try:
            shipment = Shipment.objects.get(tracking_number=tracking_number)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if shipment is delivered
        if shipment.status != 'DELIVERED':
            return Response(
                {'error': 'Proof of delivery not available - shipment not yet delivered'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            pod = ProofOfDelivery.objects.get(shipment=shipment)
            # serializer = ProofOfDeliverySerializer(pod)\n            # Temporary: return basic POD data without serializer\n            pod_data = {\n                'id': str(pod.id),\n                'delivered_at': pod.delivered_at,\n                'recipient_name': pod.recipient_name,\n                'delivery_notes': pod.delivery_notes\n            }
            
            logger.info(f"Public POD access: {tracking_number}")
            return Response(pod_data)
            
        except ProofOfDelivery.DoesNotExist:
            return Response(
                {'error': 'Proof of delivery not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
    except Exception as e:
        logger.error(f"Public POD error for {tracking_number}: {str(e)}")
        return Response(
            {'error': 'An error occurred while retrieving the proof of delivery'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )