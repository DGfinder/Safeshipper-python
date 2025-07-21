# Generated migration for advanced spatial indexing optimization

from django.db import migrations
from django.contrib.postgres.operations import CreateExtension


class Migration(migrations.Migration):

    dependencies = [
        ('tracking', '0002_initial'),
    ]

    operations = [
        # Ensure PostGIS extensions are available
        CreateExtension('postgis'),
        CreateExtension('postgis_topology'),
        
        # Advanced spatial indexing for GPS events
        migrations.RunSQL(
            """
            -- Create hybrid BRIN index for time-series GPS data (efficient for time-based queries)
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_timestamp_brin 
            ON tracking_gpsevent USING BRIN (timestamp, vehicle_id);
            
            -- Enhanced GiST index for spatial queries with time filter
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_location_time_gist 
            ON tracking_gpsevent USING GIST (location, timestamp) 
            WHERE location IS NOT NULL AND timestamp >= NOW() - INTERVAL '24 hours';
            
            -- Geohash-based clustering index for proximity searches
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_geohash_idx 
            ON tracking_gpsevent (ST_GeoHash(location, 7)) 
            WHERE location IS NOT NULL;
            
            -- Composite index for active vehicle tracking
            CREATE INDEX CONCURRENTLY IF NOT EXISTS tracking_gpsevent_active_vehicles 
            ON tracking_gpsevent (vehicle_id, timestamp DESC, location) 
            WHERE timestamp >= NOW() - INTERVAL '2 hours';
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS tracking_gpsevent_timestamp_brin;
            DROP INDEX IF EXISTS tracking_gpsevent_location_time_gist;
            DROP INDEX IF EXISTS tracking_gpsevent_geohash_idx;
            DROP INDEX IF EXISTS tracking_gpsevent_active_vehicles;
            """
        ),
        
        # Partitioning for GPS events by month (for historical data efficiency)
        migrations.RunSQL(
            """
            -- Create partitioned table for GPS events
            CREATE TABLE IF NOT EXISTS tracking_gpsevent_partitioned (
                LIKE tracking_gpsevent INCLUDING ALL
            ) PARTITION BY RANGE (timestamp);
            
            -- Create current month partition
            CREATE TABLE IF NOT EXISTS tracking_gpsevent_current PARTITION OF tracking_gpsevent_partitioned
            FOR VALUES FROM (date_trunc('month', CURRENT_DATE)) 
            TO (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month');
            
            -- Create next month partition (for continuous operation)
            CREATE TABLE IF NOT EXISTS tracking_gpsevent_next PARTITION OF tracking_gpsevent_partitioned
            FOR VALUES FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month') 
            TO (date_trunc('month', CURRENT_DATE) + INTERVAL '2 months');
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS tracking_gpsevent_current;
            DROP TABLE IF EXISTS tracking_gpsevent_next;
            DROP TABLE IF EXISTS tracking_gpsevent_partitioned;
            """
        ),
        
        # Vehicle location indexing for fleet tracking
        migrations.RunSQL(
            """
            -- Spatial index for vehicle last known locations
            CREATE INDEX CONCURRENTLY IF NOT EXISTS vehicles_vehicle_location_gist 
            ON vehicles_vehicle USING GIST (last_known_location) 
            WHERE last_known_location IS NOT NULL;
            
            -- Active vehicle tracking optimization
            CREATE INDEX CONCURRENTLY IF NOT EXISTS vehicles_active_tracking 
            ON vehicles_vehicle (status, last_reported_at, owning_company_id) 
            WHERE last_reported_at >= NOW() - INTERVAL '4 hours';
            
            -- Geofence intersection optimization
            CREATE INDEX CONCURRENTLY IF NOT EXISTS locations_geolocation_boundary_gist 
            ON locations_geolocation USING GIST (boundary) 
            WHERE boundary IS NOT NULL;
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS vehicles_vehicle_location_gist;
            DROP INDEX IF EXISTS vehicles_active_tracking;
            DROP INDEX IF EXISTS locations_geolocation_boundary_gist;
            """
        ),
        
        # Create materialized view for fleet dashboard performance
        migrations.RunSQL(
            """
            CREATE MATERIALIZED VIEW IF NOT EXISTS tracking_fleet_summary AS
            SELECT 
                v.owning_company_id,
                COUNT(*) as total_vehicles,
                COUNT(CASE WHEN v.last_reported_at >= NOW() - INTERVAL '30 minutes' THEN 1 END) as active_vehicles,
                COUNT(CASE WHEN v.status = 'ACTIVE' THEN 1 END) as deployed_vehicles,
                ST_Extent(v.last_known_location) as fleet_bounds,
                ST_Centroid(ST_Collect(v.last_known_location)) as fleet_center,
                MAX(v.last_reported_at) as last_update
            FROM vehicles_vehicle v
            WHERE v.last_known_location IS NOT NULL
            GROUP BY v.owning_company_id;
            
            -- Index the materialized view
            CREATE UNIQUE INDEX IF NOT EXISTS tracking_fleet_summary_company_idx 
            ON tracking_fleet_summary (owning_company_id);
            
            CREATE INDEX IF NOT EXISTS tracking_fleet_summary_bounds_gist 
            ON tracking_fleet_summary USING GIST (fleet_bounds);
            """,
            reverse_sql="""
            DROP MATERIALIZED VIEW IF EXISTS tracking_fleet_summary;
            """
        ),
        
        # Function for automatic geohash generation
        migrations.RunSQL(
            """
            CREATE OR REPLACE FUNCTION calculate_geohash_precision(zoom_level INTEGER)
            RETURNS INTEGER AS $$
            BEGIN
                -- Adaptive geohash precision based on zoom level
                CASE 
                    WHEN zoom_level <= 5 THEN RETURN 3;   -- Country level
                    WHEN zoom_level <= 8 THEN RETURN 4;   -- State level
                    WHEN zoom_level <= 11 THEN RETURN 5;  -- City level
                    WHEN zoom_level <= 14 THEN RETURN 6;  -- District level
                    ELSE RETURN 7;                        -- Street level
                END CASE;
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
            
            -- Function for efficient clustering queries
            CREATE OR REPLACE FUNCTION get_clustered_vehicles(
                bounds GEOMETRY,
                zoom_level INTEGER,
                company_id INTEGER DEFAULT NULL
            )
            RETURNS TABLE(
                cluster_id INTEGER,
                vehicle_count INTEGER,
                center_location GEOMETRY,
                vehicle_ids INTEGER[],
                last_update TIMESTAMP WITH TIME ZONE
            ) AS $$
            DECLARE
                geohash_precision INTEGER := calculate_geohash_precision(zoom_level);
            BEGIN
                RETURN QUERY
                SELECT 
                    ROW_NUMBER() OVER()::INTEGER as cluster_id,
                    COUNT(*)::INTEGER as vehicle_count,
                    ST_Centroid(ST_Collect(v.last_known_location)) as center_location,
                    array_agg(v.id) as vehicle_ids,
                    MAX(v.last_reported_at) as last_update
                FROM vehicles_vehicle v
                WHERE 
                    v.last_known_location IS NOT NULL
                    AND ST_Intersects(v.last_known_location, bounds)
                    AND v.last_reported_at >= NOW() - INTERVAL '2 hours'
                    AND (company_id IS NULL OR v.owning_company_id = company_id)
                GROUP BY ST_GeoHash(v.last_known_location, geohash_precision)
                HAVING COUNT(*) > 0;
            END;
            $$ LANGUAGE plpgsql;
            """,
            reverse_sql="""
            DROP FUNCTION IF EXISTS get_clustered_vehicles(GEOMETRY, INTEGER, INTEGER);
            DROP FUNCTION IF EXISTS calculate_geohash_precision(INTEGER);
            """
        ),
    ]