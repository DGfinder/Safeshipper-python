# SafeShipper Redis Caching Configuration
"""
Advanced Redis caching strategy for SafeShipper application.
This module provides intelligent caching for dangerous goods data, 
shipment information, and compliance lookups.
"""

import logging
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import hashlib
import json

logger = logging.getLogger(__name__)


class SafeShipperCacheManager:
    """Advanced cache manager for SafeShipper operations"""
    
    # Cache timeout configurations (in seconds)
    CACHE_TIMEOUTS = {
        'dangerous_goods': 3600 * 24 * 7,  # 7 days - DG data is stable
        'compliance_rules': 3600 * 24 * 3,  # 3 days - Compliance rules change infrequently
        'company_settings': 3600 * 6,       # 6 hours - Company settings may change
        'user_permissions': 3600 * 2,       # 2 hours - Permission changes need quick propagation
        'search_results': 3600,             # 1 hour - Search results can be cached briefly
        'manifest_data': 3600 * 12,         # 12 hours - Manifest data is semi-static
        'vehicle_data': 3600 * 24,          # 24 hours - Vehicle data changes daily
        'location_data': 3600 * 24 * 2,     # 2 days - Location data is relatively stable
        'audit_summaries': 3600 * 4,        # 4 hours - Audit data needs to be relatively fresh
        'dashboard_stats': 3600,            # 1 hour - Dashboard stats need regular updates
    }
    
    # Cache key prefixes for organization
    KEY_PREFIXES = {
        'dangerous_goods': 'dg',
        'compliance': 'comp',
        'company': 'co',
        'user': 'usr',
        'search': 'srch',
        'manifest': 'mani',
        'vehicle': 'veh', 
        'location': 'loc',
        'audit': 'aud',
        'dashboard': 'dash',
    }

    @classmethod
    def generate_cache_key(cls, category: str, identifier: str, **kwargs) -> str:
        """Generate consistent cache keys with optional parameters"""
        prefix = cls.KEY_PREFIXES.get(category, 'misc')
        
        # Include additional parameters in cache key for specificity
        params = []
        for key, value in sorted(kwargs.items()):
            params.append(f"{key}:{value}")
        
        param_string = "_".join(params) if params else ""
        
        if param_string:
            cache_key = f"safeshipper:{prefix}:{identifier}:{param_string}"
        else:
            cache_key = f"safeshipper:{prefix}:{identifier}"
        
        # Hash long keys to ensure Redis compatibility
        if len(cache_key) > 250:
            key_hash = hashlib.md5(cache_key.encode()).hexdigest()
            cache_key = f"safeshipper:hash:{key_hash}"
        
        return cache_key

    @classmethod
    def cache_dangerous_goods_lookup(cls, un_number: str, dangerous_good_data: dict) -> bool:
        """Cache dangerous goods lookup data"""
        try:
            cache_key = cls.generate_cache_key('dangerous_goods', f"un_{un_number}")
            timeout = cls.CACHE_TIMEOUTS['dangerous_goods']
            
            cache_data = {
                'data': dangerous_good_data,
                'cached_at': timezone.now().isoformat(),
                'cache_version': '1.0'
            }
            
            cache.set(cache_key, cache_data, timeout)
            logger.info(f"Cached dangerous goods data for UN {un_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache dangerous goods data for UN {un_number}: {str(e)}")
            return False

    @classmethod
    def get_cached_dangerous_goods(cls, un_number: str) -> dict:
        """Retrieve cached dangerous goods data"""
        try:
            cache_key = cls.generate_cache_key('dangerous_goods', f"un_{un_number}")
            cached_data = cache.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for dangerous goods UN {un_number}")
                return cached_data.get('data', {})
            
            logger.info(f"Cache miss for dangerous goods UN {un_number}")
            return {}
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached dangerous goods data for UN {un_number}: {str(e)}")
            return {}

    @classmethod
    def cache_compliance_check(cls, hazard_classes: list, result: dict) -> bool:
        """Cache compatibility check results"""
        try:
            # Create deterministic key from sorted hazard classes
            sorted_classes = sorted(hazard_classes)
            key_suffix = "_".join(sorted_classes)
            cache_key = cls.generate_cache_key('compliance', f"compat_{key_suffix}")
            timeout = cls.CACHE_TIMEOUTS['compliance_rules']
            
            cache_data = {
                'result': result,
                'hazard_classes': sorted_classes,
                'cached_at': timezone.now().isoformat(),
                'cache_version': '1.0'
            }
            
            cache.set(cache_key, cache_data, timeout)
            logger.info(f"Cached compliance check for hazard classes: {sorted_classes}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache compliance check: {str(e)}")
            return False

    @classmethod
    def get_cached_compliance_check(cls, hazard_classes: list) -> dict:
        """Retrieve cached compliance check result"""
        try:
            sorted_classes = sorted(hazard_classes)
            key_suffix = "_".join(sorted_classes)
            cache_key = cls.generate_cache_key('compliance', f"compat_{key_suffix}")
            cached_data = cache.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for compliance check: {sorted_classes}")
                return cached_data.get('result', {})
            
            logger.info(f"Cache miss for compliance check: {sorted_classes}")
            return {}
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached compliance check: {str(e)}")
            return {}

    @classmethod
    def cache_user_permissions(cls, user_id: int, company_id: int, permissions: dict) -> bool:
        """Cache user permissions for faster access control"""
        try:
            cache_key = cls.generate_cache_key('user', f"perms_{user_id}", company=company_id)
            timeout = cls.CACHE_TIMEOUTS['user_permissions']
            
            cache_data = {
                'permissions': permissions,
                'user_id': user_id,
                'company_id': company_id,
                'cached_at': timezone.now().isoformat(),
                'cache_version': '1.0'
            }
            
            cache.set(cache_key, cache_data, timeout)
            logger.info(f"Cached permissions for user {user_id} in company {company_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache user permissions: {str(e)}")
            return False

    @classmethod
    def get_cached_user_permissions(cls, user_id: int, company_id: int) -> dict:
        """Retrieve cached user permissions"""
        try:
            cache_key = cls.generate_cache_key('user', f"perms_{user_id}", company=company_id)
            cached_data = cache.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for user {user_id} permissions")
                return cached_data.get('permissions', {})
            
            logger.info(f"Cache miss for user {user_id} permissions")
            return {}
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached user permissions: {str(e)}")
            return {}

    @classmethod
    def cache_search_results(cls, query: str, category: str, company_id: int, results: list) -> bool:
        """Cache search results for performance"""
        try:
            # Create hash of query for consistent key
            query_hash = hashlib.md5(f"{query}_{category}".encode()).hexdigest()
            cache_key = cls.generate_cache_key('search', query_hash, company=company_id)
            timeout = cls.CACHE_TIMEOUTS['search_results']
            
            cache_data = {
                'results': results,
                'query': query,
                'category': category,
                'company_id': company_id,
                'result_count': len(results),
                'cached_at': timezone.now().isoformat(),
                'cache_version': '1.0'
            }
            
            cache.set(cache_key, cache_data, timeout)
            logger.info(f"Cached search results for query: {query[:50]}... ({len(results)} results)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache search results: {str(e)}")
            return False

    @classmethod
    def get_cached_search_results(cls, query: str, category: str, company_id: int) -> list:
        """Retrieve cached search results"""
        try:
            query_hash = hashlib.md5(f"{query}_{category}".encode()).hexdigest()
            cache_key = cls.generate_cache_key('search', query_hash, company=company_id)
            cached_data = cache.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for search query: {query[:50]}...")
                return cached_data.get('results', [])
            
            logger.info(f"Cache miss for search query: {query[:50]}...")
            return []
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached search results: {str(e)}")
            return []

    @classmethod
    def cache_dashboard_stats(cls, company_id: int, stats_type: str, stats_data: dict) -> bool:
        """Cache dashboard statistics"""
        try:
            cache_key = cls.generate_cache_key('dashboard', f"{stats_type}_stats", company=company_id)
            timeout = cls.CACHE_TIMEOUTS['dashboard_stats']
            
            cache_data = {
                'stats': stats_data,
                'stats_type': stats_type,
                'company_id': company_id,
                'cached_at': timezone.now().isoformat(),
                'cache_version': '1.0'
            }
            
            cache.set(cache_key, cache_data, timeout)
            logger.info(f"Cached dashboard stats: {stats_type} for company {company_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache dashboard stats: {str(e)}")
            return False

    @classmethod
    def get_cached_dashboard_stats(cls, company_id: int, stats_type: str) -> dict:
        """Retrieve cached dashboard statistics"""
        try:
            cache_key = cls.generate_cache_key('dashboard', f"{stats_type}_stats", company=company_id)
            cached_data = cache.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for dashboard stats: {stats_type}")
                return cached_data.get('stats', {})
            
            logger.info(f"Cache miss for dashboard stats: {stats_type}")
            return {}
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached dashboard stats: {str(e)}")
            return {}

    @classmethod
    def invalidate_cache_pattern(cls, pattern: str) -> bool:
        """Invalidate multiple cache keys matching a pattern"""
        try:
            # This is a simplified implementation
            # In production, you might use Redis SCAN with pattern matching
            from django.core.cache.backends.redis import RedisCache
            
            if isinstance(cache, RedisCache):
                # Use Redis-specific pattern deletion if available
                redis_client = cache._cache.get_client(write=True)
                keys = redis_client.keys(f"*{pattern}*")
                if keys:
                    redis_client.delete(*keys)
                    logger.info(f"Invalidated {len(keys)} cache keys matching pattern: {pattern}")
                    return True
            
            logger.warning(f"Pattern invalidation not supported for current cache backend")
            return False
            
        except Exception as e:
            logger.error(f"Failed to invalidate cache pattern {pattern}: {str(e)}")
            return False

    @classmethod
    def get_cache_stats(cls) -> dict:
        """Get cache statistics for monitoring"""
        try:
            from django.core.cache.backends.redis import RedisCache
            
            if isinstance(cache, RedisCache):
                redis_client = cache._cache.get_client(write=True)
                info = redis_client.info()
                
                return {
                    'connected_clients': info.get('connected_clients', 0),
                    'used_memory_human': info.get('used_memory_human', '0B'),
                    'keyspace_hits': info.get('keyspace_hits', 0),
                    'keyspace_misses': info.get('keyspace_misses', 0),
                    'hit_rate': (info.get('keyspace_hits', 0) / 
                               max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1)) * 100,
                    'total_commands_processed': info.get('total_commands_processed', 0),
                    'uptime_in_seconds': info.get('uptime_in_seconds', 0)
                }
            
            return {'error': 'Cache statistics not available for current backend'}
            
        except Exception as e:
            logger.error(f"Failed to get cache statistics: {str(e)}")
            return {'error': str(e)}


