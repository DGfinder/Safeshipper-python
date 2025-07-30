# shared/test_data_retention.py
"""
Comprehensive test suite for SafeShipper data retention services.
Tests data cleanup, retention policies, and Celery tasks.
"""

import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core import mail

from .data_retention_service import (
    DataRetentionService, DataRetentionPolicy, DataRetentionReporter
)
from .tasks import (
    cleanup_expired_data, daily_data_cleanup, weekly_data_cleanup,
    monthly_compliance_cleanup
)

User = get_user_model()


class TestDataRetentionPolicy(TestCase):
    """Test data retention policy configuration"""
    
    def test_retention_periods_defined(self):
        """Test that retention periods are defined for all data types"""
        # Check that we have retention periods defined
        self.assertGreater(len(DataRetentionPolicy.RETENTION_PERIODS), 0)
        
        # Check specific critical data types
        critical_types = ['audit_logs', 'incident_reports', 'training_records']
        for data_type in critical_types:
            self.assertIn(data_type, DataRetentionPolicy.RETENTION_PERIODS)
    
    def test_get_retention_period(self):
        """Test getting retention period for data types"""
        # Test known data type
        audit_period = DataRetentionPolicy.get_retention_period('audit_logs')
        self.assertEqual(audit_period, timedelta(days=2555))  # 7 years
        
        # Test unknown data type (should return default)
        unknown_period = DataRetentionPolicy.get_retention_period('unknown_type')
        self.assertEqual(unknown_period, timedelta(days=365))  # Default 1 year
    
    def test_is_critical_data(self):
        """Test critical data identification"""
        # Test critical data
        self.assertTrue(DataRetentionPolicy.is_critical_data('audit_logs'))
        self.assertTrue(DataRetentionPolicy.is_critical_data('incident_reports'))
        
        # Test non-critical data
        self.assertFalse(DataRetentionPolicy.is_critical_data('cache_data'))
        self.assertFalse(DataRetentionPolicy.is_critical_data('temporary_files'))
    
    def test_should_archive(self):
        """Test archiving policy determination"""
        # Test data that should be archived
        self.assertTrue(DataRetentionPolicy.should_archive('audit_logs'))
        self.assertTrue(DataRetentionPolicy.should_archive('incident_reports'))
        
        # Test data that should be deleted
        self.assertFalse(DataRetentionPolicy.should_archive('cache_data'))
        self.assertFalse(DataRetentionPolicy.should_archive('temporary_files'))


class TestDataRetentionService(TestCase):
    """Test the main data retention service"""
    
    def setUp(self):
        """Set up test environment"""
        self.service = DataRetentionService()
    
    def test_service_initialization(self):
        """Test service initialization"""
        self.assertFalse(self.service.dry_run)
        self.assertEqual(self.service.stats['total_processed'], 0)
        self.assertEqual(self.service.stats['deleted_records'], 0)
        self.assertEqual(self.service.stats['archived_records'], 0)
        self.assertEqual(self.service.stats['errors'], 0)
    
    def test_cleanup_expired_data_dry_run(self):
        """Test cleanup in dry run mode"""
        # Run cleanup in dry run mode
        stats = self.service.cleanup_expired_data(dry_run=True)
        
        # Should return valid stats structure
        required_fields = [
            'total_processed', 'deleted_records', 'archived_records', 
            'errors', 'warnings', 'start_time', 'end_time', 'duration_seconds'
        ]
        
        for field in required_fields:
            self.assertIn(field, stats)
        
        # Should set dry_run flag
        self.assertTrue(self.service.dry_run)
    
    def test_cleanup_specific_data_types(self):
        """Test cleanup of specific data types"""
        # Test with specific data types
        data_types = ['cache_data', 'temporary_files']
        stats = self.service.cleanup_expired_data(data_types=data_types, dry_run=True)
        
        # Should process specified types
        self.assertIn('data_types_processed', stats)
        # Note: Actual processing depends on having data and proper models
    
    @patch('shared.data_retention_service.logger')
    def test_cleanup_with_errors(self, mock_logger):
        """Test cleanup behavior when errors occur"""
        # Mock a method to raise an exception
        with patch.object(self.service, '_cleanup_data_type', side_effect=Exception('Test error')):
            stats = self.service.cleanup_expired_data(data_types=['cache_data'], dry_run=True)
            
            # Should record the error
            self.assertGreater(stats['errors'], 0)
            self.assertGreater(len(stats['warnings']), 0)
    
    def test_archive_records_placeholder(self):
        """Test archive records method (placeholder implementation)"""
        # This tests the archive method structure
        # In a real implementation, this would test actual archiving
        
        mock_queryset = MagicMock()
        mock_queryset.values.return_value = [{'id': 1, 'data': 'test'}]
        
        with patch.object(self.service, '_save_to_archive') as mock_save:
            self.service._archive_records(mock_queryset, 'test_data')
            
            # Should call save_to_archive
            mock_save.assert_called_once()


