"""
Django signals for spatial indexing optimization and cache invalidation.
Handles real-time updates to maintain performance and data consistency.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from datetime import timedelta
import logging
from typing import Optional

from .models import GPSEvent, LocationVisit
from vehicles.models import Vehicle
from locations.models import GeoLocation
from .services.redis_cache import redis_map_cache
from .services.map_performance import map_performance_service

logger = logging.getLogger(__name__)


@receiver(post_save, sender=GPSEvent)
def handle_gps_event_created(sender, instance, created, **kwargs):
    """
    Handle GPS event creation for real-time optimizations.
    
    This signal:
    1. Updates vehicle last known location
    2. Invalidates relevant map cache regions
    3. Triggers materialized view refresh if needed
    4. Updates geofence intersection status
    """
    if not created or not instance.coordinates:
        return
    
    try:
        # Update vehicle's last known location
        if instance.vehicle and instance.coordinates:
            vehicle = instance.vehicle
            if not vehicle.last_reported_at or instance.timestamp > vehicle.last_reported_at:
                vehicle.last_known_location = instance.coordinates
                vehicle.last_reported_at = instance.timestamp
                vehicle.save(update_fields=['last_known_location', 'last_reported_at', 'updated_at'])
        
        # Invalidate map cache for the region
        invalidate_map_cache_for_location(
            instance.coordinates.y, 
            instance.coordinates.x,
            instance.vehicle.owning_company_id if instance.vehicle else None
        )
        
        # Check for geofence intersections asynchronously
        if instance.vehicle:
            check_geofence_intersections.delay(instance.id)
        
        # Trigger materialized view refresh if significant time has passed
        trigger_conditional_view_refresh()
        
    except Exception as e:
        logger.error(f"Error processing GPS event signal: {e}", exc_info=True)


@receiver(post_save, sender=Vehicle)
def handle_vehicle_updated(sender, instance, created, **kwargs):
    """
    Handle vehicle updates to maintain cache consistency.
    """
    try:
        # If location was updated, invalidate cache
        if instance.last_known_location and hasattr(instance, '_last_known_location_changed'):
            invalidate_map_cache_for_location(
                instance.last_known_location.y,
                instance.last_known_location.x,
                instance.owning_company_id
            )
        
        # If vehicle status changed, refresh fleet summary
        if hasattr(instance, '_status_changed'):
            schedule_fleet_summary_refresh(instance.owning_company_id)
            
    except Exception as e:
        logger.error(f"Error processing vehicle update signal: {e}", exc_info=True)


@receiver(pre_save, sender=Vehicle)
def track_vehicle_changes(sender, instance, **kwargs):
    """
    Track changes to vehicle fields for optimized cache invalidation.
    """
    if instance.pk:
        try:
            old_instance = Vehicle.objects.get(pk=instance.pk)
            
            # Track location changes
            if (old_instance.last_known_location != instance.last_known_location):
                instance._last_known_location_changed = True
                
                # Invalidate old location cache as well
                if old_instance.last_known_location:
                    invalidate_map_cache_for_location(
                        old_instance.last_known_location.y,
                        old_instance.last_known_location.x,
                        old_instance.owning_company_id
                    )
            
            # Track status changes
            if old_instance.status != instance.status:
                instance._status_changed = True
                
        except Vehicle.DoesNotExist:
            pass


@receiver(post_save, sender=LocationVisit)
def handle_location_visit_created(sender, instance, created, **kwargs):
    """
    Handle location visit events for geofence statistics.
    """
    try:
        # Update geofence statistics
        if created:
            schedule_geofence_stats_refresh(instance.location_id)
        
        # If visit ended, update duration statistics
        if not created and instance.exit_time:
            schedule_geofence_stats_refresh(instance.location_id)
            
    except Exception as e:
        logger.error(f"Error processing location visit signal: {e}", exc_info=True)


@receiver(post_save, sender=GeoLocation)
def handle_geolocation_updated(sender, instance, created, **kwargs):
    """
    Handle geolocation updates to maintain spatial consistency.
    """
    try:
        # If geofence boundary changed, invalidate related caches
        if instance.geofence:
            # Invalidate cache for the geofence area
            if instance.latitude and instance.longitude:
                invalidate_map_cache_for_location(
                    float(instance.latitude),
                    float(instance.longitude),
                    instance.company_id,
                    radius_km=5.0  # Larger radius for geofence changes
                )
        
        # Schedule geofence statistics refresh
        schedule_geofence_stats_refresh(instance.id)
        
    except Exception as e:
        logger.error(f"Error processing geolocation update signal: {e}", exc_info=True)


def invalidate_map_cache_for_location(
    lat: float, 
    lng: float, 
    company_id: Optional[int] = None,
    radius_km: float = 2.0
):
    """
    Invalidate map cache for a specific location and surrounding area.
    
    Args:
        lat: Latitude of the location
        lng: Longitude of the location  
        company_id: Optional company filter
        radius_km: Radius in kilometers to invalidate
    """
    try:
        # Invalidate Redis map cache
        redis_map_cache.invalidate_region(
            center_lat=lat,
            center_lng=lng,
            radius_km=radius_km,
            company_id=company_id
        )
        
        # Also invalidate Django cache keys for the region
        cache_keys = generate_cache_keys_for_region(lat, lng, company_id)
        cache.delete_many(cache_keys)
        
        logger.debug(f"Invalidated cache region: {lat:.4f}, {lng:.4f} (r={radius_km}km)")
        
    except Exception as e:
        logger.error(f"Error invalidating cache for location: {e}")


def generate_cache_keys_for_region(
    lat: float, 
    lng: float, 
    company_id: Optional[int] = None
) -> list:
    """Generate cache keys that might be affected by a location update."""
    keys = []
    
    # Generate keys for different zoom levels around the location
    for zoom in range(8, 16):
        # Calculate approximate tile coordinates
        # This is a simplified calculation - production would use proper tile math
        for lat_offset in [-0.01, 0, 0.01]:
            for lng_offset in [-0.01, 0, 0.01]:
                cache_key = f"fleet_map:{lat+lat_offset:.4f},{lng+lng_offset:.4f}:z{zoom}:c{company_id or 'all'}"
                keys.append(cache_key)
    
    return keys


def trigger_conditional_view_refresh():
    """
    Conditionally trigger materialized view refresh based on staleness.
    """
    try:
        # Check when views were last refreshed
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT MAX(computed_at) FROM tracking_fleet_summary
            """)
            
            last_refresh = cursor.fetchone()[0]
            
            if last_refresh:
                staleness = timezone.now() - last_refresh
                
                # Refresh if data is more than 5 minutes old and it's not peak hours
                if staleness > timedelta(minutes=5):
                    current_hour = timezone.now().hour
                    
                    # Avoid refreshing during peak hours (7-9 AM, 5-7 PM)
                    if not (7 <= current_hour <= 9 or 17 <= current_hour <= 19):
                        refresh_materialized_views.delay()
            else:
                # No refresh timestamp, schedule refresh
                refresh_materialized_views.delay()
                
    except Exception as e:
        logger.error(f"Error checking view staleness: {e}")


