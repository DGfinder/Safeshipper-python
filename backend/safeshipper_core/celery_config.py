from __future__ import absolute_import, unicode_literals
import os
import logging
from celery import Celery
from celery.signals import (
    task_prerun, task_postrun, task_retry, task_failure, 
    worker_ready, worker_shutting_down
)

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')

app = Celery('safeshipper')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Configure logging
logger = logging.getLogger(__name__)

# Celery signals for monitoring and debugging
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Log when a task starts."""
    logger.info(f'Task started: {task.name}[{task_id}]')

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, 
                        kwargs=None, retval=None, state=None, **kwds):
    """Log when a task completes."""
    logger.info(f'Task completed: {task.name}[{task_id}] - State: {state}')

@task_retry.connect
def task_retry_handler(sender=None, task_id=None, reason=None, traceback=None, einfo=None, **kwds):
    """Log when a task is retried."""
    logger.warning(f'Task retry: {sender.name}[{task_id}] - Reason: {reason}')

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """Log when a task fails."""
    logger.error(f'Task failed: {sender.name}[{task_id}] - Exception: {exception}')

@worker_ready.connect
def worker_ready_handler(sender=None, **kwds):
    """Log when worker is ready."""
    logger.info(f'Celery worker ready: {sender.hostname}')

@worker_shutting_down.connect
def worker_shutting_down_handler(sender=None, **kwds):
    """Log when worker is shutting down."""
    logger.info(f'Celery worker shutting down: {sender.hostname}')

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    logger.info(f'Debug task executed: {self.request.id}')
    logger.debug(f'Request details: {self.request!r}') 