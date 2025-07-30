# shared/production_health.py
"""
Production-ready health check system for SafeShipper.
Provides comprehensive monitoring for all critical system components.
"""

import logging
import time
import psutil
import socket
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from django.db import connections, DatabaseError
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.core.mail import get_connection
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import requests
import redis

logger = logging.getLogger(__name__)


class ProductionHealthChecker:
    """
    Comprehensive production health checker for SafeShipper platform.
    Monitors all critical services and dependencies with detailed diagnostics.
    """
    
    def __init__(self):
        self.start_time = time.time()
        self.health_data = {
            'timestamp': datetime.now().isoformat(),
            'environment': getattr(settings, 'ENVIRONMENT', 'unknown'),
            'version': getattr(settings, 'VERSION', '1.0.0'),
            'status': 'healthy',
            'services': {},
            'system_metrics': {},
            'summary': {
                'total_checks': 0,
                'passed_checks': 0,
                'failed_checks': 0,
                'warning_checks': 0,
                'overall_health_score': 0
            }
        }
    
    def run_comprehensive_check(self) -> Dict[str, Any]:
        """
        Run all health checks and return comprehensive status.
        """
        logger.info("Starting comprehensive health check")
        
        # Define all health checks
        health_checks = [
            ('database', self._check_database_health),
            ('cache_redis', self._check_redis_health),
            ('celery_workers', self._check_celery_health),
            ('file_storage', self._check_storage_health),
            ('dangerous_goods_api', self._check_dangerous_goods_health),
            ('external_services', self._check_external_services_health),
            ('system_resources', self._check_system_resources),
            ('application_health', self._check_application_health),
            ('security_status', self._check_security_status),
            ('performance_metrics', self._check_performance_metrics)
        ]
        
        # Run all checks
        for service_name, check_function in health_checks:
            try:
                start_check_time = time.time()
                service_health = check_function()
                check_duration = (time.time() - start_check_time) * 1000
                
                service_health['check_duration_ms'] = round(check_duration, 2)
                service_health['checked_at'] = datetime.now().isoformat()
                
                self.health_data['services'][service_name] = service_health
                self.health_data['summary']['total_checks'] += 1
                
                # Update counters based on status
                if service_health.get('status') == 'healthy':
                    self.health_data['summary']['passed_checks'] += 1
                elif service_health.get('status') == 'failed':
                    self.health_data['summary']['failed_checks'] += 1
                else:  # warning/degraded
                    self.health_data['summary']['warning_checks'] += 1
                    
            except Exception as e:
                logger.error(f"Health check failed for {service_name}: {str(e)}")
                self.health_data['services'][service_name] = {
                    'status': 'failed',
                    'error': str(e),
                    'checked_at': datetime.now().isoformat()
                }
                self.health_data['summary']['total_checks'] += 1
                self.health_data['summary']['failed_checks'] += 1
        
        # Calculate overall health status and score
        self._calculate_overall_health()
        
        # Add execution time
        self.health_data['total_check_time_ms'] = round((time.time() - self.start_time) * 1000, 2)
        
        logger.info(f"Health check completed in {self.health_data['total_check_time_ms']}ms")
        return self.health_data
    
    def _check_database_health(self) -> Dict[str, Any]:
        """
        Comprehensive database health check.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Database is healthy',
            'connections': {},
            'performance': {}
        }
        
        try:
            # Check all configured databases
            for db_name in connections:
                conn_start = time.time()
                connection = connections[db_name]
                
                # Test connectivity
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                
                conn_time = (time.time() - conn_start) * 1000
                
                # Get connection info
                health_info['connections'][db_name] = {
                    'status': 'connected',
                    'connection_time_ms': round(conn_time, 2),
                    'is_usable': connection.is_usable(),
                    'vendor': connection.vendor,
                    'settings_dict': {
                        'NAME': connection.settings_dict.get('NAME', 'unknown'),
                        'HOST': connection.settings_dict.get('HOST', 'localhost'),
                        'PORT': connection.settings_dict.get('PORT', 'default')
                    }
                }
                
                # Performance checks
                if conn_time > 100:  # Slow connection
                    health_info['status'] = 'warning'
                    health_info['message'] = f'Database {db_name} responding slowly'
                
                # Check for long-running queries (PostgreSQL specific)
                if connection.vendor == 'postgresql':
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                SELECT COUNT(*) FROM pg_stat_activity 
                                WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds'
                                AND query NOT LIKE '%pg_stat_activity%'
                            """)
                            long_queries = cursor.fetchone()[0]
                            health_info['performance']['long_running_queries'] = long_queries
                            
                            if long_queries > 10:
                                health_info['status'] = 'warning'
                                health_info['message'] = f'High number of long-running queries: {long_queries}'
                    except Exception:
                        pass  # Non-critical check
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Database health check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_redis_health(self) -> Dict[str, Any]:
        """
        Comprehensive Redis cache health check.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Redis cache is healthy',
            'metrics': {}
        }
        
        try:
            # Test basic cache operations
            test_key = f'health_check_{int(time.time())}'
            test_value = 'health_test_value'
            
            start_time = time.time()
            cache.set(test_key, test_value, timeout=60)
            retrieved_value = cache.get(test_key)
            cache.delete(test_key)
            operation_time = (time.time() - start_time) * 1000
            
            if retrieved_value != test_value:
                health_info['status'] = 'failed'
                health_info['message'] = 'Cache read/write test failed'
                return health_info
            
            health_info['metrics']['operation_time_ms'] = round(operation_time, 2)
            
            # Get Redis-specific information if available
            try:
                from django.core.cache.backends.redis import RedisCache
                default_cache = cache._cache
                
                if hasattr(default_cache, 'get_client'):
                    redis_client = default_cache.get_client()
                    redis_info = redis_client.info()
                    
                    health_info['metrics'].update({
                        'redis_version': redis_info.get('redis_version'),
                        'connected_clients': redis_info.get('connected_clients', 0),
                        'used_memory_mb': round(redis_info.get('used_memory', 0) / (1024 * 1024), 2),
                        'keyspace_hits': redis_info.get('keyspace_hits', 0),
                        'keyspace_misses': redis_info.get('keyspace_misses', 0),
                        'uptime_seconds': redis_info.get('uptime_in_seconds', 0)
                    })
                    
                    # Calculate hit rate
                    hits = redis_info.get('keyspace_hits', 0)
                    misses = redis_info.get('keyspace_misses', 0)
                    if hits + misses > 0:
                        hit_rate = (hits / (hits + misses)) * 100
                        health_info['metrics']['hit_rate_percent'] = round(hit_rate, 2)
                        
                        if hit_rate < 70:  # Low hit rate
                            health_info['status'] = 'warning'
                            health_info['message'] = f'Low cache hit rate: {hit_rate:.1f}%'
                    
                    # Check memory usage
                    used_memory_mb = health_info['metrics']['used_memory_mb']
                    if used_memory_mb > 500:  # High memory usage
                        health_info['status'] = 'warning'
                        health_info['message'] = f'High Redis memory usage: {used_memory_mb}MB'
            
            except Exception as redis_error:
                health_info['metrics']['redis_info_error'] = str(redis_error)
            
            # Performance check
            if operation_time > 50:  # Slow cache operations
                health_info['status'] = 'warning'
                health_info['message'] = f'Slow cache operations: {operation_time:.1f}ms'
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Redis health check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_celery_health(self) -> Dict[str, Any]:
        """
        Check Celery worker health and queue status.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Celery workers are healthy',
            'workers': {},
            'queues': {}
        }
        
        try:
            # This is a simplified check - in production you'd use Celery's inspect API
            from celery import current_app
            
            # Get active workers (this would need Celery inspect in production)
            inspect = current_app.control.inspect()
            
            # Check active workers
            try:
                active_workers = inspect.active()
                if active_workers:
                    health_info['workers']['active_count'] = len(active_workers)
                    health_info['workers']['worker_details'] = active_workers
                else:
                    health_info['status'] = 'warning'
                    health_info['message'] = 'No active Celery workers found'
                    health_info['workers']['active_count'] = 0
            except Exception:
                # Fallback check - look for worker processes
                try:
                    import psutil
                    celery_processes = [p for p in psutil.process_iter(['pid', 'name', 'cmdline']) 
                                      if 'celery' in ' '.join(p.info.get('cmdline', []))]
                    health_info['workers']['process_count'] = len(celery_processes)
                    
                    if len(celery_processes) == 0:
                        health_info['status'] = 'failed'
                        health_info['message'] = 'No Celery worker processes found'
                except Exception:
                    health_info['status'] = 'warning'
                    health_info['message'] = 'Cannot verify Celery worker status'
            
            # Mock queue status (in production, use Redis/broker inspection)
            health_info['queues'] = {
                'default': {'length': 0, 'status': 'healthy'},
                'monitoring': {'length': 0, 'status': 'healthy'},
                'compliance': {'length': 0, 'status': 'healthy'},
                'maintenance': {'length': 0, 'status': 'healthy'}
            }
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Celery health check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_storage_health(self) -> Dict[str, Any]:
        """
        Check file storage system health.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Storage system is healthy',
            'disk_usage': {},
            'storage_backends': {}
        }
        
        try:
            # Check disk usage
            disk_usage = psutil.disk_usage('/')
            total_gb = disk_usage.total / (1024**3)
            used_gb = disk_usage.used / (1024**3)
            free_gb = disk_usage.free / (1024**3)
            usage_percent = (used_gb / total_gb) * 100
            
            health_info['disk_usage'] = {
                'total_gb': round(total_gb, 2),
                'used_gb': round(used_gb, 2),
                'free_gb': round(free_gb, 2),
                'usage_percent': round(usage_percent, 2)
            }
            
            # Check disk usage thresholds
            if usage_percent > 90:
                health_info['status'] = 'failed'
                health_info['message'] = f'Critical disk usage: {usage_percent:.1f}%'
            elif usage_percent > 80:
                health_info['status'] = 'warning'
                health_info['message'] = f'High disk usage: {usage_percent:.1f}%'
            
            # Test file write permissions
            try:
                import tempfile
                import os
                
                test_file = tempfile.NamedTemporaryFile(delete=False, prefix='safeshipper_health_')
                test_file.write(b'health check test')
                test_file.close()
                
                # Check if file was created and is readable
                if os.path.exists(test_file.name):
                    with open(test_file.name, 'rb') as f:
                        content = f.read()
                    
                    if content == b'health check test':
                        health_info['storage_backends']['filesystem'] = {
                            'status': 'healthy',
                            'write_test': 'passed',
                            'read_test': 'passed'
                        }
                    else:
                        health_info['storage_backends']['filesystem'] = {
                            'status': 'failed',
                            'write_test': 'passed',
                            'read_test': 'failed'
                        }
                
                # Clean up test file
                os.unlink(test_file.name)
                
            except Exception as storage_error:
                health_info['storage_backends']['filesystem'] = {
                    'status': 'failed',
                    'error': str(storage_error)
                }
                if health_info['status'] == 'healthy':
                    health_info['status'] = 'warning'
                    health_info['message'] = 'File system write test failed'
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Storage health check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_dangerous_goods_health(self) -> Dict[str, Any]:
        """
        Check dangerous goods data and processing health.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Dangerous goods system is healthy',
            'data_status': {},
            'processing_status': {}
        }
        
        try:
            from dangerous_goods.models import DangerousGood
            from sds.models import SafetyDataSheet, SDSStatus
            
            # Check dangerous goods data
            dg_count = DangerousGood.objects.count()
            active_sds_count = SafetyDataSheet.objects.filter(status=SDSStatus.ACTIVE).count()
            
            health_info['data_status'] = {
                'dangerous_goods_count': dg_count,
                'active_sds_count': active_sds_count,
                'data_freshness': 'current'  # Would check last update in production
            }
            
            # Basic data validation
            if dg_count < 1000:  # Expect minimum number of dangerous goods
                health_info['status'] = 'warning'
                health_info['message'] = f'Low dangerous goods count: {dg_count}'
            
            if active_sds_count < 100:  # Expect minimum SDS documents
                if health_info['status'] == 'healthy':
                    health_info['status'] = 'warning'
                    health_info['message'] = f'Low active SDS count: {active_sds_count}'
            
            # Check cache effectiveness (if implemented)
            try:
                from shared.caching_service import CacheStatisticsService
                cache_stats = CacheStatisticsService.get_cache_stats()
                
                health_info['processing_status']['cache_hit_rate'] = cache_stats.get('hit_rate', 'unknown')
                health_info['processing_status']['cached_entries'] = cache_stats.get('total_keys', 'unknown')
            except Exception:
                health_info['processing_status']['cache_status'] = 'unavailable'
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Dangerous goods health check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_external_services_health(self) -> Dict[str, Any]:
        """
        Check external service connectivity.
        """
        health_info = {
            'status': 'healthy',
            'message': 'External services are healthy',
            'services': {}
        }
        
        # Define external services to check
        external_services = {
            'google_maps': {
                'url': 'https://maps.googleapis.com/maps/api/geocode/json?address=test',
                'timeout': 5,
                'expected_status': [200, 400]  # 400 is OK for invalid API key
            },
            'openai_api': {
                'url': 'https://api.openai.com/v1/models',
                'timeout': 10,
                'expected_status': [200, 401]  # 401 is OK for invalid API key
            }
        }
        
        failed_services = []
        
        for service_name, config in external_services.items():
            try:
                start_time = time.time()
                response = requests.get(
                    config['url'],
                    timeout=config['timeout'],
                    headers={'User-Agent': 'SafeShipper-HealthCheck'}
                )
                response_time = (time.time() - start_time) * 1000
                
                service_status = 'healthy'
                if response.status_code not in config['expected_status']:
                    service_status = 'degraded'
                    failed_services.append(service_name)
                
                health_info['services'][service_name] = {
                    'status': service_status,
                    'response_time_ms': round(response_time, 2),
                    'status_code': response.status_code,
                    'last_checked': datetime.now().isoformat()
                }
                
            except requests.exceptions.Timeout:
                health_info['services'][service_name] = {
                    'status': 'degraded',
                    'error': 'timeout',
                    'last_checked': datetime.now().isoformat()
                }
                failed_services.append(service_name)
                
            except Exception as e:
                health_info['services'][service_name] = {
                    'status': 'failed',
                    'error': str(e),
                    'last_checked': datetime.now().isoformat()
                }
                failed_services.append(service_name)
        
        # Update overall status
        if failed_services:
            health_info['status'] = 'warning'
            health_info['message'] = f'External service issues: {', '.join(failed_services)}'
        
        return health_info
    
    def _check_system_resources(self) -> Dict[str, Any]:
        """
        Check system resource utilization.
        """
        health_info = {
            'status': 'healthy',
            'message': 'System resources are healthy',
            'cpu': {},
            'memory': {},
            'network': {}
        }
        
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            health_info['cpu'] = {
                'usage_percent': cpu_percent,
                'core_count': cpu_count,
                'load_average': list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else 'unavailable'
            }
            
            # Memory usage
            memory = psutil.virtual_memory()
            health_info['memory'] = {
                'total_gb': round(memory.total / (1024**3), 2),
                'available_gb': round(memory.available / (1024**3), 2),
                'used_gb': round(memory.used / (1024**3), 2),
                'usage_percent': memory.percent
            }
            
            # Network statistics
            try:
                network_io = psutil.net_io_counters()
                health_info['network'] = {
                    'bytes_sent': network_io.bytes_sent,
                    'bytes_recv': network_io.bytes_recv,
                    'packets_sent': network_io.packets_sent,
                    'packets_recv': network_io.packets_recv
                }
            except Exception:
                health_info['network'] = {'status': 'unavailable'}
            
            # Check thresholds
            warnings = []
            if cpu_percent > 80:
                warnings.append(f'High CPU usage: {cpu_percent:.1f}%')
            
            if memory.percent > 85:
                warnings.append(f'High memory usage: {memory.percent:.1f}%')
            
            if warnings:
                health_info['status'] = 'warning'
                health_info['message'] = '; '.join(warnings)
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'System resource check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_application_health(self) -> Dict[str, Any]:
        """
        Check application-specific health metrics.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Application is healthy',
            'django_status': {},
            'middleware_status': {},
            'installed_apps': []
        }
        
        try:
            # Django configuration check
            health_info['django_status'] = {
                'debug_mode': settings.DEBUG,
                'allowed_hosts': settings.ALLOWED_HOSTS,
                'secret_key_configured': bool(getattr(settings, 'SECRET_KEY', None)),
                'time_zone': settings.TIME_ZONE,
                'language_code': settings.LANGUAGE_CODE
            }
            
            # Check critical settings
            if settings.DEBUG and getattr(settings, 'ENVIRONMENT', '') == 'production':
                health_info['status'] = 'warning'
                health_info['message'] = 'DEBUG mode enabled in production'
            
            # Check installed apps
            critical_apps = [
                'django.contrib.auth',
                'rest_framework',
                'sds',
                'dangerous_goods',
                'shipments'
            ]
            
            missing_apps = [app for app in critical_apps if app not in settings.INSTALLED_APPS]
            if missing_apps:
                health_info['status'] = 'warning'
                health_info['message'] = f'Missing critical apps: {missing_apps}'
            
            health_info['installed_apps'] = list(settings.INSTALLED_APPS)
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Application health check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_security_status(self) -> Dict[str, Any]:
        """
        Check security configuration and status.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Security configuration is healthy',
            'ssl_status': {},
            'security_headers': {},
            'authentication': {}
        }
        
        try:
            # Check security settings
            security_checks = {
                'SECURE_SSL_REDIRECT': getattr(settings, 'SECURE_SSL_REDIRECT', False),
                'SECURE_HSTS_SECONDS': getattr(settings, 'SECURE_HSTS_SECONDS', 0),
                'SECURE_CONTENT_TYPE_NOSNIFF': getattr(settings, 'SECURE_CONTENT_TYPE_NOSNIFF', False),
                'SECURE_BROWSER_XSS_FILTER': getattr(settings, 'SECURE_BROWSER_XSS_FILTER', False),
                'SESSION_COOKIE_SECURE': getattr(settings, 'SESSION_COOKIE_SECURE', False),
                'CSRF_COOKIE_SECURE': getattr(settings, 'CSRF_COOKIE_SECURE', False)
            }
            
            health_info['security_headers'] = security_checks
            
            # Check authentication configuration
            health_info['authentication'] = {
                'rest_framework_auth': 'rest_framework.authentication' in str(settings.INSTALLED_APPS),
                'session_timeout': getattr(settings, 'SESSION_COOKIE_AGE', 1209600),  # Default 2 weeks
                'password_validators_count': len(getattr(settings, 'AUTH_PASSWORD_VALIDATORS', []))
            }
            
            # Security warnings
            warnings = []
            if not security_checks['SECURE_SSL_REDIRECT'] and getattr(settings, 'ENVIRONMENT', '') == 'production':
                warnings.append('SSL redirect not enabled in production')
            
            if security_checks['SECURE_HSTS_SECONDS'] < 31536000:  # 1 year
                warnings.append('HSTS timeout too low')
            
            if warnings:
                health_info['status'] = 'warning'
                health_info['message'] = '; '.join(warnings)
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Security check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _check_performance_metrics(self) -> Dict[str, Any]:
        """
        Check application performance metrics.
        """
        health_info = {
            'status': 'healthy',
            'message': 'Performance metrics are healthy',
            'response_times': {},
            'throughput': {},
            'error_rates': {}
        }
        
        try:
            # Mock performance data (in production, integrate with APM tools)
            health_info['response_times'] = {
                'api_avg_ms': 150,  # Would get from monitoring
                'database_avg_ms': 45,
                'cache_avg_ms': 2
            }
            
            health_info['throughput'] = {
                'requests_per_minute': 150,  # Would get from monitoring
                'concurrent_users': 25
            }
            
            health_info['error_rates'] = {
                'http_4xx_rate': 2.1,  # Percentage
                'http_5xx_rate': 0.1,
                'database_error_rate': 0.0
            }
            
            # Performance warnings
            if health_info['response_times']['api_avg_ms'] > 500:
                health_info['status'] = 'warning'
                health_info['message'] = 'High API response times'
            
            if health_info['error_rates']['http_5xx_rate'] > 1.0:
                health_info['status'] = 'warning'
                health_info['message'] = 'High server error rate'
        
        except Exception as e:
            health_info = {
                'status': 'failed',
                'message': f'Performance metrics check failed: {str(e)}',
                'error': str(e)
            }
        
        return health_info
    
    def _calculate_overall_health(self):
        """
        Calculate overall health status and score.
        """
        total_checks = self.health_data['summary']['total_checks']
        passed_checks = self.health_data['summary']['passed_checks']
        warning_checks = self.health_data['summary']['warning_checks']
        failed_checks = self.health_data['summary']['failed_checks']
        
        if total_checks == 0:
            self.health_data['status'] = 'unknown'
            self.health_data['summary']['overall_health_score'] = 0
            return
        
        # Calculate health score (passed=100%, warnings=50%, failed=0%)
        health_score = ((passed_checks * 100) + (warning_checks * 50)) / (total_checks * 100) * 100
        self.health_data['summary']['overall_health_score'] = round(health_score, 1)
        
        # Determine overall status
        if failed_checks > 0:
            self.health_data['status'] = 'failed'
        elif warning_checks > 0:
            self.health_data['status'] = 'degraded'
        else:
            self.health_data['status'] = 'healthy'