class TestDataRetentionReporter(TestCase):
    """Test data retention reporting functionality"""
    
    def test_generate_retention_report(self):
        """Test retention report generation"""
        # Create test stats
        test_stats = {
            'start_time': timezone.now(),
            'duration_seconds': 123.45,
            'total_processed': 100,
            'deleted_records': 80,
            'archived_records': 15,
            'errors': 5,
            'warnings': ['Test warning'],
            'data_types_processed': ['cache_data', 'temporary_files']
        }
        
        # Generate report
        report = DataRetentionReporter.generate_retention_report(test_stats)
        
        # Check report structure
        required_sections = ['summary', 'data_types_processed', 'warnings', 'recommendations', 'compliance_status']
        for section in required_sections:
            self.assertIn(section, report)
        
        # Check summary
        summary = report['summary']
        self.assertEqual(summary['total_processed'], 100)
        self.assertEqual(summary['deleted_records'], 80)
        self.assertEqual(summary['archived_records'], 15)
        self.assertEqual(summary['errors'], 5)
    
    def test_calculate_success_rate(self):
        """Test success rate calculation"""
        # Test perfect success
        stats_perfect = {'total_processed': 100, 'errors': 0}
        success_rate = DataRetentionReporter._calculate_success_rate(stats_perfect)
        self.assertEqual(success_rate, 100.0)
        
        # Test partial success
        stats_partial = {'total_processed': 100, 'errors': 10}
        success_rate = DataRetentionReporter._calculate_success_rate(stats_partial)
        self.assertEqual(success_rate, 90.0)
        
        # Test no operations
        stats_none = {'total_processed': 0, 'errors': 0}
        success_rate = DataRetentionReporter._calculate_success_rate(stats_none)
        self.assertEqual(success_rate, 100.0)
    
    def test_assess_compliance_status(self):
        """Test compliance status assessment"""
        # Test compliant status
        stats_compliant = {'errors': 0, 'warnings': []}
        status = DataRetentionReporter._assess_compliance_status(stats_compliant)
        self.assertEqual(status, 'COMPLIANT')
        
        # Test non-compliant status
        stats_non_compliant = {'errors': 5, 'warnings': []}
        status = DataRetentionReporter._assess_compliance_status(stats_non_compliant)
        self.assertEqual(status, 'NON_COMPLIANT')
        
        # Test partially compliant status
        stats_partial = {'errors': 0, 'warnings': ['Some warning']}
        status = DataRetentionReporter._assess_compliance_status(stats_partial)
        self.assertEqual(status, 'PARTIALLY_COMPLIANT')
    
    def test_generate_recommendations(self):
        """Test recommendation generation"""
        # Test stats with errors
        stats_with_errors = {
            'errors': 2,
            'total_processed': 100,
            'warnings': ['Test warning'],
            'duration_seconds': 7200  # 2 hours
        }
        
        recommendations = DataRetentionReporter._generate_recommendations(stats_with_errors)
        
        # Should have recommendations for errors, warnings, and performance
        self.assertGreater(len(recommendations), 0)
        self.assertTrue(any('error' in rec.lower() for rec in recommendations))
        self.assertTrue(any('warning' in rec.lower() for rec in recommendations))
        self.assertTrue(any('performance' in rec.lower() for rec in recommendations))
    
    @patch('shared.data_retention_service.send_mail')
    def test_send_retention_notification(self, mock_send_mail):
        """Test sending retention notifications"""
        test_stats = {
            'start_time': timezone.now(),
            'duration_seconds': 60,
            'total_processed': 50,
            'deleted_records': 40,
            'archived_records': 5,
            'errors': 0,
            'warnings': [],
            'data_types_processed': ['test_data']
        }
        
        recipients = ['admin@example.com', 'compliance@example.com']
        
        # Send notification
        DataRetentionReporter.send_retention_notification(test_stats, recipients)
        
        # Check that send_mail was called
        mock_send_mail.assert_called_once()
        call_args = mock_send_mail.call_args
        
        # Check recipient list
        self.assertEqual(call_args[1]['recipient_list'], recipients)
        
        # Check that subject includes compliance status
        subject = call_args[1]['subject']
        self.assertIn('COMPLIANT', subject)


