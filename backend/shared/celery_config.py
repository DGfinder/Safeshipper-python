# shared/celery_config.py
"""
Celery configuration for SafeShipper periodic tasks and background jobs.
Defines task schedules, routing, and execution policies.
"""

from datetime import timedelta
from celery.schedules import crontab
from django.conf import settings


class SafeShipperCeleryConfig:
    """
    Centralized Celery configuration for SafeShipper background tasks.
    """
    
    # Celery beat schedule for periodic tasks
    CELERY_BEAT_SCHEDULE = {
        # Data retention tasks
        'daily-data-cleanup': {
            'task': 'shared.tasks.daily_data_cleanup',
            'schedule': crontab(hour=2, minute=0),  # Daily at 2:00 AM
            'options': {'queue': 'maintenance'}
        },
        
        'weekly-data-cleanup': {
            'task': 'shared.tasks.weekly_data_cleanup',
            'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Weekly on Sunday at 3:00 AM
            'options': {'queue': 'maintenance'}
        },
        
        'monthly-compliance-cleanup': {
            'task': 'shared.tasks.monthly_compliance_cleanup',
            'schedule': crontab(hour=4, minute=0, day_of_month=1),  # Monthly on 1st at 4:00 AM
            'options': {'queue': 'compliance'}
        },
        
        # System monitoring tasks
        'system-health-monitor': {
            'task': 'shared.tasks.system_health_monitor',
            'schedule': timedelta(minutes=5),  # Every 5 minutes
            'options': {'queue': 'monitoring'}
        },
        
        'cache-maintenance': {
            'task': 'shared.tasks.cache_maintenance',
            'schedule': crontab(hour='*/6', minute=0),  # Every 6 hours
            'options': {'queue': 'maintenance'}
        },
        
        'dangerous-goods-validation': {
            'task': 'shared.tasks.dangerous_goods_data_validation',
            'schedule': crontab(hour='*/12', minute=30),  # Every 12 hours at :30
            'options': {'queue': 'validation'}
        },
        
        # Compliance monitoring tasks
        'compliance-threshold-monitoring': {
            'task': 'audits.tasks.monitor_compliance_thresholds',
            'schedule': timedelta(minutes=15),  # Every 15 minutes
            'options': {'queue': 'compliance'}
        },
        
        'overdue-remediation-check': {
            'task': 'audits.tasks.check_overdue_remediations',
            'schedule': crontab(hour='*/4', minute=0),  # Every 4 hours
            'options': {'queue': 'compliance'}
        },
        
        'daily-compliance-metrics': {
            'task': 'audits.tasks.generate_daily_compliance_metrics',
            'schedule': crontab(hour=1, minute=30),  # Daily at 1:30 AM
            'options': {'queue': 'compliance'}
        },
        
        'dangerous-goods-compliance-check': {
            'task': 'audits.tasks.check_dangerous_goods_compliance',
            'schedule': crontab(hour='*/6', minute=15),  # Every 6 hours at :15
            'options': {'queue': 'compliance'}
        },
        
        'compliance-status-updates': {
            'task': 'audits.tasks.send_compliance_status_updates',
            'schedule': timedelta(hours=1),  # Every hour
            'options': {'queue': 'compliance'}
        },
        
        # Add more SafeShipper specific tasks here as needed
    }
    
    # Task routing configuration
    CELERY_TASK_ROUTES = {
        # Data retention tasks - low priority, can wait
        'shared.tasks.cleanup_expired_data': {'queue': 'maintenance'},
        'shared.tasks.daily_data_cleanup': {'queue': 'maintenance'},
        'shared.tasks.weekly_data_cleanup': {'queue': 'maintenance'},
        'shared.tasks.monthly_compliance_cleanup': {'queue': 'compliance'},
        
        # System monitoring - high priority
        'shared.tasks.system_health_monitor': {'queue': 'monitoring'},
        'shared.tasks.dangerous_goods_data_validation': {'queue': 'validation'},
        
        # Compliance monitoring tasks - high priority
        'audits.tasks.monitor_compliance_thresholds': {'queue': 'compliance'},
        'audits.tasks.check_overdue_remediations': {'queue': 'compliance'},
        'audits.tasks.generate_daily_compliance_metrics': {'queue': 'compliance'},
        'audits.tasks.check_dangerous_goods_compliance': {'queue': 'compliance'},
        'audits.tasks.send_compliance_status_updates': {'queue': 'compliance'},
        
        # Cache and performance - medium priority
        'shared.tasks.cache_maintenance': {'queue': 'maintenance'},
        
        # Default queue for other tasks
        '*': {'queue': 'default'}
    }
    
    # Queue configuration
    CELERY_TASK_QUEUES = {
        'default': {
            'exchange': 'default',
            'exchange_type': 'direct',
            'routing_key': 'default',
        },
        'monitoring': {
            'exchange': 'monitoring',
            'exchange_type': 'direct',
            'routing_key': 'monitoring',
        },
        'maintenance': {
            'exchange': 'maintenance',
            'exchange_type': 'direct',
            'routing_key': 'maintenance',
        },
        'compliance': {
            'exchange': 'compliance',
            'exchange_type': 'direct',
            'routing_key': 'compliance',
        },
        'validation': {
            'exchange': 'validation',
            'exchange_type': 'direct',
            'routing_key': 'validation',
        }
    }
    
    # Task execution settings
    CELERY_TASK_SETTINGS = {
        # Default task settings
        'task_serializer': 'json',
        'result_serializer': 'json',
        'accept_content': ['json'],
        'result_expires': timedelta(hours=24),
        'timezone': 'UTC',
        'enable_utc': True,
        
        # Task execution limits
        'task_soft_time_limit': 300,  # 5 minutes soft limit
        'task_time_limit': 600,       # 10 minutes hard limit
        'task_acks_late': True,
        'worker_prefetch_multiplier': 1,
        
        # Retry policy
        'task_default_retry_delay': 60,
        'task_max_retries': 3,
        
        # Result backend settings
        'result_backend_transport_options': {
            'master_name': 'safeshipper-redis',
            'visibility_timeout': 3600,
        },
        
        # Worker settings
        'worker_hijack_root_logger': False,
        'worker_log_format': '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
        'worker_task_log_format': '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    }
    
    # Monitoring and logging settings
    CELERY_MONITORING_SETTINGS = {
        'task_send_sent_event': True,
        'task_track_started': True,
        'task_publish_retry': True,
        'task_publish_retry_policy': {
            'max_retries': 3,
            'interval_start': 0,
            'interval_step': 0.2,
            'interval_max': 0.2,
        },
    }
    
    @classmethod
    def get_celery_settings(cls):
        """Get complete Celery configuration dictionary."""
        config = {}
        config.update(cls.CELERY_TASK_SETTINGS)
        config.update(cls.CELERY_MONITORING_SETTINGS)
        config['beat_schedule'] = cls.CELERY_BEAT_SCHEDULE
        config['task_routes'] = cls.CELERY_TASK_ROUTES
        
        return config
    
    @classmethod
    def get_worker_configuration(cls, queue_name='default'):
        """Get worker-specific configuration."""
        return {
            'queue': queue_name,
            'concurrency': cls._get_queue_concurrency(queue_name),
            'prefetch_multiplier': cls._get_queue_prefetch(queue_name),
            'max_tasks_per_child': cls._get_queue_max_tasks(queue_name),
        }
    
    @classmethod
    def _get_queue_concurrency(cls, queue_name):
        """Get optimal concurrency for queue."""
        concurrency_map = {
            'monitoring': 2,     # High priority, low concurrency
            'compliance': 1,     # Critical tasks, single threaded
            'validation': 2,     # Data validation tasks
            'maintenance': 4,    # Maintenance tasks, can run parallel
            'default': 4         # Default concurrency
        }
        return concurrency_map.get(queue_name, 4)
    
    @classmethod
    def _get_queue_prefetch(cls, queue_name):
        """Get optimal prefetch multiplier for queue."""
        prefetch_map = {
            'monitoring': 1,     # Process one at a time
            'compliance': 1,     # Critical tasks one at a time
            'validation': 1,     # Validation tasks one at a time
            'maintenance': 2,    # Can prefetch maintenance tasks
            'default': 1         # Default prefetch
        }
        return prefetch_map.get(queue_name, 1)
    
    @classmethod
    def _get_queue_max_tasks(cls, queue_name):
        """Get max tasks per worker child for queue."""
        max_tasks_map = {
            'monitoring': 100,   # Restart after 100 tasks
            'compliance': 50,    # Restart after 50 critical tasks
            'validation': 100,   # Restart after 100 validation tasks
            'maintenance': 200,  # Maintenance can run longer
            'default': 100       # Default max tasks
        }
        return max_tasks_map.get(queue_name, 100)


class TaskScheduleManager:
    """
    Manager for dynamic task scheduling based on system load and requirements.
    """
    
    @classmethod
    def adjust_schedule_for_load(cls, current_load_percentage):
        """Adjust task schedules based on current system load."""
        adjusted_schedule = SafeShipperCeleryConfig.CELERY_BEAT_SCHEDULE.copy()
        
        if current_load_percentage > 80:
            # High load - reduce frequency of non-critical tasks
            adjusted_schedule['cache-maintenance']['schedule'] = crontab(hour='*/12', minute=0)
            adjusted_schedule['system-health-monitor']['schedule'] = timedelta(minutes=10)
            
        elif current_load_percentage < 20:
            # Low load - can increase frequency of monitoring
            adjusted_schedule['system-health-monitor']['schedule'] = timedelta(minutes=2)
            adjusted_schedule['dangerous-goods-validation']['schedule'] = crontab(hour='*/6', minute=30)
        
        return adjusted_schedule
    
    @classmethod
    def get_emergency_schedule(cls):
        """Get emergency task schedule for incident response."""
        return {
            'emergency-health-monitor': {
                'task': 'shared.tasks.system_health_monitor',
                'schedule': timedelta(minutes=1),  # Every minute during emergency
                'options': {'queue': 'monitoring'}
            },
            'emergency-cache-check': {
                'task': 'shared.tasks.cache_maintenance', 
                'schedule': timedelta(minutes=5),  # Every 5 minutes during emergency
                'options': {'queue': 'maintenance'}
            }
        }
    
    @classmethod
    def get_maintenance_window_schedule(cls, start_hour=2, end_hour=6):
        """Get schedule for maintenance window operations."""
        return {
            'maintenance-data-cleanup': {
                'task': 'shared.tasks.cleanup_expired_data',
                'schedule': crontab(hour=start_hour, minute=0),
                'args': [None, False],  # All data types, not dry run
                'options': {'queue': 'maintenance'}
            },
            'maintenance-health-check': {
                'task': 'shared.tasks.system_health_monitor',
                'schedule': crontab(hour=f'{start_hour}-{end_hour}', minute='*/30'),
                'options': {'queue': 'monitoring'}
            }
        }


# Django settings integration
def integrate_celery_settings(settings_dict):
    """
    Helper function to integrate Celery settings into Django settings.
    
    Usage in settings.py:
        from shared.celery_config import integrate_celery_settings
        integrate_celery_settings(locals())
    """
    
    # Get Celery configuration
    celery_config = SafeShipperCeleryConfig.get_celery_settings()
    
    # Add to Django settings
    for key, value in celery_config.items():
        settings_dict[f'CELERY_{key.upper()}'] = value
    
    # Add SafeShipper specific settings
    settings_dict.update({
        # Email recipients for task notifications
        'DATA_RETENTION_NOTIFICATION_RECIPIENTS': [
            'admin@safeshipper.com',
            'compliance@safeshipper.com'
        ],
        'DATA_RETENTION_WEEKLY_RECIPIENTS': [
            'admin@safeshipper.com'
        ],
        'COMPLIANCE_NOTIFICATION_RECIPIENTS': [
            'compliance@safeshipper.com',
            'legal@safeshipper.com'
        ],
        'COMPLIANCE_ERROR_RECIPIENTS': [
            'admin@safeshipper.com',
            'compliance@safeshipper.com',
            'cto@safeshipper.com'
        ],
        'HEALTH_ALERT_RECIPIENTS': [
            'ops@safeshipper.com',
            'admin@safeshipper.com'
        ],
        'DG_DATA_ALERT_RECIPIENTS': [
            'admin@safeshipper.com',
            'safety@safeshipper.com'
        ],
        
        # Cache and performance limits
        'CACHE_MEMORY_LIMIT_MB': 500,
        'CACHE_KEY_LIMIT': 10000,
        
        # Task execution settings
        'CELERY_TASK_ALWAYS_EAGER': False,  # Set to True for testing
        'CELERY_EAGER_PROPAGATES_EXCEPTIONS': True,
    })
    
    return settings_dict


# Example Celery app configuration
CELERY_APP_CONFIG = """
# celery.py - Main Celery application configuration

import os
from celery import Celery
from django.conf import settings
from shared.celery_config import SafeShipperCeleryConfig

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper.settings')

# Create Celery app
app = Celery('safeshipper')

# Load configuration from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Apply SafeShipper specific configuration
safeshipper_config = SafeShipperCeleryConfig.get_celery_settings()
app.conf.update(safeshipper_config)

# Auto-discover tasks from all Django apps
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
"""