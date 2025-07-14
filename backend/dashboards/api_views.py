from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.translation import gettext_lazy as _
from .services import (
    get_compliance_dashboard_data,
    get_capacity_optimization_dashboard,
    get_marketplace_analytics,
    get_route_optimization_analytics,
    get_comprehensive_dashboard_data
)

class ComplianceDashboardView(APIView):
    """
    API endpoint for retrieving compliance dashboard data.
    
    This endpoint provides aggregated data about:
    - Shipment exceptions
    - Document validation errors
    - Recent compliance issues
    - Compliance trends
    
    The data is scoped based on the user's role and permissions.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get compliance dashboard data.
        
        Returns:
            JSON response containing:
            - summary: Counts of various compliance metrics
            - recent_issues: List of recent compliance issues
            - trends: Compliance trends over time
            - last_updated: Timestamp of when the data was last updated
        """
        try:
            data = get_compliance_dashboard_data(request.user)
            return Response(data)
        except Exception as e:
            return Response({
                'error': _('Failed to retrieve dashboard data: {error}').format(
                    error=str(e)
                )
            }, status=500)

class CapacityOptimizationDashboardView(APIView):
    """
    API endpoint for capacity optimization and load planning analytics.
    
    Provides insights into:
    - Load plan efficiency
    - Vehicle utilization rates
    - Space optimization metrics
    - Recent optimization results
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get capacity optimization dashboard data.
        """
        try:
            data = get_capacity_optimization_dashboard(request.user)
            return Response(data)
        except Exception as e:
            return Response({
                'error': _('Failed to retrieve capacity optimization data: {error}').format(
                    error=str(e)
                )
            }, status=500)

class MarketplaceDashboardView(APIView):
    """
    API endpoint for marketplace analytics.
    
    Provides insights into:
    - Active capacity listings
    - Booking conversion rates
    - Revenue metrics
    - Market utilization
    - Pricing trends
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get marketplace analytics data.
        """
        try:
            data = get_marketplace_analytics(request.user)
            return Response(data)
        except Exception as e:
            return Response({
                'error': _('Failed to retrieve marketplace data: {error}').format(
                    error=str(e)
                )
            }, status=500)

class RouteOptimizationDashboardView(APIView):
    """
    API endpoint for route optimization analytics.
    
    Provides insights into:
    - Route efficiency metrics
    - On-time performance
    - Distance optimization
    - Multi-stop route analysis
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get route optimization analytics data.
        """
        try:
            data = get_route_optimization_analytics(request.user)
            return Response(data)
        except Exception as e:
            return Response({
                'error': _('Failed to retrieve route optimization data: {error}').format(
                    error=str(e)
                )
            }, status=500)

class ComprehensiveDashboardView(APIView):
    """
    Comprehensive dashboard API that combines all analytics modules.
    
    This endpoint provides a complete view of:
    - Compliance metrics and trends
    - Capacity optimization analytics
    - Marketplace performance
    - Route optimization insights
    
    Perfect for executive dashboards and business intelligence tools.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get comprehensive dashboard data combining all analytics.
        
        Returns:
            JSON response containing:
            - compliance: Compliance dashboard data
            - capacity_optimization: Load planning and optimization metrics
            - marketplace: Marketplace performance analytics
            - route_optimization: Route efficiency and optimization data
            - generated_at: Timestamp of data generation
        """
        try:
            data = get_comprehensive_dashboard_data(request.user)
            
            # Add user context
            data['user_context'] = {
                'role': request.user.role,
                'depot': request.user.depot.name if hasattr(request.user, 'depot') and request.user.depot else None,
                'permissions': {
                    'can_view_all_data': request.user.role == 'ADMIN',
                    'can_manage_capacity': request.user.role in ['ADMIN', 'DISPATCHER'],
                    'can_create_listings': request.user.role in ['ADMIN', 'DISPATCHER', 'DRIVER']
                }
            }
            
            # Calculate overall platform health score
            compliance_data = data['compliance']
            capacity_data = data['capacity_optimization']
            marketplace_data = data['marketplace']
            
            # Calculate health score (0-100)
            health_score = 100
            
            # Reduce score for compliance issues
            if compliance_data.get('summary', {}).get('total_issues', 0) > 0:
                health_score -= min(compliance_data['summary']['total_issues'] * 5, 30)
            
            # Add score for high utilization
            if capacity_data.get('summary', {}).get('avg_weight_utilization', 0) > 80:
                health_score += 5
            if capacity_data.get('summary', {}).get('optimization_rate', 0) > 90:
                health_score += 10
            
            # Add score for marketplace activity
            if marketplace_data.get('available') and marketplace_data.get('summary', {}).get('utilization_rate', 0) > 70:
                health_score += 5
            
            data['platform_health'] = {
                'overall_score': min(max(health_score, 0), 100),
                'status': 'excellent' if health_score >= 90 else 
                         'good' if health_score >= 75 else
                         'fair' if health_score >= 60 else 'needs_attention',
                'key_metrics': {
                    'compliance_issues': compliance_data.get('summary', {}).get('total_issues', 0),
                    'avg_capacity_utilization': capacity_data.get('summary', {}).get('avg_weight_utilization', 0),
                    'optimization_rate': capacity_data.get('summary', {}).get('optimization_rate', 0)
                }
            }
            
            return Response(data)
            
        except Exception as e:
            return Response({
                'error': _('Failed to retrieve comprehensive dashboard data: {error}').format(
                    error=str(e)
                )
            }, status=500) 