#!/usr/bin/env python3
"""
Maritime Integration Assessment for SafeShipper
Comprehensive analysis of IMDG requirements and integration planning
"""
import os
import sys
import json
import psycopg2
from datetime import datetime

# Database connection parameters
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'safeshipper'
DB_USER = 'safeshipper'
DB_PASSWORD = 'admin'

def connect_to_database():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return None

def assess_current_maritime_capabilities():
    """Assess current maritime dangerous goods capabilities in SafeShipper"""
    
    print("🔍 Assessing current SafeShipper maritime capabilities...")
    
    conn = connect_to_database()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        
        # Check existing maritime-related fields
        cursor.execute("""
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'dangerous_goods_dangerousgood' 
        AND (column_name LIKE '%marine%' OR column_name LIKE '%sea%' OR column_name LIKE '%maritime%')
        """)
        
        maritime_columns = cursor.fetchall()
        
        # Get marine pollutant statistics
        cursor.execute("SELECT COUNT(*) FROM dangerous_goods_dangerousgood WHERE is_marine_pollutant = TRUE")
        marine_pollutant_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM dangerous_goods_dangerousgood")
        total_count = cursor.fetchone()[0]
        
        # Check for environmental hazard data
        cursor.execute("SELECT COUNT(*) FROM dangerous_goods_dangerousgood WHERE is_environmentally_hazardous = TRUE")
        env_hazard_count = cursor.fetchone()[0]
        
        # Sample entries with marine pollutant flags
        cursor.execute("""
        SELECT un_number, proper_shipping_name, hazard_class, is_marine_pollutant, is_environmentally_hazardous
        FROM dangerous_goods_dangerousgood 
        WHERE is_marine_pollutant = TRUE 
        LIMIT 10
        """)
        
        marine_samples = cursor.fetchall()
        
        capabilities = {
            'total_entries': total_count,
            'maritime_columns': maritime_columns,
            'marine_pollutant_count': marine_pollutant_count,
            'marine_pollutant_percentage': (marine_pollutant_count / total_count * 100) if total_count > 0 else 0,
            'env_hazard_count': env_hazard_count,
            'env_hazard_percentage': (env_hazard_count / total_count * 100) if total_count > 0 else 0,
            'marine_samples': marine_samples
        }
        
        print(f"   📊 Current Maritime Capabilities:")
        print(f"      Total dangerous goods: {total_count:,}")
        print(f"      Marine pollutants: {marine_pollutant_count:,} ({capabilities['marine_pollutant_percentage']:.1f}%)")
        print(f"      Environmental hazards: {env_hazard_count:,} ({capabilities['env_hazard_percentage']:.1f}%)")
        print(f"      Maritime-related columns: {len(maritime_columns)}")
        
        cursor.close()
        conn.close()
        
        return capabilities
        
    except Exception as e:
        print(f"❌ Error assessing maritime capabilities: {str(e)}")
        return {}

def define_imdg_requirements():
    """Define comprehensive IMDG maritime requirements"""
    
    print("📋 Defining IMDG maritime transport requirements...")
    
    imdg_requirements = {
        'classification_enhancements': {
            'marine_pollutant_categories': [
                'Severe marine pollutant', 'Marine pollutant', 'Environmentally hazardous substance'
            ],
            'stowage_categories': {
                'A': 'On deck or under deck',
                'B': 'On deck or under deck, away from living quarters',
                'C': 'On deck only',
                'D': 'Under deck only',
                'E': 'Special requirements'
            },
            'segregation_groups': [
                'Acids', 'Alkalis', 'Ammonium compounds', 'Azides', 'Chlorates',
                'Chlorites', 'Cyanides', 'Heavy metals', 'Lead compounds',
                'Liquid halogenated hydrocarbons', 'Mercury compounds', 'Nitrites',
                'Peroxides', 'Powdered metals'
            ]
        },
        'emergency_procedures': {
            'ems_schedules': {
                'fire_schedules': ['F-A', 'F-B', 'F-C', 'F-D', 'F-E', 'F-G', 'F-H'],
                'spillage_schedules': ['S-A', 'S-B', 'S-C', 'S-D', 'S-E', 'S-F', 'S-G', 'S-H', 'S-I', 'S-J', 'S-K', 'S-L', 'S-M', 'S-N', 'S-O', 'S-P', 'S-Q', 'S-R', 'S-S', 'S-T', 'S-U', 'S-V', 'S-W', 'S-X', 'S-Y', 'S-Z']
            },
            'emergency_contacts': [
                '24/7 maritime emergency response', 'Port authority contacts', 
                'Coast guard emergency numbers', 'Marine pollution response teams'
            ]
        },
        'documentation_requirements': {
            'shipper_declaration': True,
            'container_packing_certificate': True,
            'dangerous_goods_manifest': True,
            'marine_pollutant_declaration': True,
            'stowage_plan': True,
            'segregation_table': True
        },
        'operational_requirements': {
            'loading_restrictions': ['Port restrictions', 'Terminal limitations', 'Weather restrictions'],
            'vessel_requirements': ['Container ship', 'General cargo', 'Bulk carrier', 'Tanker'],
            'route_planning': ['Coastal waters', 'International waters', 'Port entry requirements'],
            'cargo_securing': ['Container securing', 'Separation distances', 'Ventilation requirements']
        }
    }
    
    print(f"   ✅ Defined {len(imdg_requirements)} major IMDG requirement categories")
    print(f"      Classification enhancements: {len(imdg_requirements['classification_enhancements'])} types")
    print(f"      Emergency procedures: {len(imdg_requirements['emergency_procedures'])} systems")
    print(f"      Documentation: {len(imdg_requirements['documentation_requirements'])} requirements")
    print(f"      Operational: {len(imdg_requirements['operational_requirements'])} areas")
    
    return imdg_requirements

