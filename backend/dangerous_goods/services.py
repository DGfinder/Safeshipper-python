# dangerous_goods/services.py
from typing import List, Optional, Dict, Union, Set
from .models import DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule, PackingGroup, PHSegregationRule, ChemicalReactivityProfile
# Import at function level to avoid circular imports
from django.db.models import Q
from .safety_rules import ( # Import from our new safety_rules module
    get_all_hazard_classes_for_dg,
    check_item_fire_risk_conflict_with_oxidizer,
    check_item_food_sensitivity_conflict,
    check_item_bulk_incompatibility
)
from django.core.exceptions import ObjectDoesNotExist # Corrected import

def get_dangerous_good_by_un_number(un_number: str) -> Optional[DangerousGood]:
    try:
        return DangerousGood.objects.get(un_number__iexact=un_number)
    except DangerousGood.DoesNotExist:
        return None

def find_dangerous_goods(query: str) -> List[DangerousGood]:
    return list(DangerousGood.objects.filter(
        Q(un_number__icontains=query) |
        Q(proper_shipping_name__icontains=query) |
        Q(simplified_name__icontains=query)
    ).distinct())

def match_synonym_to_dg(text: str) -> Optional[DangerousGood]:
    synonym_match = DGProductSynonym.objects.filter(synonym__iexact=text).select_related('dangerous_good').first()
    if synonym_match:
        return synonym_match.dangerous_good
    dg_match = DangerousGood.objects.filter(
        Q(proper_shipping_name__iexact=text) | Q(simplified_name__iexact=text)
    ).first()
    if dg_match:
        return dg_match
    return None

def find_dgs_by_text_search(text_content: str) -> List[Dict[str, Union[DangerousGood, str, float]]]:
    """
    Efficiently search for dangerous goods by analyzing text content using multi-pass scanning.
    
    Args:
        text_content: The text content to analyze for dangerous goods
        
    Returns:
        List of dictionaries containing:
            - dangerous_good: DangerousGood object
            - matched_term: The synonym or name that triggered the match
            - confidence: Confidence score (0.0-1.0)
            - match_type: Type of match ('un_number', 'proper_name', 'simplified_name', 'synonym')
    """
    import re
    from difflib import SequenceMatcher
    
    results = []
    text_lower = text_content.lower()
    
    # Pre-load all synonyms with their dangerous goods in a single query
    synonyms_query = DGProductSynonym.objects.select_related('dangerous_good').all()
    synonym_mapping = {}
    for synonym_obj in synonyms_query:
        synonym_mapping[synonym_obj.synonym.lower()] = {
            'dangerous_good': synonym_obj.dangerous_good,
            'original_synonym': synonym_obj.synonym
        }
    
    # Pre-load all dangerous goods for direct name matching
    dangerous_goods = DangerousGood.objects.all()
    
    # Pass 1: Exact UN number matching (highest confidence)
    un_pattern = r'\bUN\s*(\d{4})\b'
    un_matches = re.finditer(un_pattern, text_content, re.IGNORECASE)
    found_un_numbers = set()
    
    for match in un_matches:
        un_number = match.group(1)
        if un_number in found_un_numbers:
            continue
        found_un_numbers.add(un_number)
        
        dg = get_dangerous_good_by_un_number(un_number)
        if dg:
            results.append({
                'dangerous_good': dg,
                'matched_term': f"UN{un_number}",
                'confidence': 1.0,
                'match_type': 'un_number'
            })
    
    # Pass 2: Exact synonym matching (high confidence)
    found_synonyms = set()
    for synonym_lower, synonym_data in synonym_mapping.items():
        if synonym_lower in found_synonyms:
            continue
        
        # Check for exact word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(synonym_lower) + r'\b'
        if re.search(pattern, text_lower):
            found_synonyms.add(synonym_lower)
            results.append({
                'dangerous_good': synonym_data['dangerous_good'],
                'matched_term': synonym_data['original_synonym'],
                'confidence': 0.95,
                'match_type': 'synonym'
            })
    
    # Pass 3: Exact proper shipping name matching (high confidence)
    found_proper_names = set()
    for dg in dangerous_goods:
        if dg.proper_shipping_name.lower() in found_proper_names:
            continue
        
        proper_name_lower = dg.proper_shipping_name.lower()
        pattern = r'\b' + re.escape(proper_name_lower) + r'\b'
        if re.search(pattern, text_lower):
            found_proper_names.add(proper_name_lower)
            # Check if this DG is already found via UN number
            already_found = any(r['dangerous_good'].id == dg.id for r in results)
            if not already_found:
                results.append({
                    'dangerous_good': dg,
                    'matched_term': dg.proper_shipping_name,
                    'confidence': 0.9,
                    'match_type': 'proper_name'
                })
    
    # Pass 4: Fuzzy synonym matching (medium confidence)
    found_fuzzy_synonyms = set()
    for synonym_lower, synonym_data in synonym_mapping.items():
        if len(synonym_lower) < 4:  # Skip very short synonyms for fuzzy matching
            continue
        if synonym_lower in found_synonyms or synonym_lower in found_fuzzy_synonyms:
            continue
        
        # Calculate similarity ratio
        similarity = SequenceMatcher(None, synonym_lower, text_lower).ratio()
        if similarity > 0.8:  # 80% similarity threshold
            found_fuzzy_synonyms.add(synonym_lower)
            # Check if this DG is already found
            already_found = any(r['dangerous_good'].id == synonym_data['dangerous_good'].id for r in results)
            if not already_found:
                results.append({
                    'dangerous_good': synonym_data['dangerous_good'],
                    'matched_term': synonym_data['original_synonym'],
                    'confidence': similarity * 0.8,  # Reduce confidence for fuzzy matches
                    'match_type': 'synonym'
                })
    
    # Pass 5: Fuzzy proper name matching (medium confidence)
    found_fuzzy_names = set()
    for dg in dangerous_goods:
        proper_name_lower = dg.proper_shipping_name.lower()
        if len(proper_name_lower) < 4:  # Skip very short names
            continue
        if proper_name_lower in found_proper_names or proper_name_lower in found_fuzzy_names:
            continue
        
        # Calculate similarity ratio
        similarity = SequenceMatcher(None, proper_name_lower, text_lower).ratio()
        if similarity > 0.8:  # 80% similarity threshold
            found_fuzzy_names.add(proper_name_lower)
            # Check if this DG is already found
            already_found = any(r['dangerous_good'].id == dg.id for r in results)
            if not already_found:
                results.append({
                    'dangerous_good': dg,
                    'matched_term': dg.proper_shipping_name,
                    'confidence': similarity * 0.7,  # Reduce confidence for fuzzy matches
                    'match_type': 'proper_name'
                })
    
    # Sort results by confidence score (highest first)
    results.sort(key=lambda x: x['confidence'], reverse=True)
    
    return results

