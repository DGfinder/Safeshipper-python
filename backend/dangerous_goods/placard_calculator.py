# dangerous_goods/placard_calculator.py

from decimal import Decimal
from typing import Dict, List, Tuple, Optional
from django.db import transaction
from django.utils import timezone

from .models import (
    ADGPlacardRule, 
    PlacardRequirement, 
    PlacardCalculationLog,
    DangerousGood
)
from shipments.models import Shipment, ConsignmentItem
from .limited_quantity_handler import LimitedQuantityHandler


class ADGPlacardCalculator:
    """
    Australian Dangerous Goods Code 7.9 Placard Load Calculator.
    
    Implements the placard load thresholds and calculation rules as specified in:
    - ADG Code 7.9 Table 5.3.1 (Standard placard loads)
    - ADG Code 7.9 Table 5.3.2 (Limited quantity placard loads)
    - Combined quantity calculations for mixed loads
    """
    
    def __init__(self):
        self.calculation_logs = []
    
    def calculate_placard_requirement(self, shipment: Shipment, user=None) -> PlacardRequirement:
        """
        Calculate placard requirements for a shipment based on ADG Code 7.9.
        
        Args:
            shipment: The shipment to analyze
            user: User performing the calculation (for audit)
            
        Returns:
            PlacardRequirement object with calculated results
        """
        self.calculation_logs = []
        
        with transaction.atomic():
            # Get or create placard requirement record
            placard_req, created = PlacardRequirement.objects.get_or_create(
                shipment=shipment,
                defaults={
                    'calculated_by': user,
                    'placard_status': PlacardRequirement.PlacardStatus.NOT_REQUIRED
                }
            )
            
            # Reset calculation state
            placard_req.required_placard_types = []
            placard_req.calculation_details = {}
            placard_req.calculated_by = user
            
            # Analyze shipment contents
            analysis = self._analyze_shipment_contents(shipment)
            
            # Store aggregate calculations
            placard_req.total_dg_weight_kg = analysis['total_dg_weight_kg']
            placard_req.total_dg_volume_l = analysis['total_dg_volume_l']
            placard_req.total_lq_weight_kg = analysis['total_lq_weight_kg']
            placard_req.combined_quantity_kg = analysis['combined_quantity_kg']
            placard_req.has_large_receptacles = analysis['has_large_receptacles']
            placard_req.class_2_1_quantity_kg = analysis['class_2_1_quantity_kg']
            
            # Apply ADG placard rules
            rules_triggered = self._apply_placard_rules(analysis, placard_req)
            
            # Determine overall placard status
            if rules_triggered:
                placard_req.placard_status = PlacardRequirement.PlacardStatus.REQUIRED
            else:
                placard_req.placard_status = PlacardRequirement.PlacardStatus.NOT_REQUIRED
            
            # Store detailed calculation results
            placard_req.calculation_details = {
                'analysis_summary': analysis,
                'rules_triggered': rules_triggered,
                'calculation_timestamp': timezone.now().isoformat(),
                'adg_code_version': '7.9'
            }
            
            placard_req.save()
            
            # Save calculation logs
            self._save_calculation_logs(placard_req)
            
            return placard_req
    
    def _analyze_shipment_contents(self, shipment: Shipment) -> Dict:
        """
        Analyze shipment contents and calculate relevant quantities.
        Enhanced with proper Limited Quantity handling.
        """
        dg_items = shipment.items.filter(is_dangerous_good=True)
        
        # Initialize totals
        total_dg_weight_kg = 0
        total_dg_volume_l = 0
        total_lq_weight_kg = 0
        total_dc_weight_kg = 0  # Domestic Consumables
        class_2_1_quantity_kg = 0
        has_large_receptacles = False
        
        # LQ analysis using enhanced handler
        lq_handler = LimitedQuantityHandler()
        lq_analysis = lq_handler.calculate_lq_placard_requirements(shipment)
        
        # Item-by-item analysis
        item_details = []
        lq_validation_results = []
        
        for item in dg_items:
            item_data = item.get_placard_relevant_quantity()
            
            # Validate LQ status if item claims to be LQ
            if item_data['is_limited_quantity']:
                lq_validation = lq_handler.validate_lq_consignment_item(item)
                lq_validation_results.append({
                    'item_id': item.id,
                    'validation': lq_validation
                })
                
                # Only count as LQ if validation passes
                if lq_validation['is_valid_lq']:
                    total_lq_weight_kg += item_data['weight_kg']
                else:
                    # Invalid LQ - count as standard DG
                    total_dg_weight_kg += item_data['weight_kg']
                    total_dg_volume_l += item_data['volume_l']
            
            # Domestic Consumables
            elif item_data['is_domestic_consumable']:
                total_dc_weight_kg += item_data['weight_kg']
            
            # Standard DG quantities
            elif item_data['is_standard_dg']:
                total_dg_weight_kg += item_data['weight_kg']
                total_dg_volume_l += item_data['volume_l']
            
            # Class 2.1 flammable gas (excluding aerosols)
            if item_data['is_class_2_1_flammable']:
                # Only count towards Class 2.1 threshold if not LQ
                if not item_data['is_limited_quantity'] or not lq_validation_results or not lq_validation_results[-1]['validation']['is_valid_lq']:
                    class_2_1_quantity_kg += item_data['weight_kg']
            
            # Large receptacles check
            if item_data['has_large_receptacle']:
                has_large_receptacles = True
            
            item_details.append({
                'item_id': item.id,
                'description': item.description[:100],
                'un_number': item.dangerous_good_entry.un_number if item.dangerous_good_entry else None,
                'hazard_class': item.dangerous_good_entry.hazard_class if item.dangerous_good_entry else None,
                'quantities': item_data,
                'lq_status': item_data['is_limited_quantity'],
                'lq_valid': lq_validation_results[-1]['validation']['is_valid_lq'] if lq_validation_results and item_data['is_limited_quantity'] else None
            })
        
        # Enhanced combined quantity calculation per ADG Code 7.9
        # Combined = Standard DG + (LQ * 0.1) + (DC * 0.1)
        combined_quantity_kg = total_dg_weight_kg + (total_lq_weight_kg * 0.1) + (total_dc_weight_kg * 0.1)
        
        self._log_calculation(
            None, False, combined_quantity_kg, 0,
            f"Enhanced combined quantity: {total_dg_weight_kg}kg DG + ({total_lq_weight_kg}kg LQ * 0.1) + ({total_dc_weight_kg}kg DC * 0.1) = {combined_quantity_kg}kg"
        )
        
        return {
            'total_dg_weight_kg': total_dg_weight_kg,
            'total_dg_volume_l': total_dg_volume_l,
            'total_lq_weight_kg': total_lq_weight_kg,
            'total_dc_weight_kg': total_dc_weight_kg,
            'combined_quantity_kg': combined_quantity_kg,
            'class_2_1_quantity_kg': class_2_1_quantity_kg,
            'has_large_receptacles': has_large_receptacles,
            'item_count': dg_items.count(),
            'item_details': item_details,
            'lq_analysis': lq_analysis,
            'lq_validation_results': lq_validation_results,
            'has_mixed_load': lq_analysis['mixed_load']
        }
    
    def _apply_placard_rules(self, analysis: Dict, placard_req: PlacardRequirement) -> List[Dict]:
        """
        Apply ADG placard rules to the analyzed shipment data.
        """
        rules_triggered = []
        required_placards = set()
        
        # Get active ADG placard rules, ordered by priority
        rules = ADGPlacardRule.objects.filter(is_active=True).order_by('priority')
        
        for rule in rules:
            triggered, quantity_measured = self._evaluate_rule(rule, analysis)
            
            if triggered:
                rules_triggered.append({
                    'rule_id': rule.id,
                    'rule_type': rule.placard_type,
                    'description': rule.description,
                    'threshold': rule.threshold_quantity,
                    'measured_quantity': quantity_measured,
                    'regulatory_reference': rule.regulatory_reference
                })
                
                # Determine required placard types based on rule
                required_placards.update(self._get_required_placards_for_rule(rule, analysis))
            
            # Log this rule evaluation
            self._log_calculation(rule, triggered, quantity_measured, rule.threshold_quantity,
                               f"Rule: {rule.description}")
        
        # Update placard requirement with required types
        placard_req.required_placard_types = list(required_placards)
        
        return rules_triggered
    
    def _evaluate_rule(self, rule: ADGPlacardRule, analysis: Dict) -> Tuple[bool, float]:
        """
        Evaluate a specific ADG placard rule against shipment analysis.
        
        Returns:
            Tuple of (rule_triggered: bool, measured_quantity: float)
        """
        
        if rule.placard_type == ADGPlacardRule.PlacardType.LARGE_RECEPTACLE:
            # Large receptacle rule (>500kg/L individual receptacles)
            return analysis['has_large_receptacles'], 1 if analysis['has_large_receptacles'] else 0
        
        elif rule.placard_type == ADGPlacardRule.PlacardType.FLAMMABLE_CLASS_2_1:
            # Class 2.1 flammable gas (excluding aerosols) - 250kg threshold
            quantity = analysis['class_2_1_quantity_kg']
            return quantity >= rule.threshold_quantity, quantity
        
        elif rule.placard_type == ADGPlacardRule.PlacardType.STANDARD_DG:
            # Standard DG aggregate quantity - 1000kg/L threshold
            if rule.quantity_type == ADGPlacardRule.QuantityType.WEIGHT_KG:
                quantity = analysis['total_dg_weight_kg']
            elif rule.quantity_type == ADGPlacardRule.QuantityType.VOLUME_L:
                quantity = analysis['total_dg_volume_l']
            else:  # WEIGHT_OR_VOLUME
                quantity = max(analysis['total_dg_weight_kg'], analysis['total_dg_volume_l'])
            
            return quantity >= rule.threshold_quantity, quantity
        
        elif rule.placard_type == ADGPlacardRule.PlacardType.LIMITED_QUANTITY:
            # Limited quantity threshold (separate from combined calculation)
            quantity = analysis['total_lq_weight_kg']
            return quantity >= rule.threshold_quantity, quantity
        
        else:
            # Default case - use combined quantity
            quantity = analysis['combined_quantity_kg']
            return quantity >= rule.threshold_quantity, quantity
    
    def _get_required_placards_for_rule(self, rule: ADGPlacardRule, analysis: Dict) -> List[str]:
        """
        Determine which specific placards are required based on triggered rule.
        """
        placards = []
        
        if rule.placard_type == ADGPlacardRule.PlacardType.LARGE_RECEPTACLE:
            # Large receptacles require Emergency Information Panels
            placards.append(PlacardRequirement.PlacardTypeRequired.EMERGENCY_INFO_PANEL)
        
        elif rule.placard_type in [
            ADGPlacardRule.PlacardType.STANDARD_DG,
            ADGPlacardRule.PlacardType.FLAMMABLE_CLASS_2_1
        ]:
            # Standard DG requires class diamond placards
            placards.append(PlacardRequirement.PlacardTypeRequired.CLASS_DIAMOND)
        
        elif rule.placard_type == ADGPlacardRule.PlacardType.LIMITED_QUANTITY:
            # Limited quantities require LQ placard
            placards.append(PlacardRequirement.PlacardTypeRequired.LIMITED_QUANTITY)
        
        # Add marine pollutant placard if applicable
        if self._has_marine_pollutants(analysis):
            placards.append(PlacardRequirement.PlacardTypeRequired.MARINE_POLLUTANT)
        
        return placards
    
    def _has_marine_pollutants(self, analysis: Dict) -> bool:
        """Check if shipment contains marine pollutants."""
        # This would need to check the dangerous goods entries
        # For now, return False - can be enhanced later
        return False
    
    def _log_calculation(self, rule: Optional[ADGPlacardRule], triggered: bool, 
                        measured_quantity: float, threshold_quantity: float, notes: str):
        """Log a calculation step for audit trail."""
        self.calculation_logs.append({
            'rule': rule,
            'triggered': triggered,
            'measured_quantity': measured_quantity,
            'threshold_quantity': threshold_quantity,
            'notes': notes
        })
    
    def _save_calculation_logs(self, placard_req: PlacardRequirement):
        """Save calculation logs to database."""
        for log_entry in self.calculation_logs:
            PlacardCalculationLog.objects.create(
                placard_requirement=placard_req,
                rule_applied=log_entry['rule'],
                rule_triggered=log_entry['triggered'],
                measured_quantity=log_entry['measured_quantity'],
                threshold_quantity=log_entry['threshold_quantity'],
                calculation_notes=log_entry['notes']
            )


