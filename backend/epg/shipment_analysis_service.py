#!/usr/bin/env python3
"""
Shipment Analysis Service

Analyzes shipments to extract UN numbers and dangerous goods information
for generating UN number-driven, shipment-specific emergency procedures.
"""
import logging
from typing import Dict, List, Optional, Tuple, Set
from django.db.models import Q, Sum, Count
from decimal import Decimal

from shipments.models import Shipment, ConsignmentItem
from dangerous_goods.models import DangerousGood
from .models import ERGContentIntelligence

logger = logging.getLogger(__name__)

class ShipmentAnalysisService:
    """
    Service for analyzing shipments to extract dangerous goods information
    and determine appropriate emergency procedure guidance.
    """
    
    def __init__(self):
        # ADG Code 7.9 quantity thresholds for different response levels
        self.quantity_thresholds = {
            'small': {'weight_kg': 50, 'volume_l': 50},
            'medium': {'weight_kg': 500, 'volume_l': 500},
            'large': {'weight_kg': 5000, 'volume_l': 5000}
        }
        
        # Incompatible hazard class combinations requiring special procedures
        self.incompatible_combinations = {
            ('1', '3'): 'explosive_flammable',  # Explosives + Flammable liquids
            ('1', '5.1'): 'explosive_oxidizer',  # Explosives + Oxidizers
            ('2.3', '8'): 'toxic_corrosive',    # Toxic gas + Corrosive
            ('4.3', '3'): 'water_reactive_flammable',  # Water reactive + Flammable
            ('5.1', '3'): 'oxidizer_flammable', # Oxidizer + Flammable
        }

    def analyze_shipment(self, shipment: Shipment) -> Dict:
        """
        Comprehensive analysis of shipment dangerous goods content.
        
        Args:
            shipment: Shipment object to analyze
            
        Returns:
            Dict containing analysis results including UN numbers, hazards, and risk factors
        """
        logger.info(f"Analyzing shipment {shipment.tracking_number}")
        
        try:
            # Get all dangerous goods items in shipment
            dangerous_items = self._get_dangerous_goods_items(shipment)
            
            if not dangerous_items:
                logger.info(f"No dangerous goods found in shipment {shipment.tracking_number}")
                return self._create_non_dg_analysis(shipment)
            
            # Extract UN numbers and associated data
            un_numbers_data = self._extract_un_numbers_data(dangerous_items)
            
            # Analyze hazard combinations
            hazard_analysis = self._analyze_hazard_combinations(un_numbers_data)
            
            # Calculate risk factors
            risk_assessment = self._calculate_risk_factors(shipment, dangerous_items, un_numbers_data)
            
            # Determine required ERG guides
            erg_guides = self._determine_required_erg_guides(un_numbers_data)
            
            # Analyze transport mode implications
            transport_analysis = self._analyze_transport_mode(shipment, hazard_analysis)
            
            # Generate compliance requirements
            compliance_analysis = self._analyze_compliance_requirements(shipment, un_numbers_data)
            
            analysis_result = {
                'shipment_id': str(shipment.id),
                'tracking_number': shipment.tracking_number,
                'has_dangerous_goods': True,
                'dangerous_goods_count': len(dangerous_items),
                'un_numbers_data': un_numbers_data,
                'hazard_analysis': hazard_analysis,
                'risk_assessment': risk_assessment,
                'required_erg_guides': erg_guides,
                'transport_analysis': transport_analysis,
                'compliance_analysis': compliance_analysis,
                'emergency_priority': self._determine_emergency_priority(hazard_analysis, risk_assessment),
                'recommended_procedures': self._recommend_emergency_procedures(un_numbers_data, hazard_analysis)
            }
            
            logger.info(f"Successfully analyzed shipment {shipment.tracking_number}: {len(un_numbers_data)} UN numbers, risk level {risk_assessment['overall_risk_level']}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing shipment {shipment.tracking_number}: {str(e)}")
            return self._create_error_analysis(shipment, str(e))

    def _get_dangerous_goods_items(self, shipment: Shipment) -> List[ConsignmentItem]:
        """Get all dangerous goods items from shipment"""
        return list(
            shipment.items.filter(
                is_dangerous_good=True,
                dangerous_good_entry__isnull=False
            ).select_related('dangerous_good_entry')
        )

    def _extract_un_numbers_data(self, dangerous_items: List[ConsignmentItem]) -> Dict[str, Dict]:
        """
        Extract UN numbers and associated dangerous goods data from shipment items.
        
        Returns:
            Dict mapping UN numbers to their comprehensive data including quantities
        """
        un_numbers_data = {}
        
        for item in dangerous_items:
            dg = item.dangerous_good_entry
            un_number = dg.un_number
            
            if un_number not in un_numbers_data:
                un_numbers_data[un_number] = {
                    'dangerous_good': dg,
                    'un_number': un_number,
                    'proper_shipping_name': dg.proper_shipping_name,
                    'hazard_class': dg.hazard_class,
                    'subsidiary_risks': dg.subsidiary_risks or '',
                    'packing_group': dg.packing_group,
                    'erg_guide_number': dg.erg_guide_number,
                    'items': [],
                    'total_quantity': 0,
                    'total_weight_kg': Decimal('0'),
                    'total_volume_l': Decimal('0'),
                    'max_receptacle_size': Decimal('0'),
                    'transport_considerations': []
                }
            
            # Add item data
            un_data = un_numbers_data[un_number]
            un_data['items'].append({
                'item_id': str(item.id),
                'description': item.description,
                'quantity': item.quantity,
                'weight_kg': item.weight_kg or 0,
                'volume_l': item.volume_l or 0,
                'receptacle_type': item.receptacle_type,
                'receptacle_capacity_kg': item.receptacle_capacity_kg or 0,
                'receptacle_capacity_l': item.receptacle_capacity_l or 0,
                'dg_quantity_type': item.dg_quantity_type
            })
            
            # Update totals
            un_data['total_quantity'] += item.quantity
            if item.weight_kg:
                un_data['total_weight_kg'] += Decimal(str(item.weight_kg)) * item.quantity
            if item.volume_l:
                un_data['total_volume_l'] += Decimal(str(item.volume_l)) * item.quantity
            
            # Track maximum receptacle size
            if item.receptacle_capacity_kg:
                un_data['max_receptacle_size'] = max(
                    un_data['max_receptacle_size'], 
                    Decimal(str(item.receptacle_capacity_kg))
                )
            if item.receptacle_capacity_l:
                un_data['max_receptacle_size'] = max(
                    un_data['max_receptacle_size'], 
                    Decimal(str(item.receptacle_capacity_l))
                )
            
            # Add transport considerations
            if item.dg_quantity_type == 'LIMITED_QUANTITY':
                un_data['transport_considerations'].append('Limited Quantity (LQ)')
            if item.is_aerosol:
                un_data['transport_considerations'].append('Aerosol Product')
            if item.has_large_receptacle:
                un_data['transport_considerations'].append('Large Receptacle (>500kg/L)')
        
        return un_numbers_data

    def _analyze_hazard_combinations(self, un_numbers_data: Dict[str, Dict]) -> Dict:
        """
        Analyze hazard class combinations for incompatibilities and special procedures.
        """
        hazard_classes = set()
        subsidiary_risks = set()
        
        for un_data in un_numbers_data.values():
            hazard_classes.add(un_data['hazard_class'])
            if un_data['subsidiary_risks']:
                for risk in un_data['subsidiary_risks'].split(','):
                    subsidiary_risks.add(risk.strip())
        
        # Check for incompatible combinations
        incompatible_hazards = []
        special_procedures = []
        
        hazard_list = list(hazard_classes)
        for i in range(len(hazard_list)):
            for j in range(i + 1, len(hazard_list)):
                combination = tuple(sorted([hazard_list[i], hazard_list[j]]))
                if combination in self.incompatible_combinations:
                    incompatible_hazards.append({
                        'hazards': combination,
                        'risk_type': self.incompatible_combinations[combination],
                        'requires_special_procedures': True
                    })
        
        # Determine overall hazard severity
        severity_order = ['1', '2.3', '6.1', '7', '2.1', '5.1', '8', '4.3', '4.2', '4.1', '3', '2.2', '9']
        highest_severity = '9'  # Default to lowest
        for hazard in hazard_classes:
            for severity in severity_order:
                if hazard.startswith(severity):
                    highest_severity = severity
                    break
            if highest_severity != '9':
                break
        
        return {
            'hazard_classes': list(hazard_classes),
            'subsidiary_risks': list(subsidiary_risks),
            'incompatible_combinations': incompatible_hazards,
            'highest_severity_class': highest_severity,
            'requires_segregation': len(incompatible_hazards) > 0,
            'multiple_hazards': len(hazard_classes) > 1,
            'special_procedures_required': len(incompatible_hazards) > 0
        }

    def _calculate_risk_factors(self, shipment: Shipment, dangerous_items: List[ConsignmentItem], un_numbers_data: Dict) -> Dict:
        """
        Calculate comprehensive risk factors for the shipment.
        """
        # Calculate total quantities
        total_weight = sum(float(data['total_weight_kg']) for data in un_numbers_data.values())
        total_volume = sum(float(data['total_volume_l']) for data in un_numbers_data.values())
        
        # Determine quantity risk level
        if total_weight > self.quantity_thresholds['large']['weight_kg'] or \
           total_volume > self.quantity_thresholds['large']['volume_l']:
            quantity_risk = 'HIGH'
        elif total_weight > self.quantity_thresholds['medium']['weight_kg'] or \
             total_volume > self.quantity_thresholds['medium']['volume_l']:
            quantity_risk = 'MEDIUM'
        else:
            quantity_risk = 'LOW'
        
        # Analyze packing groups (lower number = higher risk)
        packing_groups = [data['packing_group'] for data in un_numbers_data.values() if data['packing_group']]
        highest_risk_pg = 'III'  # Default
        if 'I' in packing_groups:
            highest_risk_pg = 'I'
        elif 'II' in packing_groups:
            highest_risk_pg = 'II'
        
        # Check for large receptacles
        has_large_receptacles = any(
            float(data['max_receptacle_size']) > 500 
            for data in un_numbers_data.values()
        )
        
        # Route risk factors (simplified - could be enhanced with actual route data)
        route_risk_factors = []
        if shipment.origin_location and shipment.destination_location:
            # This could be enhanced with actual geographic analysis
            route_risk_factors.append('Interstate transport')
        
        # Determine overall risk level
        risk_factors = [quantity_risk]
        if highest_risk_pg == 'I':
            risk_factors.append('HIGH')
        elif highest_risk_pg == 'II':
            risk_factors.append('MEDIUM')
        
        if has_large_receptacles:
            risk_factors.append('MEDIUM')
        
        # Overall risk is the highest individual risk
        if 'HIGH' in risk_factors:
            overall_risk = 'HIGH'
        elif 'MEDIUM' in risk_factors:
            overall_risk = 'MEDIUM'
        else:
            overall_risk = 'LOW'
        
        return {
            'overall_risk_level': overall_risk,
            'quantity_risk_level': quantity_risk,
            'total_weight_kg': total_weight,
            'total_volume_l': total_volume,
            'highest_risk_packing_group': highest_risk_pg,
            'has_large_receptacles': has_large_receptacles,
            'number_of_un_numbers': len(un_numbers_data),
            'route_risk_factors': route_risk_factors,
            'recommended_response_level': self._determine_response_level(overall_risk, len(un_numbers_data))
        }

    def _determine_required_erg_guides(self, un_numbers_data: Dict) -> List[Dict]:
        """
        Determine which ERG guides are required for the shipment.
        """
        erg_guides = []
        
        for un_data in un_numbers_data.values():
            erg_number = un_data['erg_guide_number']
            if erg_number:
                # Check if we have enhanced intelligence for this ERG guide
                intelligence = ERGContentIntelligence.objects.filter(
                    erg_guide_number=erg_number,
                    validation_status='VALIDATED'
                ).first()
                
                erg_guides.append({
                    'erg_guide_number': erg_number,
                    'un_numbers': [un_data['un_number']],
                    'has_enhanced_intelligence': intelligence is not None,
                    'intelligence_id': str(intelligence.id) if intelligence else None,
                    'applicable_substances': [un_data['proper_shipping_name']]
                })
            else:
                # No ERG guide available - will need generic procedures
                erg_guides.append({
                    'erg_guide_number': None,
                    'un_numbers': [un_data['un_number']],
                    'has_enhanced_intelligence': False,
                    'intelligence_id': None,
                    'applicable_substances': [un_data['proper_shipping_name']],
                    'requires_generic_procedures': True
                })
        
        # Consolidate ERG guides that apply to multiple UN numbers
        consolidated_guides = {}
        for guide in erg_guides:
            erg_num = guide['erg_guide_number']
            if erg_num in consolidated_guides:
                consolidated_guides[erg_num]['un_numbers'].extend(guide['un_numbers'])
                consolidated_guides[erg_num]['applicable_substances'].extend(guide['applicable_substances'])
            else:
                consolidated_guides[erg_num] = guide
        
        return list(consolidated_guides.values())

    def _analyze_transport_mode(self, shipment: Shipment, hazard_analysis: Dict) -> Dict:
        """
        Analyze transport mode implications for emergency procedures.
        """
        # Determine transport mode (this could be enhanced with actual shipment data)
        transport_mode = 'ROAD'  # Default assumption
        
        # Check if assigned vehicle gives us transport mode information
        if hasattr(shipment, 'assigned_vehicle') and shipment.assigned_vehicle:
            # Could determine mode from vehicle type
            pass
        
        # Analyze mode-specific considerations
        mode_considerations = {
            'ROAD': [
                'Highway emergency response procedures applicable',
                'Traffic management and route closure considerations',
                'Urban vs rural response capability differences',
                'Bridge and tunnel restrictions may apply'
            ],
            'RAIL': [
                'Rail network isolation procedures required',
                'Specialized rail emergency response teams needed',
                'Signal system and electrical isolation considerations',
                'Limited access for emergency vehicles'
            ],
            'AIR': [
                'Airport emergency response procedures',
                'Aviation fuel compatibility considerations',
                'Passenger vs cargo aircraft implications',
                'International regulatory requirements'
            ],
            'SEA': [
                'Maritime emergency response procedures',
                'Port emergency response capabilities',
                'Marine pollution prevention requirements',
                'International waters jurisdiction considerations'
            ]
        }
        
        return {
            'primary_transport_mode': transport_mode,
            'mode_specific_considerations': mode_considerations.get(transport_mode, []),
            'requires_specialized_response': transport_mode in ['RAIL', 'AIR', 'SEA'],
            'emergency_access_considerations': self._analyze_emergency_access(transport_mode),
            'regulatory_framework': self._determine_transport_regulations(transport_mode)
        }

    def _analyze_compliance_requirements(self, shipment: Shipment, un_numbers_data: Dict) -> Dict:
        """
        Analyze regulatory compliance requirements for the shipment.
        """
        compliance_requirements = {
            'adg_code_requirements': [],
            'placarding_requirements': [],
            'documentation_requirements': [],
            'driver_training_requirements': [],
            'vehicle_requirements': [],
            'notification_requirements': []
        }
        
        # Analyze each UN number for compliance requirements
        for un_data in un_numbers_data.values():
            hazard_class = un_data['hazard_class']
            packing_group = un_data['packing_group']
            
            # ADG Code requirements
            compliance_requirements['adg_code_requirements'].append(
                f"UN{un_data['un_number']}: Class {hazard_class} transport requirements"
            )
            
            # Placarding requirements
            if float(un_data['total_weight_kg']) > 250 or float(un_data['total_volume_l']) > 250:
                compliance_requirements['placarding_requirements'].append(
                    f"Class {hazard_class} placard required for {un_data['proper_shipping_name']}"
                )
            
            # Driver training requirements
            if hazard_class.startswith('1'):  # Explosives
                compliance_requirements['driver_training_requirements'].append(
                    "Explosives endorsement required on dangerous goods license"
                )
            elif hazard_class == '2.3':  # Toxic gas
                compliance_requirements['driver_training_requirements'].append(
                    "Toxic gas handling training required"
                )
        
        # Emergency documentation requirements
        compliance_requirements['documentation_requirements'] = [
            "Safety Data Sheets accessible during transport",
            "Emergency response guide information available",
            "24/7 emergency contact information provided",
            "CHEMCALL 1800 127 406 contact information displayed"
        ]
        
        return compliance_requirements

    def _determine_emergency_priority(self, hazard_analysis: Dict, risk_assessment: Dict) -> str:
        """
        Determine emergency response priority level for the shipment.
        """
        # High priority conditions
        if (risk_assessment['overall_risk_level'] == 'HIGH' or
            hazard_analysis['highest_severity_class'] in ['1', '2.3', '6.1', '7'] or
            hazard_analysis['requires_segregation']):
            return 'HIGH'
        
        # Medium priority conditions  
        elif (risk_assessment['overall_risk_level'] == 'MEDIUM' or
              hazard_analysis['multiple_hazards'] or
              risk_assessment['has_large_receptacles']):
            return 'MEDIUM'
        
        # Low priority (but still dangerous goods)
        else:
            return 'LOW'

    def _recommend_emergency_procedures(self, un_numbers_data: Dict, hazard_analysis: Dict) -> List[str]:
        """
        Recommend specific emergency procedures based on shipment analysis.
        """
        recommendations = []
        
        # Basic dangerous goods procedures
        recommendations.append("Ensure 24/7 emergency contact availability during transport")
        recommendations.append("Carry appropriate emergency response equipment per ADG Code 7.9")
        
        # ERG guide specific recommendations
        erg_guides = set(data['erg_guide_number'] for data in un_numbers_data.values() if data['erg_guide_number'])
        if erg_guides:
            recommendations.append(f"Review ERG guides: {', '.join(sorted(erg_guides))}")
        
        # Hazard-specific recommendations
        if hazard_analysis['requires_segregation']:
            recommendations.append("Implement additional segregation procedures for incompatible materials")
        
        if hazard_analysis['highest_severity_class'] in ['1', '2.3']:
            recommendations.append("Coordinate with specialized emergency response teams")
        
        # Multi-hazard recommendations
        if hazard_analysis['multiple_hazards']:
            recommendations.append("Prepare for complex emergency scenarios involving multiple hazard types")
        
        return recommendations

    def _determine_response_level(self, risk_level: str, num_un_numbers: int) -> str:
        """Determine appropriate emergency response level"""
        if risk_level == 'HIGH' or num_un_numbers > 5:
            return 'MAJOR_INCIDENT'
        elif risk_level == 'MEDIUM' or num_un_numbers > 2:
            return 'MULTI_AGENCY'
        else:
            return 'LOCAL_RESPONSE'

    def _analyze_emergency_access(self, transport_mode: str) -> List[str]:
        """Analyze emergency access considerations for transport mode"""
        access_considerations = {
            'ROAD': [
                'Emergency vehicle access via highway shoulders',
                'Traffic management for incident isolation',
                'Bridge and overpass height restrictions for emergency equipment'
            ],
            'RAIL': [
                'Limited emergency vehicle access to rail corridors',
                'Specialized rail access equipment may be required',
                'Coordination with rail traffic control for safe access'
            ],
            'AIR': [
                'Airport emergency response vehicle access',
                'Aircraft positioning for emergency access',
                'Coordination with air traffic control'
            ],
            'SEA': [
                'Marine emergency response vessel access',
                'Port emergency response equipment availability',
                'Weather and sea conditions affecting access'
            ]
        }
        return access_considerations.get(transport_mode, [])

    def _determine_transport_regulations(self, transport_mode: str) -> str:
        """Determine applicable regulatory framework"""
        frameworks = {
            'ROAD': 'ADG Code 7.9 - Australian Dangerous Goods Code',
            'RAIL': 'ADG Code 7.9 - Rail Transport Provisions',
            'AIR': 'ICAO Technical Instructions / IATA DGR',
            'SEA': 'IMDG Code - International Maritime Dangerous Goods'
        }
        return frameworks.get(transport_mode, 'General dangerous goods regulations')

    def _create_non_dg_analysis(self, shipment: Shipment) -> Dict:
        """Create analysis result for shipments without dangerous goods"""
        return {
            'shipment_id': str(shipment.id),
            'tracking_number': shipment.tracking_number,
            'has_dangerous_goods': False,
            'dangerous_goods_count': 0,
            'un_numbers_data': {},
            'hazard_analysis': {'hazard_classes': [], 'requires_segregation': False},
            'risk_assessment': {'overall_risk_level': 'NONE'},
            'required_erg_guides': [],
            'emergency_priority': 'NONE',
            'recommended_procedures': ['Standard cargo transport procedures apply']
        }

    def _create_error_analysis(self, shipment: Shipment, error_message: str) -> Dict:
        """Create error analysis result"""
        return {
            'shipment_id': str(shipment.id),
            'tracking_number': shipment.tracking_number,
            'has_dangerous_goods': None,
            'analysis_error': error_message,
            'emergency_priority': 'UNKNOWN',
            'recommended_procedures': ['Manual analysis required due to system error']
        }

    def get_un_numbers_for_emergency_plan(self, shipment: Shipment) -> List[str]:
        """
        Simple method to extract just the UN numbers for emergency plan generation.
        
        This is the core method that drives UN number-based EPG generation.
        """
        dangerous_items = self._get_dangerous_goods_items(shipment)
        
        un_numbers = []
        for item in dangerous_items:
            if item.dangerous_good_entry and item.dangerous_good_entry.un_number:
                un_number = item.dangerous_good_entry.un_number
                if un_number not in un_numbers:
                    un_numbers.append(un_number)
        
        return sorted(un_numbers)

    def get_erg_guides_for_shipment(self, shipment: Shipment) -> List[str]:
        """
        Extract ERG guide numbers required for the shipment.
        
        Returns:
            List of ERG guide numbers needed for emergency procedures
        """
        dangerous_items = self._get_dangerous_goods_items(shipment)
        
        erg_guides = []
        for item in dangerous_items:
            if (item.dangerous_good_entry and 
                item.dangerous_good_entry.erg_guide_number and
                item.dangerous_good_entry.erg_guide_number not in erg_guides):
                erg_guides.append(item.dangerous_good_entry.erg_guide_number)
        
        return sorted(erg_guides)

    def get_enhanced_intelligence_for_shipment(self, shipment: Shipment) -> List[ERGContentIntelligence]:
        """
        Get all enhanced ERG intelligence entries relevant to the shipment.
        
        Returns:
            List of ERGContentIntelligence objects for shipment's dangerous goods
        """
        erg_guides = self.get_erg_guides_for_shipment(shipment)
        
        if not erg_guides:
            return []
        
        return list(
            ERGContentIntelligence.objects.filter(
                erg_guide_number__in=erg_guides,
                validation_status='VALIDATED'
            ).prefetch_related('dangerous_goods')
        )

    def generate_shipment_summary(self, shipment: Shipment) -> str:
        """
        Generate a concise summary of shipment dangerous goods for emergency responders.
        """
        analysis = self.analyze_shipment(shipment)
        
        if not analysis['has_dangerous_goods']:
            return f"Shipment {shipment.tracking_number}: No dangerous goods"
        
        un_numbers = list(analysis['un_numbers_data'].keys())
        risk_level = analysis['risk_assessment']['overall_risk_level']
        emergency_priority = analysis['emergency_priority']
        
        summary = f"Shipment {shipment.tracking_number}: {len(un_numbers)} dangerous goods types, "
        summary += f"Risk: {risk_level}, Priority: {emergency_priority}\n"
        summary += f"UN Numbers: {', '.join(sorted(un_numbers))}\n"
        
        if analysis['required_erg_guides']:
            erg_list = [g['erg_guide_number'] for g in analysis['required_erg_guides'] if g['erg_guide_number']]
            if erg_list:
                summary += f"ERG Guides: {', '.join(sorted(erg_list))}"
        
        return summary