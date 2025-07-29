# shared/health_service.py
"""
Comprehensive health check service for SafeShipper critical systems.
Monitors database, cache, external services, and application-specific components.
"""

import logging
import time
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from django.db import connections, DatabaseError
from django.core.cache import cache
from django.conf import settings
from django.core.mail import get_connection
from django.utils import timezone
import requests
import redis

logger = logging.getLogger(__name__)


class HealthCheckService:
    """
    Comprehensive health check service for SafeShipper platform.
    Monitors all critical services and dependencies.
    """
    
    CRITICAL_SERVICES = [
        'database',
        'cache',
        'dangerous_goods_data',
        'file_storage',
        'email_service'
    ]
    
    OPTIONAL_SERVICES = [
        'celery_workers',
        'external_apis',
        'monitoring_services'
    ]
    
    @classmethod
    def comprehensive_health_check(cls) -> Dict[str, Any]:
        """
        Perform comprehensive health check of all SafeShipper services.
        """
        start_time = time.time()
        health_data = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'version': getattr(settings, 'SAFESHIPPER_VERSION', '1.0.0'),
            'environment': getattr(settings, 'ENVIRONMENT', 'development'),
            'services': {},
            'system_metrics': {},
            'summary': {
                'total_services': 0,
                'healthy_services': 0,
                'degraded_services': 0,
                'failed_services': 0
            }
        }
        
        try:
            # Check critical services
            for service_name in cls.CRITICAL_SERVICES:
                health_data['services'][service_name] = cls._check_service(service_name)
            
            # Check optional services
            for service_name in cls.OPTIONAL_SERVICES:
                health_data['services'][service_name] = cls._check_service(service_name)
            
            # Get system metrics
            health_data['system_metrics'] = cls._get_system_metrics()
            
            # Calculate summary
            cls._calculate_health_summary(health_data)
            
            # Determine overall status
            if health_data['summary']['failed_services'] > 0:
                health_data['status'] = 'unhealthy'
            elif health_data['summary']['degraded_services'] > 0:
                health_data['status'] = 'degraded'
            else:
                health_data['status'] = 'healthy'
            
            # Add response time
            health_data['response_time_ms'] = round((time.time() - start_time) * 1000, 2)
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            health_data['status'] = 'unhealthy'
            health_data['error'] = str(e)
        
        return health_data
    
    @classmethod
    def _check_service(cls, service_name: str) -> Dict[str, Any]:
        """Check health of a specific service."""
        service_methods = {
            'database': cls._check_database,
            'cache': cls._check_cache,
            'dangerous_goods_data': cls._check_dangerous_goods_data,
            'file_storage': cls._check_file_storage,
            'email_service': cls._check_email_service,
            'celery_workers': cls._check_celery_workers,
            'external_apis': cls._check_external_apis,
            'monitoring_services': cls._check_monitoring_services
        }
        
        method = service_methods.get(service_name)
        if not method:
            return {
                'status': 'unknown',
                'message': f'No health check implemented for {service_name}'
            }
        
        try:
            return method()
        except Exception as e:
            logger.error(f"Health check failed for {service_name}: {str(e)}")
            return {
                'status': 'failed',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _check_database(cls) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        start_time = time.time()
        
        try:
            # Test default database connection
            db_conn = connections['default']
            
            with db_conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            if result != (1,):
                return {
                    'status': 'failed',
                    'message': 'Database query returned unexpected result'
                }
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            # Check for slow responses
            status = 'healthy'
            if response_time > 1000:  # 1 second
                status = 'degraded'
            elif response_time > 5000:  # 5 seconds
                status = 'failed'
            
            return {
                'status': status,
                'response_time_ms': response_time,
                'message': 'Database connection successful',
                'timestamp': datetime.now().isoformat()
            }
            
        except DatabaseError as e:
            return {
                'status': 'failed',
                'message': f'Database connection failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _check_cache(cls) -> Dict[str, Any]:
        """Check cache (Redis) connectivity and performance."""
        start_time = time.time()
        
        try:
            # Test cache with a simple set/get operation
            test_key = f'health_check_{int(time.time())}'
            test_value = 'health_check_value'
            
            cache.set(test_key, test_value, timeout=60)
            retrieved_value = cache.get(test_key)
            cache.delete(test_key)
            
            if retrieved_value != test_value:
                return {
                    'status': 'failed',
                    'message': 'Cache set/get test failed'
                }
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            # Get cache statistics if Redis is available
            cache_stats = {}
            try:
                if hasattr(settings, 'CACHES') and 'default' in settings.CACHES:
                    r = redis.Redis.from_url(settings.CACHES['default']['LOCATION'])
                    info = r.info()
                    cache_stats = {
                        'memory_usage_mb': round(info.get('used_memory', 0) / (1024 * 1024), 2),
                        'hit_rate': info.get('keyspace_hit_rate', 0),
                        'connected_clients': info.get('connected_clients', 0)
                    }
            except Exception:
                cache_stats = {'redis_info': 'unavailable'}
            
            status = 'healthy'
            if response_time > 500:  # 500ms
                status = 'degraded'
            elif response_time > 2000:  # 2 seconds
                status = 'failed'
            
            return {
                'status': status,
                'response_time_ms': response_time,
                'statistics': cache_stats,
                'message': 'Cache operational',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Cache check failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _check_dangerous_goods_data(cls) -> Dict[str, Any]:
        """Check dangerous goods data availability and integrity."""
        try:
            from dangerous_goods.models import DangerousGood
            
            start_time = time.time()
            
            # Count total dangerous goods
            total_dg = DangerousGood.objects.count()
            
            # Check for critical UN numbers (sample validation)
            critical_un_numbers = ['UN1203', 'UN1789', 'UN2790', 'UN1090']
            missing_critical = []
            
            for un_number in critical_un_numbers:
                if not DangerousGood.objects.filter(un_number=un_number).exists():
                    missing_critical.append(un_number)
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            # Determine status
            status = 'healthy'
            message = f'{total_dg} dangerous goods records available'
            
            if total_dg < 100:
                status = 'failed'
                message = f'Insufficient dangerous goods data: only {total_dg} records'
            elif missing_critical:
                status = 'degraded'
                message = f'{total_dg} records available, but missing critical UN numbers: {missing_critical}'
            
            return {
                'status': status,
                'response_time_ms': response_time,
                'total_records': total_dg,
                'missing_critical_un_numbers': missing_critical,
                'message': message,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Dangerous goods data check failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _check_file_storage(cls) -> Dict[str, Any]:
        """Check file storage system availability."""
        try:
            from django.core.files.storage import default_storage
            
            start_time = time.time()
            
            # Test file operations
            test_filename = f'health_check_{int(time.time())}.txt'
            test_content = b'SafeShipper health check test file'
            
            # Test write
            saved_name = default_storage.save(test_filename, test_content)
            
            # Test read
            if default_storage.exists(saved_name):
                with default_storage.open(saved_name, 'rb') as f:
                    read_content = f.read()
                
                # Clean up
                default_storage.delete(saved_name)
                
                if read_content != test_content:
                    return {
                        'status': 'failed',
                        'message': 'File storage read/write test failed'
                    }
            else:
                return {
                    'status': 'failed',
                    'message': 'File storage write test failed'
                }
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            status = 'healthy'
            if response_time > 2000:  # 2 seconds
                status = 'degraded'
            elif response_time > 10000:  # 10 seconds
                status = 'failed'
            
            return {
                'status': status,
                'response_time_ms': response_time,
                'storage_backend': str(type(default_storage).__name__),
                'message': 'File storage operational',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'File storage check failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _check_email_service(cls) -> Dict[str, Any]:
        """Check email service configuration and connectivity."""
        try:
            start_time = time.time()
            
            # Test email backend connection
            connection = get_connection()
            connection.open()
            connection.close()
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                'status': 'healthy',
                'response_time_ms': response_time,
                'backend': str(type(connection).__name__),
                'message': 'Email service connection successful',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'degraded',  # Email is not critical for core functionality
                'message': f'Email service check failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _check_celery_workers(cls) -> Dict[str, Any]:
        """Check Celery workers status."""
        try:
            from celery import current_app
            
            start_time = time.time()
            
            # Get active workers
            inspect = current_app.control.inspect()
            active_workers = inspect.active()
            
            if not active_workers:
                return {
                    'status': 'degraded',
                    'message': 'No active Celery workers found',
                    'active_workers': 0,
                    'timestamp': datetime.now().isoformat()
                }
            
            worker_count = len(active_workers)
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                'status': 'healthy',
                'response_time_ms': response_time,
                'active_workers': worker_count,
                'worker_nodes': list(active_workers.keys()),
                'message': f'{worker_count} Celery workers active',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'degraded',
                'message': f'Celery workers check failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _check_external_apis(cls) -> Dict[str, Any]:
        """Check external API dependencies."""
        external_apis = {
            'google_maps': getattr(settings, 'GOOGLE_MAPS_API_KEY', None),
            'sso_providers': getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {})
        }
        
        api_statuses = {}
        overall_status = 'healthy'
        
        # Check Google Maps API if configured
        if external_apis['google_maps']:
            try:
                # Simple geocoding test
                test_url = 'https://maps.googleapis.com/maps/api/geocode/json'
                params = {
                    'address': 'Sydney, Australia',
                    'key': external_apis['google_maps']
                }
                
                start_time = time.time()
                response = requests.get(test_url, params=params, timeout=10)
                response_time = round((time.time() - start_time) * 1000, 2)
                
                if response.status_code == 200:
                    api_statuses['google_maps'] = {
                        'status': 'healthy',
                        'response_time_ms': response_time
                    }
                else:
                    api_statuses['google_maps'] = {
                        'status': 'failed',
                        'error': f'HTTP {response.status_code}'
                    }
                    overall_status = 'degraded'
                    
            except Exception as e:
                api_statuses['google_maps'] = {
                    'status': 'failed',
                    'error': str(e)
                }
                overall_status = 'degraded'
        else:
            api_statuses['google_maps'] = {'status': 'not_configured'}
        
        return {
            'status': overall_status,
            'apis': api_statuses,
            'message': 'External API checks completed',
            'timestamp': datetime.now().isoformat()
        }
    
    @classmethod
    def _check_monitoring_services(cls) -> Dict[str, Any]:
        """Check monitoring and observability services."""
        try:
            # Check if logging is working
            test_logger = logging.getLogger('health_check')
            test_logger.info('Health check logging test')
            
            monitoring_status = {
                'logging': 'healthy',
                'metrics_collection': 'not_configured',  # Would check Prometheus/etc
                'error_tracking': 'not_configured'       # Would check Sentry/etc
            }
            
            return {
                'status': 'healthy',
                'components': monitoring_status,
                'message': 'Monitoring services checked',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'degraded',
                'message': f'Monitoring services check failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _get_system_metrics(cls) -> Dict[str, Any]:
        """Get system performance metrics."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Load average (Unix-like systems)
            try:
                load_avg = psutil.getloadavg()
            except (AttributeError, OSError):
                load_avg = None
            
            return {
                'cpu_usage_percent': cpu_percent,
                'memory': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'available_gb': round(memory.available / (1024**3), 2),
                    'used_percent': memory.percent
                },
                'disk': {
                    'total_gb': round(disk.total / (1024**3), 2),
                    'free_gb': round(disk.free / (1024**3), 2),
                    'used_percent': round((disk.used / disk.total) * 100, 2)
                },
                'load_average': load_avg,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"System metrics collection failed: {str(e)}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _calculate_health_summary(cls, health_data: Dict[str, Any]) -> None:
        """Calculate health summary statistics."""
        services = health_data.get('services', {})
        
        total = len(services)
        healthy = sum(1 for s in services.values() if s.get('status') == 'healthy')
        degraded = sum(1 for s in services.values() if s.get('status') == 'degraded')
        failed = sum(1 for s in services.values() if s.get('status') == 'failed')
        
        health_data['summary'] = {
            'total_services': total,
            'healthy_services': healthy,
            'degraded_services': degraded,
            'failed_services': failed,
            'health_percentage': round((healthy / total) * 100, 2) if total > 0 else 0
        }


class ServiceDependencyChecker:
    """
    Service for checking specific SafeShipper service dependencies.
    """
    
    @classmethod
    def check_dangerous_goods_dependencies(cls) -> Dict[str, Any]:
        """Check dependencies specific to dangerous goods operations."""
        dependencies = {
            'dangerous_goods_models': cls._check_dangerous_goods_models(),
            'segregation_rules': cls._check_segregation_rules(),
            'emergency_procedures': cls._check_emergency_procedures(),
            'placard_rules': cls._check_placard_rules()
        }
        
        overall_status = 'healthy'
        for dep_status in dependencies.values():
            if dep_status.get('status') == 'failed':
                overall_status = 'failed'
                break
            elif dep_status.get('status') == 'degraded' and overall_status == 'healthy':
                overall_status = 'degraded'
        
        return {
            'status': overall_status,
            'dependencies': dependencies,
            'timestamp': datetime.now().isoformat()
        }
    
    @classmethod
    def _check_dangerous_goods_models(cls) -> Dict[str, Any]:
        """Check dangerous goods model data integrity."""
        try:
            from dangerous_goods.models import DangerousGood, SegregationRule
            
            # Check for required data
            dg_count = DangerousGood.objects.count()
            rules_count = SegregationRule.objects.count()
            
            if dg_count < 50:  # Minimum expected dangerous goods
                return {
                    'status': 'failed',
                    'message': f'Insufficient dangerous goods data: {dg_count} records'
                }
            
            if rules_count < 10:  # Minimum expected segregation rules
                return {
                    'status': 'degraded',
                    'message': f'Limited segregation rules: {rules_count} rules'
                }
            
            return {
                'status': 'healthy',
                'dangerous_goods_count': dg_count,
                'segregation_rules_count': rules_count,
                'message': 'Dangerous goods models healthy'
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Dangerous goods models check failed: {str(e)}'
            }
    
    @classmethod
    def _check_segregation_rules(cls) -> Dict[str, Any]:
        """Check segregation rules completeness."""
        try:
            from dangerous_goods.models import SegregationRule
            
            # Check for rules covering major hazard classes
            major_classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
            covered_classes = set()
            
            rules = SegregationRule.objects.all()
            for rule in rules:
                if rule.primary_hazard_class:
                    covered_classes.add(rule.primary_hazard_class.split('.')[0])
                if rule.secondary_hazard_class:
                    covered_classes.add(rule.secondary_hazard_class.split('.')[0])
            
            missing_classes = set(major_classes) - covered_classes
            
            if len(missing_classes) > 3:
                return {
                    'status': 'failed',
                    'message': f'Many hazard classes without segregation rules: {missing_classes}'
                }
            elif missing_classes:
                return {
                    'status': 'degraded',
                    'message': f'Some hazard classes without segregation rules: {missing_classes}'
                }
            
            return {
                'status': 'healthy',
                'covered_hazard_classes': list(covered_classes),
                'message': 'Segregation rules coverage complete'
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Segregation rules check failed: {str(e)}'
            }
    
    @classmethod
    def _check_emergency_procedures(cls) -> Dict[str, Any]:
        """Check emergency procedures availability."""
        try:
            from emergency_procedures.models import EmergencyProcedure
            
            active_procedures = EmergencyProcedure.objects.filter(status='ACTIVE').count()
            
            if active_procedures < 5:
                return {
                    'status': 'degraded',
                    'message': f'Limited emergency procedures: {active_procedures} active'
                }
            
            return {
                'status': 'healthy',
                'active_procedures': active_procedures,
                'message': 'Emergency procedures available'
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Emergency procedures check failed: {str(e)}'
            }
    
    @classmethod
    def _check_placard_rules(cls) -> Dict[str, Any]:
        """Check placard rules availability."""
        try:
            # This would check placard-related models if they exist
            # For now, return basic status
            return {
                'status': 'healthy',
                'message': 'Placard rules check not implemented'
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Placard rules check failed: {str(e)}'
            }