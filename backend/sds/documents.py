# sds/documents.py
from django_elasticsearch_dsl import Document, Index, fields
from elasticsearch_dsl import analyzer
from .models import SafetyDataSheet, SDSRequest

# Define custom analyzers for better search
chemical_analyzer = analyzer(
    'chemical_analyzer',
    tokenizer='standard',
    filter=['lowercase', 'stop', 'snowball']
)

sds_autocomplete_analyzer = analyzer(
    'sds_autocomplete_analyzer',
    tokenizer='edge_ngram',
    filter=['lowercase']
)

# Define the Elasticsearch index
sds_index = Index('safety_data_sheets')
sds_index.settings(
    number_of_shards=1,
    number_of_replicas=0,
    max_result_window=10000
)

@sds_index.doc_type
class SafetyDataSheetDocument(Document):
    """
    Elasticsearch document for SafetyDataSheet model to enable full-text search
    """
    
    # Product identification
    product_name = fields.TextField(
        attr='product_name',
        analyzer=chemical_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'autocomplete': fields.TextField(analyzer=sds_autocomplete_analyzer),
            'suggest': fields.CompletionField(),
        }
    )
    
    manufacturer = fields.TextField(
        attr='manufacturer',
        analyzer=chemical_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'autocomplete': fields.TextField(analyzer=sds_autocomplete_analyzer),
        }
    )
    
    manufacturer_code = fields.TextField(
        attr='manufacturer_code',
        analyzer=chemical_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    # Dangerous goods reference
    dangerous_good_un_number = fields.TextField(
        attr='dangerous_good.un_number',
        analyzer=chemical_analyzer,
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    
    dangerous_good_proper_shipping_name = fields.TextField(
        attr='dangerous_good.proper_shipping_name',
        analyzer=chemical_analyzer,
        fields={
            'autocomplete': fields.TextField(analyzer=sds_autocomplete_analyzer),
        }
    )
    
    dangerous_good_hazard_class = fields.KeywordField(
        attr='dangerous_good.hazard_class'
    )
    
    dangerous_good_packing_group = fields.KeywordField(
        attr='dangerous_good.packing_group'
    )
    
    # Document metadata
    version = fields.KeywordField(attr='version')
    revision_date = fields.DateField(attr='revision_date')
    status = fields.KeywordField(attr='status')
    language = fields.KeywordField(attr='language')
    country_code = fields.KeywordField(attr='country_code')
    regulatory_standard = fields.KeywordField(attr='regulatory_standard')
    
    # Physical properties
    physical_state = fields.KeywordField(attr='physical_state')
    color = fields.TextField(
        attr='color',
        analyzer=chemical_analyzer
    )
    odor = fields.TextField(
        attr='odor',
        analyzer=chemical_analyzer
    )
    
    # Safety properties
    flash_point_celsius = fields.FloatField(attr='flash_point_celsius')
    auto_ignition_temp_celsius = fields.FloatField(attr='auto_ignition_temp_celsius')
    ph_value_min = fields.FloatField(attr='ph_value_min')
    ph_value_max = fields.FloatField(attr='ph_value_max')
    
    # Safety information (searchable text fields)
    hazard_statements = fields.TextField(
        analyzer=chemical_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    precautionary_statements = fields.TextField(
        analyzer=chemical_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    # Emergency and handling information
    first_aid_measures = fields.TextField(
        analyzer=chemical_analyzer
    )
    
    fire_fighting_measures = fields.TextField(
        analyzer=chemical_analyzer
    )
    
    spill_cleanup_procedures = fields.TextField(
        attr='spill_cleanup_procedures',
        analyzer=chemical_analyzer
    )
    
    storage_requirements = fields.TextField(
        attr='storage_requirements',
        analyzer=chemical_analyzer
    )
    
    handling_precautions = fields.TextField(
        attr='handling_precautions',
        analyzer=chemical_analyzer
    )
    
    disposal_methods = fields.TextField(
        attr='disposal_methods',
        analyzer=chemical_analyzer
    )
    
    # Meta fields
    is_active = fields.BooleanField()
    is_expired = fields.BooleanField()
    is_current = fields.BooleanField()
    days_until_expiration = fields.IntegerField()
    
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    
    # Combined search field for multi-field queries
    combined_text = fields.TextField(
        analyzer=chemical_analyzer,
        fields={
            'autocomplete': fields.TextField(analyzer=sds_autocomplete_analyzer),
        }
    )
    
    def prepare_hazard_statements(self, instance):
        """Convert hazard statements JSON to searchable text"""
        if not instance.hazard_statements:
            return ""
        
        if isinstance(instance.hazard_statements, list):
            return " ".join(str(stmt) for stmt in instance.hazard_statements)
        elif isinstance(instance.hazard_statements, dict):
            text_parts = []
            for key, value in instance.hazard_statements.items():
                text_parts.append(str(key))
                if isinstance(value, (list, tuple)):
                    text_parts.extend(str(v) for v in value)
                else:
                    text_parts.append(str(value))
            return " ".join(text_parts)
        
        return str(instance.hazard_statements)
    
    def prepare_precautionary_statements(self, instance):
        """Convert precautionary statements JSON to searchable text"""
        if not instance.precautionary_statements:
            return ""
        
        if isinstance(instance.precautionary_statements, list):
            return " ".join(str(stmt) for stmt in instance.precautionary_statements)
        elif isinstance(instance.precautionary_statements, dict):
            text_parts = []
            for key, value in instance.precautionary_statements.items():
                text_parts.append(str(key))
                if isinstance(value, (list, tuple)):
                    text_parts.extend(str(v) for v in value)
                else:
                    text_parts.append(str(value))
            return " ".join(text_parts)
        
        return str(instance.precautionary_statements)
    
    def prepare_first_aid_measures(self, instance):
        """Convert first aid measures JSON to searchable text"""
        if not instance.first_aid_measures:
            return ""
        
        if isinstance(instance.first_aid_measures, dict):
            text_parts = []
            for key, value in instance.first_aid_measures.items():
                text_parts.append(str(key))
                text_parts.append(str(value))
            return " ".join(text_parts)
        
        return str(instance.first_aid_measures)
    
    def prepare_fire_fighting_measures(self, instance):
        """Convert fire fighting measures JSON to searchable text"""
        if not instance.fire_fighting_measures:
            return ""
        
        if isinstance(instance.fire_fighting_measures, dict):
            text_parts = []
            for key, value in instance.fire_fighting_measures.items():
                text_parts.append(str(key))
                text_parts.append(str(value))
            return " ".join(text_parts)
        
        return str(instance.fire_fighting_measures)
    
    def prepare_is_active(self, instance):
        """Check if SDS is active"""
        return instance.status == 'ACTIVE'
    
    def prepare_is_expired(self, instance):
        """Check if SDS is expired"""
        return instance.is_expired
    
    def prepare_is_current(self, instance):
        """Check if SDS is current"""
        return instance.is_current
    
    def prepare_days_until_expiration(self, instance):
        """Get days until expiration"""
        return instance.days_until_expiration
    
    def prepare_combined_text(self, instance):
        """
        Combine multiple fields for comprehensive text search
        """
        text_parts = [
            instance.product_name or '',
            instance.manufacturer or '',
            instance.manufacturer_code or '',
            getattr(instance.dangerous_good, 'un_number', '') or '',
            getattr(instance.dangerous_good, 'proper_shipping_name', '') or '',
            getattr(instance.dangerous_good, 'simplified_name', '') or '',
            getattr(instance.dangerous_good, 'technical_name', '') or '',
            getattr(instance.dangerous_good, 'hazard_class', '') or '',
            instance.physical_state or '',
            instance.color or '',
            instance.odor or '',
            instance.spill_cleanup_procedures or '',
            instance.storage_requirements or '',
            instance.handling_precautions or '',
            instance.disposal_methods or '',
        ]
        
        # Add JSON field content
        if instance.hazard_statements:
            text_parts.append(self.prepare_hazard_statements(instance))
        
        if instance.precautionary_statements:
            text_parts.append(self.prepare_precautionary_statements(instance))
        
        if instance.first_aid_measures:
            text_parts.append(self.prepare_first_aid_measures(instance))
        
        if instance.fire_fighting_measures:
            text_parts.append(self.prepare_fire_fighting_measures(instance))
        
        return ' '.join(filter(None, text_parts))
    
    class Django:
        model = SafetyDataSheet
        fields = [
            'id',
        ]
        
        # Related fields
        related_models = ['dangerous_good']
        
    class Index:
        name = 'safety_data_sheets'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'max_result_window': 10000,
        }


# SDS Request index for tracking search needs
sds_request_index = Index('sds_requests')
sds_request_index.settings(
    number_of_shards=1,
    number_of_replicas=0
)

@sds_request_index.doc_type
class SDSRequestDocument(Document):
    """
    Elasticsearch document for SDSRequest model to track missing SDS needs
    """
    
    # Product identification
    product_name = fields.TextField(
        attr='product_name',
        analyzer=chemical_analyzer,
        fields={
            'autocomplete': fields.TextField(analyzer=sds_autocomplete_analyzer),
        }
    )
    
    manufacturer = fields.TextField(
        attr='manufacturer',
        analyzer=chemical_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    # Dangerous goods reference
    dangerous_good_un_number = fields.TextField(
        attr='dangerous_good.un_number',
        fields={
            'raw': fields.KeywordField(),
        }
    )
    
    dangerous_good_proper_shipping_name = fields.TextField(
        attr='dangerous_good.proper_shipping_name',
        analyzer=chemical_analyzer
    )
    
    # Request metadata
    requested_by = fields.KeywordField(attr='requested_by.username')
    language = fields.KeywordField(attr='language')
    country_code = fields.KeywordField(attr='country_code')
    urgency = fields.KeywordField(attr='urgency')
    status = fields.KeywordField(attr='status')
    
    justification = fields.TextField(
        attr='justification',
        analyzer=chemical_analyzer
    )
    
    notes = fields.TextField(
        attr='notes',
        analyzer=chemical_analyzer
    )
    
    created_at = fields.DateField(attr='created_at')
    updated_at = fields.DateField(attr='updated_at')
    completed_at = fields.DateField(attr='completed_at')
    
    class Django:
        model = SDSRequest
        fields = [
            'id',
        ]
        
        # Related fields
        related_models = ['dangerous_good', 'requested_by']
        
    class Index:
        name = 'sds_requests'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
        }