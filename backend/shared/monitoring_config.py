# shared/monitoring_config.py
"""
Monitoring configuration for SafeShipper health checks.
Provides configuration for external monitoring systems like Prometheus, Nagios, etc.
"""

from datetime import timedelta
from typing import Dict, List, Any


class MonitoringConfig:
    """
    Configuration for SafeShipper monitoring and alerting.
    """
    
    # Health check intervals
    HEALTH_CHECK_INTERVALS = {
        'basic': timedelta(minutes=1),           # Basic health check every minute
        'comprehensive': timedelta(minutes=5),   # Comprehensive check every 5 minutes
        'detailed': timedelta(minutes=15),       # Detailed check every 15 minutes
        'dependencies': timedelta(hours=1),      # Dependencies check every hour
    }
    
    # Service level objectives (SLOs)
    SERVICE_SLOS = {
        'database': {
            'response_time_ms': 1000,    # Database queries should complete in <1s
            'availability': 99.9,        # 99.9% uptime requirement
            'critical': True
        },
        'cache': {
            'response_time_ms': 100,     # Cache operations should complete in <100ms
            'availability': 99.5,        # 99.5% uptime requirement
            'critical': True
        },
        'dangerous_goods_data': {
            'response_time_ms': 2000,    # DG data queries should complete in <2s
            'availability': 99.9,        # 99.9% uptime requirement
            'critical': True
        },
        'file_storage': {
            'response_time_ms': 5000,    # File operations should complete in <5s
            'availability': 99.0,        # 99.0% uptime requirement
            'critical': True
        },
        'email_service': {
            'response_time_ms': 10000,   # Email operations should complete in <10s
            'availability': 95.0,        # 95.0% uptime requirement
            'critical': False
        },
        'celery_workers': {
            'min_workers': 2,            # Minimum number of active workers
            'availability': 98.0,        # 98.0% uptime requirement
            'critical': False
        },
        'external_apis': {
            'response_time_ms': 15000,   # External API calls in <15s
            'availability': 95.0,        # 95.0% uptime requirement
            'critical': False
        }
    }
    
    # System metrics thresholds
    SYSTEM_THRESHOLDS = {
        'cpu_usage_percent': {
            'warning': 70,
            'critical': 85
        },
        'memory_usage_percent': {
            'warning': 75,
            'critical': 90
        },
        'disk_usage_percent': {
            'warning': 80,
            'critical': 95
        },
        'response_time_ms': {
            'warning': 5000,
            'critical': 15000
        }
    }
    
    # Alerting configuration
    ALERT_CONFIG = {
        'channels': {
            'email': {
                'enabled': True,
                'recipients': [
                    'ops-team@safeshipper.com',
                    'admin@safeshipper.com'
                ],
                'severity_levels': ['critical', 'warning']
            },
            'slack': {
                'enabled': True,
                'webhook_url': 'https://hooks.slack.com/services/...',
                'channel': '#safeshipper-alerts',
                'severity_levels': ['critical']
            },
            'pagerduty': {
                'enabled': True,
                'integration_key': 'your-pagerduty-key',
                'severity_levels': ['critical']
            }
        },
        'escalation': {
            'warning_threshold': 3,      # Number of consecutive warnings before escalation
            'critical_threshold': 1,     # Number of consecutive criticals before immediate escalation
            'escalation_delay': timedelta(minutes=15)
        }
    }
    
    # Prometheus metrics configuration
    PROMETHEUS_METRICS = {
        'safeshipper_health_status': {
            'type': 'gauge',
            'description': 'Overall SafeShipper system health status (1=healthy, 0.5=degraded, 0=unhealthy)',
            'labels': ['environment', 'version']
        },
        'safeshipper_service_health': {
            'type': 'gauge',
            'description': 'Individual service health status',
            'labels': ['service_name', 'status']
        },
        'safeshipper_service_response_time': {
            'type': 'histogram',
            'description': 'Service response time in milliseconds',
            'labels': ['service_name'],
            'buckets': [10, 50, 100, 500, 1000, 5000, 10000]
        },
        'safeshipper_dangerous_goods_records': {
            'type': 'gauge',
            'description': 'Total number of dangerous goods records',
            'labels': ['record_type']
        },
        'safeshipper_cache_hit_rate': {
            'type': 'gauge',
            'description': 'Cache hit rate percentage',
            'labels': ['cache_type']
        },
        'safeshipper_system_cpu_usage': {
            'type': 'gauge',
            'description': 'System CPU usage percentage',
            'labels': ['hostname']
        },
        'safeshipper_system_memory_usage': {
            'type': 'gauge',
            'description': 'System memory usage percentage',
            'labels': ['hostname']
        },
        'safeshipper_system_disk_usage': {
            'type': 'gauge',
            'description': 'System disk usage percentage',
            'labels': ['hostname', 'mount_point']
        }
    }
    
    # Health check endpoints for external monitoring
    EXTERNAL_ENDPOINTS = {
        'basic_health': {
            'path': '/api/shared/health/',
            'method': 'GET',
            'expected_status': [200, 503],
            'check_interval': HEALTH_CHECK_INTERVALS['basic'],
            'timeout': timedelta(seconds=30)
        },
        'detailed_health': {
            'path': '/api/shared/health/detailed/',
            'method': 'GET',
            'expected_status': [200, 503],
            'check_interval': HEALTH_CHECK_INTERVALS['detailed'],
            'timeout': timedelta(seconds=60),
            'requires_auth': True,
            'auth_level': 'admin'
        },
        'cache_management': {
            'path': '/api/shared/cache/manage/',
            'method': 'GET',
            'expected_status': [200],
            'check_interval': HEALTH_CHECK_INTERVALS['comprehensive'],
            'timeout': timedelta(seconds=15),
            'requires_auth': True,
            'auth_level': 'admin'
        }
    }
    
    @classmethod
    def get_service_slo(cls, service_name: str) -> Dict[str, Any]:
        """Get SLO configuration for a specific service"""
        return cls.SERVICE_SLOS.get(service_name, {
            'response_time_ms': 10000,
            'availability': 95.0,
            'critical': False
        })
    
    @classmethod
    def is_critical_service(cls, service_name: str) -> bool:
        """Check if a service is considered critical"""
        slo = cls.get_service_slo(service_name)
        return slo.get('critical', False)
    
    @classmethod
    def get_threshold_status(cls, metric_name: str, value: float) -> str:
        """Determine threshold status for a metric value"""
        if metric_name not in cls.SYSTEM_THRESHOLDS:
            return 'unknown'
        
        thresholds = cls.SYSTEM_THRESHOLDS[metric_name]
        
        if value >= thresholds['critical']:
            return 'critical'
        elif value >= thresholds['warning']:
            return 'warning'
        else:
            return 'normal'
    
    @classmethod
    def should_alert(cls, service_name: str, status: str, consecutive_count: int = 1) -> bool:
        """Determine if an alert should be sent based on service status"""
        if status == 'critical':
            return consecutive_count >= cls.ALERT_CONFIG['escalation']['critical_threshold']
        elif status == 'warning':
            return consecutive_count >= cls.ALERT_CONFIG['escalation']['warning_threshold']
        else:
            return False
    
    @classmethod
    def get_prometheus_metric_config(cls, metric_name: str) -> Dict[str, Any]:
        """Get Prometheus metric configuration"""
        return cls.PROMETHEUS_METRICS.get(metric_name, {})


