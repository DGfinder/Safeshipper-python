# shared/caching_service.py
"""
Redis caching service for SafeShipper dangerous goods lookups.
Optimizes performance for frequently accessed dangerous goods data.
"""

import json
import hashlib
import logging
from datetime import timedelta
from django.core.cache import cache
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from typing import Optional, Dict, List, Any
import redis

logger = logging.getLogger(__name__)


class SafeShipperCacheService:
    """
    Centralized caching service for SafeShipper with dangerous goods optimization.
    """
    
    # Cache key prefixes for different data types
    CACHE_PREFIXES = {
        'dangerous_goods': 'dg',
        'un_lookup': 'un',
        'compatibility': 'compat',
        'synonym': 'syn',
        'sds': 'sds',
        'emergency_procedures': 'emergency',
        'placard_rules': 'placard',
        'shipment_validation': 'ship_val'
    }
    
    # Cache timeouts (in seconds)
    CACHE_TIMEOUTS = {
        'dangerous_goods': 3600 * 24,      # 24 hours - reference data
        'un_lookup': 3600 * 24,            # 24 hours - reference data
        'compatibility': 3600 * 12,        # 12 hours - business rules
        'synonym': 3600 * 24,              # 24 hours - reference data
        'sds': 3600 * 6,                   # 6 hours - document data
        'emergency_procedures': 3600 * 12,  # 12 hours - safety procedures
        'placard_rules': 3600 * 24,        # 24 hours - regulatory rules
        'shipment_validation': 300,         # 5 minutes - dynamic data
        'user_session': 1800,              # 30 minutes - session data
    }
    
    @classmethod
    def _generate_cache_key(cls, prefix: str, *args, **kwargs) -> str:
        """
        Generate consistent cache key from prefix and parameters.
        """
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        key_string = json.dumps(key_data, sort_keys=True, cls=DjangoJSONEncoder)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        return f"safeshipper:{cls.CACHE_PREFIXES.get(prefix, prefix)}:{key_hash}"
    
    @classmethod
    def get(cls, cache_type: str, *args, **kwargs) -> Optional[Any]:
        """
        Get cached data by type and parameters.
        """
        try:
            cache_key = cls._generate_cache_key(cache_type, *args, **kwargs)
            data = cache.get(cache_key)
            
            if data is not None:
                logger.debug(f"Cache hit for {cache_type}: {cache_key}")
                return data
            
            logger.debug(f"Cache miss for {cache_type}: {cache_key}")
            return None
            
        except Exception as e:
            logger.error(f"Cache get error for {cache_type}: {str(e)}")
            return None
    
    @classmethod
    def set(cls, cache_type: str, data: Any, *args, timeout: Optional[int] = None, **kwargs) -> bool:
        """
        Set cached data by type and parameters.
        """
        try:
            cache_key = cls._generate_cache_key(cache_type, *args, **kwargs)
            cache_timeout = timeout or cls.CACHE_TIMEOUTS.get(cache_type, 3600)
            
            cache.set(cache_key, data, cache_timeout)
            logger.debug(f"Cache set for {cache_type}: {cache_key} (timeout: {cache_timeout}s)")
            
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for {cache_type}: {str(e)}")
            return False
    
    @classmethod
    def delete(cls, cache_type: str, *args, **kwargs) -> bool:
        """
        Delete cached data by type and parameters.
        """
        try:
            cache_key = cls._generate_cache_key(cache_type, *args, **kwargs)
            cache.delete(cache_key)
            logger.debug(f"Cache delete for {cache_type}: {cache_key}")
            
            return True
            
        except Exception as e:
            logger.error(f"Cache delete error for {cache_type}: {str(e)}")
            return False
    
    @classmethod
    def clear_pattern(cls, cache_type: str) -> bool:
        """
        Clear all cached data for a specific type.
        """
        try:
            if hasattr(settings, 'CACHES') and 'default' in settings.CACHES:
                # Use Redis pattern deletion if available
                try:
                    r = redis.Redis.from_url(settings.CACHES['default']['LOCATION'])
                    pattern = f"safeshipper:{cls.CACHE_PREFIXES.get(cache_type, cache_type)}:*"
                    keys = r.keys(pattern)
                    if keys:
                        r.delete(*keys)
                        logger.info(f"Cleared {len(keys)} cache entries for {cache_type}")
                    return True
                except Exception as redis_error:
                    logger.warning(f"Redis pattern delete failed, using fallback: {redis_error}")
            
            # Fallback: clear entire cache (not ideal but safe)
            cache.clear()
            logger.warning(f"Cleared entire cache due to pattern delete limitation")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear error for {cache_type}: {str(e)}")
            return False


