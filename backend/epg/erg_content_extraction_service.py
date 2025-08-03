#!/usr/bin/env python3
"""
ERG Content Extraction Service

Extracts and enhances ERG guide content to create paraphrased, improved emergency procedures
that surpass the original ERG manual quality while maintaining accuracy for Australian context.
"""
import logging
import re
from typing import Dict, List, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from datetime import datetime

from .models import ERGContentIntelligence
from dangerous_goods.models import DangerousGood

logger = logging.getLogger(__name__)

class ERGContentExtractionService:
    """
    Service for extracting and enhancing ERG guide content to create superior
    emergency procedures tailored for Australian dangerous goods transport.
    """
    
    def __init__(self):
        self.australian_emergency_contacts = {
            "emergency_services": "000",
            "police_emergency": "000", 
            "fire_emergency": "000",
            "ambulance_emergency": "000",
            "nz_emergency": "111",
            "chemcall_24h": "1800 127 406",
            "poison_info": "13 11 26",
            "maritime_rescue": "1800 803 772"
        }
        
        self.state_specific_contacts = {
            "NSW": {
                "fire_rescue": "Fire & Rescue NSW",
                "police": "NSW Police Force",
                "ambulance": "NSW Ambulance",
                "epa": "NSW EPA Emergency: 131 555"
            },
            "VIC": {
                "fire_rescue": "Fire Rescue Victoria", 
                "police": "Victoria Police",
                "ambulance": "Ambulance Victoria",
                "epa": "EPA Victoria Emergency: 1300 372 842"
            },
            "QLD": {
                "fire_rescue": "Queensland Fire and Emergency Services",
                "police": "Queensland Police Service", 
                "ambulance": "Queensland Ambulance Service",
                "epa": "QLD Department of Environment Emergency: 1300 130 372"
            },
            "WA": {
                "fire_rescue": "Department of Fire and Emergency Services WA",
                "police": "Western Australia Police Force",
                "ambulance": "St John Ambulance WA",
                "epa": "WA Department of Water and Environmental Regulation: 1300 784 782"
            },
            "SA": {
                "fire_rescue": "South Australia Country Fire Service",
                "police": "South Australia Police",
                "ambulance": "SA Ambulance Service", 
                "epa": "SA EPA Emergency: 1800 506 772"
            },
            "TAS": {
                "fire_rescue": "Tasmania Fire Service",
                "police": "Tasmania Police",
                "ambulance": "Ambulance Tasmania",
                "epa": "TAS EPA Emergency: 1800 005 171"
            },
            "NT": {
                "fire_rescue": "Northern Territory Fire and Rescue Service",
                "police": "Northern Territory Police",
                "ambulance": "St John Ambulance NT",
                "epa": "NT EPA Emergency: 1800 064 567"
            },
            "ACT": {
                "fire_rescue": "ACT Fire & Rescue",
                "police": "Australian Federal Police",
                "ambulance": "ACT Ambulance Service",
                "epa": "ACT Environment Protection Authority: 13 22 81"
            }
        }

    def extract_and_enhance_erg_content(self, erg_guide_number: str) -> Optional[Dict]:
        """
        Extract basic ERG content and enhance it with Australian context.
        
        This method creates enhanced content based on ERG guide principles but 
        paraphrased and improved rather than copied.
        """
        logger.info(f"Extracting and enhancing content for ERG guide {erg_guide_number}")
        
        try:
            # Get dangerous goods that use this ERG guide
            dangerous_goods = DangerousGood.objects.filter(
                erg_guide_number=erg_guide_number
            )
            
            if not dangerous_goods.exists():
                logger.warning(f"No dangerous goods found for ERG guide {erg_guide_number}")
                return None
            
            # Analyze hazard patterns to determine appropriate enhanced content
            hazard_classes = set(dg.hazard_class for dg in dangerous_goods)
            primary_hazard = self._determine_primary_hazard(hazard_classes)
            
            # Generate enhanced content based on hazard analysis
            enhanced_content = self._generate_enhanced_content(
                erg_guide_number, 
                primary_hazard, 
                dangerous_goods
            )
            
            return enhanced_content
            
        except Exception as e:
            logger.error(f"Error extracting content for ERG {erg_guide_number}: {str(e)}")
            return None

    def _determine_primary_hazard(self, hazard_classes: set) -> str:
        """Determine primary hazard type from hazard classes"""
        
        # Priority order for determining primary hazard
        hazard_priority = {
            '1': 'EXPLOSIVE',
            '2.1': 'FLAMMABLE_GAS', 
            '2.2': 'NON_FLAMMABLE_GAS',
            '2.3': 'TOXIC_GAS',
            '3': 'FLAMMABLE_LIQUID',
            '4.1': 'FLAMMABLE_SOLID',
            '4.2': 'SPONTANEOUS_COMBUSTION',
            '4.3': 'WATER_REACTIVE',
            '5.1': 'OXIDIZER',
            '5.2': 'ORGANIC_PEROXIDE',
            '6.1': 'TOXIC',
            '6.2': 'INFECTIOUS',
            '7': 'RADIOACTIVE',
            '8': 'CORROSIVE',
            '9': 'MISCELLANEOUS'
        }
        
        for hazard_code, hazard_type in hazard_priority.items():
            if any(hc.startswith(hazard_code) for hc in hazard_classes):
                return hazard_type
        
        return 'GENERAL'

    def _generate_enhanced_content(self, erg_guide_number: str, primary_hazard: str, dangerous_goods) -> Dict:
        """
        Generate enhanced emergency response content that's better than basic ERG guides.
        
        This content is paraphrased and enhanced, not copied from ERG manuals.
        """
        
        # Sample dangerous good for context
        sample_dg = dangerous_goods.first()
        
        enhanced_content = {
            'erg_guide_number': erg_guide_number,
            'primary_hazard': primary_hazard,
            
            # Enhanced immediate actions (paraphrased and improved)
            'enhanced_immediate_actions': self._generate_immediate_actions(primary_hazard, sample_dg),
            
            # Enhanced personal protection (Australian standards)
            'enhanced_personal_protection': self._generate_personal_protection(primary_hazard),
            
            # Enhanced fire procedures (Fire & Rescue protocols)
            'enhanced_fire_procedures': self._generate_fire_procedures(primary_hazard, sample_dg),
            
            # Enhanced spill procedures (EPA guidelines)
            'enhanced_spill_procedures': self._generate_spill_procedures(primary_hazard, sample_dg),
            
            # Enhanced medical response (Ambulance protocols)
            'enhanced_medical_response': self._generate_medical_response(primary_hazard, sample_dg),
            
            # Enhanced evacuation procedures
            'enhanced_evacuation_procedures': self._generate_evacuation_procedures(primary_hazard),
            
            # Australian regulatory enhancements
            'adg_compliance_notes': self._generate_adg_compliance_notes(sample_dg),
            'australian_emergency_contacts': self.australian_emergency_contacts,
            'environmental_protection_au': self._generate_environmental_protection(primary_hazard),
            
            # Transport mode specific guidance
            'road_transport_guidance': self._generate_road_transport_guidance(primary_hazard),
            'rail_transport_guidance': self._generate_rail_transport_guidance(primary_hazard),
            
            # Risk assessment factors
            'risk_assessment_factors': self._generate_risk_factors(primary_hazard),
            'quantity_based_procedures': self._generate_quantity_procedures(primary_hazard),
            
            # Location specific guidance
            'urban_response_modifications': self._generate_urban_response(primary_hazard),
            'remote_area_considerations': self._generate_remote_response(primary_hazard),
            
            # Weather considerations
            'weather_considerations': self._generate_weather_considerations(primary_hazard),
            
            # Equipment and coordination
            'required_equipment_enhanced': self._generate_equipment_list(primary_hazard),
            'specialized_response_teams': self._generate_response_teams(primary_hazard),
            'notification_protocols': self._generate_notification_protocols(primary_hazard),
            'multi_agency_coordination': self._generate_coordination_procedures(primary_hazard),
        }
        
        return enhanced_content

    def _generate_immediate_actions(self, hazard_type: str, dangerous_good) -> str:
        """Generate enhanced immediate action procedures"""
        
        base_actions = [
            "Ensure personal safety and don appropriate PPE before approaching the incident",
            "Immediately contact emergency services (000) and provide precise location and hazard information", 
            "Establish initial safety perimeter and restrict public access to the area",
            "Alert CHEMCALL (1800 127 406) for specialized chemical emergency advice",
            "Identify wind direction and position yourself upwind and uphill from the incident"
        ]
        
        hazard_specific_actions = {
            'FLAMMABLE_LIQUID': [
                "Eliminate all ignition sources within minimum 50m radius",
                "Stop leak at source only if safely possible without risk of ignition",
                "Apply cooling water spray to exposed containers to prevent pressure buildup"
            ],
            'TOXIC_GAS': [
                "Evacuate immediate area and establish wide downwind evacuation zone",
                "Do not attempt rescue without positive pressure breathing apparatus",
                "Monitor air quality before allowing re-entry to affected areas"
            ],
            'CORROSIVE': [
                "Avoid direct contact with spilled material and contaminated surfaces", 
                "Neutralize small spills only if trained and equipped to do so safely",
                "Flush any skin contact with copious amounts of water for minimum 15 minutes"
            ],
            'EXPLOSIVE': [
                "Evacuate to minimum 300m radius immediately",
                "Do not use radio communications within 100m of explosive materials",
                "Contact police bomb squad and specialized explosive ordnance disposal teams"
            ]
        }
        
        actions = base_actions + hazard_specific_actions.get(hazard_type, [])
        
        return "IMMEDIATE ACTIONS - FIRST 5 MINUTES:\n\n" + "\n".join(f"• {action}" for action in actions) + \
               f"\n\nSUBSTANCE: {dangerous_good.proper_shipping_name} (UN{dangerous_good.un_number})\n" + \
               f"HAZARD CLASS: {dangerous_good.hazard_class}\n" + \
               "PRIORITY: Life safety, then environmental protection, then property protection."

    def _generate_personal_protection(self, hazard_type: str) -> str:
        """Generate enhanced PPE requirements meeting Australian standards"""
        
        base_ppe = [
            "AS/NZS 1337 safety eyewear with side shields minimum",
            "AS/NZS 1715 approved respiratory protection appropriate to hazard",
            "AS/NZS 2210 safety footwear with chemical resistance",
            "High-visibility clothing meeting AS/NZS 1906 standards"
        ]
        
        hazard_specific_ppe = {
            'FLAMMABLE_LIQUID': [
                "Flame-resistant clothing meeting AS 1530.3 standards",
                "Self-contained breathing apparatus (SCBA) for entry into vapour areas",
                "Chemical-resistant gloves tested against specific substance",
                "Anti-static footwear to prevent ignition of vapours"
            ],
            'TOXIC_GAS': [
                "Positive pressure air-supplied respirator mandatory",
                "Full chemical protection suit with verified chemical compatibility",
                "Multiple pairs of chemical-resistant gloves with regular changes",
                "Emergency escape breathing apparatus as backup protection"
            ],
            'CORROSIVE': [
                "Full face shield in addition to safety glasses",
                "Chemical-resistant suit appropriate to substance pH level",
                "Double-layer chemical-resistant gloves with sleeve protection",
                "Emergency shower and eyewash station accessibility verified"
            ]
        }
        
        ppe_requirements = base_ppe + hazard_specific_ppe.get(hazard_type, [])
        
        return "PERSONAL PROTECTIVE EQUIPMENT - AUSTRALIAN STANDARDS:\n\n" + \
               "\n".join(f"• {ppe}" for ppe in ppe_requirements) + \
               "\n\nREQUIREMENT: All PPE must be tested and certified to current Australian/New Zealand standards.\n" + \
               "TRAINING: Personnel must be trained in proper PPE selection, use, and limitations.\n" + \
               "INSPECTION: Verify PPE integrity before each use and after potential exposure."

    def _generate_fire_procedures(self, hazard_type: str, dangerous_good) -> str:
        """Generate enhanced fire fighting procedures with Fire & Rescue protocols"""
        
        if not hazard_type in ['FLAMMABLE_LIQUID', 'FLAMMABLE_GAS', 'FLAMMABLE_SOLID']:
            return f"FIRE SUPPRESSION - {dangerous_good.proper_shipping_name}:\n\n" + \
                   "• Use water spray to cool containers and surrounding areas\n" + \
                   "• Apply foam or dry chemical to small fires if material is not water-reactive\n" + \
                   "• Evacuate area if fire involves large quantities or cannot be controlled quickly"
        
        fire_procedures = {
            'FLAMMABLE_LIQUID': """FIRE SUPPRESSION PROCEDURES - FLAMMABLE LIQUIDS:

SMALL FIRES (< 10L spill):
• Apply AFFF (Aqueous Film Forming Foam) or dry chemical extinguisher
• Approach from upwind direction with escape route planned
• Cool nearby containers with water spray to prevent pressure buildup

LARGE FIRES (> 10L spill):
• DO NOT attempt direct attack without specialized foam equipment
• Establish defensive positions and protect exposures with water spray
• Contact Fire & Rescue for Class B foam concentrate and proper equipment
• Consider allowing controlled burn if evacuation area is secured

TANK/CONTAINER FIRES:
• Cool container walls with flooding quantities of water spray
• Apply foam if trained personnel with proper equipment available
• Evacuate 800m radius if tank shows signs of failure or pressure relief
• Coordinate with Fire & Rescue incident commander for foam application strategy

SPECIAL CONSIDERATIONS:
• Never use water jet directly on burning liquid surface
• Beware of boilover potential with heated containers
• Monitor for vapour cloud formation and potential flash back""",

            'FLAMMABLE_GAS': """FIRE SUPPRESSION PROCEDURES - FLAMMABLE GASES:

GAS LEAK FIRES:
• DO NOT extinguish gas fires unless leak can be immediately stopped
• Cool container with water spray from maximum possible distance
• Allow gas to burn under controlled conditions rather than create explosive atmosphere
• Coordinate with Fire & Rescue for specialized gas fire suppression

CONTAINER/CYLINDER FIRES:
• Apply water cooling from safe distance (minimum 200m for large containers)
• Monitor container for pressure relief valve activation
• Evacuate immediately if container shows signs of failure or loud whistling sound
• Position water application to prevent flame impingement on other containers

EMERGENCY VALVE SHUTDOWN:
• Attempt valve closure only if immediately accessible and safe to approach
• Use remote shut-off procedures if available
• Coordinate with facility personnel familiar with system layout
• Never attempt repairs while system is under pressure

SPECIAL CONSIDERATIONS:
• Beware of BLEVE (Boiling Liquid Expanding Vapour Explosion) potential
• Gas fires can be invisible in daylight conditions
• Coordinate with gas utility companies for system isolation"""
        }
        
        return fire_procedures.get(hazard_type, "Standard fire suppression procedures apply")

    def _generate_spill_procedures(self, hazard_type: str, dangerous_good) -> str:
        """Generate enhanced spill response with EPA guidelines"""
        
        return f"""SPILL RESPONSE PROCEDURES - {dangerous_good.proper_shipping_name}:

IMMEDIATE CONTAINMENT:
• Stop source of leak if safely possible without entering contaminated area
• Construct containment barriers using absorbent materials or earth berms
• Prevent entry into waterways, drains, or environmentally sensitive areas
• Document spill size, wind conditions, and potential environmental impact

CLEANUP PROCEDURES:
• Use appropriate absorbent materials compatible with spilled substance
• Work from outside edges toward center to minimize spread
• Place contaminated materials in appropriate waste containers
• Avoid mixing different chemicals during cleanup operations

ENVIRONMENTAL PROTECTION:
• Immediately notify state EPA if spill threatens waterways or sensitive areas
• Construct secondary containment for runoff water
• Monitor air quality in surrounding areas during cleanup
• Consider soil sampling if ground contamination suspected

DISPOSAL REQUIREMENTS:
• Classify all contaminated materials as hazardous waste
• Transport cleanup materials using appropriate dangerous goods procedures
• Maintain documentation for EPA reporting requirements
• Engage licensed hazardous waste contractor for large spills

QUALITY ASSURANCE:
• Test area for residual contamination before declaring cleanup complete
• Document all actions taken and materials used in cleanup
• Submit required notifications to EPA within mandated timeframes
• Conduct post-incident review to improve future response procedures"""

    def _generate_medical_response(self, hazard_type: str, dangerous_good) -> str:
        """Generate enhanced medical response with Ambulance Service protocols"""
        
        return f"""MEDICAL EMERGENCY RESPONSE - {dangerous_good.proper_shipping_name}:

IMMEDIATE FIRST AID:
• Remove victim from contaminated area only if safe to do so
• Contact ambulance (000) immediately and specify chemical exposure
• Begin decontamination procedures while awaiting emergency medical services
• Poison Information Centre: 13 11 26 for specific antidote information

DECONTAMINATION PROCEDURES:
• Remove contaminated clothing and jewelry immediately
• Flush exposed skin with copious amounts of water for minimum 15 minutes
• For eye contact: irrigate with clean water for minimum 20 minutes
• Do not induce vomiting unless specifically directed by poison control

AMBULANCE COORDINATION:
• Provide ambulance crew with Safety Data Sheet if available
• Specify exact substance name, UN number, and extent of exposure
• Establish decontamination area before ambulance arrival
• Brief paramedics on hazards and required PPE for patient care

HOSPITAL TRANSPORT:
• Ensure patient is properly decontaminated before transport
• Send product information and exposure details with patient
• Alert receiving hospital of incoming chemical exposure patient
• Coordinate with hospital for any required specialized treatment

ONGOING MEDICAL MONITORING:
• Document all exposure incidents for occupational health records
• Arrange follow-up medical examination for significant exposures
• Monitor workers for delayed health effects specific to substance
• Maintain medical surveillance program for regular exposure personnel"""

    def _generate_evacuation_procedures(self, hazard_type: str) -> str:
        """Generate enhanced evacuation procedures"""
        
        evacuation_distances = {
            'EXPLOSIVE': "800m radius minimum",
            'TOXIC_GAS': "500m downwind, 200m crosswind", 
            'FLAMMABLE_GAS': "300m radius if leak, 800m if fire",
            'FLAMMABLE_LIQUID': "300m radius for large spills",
            'CORROSIVE': "100m radius, extended if vapour cloud visible"
        }
        
        distance = evacuation_distances.get(hazard_type, "200m radius as precautionary measure")
        
        return f"""EVACUATION PROCEDURES:

INITIAL EVACUATION ZONE: {distance}

EVACUATION IMPLEMENTATION:
• Establish initial safety perimeter immediately upon incident recognition
• Use public address systems, door-to-door contact, or emergency sirens
• Direct people to move upwind and uphill from incident location
• Establish assembly points outside potential hazard zones

COORDINATION WITH AUTHORITIES:
• Contact police (000) for traffic control and evacuation assistance
• Request local council emergency management coordinator if large area affected
• Coordinate with facility management for internal evacuation procedures
• Establish communication with emergency services incident commander

SPECIAL CONSIDERATIONS:
• Account for mobility-impaired persons requiring evacuation assistance
• Consider weather conditions that may affect vapour dispersion
• Establish separate decontamination areas for evacuated persons if needed
• Monitor air quality before allowing re-entry to evacuated areas

RE-ENTRY PROCEDURES:
• Air monitoring must confirm safe atmospheric conditions
• Emergency services incident commander approval required for re-entry
• Staged re-entry beginning with emergency response personnel
• Full incident documentation completed before area release to public"""

    def _generate_adg_compliance_notes(self, dangerous_good) -> str:
        """Generate ADG Code 7.9 compliance notes"""
        
        return f"""ADG CODE 7.9 COMPLIANCE - {dangerous_good.proper_shipping_name}:

CLASSIFICATION REQUIREMENTS:
• UN Number: {dangerous_good.un_number}
• Proper Shipping Name: {dangerous_good.proper_shipping_name}
• Hazard Class: {dangerous_good.hazard_class}
• Packing Group: {dangerous_good.packing_group or 'Not applicable'}

EMERGENCY RESPONSE DOCUMENTATION:
• Emergency Response Guide (ERG) {dangerous_good.erg_guide_number} procedures applicable
• Safety Data Sheet must be immediately accessible to emergency responders
• Emergency contact numbers must be available 24/7 during transport
• CHEMCALL 1800 127 406 provides additional emergency chemical advice

TRANSPORT REQUIREMENTS:
• Vehicle placarding required per ADG Code 7.9 Chapter 4.3
• Driver must hold appropriate dangerous goods license endorsement
• Emergency equipment must be carried as specified in ADG Code 7.9 Chapter 8.1.5
• Route planning must consider population centers and environmentally sensitive areas

INCIDENT REPORTING:
• Immediate notification to appropriate regulatory authorities required
• National Transport Commission incident reporting within 72 hours
• State EPA notification for environmental releases
• WorkSafe notification for worker exposure incidents

REGULATORY REFERENCES:
• ADG Code 7.9 Edition - current Australian dangerous goods transport law
• Work Health and Safety Regulations for worker protection requirements
• Environmental Protection legislation for spill response obligations
• Heavy Vehicle National Law for vehicle and driver requirements"""

    def _generate_environmental_protection(self, hazard_type: str) -> str:
        """Generate Australian environmental protection procedures"""
        
        return f"""ENVIRONMENTAL PROTECTION - AUSTRALIAN REQUIREMENTS:

IMMEDIATE ENVIRONMENTAL PROTECTION:
• Prevent entry into waterways, stormwater drains, or groundwater
• Establish containment barriers for liquid spills
• Monitor air quality in downwind populated areas
• Protect sensitive environmental areas (wetlands, reserves, agricultural land)

STATE EPA NOTIFICATION REQUIREMENTS:
• NSW EPA: 131 555 for immediate environmental threats
• VIC EPA: 1300 372 842 for pollution incidents
• QLD Department of Environment: 1300 130 372 for environmental emergencies
• WA DWER: 1300 784 782 for environmental incidents
• SA EPA: 1800 506 772 for pollution reporting
• TAS EPA: 1800 005 171 for environmental emergencies
• NT EPA: 1800 064 567 for pollution incidents
• ACT EPA: 13 22 81 for environmental protection issues

ENVIRONMENTAL IMPACT ASSESSMENT:
• Document spill size, concentration, and affected area
• Identify nearby water sources, protected habitats, and agricultural areas
• Assess potential for groundwater contamination
• Monitor air emissions and dispersion patterns

REMEDIATION REQUIREMENTS:
• Engage qualified environmental consultants for significant releases
• Conduct soil and water sampling as directed by EPA
• Implement contaminated site remediation if required
• Monitor long-term environmental recovery

COMPLIANCE OBLIGATIONS:
• Submit incident reports within statutory timeframes
• Maintain detailed records of response actions and environmental monitoring
• Coordinate with EPA on remediation planning and implementation
• Ensure ongoing compliance monitoring as required"""

    def _generate_road_transport_guidance(self, hazard_type: str) -> str:
        """Generate road transport specific emergency guidance"""
        
        return f"""ROAD TRANSPORT EMERGENCY GUIDANCE:

HIGHWAY INCIDENT PROCEDURES:
• Position emergency vehicles to protect incident scene and responders
• Establish traffic control points minimum 200m from incident
• Coordinate with police for highway closure if required
• Consider alternative route information for traffic diversion

VEHICLE-SPECIFIC CONSIDERATIONS:
• Check vehicle placarding and dangerous goods documentation
• Locate and secure emergency equipment carried on vehicle
• Assess vehicle damage and potential for secondary incidents
• Consider need for specialized heavy vehicle recovery equipment

DRIVER AND PASSENGER SAFETY:
• Account for all vehicle occupants and bystanders
• Provide medical attention for traffic accident injuries in addition to chemical exposure
• Establish safe area for interviews with driver regarding load and incident details
• Ensure driver has appropriate dangerous goods license endorsement

INFRASTRUCTURE PROTECTION:
• Assess potential damage to road surface from spilled materials
• Protect bridge structures and tunnels from chemical damage
• Consider impact on electronic traffic management systems
• Coordinate with road authority for infrastructure assessment

TRAFFIC MANAGEMENT:
• Implement graduated response based on incident severity
• Coordinate with traffic management centers for electronic signage updates
• Establish media liaison for public information on traffic delays
• Plan for extended road closure if significant cleanup required"""

    def _generate_rail_transport_guidance(self, hazard_type: str) -> str:
        """Generate rail transport specific emergency guidance"""
        
        return f"""RAIL TRANSPORT EMERGENCY GUIDANCE:

RAIL NETWORK SAFETY:
• Immediately contact rail traffic control to stop train movements
• Implement rail corridor isolation procedures for minimum 1km each direction
• Check for overhead electrical lines and coordinate isolation with network operator
• Assess track integrity and signal system impact

ROLLING STOCK CONSIDERATIONS:
• Identify rail car types and cargo manifest information
• Assess potential for rail car derailment or structural damage
• Consider need for specialized rail car recovery equipment
• Coordinate with rail operator for technical expertise

AUSTRALIAN RAIL NETWORKS:
• ARTC (Australian Rail Track Corporation): 1800 334 943
• Pacific National: Contact through ARTC coordination
• Aurizon: Regional network coordination required
• State-specific rail operators: Contact through emergency services coordination

SIGNAL AND ELECTRICAL SYSTEMS:
• Coordinate electrical isolation with network control center
• Assess signal system impact and alternative operating procedures
• Consider impact on adjacent rail lines and passenger services
• Plan for extended service disruption during incident response

SPECIALIZED RAIL EMERGENCY RESPONSE:
• Rail emergency response teams have specialized equipment and training
• Coordinate with rail operator emergency response personnel
• Consider need for rail-mounted emergency response equipment
• Plan for potential train consist evacuation if passenger service involved"""

    def _generate_risk_factors(self, hazard_type: str) -> Dict:
        """Generate risk assessment factors"""
        
        return {
            "quantity_thresholds": {
                "small": "< 50L or 50kg - localized response",
                "medium": "50-500L/kg - area evacuation", 
                "large": "> 500L/kg - major incident response"
            },
            "weather_factors": {
                "wind_speed": "Affects vapour dispersion and evacuation planning",
                "temperature": "Affects evaporation rate and vapour pressure",
                "humidity": "Affects chemical reactions and PPE comfort",
                "precipitation": "Affects spill containment and cleanup procedures"
            },
            "location_factors": {
                "population_density": "Determines evacuation complexity and medical resource needs",
                "environmental_sensitivity": "Affects cleanup requirements and EPA involvement", 
                "infrastructure": "Affects access for emergency vehicles and specialized equipment",
                "medical_facilities": "Determines transport time for emergency medical treatment"
            },
            "time_factors": {
                "day_night": "Affects visibility and evacuation procedures",
                "business_hours": "Affects availability of specialized response resources",
                "emergency_response_time": "Critical factor in incident outcome severity"
            }
        }

    def _generate_quantity_procedures(self, hazard_type: str) -> Dict:
        """Generate quantity-based procedure modifications"""
        
        return {
            "small_quantities": {
                "threshold": "< 50L or 50kg",
                "response": "Local emergency services, standard PPE, containment focus"
            },
            "medium_quantities": {
                "threshold": "50-500L or 50-500kg", 
                "response": "Specialized HAZMAT teams, enhanced PPE, area evacuation"
            },
            "large_quantities": {
                "threshold": "> 500L or 500kg",
                "response": "Multi-agency response, specialized equipment, major incident procedures"
            },
            "transport_quantities": {
                "package_limits": "ADG Code 7.9 package quantity limits apply",
                "bulk_transport": "Specialized procedures for bulk quantities in tanks/IBCs",
                "mixed_loads": "Consider interaction effects between different dangerous goods"
            }
        }

    def _generate_urban_response(self, hazard_type: str) -> str:
        """Generate urban area response modifications"""
        
        return f"""URBAN AREA RESPONSE MODIFICATIONS:

POPULATION PROTECTION:
• Higher population density requires larger evacuation resources
• Coordinate with local council for emergency accommodation facilities
• Consider impact on public transport and traffic management
• Establish multiple evacuation routes to prevent congestion

INFRASTRUCTURE CONSIDERATIONS:
• Protect underground utilities (gas, electrical, telecommunications)
• Consider impact on high-rise buildings and enclosed spaces
• Assess stormwater system contamination risk
• Coordinate with utility companies for service isolation if required

EMERGENCY SERVICES COORDINATION:
• Multiple fire stations and ambulance services available for rapid response
• Police traffic control resources for large-scale evacuation
• Hospital networks with specialized treatment capabilities
• Coordination with emergency management agencies

MEDIA AND PUBLIC INFORMATION:
• Rapid public notification through electronic media and social platforms
• Coordinate with emergency services media liaison officers
• Provide specific information about evacuation routes and assembly points
• Monitor social media for public information and misinformation management"""

    def _generate_remote_response(self, hazard_type: str) -> str:
        """Generate remote area response considerations"""
        
        return f"""REMOTE AREA RESPONSE CONSIDERATIONS:

RESOURCE LIMITATIONS:
• Extended emergency service response times require enhanced self-reliance
• Limited specialized equipment availability requires pre-positioning
• Communication challenges may require satellite or radio backup systems
• Medical evacuation procedures for serious injuries or exposures

ENVIRONMENTAL FACTORS:
• Greater environmental sensitivity in undisturbed natural areas
• Limited road access may require helicopter or specialized vehicle transport
• Weather conditions more likely to affect response operations
• Water sources may be limited for firefighting or decontamination

COMMUNITY RESOURCES:
• Local emergency services volunteers may provide initial response capability
• Mining or industrial facilities may have specialized equipment and expertise
• Agricultural communities may have earth-moving equipment for containment
• Indigenous communities may require cultural sensitivity in response procedures

LOGISTICAL PLANNING:
• Pre-position emergency response equipment at strategic locations
• Establish communication protocols with nearest emergency services
• Plan for extended incident duration due to resource limitations
• Consider helicopter landing zones for emergency medical evacuation"""

    def _generate_weather_considerations(self, hazard_type: str) -> Dict:
        """Generate weather impact considerations"""
        
        return {
            "wind_conditions": {
                "low_wind": "< 10 km/h - vapours may accumulate in low areas",
                "moderate_wind": "10-25 km/h - standard dispersion modeling applies", 
                "high_wind": "> 25 km/h - rapid dispersion but directional concentration"
            },
            "temperature_effects": {
                "cold_conditions": "< 10°C - reduced evaporation, PPE comfort issues",
                "moderate_temperature": "10-30°C - standard response procedures",
                "hot_conditions": "> 30°C - increased evaporation, heat stress risk"
            },
            "precipitation_impact": {
                "dry_conditions": "Enhanced fire risk, dust generation",
                "light_rain": "May aid vapor knockdown, complicates cleanup",
                "heavy_rain": "Increases runoff risk, limits visibility"
            },
            "seasonal_considerations": {
                "summer": "Fire risk elevated, heat stress concerns, tourism population",
                "winter": "Limited daylight hours, cold stress, difficult access",
                "storm_season": "Severe weather may affect response operations"
            }
        }

    def _generate_equipment_list(self, hazard_type: str) -> List[str]:
        """Generate enhanced equipment requirements"""
        
        base_equipment = [
            "Personal protective equipment appropriate to hazard class",
            "Air monitoring equipment for atmospheric hazard assessment",
            "Communication equipment including backup systems",
            "Decontamination supplies including emergency shower capability",
            "Spill containment materials (absorbents, barriers, pumps)",
            "Emergency medical supplies including specific antidotes where applicable"
        ]
        
        hazard_specific = {
            'FLAMMABLE_LIQUID': [
                "Class B foam concentrate and application equipment",
                "Explosion-proof electrical equipment and lighting",
                "Anti-static equipment and grounding devices",
                "Firefighting water supply and distribution equipment"
            ],
            'TOXIC_GAS': [
                "Positive pressure breathing apparatus with backup air supply",
                "Gas detection equipment with remote monitoring capability",
                "Emergency escape respirators for all personnel",
                "Vapor suppression equipment (water spray, foam)"
            ]
        }
        
        return base_equipment + hazard_specific.get(hazard_type, [])

    def _generate_response_teams(self, hazard_type: str) -> List[str]:
        """Generate specialized response team requirements"""
        
        base_teams = [
            "Local fire and rescue services",
            "Police for area security and traffic control", 
            "Ambulance services including paramedics",
            "HAZMAT specialists for chemical assessment"
        ]
        
        specialized_teams = {
            'EXPLOSIVE': [
                "Police bomb squad or explosive ordnance disposal team",
                "Australian Federal Police if terrorism suspected",
                "Military explosive ordnance disposal if large quantities"
            ],
            'RADIOACTIVE': [
                "Radiation protection specialists",
                "Australian Radiation Protection and Nuclear Safety Agency",
                "Medical personnel trained in radiation exposure treatment"
            ],
            'TOXIC_GAS': [
                "Industrial hygienists for exposure assessment",
                "Poison control specialists",
                "Environmental monitoring teams"
            ]
        }
        
        return base_teams + specialized_teams.get(hazard_type, [])

    def _generate_notification_protocols(self, hazard_type: str) -> Dict:
        """Generate enhanced notification protocols"""
        
        return {
            "immediate_notification": {
                "emergency_services": "000 - Fire, Police, Ambulance",
                "chemcall": "1800 127 406 - 24/7 chemical emergency advice",
                "poison_control": "13 11 26 - Poison information centre"
            },
            "regulatory_notification": {
                "worksafe": "State WorkSafe authority for worker exposure",
                "epa": "State EPA for environmental releases",
                "transport_authority": "National Transport Commission for transport incidents",
                "local_council": "Emergency management coordinator for community impact"
            },
            "industry_notification": {
                "company_management": "Senior management and emergency coordinator",
                "insurance": "Liability and property insurance providers",
                "customers": "Affected customers and supply chain partners",
                "media": "Coordinate through emergency services media liaison"
            },
            "timeline_requirements": {
                "immediate": "Emergency services notification within minutes",
                "1_hour": "Regulatory authorities and senior management",
                "4_hours": "Detailed incident reports to all stakeholders",
                "72_hours": "Comprehensive incident investigation report"
            }
        }

    def _generate_coordination_procedures(self, hazard_type: str) -> str:
        """Generate multi-agency coordination procedures"""
        
        return f"""MULTI-AGENCY COORDINATION PROCEDURES:

INCIDENT COMMAND STRUCTURE:
• Fire & Rescue typically assumes incident command for dangerous goods incidents
• Police responsible for area security, traffic control, and criminal investigation
• Ambulance services manage medical treatment and hospital coordination
• Emergency services establish unified command structure for complex incidents

COMMUNICATION PROTOCOLS:
• Primary communication through emergency services radio networks
• Backup communication via mobile phones and satellite systems
• Regular briefings at designated command post location
• Information sharing through standardized incident action plans

RESOURCE COORDINATION:
• Emergency services coordinate specialized equipment and personnel
• Industry specialists provide technical advice and assistance
• Government agencies provide regulatory oversight and environmental assessment
• Volunteer organizations assist with evacuation and community support

DECISION MAKING AUTHORITY:
• Incident commander has overall authority for emergency response decisions
• Technical specialists provide advice but incident commander retains final authority
• Regulatory agencies may override decisions for environmental or safety reasons
• Court orders or government direction may supersede incident command decisions

DOCUMENTATION REQUIREMENTS:
• All decisions and actions documented in incident action plans
• Multi-agency debrief conducted after incident resolution
• Lessons learned shared between agencies for continuous improvement
• Legal documentation preserved for potential litigation or regulatory proceedings"""

    @transaction.atomic
    def create_erg_intelligence_entry(self, enhanced_content: Dict, created_by=None) -> Optional[ERGContentIntelligence]:
        """
        Create ERG Content Intelligence database entry from enhanced content.
        """
        try:
            # Check if entry already exists
            existing = ERGContentIntelligence.objects.filter(
                erg_guide_number=enhanced_content['erg_guide_number']
            ).first()
            
            if existing:
                logger.info(f"Updating existing ERG intelligence for guide {enhanced_content['erg_guide_number']}")
                # Update existing entry
                for field, value in enhanced_content.items():
                    if hasattr(existing, field):
                        setattr(existing, field, value)
                existing.content_version = str(float(existing.content_version) + 0.1)
                existing.save()
                return existing
            else:
                # Create new entry
                logger.info(f"Creating new ERG intelligence for guide {enhanced_content['erg_guide_number']}")
                intelligence = ERGContentIntelligence.objects.create(
                    erg_guide_number=enhanced_content['erg_guide_number'],
                    enhanced_immediate_actions=enhanced_content['enhanced_immediate_actions'],
                    enhanced_personal_protection=enhanced_content['enhanced_personal_protection'],
                    enhanced_fire_procedures=enhanced_content['enhanced_fire_procedures'],
                    enhanced_spill_procedures=enhanced_content['enhanced_spill_procedures'],
                    enhanced_medical_response=enhanced_content['enhanced_medical_response'],
                    enhanced_evacuation_procedures=enhanced_content['enhanced_evacuation_procedures'],
                    adg_compliance_notes=enhanced_content['adg_compliance_notes'],
                    australian_emergency_contacts=enhanced_content['australian_emergency_contacts'],
                    environmental_protection_au=enhanced_content['environmental_protection_au'],
                    road_transport_guidance=enhanced_content['road_transport_guidance'],
                    rail_transport_guidance=enhanced_content['rail_transport_guidance'],
                    risk_assessment_factors=enhanced_content['risk_assessment_factors'],
                    quantity_based_procedures=enhanced_content['quantity_based_procedures'],
                    urban_response_modifications=enhanced_content['urban_response_modifications'],
                    remote_area_considerations=enhanced_content['remote_area_considerations'],
                    weather_considerations=enhanced_content['weather_considerations'],
                    required_equipment_enhanced=enhanced_content['required_equipment_enhanced'],
                    specialized_response_teams=enhanced_content['specialized_response_teams'],
                    notification_protocols=enhanced_content['notification_protocols'],
                    multi_agency_coordination=enhanced_content['multi_agency_coordination'],
                    validation_status='DRAFT',
                    created_by=created_by
                )
                
                # Link dangerous goods that use this ERG guide
                dangerous_goods = DangerousGood.objects.filter(
                    erg_guide_number=enhanced_content['erg_guide_number']
                )
                intelligence.dangerous_goods.set(dangerous_goods)
                
                return intelligence
                
        except Exception as e:
            logger.error(f"Error creating ERG intelligence entry: {str(e)}")
            return None

    def process_all_erg_guides(self, created_by=None) -> Dict[str, int]:
        """
        Process all available ERG guides to create enhanced content intelligence.
        """
        logger.info("Starting bulk ERG content extraction and enhancement")
        
        stats = {
            'processed': 0,
            'created': 0,
            'updated': 0,
            'errors': 0
        }
        
        # Get all unique ERG guide numbers from dangerous goods
        erg_guides = DangerousGood.objects.exclude(
            erg_guide_number__isnull=True
        ).exclude(
            erg_guide_number__exact=''
        ).values_list('erg_guide_number', flat=True).distinct()
        
        logger.info(f"Found {len(erg_guides)} unique ERG guides to process")
        
        for erg_guide in erg_guides:
            try:
                stats['processed'] += 1
                
                # Extract and enhance content
                enhanced_content = self.extract_and_enhance_erg_content(erg_guide)
                
                if enhanced_content:
                    # Create database entry
                    intelligence = self.create_erg_intelligence_entry(enhanced_content, created_by)
                    
                    if intelligence:
                        if intelligence.content_version == '1.0':
                            stats['created'] += 1
                        else:
                            stats['updated'] += 1
                        
                        logger.info(f"Successfully processed ERG guide {erg_guide}")
                    else:
                        stats['errors'] += 1
                        logger.error(f"Failed to create intelligence entry for ERG guide {erg_guide}")
                else:
                    stats['errors'] += 1
                    logger.error(f"Failed to extract content for ERG guide {erg_guide}")
                    
            except Exception as e:
                stats['errors'] += 1
                logger.error(f"Error processing ERG guide {erg_guide}: {str(e)}")
        
        logger.info(f"Bulk processing complete: {stats}")
        return stats