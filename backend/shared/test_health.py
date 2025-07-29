# shared/test_health.py
"""
Comprehensive test suite for SafeShipper health check services.
Tests health monitoring functionality for all critical systems.
"""

import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
import psutil
import time

from .health_service import HealthCheckService, ServiceDependencyChecker

User = get_user_model()


class TestHealthCheckService(TestCase):
    """Test the main health check service functionality"""
    
    def setUp(self):
        """Set up test environment"""
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests"""
        cache.clear()
    
    def test_comprehensive_health_check_structure(self):
        """Test that comprehensive health check returns expected structure"""
        health_data = HealthCheckService.comprehensive_health_check()
        
        # Check required fields
        required_fields = [
            'timestamp', 'status', 'version', 'environment',
            'services', 'system_metrics', 'summary', 'response_time_ms'
        ]
        
        for field in required_fields:
            self.assertIn(field, health_data)
        
        # Check summary structure
        summary_fields = [
            'total_services', 'healthy_services', 
            'degraded_services', 'failed_services', 'health_percentage'
        ]
        
        for field in summary_fields:
            self.assertIn(field, health_data['summary'])
        
        # Check that we have services data
        self.assertIsInstance(health_data['services'], dict)
        self.assertGreater(len(health_data['services']), 0)
    
    def test_database_health_check(self):
        """Test database health check functionality"""
        db_health = HealthCheckService._check_database()
        
        # Should return proper structure
        self.assertIn('status', db_health)
        self.assertIn('message', db_health)
        self.assertIn('timestamp', db_health)
        
        # Database should be healthy in test environment
        self.assertEqual(db_health['status'], 'healthy')
        self.assertIn('response_time_ms', db_health)
        self.assertIsInstance(db_health['response_time_ms'], (int, float))
    
    def test_cache_health_check(self):
        """Test cache health check functionality"""
        cache_health = HealthCheckService._check_cache()
        
        # Should return proper structure
        self.assertIn('status', cache_health)
        self.assertIn('message', cache_health)
        self.assertIn('timestamp', cache_health)
        
        # Cache should be functional
        self.assertIn(cache_health['status'], ['healthy', 'degraded'])
        if 'response_time_ms' in cache_health:
            self.assertIsInstance(cache_health['response_time_ms'], (int, float))
    
    def test_dangerous_goods_data_check(self):
        """Test dangerous goods data availability check"""
        dg_health = HealthCheckService._check_dangerous_goods_data()
        
        # Should return proper structure
        self.assertIn('status', dg_health)
        self.assertIn('message', dg_health)
        self.assertIn('timestamp', dg_health)
        
        # Check that it reports on data availability
        if 'total_records' in dg_health:
            self.assertIsInstance(dg_health['total_records'], int)
    
    def test_file_storage_check(self):
        """Test file storage system check"""
        storage_health = HealthCheckService._check_file_storage()
        
        # Should return proper structure
        self.assertIn('status', storage_health)
        self.assertIn('message', storage_health)
        self.assertIn('timestamp', storage_health)
        
        # Should include storage backend info
        if 'storage_backend' in storage_health:
            self.assertIsInstance(storage_health['storage_backend'], str)
    
    def test_system_metrics_collection(self):
        """Test system metrics collection"""
        metrics = HealthCheckService._get_system_metrics()
        
        # Should return proper structure
        expected_fields = ['cpu_usage_percent', 'memory', 'disk', 'timestamp']
        for field in expected_fields:
            self.assertIn(field, metrics)
        
        # Check memory structure
        memory_fields = ['total_gb', 'available_gb', 'used_percent']
        for field in memory_fields:
            self.assertIn(field, metrics['memory'])
        
        # Check disk structure
        disk_fields = ['total_gb', 'free_gb', 'used_percent']
        for field in disk_fields:
            self.assertIn(field, metrics['disk'])
        
        # Check value types
        self.assertIsInstance(metrics['cpu_usage_percent'], (int, float))
        self.assertIsInstance(metrics['memory']['used_percent'], (int, float))
        self.assertIsInstance(metrics['disk']['used_percent'], (int, float))
    
    def test_health_summary_calculation(self):
        """Test health summary calculation logic"""
        test_health_data = {
            'services': {
                'service1': {'status': 'healthy'},
                'service2': {'status': 'healthy'},
                'service3': {'status': 'degraded'},
                'service4': {'status': 'failed'}
            },
            'summary': {}
        }
        
        HealthCheckService._calculate_health_summary(test_health_data)
        
        summary = test_health_data['summary']
        self.assertEqual(summary['total_services'], 4)
        self.assertEqual(summary['healthy_services'], 2)
        self.assertEqual(summary['degraded_services'], 1)
        self.assertEqual(summary['failed_services'], 1)
        self.assertEqual(summary['health_percentage'], 50.0)
    
    def test_overall_status_determination(self):
        """Test overall status determination logic"""
        # Test healthy status
        health_data_healthy = HealthCheckService.comprehensive_health_check()
        
        # Status should be one of the expected values
        self.assertIn(health_data_healthy['status'], ['healthy', 'degraded', 'unhealthy'])
        
        # Response time should be reasonable
        self.assertLess(health_data_healthy['response_time_ms'], 10000)  # Less than 10 seconds


class TestServiceDependencyChecker(TestCase):
    """Test the service dependency checker"""
    
    def test_dangerous_goods_dependencies_structure(self):
        """Test dangerous goods dependencies check structure"""
        dg_deps = ServiceDependencyChecker.check_dangerous_goods_dependencies()
        
        # Should return proper structure
        required_fields = ['status', 'dependencies', 'timestamp']
        for field in required_fields:
            self.assertIn(field, dg_deps)
        
        # Check dependencies structure
        expected_deps = [
            'dangerous_goods_models', 'segregation_rules', 
            'emergency_procedures', 'placard_rules'
        ]
        
        for dep in expected_deps:
            self.assertIn(dep, dg_deps['dependencies'])
            self.assertIn('status', dg_deps['dependencies'][dep])
            self.assertIn('message', dg_deps['dependencies'][dep])
    
    def test_dangerous_goods_models_check(self):
        """Test dangerous goods models data check"""
        models_health = ServiceDependencyChecker._check_dangerous_goods_models()
        
        # Should return proper structure
        self.assertIn('status', models_health)
        self.assertIn('message', models_health)
        
        # Status should be valid
        self.assertIn(models_health['status'], ['healthy', 'degraded', 'failed'])


class TestHealthCheckAPI(TestCase):
    """Test health check API endpoints"""
    
    def setUp(self):
        """Set up test users and client"""
        self.client = APIClient()
        
        # Create test users
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
    
    def test_system_health_endpoint_authenticated(self):
        """Test system health endpoint with authenticated user"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/shared/health/')
        
        # Should return successful response
        self.assertIn(response.status_code, [200, 503])  # 503 if services are down
        
        # Check response structure
        data = response.json()
        self.assertIn('status', data)
        self.assertIn('timestamp', data)
        self.assertIn('checked_by', data)
        self.assertEqual(data['checked_by'], 'testuser')
    
    def test_system_health_endpoint_unauthenticated(self):
        """Test system health endpoint without authentication"""
        response = self.client.get('/api/shared/health/')
        
        # Should require authentication
        self.assertEqual(response.status_code, 401)
    
    def test_detailed_health_endpoint_admin_only(self):
        """Test detailed health endpoint requires admin access"""
        # Test with regular user
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/shared/health/detailed/')
        self.assertEqual(response.status_code, 403)  # Forbidden
        
        # Test with admin user
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/shared/health/detailed/')
        self.assertIn(response.status_code, [200, 503])
        
        if response.status_code == 200:
            data = response.json()
            self.assertIn('dangerous_goods_dependencies', data)
            self.assertIn('check_level', data)
            self.assertEqual(data['check_level'], 'detailed')
    
    def test_service_health_endpoint(self):
        """Test individual service health endpoint"""
        self.client.force_authenticate(user=self.user)
        
        # Test valid service
        response = self.client.get('/api/shared/health/service/database/')
        self.assertIn(response.status_code, [200, 503])
        
        if response.status_code == 200:
            data = response.json()
            self.assertIn('service_name', data)
            self.assertEqual(data['service_name'], 'database')
            self.assertIn('status', data)
        
        # Test invalid service
        response = self.client.get('/api/shared/health/service/invalid_service/')
        self.assertEqual(response.status_code, 400)
        
        data = response.json()
        self.assertIn('error', data)
        self.assertIn('valid_services', data)


