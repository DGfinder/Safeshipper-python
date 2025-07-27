# settings.py
from pathlib import Path
from decouple import config, Csv
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# Security
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,localhost', cast=Csv())

# Enhanced Security Settings
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Applications
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'django.contrib.gis',
    
    # Third-party apps
    'channels',
    'rest_framework',
    'drf_spectacular',
    'simple_history',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.microsoft',
    # 'allauth.socialaccount.providers.saml',  # Temporarily disabled due to missing onelogin dependency
    'django_otp',
    'django_otp.plugins.otp_totp',
    'django_otp.plugins.otp_static',
    'corsheaders',
    'django_elasticsearch_dsl',
    'django_elasticsearch_dsl_drf',
    
    # Local apps (minimal set for EPG functionality)
    'users',
    'companies',
    'locations',
    'shipments',
    'dangerous_goods',  # Re-enabled after fixing shipments dependencies
    'sds',  # Re-enabled after fixing dangerous_goods dependencies
    'vehicles',
    'freight_types',
    'enterprise_auth',  # Re-enabled for Phase 3D security
    # 'incidents',
    # 'training',
    'iot_devices',  # Re-enabled for GPS tracking and IoT device management
    'documents',  # Re-enabled after fixing shipments dependencies
    'manifests',  # Re-enabled after fixing documents dependencies
    'audits',     # Re-enabled for Phase 5A comprehensive audit system
    'inspections', # Re-enabled for Phase 5B quality management
    'training',   # Re-enabled for Phase 5C training & certification management
    'api_gateway', # Re-enabled for Phase 7A API gateway & developer platform
    'erp_integration', # Re-enabled for Phase 7B ERP integration framework
    'customer_portal', # Re-enabled for Phase 8A customer portal & self-service
    'mobile_api', # Re-enabled for Phase 8B mobile API foundation
    'communications', # Re-enabled for Phase 1 communication system
    'dashboards', # Re-enabled for Phase 3A analytics
    'load_plans', # Re-enabled for Phase 3B load planning
    'epg',        # Re-enabled after fixing shipments dependencies
    'capacity_marketplace', # Re-enabled for Phase 3C marketplace
    'routes', # Re-enabled for Phase 3B route optimization
]

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'safeshipper_core.middleware.SecurityHeadersMiddleware',
    'api_gateway.middleware.APIGatewayMiddleware',
    'api_gateway.middleware.APIVersioningMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'simple_history.middleware.HistoryRequestMiddleware',
    'safeshipper_core.middleware.RequestLoggingMiddleware',
    'safeshipper_core.middleware.APIErrorHandlingMiddleware',
]

ROOT_URLCONF = 'safeshipper_core.urls'

# Templates
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'safeshipper_core.wsgi.application'
ASGI_APPLICATION = 'safeshipper_core.asgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE', default='django.contrib.gis.db.backends.postgis'),
        'NAME': config('DB_NAME', default='safeshipper'),
        'USER': config('DB_USER', default='safeshipper'),
        'PASSWORD': config('DB_PASSWORD', default='safeshipper_dev_password'),
        'HOST': config('DB_HOST', default='postgres'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]

# Primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'users.User'

# Cache settings
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'MAX_CONNECTIONS': 50,
            'CONNECTION_POOL_KWARGS': {'max_connections': 20}
        }
    }
}

# Session settings
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Channel Layers (for WebSocket support)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [config('REDIS_URL', default='redis://127.0.0.1:6379/2')],
            'capacity': 1500,  # Maximum messages in a channel
            'expiry': 60,      # Message expiry in seconds
        },
    },
}

# REST framework settings
REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day'
    },
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1'],
    'VERSION_PARAM': 'version',
}

# JWT config with enhanced security
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=15, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_LIFETIME', default=1, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': config('JWT_ALGORITHM', default='HS256'),
    'SIGNING_KEY': config('JWT_SIGNING_KEY', default=SECRET_KEY),
    'VERIFYING_KEY': config('JWT_VERIFYING_KEY', default=None),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=config('JWT_SLIDING_TOKEN_LIFETIME', default=5, cast=int)),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=config('JWT_SLIDING_TOKEN_REFRESH_LIFETIME', default=1, cast=int)),
}

# CORS settings
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000', cast=Csv())
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Celery Configuration
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')

# Basic Celery Settings
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# Task Settings
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = config('CELERY_TASK_TIME_LIMIT', default=300, cast=int)  # 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = config('CELERY_TASK_SOFT_TIME_LIMIT', default=240, cast=int)  # 4 minutes
CELERY_TASK_MAX_RETRIES = config('CELERY_TASK_MAX_RETRIES', default=3, cast=int)
CELERY_TASK_DEFAULT_RETRY_DELAY = config('CELERY_TASK_DEFAULT_RETRY_DELAY', default=60, cast=int)

# Result Settings
CELERY_RESULT_EXPIRES = config('CELERY_RESULT_EXPIRES', default=3600, cast=int)  # 1 hour
CELERY_RESULT_PERSISTENT = True