def setup_default_adg_rules():
    """
    Set up the default ADG Code 7.9 placard rules.
    This should be called as part of a management command or migration.
    """
    
    rules_data = [
        # Large receptacle rule (highest priority)
        {
            'placard_type': ADGPlacardRule.PlacardType.LARGE_RECEPTACLE,
            'hazard_class': None,
            'threshold_quantity': 500,
            'quantity_type': ADGPlacardRule.QuantityType.WEIGHT_OR_VOLUME,
            'is_individual_receptacle': True,
            'description': 'Dangerous goods in receptacles with capacity > 500kg/L',
            'priority': 10,
            'regulatory_reference': 'ADG Code 7.9 Table 5.3.1(a)'
        },
        
        # Class 2.1 flammable gas (excluding aerosols)
        {
            'placard_type': ADGPlacardRule.PlacardType.FLAMMABLE_CLASS_2_1,
            'hazard_class': '2.1',
            'threshold_quantity': 250,
            'quantity_type': ADGPlacardRule.QuantityType.WEIGHT_OR_VOLUME,
            'is_individual_receptacle': False,
            'description': 'Class 2.1 flammable dangerous goods (excluding aerosols) > 250kg/L',
            'priority': 20,
            'regulatory_reference': 'ADG Code 7.9 Table 5.3.1(b)'
        },
        
        # Standard DG aggregate threshold
        {
            'placard_type': ADGPlacardRule.PlacardType.STANDARD_DG,
            'hazard_class': None,
            'threshold_quantity': 1000,
            'quantity_type': ADGPlacardRule.QuantityType.WEIGHT_OR_VOLUME,
            'is_individual_receptacle': False,
            'description': 'Total aggregate quantity of dangerous goods ≥ 1000kg/L',
            'priority': 30,
            'regulatory_reference': 'ADG Code 7.9 Table 5.3.1(g)'
        },
        
        # Limited quantity threshold (separate rule)
        {
            'placard_type': ADGPlacardRule.PlacardType.LIMITED_QUANTITY,
            'hazard_class': None,
            'threshold_quantity': 1000,
            'quantity_type': ADGPlacardRule.QuantityType.WEIGHT_KG,
            'is_individual_receptacle': False,
            'description': 'Limited Quantity dangerous goods ≥ 1000kg (separate threshold)',
            'priority': 40,
            'regulatory_reference': 'ADG Code 7.9 Table 5.3.2'
        }
    ]
    
    for rule_data in rules_data:
        ADGPlacardRule.objects.get_or_create(
            placard_type=rule_data['placard_type'],
            hazard_class=rule_data['hazard_class'],
            defaults=rule_data
        )