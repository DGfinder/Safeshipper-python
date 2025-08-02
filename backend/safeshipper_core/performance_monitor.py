# SafeShipper Performance Monitoring and Validation
"""
Comprehensive performance monitoring system for SafeShipper.
Tracks database performance, cache hit rates, API response times,
and system health metrics.
"""

import logging
import time
import psutil
import threading
from datetime import datetime, timedelta
from django.core.cache import cache
from django.db import connection
from django.conf import settings
from typing import Dict, List, Optional
import json

logger = logging.getLogger(__name__)


class PerformanceMetrics:
    """Collects and manages performance metrics"""
    
    def __init__(self):
        self.metrics = {
            'database': {
                'query_count': 0,
                'slow_queries': [],
                'avg_query_time': 0.0,
                'connection_count': 0
            },
            'cache': {
                'hit_count': 0,
                'miss_count': 0,
                'hit_rate': 0.0,
                'total_operations': 0
            },
            'api': {
                'request_count': 0,
                'avg_response_time': 0.0,
                'slow_requests': [],
                'error_count': 0
            },
            'system': {
                'cpu_percent': 0.0,
                'memory_percent': 0.0,
                'disk_usage': 0.0,
                'uptime': 0
            }
        }
        self._lock = threading.Lock()
    
    def record_database_query(self, query_time: float, query: str):
        """Record database query performance"""
        with self._lock:
            self.metrics['database']['query_count'] += 1
            
            # Track slow queries (>500ms)
            if query_time > 0.5:
                self.metrics['database']['slow_queries'].append({
                    'query': query[:200] + '...' if len(query) > 200 else query,
                    'time': query_time,
                    'timestamp': datetime.now().isoformat()
                })
                
                # Keep only last 50 slow queries
                if len(self.metrics['database']['slow_queries']) > 50:
                    self.metrics['database']['slow_queries'] = \
                        self.metrics['database']['slow_queries'][-50:]
            
            # Update average query time
            current_avg = self.metrics['database']['avg_query_time']
            count = self.metrics['database']['query_count']
            self.metrics['database']['avg_query_time'] = \
                ((current_avg * (count - 1)) + query_time) / count
    
    def record_cache_operation(self, hit: bool):
        """Record cache hit/miss"""
        with self._lock:
            self.metrics['cache']['total_operations'] += 1
            
            if hit:
                self.metrics['cache']['hit_count'] += 1
            else:
                self.metrics['cache']['miss_count'] += 1
            
            # Update hit rate
            total = self.metrics['cache']['total_operations']
            hits = self.metrics['cache']['hit_count']
            self.metrics['cache']['hit_rate'] = (hits / total) * 100 if total > 0 else 0
    
    def record_api_request(self, response_time: float, error: bool = False):
        """Record API request performance"""
        with self._lock:
            self.metrics['api']['request_count'] += 1
            
            if error:
                self.metrics['api']['error_count'] += 1
            
            # Track slow requests (>2s)
            if response_time > 2.0:
                self.metrics['api']['slow_requests'].append({
                    'response_time': response_time,
                    'timestamp': datetime.now().isoformat(),
                    'error': error
                })
                
                # Keep only last 50 slow requests
                if len(self.metrics['api']['slow_requests']) > 50:
                    self.metrics['api']['slow_requests'] = \
                        self.metrics['api']['slow_requests'][-50:]
            
            # Update average response time
            current_avg = self.metrics['api']['avg_response_time']
            count = self.metrics['api']['request_count']
            self.metrics['api']['avg_response_time'] = \
                ((current_avg * (count - 1)) + response_time) / count
    
    def update_system_metrics(self):
        """Update system resource metrics"""
        try:
            with self._lock:
                self.metrics['system']['cpu_percent'] = psutil.cpu_percent(interval=1)
                self.metrics['system']['memory_percent'] = psutil.virtual_memory().percent
                self.metrics['system']['disk_usage'] = psutil.disk_usage('/').percent
                self.metrics['system']['uptime'] = time.time() - psutil.boot_time()
                
                # Database connection count
                self.metrics['database']['connection_count'] = len(connection.queries)
                
        except Exception as e:
            logger.error(f"Failed to update system metrics: {str(e)}")
    
    def get_metrics_summary(self) -> Dict:
        """Get current metrics summary"""
        with self._lock:
            return {
                'timestamp': datetime.now().isoformat(),
                'database': {
                    'total_queries': self.metrics['database']['query_count'],
                    'avg_query_time_ms': round(self.metrics['database']['avg_query_time'] * 1000, 2),
                    'slow_queries_count': len(self.metrics['database']['slow_queries']),
                    'connection_count': self.metrics['database']['connection_count']
                },
                'cache': {
                    'hit_rate_percent': round(self.metrics['cache']['hit_rate'], 2),
                    'total_operations': self.metrics['cache']['total_operations'],
                    'hits': self.metrics['cache']['hit_count'],
                    'misses': self.metrics['cache']['miss_count']
                },
                'api': {
                    'total_requests': self.metrics['api']['request_count'],
                    'avg_response_time_ms': round(self.metrics['api']['avg_response_time'] * 1000, 2),
                    'slow_requests_count': len(self.metrics['api']['slow_requests']),
                    'error_count': self.metrics['api']['error_count'],
                    'error_rate_percent': round((self.metrics['api']['error_count'] / 
                                               max(self.metrics['api']['request_count'], 1)) * 100, 2)
                },
                'system': {
                    'cpu_percent': self.metrics['system']['cpu_percent'],
                    'memory_percent': self.metrics['system']['memory_percent'],
                    'disk_usage_percent': self.metrics['system']['disk_usage'],
                    'uptime_hours': round(self.metrics['system']['uptime'] / 3600, 2)
                }
            }
    
    def get_slow_queries(self, limit: int = 10) -> List[Dict]:
        """Get recent slow queries"""
        with self._lock:
            return self.metrics['database']['slow_queries'][-limit:]
    
    def get_slow_requests(self, limit: int = 10) -> List[Dict]:
        """Get recent slow API requests"""
        with self._lock:
            return self.metrics['api']['slow_requests'][-limit:]
    
    def reset_metrics(self):
        """Reset all metrics (useful for testing)"""
        with self._lock:
            self.__init__()


