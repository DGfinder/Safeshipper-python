# dangerous_goods/serializers.py
from rest_framework import serializers
from .models import DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule, PackingGroup

class DangerousGoodSerializer(serializers.ModelSerializer):
    packing_group_display = serializers.CharField(source='get_packing_group_display', read_only=True)
    # If you want to show synonyms directly in the DG list/detail:
    # synonyms = DGProductSynonymSerializer(many=True, read_only=True) # See DGProductSynonymSerializer below

    class Meta:
        model = DangerousGood
        fields = [
            'id',
            'un_number',
            'proper_shipping_name',
            'simplified_name',
            'hazard_class',
            'subsidiary_risks',
            'packing_group',
            'packing_group_display',
            'hazard_labels_required',
            'erg_guide_number',
            'special_provisions',
            'qty_ltd_passenger_aircraft',
            'packing_instruction_passenger_aircraft',
            'qty_ltd_cargo_aircraft',
            'packing_instruction_cargo_aircraft',
            'description_notes',
            'is_marine_pollutant',
            'is_environmentally_hazardous',
            # 'synonyms', # if adding the nested serializer above
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'packing_group_display')

class DGProductSynonymSerializer(serializers.ModelSerializer):
    # To avoid sending the full DangerousGood object when listing/retrieving synonyms,
    # you can use PrimaryKeyRelatedField for writing and a string representation for reading.
    dangerous_good_un_number = serializers.CharField(source='dangerous_good.un_number', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)

    class Meta:
        model = DGProductSynonym
        fields = [
            'id',
            'dangerous_good', # This will be a PK for write operations
            'dangerous_good_un_number', # Read-only context
            'synonym',
            'source',
            'source_display', # Read-only context
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'dangerous_good_un_number', 'source_display')

    def validate_synonym(self, value):
        # Example: ensure synonym isn't excessively long or empty
        if not value.strip():
            raise serializers.ValidationError("Synonym cannot be empty.")
        if len(value) > 255:
            raise serializers.ValidationError("Synonym is too long.")
        return value

class SegregationGroupSerializer(serializers.ModelSerializer):
    # For ManyToManyField 'dangerous_goods', DRF handles it by expecting a list of PKs on write.
    # For reading, it will also output a list of PKs by default.
    # If you want to output more detailed DG info, you can use a nested serializer:
    # dangerous_goods = DangerousGoodSerializer(many=True, read_only=True) # For read-only display
    # Or, use PrimaryKeyRelatedField for writing and a string representation for reading.
    
    dangerous_goods_uris = serializers.PrimaryKeyRelatedField(
        queryset=DangerousGood.objects.all(), 
        many=True, 
        source='dangerous_goods', # map to the model field
        required=False # Make it optional if groups can be created without DGs initially
    )

    class Meta:
        model = SegregationGroup
        fields = [
            'id',
            'code',
            'name',
            'description',
            'dangerous_goods_uris', # Use this for create/update with PKs
            # 'dangerous_goods', # If using a nested serializer for GET responses
        ]
        read_only_fields = ('id',)

class SegregationRuleSerializer(serializers.ModelSerializer):
    rule_type_display = serializers.CharField(source='get_rule_type_display', read_only=True)
    compatibility_status_display = serializers.CharField(source='get_compatibility_status_display', read_only=True)
    
    # For ForeignKey fields, default is PrimaryKeyRelatedField which is good for write.
    # For read, you might want more info, e.g., the group name.
    primary_segregation_group_details = SegregationGroupSerializer(source='primary_segregation_group', read_only=True)
    secondary_segregation_group_details = SegregationGroupSerializer(source='secondary_segregation_group', read_only=True)

    class Meta:
        model = SegregationRule
        fields = [
            'id',
            'rule_type',
            'rule_type_display',
            'primary_hazard_class',
            'secondary_hazard_class',
            'primary_segregation_group', # Writable FK (expects PK)
            'primary_segregation_group_details', # Read-only nested details
            'secondary_segregation_group', # Writable FK (expects PK)
            'secondary_segregation_group_details', # Read-only nested details
            'compatibility_status',
            'compatibility_status_display',
            'notes',
        ]
        read_only_fields = (
            'id', 'rule_type_display', 'compatibility_status_display', 
            'primary_segregation_group_details', 'secondary_segregation_group_details'
        )

    def validate(self, data):
        rule_type = data.get('rule_type')
        primary_class = data.get('primary_hazard_class')
        secondary_class = data.get('secondary_hazard_class')
        primary_group = data.get('primary_segregation_group')
        secondary_group = data.get('secondary_segregation_group')

        if rule_type == SegregationRule.RuleType.CLASS_TO_CLASS:
            if not primary_class or not secondary_class:
                raise serializers.ValidationError("For Class vs Class rules, both primary and secondary hazard classes are required.")
            if primary_group or secondary_group:
                raise serializers.ValidationError("Segregation groups should not be set for Class vs Class rules.")
        elif rule_type == SegregationRule.RuleType.GROUP_TO_GROUP:
            if not primary_group or not secondary_group:
                raise serializers.ValidationError("For Group vs Group rules, both primary and secondary segregation groups are required.")
            if primary_class or secondary_class:
                raise serializers.ValidationError("Hazard classes should not be set for Group vs Group rules.")
        # Add validation for other rule_types if implemented
        return data
