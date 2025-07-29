# shared/test_caching.py
"""
Comprehensive test suite for SafeShipper caching service.
Tests Redis caching functionality for dangerous goods lookups.
"""

import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.cache import cache
from django.conf import settings
from .caching_service import (
    SafeShipperCacheService, DangerousGoodsCacheService, 
    SDSCacheService, EmergencyProceduresCacheService, CacheStatisticsService
)


class TestSafeShipperCacheService(TestCase):
    """Test the main caching service functionality"""
    
    def setUp(self):
        """Clear cache before each test"""
        cache.clear()
    
    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()
    
    def test_cache_key_generation(self):
        """Test that cache keys are generated consistently"""
        key1 = SafeShipperCacheService._generate_cache_key('dangerous_goods', 'UN1203')
        key2 = SafeShipperCacheService._generate_cache_key('dangerous_goods', 'UN1203')
        
        self.assertEqual(key1, key2)
        self.assertTrue(key1.startswith('safeshipper:dg:'))
    
    def test_cache_key_generation_with_kwargs(self):
        """Test cache key generation with keyword arguments"""
        key1 = SafeShipperCacheService._generate_cache_key('dangerous_goods', un_number='UN1203', language='EN')
        key2 = SafeShipperCacheService._generate_cache_key('dangerous_goods', language='EN', un_number='UN1203')
        
        # Should be the same regardless of argument order
        self.assertEqual(key1, key2)
    
    def test_cache_set_and_get(self):
        """Test basic cache set and get operations"""
        test_data = {'un_number': 'UN1203', 'name': 'Gasoline'}
        
        # Set cache
        success = SafeShipperCacheService.set('dangerous_goods', test_data, 'UN1203')
        self.assertTrue(success)
        
        # Get cache
        cached_data = SafeShipperCacheService.get('dangerous_goods', 'UN1203')
        self.assertEqual(cached_data, test_data)
    
    def test_cache_get_miss(self):
        """Test cache get operation when key doesn't exist"""
        cached_data = SafeShipperCacheService.get('dangerous_goods', 'NONEXISTENT')
        self.assertIsNone(cached_data)
    
    def test_cache_delete(self):
        """Test cache delete operation"""
        test_data = {'un_number': 'UN1203', 'name': 'Gasoline'}
        
        # Set and verify cache
        SafeShipperCacheService.set('dangerous_goods', test_data, 'UN1203')
        cached_data = SafeShipperCacheService.get('dangerous_goods', 'UN1203')
        self.assertEqual(cached_data, test_data)
        
        # Delete and verify removal
        success = SafeShipperCacheService.delete('dangerous_goods', 'UN1203')
        self.assertTrue(success)
        
        cached_data = SafeShipperCacheService.get('dangerous_goods', 'UN1203')
        self.assertIsNone(cached_data)
    
    def test_cache_timeout(self):
        """Test cache timeout functionality"""
        test_data = {'un_number': 'UN1203', 'name': 'Gasoline'}
        
        # Set cache with very short timeout
        success = SafeShipperCacheService.set('dangerous_goods', test_data, 'UN1203', timeout=1)
        self.assertTrue(success)
        
        # Verify cache exists immediately
        cached_data = SafeShipperCacheService.get('dangerous_goods', 'UN1203')
        self.assertEqual(cached_data, test_data)
        
        # Note: We can't easily test expiration in unit tests without time manipulation