class MonitoringTemplates:
    """
    Templates for external monitoring system configurations.
    """
    
    @classmethod
    def generate_nagios_config(cls) -> str:
        """Generate Nagios configuration for SafeShipper monitoring"""
        config = """
# SafeShipper Health Check Configuration for Nagios

define host {
    host_name                safeshipper-api
    alias                    SafeShipper API Server
    address                  your-safeshipper-domain.com
    check_command            check-host-alive
    max_check_attempts       3
    check_interval           5
    retry_interval           1
    check_period             24x7
    notification_interval    60
    notification_period      24x7
    contacts                 safeshipper-admins
}

define service {
    host_name                safeshipper-api
    service_description      SafeShipper Basic Health
    check_command            check_http_json!/api/shared/health/!status!healthy
    max_check_attempts       3
    check_interval           1
    retry_interval           1
    check_period             24x7
    notification_interval    10
    notification_period      24x7
    contacts                 safeshipper-admins
}

define service {
    host_name                safeshipper-api
    service_description      SafeShipper Database
    check_command            check_http_json!/api/shared/health/service/database/!status!healthy
    max_check_attempts       2
    check_interval           2
    retry_interval           1
    check_period             24x7
    notification_interval    5
    notification_period      24x7
    contacts                 safeshipper-admins
}

define service {
    host_name                safeshipper-api
    service_description      SafeShipper Cache
    check_command            check_http_json!/api/shared/health/service/cache/!status!healthy
    max_check_attempts       2
    check_interval           2
    retry_interval           1
    check_period             24x7
    notification_interval    5
    notification_period      24x7
    contacts                 safeshipper-admins
}

define service {
    host_name                safeshipper-api
    service_description      SafeShipper Dangerous Goods Data
    check_command            check_http_json!/api/shared/health/service/dangerous_goods_data/!status!healthy
    max_check_attempts       2
    check_interval           5
    retry_interval           2
    check_period             24x7
    notification_interval    15
    notification_period      24x7
    contacts                 safeshipper-admins
}
"""
        return config.strip()
    
    @classmethod
    def generate_prometheus_config(cls) -> str:
        """Generate Prometheus scrape configuration"""
        config = """
# SafeShipper Health Check Configuration for Prometheus

scrape_configs:
  - job_name: 'safeshipper-health'
    static_configs:
      - targets: ['your-safeshipper-domain.com:443']
    scheme: https
    metrics_path: '/metrics'  # You would need to implement a /metrics endpoint
    scrape_interval: 30s
    scrape_timeout: 10s
    
  - job_name: 'safeshipper-health-detailed'
    static_configs:
      - targets: ['your-safeshipper-domain.com:443']
    scheme: https
    metrics_path: '/api/shared/health/'
    scrape_interval: 60s
    scrape_timeout: 30s
    basic_auth:
      username: 'monitoring_user'
      password: 'monitoring_password'
"""
        return config.strip()
    
    @classmethod
    def generate_docker_healthcheck(cls) -> str:
        """Generate Docker healthcheck configuration"""
        config = """
# Docker Compose Healthcheck Configuration for SafeShipper

version: '3.8'
services:
  safeshipper-api:
    # ... other configuration ...
    healthcheck:
      test: ["CMD", "python", "manage.py", "healthcheck", "--service", "database", "--exit-code", "--timeout", "10"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
  safeshipper-worker:
    # ... other configuration ...
    healthcheck:
      test: ["CMD", "python", "manage.py", "healthcheck", "--service", "celery_workers", "--exit-code", "--timeout", "15"]
      interval: 60s
      timeout: 15s
      retries: 2
      start_period: 60s
"""
        return config.strip()
    
    @classmethod
    def generate_kubernetes_probes(cls) -> str:
        """Generate Kubernetes liveness and readiness probes"""
        config = """
# Kubernetes Probes Configuration for SafeShipper

apiVersion: apps/v1
kind: Deployment
metadata:
  name: safeshipper-api
spec:
  template:
    spec:
      containers:
      - name: safeshipper-api
        # ... other configuration ...
        livenessProbe:
          httpGet:
            path: /api/shared/health/
            port: 8000
            httpHeaders:
            - name: Authorization
              value: "Bearer your-monitoring-token"
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 10
          successThreshold: 1
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /api/shared/health/service/database/
            port: 8000
            httpHeaders:
            - name: Authorization
              value: "Bearer your-monitoring-token"
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        
        startupProbe:
          httpGet:
            path: /api/shared/health/
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 30
"""
        return config.strip()