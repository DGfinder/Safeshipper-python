# dangerous_goods/limited_quantity_handler.py

from typing import Dict, List, Optional, Tuple, TYPE_CHECKING
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _

from .models import DangerousGood

if TYPE_CHECKING:
    from shipments.models import ConsignmentItem, Shipment


class LimitedQuantityLimit(models.Model):
    """
    ADG Code Chapter 3.4 Limited Quantity limits per dangerous good.
    Stores the maximum quantity allowed for a dangerous good to qualify as Limited Quantity.
    """
    
    dangerous_good = models.OneToOneField(
        DangerousGood,
        on_delete=models.CASCADE,
        related_name='lq_limit',
        help_text=_("Dangerous good this LQ limit applies to")
    )
    
    # Maximum quantities for LQ
    max_quantity_inner_package = models.DecimalField(
        _("Max Quantity per Inner Package"),
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_("Maximum quantity per inner packaging (kg for solids, L for liquids, kg for gases)")
    )
    
    max_quantity_package = models.DecimalField(
        _("Max Quantity per Package"),
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_("Maximum gross mass per package (30kg default)")
    )
    
    # Special provisions
    lq_code = models.CharField(
        _("LQ Code"),
        max_length=10,
        blank=True,
        help_text=_("Limited quantity code from ADG Code")
    )
    
    is_lq_permitted = models.BooleanField(
        _("LQ Permitted"),
        default=True,
        help_text=_("Whether this dangerous good can be transported as Limited Quantity")
    )
    
    # ADG-specific requirements
    requires_orientation_arrows = models.BooleanField(
        _("Requires Orientation Arrows"),
        default=False,
        help_text=_("Whether orientation arrows are required for LQ packages")
    )
    
    special_provisions = models.TextField(
        _("Special LQ Provisions"),
        blank=True,
        help_text=_("Special provisions for LQ transport of this dangerous good")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Limited Quantity Limit")
        verbose_name_plural = _("Limited Quantity Limits")
        indexes = [
            models.Index(fields=['dangerous_good']),
            models.Index(fields=['is_lq_permitted']),
        ]
    
    def __str__(self):
        return f"LQ Limit for {self.dangerous_good.un_number} - {self.max_quantity_inner_package or 'N/A'}"


class LimitedQuantityHandler:
    """
    Handles Limited Quantity (LQ) calculations and validations according to ADG Code Chapter 3.4.
    """
    
    # Default ADG LQ limits
    DEFAULT_MAX_GROSS_MASS_PER_PACKAGE = Decimal('30.0')  # 30kg per package
    DEFAULT_MAX_VOLUME_AEROSOLS = Decimal('1.0')  # 1L for aerosols
    
    def validate_lq_consignment_item(self, item: 'ConsignmentItem') -> Dict:
        """
        Validate if a consignment item qualifies for Limited Quantity transport.
        
        Args:
            item: ConsignmentItem to validate
            
        Returns:
            Dict with validation results
        """
        result = {
            'is_valid_lq': False,
            'can_be_lq': False,
            'reasons': [],
            'warnings': [],
            'max_allowed_quantity': None,
            'actual_quantity': None
        }
        
        # Check if item is marked as dangerous good
        if not item.is_dangerous_good or not item.dangerous_good_entry:
            result['reasons'].append("Item is not a dangerous good")
            return result
        
        # Check if item is already marked as LQ
        if hasattr(item, 'dg_quantity_type') and item.dg_quantity_type != 'LIMITED_QUANTITY':
            result['reasons'].append("Item is not marked as Limited Quantity")
            # But continue to check if it COULD be LQ
        
        dg = item.dangerous_good_entry
        
        # Check if this DG can be transported as LQ
        try:
            lq_limit = LimitedQuantityLimit.objects.get(dangerous_good=dg)
            if not lq_limit.is_lq_permitted:
                result['reasons'].append(f"{dg.un_number} cannot be transported as Limited Quantity")
                return result
        except LimitedQuantityLimit.DoesNotExist:
            # Use default rules if no specific limit exists
            lq_limit = None
            result['warnings'].append("No specific LQ limits found, using defaults")
        
        # Calculate actual quantities
        if dg.physical_form == 'LIQUID':
            quantity_per_inner = item.volume_l or 0
            quantity_unit = 'L'
        else:  # SOLID or GAS
            quantity_per_inner = item.weight_kg or 0
            quantity_unit = 'kg'
        
        result['actual_quantity'] = f"{quantity_per_inner} {quantity_unit}"
        
        # Check inner package limits
        if lq_limit and lq_limit.max_quantity_inner_package:
            max_inner = lq_limit.max_quantity_inner_package
            result['max_allowed_quantity'] = f"{max_inner} {quantity_unit}"
            
            if Decimal(str(quantity_per_inner)) > max_inner:
                result['reasons'].append(
                    f"Quantity per inner package ({quantity_per_inner} {quantity_unit}) "
                    f"exceeds LQ limit ({max_inner} {quantity_unit})"
                )
                return result
        else:
            # Apply default limits based on hazard class
            default_limit = self._get_default_lq_limit(dg.hazard_class, dg.packing_group)
            if default_limit is not None:
                result['max_allowed_quantity'] = f"{default_limit} {quantity_unit}"
                if Decimal(str(quantity_per_inner)) > default_limit:
                    result['reasons'].append(
                        f"Quantity exceeds default LQ limit for Class {dg.hazard_class}"
                    )
                    return result
        
        # Check gross mass per package
        gross_mass = item.weight_kg or 0
        if item.quantity > 1:
            gross_mass = gross_mass * item.quantity
        
        max_gross = lq_limit.max_quantity_package if lq_limit else self.DEFAULT_MAX_GROSS_MASS_PER_PACKAGE
        
        if Decimal(str(gross_mass)) > max_gross:
            result['reasons'].append(
                f"Gross mass per package ({gross_mass}kg) exceeds limit ({max_gross}kg)"
            )
            return result
        
        # Special checks for aerosols
        if item.is_aerosol and dg.hazard_class == '2.1':
            if item.volume_l and Decimal(str(item.volume_l)) > self.DEFAULT_MAX_VOLUME_AEROSOLS:
                result['reasons'].append(
                    f"Aerosol volume ({item.volume_l}L) exceeds LQ limit (1L)"
                )
                return result
        
        # If we got here, it can be LQ
        result['can_be_lq'] = True
        
        # Check if it's actually marked as LQ
        if item.dg_quantity_type == ConsignmentItem.DGQuantityType.LIMITED_QUANTITY:
            result['is_valid_lq'] = True
        else:
            result['warnings'].append("Item qualifies for LQ but is not marked as Limited Quantity")
        
        # Add any special provisions
        if lq_limit and lq_limit.special_provisions:
            result['warnings'].append(f"Special provisions apply: {lq_limit.special_provisions}")
        
        if lq_limit and lq_limit.requires_orientation_arrows:
            result['warnings'].append("Orientation arrows required on LQ packages")
        
        return result
    
    def calculate_lq_placard_requirements(self, shipment: 'Shipment') -> Dict:
        """
        Calculate Limited Quantity specific placard requirements.
        
        Args:
            shipment: Shipment to analyze
            
        Returns:
            Dict with LQ placard requirements
        """
        lq_items = shipment.items.filter(
            is_dangerous_good=True,
            dg_quantity_type='LIMITED_QUANTITY'
        )
        
        result = {
            'has_lq': lq_items.exists(),
            'total_lq_weight_kg': 0,
            'total_lq_packages': 0,
            'lq_placard_required': False,
            'mixed_load': False,
            'combined_calculation_required': False,
            'lq_items': []
        }
        
        if not lq_items.exists():
            return result
        
        # Calculate totals
        for item in lq_items:
            weight = item.total_weight_kg
            result['total_lq_weight_kg'] += weight
            result['total_lq_packages'] += item.quantity
            
            result['lq_items'].append({
                'description': item.description,
                'un_number': item.dangerous_good_entry.un_number if item.dangerous_good_entry else None,
                'quantity': item.quantity,
                'weight_kg': weight
            })
        
        # Check if there are also non-LQ dangerous goods
        non_lq_dg = shipment.items.filter(
            is_dangerous_good=True
        ).exclude(
            dg_quantity_type=ConsignmentItem.DGQuantityType.LIMITED_QUANTITY
        )
        
        if non_lq_dg.exists():
            result['mixed_load'] = True
            result['combined_calculation_required'] = True
        
        # LQ placard required if total LQ >= 1000kg (separate threshold)
        if result['total_lq_weight_kg'] >= 1000:
            result['lq_placard_required'] = True
        
        return result
    
    def _get_default_lq_limit(self, hazard_class: str, packing_group: Optional[str]) -> Optional[Decimal]:
        """
        Get default LQ limits based on hazard class and packing group.
        Based on ADG Code 7.9 Chapter 3.4.
        """
        # Simplified default limits - should be enhanced with full ADG table
        lq_limits = {
            # Class 3 - Flammable liquids
            ('3', 'I'): Decimal('0'),  # Not permitted
            ('3', 'II'): Decimal('1.0'),
            ('3', 'III'): Decimal('5.0'),
            
            # Class 8 - Corrosives  
            ('8', 'I'): Decimal('0'),  # Not permitted
            ('8', 'II'): Decimal('1.0'),
            ('8', 'III'): Decimal('5.0'),
            
            # Class 6.1 - Toxic
            ('6.1', 'I'): Decimal('0'),  # Not permitted
            ('6.1', 'II'): Decimal('0.1'),
            ('6.1', 'III'): Decimal('5.0'),
            
            # Class 2.1 - Flammable gas
            ('2.1', None): Decimal('0.125'),  # 125g for non-aerosols
            
            # Class 9 - Miscellaneous
            ('9', 'II'): Decimal('1.0'),
            ('9', 'III'): Decimal('5.0'),
        }
        
        # Try with packing group first
        if packing_group:
            limit = lq_limits.get((hazard_class, packing_group))
            if limit is not None:
                return limit
        
        # Try without packing group
        limit = lq_limits.get((hazard_class, None))
        if limit is not None:
            return limit
        
        # Default for classes not listed
        return Decimal('1.0')
    
    def generate_lq_marking_requirements(self, shipment: 'Shipment') -> Dict:
        """
        Generate marking requirements for Limited Quantity packages.
        """
        lq_result = self.calculate_lq_placard_requirements(shipment)
        
        marking_requirements = {
            'lq_mark_required': lq_result['has_lq'],
            'orientation_arrows_required': False,
            'un_numbers_required': True,
            'proper_shipping_names_required': False,  # Not required for LQ
            'marking_specifications': {
                'lq_mark': {
                    'type': 'Limited Quantity Mark',
                    'size': '100mm x 100mm minimum',
                    'design': 'Diamond with LQ letters',
                    'color': 'Black on white background'
                }
            },
            'package_requirements': []
        }
        
        # Check for orientation arrows requirement
        for item in shipment.items.filter(
            is_dangerous_good=True,
            dg_quantity_type=ConsignmentItem.DGQuantityType.LIMITED_QUANTITY
        ):
            if item.dangerous_good_entry:
                try:
                    lq_limit = LimitedQuantityLimit.objects.get(
                        dangerous_good=item.dangerous_good_entry
                    )
                    if lq_limit.requires_orientation_arrows:
                        marking_requirements['orientation_arrows_required'] = True
                        break
                except LimitedQuantityLimit.DoesNotExist:
                    pass
        
        if marking_requirements['orientation_arrows_required']:
            marking_requirements['marking_specifications']['orientation_arrows'] = {
                'type': 'Orientation Arrows',
                'placement': 'Two opposite vertical sides',
                'design': 'Black or red arrows on white or contrasting background'
            }
        
        return marking_requirements


def setup_common_lq_limits():
    """
    Set up common Limited Quantity limits based on ADG Code 7.9.
    Should be called as part of setup process.
    """
    
    # Common dangerous goods with their LQ limits
    lq_data = [
        # Class 3 - Common flammable liquids
        {'un_number': 'UN1203', 'max_inner': 5.0, 'lq_code': 'LQ3'},  # Gasoline PG II
        {'un_number': 'UN1263', 'max_inner': 5.0, 'lq_code': 'LQ3'},  # Paint PG III
        {'un_number': 'UN1090', 'max_inner': 1.0, 'lq_code': 'LQ3'},  # Acetone PG II
        
        # Class 8 - Common corrosives
        {'un_number': 'UN1789', 'max_inner': 1.0, 'lq_code': 'LQ22'},  # Hydrochloric acid
        {'un_number': 'UN1824', 'max_inner': 1.0, 'lq_code': 'LQ22'},  # Sodium hydroxide solution
        {'un_number': 'UN2796', 'max_inner': 1.0, 'lq_code': 'LQ22'},  # Sulphuric acid < 51%
        
        # Class 2.1 - Aerosols
        {'un_number': 'UN1950', 'max_inner': 1.0, 'lq_code': 'LQ2'},  # Aerosols
        
        # Class 9 - Lithium batteries
        {'un_number': 'UN3480', 'max_inner': 0, 'is_permitted': False},  # Lithium ion batteries
        {'un_number': 'UN3090', 'max_inner': 0, 'is_permitted': False},  # Lithium metal batteries
    ]
    
    created_count = 0
    
    for lq_info in lq_data:
        try:
            dg = DangerousGood.objects.get(un_number=lq_info['un_number'])
            
            lq_limit, created = LimitedQuantityLimit.objects.get_or_create(
                dangerous_good=dg,
                defaults={
                    'max_quantity_inner_package': lq_info.get('max_inner', 1.0),
                    'max_quantity_package': 30.0,
                    'lq_code': lq_info.get('lq_code', ''),
                    'is_lq_permitted': lq_info.get('is_permitted', True),
                    'requires_orientation_arrows': lq_info.get('requires_arrows', False),
                    'special_provisions': lq_info.get('special_provisions', '')
                }
            )
            
            if created:
                created_count += 1
                
        except DangerousGood.DoesNotExist:
            print(f"Warning: Dangerous good {lq_info['un_number']} not found")
    
    return created_count