def lookup_packing_instruction(un_number: str, mode: str = 'air_passenger') -> Optional[str]:
    dg = get_dangerous_good_by_un_number(un_number)
    if not dg: return None
    if mode == 'air_passenger': return dg.packing_instruction_passenger_aircraft
    elif mode == 'air_cargo': return dg.packing_instruction_cargo_aircraft
    return "Packing instruction not available for the specified mode."

def check_dg_compatibility(dg1: DangerousGood, dg2: DangerousGood) -> Dict[str, Union[bool, List[str]]]:
    """
    Checks compatibility between two dangerous goods items based on their hazard classes
    and segregation groups.
    
    Args:
        dg1: First DangerousGood instance
        dg2: Second DangerousGood instance
        
    Returns:
        Dict containing:
            - compatible: bool indicating if the items are compatible
            - reasons: List of strings explaining any incompatibilities
    """
    reasons: List[str] = []
    
    # Get all hazard classes for both DGs (including subsidiary risks)
    dg1_classes: Set[str] = set(get_all_hazard_classes_for_dg(dg1))
    dg2_classes: Set[str] = set(get_all_hazard_classes_for_dg(dg2))
    
    # Check class-to-class rules for all combinations of hazard classes
    for class1 in dg1_classes:
        for class2 in dg2_classes:
            # Check both directions (A vs B and B vs A)
            rules = SegregationRule.objects.filter(
                Q(
                    rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
                    primary_hazard_class=class1,
                    secondary_hazard_class=class2
                ) |
                Q(
                    rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
                    primary_hazard_class=class2,
                    secondary_hazard_class=class1
                )
            ).select_related('primary_segregation_group', 'secondary_segregation_group')
            
            for rule in rules:
                if rule.compatibility_status == SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED:
                    reasons.append(
                        f"Class {class1} is incompatible with class {class2} "
                        f"({rule.get_compatibility_status_display()}): {rule.notes or 'No specific reason provided'}"
                    )
                elif rule.compatibility_status == SegregationRule.Compatibility.CONDITIONAL_NOTES:
                    reasons.append(
                        f"Class {class1} vs class {class2} requires special consideration: {rule.notes}"
                    )
                elif rule.compatibility_status in [
                    SegregationRule.Compatibility.AWAY_FROM,
                    SegregationRule.Compatibility.SEPARATED_FROM
                ]:
                    reasons.append(
                        f"Class {class1} must be {rule.get_compatibility_status_display().lower()} "
                        f"class {class2}: {rule.notes or 'No specific reason provided'}"
                    )
    
    # Check group-to-group rules
    dg1_groups = dg1.segregation_groups.all()
    dg2_groups = dg2.segregation_groups.all()
    
    for group1 in dg1_groups:
        for group2 in dg2_groups:
            # Check both directions (A vs B and B vs A)
            group_rules = SegregationRule.objects.filter(
                Q(
                    rule_type=SegregationRule.RuleType.GROUP_TO_GROUP,
                    primary_segregation_group=group1,
                    secondary_segregation_group=group2
                ) |
                Q(
                    rule_type=SegregationRule.RuleType.GROUP_TO_GROUP,
                    primary_segregation_group=group2,
                    secondary_segregation_group=group1
                )
            ).select_related('primary_segregation_group', 'secondary_segregation_group')
            
            for rule in group_rules:
                if rule.compatibility_status == SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED:
                    reasons.append(
                        f"Group {group1.name} is incompatible with group {group2.name} "
                        f"({rule.get_compatibility_status_display()}): {rule.notes or 'No specific reason provided'}"
                    )
                elif rule.compatibility_status == SegregationRule.Compatibility.CONDITIONAL_NOTES:
                    reasons.append(
                        f"Group {group1.name} vs group {group2.name} requires special consideration: {rule.notes}"
                    )
                elif rule.compatibility_status in [
                    SegregationRule.Compatibility.AWAY_FROM,
                    SegregationRule.Compatibility.SEPARATED_FROM
                ]:
                    reasons.append(
                        f"Group {group1.name} must be {rule.get_compatibility_status_display().lower()} "
                        f"group {group2.name}: {rule.notes or 'No specific reason provided'}"
                    )
    
    # Check class-to-group rules
    for class1 in dg1_classes:
        for group2 in dg2_groups:
            class_group_rules = SegregationRule.objects.filter(
                Q(
                    rule_type=SegregationRule.RuleType.CLASS_TO_GROUP,
                    primary_hazard_class=class1,
                    secondary_segregation_group=group2
                ) |
                Q(
                    rule_type=SegregationRule.RuleType.CLASS_TO_GROUP,
                    primary_segregation_group=group2,
                    secondary_hazard_class=class1
                )
            ).select_related('primary_segregation_group', 'secondary_segregation_group')
            
            for rule in class_group_rules:
                if rule.compatibility_status == SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED:
                    reasons.append(
                        f"Class {class1} is incompatible with group {group2.name} "
                        f"({rule.get_compatibility_status_display()}): {rule.notes or 'No specific reason provided'}"
                    )
                elif rule.compatibility_status == SegregationRule.Compatibility.CONDITIONAL_NOTES:
                    reasons.append(
                        f"Class {class1} vs group {group2.name} requires special consideration: {rule.notes}"
                    )
                elif rule.compatibility_status in [
                    SegregationRule.Compatibility.AWAY_FROM,
                    SegregationRule.Compatibility.SEPARATED_FROM
                ]:
                    reasons.append(
                        f"Class {class1} must be {rule.get_compatibility_status_display().lower()} "
                        f"group {group2.name}: {rule.notes or 'No specific reason provided'}"
                    )
    
    # Check for special conditions
    for rule in SegregationRule.objects.filter(
        Q(condition_type__isnull=False) & ~Q(condition_type=SegregationRule.ConditionType.NONE)
    ).select_related('primary_segregation_group', 'secondary_segregation_group'):
        if rule.condition_type == SegregationRule.ConditionType.BOTH_BULK:
            if dg1.is_bulk_transport_allowed and dg2.is_bulk_transport_allowed:
                reasons.append(f"Both items are bulk: {rule.notes}")
        elif rule.condition_type == SegregationRule.ConditionType.EITHER_BULK:
            if dg1.is_bulk_transport_allowed or dg2.is_bulk_transport_allowed:
                reasons.append(f"One or both items are bulk: {rule.notes}")
        # Add more condition type checks as needed
    
    # Apply additional safety rules from safety_rules.py
    _apply_safety_rules(dg1, dg2, reasons)
    _apply_safety_rules(dg2, dg1, reasons)  # Check both directions
    
    return {
        'compatible': len(reasons) == 0,
        'reasons': reasons
    }

