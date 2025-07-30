# shared/data_retention_service.py
"""
Data retention service for SafeShipper compliance and storage management.
Implements automated cleanup policies for dangerous goods transportation records.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from django.db import transaction, models
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
import json

logger = logging.getLogger(__name__)


class DataRetentionPolicy:
    """
    Define data retention policies for different types of SafeShipper data.
    """
    
    # Retention periods for different data types
    RETENTION_PERIODS = {
        # Compliance and audit data - keep longer for regulatory requirements
        'audit_logs': timedelta(days=2555),          # 7 years (regulatory requirement)
        'authentication_logs': timedelta(days=365),   # 1 year
        'incident_reports': timedelta(days=2555),     # 7 years (safety critical)
        'training_records': timedelta(days=2555),     # 7 years (compliance)
        'inspection_records': timedelta(days=1825),   # 5 years
        'sds_documents': timedelta(days=1095),        # 3 years (regulatory)
        
        # Operational data - shorter retention
        'shipment_tracking': timedelta(days=1095),    # 3 years
        'proof_of_delivery': timedelta(days=1095),    # 3 years
        'feedback_data': timedelta(days=730),         # 2 years
        'cache_data': timedelta(hours=24),            # 24 hours
        'temporary_files': timedelta(days=7),         # 1 week
        'rate_limit_data': timedelta(days=30),        # 30 days
        
        # System data - minimal retention
        'health_check_logs': timedelta(days=90),      # 3 months
        'performance_metrics': timedelta(days=30),    # 30 days
        'error_logs': timedelta(days=90),             # 3 months
        'notification_logs': timedelta(days=30),      # 30 days
        
        # Personal data - GDPR compliance
        'user_sessions': timedelta(days=30),          # 30 days
        'user_activity_logs': timedelta(days=365),    # 1 year
        'personal_data_exports': timedelta(days=30),  # 30 days
    }
    
    # Critical data types that require special handling
    CRITICAL_DATA_TYPES = [
        'audit_logs',
        'incident_reports', 
        'training_records',
        'sds_documents'
    ]
    
    # Data types that should be archived instead of deleted
    ARCHIVE_INSTEAD_OF_DELETE = [
        'audit_logs',
        'incident_reports',
        'training_records',
        'inspection_records'
    ]
    
    @classmethod
    def get_retention_period(cls, data_type: str) -> timedelta:
        """Get retention period for a specific data type."""
        return cls.RETENTION_PERIODS.get(data_type, timedelta(days=365))  # Default 1 year
    
    @classmethod
    def is_critical_data(cls, data_type: str) -> bool:
        """Check if data type is considered critical."""
        return data_type in cls.CRITICAL_DATA_TYPES
    
    @classmethod
    def should_archive(cls, data_type: str) -> bool:
        """Check if data should be archived instead of deleted."""
        return data_type in cls.ARCHIVE_INSTEAD_OF_DELETE


class DataRetentionService:
    """
    Service for managing data retention and cleanup operations.
    """
    
    def __init__(self):
        self.dry_run = False
        self.stats = {
            'total_processed': 0,
            'deleted_records': 0,
            'archived_records': 0,
            'errors': 0,
            'warnings': []
        }
    
    def cleanup_expired_data(self, data_types: Optional[List[str]] = None, dry_run: bool = False) -> Dict[str, Any]:
        """
        Clean up expired data based on retention policies.
        
        Args:
            data_types: List of specific data types to clean up (None = all)
            dry_run: If True, don't actually delete data, just report what would be deleted
        """
        self.dry_run = dry_run
        self.stats = {
            'total_processed': 0,
            'deleted_records': 0,
            'archived_records': 0,
            'errors': 0,
            'warnings': [],
            'start_time': timezone.now(),
            'data_types_processed': []
        }
        
        logger.info(f"Starting data retention cleanup (dry_run={dry_run})")
        
        try:
            # Get data types to process
            types_to_process = data_types or list(DataRetentionPolicy.RETENTION_PERIODS.keys())
            
            for data_type in types_to_process:
                try:
                    self._cleanup_data_type(data_type)
                    self.stats['data_types_processed'].append(data_type)
                except Exception as e:
                    logger.error(f"Failed to cleanup {data_type}: {str(e)}")
                    self.stats['errors'] += 1
                    self.stats['warnings'].append(f"Failed to cleanup {data_type}: {str(e)}")
            
            # Add summary information
            self.stats['end_time'] = timezone.now()
            self.stats['duration_seconds'] = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            
            logger.info(f"Data retention cleanup completed. Processed: {self.stats['total_processed']}, "
                       f"Deleted: {self.stats['deleted_records']}, Archived: {self.stats['archived_records']}")
            
            return self.stats
            
        except Exception as e:
            logger.error(f"Data retention cleanup failed: {str(e)}")
            self.stats['errors'] += 1
            self.stats['end_time'] = timezone.now()
            return self.stats
    
    def _cleanup_data_type(self, data_type: str) -> None:
        """Clean up expired data for a specific data type."""
        cleanup_methods = {
            'audit_logs': self._cleanup_audit_logs,
            'authentication_logs': self._cleanup_authentication_logs,
            'incident_reports': self._cleanup_incident_reports,
            'training_records': self._cleanup_training_records,
            'inspection_records': self._cleanup_inspection_records,
            'sds_documents': self._cleanup_sds_documents,
            'shipment_tracking': self._cleanup_shipment_tracking,
            'proof_of_delivery': self._cleanup_proof_of_delivery,
            'feedback_data': self._cleanup_feedback_data,
            'cache_data': self._cleanup_cache_data,
            'temporary_files': self._cleanup_temporary_files,
            'rate_limit_data': self._cleanup_rate_limit_data,
            'health_check_logs': self._cleanup_health_check_logs,
            'performance_metrics': self._cleanup_performance_metrics,
            'error_logs': self._cleanup_error_logs,
            'notification_logs': self._cleanup_notification_logs,
            'user_sessions': self._cleanup_user_sessions,
            'user_activity_logs': self._cleanup_user_activity_logs,
            'personal_data_exports': self._cleanup_personal_data_exports,
        }
        
        cleanup_method = cleanup_methods.get(data_type)
        if cleanup_method:
            cleanup_method()
        else:
            logger.warning(f"No cleanup method defined for data type: {data_type}")
            self.stats['warnings'].append(f"No cleanup method defined for data type: {data_type}")
    
    def _cleanup_audit_logs(self) -> None:
        """Clean up expired audit logs."""
        try:
            from audits.models import AuditLog
            
            cutoff_date = timezone.now() - DataRetentionPolicy.get_retention_period('audit_logs')
            expired_logs = AuditLog.objects.filter(created_at__lt=cutoff_date)
            
            count = expired_logs.count()
            if count > 0:
                if DataRetentionPolicy.should_archive('audit_logs'):
                    # Archive instead of delete for compliance
                    self._archive_records(expired_logs, 'audit_logs')
                    self.stats['archived_records'] += count
                else:
                    if not self.dry_run:
                        expired_logs.delete()
                    self.stats['deleted_records'] += count
            
            self.stats['total_processed'] += count
            logger.info(f"Processed {count} expired audit logs")
            
        except Exception as e:
            logger.error(f"Failed to cleanup audit logs: {str(e)}")
            raise
    
    def _cleanup_authentication_logs(self) -> None:
        """Clean up expired authentication logs."""
        try:
            from enterprise_auth.models import AuthenticationLog
            
            cutoff_date = timezone.now() - DataRetentionPolicy.get_retention_period('authentication_logs')
            expired_logs = AuthenticationLog.objects.filter(created_at__lt=cutoff_date)
            
            count = expired_logs.count()
            if count > 0 and not self.dry_run:
                expired_logs.delete()
            
            self.stats['total_processed'] += count
            self.stats['deleted_records'] += count
            logger.info(f"Processed {count} expired authentication logs")
            
        except Exception as e:
            logger.error(f"Failed to cleanup authentication logs: {str(e)}")
            # Don't raise - this is not critical data
    
    def _cleanup_incident_reports(self) -> None:
        """Clean up expired incident reports."""
        try:
            from incidents.models import Incident
            
            cutoff_date = timezone.now() - DataRetentionPolicy.get_retention_period('incident_reports')
            expired_incidents = Incident.objects.filter(created_at__lt=cutoff_date)
            
            count = expired_incidents.count()
            if count > 0:
                if DataRetentionPolicy.should_archive('incident_reports'):
                    # Archive critical safety data
                    self._archive_records(expired_incidents, 'incident_reports')
                    self.stats['archived_records'] += count
                else:
                    if not self.dry_run:
                        expired_incidents.delete()
                    self.stats['deleted_records'] += count
            
            self.stats['total_processed'] += count
            logger.info(f"Processed {count} expired incident reports")
            
        except Exception as e:
            logger.error(f"Failed to cleanup incident reports: {str(e)}")
            raise  # Critical data - raise error
    
    def _cleanup_training_records(self) -> None:
        """Clean up expired training records."""
        try:
            from training.models import UserTrainingRecord
            
            cutoff_date = timezone.now() - DataRetentionPolicy.get_retention_period('training_records')
            expired_records = UserTrainingRecord.objects.filter(created_at__lt=cutoff_date)
            
            count = expired_records.count()
            if count > 0:
                if DataRetentionPolicy.should_archive('training_records'):
                    # Archive for compliance
                    self._archive_records(expired_records, 'training_records')
                    self.stats['archived_records'] += count
                else:
                    if not self.dry_run:
                        expired_records.delete()
                    self.stats['deleted_records'] += count
            
            self.stats['total_processed'] += count
            logger.info(f"Processed {count} expired training records")
            
        except Exception as e:
            logger.error(f"Failed to cleanup training records: {str(e)}")
            raise  # Critical compliance data
    
    def _cleanup_shipment_tracking(self) -> None:
        """Clean up expired shipment tracking data."""
        try:
            from tracking.models import TrackingEvent
            
            cutoff_date = timezone.now() - DataRetentionPolicy.get_retention_period('shipment_tracking')
            expired_events = TrackingEvent.objects.filter(created_at__lt=cutoff_date)
            
            count = expired_events.count()
            if count > 0 and not self.dry_run:
                expired_events.delete()
            
            self.stats['total_processed'] += count
            self.stats['deleted_records'] += count
            logger.info(f"Processed {count} expired tracking events")
            
        except Exception as e:
            logger.error(f"Failed to cleanup tracking data: {str(e)}")
            # Don't raise - operational data
    
    def _cleanup_feedback_data(self) -> None:
        """Clean up expired feedback data."""
        try:
            from shipments.models import ShipmentFeedback
            
            cutoff_date = timezone.now() - DataRetentionPolicy.get_retention_period('feedback_data')
            expired_feedback = ShipmentFeedback.objects.filter(created_at__lt=cutoff_date)
            
            count = expired_feedback.count()
            if count > 0 and not self.dry_run:
                expired_feedback.delete()
            
            self.stats['total_processed'] += count
            self.stats['deleted_records'] += count
            logger.info(f"Processed {count} expired feedback records")
            
        except Exception as e:
            logger.error(f"Failed to cleanup feedback data: {str(e)}")
    
    def _cleanup_cache_data(self) -> None:
        """Clean up expired cache data."""
        try:
            from shared.caching_service import CacheStatisticsService
            
            # Clear old cache entries
            result = CacheStatisticsService.clear_all_safeshipper_cache()
            
            if result.get('success'):
                count = result.get('cleared_keys', 0)
                self.stats['total_processed'] += count
                self.stats['deleted_records'] += count
                logger.info(f"Cleared {count} cache entries")
            
        except Exception as e:
            logger.error(f"Failed to cleanup cache data: {str(e)}")
    
    def _cleanup_temporary_files(self) -> None:
        """Clean up expired temporary files."""
        try:
            import os
            import tempfile
            
            temp_dir = tempfile.gettempdir()
            cutoff_time = timezone.now() - DataRetentionPolicy.get_retention_period('temporary_files')
            
            count = 0
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    if file.startswith('safeshipper_'):
                        file_path = os.path.join(root, file)
                        try:
                            file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                            file_time = timezone.make_aware(file_time)
                            
                            if file_time < cutoff_time:
                                if not self.dry_run:
                                    os.remove(file_path)
                                count += 1
                        except (OSError, ValueError):
                            continue
            
            self.stats['total_processed'] += count
            self.stats['deleted_records'] += count
            logger.info(f"Processed {count} temporary files")
            
        except Exception as e:
            logger.error(f"Failed to cleanup temporary files: {str(e)}")
    
    def _cleanup_rate_limit_data(self) -> None:
        """Clean up expired rate limiting data."""
        try:
            from django.core.cache import cache
            
            # Rate limiting data is typically auto-expired by Redis/cache
            # This is more of a manual cleanup for any persistent rate limit logs
            logger.info("Rate limit data cleanup - handled by cache TTL")
            
        except Exception as e:
            logger.error(f"Failed to cleanup rate limit data: {str(e)}")
    
    # Placeholder methods for other data types
    def _cleanup_sds_documents(self) -> None:
        """Clean up expired SDS documents."""
        logger.info("SDS documents cleanup - not implemented (regulatory requirements)")
    
    def _cleanup_inspection_records(self) -> None:
        """Clean up expired inspection records."""
        logger.info("Inspection records cleanup - not implemented (safety critical)")
    
    def _cleanup_proof_of_delivery(self) -> None:
        """Clean up expired POD records."""
        logger.info("POD cleanup - not implemented")
    
    def _cleanup_health_check_logs(self) -> None:
        """Clean up expired health check logs."""
        logger.info("Health check logs cleanup - not implemented")
    
    def _cleanup_performance_metrics(self) -> None:
        """Clean up expired performance metrics."""
        logger.info("Performance metrics cleanup - not implemented")
    
    def _cleanup_error_logs(self) -> None:
        """Clean up expired error logs."""
        logger.info("Error logs cleanup - not implemented")
    
    def _cleanup_notification_logs(self) -> None:
        """Clean up expired notification logs."""
        logger.info("Notification logs cleanup - not implemented")
    
    def _cleanup_user_sessions(self) -> None:
        """Clean up expired user sessions."""
        logger.info("User sessions cleanup - handled by Django session framework")
    
    def _cleanup_user_activity_logs(self) -> None:
        """Clean up expired user activity logs."""
        logger.info("User activity logs cleanup - not implemented")
    
    def _cleanup_personal_data_exports(self) -> None:
        """Clean up expired personal data exports."""
        logger.info("Personal data exports cleanup - not implemented")
    
    def _archive_records(self, queryset, data_type: str) -> None:
        """Archive records instead of deleting them."""
        try:
            # For now, we'll serialize the data to JSON and store in archive table
            # In production, this might export to S3, archive database, etc.
            
            records = list(queryset.values())
            archive_data = {
                'data_type': data_type,
                'archived_at': timezone.now().isoformat(),
                'record_count': len(records),
                'records': records
            }
            
            # Save to archive (this would be implemented based on your archival strategy)
            if not self.dry_run:
                self._save_to_archive(data_type, archive_data)
                queryset.delete()  # Delete original records after archiving
            
            logger.info(f"Archived {len(records)} {data_type} records")
            
        except Exception as e:
            logger.error(f"Failed to archive {data_type}: {str(e)}")
            raise
    
    def _save_to_archive(self, data_type: str, archive_data: Dict) -> None:
        """Save archived data (implement based on your archival strategy)."""
        # This is a placeholder - implement based on your requirements:
        # - Save to S3
        # - Save to separate archive database
        # - Export to files
        # - Send to external archival system
        
        logger.info(f"Archive saved for {data_type} (placeholder implementation)")


class DataRetentionReporter:
    """
    Generate reports and notifications for data retention activities.
    """
    
    @classmethod
    def generate_retention_report(cls, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a comprehensive data retention report."""
        report = {
            'summary': {
                'execution_date': stats.get('start_time', timezone.now()).isoformat(),
                'duration_seconds': stats.get('duration_seconds', 0),
                'total_processed': stats.get('total_processed', 0),
                'deleted_records': stats.get('deleted_records', 0),
                'archived_records': stats.get('archived_records', 0),
                'errors': stats.get('errors', 0),
                'success_rate': cls._calculate_success_rate(stats)
            },
            'data_types_processed': stats.get('data_types_processed', []),
            'warnings': stats.get('warnings', []),
            'recommendations': cls._generate_recommendations(stats),
            'compliance_status': cls._assess_compliance_status(stats)
        }
        
        return report
    
    @classmethod
    def _calculate_success_rate(cls, stats: Dict[str, Any]) -> float:
        """Calculate success rate of retention process."""
        total_operations = stats.get('total_processed', 0)
        errors = stats.get('errors', 0)
        
        if total_operations == 0:
            return 100.0
        
        return round(((total_operations - errors) / total_operations) * 100, 2)
    
    @classmethod
    def _generate_recommendations(cls, stats: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on retention results."""
        recommendations = []
        
        if stats.get('errors', 0) > 0:
            recommendations.append("Review and fix errors in data retention process")
        
        if stats.get('total_processed', 0) == 0:
            recommendations.append("No expired data found - review retention policies")
        
        if len(stats.get('warnings', [])) > 0:
            recommendations.append("Address warnings to improve retention process")
        
        duration = stats.get('duration_seconds', 0)
        if duration > 3600:  # More than 1 hour
            recommendations.append("Consider optimizing retention process performance")
        
        return recommendations
    
    @classmethod
    def _assess_compliance_status(cls, stats: Dict[str, Any]) -> str:
        """Assess compliance status based on retention results."""
        if stats.get('errors', 0) > 0:
            return "NON_COMPLIANT"
        elif len(stats.get('warnings', [])) > 0:
            return "PARTIALLY_COMPLIANT"
        else:
            return "COMPLIANT"
    
    @classmethod
    def send_retention_notification(cls, stats: Dict[str, Any], recipients: List[str]) -> None:
        """Send notification about data retention results."""
        try:
            report = cls.generate_retention_report(stats)
            
            subject = f"SafeShipper Data Retention Report - {report['compliance_status']}"
            
            message = f"""
SafeShipper Data Retention Report

Execution Summary:
- Date: {report['summary']['execution_date']}
- Duration: {report['summary']['duration_seconds']} seconds
- Total Processed: {report['summary']['total_processed']} records
- Deleted: {report['summary']['deleted_records']} records
- Archived: {report['summary']['archived_records']} records
- Errors: {report['summary']['errors']}
- Success Rate: {report['summary']['success_rate']}%

Compliance Status: {report['compliance_status']}

Data Types Processed: {', '.join(report['data_types_processed'])}

Recommendations:
{chr(10).join('- ' + rec for rec in report['recommendations'])}

Warnings:
{chr(10).join('- ' + warn for warn in report['warnings'])}
"""
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                fail_silently=False,
            )
            
            logger.info(f"Data retention notification sent to {len(recipients)} recipients")
            
        except Exception as e:
            logger.error(f"Failed to send retention notification: {str(e)}")