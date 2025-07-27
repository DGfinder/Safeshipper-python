"""
Redis cluster caching architecture for map tiles and geospatial data.
Implements enterprise-grade caching with geographic sharding and intelligent invalidation.
"""

import json
import hashlib
import logging
import pickle
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from django.conf import settings
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder

try:
    import redis
    from rediscluster import RedisCluster
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    RedisCluster = None
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class CacheStats:
    """Cache performance statistics."""
    hit_count: int
    miss_count: int
    hit_rate: float
    memory_usage: int
    key_count: int
    evicted_keys: int


class GeographicHashStrategy:
    """
    Geographic hashing strategy for distributing cache keys across Redis cluster nodes.
    Ensures spatial locality for better cache performance.
    """
    
    @staticmethod
    def get_geo_hash(lat: float, lng: float, precision: int = 6) -> str:
        """Generate geohash for geographic location."""
        # Simple geohash implementation for cache distribution
        lat_range = [-90.0, 90.0]
        lng_range = [-180.0, 180.0]
        
        geohash = ""
        bits = 0
        bit = 0
        ch = 0
        
        while len(geohash) < precision:
            if bit % 2 == 0:  # longitude
                mid = (lng_range[0] + lng_range[1]) / 2
                if lng >= mid:
                    ch |= (1 << (4 - bits))
                    lng_range[0] = mid
                else:
                    lng_range[1] = mid
            else:  # latitude
                mid = (lat_range[0] + lat_range[1]) / 2
                if lat >= mid:
                    ch |= (1 << (4 - bits))
                    lat_range[0] = mid
                else:
                    lat_range[1] = mid
            
            bits += 1
            if bits == 5:
                geohash += "0123456789bcdefghjkmnpqrstuvwxyz"[ch]
                bits = 0
                ch = 0
        
        return geohash
    
    @staticmethod
    def get_cache_shard(geo_hash: str, total_shards: int = 16) -> int:
        """Determine cache shard based on geohash."""
        hash_int = int(hashlib.md5(geo_hash.encode()).hexdigest()[:8], 16)
        return hash_int % total_shards


