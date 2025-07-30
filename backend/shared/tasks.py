# shared/tasks.py
"""
Celery tasks for SafeShipper background operations.
Includes data retention, system maintenance, and monitoring tasks.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail

from .data_retention_service import DataRetentionService, DataRetentionReporter
from .health_service import HealthCheckService, ServiceDependencyChecker
from .caching_service import CacheStatisticsService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def cleanup_expired_data(self, data_types: Optional[List[str]] = None, dry_run: bool = False):
    """
    Celery task for cleaning up expired data based on retention policies.
    
    Args:
        data_types: List of specific data types to clean up (None = all)
        dry_run: If True, don't actually delete data, just report what would be deleted
    """
    try:
        logger.info(f"Starting data retention cleanup task (dry_run={dry_run})")
        
        # Initialize data retention service
        service = DataRetentionService()
        
        # Run cleanup
        stats = service.cleanup_expired_data(data_types=data_types, dry_run=dry_run)
        
        # Generate and send report
        report = DataRetentionReporter.generate_retention_report(stats)
        
        # Send notification if configured
        recipients = getattr(settings, 'DATA_RETENTION_NOTIFICATION_RECIPIENTS', [])
        if recipients and not dry_run:
            DataRetentionReporter.send_retention_notification(stats, recipients)
        
        logger.info(
            f"Data retention cleanup completed. "
            f"Processed: {stats['total_processed']}, "
            f"Deleted: {stats['deleted_records']}, "
            f"Archived: {stats['archived_records']}, "
            f"Errors: {stats['errors']}"
        )
        
        return {
            'success': True,
            'stats': stats,
            'report': report
        }
        
    except Exception as exc:
        logger.error(f"Data retention cleanup task failed: {str(exc)}")
        
        # Retry the task if it's not the final attempt
        if self.request.retries < self.max_retries:
            # Exponential backoff: 60s, 120s, 240s
            countdown = 60 * (2 ** self.request.retries)
            logger.info(f"Retrying data retention cleanup in {countdown} seconds")
            raise self.retry(exc=exc, countdown=countdown)
        
        # Final attempt failed - send error notification
        error_recipients = getattr(settings, 'ADMIN_EMAIL_ADDRESSES', [])
        if error_recipients:
            send_mail(
                subject='SafeShipper Data Retention Task Failed',
                message=f'Data retention cleanup task failed after {self.max_retries} retries.\n\nError: {str(exc)}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=error_recipients,
                fail_silently=True,
            )
        
        return {
            'success': False,
            'error': str(exc),
            'retries': self.request.retries
        }


@shared_task(bind=True, max_retries=2)
def daily_data_cleanup(self):
    """
    Daily data cleanup task - runs automatically to clean up operational data.
    """
    try:
        logger.info("Starting daily data cleanup task")
        
        # Define data types for daily cleanup (non-critical data)
        daily_cleanup_types = [
            'cache_data',
            'temporary_files',
            'rate_limit_data',
            'health_check_logs',
            'performance_metrics',
            'user_sessions',
            'notification_logs'
        ]
        
        # Run cleanup
        service = DataRetentionService()
        stats = service.cleanup_expired_data(data_types=daily_cleanup_types, dry_run=False)
        
        logger.info(f"Daily cleanup completed. Processed {stats['total_processed']} records")
        
        return {
            'success': True,
            'cleanup_type': 'daily',
            'stats': stats
        }
        
    except Exception as exc:
        logger.error(f"Daily data cleanup task failed: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            countdown = 300  # 5 minutes
            raise self.retry(exc=exc, countdown=countdown)
        
        return {
            'success': False,
            'cleanup_type': 'daily',
            'error': str(exc)
        }


@shared_task(bind=True, max_retries=2)
def weekly_data_cleanup(self):
    """
    Weekly data cleanup task - runs automatically for more comprehensive cleanup.
    """
    try:
        logger.info("Starting weekly data cleanup task")
        
        # Define data types for weekly cleanup
        weekly_cleanup_types = [
            'feedback_data',
            'error_logs',
            'user_activity_logs',
            'personal_data_exports',
            'authentication_logs'
        ]
        
        # Run cleanup
        service = DataRetentionService()
        stats = service.cleanup_expired_data(data_types=weekly_cleanup_types, dry_run=False)
        
        # Generate report
        report = DataRetentionReporter.generate_retention_report(stats)
        
        # Send weekly report
        recipients = getattr(settings, 'DATA_RETENTION_WEEKLY_RECIPIENTS', [])
        if recipients:
            DataRetentionReporter.send_retention_notification(stats, recipients)
        
        logger.info(f"Weekly cleanup completed. Processed {stats['total_processed']} records")
        
        return {
            'success': True,
            'cleanup_type': 'weekly',
            'stats': stats,
            'report': report
        }
        
    except Exception as exc:
        logger.error(f"Weekly data cleanup task failed: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            countdown = 1800  # 30 minutes
            raise self.retry(exc=exc, countdown=countdown)
        
        return {
            'success': False,
            'cleanup_type': 'weekly',
            'error': str(exc)
        }


@shared_task(bind=True, max_retries=2)
def monthly_compliance_cleanup(self):
    """
    Monthly compliance data cleanup - handles critical compliance data with archiving.
    """
    try:
        logger.info("Starting monthly compliance cleanup task")
        
        # Define critical data types that require careful handling
        compliance_cleanup_types = [
            'audit_logs',
            'incident_reports',
            'training_records',
            'inspection_records',
            'sds_documents',
            'shipment_tracking',
            'proof_of_delivery'
        ]
        
        # Run cleanup with archiving for critical data
        service = DataRetentionService()
        stats = service.cleanup_expired_data(data_types=compliance_cleanup_types, dry_run=False)
        
        # Generate detailed compliance report
        report = DataRetentionReporter.generate_retention_report(stats)
        
        # Send compliance report to management
        compliance_recipients = getattr(settings, 'COMPLIANCE_NOTIFICATION_RECIPIENTS', [])
        if compliance_recipients:
            DataRetentionReporter.send_retention_notification(stats, compliance_recipients)
        
        logger.info(
            f"Monthly compliance cleanup completed. "
            f"Processed: {stats['total_processed']}, "
            f"Archived: {stats['archived_records']}, "
            f"Compliance Status: {report['compliance_status']}"
        )
        
        return {
            'success': True,
            'cleanup_type': 'monthly_compliance',
            'stats': stats,
            'report': report
        }
        
    except Exception as exc:
        logger.error(f"Monthly compliance cleanup task failed: {str(exc)}")
        
        # Compliance failures are critical - notify immediately
        error_recipients = getattr(settings, 'COMPLIANCE_ERROR_RECIPIENTS', [])
        if error_recipients:
            send_mail(
                subject='CRITICAL: SafeShipper Compliance Cleanup Failed',
                message=f'Monthly compliance cleanup task failed.\n\nError: {str(exc)}\n\nImmediate attention required for regulatory compliance.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=error_recipients,
                fail_silently=True,
            )
        
        if self.request.retries < self.max_retries:
            countdown = 3600  # 1 hour
            raise self.retry(exc=exc, countdown=countdown)
        
        return {
            'success': False,
            'cleanup_type': 'monthly_compliance',
            'error': str(exc)
        }


@shared_task
def system_health_monitor():
    """
    Periodic system health monitoring task.
    """
    try:
        logger.info("Running system health monitoring")
        
        # Run comprehensive health check
        health_data = HealthCheckService.comprehensive_health_check()
        
        # Check for unhealthy services
        unhealthy_services = []
        degraded_services = []
        
        for service_name, service_data in health_data.get('services', {}).items():
            status = service_data.get('status')
            if status == 'failed':
                unhealthy_services.append(service_name)
            elif status == 'degraded':
                degraded_services.append(service_name)
        
        # Send alerts if needed
        if unhealthy_services or degraded_services:
            alert_recipients = getattr(settings, 'HEALTH_ALERT_RECIPIENTS', [])
            if alert_recipients:
                _send_health_alert(health_data, unhealthy_services, degraded_services, alert_recipients)
        
        logger.info(f"System health check completed. Status: {health_data['status']}")
        
        return {
            'success': True,
            'overall_status': health_data['status'],
            'unhealthy_services': unhealthy_services,
            'degraded_services': degraded_services,
            'health_percentage': health_data.get('summary', {}).get('health_percentage', 0)
        }
        
    except Exception as exc:
        logger.error(f"System health monitoring task failed: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }


@shared_task
def cache_maintenance():
    """
    Periodic cache maintenance and optimization task.
    """
    try:
        logger.info("Running cache maintenance")
        
        # Get cache statistics
        cache_stats = CacheStatisticsService.get_cache_stats()
        
        # Check if cache needs maintenance
        memory_usage = cache_stats.get('memory_usage_mb', 0)
        total_keys = cache_stats.get('total_keys', 0)
        
        maintenance_actions = []
        
        # If memory usage is high, clear some cache
        if memory_usage > getattr(settings, 'CACHE_MEMORY_LIMIT_MB', 500):  # 500MB default limit
            logger.info(f"Cache memory usage high ({memory_usage}MB), clearing old entries")
            # Clear some cache entries (implement smart clearing logic)
            maintenance_actions.append('memory_cleanup')
        
        # If too many keys, clear some
        if total_keys > getattr(settings, 'CACHE_KEY_LIMIT', 10000):  # 10k keys default limit
            logger.info(f"Cache key count high ({total_keys}), clearing old entries")
            maintenance_actions.append('key_cleanup')
        
        logger.info(f"Cache maintenance completed. Actions: {maintenance_actions}")
        
        return {
            'success': True,
            'cache_stats': cache_stats,
            'maintenance_actions': maintenance_actions
        }
        
    except Exception as exc:
        logger.error(f"Cache maintenance task failed: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }


@shared_task
def dangerous_goods_data_validation():
    """
    Periodic validation of dangerous goods data integrity.
    """
    try:
        logger.info("Running dangerous goods data validation")
        
        # Check dangerous goods dependencies
        dg_dependencies = ServiceDependencyChecker.check_dangerous_goods_dependencies()
        
        # Check for data integrity issues
        validation_results = {
            'overall_status': dg_dependencies['status'],
            'dependencies': dg_dependencies['dependencies'],
            'issues_found': [],
            'recommendations': []
        }
        
        # Check for specific issues
        for dep_name, dep_data in dg_dependencies['dependencies'].items():
            if dep_data['status'] in ['failed', 'degraded']:
                validation_results['issues_found'].append({
                    'dependency': dep_name,
                    'status': dep_data['status'],
                    'message': dep_data.get('message', '')
                })
        
        # Generate recommendations
        if validation_results['issues_found']:
            validation_results['recommendations'].append('Review and fix dangerous goods data issues')
            
            # Send alert for critical issues
            critical_issues = [issue for issue in validation_results['issues_found'] if issue['status'] == 'failed']
            if critical_issues:
                dg_alert_recipients = getattr(settings, 'DG_DATA_ALERT_RECIPIENTS', [])
                if dg_alert_recipients:
                    _send_dg_data_alert(validation_results, dg_alert_recipients)
        
        logger.info(f"Dangerous goods validation completed. Status: {validation_results['overall_status']}")
        
        return {
            'success': True,
            'validation_results': validation_results
        }
        
    except Exception as exc:
        logger.error(f"Dangerous goods validation task failed: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }


def _send_health_alert(health_data, unhealthy_services, degraded_services, recipients):
    """Send health alert notification."""
    try:
        subject = f"SafeShipper Health Alert - {health_data['status'].upper()}"
        
        message = f"""
