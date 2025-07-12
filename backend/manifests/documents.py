# manifests/documents.py
from django_elasticsearch_dsl import Document, Index, fields
from elasticsearch_dsl import analyzer, normalizer
from .models import Manifest, ManifestItem

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
    
    # Manifest metadata
    manifest_number = fields.TextField(
        attr='manifest_number',
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    
    origin_location = fields.TextField(
        attr='origin_location',
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    destination_location = fields.TextField(
        attr='destination_location',
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    transport_mode = fields.KeywordField(attr='transport_mode')
    carrier_name = fields.TextField(
        attr='carrier_name',
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    # Processing information
    ai_confidence_score = fields.FloatField(attr='ai_confidence_score')
    requires_manual_review = fields.BooleanField(attr='requires_manual_review')
    
    processing_notes = fields.TextField(
        attr='processing_notes',
        analyzer=manifest_analyzer,
    )
    
    validation_errors = fields.TextField(
        attr='validation_errors',
        analyzer=manifest_analyzer,
    )
    
    # Timestamps
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    processed_at = fields.DateField(attr='processed_at')
    
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
        """Count total manifest items"""
        return instance.items.count()
    
    def prepare_dangerous_goods_count(self, instance):
        """Count dangerous goods items"""
        return instance.items.filter(dangerous_good__isnull=False).count()
    
    def prepare_hazard_classes(self, instance):
        """Get unique hazard classes from items"""
        classes = instance.items.filter(
            dangerous_good__isnull=False
        ).values_list(
            'dangerous_good__hazard_class', flat=True
        ).distinct()
        return list(classes)
    
    def prepare_un_numbers(self, instance):
        """Get unique UN numbers from items"""
        un_numbers = instance.items.filter(
            dangerous_good__isnull=False
        ).values_list(
            'dangerous_good__un_number', flat=True
        ).distinct()
        return list(un_numbers)
    
    def prepare_combined_content(self, instance):
        """
        Combine searchable fields for comprehensive search
        """
        content_parts = [
            instance.manifest_number or '',
            instance.origin_location or '',
            instance.destination_location or '',
            instance.carrier_name or '',
            instance.processing_notes or '',
        ]
        
        # Add document filename if available
        if instance.document:
            content_parts.append(instance.document.original_filename or '')
        
        # Add shipment reference if available
        if instance.shipment:
            content_parts.append(instance.shipment.reference_number or '')
        
        # Add dangerous goods information
        for item in instance.items.all():
            if item.dangerous_good:
                content_parts.extend([
                    item.dangerous_good.un_number or '',
                    item.dangerous_good.proper_shipping_name or '',
                    item.dangerous_good.simplified_name or '',
                ])
            content_parts.append(item.item_description or '')
        
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


# Define manifest items index
manifest_items_index = Index('manifest_items')
manifest_items_index.settings(
    number_of_shards=1,
    number_of_replicas=0
)

@manifest_items_index.doc_type
class ManifestItemDocument(Document):
    """
    Elasticsearch document for ManifestItem model for detailed item search
    """
    
    # Core identification
    id = fields.KeywordField(attr='id')
    manifest_id = fields.KeywordField()
    
    # Item information
    item_description = fields.TextField(
        attr='item_description',
        analyzer=manifest_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    quantity = fields.FloatField(attr='quantity')
    unit = fields.KeywordField(attr='unit')
    weight_kg = fields.FloatField(attr='weight_kg')
    
    # Dangerous goods information
    dangerous_good_id = fields.KeywordField()
    un_number = fields.KeywordField()
    proper_shipping_name = fields.TextField(analyzer=manifest_analyzer)
    hazard_class = fields.KeywordField()
    packing_group = fields.KeywordField()
    
    # Classification
    is_dangerous_good = fields.BooleanField(attr='is_dangerous_good')
    requires_review = fields.BooleanField(attr='requires_review')
    confidence_score = fields.FloatField(attr='confidence_score')
    
    # Processing information
    classification_method = fields.KeywordField(attr='classification_method')
    manual_override = fields.BooleanField(attr='manual_override')
    review_notes = fields.TextField(
        attr='review_notes',
        analyzer=manifest_analyzer,
    )
    
    # Timestamps
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    
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
        model = ManifestItem
        fields = []
        
        # Related models that should trigger reindexing
        related_models = ['manifests.Manifest', 'dangerous_goods.DangerousGood']
        
    class Index:
        name = 'manifest_items'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'max_result_window': 10000,
        }