def schedule_fleet_summary_refresh(company_id: int):
    """Schedule fleet summary refresh for specific company."""
    try:
        # Use cache to debounce refresh requests
        cache_key = f"fleet_refresh_scheduled:{company_id}"
        
        if not cache.get(cache_key):
            # Schedule refresh and set debounce cache
            refresh_fleet_summary.delay(company_id)
            cache.set(cache_key, True, 60)  # Debounce for 1 minute
            
    except Exception as e:
        logger.error(f"Error scheduling fleet refresh: {e}")


def schedule_geofence_stats_refresh(location_id: int):
    """Schedule geofence statistics refresh for specific location."""
    try:
        cache_key = f"geofence_refresh_scheduled:{location_id}"
        
        if not cache.get(cache_key):
            refresh_geofence_stats.delay(location_id)
            cache.set(cache_key, True, 300)  # Debounce for 5 minutes
            
    except Exception as e:
        logger.error(f"Error scheduling geofence refresh: {e}")


# Celery task definitions (would be in tasks.py in production)
try:
    from celery import shared_task
    
    @shared_task(bind=True, max_retries=3)
    def check_geofence_intersections(self, gps_event_id: int):
        """
        Asynchronously check geofence intersections for GPS event.
        """
        try:
            from .services.map_performance import geofence_performance_service
            
            gps_event = GPSEvent.objects.get(id=gps_event_id)
            
            if gps_event.coordinates and gps_event.vehicle:
                intersections = geofence_performance_service.check_geofence_intersections(
                    gps_event.coordinates,
                    gps_event.vehicle.owning_company_id
                )
                
                # Create location visits for new intersections
                for intersection in intersections:
                    LocationVisit.objects.get_or_create(
                        location_id=intersection['geofence_id'],
                        vehicle=gps_event.vehicle,
                        shipment=gps_event.shipment,
                        entry_time=timezone.now(),
                        defaults={
                            'entry_event': gps_event,
                            'status': 'ACTIVE'
                        }
                    )
                
                logger.info(f"Processed {len(intersections)} geofence intersections for GPS event {gps_event_id}")
                
        except GPSEvent.DoesNotExist:
            logger.warning(f"GPS event {gps_event_id} not found")
        except Exception as e:
            logger.error(f"Error checking geofence intersections: {e}")
            # Retry with exponential backoff
            self.retry(countdown=60 * (2 ** self.request.retries))
    
    
    @shared_task(bind=True, max_retries=2)
    def refresh_materialized_views(self):
        """
        Asynchronously refresh all spatial materialized views.
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT refresh_spatial_views()")
                
            logger.info("Materialized views refreshed successfully")
            
        except Exception as e:
            logger.error(f"Error refreshing materialized views: {e}")
            self.retry(countdown=300)  # Retry in 5 minutes
    
    
    @shared_task(bind=True, max_retries=2)
    def refresh_fleet_summary(self, company_id: int):
        """
        Refresh fleet summary for specific company.
        """
        try:
            with connection.cursor() as cursor:
                # Refresh only the company's data
                cursor.execute("""
                    REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_fleet_summary
                """)
                
            logger.info(f"Fleet summary refreshed for company {company_id}")
            
        except Exception as e:
            logger.error(f"Error refreshing fleet summary: {e}")
            self.retry(countdown=180)
    
    
    @shared_task(bind=True, max_retries=2)
    def refresh_geofence_stats(self, location_id: int):
        """
        Refresh geofence statistics for specific location.
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_geofence_stats
                """)
                
            logger.info(f"Geofence stats refreshed for location {location_id}")
            
        except Exception as e:
            logger.error(f"Error refreshing geofence stats: {e}")
            self.retry(countdown=300)
    
    
    @shared_task(bind=True)
    def maintain_spatial_indexes(self):
        """
        Periodic maintenance of spatial indexes.
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT maintain_spatial_indexes()")
                
            logger.info("Spatial index maintenance completed")
            
        except Exception as e:
            logger.error(f"Error maintaining spatial indexes: {e}")
    
    
    @shared_task(bind=True)
    def partition_maintenance(self):
        """
        Periodic partition maintenance.
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT maintain_gps_partitions()")
                
            logger.info("Partition maintenance completed")
            
        except Exception as e:
            logger.error(f"Error maintaining partitions: {e}")

except ImportError:
    # Celery not available, define dummy functions
    logger.warning("Celery not available, async tasks will be skipped")
    
    def check_geofence_intersections(gps_event_id):
        pass
    
    def refresh_materialized_views():
        pass
    
    def refresh_fleet_summary(company_id):
        pass
    
    def refresh_geofence_stats(location_id):
        pass
    
    def maintain_spatial_indexes():
        pass
    
    def partition_maintenance():
        pass