def check_list_compatibility(un_numbers: List[str]) -> Dict[str, Union[bool, List[Dict[str, str]]]]:
    """
    Checks compatibility between a list of UN numbers.
    
    Args:
        un_numbers: List of UN number strings
        
    Returns:
        Dict containing:
            - is_compatible: bool indicating if all items are compatible
            - conflicts: List of conflict dictionaries with un_number_1, un_number_2, and reason
    """
    if len(un_numbers) < 2:
        return {
            'is_compatible': True,
            'conflicts': []
        }
    
    conflicts = []
    
    # Get DangerousGood objects for all UN numbers
    dg_objects = {}
    for un_number in un_numbers:
        dg = get_dangerous_good_by_un_number(un_number)
        if not dg:
            conflicts.append({
                'un_number_1': un_number,
                'un_number_2': '',
                'reason': f'UN Number {un_number} not found in database'
            })
        else:
            dg_objects[un_number] = dg
    
    # Check all pairwise combinations
    processed_pairs = set()
    for i, un1 in enumerate(un_numbers):
        for j, un2 in enumerate(un_numbers[i+1:], i+1):
            # Skip if either UN number was not found
            if un1 not in dg_objects or un2 not in dg_objects:
                continue
                
            # Avoid checking the same pair twice
            pair_key = tuple(sorted([un1, un2]))
            if pair_key in processed_pairs:
                continue
            processed_pairs.add(pair_key)
            
            dg1 = dg_objects[un1]
            dg2 = dg_objects[un2]
            
            compatibility_result = check_dg_compatibility(dg1, dg2)
            
            if not compatibility_result['compatible']:
                for reason in compatibility_result['reasons']:
                    conflicts.append({
                        'un_number_1': un1,
                        'un_number_2': un2,
                        'reason': reason
                    })
    
    return {
        'is_compatible': len(conflicts) == 0,
        'conflicts': conflicts
    }


def check_dg_compatibility_multiple(dg_items: List[DangerousGood]) -> Dict[str, Union[bool, List[str]]]:
    """
    Checks compatibility between multiple dangerous goods items.
    
    Args:
        dg_items: List of DangerousGood instances
        
    Returns:
        Dict containing:
            - compatible: bool indicating if all items are compatible
            - reasons: List of strings explaining any incompatibilities
    """
    if len(dg_items) < 2:
        return {
            'compatible': True,
            'reasons': []
        }
    
    all_reasons: List[str] = []
    
    # Check all pairwise combinations
    for i, dg1 in enumerate(dg_items):
        for j, dg2 in enumerate(dg_items[i+1:], i+1):
            compatibility_result = check_dg_compatibility(dg1, dg2)
            all_reasons.extend(compatibility_result['reasons'])
    
    # Apply group-level safety rules if available
    try:
        _apply_group_safety_rules(dg_items, all_reasons)
    except:
        # Skip group safety rules if functions are not available
        pass
    
    return {
        'compatible': len(all_reasons) == 0,
        'reasons': all_reasons
    }