SafeShipper System Health Alert

Overall Status: {health_data['status'].upper()}
Timestamp: {health_data['timestamp']}

Health Summary:
- Total Services: {health_data.get('summary', {}).get('total_services', 0)}
- Healthy: {health_data.get('summary', {}).get('healthy_services', 0)}
- Degraded: {health_data.get('summary', {}).get('degraded_services', 0)}
- Failed: {health_data.get('summary', {}).get('failed_services', 0)}
- Health Percentage: {health_data.get('summary', {}).get('health_percentage', 0)}%

"""
        
        if unhealthy_services:
            message += f"\nFAILED SERVICES:\n"
            for service in unhealthy_services:
                service_data = health_data['services'][service]
                message += f"- {service}: {service_data.get('message', 'No details')}\n"
        
        if degraded_services:
            message += f"\nDEGRADED SERVICES:\n"
            for service in degraded_services:
                service_data = health_data['services'][service]
                message += f"- {service}: {service_data.get('message', 'No details')}\n"
        
        message += f"\nPlease check the SafeShipper system immediately."
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True,
        )
        
        logger.info(f"Health alert sent to {len(recipients)} recipients")
        
    except Exception as e:
        logger.error(f"Failed to send health alert: {str(e)}")


def _send_dg_data_alert(validation_results, recipients):
    """Send dangerous goods data alert notification."""
    try:
        subject = "SafeShipper Dangerous Goods Data Alert"
        
        message = f"""
SafeShipper Dangerous Goods Data Validation Alert

Overall Status: {validation_results['overall_status'].upper()}
Issues Found: {len(validation_results['issues_found'])}

Critical Issues:
"""
        
        for issue in validation_results['issues_found']:
            message += f"- {issue['dependency']}: {issue['status']} - {issue['message']}\n"
        
        message += f"\nRecommendations:\n"
        for rec in validation_results['recommendations']:
            message += f"- {rec}\n"
        
        message += f"\nImmediate attention required for dangerous goods compliance."
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True,
        )
        
        logger.info(f"DG data alert sent to {len(recipients)} recipients")
        
    except Exception as e:
        logger.error(f"Failed to send DG data alert: {str(e)}")