from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from typing import List, Dict, Optional
import logging

from .models import EmergencyProcedureGuide, ShipmentEmergencyPlan, EmergencyType, SeverityLevel
from shipments.models import Shipment
from dangerous_goods.models import DangerousGood

logger = logging.getLogger(__name__)

class EmergencyPlanGenerator:
    """
    Service for automatically generating emergency plans for shipments
    based on their dangerous goods content and available EPGs.
    """
    
    def generate_emergency_plan(self, shipment: Shipment, user=None) -> ShipmentEmergencyPlan:
        """
        Generate a comprehensive emergency plan for a shipment.
        
        Args:
            shipment: The shipment to generate a plan for
            user: User generating the plan (optional)
            
        Returns:
            Generated ShipmentEmergencyPlan instance
        """
        logger.info(f"Generating emergency plan for shipment {shipment.tracking_number}")
        
        # Get dangerous goods in shipment
        dangerous_goods = self._get_shipment_dangerous_goods(shipment)
        
        if not dangerous_goods:
            raise ValueError("Shipment contains no dangerous goods requiring emergency planning")
        
        # Find relevant EPGs
        relevant_epgs = self._find_relevant_epgs(dangerous_goods)
        
        if not relevant_epgs:
            raise ValueError("No emergency procedure guides found for dangerous goods in shipment")
        
        # Generate plan number
        plan_number = self._generate_plan_number(shipment)
        
        # Assess hazards
        hazard_assessment = self._assess_shipment_hazards(dangerous_goods, relevant_epgs)
        
        # Generate plan content
        executive_summary = self._generate_executive_summary(shipment, dangerous_goods, hazard_assessment)
        immediate_actions = self._consolidate_immediate_actions(relevant_epgs)
        specialized_procedures = self._generate_specialized_procedures(dangerous_goods, relevant_epgs)
        
        # Generate route-specific information
        route_contacts = self._generate_route_emergency_contacts(shipment)
        notification_matrix = self._generate_notification_matrix(dangerous_goods, relevant_epgs)
        
        # Create emergency plan
        emergency_plan = ShipmentEmergencyPlan.objects.create(
            shipment=shipment,
            plan_number=plan_number,
            executive_summary=executive_summary,
            hazard_assessment=hazard_assessment,
            immediate_response_actions=immediate_actions,
            specialized_procedures=specialized_procedures,
            route_emergency_contacts=route_contacts,
            notification_matrix=notification_matrix,
            generated_by=user,
            status='GENERATED'
        )
        
        # Link referenced EPGs
        emergency_plan.referenced_epgs.set(relevant_epgs)
        
        logger.info(f"Emergency plan {plan_number} generated successfully")
        return emergency_plan
    
    def _get_shipment_dangerous_goods(self, shipment: Shipment) -> List[DangerousGood]:
        """Get all dangerous goods in the shipment"""
        # Get dangerous goods from shipment items
        dangerous_goods = []
        
        # Check if shipment has items with dangerous goods
        if hasattr(shipment, 'items'):
            for item in shipment.items.filter(is_dangerous_good=True):
                if hasattr(item, 'dangerous_good') and item.dangerous_good:
                    dangerous_goods.append(item.dangerous_good)
        
        # Fallback: check manifests for dangerous goods
        if not dangerous_goods and hasattr(shipment, 'manifests'):
            for manifest in shipment.manifests.all():
                for dg_match in manifest.dg_matches.filter(is_confirmed=True):
                    dangerous_goods.append(dg_match.dangerous_good)
        
        # Remove duplicates
        unique_dgs = []
        seen_un_numbers = set()
        for dg in dangerous_goods:
            if dg.un_number not in seen_un_numbers:
                unique_dgs.append(dg)
                seen_un_numbers.add(dg.un_number)
        
        return unique_dgs
    
    def _find_relevant_epgs(self, dangerous_goods: List[DangerousGood]) -> List[EmergencyProcedureGuide]:
        """Find EPGs relevant to the dangerous goods"""
        relevant_epgs = []
        
        for dg in dangerous_goods:
            # First, look for specific EPGs for this dangerous good
            specific_epgs = EmergencyProcedureGuide.objects.filter(
                dangerous_good=dg,
                status='ACTIVE',
                effective_date__lte=timezone.now().date()
            ).order_by('-effective_date')
            
            if specific_epgs.exists():
                relevant_epgs.extend(specific_epgs)
            else:
                # Fall back to generic hazard class EPGs
                generic_epgs = EmergencyProcedureGuide.objects.filter(
                    dangerous_good__isnull=True,
                    hazard_class=dg.hazard_class,
                    status='ACTIVE',
                    effective_date__lte=timezone.now().date()
                ).order_by('-effective_date')
                
                if generic_epgs.exists():
                    relevant_epgs.extend(generic_epgs[:1])  # Take most recent
        
        # Remove duplicates
        return list(set(relevant_epgs))
    
    def _generate_plan_number(self, shipment: Shipment) -> str:
        """Generate unique plan number"""
        timestamp = timezone.now().strftime("%Y%m%d%H%M")
        return f"EPG-{shipment.tracking_number}-{timestamp}"
    
    def _assess_shipment_hazards(self, dangerous_goods: List[DangerousGood], epgs: List[EmergencyProcedureGuide]) -> Dict:
        """Assess overall hazards in the shipment"""
        hazard_classes = set()
        subsidiary_risks = set()
        max_severity = SeverityLevel.LOW
        emergency_types = set()
        
        for dg in dangerous_goods:
            hazard_classes.add(dg.hazard_class)
            if dg.subsidiary_risk_classes:
                subsidiary_risks.update(dg.subsidiary_risk_classes)
        
        for epg in epgs:
            # Track highest severity level
            if self._severity_rank(epg.severity_level) > self._severity_rank(max_severity):
                max_severity = epg.severity_level
            
            # Collect emergency types
            emergency_types.update(epg.emergency_types)
        
        # Assess compatibility risks
        compatibility_concerns = self._assess_compatibility_risks(dangerous_goods)
        
        return {
            'primary_hazard_classes': list(hazard_classes),
            'subsidiary_risks': list(subsidiary_risks),
            'overall_severity': max_severity,
            'applicable_emergency_types': list(emergency_types),
            'dangerous_goods_count': len(dangerous_goods),
            'compatibility_assessment': compatibility_concerns,
            'assessment_timestamp': timezone.now().isoformat(),
            'dangerous_goods_details': [
                {
                    'un_number': dg.un_number,
                    'proper_shipping_name': dg.proper_shipping_name,
                    'hazard_class': dg.hazard_class,
                    'packing_group': dg.packing_group,
                    'subsidiary_risks': dg.subsidiary_risk_classes or []
                }
                for dg in dangerous_goods
            ]
        }
    
    def _severity_rank(self, severity: str) -> int:
        """Convert severity to numeric rank for comparison"""
        severity_ranks = {
            SeverityLevel.LOW: 1,
            SeverityLevel.MEDIUM: 2,
            SeverityLevel.HIGH: 3,
            SeverityLevel.CRITICAL: 4
        }
        return severity_ranks.get(severity, 1)
    
    def _assess_compatibility_risks(self, dangerous_goods: List[DangerousGood]) -> Dict:
        """Assess compatibility risks between dangerous goods"""
        if len(dangerous_goods) <= 1:
            return {
                'risk_level': 'LOW',
                'concerns': [],
                'recommendations': ['Single dangerous good - no compatibility concerns']
            }
        
        concerns = []
        risk_level = 'LOW'
        
        # Check for incompatible combinations
        hazard_classes = [dg.hazard_class for dg in dangerous_goods]
        
        # High-risk combinations
        if '1' in hazard_classes and any(hc in ['3', '4', '5'] for hc in hazard_classes):
            concerns.append("Explosives (Class 1) with flammable materials present")
            risk_level = 'CRITICAL'
        
        if '5.1' in hazard_classes and '3' in hazard_classes:
            concerns.append("Oxidizers (Class 5.1) with flammable liquids (Class 3)")
            risk_level = 'HIGH'
        
        if '8' in hazard_classes and any(hc in ['3', '4'] for hc in hazard_classes):
            concerns.append("Corrosives (Class 8) with flammable materials")
            if risk_level == 'LOW':
                risk_level = 'MEDIUM'
        
        recommendations = []
        if concerns:
            recommendations.extend([
                "Maintain maximum separation between incompatible materials",
                "Monitor for signs of container degradation",
                "Have specialized firefighting equipment available",
                "Consider segregated emergency response procedures"
            ])
        else:
            recommendations.append("No major compatibility concerns identified")
        
        return {
            'risk_level': risk_level,
            'concerns': concerns,
            'recommendations': recommendations
        }
    
    def _generate_executive_summary(self, shipment: Shipment, dangerous_goods: List[DangerousGood], hazard_assessment: Dict) -> str:
        """Generate executive summary for the emergency plan"""
        dg_summary = ", ".join([f"{dg.un_number} ({dg.proper_shipping_name})" for dg in dangerous_goods])
        
        summary = f"""EMERGENCY RESPONSE PLAN - SHIPMENT {shipment.tracking_number}

HAZARDOUS MATERIALS SUMMARY:
{dg_summary}

PRIMARY HAZARD CLASSES: {', '.join(hazard_assessment['primary_hazard_classes'])}
OVERALL SEVERITY LEVEL: {hazard_assessment['overall_severity']}
TOTAL DANGEROUS GOODS: {len(dangerous_goods)}

COMPATIBILITY ASSESSMENT: {hazard_assessment['compatibility_assessment']['risk_level']} risk
{' | '.join(hazard_assessment['compatibility_assessment']['concerns']) if hazard_assessment['compatibility_assessment']['concerns'] else 'No major compatibility concerns'}

EMERGENCY TYPES COVERED: {', '.join(hazard_assessment['applicable_emergency_types'])}

KEY CONSIDERATIONS:
- This plan covers emergency response for all dangerous goods in the shipment
- Response procedures are prioritized by hazard severity and compatibility risks
- Route-specific emergency contacts and resources are included
- All personnel should be familiar with the immediate response actions section

PLAN GENERATED: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}
"""
        return summary
    
    def _consolidate_immediate_actions(self, epgs: List[EmergencyProcedureGuide]) -> str:
        """Consolidate immediate actions from multiple EPGs"""
        actions_by_priority = {
            'CRITICAL': [],
            'HIGH': [],
            'MEDIUM': [],
            'GENERAL': []
        }
        
        for epg in epgs:
            priority = 'CRITICAL' if epg.severity_level == SeverityLevel.CRITICAL else \
                      'HIGH' if epg.severity_level == SeverityLevel.HIGH else \
                      'MEDIUM' if epg.severity_level == SeverityLevel.MEDIUM else 'GENERAL'
            
            actions_by_priority[priority].append({
                'epg': epg.epg_number,
                'actions': epg.immediate_actions
            })
        
        consolidated = "IMMEDIATE RESPONSE ACTIONS\n" + "="*50 + "\n\n"
        
        for priority in ['CRITICAL', 'HIGH', 'MEDIUM', 'GENERAL']:
            if actions_by_priority[priority]:
                consolidated += f"{priority} PRIORITY ACTIONS:\n" + "-"*30 + "\n"
                for action_set in actions_by_priority[priority]:
                    consolidated += f"\n[{action_set['epg']}] {action_set['actions']}\n"
                consolidated += "\n"
        
        # Add general safety reminders
        consolidated += """
GENERAL SAFETY REMINDERS:
- Ensure personal safety first - do not enter dangerous areas without proper protection
- Call emergency services immediately for serious incidents
- Evacuate personnel from immediate danger zone
- Prevent ignition sources in flammable material incidents
- Contain spills when safe to do so
- Document all actions taken for incident reporting
"""
        
        return consolidated
    
    def _generate_specialized_procedures(self, dangerous_goods: List[DangerousGood], epgs: List[EmergencyProcedureGuide]) -> Dict:
        """Generate specialized procedures by emergency type"""
        procedures = {
            'fire_response': [],
            'spill_response': [],
            'medical_response': [],
            'evacuation': [],
            'environmental_protection': []
        }
        
        for epg in epgs:
            if epg.fire_procedures:
                procedures['fire_response'].append({
                    'applicable_to': epg.dangerous_good.un_number if epg.dangerous_good else f"Class {epg.hazard_class}",
                    'procedure': epg.fire_procedures
                })
            
            if epg.spill_procedures:
                procedures['spill_response'].append({
                    'applicable_to': epg.dangerous_good.un_number if epg.dangerous_good else f"Class {epg.hazard_class}",
                    'procedure': epg.spill_procedures
                })
            
            if epg.medical_procedures:
                procedures['medical_response'].append({
                    'applicable_to': epg.dangerous_good.un_number if epg.dangerous_good else f"Class {epg.hazard_class}",
                    'procedure': epg.medical_procedures
                })
            
            if epg.evacuation_procedures:
                procedures['evacuation'].append({
                    'applicable_to': epg.dangerous_good.un_number if epg.dangerous_good else f"Class {epg.hazard_class}",
                    'procedure': epg.evacuation_procedures
                })
            
            if epg.environmental_precautions:
                procedures['environmental_protection'].append({
                    'applicable_to': epg.dangerous_good.un_number if epg.dangerous_good else f"Class {epg.hazard_class}",
                    'procedure': epg.environmental_precautions
                })
        
        return procedures
    
    def _generate_route_emergency_contacts(self, shipment: Shipment) -> Dict:
        """Generate route-specific emergency contacts"""
        # This would integrate with route planning and location services
        # For now, return a template structure
        
        contacts = {
            'origin': {
                'emergency_services': '911',
                'poison_control': '1-800-222-1222',
                'hazmat_response': 'Local Fire Department',
                'company_emergency': 'TBD - Company Emergency Line'
            },
            'destination': {
                'emergency_services': '911',
                'poison_control': '1-800-222-1222',
                'hazmat_response': 'Local Fire Department',
                'company_emergency': 'TBD - Company Emergency Line'
            },
            'en_route': {
                'emergency_services': '911',
                'poison_control': '1-800-222-1222',
                'chemtrec': '1-800-424-9300',
                'company_dispatch': 'TBD - Dispatch Center'
            }
        }
        
        # Add shipment-specific information
        if hasattr(shipment, 'origin') and shipment.origin:
            contacts['origin']['location'] = str(shipment.origin)
        
        if hasattr(shipment, 'destination') and shipment.destination:
            contacts['destination']['location'] = str(shipment.destination)
        
        return contacts
    
    def _generate_notification_matrix(self, dangerous_goods: List[DangerousGood], epgs: List[EmergencyProcedureGuide]) -> Dict:
        """Generate notification matrix for different emergency types"""
        matrix = {}
        
        for emergency_type in EmergencyType.choices:
            emergency_code = emergency_type[0]
            emergency_name = emergency_type[1]
            
            # Determine who to notify for this emergency type
            notifications = {
                'immediate': ['Emergency Services (911)', 'Company Dispatch'],
                'within_15_minutes': ['Company Management', 'Customer'],
                'within_1_hour': ['Regulatory Authorities', 'Insurance'],
                'within_24_hours': ['Incident Investigation Team']
            }
            
            # Add specific notifications based on dangerous goods
            for dg in dangerous_goods:
                if dg.hazard_class in ['1', '2', '3']:  # High-risk classes
                    if 'Hazmat Response Team' not in notifications['immediate']:
                        notifications['immediate'].append('Hazmat Response Team')
                
                if dg.hazard_class in ['6', '8']:  # Toxic/Corrosive
                    if 'Poison Control' not in notifications['immediate']:
                        notifications['immediate'].append('Poison Control')
            
            matrix[emergency_code] = {
                'emergency_type': emergency_name,
                'notification_timeline': notifications
            }
        
        return matrix

