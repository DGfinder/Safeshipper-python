"""
Unified Analytics Engine - Central analytics processing service.
Handles all analytics requests with caching, optimization, and role-based access.
"""

import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from django.core.exceptions import ValidationError, PermissionDenied

from .models import AnalyticsDefinition, AnalyticsExecution, AnalyticsCache
from .permissions import analytics_permission_manager, AnalyticsPermission
from .caching import analytics_cache_manager, CacheKey, CacheResult
from .query_optimizer import query_optimizer, QueryContext, QueryOptimization

User = get_user_model()
logger = logging.getLogger(__name__)


@dataclass
class AnalyticsRequest:
    """Structured analytics request"""
    analytics_type: str
    user: User
    filters: Dict[str, Any]
    time_range: str
    granularity: str
    real_time: bool = False
    cache_enabled: bool = True
    export_format: Optional[str] = None


@dataclass
class AnalyticsResult:
    """Structured analytics result"""
    data: Any
    metadata: Dict[str, Any]
    cache_info: Dict[str, Any]
    execution_info: Dict[str, Any]
    permissions: Dict[str, Any]


class UnifiedAnalyticsEngine:
    """
    Centralized analytics engine that serves as the single source of truth
    for all analytics across the SafeShipper platform.
    
    Features:
    - Role-based access control
    - Multi-level caching
    - Query optimization
    - Real-time updates
    - Export capabilities
    - Performance monitoring
    """
    
    def __init__(self):
        self.permission_manager = analytics_permission_manager
        self.cache_manager = analytics_cache_manager
        self.query_optimizer = query_optimizer
        
        # Performance tracking
        self.execution_stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'average_response_time': 0.0,
            'requests_by_type': {},
            'requests_by_role': {}
        }
    
    async def get_analytics(
        self,
        analytics_type: str,
        user: User,
        filters: Optional[Dict[str, Any]] = None,
        time_range: str = '30d',
        granularity: str = 'auto',
        real_time: bool = False,
        cache_enabled: bool = True,
        export_format: Optional[str] = None
    ) -> AnalyticsResult:
        """
        Main analytics endpoint that handles all analytics requests.
        
        Args:
            analytics_type: Type of analytics to retrieve
            user: Requesting user for permission checks
            filters: Additional filters to apply
            time_range: Time range for the data (1d, 7d, 30d, 90d, 1y, etc.)
            granularity: Data granularity (auto, hour, day, week, month)
            real_time: Whether real-time data is required
            cache_enabled: Whether to use caching
            export_format: Export format if this is an export request
            
        Returns:
            AnalyticsResult with data and metadata
        """
        start_time = timezone.now()
        execution_id = None
        
        try:
            # Track request
            self.execution_stats['total_requests'] += 1
            self.execution_stats['requests_by_type'][analytics_type] = \
                self.execution_stats['requests_by_type'].get(analytics_type, 0) + 1
            
            user_role = getattr(user, 'role', 'DRIVER')
            self.execution_stats['requests_by_role'][user_role] = \
                self.execution_stats['requests_by_role'].get(user_role, 0) + 1
            
            # Validate request
            request = AnalyticsRequest(
                analytics_type=analytics_type,
                user=user,
                filters=filters or {},
                time_range=time_range,
                granularity=granularity,
                real_time=real_time,
                cache_enabled=cache_enabled,
                export_format=export_format
            )
            
            await self._validate_request(request)
            
            # Get analytics definition
            analytics_def = await self._get_analytics_definition(analytics_type)
            if not analytics_def:
                raise ValidationError(f"Analytics type '{analytics_type}' not found")
            
            # Check permissions
            await self._check_permissions(request, analytics_def)
            
            # Create execution record
            execution_id = await self._create_execution_record(request, analytics_def)
            
            # Try to get from cache first
            cache_result = None
            if cache_enabled and not real_time:
                cache_result = await self._get_from_cache(request, analytics_def)
                if cache_result:
                    self.execution_stats['cache_hits'] += 1
            
            # Execute query if no cache hit
            if not cache_result:
                cache_result = await self._execute_analytics_query(request, analytics_def)
                
                # Cache the result
                if cache_enabled:
                    await self._cache_result(request, analytics_def, cache_result)
            
            # Process result for user role
            processed_result = await self._process_result_for_user(
                cache_result, request, analytics_def
            )
            
            # Update execution record
            execution_time = (timezone.now() - start_time).total_seconds() * 1000
            await self._update_execution_record(execution_id, 'COMPLETED', execution_time, processed_result)
            
            # Update stats
            self.execution_stats['successful_requests'] += 1
            self._update_average_response_time(execution_time)
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Analytics execution failed: {str(e)}", exc_info=True)
            
            # Update execution record with error
            if execution_id:
                await self._update_execution_record(execution_id, 'FAILED', 0, None, str(e))
            
            self.execution_stats['failed_requests'] += 1
            raise
    
    async def _validate_request(self, request: AnalyticsRequest):
        """Validate analytics request parameters"""
        # Validate user authentication
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied("User must be authenticated")
        
        # Validate time range
        valid_ranges = ['1h', '6h', '12h', '1d', '3d', '7d', '30d', '90d', '1y', '2y', '3y']
        if request.time_range not in valid_ranges:
            raise ValidationError(f"Invalid time range: {request.time_range}")
        
        # Validate granularity
        valid_granularity = ['auto', 'minute', 'hour', 'day', 'week', 'month', 'year']
        if request.granularity not in valid_granularity:
            raise ValidationError(f"Invalid granularity: {request.granularity}")
        
        # Validate export format if specified
        if request.export_format:
            valid_formats = ['pdf', 'csv', 'excel', 'json']
            if request.export_format not in valid_formats:
                raise ValidationError(f"Invalid export format: {request.export_format}")
    
    async def _get_analytics_definition(self, analytics_type: str) -> Optional[AnalyticsDefinition]:
        """Get analytics definition from database"""
        try:
            return await AnalyticsDefinition.objects.aget(
                analytics_type=analytics_type,
                is_active=True
            )
        except AnalyticsDefinition.DoesNotExist:
            return None
    
    async def _check_permissions(self, request: AnalyticsRequest, analytics_def: AnalyticsDefinition):
        """Check if user has permission to access analytics"""
        # Check basic access permission
        if not self.permission_manager.can_access_analytics(request.user, request.analytics_type):
            raise PermissionDenied(f"User does not have access to {request.analytics_type}")
        
        # Check definition-specific permissions
        if not analytics_def.can_user_access(request.user):
            raise PermissionDenied("User does not meet analytics definition requirements")
        
        # Check time range permissions
        user_permissions = self.permission_manager.get_user_permissions(request.user)
        allowed_range = self.permission_manager.get_time_range_limit(request.user, request.time_range)
        if allowed_range != request.time_range:
            raise PermissionDenied(f"Time range {request.time_range} exceeds user limit")
        
        # Check export permissions
        if request.export_format:
            if not analytics_def.can_user_export(request.user, request.export_format):
                raise PermissionDenied(f"User cannot export in {request.export_format} format")
        
        # Check real-time permissions
        if request.real_time and not self.permission_manager.can_access_real_time(request.user):
            raise PermissionDenied("User does not have real-time access")
    
    async def _create_execution_record(
        self, 
        request: AnalyticsRequest, 
        analytics_def: AnalyticsDefinition
    ) -> str:
        """Create execution record for tracking"""
        execution = AnalyticsExecution.objects.create(
            analytics_definition=analytics_def,
            user=request.user,
            company_id=getattr(request.user, 'company_id', None),
            filters=request.filters,
            time_range=request.time_range,
            granularity=request.granularity,
            status='RUNNING'
        )
        return str(execution.id)
    
    async def _get_from_cache(
        self, 
        request: AnalyticsRequest, 
        analytics_def: AnalyticsDefinition
    ) -> Optional[CacheResult]:
        """Try to get result from cache"""
        cache_key = self.cache_manager.generate_cache_key(
            analytics_type=request.analytics_type,
            user_id=request.user.id if analytics_def.data_scope == 'user' else None,
            company_id=getattr(request.user, 'company_id', None),
            filters=request.filters,
            time_range=request.time_range,
            granularity=request.granularity
        )
        
        return await self.cache_manager.get_cached_analytics(cache_key, analytics_def)
    
    async def _execute_analytics_query(
        self, 
        request: AnalyticsRequest, 
        analytics_def: AnalyticsDefinition
    ) -> CacheResult:
        """Execute the analytics query"""
        # Estimate data volume for optimization
        data_volume = await self._estimate_data_volume(request, analytics_def)
        
        # Create query context
        query_context = QueryContext(
            user_role=getattr(request.user, 'role', 'DRIVER'),
            company_id=getattr(request.user, 'company_id', None),
            time_range=request.time_range,
            data_volume_estimate=data_volume,
            real_time_required=request.real_time,
            cache_available=request.cache_enabled
        )
        
        # Optimize query
        optimization = self.query_optimizer.optimize_query(
            analytics_type=request.analytics_type,
            base_query=analytics_def.query_template,
            filters=request.filters,
            context=query_context
        )
        
        # Execute optimized query
        start_time = timezone.now()
        
        try:
            # Get filtered query parameters
            query_params = self.permission_manager.get_filtered_query_params(
                request.user, 
                self._build_query_params(request)
            )
            
            # Execute query
            with connection.cursor() as cursor:
                cursor.execute(optimization.optimized_query, query_params)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                
                # Convert to list of dictionaries
                result_data = [dict(zip(columns, row)) for row in rows]
            
            query_time = (timezone.now() - start_time).total_seconds() * 1000
            
            return CacheResult(
                data=result_data,
                cache_level='database',
                hit_time=timezone.now(),
                computation_time_ms=int(query_time)
            )
            
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise
    
    async def _cache_result(
        self, 
        request: AnalyticsRequest, 
        analytics_def: AnalyticsDefinition, 
        result: CacheResult
    ):
        """Cache the analytics result"""
        cache_key = self.cache_manager.generate_cache_key(
            analytics_type=request.analytics_type,
            user_id=request.user.id if analytics_def.data_scope == 'user' else None,
            company_id=getattr(request.user, 'company_id', None),
            filters=request.filters,
            time_range=request.time_range,
            granularity=request.granularity
        )
        
        await self.cache_manager.cache_result(
            cache_key=cache_key,
            data=result.data,
            custom_ttl=analytics_def.cache_duration
        )
    
    async def _process_result_for_user(
        self, 
        cache_result: CacheResult, 
        request: AnalyticsRequest, 
        analytics_def: AnalyticsDefinition
    ) -> AnalyticsResult:
        """Process result based on user permissions and role"""
        
        # Apply data filtering based on user scope
        filtered_data = await self._apply_user_data_filtering(
            cache_result.data, 
            request.user, 
            analytics_def
        )
        
        # Get user permissions for metadata
        user_permissions = self.permission_manager.get_user_permissions(request.user)
        
        # Build metadata
        metadata = {
            'analytics_type': request.analytics_type,
            'time_range': request.time_range,
            'granularity': request.granularity,
            'record_count': len(filtered_data) if filtered_data else 0,
            'generated_at': timezone.now().isoformat(),
            'data_scope': analytics_def.data_scope,
            'real_time': request.real_time
        }
        
        # Build cache info
        cache_info = {
            'cache_hit': cache_result.cache_level != 'database',
            'cache_level': cache_result.cache_level,
            'computation_time_ms': cache_result.computation_time_ms
        }
        
        # Build execution info
        execution_info = {
            'query_optimized': True,
            'materialized_view_used': 'materialized' in cache_result.cache_level
        }
        
        # Build permissions info
        permissions_info = {
            'can_export': user_permissions.export_permissions,
            'can_real_time': user_permissions.real_time_access,
            'data_scope': user_permissions.data_scope,
            'max_time_range': user_permissions.max_time_range
        }
        
        return AnalyticsResult(
            data=filtered_data,
            metadata=metadata,
            cache_info=cache_info,
            execution_info=execution_info,
            permissions=permissions_info
        )
    
    async def _apply_user_data_filtering(
        self, 
        data: List[Dict[str, Any]], 
        user: User, 
        analytics_def: AnalyticsDefinition
    ) -> List[Dict[str, Any]]:
        """Apply user-specific data filtering"""
        if not data:
            return data
        
        user_permissions = self.permission_manager.get_user_permissions(user)
        
        # No filtering needed for global scope
        if user_permissions.data_scope == 'global':
            return data
        
        # Apply scope-specific filtering
        filtered_data = []
        for record in data:
            include_record = True
            
            if user_permissions.data_scope == 'company':
                company_id = getattr(user, 'company_id', None)
                if company_id and record.get('company_id') != company_id:
                    include_record = False
            
            elif user_permissions.data_scope == 'user':
                if record.get('user_id') != user.id and record.get('assigned_driver_id') != user.id:
                    include_record = False
            
            elif user_permissions.data_scope == 'depot':
                depot_id = getattr(user, 'depot_id', None)
                if depot_id and record.get('depot_id') != depot_id:
                    include_record = False
            
            if include_record:
                filtered_data.append(record)
        
        return filtered_data
    
    async def _estimate_data_volume(
        self, 
        request: AnalyticsRequest, 
        analytics_def: AnalyticsDefinition
    ) -> int:
        """Estimate data volume for query optimization"""
        # This would involve analyzing table statistics
        # For now, return a simple estimate based on time range
        time_multipliers = {
            '1h': 100,
            '6h': 600,
            '12h': 1200,
            '1d': 2400,
            '3d': 7200,
            '7d': 16800,
            '30d': 72000,
            '90d': 216000,
            '1y': 876000
        }
        
        base_estimate = time_multipliers.get(request.time_range, 72000)
        
        # Adjust based on analytics type complexity
        if request.analytics_type in ['compliance_metrics', 'financial_performance']:
            base_estimate *= 2
        
        return base_estimate
    
    def _build_query_params(self, request: AnalyticsRequest) -> Dict[str, Any]:
        """Build query parameters from request"""
        params = {
            'time_start': self._parse_time_range(request.time_range),
            'granularity': request.granularity
        }
        
        # Add filter parameters
        params.update(request.filters)
        
        return params
    
    def _parse_time_range(self, time_range: str) -> datetime:
        """Parse time range string to datetime"""
        now = timezone.now()
        
        if time_range == '1h':
            return now - timedelta(hours=1)
        elif time_range == '6h':
            return now - timedelta(hours=6)
        elif time_range == '12h':
            return now - timedelta(hours=12)
        elif time_range == '1d':
            return now - timedelta(days=1)
        elif time_range == '3d':
            return now - timedelta(days=3)
        elif time_range == '7d':
            return now - timedelta(days=7)
        elif time_range == '30d':
            return now - timedelta(days=30)
        elif time_range == '90d':
            return now - timedelta(days=90)
        elif time_range == '1y':
            return now - timedelta(days=365)
        else:
            return now - timedelta(days=30)  # Default
    
    async def _update_execution_record(
        self, 
        execution_id: str, 
        status: str, 
        execution_time: int, 
        result: Optional[AnalyticsResult], 
        error_message: str = ""
    ):
        """Update execution record with results"""
        try:
            execution = await AnalyticsExecution.objects.aget(id=execution_id)
            
            if status == 'COMPLETED':
                execution.mark_completed(
                    execution_time_ms=execution_time,
                    result_size_bytes=len(json.dumps(asdict(result), default=str)) if result else 0,
                    rows_returned=len(result.data) if result and result.data else 0
                )
            else:
                execution.mark_failed(error_message)
                
        except Exception as e:
            logger.warning(f"Failed to update execution record: {e}")
    
    def _update_average_response_time(self, execution_time: float):
        """Update rolling average response time"""
        current_avg = self.execution_stats['average_response_time']
        total_requests = self.execution_stats['successful_requests']
        
        if total_requests == 1:
            self.execution_stats['average_response_time'] = execution_time
        else:
            # Rolling average calculation
            self.execution_stats['average_response_time'] = (
                (current_avg * (total_requests - 1)) + execution_time
            ) / total_requests
    
    def get_engine_stats(self) -> Dict[str, Any]:
        """Get engine performance statistics"""
        stats = self.execution_stats.copy()
        
        # Add cache statistics
        cache_stats = self.cache_manager.get_cache_stats()
        stats['cache_stats'] = cache_stats
        
        # Add optimization statistics
        optimization_stats = self.query_optimizer.get_optimization_stats()
        stats['optimization_stats'] = optimization_stats
        
        # Calculate success rate
        if stats['total_requests'] > 0:
            stats['success_rate'] = (stats['successful_requests'] / stats['total_requests']) * 100
            stats['cache_hit_rate'] = (stats['cache_hits'] / stats['total_requests']) * 100
        else:
            stats['success_rate'] = 0
            stats['cache_hit_rate'] = 0
        
        return stats
    
    async def invalidate_analytics_cache(
        self, 
        analytics_type: Optional[str] = None,
        company_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> int:
        """Invalidate analytics cache based on criteria"""
        return await self.cache_manager.invalidate_cache(
            analytics_type=analytics_type,
            company_id=company_id,
            user_id=user_id
        )


# Global analytics engine instance
unified_analytics_engine = UnifiedAnalyticsEngine()