# Cache invalidation helpers
def invalidate_dangerous_goods_cache(un_number: str = None):
    """Invalidate dangerous goods cache entries"""
    if un_number:
        cache_key = SafeShipperCacheManager.generate_cache_key('dangerous_goods', f"un_{un_number}")
        cache.delete(cache_key)
        logger.info(f"Invalidated dangerous goods cache for UN {un_number}")
    else:
        SafeShipperCacheManager.invalidate_cache_pattern("safeshipper:dg:")
        logger.info("Invalidated all dangerous goods cache entries")


def invalidate_user_cache(user_id: int, company_id: int = None):
    """Invalidate user-related cache entries"""
    if company_id:
        cache_key = SafeShipperCacheManager.generate_cache_key('user', f"perms_{user_id}", company=company_id)
        cache.delete(cache_key)
        logger.info(f"Invalidated user {user_id} cache for company {company_id}")
    else:
        SafeShipperCacheManager.invalidate_cache_pattern(f"safeshipper:usr:perms_{user_id}")
        logger.info(f"Invalidated all cache entries for user {user_id}")


def invalidate_company_cache(company_id: int):
    """Invalidate company-related cache entries"""
    SafeShipperCacheManager.invalidate_cache_pattern(f"company:{company_id}")
    logger.info(f"Invalidated all cache entries for company {company_id}")