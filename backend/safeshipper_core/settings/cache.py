"""
Redis cluster cache configuration for SafeShipper map performance optimization.
"""

import os
from typing import Dict, List, Any

# Redis Cluster Configuration
REDIS_CLUSTER_CONFIG = {
    "use_cluster": os.getenv("REDIS_USE_CLUSTER", "false").lower() == "true",
    
    # Redis Cluster nodes (for production)
    "startup_nodes": [
        {"host": os.getenv("REDIS_NODE_1_HOST", "127.0.0.1"), "port": os.getenv("REDIS_NODE_1_PORT", "7000")},
        {"host": os.getenv("REDIS_NODE_2_HOST", "127.0.0.1"), "port": os.getenv("REDIS_NODE_2_PORT", "7001")},
        {"host": os.getenv("REDIS_NODE_3_HOST", "127.0.0.1"), "port": os.getenv("REDIS_NODE_3_PORT", "7002")},
        {"host": os.getenv("REDIS_NODE_4_HOST", "127.0.0.1"), "port": os.getenv("REDIS_NODE_4_PORT", "7003")},
        {"host": os.getenv("REDIS_NODE_5_HOST", "127.0.0.1"), "port": os.getenv("REDIS_NODE_5_PORT", "7004")},
        {"host": os.getenv("REDIS_NODE_6_HOST", "127.0.0.1"), "port": os.getenv("REDIS_NODE_6_PORT", "7005")},
    ],
    
    # Single Redis instance (for development)
    "single_node": {
        "host": os.getenv("REDIS_HOST", "localhost"),
        "port": int(os.getenv("REDIS_PORT", "6379")),
        "db": int(os.getenv("REDIS_DB", "1")),
        "password": os.getenv("REDIS_PASSWORD"),
    },
    
    # Connection settings
    "socket_timeout": 5,
    "socket_connect_timeout": 5,
    "max_connections_per_node": 50,
    "retry_on_timeout": True,
    "decode_responses": True,
}

# Django Cache Configuration with Redis
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{REDIS_CLUSTER_CONFIG['single_node']['host']}:{REDIS_CLUSTER_CONFIG['single_node']['port']}/0",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 100,
                'retry_on_timeout': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'safeshipper',
        'TIMEOUT': 300,  # 5 minutes default
    },
    
    # Specialized cache for map data
    'maps': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{REDIS_CLUSTER_CONFIG['single_node']['host']}:{REDIS_CLUSTER_CONFIG['single_node']['port']}/1",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 200,  # Higher for map data
                'retry_on_timeout': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'maps',
        'TIMEOUT': 60,  # Shorter TTL for real-time data
    },
    
    # Cache for sessions and user data
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{REDIS_CLUSTER_CONFIG['single_node']['host']}:{REDIS_CLUSTER_CONFIG['single_node']['port']}/2",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
        },
        'KEY_PREFIX': 'sessions',
        'TIMEOUT': 86400,  # 24 hours for sessions
    },
    
    # Cache for API responses
    'api': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{REDIS_CLUSTER_CONFIG['single_node']['host']}:{REDIS_CLUSTER_CONFIG['single_node']['port']}/3",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 150,
                'retry_on_timeout': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'api',
        'TIMEOUT': 300,  # 5 minutes for API responses
    },
}

# Session configuration to use Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 86400  # 24 hours

# Cache key versioning
CACHE_MIDDLEWARE_KEY_PREFIX = 'safeshipper'
CACHE_MIDDLEWARE_SECONDS = 300

# Map-specific cache settings
MAP_CACHE_SETTINGS = {
    "cluster_cache_ttl": 60,        # 1 minute for clustered data
    "individual_cache_ttl": 30,     # 30 seconds for individual vehicles
    "bounds_cache_ttl": 300,        # 5 minutes for fleet bounds
    "tile_cache_ttl": 86400,        # 24 hours for map tiles
    "geofence_cache_ttl": 300,      # 5 minutes for geofence data
    
    # Performance thresholds
    "max_features_per_tile": 500,   # Limit features to prevent performance issues
    "cluster_zoom_threshold": 13,   # Below this zoom: cluster, above: individual
    "high_detail_zoom": 15,         # Maximum detail zoom level
    
    # Geographic settings
    "geohash_precision": 6,         # Precision for geographic hashing
    "cache_shards": 16,             # Number of cache shards for distribution
    "region_cache_radius": 10,      # Radius in km for regional cache invalidation
}

# Monitoring and metrics
CACHE_MONITORING = {
    "enable_metrics": True,
    "metrics_interval": 60,         # Collect metrics every minute
    "alert_thresholds": {
        "hit_rate_min": 0.80,       # Alert if hit rate < 80%
        "memory_usage_max": 0.90,   # Alert if memory usage > 90%
        "connection_errors_max": 10, # Alert if > 10 connection errors/minute
    },
}

# Cache warming configuration
CACHE_WARMING = {
    "enable_route_warming": True,
    "warming_batch_size": 100,      # Process 100 routes at a time
    "warming_interval": 3600,       # Warm cache every hour
    "popular_routes_count": 50,     # Warm top 50 most popular routes
}

# Development vs Production settings
if os.getenv("DJANGO_ENV") == "production":
    # Production: Use Redis Cluster
    REDIS_CLUSTER_CONFIG["use_cluster"] = True
    
    # Update cache locations for cluster
    for cache_name, cache_config in CACHES.items():
        if 'LOCATION' in cache_config:
            # In production, this would point to the cluster
            cache_config['LOCATION'] = "redis://redis-cluster:6379/0"
    
    # Production-specific cache settings
    MAP_CACHE_SETTINGS.update({
        "cluster_cache_ttl": 120,       # Longer TTL in production
        "individual_cache_ttl": 60,
        "max_features_per_tile": 1000,  # Higher limits in production
    })
    
else:
    # Development: Use single Redis instance
    REDIS_CLUSTER_CONFIG["use_cluster"] = False
    
    # Development-specific settings
    MAP_CACHE_SETTINGS.update({
        "cluster_cache_ttl": 30,        # Shorter TTL for development
        "individual_cache_ttl": 15,
        "max_features_per_tile": 200,   # Lower limits for development
    })

# Cache key patterns for monitoring
CACHE_KEY_PATTERNS = {
    "map_data": "safeshipper:map_data:*",
    "fleet_bounds": "safeshipper:bounds:*",
    "geofence": "safeshipper:geofence:*",
    "tiles": "safeshipper:tile:*",
    "api_responses": "safeshipper:api:*",
}