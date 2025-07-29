# shared/settings_rate_limiting.py
"""
Rate limiting configuration for SafeShipper Django settings.
Include this in your main settings file to enable rate limiting.
"""

# Rate limiting configuration using REST framework throttling
REST_FRAMEWORK_THROTTLING = {
    'DEFAULT_THROTTLE_CLASSES': [
        'shared.rate_limiting.SafeShipperBaseThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'auth': '5/min',                    # Authentication endpoints
        'dangerous_goods': '100/hour',      # Dangerous goods lookups
        'shipment_creation': '50/hour',     # Shipment creation
        'emergency': '200/hour',            # Emergency procedures (higher for safety)
        'sensitive_data': '30/min',         # User data, SDS, compliance
    }
}

# Cache configuration for rate limiting
# Ensure Redis is configured for production
CACHES_RATE_LIMITING = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'safeshipper_rate_limit',
        'TIMEOUT': 300,  # 5 minutes default timeout
    }
}

# Middleware configuration
MIDDLEWARE_RATE_LIMITING = [
    'shared.rate_limiting.RateLimitMiddleware',
]

# Logging configuration for rate limiting
LOGGING_RATE_LIMITING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'rate_limit_file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': 'logs/rate_limiting.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'shared.rate_limiting': {
            'handlers': ['rate_limit_file'],
            'level': 'WARNING',
            'propagate': True,
        },
    },
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
}

# Security settings for rate limiting
SECURITY_RATE_LIMITING = {
    # Block suspicious IPs after repeated violations
    'AUTO_BLOCK_THRESHOLD': 10,  # violations in time window
    'AUTO_BLOCK_DURATION': 3600,  # 1 hour block
    'AUTO_BLOCK_TIME_WINDOW': 300,  # 5 minutes
    
    # Enhanced monitoring
    'MONITOR_RATE_VIOLATIONS': True,
    'ALERT_THRESHOLD': 5,  # violations before alert
    
    # Whitelist for internal services
    'RATE_LIMIT_WHITELIST': [
        '127.0.0.1',
        '::1',
        '10.0.0.0/8',     # Private networks
        '172.16.0.0/12',
        '192.168.0.0/16',
    ]
}

# Django REST Framework settings integration
def integrate_rate_limiting_settings(settings_dict):
    """
    Helper function to integrate rate limiting settings into main Django settings.
    
    Usage in settings.py:
        from shared.settings_rate_limiting import integrate_rate_limiting_settings
        integrate_rate_limiting_settings(locals())
    """
    
    # Update REST_FRAMEWORK settings
    if 'REST_FRAMEWORK' not in settings_dict:
        settings_dict['REST_FRAMEWORK'] = {}
    
    settings_dict['REST_FRAMEWORK'].update(REST_FRAMEWORK_THROTTLING)
    
    # Update CACHES settings (only if Redis is available)
    if 'CACHES' not in settings_dict:
        settings_dict['CACHES'] = CACHES_RATE_LIMITING
    else:
        # Merge with existing cache configuration
        settings_dict['CACHES'].update(CACHES_RATE_LIMITING)
    
    # Update MIDDLEWARE
    if 'MIDDLEWARE' not in settings_dict:
        settings_dict['MIDDLEWARE'] = []
    
    # Add rate limiting middleware if not already present
    for middleware in MIDDLEWARE_RATE_LIMITING:
        if middleware not in settings_dict['MIDDLEWARE']:
            settings_dict['MIDDLEWARE'].append(middleware)
    
    # Update LOGGING
    if 'LOGGING' not in settings_dict:
        settings_dict['LOGGING'] = LOGGING_RATE_LIMITING
    else:
        # Merge logging configuration
        existing_logging = settings_dict['LOGGING']
        
        # Merge handlers
        if 'handlers' not in existing_logging:
            existing_logging['handlers'] = {}
        existing_logging['handlers'].update(LOGGING_RATE_LIMITING['handlers'])
        
        # Merge loggers
        if 'loggers' not in existing_logging:
            existing_logging['loggers'] = {}
        existing_logging['loggers'].update(LOGGING_RATE_LIMITING['loggers'])
        
        # Merge formatters
        if 'formatters' not in existing_logging:
            existing_logging['formatters'] = {}
        existing_logging['formatters'].update(LOGGING_RATE_LIMITING['formatters'])
    
    # Add security settings
    settings_dict['SAFESHIPPER_RATE_LIMITING'] = SECURITY_RATE_LIMITING
    
    return settings_dict