# Worker Settings
CELERY_WORKER_PREFETCH_MULTIPLIER = config('CELERY_WORKER_PREFETCH_MULTIPLIER', default=1, cast=int)
CELERY_WORKER_MAX_TASKS_PER_CHILD = config('CELERY_WORKER_MAX_TASKS_PER_CHILD', default=1000, cast=int)
CELERY_WORKER_DISABLE_RATE_LIMITS = False

# Monitoring Settings
CELERY_SEND_TASK_EVENTS = True
CELERY_SEND_EVENTS = True
CELERY_TASK_SEND_SENT_EVENT = True

# Redis Connection Pool Settings
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_RETRY = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 5
CELERY_REDIS_MAX_CONNECTIONS = config('CELERY_REDIS_MAX_CONNECTIONS', default=20, cast=int)

# Celery Beat Settings (for periodic tasks)
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-results': {
        'task': 'celery.backend_cleanup',
        'schedule': config('CELERY_CLEANUP_INTERVAL', default=300.0, cast=float),  # 5 minutes
    },
    'health-check': {
        'task': 'core.tasks.health_check',
        'schedule': config('CELERY_HEALTH_CHECK_INTERVAL', default=60.0, cast=float),  # 1 minute
    },
}

# Celery Task Routes
CELERY_TASK_ROUTES = {
    # Manifest processing tasks
    'manifests.tasks.process_manifest_validation': {'queue': 'manifests'},
    'manifests.tasks.extract_dangerous_goods': {'queue': 'manifests'},
    'manifests.tasks.ocr_document': {'queue': 'ocr'},
    
    # Document processing tasks
    'documents.tasks.process_document': {'queue': 'documents'},
    'documents.tasks.generate_document': {'queue': 'documents'},
    
    # Email and notification tasks
    'communications.tasks.send_email': {'queue': 'emails'},
    'communications.tasks.send_notification': {'queue': 'notifications'},
    
    # Background maintenance tasks
    'core.tasks.cleanup_old_files': {'queue': 'maintenance'},
    'core.tasks.update_search_indexes': {'queue': 'maintenance'},
}

# Queue Configuration
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_QUEUES = {
    'default': {
        'exchange': 'default',
        'routing_key': 'default',
    },
    'manifests': {
        'exchange': 'manifests',
        'routing_key': 'manifests',
        'queue_arguments': {'x-max-priority': 10},
    },
    'documents': {
        'exchange': 'documents',
        'routing_key': 'documents',
        'queue_arguments': {'x-max-priority': 5},
    },
    'ocr': {
        'exchange': 'ocr',
        'routing_key': 'ocr',
        'queue_arguments': {'x-max-priority': 8},
    },
    'emails': {
        'exchange': 'emails',
        'routing_key': 'emails',
        'queue_arguments': {'x-max-priority': 3},
    },
    'notifications': {
        'exchange': 'notifications',
        'routing_key': 'notifications',
        'queue_arguments': {'x-max-priority': 2},
    },
    'maintenance': {
        'exchange': 'maintenance',
        'routing_key': 'maintenance',
        'queue_arguments': {'x-max-priority': 1},
    },
}

# Elasticsearch settings
ELASTICSEARCH_DSL = {
    'default': {
        'hosts': config('ELASTICSEARCH_HOST', default='localhost:9200'),
        'http_auth': (
            config('ELASTICSEARCH_USERNAME', default=''),
            config('ELASTICSEARCH_PASSWORD', default='')
        ) if config('ELASTICSEARCH_USERNAME', default='') else None,
        'use_ssl': config('ELASTICSEARCH_USE_SSL', default=False, cast=bool),
        'verify_certs': config('ELASTICSEARCH_VERIFY_CERTS', default=True, cast=bool),
        'ssl_show_warn': config('ELASTICSEARCH_SSL_SHOW_WARN', default=True, cast=bool),
        'timeout': config('ELASTICSEARCH_TIMEOUT', default=30, cast=int),
        'max_retries': config('ELASTICSEARCH_MAX_RETRIES', default=3, cast=int),
        'retry_on_timeout': config('ELASTICSEARCH_RETRY_ON_TIMEOUT', default=True, cast=bool),
    },
}

# Elasticsearch indices configuration
ELASTICSEARCH_DSL_INDEX_SETTINGS = {
    'number_of_shards': config('ELASTICSEARCH_SHARDS', default=1, cast=int),
    'number_of_replicas': config('ELASTICSEARCH_REPLICAS', default=0, cast=int),
    'max_result_window': config('ELASTICSEARCH_MAX_RESULT_WINDOW', default=10000, cast=int),
}

# Elasticsearch auto sync (disable in production)
ELASTICSEARCH_DSL_AUTOSYNC = config('ELASTICSEARCH_AUTOSYNC', default=DEBUG, cast=bool)

# Elasticsearch signal processor
ELASTICSEARCH_DSL_SIGNAL_PROCESSOR = config(
    'ELASTICSEARCH_SIGNAL_PROCESSOR', 
    default='django_elasticsearch_dsl.signals.RealTimeSignalProcessor'
)

