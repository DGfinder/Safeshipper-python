from django.urls import path
from .api_views import (
    ComplianceDashboardView,
    CapacityOptimizationDashboardView,
    MarketplaceDashboardView,
    RouteOptimizationDashboardView,
    ComprehensiveDashboardView
)

app_name = 'dashboards'

urlpatterns = [
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