class TestHealthCheckIntegration(TestCase):
    """Integration tests for health check functionality"""
    
    def setUp(self):
        """Set up test environment"""
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests"""
        cache.clear()
    
    def test_health_check_performance(self):
        """Test that health checks complete within reasonable time"""
        start_time = time.time()
        
        health_data = HealthCheckService.comprehensive_health_check()
        
        end_time = time.time()
        execution_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Health check should complete within 30 seconds
        self.assertLess(execution_time, 30000)
        
        # Response time in data should be reasonable
        self.assertLess(health_data['response_time_ms'], 30000)
    
    def test_health_check_under_load(self):
        """Test health check behavior under concurrent requests"""
        import threading
        results = []
        
        def run_health_check():
            try:
                health_data = HealthCheckService.comprehensive_health_check()
                results.append(health_data['status'])
            except Exception as e:
                results.append(f'error: {str(e)}')
        
        # Run 5 concurrent health checks
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=run_health_check)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All should complete successfully
        self.assertEqual(len(results), 5)
        for result in results:
            self.assertIn(result, ['healthy', 'degraded', 'unhealthy'])
    
    def test_health_check_with_service_failures(self):
        """Test health check response when services are failing"""
        # This would require mocking service failures
        # For now, just ensure the health check handles exceptions gracefully
        
        with patch.object(HealthCheckService, '_check_database') as mock_db_check:
            mock_db_check.side_effect = Exception("Database connection failed")
            
            health_data = HealthCheckService.comprehensive_health_check()
            
            # Should still return valid structure
            self.assertIn('status', health_data)
            self.assertIn('services', health_data)
            
            # Should report the database as failed
            if 'database' in health_data['services']:
                self.assertEqual(health_data['services']['database']['status'], 'failed')


class TestHealthCheckMonitoring(TestCase):
    """Test health check monitoring and alerting functionality"""
    
    def test_critical_service_identification(self):
        """Test identification of critical vs optional services"""
        critical_services = HealthCheckService.CRITICAL_SERVICES
        optional_services = HealthCheckService.OPTIONAL_SERVICES
        
        # Should have defined critical services
        self.assertGreater(len(critical_services), 0)
        
        # Critical services should include key components
        expected_critical = ['database', 'cache', 'dangerous_goods_data']
        for service in expected_critical:
            self.assertIn(service, critical_services)
        
        # No overlap between critical and optional
        self.assertEqual(set(critical_services) & set(optional_services), set())
    
    def test_health_percentage_calculation(self):
        """Test health percentage calculation for monitoring"""
        # Test with all healthy services
        test_data = {
            'services': {
                'service1': {'status': 'healthy'},
                'service2': {'status': 'healthy'},
                'service3': {'status': 'healthy'}
            },
            'summary': {}
        }
        
        HealthCheckService._calculate_health_summary(test_data)
        self.assertEqual(test_data['summary']['health_percentage'], 100.0)
        
        # Test with mixed service statuses
        test_data = {
            'services': {
                'service1': {'status': 'healthy'},
                'service2': {'status': 'degraded'},
                'service3': {'status': 'failed'},
                'service4': {'status': 'healthy'}
            },
            'summary': {}
        }
        
        HealthCheckService._calculate_health_summary(test_data)
        self.assertEqual(test_data['summary']['health_percentage'], 50.0)  # 2 healthy out of 4


if __name__ == '__main__':
    unittest.main()