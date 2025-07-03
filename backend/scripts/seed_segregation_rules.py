from dangerous_goods.models import SegregationRule

def create_rule(primary, secondary, status):
    if primary == secondary:
        return  # Skip self-rules if redundant

    SegregationRule.objects.get_or_create(
        rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
        primary_hazard_class=primary,
        secondary_hazard_class=secondary,
        compatibility_status=status
    )

def run():
    # Format: 'Class': (compatible, not compatible, conditional)
    compatibility_matrix = {
        '1': (['1'], ['2.1','2.2','2.3','3','4.1','4.2','4.3','5.1','5.2','6.1','7','8','9'], []),
        '2.1': (['2.1','2.2','2.3','6.1','8','9'], ['1','4.1','4.2','4.3','5.1','5.2','7'], ['3']),
        '2.2': (['2.1','2.2','2.3','3','4.1','4.3','5.1','6.1','7','8','9'], ['1','4.2','5.2'], []),
        '2.3': (['2.2','2.3','4.1','4.3','6.1','7','8','9'], ['1','3','4.2','5.1','5.2'], ['2.1']),
        '3': (['2.1','2.2','2.3','3','4.1','4.3','6.1','8','9'], ['1','4.2','5.1','5.2','7'], ['6.1']),
        '4.1': (['2.2','2.3','3','4.1','4.3','6.1','8','9'], ['1','2.1','4.2','5.1','5.2','7'], []),
        '4.2': (['4.2','4.3','6.1','8','9'], ['1','2.1','2.2','2.3','3','4.1','5.1','5.2','7'], []),
        '4.3': (['2.2','2.3','3','4.1','4.2','4.3','6.1','9'], ['1','2.2','5.1','5.2','7','8'], []),
        '5.1': (['2.2','5.1','6.1'], ['1','2.1','2.3','3','4.1','4.2','4.3','5.2','7','8'], ['9']),
        '5.2': (['5.2','6.1'], ['1','2.1','2.2','2.3','3','4.1','4.2','4.3','5.1','7','8'], ['9']),
        '6.1': (['2.1','2.2','2.3','3','4.1','4.2','4.3','6.1','7','9'], ['1'], ['3','5.1','5.2','8']),
        '7': (['2.1','2.2','2.3','6.1','9'], ['1','3','4.1','4.2','4.3','5.1','5.2','7','8'], []),
        '8': (['2.1','2.2','2.3','3','4.1','4.2','6.1','7','9'], ['1','4.3','5.1','5.2','8'], []),
        '9': (['2.1','2.2','2.3','3','4.1','4.2','4.3','6.1','7','8','9'], ['1'], ['5.1','5.2']),
    }

    from dangerous_goods.models import SegregationRule

    for primary, (compatible, incompatible, conditional) in compatibility_matrix.items():
        for secondary in compatible:
            create_rule(primary, secondary, SegregationRule.Compatibility.COMPATIBLE)
        for secondary in incompatible:
            create_rule(primary, secondary, SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED)
        for secondary in conditional:
            create_rule(primary, secondary, SegregationRule.Compatibility.SEPARATED_FROM)
