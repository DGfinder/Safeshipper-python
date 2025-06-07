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


def check_dg_compatibility(dg1: DangerousGood, dg2: DangerousGood) -> Dict:
    reasons: List[str] = []
    # Check class-to-class rules
    class_rules = SegregationRule.objects.filter(
        from_class=dg1.dg_class, to_class=dg2.dg_class
    )
    for rule in class_rules:
        if not rule.is_compatible:
            reasons.append(f"Class {dg1.dg_class} is incompatible with class {dg2.dg_class}: {rule.reason}")
    # Check group-to-group rules
    dg1_groups = dg1.segregation_groups.all()
    dg2_groups = dg2.segregation_groups.all()
    for group1 in dg1_groups:
        for group2 in dg2_groups:
            group_rules = SegregationRule.objects.filter(
                from_group=group1, to_group=group2
            )
            for rule in group_rules:
                if not rule.is_compatible:
                    reasons.append(f"Group {group1.name} is incompatible with group {group2.name}: {rule.reason}")
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

