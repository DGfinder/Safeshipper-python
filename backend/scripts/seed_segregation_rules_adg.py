from dangerous_goods.models import SegregationRule

def run():
    from .adg_segregation_matrix import adg_segregation_matrix  # ✅ import the full matrix

    for primary_class, compatibilities in adg_segregation_matrix.items():
        for secondary_class, (status, note) in compatibilities.items():
            if primary_class == secondary_class:
                continue  # Optional: skip self-comparisons
            SegregationRule.objects.update_or_create(
                rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
                primary_hazard_class=primary_class,
                secondary_hazard_class=secondary_class,
                defaults={
                    "compatibility_status": getattr(SegregationRule.Compatibility, status),
                    "notes": note,
                }
            )
