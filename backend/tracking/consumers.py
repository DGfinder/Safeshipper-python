# tracking/consumers.py
import json
import logging
from typing import Dict, Any, List
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from decimal import Decimal
from .models import GPSEvent, LocationVisit
from vehicles.models import Vehicle
from shipments.models import Shipment

logger = logging.getLogger(__name__)
User = get_user_model()


class TrackingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time GPS tracking and fleet monitoring.
    Handles live location updates, geofence events, and fleet visualization.
    """

    async def connect(self):
        """
        Handle WebSocket connection for tracking.
        Set up vehicle and fleet monitoring groups.
        """
        # Get user from scope (set by AuthMiddleware)
        self.user = self.scope.get('user')
        
        if not self.user or isinstance(self.user, AnonymousUser):
            logger.warning("Anonymous user attempted tracking WebSocket connection")
            await self.close()
            return
        
        # Initialize tracking state
        self.user_id = str(self.user.id)
        self.user_group = f"tracking_user_{self.user_id}"
        self.vehicle_groups = set()
        self.fleet_groups = set()
        
        # Accept the connection
        await self.accept()
        
        # Add user to their personal tracking group
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        
        # Get user's accessible vehicles and subscribe to their tracking
        accessible_vehicles = await self.get_user_vehicles()
        for vehicle_id in accessible_vehicles:
            vehicle_group = f"vehicle_{vehicle_id}"
            await self.channel_layer.group_add(vehicle_group, self.channel_name)
            self.vehicle_groups.add(vehicle_group)
        
        # Subscribe to general fleet updates
        fleet_group = "fleet_updates"
        await self.channel_layer.group_add(fleet_group, self.channel_name)
        self.fleet_groups.add(fleet_group)
        
        # Send connection confirmation
        await self.send_json({
            'type': 'tracking_connected',
            'user_id': self.user_id,
            'vehicles_subscribed': len(accessible_vehicles),
            'timestamp': timezone.now().isoformat()
        })
        
        logger.info(f"User {self.user_id} connected to tracking WebSocket")

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Clean up tracking groups.
        """
        if hasattr(self, 'user') and self.user:
            # Remove from all groups
            if hasattr(self, 'user_group'):
                await self.channel_layer.group_discard(self.user_group, self.channel_name)
            
            if hasattr(self, 'vehicle_groups'):
                for group in self.vehicle_groups:
                    await self.channel_layer.group_discard(group, self.channel_name)
            
            if hasattr(self, 'fleet_groups'):
                for group in self.fleet_groups:
                    await self.channel_layer.group_discard(group, self.channel_name)
            
            logger.info(f"User {self.user_id} disconnected from tracking WebSocket")

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages for tracking.
        Route messages based on their type.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.debug(f"Received tracking message type '{message_type}' from user {self.user_id}")
            
            # Route message based on type
            if message_type == 'subscribe_vehicle':
                await self.handle_subscribe_vehicle(data)
            elif message_type == 'unsubscribe_vehicle':
                await self.handle_unsubscribe_vehicle(data)
            elif message_type == 'update_location':
                await self.handle_location_update(data)
            elif message_type == 'get_vehicle_status':
                await self.handle_get_vehicle_status(data)
            elif message_type == 'get_fleet_overview':
                await self.handle_get_fleet_overview(data)
            elif message_type == 'emergency_alert':
                await self.handle_emergency_alert(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error processing tracking message from user {self.user_id}: {str(e)}")
            await self.send_error("Internal server error")

    async def handle_subscribe_vehicle(self, data: Dict[str, Any]):
        """
        Handle subscribing to a specific vehicle's tracking updates.
        """
        try:
            vehicle_id = data.get('vehicle_id')
            
            if not vehicle_id:
                await self.send_error("Vehicle ID is required")
                return
            
            # Verify user has access to this vehicle
            has_access = await self.check_vehicle_access(vehicle_id)
            if not has_access:
                await self.send_error("You don't have access to this vehicle")
                return
            
            # Add to vehicle group
            vehicle_group = f"vehicle_{vehicle_id}"
            await self.channel_layer.group_add(vehicle_group, self.channel_name)
            self.vehicle_groups.add(vehicle_group)
            
            # Send confirmation with latest location
            latest_location = await self.get_latest_vehicle_location(vehicle_id)
            
            await self.send_json({
                'type': 'vehicle_subscribed',
                'vehicle_id': vehicle_id,
                'latest_location': latest_location
            })
            
            logger.info(f"User {self.user_id} subscribed to vehicle {vehicle_id}")
            
        except Exception as e:
            logger.error(f"Error subscribing to vehicle: {str(e)}")
            await self.send_error("Failed to subscribe to vehicle")

    async def handle_unsubscribe_vehicle(self, data: Dict[str, Any]):
        """
        Handle unsubscribing from a vehicle's tracking updates.
        """
        try:
            vehicle_id = data.get('vehicle_id')
            
            if not vehicle_id:
                await self.send_error("Vehicle ID is required")
                return
            
            # Remove from vehicle group
            vehicle_group = f"vehicle_{vehicle_id}"
            await self.channel_layer.group_discard(vehicle_group, self.channel_name)
            self.vehicle_groups.discard(vehicle_group)
            
            await self.send_json({
                'type': 'vehicle_unsubscribed',
                'vehicle_id': vehicle_id
            })
            
            logger.info(f"User {self.user_id} unsubscribed from vehicle {vehicle_id}")
            
        except Exception as e:
            logger.error(f"Error unsubscribing from vehicle: {str(e)}")
            await self.send_error("Failed to unsubscribe from vehicle")

    async def handle_location_update(self, data: Dict[str, Any]):
        """
        Handle receiving a GPS location update from a vehicle/driver.
        """
        try:
            vehicle_id = data.get('vehicle_id')
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            
            if not all([vehicle_id, latitude, longitude]):
                await self.send_error("Vehicle ID, latitude, and longitude are required")
                return
            
            # Verify user can update this vehicle's location
            can_update = await self.check_vehicle_update_permission(vehicle_id)
            if not can_update:
                await self.send_error("You don't have permission to update this vehicle's location")
                return
            
            # Create GPS event
            gps_event = await self.create_gps_event(
                vehicle_id=vehicle_id,
                latitude=float(latitude),
                longitude=float(longitude),
                speed=data.get('speed'),
                heading=data.get('heading'),
                accuracy=data.get('accuracy'),
                battery_level=data.get('battery_level'),
                metadata=data.get('metadata', {})
            )
            
            if gps_event:
                # Broadcast location update to vehicle subscribers
                location_data = await self.get_gps_event_data(gps_event)
                
                await self.channel_layer.group_send(
                    f"vehicle_{vehicle_id}",
                    {
                        'type': 'location_update',
                        'vehicle_id': vehicle_id,
                        'location_data': location_data
                    }
                )
                
                # Check for geofence events
                await self.check_geofence_events(gps_event)
                
                logger.info(f"Location update processed for vehicle {vehicle_id}")
            
        except Exception as e:
            logger.error(f"Error processing location update: {str(e)}")
            await self.send_error("Failed to process location update")

    async def handle_get_vehicle_status(self, data: Dict[str, Any]):
        """
        Handle request for current vehicle status and location.
        """
        try:
            vehicle_id = data.get('vehicle_id')
            
            if not vehicle_id:
                await self.send_error("Vehicle ID is required")
                return
            
            # Get comprehensive vehicle status
            vehicle_status = await self.get_vehicle_status(vehicle_id)
            
            await self.send_json({
                'type': 'vehicle_status',
                'vehicle_id': vehicle_id,
                'status': vehicle_status
            })
            
        except Exception as e:
            logger.error(f"Error getting vehicle status: {str(e)}")
            await self.send_error("Failed to get vehicle status")

    async def handle_get_fleet_overview(self, data: Dict[str, Any]):
        """
        Handle request for fleet overview data.
        """
        try:
            # Get fleet overview for user's accessible vehicles
            fleet_data = await self.get_fleet_overview()
            
            await self.send_json({
                'type': 'fleet_overview',
                'fleet_data': fleet_data
            })
            
        except Exception as e:
            logger.error(f"Error getting fleet overview: {str(e)}")
            await self.send_error("Failed to get fleet overview")

    async def handle_emergency_alert(self, data: Dict[str, Any]):
        """
        Handle emergency alert from a vehicle/driver.
        """
        try:
            vehicle_id = data.get('vehicle_id')
            alert_type = data.get('alert_type', 'EMERGENCY')
            message = data.get('message', '')
            location = data.get('location')
            
            if not vehicle_id:
                await self.send_error("Vehicle ID is required for emergency alert")
                return
            
            # Create emergency alert
            alert_data = await self.create_emergency_alert(
                vehicle_id=vehicle_id,
                alert_type=alert_type,
                message=message,
                location=location,
                metadata=data.get('metadata', {})
            )
            
            if alert_data:
                # Broadcast emergency alert to all fleet managers
                await self.channel_layer.group_send(
                    "fleet_updates",
                    {
                        'type': 'emergency_alert',
                        'vehicle_id': vehicle_id,
                        'alert_data': alert_data
                    }
                )
                
                logger.warning(f"Emergency alert from vehicle {vehicle_id}: {alert_type}")
            
        except Exception as e:
            logger.error(f"Error handling emergency alert: {str(e)}")
            await self.send_error("Failed to process emergency alert")

    # WebSocket message handlers for group sends
    async def location_update(self, event):
        """Send location update to WebSocket"""
        await self.send_json({
            'type': 'location_update',
            'vehicle_id': event['vehicle_id'],
            'location_data': event['location_data']
        })

    async def geofence_event(self, event):
        """Send geofence event to WebSocket"""
        await self.send_json({
            'type': 'geofence_event',
            'vehicle_id': event['vehicle_id'],
            'event_type': event['event_type'],
            'location_name': event['location_name'],
            'timestamp': event['timestamp']
        })

    async def vehicle_status_change(self, event):
        """Send vehicle status change to WebSocket"""
        await self.send_json({
            'type': 'vehicle_status_change',
            'vehicle_id': event['vehicle_id'],
            'status': event['status'],
            'timestamp': event['timestamp']
        })

    async def emergency_alert(self, event):
        """Send emergency alert to WebSocket"""
        await self.send_json({
            'type': 'emergency_alert',
            'vehicle_id': event['vehicle_id'],
            'alert_data': event['alert_data']
        })

    async def fleet_update(self, event):
        """Send fleet update to WebSocket"""
        await self.send_json({
            'type': 'fleet_update',
            'update_type': event['update_type'],
            'data': event['data']
        })

    # Utility methods
    async def send_json(self, content):
        """Send JSON data to WebSocket"""
        await self.send(text_data=json.dumps(content))

    async def send_error(self, message: str):
        """Send error message to WebSocket"""
        await self.send_json({
            'type': 'error',
            'message': message
        })

    # Database operations
    @database_sync_to_async
    def get_user_vehicles(self) -> List[str]:
        """Get list of vehicle IDs the user has access to"""
        try:
            # Get vehicles based on user's company or assigned vehicles
            vehicles = Vehicle.objects.filter(
                company=self.user.company
            ).values_list('id', flat=True)
            return [str(vehicle_id) for vehicle_id in vehicles]
        except Exception as e:
            logger.error(f"Error getting user vehicles: {str(e)}")
            return []

    @database_sync_to_async
    def check_vehicle_access(self, vehicle_id: str) -> bool:
        """Check if user has access to view this vehicle"""
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
            # Check if user belongs to same company or has specific access
            return vehicle.company == self.user.company
        except Vehicle.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error checking vehicle access: {str(e)}")
            return False

    @database_sync_to_async
    def check_vehicle_update_permission(self, vehicle_id: str) -> bool:
        """Check if user can update this vehicle's location"""
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
            # Check if user is assigned to this vehicle or is manager
            return (
                vehicle.assigned_driver == self.user or
                vehicle.company == self.user.company and 
                self.user.role in ['MANAGER', 'ADMIN', 'SUPERVISOR']
            )
        except Vehicle.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error checking vehicle update permission: {str(e)}")
            return False

    @database_sync_to_async
    def create_gps_event(self, vehicle_id: str, latitude: float, longitude: float, 
                        speed=None, heading=None, accuracy=None, battery_level=None, 
                        metadata=None):
        """Create a new GPS event in the database"""
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
            
            gps_event = GPSEvent.objects.create(
                vehicle=vehicle,
                latitude=latitude,
                longitude=longitude,
                speed=speed,
                heading=heading,
                accuracy=accuracy,
                battery_level=battery_level,
                timestamp=timezone.now(),
                source='MOBILE_APP',
                raw_data=metadata or {}
            )
            
            return gps_event
            
        except Exception as e:
            logger.error(f"Error creating GPS event: {str(e)}")
            return None

    @database_sync_to_async
    def get_latest_vehicle_location(self, vehicle_id: str):
        """Get the latest GPS location for a vehicle"""
        try:
            latest_event = GPSEvent.objects.filter(
                vehicle_id=vehicle_id
            ).order_by('-timestamp').first()
            
            if latest_event:
                return {
                    'latitude': latest_event.latitude,
                    'longitude': latest_event.longitude,
                    'speed': latest_event.speed,
                    'heading': latest_event.heading,
                    'accuracy': latest_event.accuracy,
                    'timestamp': latest_event.timestamp.isoformat(),
                    'battery_level': latest_event.battery_level
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting latest vehicle location: {str(e)}")
            return None

    @database_sync_to_async
    def get_gps_event_data(self, gps_event):
        """Get GPS event data for broadcasting"""
        try:
            return {
                'id': str(gps_event.id),
                'vehicle_id': str(gps_event.vehicle.id),
                'latitude': gps_event.latitude,
                'longitude': gps_event.longitude,
                'speed': gps_event.speed,
                'heading': gps_event.heading,
                'accuracy': gps_event.accuracy,
                'battery_level': gps_event.battery_level,
                'timestamp': gps_event.timestamp.isoformat(),
                'source': gps_event.source
            }
        except Exception as e:
            logger.error(f"Error getting GPS event data: {str(e)}")
            return None

    @database_sync_to_async
    def get_vehicle_status(self, vehicle_id: str):
        """Get comprehensive vehicle status"""
        try:
            vehicle = Vehicle.objects.select_related('company').get(id=vehicle_id)
            latest_gps = GPSEvent.objects.filter(
                vehicle=vehicle
            ).order_by('-timestamp').first()
            
            # Get current location visit if any
            current_visit = LocationVisit.objects.filter(
                vehicle=vehicle,
                status='ACTIVE'
            ).first()
            
            status = {
                'vehicle_id': str(vehicle.id),
                'registration': vehicle.registration_number,
                'status': 'ACTIVE',  # This could be derived from business logic
                'latest_location': None,
                'current_visit': None,
                'last_updated': None
            }
            
            if latest_gps:
                status['latest_location'] = {
                    'latitude': latest_gps.latitude,
                    'longitude': latest_gps.longitude,
                    'speed': latest_gps.speed,
                    'heading': latest_gps.heading,
                    'timestamp': latest_gps.timestamp.isoformat()
                }
                status['last_updated'] = latest_gps.timestamp.isoformat()
            
            if current_visit:
                status['current_visit'] = {
                    'location_name': current_visit.location.name,
                    'entry_time': current_visit.entry_time.isoformat(),
                    'duration_hours': current_visit.duration_hours
                }
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting vehicle status: {str(e)}")
            return None

    @database_sync_to_async
    def get_fleet_overview(self):
        """Get fleet overview data"""
        try:
            user_vehicles = Vehicle.objects.filter(company=self.user.company)
            total_vehicles = user_vehicles.count()
            
            # Get vehicles with recent GPS data (last 30 minutes)
            from datetime import timedelta
            recent_threshold = timezone.now() - timedelta(minutes=30)
            
            active_vehicles = GPSEvent.objects.filter(
                vehicle__in=user_vehicles,
                timestamp__gte=recent_threshold
            ).values('vehicle').distinct().count()
            
            # Get current visits
            current_visits = LocationVisit.objects.filter(
                vehicle__in=user_vehicles,
                status='ACTIVE'
            ).count()
            
            return {
                'total_vehicles': total_vehicles,
                'active_vehicles': active_vehicles,
                'inactive_vehicles': total_vehicles - active_vehicles,
                'current_visits': current_visits,
                'last_updated': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting fleet overview: {str(e)}")
            return None

    @database_sync_to_async
    def check_geofence_events(self, gps_event):
        """Check if GPS event triggers any geofence events"""
        try:
            # This would implement geofence logic
            # For now, just a placeholder
            pass
        except Exception as e:
            logger.error(f"Error checking geofence events: {str(e)}")

    @database_sync_to_async
    def create_emergency_alert(self, vehicle_id: str, alert_type: str, message: str, 
                              location=None, metadata=None):
        """Create emergency alert"""
        try:
            alert_data = {
                'vehicle_id': vehicle_id,
                'alert_type': alert_type,
                'message': message,
                'timestamp': timezone.now().isoformat(),
                'location': location,
                'metadata': metadata or {},
                'user_id': self.user_id
            }
            
            # Here you would save to database and trigger notifications
            # For now, just return the alert data
            return alert_data
            
        except Exception as e:
            logger.error(f"Error creating emergency alert: {str(e)}")
            return None