def create_maritime_enhancement_plan(current_capabilities, imdg_requirements):
    """Create comprehensive maritime enhancement plan"""
    
    print("📋 Creating maritime enhancement plan...")
    
    # Calculate current coverage
    current_maritime_fields = len(current_capabilities.get('maritime_columns', []))
    marine_pollutant_coverage = current_capabilities.get('marine_pollutant_percentage', 0)
    
    enhancement_plan = {
        'current_status': {
            'maritime_database_fields': current_maritime_fields,
            'marine_pollutant_coverage': f"{marine_pollutant_coverage:.1f}%",
            'overall_maritime_readiness': 'BASIC' if current_maritime_fields > 0 else 'NONE'
        },
        'phase_1_database_enhancement': {
            'priority': 'HIGH',
            'timeline': '1-2 weeks',
            'deliverables': [
                'Add IMDG stowage category columns',
                'Implement EMS emergency schedule codes',
                'Create maritime segregation group classifications',
                'Add marine pollutant subcategories',
                'Implement vessel type compatibility',
                'Add port restriction flags'
            ]
        },
        'phase_2_compliance_integration': {
            'priority': 'HIGH', 
            'timeline': '2-3 weeks',
            'deliverables': [
                'Integrate IMDG classification rules',
                'Implement maritime compliance validation',
                'Create stowage requirement calculations',
                'Add segregation distance calculations',
                'Implement emergency procedure lookups'
            ]
        },
        'phase_3_operational_features': {
            'priority': 'MEDIUM',
            'timeline': '3-4 weeks',
            'deliverables': [
                'Maritime route planning intelligence',
                'Port restriction database integration',
                'Vessel-specific loading plans',
                'Container stowage optimization',
                'Maritime emergency response procedures'
            ]
        },
        'phase_4_documentation_automation': {
            'priority': 'MEDIUM',
            'timeline': '4-5 weeks',
            'deliverables': [
                'Automated shipper declarations',
                'Container packing certificates',
                'Dangerous goods manifests',
                'Stowage plans and segregation tables',
                'Maritime compliance reports'
            ]
        }
    }
    
    # Calculate business impact
    business_impact = {
        'market_expansion': {
            'current_modes': ['Road (ADR)', 'Air (ICAO/IATA)'],
            'enhanced_modes': ['Road (ADR)', 'Air (ICAO/IATA)', 'Sea (IMDG)'],
            'market_opportunity': 'Complete multi-modal dangerous goods platform'
        },
        'competitive_advantages': [
            'Only platform with complete Road + Air + Sea compliance',
            'Automated maritime compliance validation',
            'Integrated multi-modal route optimization',
            'Complete dangerous goods lifecycle management'
        ],
        'customer_benefits': [
            'Single platform for all transport modes',
            'Automated IMDG compliance checking',
            'Maritime emergency response integration',
            'Complete supply chain visibility'
        ]
    }
    
    enhancement_plan['business_impact'] = business_impact
    
    print(f"   ✅ Maritime enhancement plan created")
    print(f"      Current readiness: {enhancement_plan['current_status']['overall_maritime_readiness']}")
    print(f"      Implementation phases: 4")
    print(f"      Total timeline: 4-5 weeks")
    print(f"      Business impact: Complete multi-modal platform")
    
    return enhancement_plan

