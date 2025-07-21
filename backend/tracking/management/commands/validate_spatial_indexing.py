"""
Django management command to validate spatial indexing implementation.
Checks that all indexes are created properly and performs basic performance validation.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone
from datetime import timedelta
import time
import json


class Command(BaseCommand):
    help = 'Validate spatial indexing implementation and performance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-indexes',
            action='store_true',
            help='Check that all required indexes exist'
        )
        parser.add_argument(
            '--performance-test',
            action='store_true',
            help='Run basic performance tests'
        )
        parser.add_argument(
            '--full-validation',
            action='store_true',
            help='Run complete validation suite'
        )
        parser.add_argument(
            '--output-format',
            choices=['text', 'json'],
            default='text',
            help='Output format for results'
        )

    def handle(self, *args, **options):
        results = {
            'timestamp': timezone.now().isoformat(),
            'checks': {},
            'performance': {},
            'recommendations': []
        }
        
        if options['full_validation'] or options['check_indexes']:
            self.stdout.write("=== Checking Spatial Indexes ===")
            results['checks']['indexes'] = self.check_indexes()
        
        if options['full_validation'] or options['performance_test']:
            self.stdout.write("=== Running Performance Tests ===")
            results['performance'] = self.run_performance_tests()
        
        if options['full_validation']:
            results['checks']['materialized_views'] = self.check_materialized_views()
            results['checks']['functions'] = self.check_functions()
            results['recommendations'] = self.generate_recommendations(results)
        
        if options['output_format'] == 'json':
            self.stdout.write(json.dumps(results, indent=2))
        else:
            self.print_text_summary(results)

    def check_indexes(self):
        """Check that all required indexes exist and are healthy."""
        index_results = {
            'brin_indexes': [],
            'gist_indexes': [],
            'btree_indexes': [],
            'missing_indexes': [],
            'total_size': '0 bytes'
        }
        
        expected_indexes = {
            'brin': [
                'tracking_gpsevent_timestamp_brin_v2',
                'tracking_gpsevent_company_time_brin',
                'tracking_gpsevent_recent_brin'
            ],
            'gist': [
                'tracking_gpsevent_spatial_temporal_gist',
                'tracking_gpsevent_coordinates_precise_gist',
                'tracking_gpsevent_company_spatial_gist',
                'vehicles_vehicle_location_company_gist'
            ],
            'btree': [
                'tracking_gpsevent_vehicle_history_btree',
                'tracking_gpsevent_shipment_tracking_btree',
                'vehicles_vehicle_realtime_tracking'
            ]
        }
        
        with connection.cursor() as cursor:
            # Check existing indexes
            cursor.execute("""
                SELECT 
                    i.indexrelname as index_name,
                    am.amname as index_type,
                    pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
                    s.idx_scan as scans,
                    s.idx_tup_read as tuples_read,
                    s.idx_tup_fetch as tuples_fetched
                FROM pg_stat_user_indexes s
                JOIN pg_class i ON i.oid = s.indexrelid
                JOIN pg_am am ON am.oid = i.relam
                WHERE s.schemaname = 'public'
                AND (s.relname = 'tracking_gpsevent' OR s.relname = 'vehicles_vehicle')
                ORDER BY s.idx_scan DESC
            """)
            
            existing_indexes = cursor.fetchall()
            
            # Organize by type
            for index_name, index_type, size, scans, tuples_read, tuples_fetched in existing_indexes:
                index_info = {
                    'name': index_name,
                    'size': size,
                    'scans': scans,
                    'tuples_read': tuples_read,
                    'tuples_fetched': tuples_fetched,
                    'efficiency': round((tuples_fetched / tuples_read * 100) if tuples_read > 0 else 0, 2)
                }
                
                if index_type == 'brin':
                    index_results['brin_indexes'].append(index_info)
                elif index_type == 'gist':
                    index_results['gist_indexes'].append(index_info)
                elif index_type == 'btree':
                    index_results['btree_indexes'].append(index_info)
            
            # Check for missing indexes
            existing_names = [idx[0] for idx in existing_indexes]
            
            for index_type, expected_list in expected_indexes.items():
                for expected_name in expected_list:
                    if expected_name not in existing_names:
                        index_results['missing_indexes'].append({
                            'name': expected_name,
                            'type': index_type
                        })
            
            # Get total index size
            cursor.execute("""
                SELECT pg_size_pretty(SUM(pg_relation_size(i.indexrelid)))
                FROM pg_stat_user_indexes s
                JOIN pg_class i ON i.oid = s.indexrelid
                WHERE s.schemaname = 'public'
                AND (s.relname = 'tracking_gpsevent' OR s.relname = 'vehicles_vehicle')
            """)
            index_results['total_size'] = cursor.fetchone()[0] or '0 bytes'
        
        # Print results
        self.stdout.write(f"BRIN Indexes: {len(index_results['brin_indexes'])} found")
        self.stdout.write(f"GiST Indexes: {len(index_results['gist_indexes'])} found")
        self.stdout.write(f"B-tree Indexes: {len(index_results['btree_indexes'])} found")
        self.stdout.write(f"Total Index Size: {index_results['total_size']}")
        
        if index_results['missing_indexes']:
            self.stdout.write(
                self.style.WARNING(f"Missing {len(index_results['missing_indexes'])} indexes:")
            )
            for missing in index_results['missing_indexes']:
                self.stdout.write(f"  - {missing['name']} ({missing['type']})")
        else:
            self.stdout.write(self.style.SUCCESS("All expected indexes found"))
        
        return index_results

    def check_materialized_views(self):
        """Check materialized view status."""
        view_results = {}
        
        views_to_check = [
            'tracking_fleet_summary',
            'tracking_vehicle_density',
            'tracking_geofence_stats'
        ]
        
        with connection.cursor() as cursor:
            for view_name in views_to_check:
                try:
                    # Check if view exists and get row count
                    cursor.execute(f"SELECT COUNT(*) FROM {view_name}")
                    row_count = cursor.fetchone()[0]
                    
                    # Check when it was last updated (if it has computed_at column)
                    try:
                        cursor.execute(f"SELECT MAX(computed_at) FROM {view_name}")
                        last_update = cursor.fetchone()[0]
                    except:
                        last_update = None
                    
                    view_results[view_name] = {
                        'exists': True,
                        'row_count': row_count,
                        'last_update': last_update.isoformat() if last_update else None
                    }
                    
                    self.stdout.write(f"{view_name}: {row_count} rows")
                    
                except Exception as e:
                    view_results[view_name] = {
                        'exists': False,
                        'error': str(e)
                    }
                    self.stdout.write(self.style.ERROR(f"{view_name}: Not found or error"))
        
        return view_results

    def check_functions(self):
        """Check that custom functions exist."""
        function_results = {}
        
        functions_to_check = [
            'get_enhanced_clustered_vehicles',
            'get_viewport_vehicles',
            'create_monthly_gps_partition',
            'maintain_gps_partitions',
            'refresh_spatial_views',
            'analyze_spatial_performance'
        ]
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT routine_name, routine_type 
                FROM information_schema.routines 
                WHERE routine_schema = 'public'
                AND routine_name = ANY(%s)
            """, [functions_to_check])
            
            existing_functions = {name: rtype for name, rtype in cursor.fetchall()}
            
            for func_name in functions_to_check:
                if func_name in existing_functions:
                    function_results[func_name] = {
                        'exists': True,
                        'type': existing_functions[func_name]
                    }
                    self.stdout.write(f"{func_name}: ✓")
                else:
                    function_results[func_name] = {'exists': False}
                    self.stdout.write(self.style.ERROR(f"{func_name}: Missing"))
        
        return function_results

    def run_performance_tests(self):
        """Run basic performance tests."""
        performance_results = {}
        
        with connection.cursor() as cursor:
            # Test 1: Recent GPS events query (should use BRIN index)
            start_time = time.time()
            cursor.execute("""
                SELECT COUNT(*) FROM tracking_gpsevent 
                WHERE timestamp >= %s
            """, [timezone.now() - timedelta(hours=1)])
            recent_count = cursor.fetchone()[0]
            recent_time = time.time() - start_time
            
            performance_results['recent_events_query'] = {
                'duration_seconds': round(recent_time, 3),
                'result_count': recent_count,
                'performance_rating': 'excellent' if recent_time < 0.1 else 'good' if recent_time < 0.5 else 'needs_improvement'
            }
            
            # Test 2: Spatial clustering function
            start_time = time.time()
            try:
                cursor.execute("""
                    SELECT COUNT(*) FROM get_enhanced_clustered_vehicles(
                        ST_GeomFromText('POLYGON((150 -35, 152 -35, 152 -33, 150 -33, 150 -35))', 4326),
                        10, NULL, 50
                    )
                """)
                cluster_count = cursor.fetchone()[0]
                cluster_time = time.time() - start_time
                
                performance_results['clustering_function'] = {
                    'duration_seconds': round(cluster_time, 3),
                    'result_count': cluster_count,
                    'performance_rating': 'excellent' if cluster_time < 0.2 else 'good' if cluster_time < 1.0 else 'needs_improvement'
                }
            except Exception as e:
                performance_results['clustering_function'] = {
                    'error': str(e),
                    'performance_rating': 'error'
                }
            
            # Test 3: Index usage analysis
            start_time = time.time()
            try:
                cursor.execute("SELECT COUNT(*) FROM analyze_spatial_performance()")
                analysis_count = cursor.fetchone()[0]
                analysis_time = time.time() - start_time
                
                performance_results['performance_analysis'] = {
                    'duration_seconds': round(analysis_time, 3),
                    'indexes_analyzed': analysis_count,
                    'performance_rating': 'excellent' if analysis_time < 0.1 else 'good' if analysis_time < 0.5 else 'needs_improvement'
                }
            except Exception as e:
                performance_results['performance_analysis'] = {
                    'error': str(e),
                    'performance_rating': 'error'
                }
            
            # Test 4: Materialized view refresh
            start_time = time.time()
            try:
                cursor.execute("SELECT refresh_spatial_views()")
                refresh_time = time.time() - start_time
                
                performance_results['view_refresh'] = {
                    'duration_seconds': round(refresh_time, 3),
                    'performance_rating': 'excellent' if refresh_time < 1.0 else 'good' if refresh_time < 5.0 else 'needs_improvement'
                }
            except Exception as e:
                performance_results['view_refresh'] = {
                    'error': str(e),
                    'performance_rating': 'error'
                }
        
        # Print performance results
        for test_name, result in performance_results.items():
            if 'error' in result:
                self.stdout.write(self.style.ERROR(f"{test_name}: Error - {result['error']}"))
            else:
                rating_style = self.style.SUCCESS if result['performance_rating'] == 'excellent' else \
                              self.style.WARNING if result['performance_rating'] == 'needs_improvement' else \
                              self.style.HTTP_INFO
                
                self.stdout.write(
                    rating_style(f"{test_name}: {result['duration_seconds']}s ({result['performance_rating']})")
                )
        
        return performance_results

    def generate_recommendations(self, results):
        """Generate recommendations based on validation results."""
        recommendations = []
        
        # Check for missing indexes
        if results.get('checks', {}).get('indexes', {}).get('missing_indexes'):
            recommendations.append({
                'type': 'critical',
                'message': 'Run migration to create missing indexes',
                'action': 'python manage.py migrate tracking'
            })
        
        # Check performance issues
        performance = results.get('performance', {})
        for test_name, result in performance.items():
            if result.get('performance_rating') == 'needs_improvement':
                recommendations.append({
                    'type': 'performance',
                    'message': f'{test_name} is slow',
                    'action': 'Consider running ANALYZE on tables or refreshing materialized views'
                })
            elif result.get('performance_rating') == 'error':
                recommendations.append({
                    'type': 'error',
                    'message': f'{test_name} failed',
                    'action': 'Check function definitions and run migration'
                })
        
        # Check materialized view freshness
        views = results.get('checks', {}).get('materialized_views', {})
        for view_name, view_info in views.items():
            if view_info.get('last_update'):
                from dateutil.parser import parse
                last_update = parse(view_info['last_update'])
                staleness = timezone.now() - last_update
                
                if staleness > timedelta(hours=4):
                    recommendations.append({
                        'type': 'maintenance',
                        'message': f'{view_name} is stale ({staleness})',
                        'action': 'python manage.py dbshell -c "SELECT refresh_spatial_views();"'
                    })
        
        return recommendations

    def print_text_summary(self, results):
        """Print a text summary of validation results."""
        self.stdout.write("\n=== Validation Summary ===")
        
        # Overall status
        has_errors = any(
            r.get('performance_rating') == 'error' 
            for r in results.get('performance', {}).values()
        )
        has_missing_indexes = bool(
            results.get('checks', {}).get('indexes', {}).get('missing_indexes')
        )
        
        if has_errors or has_missing_indexes:
            self.stdout.write(self.style.ERROR("❌ Issues found requiring attention"))
        else:
            self.stdout.write(self.style.SUCCESS("✅ All validations passed"))
        
        # Recommendations
        recommendations = results.get('recommendations', [])
        if recommendations:
            self.stdout.write(f"\n=== Recommendations ({len(recommendations)}) ===")
            for i, rec in enumerate(recommendations, 1):
                icon = "🔴" if rec['type'] == 'critical' else "🟡" if rec['type'] == 'performance' else "🔵"
                self.stdout.write(f"{i}. {icon} {rec['message']}")
                self.stdout.write(f"   Action: {rec['action']}")
        
        self.stdout.write(f"\nValidation completed at {results['timestamp']}")