# Global performance metrics instance
performance_metrics = PerformanceMetrics()


class DatabasePerformanceMiddleware:
    """Middleware to track database query performance"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Clear queries at start of request
        connection.queries_log.clear()
        
        start_time = time.time()
        response = self.get_response(request)
        end_time = time.time()
        
        # Record API request performance
        response_time = end_time - start_time
        error = response.status_code >= 400
        performance_metrics.record_api_request(response_time, error)
        
        # Record database queries
        for query in connection.queries:
            query_time = float(query['time'])
            performance_metrics.record_database_query(query_time, query['sql'])
        
        return response


class CachePerformanceTracker:
    """Tracks cache performance by wrapping cache operations"""
    
    def __init__(self, cache_backend):
        self.cache = cache_backend
    
    def get(self, key, default=None):
        """Tracked cache get operation"""
        result = self.cache.get(key, default)
        hit = result is not None and result != default
        performance_metrics.record_cache_operation(hit)
        return result
    
    def set(self, key, value, timeout=None):
        """Tracked cache set operation"""
        return self.cache.set(key, value, timeout)
    
    def delete(self, key):
        """Tracked cache delete operation"""
        return self.cache.delete(key)
    
    def __getattr__(self, name):
        """Delegate other methods to the underlying cache"""
        return getattr(self.cache, name)


class HealthChecker:
    """System health monitoring and alerts"""
    
    THRESHOLDS = {
        'cpu_critical': 90.0,
        'cpu_warning': 70.0,
        'memory_critical': 90.0,
        'memory_warning': 70.0,
        'disk_critical': 90.0,  
        'disk_warning': 80.0,
        'slow_query_threshold': 1.0,  # seconds
        'slow_request_threshold': 3.0,  # seconds
        'cache_hit_rate_minimum': 70.0,  # percent
        'error_rate_maximum': 5.0  # percent
    }
    
    @classmethod
    def check_system_health(cls) -> Dict:
        """Comprehensive system health check"""
        performance_metrics.update_system_metrics()
        metrics = performance_metrics.get_metrics_summary()
        
        health_status = {
            'overall_status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'checks': {},
            'alerts': []
        }
        
        # CPU Check
        cpu_percent = metrics['system']['cpu_percent']
        if cpu_percent >= cls.THRESHOLDS['cpu_critical']:
            health_status['checks']['cpu'] = 'critical'
            health_status['alerts'].append(f'CPU usage critical: {cpu_percent}%')
            health_status['overall_status'] = 'critical'
        elif cpu_percent >= cls.THRESHOLDS['cpu_warning']:
            health_status['checks']['cpu'] = 'warning'
            health_status['alerts'].append(f'CPU usage high: {cpu_percent}%')
            if health_status['overall_status'] == 'healthy':
                health_status['overall_status'] = 'warning'
        else:
            health_status['checks']['cpu'] = 'healthy'
        
        # Memory Check
        memory_percent = metrics['system']['memory_percent']
        if memory_percent >= cls.THRESHOLDS['memory_critical']:
            health_status['checks']['memory'] = 'critical'
            health_status['alerts'].append(f'Memory usage critical: {memory_percent}%')
            health_status['overall_status'] = 'critical'
        elif memory_percent >= cls.THRESHOLDS['memory_warning']:
            health_status['checks']['memory'] = 'warning'
            health_status['alerts'].append(f'Memory usage high: {memory_percent}%')
            if health_status['overall_status'] == 'healthy':
                health_status['overall_status'] = 'warning'
        else:
            health_status['checks']['memory'] = 'healthy'
        
        # Database Check
        avg_query_time = metrics['database']['avg_query_time_ms'] / 1000
        if avg_query_time >= cls.THRESHOLDS['slow_query_threshold']:
            health_status['checks']['database'] = 'warning'
            health_status['alerts'].append(f'Slow database queries detected: {avg_query_time:.2f}s avg')
            if health_status['overall_status'] == 'healthy':
                health_status['overall_status'] = 'warning'
        else:
            health_status['checks']['database'] = 'healthy'
        
        # Cache Check
        cache_hit_rate = metrics['cache']['hit_rate_percent']
        if cache_hit_rate < cls.THRESHOLDS['cache_hit_rate_minimum'] and metrics['cache']['total_operations'] > 100:
            health_status['checks']['cache'] = 'warning'
            health_status['alerts'].append(f'Low cache hit rate: {cache_hit_rate}%')
            if health_status['overall_status'] == 'healthy':
                health_status['overall_status'] = 'warning'
        else:
            health_status['checks']['cache'] = 'healthy'
        
        # API Performance Check
        error_rate = metrics['api']['error_rate_percent']
        if error_rate >= cls.THRESHOLDS['error_rate_maximum']:
            health_status['checks']['api'] = 'warning'
            health_status['alerts'].append(f'High API error rate: {error_rate}%')
            if health_status['overall_status'] == 'healthy':
                health_status['overall_status'] = 'warning'
        else:
            health_status['checks']['api'] = 'healthy'
        
        health_status['metrics'] = metrics
        return health_status
    
    @classmethod
    def check_database_connection(cls) -> Dict:
        """Check database connectivity and performance"""
        try:
            start_time = time.time()
            
            # Simple database query
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            end_time = time.time()
            response_time = end_time - start_time
            
            return {
                'status': 'healthy',
                'response_time_ms': round(response_time * 1000, 2),
                'message': 'Database connection successful'
            }
            
        except Exception as e:
            return {
                'status': 'critical',
                'error': str(e),
                'message': 'Database connection failed'
            }
    
    @classmethod
    def check_redis_connection(cls) -> Dict:
        """Check Redis connectivity and performance"""
        try:
            start_time = time.time()
            
            # Test Redis connection
            cache.set('health_check', 'test', 60)
            result = cache.get('health_check')
            cache.delete('health_check')
            
            end_time = time.time()
            response_time = end_time - start_time
            
            if result == 'test':
                return {
                    'status': 'healthy',
                    'response_time_ms': round(response_time * 1000, 2),
                    'message': 'Redis connection successful'
                }
            else:
                return {
                    'status': 'warning',
                    'message': 'Redis connection issues detected'
                }
                
        except Exception as e:
            return {
                'status': 'critical',
                'error': str(e),
                'message': 'Redis connection failed'
            }


def get_performance_report() -> Dict:
    """Generate comprehensive performance report"""
    health_check = HealthChecker.check_system_health()
    db_check = HealthChecker.check_database_connection()
    redis_check = HealthChecker.check_redis_connection()
    
    return {
        'report_timestamp': datetime.now().isoformat(),
        'overall_health': health_check['overall_status'],
        'system_health': health_check,
        'database_health': db_check,
        'redis_health': redis_check,
        'slow_queries': performance_metrics.get_slow_queries(),
        'slow_requests': performance_metrics.get_slow_requests(),
        'recommendations': generate_performance_recommendations(health_check)
    }


def generate_performance_recommendations(health_check: Dict) -> List[str]:
    """Generate performance improvement recommendations"""
    recommendations = []
    metrics = health_check.get('metrics', {})
    
    # CPU recommendations
    if metrics.get('system', {}).get('cpu_percent', 0) > 70:
        recommendations.append("Consider scaling up CPU resources or optimizing CPU-intensive operations")
    
    # Memory recommendations  
    if metrics.get('system', {}).get('memory_percent', 0) > 70:
        recommendations.append("Consider increasing memory allocation or optimizing memory usage")
    
    # Database recommendations
    if metrics.get('database', {}).get('avg_query_time_ms', 0) > 500:
        recommendations.append("Review slow database queries and consider adding indexes")
    
    # Cache recommendations
    if metrics.get('cache', {}).get('hit_rate_percent', 100) < 70:
        recommendations.append("Improve cache strategy to increase hit rate")
    
    # API recommendations
    if metrics.get('api', {}).get('error_rate_percent', 0) > 2:
        recommendations.append("Investigate and fix API errors to improve reliability")
    
    if metrics.get('api', {}).get('avg_response_time_ms', 0) > 1000:
        recommendations.append("Optimize API response times through caching and query optimization")
    
    return recommendations