def _apply_safety_rules(dg1: DangerousGood, dg2: DangerousGood, reasons: List[str]) -> None:
    """
    Apply additional safety rules from safety_rules.py to the compatibility check.
    
    Args:
        dg1: First dangerous good item
        dg2: Second dangerous good item
        reasons: List to append any incompatibility reasons
    """
    try:
        # Check fire risk vs oxidizer conflict
        is_incompatible, reason = check_item_fire_risk_conflict_with_oxidizer(dg1, [dg2])
        if is_incompatible and reason:
            reasons.append(reason)
        
        # Check food sensitivity conflict
        is_incompatible, reason = check_item_food_sensitivity_conflict(dg1, [dg2])
        if is_incompatible and reason:
            reasons.append(reason)
        
        # Check bulk incompatibility
        if check_item_bulk_incompatibility(dg1, dg2):
            reasons.append(f"Bulk transport incompatibility between {dg1.un_number} and {dg2.un_number}")
    except (NameError, AttributeError):
        # Skip if safety rule functions are not available
        pass

def _apply_group_safety_rules(dg_items: List[DangerousGood], reasons: List[str]) -> None:
    """
    Apply group-level safety rules for multiple DG items.
    
    Args:
        dg_items: List of dangerous good items
        reasons: List to append any incompatibility reasons
    """
    # Basic implementation - can be enhanced when more safety rules are available
    try:
        # Check for basic class conflicts
        classes = [dg.hazard_class for dg in dg_items]
        
        # Example: Class 1 (explosives) conflicts with Class 5 (oxidizers)
        if '1' in classes and '5.1' in classes:
            reasons.append("Group incompatibility: Explosives (Class 1) cannot be transported with oxidizers (Class 5.1)")
        
        # Example: Class 3 (flammable liquids) with Class 5.1 (oxidizers)
        if '3' in classes and '5.1' in classes:
            reasons.append("Group incompatibility: Flammable liquids (Class 3) require separation from oxidizers (Class 5.1)")
            
    except Exception:
        # Skip if there are any issues with group safety rules
        pass

# --- Utility function similar to check_compatibility_by_id, but using ConsignmentItems ---
# This would typically live in a test script or a utility module, not directly in services.py
# unless it's a common service operation.

# def check_compatibility_for_consignment_item_ids(item1_id: int, item2_id: int):
#     try:
#         item1 = ConsignmentItem.objects.select_related('dangerous_good_master__segregation_groups').get(id=item1_id)
#         item2 = ConsignmentItem.objects.select_related('dangerous_good_master__segregation_groups').get(id=item2_id)
#     except ConsignmentItem.DoesNotExist:
#         return {"compatible": False, "reasons": ["One or both consignment items not found."]}
#     return check_dg_compatibility(item1, item2)


# === pH-Based Segregation Services ===

def get_ph_segregation_rules_for_value(ph_value: float, target_types: List[str] = None) -> List[PHSegregationRule]:
    """
    Get applicable pH segregation rules for a given pH value.
    
    Args:
        ph_value: The pH value to check rules for
        target_types: Optional list of target types to filter by
        
    Returns:
        List of applicable pH segregation rules
    """
    # Start with all rules
    rules = PHSegregationRule.objects.all()
    
    # Filter by target types if specified
    if target_types:
        rules = rules.filter(target_type__in=target_types)
    
    # Filter to only rules that apply to this pH value
    applicable_rules = []
    for rule in rules:
        if rule.applies_to_ph(ph_value):
            applicable_rules.append(rule)
    
    # Sort by severity (most severe first)
    severity_order = {
        PHSegregationRule.SeverityLevel.PROHIBITED: 0,
        PHSegregationRule.SeverityLevel.CRITICAL: 1,
        PHSegregationRule.SeverityLevel.HIGH: 2,
        PHSegregationRule.SeverityLevel.MEDIUM: 3,
        PHSegregationRule.SeverityLevel.LOW: 4,
        PHSegregationRule.SeverityLevel.CAUTION: 5,
    }
    
    applicable_rules.sort(key=lambda rule: severity_order.get(rule.severity_level, 999))
    
    return applicable_rules


