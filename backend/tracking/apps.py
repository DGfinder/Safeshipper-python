from django.apps import AppConfig


class TrackingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tracking'
    verbose_name = 'GPS Tracking and Fleet Management'

    def ready(self):
        """
        Initialize tracking app with signal handlers and periodic tasks.
        """
        # Import signals to register them
        try:
            import tracking.signals
        except ImportError:
            pass
        
        # Register periodic tasks if Celery is available
        try:
            self._setup_periodic_tasks()
        except ImportError:
            pass
    
    def _setup_periodic_tasks(self):
        """
        Set up periodic tasks for spatial indexing maintenance.
        """
        try:
            from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
            from django.db import transaction
            
            with transaction.atomic():
                # Materialized view refresh every 5 minutes
                view_refresh_schedule, _ = IntervalSchedule.objects.get_or_create(
                    every=5,
                    period=IntervalSchedule.MINUTES,
                )
                
                PeriodicTask.objects.get_or_create(
                    name='Refresh Spatial Materialized Views',
                    defaults={
                        'task': 'tracking.signals.refresh_materialized_views',
                        'interval': view_refresh_schedule,
                        'enabled': True,
                    }
                )
                
                # Spatial index maintenance every hour
                index_maintenance_schedule, _ = IntervalSchedule.objects.get_or_create(
                    every=1,
                    period=IntervalSchedule.HOURS,
                )
                
                PeriodicTask.objects.get_or_create(
                    name='Maintain Spatial Indexes',
                    defaults={
                        'task': 'tracking.signals.maintain_spatial_indexes',
                        'interval': index_maintenance_schedule,
                        'enabled': True,
                    }
                )
                
                # Partition maintenance daily at 2 AM
                partition_schedule, _ = CrontabSchedule.objects.get_or_create(
                    minute=0,
                    hour=2,
                    day_of_week='*',
                    day_of_month='*',
                    month_of_year='*',
                )
                
                PeriodicTask.objects.get_or_create(
                    name='Maintain GPS Partitions',
                    defaults={
                        'task': 'tracking.signals.partition_maintenance',
                        'crontab': partition_schedule,
                        'enabled': True,
                    }
                )
                
        except Exception as e:
            # Silently fail if periodic tasks can't be set up
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not set up periodic tasks: {e}")
