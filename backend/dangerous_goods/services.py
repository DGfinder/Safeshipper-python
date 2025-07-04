# dangerous_goods/services.py
from typing import List, Optional, Dict, Union, Set
from .models import DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule, PackingGroup
from shipments.models import ConsignmentItem # Import ConsignmentItem
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

