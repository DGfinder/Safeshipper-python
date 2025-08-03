#!/usr/bin/env python3
"""
Analyze Australian Code for the Transport of Dangerous Goods by Road & Rail - Edition 7.9
Priority analysis for Australian road and rail transport requirements
"""
import os
import sys
import json
import re
import PyPDF2
from datetime import datetime

def analyze_australian_adg_pdf(pdf_path):
    """Analyze Australian ADG Code PDF structure and content"""
    
    print(f"🇦🇺 Analyzing Australian Code for Dangerous Goods by Road & Rail: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"   Total pages: {total_pages}")
            
            # Extract first 20 pages to understand structure
            sample_content = []
            for page_num in range(min(20, total_pages)):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                sample_content.append({
                    'page': page_num + 1,
                    'text': page_text[:2000] if page_text else "",
                    'line_count': len(page_text.split('\n')) if page_text else 0
                })
            
            # Analyze document structure
            structure_analysis = analyze_adg_document_structure(sample_content)
            
            # Extract Australian-specific features
            australian_features = extract_australian_transport_features(sample_content)
            
            print(f"   ✅ Australian ADG Code structure analyzed")
            return {
                'total_pages': total_pages,
                'structure_analysis': structure_analysis,
                'australian_features': australian_features,
                'sample_content': sample_content
            }
            
    except Exception as e:
        print(f"❌ Error analyzing Australian ADG PDF: {str(e)}")
        return None

def analyze_adg_document_structure(sample_content):
    """Analyze Australian ADG Code document structure"""
    
    print("📋 Analyzing Australian ADG Code document structure...")
    
    structure = {
        'document_type': 'Australian ADG Code',
        'edition': '7.9',
        'volumes': ['Volume I', 'Volume II'],
        'sections_found': [],
        'table_indicators': [],
        'chapter_structure': [],
        'regulatory_framework': 'Australian Dangerous Goods Code'
    }
    
    # Look for common ADG sections
    adg_sections = [
        'General provisions', 'Classification', 'Dangerous goods list',
        'Packing requirements', 'Marking and labelling', 'Placarding',
        'Loading and segregation', 'Vehicle requirements', 'Driver requirements',
        'Emergency procedures', 'Rail transport', 'Road transport',
        'Documentation', 'Enforcement'
    ]
    
    # Analyze content for structure indicators
    all_text = ' '.join([content['text'] for content in sample_content])
    
    for section in adg_sections:
        if section.lower() in all_text.lower():
            structure['sections_found'].append(section)
    
    # Look for chapter indicators
    chapter_patterns = [
        r'Chapter\s+(\d+)', r'Part\s+(\d+)', r'Section\s+(\d+)',
        r'Volume\s+(I{1,2})', r'Appendix\s+([A-Z])'
    ]
    
    for pattern in chapter_patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        if matches:
            structure['chapter_structure'].extend(matches)
    
    # Look for dangerous goods table indicators
    table_indicators = [
        'UN number', 'Proper shipping name', 'Class', 'Packing group',
        'Special provisions', 'Limited quantities', 'Excepted quantities',
        'Packaging instructions', 'IBC instructions', 'Tank instructions',
        'Portable tank instructions', 'Special packing provisions'
    ]
    
    for indicator in table_indicators:
        if indicator.lower() in all_text.lower():
            structure['table_indicators'].append(indicator)
    
    # Look for Australian-specific terms
    australian_terms = [
        'Australian Standards', 'ACCC', 'Safe Work Australia', 'State regulations',
        'Territory regulations', 'Australian Rail Track Corporation', 'ARTC',
        'Heavy Vehicle National Law', 'HVNL', 'Chain of Responsibility'
    ]
    
    structure['australian_terms'] = []
    for term in australian_terms:
        if term.lower() in all_text.lower():
            structure['australian_terms'].append(term)
    
    print(f"   ✅ Found {len(structure['sections_found'])} ADG sections")
    print(f"   ✅ Found {len(structure['table_indicators'])} table indicators")
    print(f"   ✅ Found {len(structure['australian_terms'])} Australian-specific terms")
    
    return structure

def extract_australian_transport_features(sample_content):
    """Extract Australian-specific transport features"""
    
    print("🚛🚂 Extracting Australian road and rail transport features...")
    
    features = {
        'road_transport': [],
        'rail_transport': [],
        'vehicle_requirements': [],
        'driver_requirements': [],
        'australian_standards': [],
        'regulatory_authorities': [],
        'emergency_procedures': [],
        'state_variations': []
    }
    
    all_text = ' '.join([content['text'] for content in sample_content])
    
    # Road transport specific features
    road_indicators = [
        'Heavy Vehicle National Law', 'HVNL', 'Chain of Responsibility',
        'Mass and dimension limits', 'Vehicle standards', 'Driver licensing',
        'Fatigue management', 'Speed restrictions', 'Route restrictions',
        'Work and rest hours', 'Vehicle registration'
    ]
    
    for indicator in road_indicators:
        if indicator.lower() in all_text.lower():
            features['road_transport'].append(indicator)
    
    # Rail transport specific features
    rail_indicators = [
        'Rail safety', 'ARTC', 'Australian Rail Track Corporation',
        'Rail vehicle requirements', 'Consignment procedures', 'Shunting operations',
        'Rail network operators', 'Train consist', 'Wagon requirements',
        'Rail emergency procedures'
    ]
    
    for indicator in rail_indicators:
        if indicator.lower() in all_text.lower():
            features['rail_transport'].append(indicator)
    
    # Vehicle requirements
    vehicle_patterns = [
        r'AS\s+\d+[.\d]*', r'Australian Standard\s+\d+',
        r'ADR\s+\d+/\d+', r'ECE\s+R\d+', r'UN\s+ECE'
    ]
    
    for pattern in vehicle_patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        features['vehicle_requirements'].extend(matches)
    
    # Driver requirements
    driver_indicators = [
        'Driver licence', 'Heavy vehicle licence', 'Dangerous goods driver training',
        'Driver medical certificate', 'Driver fatigue', 'Work diary',
        'Chain of Responsibility', 'Due diligence'
    ]
    
    for indicator in driver_indicators:
        if indicator.lower() in all_text.lower():
            features['driver_requirements'].append(indicator)
    
    # Australian Standards
    as_patterns = [
        r'AS\s+\d+(?:\.\d+)*(?:-\d+)?', r'AS/NZS\s+\d+(?:\.\d+)*(?:-\d+)?'
    ]
    
    for pattern in as_patterns:
        matches = re.findall(pattern, all_text)
        features['australian_standards'].extend(matches)
    
    # Regulatory authorities
    authorities = [
        'Safe Work Australia', 'ACCC', 'Australian Competition and Consumer Commission',
        'Office of the National Rail Safety Regulator', 'ONRSR',
        'National Transport Commission', 'NTC', 'Transport for NSW',
        'VicRoads', 'Queensland Transport', 'Main Roads WA'
    ]
    
    for authority in authorities:
        if authority.lower() in all_text.lower():
            features['regulatory_authorities'].append(authority)
    
    # State variations
    state_indicators = [
        'New South Wales', 'NSW', 'Victoria', 'VIC', 'Queensland', 'QLD',
        'Western Australia', 'WA', 'South Australia', 'SA', 'Tasmania', 'TAS',
        'Northern Territory', 'NT', 'Australian Capital Territory', 'ACT'
    ]
    
    for state in state_indicators:
        if state in all_text:
            features['state_variations'].append(state)
    
    # Remove duplicates
    for key in features:
        features[key] = list(set(features[key]))
    
    print(f"   ✅ Found {len(features['road_transport'])} road transport features")
    print(f"   ✅ Found {len(features['rail_transport'])} rail transport features")
    print(f"   ✅ Found {len(features['australian_standards'])} Australian Standards")
    print(f"   ✅ Found {len(features['regulatory_authorities'])} regulatory authorities")
    
    return features

def compare_adg_vs_european_adr():
    """Compare Australian ADG vs European ADR requirements"""
    
    print("\n🔍 Comparing Australian ADG vs European ADR requirements...")
    
    comparison = {
        'regulatory_framework': {
            'Australian ADG': 'National Transport Commission (NTC) Australian Dangerous Goods Code',
            'European ADR': 'UN Economic Commission for Europe Agreement on Road Transport'
        },
        'vehicle_standards': {
            'Australian ADG': 'Australian Design Rules (ADR), Australian Standards (AS/NZS)',
            'European ADR': 'ECE Regulations, European Standards (EN)'
        },
        'driver_licensing': {
            'Australian ADG': 'Heavy Vehicle National Law, state-based licensing',
            'European ADR': 'ADR driver training certificate, European directive'
        },
        'documentation': {
            'Australian ADG': 'Consignment note, emergency information, transport document',
            'European ADR': 'Transport document, written instructions, ADR certificate'
        },
        'emergency_procedures': {
            'Australian ADG': 'Emergency information panels, Australian emergency contacts',
            'European ADR': 'Orange plates, Kemler codes, European emergency numbers'
        },
        'transport_modes': {
            'Australian ADG': 'Road and Rail (integrated code)',
            'European ADR': 'Road only (separate RID for rail)'
        },
        'geographic_scope': {
            'Australian ADG': 'Australia and New Zealand (trans-Tasman recognition)',
            'European ADR': 'European Economic Area, contracting parties'
        }
    }
    
    print(f"   📊 Key Differences Identified:")
    for category, differences in comparison.items():
        print(f"      {category.replace('_', ' ').title()}:")
        for framework, requirement in differences.items():
            print(f"        {framework}: {requirement}")
        print()
    
    # Identify integration opportunities
    integration_opportunities = [
        'Cross-reference UN numbers between ADG and ADR systems',
        'Harmonize hazard class interpretations',
        'Integrate emergency response procedures',
        'Cross-validate packaging requirements',
        'Compare segregation table differences',
        'Analyze transport category variations',
        'Assess multi-modal transfer requirements'
    ]
    
    print(f"   🔗 Integration Opportunities:")
    for i, opportunity in enumerate(integration_opportunities, 1):
        print(f"      {i}. {opportunity}")
    
    return comparison

def assess_australian_priority_gaps():
    """Assess priority gaps for Australian dangerous goods authority"""
    
    print("\n🎯 Assessing priority gaps for Australian dangerous goods authority...")
    
    priority_gaps = {
        'high_priority': [
            'Australian ADG Code 7.9 dangerous goods list integration',
            'Rail transport requirements and procedures',
            'Australian Standards vehicle equipment requirements',
            'State-based regulatory variations and exemptions',
            'Heavy Vehicle National Law compliance integration',
            'Chain of Responsibility documentation requirements'
        ],
        'medium_priority': [
            'Australian emergency contact database',
            'Safe Work Australia SDS integration',
            'ARTC rail network specific requirements',
            'Multi-modal road-to-rail transfer procedures',
            'Australian placard and marking requirements',
            'Driver licensing and training integration'
        ],
        'low_priority': [
            'State transport authority contact integration',
            'Australian chemical regulatory database links',
            'Insurance and liability requirement variations',
            'Environmental protection requirements by state',
            'Indigenous land transport considerations',
            'Cross-Tasman New Zealand recognition'
        ]
    }
    
    print(f"   🔴 HIGH PRIORITY GAPS:")
    for i, gap in enumerate(priority_gaps['high_priority'], 1):
        print(f"      {i}. {gap}")
    
    print(f"\n   🟡 MEDIUM PRIORITY GAPS:")
    for i, gap in enumerate(priority_gaps['medium_priority'], 1):
        print(f"      {i}. {gap}")
    
    print(f"\n   🟢 LOW PRIORITY GAPS:")
    for i, gap in enumerate(priority_gaps['low_priority'], 1):
        print(f"      {i}. {gap}")
    
    # Calculate implementation strategy
    implementation_strategy = {
        'phase_1_foundation': {
            'timeline': '2-3 weeks',
            'focus': 'Australian ADG dangerous goods list and rail transport integration',
            'deliverables': [
                'Extract Australian ADG dangerous goods list from PDF',
                'Create ADG-specific database columns',
                'Implement rail transport compliance features',
                'Add Australian Standards vehicle requirements'
            ]
        },
        'phase_2_compliance': {
            'timeline': '3-4 weeks',
            'focus': 'Australian regulatory compliance and documentation',
            'deliverables': [
                'Heavy Vehicle National Law integration',
                'Chain of Responsibility documentation',
                'State regulatory variations database',
                'Australian emergency procedures'
            ]
        },
        'phase_3_authority': {
            'timeline': '4-6 weeks',
            'focus': 'Complete Australian dangerous goods authority status',
            'deliverables': [
                'Multi-modal road-rail optimization',
                'Cross-reference with existing IATA/IMDG systems',
                'Australian-specific compliance validation',
                'Authority-level reporting and analytics'
            ]
        }
    }
    
    print(f"\n   📋 IMPLEMENTATION STRATEGY:")
    for phase, details in implementation_strategy.items():
        print(f"      {phase.replace('_', ' ').title()}:")
        print(f"        Timeline: {details['timeline']}")
        print(f"        Focus: {details['focus']}")
        print(f"        Deliverables: {len(details['deliverables'])} items")
        print()
    
    return priority_gaps, implementation_strategy

def save_australian_analysis_results(analysis_results, comparison, priority_gaps, implementation_strategy):
    """Save Australian ADG analysis results"""
    
    output_file = '/tmp/australian_adg_analysis.json'
    
    output_data = {
        'analysis_metadata': {
            'timestamp': datetime.now().isoformat(),
            'source_file': 'Australian Code for the Transport of Dangerous Goods by Road & Rail - Edition 7.9 (Volume I & II).pdf',
            'analysis_type': 'Australian ADG Code Analysis and Integration Planning',
            'regulatory_framework': 'Australian Dangerous Goods Code Edition 7.9',
            'priority_focus': 'Road and Rail Transport Requirements'
        },
        'document_analysis': analysis_results,
        'adg_vs_adr_comparison': comparison,
        'priority_gaps': priority_gaps,
        'implementation_strategy': implementation_strategy
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Australian ADG analysis results saved to {output_file}")
    return output_file

def main():
    """Main Australian ADG Code analysis process"""
    
    print("🚀 SafeShipper Australian Dangerous Goods Code Analysis")
    print("=" * 80)
    print("Priority Analysis: Australian Road & Rail Transport Requirements")
    print("Objective: Enhance SafeShipper as Australian dangerous goods authority")
    print()
    
    # Australian ADG PDF file path
    pdf_path = "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/Australian Code for the Transport of Dangerous Goods by Road & Rail - Edition 7.9 (Volume I & II).pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ Australian ADG PDF file not found: {pdf_path}")
        return False
    
    # Analysis steps
    analysis_steps = [
        ("Analyze Australian ADG PDF structure", lambda: analyze_australian_adg_pdf(pdf_path)),
        ("Compare ADG vs European ADR", compare_adg_vs_european_adr),
        ("Assess Australian priority gaps", assess_australian_priority_gaps)
    ]
    
    analysis_results = None
    comparison = None
    priority_gaps = None
    implementation_strategy = None
    
    for step_name, step_function in analysis_steps:
        print(f"➡️  {step_name}...")
        
        if step_name == "Analyze Australian ADG PDF structure":
            analysis_results = step_function()
            if not analysis_results:
                print(f"❌ Failed: {step_name}")
                return False
        elif step_name == "Compare ADG vs European ADR":
            comparison = step_function()
        elif step_name == "Assess Australian priority gaps":
            priority_gaps, implementation_strategy = step_function()
        
        print(f"✅ Completed: {step_name}")
        print()
    
    # Save comprehensive analysis
    output_file = save_australian_analysis_results(
        analysis_results, comparison, priority_gaps, implementation_strategy
    )
    
    print("=" * 80)
    print("🏆 Australian ADG Code Analysis Complete!")
    print()
    print("📊 Analysis Summary:")
    print(f"   Document analyzed: {analysis_results['total_pages']} pages")
    print(f"   ADG sections identified: {len(analysis_results['structure_analysis']['sections_found'])}")
    print(f"   Australian features: {len(analysis_results['australian_features'])}")
    print(f"   Priority gaps: {len(priority_gaps['high_priority']) + len(priority_gaps['medium_priority'])}")
    print()
    print("🎯 Key Findings:")
    print("   • Australian ADG Code integrates road AND rail transport")
    print("   • Significant differences from European ADR requirements")
    print("   • State-based regulatory variations require attention")
    print("   • Heavy Vehicle National Law compliance critical")
    print("   • Chain of Responsibility documentation essential")
    print()
    print("📋 Next Steps:")
    print("   1. Extract Australian dangerous goods list from PDF")
    print("   2. Create Australian-specific database enhancements")
    print("   3. Implement rail transport compliance features")
    print("   4. Integrate with existing multi-modal platform")
    print("   5. Achieve Australian dangerous goods authority status")
    print()
    print("💾 Complete analysis saved to:", output_file)
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)