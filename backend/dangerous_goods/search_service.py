# Enhanced Elasticsearch Service for Dangerous Goods Search
# Leverages existing django-elasticsearch-dsl infrastructure

import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import json

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django_elasticsearch_dsl import Document as ESDocument, Index, fields
from django_elasticsearch_dsl.registries import registry
from elasticsearch_dsl import Search, Q, analyzer, tokenizer
from elasticsearch import Elasticsearch

from .models import DangerousGood, DGProductSynonym
from .ai_detection_service import DGDetectionResult

logger = logging.getLogger(__name__)

# Configure Elasticsearch index
dangerous_goods_index = Index('dangerous_goods')
dangerous_goods_index.settings(
    number_of_shards=1,
    number_of_replicas=0,
    analysis={
        'analyzer': {
            'dangerous_goods_analyzer': {
                'type': 'custom',
                'tokenizer': 'standard',
                'filter': [
                    'lowercase',
                    'asciifolding',
                    'stop',
                    'dangerous_goods_synonyms',
                    'stemmer'
                ]
            },
            'un_number_analyzer': {
                'type': 'custom',
                'tokenizer': 'keyword',
                'filter': ['lowercase']
            }
        },
        'filter': {
            'dangerous_goods_synonyms': {
                'type': 'synonym',
                'synonyms': [
                    'dg,dangerous goods',
                    'hazmat,hazardous materials',
                    'un,united nations',
                    'imdg,international maritime dangerous goods',
                    'adr,european agreement dangerous goods'
                ]
            }
        }
    }
)

@registry.register_document
class DangerousGoodDocument(ESDocument):
    """Elasticsearch document for dangerous goods"""
    
    # Core fields with custom analyzers
    un_number = fields.KeywordField(
        analyzer='un_number_analyzer',
        fields={'raw': fields.KeywordField()}
    )
    
    proper_shipping_name = fields.TextField(
        analyzer='dangerous_goods_analyzer',
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField()
        }
    )
    
    simplified_name = fields.TextField(
        analyzer='dangerous_goods_analyzer',
        fields={'raw': fields.KeywordField()}
    )
    
    # Hazard classification
    hazard_class = fields.KeywordField()
    sub_hazard = fields.KeywordField()
    packing_group = fields.KeywordField()
    
    # Additional searchable fields
    description = fields.TextField(analyzer='dangerous_goods_analyzer')
    special_provisions = fields.TextField(analyzer='dangerous_goods_analyzer')
    
    # Synonyms (from related model)
    synonyms = fields.TextField(
        analyzer='dangerous_goods_analyzer',
        multi=True
    )
    
    # Metadata
    created_at = fields.DateField()
    updated_at = fields.DateField()
    
    # Search boosting
    search_boost = fields.FloatField()
    
    class Index:
        name = 'dangerous_goods'
        settings = dangerous_goods_index._settings
    
    class Django:
        model = DangerousGood
        fields = [
            'id',
            'is_marine_pollutant',
            'is_elevated_temperature_substance',
            'flash_point',
            'explosive_limit_lower',
            'explosive_limit_upper'
        ]
        
        related_models = [DGProductSynonym]
    
    def get_queryset(self):
        """Customize queryset for indexing"""
        return super().get_queryset().select_related().prefetch_related('dgproductsynonym_set')
    
    def get_instances_from_related(self, related_instance):
        """Update DG document when synonyms change"""
        if isinstance(related_instance, DGProductSynonym):
            return related_instance.dangerous_good

    def prepare_synonyms(self, instance):
        """Prepare synonyms for indexing"""
        return list(instance.dgproductsynonym_set.values_list('synonym', flat=True))
    
    def prepare_search_boost(self, instance):
        """Calculate search boost based on usage and importance"""
        # Boost common/important dangerous goods
        boost = 1.0
        
        # Higher boost for common classes
        if instance.hazard_class in ['3', '8', '9']:
            boost += 0.5
            
        # Higher boost for items with more synonyms (indicates common usage)
        synonym_count = instance.dgproductsynonym_set.count()
        boost += min(synonym_count * 0.1, 1.0)
        
        return boost

@dataclass
class SearchResult:
    """Enhanced search result with relevance scoring"""
    dangerous_good: DangerousGood
    score: float
    matched_fields: List[str]
    highlighted_text: Dict[str, List[str]]
    match_type: str
    suggestions: List[str] = None

