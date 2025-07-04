from django.urls import path
from .api_views import (
    ComplianceDashboardView,
    CapacityOptimizationDashboardView,
    MarketplaceDashboardView,
    RouteOptimizationDashboardView,
    ComprehensiveDashboardView
)
from .stats_views import DashboardStatsView, RecentShipmentsView

app_name = 'dashboards'

urlpatterns = [
    # Main dashboard endpoints for frontend
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('recent-shipments/', RecentShipmentsView.as_view(), name='recent-shipments'),
    
    # Existing specialized dashboard endpoints
    path(
        'compliance-summary/',
        ComplianceDashboardView.as_view(),
        name='compliance-summary'
    ),
    path(
        'capacity-optimization/',
        CapacityOptimizationDashboardView.as_view(),
        name='capacity-optimization'
    ),
    path(
        'marketplace/',
        MarketplaceDashboardView.as_view(),
        name='marketplace'
    ),
    path(
        'route-optimization/',
        RouteOptimizationDashboardView.as_view(),
        name='route-optimization'
    ),
    path(
        'comprehensive/',
        ComprehensiveDashboardView.as_view(),
        name='comprehensive-dashboard'
    ),
] 