# Enhanced File Storage Configuration
# Intelligent storage backend selection (S3 -> MinIO -> Local)
DEFAULT_FILE_STORAGE = config('DEFAULT_FILE_STORAGE', default='safeshipper_core.storage_backends.SafeShipperLocalStorage')

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='safeshipper-documents')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default=None)
AWS_DEFAULT_ACL = 'private'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
    'ServerSideEncryption': 'AES256',  # Encrypt at rest
}
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True
AWS_S3_SIGNATURE_VERSION = 's3v4'

# MinIO Configuration (fallback for on-premise)
MINIO_ACCESS_KEY = config('MINIO_ACCESS_KEY', default='')
MINIO_SECRET_KEY = config('MINIO_SECRET_KEY', default='')
MINIO_BUCKET_NAME = config('MINIO_BUCKET_NAME', default='safeshipper')
MINIO_ENDPOINT = config('MINIO_ENDPOINT', default='')
MINIO_REGION = config('MINIO_REGION', default='us-east-1')
MINIO_USE_SSL = config('MINIO_USE_SSL', default=False, cast=bool)

# Local Storage Configuration
MEDIA_ROOT = config('MEDIA_ROOT', default=os.path.join(BASE_DIR, 'media'))
MEDIA_URL = config('MEDIA_URL', default='/media/')

# File Upload Settings
MAX_FILE_UPLOAD_SIZE = config('MAX_FILE_UPLOAD_SIZE', default=100 * 1024 * 1024, cast=int)  # 100MB
ALLOWED_FILE_EXTENSIONS = config('ALLOWED_FILE_EXTENSIONS', default='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip', cast=Csv())

# Storage Security Settings
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755
FILE_UPLOAD_TEMP_DIR = config('FILE_UPLOAD_TEMP_DIR', default=os.path.join(BASE_DIR, 'tmp'))

# Document Retention Policies (in days)
DOCUMENT_RETENTION_POLICIES = {
    'dangerous_goods_manifest': 2555,  # 7 years
    'safety_data_sheet': 2555,        # 7 years
    'vehicle_certificate': 1825,      # 5 years
    'training_certificate': 1825,     # 5 years
    'incident_report': 3650,          # 10 years
    'analytics_report': 365,          # 1 year
    'temporary': 7,                   # 1 week
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'safeshipper.log'),
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'safeshipper': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'SafeShipper API',
    'DESCRIPTION': 'API for SafeShipper logistics and dangerous goods management system',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'SECURITY': [{'Bearer': []}],
}

# Create logs directory if it doesn't exist
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)

# Django Sites Framework (required for allauth)
SITE_ID = 1

# Django Allauth Configuration
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'optional'
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'
ACCOUNT_USER_MODEL_EMAIL_FIELD = 'email'
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True

# Social Account Configuration
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'OAUTH_PKCE_ENABLED': True,
        'APP': {
            'client_id': config('GOOGLE_CLIENT_ID', default=''),
            'secret': config('GOOGLE_CLIENT_SECRET', default=''),
        }
    },
    'microsoft': {
        'APP': {
            'client_id': config('MICROSOFT_CLIENT_ID', default=''),
            'secret': config('MICROSOFT_CLIENT_SECRET', default=''),
        },
        'SCOPE': ['User.Read'],
        'AUTH_PARAMS': {
            'response_type': 'code',
        }
    },
    # 'saml': {  # Temporarily disabled due to missing onelogin dependency
    #     'attribute_mapping': {
    #         'uid': 'username',
    #         'email_address': 'email',
    #         'first_name': 'first_name',
    #         'last_name': 'last_name',
    #     }
    # }
}

# MFA Configuration (django-otp)
OTP_TOTP_ISSUER = 'SafeShipper'
OTP_LOGIN_URL = '/admin/login/'

# Additional Celery Configuration Options
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# Celery Beat Settings (if you later add periodic tasks)
# CELERY_BEAT_SCHEDULE = {}

# WebSocket Configuration (Django Channels)
ASGI_APPLICATION = 'safeshipper_core.asgi.application'

# Channel Layers Configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [config('REDIS_URL', default='redis://localhost:6379/0')],
            'capacity': 1500,
            'expiry': 60,
        },
    },
}

# Fallback to in-memory channel layer for development if Redis is not available
if DEBUG and not config('REDIS_URL', default=None):
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# External Service Configurations

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = config('TWILIO_AUTH_TOKEN', default='')
TWILIO_PHONE_NUMBER = config('TWILIO_PHONE_NUMBER', default='')

# Firebase Cloud Messaging Configuration
FCM_SERVER_KEY = config('FCM_SERVER_KEY', default='')
FCM_SENDER_ID = config('FCM_SENDER_ID', default='')

# Email Service Configuration (production)
EMAIL_BACKEND = config(
    'EMAIL_BACKEND', 
    default='django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = config('EMAIL_HOST', default='smtp.sendgrid.net')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@safeshipper.com')

# Payment Processing Configuration
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')
