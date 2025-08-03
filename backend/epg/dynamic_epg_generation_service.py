#!/usr/bin/env python3
"""
Dynamic EPG Generation Service

Generates UN number-driven, shipment-specific Emergency Procedure Guides (EPGs)
using enhanced ERG intelligence and shipment analysis data.
"""
import logging
from typing import Dict, List, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta

from .models import EmergencyProcedureGuide, ERGContentIntelligence, ShipmentEmergencyPlan
from .shipment_analysis_service import ShipmentAnalysisService
from shipments.models import Shipment
from dangerous_goods.models import DangerousGood

logger = logging.getLogger(__name__)

class DynamicEPGGenerationService:
    """
    Service for generating dynamic, UN number-driven Emergency Procedure Guides
    that are superior to standard ERG manuals through enhanced content and context.
    """
    
    def __init__(self):
        self.analysis_service = ShipmentAnalysisService()
        
        # Template priorities for different hazard classes
        self.hazard_response_priorities = {
            '1': {'priority': 1, 'category': 'EXPLOSIVE'},
            '2.3': {'priority': 2, 'category': 'TOXIC_GAS'},
            '6.1': {'priority': 3, 'category': 'TOXIC'},
            '7': {'priority': 4, 'category': 'RADIOACTIVE'},
            '2.1': {'priority': 5, 'category': 'FLAMMABLE_GAS'},
            '5.1': {'priority': 6, 'category': 'OXIDIZER'},
            '8': {'priority': 7, 'category': 'CORROSIVE'},
            '4.3': {'priority': 8, 'category': 'WATER_REACTIVE'},
            '4.2': {'priority': 9, 'category': 'SPONTANEOUS_COMBUSTION'},
            '4.1': {'priority': 10, 'category': 'FLAMMABLE_SOLID'},
            '3': {'priority': 11, 'category': 'FLAMMABLE_LIQUID'},
            '2.2': {'priority': 12, 'category': 'NON_FLAMMABLE_GAS'},
            '9': {'priority': 13, 'category': 'MISCELLANEOUS'}
        }

    def generate_un_number_epg(self, un_number: str, context: Dict = None) -> Optional[EmergencyProcedureGuide]:
        """
        Generate an enhanced EPG for a specific UN number using available intelligence.
        
        Args:
            un_number: UN number to generate EPG for
            context: Additional context like transport mode, quantities, etc.
            
        Returns:
            EmergencyProcedureGuide object with enhanced content
        """
        logger.info(f"Generating dynamic EPG for UN number {un_number}")
        
        try:
            # Get dangerous good information
            dangerous_good = DangerousGood.objects.filter(un_number=un_number).first()
            if not dangerous_good:
                logger.error(f"No dangerous good found for UN number {un_number}")
                return None
            
            # Get ERG intelligence if available
            erg_intelligence = None
            if dangerous_good.erg_guide_number:
                erg_intelligence = ERGContentIntelligence.objects.filter(
                    erg_guide_number=dangerous_good.erg_guide_number,
                    validation_status='VALIDATED'
                ).first()
            
            # Generate EPG content
            epg_content = self._generate_enhanced_epg_content(dangerous_good, erg_intelligence, context)
            
            # Create EPG object
            epg = self._create_epg_object(dangerous_good, epg_content, context)
            
            logger.info(f"Successfully generated EPG for UN{un_number}: {epg.title}")
            return epg
            
        except Exception as e:
            logger.error(f"Error generating EPG for UN{un_number}: {str(e)}")
            return None

    def generate_shipment_epg_suite(self, shipment: Shipment) -> List[EmergencyProcedureGuide]:
        """
        Generate a complete suite of EPGs for all dangerous goods in a shipment.
        
        This is the core method that creates UN number-driven emergency procedures.
        """
        logger.info(f"Generating EPG suite for shipment {shipment.tracking_number}")
        
        try:
            # Analyze shipment to get comprehensive context
            shipment_analysis = self.analysis_service.analyze_shipment(shipment)
            
            if not shipment_analysis['has_dangerous_goods']:
                logger.info(f"No dangerous goods in shipment {shipment.tracking_number}")
                return []
            
            epg_suite = []
            
            # Generate EPG for each UN number in the shipment
            for un_number, un_data in shipment_analysis['un_numbers_data'].items():
                context = {
                    'shipment': shipment,
                    'shipment_analysis': shipment_analysis,
                    'un_data': un_data,
                    'multi_hazard_shipment': len(shipment_analysis['un_numbers_data']) > 1,
                    'transport_mode': shipment_analysis['transport_analysis']['primary_transport_mode'],
                    'risk_level': shipment_analysis['risk_assessment']['overall_risk_level'],
                    'incompatible_combinations': shipment_analysis['hazard_analysis']['incompatible_combinations']
                }
                
                epg = self.generate_un_number_epg(un_number, context)
                if epg:
                    epg_suite.append(epg)
            
            # Generate combined procedures for multi-hazard scenarios
            if len(epg_suite) > 1:
                combined_epg = self._generate_combined_procedures_epg(shipment, shipment_analysis, epg_suite)
                if combined_epg:
                    epg_suite.append(combined_epg)
            
            logger.info(f"Generated {len(epg_suite)} EPGs for shipment {shipment.tracking_number}")
            return epg_suite
            
        except Exception as e:
            logger.error(f"Error generating EPG suite for shipment {shipment.tracking_number}: {str(e)}")
            return []

    def _generate_enhanced_epg_content(self, dangerous_good: DangerousGood, erg_intelligence: Optional[ERGContentIntelligence], context: Dict = None) -> Dict:
        """
        Generate enhanced EPG content using available intelligence and context.
        """
        context = context or {}
        
        # Start with basic dangerous good information
        content = {
            'title': f"Emergency Procedures - {dangerous_good.proper_shipping_name}",
            'hazard_class': dangerous_good.hazard_class,
            'subsidiary_risks': dangerous_good.subsidiary_risks or '',
            'packing_group': dangerous_good.packing_group
        }
        
        # Use ERG intelligence if available, otherwise generate from basic principles
        if erg_intelligence:
            content.update(self._extract_from_erg_intelligence(erg_intelligence, dangerous_good, context))
        else:
            content.update(self._generate_from_hazard_class(dangerous_good, context))
        
        # Add shipment-specific enhancements
        if context.get('shipment_analysis'):
            content.update(self._add_shipment_context(content, context))
        
        # Add transport mode specific guidance
        if context.get('transport_mode'):
            content.update(self._add_transport_guidance(content, context['transport_mode'], dangerous_good))
        
        return content

    def _extract_from_erg_intelligence(self, erg_intelligence: ERGContentIntelligence, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """
        Extract and adapt content from ERG intelligence for specific context.
        """
        base_content = {
            'immediate_actions': erg_intelligence.enhanced_immediate_actions,
            'personal_protection': erg_intelligence.enhanced_personal_protection,
            'fire_procedures': erg_intelligence.enhanced_fire_procedures,
            'spill_procedures': erg_intelligence.enhanced_spill_procedures,
            'medical_procedures': erg_intelligence.enhanced_medical_response,
            'evacuation_procedures': erg_intelligence.enhanced_evacuation_procedures,
            'environmental_precautions': erg_intelligence.environmental_protection_au,
            'notification_requirements': self._format_notification_requirements(erg_intelligence.notification_protocols),
            'emergency_contacts': erg_intelligence.australian_emergency_contacts
        }
        
        # Adapt content based on context
        if context.get('transport_mode') == 'ROAD':
            base_content['transport_specific_guidance'] = erg_intelligence.road_transport_guidance
        elif context.get('transport_mode') == 'RAIL':
            base_content['transport_specific_guidance'] = erg_intelligence.rail_transport_guidance
        
        # Add quantity-based procedures if applicable
        if context.get('un_data'):
            quantity_procedures = self._adapt_quantity_procedures(
                erg_intelligence.quantity_based_procedures,
                context['un_data']
            )
            base_content['quantity_specific_procedures'] = quantity_procedures
        
        return base_content

    def _generate_from_hazard_class(self, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """
        Generate EPG content from hazard class when no ERG intelligence is available.
        """
        hazard_class = dangerous_good.hazard_class
        
        # Get hazard category for template selection
        category = 'GENERAL'
        for hc, info in self.hazard_response_priorities.items():
            if hazard_class.startswith(hc):
                category = info['category']
                break
        
        # Generate content based on hazard category
        content_generators = {
            'EXPLOSIVE': self._generate_explosive_procedures,
            'TOXIC_GAS': self._generate_toxic_gas_procedures,
            'FLAMMABLE_LIQUID': self._generate_flammable_liquid_procedures,
            'CORROSIVE': self._generate_corrosive_procedures,
            'OXIDIZER': self._generate_oxidizer_procedures
        }
        
        generator = content_generators.get(category, self._generate_general_procedures)
        return generator(dangerous_good, context)

    def _generate_explosive_procedures(self, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """Generate procedures for explosive materials"""
        return {
            'immediate_actions': f"""EXPLOSIVE EMERGENCY - {dangerous_good.proper_shipping_name}

IMMEDIATE EVACUATION REQUIRED:
• Establish minimum 800m evacuation radius immediately
• Contact emergency services (000) - specify explosive material incident
• Do not use radio communications within 100m of explosive materials
• Alert police bomb squad for specialized explosive ordnance disposal

CRITICAL SAFETY MEASURES:
• All personnel must evacuate to safe distance upwind and behind solid cover
• No smoking, open flames, or electrical equipment within evacuation zone
• Approach explosive materials only if absolutely necessary for life safety
• Document any visible damage to explosive packaging or containers""",

            'personal_protection': """PERSONAL PROTECTION - EXPLOSIVES:
• Minimum approach distance: 300m for reconnaissance
• Ballistic protection recommended for EOD personnel only
• No metal tools or equipment that could create sparks
• Emergency withdrawal plan mandatory before any approach""",

            'fire_procedures': """FIRE SUPPRESSION - EXPLOSIVES:
• DO NOT fight fires involving explosive materials
• Evacuate to minimum 1600m if explosives are on fire
• Apply water cooling to non-explosive exposed materials only
• Coordinate with Fire & Rescue and police bomb squad""",

            'evacuation_procedures': """EVACUATION - EXPLOSIVES:
• Initial evacuation: 800m radius minimum
• If fire involved: 1600m radius minimum
• Establish command post at safe distance with good communication
• Account for all personnel and prevent re-entry until cleared by authorities"""
        }

    def _generate_toxic_gas_procedures(self, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """Generate procedures for toxic gas materials"""
        return {
            'immediate_actions': f"""TOXIC GAS EMERGENCY - {dangerous_good.proper_shipping_name}

IMMEDIATE PROTECTION REQUIRED:
• Approach from upwind direction only with positive pressure breathing apparatus
• Establish immediate downwind evacuation zone minimum 500m
• Contact emergency services (000) and CHEMCALL (1800 127 406)
• Monitor air quality before allowing any personnel in affected area

LEAK CONTROL PRIORITIES:
• Stop leak at source only if safely accessible with proper PPE
• Do not attempt rescue without self-contained breathing apparatus
• Apply water spray to reduce vapor concentration if appropriate
• Prevent vapor cloud from reaching populated areas or ignition sources""",

            'medical_procedures': f"""MEDICAL RESPONSE - TOXIC GAS EXPOSURE:
• Remove victims from contaminated area using proper respiratory protection
• Contact Poison Information Centre: 13 11 26
• Begin decontamination immediately while awaiting ambulance
• Specific antidote information: {dangerous_good.proper_shipping_name} may require specialized medical treatment
• Transport to hospital with advanced life support capability"""
        }

    def _generate_flammable_liquid_procedures(self, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """Generate procedures for flammable liquid materials"""
        return {
            'fire_procedures': f"""FIRE SUPPRESSION - {dangerous_good.proper_shipping_name}

SMALL FIRES:
• Use AFFF (Aqueous Film Forming Foam) or dry chemical
• Approach from upwind with escape route planned
• Cool nearby containers with water spray

LARGE FIRES:
• Establish defensive positions and protect exposures
• Use alcohol-resistant foam for alcohol-based liquids
• Consider controlled burn if evacuation area secured
• Monitor for boilover potential with heated containers

SPECIAL CONSIDERATIONS:
• Never use water jet directly on burning liquid
• Beware of vapor cloud formation and flashback potential
• Eliminate ignition sources within 300m radius""",

            'spill_procedures': f"""SPILL RESPONSE - FLAMMABLE LIQUIDS:
• Eliminate all ignition sources immediately
• Construct containment barriers to prevent spread
• Use compatible absorbent materials (non-sparking)
• Ventilate area to prevent vapor accumulation
• Monitor vapor concentrations with appropriate detection equipment"""
        }

    def _generate_corrosive_procedures(self, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """Generate procedures for corrosive materials"""
        return {
            'medical_procedures': f"""MEDICAL RESPONSE - CORROSIVE EXPOSURE:
• Flush exposed skin/eyes with copious water for minimum 15 minutes
• Remove contaminated clothing immediately
• Do not neutralize on skin - use water only
• Transport to hospital - alert receiving facility of corrosive exposure
• Continue irrigation en route if possible""",

            'spill_procedures': f"""SPILL RESPONSE - CORROSIVE MATERIALS:
• Avoid direct contact with spilled material
• Neutralize small spills only if trained and proper materials available
• Use appropriate absorbent materials compatible with {dangerous_good.proper_shipping_name}
• Protect drains and waterways from contamination
• Test area for residual contamination before cleanup completion"""
        }

    def _generate_oxidizer_procedures(self, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """Generate procedures for oxidizing materials"""
        return {
            'fire_procedures': f"""FIRE RESPONSE - OXIDIZING MATERIALS:
• Oxidizers will intensify fires - use flooding quantities of water
• Separate oxidizing materials from combustible materials immediately
• Cool containers with water spray to prevent decomposition
• Beware of violent reactions with organic materials
• Consider evacuation if large quantities involved in fire""",

            'spill_procedures': f"""SPILL RESPONSE - OXIDIZERS:
• Keep oxidizing materials away from combustible materials
• Use inert absorbent materials only
• Do not use organic absorbents (sawdust, paper, etc.)
• Flush area with water after cleanup to remove residual oxidizer
• Monitor for spontaneous combustion of contaminated materials"""
        }

    def _generate_general_procedures(self, dangerous_good: DangerousGood, context: Dict) -> Dict:
        """Generate general procedures for unspecified hazard types"""
        return {
            'immediate_actions': f"""DANGEROUS GOODS EMERGENCY - {dangerous_good.proper_shipping_name}

GENERAL RESPONSE PRIORITIES:
• Contact emergency services (000) immediately
• Establish safety perimeter and restrict access
• Identify specific hazards from dangerous goods documentation
• Contact CHEMCALL (1800 127 406) for specialized advice
• Monitor weather conditions affecting incident response""",

            'personal_protection': """GENERAL PPE REQUIREMENTS:
• Chemical-resistant clothing appropriate to hazard
• Respiratory protection based on atmospheric monitoring
• Safety eyewear and face protection
• Emergency decontamination procedures established""",

            'spill_procedures': """GENERAL SPILL RESPONSE:
• Contain spill to prevent environmental contamination
• Use appropriate absorbent materials
• Document spill size and affected area
• Coordinate with EPA for environmental assessment if required"""
        }

    def _add_shipment_context(self, content: Dict, context: Dict) -> Dict:
        """Add shipment-specific context to EPG content"""
        shipment_analysis = context['shipment_analysis']
        additions = {}
        
        # Add multi-hazard considerations
        if context.get('multi_hazard_shipment'):
            additions['multi_hazard_considerations'] = self._generate_multi_hazard_guidance(
                shipment_analysis['hazard_analysis']
            )
        
        # Add quantity-specific guidance
        un_data = context.get('un_data', {})
        if un_data:
            additions['quantity_considerations'] = self._generate_quantity_guidance(un_data)
        
        # Add risk level specific procedures
        risk_level = context.get('risk_level', 'LOW')
        additions['risk_level_procedures'] = self._generate_risk_level_procedures(risk_level)
        
        return additions

    def _add_transport_guidance(self, content: Dict, transport_mode: str, dangerous_good: DangerousGood) -> Dict:
        """Add transport mode specific guidance"""
        guidance_templates = {
            'ROAD': f"""ROAD TRANSPORT EMERGENCY GUIDANCE:
• Implement traffic control measures for highway incident
• Consider bridge/tunnel structural implications
• Coordinate with police for route closure if required
• Account for emergency vehicle access via highway shoulders""",

            'RAIL': f"""RAIL TRANSPORT EMERGENCY GUIDANCE:
• Contact rail traffic control immediately - stop all traffic
• Implement 1km rail corridor isolation minimum
• Check overhead electrical lines - coordinate isolation
• Specialized rail emergency response teams required""",

            'AIR': f"""AIR TRANSPORT EMERGENCY GUIDANCE:
• Airport emergency response procedures apply
• Coordinate with air traffic control for runway closure
• Consider aviation fuel compatibility issues
• Specialized aircraft rescue and firefighting equipment""",

            'SEA': f"""MARITIME EMERGENCY GUIDANCE:
• Maritime emergency response procedures
• Coordinate with port emergency response teams
• Prevent marine pollution - containment priority
• Consider weather and sea conditions"""
        }
        
        return {'transport_specific_guidance': guidance_templates.get(transport_mode, '')}

    def _generate_multi_hazard_guidance(self, hazard_analysis: Dict) -> str:
        """Generate guidance for multi-hazard scenarios"""
        if not hazard_analysis['incompatible_combinations']:
            return """MULTIPLE HAZARDS PRESENT:
• Assess each hazard type for appropriate response procedures
• Coordinate response to address most severe hazard first
• Implement segregation procedures during emergency response
• Consider cumulative effects of multiple chemical exposures"""
        
        incompatible_info = []
        for combo in hazard_analysis['incompatible_combinations']:
            incompatible_info.append(
                f"Classes {combo['hazards'][0]} and {combo['hazards'][1]} - {combo['risk_type']} risk"
            )
        
        return f"""INCOMPATIBLE HAZARDS WARNING:
• SPECIAL PROCEDURES REQUIRED for incompatible materials
• Incompatible combinations present: {'; '.join(incompatible_info)}
• Implement enhanced segregation during emergency response
• Consider specialized HAZMAT teams for complex scenarios
• Evacuate larger area due to potential interaction effects"""

    def _generate_quantity_guidance(self, un_data: Dict) -> str:
        """Generate quantity-specific guidance"""
        total_weight = float(un_data.get('total_weight_kg', 0))
        total_volume = float(un_data.get('total_volume_l', 0))
        
        if total_weight > 5000 or total_volume > 5000:
            return f"""LARGE QUANTITY INCIDENT - {total_weight:.1f}kg / {total_volume:.1f}L:
• Major incident response procedures required
• Multi-agency coordination necessary
• Extended evacuation areas may be required
• Specialized heavy equipment for containment/cleanup
• Consider environmental impact assessment"""
        
        elif total_weight > 500 or total_volume > 500:
            return f"""MEDIUM QUANTITY INCIDENT - {total_weight:.1f}kg / {total_volume:.1f}L:
• Enhanced response procedures recommended
• HAZMAT specialist teams required
• Establish extended safety perimeter
• Coordinate with regional emergency services"""
        
        else:
            return f"""SMALL QUANTITY INCIDENT - {total_weight:.1f}kg / {total_volume:.1f}L:
• Local emergency services response appropriate
• Standard safety perimeter procedures
• Monitor for escalation potential"""

    def _generate_risk_level_procedures(self, risk_level: str) -> str:
        """Generate procedures based on overall risk level"""
        procedures = {
            'HIGH': """HIGH RISK INCIDENT PROCEDURES:
• Implement major incident command structure
• Coordinate with multiple emergency agencies
• Establish large evacuation zones
• Consider specialized response teams (HAZMAT, EOD, etc.)
• Prepare for extended incident duration
• Media and public information coordination required""",

            'MEDIUM': """MEDIUM RISK INCIDENT PROCEDURES:
• Establish incident command structure
• Coordinate with regional emergency services
• Implement standard evacuation procedures
• Monitor for escalation potential
• Document all response actions thoroughly""",

            'LOW': """LOW RISK INCIDENT PROCEDURES:
• Local emergency services response
• Standard safety procedures apply
• Monitor situation for changes
• Follow established dangerous goods protocols"""
        }
        
        return procedures.get(risk_level, procedures['LOW'])

    def _format_notification_requirements(self, notification_protocols: Dict) -> str:
        """Format notification requirements for EPG"""
        if not notification_protocols:
            return """NOTIFICATION REQUIREMENTS:
• Emergency Services: 000
• CHEMCALL: 1800 127 406
• Poison Information: 13 11 26
• Company emergency contact
• Regulatory authorities as required"""
        
        formatted = "NOTIFICATION REQUIREMENTS:\n"
        
        if 'immediate_notification' in notification_protocols:
            formatted += "IMMEDIATE (within minutes):\n"
            for service, contact in notification_protocols['immediate_notification'].items():
                formatted += f"• {service.replace('_', ' ').title()}: {contact}\n"
        
        if 'regulatory_notification' in notification_protocols:
            formatted += "\nREGULATORY (within 1-4 hours):\n"
            for authority, contact in notification_protocols['regulatory_notification'].items():
                formatted += f"• {authority.replace('_', ' ').title()}: {contact}\n"
        
        return formatted

    def _adapt_quantity_procedures(self, quantity_procedures: Dict, un_data: Dict) -> str:
        """Adapt quantity-based procedures to actual shipment quantities"""
        if not quantity_procedures:
            return ""
        
        total_weight = float(un_data.get('total_weight_kg', 0))
        
        # Determine which threshold applies
        if total_weight > 500:
            threshold_key = 'large_quantities'
        elif total_weight > 50:
            threshold_key = 'medium_quantities'
        else:
            threshold_key = 'small_quantities'
        
        if threshold_key in quantity_procedures:
            procedure_info = quantity_procedures[threshold_key]
            return f"QUANTITY-BASED PROCEDURES ({total_weight:.1f}kg):\n{procedure_info.get('response', '')}"
        
        return ""

    def _create_epg_object(self, dangerous_good: DangerousGood, content: Dict, context: Dict = None) -> EmergencyProcedureGuide:
        """Create EmergencyProcedureGuide object from generated content"""
        context = context or {}
        
        # Generate unique EPG number
        epg_number = self._generate_epg_number(dangerous_good, context)
        
        # Determine emergency types covered
        emergency_types = self._determine_emergency_types(dangerous_good.hazard_class)
        
        epg = EmergencyProcedureGuide(
            dangerous_good=dangerous_good,
            epg_number=epg_number,
            title=content.get('title', f"Emergency Procedures - {dangerous_good.proper_shipping_name}"),
            hazard_class=dangerous_good.hazard_class,
            subsidiary_risks=dangerous_good.subsidiary_risks.split(',') if dangerous_good.subsidiary_risks else [],
            emergency_types=emergency_types,
            immediate_actions=content.get('immediate_actions', ''),
            personal_protection=content.get('personal_protection', ''),
            fire_procedures=content.get('fire_procedures', ''),
            spill_procedures=content.get('spill_procedures', ''),
            medical_procedures=content.get('medical_procedures', ''),
            evacuation_procedures=content.get('evacuation_procedures', ''),
            notification_requirements=content.get('notification_requirements', ''),
            emergency_contacts=content.get('emergency_contacts', {}),
            environmental_precautions=content.get('environmental_precautions', ''),
            transport_specific_guidance=content.get('transport_specific_guidance', ''),
            status='ACTIVE',
            severity_level=self._determine_severity_level(dangerous_good.hazard_class, context),
            effective_date=timezone.now().date(),
            country_code='AU'
        )
        
        return epg

    def _generate_epg_number(self, dangerous_good: DangerousGood, context: Dict) -> str:
        """Generate unique EPG number"""
        base_number = f"EPG-UN{dangerous_good.un_number}"
        
        # Add context suffix if applicable
        if context.get('transport_mode'):
            base_number += f"-{context['transport_mode'][:1]}"
        
        # Add timestamp for uniqueness
        timestamp = timezone.now().strftime("%m%d")
        return f"{base_number}-{timestamp}"

    def _determine_emergency_types(self, hazard_class: str) -> List[str]:
        """Determine emergency types covered by EPG based on hazard class"""
        emergency_type_mapping = {
            '1': ['FIRE', 'TRANSPORT_ACCIDENT'],
            '2.1': ['FIRE', 'TRANSPORT_ACCIDENT'],
            '2.3': ['EXPOSURE', 'TRANSPORT_ACCIDENT'],
            '3': ['FIRE', 'SPILL', 'TRANSPORT_ACCIDENT'],
            '4': ['FIRE', 'SPILL', 'TRANSPORT_ACCIDENT'],
            '5': ['FIRE', 'SPILL', 'TRANSPORT_ACCIDENT'],
            '6': ['EXPOSURE', 'SPILL', 'TRANSPORT_ACCIDENT'],
            '7': ['EXPOSURE', 'TRANSPORT_ACCIDENT'],
            '8': ['SPILL', 'EXPOSURE', 'TRANSPORT_ACCIDENT'],
            '9': ['TRANSPORT_ACCIDENT']
        }
        
        for hc, types in emergency_type_mapping.items():
            if hazard_class.startswith(hc):
                return types
        
        return ['TRANSPORT_ACCIDENT']

    def _determine_severity_level(self, hazard_class: str, context: Dict) -> str:
        """Determine severity level for EPG"""
        # High severity hazards
        if hazard_class.startswith(('1', '2.3', '6.1', '7')):
            return 'CRITICAL'
        
        # Medium severity with context considerations
        elif hazard_class.startswith(('2.1', '3', '5.1', '8')):
            risk_level = context.get('risk_level', 'LOW')
            if risk_level == 'HIGH':
                return 'HIGH'
            else:
                return 'MEDIUM'
        
        # Lower severity hazards
        else:
            return 'LOW'

    def _generate_combined_procedures_epg(self, shipment: Shipment, shipment_analysis: Dict, individual_epgs: List[EmergencyProcedureGuide]) -> Optional[EmergencyProcedureGuide]:
        """
        Generate combined procedures EPG for multi-hazard shipments.
        """
        try:
            # Create combined EPG for shipment-level procedures
            combined_epg = EmergencyProcedureGuide(
                epg_number=f"EPG-SHIPMENT-{shipment.tracking_number}",
                title=f"Combined Emergency Procedures - Shipment {shipment.tracking_number}",
                hazard_class="MULTIPLE",
                emergency_types=['MULTI_HAZARD', 'TRANSPORT_ACCIDENT'],
                immediate_actions=self._combine_immediate_actions(individual_epgs, shipment_analysis),
                personal_protection=self._combine_personal_protection(individual_epgs),
                evacuation_procedures=self._combine_evacuation_procedures(individual_epgs, shipment_analysis),
                notification_requirements=self._generate_shipment_notification_requirements(shipment_analysis),
                transport_specific_guidance=self._generate_shipment_transport_guidance(shipment_analysis),
                status='ACTIVE',
                severity_level=shipment_analysis['emergency_priority'],
                effective_date=timezone.now().date(),
                country_code='AU'
            )
            
            return combined_epg
            
        except Exception as e:
            logger.error(f"Error generating combined EPG for shipment {shipment.tracking_number}: {str(e)}")
            return None

    def _combine_immediate_actions(self, epgs: List[EmergencyProcedureGuide], shipment_analysis: Dict) -> str:
        """Combine immediate actions from multiple EPGs"""
        un_numbers = list(shipment_analysis['un_numbers_data'].keys())
        risk_level = shipment_analysis['risk_assessment']['overall_risk_level']
        
        combined = f"""MULTI-HAZARD SHIPMENT EMERGENCY - UN Numbers: {', '.join(sorted(un_numbers))}

IMMEDIATE PRIORITY ACTIONS:
• Contact emergency services (000) - specify multiple dangerous goods incident
• Establish safety perimeter appropriate to highest risk material
• Alert CHEMCALL (1800 127 406) for multi-chemical emergency advice
• Identify all dangerous goods present using shipping documentation
• Consider evacuation zone based on most restrictive requirements

RISK LEVEL: {risk_level}
HAZARD CLASSES PRESENT: {', '.join(shipment_analysis['hazard_analysis']['hazard_classes'])}

SPECIAL CONSIDERATIONS:
"""
        
        if shipment_analysis['hazard_analysis']['requires_segregation']:
            combined += "• INCOMPATIBLE MATERIALS PRESENT - Enhanced safety measures required\n"
        
        if shipment_analysis['risk_assessment']['has_large_receptacles']:
            combined += "• Large receptacles present - Consider structural collapse potential\n"
        
        combined += f"• Total quantity: {shipment_analysis['risk_assessment']['total_weight_kg']:.1f}kg"
        
        return combined

    def _combine_personal_protection(self, epgs: List[EmergencyProcedureGuide]) -> str:
        """Combine PPE requirements for highest protection level"""
        return """PERSONAL PROTECTION - MULTI-HAZARD INCIDENT:
• Use highest level of protection required by any material present
• Self-contained breathing apparatus mandatory for entry into affected area
• Chemical-resistant suit appropriate to most restrictive material
• Emergency decontamination procedures for multiple chemical exposure
• Backup PPE and emergency escape procedures essential
• Multi-material compatibility testing for PPE selection required"""

    def _combine_evacuation_procedures(self, epgs: List[EmergencyProcedureGuide], shipment_analysis: Dict) -> str:
        """Combine evacuation procedures using most restrictive requirements"""
        risk_level = shipment_analysis['risk_assessment']['overall_risk_level']
        hazard_classes = shipment_analysis['hazard_analysis']['hazard_classes']
        
        # Determine evacuation distance based on most restrictive material
        if any(hc.startswith('1') for hc in hazard_classes):
            evacuation_distance = "800m radius (explosive materials present)"
        elif any(hc.startswith('2.3') for hc in hazard_classes):
            evacuation_distance = "500m downwind (toxic gas present)"
        elif risk_level == 'HIGH':
            evacuation_distance = "300m radius (high risk materials)"
        else:
            evacuation_distance = "200m radius (standard dangerous goods)"
        
        return f"""EVACUATION - MULTI-HAZARD INCIDENT:
• Evacuation zone: {evacuation_distance}
• Consider cumulative effects of multiple hazards
• Establish assembly points upwind and uphill from incident
• Account for interaction effects between different materials
• Extended evacuation may be required for complex scenarios
• Re-entry only after air monitoring confirms safety for all materials present"""

    def _generate_shipment_notification_requirements(self, shipment_analysis: Dict) -> str:
        """Generate notification requirements for shipment-level incident"""
        return f"""SHIPMENT EMERGENCY NOTIFICATION REQUIREMENTS:

IMMEDIATE (within 5 minutes):
• Emergency Services: 000 - specify multi-hazard dangerous goods incident
• CHEMCALL: 1800 127 406 - provide all UN numbers present
• Company Emergency Contact: [From shipping documentation]

WITHIN 1 HOUR:
• National Transport Commission: Multi-hazard transport incident
• State EPA: {shipment_analysis['risk_assessment']['total_weight_kg']:.1f}kg total dangerous goods
• WorkSafe Authority: Multi-chemical exposure potential
• Local Emergency Management: Community impact assessment

ONGOING:
• Regular updates to all notified parties
• Media coordination through emergency services
• Customer notification for supply chain impact"""

    def _generate_shipment_transport_guidance(self, shipment_analysis: Dict) -> str:
        """Generate transport-specific guidance for shipment"""
        transport_mode = shipment_analysis['transport_analysis']['primary_transport_mode']
        
        return f"""TRANSPORT-SPECIFIC GUIDANCE - {transport_mode} MULTI-HAZARD INCIDENT:

{shipment_analysis['transport_analysis']['mode_specific_considerations'][0] if shipment_analysis['transport_analysis']['mode_specific_considerations'] else 'Standard transport emergency procedures'}

MULTI-HAZARD CONSIDERATIONS:
• Vehicle/container may contain segregated dangerous goods
• Consider interaction effects during emergency response
• Specialized equipment may be required for multiple material types
• Extended incident duration likely due to complex cleanup requirements
• Multiple regulatory frameworks may apply to different materials"""

    @transaction.atomic
    def save_epg_suite(self, epg_suite: List[EmergencyProcedureGuide], created_by=None) -> List[EmergencyProcedureGuide]:
        """
        Save generated EPG suite to database.
        """
        saved_epgs = []
        
        try:
            for epg in epg_suite:
                epg.created_by = created_by
                epg.save()
                saved_epgs.append(epg)
                logger.info(f"Saved EPG: {epg.epg_number}")
            
            logger.info(f"Successfully saved {len(saved_epgs)} EPGs")
            return saved_epgs
            
        except Exception as e:
            logger.error(f"Error saving EPG suite: {str(e)}")
            raise

    def generate_and_save_shipment_epgs(self, shipment: Shipment, created_by=None) -> List[EmergencyProcedureGuide]:
        """
        Complete workflow: Generate and save EPG suite for shipment.
        
        This is the main method for UN number-driven EPG generation.
        """
        logger.info(f"Generating and saving EPG suite for shipment {shipment.tracking_number}")
        
        try:
            # Generate EPG suite
            epg_suite = self.generate_shipment_epg_suite(shipment)
            
            if not epg_suite:
                logger.warning(f"No EPGs generated for shipment {shipment.tracking_number}")
                return []
            
            # Save to database
            saved_epgs = self.save_epg_suite(epg_suite, created_by)
            
            logger.info(f"Successfully generated and saved {len(saved_epgs)} EPGs for shipment {shipment.tracking_number}")
            return saved_epgs
            
        except Exception as e:
            logger.error(f"Error in complete EPG generation workflow for shipment {shipment.tracking_number}: {str(e)}")
            return []