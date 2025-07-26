"""
Role-based permission system for analytics access control.
Manages data scope filtering and export permissions.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


@dataclass
class AnalyticsPermission:
    """Data class for analytics permission configuration"""
    can_access: List[str]
    data_scope: str
    real_time_access: bool
    export_permissions: List[str]
    max_time_range: str = '1y'
    rate_limit_per_hour: int = 100
    can_create_alerts: bool = False
    can_share_dashboards: bool = False


class AnalyticsPermissionManager:
    """
    Manages role-based access to analytics data and visualizations.
    Provides fine-grained control over what data users can access.
    """
    
    # Role-based analytics permission mapping
    ROLE_PERMISSIONS: Dict[str, AnalyticsPermission] = {
        'ADMIN': AnalyticsPermission(
            can_access=['all'],
            data_scope='global',
            real_time_access=True,
            export_permissions=['pdf', 'csv', 'excel', 'json', 'api'],
            max_time_range='unlimited',
            rate_limit_per_hour=1000,
            can_create_alerts=True,
            can_share_dashboards=True
        ),
        'MANAGER': AnalyticsPermission(
            can_access=[
                'fleet_utilization', 'fleet_performance', 'vehicle_efficiency',
                'shipment_trends', 'delivery_performance', 'route_optimization',
                'compliance_metrics', 'dg_compliance', 'safety_metrics',
                'financial_performance', 'cost_analysis', 'revenue_analysis',
                'operational_efficiency', 'customer_insights', 'risk_analytics'
            ],
            data_scope='company',
            real_time_access=True,
            export_permissions=['pdf', 'csv', 'excel'],
            max_time_range='2y',
            rate_limit_per_hour=500,
            can_create_alerts=True,
            can_share_dashboards=True
        ),
        'FLEET_MANAGER': AnalyticsPermission(
            can_access=[
                'fleet_utilization', 'fleet_performance', 'vehicle_efficiency',
                'driver_performance', 'delivery_performance', 'route_optimization',
                'compliance_metrics', 'dg_compliance', 'safety_metrics',
                'operational_efficiency', 'predictive_maintenance'
            ],
            data_scope='company',
            real_time_access=True,
            export_permissions=['pdf', 'csv'],
            max_time_range='1y',
            rate_limit_per_hour=300,
            can_create_alerts=True,
            can_share_dashboards=False
        ),
        'DISPATCHER': AnalyticsPermission(
            can_access=[
                'fleet_utilization', 'vehicle_efficiency', 'driver_performance',
                'delivery_performance', 'route_optimization', 'safety_metrics',
                'operational_efficiency'
            ],
            data_scope='depot',
            real_time_access=True,
            export_permissions=['csv'],
            max_time_range='90d',
            rate_limit_per_hour=200,
            can_create_alerts=False,
            can_share_dashboards=False
        ),
        'DRIVER': AnalyticsPermission(
            can_access=[
                'driver_performance', 'vehicle_efficiency', 'safety_metrics',
                'delivery_performance'
            ],
            data_scope='user',
            real_time_access=False,
            export_permissions=[],
            max_time_range='30d',
            rate_limit_per_hour=50,
            can_create_alerts=False,
            can_share_dashboards=False
        ),
        'CUSTOMER': AnalyticsPermission(
            can_access=[
                'shipment_trends', 'delivery_performance', 'customer_insights'
            ],
            data_scope='customer',
            real_time_access=False,
            export_permissions=['pdf'],
            max_time_range='1y',
            rate_limit_per_hour=100,
            can_create_alerts=False,
            can_share_dashboards=False
        ),
        'COMPLIANCE_OFFICER': AnalyticsPermission(
            can_access=[
                'compliance_metrics', 'dg_compliance', 'safety_metrics',
                'audit_metrics', 'risk_analytics', 'environmental_impact'
            ],
            data_scope='company',
            real_time_access=True,
            export_permissions=['pdf', 'csv', 'excel'],
            max_time_range='5y',
            rate_limit_per_hour=200,
            can_create_alerts=True,
            can_share_dashboards=True
        ),
        'FINANCE_MANAGER': AnalyticsPermission(
            can_access=[
                'financial_performance', 'cost_analysis', 'revenue_analysis',
                'profitability', 'shipment_trends', 'customer_insights'
            ],
            data_scope='company',
            real_time_access=False,
            export_permissions=['pdf', 'csv', 'excel'],
            max_time_range='3y',
            rate_limit_per_hour=150,
            can_create_alerts=True,
            can_share_dashboards=True
        ),
        'OPERATIONS_MANAGER': AnalyticsPermission(
            can_access=[
                'operational_efficiency', 'fleet_performance', 'route_optimization',
                'capacity_utilization', 'delivery_performance', 'customer_insights',
                'predictive_maintenance', 'demand_forecasting'
            ],
            data_scope='company',
            real_time_access=True,
            export_permissions=['pdf', 'csv'],
            max_time_range='1y',
            rate_limit_per_hour=300,
            can_create_alerts=True,
            can_share_dashboards=False
        )
    }
    
    def __init__(self):
        self.permission_cache = {}
    
    def get_user_permissions(self, user: User) -> AnalyticsPermission:
        """Get analytics permissions for a user based on their role"""
        if not user or not user.is_authenticated:
            return AnalyticsPermission(
                can_access=[],
                data_scope='none',
                real_time_access=False,
                export_permissions=[]
            )
        
        # Cache user permissions to avoid repeated lookups
        cache_key = f"user_{user.id}_permissions"
        if cache_key in self.permission_cache:
            return self.permission_cache[cache_key]
        
        # Get user's primary role
        user_role = getattr(user, 'role', 'DRIVER')
        permissions = self.ROLE_PERMISSIONS.get(user_role, self.ROLE_PERMISSIONS['DRIVER'])
        
        # Cache the result
        self.permission_cache[cache_key] = permissions
        return permissions
    
    def can_access_analytics(self, user: User, analytics_type: str) -> bool:
        """Check if user can access specific analytics type"""
        permissions = self.get_user_permissions(user)
        return 'all' in permissions.can_access or analytics_type in permissions.can_access
    
    def can_export_format(self, user: User, format_type: str) -> bool:
        """Check if user can export in specific format"""
        permissions = self.get_user_permissions(user)
        return format_type in permissions.export_permissions
    
    def get_data_scope_filter(self, user: User, base_query=None) -> Q:
        """Get Django Q object for filtering data based on user's scope"""
        permissions = self.get_user_permissions(user)
        
        if permissions.data_scope == 'global':
            return Q()  # No filtering - access to all data
        
        elif permissions.data_scope == 'company':
            # Filter to user's company data
            company_id = getattr(user, 'company_id', None)
            if company_id:
                return Q(company_id=company_id) | Q(customer_id=company_id) | Q(carrier_id=company_id)
            return Q(pk__isnull=True)  # No access if no company
        
        elif permissions.data_scope == 'depot':
            # Filter to user's depot data
            depot_id = getattr(user, 'depot_id', None)
            if depot_id:
                return Q(depot_id=depot_id) | Q(origin_depot_id=depot_id) | Q(destination_depot_id=depot_id)
            return Q(pk__isnull=True)  # No access if no depot
        
        elif permissions.data_scope == 'user':
            # Filter to user's own data
            return Q(assigned_driver_id=user.id) | Q(created_by_id=user.id)
        
        elif permissions.data_scope == 'customer':
            # Filter to customer's own shipments
            customer_id = getattr(user, 'customer_id', None)
            if customer_id:
                return Q(customer_id=customer_id)
            return Q(pk__isnull=True)  # No access if not a customer
        
        else:
            return Q(pk__isnull=True)  # No access for unknown scope
    
    def get_time_range_limit(self, user: User, requested_range: str) -> str:
        """Get allowed time range for user, respecting maximum limits"""
        permissions = self.get_user_permissions(user)
        
        if permissions.max_time_range == 'unlimited':
            return requested_range
        
        # Parse time ranges and enforce limits
        time_limits = {
            '1h': 1, '6h': 6, '12h': 12, '1d': 24, '3d': 72, '7d': 168,
            '30d': 720, '90d': 2160, '1y': 8760, '2y': 17520, '3y': 26280, '5y': 43800
        }
        
        max_hours = time_limits.get(permissions.max_time_range, 8760)  # Default to 1 year
        requested_hours = time_limits.get(requested_range, 8760)
        
        if requested_hours <= max_hours:
            return requested_range
        else:
            # Return the maximum allowed range
            return permissions.max_time_range
    
    def can_access_real_time(self, user: User) -> bool:
        """Check if user can access real-time analytics"""
        permissions = self.get_user_permissions(user)
        return permissions.real_time_access
    
    def get_rate_limit(self, user: User) -> int:
        """Get rate limit per hour for user"""
        permissions = self.get_user_permissions(user)
        return permissions.rate_limit_per_hour
    
    def can_create_alerts(self, user: User) -> bool:
        """Check if user can create analytics alerts"""
        permissions = self.get_user_permissions(user)
        return permissions.can_create_alerts
    
    def can_share_dashboards(self, user: User) -> bool:
        """Check if user can share dashboards"""
        permissions = self.get_user_permissions(user)
        return permissions.can_share_dashboards
    
    def filter_analytics_definitions(self, user: User, analytics_definitions):
        """Filter analytics definitions based on user permissions"""
        permissions = self.get_user_permissions(user)
        
        if 'all' in permissions.can_access:
            return analytics_definitions
        
        # Filter by accessible analytics types
        return analytics_definitions.filter(
            analytics_type__in=permissions.can_access,
            is_active=True
        )
    
    def get_filtered_query_params(self, user: User, base_params: Dict[str, Any]) -> Dict[str, Any]:
        """Add user-specific filtering parameters to query"""
        filtered_params = base_params.copy()
        permissions = self.get_user_permissions(user)
        
        # Add scope-specific parameters
        if permissions.data_scope == 'company':
            filtered_params['company_id'] = getattr(user, 'company_id', None)
        elif permissions.data_scope == 'depot':
            filtered_params['depot_id'] = getattr(user, 'depot_id', None)
        elif permissions.data_scope == 'user':
            filtered_params['user_id'] = user.id
        elif permissions.data_scope == 'customer':
            filtered_params['customer_id'] = getattr(user, 'customer_id', None)
        
        return filtered_params
    
    def clear_permission_cache(self, user_id: Optional[int] = None):
        """Clear permission cache for specific user or all users"""
        if user_id:
            cache_key = f"user_{user_id}_permissions"
            self.permission_cache.pop(cache_key, None)
        else:
            self.permission_cache.clear()


# Global instance
analytics_permission_manager = AnalyticsPermissionManager()