# search/services.py
"""
Unified search service that coordinates between different search backends
"""
import logging
from typing import Dict, List, Optional, Any
from django.core.cache import cache
from django.conf import settings
import time

logger = logging.getLogger(__name__)

class SearchCoordinator:
    """
    Coordinates search across different backends and provides unified results
    """
    
    def __init__(self):
        self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)
    
    def search_dangerous_goods(self, query: str, filters: Dict = None, limit: int = 20) -> Dict[str, Any]:
        """Search dangerous goods using the enhanced search service"""
        try:
            from dangerous_goods.search_service import enhanced_search_service
            return enhanced_search_service.search_dangerous_goods(
                query=query,
                filters=filters or {},
                limit=limit,
                use_cache=True
            )
        except Exception as e:
            logger.error(f"Dangerous goods search failed: {e}")
            return {'results': [], 'total': 0, 'error': str(e)}
    
    def search_sds_documents(self, query: str, filters: Dict = None, limit: int = 20) -> Dict[str, Any]:
        """Search SDS documents"""
        try:
            # This would use the SDS search service when it's available
            # For now, return a placeholder structure
            return {
                'results': [],
                'total': 0,
                'query': query,
                'message': 'SDS search not yet implemented'
            }
        except Exception as e:
            logger.error(f"SDS search failed: {e}")
            return {'results': [], 'total': 0, 'error': str(e)}
    
    def search_sds_requests(self, query: str, filters: Dict = None, limit: int = 20) -> Dict[str, Any]:
        """Search SDS requests"""
        try:
            # This would use the SDS request search when it's available
            return {
                'results': [],
                'total': 0,
                'query': query,
                'message': 'SDS request search not yet implemented'
            }
        except Exception as e:
            logger.error(f"SDS request search failed: {e}")
            return {'results': [], 'total': 0, 'error': str(e)}
    
    def search_all(self, query: str, filters: Dict = None, sort_by: str = '_score', 
                   limit: int = 50, offset: int = 0, include_suggestions: bool = True) -> Dict[str, Any]:
        """
        Unified search across all data types
        """
        cache_key = f"unified_search:{hash(str([query, filters, sort_by, limit, offset]))}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        start_time = time.time()
        
        try:
            # Search each data type
            dg_results = self.search_dangerous_goods(query, filters, limit)
            sds_results = self.search_sds_documents(query, filters, limit)
            request_results = self.search_sds_requests(query, filters, min(limit, 20))
            
            # Generate suggestions
            suggestions = []
            if include_suggestions and query.strip():
                suggestions = self._generate_suggestions(query)
            
            results = {
                'query': query,
                'total_results': (
                    dg_results.get('total', 0) + 
                    sds_results.get('total', 0) + 
                    request_results.get('total', 0)
                ),
                'dangerous_goods': dg_results,
                'safety_data_sheets': sds_results,
                'sds_requests': request_results,
                'suggestions': suggestions,
                'filters_applied': filters or {},
                'search_time_ms': round((time.time() - start_time) * 1000, 2)
            }
            
            # Cache results
            cache.set(cache_key, results, self.cache_timeout)
            return results
            
        except Exception as e:
            logger.error(f"Unified search failed: {e}")
            return {
                'query': query,
                'total_results': 0,
                'dangerous_goods': {'results': [], 'total': 0},
                'safety_data_sheets': {'results': [], 'total': 0},
                'sds_requests': {'results': [], 'total': 0},
                'suggestions': [],
                'error': str(e),
                'search_time_ms': round((time.time() - start_time) * 1000, 2)
            }
    
    def _generate_suggestions(self, query: str) -> List[str]:
        """Generate search suggestions"""
        try:
            from dangerous_goods.search_service import enhanced_search_service
            return enhanced_search_service._get_search_suggestions(query)
        except Exception as e:
            logger.error(f"Suggestion generation failed: {e}")
            return []

# Global search coordinator instance
search_coordinator = SearchCoordinator()