class RedisMapCache:
    """
    Enterprise Redis caching system for map data with geographic clustering.
    """
    
    def __init__(self):
        self.enabled = REDIS_AVAILABLE and hasattr(settings, 'REDIS_CLUSTER_CONFIG')
        self.cluster = None
        self.fallback_cache = cache  # Django default cache as fallback
        
        if self.enabled:
            self._initialize_cluster()
        else:
            logger.warning("Redis cluster not available, using Django cache fallback")
    
    def _initialize_cluster(self):
        """Initialize Redis cluster connection."""
        try:
            cluster_config = getattr(settings, 'REDIS_CLUSTER_CONFIG', {})
            
            if cluster_config.get('use_cluster', False):
                startup_nodes = cluster_config.get('startup_nodes', [
                    {"host": "127.0.0.1", "port": "7000"},
                    {"host": "127.0.0.1", "port": "7001"},
                    {"host": "127.0.0.1", "port": "7002"},
                ])
                
                self.cluster = RedisCluster(
                    startup_nodes=startup_nodes,
                    decode_responses=True,
                    skip_full_coverage_check=True,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    max_connections_per_node=50
                )
            else:
                # Single Redis instance fallback
                redis_config = cluster_config.get('single_node', {
                    'host': 'localhost',
                    'port': 6379,
                    'db': 1
                })
                
                self.cluster = redis.Redis(
                    host=redis_config['host'],
                    port=redis_config['port'],
                    db=redis_config['db'],
                    decode_responses=True,
                    socket_timeout=5,
                    socket_connect_timeout=5
                )
            
            # Test connection
            self.cluster.ping()
            logger.info("Redis cluster initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis cluster: {e}")
            self.enabled = False
            self.cluster = None
    
    def _get_cache_key(self, key_type: str, identifier: str, **kwargs) -> str:
        """Generate standardized cache key."""
        parts = [f"safeshipper:{key_type}:{identifier}"]
        
        for k, v in sorted(kwargs.items()):
            if v is not None:
                parts.append(f"{k}:{v}")
        
        return ":".join(parts)
    
    def _serialize_data(self, data: Any) -> str:
        """Serialize data for Redis storage."""
        try:
            return json.dumps(data, cls=DjangoJSONEncoder, separators=(',', ':'))
        except (TypeError, ValueError):
            # Fallback to pickle for complex objects
            return pickle.dumps(data).hex()
    
    def _deserialize_data(self, data: str) -> Any:
        """Deserialize data from Redis storage."""
        try:
            return json.loads(data)
        except (json.JSONDecodeError, ValueError):
            # Try pickle fallback
            try:
                return pickle.loads(bytes.fromhex(data))
            except Exception as e:
                logger.error(f"Failed to deserialize cache data: {e}")
                return None
    
    def set_map_data(
        self, 
        bounds: Dict[str, float], 
        zoom: int, 
        data: Any, 
        company_id: Optional[int] = None,
        ttl: int = 300
    ) -> bool:
        """
        Cache map data with geographic distribution.
        
        Args:
            bounds: Geographic bounds dictionary
            zoom: Map zoom level
            data: Data to cache
            company_id: Optional company filter
            ttl: Time to live in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Calculate center point for geo-hashing
            center_lat = (bounds['min_lat'] + bounds['max_lat']) / 2
            center_lng = (bounds['min_lng'] + bounds['max_lng']) / 2
            
            geo_hash = GeographicHashStrategy.get_geo_hash(center_lat, center_lng)
            
            cache_key = self._get_cache_key(
                "map_data",
                geo_hash,
                zoom=zoom,
                company=company_id,
                bounds=f"{bounds['min_lat']:.4f},{bounds['min_lng']:.4f},{bounds['max_lat']:.4f},{bounds['max_lng']:.4f}"
            )
            
            serialized_data = self._serialize_data(data)
            
            if self.enabled and self.cluster:
                self.cluster.setex(cache_key, ttl, serialized_data)
                # Also store metadata for cache management
                metadata_key = f"{cache_key}:meta"
                metadata = {
                    "created_at": datetime.now().isoformat(),
                    "zoom": zoom,
                    "company_id": company_id,
                    "geo_hash": geo_hash,
                    "ttl": ttl
                }
                self.cluster.setex(metadata_key, ttl + 60, json.dumps(metadata))
            else:
                self.fallback_cache.set(cache_key, data, ttl)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache map data: {e}")
            return False
    
    def get_map_data(
        self, 
        bounds: Dict[str, float], 
        zoom: int, 
        company_id: Optional[int] = None
    ) -> Optional[Any]:
        """
        Retrieve cached map data.
        
        Args:
            bounds: Geographic bounds dictionary
            zoom: Map zoom level
            company_id: Optional company filter
            
        Returns:
            Cached data or None if not found
        """
        try:
            center_lat = (bounds['min_lat'] + bounds['max_lat']) / 2
            center_lng = (bounds['min_lng'] + bounds['max_lng']) / 2
            
            geo_hash = GeographicHashStrategy.get_geo_hash(center_lat, center_lng)
            
            cache_key = self._get_cache_key(
                "map_data",
                geo_hash,
                zoom=zoom,
                company=company_id,
                bounds=f"{bounds['min_lat']:.4f},{bounds['min_lng']:.4f},{bounds['max_lat']:.4f},{bounds['max_lng']:.4f}"
            )
            
            if self.enabled and self.cluster:
                cached_data = self.cluster.get(cache_key)
                if cached_data:
                    return self._deserialize_data(cached_data)
            else:
                return self.fallback_cache.get(cache_key)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached map data: {e}")
            return None
    
    def invalidate_region(
        self, 
        center_lat: float, 
        center_lng: float, 
        radius_km: float = 10,
        company_id: Optional[int] = None
    ):
        """
        Invalidate cached data within a geographic region.
        
        Args:
            center_lat: Center latitude
            center_lng: Center longitude
            radius_km: Radius in kilometers
            company_id: Optional company filter
        """
        try:
            # Generate geohashes for the region
            geo_hashes = self._get_region_geohashes(center_lat, center_lng, radius_km)
            
            if self.enabled and self.cluster:
                # Find and delete all keys matching the region
                for geo_hash in geo_hashes:
                    pattern = f"safeshipper:map_data:{geo_hash}*"
                    if company_id:
                        pattern += f"*company:{company_id}*"
                    
                    # Use SCAN to find matching keys
                    for key in self.cluster.scan_iter(match=pattern):
                        self.cluster.delete(key)
                        # Also delete metadata
                        self.cluster.delete(f"{key}:meta")
            
            logger.info(f"Invalidated cache region: {center_lat}, {center_lng} ({radius_km}km)")
            
        except Exception as e:
            logger.error(f"Failed to invalidate cache region: {e}")
    
    def _get_region_geohashes(
        self, 
        center_lat: float, 
        center_lng: float, 
        radius_km: float
    ) -> List[str]:
        """Generate geohashes covering a geographic region."""
        # Calculate bounding box for the region
        # Approximate: 1 degree latitude ≈ 111 km
        lat_delta = radius_km / 111.0
        lng_delta = radius_km / (111.0 * abs(center_lat / 90.0) + 0.1)  # Adjust for latitude
        
        min_lat = center_lat - lat_delta
        max_lat = center_lat + lat_delta
        min_lng = center_lng - lng_delta
        max_lng = center_lng + lng_delta
        
        # Generate geohashes for grid covering the region
        geohashes = set()
        lat_steps = max(1, int(lat_delta * 2 * 10))  # 10 steps per degree
        lng_steps = max(1, int(lng_delta * 2 * 10))
        
        for lat_step in range(lat_steps + 1):
            lat = min_lat + (lat_step / lat_steps) * (max_lat - min_lat)
            for lng_step in range(lng_steps + 1):
                lng = min_lng + (lng_step / lng_steps) * (max_lng - min_lng)
                geohash = GeographicHashStrategy.get_geo_hash(lat, lng, precision=4)
                geohashes.add(geohash[:4])  # Use 4-character prefix for broader coverage
        
        return list(geohashes)
    
    def get_cache_stats(self) -> CacheStats:
        """Get comprehensive cache statistics."""
        try:
            if self.enabled and self.cluster:
                info = self.cluster.info()
                
                # Calculate hit rate
                hits = info.get('keyspace_hits', 0)
                misses = info.get('keyspace_misses', 0)
                hit_rate = hits / (hits + misses) if (hits + misses) > 0 else 0
                
                return CacheStats(
                    hit_count=hits,
                    miss_count=misses,
                    hit_rate=hit_rate,
                    memory_usage=info.get('used_memory', 0),
                    key_count=info.get('keys', 0),
                    evicted_keys=info.get('evicted_keys', 0)
                )
            else:
                # Fallback stats
                return CacheStats(
                    hit_count=0,
                    miss_count=0,
                    hit_rate=0.0,
                    memory_usage=0,
                    key_count=0,
                    evicted_keys=0
                )
                
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return CacheStats(0, 0, 0.0, 0, 0, 0)
    
    def warm_cache_for_routes(self, route_coordinates: List[Tuple[float, float]]):
        """
        Pre-warm cache for popular delivery routes.
        
        Args:
            route_coordinates: List of (lat, lng) coordinates along the route
        """
        try:
            for lat, lng in route_coordinates:
                # Pre-generate geohashes for different zoom levels
                for zoom in range(10, 16):  # Common zoom range
                    geo_hash = GeographicHashStrategy.get_geo_hash(lat, lng)
                    
                    # Create small bounds around the point
                    delta = 0.01 * (2 ** (15 - zoom))  # Adaptive delta based on zoom
                    bounds = {
                        'min_lat': lat - delta,
                        'max_lat': lat + delta,
                        'min_lng': lng - delta,
                        'max_lng': lng + delta
                    }
                    
                    # This would trigger data generation and caching
                    cache_key = f"route_warm:{geo_hash}:z{zoom}"
                    if self.enabled and self.cluster:
                        if not self.cluster.exists(cache_key):
                            # Mark as warmed to trigger background processing
                            self.cluster.setex(cache_key, 3600, "warming")
            
            logger.info(f"Cache warming initiated for {len(route_coordinates)} route points")
            
        except Exception as e:
            logger.error(f"Failed to warm cache for routes: {e}")


class TileCache:
    """
    Specialized caching for map tiles with CDN integration.
    """
    
    def __init__(self, redis_cache: RedisMapCache):
        self.redis_cache = redis_cache
    
    def get_tile_url(self, z: int, x: int, y: int, tile_type: str = "osm") -> str:
        """
        Get cached tile URL or generate cache key.
        
        Args:
            z: Zoom level
            x: Tile X coordinate
            y: Tile Y coordinate
            tile_type: Type of tile (osm, vector, etc.)
            
        Returns:
            Tile URL or cache key
        """
        cache_key = f"tile:{tile_type}:{z}:{x}:{y}"
        
        # Check if tile is cached
        if self.redis_cache.enabled and self.redis_cache.cluster:
            cached_url = self.redis_cache.cluster.get(cache_key)
            if cached_url:
                return cached_url
        
        # Generate tile URL (would be replaced with actual tile generation)
        if tile_type == "osm":
            tile_url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        else:
            tile_url = f"/api/tiles/{tile_type}/{z}/{x}/{y}"
        
        # Cache the URL
        if self.redis_cache.enabled and self.redis_cache.cluster:
            self.redis_cache.cluster.setex(cache_key, 86400, tile_url)  # 24 hour cache
        
        return tile_url


# Global cache instances
redis_map_cache = RedisMapCache()
tile_cache = TileCache(redis_map_cache)