class EnhancedDGSearchService:
    """
    Advanced Elasticsearch-powered search service for dangerous goods
    """
    
    def __init__(self):
        self.es_client = None
        self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)  # 5 minutes
        
        try:
            # Initialize Elasticsearch client
            if hasattr(settings, 'ELASTICSEARCH_DSL'):
                self.es_client = Elasticsearch(settings.ELASTICSEARCH_DSL['default']['hosts'])
            else:
                logger.warning("Elasticsearch not configured - search will use database fallback")
        except Exception as e:
            logger.error(f"Failed to initialize Elasticsearch: {e}")

    def search_dangerous_goods(
        self,
        query: str,
        filters: Optional[Dict] = None,
        limit: int = 20,
        suggest: bool = True,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Advanced search for dangerous goods with multiple strategies
        
        Args:
            query: Search query string
            filters: Additional filters (hazard_class, packing_group, etc.)
            limit: Maximum results to return
            suggest: Include search suggestions
            use_cache: Use Redis caching
            
        Returns:
            Dict with search results, suggestions, and metadata
        """
        # Generate cache key
        cache_key = None
        if use_cache:
            filter_str = json.dumps(filters or {}, sort_keys=True)
            cache_key = f"dg_search:{hash(query + filter_str)}:{limit}"
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info("Search cache hit")
                return cached_result

        try:
            if self.es_client:
                result = self._elasticsearch_search(query, filters, limit, suggest)
            else:
                result = self._database_fallback_search(query, filters, limit)
                
            # Cache the result
            if use_cache and cache_key:
                cache.set(cache_key, result, self.cache_timeout)
                
            return result
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            # Fallback to database search
            return self._database_fallback_search(query, filters, limit)

    def _elasticsearch_search(
        self,
        query: str,
        filters: Optional[Dict],
        limit: int,
        suggest: bool
    ) -> Dict[str, Any]:
        """Execute Elasticsearch search with advanced features"""
        
        # Build the search query
        search = Search(index='dangerous_goods')
        
        if query.strip():
            # Multi-field search with boosting
            main_query = Q(
                'multi_match',
                query=query,
                fields=[
                    'un_number^3.0',  # Highest boost for UN numbers
                    'proper_shipping_name^2.0',
                    'simplified_name^1.5',
                    'synonyms^1.2',
                    'description^0.8'
                ],
                type='best_fields',
                fuzziness='AUTO',
                minimum_should_match='75%'
            )
            
            # Add phrase matching for exact matches
            phrase_query = Q(
                'multi_match',
                query=query,
                fields=['proper_shipping_name^2.0', 'synonyms^1.5'],
                type='phrase',
                boost=2.0
            )
            
            # Combine queries
            combined_query = Q('bool', should=[main_query, phrase_query])
            search = search.query(combined_query)
        else:
            # Match all for empty queries
            search = search.query('match_all')

        # Apply filters
        if filters:
            for field, value in filters.items():
                if value:
                    search = search.filter('term', **{field: value})

        # Add highlighting
        search = search.highlight(
            'proper_shipping_name',
            'simplified_name', 
            'synonyms',
            'description',
            fragment_size=150,
            number_of_fragments=3,
            pre_tags=['<mark>'],
            post_tags=['</mark>']
        )

        # Execute search
        search = search[:limit]
        response = search.execute()

        # Process results
        results = []
        for hit in response:
            # Get the DangerousGood instance
            try:
                dg = DangerousGood.objects.get(id=hit.id)
                
                # Determine matched fields
                matched_fields = []
                if hasattr(hit.meta, 'highlight'):
                    matched_fields = list(hit.meta.highlight.to_dict().keys())

                results.append(SearchResult(
                    dangerous_good=dg,
                    score=hit.meta.score,
                    matched_fields=matched_fields,
                    highlighted_text=hit.meta.highlight.to_dict() if hasattr(hit.meta, 'highlight') else {},
                    match_type='elasticsearch'
                ))
            except DangerousGood.DoesNotExist:
                continue

        # Get suggestions if requested
        suggestions = []
        if suggest and query.strip():
            suggestions = self._get_search_suggestions(query)

        return {
            'results': [
                {
                    'dangerous_good': {
                        'id': str(result.dangerous_good.id),
                        'un_number': result.dangerous_good.un_number,
                        'proper_shipping_name': result.dangerous_good.proper_shipping_name,
                        'hazard_class': result.dangerous_good.hazard_class,
                        'packing_group': result.dangerous_good.packing_group,
                        'simplified_name': result.dangerous_good.simplified_name
                    },
                    'score': result.score,
                    'matched_fields': result.matched_fields,
                    'highlighted_text': result.highlighted_text,
                    'match_type': result.match_type
                } for result in results
            ],
            'total': response.hits.total.value if hasattr(response.hits.total, 'value') else len(results),
            'suggestions': suggestions,
            'query': query,
            'filters': filters or {},
            'search_method': 'elasticsearch'
        }

    def _database_fallback_search(
        self,
        query: str,
        filters: Optional[Dict],
        limit: int
    ) -> Dict[str, Any]:
        """Fallback database search when Elasticsearch is unavailable"""
        from .services import find_dangerous_goods
        from django.db.models import Q as DjangoQ
        
        # Use existing database search
        if query.strip():
            base_results = find_dangerous_goods(query)
        else:
            base_results = DangerousGood.objects.all()

        # Apply filters
        if filters:
            filter_q = DjangoQ()
            for field, value in filters.items():
                if value:
                    filter_q &= DjangoQ(**{field: value})
            base_results = base_results.filter(filter_q)

        # Limit results
        results = base_results[:limit]

        return {
            'results': [
                {
                    'dangerous_good': {
                        'id': str(dg.id),
                        'un_number': dg.un_number,
                        'proper_shipping_name': dg.proper_shipping_name,
                        'hazard_class': dg.hazard_class,
                        'packing_group': dg.packing_group,
                        'simplified_name': dg.simplified_name
                    },
                    'score': 1.0,  # No scoring in database search
                    'matched_fields': ['database_search'],
                    'highlighted_text': {},
                    'match_type': 'database_fallback'
                } for dg in results
            ],
            'total': len(results),
            'suggestions': [],
            'query': query,
            'filters': filters or {},
            'search_method': 'database_fallback'
        }

    def _get_search_suggestions(self, query: str) -> List[str]:
        """Get search suggestions using completion suggester"""
        if not self.es_client:
            return []

        try:
            suggest_query = {
                "suggest": {
                    "dg_suggestions": {
                        "prefix": query,
                        "completion": {
                            "field": "proper_shipping_name.suggest",
                            "size": 5,
                            "skip_duplicates": True
                        }
                    }
                }
            }

            response = self.es_client.search(
                index='dangerous_goods',
                body=suggest_query
            )

            suggestions = []
            for suggestion in response['suggest']['dg_suggestions'][0]['options']:
                suggestions.append(suggestion['text'])

            return suggestions
            
        except Exception as e:
            logger.error(f"Suggestion query failed: {e}")
            return []

    def index_dangerous_goods(self, force_rebuild: bool = False) -> Dict[str, Any]:
        """
        Index or reindex all dangerous goods in Elasticsearch
        
        Args:
            force_rebuild: Whether to completely rebuild the index
            
        Returns:
            Dict with indexing results and statistics
        """
        if not self.es_client:
            return {'error': 'Elasticsearch not available'}

        start_time = timezone.now()
        
        try:
            if force_rebuild:
                # Delete and recreate index
                try:
                    self.es_client.indices.delete(index='dangerous_goods')
                except:
                    pass  # Index might not exist
                
                # Recreate index with mapping
                dangerous_goods_index.create()

            # Index all dangerous goods
            indexed_count = 0
            error_count = 0
            
            queryset = DangerousGood.objects.select_related().prefetch_related('dgproductsynonym_set')
            
            for dg in queryset:
                try:
                    # Create document instance
                    doc = DangerousGoodDocument()
                    doc.meta.id = dg.id
                    
                    # Populate fields
                    doc.un_number = dg.un_number
                    doc.proper_shipping_name = dg.proper_shipping_name
                    doc.simplified_name = dg.simplified_name or ""
                    doc.hazard_class = dg.hazard_class
                    doc.sub_hazard = dg.sub_hazard or ""
                    doc.packing_group = dg.packing_group or ""
                    doc.description = dg.description or ""
                    doc.special_provisions = dg.special_provisions or ""
                    doc.synonyms = list(dg.dgproductsynonym_set.values_list('synonym', flat=True))
                    doc.created_at = dg.created_at
                    doc.updated_at = dg.updated_at
                    doc.search_boost = doc.prepare_search_boost(dg)
                    
                    # Save to Elasticsearch
                    doc.save()
                    indexed_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to index dangerous good {dg.id}: {e}")
                    error_count += 1

            processing_time = (timezone.now() - start_time).total_seconds()

            return {
                'success': True,
                'indexed_count': indexed_count,
                'error_count': error_count,
                'processing_time': processing_time,
                'timestamp': timezone.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Indexing failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'processing_time': (timezone.now() - start_time).total_seconds()
            }

    def get_search_analytics(self) -> Dict[str, Any]:
        """Get search analytics and performance metrics"""
        # This could be enhanced with actual analytics from Elasticsearch
        # or cached search statistics
        
        return {
            'total_indexed': cache.get('dg_search:total_indexed', 0),
            'cache_hit_rate': cache.get('dg_search:cache_hits', 0),
            'average_response_time': cache.get('dg_search:avg_response_time', 0.0),
            'popular_searches': cache.get('dg_search:popular_searches', []),
            'elasticsearch_available': self.es_client is not None
        }

# Service instance
enhanced_search_service = EnhancedDGSearchService()