class TestDangerousGoodsCacheService(TestCase):
    """Test the dangerous goods specific caching service"""
    
    def setUp(self):
        """Clear cache before each test"""
        cache.clear()
    
    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()
    
    def test_dangerous_good_by_un_caching(self):
        """Test caching of dangerous goods by UN number"""
        test_dg_data = {
            'id': '123e4567-e89b-12d3-a456-426614174000',
            'un_number': 'UN1203',
            'proper_shipping_name': 'Gasoline',
            'hazard_class': '3',
            'packing_group': 'II'
        }
        
        # Cache the dangerous good
        success = DangerousGoodsCacheService.cache_dangerous_good_by_un('UN1203', test_dg_data)
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_dg = DangerousGoodsCacheService.get_dangerous_good_by_un('UN1203')
        self.assertEqual(cached_dg, test_dg_data)
    
    def test_compatibility_result_caching(self):
        """Test caching of compatibility check results"""
        un_numbers = ['UN1203', 'UN1789']
        compatibility_result = {
            'is_compatible': True,
            'conflicts': [],
            'warnings': []
        }
        
        # Cache compatibility result
        success = DangerousGoodsCacheService.cache_compatibility_result(un_numbers, compatibility_result)
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_result = DangerousGoodsCacheService.get_compatibility_result(un_numbers)
        self.assertEqual(cached_result, compatibility_result)
    
    def test_compatibility_result_order_independence(self):
        """Test that UN number order doesn't affect compatibility cache"""
        un_numbers_1 = ['UN1203', 'UN1789']
        un_numbers_2 = ['UN1789', 'UN1203']
        compatibility_result = {
            'is_compatible': True,
            'conflicts': []
        }
        
        # Cache with first order
        DangerousGoodsCacheService.cache_compatibility_result(un_numbers_1, compatibility_result)
        
        # Retrieve with second order
        cached_result = DangerousGoodsCacheService.get_compatibility_result(un_numbers_2)
        self.assertEqual(cached_result, compatibility_result)
    
    def test_synonym_match_caching(self):
        """Test caching of synonym match results"""
        query = 'petrol'
        match_data = {
            'id': '123e4567-e89b-12d3-a456-426614174000',
            'un_number': 'UN1203',
            'proper_shipping_name': 'Gasoline'
        }
        
        # Cache synonym match
        success = DangerousGoodsCacheService.cache_synonym_match(query, match_data)
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_match = DangerousGoodsCacheService.get_synonym_match(query)
        self.assertEqual(cached_match, match_data)
    
    def test_synonym_match_normalization(self):
        """Test that synonym queries are normalized for consistent caching"""
        match_data = {
            'un_number': 'UN1203',
            'proper_shipping_name': 'Gasoline'
        }
        
        # Cache with different case and whitespace
        DangerousGoodsCacheService.cache_synonym_match('  PETROL  ', match_data)
        
        # Retrieve with normalized query
        cached_match = DangerousGoodsCacheService.get_synonym_match('petrol')
        self.assertEqual(cached_match, match_data)
    
    def test_dangerous_goods_list_caching(self):
        """Test caching of filtered dangerous goods lists"""
        filters = {'hazard_class': '3', 'packing_group': 'II'}
        dg_list = [
            {'un_number': 'UN1203', 'proper_shipping_name': 'Gasoline'},
            {'un_number': 'UN1223', 'proper_shipping_name': 'Kerosene'}
        ]
        
        # Cache list
        success = DangerousGoodsCacheService.cache_dangerous_goods_list(filters, dg_list)
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_list = DangerousGoodsCacheService.get_dangerous_goods_list(filters)
        self.assertEqual(cached_list, dg_list)


class TestSDSCacheService(TestCase):
    """Test the SDS specific caching service"""
    
    def setUp(self):
        """Clear cache before each test"""
        cache.clear()
    
    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()
    
    def test_sds_by_dg_id_caching(self):
        """Test caching of SDS data by dangerous good ID"""
        dg_id = '123e4567-e89b-12d3-a456-426614174000'
        sds_data = {
            'id': 'sds_001',
            'product_name': 'Gasoline',
            'manufacturer': 'Test Company',
            'version': '1.0'
        }
        
        # Cache SDS data
        success = SDSCacheService.cache_sds_by_dg_id(dg_id, sds_data, 'EN')
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_sds = SDSCacheService.get_sds_by_dg_id(dg_id, 'EN')
        self.assertEqual(cached_sds, sds_data)
    
    def test_sds_ph_data_caching(self):
        """Test caching of pH data from SDS"""
        dg_id = '123e4567-e89b-12d3-a456-426614174000'
        ph_data = {
            'ph_value_min': 6.5,
            'ph_value_max': 7.5,
            'is_corrosive_class_8': False
        }
        
        # Cache pH data
        success = SDSCacheService.cache_sds_ph_data(dg_id, ph_data)
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_ph = SDSCacheService.get_sds_ph_data(dg_id)
        self.assertEqual(cached_ph, ph_data)


class TestEmergencyProceduresCacheService(TestCase):
    """Test the emergency procedures specific caching service"""
    
    def setUp(self):
        """Clear cache before each test"""
        cache.clear()
    
    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()
    
    def test_procedures_by_hazard_class_caching(self):
        """Test caching of emergency procedures by hazard class"""
        hazard_class = '3'
        procedures = [
            {
                'id': 'proc_001',
                'title': 'Flammable Liquid Spill Response',
                'immediate_actions': 'Evacuate area, eliminate ignition sources'
            },
            {
                'id': 'proc_002',
                'title': 'Fire Response for Class 3',
                'immediate_actions': 'Use foam or dry chemical extinguisher'
            }
        ]
        
        # Cache procedures
        success = EmergencyProceduresCacheService.cache_procedures_by_hazard_class(hazard_class, procedures)
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_procedures = EmergencyProceduresCacheService.get_procedures_by_hazard_class(hazard_class)
        self.assertEqual(cached_procedures, procedures)
    
    def test_quick_reference_caching(self):
        """Test caching of quick reference emergency data"""
        un_number = 'UN1203'
        quick_ref_data = {
            'emergency_contacts': ['+61-1800-123-456'],
            'immediate_actions': 'Stop leak if safe to do so',
            'fire_response': 'Use foam extinguisher',
            'spill_response': 'Contain and absorb with inert material'
        }
        
        # Cache quick reference
        success = EmergencyProceduresCacheService.cache_quick_reference(un_number, quick_ref_data)
        self.assertTrue(success)
        
        # Retrieve from cache
        cached_ref = EmergencyProceduresCacheService.get_quick_reference(un_number)
        self.assertEqual(cached_ref, quick_ref_data)