def check_ph_based_food_compatibility(ph_value: float) -> Dict:
    """
    Check compatibility of a pH value with food and food packaging.
    Applies standard Class 8 segregation rules regardless of pH level.
    
    Args:
        ph_value: The pH value to assess
        
    Returns:
        Dictionary with compatibility assessment
    """
    food_target_types = [
        PHSegregationRule.TargetType.FOOD,
        PHSegregationRule.TargetType.FOOD_PACKAGING,
        PHSegregationRule.TargetType.FOOD_GRADE_MATERIALS
    ]
    
    rules = get_ph_segregation_rules_for_value(ph_value, food_target_types)
    
    result = {
        'compatible_with_food': False,  # All Class 8 materials incompatible with food
        'segregation_required': True,   # Always required for Class 8
        'risk_level': 'high',          # Standard Class 8 risk level
        'applicable_rules': [],
        'most_severe_rule': None,
        'min_separation_distance': 5,  # Standard Class 8 separation (3-5m)
        'prohibited_items': [],
        'requirements': [
            'Apply standard Class 8 corrosive segregation from food (3-5 meters)',
            'Follow dangerous goods segregation table requirements'
        ],
        'safety_recommendations': [
            'Use appropriate containment for corrosive materials',
            'Ensure proper ventilation in storage areas',
            'Follow standard dangerous goods protocols'
        ]
    }
    
    if not rules:
        # No specific rules found, apply standard Class 8 food separation
        result['requirements'].append('Standard dangerous goods separation applies - pH level does not enhance food restrictions')
        return result
    
    # Process rules - maintain standard Class 8 food separation regardless of pH
    most_severe_rule = rules[0]  # Rules are sorted by severity
    result['most_severe_rule'] = most_severe_rule
    result['applicable_rules'] = [rule.id for rule in rules]
    
    # All Class 8 materials remain incompatible with food regardless of pH
    # Only collect additional requirements from rules without overriding base separation
    additional_requirements = set(result['requirements'])  # Start with base requirements
    additional_recommendations = set(result['safety_recommendations'])  # Start with base recommendations
    base_distance = result['min_separation_distance']  # Keep standard Class 8 distance
    
    for rule in rules:
        # Add any additional requirements from pH rules
        if rule.requirements:
            additional_requirements.update(rule.requirements)
        if rule.safety_recommendations:
            additional_recommendations.update(rule.safety_recommendations)
        
        # Note: We maintain standard Class 8 food separation distance regardless of pH
        # pH-specific distances only apply to acid-alkali incompatibility, not food separation
        
        if rule.severity_level == PHSegregationRule.SeverityLevel.PROHIBITED:
            if rule.target_type == PHSegregationRule.TargetType.FOOD:
                result['prohibited_items'].append('Food and foodstuffs')
            elif rule.target_type == PHSegregationRule.TargetType.FOOD_PACKAGING:
                result['prohibited_items'].append('Food packaging and containers')
            elif rule.target_type == PHSegregationRule.TargetType.FOOD_GRADE_MATERIALS:
                result['prohibited_items'].append('Food grade materials')
    
    result['requirements'] = list(additional_requirements)
    result['safety_recommendations'] = list(additional_recommendations)
    # Keep standard Class 8 separation distance for food
    result['min_separation_distance'] = base_distance
    
    return result


def get_ph_segregation_recommendations(ph_value: float, target_material_types: List[str] = None) -> Dict:
    """
    Get comprehensive segregation recommendations for a given pH value.
    Focuses on acid-alkali incompatibility with standard Class 8 food separation.
    
    Args:
        ph_value: The pH value to get recommendations for
        target_material_types: Optional list of target material types to check against
        
    Returns:
        Dictionary with segregation recommendations
    """
    if target_material_types is None:
        target_material_types = [choice[0] for choice in PHSegregationRule.TargetType.choices]
    
    rules = get_ph_segregation_rules_for_value(ph_value, target_material_types)
    
    recommendations = {
        'ph_value': ph_value,
        'ph_classification': _classify_ph_value(ph_value),
        'overall_risk_level': 'medium',  # Default for Class 8 materials
        'segregation_requirements': [
            'Apply standard Class 8 corrosive segregation from food (3-5 meters)',
            'Follow dangerous goods segregation table requirements'
        ],
        'prohibited_combinations': [],
        'minimum_distances': {
            'Food and Foodstuffs': 5,  # Standard Class 8 distance
            'Food Packaging and Containers': 5,  # Standard Class 8 distance
            'Food Grade Materials': 5  # Standard Class 8 distance
        },
        'special_requirements': [],
        'safety_recommendations': [
            'Use appropriate containment for corrosive materials',
            'Ensure proper ventilation in storage areas',
            'Follow standard dangerous goods protocols'
        ],
        'regulatory_notes': [
            'Food separation: Standard Class 8 dangerous goods segregation applies regardless of pH level'
        ]
    }
    
    if not rules:
        recommendations['regulatory_notes'].append('No specific pH segregation rules found - apply standard Class 8 requirements')
        return recommendations
    
    # Determine overall risk level - focus on acid-alkali incompatibility
    severity_levels = [rule.severity_level for rule in rules]
    acid_alkali_rules = [rule for rule in rules if rule.target_type in [
        PHSegregationRule.TargetType.ALKALINE_MATERIALS,
        PHSegregationRule.TargetType.ACIDIC_MATERIALS
    ]]
    
    if acid_alkali_rules:
        if PHSegregationRule.SeverityLevel.PROHIBITED in [rule.severity_level for rule in acid_alkali_rules]:
            recommendations['overall_risk_level'] = 'critical'
        elif PHSegregationRule.SeverityLevel.CRITICAL in [rule.severity_level for rule in acid_alkali_rules]:
            recommendations['overall_risk_level'] = 'critical'
        elif PHSegregationRule.SeverityLevel.HIGH in [rule.severity_level for rule in acid_alkali_rules]:
            recommendations['overall_risk_level'] = 'high'
    
    # Process each rule - separate food rules from acid-alkali rules
    for rule in rules:
        target_display = rule.get_target_type_display()
        
        # Handle acid-alkali incompatibility rules (these can override distances)
        if rule.target_type in [PHSegregationRule.TargetType.ALKALINE_MATERIALS, PHSegregationRule.TargetType.ACIDIC_MATERIALS]:
            if rule.severity_level == PHSegregationRule.SeverityLevel.PROHIBITED:
                recommendations['prohibited_combinations'].append(target_display)
            
            if rule.min_separation_distance:
                recommendations['minimum_distances'][target_display] = rule.min_separation_distance
            
            if rule.requirements:
                recommendations['segregation_requirements'].extend(rule.requirements)
            
            if rule.safety_recommendations:
                recommendations['safety_recommendations'].extend(rule.safety_recommendations)
        
        # Handle food-related rules (maintain standard Class 8 distances)
        elif rule.target_type in [PHSegregationRule.TargetType.FOOD, PHSegregationRule.TargetType.FOOD_PACKAGING, PHSegregationRule.TargetType.FOOD_GRADE_MATERIALS]:
            # For food, always maintain standard Class 8 separation regardless of pH
            # Do not override the standard distances already set
            
            if rule.requirements:
                # Only add non-distance related requirements for food
                non_distance_requirements = [req for req in rule.requirements if 'meter' not in req.lower() and 'distance' not in req.lower()]
                recommendations['segregation_requirements'].extend(non_distance_requirements)
            
            if rule.safety_recommendations:
                recommendations['safety_recommendations'].extend(rule.safety_recommendations)
        
        # Add regulatory notes for all rules
        if rule.regulatory_basis:
            recommendations['regulatory_notes'].append(f"{target_display}: {rule.regulatory_basis}")
    
    # Remove duplicates while preserving order
    recommendations['segregation_requirements'] = list(dict.fromkeys(recommendations['segregation_requirements']))
    recommendations['safety_recommendations'] = list(dict.fromkeys(recommendations['safety_recommendations']))
    recommendations['regulatory_notes'] = list(dict.fromkeys(recommendations['regulatory_notes']))
    
    return recommendations