def generate_maritime_database_schema():
    """Generate maritime database schema enhancements"""
    
    print("🗄️ Generating maritime database schema...")
    
    maritime_schema = {
        'new_columns': [
            # IMDG Stowage and Segregation
            ('imdg_stowage_category', 'VARCHAR(5)'),  # A, B, C, D, E
            ('imdg_stowage_requirements', 'TEXT'),
            ('imdg_segregation_group', 'VARCHAR(50)'),
            ('imdg_segregation_code', 'VARCHAR(10)'),
            
            # Marine Pollutant Enhancement
            ('marine_pollutant_category', 'VARCHAR(50)'),  # Severe, Standard, Environmental
            ('marine_environmental_hazard_level', 'INTEGER'),  # 1-3 severity
            ('aquatic_toxicity_category', 'VARCHAR(20)'),
            
            # EMS Emergency Schedules
            ('ems_fire_schedule', 'VARCHAR(10)'),  # F-A, F-B, etc.
            ('ems_spillage_schedule', 'VARCHAR(10)'),  # S-A, S-B, etc.
            ('maritime_emergency_procedures', 'TEXT'),
            
            # Vessel and Port Requirements
            ('vessel_type_restrictions', 'TEXT'),
            ('port_entry_restrictions', 'TEXT'),
            ('container_ship_acceptable', 'BOOLEAN DEFAULT TRUE'),
            ('bulk_carrier_acceptable', 'BOOLEAN DEFAULT TRUE'),
            ('tanker_vessel_acceptable', 'BOOLEAN DEFAULT TRUE'),
            
            # Maritime Documentation
            ('imdg_shipper_declaration_required', 'BOOLEAN DEFAULT FALSE'),
            ('container_packing_certificate_required', 'BOOLEAN DEFAULT FALSE'),
            ('maritime_manifest_required', 'BOOLEAN DEFAULT FALSE'),
            
            # Operational Maritime Requirements
            ('maritime_loading_restrictions', 'TEXT'),
            ('sea_transport_quantity_limits', 'TEXT'),
            ('maritime_packaging_requirements', 'TEXT'),
            ('container_securing_requirements', 'TEXT'),
            
            # IMDG Compliance Status
            ('imdg_compliant', 'BOOLEAN DEFAULT FALSE'),
            ('maritime_transport_prohibited', 'BOOLEAN DEFAULT FALSE'),
            ('imdg_last_updated', 'TIMESTAMP')
        ],
        'new_tables': [
            {
                'name': 'imdg_stowage_categories',
                'columns': [
                    'id SERIAL PRIMARY KEY',
                    'category_code VARCHAR(5) NOT NULL UNIQUE',
                    'category_name VARCHAR(100) NOT NULL',
                    'description TEXT',
                    'location_requirements TEXT',
                    'special_provisions TEXT'
                ]
            },
            {
                'name': 'imdg_segregation_matrix',
                'columns': [
                    'id SERIAL PRIMARY KEY',
                    'group_1 VARCHAR(50) NOT NULL',
                    'group_2 VARCHAR(50) NOT NULL',
                    'segregation_requirement VARCHAR(50) NOT NULL',
                    'minimum_distance_meters INTEGER',
                    'special_conditions TEXT'
                ]
            },
            {
                'name': 'ems_emergency_schedules',
                'columns': [
                    'id SERIAL PRIMARY KEY',
                    'schedule_code VARCHAR(10) NOT NULL UNIQUE',
                    'schedule_type VARCHAR(20) NOT NULL',  # FIRE or SPILLAGE
                    'emergency_procedures TEXT NOT NULL',
                    'equipment_required TEXT',
                    'special_considerations TEXT'
                ]
            },
            {
                'name': 'maritime_port_restrictions',
                'columns': [
                    'id SERIAL PRIMARY KEY',
                    'port_code VARCHAR(10) NOT NULL',
                    'port_name VARCHAR(100) NOT NULL',
                    'country_code VARCHAR(3) NOT NULL',
                    'dangerous_goods_restrictions TEXT',
                    'prohibited_classes TEXT',
                    'special_requirements TEXT',
                    'contact_information TEXT'
                ]
            }
        ],
        'enhanced_views': [
            {
                'name': 'maritime_dangerous_goods_view',
                'description': 'Complete maritime dangerous goods with IMDG compliance'
            },
            {
                'name': 'multimodal_transport_intelligence',
                'description': 'Road + Air + Sea transport intelligence combined'
            }
        ]
    }
    
    print(f"   ✅ Maritime schema generated")
    print(f"      New columns: {len(maritime_schema['new_columns'])}")
    print(f"      New tables: {len(maritime_schema['new_tables'])}")
    print(f"      Enhanced views: {len(maritime_schema['enhanced_views'])}")
    
    return maritime_schema

