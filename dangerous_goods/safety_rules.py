# dangerous_goods/safety_rules.py
from typing import List, Dict, Optional # Make sure List and others are imported

# It's good practice to import your models under TYPE_CHECKING if only used for type hints,
# or directly if used in runtime logic within this module.
# For now, let's assume DangerousGood objects are passed into these functions.
# If you need to query models here, you'd uncomment and use:
# from .models import DangerousGood, SegregationRule, SegregationGroup
# from django.db.models import Q

# print("dangerous_goods/safety_rules.py loaded") # Optional: for debugging import

def get_all_hazard_classes_for_dg(dangerous_good_instance) -> List[str]:
    """
    Determines all applicable hazard classes for a given DangerousGood instance,
    including its primary class and any subsidiary risks.
    
    :param dangerous_good_instance: An instance of the DangerousGood model.
    :return: A list of unique hazard class strings.
    """
    if not dangerous_good_instance:
        return []
    
    classes = []
    # Ensure the instance has these attributes before accessing
    if hasattr(dangerous_good_instance, 'hazard_class') and dangerous_good_instance.hazard_class:
        classes.append(str(dangerous_good_instance.hazard_class))
    
    if hasattr(dangerous_good_instance, 'subsidiary_risks') and dangerous_good_instance.subsidiary_risks:
        # Assuming subsidiary_risks is a comma-separated string
        subsidiaries = [risk.strip() for risk in dangerous_good_instance.subsidiary_risks.split(',') if risk.strip()]
        classes.extend(subsidiaries)
            
    return list(set(classes)) # Return unique classes


def check_item_fire_risk_conflict_with_oxidizer(dg1, dg2) -> bool:
    """
    Checks if one item poses a fire risk that conflicts with another item being an oxidizer.
    dg1 and dg2 are expected to be DangerousGood model instances.
    Returns True if a conflict exists, False otherwise.
    """
    # Placeholder logic - this needs to be implemented based on actual rules.
    # This will require identifying which DG classes/substances are fire risks
    # (e.g., Class 3, Class 4.1, 4.2, 4.3) and which are oxidizers (Class 5.1).
    
    # Example (very simplified - consult actual regulations for real rules):
    # dg1_classes = get_all_hazard_classes_for_dg(dg1)
    # dg2_classes = get_all_hazard_classes_for_dg(dg2)

    # is_dg1_fire_risk = any(c in ['3', '4.1', '4.2', '4.3'] for c in dg1_classes)
    # is_dg2_oxidizer = '5.1' in dg2_classes
    
    # is_dg2_fire_risk = any(c in ['3', '4.1', '4.2', '4.3'] for c in dg2_classes)
    # is_dg1_oxidizer = '5.1' in dg1_classes

    # if (is_dg1_fire_risk and is_dg2_oxidizer) or \
    #    (is_dg2_fire_risk and is_dg1_oxidizer):
    #     # Further checks might be needed based on specific UN numbers or packing groups
    #     # e.g., some oxidizers are incompatible with *all* flammable materials.
    #     # Some might be conditionally compatible based on segregation rules.
    #     print(f"Potential fire/oxidizer conflict: {dg1.un_number} and {dg2.un_number}")
    #     return True # Conflict found (example)
            
    # For now, default to no conflict until specific rules are built.
    # print(f"Checking fire/oxidizer: {dg1.un_number if dg1 else 'N/A'} vs {dg2.un_number if dg2 else 'N/A'} - No specific rule implemented yet.")
    return False 

def check_item_food_sensitivity_conflict(dangerous_good_item, segregation_group_food_pk: Optional[int] = None) -> bool:
    """
    Checks if a dangerous good item is incompatible with foodstuffs based on segregation rules.
    'dangerous_good_item' is a DangerousGood model instance.
    'segregation_group_food_pk' is the primary key of the 'Foodstuffs' SegregationGroup.
    Returns True if a conflict exists (e.g., DG should not be near food), False otherwise.
    """
    # Placeholder logic:
    # This would involve checking SegregationRules where one item is the DG
    # and the other is a SegregationGroup representing "Foodstuffs".
    
    # from .models import SegregationRule, SegregationGroup, DangerousGood # Import here to avoid circularity if called from models.py
    
    # if not dangerous_good_item or not segregation_group_food_pk:
    #     return False

    # food_group = SegregationGroup.objects.get(pk=segregation_group_food_pk) # Or pass the object
    
    # # Check rules where the DG's class is primary and food group is secondary
    # conflict_rule_exists = SegregationRule.objects.filter(
    #     models.Q(primary_hazard_class=dangerous_good_item.hazard_class, secondary_segregation_group=food_group) |
    #     models.Q(secondary_hazard_class=dangerous_good_item.hazard_class, primary_segregation_group=food_group), # If symmetric rules
    #     rule_type=SegregationRule.RuleType.CLASS_TO_GROUP,
    #     compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED
    # ).exists()

    # if conflict_rule_exists:
    #    return True
    
    # Additionally, check if the DG itself belongs to a group that is incompatible with food_group
    # for dg_group in dangerous_good_item.segregation_groups.all():
    #     group_conflict_exists = SegregationRule.objects.filter(
    #         models.Q(primary_segregation_group=dg_group, secondary_segregation_group=food_group) |
    #         models.Q(secondary_segregation_group=dg_group, primary_segregation_group=food_group),
    #         rule_type=SegregationRule.RuleType.GROUP_TO_GROUP,
    #         compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED
    #     ).exists()
    #     if group_conflict_exists:
    #         return True

    # print(f"Checking food sensitivity for {dangerous_good_item.un_number if dangerous_good_item else 'N/A'} - No specific rule implemented yet.")
    return False # Default to no conflict

def check_item_bulk_incompatibility(dg1, dg2, vehicle_type_or_compartment_details=None) -> bool:
    """
    Checks for incompatibilities when items are transported in bulk.
    This might involve different or stricter rules.
    dg1 and dg2 are DangerousGood model instances.
    vehicle_type_or_compartment_details could provide context about the transport unit.
    Returns True if a bulk incompatibility exists, False otherwise.
    """
    # Placeholder logic:
    # Bulk transport often has specific segregation requirements.
    # This function would consult relevant parts of regulations (IATA, IMDG, ADR)
    # and your SegregationRule model, possibly with rules specific to bulk transport.
    # print(f"Checking bulk incompatibility: {dg1.un_number if dg1 else 'N/A'} vs {dg2.un_number if dg2 else 'N/A'} - No specific rule implemented yet.")
    return False # Default to no conflict

# You would add more specific rule functions here as needed,
# based on your SegregationRule model and regulatory requirements.
# These functions would then be called by your main check_dg_compatibility service
# in dangerous_goods/services.py
