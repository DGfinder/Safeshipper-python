# shared/api_views.py
"""
Shared API views for SafeShipper system services.
Includes data retention monitoring, health checks, and system status.
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.management import call_command
from django.conf import settings
from io import StringIO
import json

from .data_retention_service import (
    DataRetentionService, DataRetentionPolicy, DataRetentionReporter
)
from .health_service import HealthCheckService
from .caching_service import CacheStatisticsService
from .permissions import IsAdminOrSystemMonitor

logger = logging.getLogger(__name__)


class DataRetentionViewSet(viewsets.ViewSet):
    """
    API endpoints for monitoring and managing SafeShipper data retention.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSystemMonitor]
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Get data retention system status and statistics.
        """
        try:
            # Get retention policies overview
            policies = {
                data_type: {
                    'retention_days': policy.days,
                    'is_critical': DataRetentionPolicy.is_critical_data(data_type),
                    'should_archive': DataRetentionPolicy.should_archive(data_type)
                }
                for data_type, policy in DataRetentionPolicy.RETENTION_PERIODS.items()
            }
            
            # Categorize policies
            policy_categories = {
                'critical_data': [dt for dt in policies.keys() if policies[dt]['is_critical']],
                'archived_data': [dt for dt in policies.keys() if policies[dt]['should_archive']],
                'operational_data': [dt for dt in policies.keys() if not policies[dt]['is_critical']],
                'total_data_types': len(policies)
            }
            
            return Response({
                'status': 'active',
                'policies': policies,
                'categories': policy_categories,
                'last_updated': timezone.now()
            })
            
        except Exception as e:
            logger.error(f"Failed to get data retention status: {str(e)}")
            return Response(
                {'error': 'Failed to get retention status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def run_cleanup(self, request):
        """
        Manually trigger data retention cleanup.
        """
        try:
            # Get parameters from request
            data_types = request.data.get('data_types')
            dry_run = request.data.get('dry_run', True)  # Default to dry run for safety
            
            # Validate data types if provided
            if data_types:
                valid_types = list(DataRetentionPolicy.RETENTION_PERIODS.keys())
                invalid_types = [dt for dt in data_types if dt not in valid_types]
                if invalid_types:
                    return Response(
                        {
                            'error': 'Invalid data types',
                            'invalid_types': invalid_types,
                            'valid_types': valid_types
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Run cleanup
            service = DataRetentionService()
            stats = service.cleanup_expired_data(data_types=data_types, dry_run=dry_run)
            
            # Generate report
            report = DataRetentionReporter.generate_retention_report(stats)
            
            return Response({
                'success': True,
                'dry_run': dry_run,
                'stats': stats,
                'report': report,
                'timestamp': timezone.now()
            })
            
        except Exception as e:
            logger.error(f"Manual cleanup failed: {str(e)}")
            return Response(
                {'error': f'Manual cleanup failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def cleanup_history(self, request):
        """
        Get history of data retention cleanup operations.
        
        This would typically query a log table or monitoring system.
        For now, returns mock historical data.
        """
        try:
            days = int(request.GET.get('days', 30))
            
            # In a real implementation, this would query actual cleanup logs
            # For now, return mock data structure
            history = []
            for i in range(min(days, 7)):  # Mock last 7 cleanup operations
                cleanup_date = timezone.now() - timedelta(days=i)
                history.append({
                    'date': cleanup_date.date(),
                    'type': 'scheduled' if i % 2 == 0 else 'manual',
                    'data_types_processed': ['cache_data', 'temporary_files'] if i % 3 == 0 else ['user_sessions'],
                    'total_processed': 50 + (i * 10),
                    'deleted_records': 40 + (i * 8),
                    'archived_records': 5 + i,
                    'errors': 0 if i % 4 != 0 else 1,
                    'success_rate': 100.0 if i % 4 != 0 else 95.0,
                    'compliance_status': 'COMPLIANT' if i % 4 != 0 else 'PARTIALLY_COMPLIANT'
                })
            
            return Response({
                'period_days': days,
                'total_operations': len(history),
                'history': history
            })
            
        except Exception as e:
            logger.error(f"Failed to get cleanup history: {str(e)}")
            return Response(
                {'error': 'Failed to get cleanup history'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def policy_info(self, request):
        """
        Get detailed information about retention policies.
        """
        try:
            data_type = request.GET.get('data_type')
            
            if data_type:
                # Get info for specific data type
                if data_type not in DataRetentionPolicy.RETENTION_PERIODS:
                    return Response(
                        {'error': f'Unknown data type: {data_type}'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                period = DataRetentionPolicy.get_retention_period(data_type)
                policy_info = {
                    'data_type': data_type,
                    'retention_period_days': period.days,
                    'retention_period_str': str(period),
                    'is_critical': DataRetentionPolicy.is_critical_data(data_type),
                    'should_archive': DataRetentionPolicy.should_archive(data_type),
                    'policy_category': self._get_policy_category(data_type)
                }
                
                return Response(policy_info)
            else:
                # Get summary of all policies
                policies_by_category = {
                    'compliance_audit': [],
                    'operational': [],
                    'system': [],
                    'personal_data': []
                }
                
                for data_type in DataRetentionPolicy.RETENTION_PERIODS.keys():
                    category = self._get_policy_category(data_type)
                    period = DataRetentionPolicy.get_retention_period(data_type)
                    
                    policy_info = {
                        'data_type': data_type,
                        'retention_days': period.days,
                        'is_critical': DataRetentionPolicy.is_critical_data(data_type),
                        'should_archive': DataRetentionPolicy.should_archive(data_type)
                    }
                    
                    policies_by_category[category].append(policy_info)
                
                return Response({
                    'policies_by_category': policies_by_category,
                    'total_policies': len(DataRetentionPolicy.RETENTION_PERIODS)
                })
                
        except Exception as e:
            logger.error(f"Failed to get policy info: {str(e)}")
            return Response(
                {'error': 'Failed to get policy information'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generate_report(self, request):
        """
        Generate comprehensive data retention report.
        """
        try:
            report_type = request.data.get('type', 'summary')  # summary, detailed, compliance
            format_type = request.data.get('format', 'json')  # json, text
            include_history = request.data.get('include_history', False)
            
            # Get current status
            service = DataRetentionService()
            
            # Run dry run to get current data overview
            stats = service.cleanup_expired_data(dry_run=True)
            report = DataRetentionReporter.generate_retention_report(stats)
            
            # Add additional information based on report type
            if report_type == 'detailed':
                report['policy_details'] = {
                    data_type: {
                        'retention_days': policy.days,
                        'category': self._get_policy_category(data_type),
                        'is_critical': DataRetentionPolicy.is_critical_data(data_type),
                        'should_archive': DataRetentionPolicy.should_archive(data_type)
                    }
                    for data_type, policy in DataRetentionPolicy.RETENTION_PERIODS.items()
                }
            
            if report_type == 'compliance':
                report['compliance_details'] = {
                    'critical_data_types': DataRetentionPolicy.CRITICAL_DATA_TYPES,
                    'archived_data_types': DataRetentionPolicy.ARCHIVE_INSTEAD_OF_DELETE,
                    'regulatory_requirements': {
                        'audit_logs': '7 years (regulatory requirement)',
                        'incident_reports': '7 years (safety critical)',
                        'training_records': '7 years (compliance)',
                        'sds_documents': '3 years (regulatory)'
                    }
                }
            
            if include_history:
                # Add mock history data
                report['cleanup_history'] = self._get_mock_history(7)
            
            if format_type == 'text':
                # Format as human-readable text
                text_report = self._format_text_report(report)
                return Response({
                    'report_type': report_type,
                    'format': 'text',
                    'content': text_report,
                    'generated_at': timezone.now()
                })
            else:
                return Response({
                    'report_type': report_type,
                    'format': 'json',
                    'report': report,
                    'generated_at': timezone.now()
                })
                
        except Exception as e:
            logger.error(f"Failed to generate retention report: {str(e)}")
            return Response(
                {'error': 'Failed to generate report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_policy_category(self, data_type):
        """Categorize data type by policy purpose"""
        compliance_types = ['audit_logs', 'authentication_logs', 'incident_reports', 'training_records', 'inspection_records', 'sds_documents']
        operational_types = ['shipment_tracking', 'proof_of_delivery', 'feedback_data']
        personal_types = ['user_sessions', 'user_activity_logs', 'personal_data_exports']
        
        if data_type in compliance_types:
            return 'compliance_audit'
        elif data_type in operational_types:
            return 'operational'
        elif data_type in personal_types:
            return 'personal_data'
        else:
            return 'system'
    
    def _get_mock_history(self, days):
        """Generate mock cleanup history"""
        history = []
        for i in range(days):
            cleanup_date = timezone.now() - timedelta(days=i)
            history.append({
                'date': cleanup_date.date().isoformat(),
                'records_processed': 50 + (i * 10),
                'records_deleted': 40 + (i * 8),
                'success': i % 5 != 0
            })
        return history
    
    def _format_text_report(self, report):
        """Format report as human-readable text"""
        text_lines = [
            "SafeShipper Data Retention Report",
            "=" * 40,
            "",
            f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "Summary:",
            f"  Total Processed: {report.get('summary', {}).get('total_processed', 0)}",
            f"  Deleted Records: {report.get('summary', {}).get('deleted_records', 0)}",
            f"  Archived Records: {report.get('summary', {}).get('archived_records', 0)}",
            f"  Success Rate: {report.get('summary', {}).get('success_rate', 0)}%",
            f"  Compliance Status: {report.get('compliance_status', 'UNKNOWN')}",
            ""
        ]
        
        if report.get('recommendations'):
            text_lines.extend([
                "Recommendations:",
                *[f"  • {rec}" for rec in report['recommendations']],
                ""
            ])
        
        return "\n".join(text_lines)


class SystemHealthViewSet(viewsets.ViewSet):
    """
    API endpoints for SafeShipper system health monitoring.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSystemMonitor]
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Get comprehensive system health status.
        """
        try:
            health_data = HealthCheckService.comprehensive_health_check()
            
            return Response({
                'timestamp': timezone.now(),
                'health_data': health_data,
                'summary': {
                    'overall_status': health_data.get('status', 'unknown'),
                    'healthy_services': len([s for s in health_data.get('services', {}).values() if s.get('status') == 'healthy']),
                    'total_services': len(health_data.get('services', {})),
                    'health_percentage': health_data.get('summary', {}).get('health_percentage', 0)
                }
            })
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return Response(
                {'error': 'Health check failed', 'timestamp': timezone.now()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def cache_stats(self, request):
        """
        Get cache system statistics.
        """
        try:
            cache_stats = CacheStatisticsService.get_cache_stats()
            
            return Response({
                'timestamp': timezone.now(),
                'cache_stats': cache_stats,
                'recommendations': self._get_cache_recommendations(cache_stats)
            })
            
        except Exception as e:
            logger.error(f"Cache stats failed: {str(e)}")
            return Response(
                {'error': 'Failed to get cache statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_cache_recommendations(self, cache_stats):
        """Generate cache optimization recommendations"""
        recommendations = []
        
        memory_usage = cache_stats.get('memory_usage_mb', 0)
        if memory_usage > 400:  # High memory usage
            recommendations.append('Consider clearing old cache entries - high memory usage detected')
        
        hit_rate = cache_stats.get('hit_rate', 0)
        if hit_rate < 70:  # Low hit rate
            recommendations.append('Cache hit rate is low - review caching strategy')
        
        total_keys = cache_stats.get('total_keys', 0)
        if total_keys > 8000:  # High key count
            recommendations.append('High number of cache keys - consider cleanup')
        
        return recommendations