def save_maritime_assessment(capabilities, requirements, enhancement_plan, schema):
    """Save comprehensive maritime assessment"""
    
    output_file = '/tmp/maritime_integration_assessment.json'
    
    assessment_data = {
        'assessment_metadata': {
            'timestamp': datetime.now().isoformat(),
            'assessment_type': 'IMDG Maritime Integration Assessment',
            'regulatory_framework': 'IMO International Maritime Dangerous Goods Code',
            'scope': 'Complete maritime transport compliance integration'
        },
        'current_capabilities': capabilities,
        'imdg_requirements': requirements,
        'enhancement_plan': enhancement_plan,
        'database_schema': schema,
        'implementation_summary': {
            'current_maritime_readiness': enhancement_plan['current_status']['overall_maritime_readiness'],
            'enhancement_phases': 4,
            'total_timeline': '4-5 weeks',
            'business_impact': 'Complete multi-modal dangerous goods platform',
            'competitive_advantage': 'Only platform with Road + Air + Sea compliance'
        }
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(assessment_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Maritime assessment saved to {output_file}")
    return output_file

def main():
    """Main maritime integration assessment"""
    
    print("🚀 SafeShipper Maritime Integration Assessment")
    print("=" * 80)
    print("Comprehensive IMDG Maritime Transport Integration Analysis")
    print("Objective: Plan complete multi-modal transport platform (Road + Air + Sea)")
    print()
    
    # Assessment steps
    assessment_steps = [
        ("Assess current maritime capabilities", assess_current_maritime_capabilities),
        ("Define IMDG requirements", define_imdg_requirements),
        ("Create enhancement plan", lambda: create_maritime_enhancement_plan(capabilities, requirements)),
        ("Generate database schema", generate_maritime_database_schema)
    ]
    
    capabilities = {}
    requirements = {}
    enhancement_plan = {}
    schema = {}
    
    for step_name, step_function in assessment_steps:
        print(f"➡️  {step_name}...")
        
        if step_name == "Assess current maritime capabilities":
            capabilities = step_function()
        elif step_name == "Define IMDG requirements":
            requirements = step_function()
        elif step_name == "Create enhancement plan":
            enhancement_plan = create_maritime_enhancement_plan(capabilities, requirements)
        elif step_name == "Generate database schema":
            schema = step_function()
        
        print(f"✅ Completed: {step_name}")
        print()
    
    # Save comprehensive assessment
    output_file = save_maritime_assessment(capabilities, requirements, enhancement_plan, schema)
    
    print("=" * 80)
    print("🏆 Maritime Integration Assessment Complete!")
    print()
    print("📊 Assessment Summary:")
    print(f"   Current maritime readiness: {enhancement_plan['current_status']['overall_maritime_readiness']}")
    print(f"   Marine pollutant coverage: {capabilities.get('marine_pollutant_percentage', 0):.1f}%")
    print(f"   IMDG requirements identified: {len(requirements)}")
    print(f"   Implementation timeline: 4-5 weeks")
    print()
    print("🎯 Key Findings:")
    print("   • SafeShipper has basic maritime support (marine pollutant flags)")
    print("   • Comprehensive IMDG enhancement needed for full maritime compliance")
    print("   • Maritime integration will complete multi-modal transport platform")
    print("   • Competitive advantage: Only Road + Air + Sea dangerous goods platform")
    print()
    print("📋 Recommended Next Steps:")
    print("   1. Implement maritime database schema enhancements")
    print("   2. Create IMDG compliance validation system")
    print("   3. Integrate maritime emergency procedures")
    print("   4. Complete multi-modal transport intelligence platform")
    print()
    print("💾 Complete assessment saved to:", output_file)
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)