class DangerousGoodsCacheService:
    """
    Specialized caching service for dangerous goods data with optimized lookup patterns.
    """
    
    @classmethod
    def get_dangerous_good_by_un(cls, un_number: str) -> Optional[Dict]:
        """
        Get dangerous good data by UN number with caching.
        """
        return SafeShipperCacheService.get('un_lookup', un_number=un_number)
    
    @classmethod
    def cache_dangerous_good_by_un(cls, un_number: str, dg_data: Dict) -> bool:
        """
        Cache dangerous good data by UN number.
        """
        return SafeShipperCacheService.set('un_lookup', dg_data, un_number=un_number)
    
    @classmethod
    def get_compatibility_result(cls, un_numbers: List[str]) -> Optional[Dict]:
        """
        Get compatibility check result with caching.
        """
        # Sort UN numbers for consistent cache keys
        sorted_un_numbers = sorted(un_numbers)
        return SafeShipperCacheService.get('compatibility', un_numbers=sorted_un_numbers)
    
    @classmethod
    def cache_compatibility_result(cls, un_numbers: List[str], result: Dict) -> bool:
        """
        Cache compatibility check result.
        """
        sorted_un_numbers = sorted(un_numbers)
        return SafeShipperCacheService.set('compatibility', result, un_numbers=sorted_un_numbers)
    
    @classmethod
    def get_synonym_match(cls, query: str) -> Optional[Dict]:
        """
        Get synonym match result with caching.
        """
        # Normalize query for consistent caching
        normalized_query = query.lower().strip()
        return SafeShipperCacheService.get('synonym', query=normalized_query)
    
    @classmethod
    def cache_synonym_match(cls, query: str, match_data: Dict) -> bool:
        """
        Cache synonym match result.
        """
        normalized_query = query.lower().strip()
        return SafeShipperCacheService.set('synonym', match_data, query=normalized_query)
    
    @classmethod
    def get_dangerous_goods_list(cls, filters: Dict = None) -> Optional[List]:
        """
        Get filtered dangerous goods list with caching.
        """
        return SafeShipperCacheService.get('dangerous_goods', filters=filters or {})
    
    @classmethod
    def cache_dangerous_goods_list(cls, filters: Dict, dg_list: List) -> bool:
        """
        Cache filtered dangerous goods list.
        """
        return SafeShipperCacheService.set('dangerous_goods', dg_list, filters=filters or {})
    
    @classmethod
    def invalidate_dangerous_goods_cache(cls) -> bool:
        """
        Invalidate all dangerous goods related cache entries.
        """
        success = True
        cache_types = ['dangerous_goods', 'un_lookup', 'compatibility', 'synonym']
        
        for cache_type in cache_types:
            if not SafeShipperCacheService.clear_pattern(cache_type):
                success = False
        
        return success


class SDSCacheService:
    """
    Specialized caching service for Safety Data Sheet lookups.
    """
    
    @classmethod
    def get_sds_by_dg_id(cls, dangerous_good_id: str, language: str = 'EN') -> Optional[Dict]:
        """
        Get SDS data by dangerous good ID with caching.
        """
        return SafeShipperCacheService.get('sds', dg_id=dangerous_good_id, language=language)
    
    @classmethod
    def cache_sds_by_dg_id(cls, dangerous_good_id: str, sds_data: Dict, language: str = 'EN') -> bool:
        """
        Cache SDS data by dangerous good ID.
        """
        return SafeShipperCacheService.set('sds', sds_data, dg_id=dangerous_good_id, language=language)
    
    @classmethod
    def get_sds_ph_data(cls, dangerous_good_id: str) -> Optional[Dict]:
        """
        Get cached pH data from SDS.
        """
        return SafeShipperCacheService.get('sds', dg_id=dangerous_good_id, data_type='ph')
    
    @classmethod
    def cache_sds_ph_data(cls, dangerous_good_id: str, ph_data: Dict) -> bool:
        """
        Cache pH data from SDS.
        """
        return SafeShipperCacheService.set('sds', ph_data, dg_id=dangerous_good_id, data_type='ph')


