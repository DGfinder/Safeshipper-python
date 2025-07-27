# search/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from typing import Dict, Any
import logging
import time

# Import search services
from dangerous_goods.search_service import enhanced_search_service
from .services import search_coordinator

logger = logging.getLogger(__name__)

class UnifiedSearchView(APIView):
    """
    Unified search API endpoint for dangerous goods, SDS, and safety information.
    Provides comprehensive search across all safety-related documents and data.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def __init__(self):
        super().__init__()
    
    def get(self, request):
        """
        Perform unified search across all safety data
        
        Query Parameters:
            q: Search query string (required)
            type: Search type (all, dangerous_goods, sds, requests)
            hazard_class: Filter by hazard class
            packing_group: Filter by packing group
            language: Filter SDS by language
            sort: Sort by (relevance, name, date)
            limit: Results per category (default: 20)
            offset: Result offset (default: 0)
            suggest: Include suggestions (default: true)
        """
        start_time = time.time()
        
        # Get query parameters
        query = request.GET.get('q', '').strip()
        search_type = request.GET.get('type', 'all')
        limit = min(int(request.GET.get('limit', 20)), 100)  # Max 100 results
        offset = max(int(request.GET.get('offset', 0)), 0)
        include_suggestions = request.GET.get('suggest', 'true').lower() == 'true'
        sort_by = request.GET.get('sort', 'relevance')
        
        # Validate query
        if not query and search_type == 'all':
            return Response({
                'error': 'Search query is required',
                'message': 'Please provide a search query using the "q" parameter'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Build filters
        filters = {}
        if request.GET.get('hazard_class'):
            filters['hazard_class'] = request.GET.get('hazard_class')
        if request.GET.get('packing_group'):
            filters['packing_group'] = request.GET.get('packing_group')
        if request.GET.get('language'):
            filters['language'] = request.GET.get('language')
        
        try:
            # Route to specific search or unified search
            if search_type == 'dangerous_goods':
                results = self._search_dangerous_goods_only(query, filters, limit, offset)
            elif search_type == 'sds':
                results = self._search_sds_only(query, filters, limit, offset)
            elif search_type == 'requests':
                results = self._search_requests_only(query, filters, limit, offset)
            else:
                # Unified search across all categories
                results = search_coordinator.search_all(
                    query=query,
                    filters=filters,
                    sort_by=sort_by,
                    limit=limit,
                    offset=offset,
                    include_suggestions=include_suggestions
                )
            
            # Add timing information
            search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            results['search_time_ms'] = round(search_time, 2)
            results['timestamp'] = timezone.now().isoformat()
            
            # Log search analytics
            self._log_search_analytics(query, search_type, len(results.get('dangerous_goods', {}).get('results', [])))
            
            return Response(results)
            
        except Exception as e:
            logger.error(f"Search failed for query '{query}': {str(e)}")
            return Response({
                'error': 'Search failed',
                'message': 'An error occurred while performing the search. Please try again.',
                'query': query,
                'search_time_ms': round((time.time() - start_time) * 1000, 2)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _search_dangerous_goods_only(self, query: str, filters: Dict, limit: int, offset: int) -> Dict[str, Any]:
        """Search only dangerous goods"""
        dg_results = enhanced_search_service.search_dangerous_goods(
            query=query,
            filters=filters,
            limit=limit,
            use_cache=True
        )
        
        return {
            'query': query,
            'search_type': 'dangerous_goods',
            'total_results': dg_results.get('total', 0),
            'dangerous_goods': dg_results,
            'suggestions': dg_results.get('suggestions', [])
        }
    
    def _search_sds_only(self, query: str, filters: Dict, limit: int, offset: int) -> Dict[str, Any]:
        """Search only SDS documents"""
        sds_results = search_coordinator.search_sds_documents(
            query=query,
            filters=filters,
            limit=limit
        )
        
        return {
            'query': query,
            'search_type': 'sds',
            'total_results': sds_results.get('total', 0),
            'safety_data_sheets': sds_results,
            'suggestions': []
        }
    
    def _search_requests_only(self, query: str, filters: Dict, limit: int, offset: int) -> Dict[str, Any]:
        """Search only SDS requests"""
        request_results = search_coordinator.search_sds_requests(
            query=query,
            filters=filters,
            limit=limit
        )
        
        return {
            'query': query,
            'search_type': 'requests',
            'total_results': request_results.get('total', 0),
            'sds_requests': request_results,
            'suggestions': []
        }
    
    def _log_search_analytics(self, query: str, search_type: str, result_count: int):
        """Log search analytics for future analysis"""
        try:
            # Increment search counters
            cache_key_searches = 'search:analytics:total_searches'
            cache_key_popular = 'search:analytics:popular_queries'
            
            total_searches = cache.get(cache_key_searches, 0)
            cache.set(cache_key_searches, total_searches + 1, 86400)  # 24 hours
            
            # Track popular queries
            popular_queries = cache.get(cache_key_popular, {})
            query_lower = query.lower()
            popular_queries[query_lower] = popular_queries.get(query_lower, 0) + 1
            
            # Keep only top 100 popular queries
            if len(popular_queries) > 100:
                sorted_queries = sorted(popular_queries.items(), key=lambda x: x[1], reverse=True)
                popular_queries = dict(sorted_queries[:100])
            
            cache.set(cache_key_popular, popular_queries, 86400)
            
        except Exception as e:
            logger.error(f"Failed to log search analytics: {e}")

class SearchSuggestionsView(APIView):
    """
    Search suggestions API endpoint for auto-complete functionality.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Get search suggestions for auto-complete
        
        Query Parameters:
            q: Partial query string (required)
            type: Suggestion type (all, dangerous_goods, sds)
            limit: Maximum suggestions (default: 10)
        """
        query = request.GET.get('q', '').strip()
        suggestion_type = request.GET.get('type', 'all')
        limit = min(int(request.GET.get('limit', 10)), 20)
        
        if not query:
            return Response({
                'error': 'Query parameter "q" is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(query) < 2:
            return Response({
                'suggestions': [],
                'message': 'Query too short - please enter at least 2 characters'
            })
        
        try:
            suggestions = []
            
            if suggestion_type in ['all', 'dangerous_goods']:
                # Get dangerous goods suggestions
                dg_suggestions = enhanced_search_service._get_search_suggestions(query)
                suggestions.extend([{'text': s, 'type': 'dangerous_goods'} for s in dg_suggestions[:limit//2]])
            
            if suggestion_type in ['all', 'sds']:
                # Get SDS suggestions (would need to be implemented in UnifiedSearchService)
                # For now, return popular search terms that match
                popular_queries = cache.get('search:analytics:popular_queries', {})
                matching_popular = [q for q in popular_queries.keys() if query.lower() in q.lower()]
                suggestions.extend([{'text': q, 'type': 'popular'} for q in matching_popular[:limit//2]])
            
            # Limit total suggestions
            suggestions = suggestions[:limit]
            
            return Response({
                'query': query,
                'suggestions': suggestions,
                'suggestion_type': suggestion_type
            })
            
        except Exception as e:
            logger.error(f"Suggestion generation failed: {e}")
            return Response({
                'error': 'Failed to generate suggestions',
                'query': query,
                'suggestions': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SearchAnalyticsView(APIView):
    """
    Search analytics API endpoint for search performance and usage statistics.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Get search analytics and performance metrics
        """
        try:
            # Get analytics from cache
            total_searches = cache.get('search:analytics:total_searches', 0)
            popular_queries = cache.get('search:analytics:popular_queries', {})
            
            # Get dangerous goods search analytics
            dg_analytics = enhanced_search_service.get_search_analytics()
            
            # Format popular queries
            top_queries = sorted(popular_queries.items(), key=lambda x: x[1], reverse=True)[:20]
            
            analytics = {
                'total_searches_today': total_searches,
                'popular_queries': [{'query': q, 'count': c} for q, c in top_queries],
                'dangerous_goods_analytics': dg_analytics,
                'elasticsearch_status': {
                    'available': dg_analytics.get('elasticsearch_available', False),
                    'indices': ['dangerous_goods', 'safety_data_sheets'],
                },
                'cache_statistics': {
                    'search_cache_timeout': getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300),
                    'cache_backend': settings.CACHES['default']['BACKEND']
                },
                'timestamp': timezone.now().isoformat()
            }
            
            return Response(analytics)
            
        except Exception as e:
            logger.error(f"Analytics retrieval failed: {e}")
            return Response({
                'error': 'Failed to retrieve analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def rebuild_search_index(request):
    """
    Rebuild search indices (admin only)
    """
    if not request.user.is_staff:
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Rebuild dangerous goods index
        result = enhanced_search_service.index_dangerous_goods(force_rebuild=True)
        
        return Response({
            'message': 'Search index rebuild initiated',
            'dangerous_goods_result': result,
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Index rebuild failed: {e}")
        return Response({
            'error': 'Index rebuild failed',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PopularSearchesView(APIView):
    """
    Popular searches endpoint for search suggestions and trending queries.
    """
    permission_classes = [permissions.AllowAny]  # Public endpoint
    
    def get(self, request):
        """
        Get popular search terms
        
        Query Parameters:
            limit: Maximum number of popular searches (default: 10)
        """
        limit = min(int(request.GET.get('limit', 10)), 50)
        
        try:
            # Get from cache or return default popular searches
            popular_queries = cache.get('search:analytics:popular_queries', {})
            
            if popular_queries:
                # Return actual popular queries
                top_queries = sorted(popular_queries.items(), key=lambda x: x[1], reverse=True)
                popular_searches = [q for q, _ in top_queries[:limit]]
            else:
                # Return default popular searches if no analytics data
                default_searches = [
                    "lithium battery shipments",
                    "Class 3 flammable liquids", 
                    "dangerous goods manifest",
                    "UN1203",
                    "corrosive substances",
                    "safety data sheet",
                    "explosive materials",
                    "oxidizing agents",
                    "toxic gases",
                    "radioactive materials"
                ]
                popular_searches = default_searches[:limit]
            
            return Response({
                'popular_searches': popular_searches,
                'limit': limit,
                'source': 'analytics' if popular_queries else 'default'
            })
            
        except Exception as e:
            logger.error(f"Popular searches retrieval failed: {e}")
            return Response({
                'popular_searches': [],
                'error': 'Failed to retrieve popular searches'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)