def _classify_ph_value(ph_value: float) -> str:
    """
    Classify a pH value into standard categories.
    
    Args:
        ph_value: The pH value to classify
        
    Returns:
        String classification of the pH value
    """
    if ph_value < 2:
        return 'strongly_acidic'
    elif ph_value < 7:
        return 'acidic'
    elif ph_value <= 7.5:
        return 'neutral'
    elif ph_value <= 12.5:
        return 'alkaline'
    else:
        return 'strongly_alkaline'


def initialize_default_ph_segregation_rules():
    """
    Initialize default pH segregation rules focusing on acid-alkali incompatibility.
    Standard Class 8 food separation applies regardless of pH level.
    This function can be called during system setup or migration.
    """
    default_rules = [
        # Standard Class 8 food separation rules (apply to all pH levels)
        {
            'ph_range_type': PHSegregationRule.PHRangeType.STRONGLY_ACIDIC,
            'target_type': PHSegregationRule.TargetType.FOOD,
            'severity_level': PHSegregationRule.SeverityLevel.HIGH,
            'min_separation_distance': 5,
            'requirements': [
                'Apply standard Class 8 corrosive segregation from food (3-5 meters)',
                'Follow dangerous goods segregation table requirements',
                'Use appropriate containment for corrosive materials'
            ],
            'safety_recommendations': [
                'Use acid-resistant storage containers',
                'Ensure proper ventilation',
                'Follow standard dangerous goods protocols'
            ],
            'regulatory_basis': 'Dangerous Goods Segregation Table - Class 8 vs Food',
            'notes': 'Standard dangerous goods separation applies - pH level does not enhance food restrictions'
        },
        {
            'ph_range_type': PHSegregationRule.PHRangeType.ALKALINE,
            'target_type': PHSegregationRule.TargetType.FOOD,
            'severity_level': PHSegregationRule.SeverityLevel.HIGH,
            'min_separation_distance': 5,
            'requirements': [
                'Apply standard Class 8 corrosive segregation from food (3-5 meters)',
                'Follow dangerous goods segregation table requirements',
                'Use appropriate containment for corrosive materials'
            ],
            'safety_recommendations': [
                'Use caustic-resistant storage containers',
                'Ensure proper ventilation',
                'Follow standard dangerous goods protocols'
            ],
            'regulatory_basis': 'Dangerous Goods Segregation Table - Class 8 vs Food',
            'notes': 'Standard dangerous goods separation applies - pH level does not enhance food restrictions'
        },
        
        # CRITICAL: Acid-Alkali Incompatibility Rules
        {
            'ph_range_type': PHSegregationRule.PHRangeType.STRONGLY_ACIDIC,
            'target_type': PHSegregationRule.TargetType.ALKALINE_MATERIALS,
            'severity_level': PHSegregationRule.SeverityLevel.PROHIBITED,
            'min_separation_distance': 15,
            'requirements': [
                'CRITICAL: Never store strongly acidic (pH < 2) with strongly alkaline materials (pH > 12.5)',
                'Minimum 15-meter separation from strongly alkaline materials',
                'Minimum 10-meter separation from moderately alkaline materials (pH > 10)',
                'Use separate storage areas with independent ventilation systems',
                'Install emergency acid neutralization systems'
            ],
            'safety_recommendations': [
                'Emergency neutralization materials (sodium bicarbonate) readily available',
                'Spill response plans for potential acid-alkali mixing incidents',
                'Specialized training for personnel handling both material types',
                'Install chemical vapor detection systems if required',
                'Regular inspection of storage container integrity'
            ],
            'regulatory_basis': 'Chemical Incompatibility Standards - Acid-Alkali Reactions',
            'notes': 'Mixing can cause violent exothermic reactions, toxic gas generation, and container rupture'
        },
        {
            'ph_range_type': PHSegregationRule.PHRangeType.STRONGLY_ALKALINE,
            'target_type': PHSegregationRule.TargetType.ACIDIC_MATERIALS,
            'severity_level': PHSegregationRule.SeverityLevel.PROHIBITED,
            'min_separation_distance': 15,
            'requirements': [
                'CRITICAL: Never store strongly alkaline (pH > 12.5) with strongly acidic materials (pH < 2)',
                'Minimum 15-meter separation from strongly acidic materials',
                'Minimum 10-meter separation from moderately acidic materials (pH < 4)',
                'Use separate storage areas with independent ventilation systems',
                'Install emergency alkali neutralization systems'
            ],
            'safety_recommendations': [
                'Emergency neutralization materials (weak acid solutions) readily available',
                'Spill response plans for potential acid-alkali mixing incidents',
                'Specialized training for caustic material handling personnel',
                'Install caustic vapor detection systems if required',
                'Use specialized caustic-resistant containment materials'
            ],
            'regulatory_basis': 'Chemical Incompatibility Standards - Acid-Alkali Reactions',
            'notes': 'Mixing can cause violent exothermic reactions, toxic gas generation, and explosive conditions'
        },
        
        # Moderate acid-alkali separations
        {
            'ph_range_type': PHSegregationRule.PHRangeType.ACIDIC,
            'target_type': PHSegregationRule.TargetType.ALKALINE_MATERIALS,
            'severity_level': PHSegregationRule.SeverityLevel.HIGH,
            'min_separation_distance': 10,
            'requirements': [
                'Keep acidic materials (pH 2-6.9) separated from strongly alkaline materials (pH > 12.5)',
                'Minimum 10-meter separation from strongly alkaline materials',
                'Minimum 5-meter separation from moderately alkaline materials',
                'Monitor storage areas for pH changes'
            ],
            'safety_recommendations': [
                'Regular monitoring of storage conditions',
                'Emergency neutralization procedures available',
                'Proper ventilation to prevent vapor accumulation'
            ],
            'regulatory_basis': 'Chemical Incompatibility Guidelines',
            'notes': 'Moderate reaction risk - requires careful separation'
        },
        {
            'ph_range_type': PHSegregationRule.PHRangeType.ALKALINE,
            'target_type': PHSegregationRule.TargetType.ACIDIC_MATERIALS,
            'severity_level': PHSegregationRule.SeverityLevel.HIGH,
            'min_separation_distance': 10,
            'requirements': [
                'Keep alkaline materials (pH 7.6-12.5) separated from strongly acidic materials (pH < 2)',
                'Minimum 10-meter separation from strongly acidic materials',
                'Minimum 5-meter separation from moderately acidic materials',
                'Monitor storage areas for pH changes'
            ],
            'safety_recommendations': [
                'Regular monitoring of storage conditions',
                'Emergency neutralization procedures available',
                'Proper ventilation to prevent vapor accumulation'
            ],
            'regulatory_basis': 'Chemical Incompatibility Guidelines',
            'notes': 'Moderate reaction risk - requires careful separation'
        }
    ]
    
    # Create rules if they don't exist
    created_count = 0
    for rule_data in default_rules:
        rule, created = PHSegregationRule.objects.get_or_create(
            ph_range_type=rule_data['ph_range_type'],
            target_type=rule_data['target_type'],
            defaults=rule_data
        )
        if created:
            created_count += 1
    
    return created_count


