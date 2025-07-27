# documents/documents.py
from django_elasticsearch_dsl import Document, Index, fields
from elasticsearch_dsl import analyzer
from .models import Document as DocumentModel

# Define custom analyzers
text_analyzer = analyzer(
    'text_analyzer',
    tokenizer='standard',
    filter=['lowercase', 'stop', 'snowball']
)

filename_analyzer = analyzer(
    'filename_analyzer',
    tokenizer='keyword',
    filter=['lowercase']
)

# Define the Elasticsearch index
documents_index = Index('documents')
documents_index.settings(
    number_of_shards=1,
    number_of_replicas=0
)

@documents_index.doc_type
class DocumentDocument(Document):
    """
    Elasticsearch document for Document model to enable full-text search of document metadata
    """
    
    # Core identification
    id = fields.KeywordField(attr='id')
    document_type = fields.KeywordField(attr='document_type')
    status = fields.KeywordField(attr='status')
    
    # File information
    original_filename = fields.TextField(
        attr='original_filename',
        analyzer=filename_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    
    file_size = fields.IntegerField(attr='file_size')
    file_hash = fields.KeywordField(attr='file_hash')
    mime_type = fields.KeywordField(attr='mime_type')
    
    # Metadata
    title = fields.TextField(
        attr='title',
        analyzer=text_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    
    description = fields.TextField(
        attr='description',
        analyzer=text_analyzer,
    )
    
    # Processing information
    validation_errors = fields.TextField(
        attr='validation_errors',
        analyzer=text_analyzer,
    )
    
    processing_notes = fields.TextField(
        attr='processing_notes',
        analyzer=text_analyzer,
    )
    
    # Extracted content (if available)
    extracted_text = fields.TextField(
        attr='extracted_text',
        analyzer=text_analyzer,
    )
    
    # Relationships
    shipment_id = fields.KeywordField()
    uploaded_by_id = fields.KeywordField()
    
    # Timestamps
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    processed_at = fields.DateField(attr='processed_at')
    
    # Combined search field
    combined_content = fields.TextField(
        analyzer=text_analyzer,
        fields={
            'autocomplete': fields.TextField(analyzer='autocomplete_analyzer'),
        }
    )
    
    def prepare_shipment_id(self, instance):
        """Get shipment ID if related shipment exists"""
        return str(instance.shipment.id) if instance.shipment else None
    
    def prepare_uploaded_by_id(self, instance):
        """Get uploader ID if user exists"""
        return str(instance.uploaded_by.id) if instance.uploaded_by else None
    
    def prepare_combined_content(self, instance):
        """
        Combine searchable fields for comprehensive search
        """
        content_parts = [
            instance.original_filename or '',
            instance.title or '',
            instance.description or '',
            instance.document_type or '',
            instance.processing_notes or '',
            instance.extracted_text or '',
        ]
        return ' '.join(filter(None, content_parts))
    
    class Django:
        model = DocumentModel
        fields = []
        
        # Related models that should trigger reindexing
        related_models = []
        
    class Index:
        name = 'documents'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'max_result_window': 10000,
        }