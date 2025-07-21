# Enhanced multi-level spatial indexing with BRIN + GiST hybrid strategy
# This migration implements comprehensive performance optimizations for SafeShipper GPS tracking

from django.db import migrations
from django.contrib.postgres.operations import CreateExtension


class Migration(migrations.Migration):

    dependencies = [
        ('tracking', '0003_advanced_spatial_indexing'),
    ]

    operations = [
        # Ensure required PostgreSQL extensions are enabled
        CreateExtension('btree_gist'),
        CreateExtension('pg_stat_statements'),
        
        # Enhanced hybrid indexing strategy for GPS events
        migrations.RunSQL(
            """
            -- ===== BRIN INDEXES FOR TIME-SERIES DATA =====
            -- BRIN indexes are optimal for sequential time-series inserts with 90%+ space savings
            
            -- Primary BRIN index for timestamp-based queries (most common access pattern)
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_timestamp_brin_v2 
            ON tracking_gpsevent USING BRIN (timestamp, vehicle_id, shipment_id) 
            WITH (pages_per_range = 32);
            
            -- BRIN index for company-partitioned queries
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_company_time_brin 
            ON tracking_gpsevent USING BRIN (
                (SELECT owning_company_id FROM vehicles_vehicle v WHERE v.id = vehicle_id),
                timestamp
            ) WITH (pages_per_range = 16);
            
            -- BRIN index optimized for recent data queries (last 24 hours)
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_recent_brin 
            ON tracking_gpsevent USING BRIN (timestamp, coordinates) 
            WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
            WITH (pages_per_range = 8);
            
            -- ===== ENHANCED GIST INDEXES FOR SPATIAL QUERIES =====
            -- GiST indexes provide optimal spatial query performance
            
            -- Multi-dimensional GiST index combining space, time, and vehicle
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_spatial_temporal_gist 
            ON tracking_gpsevent USING GIST (coordinates, timestamp, vehicle_id);
            
            -- High-precision spatial index for viewport queries
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_coordinates_precise_gist 
            ON tracking_gpsevent USING GIST (coordinates) 
            WHERE coordinates IS NOT NULL AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours';
            
            -- Company-aware spatial index for multi-tenant optimization
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_company_spatial_gist 
            ON tracking_gpsevent USING GIST (
                coordinates,
                (SELECT owning_company_id FROM vehicles_vehicle v WHERE v.id = vehicle_id)
            ) WHERE coordinates IS NOT NULL;
            
            -- ===== COMPOSITE B-TREE INDEXES FOR SPECIFIC QUERIES =====
            
            -- Optimized index for vehicle history queries
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_vehicle_history_btree 
            ON tracking_gpsevent (vehicle_id, timestamp DESC, coordinates) 
            WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days';
            
            -- Index for shipment tracking queries
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_shipment_tracking_btree 
            ON tracking_gpsevent (shipment_id, timestamp DESC) 
            WHERE shipment_id IS NOT NULL;
            
            -- Speed and heading analysis index
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_analytics_btree 
            ON tracking_gpsevent (vehicle_id, timestamp) 
            INCLUDE (speed, heading, accuracy) 
            WHERE speed IS NOT NULL OR heading IS NOT NULL;
            
            -- ===== GEOHASH CLUSTERING INDEXES =====
            
            -- Multi-precision geohash indexes for adaptive clustering
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_geohash_4_idx 
            ON tracking_gpsevent (ST_GeoHash(coordinates, 4), timestamp) 
            WHERE coordinates IS NOT NULL;
            
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_geohash_6_idx 
            ON tracking_gpsevent (ST_GeoHash(coordinates, 6), timestamp) 
            WHERE coordinates IS NOT NULL;
            
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_geohash_8_idx 
            ON tracking_gpsevent (ST_GeoHash(coordinates, 8), timestamp) 
            WHERE coordinates IS NOT NULL;
            
            -- ===== VEHICLE LOCATION OPTIMIZATION =====
            
            -- Enhanced vehicle location index with company partitioning
            CREATE INDEX CONCURRENTLY IF NOT EXISTS vehicles_vehicle_location_company_gist 
            ON vehicles_vehicle USING GIST (last_known_location, owning_company_id) 
            WHERE last_known_location IS NOT NULL 
            AND last_reported_at >= CURRENT_TIMESTAMP - INTERVAL '6 hours';
            
            -- Real-time vehicle tracking index
            CREATE INDEX CONCURRENTLY IF NOT EXISTS vehicles_vehicle_realtime_tracking 
            ON vehicles_vehicle (status, last_reported_at DESC, owning_company_id) 
            INCLUDE (last_known_location, assigned_driver_id) 
            WHERE status IN ('AVAILABLE', 'IN_USE') 
            AND last_reported_at >= CURRENT_TIMESTAMP - INTERVAL '2 hours';
            
            -- ===== LOCATION VISIT OPTIMIZATION =====
            
            -- Spatial-temporal index for geofence analysis
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_locationvisit_spatial_gist 
            ON tracking_locationvisit USING GIST (
                (SELECT boundary FROM locations_geolocation g WHERE g.id = location_id),
                entry_time
            );
            
            -- Active visits performance index
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_locationvisit_active_btree 
            ON tracking_locationvisit (status, entry_time DESC, vehicle_id) 
            WHERE status = 'ACTIVE' AND exit_time IS NULL;
            """,
            reverse_sql="""
            -- Drop enhanced indexes
            DROP INDEX IF EXISTS tracking_gpsevent_timestamp_brin_v2;
            DROP INDEX IF EXISTS tracking_gpsevent_company_time_brin;
            DROP INDEX IF EXISTS tracking_gpsevent_recent_brin;
            DROP INDEX IF EXISTS tracking_gpsevent_spatial_temporal_gist;
            DROP INDEX IF EXISTS tracking_gpsevent_coordinates_precise_gist;
            DROP INDEX IF EXISTS tracking_gpsevent_company_spatial_gist;
            DROP INDEX IF EXISTS tracking_gpsevent_vehicle_history_btree;
            DROP INDEX IF EXISTS tracking_gpsevent_shipment_tracking_btree;
            DROP INDEX IF EXISTS tracking_gpsevent_analytics_btree;
            DROP INDEX IF EXISTS tracking_gpsevent_geohash_4_idx;
            DROP INDEX IF EXISTS tracking_gpsevent_geohash_6_idx;
            DROP INDEX IF EXISTS tracking_gpsevent_geohash_8_idx;
            DROP INDEX IF EXISTS vehicles_vehicle_location_company_gist;
            DROP INDEX IF EXISTS vehicles_vehicle_realtime_tracking;
            DROP INDEX IF EXISTS tracking_locationvisit_spatial_gist;
            DROP INDEX IF EXISTS tracking_locationvisit_active_btree;
            """
        ),
        
        # Enhanced partitioning strategy for GPS events
        migrations.RunSQL(
            """
            -- ===== ADVANCED PARTITIONING IMPLEMENTATION =====
            
            -- Create partitioned table with hybrid partitioning (range by time + hash by company)
            CREATE TABLE IF NOT EXISTS tracking_gpsevent_partitioned (
                LIKE tracking_gpsevent INCLUDING ALL
            ) PARTITION BY RANGE (timestamp);
            
            -- Function to create monthly partitions automatically
            CREATE OR REPLACE FUNCTION create_monthly_gps_partition(target_date DATE)
            RETURNS VOID AS $$
            DECLARE
                partition_name TEXT;
                start_date DATE;
                end_date DATE;
            BEGIN
                start_date := date_trunc('month', target_date);
                end_date := start_date + INTERVAL '1 month';
                partition_name := 'tracking_gpsevent_' || to_char(start_date, 'YYYY_MM');
                
                -- Create the partition if it doesn't exist
                EXECUTE format('
                    CREATE TABLE IF NOT EXISTS %I PARTITION OF tracking_gpsevent_partitioned
                    FOR VALUES FROM (%L) TO (%L)
                ', partition_name, start_date, end_date);
                
                -- Create indexes on the partition
                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS %I ON %I USING BRIN (timestamp, vehicle_id) WITH (pages_per_range = 16)
                ', partition_name || '_timestamp_brin', partition_name);
                
                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS %I ON %I USING GIST (coordinates) WHERE coordinates IS NOT NULL
                ', partition_name || '_coordinates_gist', partition_name);
                
                RAISE NOTICE 'Created partition: %', partition_name;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Create current and future partitions
            SELECT create_monthly_gps_partition(CURRENT_DATE);
            SELECT create_monthly_gps_partition(CURRENT_DATE + INTERVAL '1 month');
            SELECT create_monthly_gps_partition(CURRENT_DATE + INTERVAL '2 months');
            
            -- Automatic partition maintenance function
            CREATE OR REPLACE FUNCTION maintain_gps_partitions()
            RETURNS VOID AS $$
            DECLARE
                future_partition_date DATE;
                old_partition_name TEXT;
                old_partition_date DATE;
            BEGIN
                -- Create future partitions (always have 2 months ahead)
                future_partition_date := date_trunc('month', CURRENT_DATE) + INTERVAL '3 months';
                PERFORM create_monthly_gps_partition(future_partition_date);
                
                -- Archive old partitions (older than 12 months)
                old_partition_date := date_trunc('month', CURRENT_DATE) - INTERVAL '12 months';
                old_partition_name := 'tracking_gpsevent_' || to_char(old_partition_date, 'YYYY_MM');
                
                -- Check if old partition exists and has data
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = old_partition_name) THEN
                    -- Archive to cold storage table instead of dropping
                    EXECUTE format('
                        CREATE TABLE IF NOT EXISTS tracking_gpsevent_archive_%s AS 
                        SELECT * FROM %I
                    ', to_char(old_partition_date, 'YYYY_MM'), old_partition_name);
                    
                    -- Drop the partition after archiving
                    EXECUTE format('DROP TABLE IF EXISTS %I', old_partition_name);
                    RAISE NOTICE 'Archived and dropped old partition: %', old_partition_name;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
            """,
            reverse_sql="""
            DROP FUNCTION IF EXISTS maintain_gps_partitions();
            DROP FUNCTION IF EXISTS create_monthly_gps_partition(DATE);
            DROP TABLE IF EXISTS tracking_gpsevent_partitioned CASCADE;
            """
        ),
        
        # Enhanced materialized views with spatial statistics
        migrations.RunSQL(
            """
            -- ===== ENHANCED MATERIALIZED VIEWS FOR PERFORMANCE =====
            
            -- Enhanced fleet summary with detailed spatial statistics
            DROP MATERIALIZED VIEW IF EXISTS tracking_fleet_summary;
            CREATE MATERIALIZED VIEW tracking_fleet_summary AS
            SELECT 
                v.owning_company_id,
                COUNT(*) as total_vehicles,
                COUNT(CASE WHEN v.last_reported_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN 1 END) as active_vehicles,
                COUNT(CASE WHEN v.last_reported_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as recent_vehicles,
                COUNT(CASE WHEN v.status = 'IN_USE' THEN 1 END) as deployed_vehicles,
                COUNT(CASE WHEN v.status = 'AVAILABLE' THEN 1 END) as available_vehicles,
                
                -- Spatial statistics
                ST_Extent(v.last_known_location) as fleet_bounds,
                ST_Centroid(ST_Collect(v.last_known_location)) as fleet_center,
                
                -- Advanced spatial metrics
                ST_Area(ST_ConvexHull(ST_Collect(v.last_known_location))) as coverage_area,
                COUNT(DISTINCT ST_GeoHash(v.last_known_location, 4)) as geohash_4_count,
                COUNT(DISTINCT ST_GeoHash(v.last_known_location, 6)) as geohash_6_count,
                
                -- Temporal statistics
                MAX(v.last_reported_at) as last_update,
                AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v.last_reported_at))) as avg_staleness_seconds,
                
                -- Performance metrics
                CURRENT_TIMESTAMP as computed_at
            FROM vehicles_vehicle v
            WHERE v.last_known_location IS NOT NULL
            GROUP BY v.owning_company_id;
            
            -- Indexes for the materialized view
            CREATE UNIQUE INDEX tracking_fleet_summary_company_uk 
            ON tracking_fleet_summary (owning_company_id);
            
            CREATE INDEX tracking_fleet_summary_bounds_gist 
            ON tracking_fleet_summary USING GIST (fleet_bounds);
            
            CREATE INDEX tracking_fleet_summary_center_gist 
            ON tracking_fleet_summary USING GIST (fleet_center);
            
            -- Real-time vehicle density view for clustering decisions
            CREATE MATERIALIZED VIEW tracking_vehicle_density AS
            SELECT 
                ST_GeoHash(v.last_known_location, 5) as geohash_5,
                ST_GeoHash(v.last_known_location, 7) as geohash_7,
                v.owning_company_id,
                COUNT(*) as vehicle_count,
                ST_Centroid(ST_Collect(v.last_known_location)) as cluster_center,
                ST_Extent(v.last_known_location) as cluster_bounds,
                MAX(v.last_reported_at) as latest_update,
                array_agg(v.id ORDER BY v.last_reported_at DESC) as vehicle_ids
            FROM vehicles_vehicle v
            WHERE v.last_known_location IS NOT NULL
            AND v.last_reported_at >= CURRENT_TIMESTAMP - INTERVAL '2 hours'
            GROUP BY ST_GeoHash(v.last_known_location, 5), ST_GeoHash(v.last_known_location, 7), v.owning_company_id
            HAVING COUNT(*) > 0;
            
            -- Indexes for density view
            CREATE INDEX tracking_vehicle_density_geohash5_idx 
            ON tracking_vehicle_density (geohash_5, owning_company_id);
            
            CREATE INDEX tracking_vehicle_density_geohash7_idx 
            ON tracking_vehicle_density (geohash_7, owning_company_id);
            
            CREATE INDEX tracking_vehicle_density_center_gist 
            ON tracking_vehicle_density USING GIST (cluster_center);
            
            -- Geofence interaction statistics
            CREATE MATERIALIZED VIEW tracking_geofence_stats AS
            SELECT 
                lv.location_id,
                l.owning_company_id,
                l.name as location_name,
                l.location_type,
                COUNT(*) as total_visits,
                COUNT(CASE WHEN lv.status = 'ACTIVE' THEN 1 END) as active_visits,
                AVG(CASE WHEN lv.exit_time IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (lv.exit_time - lv.entry_time))/3600.0 END) as avg_duration_hours,
                MAX(lv.entry_time) as last_visit,
                COUNT(DISTINCT lv.vehicle_id) as unique_vehicles,
                ST_Area(l.geofence::geometry) as geofence_area,
                CURRENT_TIMESTAMP as computed_at
            FROM tracking_locationvisit lv
            JOIN locations_geolocation l ON l.id = lv.location_id
            WHERE lv.entry_time >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            GROUP BY lv.location_id, l.owning_company_id, l.name, l.location_type, l.geofence;
            
            CREATE INDEX tracking_geofence_stats_location_idx 
            ON tracking_geofence_stats (location_id, owning_company_id);
            """,
            reverse_sql="""
            DROP MATERIALIZED VIEW IF EXISTS tracking_geofence_stats;
            DROP MATERIALIZED VIEW IF EXISTS tracking_vehicle_density;
            DROP MATERIALIZED VIEW IF EXISTS tracking_fleet_summary;
            """
        ),
        
        # Advanced clustering and query optimization functions
        migrations.RunSQL(
            """
            -- ===== ENHANCED CLUSTERING FUNCTIONS =====
            
            -- Enhanced clustering function with adaptive precision and company filtering
            CREATE OR REPLACE FUNCTION get_enhanced_clustered_vehicles(
                viewport_bounds GEOMETRY,
                zoom_level INTEGER,
                company_id INTEGER DEFAULT NULL,
                max_clusters INTEGER DEFAULT 100
            )
            RETURNS TABLE(
                cluster_id INTEGER,
                vehicle_count INTEGER,
                center_location GEOMETRY,
                cluster_bounds GEOMETRY,
                vehicle_ids INTEGER[],
                company_ids INTEGER[],
                last_update TIMESTAMP WITH TIME ZONE,
                avg_speed NUMERIC,
                status_summary JSONB
            ) AS $$
            DECLARE
                geohash_precision INTEGER;
                time_filter TIMESTAMP WITH TIME ZONE;
            BEGIN
                -- Adaptive geohash precision based on zoom level and expected density
                CASE 
                    WHEN zoom_level <= 6 THEN geohash_precision := 3;   -- Continental
                    WHEN zoom_level <= 9 THEN geohash_precision := 4;   -- Country
                    WHEN zoom_level <= 12 THEN geohash_precision := 5;  -- State/Region
                    WHEN zoom_level <= 15 THEN geohash_precision := 6;  -- City
                    ELSE geohash_precision := 7;                        -- Street level
                END CASE;
                
                -- Dynamic time filter based on zoom (closer zoom = more recent data)
                time_filter := CURRENT_TIMESTAMP - CASE 
                    WHEN zoom_level >= 15 THEN INTERVAL '30 minutes'
                    WHEN zoom_level >= 12 THEN INTERVAL '1 hour'
                    WHEN zoom_level >= 9 THEN INTERVAL '2 hours'
                    ELSE INTERVAL '6 hours'
                END;
                
                RETURN QUERY
                SELECT 
                    ROW_NUMBER() OVER(ORDER BY COUNT(*) DESC)::INTEGER as cluster_id,
                    COUNT(*)::INTEGER as vehicle_count,
                    ST_Centroid(ST_Collect(v.last_known_location)) as center_location,
                    ST_Extent(v.last_known_location) as cluster_bounds,
                    array_agg(v.id ORDER BY v.last_reported_at DESC) as vehicle_ids,
                    array_agg(DISTINCT v.owning_company_id) as company_ids,
                    MAX(v.last_reported_at) as last_update,
                    
                    -- Calculate average speed from recent GPS events
                    (SELECT AVG(g.speed) 
                     FROM tracking_gpsevent g 
                     WHERE g.vehicle_id = ANY(array_agg(v.id)) 
                     AND g.speed IS NOT NULL 
                     AND g.timestamp >= time_filter) as avg_speed,
                     
                    -- Status summary as JSONB
                    jsonb_build_object(
                        'IN_USE', COUNT(CASE WHEN v.status = 'IN_USE' THEN 1 END),
                        'AVAILABLE', COUNT(CASE WHEN v.status = 'AVAILABLE' THEN 1 END),
                        'MAINTENANCE', COUNT(CASE WHEN v.status = 'MAINTENANCE' THEN 1 END),
                        'OUT_OF_SERVICE', COUNT(CASE WHEN v.status = 'OUT_OF_SERVICE' THEN 1 END)
                    ) as status_summary
                    
                FROM vehicles_vehicle v
                WHERE 
                    v.last_known_location IS NOT NULL
                    AND ST_Intersects(v.last_known_location, viewport_bounds)
                    AND v.last_reported_at >= time_filter
                    AND (company_id IS NULL OR v.owning_company_id = company_id)
                GROUP BY ST_GeoHash(v.last_known_location, geohash_precision)
                HAVING COUNT(*) > 0
                ORDER BY COUNT(*) DESC
                LIMIT max_clusters;
            END;
            $$ LANGUAGE plpgsql STABLE;
            
            -- Fast viewport data loading function
            CREATE OR REPLACE FUNCTION get_viewport_vehicles(
                viewport_bounds GEOMETRY,
                zoom_level INTEGER,
                company_id INTEGER DEFAULT NULL,
                include_historical BOOLEAN DEFAULT FALSE
            )
            RETURNS TABLE(
                vehicle_id INTEGER,
                location GEOMETRY,
                status VARCHAR(16),
                last_reported TIMESTAMP WITH TIME ZONE,
                driver_name TEXT,
                current_speed NUMERIC,
                heading NUMERIC,
                geofence_status JSONB
            ) AS $$
            DECLARE
                time_filter TIMESTAMP WITH TIME ZONE;
                vehicle_limit INTEGER;
            BEGIN
                -- Adjust time filter and limits based on zoom level
                IF zoom_level >= 15 THEN
                    time_filter := CURRENT_TIMESTAMP - INTERVAL '30 minutes';
                    vehicle_limit := 200;
                ELSIF zoom_level >= 12 THEN
                    time_filter := CURRENT_TIMESTAMP - INTERVAL '1 hour';  
                    vehicle_limit := 500;
                ELSE
                    time_filter := CURRENT_TIMESTAMP - INTERVAL '2 hours';
                    vehicle_limit := 1000;
                END IF;
                
                IF include_historical THEN
                    time_filter := CURRENT_TIMESTAMP - INTERVAL '24 hours';
                    vehicle_limit := vehicle_limit * 2;
                END IF;
                
                RETURN QUERY
                SELECT 
                    v.id as vehicle_id,
                    v.last_known_location as location,
                    v.status,
                    v.last_reported_at as last_reported,
                    COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as driver_name,
                    
                    -- Get latest speed from GPS events
                    (SELECT g.speed 
                     FROM tracking_gpsevent g 
                     WHERE g.vehicle_id = v.id 
                     AND g.speed IS NOT NULL 
                     ORDER BY g.timestamp DESC LIMIT 1) as current_speed,
                     
                    -- Get latest heading
                    (SELECT g.heading 
                     FROM tracking_gpsevent g 
                     WHERE g.vehicle_id = v.id 
                     AND g.heading IS NOT NULL 
                     ORDER BY g.timestamp DESC LIMIT 1) as heading,
                     
                    -- Check current geofence status
                    (SELECT jsonb_agg(jsonb_build_object(
                        'location_id', lv.location_id,
                        'location_name', l.name,
                        'entry_time', lv.entry_time,
                        'duration_minutes', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - lv.entry_time))/60
                    ))
                     FROM tracking_locationvisit lv
                     JOIN locations_geolocation l ON l.id = lv.location_id
                     WHERE lv.vehicle_id = v.id 
                     AND lv.status = 'ACTIVE'
                     AND lv.exit_time IS NULL) as geofence_status
                     
                FROM vehicles_vehicle v
                LEFT JOIN users_user u ON u.id = v.assigned_driver_id
                WHERE 
                    v.last_known_location IS NOT NULL
                    AND ST_Intersects(v.last_known_location, viewport_bounds)
                    AND v.last_reported_at >= time_filter
                    AND (company_id IS NULL OR v.owning_company_id = company_id)
                ORDER BY v.last_reported_at DESC
                LIMIT vehicle_limit;
            END;
            $$ LANGUAGE plpgsql STABLE;
            
            -- Performance monitoring function
            CREATE OR REPLACE FUNCTION analyze_spatial_performance()
            RETURNS TABLE(
                index_name TEXT,
                table_name TEXT,
                index_size TEXT,
                index_scans BIGINT,
                tuples_read BIGINT,
                tuples_fetched BIGINT,
                efficiency_ratio NUMERIC
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    i.indexrelname::TEXT as index_name,
                    t.relname::TEXT as table_name,
                    pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
                    s.idx_scan as index_scans,
                    s.idx_tup_read as tuples_read,
                    s.idx_tup_fetch as tuples_fetched,
                    CASE WHEN s.idx_tup_read > 0 
                         THEN ROUND((s.idx_tup_fetch::NUMERIC / s.idx_tup_read) * 100, 2)
                         ELSE 0 
                    END as efficiency_ratio
                FROM pg_stat_user_indexes s
                JOIN pg_class t ON t.oid = s.relid
                JOIN pg_class i ON i.oid = s.indexrelid
                WHERE t.relname IN ('tracking_gpsevent', 'vehicles_vehicle', 'tracking_locationvisit')
                AND i.indexrelname LIKE '%spatial%' OR i.indexrelname LIKE '%gist%' OR i.indexrelname LIKE '%brin%'
                ORDER BY s.idx_scan DESC;
            END;
            $$ LANGUAGE plpgsql;
            """,
            reverse_sql="""
            DROP FUNCTION IF EXISTS analyze_spatial_performance();
            DROP FUNCTION IF EXISTS get_viewport_vehicles(GEOMETRY, INTEGER, INTEGER, BOOLEAN);
            DROP FUNCTION IF EXISTS get_enhanced_clustered_vehicles(GEOMETRY, INTEGER, INTEGER, INTEGER);
            """
        ),
        
        # Automated maintenance and refresh procedures
        migrations.RunSQL(
            """
            -- ===== AUTOMATED MAINTENANCE PROCEDURES =====
            
            -- Materialized view refresh function
            CREATE OR REPLACE FUNCTION refresh_spatial_views()
            RETURNS VOID AS $$
            BEGIN
                -- Refresh views concurrently to avoid blocking
                REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_fleet_summary;
                REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_vehicle_density;
                REFRESH MATERIALIZED VIEW CONCURRENTLY tracking_geofence_stats;
                
                -- Update statistics
                ANALYZE tracking_gpsevent;
                ANALYZE vehicles_vehicle;
                ANALYZE tracking_locationvisit;
                
                RAISE NOTICE 'Spatial views refreshed at %', CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Index maintenance function
            CREATE OR REPLACE FUNCTION maintain_spatial_indexes()
            RETURNS VOID AS $$
            BEGIN
                -- Reindex spatial indexes that may become bloated
                REINDEX INDEX CONCURRENTLY tracking_gpsevent_coordinates_gist;
                REINDEX INDEX CONCURRENTLY vehicles_vehicle_location_gist;
                
                -- Update index statistics
                ANALYZE tracking_gpsevent;
                ANALYZE vehicles_vehicle;
                
                RAISE NOTICE 'Spatial indexes maintained at %', CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Performance monitoring and alerting
            CREATE OR REPLACE FUNCTION check_spatial_performance()
            RETURNS TABLE(
                metric_name TEXT,
                metric_value TEXT,
                status TEXT,
                recommendation TEXT
            ) AS $$
            DECLARE
                slow_query_count INTEGER;
                index_bloat_ratio NUMERIC;
                recent_data_ratio NUMERIC;
            BEGIN
                -- Check for slow spatial queries
                SELECT COUNT(*) INTO slow_query_count
                FROM pg_stat_statements 
                WHERE query LIKE '%ST_%' 
                AND mean_exec_time > 1000; -- > 1 second
                
                -- Check materialized view freshness
                SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - computed_at))/60 
                INTO recent_data_ratio
                FROM tracking_fleet_summary LIMIT 1;
                
                -- Return performance metrics
                RETURN QUERY VALUES
                ('slow_spatial_queries', slow_query_count::TEXT, 
                 CASE WHEN slow_query_count > 10 THEN 'WARNING' ELSE 'OK' END,
                 'Consider optimizing spatial queries or updating indexes'),
                 
                ('materialized_view_age_minutes', COALESCE(recent_data_ratio::TEXT, 'N/A'),
                 CASE WHEN recent_data_ratio > 30 THEN 'WARNING' ELSE 'OK' END,
                 'Refresh materialized views more frequently during peak usage'),
                 
                ('index_usage', 'See analyze_spatial_performance()', 'INFO',
                 'Monitor index efficiency ratios regularly');
            END;
            $$ LANGUAGE plpgsql;
            """,
            reverse_sql="""
            DROP FUNCTION IF EXISTS check_spatial_performance();
            DROP FUNCTION IF EXISTS maintain_spatial_indexes();
            DROP FUNCTION IF EXISTS refresh_spatial_views();
            """
        ),
    ]