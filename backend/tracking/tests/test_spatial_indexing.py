"""
Tests for the enhanced spatial indexing implementation.
Validates performance improvements and functionality of BRIN + GiST hybrid indexes.
"""

import unittest
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.db import connection
from django.contrib.gis.geos import Point, Polygon
from django.utils import timezone
from vehicles.models import Vehicle
from tracking.models import GPSEvent
from locations.models import GeoLocation
from companies.models import Company
from users.models import User
import time
import statistics


class SpatialIndexingTestCase(TransactionTestCase):
    """Test case for spatial indexing performance and functionality."""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        
        # Create test company
        cls.test_company = Company.objects.create(
            name="Test Company",
            registration_number="TEST001",
            address="123 Test Street",
            city="Test City",
            country="Australia"
        )
        
        # Create test vehicles
        cls.test_vehicles = []
        for i in range(100):  # Create 100 test vehicles
            vehicle = Vehicle.objects.create(
                registration_number=f"TEST{i:03d}",
                vehicle_type="SEMI",
                capacity_kg=5000.0,
                owning_company=cls.test_company,
                status="AVAILABLE"
            )
            cls.test_vehicles.append(vehicle)
    
    def setUp(self):
        """Set up test data for each test."""
        # Create test GPS events
        base_time = timezone.now() - timedelta(hours=2)
        
        for i, vehicle in enumerate(self.test_vehicles[:20]):  # Use first 20 vehicles
            # Create GPS events in Sydney area (spread across different locations)
            base_lat = -33.8688 + (i % 10) * 0.01  # Spread across 0.1 degrees
            base_lng = 151.2093 + (i // 10) * 0.01
            
            # Create 50 GPS events per vehicle over 2 hours
            for j in range(50):
                timestamp = base_time + timedelta(minutes=j * 2.4)  # Every 2.4 minutes
                
                # Simulate vehicle movement
                lat = base_lat + (j * 0.0001)  # Small movements
                lng = base_lng + (j * 0.0001)
                
                GPSEvent.objects.create(
                    vehicle=vehicle,
                    latitude=lat,
                    longitude=lng,
                    coordinates=Point(lng, lat, srid=4326),
                    timestamp=timestamp,
                    speed=50.0 + (j % 20),
                    heading=180.0,
                    accuracy=5.0,
                    source='GPS_DEVICE'
                )

    def test_index_creation_verification(self):
        """Verify that all expected indexes were created."""
        with connection.cursor() as cursor:
            # Check for BRIN indexes
            cursor.execute("""
                SELECT indexname FROM pg_indexes 
                WHERE indexname LIKE '%brin%' 
                AND tablename = 'tracking_gpsevent'
                ORDER BY indexname
            """)
            brin_indexes = [row[0] for row in cursor.fetchall()]
            
            expected_brin = [
                'tracking_gpsevent_timestamp_brin_v2',
                'tracking_gpsevent_company_time_brin',
                'tracking_gpsevent_recent_brin'
            ]
            
            for expected in expected_brin:
                self.assertIn(expected, brin_indexes, 
                             f"BRIN index {expected} not found")
            
            # Check for GiST indexes
            cursor.execute("""
                SELECT indexname FROM pg_indexes 
                WHERE indexname LIKE '%gist%' 
                AND tablename = 'tracking_gpsevent'
                ORDER BY indexname
            """)
            gist_indexes = [row[0] for row in cursor.fetchall()]
            
            expected_gist = [
                'tracking_gpsevent_spatial_temporal_gist',
                'tracking_gpsevent_coordinates_precise_gist',
                'tracking_gpsevent_company_spatial_gist'
            ]
            
            for expected in expected_gist:
                self.assertIn(expected, gist_indexes, 
                             f"GiST index {expected} not found")

    def test_materialized_views_creation(self):
        """Verify that materialized views were created and contain data."""
        with connection.cursor() as cursor:
            # Check fleet summary view
            cursor.execute("""
                SELECT COUNT(*) FROM tracking_fleet_summary
                WHERE owning_company_id = %s
            """, [self.test_company.id])
            
            fleet_count = cursor.fetchone()[0]
            self.assertGreater(fleet_count, 0, "Fleet summary view should contain data")
            
            # Check vehicle density view
            cursor.execute("SELECT COUNT(*) FROM tracking_vehicle_density")
            density_count = cursor.fetchone()[0]
            self.assertGreaterEqual(density_count, 0, "Vehicle density view should exist")

    def test_clustering_function_performance(self):
        """Test the performance of the enhanced clustering function."""
        # Define Sydney area bounds
        sydney_bounds = Polygon.from_bbox((151.0, -34.0, 151.5, -33.5))
        
        # Test different zoom levels
        zoom_levels = [8, 10, 12, 14, 16]
        performance_results = []
        
        for zoom in zoom_levels:
            start_time = time.time()
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM get_enhanced_clustered_vehicles(%s, %s, %s, %s)
                """, [sydney_bounds.wkt, zoom, self.test_company.id, 50])
                
                results = cursor.fetchall()
                
            end_time = time.time()
            query_time = end_time - start_time
            performance_results.append(query_time)
            
            # Verify results make sense
            self.assertIsInstance(results, list)
            if zoom < 13:
                # At low zoom, should have clusters
                cluster_count = len(results)
                if cluster_count > 0:
                    # Check cluster structure
                    cluster = results[0]
                    self.assertGreater(cluster[1], 0, "Cluster should have vehicle count > 0")
                    self.assertIsNotNone(cluster[2], "Cluster should have center location")
        
        # Performance should be reasonable (< 1 second for test data)
        avg_time = statistics.mean(performance_results)
        self.assertLess(avg_time, 1.0, f"Clustering queries too slow: {avg_time:.3f}s average")

    def test_viewport_function_performance(self):
        """Test the performance of the viewport data loading function."""
        sydney_bounds = Polygon.from_bbox((151.0, -34.0, 151.5, -33.5))
        
        zoom_levels = [13, 15, 17]  # High zoom levels for individual vehicles
        performance_results = []
        
        for zoom in zoom_levels:
            start_time = time.time()
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM get_viewport_vehicles(%s, %s, %s, %s)
                """, [sydney_bounds.wkt, zoom, self.test_company.id, False])
                
                results = cursor.fetchall()
                
            end_time = time.time()
            query_time = end_time - start_time
            performance_results.append(query_time)
            
            # Verify results
            self.assertIsInstance(results, list)
            if len(results) > 0:
                vehicle = results[0]
                self.assertIsNotNone(vehicle[0], "Vehicle ID should not be None")
                self.assertIsNotNone(vehicle[1], "Location should not be None")
        
        # Performance should be excellent for individual vehicle queries
        avg_time = statistics.mean(performance_results)
        self.assertLess(avg_time, 0.5, f"Viewport queries too slow: {avg_time:.3f}s average")

    def test_geohash_indexing_performance(self):
        """Test the performance of geohash-based spatial queries."""
        performance_results = []
        
        # Test different geohash precisions
        for precision in [4, 6, 8]:
            start_time = time.time()
            
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    SELECT ST_GeoHash(coordinates, %s), COUNT(*) 
                    FROM tracking_gpsevent 
                    WHERE coordinates IS NOT NULL
                    AND timestamp >= %s
                    GROUP BY ST_GeoHash(coordinates, %s)
                    ORDER BY COUNT(*) DESC
                    LIMIT 10
                """, [precision, timezone.now() - timedelta(hours=1), precision])
                
                results = cursor.fetchall()
                
            end_time = time.time()
            query_time = end_time - start_time
            performance_results.append(query_time)
            
            # Verify we got some clustering results
            self.assertGreater(len(results), 0, f"Should have geohash clusters at precision {precision}")
        
        # Geohash queries should be very fast
        avg_time = statistics.mean(performance_results)
        self.assertLess(avg_time, 0.3, f"Geohash queries too slow: {avg_time:.3f}s average")

    def test_time_based_query_performance(self):
        """Test performance of time-based queries using BRIN indexes."""
        time_ranges = [
            timedelta(minutes=30),
            timedelta(hours=1),
            timedelta(hours=6),
            timedelta(hours=24)
        ]
        
        performance_results = []
        
        for time_range in time_ranges:
            start_time = time.time()
            
            cutoff_time = timezone.now() - time_range
            
            # Query should use BRIN index for time-based filtering
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT vehicle_id, COUNT(*) as event_count,
                           MAX(timestamp) as latest_event
                    FROM tracking_gpsevent 
                    WHERE timestamp >= %s
                    GROUP BY vehicle_id
                    ORDER BY event_count DESC
                    LIMIT 20
                """, [cutoff_time])
                
                results = cursor.fetchall()
                
            end_time = time.time()
            query_time = end_time - start_time
            performance_results.append(query_time)
            
            # Verify results
            self.assertGreater(len(results), 0, f"Should have results for {time_range}")
        
        # Time-based queries should benefit from BRIN indexes
        avg_time = statistics.mean(performance_results)
        self.assertLess(avg_time, 0.5, f"Time-based queries too slow: {avg_time:.3f}s average")

    def test_spatial_join_performance(self):
        """Test performance of spatial joins between vehicles and locations."""
        # Create a test geofence
        test_location = GeoLocation.objects.create(
            name="Test Depot",
            location_type="DEPOT",
            company=self.test_company,
            latitude=-33.8688,
            longitude=151.2093,
            geofence={
                "type": "Polygon",
                "coordinates": [[
                    [151.2093, -33.8688],
                    [151.2103, -33.8688],
                    [151.2103, -33.8678],
                    [151.2093, -33.8678],
                    [151.2093, -33.8688]
                ]]
            }
        )
        
        start_time = time.time()
        
        # Spatial join query
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT v.id, v.registration_number, 
                       ST_Distance(v.last_known_location, 
                                   ST_GeomFromText(%s, 4326)) as distance_meters
                FROM vehicles_vehicle v
                WHERE v.last_known_location IS NOT NULL
                AND ST_DWithin(v.last_known_location, 
                               ST_GeomFromText(%s, 4326), 0.01)
                ORDER BY distance_meters
                LIMIT 10
            """, [f"POINT(151.2093 -33.8688)", f"POINT(151.2093 -33.8688)"])
            
            results = cursor.fetchall()
        
        end_time = time.time()
        query_time = end_time - start_time
        
        # Spatial joins should be reasonably fast with GiST indexes
        self.assertLess(query_time, 0.5, f"Spatial join too slow: {query_time:.3f}s")

    def test_index_usage_statistics(self):
        """Verify that the new indexes are being used by queries."""
        # Run some queries to generate statistics
        self.test_clustering_function_performance()
        self.test_viewport_function_performance()
        
        # Check index usage statistics
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM analyze_spatial_performance()")
            performance_stats = cursor.fetchall()
            
            # Should have statistics for our indexes
            self.assertGreater(len(performance_stats), 0, "Should have index performance statistics")
            
            # Check that some indexes are being used
            used_indexes = [stat for stat in performance_stats if stat[3] > 0]  # idx_scan > 0
            self.assertGreater(len(used_indexes), 0, "Some indexes should show usage")

    def test_partition_management_functions(self):
        """Test the partition management functions."""
        with connection.cursor() as cursor:
            # Test partition creation function
            cursor.execute("SELECT create_monthly_gps_partition(%s)", [timezone.now().date()])
            
            # Test maintenance function
            cursor.execute("SELECT maintain_gps_partitions()")
            
            # Verify partitions exist
            cursor.execute("""
                SELECT tablename FROM pg_tables 
                WHERE tablename LIKE 'tracking_gpsevent_%' 
                AND tablename ~ '^tracking_gpsevent_[0-9]{4}_[0-9]{2}$'
                ORDER BY tablename
            """)
            partitions = cursor.fetchall()
            
            # Should have at least current month partition
            self.assertGreater(len(partitions), 0, "Should have GPS event partitions")

    def test_materialized_view_refresh(self):
        """Test materialized view refresh functionality."""
        with connection.cursor() as cursor:
            # Record current computed_at time
            cursor.execute("SELECT computed_at FROM tracking_fleet_summary LIMIT 1")
            original_time = cursor.fetchone()
            
            # Wait a moment and refresh
            time.sleep(0.1)
            cursor.execute("SELECT refresh_spatial_views()")
            
            # Check that computed_at was updated
            cursor.execute("SELECT computed_at FROM tracking_fleet_summary LIMIT 1")
            new_time = cursor.fetchone()
            
            if original_time and new_time:
                self.assertNotEqual(original_time[0], new_time[0], 
                                  "Materialized view should have been refreshed")

    def tearDown(self):
        """Clean up test data."""
        GPSEvent.objects.all().delete()
        
    @classmethod
    def tearDownClass(cls):
        """Clean up test fixtures."""
        Vehicle.objects.all().delete()
        Company.objects.all().delete()
        super().tearDownClass()


class SpatialPerformanceBenchmark(TestCase):
    """
    Performance benchmark tests for spatial indexing.
    These tests generate larger datasets to measure real-world performance.
    """
    
    def setUp(self):
        """Set up benchmark data."""
        # Create test company
        self.company = Company.objects.create(
            name="Benchmark Company",
            registration_number="BENCH001",
            address="456 Benchmark Ave",
            city="Benchmark City",
            country="Australia"
        )
        
        # Create vehicles for benchmarking
        self.vehicles = []
        for i in range(50):  # 50 vehicles for benchmark
            vehicle = Vehicle.objects.create(
                registration_number=f"BENCH{i:03d}",
                vehicle_type="SEMI",
                capacity_kg=5000.0,
                owning_company=self.company,
                status="AVAILABLE"
            )
            self.vehicles.append(vehicle)
    
    def test_large_dataset_query_performance(self):
        """Benchmark query performance with larger dataset."""
        # Create 10,000 GPS events (200 per vehicle)
        base_time = timezone.now() - timedelta(hours=24)
        
        events = []
        for i, vehicle in enumerate(self.vehicles):
            for j in range(200):  # 200 events per vehicle
                timestamp = base_time + timedelta(minutes=j * 7.2)  # Every 7.2 minutes
                
                # Spread across Australia
                base_lat = -25.0 + (i % 10) * 2.0  # Spread across latitude
                base_lng = 133.0 + (i // 10) * 4.0  # Spread across longitude
                
                lat = base_lat + (j * 0.001)
                lng = base_lng + (j * 0.001)
                
                events.append(GPSEvent(
                    vehicle=vehicle,
                    latitude=lat,
                    longitude=lng,
                    coordinates=Point(lng, lat, srid=4326),
                    timestamp=timestamp,
                    speed=60.0 + (j % 40),
                    heading=j % 360,
                    accuracy=3.0,
                    source='GPS_DEVICE'
                ))
        
        # Bulk create for better performance
        GPSEvent.objects.bulk_create(events, batch_size=1000)
        
        # Benchmark different query types
        benchmarks = {}
        
        # Test 1: Recent vehicle locations (should use BRIN + GiST)
        start_time = time.time()
        recent_cutoff = timezone.now() - timedelta(hours=1)
        recent_count = GPSEvent.objects.filter(
            timestamp__gte=recent_cutoff,
            coordinates__isnull=False
        ).count()
        benchmarks['recent_locations'] = time.time() - start_time
        
        # Test 2: Spatial bounding box query (should use GiST)
        start_time = time.time()
        bbox = Polygon.from_bbox((130.0, -30.0, 140.0, -20.0))
        spatial_count = GPSEvent.objects.filter(
            coordinates__intersects=bbox
        ).count()
        benchmarks['spatial_bbox'] = time.time() - start_time
        
        # Test 3: Vehicle history query (should use composite index)
        start_time = time.time()
        history = GPSEvent.objects.filter(
            vehicle=self.vehicles[0],
            timestamp__gte=timezone.now() - timedelta(hours=12)
        ).order_by('-timestamp')[:50]
        list(history)  # Force evaluation
        benchmarks['vehicle_history'] = time.time() - start_time
        
        # Test 4: Company-wide fleet query
        start_time = time.time()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT v.id, v.registration_number, MAX(g.timestamp) as last_seen
                FROM vehicles_vehicle v
                LEFT JOIN tracking_gpsevent g ON g.vehicle_id = v.id
                WHERE v.owning_company_id = %s
                GROUP BY v.id, v.registration_number
                ORDER BY last_seen DESC
            """, [self.company.id])
            fleet_data = cursor.fetchall()
        benchmarks['fleet_query'] = time.time() - start_time
        
        # Print benchmark results
        print(f"\n=== Spatial Indexing Performance Benchmarks ===")
        print(f"Dataset size: {len(events):,} GPS events, {len(self.vehicles)} vehicles")
        for test_name, duration in benchmarks.items():
            print(f"{test_name:<20}: {duration:.3f} seconds")
        
        # All benchmarks should complete in reasonable time
        for test_name, duration in benchmarks.items():
            self.assertLess(duration, 2.0, f"{test_name} benchmark too slow: {duration:.3f}s")
        
        # Cleanup
        GPSEvent.objects.all().delete()


if __name__ == '__main__':
    unittest.main()