class EmergencyProceduresCacheService:
    """
    Specialized caching service for emergency procedures.
    """
    
    @classmethod
    def get_procedures_by_hazard_class(cls, hazard_class: str) -> Optional[List]:
        """
        Get emergency procedures by hazard class with caching.
        """
        return SafeShipperCacheService.get('emergency_procedures', hazard_class=hazard_class)
    
    @classmethod
    def cache_procedures_by_hazard_class(cls, hazard_class: str, procedures: List) -> bool:
        """
        Cache emergency procedures by hazard class.
        """
        return SafeShipperCacheService.set('emergency_procedures', procedures, hazard_class=hazard_class)
    
    @classmethod
    def get_quick_reference(cls, un_number: str) -> Optional[Dict]:
        """
        Get quick reference emergency data with caching.
        """
        return SafeShipperCacheService.get('emergency_procedures', un_number=un_number, type='quick_ref')
    
    @classmethod
    def cache_quick_reference(cls, un_number: str, quick_ref_data: Dict) -> bool:
        """
        Cache quick reference emergency data.
        """
        return SafeShipperCacheService.set('emergency_procedures', quick_ref_data, 
                                         un_number=un_number, type='quick_ref')


class CacheStatisticsService:
    """
    Service for monitoring cache performance and statistics.
    """
    
    @classmethod
    def get_cache_stats(cls) -> Dict:
        """
        Get cache statistics including hit rates and memory usage.
        """
        try:
            if hasattr(settings, 'CACHES') and 'default' in settings.CACHES:
                try:
                    r = redis.Redis.from_url(settings.CACHES['default']['LOCATION'])
                    info = r.info()
                    
                    # Get SafeShipper specific keys
                    pattern = "safeshipper:*"
                    keys = r.keys(pattern)
                    
                    stats = {
                        'total_keys': len(keys),
                        'memory_usage_mb': info.get('used_memory', 0) / (1024 * 1024),
                        'hit_rate': info.get('keyspace_hit_rate', 0),
                        'connected_clients': info.get('connected_clients', 0),
                        'cache_types': {}
                    }
                    
                    # Count keys by type
                    for cache_type, prefix in SafeShipperCacheService.CACHE_PREFIXES.items():
                        type_pattern = f"safeshipper:{prefix}:*"
                        type_keys = r.keys(type_pattern)
                        stats['cache_types'][cache_type] = len(type_keys)
                    
                    return stats
                    
                except Exception as redis_error:
                    logger.error(f"Redis stats error: {redis_error}")
                    return {'error': 'Redis unavailable', 'fallback_cache': True}
            
            return {'error': 'Cache not configured', 'fallback_cache': True}
            
        except Exception as e:
            logger.error(f"Cache stats error: {str(e)}")
            return {'error': str(e)}
    
    @classmethod
    def clear_all_safeshipper_cache(cls) -> Dict:
        """
        Clear all SafeShipper cache entries (admin function).
        """
        try:
            if hasattr(settings, 'CACHES') and 'default' in settings.CACHES:
                try:
                    r = redis.Redis.from_url(settings.CACHES['default']['LOCATION'])
                    pattern = "safeshipper:*"
                    keys = r.keys(pattern)
                    
                    if keys:
                        r.delete(*keys)
                        logger.info(f"Cleared {len(keys)} SafeShipper cache entries")
                        return {'success': True, 'cleared_keys': len(keys)}
                    else:
                        return {'success': True, 'cleared_keys': 0, 'message': 'No keys to clear'}
                        
                except Exception as redis_error:
                    logger.error(f"Redis clear error: {redis_error}")
                    # Fallback to Django cache clear
                    cache.clear()
                    return {'success': True, 'method': 'fallback_clear_all'}
            
            cache.clear()
            return {'success': True, 'method': 'django_cache_clear'}
            
        except Exception as e:
            logger.error(f"Cache clear error: {str(e)}")
            return {'success': False, 'error': str(e)}