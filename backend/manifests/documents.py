# manifests/documents.py
from django_elasticsearch_dsl import Document, Index, fields
from elasticsearch_dsl import analyzer, normalizer
from .models import Manifest, ManifestDangerousGoodMatch

# Define analyzers
manifest_analyzer = analyzer(
    'manifest_analyzer',
    tokenizer='standard',
    filter=['lowercase', 'stop', 'snowball']
)

keyword_normalizer = normalizer(
    'keyword_normalizer',
    filter=['lowercase']
)

# Define the Elasticsearch index
manifests_index = Index('manifests')
manifests_index.settings(
    number_of_shards=1,
    number_of_replicas=0
)

@manifests_index.doc_type
class ManifestDocument(Document):
    """
    Elasticsearch document for Manifest model to enable search across manifest data
    """
    
    # Core identification
    id = fields.KeywordField(attr='id')
    manifest_type = fields.KeywordField(attr='manifest_type')
    status = fields.KeywordField(attr='status')
    
    # Document relationship
    document_id = fields.KeywordField()
    document_filename = fields.TextField(
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(normalizer=keyword_normalizer),
        }
    )
    
    # Shipment relationship
    shipment_id = fields.KeywordField()
    shipment_reference = fields.TextField(
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    
    # Timestamps
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    
    # Analysis information
    analysis_started_at = fields.DateField(attr='analysis_started_at')
    analysis_completed_at = fields.DateField(attr='analysis_completed_at')
    confirmed_at = fields.DateField(attr='confirmed_at')
    finalized_at = fields.DateField(attr='finalized_at')
    
    # Aggregated item information
    total_items = fields.IntegerField()
    dangerous_goods_count = fields.IntegerField()
    hazard_classes = fields.KeywordField()
    un_numbers = fields.KeywordField()
    
    # Combined search content
    combined_content = fields.TextField(
        analyzer=manifest_analyzer,
    )
    
    def prepare_document_id(self, instance):
        """Get document ID"""
        return str(instance.document.id) if instance.document else None
    
    def prepare_document_filename(self, instance):
        """Get document filename"""
        return instance.document.original_filename if instance.document else None
    
    def prepare_shipment_id(self, instance):
        """Get shipment ID"""
        return str(instance.shipment.id) if instance.shipment else None
    
    def prepare_shipment_reference(self, instance):
        """Get shipment reference"""
        return instance.shipment.reference_number if instance.shipment else None
    
    def prepare_total_items(self, instance):
        """Count total manifest dangerous good matches"""
        return instance.dg_matches.count()
    
    def prepare_dangerous_goods_count(self, instance):
        """Count dangerous goods matches"""
        return instance.dg_matches.count()
    
    def prepare_hazard_classes(self, instance):
        """Get unique hazard classes from dangerous good matches"""
        classes = instance.dg_matches.values_list(
            'dangerous_good__hazard_class', flat=True
        ).distinct()
        return list(classes)
    
    def prepare_un_numbers(self, instance):
        """Get unique UN numbers from dangerous good matches"""
        un_numbers = instance.dg_matches.values_list(
            'dangerous_good__un_number', flat=True
        ).distinct()
        return list(un_numbers)
    
    def prepare_combined_content(self, instance):
        """
        Combine searchable fields for comprehensive search
        """
        content_parts = []
        
        # Add document filename if available
        if instance.document:
            content_parts.append(instance.document.original_filename or '')
        
        # Add shipment reference if available
        if instance.shipment:
            content_parts.append(instance.shipment.reference_number or '')
        
        # Add dangerous goods information from matches
        for match in instance.dg_matches.all():
            if match.dangerous_good:
                content_parts.extend([
                    match.dangerous_good.un_number or '',
                    match.dangerous_good.proper_shipping_name or '',
                    match.dangerous_good.simplified_name or '',
                ])
            content_parts.append(match.found_text or '')
        
        return ' '.join(filter(None, content_parts))
    
    class Django:
        model = Manifest
        fields = []
        
        # Related models that should trigger reindexing
        related_models = ['documents.Document', 'shipments.Shipment']
        
    class Index:
        name = 'manifests'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'max_result_window': 10000,
        }


# Define manifest dangerous goods matches index
manifest_dg_matches_index = Index('manifest_dg_matches')
manifest_dg_matches_index.settings(
    number_of_shards=1,
    number_of_replicas=0
)

@manifest_dg_matches_index.doc_type
class ManifestDangerousGoodMatchDocument(Document):
    """
    Elasticsearch document for ManifestDangerousGoodMatch model for detailed match search
    """
    
    # Core identification
    id = fields.KeywordField(attr='id')
    manifest_id = fields.KeywordField()
    
    # Match information
    found_text = fields.TextField(
        attr='found_text',
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    match_type = fields.KeywordField(attr='match_type')
    confidence_score = fields.FloatField(attr='confidence_score')
    
    # Dangerous goods information
    dangerous_good_id = fields.KeywordField()
    un_number = fields.KeywordField()
    proper_shipping_name = fields.TextField(analyzer=manifest_analyzer)
    hazard_class = fields.KeywordField()
    packing_group = fields.KeywordField()
    
    # Confirmation status
    is_confirmed = fields.BooleanField(attr='is_confirmed')
    
    # Position information
    page_number = fields.IntegerField(attr='page_number')
    
    # Timestamps
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    confirmed_at = fields.DateField(attr='confirmed_at')
    
    def prepare_manifest_id(self, instance):
        """Get manifest ID"""
        return str(instance.manifest.id) if instance.manifest else None
    
    def prepare_dangerous_good_id(self, instance):
        """Get dangerous good ID"""
        return str(instance.dangerous_good.id) if instance.dangerous_good else None
    
    def prepare_un_number(self, instance):
        """Get UN number from dangerous good"""
        return instance.dangerous_good.un_number if instance.dangerous_good else None
    
    def prepare_proper_shipping_name(self, instance):
        """Get proper shipping name from dangerous good"""
        return instance.dangerous_good.proper_shipping_name if instance.dangerous_good else None
    
    def prepare_hazard_class(self, instance):
        """Get hazard class from dangerous good"""
        return instance.dangerous_good.hazard_class if instance.dangerous_good else None
    
    def prepare_packing_group(self, instance):
        """Get packing group from dangerous good"""
        return instance.dangerous_good.packing_group if instance.dangerous_good else None
    
    class Django:
        model = ManifestDangerousGoodMatch
        fields = []
        
        # Related models that should trigger reindexing
        related_models = ['manifests.Manifest', 'dangerous_goods.DangerousGood']
        
    class Index:
        name = 'manifest_dg_matches'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'max_result_window': 10000,
        }