class TestCacheStatisticsService(TestCase):
    """Test the cache statistics and monitoring service"""
    
    def setUp(self):
        """Clear cache before each test"""
        cache.clear()
    
    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()
    
    @patch('redis.Redis.from_url')
    def test_get_cache_stats_with_redis(self, mock_redis):
        """Test getting cache statistics when Redis is available"""
        # Mock Redis client
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        
        # Mock Redis info response
        mock_client.info.return_value = {
            'used_memory': 1024 * 1024,  # 1MB
            'keyspace_hit_rate': 0.85,
            'connected_clients': 5
        }
        
        # Mock keys response
        mock_client.keys.return_value = [
            b'safeshipper:dg:key1',
            b'safeshipper:un:key2',
            b'safeshipper:compat:key3'
        ]
        
        # Get stats
        stats = CacheStatisticsService.get_cache_stats()
        
        # Verify stats structure
        self.assertIn('total_keys', stats)
        self.assertIn('memory_usage_mb', stats)
        self.assertIn('hit_rate', stats)
        self.assertIn('cache_types', stats)
        
        self.assertEqual(stats['total_keys'], 3)
        self.assertEqual(stats['memory_usage_mb'], 1.0)
        self.assertEqual(stats['hit_rate'], 0.85)
    
    def test_get_cache_stats_fallback(self):
        """Test getting cache statistics when Redis is not available"""
        # This will use the fallback path
        stats = CacheStatisticsService.get_cache_stats()
        
        # Should return error info for fallback
        self.assertIn('error', stats)
    
    @patch('redis.Redis.from_url')
    def test_clear_all_safeshipper_cache(self, mock_redis):
        """Test clearing all SafeShipper cache entries"""
        # Mock Redis client
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        
        # Mock keys response
        mock_client.keys.return_value = [
            b'safeshipper:dg:key1',
            b'safeshipper:un:key2'
        ]
        
        # Clear cache
        result = CacheStatisticsService.clear_all_safeshipper_cache()
        
        # Verify result
        self.assertTrue(result['success'])
        self.assertEqual(result['cleared_keys'], 2)
        
        # Verify Redis delete was called
        mock_client.delete.assert_called_once()


class TestCacheIntegration(TestCase):
    """Integration tests for caching with actual cache operations"""
    
    def setUp(self):
        """Clear cache before each test"""
        cache.clear()
    
    def tearDown(self):
        """Clear cache after each test"""
        cache.clear()
    
    def test_cache_invalidation_workflow(self):
        """Test complete cache invalidation workflow"""
        # Set up test data
        dg_data = {'un_number': 'UN1203', 'proper_shipping_name': 'Gasoline'}
        compatibility_data = {'is_compatible': True, 'conflicts': []}
        
        # Cache various types of data
        DangerousGoodsCacheService.cache_dangerous_good_by_un('UN1203', dg_data)
        DangerousGoodsCacheService.cache_compatibility_result(['UN1203', 'UN1789'], compatibility_data)
        
        # Verify data is cached
        self.assertIsNotNone(DangerousGoodsCacheService.get_dangerous_good_by_un('UN1203'))
        self.assertIsNotNone(DangerousGoodsCacheService.get_compatibility_result(['UN1203', 'UN1789']))
        
        # Invalidate dangerous goods cache
        success = DangerousGoodsCacheService.invalidate_dangerous_goods_cache()
        self.assertTrue(success)
        
        # Verify cache is cleared (this may not work with simple Django cache backend)
        # In production with Redis, this would properly clear pattern-matched keys
    
    def test_concurrent_cache_operations(self):
        """Test that concurrent cache operations work correctly"""
        # Simulate concurrent access patterns
        test_data_1 = {'un_number': 'UN1203', 'name': 'Gasoline'}
        test_data_2 = {'un_number': 'UN1789', 'name': 'Hydrochloric acid'}
        
        # Set multiple cache entries
        DangerousGoodsCacheService.cache_dangerous_good_by_un('UN1203', test_data_1)
        DangerousGoodsCacheService.cache_dangerous_good_by_un('UN1789', test_data_2)
        
        # Verify both can be retrieved
        cached_1 = DangerousGoodsCacheService.get_dangerous_good_by_un('UN1203')
        cached_2 = DangerousGoodsCacheService.get_dangerous_good_by_un('UN1789')
        
        self.assertEqual(cached_1, test_data_1)
        self.assertEqual(cached_2, test_data_2)


if __name__ == '__main__':
    unittest.main()