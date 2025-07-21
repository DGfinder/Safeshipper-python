"""
Celery tasks for spatial indexing maintenance and optimization.
Handles background processing for GPS tracking performance.
"""

from celery import shared_task
from django.db import connection, transaction
from django.utils import timezone
from django.core.cache import cache
from datetime import datetime, timedelta
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_geofence_intersections(self, gps_event_id: int):
    """
    Asynchronously check geofence intersections for GPS event.
    
    Args:
        gps_event_id: ID of the GPS event to process
    """
    try:
        from .models import GPSEvent, LocationVisit
        from .services.map_performance import geofence_performance_service
        
        gps_event = GPSEvent.objects.select_related('vehicle').get(id=gps_event_id)
        
        if not gps_event.coordinates or not gps_event.vehicle:
            return
        
        # Check for geofence intersections
        intersections = geofence_performance_service.check_geofence_intersections(
            gps_event.coordinates,
            gps_event.vehicle.owning_company_id
        )
        
        # Create location visits for new intersections
        visits_created = 0
        for intersection in intersections:
            visit, created = LocationVisit.objects.get_or_create(
                location_id=intersection['geofence_id'],
                vehicle=gps_event.vehicle,
                status='ACTIVE',
                exit_time__isnull=True,
                defaults={
                    'shipment': gps_event.shipment,
                    'entry_time': gps_event.timestamp,
                    'entry_event': gps_event,
                }
            )
            if created:
                visits_created += 1
        
        logger.info(f"Processed {len(intersections)} geofence intersections, created {visits_created} visits for GPS event {gps_event_id}")
        
    except GPSEvent.DoesNotExist:
        logger.warning(f"GPS event {gps_event_id} not found")
    except Exception as e:
        logger.error(f"Error checking geofence intersections: {e}")
        # Retry with exponential backoff
        self.retry(countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def refresh_materialized_views(self):
    """
    Refresh all spatial materialized views.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT refresh_spatial_views()")
            
        # Clear related cache keys
        cache_keys = [
            'fleet_bounds:*',
            'map_perf:*',
            'geofence_perf:*'
        ]
        
        for pattern in cache_keys:
            try:
                # This would use Redis SCAN in production
                cache.delete_many([pattern])
            except:
                pass
        
        logger.info("Materialized views refreshed successfully")
        
    except Exception as e:
        logger.error(f"Error refreshing materialized views: {e}")
        self.retry()


@shared_task(bind=True, max_retries=2, default_retry_delay=180)
def refresh_fleet_summary(self, company_id: Optional[int] = None):
    """
    Refresh fleet summary for specific company or all companies.
    
    Args:
        company_id: Optional company ID to refresh, None for all
    """
    try:
        with connection.cursor() as cursor:
            if company_id:
                # Refresh specific company data (would need custom function)
                cursor.execute("""
                    REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_fleet_summary
                """)
            else:
                cursor.execute("""
                    REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_fleet_summary
                """)
        
        # Clear fleet-related cache
        cache.delete_many([
            f'fleet_bounds:c{company_id or "all"}',
            f'map_perf:bounds:c{company_id or "all"}'
        ])
        
        logger.info(f"Fleet summary refreshed for company {company_id or 'all'}")
        
    except Exception as e:
        logger.error(f"Error refreshing fleet summary: {e}")
        self.retry()


@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def refresh_geofence_stats(self, location_id: Optional[int] = None):
    """
    Refresh geofence statistics.
    
    Args:
        location_id: Optional location ID, None for all locations
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_geofence_stats
            """)
        
        logger.info(f"Geofence stats refreshed for location {location_id or 'all'}")
        
    except Exception as e:
        logger.error(f"Error refreshing geofence stats: {e}")
        self.retry()


@shared_task(bind=True, max_retries=1)
def maintain_spatial_indexes(self):
    """
    Perform spatial index maintenance.
    """
    try:
        with connection.cursor() as cursor:
            # Run the maintenance function
            cursor.execute("SELECT maintain_spatial_indexes()")
            
            # Get maintenance results
            cursor.execute("""
                SELECT * FROM check_spatial_performance()
            """)
            
            performance_issues = cursor.fetchall()
            
            # Log any performance issues
            for issue in performance_issues:
                metric_name, metric_value, status, recommendation = issue
                if status == 'WARNING':
                    logger.warning(f"Spatial performance issue: {metric_name} = {metric_value}. {recommendation}")
        
        logger.info("Spatial index maintenance completed successfully")
        
    except Exception as e:
        logger.error(f"Error maintaining spatial indexes: {e}")


@shared_task(bind=True, max_retries=1)
def partition_maintenance(self):
    """
    Perform GPS event partition maintenance.
    """
    try:
        with connection.cursor() as cursor:
            # Run partition maintenance
            cursor.execute("SELECT maintain_gps_partitions()")
            
            # Get partition status
            cursor.execute("""
                SELECT COUNT(*) as partition_count
                FROM pg_tables 
                WHERE tablename LIKE 'tracking_gpsevent_%' 
                AND tablename ~ '^tracking_gpsevent_[0-9]{4}_[0-9]{2}$'
            """)
            
            partition_count = cursor.fetchone()[0]
            
        logger.info(f"Partition maintenance completed. {partition_count} partitions active.")
        
    except Exception as e:
        logger.error(f"Error maintaining partitions: {e}")


@shared_task(bind=True, max_retries=3)
def bulk_geofence_check(self, vehicle_ids: List[int], time_window_hours: int = 1):
    """
    Bulk geofence intersection check for multiple vehicles.
    
    Args:
        vehicle_ids: List of vehicle IDs to check
        time_window_hours: Hours to look back for GPS events
    """
    try:
        from .models import GPSEvent
        
        cutoff_time = timezone.now() - timedelta(hours=time_window_hours)
        
        # Get recent GPS events for the vehicles
        gps_events = GPSEvent.objects.filter(
            vehicle_id__in=vehicle_ids,
            timestamp__gte=cutoff_time,
            coordinates__isnull=False
        ).select_related('vehicle').order_by('-timestamp')
        
        # Process in batches
        batch_size = 100
        processed = 0
        
        for i in range(0, len(gps_events), batch_size):
            batch = gps_events[i:i+batch_size]
            
            for event in batch:
                # Queue individual geofence checks
                check_geofence_intersections.delay(event.id)
                processed += 1
        
        logger.info(f"Queued geofence checks for {processed} GPS events")
        
    except Exception as e:
        logger.error(f"Error in bulk geofence check: {e}")
        self.retry(countdown=300)


@shared_task(bind=True)
def optimize_cache_warming(self, route_data: List[dict]):
    """
    Warm cache for popular routes.
    
    Args:
        route_data: List of route dictionaries with coordinates
    """
    try:
        from .services.redis_cache import redis_map_cache
        
        total_points = 0
        
        for route in route_data:
            coordinates = route.get('coordinates', [])
            if coordinates:
                # Convert to (lat, lng) tuples
                coord_tuples = [(coord['lat'], coord['lng']) for coord in coordinates]
                redis_map_cache.warm_cache_for_routes(coord_tuples)
                total_points += len(coord_tuples)
        
        logger.info(f"Cache warming initiated for {total_points} route points")
        
    except Exception as e:
        logger.error(f"Error warming cache: {e}")


@shared_task(bind=True)
def cleanup_old_cache_entries(self):
    """
    Clean up old cache entries that may have accumulated.
    """
    try:
        from .services.redis_cache import redis_map_cache
        
        if redis_map_cache.enabled and redis_map_cache.cluster:
            # Clean up old map data cache entries
            patterns_to_clean = [
                'safeshipper:map_data:*',
                'fleet_map:*',
                'mvt_tile:*'
            ]
            
            total_deleted = 0
            
            for pattern in patterns_to_clean:
                try:
                    # In production, this would use Redis SCAN with TTL checking
                    keys = list(redis_map_cache.cluster.scan_iter(match=pattern))
                    
                    # Check TTL and delete expired keys
                    expired_keys = []
                    for key in keys[:1000]:  # Limit to prevent blocking
                        ttl = redis_map_cache.cluster.ttl(key)
                        if ttl == -1:  # No TTL set, might be old
                            expired_keys.append(key)
                    
                    if expired_keys:
                        redis_map_cache.cluster.delete(*expired_keys)
                        total_deleted += len(expired_keys)
                        
                except Exception as e:
                    logger.warning(f"Error cleaning pattern {pattern}: {e}")
            
            logger.info(f"Cleaned up {total_deleted} old cache entries")
        
    except Exception as e:
        logger.error(f"Error cleaning up cache: {e}")


@shared_task(bind=True)
def generate_performance_report(self):
    """
    Generate spatial indexing performance report.
    """
    try:
        report_data = {
            'timestamp': timezone.now().isoformat(),
            'index_performance': [],
            'cache_stats': {},
            'partition_health': {},
            'recommendations': []
        }
        
        with connection.cursor() as cursor:
            # Get index performance
            cursor.execute("SELECT * FROM analyze_spatial_performance()")
            index_stats = cursor.fetchall()
            
            for stat in index_stats:
                report_data['index_performance'].append({
                    'index_name': stat[0],
                    'table_name': stat[1],
                    'index_size': stat[2],
                    'index_scans': stat[3],
                    'tuples_read': stat[4],
                    'tuples_fetched': stat[5],
                    'efficiency_ratio': stat[6]
                })
            
            # Get partition health
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_partitions,
                    SUM(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
                    MIN(tablename) as oldest_partition,
                    MAX(tablename) as newest_partition
                FROM pg_tables 
                WHERE tablename LIKE 'tracking_gpsevent_%' 
                AND tablename ~ '^tracking_gpsevent_[0-9]{4}_[0-9]{2}$'
            """)
            
            partition_stats = cursor.fetchone()
            if partition_stats:
                report_data['partition_health'] = {
                    'total_partitions': partition_stats[0],
                    'total_size_bytes': partition_stats[1],
                    'oldest_partition': partition_stats[2],
                    'newest_partition': partition_stats[3]
                }
            
            # Performance recommendations
            cursor.execute("SELECT * FROM check_spatial_performance()")
            perf_checks = cursor.fetchall()
            
            for check in perf_checks:
                metric_name, metric_value, status, recommendation = check
                if status != 'OK':
                    report_data['recommendations'].append({
                        'metric': metric_name,
                        'value': metric_value,
                        'status': status,
                        'recommendation': recommendation
                    })
        
        # Get cache stats
        try:
            from .services.redis_cache import redis_map_cache
            cache_stats = redis_map_cache.get_cache_stats()
            report_data['cache_stats'] = {
                'hit_count': cache_stats.hit_count,
                'miss_count': cache_stats.miss_count,
                'hit_rate': cache_stats.hit_rate,
                'memory_usage': cache_stats.memory_usage,
                'key_count': cache_stats.key_count
            }
        except:
            report_data['cache_stats'] = {'error': 'Cache stats unavailable'}
        
        # Store report (in production, this might go to a monitoring system)
        logger.info(f"Performance report generated: {len(report_data['index_performance'])} indexes, "
                   f"{len(report_data['recommendations'])} recommendations")
        
        return report_data
        
    except Exception as e:
        logger.error(f"Error generating performance report: {e}")
        return {'error': str(e)}