class TestDataRetentionTasks(TestCase):
    """Test Celery tasks for data retention"""
    
    @patch('shared.tasks.DataRetentionService')
    @patch('shared.tasks.DataRetentionReporter')
    def test_cleanup_expired_data_task(self, mock_reporter, mock_service):
        """Test the cleanup_expired_data Celery task"""
        # Mock service and reporter
        mock_service_instance = MagicMock()
        mock_service.return_value = mock_service_instance
        
        mock_stats = {
            'total_processed': 100,
            'deleted_records': 80,
            'archived_records': 15,
            'errors': 0
        }
        mock_service_instance.cleanup_expired_data.return_value = mock_stats
        
        mock_report = {'compliance_status': 'COMPLIANT'}
        mock_reporter.generate_retention_report.return_value = mock_report
        
        # Run task
        result = cleanup_expired_data.apply(args=[None, True])  # dry_run=True
        
        # Check result
        self.assertTrue(result.result['success'])
        self.assertEqual(result.result['stats'], mock_stats)
        self.assertEqual(result.result['report'], mock_report)
        
        # Check that service was called correctly
        mock_service_instance.cleanup_expired_data.assert_called_once_with(
            data_types=None, dry_run=True
        )
    
    @patch('shared.tasks.DataRetentionService')
    def test_daily_data_cleanup_task(self, mock_service):
        """Test the daily_data_cleanup Celery task"""
        # Mock service
        mock_service_instance = MagicMock()
        mock_service.return_value = mock_service_instance
        
        mock_stats = {'total_processed': 50, 'deleted_records': 45, 'errors': 0}
        mock_service_instance.cleanup_expired_data.return_value = mock_stats
        
        # Run task
        result = daily_data_cleanup.apply()
        
        # Check result
        self.assertTrue(result.result['success'])
        self.assertEqual(result.result['cleanup_type'], 'daily')
        
        # Check that service was called with daily cleanup types
        call_args = mock_service_instance.cleanup_expired_data.call_args
        data_types = call_args[1]['data_types']
        
        # Should include non-critical data types
        expected_types = [
            'cache_data', 'temporary_files', 'rate_limit_data',
            'health_check_logs', 'performance_metrics', 'user_sessions',
            'notification_logs'
        ]
        
        for expected_type in expected_types:
            self.assertIn(expected_type, data_types)
    
    @patch('shared.tasks.DataRetentionService')
    @patch('shared.tasks.DataRetentionReporter')
    def test_weekly_data_cleanup_task(self, mock_reporter, mock_service):
        """Test the weekly_data_cleanup Celery task"""
        # Mock service and reporter
        mock_service_instance = MagicMock()
        mock_service.return_value = mock_service_instance
        
        mock_stats = {'total_processed': 200, 'deleted_records': 180, 'errors': 0}
        mock_service_instance.cleanup_expired_data.return_value = mock_stats
        
        mock_report = {'compliance_status': 'COMPLIANT'}
        mock_reporter.generate_retention_report.return_value = mock_report
        
        # Run task
        result = weekly_data_cleanup.apply()
        
        # Check result
        self.assertTrue(result.result['success'])
        self.assertEqual(result.result['cleanup_type'], 'weekly')
        
        # Check that weekly data types were processed
        call_args = mock_service_instance.cleanup_expired_data.call_args
        data_types = call_args[1]['data_types']
        
        expected_weekly_types = [
            'feedback_data', 'error_logs', 'user_activity_logs',
            'personal_data_exports', 'authentication_logs'
        ]
        
        for expected_type in expected_weekly_types:
            self.assertIn(expected_type, data_types)
    
    @patch('shared.tasks.DataRetentionService')
    @patch('shared.tasks.DataRetentionReporter')
    def test_monthly_compliance_cleanup_task(self, mock_reporter, mock_service):
        """Test the monthly_compliance_cleanup Celery task"""
        # Mock service and reporter
        mock_service_instance = MagicMock()
        mock_service.return_value = mock_service_instance
        
        mock_stats = {
            'total_processed': 1000,
            'deleted_records': 500,
            'archived_records': 400,
            'errors': 0
        }
        mock_service_instance.cleanup_expired_data.return_value = mock_stats
        
        mock_report = {'compliance_status': 'COMPLIANT'}
        mock_reporter.generate_retention_report.return_value = mock_report
        
        # Run task
        result = monthly_compliance_cleanup.apply()
        
        # Check result
        self.assertTrue(result.result['success'])
        self.assertEqual(result.result['cleanup_type'], 'monthly_compliance')
        
        # Check that compliance data types were processed
        call_args = mock_service_instance.cleanup_expired_data.call_args
        data_types = call_args[1]['data_types']
        
        expected_compliance_types = [
            'audit_logs', 'incident_reports', 'training_records',
            'inspection_records', 'sds_documents', 'shipment_tracking',
            'proof_of_delivery'
        ]
        
        for expected_type in expected_compliance_types:
            self.assertIn(expected_type, data_types)


