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
    
    return {
        'compatible': len(reasons) == 0,
        'reasons': reasons
    }

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

