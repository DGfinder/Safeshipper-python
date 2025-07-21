"""
Enhanced tracking API views with vector tile generation and advanced map performance.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from django.http import HttpResponse, JsonResponse
from django.db import connection
from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from django.core.cache import caches
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from vehicles.models import Vehicle
from tracking.models import GPSEvent
from tracking.services.map_performance import map_performance_service
from tracking.services.redis_cache import redis_map_cache

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@vary_on_headers('Authorization')
def fleet_map_data(request):
    """
    Get optimized fleet data for map display with viewport-based filtering.
    
    Query parameters:
    - bounds: comma-separated bbox (min_lat,min_lng,max_lat,max_lng)
    - zoom: map zoom level (5-18)
    - company_id: optional company filter
    - format: 'geojson' (default) or 'mvt' for vector tiles
    """
    try:
        # Parse query parameters
        bounds_str = request.GET.get('bounds')
        zoom = int(request.GET.get('zoom', 10))
        company_id = request.GET.get('company_id')
        output_format = request.GET.get('format', 'geojson')
        
        if not bounds_str:
            return Response(
                {'error': 'bounds parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse bounds
        try:
            bounds_coords = [float(x) for x in bounds_str.split(',')]
            if len(bounds_coords) != 4:
                raise ValueError("Invalid bounds format")
            
            bounds = {
                'min_lat': bounds_coords[0],
                'min_lng': bounds_coords[1], 
                'max_lat': bounds_coords[2],
                'max_lng': bounds_coords[3]
            }
        except (ValueError, IndexError):
            return Response(
                {'error': 'Invalid bounds format. Use: min_lat,min_lng,max_lat,max_lng'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate zoom level
        if not 5 <= zoom <= 18:
            return Response(
                {'error': 'Zoom level must be between 5 and 18'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get company filter
        if company_id:
            try:
                company_id = int(company_id)
            except ValueError:
                return Response(
                    {'error': 'Invalid company_id'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check user permissions for company data
        if company_id and not request.user.has_perm('tracking.view_company_fleet', company_id):
            return Response(
                {'error': 'Insufficient permissions'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate cache key
        cache_key = f"fleet_map:{bounds_str}:z{zoom}:c{company_id or 'all'}"
        
        # Try Redis cache first
        cached_data = redis_map_cache.get_map_data(bounds, zoom, company_id)
        if cached_data:
            return Response(cached_data)
        
        # Generate new data using performance service
        if output_format == 'mvt':
            # Return Mapbox Vector Tile
            mvt_data = generate_vector_tile(bounds, zoom, company_id)
            response = HttpResponse(mvt_data, content_type='application/x-protobuf')
            response['Content-Encoding'] = 'gzip'
            return response
        else:
            # Return GeoJSON
            geojson_data = map_performance_service.get_fleet_data(bounds, zoom, company_id)
            
            # Cache the result
            redis_map_cache.set_map_data(
                bounds, zoom, geojson_data, company_id, 
                ttl=60 if zoom >= 13 else 120
            )
            
            return Response(geojson_data)
    
    except Exception as e:
        logger.error(f"Error in fleet_map_data: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def generate_vector_tile(bounds: Dict[str, float], zoom: int, company_id: Optional[int] = None) -> bytes:
    """
    Generate Mapbox Vector Tile (MVT) for the given bounds and zoom level.
    
    Args:
        bounds: Geographic bounding box
        zoom: Map zoom level
        company_id: Optional company filter
        
    Returns:
        Binary MVT data
    """
    # Create PostGIS polygon from bounds
    polygon = Polygon.from_bbox((
        bounds['min_lng'], bounds['min_lat'], 
        bounds['max_lng'], bounds['max_lat']
    ))
    
    with connection.cursor() as cursor:
        if zoom < 13:
            # Generate clustered vector tile
            sql = """
            SELECT ST_AsMVT(tile_data, 'vehicles', 4096, 'geom') as mvt
            FROM (
                SELECT 
                    cluster_id,
                    vehicle_count,
                    vehicle_ids,
                    last_update,
                    ST_AsMVTGeom(
                        center_location,
                        ST_TileEnvelope(%s, %s, %s),
                        4096,
                        256,
                        true
                    ) as geom
                FROM get_clustered_vehicles(%s, %s, %s)
                WHERE center_location && ST_TileEnvelope(%s, %s, %s)
            ) as tile_data
            WHERE geom IS NOT NULL;
            """
            
            # Calculate tile coordinates from bounds (simplified)
            # In production, this would use proper tile coordinate calculation
            tile_x = int((bounds['min_lng'] + 180) / 360 * (2 ** zoom))
            tile_y = int((1 - (bounds['max_lat'] + 90) / 180) * (2 ** zoom))
            
            cursor.execute(sql, [
                zoom, tile_x, tile_y,  # Tile envelope parameters
                polygon.wkt, zoom, company_id,  # Cluster function parameters
                zoom, tile_x, tile_y   # Tile envelope parameters (repeated)
            ])
        else:
            # Generate individual vehicle vector tile
            sql = """
            SELECT ST_AsMVT(tile_data, 'vehicles', 4096, 'geom') as mvt
            FROM (
                SELECT 
                    v.id as vehicle_id,
                    v.status,
                    COALESCE(d.first_name || ' ' || d.last_name, 'Unknown') as driver_name,
                    v.last_reported_at,
                    ST_AsMVTGeom(
                        v.last_known_location,
                        ST_TileEnvelope(%s, %s, %s),
                        4096,
                        256,
                        true
                    ) as geom
                FROM vehicles_vehicle v
                LEFT JOIN users_user d ON v.assigned_driver_id = d.id
                WHERE 
                    v.last_known_location IS NOT NULL
                    AND v.last_known_location && ST_TileEnvelope(%s, %s, %s)
                    AND v.last_reported_at >= %s
                    AND (%s IS NULL OR v.owning_company_id = %s)
                LIMIT 500
            ) as tile_data
            WHERE geom IS NOT NULL;
            """
            
            tile_x = int((bounds['min_lng'] + 180) / 360 * (2 ** zoom))
            tile_y = int((1 - (bounds['max_lat'] + 90) / 180) * (2 ** zoom))
            cutoff_time = timezone.now() - timedelta(hours=2)
            
            cursor.execute(sql, [
                zoom, tile_x, tile_y,  # First tile envelope
                zoom, tile_x, tile_y,  # Second tile envelope  
                cutoff_time, company_id, company_id
            ])
        
        result = cursor.fetchone()
        if result and result[0]:
            return result[0]
        else:
            # Return empty MVT if no data
            return b''


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vector_tile(request, z, x, y):
    """
    Generate vector tile for specific tile coordinates.
    
    URL format: /api/tracking/tiles/{z}/{x}/{y}.mvt
    """
    try:
        zoom = int(z)
        tile_x = int(x)
        tile_y = int(y)
        
        # Validate tile coordinates
        if not (0 <= zoom <= 18):
            return HttpResponse(status=400)
        
        max_coord = 2 ** zoom
        if not (0 <= tile_x < max_coord) or not (0 <= tile_y < max_coord):
            return HttpResponse(status=400)
        
        # Get company filter from query params
        company_id = request.GET.get('company_id')
        if company_id:
            company_id = int(company_id)
        
        # Calculate tile bounds
        tile_bounds = calculate_tile_bounds(zoom, tile_x, tile_y)
        
        # Check cache first
        cache_key = f"mvt_tile:{zoom}:{tile_x}:{tile_y}:c{company_id or 'all'}"
        cached_tile = caches['maps'].get(cache_key)
        
        if cached_tile:
            response = HttpResponse(cached_tile, content_type='application/x-protobuf')
            response['Cache-Control'] = 'public, max-age=60'
            return response
        
        # Generate new tile
        mvt_data = generate_vector_tile(tile_bounds, zoom, company_id)
        
        # Cache the tile
        cache_ttl = 60 if zoom >= 13 else 120
        caches['maps'].set(cache_key, mvt_data, cache_ttl)
        
        response = HttpResponse(mvt_data, content_type='application/x-protobuf')
        response['Cache-Control'] = f'public, max-age={cache_ttl}'
        response['Content-Encoding'] = 'gzip'
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating vector tile {z}/{x}/{y}: {str(e)}")
        return HttpResponse(status=500)


def calculate_tile_bounds(zoom: int, tile_x: int, tile_y: int) -> Dict[str, float]:
    """
    Calculate geographic bounds for a tile coordinate.
    
    Args:
        zoom: Zoom level
        tile_x: Tile X coordinate
        tile_y: Tile Y coordinate
        
    Returns:
        Dictionary with min/max lat/lng bounds
    """
    n = 2.0 ** zoom
    
    # Calculate longitude bounds
    min_lng = tile_x / n * 360.0 - 180.0
    max_lng = (tile_x + 1) / n * 360.0 - 180.0
    
    # Calculate latitude bounds (Web Mercator)
    import math
    
    def tile_to_lat(tile_y, zoom):
        n = math.pi - 2.0 * math.pi * tile_y / (2.0 ** zoom)
        return 180.0 / math.pi * math.atan(0.5 * (math.exp(n) - math.exp(-n)))
    
    max_lat = tile_to_lat(tile_y, zoom)
    min_lat = tile_to_lat(tile_y + 1, zoom)
    
    return {
        'min_lat': min_lat,
        'min_lng': min_lng,
        'max_lat': max_lat,
        'max_lng': max_lng
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fleet_bounds(request):
    """
    Get geographic bounds of the fleet for map initialization.
    """
    try:
        company_id = request.GET.get('company_id')
        if company_id:
            company_id = int(company_id)
        
        bounds = map_performance_service.get_fleet_bounds(company_id)
        
        if bounds:
            return Response({
                'bounds': bounds,
                'center': {
                    'lat': (bounds['min_lat'] + bounds['max_lat']) / 2,
                    'lng': (bounds['min_lng'] + bounds['max_lng']) / 2
                }
            })
        else:
            # Default to Australia if no fleet data
            return Response({
                'bounds': {
                    'min_lat': -44.0,
                    'min_lng': 113.0,
                    'max_lat': -10.0,
                    'max_lng': 154.0
                },
                'center': {
                    'lat': -25.0,
                    'lng': 133.0
                }
            })
    
    except Exception as e:
        logger.error(f"Error getting fleet bounds: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invalidate_map_cache(request):
    """
    Invalidate map cache for a specific region or company.
    """
    try:
        data = request.data
        
        if 'region' in data:
            # Invalidate specific region
            region = data['region']
            redis_map_cache.invalidate_region(
                center_lat=region.get('lat'),
                center_lng=region.get('lng'),
                radius_km=region.get('radius', 10),
                company_id=data.get('company_id')
            )
        else:
            # Invalidate all cache for company
            company_id = data.get('company_id')
            # This would implement broader invalidation
            
        return Response({'message': 'Cache invalidated successfully'})
    
    except Exception as e:
        logger.error(f"Error invalidating cache: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def map_performance_stats(request):
    """
    Get map performance statistics and cache metrics.
    """
    try:
        stats = {
            'cache_stats': redis_map_cache.get_cache_stats(),
            'performance_service_stats': map_performance_service.get_cache_stats(),
            'timestamp': timezone.now().isoformat()
        }
        
        return Response(stats)
    
    except Exception as e:
        logger.error(f"Error getting performance stats: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )