# sds/search_service.py
from typing import Dict, List, Optional, Any, Union
from elasticsearch_dsl import Q, Search
from django.conf import settings
from django.core.cache import cache
import logging

from .documents import SafetyDataSheetDocument, SDSRequestDocument
from dangerous_goods.documents import DangerousGoodDocument

logger = logging.getLogger(__name__)

class UnifiedSearchService:
    """
    Unified search service for dangerous goods, SDS, and related safety information.
    Provides comprehensive search across all safety-related documents and data.
    """
    
    def __init__(self):
        self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)  # 5 minutes
    
    def search_all(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = '_score',
        limit: int = 50,
        offset: int = 0,
        include_suggestions: bool = True
    ) -> Dict[str, Any]:
        """
        Unified search across dangerous goods, SDS, and requests.
        
        Args:
            query: Search query string
            filters: Additional filters (hazard_class, language, etc.)
            sort_by: Sort field (_score, name, date, etc.)
            limit: Maximum results per category
            offset: Result offset
            include_suggestions: Whether to include search suggestions
            
        Returns:
            Dict with results from all categories
        """
        cache_key = f"unified_search:{hash(str([query, filters, sort_by, limit, offset]))}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        filters = filters or {}
        
        try:
            # Search dangerous goods
            dg_results = self.search_dangerous_goods(
                query=query,
                filters=filters,
                sort_by=sort_by,
                limit=limit,
                offset=offset
            )
            
            # Search SDS documents
            sds_results = self.search_sds_documents(
                query=query,
                filters=filters,
                sort_by=sort_by,
                limit=limit,
                offset=offset
            )
            
            # Search SDS requests (for identifying gaps)
            request_results = self.search_sds_requests(
                query=query,
                filters=filters,
                limit=min(limit, 20),  # Fewer request results
                offset=offset
            )
            
            # Generate suggestions if requested
            suggestions = []
            if include_suggestions and query:
                suggestions = self._generate_search_suggestions(query)
            
            results = {
                'query': query,
                'total_results': (
                    dg_results['total'] + 
                    sds_results['total'] + 
                    request_results['total']
                ),
                'dangerous_goods': dg_results,
                'safety_data_sheets': sds_results,
                'sds_requests': request_results,
                'suggestions': suggestions,
                'filters_applied': filters,
                'search_time_ms': None  # Will be calculated by caller
            }
            
            # Cache results
            cache.set(cache_key, results, self.cache_timeout)
            return results
            
        except Exception as e:
            logger.error(f"Unified search error: {str(e)}")
            return {
                'query': query,
                'total_results': 0,
                'dangerous_goods': {'results': [], 'total': 0},
                'safety_data_sheets': {'results': [], 'total': 0},
                'sds_requests': {'results': [], 'total': 0},
                'suggestions': [],
                'error': str(e)
            }
    
    def search_dangerous_goods(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = '_score',
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search dangerous goods with advanced filtering"""
        try:
            search = DangerousGoodDocument.search()
            
            if query:
                # Multi-field search with boosting
                search = search.query(
                    Q('multi_match', 
                      query=query,
                      fields=[
                          'un_number^3',  # Boost UN number matches
                          'proper_shipping_name^2',
                          'simplified_name^2',
                          'technical_name',
                          'combined_text',
                          'cas_number^2'
                      ],
                      fuzziness='AUTO'
                    )
                )
            
            # Apply filters
            if filters:
                if 'hazard_class' in filters:
                    search = search.filter('term', hazard_class=filters['hazard_class'])
                
                if 'packing_group' in filters:
                    search = search.filter('term', packing_group=filters['packing_group'])
                
                if 'physical_form' in filters:
                    search = search.filter('term', physical_form=filters['physical_form'])
                
                if 'flash_point_range' in filters:
                    fp_range = filters['flash_point_range']
                    if 'min' in fp_range or 'max' in fp_range:
                        range_filter = {}
                        if 'min' in fp_range:
                            range_filter['gte'] = fp_range['min']
                        if 'max' in fp_range:
                            range_filter['lte'] = fp_range['max']
                        search = search.filter('range', flash_point_celsius=range_filter)
            
            # Apply sorting
            if sort_by == '_score':
                search = search.sort('-_score', 'un_number')
            elif sort_by == 'un_number':
                search = search.sort('un_number.raw')
            elif sort_by == 'name':
                search = search.sort('proper_shipping_name.raw')
            elif sort_by == 'hazard_class':
                search = search.sort('hazard_class', 'un_number.raw')
            
            # Execute search with pagination
            search = search[offset:offset + limit]
            response = search.execute()
            
            results = []
            for hit in response:
                result = {
                    'id': hit.meta.id,
                    'score': hit.meta.score,
                    'un_number': getattr(hit, 'un_number', ''),
                    'proper_shipping_name': getattr(hit, 'proper_shipping_name', ''),
                    'simplified_name': getattr(hit, 'simplified_name', ''),
                    'hazard_class': getattr(hit, 'hazard_class', ''),
                    'packing_group': getattr(hit, 'packing_group', ''),
                    'physical_form': getattr(hit, 'physical_form', ''),
                    'flash_point_celsius': getattr(hit, 'flash_point_celsius', None),
                    'technical_name': getattr(hit, 'technical_name', ''),
                    'cas_number': getattr(hit, 'cas_number', ''),
                    'type': 'dangerous_good'
                }
                results.append(result)
            
            return {
                'results': results,
                'total': response.hits.total.value if hasattr(response.hits.total, 'value') else len(results),
                'max_score': response.hits.max_score
            }
            
        except Exception as e:
            logger.error(f"Dangerous goods search error: {str(e)}")
            return {'results': [], 'total': 0, 'error': str(e)}
    
    def search_sds_documents(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = '_score',
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search SDS documents with comprehensive filtering"""
        try:
            search = SafetyDataSheetDocument.search()
            
            if query:
                # Multi-field search optimized for SDS content
                search = search.query(
                    Q('multi_match',
                      query=query,
                      fields=[
                          'product_name^3',
                          'manufacturer^2',
                          'dangerous_good_un_number^3',
                          'dangerous_good_proper_shipping_name^2',
                          'manufacturer_code^2',
                          'hazard_statements',
                          'precautionary_statements',
                          'first_aid_measures',
                          'fire_fighting_measures',
                          'combined_text'
                      ],
                      fuzziness='AUTO'
                    )
                )
            
            # Apply filters
            if filters:
                if 'language' in filters:
                    search = search.filter('term', language=filters['language'])
                
                if 'country_code' in filters:
                    search = search.filter('term', country_code=filters['country_code'])
                
                if 'status' in filters:
                    search = search.filter('term', status=filters['status'])
                
                if 'hazard_class' in filters:
                    search = search.filter('term', dangerous_good_hazard_class=filters['hazard_class'])
                
                if 'manufacturer' in filters:
                    search = search.filter('term', manufacturer__raw=filters['manufacturer'])
                
                if 'active_only' in filters and filters['active_only']:
                    search = search.filter('term', is_active=True)
                    search = search.filter('term', is_expired=False)
                
                if 'ph_range' in filters:
                    ph_range = filters['ph_range']
                    if 'min' in ph_range or 'max' in ph_range:
                        # Search documents where pH range overlaps with requested range
                        ph_queries = []
                        if 'min' in ph_range:
                            ph_queries.append(Q('range', ph_value_max={'gte': ph_range['min']}))
                        if 'max' in ph_range:
                            ph_queries.append(Q('range', ph_value_min={'lte': ph_range['max']}))
                        
                        if ph_queries:
                            search = search.query('bool', must=ph_queries)
            
            # Apply sorting
            if sort_by == '_score':
                search = search.sort('-_score', '-revision_date')
            elif sort_by == 'product_name':
                search = search.sort('product_name.raw')
            elif sort_by == 'manufacturer':
                search = search.sort('manufacturer.raw', 'product_name.raw')
            elif sort_by == 'revision_date':
                search = search.sort('-revision_date')
            elif sort_by == 'un_number':
                search = search.sort('dangerous_good_un_number.raw')
            
            # Execute search with pagination
            search = search[offset:offset + limit]
            response = search.execute()
            
            results = []
            for hit in response:
                result = {
                    'id': hit.meta.id,
                    'score': hit.meta.score,
                    'product_name': getattr(hit, 'product_name', ''),
                    'manufacturer': getattr(hit, 'manufacturer', ''),
                    'manufacturer_code': getattr(hit, 'manufacturer_code', ''),
                    'version': getattr(hit, 'version', ''),
                    'revision_date': getattr(hit, 'revision_date', None),
                    'status': getattr(hit, 'status', ''),
                    'language': getattr(hit, 'language', ''),
                    'country_code': getattr(hit, 'country_code', ''),
                    'dangerous_good_un_number': getattr(hit, 'dangerous_good_un_number', ''),
                    'dangerous_good_proper_shipping_name': getattr(hit, 'dangerous_good_proper_shipping_name', ''),
                    'dangerous_good_hazard_class': getattr(hit, 'dangerous_good_hazard_class', ''),
                    'physical_state': getattr(hit, 'physical_state', ''),
                    'flash_point_celsius': getattr(hit, 'flash_point_celsius', None),
                    'ph_value_min': getattr(hit, 'ph_value_min', None),
                    'ph_value_max': getattr(hit, 'ph_value_max', None),
                    'is_active': getattr(hit, 'is_active', False),
                    'is_expired': getattr(hit, 'is_expired', False),
                    'days_until_expiration': getattr(hit, 'days_until_expiration', None),
                    'type': 'safety_data_sheet'
                }
                results.append(result)
            
            return {
                'results': results,
                'total': response.hits.total.value if hasattr(response.hits.total, 'value') else len(results),
                'max_score': response.hits.max_score
            }
            
        except Exception as e:
            logger.error(f"SDS search error: {str(e)}")
            return {'results': [], 'total': 0, 'error': str(e)}
    
    def search_sds_requests(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search SDS requests to identify missing documents"""
        try:
            search = SDSRequestDocument.search()
            
            if query:
                search = search.query(
                    Q('multi_match',
                      query=query,
                      fields=[
                          'product_name^2',
                          'manufacturer',
                          'dangerous_good_un_number^2',
                          'dangerous_good_proper_shipping_name',
                          'justification',
                          'notes'
                      ]
                    )
                )
            
            # Apply filters
            if filters:
                if 'status' in filters:
                    search = search.filter('term', status=filters['status'])
                
                if 'urgency' in filters:
                    search = search.filter('term', urgency=filters['urgency'])
                
                if 'language' in filters:
                    search = search.filter('term', language=filters['language'])
                
                if 'requested_by' in filters:
                    search = search.filter('term', requested_by=filters['requested_by'])
            
            # Sort by urgency and creation date
            search = search.sort('-urgency', '-created_at')
            
            # Execute search with pagination
            search = search[offset:offset + limit]
            response = search.execute()
            
            results = []
            for hit in response:
                result = {
                    'id': hit.meta.id,
                    'score': hit.meta.score,
                    'product_name': getattr(hit, 'product_name', ''),
                    'manufacturer': getattr(hit, 'manufacturer', ''),
                    'dangerous_good_un_number': getattr(hit, 'dangerous_good_un_number', ''),
                    'dangerous_good_proper_shipping_name': getattr(hit, 'dangerous_good_proper_shipping_name', ''),
                    'requested_by': getattr(hit, 'requested_by', ''),
                    'language': getattr(hit, 'language', ''),
                    'country_code': getattr(hit, 'country_code', ''),
                    'urgency': getattr(hit, 'urgency', ''),
                    'status': getattr(hit, 'status', ''),
                    'justification': getattr(hit, 'justification', ''),
                    'created_at': getattr(hit, 'created_at', None),
                    'type': 'sds_request'
                }
                results.append(result)
            
            return {
                'results': results,
                'total': response.hits.total.value if hasattr(response.hits.total, 'value') else len(results),
                'max_score': response.hits.max_score
            }
            
        except Exception as e:
            logger.error(f"SDS requests search error: {str(e)}")
            return {'results': [], 'total': 0, 'error': str(e)}
    
    def _generate_search_suggestions(self, query: str) -> List[str]:
        """Generate search suggestions based on query"""
        suggestions = []
        
        try:
            # Get suggestions from dangerous goods
            dg_search = DangerousGoodDocument.search()
            dg_suggest = dg_search.suggest(
                'product_suggestions',
                query,
                completion={
                    'field': 'proper_shipping_name.suggest',
                    'size': 5
                }
            )
            dg_response = dg_suggest.execute()
            
            if hasattr(dg_response, 'suggest') and 'product_suggestions' in dg_response.suggest:
                for option in dg_response.suggest.product_suggestions[0].options:
                    suggestions.append(option.text)
            
            # Get suggestions from SDS
            sds_search = SafetyDataSheetDocument.search()
            sds_suggest = sds_search.suggest(
                'sds_suggestions',
                query,
                completion={
                    'field': 'product_name.suggest',
                    'size': 5
                }
            )
            sds_response = sds_suggest.execute()
            
            if hasattr(sds_response, 'suggest') and 'sds_suggestions' in sds_response.suggest:
                for option in sds_response.suggest.sds_suggestions[0].options:
                    suggestions.append(option.text)
            
            # Remove duplicates and limit
            suggestions = list(dict.fromkeys(suggestions))[:10]
            
        except Exception as e:
            logger.error(f"Suggestion generation error: {str(e)}")
        
        return suggestions
    
    def get_search_facets(self, query: str = "") -> Dict[str, Any]:
        """Get search facets for filtering"""
        try:
            # Get dangerous goods facets
            dg_search = DangerousGoodDocument.search()
            if query:
                dg_search = dg_search.query('multi_match', query=query, fields=['combined_text'])
            
            dg_search.aggs.bucket('hazard_classes', 'terms', field='hazard_class', size=20)
            dg_search.aggs.bucket('packing_groups', 'terms', field='packing_group', size=10)
            dg_search.aggs.bucket('physical_forms', 'terms', field='physical_form', size=10)
            
            # Get SDS facets
            sds_search = SafetyDataSheetDocument.search()
            if query:
                sds_search = sds_search.query('multi_match', query=query, fields=['combined_text'])
            
            sds_search.aggs.bucket('manufacturers', 'terms', field='manufacturer.raw', size=20)
            sds_search.aggs.bucket('languages', 'terms', field='language', size=10)
            sds_search.aggs.bucket('countries', 'terms', field='country_code', size=20)
            sds_search.aggs.bucket('statuses', 'terms', field='status', size=10)
            
            # Execute searches
            dg_response = dg_search.execute()
            sds_response = sds_search.execute()
            
            facets = {
                'dangerous_goods': {
                    'hazard_classes': [
                        {'key': bucket.key, 'count': bucket.doc_count}
                        for bucket in dg_response.aggregations.hazard_classes.buckets
                    ],
                    'packing_groups': [
                        {'key': bucket.key, 'count': bucket.doc_count}
                        for bucket in dg_response.aggregations.packing_groups.buckets
                    ],
                    'physical_forms': [
                        {'key': bucket.key, 'count': bucket.doc_count}
                        for bucket in dg_response.aggregations.physical_forms.buckets
                    ]
                },
                'safety_data_sheets': {
                    'manufacturers': [
                        {'key': bucket.key, 'count': bucket.doc_count}
                        for bucket in sds_response.aggregations.manufacturers.buckets
                    ],
                    'languages': [
                        {'key': bucket.key, 'count': bucket.doc_count}
                        for bucket in sds_response.aggregations.languages.buckets
                    ],
                    'countries': [
                        {'key': bucket.key, 'count': bucket.doc_count}
                        for bucket in sds_response.aggregations.countries.buckets
                    ],
                    'statuses': [
                        {'key': bucket.key, 'count': bucket.doc_count}
                        for bucket in sds_response.aggregations.statuses.buckets
                    ]
                }
            }
            
            return facets
            
        except Exception as e:
            logger.error(f"Facets generation error: {str(e)}")
            return {'dangerous_goods': {}, 'safety_data_sheets': {}}


# Global instance
search_service = UnifiedSearchService()