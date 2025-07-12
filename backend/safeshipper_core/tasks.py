# safeshipper_core/tasks.py
import logging
import os
from datetime import timedelta
from django.utils import timezone
from django.core.management import call_command
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(bind=True, name='core.tasks.health_check')
def health_check(self):
    """
    Basic health check task to verify Celery is working
    """
    try:
        from django.db import connection
        
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            
        # Test Redis connection
        from django.core.cache import cache
        cache.set('celery_health_check', timezone.now().isoformat(), 60)
        cache_result = cache.get('celery_health_check')
        
        if not cache_result:
            raise Exception("Redis cache test failed")
            
        logger.info("Health check passed")
        return {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'task_id': self.request.id
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise self.retry(exc=e, countdown=60, max_retries=3)

@shared_task(bind=True, name='core.tasks.cleanup_old_files')
def cleanup_old_files(self, days_old=30):
    """
    Clean up old temporary files and expired data
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days_old)
        cleanup_count = 0
        
        # Clean up old document processing files
        if hasattr(settings, 'MEDIA_ROOT'):
            temp_dirs = [
                os.path.join(settings.MEDIA_ROOT, 'temp'),
                os.path.join(settings.MEDIA_ROOT, 'processing'),
            ]
            
            for temp_dir in temp_dirs:
                if os.path.exists(temp_dir):
                    for filename in os.listdir(temp_dir):
                        file_path = os.path.join(temp_dir, filename)
                        if os.path.isfile(file_path):
                            file_time = timezone.datetime.fromtimestamp(
                                os.path.getmtime(file_path),
                                tz=timezone.get_current_timezone()
                            )
                            if file_time < cutoff_date:
                                try:
                                    os.remove(file_path)
                                    cleanup_count += 1
                                except OSError:
                                    pass
        
        # Clean up old Celery task results
        try:
            from celery.result import AsyncResult
            # This would need to be implemented based on your result backend
        except ImportError:
            pass
            
        logger.info(f"Cleaned up {cleanup_count} old files")
        return {
            'files_cleaned': cleanup_count,
            'cutoff_date': cutoff_date.isoformat(),
            'task_id': self.request.id
        }
        
    except Exception as e:
        logger.error(f"File cleanup failed: {e}")
        raise self.retry(exc=e, countdown=300, max_retries=2)

@shared_task(bind=True, name='core.tasks.update_search_indexes')
def update_search_indexes(self):
    """
    Update Elasticsearch search indexes
    """
    try:
        # Update dangerous goods index
        call_command('search_index', '--rebuild', '--models', 'dangerous_goods.DangerousGood')
        
        # Update documents index
        call_command('search_index', '--rebuild', '--models', 'documents.Document')
        
        # Update manifests index  
        call_command('search_index', '--rebuild', '--models', 'manifests.Manifest')
        
        logger.info("Search indexes updated successfully")
        return {
            'status': 'completed',
            'indexes_updated': ['dangerous_goods', 'documents', 'manifests'],
            'timestamp': timezone.now().isoformat(),
            'task_id': self.request.id
        }
        
    except Exception as e:
        logger.error(f"Search index update failed: {e}")
        raise self.retry(exc=e, countdown=600, max_retries=2)

@shared_task(bind=True, name='core.tasks.database_maintenance')
def database_maintenance(self):
    """
    Perform routine database maintenance tasks
    """
    try:
        from django.db import connection
        
        maintenance_tasks = []
        
        with connection.cursor() as cursor:
            # Update table statistics (PostgreSQL)
            if 'postgresql' in settings.DATABASES['default']['ENGINE']:
                cursor.execute("ANALYZE;")
                maintenance_tasks.append("analyze_tables")
                
            # Clean up expired sessions
            try:
                call_command('clearsessions')
                maintenance_tasks.append("clear_sessions")
            except Exception:
                pass
                
        logger.info(f"Database maintenance completed: {maintenance_tasks}")
        return {
            'status': 'completed',
            'tasks_performed': maintenance_tasks,
            'timestamp': timezone.now().isoformat(),
            'task_id': self.request.id
        }
        
    except Exception as e:
        logger.error(f"Database maintenance failed: {e}")
        raise self.retry(exc=e, countdown=1800, max_retries=1)

@shared_task(bind=True, name='core.tasks.system_metrics_collection')
def system_metrics_collection(self):
    """
    Collect system metrics for monitoring
    """
    try:
        import psutil
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get database metrics
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
            table_count = cursor.fetchone()[0]
            
        metrics = {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available_gb': memory.available / (1024**3),
            'disk_percent': disk.percent,
            'disk_free_gb': disk.free / (1024**3),
            'database_tables': table_count,
            'timestamp': timezone.now().isoformat(),
            'task_id': self.request.id
        }
        
        # You could store these metrics in a time-series database
        # or send them to a monitoring service
        
        logger.info(f"System metrics collected: CPU {cpu_percent}%, Memory {memory.percent}%")
        return metrics
        
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        # Don't retry metrics collection as frequently
        raise self.retry(exc=e, countdown=300, max_retries=1)