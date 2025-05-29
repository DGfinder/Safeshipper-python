from dangerous_goods.models import DangerousGood

def get_all_hazard_classes(dg: DangerousGood):
    """
    Returns a full list of hazard classes, including primary and all subsidiary risks.
    """
    hazard_classes = [dg.hazard_class.strip()]
    if dg.subsidiary_risks:
        hazard_classes += [risk.strip() for risk in dg.subsidiary_risks.split(",") if risk.strip()]
    return list(set(hazard_classes))  # Ensure uniqueness


def are_compatible(dg1: DangerousGood, dg2: DangerousGood):
    """
    Very simple compatibility check:
    - If any hazard class in dg1 matches any hazard class in dg2,
      we consider them INCOMPATIBLE (could be adjusted with real rules).
    """
    classes_1 = set(get_all_hazard_classes(dg1))
    classes_2 = set(get_all_hazard_classes(dg2))

    overlap = classes_1 & classes_2
    return {
        "compatible": len(overlap) == 0,
        "shared_classes": list(overlap)
    }
