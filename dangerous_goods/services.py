# dangerous_goods/services.py
from typing import List, Optional, Dict, Union
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


def check_dg_compatibility(item1: ConsignmentItem, item2: ConsignmentItem) -> Dict[str, Union[bool, List[str]]]:
    """
    Checks the compatibility between two ConsignmentItems based on their associated Dangerous Goods.
    Returns a dictionary with 'compatible' (bool) and 'reasons' (list of strings for conflicts).
    This service function integrates checks from safety_rules.py and SegregationRule model.
    """
    reasons_for_incompatibility: List[str] = []

    # Ensure both items are actually marked as dangerous goods
    if not item1.is_dangerous_good or not item2.is_dangerous_good:
        # If one or both are not DGs, they are generally compatible by default from a DG perspective.
        # However, one could be a DG and the other food, so food sensitivity check is still relevant.
        if check_item_food_sensitivity_conflict(item1, item2): # Assuming this handles non-DG food item
             reasons_for_incompatibility.append(
                f"Food Sensitivity: Potential conflict between food item and dangerous good."
            )
        return {
            "compatible": not reasons_for_incompatibility,
            "reasons": reasons_for_incompatibility
        }

    # Retrieve the DangerousGood master records.
    # Assuming ConsignmentItem has a ForeignKey 'dangerous_good_master' to DangerousGood model.
    # If not, this needs adjustment to fetch DG based on item1.un_number etc.
    dg1 = getattr(item1, 'dangerous_good_master', None)
    dg2 = getattr(item2, 'dangerous_good_master', None)

    # If for some reason an item is marked as DG but doesn't link to master data
    if not dg1:
        reasons_for_incompatibility.append(f"Item '{item1.description}' is marked as DG but missing master DG data (UN: {item1.un_number}).")
    if not dg2:
        reasons_for_incompatibility.append(f"Item '{item2.description}' is marked as DG but missing master DG data (UN: {item2.un_number}).")
    
    if not dg1 or not dg2: # Cannot proceed with DG-specific checks if master data is missing
        return {"compatible": False, "reasons": reasons_for_incompatibility}


    if dg1.un_number == dg2.un_number:
        # Same UN Number - generally compatible, but specific forms/packagings might differ.
        # Add a note if detailed checks are needed, but don't mark as incompatible by default.
        # reasons_for_incompatibility.append(f"Note: Same UN Number ({dg1.un_number}). Ensure specific forms and packagings are compatible.")
        pass


    # 1. Check explicit SegregationRule model entries
    # This queries your database for predefined rules.
    dg1_classes_set = get_all_hazard_classes_for_dg(dg1)
    dg2_classes_set = get_all_hazard_classes_for_dg(dg2)
    dg1_groups = dg1.segregation_groups.all()
    dg2_groups = dg2.segregation_groups.all()

    q_rules = Q()
    # Class vs Class rules
    for c1 in dg1_classes_set:
        for c2 in dg2_classes_set:
            q_rules |= (Q(rule_type=SegregationRule.RuleType.CLASS_TO_CLASS) & ((Q(primary_hazard_class=c1) & Q(secondary_hazard_class=c2)) | (Q(primary_hazard_class=c2) & Q(secondary_hazard_class=c1))))
    
    # Group vs Group rules
    for g1 in dg1_groups:
        for g2 in dg2_groups:
            if g1 == g2: continue # Usually no rule against self, or specific rules apply
            q_rules |= (Q(rule_type=SegregationRule.RuleType.GROUP_TO_GROUP) & ((Q(primary_segregation_group=g1) & Q(secondary_segregation_group=g2)) | (Q(primary_segregation_group=g2) & Q(secondary_segregation_group=g1))))

    # Class vs Group rules
    for c1 in dg1_classes_set:
        for g2 in dg2_groups:
            q_rules |= (Q(rule_type=SegregationRule.RuleType.CLASS_TO_GROUP) & ((Q(primary_hazard_class=c1) & Q(secondary_segregation_group=g2)) | (Q(primary_segregation_group=g2) & Q(secondary_hazard_class=c1)))) # Assuming class can be primary or secondary
    for c2 in dg2_classes_set:
        for g1 in dg1_groups:
             q_rules |= (Q(rule_type=SegregationRule.RuleType.CLASS_TO_GROUP) & ((Q(primary_hazard_class=c2) & Q(secondary_segregation_group=g1)) | (Q(primary_segregation_group=g1) & Q(secondary_hazard_class=c2))))


    applicable_db_rules = SegregationRule.objects.filter(q_rules).distinct()
    for rule in applicable_db_rules:
        condition_passes = True # Assume condition passes unless proven otherwise
        if rule.condition_type and rule.condition_type != SegregationRule.ConditionType.NONE:
            # Implement structured condition checking here based on rule.condition_type and rule.condition_value
            # This is where you'd check item1.is_bulk_item, dg1.is_fire_risk, etc.
            # For example:
            if rule.condition_type == SegregationRule.ConditionType.BOTH_BULK:
                condition_passes = item1.is_bulk_item and item2.is_bulk_item
            elif rule.condition_type == SegregationRule.ConditionType.PRIMARY_FIRE_RISK: # This interpretation needs clarity
                condition_passes = item1.fire_risk_override if item1.fire_risk_override is not None else dg1.is_fire_risk
            # Add more conditions...

        if condition_passes:
            if rule.compatibility_status == SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED:
                reasons_for_incompatibility.append(f"Rule Violation: {str(rule)}. {rule.notes or ''}")
            elif rule.compatibility_status == SegregationRule.Compatibility.CONDITIONAL_NOTES:
                reasons_for_incompatibility.append(f"Conditional: {str(rule)}. Notes: {rule.notes or 'Review specific conditions.'}")
            # Handle other statuses like AWAY_FROM, SEPARATED_FROM as incompatibility reasons or specific instructions

    # 2. Apply specific safety_rules from safety_rules.py (these are often hardcoded or derived general rules)
    if check_item_fire_risk_conflict_with_oxidizer(item1, item2): # This function uses item.fire_risk_override and dg.is_fire_risk
        reasons_for_incompatibility.append(f"Fire Risk Conflict: {dg1.un_number} vs {dg2.un_number}. Potential oxidizer conflict.")

    if check_item_food_sensitivity_conflict(item1, item2): # This relies on "SGG_FOODSTUFFS" group
        reasons_for_incompatibility.append(f"Food Sensitivity: Potential conflict between item and food-sensitive DG class.")

    if check_item_bulk_incompatibility(item1, item2): # This uses item.is_bulk_item and INCOMPATIBLE_BULK_PAIRS
        reasons_for_incompatibility.append(f"Bulk Incompatibility: {dg1.un_number} (Class {dg1.hazard_class}) vs {dg2.un_number} (Class {dg2.hazard_class}) when both are bulk.")
    
    # Check for Class 1 (Explosives) special legislation
    dg1_all_classes = get_all_hazard_classes_for_dg(dg1)
    dg2_all_classes = get_all_hazard_classes_for_dg(dg2)
    if any(c.startswith("1") for c in dg1_all_classes) or any(c.startswith("1") for c in dg2_all_classes):
        # Check against rules with condition_type CLASS_1_LEGISLATION
        class1_rules = SegregationRule.objects.filter(condition_type=SegregationRule.ConditionType.CLASS_1_LEGISLATION)
        for rule in class1_rules:
            # This logic needs to be more specific based on how Class 1 rules are defined.
            # For example, if any other item is fire risk when a Class 1 is present.
            item1_is_fire_risk = item1.fire_risk_override if item1.fire_risk_override is not None else dg1.is_fire_risk
            item2_is_fire_risk = item2.fire_risk_override if item2.fire_risk_override is not None else dg2.is_fire_risk
            if item1_is_fire_risk or item2_is_fire_risk: # Example: If any Class 1 is with a fire risk item
                 reasons_for_incompatibility.append(f"Explosive (Class 1) with Fire Risk Item: Segregation must comply with specific explosive legislation. Rule: {rule.notes or ''}")


    return {
        "compatible": not reasons_for_incompatibility, 
        "reasons": list(set(reasons_for_incompatibility)) # Ensure unique reasons
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

