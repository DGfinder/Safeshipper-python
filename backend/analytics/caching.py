"""
Multi-level caching strategy for analytics data.
Implements memory, Redis, and materialized view caching with intelligent invalidation.
"""

import json
import hashlib
import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
import redis
from cachetools import TTLCache

logger = logging.getLogger(__name__)


@dataclass
class CacheResult:
    """Data class for cache lookup results"""
    data: Any
    cache_level: str
    hit_time: datetime
    computation_time_ms: Optional[int] = None
    expires_at: Optional[datetime] = None


@dataclass
class CacheKey:
    """Structured cache key for analytics results"""
    analytics_type: str
    user_id: Optional[int]
    company_id: Optional[int]
    filters_hash: str
    time_range: str
    granularity: str
    
    def to_string(self) -> str:
        """Convert cache key to string representation"""
        parts = [
            f"analytics:{self.analytics_type}",
            f"user:{self.user_id or 'all'}",
            f"company:{self.company_id or 'all'}",
            f"filters:{self.filters_hash}",
            f"range:{self.time_range}",
            f"granularity:{self.granularity}"
        ]
        return ":".join(parts)


class AnalyticsCacheManager:
    """
    Multi-level caching strategy for analytics data.
    
    Cache Levels:
    1. Memory Cache (L1) - 60 second TTL, fastest access
    2. Redis Cache (L2) - 5 minute TTL, fast distributed cache
    3. Materialized Views (L3) - Hourly refresh, complex query optimization
    4. Database (L4) - Real-time data, slowest but most current
    """
    
    def __init__(self):
        # Level 1: Memory cache (fastest, smallest)
        self.memory_cache = TTLCache(maxsize=1000, ttl=60)
        
        # Level 2: Redis cache (fast, distributed)
        try:
            self.redis_client = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'localhost'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                db=getattr(settings, 'REDIS_ANALYTICS_DB', 1),
                decode_responses=True
            )
            self.redis_available = True
        except Exception as e:
            logger.warning(f"Redis not available for analytics caching: {e}")
            self.redis_available = False
        
        # Cache configuration
        self.default_ttl = {
            'memory': 60,      # 1 minute
            'redis': 300,      # 5 minutes
            'materialized': 3600,  # 1 hour
        }
        
        # Performance tracking
        self.cache_stats = {
            'memory_hits': 0,
            'redis_hits': 0,
            'materialized_hits': 0,
            'database_hits': 0,
            'total_requests': 0
        }
    
    def generate_cache_key(
        self, 
        analytics_type: str,
        user_id: Optional[int],
        company_id: Optional[int],
        filters: Dict[str, Any],
        time_range: str,
        granularity: str
    ) -> CacheKey:
        """Generate structured cache key from parameters"""
        # Create a hash of filters for consistent key generation
        filters_str = json.dumps(filters, sort_keys=True)
        filters_hash = hashlib.md5(filters_str.encode()).hexdigest()[:8]
        
        return CacheKey(
            analytics_type=analytics_type,
            user_id=user_id,
            company_id=company_id,
            filters_hash=filters_hash,
            time_range=time_range,
            granularity=granularity
        )
    
    async def get_cached_analytics(
        self,
        cache_key: CacheKey,
        analytics_definition=None
    ) -> Optional[CacheResult]:
        """
        Multi-level cache lookup with performance tracking.
        Returns cached result from the fastest available cache level.
        """
        self.cache_stats['total_requests'] += 1
        cache_key_str = cache_key.to_string()
        
        # Level 1: Memory cache (fastest)
        if cache_key_str in self.memory_cache:
            self.cache_stats['memory_hits'] += 1
            logger.debug(f"Memory cache hit for {cache_key_str}")
            return CacheResult(
                data=self.memory_cache[cache_key_str],
                cache_level='memory',
                hit_time=timezone.now()
            )
        
        # Level 2: Redis cache (fast)
        if self.redis_available:
            try:
                redis_data = self.redis_client.get(cache_key_str)
                if redis_data:
                    self.cache_stats['redis_hits'] += 1
                    logger.debug(f"Redis cache hit for {cache_key_str}")
                    
                    result_data = json.loads(redis_data)
                    
                    # Promote to memory cache
                    self.memory_cache[cache_key_str] = result_data
                    
                    return CacheResult(
                        data=result_data,
                        cache_level='redis',
                        hit_time=timezone.now()
                    )
            except Exception as e:
                logger.warning(f"Redis cache lookup failed: {e}")
        
        # Level 3: Materialized view cache
        if analytics_definition and analytics_definition.materialized_view:
            materialized_data = await self.get_materialized_data(
                analytics_definition,
                cache_key
            )
            if materialized_data:
                self.cache_stats['materialized_hits'] += 1
                logger.debug(f"Materialized view hit for {cache_key_str}")
                
                # Promote to higher cache levels
                await self.cache_result(cache_key, materialized_data, 'materialized')
                
                return CacheResult(
                    data=materialized_data,
                    cache_level='materialized',
                    hit_time=timezone.now()
                )
        
        # No cache hit
        return None
    
    async def cache_result(
        self,
        cache_key: CacheKey,
        data: Any,
        cache_level: str = 'all',
        custom_ttl: Optional[int] = None
    ) -> bool:
        """
        Store result in specified cache levels.
        """
        cache_key_str = cache_key.to_string()
        
        try:
            # Serialize data
            serialized_data = data
            if not isinstance(data, (str, int, float, bool, type(None))):
                serialized_data = json.dumps(data, default=str)
            
            success = True
            
            # Store in memory cache
            if cache_level in ['all', 'memory']:
                ttl = custom_ttl or self.default_ttl['memory']
                self.memory_cache[cache_key_str] = data
                logger.debug(f"Cached result in memory: {cache_key_str}")
            
            # Store in Redis cache
            if cache_level in ['all', 'redis'] and self.redis_available:
                try:
                    ttl = custom_ttl or self.default_ttl['redis']
                    self.redis_client.setex(
                        cache_key_str,
                        ttl,
                        serialized_data if isinstance(serialized_data, str) else json.dumps(serialized_data, default=str)
                    )
                    logger.debug(f"Cached result in Redis: {cache_key_str}")
                except Exception as e:
                    logger.warning(f"Failed to cache in Redis: {e}")
                    success = False
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to cache result for {cache_key_str}: {e}")
            return False
    
    async def get_materialized_data(
        self,
        analytics_definition,
        cache_key: CacheKey
    ) -> Optional[Any]:
        """
        Retrieve data from materialized views if available and fresh.
        """
        if not analytics_definition.materialized_view:
            return None
        
        try:
            from django.db import connection
            
            # Check if materialized view exists and is fresh
            with connection.cursor() as cursor:
                # Check last refresh time
                cursor.execute("""
                    SELECT last_refresh_time 
                    FROM materialized_view_refresh_log 
                    WHERE view_name = %s 
                    ORDER BY last_refresh_time DESC 
                    LIMIT 1
                """, [analytics_definition.materialized_view])
                
                result = cursor.fetchone()
                if not result:
                    return None
                
                last_refresh = result[0]
                if timezone.now() - last_refresh > timedelta(hours=1):
                    # Materialized view is stale
                    return None
                
                # Build query for materialized view
                query = self.build_materialized_query(
                    analytics_definition.materialized_view,
                    cache_key
                )
                
                cursor.execute(query['sql'], query['params'])
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                
                # Convert to list of dictionaries
                result_data = [dict(zip(columns, row)) for row in rows]
                
                return result_data
                
        except Exception as e:
            logger.warning(f"Failed to get materialized data: {e}")
            return None
    
    def build_materialized_query(
        self,
        view_name: str,
        cache_key: CacheKey
    ) -> Dict[str, Any]:
        """
        Build optimized query for materialized view based on cache key parameters.
        """
        base_query = f"SELECT * FROM {view_name}"
        where_conditions = []
        params = []
        
        # Add time range filtering
        if cache_key.time_range != 'all':
            time_filter = self.parse_time_range(cache_key.time_range)
            where_conditions.append("date_bucket >= %s")
            params.append(time_filter)
        
        # Add company filtering
        if cache_key.company_id:
            where_conditions.append("company_id = %s")
            params.append(cache_key.company_id)
        
        # Build final query
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        # Add ordering and limits
        base_query += " ORDER BY date_bucket DESC LIMIT 10000"
        
        return {
            'sql': base_query,
            'params': params
        }
    
    def parse_time_range(self, time_range: str) -> datetime:
        """Parse time range string to datetime"""
        now = timezone.now()
        
        if time_range == '1h':
            return now - timedelta(hours=1)
        elif time_range == '6h':
            return now - timedelta(hours=6)
        elif time_range == '12h':
            return now - timedelta(hours=12)
        elif time_range == '1d':
            return now - timedelta(days=1)
        elif time_range == '3d':
            return now - timedelta(days=3)
        elif time_range == '7d':
            return now - timedelta(days=7)
        elif time_range == '30d':
            return now - timedelta(days=30)
        elif time_range == '90d':
            return now - timedelta(days=90)
        elif time_range == '1y':
            return now - timedelta(days=365)
        else:
            return now - timedelta(days=30)  # Default to 30 days
    
    async def invalidate_cache(
        self,
        pattern: Optional[str] = None,
        analytics_type: Optional[str] = None,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> int:
        """
        Invalidate cache entries based on patterns or specific criteria.
        Returns number of invalidated entries.
        """
        invalidated_count = 0
        
        try:
            # Build invalidation pattern
            if pattern:
                cache_pattern = pattern
            else:
                pattern_parts = ["analytics"]
                if analytics_type:
                    pattern_parts.append(analytics_type)
                else:
                    pattern_parts.append("*")
                
                if user_id:
                    pattern_parts.append(f"user:{user_id}")
                elif company_id:
                    pattern_parts.append(f"*:company:{company_id}")
                else:
                    pattern_parts.append("*")
                
                cache_pattern = ":".join(pattern_parts) + "*"
            
            # Invalidate memory cache
            keys_to_remove = []
            for key in self.memory_cache.keys():
                if self.matches_pattern(key, cache_pattern):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.memory_cache[key]
                invalidated_count += 1
            
            # Invalidate Redis cache
            if self.redis_available:
                try:
                    redis_keys = self.redis_client.keys(cache_pattern)
                    if redis_keys:
                        deleted = self.redis_client.delete(*redis_keys)
                        invalidated_count += deleted
                except Exception as e:
                    logger.warning(f"Failed to invalidate Redis cache: {e}")
            
            logger.info(f"Invalidated {invalidated_count} cache entries with pattern: {cache_pattern}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return 0
    
    def matches_pattern(self, key: str, pattern: str) -> bool:
        """Check if key matches invalidation pattern"""
        import fnmatch
        return fnmatch.fnmatch(key, pattern)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total_requests = self.cache_stats['total_requests']
        if total_requests == 0:
            return self.cache_stats
        
        stats = self.cache_stats.copy()
        stats['memory_hit_rate'] = (stats['memory_hits'] / total_requests) * 100
        stats['redis_hit_rate'] = (stats['redis_hits'] / total_requests) * 100
        stats['materialized_hit_rate'] = (stats['materialized_hits'] / total_requests) * 100
        stats['database_hit_rate'] = (stats['database_hits'] / total_requests) * 100
        stats['overall_hit_rate'] = ((total_requests - stats['database_hits']) / total_requests) * 100
        
        return stats
    
    def clear_all_cache(self) -> bool:
        """Clear all cache levels - use with caution"""
        try:
            # Clear memory cache
            self.memory_cache.clear()
            
            # Clear Redis cache
            if self.redis_available:
                self.redis_client.flushdb()
            
            # Reset stats
            self.cache_stats = {key: 0 for key in self.cache_stats.keys()}
            
            logger.info("All analytics cache cleared")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear all cache: {e}")
            return False


# Global cache manager instance
analytics_cache_manager = AnalyticsCacheManager()