class EPGTemplateService:
    """
    Service for managing EPG templates and creating new EPGs from templates.
    """
    
    def create_epg_from_template(self, hazard_class: str, dangerous_good: Optional[DangerousGood] = None) -> EmergencyProcedureGuide:
        """Create a new EPG based on hazard class template"""
        templates = self._get_epg_templates()
        
        if hazard_class not in templates:
            raise ValueError(f"No template available for hazard class {hazard_class}")
        
        template = templates[hazard_class]
        
        # Generate EPG number
        epg_number = self._generate_epg_number(hazard_class, dangerous_good)
        
        # Create EPG from template
        epg = EmergencyProcedureGuide.objects.create(
            dangerous_good=dangerous_good,
            epg_number=epg_number,
            title=template['title'].format(
                un_number=dangerous_good.un_number if dangerous_good else hazard_class,
                shipping_name=dangerous_good.proper_shipping_name if dangerous_good else f"Class {hazard_class}"
            ),
            hazard_class=hazard_class,
            emergency_types=template['emergency_types'],
            immediate_actions=template['immediate_actions'],
            personal_protection=template['personal_protection'],
            fire_procedures=template.get('fire_procedures', ''),
            spill_procedures=template.get('spill_procedures', ''),
            medical_procedures=template.get('medical_procedures', ''),
            evacuation_procedures=template.get('evacuation_procedures', ''),
            notification_requirements=template['notification_requirements'],
            emergency_contacts=template.get('emergency_contacts', {}),
            severity_level=template.get('severity_level', SeverityLevel.MEDIUM),
            status='DRAFT'
        )
        
        return epg
    
    def _generate_epg_number(self, hazard_class: str, dangerous_good: Optional[DangerousGood] = None) -> str:
        """Generate unique EPG number"""
        if dangerous_good:
            base = f"EPG-{dangerous_good.un_number}"
        else:
            base = f"EPG-HC{hazard_class}"
        
        # Find next available number
        existing_count = EmergencyProcedureGuide.objects.filter(
            epg_number__startswith=base
        ).count()
        
        return f"{base}-{existing_count + 1:03d}"
    
    def _get_epg_templates(self) -> Dict:
        """Get EPG templates for different hazard classes"""
        return {
            '1': {
                'title': 'Emergency Procedures for {un_number} - {shipping_name} (Explosives)',
                'emergency_types': [EmergencyType.FIRE, EmergencyType.TRANSPORT_ACCIDENT],
                'severity_level': SeverityLevel.CRITICAL,
                'immediate_actions': """IMMEDIATE ACTIONS FOR EXPLOSIVES:
1. EVACUATE all personnel to minimum 300m (1000ft) radius
2. ELIMINATE all ignition sources immediately
3. DO NOT approach damaged or leaking packages
4. CALL emergency services and bomb disposal unit
5. ESTABLISH exclusion zone and crowd control
6. ACCOUNT for all personnel - ensure no one missing in danger zone""",
                'personal_protection': 'Full protective gear required - minimum approach distance 300m',
                'notification_requirements': 'Immediately notify emergency services, bomb disposal, and regulatory authorities'
            },
            '2': {
                'title': 'Emergency Procedures for {un_number} - {shipping_name} (Gases)',
                'emergency_types': [EmergencyType.SPILL, EmergencyType.FIRE, EmergencyType.EXPOSURE],
                'severity_level': SeverityLevel.HIGH,
                'immediate_actions': """IMMEDIATE ACTIONS FOR GASES:
1. EVACUATE personnel from leak area upwind
2. VENTILATE enclosed spaces if safe to do so
3. ELIMINATE ignition sources for flammable gases
4. MONITOR for gas concentration levels
5. DO NOT attempt to stop leak unless safe to do so
6. CALL emergency services and gas emergency line""",
                'personal_protection': 'Self-contained breathing apparatus, gas-tight chemical protective suit',
                'notification_requirements': 'Notify emergency services, gas supplier emergency line, and environmental authorities'
            },
            '3': {
                'title': 'Emergency Procedures for {un_number} - {shipping_name} (Flammable Liquids)',
                'emergency_types': [EmergencyType.FIRE, EmergencyType.SPILL, EmergencyType.EXPOSURE],
                'severity_level': SeverityLevel.HIGH,
                'immediate_actions': """IMMEDIATE ACTIONS FOR FLAMMABLE LIQUIDS:
1. ELIMINATE all ignition sources in immediate area
2. CONTAIN spill with dikes, sandbags, or absorbent material
3. PREVENT entry into drains, sewers, or waterways
4. EVACUATE non-essential personnel from area
5. VENTILATE area to prevent vapor accumulation
6. APPLY foam if fire occurs - DO NOT use water spray""",
                'personal_protection': 'Chemical resistant suit, respiratory protection, flame-resistant clothing',
                'notification_requirements': 'Notify fire department, environmental authorities, and company emergency response'
            },
            '8': {
                'title': 'Emergency Procedures for {un_number} - {shipping_name} (Corrosives)',
                'emergency_types': [EmergencyType.SPILL, EmergencyType.EXPOSURE, EmergencyType.ENVIRONMENTAL],
                'severity_level': SeverityLevel.HIGH,
                'immediate_actions': """IMMEDIATE ACTIONS FOR CORROSIVES:
1. PROTECT personnel from corrosive vapors and contact
2. CONTAIN spill with acid-resistant materials
3. NEUTRALIZE small spills with appropriate neutralizing agent
4. FLUSH affected skin/eyes with water for minimum 15 minutes
5. PREVENT contact with incompatible materials
6. VENTILATE area to disperse corrosive vapors""",
                'personal_protection': 'Acid-resistant suit, face shield, chemical-resistant gloves and boots',
                'notification_requirements': 'Notify emergency services, poison control, and environmental authorities'
            }
        }