# === Chemical Name Pattern Matching ===

def detect_chemical_reactivity_from_name(material_name: str, un_number: str = None) -> Dict:
    """
    Detect chemical reactivity type from material name using pattern matching.
    Useful for creating ChemicalReactivityProfile records automatically.
    
    Args:
        material_name: The proper shipping name or common name
        un_number: Optional UN number for additional context
        
    Returns:
        Dictionary with detected reactivity information
    """
    name_lower = material_name.lower()
    
    # Strong acid patterns
    strong_acid_patterns = [
        'sulfuric acid', 'sulphuric acid', 'hydrochloric acid', 'nitric acid',
        'perchloric acid', 'hydrobromic acid', 'hydroiodic acid', 'phosphoric acid',
        'hydrogen chloride', 'hydrogen bromide', 'hydrogen iodide'
    ]
    
    # Strong alkali patterns
    strong_alkali_patterns = [
        'sodium hydroxide', 'potassium hydroxide', 'lithium hydroxide',
        'caesium hydroxide', 'cesium hydroxide', 'rubidium hydroxide',
        'barium hydroxide', 'calcium hydroxide', 'strontium hydroxide'
    ]
    
    # Moderate acid patterns
    moderate_acid_patterns = [
        'acetic acid', 'formic acid', 'citric acid', 'oxalic acid',
        'tartaric acid', 'malic acid', 'lactic acid'
    ]
    
    # Moderate alkali patterns
    moderate_alkali_patterns = [
        'ammonia', 'ammonium hydroxide', 'sodium carbonate',
        'potassium carbonate', 'sodium bicarbonate'
    ]
    
    # Oxidizer patterns
    oxidizer_patterns = [
        'hydrogen peroxide', 'sodium hypochlorite', 'chlorine dioxide',
        'potassium permanganate', 'sodium dichromate', 'chromic acid',
        'nitrous oxide', 'oxygen'
    ]
    
    result = {
        'detected': False,
        'reactivity_type': None,
        'strength_level': None,
        'confidence': 0.0,
        'matched_patterns': [],
        'typical_ph_range': None,
        'incompatible_with': [],
        'notes': ''
    }
    
    # Check for strong acids
    for pattern in strong_acid_patterns:
        if pattern in name_lower:
            result.update({
                'detected': True,
                'reactivity_type': ChemicalReactivityProfile.ReactivityType.STRONG_ACID,
                'strength_level': ChemicalReactivityProfile.StrengthLevel.STRONG,
                'confidence': 0.9,
                'matched_patterns': [pattern],
                'typical_ph_range': (0.0, 2.0),
                'incompatible_with': [
                    ChemicalReactivityProfile.ReactivityType.STRONG_ALKALI,
                    ChemicalReactivityProfile.ReactivityType.MODERATE_ALKALI
                ],
                'notes': f'Strong acid detected from name pattern: {pattern}'
            })
            break
    
    # Check for strong alkalis
    if not result['detected']:
        for pattern in strong_alkali_patterns:
            if pattern in name_lower:
                result.update({
                    'detected': True,
                    'reactivity_type': ChemicalReactivityProfile.ReactivityType.STRONG_ALKALI,
                    'strength_level': ChemicalReactivityProfile.StrengthLevel.STRONG,
                    'confidence': 0.9,
                    'matched_patterns': [pattern],
                    'typical_ph_range': (12.0, 14.0),
                    'incompatible_with': [
                        ChemicalReactivityProfile.ReactivityType.STRONG_ACID,
                        ChemicalReactivityProfile.ReactivityType.MODERATE_ACID
                    ],
                    'notes': f'Strong alkali detected from name pattern: {pattern}'
                })
                break
    
    # Check for moderate acids
    if not result['detected']:
        for pattern in moderate_acid_patterns:
            if pattern in name_lower:
                result.update({
                    'detected': True,
                    'reactivity_type': ChemicalReactivityProfile.ReactivityType.MODERATE_ACID,
                    'strength_level': ChemicalReactivityProfile.StrengthLevel.MODERATE,
                    'confidence': 0.7,
                    'matched_patterns': [pattern],
                    'typical_ph_range': (2.0, 4.0),
                    'incompatible_with': [
                        ChemicalReactivityProfile.ReactivityType.STRONG_ALKALI
                    ],
                    'notes': f'Moderate acid detected from name pattern: {pattern}'
                })
                break
    
    # Check for moderate alkalis
    if not result['detected']:
        for pattern in moderate_alkali_patterns:
            if pattern in name_lower:
                result.update({
                    'detected': True,
                    'reactivity_type': ChemicalReactivityProfile.ReactivityType.MODERATE_ALKALI,
                    'strength_level': ChemicalReactivityProfile.StrengthLevel.MODERATE,
                    'confidence': 0.7,
                    'matched_patterns': [pattern],
                    'typical_ph_range': (10.0, 12.0),
                    'incompatible_with': [
                        ChemicalReactivityProfile.ReactivityType.STRONG_ACID
                    ],
                    'notes': f'Moderate alkali detected from name pattern: {pattern}'
                })
                break
    
    # Check for oxidizers
    if not result['detected']:
        for pattern in oxidizer_patterns:
            if pattern in name_lower:
                result.update({
                    'detected': True,
                    'reactivity_type': ChemicalReactivityProfile.ReactivityType.OXIDIZER,
                    'strength_level': ChemicalReactivityProfile.StrengthLevel.MODERATE,
                    'confidence': 0.8,
                    'matched_patterns': [pattern],
                    'typical_ph_range': None,  # Oxidizers don't have specific pH
                    'incompatible_with': [
                        ChemicalReactivityProfile.ReactivityType.REDUCER
                    ],
                    'notes': f'Oxidizing agent detected from name pattern: {pattern}'
                })
                break
    
    # Additional context from UN number
    if un_number and result['detected']:
        result['notes'] += f' (UN{un_number})'
    
    return result


