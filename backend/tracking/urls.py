from django.urls import path
from .api_views import (
    fleet_map_data, vector_tile, fleet_bounds, 
    invalidate_map_cache, map_performance_stats
)
from .public_views import (
    update_location, public_tracking, submit_feedback
)

urlpatterns = [
    # Driver location tracking
    path('update-location/', update_location, name='update_location'),
    
    # Public tracking endpoints - matches frontend API calls
    path('public/<str:tracking_number>/', public_tracking, name='public_tracking'),
    path('public/<str:tracking_number>/feedback/', submit_feedback, name='submit_feedback'),
    
    # Fleet map data endpoints
    path('fleet/map-data/', fleet_map_data, name='fleet_map_data'),
    path('fleet/bounds/', fleet_bounds, name='fleet_bounds'),
    path('fleet/cache/invalidate/', invalidate_map_cache, name='invalidate_map_cache'),
    path('fleet/performance/', map_performance_stats, name='map_performance_stats'),
    
    # Vector tile endpoints
    path('tiles/<int:z>/<int:x>/<int:y>.mvt', vector_tile, name='vector_tile'),
]