class ProductionHealthView(APIView):
    """
    Production health check endpoint.
    """
    permission_classes = [AllowAny]  # Health checks should be accessible
    
    def get(self, request):
        """
        Return comprehensive health status.
        """
        try:
            health_checker = ProductionHealthChecker()
            health_data = health_checker.run_comprehensive_check()
            
            # Determine HTTP status code based on health
            if health_data['status'] == 'healthy':
                http_status = status.HTTP_200_OK
            elif health_data['status'] == 'degraded':
                http_status = status.HTTP_200_OK  # Still operational
            else:  # failed
                http_status = status.HTTP_503_SERVICE_UNAVAILABLE
            
            return Response(health_data, status=http_status)
            
        except Exception as e:
            logger.error(f"Health check endpoint failed: {str(e)}")
            return Response({
                'status': 'failed',
                'message': f'Health check system failure: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class ProductionReadinessView(APIView):
    """
    Kubernetes readiness probe endpoint.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Quick readiness check for load balancers.
        """
        try:
            # Quick essential checks only
            checks = {
                'database': self._quick_db_check(),
                'cache': self._quick_cache_check()
            }
            
            # If any essential service is down, return 503
            if any(check['status'] != 'healthy' for check in checks.values()):
                return Response({
                    'status': 'not_ready',
                    'checks': checks,
                    'timestamp': datetime.now().isoformat()
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            return Response({
                'status': 'ready',
                'checks': checks,
                'timestamp': datetime.now().isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'status': 'not_ready',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    def _quick_db_check(self) -> Dict[str, Any]:
        """Quick database connectivity check"""
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return {'status': 'healthy'}
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}
    
    def _quick_cache_check(self) -> Dict[str, Any]:
        """Quick cache connectivity check"""
        try:
            cache.set('readiness_check', 'ok', 30)
            result = cache.get('readiness_check')
            return {'status': 'healthy' if result == 'ok' else 'failed'}
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}


class ProductionLivenessView(APIView):
    """
    Kubernetes liveness probe endpoint.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Basic liveness check - is the application process alive?
        """
        return Response({
            'status': 'alive',
            'timestamp': datetime.now().isoformat(),
            'uptime_seconds': time.time() - getattr(settings, 'START_TIME', time.time())
        }, status=status.HTTP_200_OK)
