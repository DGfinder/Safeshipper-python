"""
Query optimization engine for analytics queries.
Optimizes queries based on data volume, access patterns, and user context.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


@dataclass
class QueryOptimization:
    """Result of query optimization analysis"""
    optimized_query: str
    optimization_applied: List[str]
    estimated_cost: int
    use_materialized_view: bool
    use_index_hints: bool
    partition_pruning: bool


@dataclass
class QueryContext:
    """Context information for query optimization"""
    user_role: str
    company_id: Optional[int]
    time_range: str
    data_volume_estimate: int
    real_time_required: bool
    cache_available: bool


class QueryOptimizer:
    """
    Optimizes analytics queries based on context and performance characteristics.
    Applies various optimization strategies including materialized views,
    partitioning, indexing hints, and query rewriting.
    """
    
    def __init__(self):
        self.optimization_stats = {
            'queries_optimized': 0,
            'materialized_view_usage': 0,
            'partition_pruning_applied': 0,
            'index_hints_applied': 0,
            'query_rewrites': 0
        }
        
        # Query templates for common patterns
        self.optimized_templates = {
            'fleet_utilization': {
                'materialized_view': 'analytics_fleet_utilization_mv',
                'base_query': '''
                    SELECT 
                        date_trunc('{granularity}', created_at) as time_bucket,
                        COUNT(*) as total_vehicles,
                        COUNT(CASE WHEN status IN ('ACTIVE', 'IN_TRANSIT') THEN 1 END) as active_vehicles,
                        AVG(utilization_percentage) as avg_utilization
                    FROM fleet_vehicles v
                    WHERE created_at >= %s
                    {company_filter}
                    GROUP BY time_bucket
                    ORDER BY time_bucket DESC
                ''',
                'indexes': ['fleet_vehicles_created_at_idx', 'fleet_vehicles_status_idx'],
                'partitions': ['fleet_vehicles_y{year}_m{month}']
            },
            'shipment_trends': {
                'materialized_view': 'analytics_shipment_trends_mv',
                'base_query': '''
                    SELECT 
                        date_trunc('{granularity}', s.created_at) as time_bucket,
                        COUNT(*) as total_shipments,
                        COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) as completed_shipments,
                        SUM(s.chargeable_weight_kg) as total_weight,
                        AVG(s.rate_per_kg) as avg_rate
                    FROM shipments_shipment s
                    WHERE s.created_at >= %s
                    {company_filter}
                    GROUP BY time_bucket
                    ORDER BY time_bucket DESC
                ''',
                'indexes': ['shipments_shipment_created_at_idx', 'shipments_shipment_status_idx'],
                'partitions': ['shipments_shipment_y{year}_m{month}']
            },
            'compliance_metrics': {
                'materialized_view': 'analytics_compliance_metrics_mv',
                'base_query': '''
                    SELECT 
                        date_trunc('{granularity}', c.check_date) as time_bucket,
                        c.compliance_type,
                        COUNT(*) as total_checks,
                        COUNT(CASE WHEN c.status = 'COMPLIANT' THEN 1 END) as compliant_count,
                        COUNT(CASE WHEN c.status = 'NON_COMPLIANT' THEN 1 END) as non_compliant_count
                    FROM compliance_checks c
                    WHERE c.check_date >= %s
                    {company_filter}
                    GROUP BY time_bucket, c.compliance_type
                    ORDER BY time_bucket DESC
                ''',
                'indexes': ['compliance_checks_check_date_idx', 'compliance_checks_status_idx'],
                'partitions': ['compliance_checks_y{year}_m{month}']
            }
        }
    
    def optimize_query(
        self,
        analytics_type: str,
        base_query: str,
        filters: Dict[str, Any],
        context: QueryContext
    ) -> QueryOptimization:
        """
        Main optimization method that applies various optimization strategies.
        """
        self.optimization_stats['queries_optimized'] += 1
        
        optimizations_applied = []
        optimized_query = base_query
        use_materialized_view = False
        use_index_hints = False
        partition_pruning = False
        
        # 1. Check if we should use materialized view
        if self.should_use_materialized_view(analytics_type, context):
            materialized_result = self.rewrite_for_materialized_view(analytics_type, filters, context)
            if materialized_result:
                optimized_query = materialized_result
                use_materialized_view = True
                optimizations_applied.append('materialized_view')
                self.optimization_stats['materialized_view_usage'] += 1
        
        # 2. Apply time-based partitioning optimization
        if not use_materialized_view:
            partition_result = self.apply_partition_pruning(optimized_query, context.time_range)
            if partition_result:
                optimized_query = partition_result
                partition_pruning = True
                optimizations_applied.append('partition_pruning')
                self.optimization_stats['partition_pruning_applied'] += 1
        
        # 3. Add index hints for better performance
        if not use_materialized_view:
            index_result = self.add_index_hints(optimized_query, analytics_type)
            if index_result:
                optimized_query = index_result
                use_index_hints = True
                optimizations_applied.append('index_hints')
                self.optimization_stats['index_hints_applied'] += 1
        
        # 4. Apply role-based filtering optimizations
        role_optimized = self.apply_role_based_optimization(optimized_query, context)
        if role_optimized != optimized_query:
            optimized_query = role_optimized
            optimizations_applied.append('role_filtering')
        
        # 5. Apply query rewriting optimizations
        rewritten_query = self.apply_query_rewriting(optimized_query, analytics_type, context)
        if rewritten_query != optimized_query:
            optimized_query = rewritten_query
            optimizations_applied.append('query_rewrite')
            self.optimization_stats['query_rewrites'] += 1
        
        # Estimate query cost
        estimated_cost = self.estimate_query_cost(optimized_query, context)
        
        return QueryOptimization(
            optimized_query=optimized_query,
            optimization_applied=optimizations_applied,
            estimated_cost=estimated_cost,
            use_materialized_view=use_materialized_view,
            use_index_hints=use_index_hints,
            partition_pruning=partition_pruning
        )
    
    def should_use_materialized_view(self, analytics_type: str, context: QueryContext) -> bool:
        """
        Determine if materialized view should be used based on query characteristics.
        """
        # Don't use materialized view for real-time requirements
        if context.real_time_required:
            return False
        
        # Use materialized view for large data volumes
        if context.data_volume_estimate > 1000000:  # 1M+ records
            return True
        
        # Use for complex analytics types
        complex_analytics = [
            'financial_performance', 'compliance_metrics', 'operational_efficiency',
            'risk_analytics', 'predictive_maintenance'
        ]
        if analytics_type in complex_analytics:
            return True
        
        # Use for longer time ranges
        long_range_queries = ['90d', '1y', '2y', '3y']
        if context.time_range in long_range_queries:
            return True
        
        return False
    
    def rewrite_for_materialized_view(
        self,
        analytics_type: str,
        filters: Dict[str, Any],
        context: QueryContext
    ) -> Optional[str]:
        """
        Rewrite query to use appropriate materialized view.
        """
        template = self.optimized_templates.get(analytics_type)
        if not template or not template.get('materialized_view'):
            return None
        
        view_name = template['materialized_view']
        
        # Build optimized query for materialized view
        base_query = f"""
            SELECT 
                time_bucket,
                {self.get_materialized_view_columns(analytics_type)}
            FROM {view_name}
            WHERE time_bucket >= %s
        """
        
        # Add company filtering if needed
        if context.company_id:
            base_query += " AND company_id = %s"
        
        # Add any additional filters
        filter_conditions = self.build_filter_conditions(filters)
        if filter_conditions:
            base_query += f" AND {filter_conditions}"
        
        base_query += " ORDER BY time_bucket DESC"
        
        return base_query
    
    def apply_partition_pruning(self, query: str, time_range: str) -> Optional[str]:
        """
        Apply partition pruning optimization for time-based partitions.
        """
        if 'WHERE' not in query.upper():
            return None
        
        # Calculate partition names based on time range
        partitions = self.get_relevant_partitions(time_range)
        if not partitions:
            return None
        
        # Add partition pruning hint
        partition_hint = f"/*+ USE_PARTITIONS({', '.join(partitions)}) */"
        
        # Insert hint after SELECT
        if query.strip().upper().startswith('SELECT'):
            select_pos = query.upper().find('SELECT') + 6
            optimized_query = query[:select_pos] + f" {partition_hint}" + query[select_pos:]
            return optimized_query
        
        return None
    
    def add_index_hints(self, query: str, analytics_type: str) -> Optional[str]:
        """
        Add index hints to improve query performance.
        """
        template = self.optimized_templates.get(analytics_type)
        if not template or not template.get('indexes'):
            return None
        
        indexes = template['indexes']
        index_hints = []
        
        for index in indexes:
            if 'created_at' in index:
                index_hints.append(f"USE INDEX ({index})")
            elif 'status' in index:
                index_hints.append(f"USE INDEX ({index})")
        
        if not index_hints:
            return None
        
        # Find table references and add hints
        # This is a simplified implementation - in production, you'd use a SQL parser
        for table_hint in index_hints:
            query = query.replace('FROM ', f'FROM /*+ {table_hint} */ ')
        
        return query
    
    def apply_role_based_optimization(self, query: str, context: QueryContext) -> str:
        """
        Apply role-specific query optimizations.
        """
        optimized_query = query
        
        # Add company filtering for scoped roles
        if context.user_role in ['MANAGER', 'DISPATCHER', 'DRIVER'] and context.company_id:
            if 'WHERE' in optimized_query.upper():
                optimized_query = optimized_query.replace(
                    'WHERE',
                    f'WHERE company_id = {context.company_id} AND'
                )
            else:
                optimized_query += f' WHERE company_id = {context.company_id}'
        
        # Add data scope limitations for drivers
        if context.user_role == 'DRIVER':
            if 'assigned_driver_id' in optimized_query:
                optimized_query += ' AND assigned_driver_id = %(user_id)s'
        
        return optimized_query
    
    def apply_query_rewriting(
        self,
        query: str,
        analytics_type: str,
        context: QueryContext
    ) -> str:
        """
        Apply intelligent query rewriting for performance optimization.
        """
        optimized_query = query
        
        # 1. Convert correlated subqueries to JOINs
        optimized_query = self.convert_subqueries_to_joins(optimized_query)
        
        # 2. Optimize GROUP BY clauses
        optimized_query = self.optimize_group_by(optimized_query, context)
        
        # 3. Add LIMIT clauses for large result sets
        if context.data_volume_estimate > 100000:
            if 'LIMIT' not in optimized_query.upper():
                optimized_query += ' LIMIT 10000'
        
        # 4. Optimize date range queries
        optimized_query = self.optimize_date_ranges(optimized_query, context.time_range)
        
        return optimized_query
    
    def convert_subqueries_to_joins(self, query: str) -> str:
        """
        Convert correlated subqueries to more efficient JOINs.
        """
        # This is a simplified implementation
        # In production, you'd use a proper SQL parser and AST manipulation
        
        # Example: Convert EXISTS subqueries to JOINs
        if 'EXISTS (' in query.upper():
            # This would need sophisticated SQL parsing in real implementation
            pass
        
        return query
    
    def optimize_group_by(self, query: str, context: QueryContext) -> str:
        """
        Optimize GROUP BY clauses based on query context.
        """
        if 'GROUP BY' not in query.upper():
            return query
        
        # For large datasets, consider adding HAVING clauses to filter early
        if context.data_volume_estimate > 1000000:
            if 'HAVING' not in query.upper():
                # Add HAVING clause to filter aggregated results
                query += ' HAVING COUNT(*) > 0'
        
        return query
    
    def optimize_date_ranges(self, query: str, time_range: str) -> str:
        """
        Optimize date range queries for better index usage.
        """
        # Convert relative date ranges to absolute ranges for better caching
        if time_range in ['1d', '7d', '30d', '90d']:
            # This would involve replacing date functions with absolute dates
            pass
        
        return query
    
    def get_materialized_view_columns(self, analytics_type: str) -> str:
        """
        Get appropriate columns for materialized view queries.
        """
        column_mapping = {
            'fleet_utilization': 'total_vehicles, active_vehicles, avg_utilization',
            'shipment_trends': 'total_shipments, completed_shipments, total_weight, avg_rate',
            'compliance_metrics': 'compliance_type, total_checks, compliant_count, non_compliant_count'
        }
        
        return column_mapping.get(analytics_type, '*')
    
    def get_relevant_partitions(self, time_range: str) -> List[str]:
        """
        Calculate relevant partition names based on time range.
        """
        now = timezone.now()
        partitions = []
        
        if time_range == '1d':
            # Current month partition
            partitions.append(f"_y{now.year}_m{now.month:02d}")
        elif time_range == '7d':
            # Current and previous month
            partitions.append(f"_y{now.year}_m{now.month:02d}")
            prev_month = now.replace(day=1) - timedelta(days=1)
            partitions.append(f"_y{prev_month.year}_m{prev_month.month:02d}")
        elif time_range in ['30d', '90d']:
            # Last 3-4 months
            for i in range(4):
                date = now.replace(day=1) - timedelta(days=30*i)
                partitions.append(f"_y{date.year}_m{date.month:02d}")
        
        return partitions
    
    def build_filter_conditions(self, filters: Dict[str, Any]) -> str:
        """
        Build WHERE clause conditions from filter dictionary.
        """
        conditions = []
        
        for key, value in filters.items():
            if key == 'status' and isinstance(value, list):
                status_list = "', '".join(value)
                conditions.append(f"status IN ('{status_list}')")
            elif key == 'vehicle_type':
                conditions.append(f"vehicle_type = '{value}'")
            elif key == 'compliance_type':
                conditions.append(f"compliance_type = '{value}'")
        
        return ' AND '.join(conditions)
    
    def estimate_query_cost(self, query: str, context: QueryContext) -> int:
        """
        Estimate query execution cost (1-10 scale).
        """
        cost = 1
        
        # Base cost on data volume
        if context.data_volume_estimate > 10000000:  # 10M+
            cost += 4
        elif context.data_volume_estimate > 1000000:  # 1M+
            cost += 3
        elif context.data_volume_estimate > 100000:  # 100k+
            cost += 2
        elif context.data_volume_estimate > 10000:  # 10k+
            cost += 1
        
        # Add cost for complex operations
        if 'JOIN' in query.upper():
            cost += 1
        if 'GROUP BY' in query.upper():
            cost += 1
        if 'ORDER BY' in query.upper():
            cost += 1
        if 'HAVING' in query.upper():
            cost += 1
        
        # Reduce cost for optimizations
        if '/*+ USE_PARTITIONS' in query:
            cost -= 1
        if 'USE INDEX' in query:
            cost -= 1
        
        return min(max(cost, 1), 10)  # Clamp between 1-10
    
    def get_optimization_stats(self) -> Dict[str, Any]:
        """
        Get query optimization statistics.
        """
        stats = self.optimization_stats.copy()
        
        if stats['queries_optimized'] > 0:
            stats['materialized_view_rate'] = (stats['materialized_view_usage'] / stats['queries_optimized']) * 100
            stats['partition_pruning_rate'] = (stats['partition_pruning_applied'] / stats['queries_optimized']) * 100
            stats['index_hints_rate'] = (stats['index_hints_applied'] / stats['queries_optimized']) * 100
            stats['query_rewrite_rate'] = (stats['query_rewrites'] / stats['queries_optimized']) * 100
        
        return stats
    
    def reset_stats(self):
        """Reset optimization statistics."""
        self.optimization_stats = {key: 0 for key in self.optimization_stats.keys()}


# Global query optimizer instance
query_optimizer = QueryOptimizer()