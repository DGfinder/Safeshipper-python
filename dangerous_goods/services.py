# dangerous_goods/services.py
from typing import List, Optional, Dict, Union # Added Union
from .models import DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule, PackingGroup
from django.db.models import Q

def get_dangerous_good_by_un_number(un_number: str) -> Optional[DangerousGood]:
    """
    Retrieves a DangerousGood instance by its UN number (case-insensitive).
    Returns None if not found.
    """
    try:
        return DangerousGood.objects.get(un_number__iexact=un_number)
    except DangerousGood.DoesNotExist:
        return None

def find_dangerous_goods(query: str) -> List[DangerousGood]:
    """
    Searches for dangerous goods by UN number, proper shipping name, or simplified name.
    Returns a list (queryset converted to list).
    """
    return list(DangerousGood.objects.filter(
        Q(un_number__icontains=query) |
        Q(proper_shipping_name__icontains=query) |
        Q(simplified_name__icontains=query)
    ).distinct())

def match_synonym_to_dg(text: str) -> Optional[DangerousGood]:
    """
    Attempts to match a given text (e.g., product name from a manifest) 
    to a DangerousGood entry via its synonyms or proper/simplified names.
    Returns the DangerousGood object if a match is found, otherwise None.
    For simplicity, this returns the first match. More sophisticated logic
    could return multiple matches or a best match with confidence.
    """
    # Exact match on synonym first
    synonym_match = DGProductSynonym.objects.filter(synonym__iexact=text).select_related('dangerous_good').first()
    if synonym_match:
        return synonym_match.dangerous_good

    # Then try partial match on synonym (could be noisy)
    # synonym_partial_match = DGProductSynonym.objects.filter(synonym__icontains=text).select_related('dangerous_good').first()
    # if synonym_partial_match:
    #     return synonym_partial_match.dangerous_good

    # Then try exact match on proper shipping name or simplified name
    dg_match = DangerousGood.objects.filter(
        Q(proper_shipping_name__iexact=text) | Q(simplified_name__iexact=text)
    ).first()
    if dg_match:
        return dg_match
        
    # Could add more sophisticated matching logic here (e.g., Levenshtein distance, ML)
    return None

def lookup_packing_instruction(un_number: str, mode: str = 'air_passenger') -> Optional[str]:
    """
    Looks up packing instruction for a given UN number and transport mode.
    'mode' can be 'air_passenger', 'air_cargo', etc.
    This is a placeholder; actual packing instructions can be complex and vary by mode.
    """
    dg = get_dangerous_good_by_un_number(un_number)
    if not dg:
        return None
    
    if mode == 'air_passenger':
        return dg.packing_instruction_passenger_aircraft
    elif mode == 'air_cargo':
        return dg.packing_instruction_cargo_aircraft
    # TODO: Add logic for other modes (road, sea, rail) if those fields are added to the model
    
    return "Packing instruction not available for the specified mode."


def check_dg_compatibility(dg1: DangerousGood, dg2: DangerousGood) -> Dict[str, Union[bool, str, None]]:
    """
    Checks the compatibility between two dangerous goods based on defined SegregationRules.
    Returns a dictionary with 'compatible' (bool) and 'reason' (str).
    This implementation is a starting point and needs to be significantly expanded
    to cover various rule types and regulatory nuances.
    """
    if dg1.un_number == dg2.un_number: # Technically same substance, but might be different packing or form
        return {"compatible": True, "reason": "Same UN Number. Further checks on specific forms/packing may apply.", "rule_applied": None}

    # 1. Check direct UN number to UN number rules (if modeled)
    # For now, this type is not fully implemented in SegregationRule model example

    # 2. Check Class to Class rules
    class_rule = SegregationRule.objects.filter(
        Q(primary_hazard_class=dg1.hazard_class, secondary_hazard_class=dg2.hazard_class) |
        Q(primary_hazard_class=dg2.hazard_class, secondary_hazard_class=dg1.hazard_class),
        rule_type=SegregationRule.RuleType.CLASS_TO_CLASS
    ).first()

    if class_rule:
        if class_rule.compatibility_status == SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED:
            return {"compatible": False, "reason": f"Class-level incompatibility: {class_rule.notes or 'Prohibited'}", "rule_applied": str(class_rule)}
        # Handle other statuses like AWAY_FROM, SEPARATED_FROM if needed as "conditionally compatible"
        # For now, if not INCOMPATIBLE_PROHIBITED, we'll assume it passes this check or other checks will refine.

    # 3. Check Segregation Group to Segregation Group rules
    dg1_groups = dg1.segregation_groups.all()
    dg2_groups = dg2.segregation_groups.all()

    if dg1_groups.exists() and dg2_groups.exists():
        for group1 in dg1_groups:
            for group2 in dg2_groups:
                if group1 == group2: continue # Skip if they are in the same group (usually handled differently)
                
                group_rule = SegregationRule.objects.filter(
                    Q(primary_segregation_group=group1, secondary_segregation_group=group2) |
                    Q(primary_segregation_group=group2, secondary_segregation_group=group1),
                    rule_type=SegregationRule.RuleType.GROUP_TO_GROUP
                ).first()

                if group_rule:
                    if group_rule.compatibility_status == SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED:
                        return {"compatible": False, "reason": f"Group-level incompatibility: {group_rule.notes or 'Prohibited'}", "rule_applied": str(group_rule)}
                    # Handle other statuses

    # 4. Consider subsidiary risks: A subsidiary risk of one DG might be incompatible
    #    with the primary class (or another subsidiary risk) of another DG.
    #    This requires iterating through dg1.subsidiary_risks vs dg2.hazard_class/subsidiary_risks
    #    and dg2.subsidiary_risks vs dg1.hazard_class. (Complex logic omitted for brevity)

    # 5. Default: If no specific prohibition rule is found, assume compatible for this basic check.
    #    Real-world systems often default to requiring specific permissions/allowances.
    #    Or, they might have a "general segregation" requirement if items are in different classes.
    return {"compatible": True, "reason": "No direct prohibition rule found (basic check). Consult regulations for full compliance.", "rule_applied": None}

# --- Further service functions ---
# - add_dangerous_good_to_segregation_group
# - load_dg_data_from_source (e.g., CSV, API)
# - comprehensive_dg_validation (checking against all rules and regulations)
