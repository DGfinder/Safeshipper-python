# search/urls.py
from django.urls import path
from .views import (
    UnifiedSearchView,
    SearchSuggestionsView, 
    SearchAnalyticsView,
    PopularSearchesView,
    rebuild_search_index
)

app_name = 'search'

urlpatterns = [
    # Main search endpoint
    path('api/', UnifiedSearchView.as_view(), name='unified-search'),
    
    # Search suggestions for auto-complete
    path('api/suggestions/', SearchSuggestionsView.as_view(), name='search-suggestions'),
    
    # Popular searches (public endpoint)
    path('api/popular/', PopularSearchesView.as_view(), name='popular-searches'),
    
    # Search analytics (admin)
    path('api/analytics/', SearchAnalyticsView.as_view(), name='search-analytics'),
    
    # Index management (admin)
    path('api/rebuild-index/', rebuild_search_index, name='rebuild-search-index'),
    
    # Alternative endpoints for specific search types
    path('api/dangerous-goods/', UnifiedSearchView.as_view(), {'search_type': 'dangerous_goods'}, name='search-dangerous-goods'),
    path('api/sds/', UnifiedSearchView.as_view(), {'search_type': 'sds'}, name='search-sds'),
    path('api/requests/', UnifiedSearchView.as_view(), {'search_type': 'requests'}, name='search-requests'),
]