@shared_task(bind=True, max_retries=2)
def emergency_cache_clear(self, patterns: List[str] = None):
    """
    Emergency cache clearing for performance issues.
    
    Args:
        patterns: List of cache key patterns to clear
    """
    try:
        if patterns is None:
            patterns = [
                'safeshipper:map_data:*',
                'fleet_map:*',
                'mvt_tile:*',
                'map_perf:*'
            ]
        
        from .services.redis_cache import redis_map_cache
        
        total_cleared = 0
        
        if redis_map_cache.enabled and redis_map_cache.cluster:
            for pattern in patterns:
                try:
                    keys = list(redis_map_cache.cluster.scan_iter(match=pattern, count=1000))
                    if keys:
                        redis_map_cache.cluster.delete(*keys)
                        total_cleared += len(keys)
                except Exception as e:
                    logger.warning(f"Error clearing pattern {pattern}: {e}")
        
        # Also clear Django cache
        try:
            cache.clear()
        except:
            pass
        
        logger.warning(f"Emergency cache clear completed. Cleared {total_cleared} Redis keys and Django cache.")
        
    except Exception as e:
        logger.error(f"Error in emergency cache clear: {e}")


# Periodic task schedules (would be configured in settings or celery beat)
CELERY_BEAT_SCHEDULE = {
    'refresh-materialized-views': {
        'task': 'tracking.tasks.refresh_materialized_views',
        'schedule': 300.0,  # Every 5 minutes
    },
    'maintain-spatial-indexes': {
        'task': 'tracking.tasks.maintain_spatial_indexes',
        'schedule': 3600.0,  # Every hour
    },
    'partition-maintenance': {
        'task': 'tracking.tasks.partition_maintenance',
        'schedule': 86400.0,  # Daily
    },
    'cleanup-old-cache': {
        'task': 'tracking.tasks.cleanup_old_cache_entries',
        'schedule': 3600.0,  # Every hour
    },
    'performance-report': {
        'task': 'tracking.tasks.generate_performance_report',
        'schedule': 21600.0,  # Every 6 hours
    },
}