def create_reactivity_profile_from_detection(dangerous_good: DangerousGood, 
                                           detection_result: Dict, 
                                           source: str = 'EXPERT_KNOWLEDGE') -> ChemicalReactivityProfile:
    """
    Create a ChemicalReactivityProfile from chemical name detection results.
    
    Args:
        dangerous_good: The DangerousGood instance
        detection_result: Result from detect_chemical_reactivity_from_name
        source: Data source for the profile
        
    Returns:
        Created ChemicalReactivityProfile instance
    """
    if not detection_result['detected']:
        raise ValueError("No chemical reactivity detected - cannot create profile")
    
    ph_min, ph_max = detection_result['typical_ph_range'] or (None, None)
    
    profile = ChemicalReactivityProfile.objects.create(
        dangerous_good=dangerous_good,
        reactivity_type=detection_result['reactivity_type'],
        strength_level=detection_result['strength_level'],
        typical_ph_min=ph_min,
        typical_ph_max=ph_max,
        incompatible_with=detection_result['incompatible_with'],
        min_segregation_distance=15 if 'STRONG' in detection_result['strength_level'] else 10,
        data_source=getattr(ChemicalReactivityProfile.DataSource, source, 
                          ChemicalReactivityProfile.DataSource.EXPERT_KNOWLEDGE),
        confidence_level=detection_result['confidence'],
        notes=detection_result['notes'],
        regulatory_basis='Chemical name pattern matching - Expert knowledge'
    )
    
    return profile

