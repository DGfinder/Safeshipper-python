# dangerous_goods/documents.py
from django_elasticsearch_dsl import Document, Index, fields
from elasticsearch_dsl import analyzer
from .models import DangerousGood

# Define custom analyzers for better search
standard_analyzer = analyzer(
    'standard_analyzer',
    tokenizer='standard',
    filter=['lowercase', 'stop']
)

autocomplete_analyzer = analyzer(
    'autocomplete_analyzer',
    tokenizer='edge_ngram',
    filter=['lowercase']
)

# Define the Elasticsearch index
dangerous_goods_index = Index('dangerous_goods')
dangerous_goods_index.settings(
    number_of_shards=1,
    number_of_replicas=0
)

@dangerous_goods_index.doc_type
class DangerousGoodDocument(Document):
    """
    Elasticsearch document for DangerousGood model to enable full-text search
    """
    
    # Core identification fields
    un_number = fields.TextField(
        attr='un_number',
        analyzer=standard_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    
    proper_shipping_name = fields.TextField(
        attr='proper_shipping_name',
        analyzer=standard_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'autocomplete': fields.TextField(analyzer=autocomplete_analyzer),
            'suggest': fields.CompletionField(),
        }
    )
    
    simplified_name = fields.TextField(
        attr='simplified_name',
        analyzer=standard_analyzer,
        fields={
            'autocomplete': fields.TextField(analyzer=autocomplete_analyzer),
            'suggest': fields.CompletionField(),
        }
    )
    
    # Classification fields
    hazard_class = fields.TextField(
        attr='hazard_class',
        analyzer=standard_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    subsidiary_risks = fields.TextField(
        attr='subsidiary_risks',
        analyzer=standard_analyzer,
    )
    
    packing_group = fields.KeywordField(attr='packing_group')
    
    # Transport and regulation fields
    hazard_labels_required = fields.TextField(
        attr='hazard_labels_required',
        analyzer=standard_analyzer,
    )
    
    special_provisions = fields.TextField(
        attr='special_provisions',
        analyzer=standard_analyzer,
    )
    
    limited_quantities_exception = fields.TextField(
        attr='limited_quantities_exception',
        analyzer=standard_analyzer,
    )
    
    excepted_quantities_exception = fields.TextField(
        attr='excepted_quantities_exception',
        analyzer=standard_analyzer,
    )
    
    # Physical properties
    physical_form = fields.KeywordField(attr='physical_form')
    flash_point_celsius = fields.FloatField(attr='flash_point_celsius')
    
    # Additional searchable fields
    technical_name = fields.TextField(
        attr='technical_name',
        analyzer=standard_analyzer,
        fields={
            'autocomplete': fields.TextField(analyzer=autocomplete_analyzer),
        }
    )
    
    cas_number = fields.KeywordField(attr='cas_number')
    
    # Meta fields for filtering and sorting
    is_active = fields.BooleanField(attr='is_active')
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    
    # Combined search field for multi-field queries
    combined_text = fields.TextField(
        analyzer=standard_analyzer,
        fields={
            'autocomplete': fields.TextField(analyzer=autocomplete_analyzer),
        }
    )
    
    def prepare_combined_text(self, instance):
        """
        Combine multiple fields for comprehensive text search
        """
        text_parts = [
            instance.un_number or '',
            instance.proper_shipping_name or '',
            instance.simplified_name or '',
            instance.technical_name or '',
            instance.hazard_class or '',
            instance.subsidiary_risks or '',
            instance.cas_number or '',
        ]
        return ' '.join(filter(None, text_parts))
    
    class Django:
        model = DangerousGood
        fields = [
            'id',
        ]
        
        # Related fields
        related_models = []
        
    class Index:
        name = 'dangerous_goods'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'max_result_window': 10000,
        }