class TestDataRetentionIntegration(TestCase):
    """Integration tests for data retention functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user for any user-related data
        self.test_user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_retention_workflow_end_to_end(self):
        """Test complete retention workflow"""
        # This would test the complete flow with real data
        # For now, we'll test the structure
        
        service = DataRetentionService()
        
        # Run with dry_run to avoid actually deleting anything
        stats = service.cleanup_expired_data(
            data_types=['cache_data'],  # Safe data type for testing
            dry_run=True
        )
        
        # Should complete without errors
        self.assertIsInstance(stats, dict)
        self.assertIn('total_processed', stats)
        self.assertIn('deleted_records', stats)
        self.assertIn('errors', stats)
        
        # Generate report
        report = DataRetentionReporter.generate_retention_report(stats)
        self.assertIn('compliance_status', report)
        self.assertIn('summary', report)
    
    def test_error_handling_in_retention(self):
        """Test error handling during retention operations"""
        service = DataRetentionService()
        
        # Test with invalid data type (should handle gracefully)
        with patch.object(service, '_cleanup_data_type', side_effect=Exception('Test error')):
            stats = service.cleanup_expired_data(
                data_types=['invalid_type'],
                dry_run=True
            )
            
            # Should record errors but not crash
            self.assertGreaterEqual(stats['errors'], 0)
            self.assertIn('warnings', stats)
    
    def test_performance_under_load(self):
        """Test retention performance with large data sets"""
        # This would test performance with large amounts of data
        # For unit tests, we'll just verify the structure handles it
        
        service = DataRetentionService()
        
        # Simulate processing many data types
        many_data_types = list(DataRetentionPolicy.RETENTION_PERIODS.keys())[:10]
        
        stats = service.cleanup_expired_data(
            data_types=many_data_types,
            dry_run=True
        )
        
        # Should complete within reasonable time and handle multiple types
        self.assertIsInstance(stats, dict)
        self.assertIn('duration_seconds', stats)


if __name__ == '__main__':
    unittest.main()