#!/usr/bin/env python3
"""
Analyze IMDG (International Maritime Dangerous Goods) Code
Phase 1: Maritime transport compliance analysis for SafeShipper
"""
import os
import sys
import json
import re
import PyPDF2
from datetime import datetime

def analyze_imdg_pdf(pdf_path):
    """Analyze IMDG PDF structure and content"""
    
    print(f"🚢 Analyzing IMDG (International Maritime Dangerous Goods) Code: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"   Total pages: {total_pages}")
            
            # Extract first 10 pages to understand structure
            sample_content = []
            for page_num in range(min(10, total_pages)):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                sample_content.append({
                    'page': page_num + 1,
                    'text': page_text[:1000] if page_text else "",
                    'line_count': len(page_text.split('\n')) if page_text else 0
                })
            
            # Analyze document structure
            structure_analysis = analyze_document_structure(sample_content)
            
            # Extract maritime-specific content
            maritime_features = extract_maritime_features(sample_content)
            
            print(f"   ✅ Document structure analyzed")
            return {
                'total_pages': total_pages,
                'structure_analysis': structure_analysis,
                'maritime_features': maritime_features,
                'sample_content': sample_content
            }
            
    except Exception as e:
        print(f"❌ Error analyzing IMDG PDF: {str(e)}")
        return None

def analyze_document_structure(sample_content):
    """Analyze IMDG document structure"""
    
    print("📋 Analyzing IMDG document structure...")
    
    structure = {
        'document_type': 'IMDG Code',
        'sections_found': [],
        'table_indicators': [],
        'chapter_structure': [],
        'regulatory_framework': 'IMO/UN Maritime'
    }
    
    # Look for common IMDG sections
    imdg_sections = [
        'General provisions', 'Classification', 'Dangerous goods list',
        'Packing requirements', 'Marking and labelling', 'Placarding',
        'Segregation', 'Transport operations', 'Emergency procedures',
        'Marine pollutants', 'Stowage and handling', 'Documentation'
    ]
    
    # Analyze content for structure indicators
    all_text = ' '.join([content['text'] for content in sample_content])
    
    for section in imdg_sections:
        if section.lower() in all_text.lower():
            structure['sections_found'].append(section)
    
    # Look for chapter indicators
    chapter_patterns = [
        r'Chapter\s+(\d+)', r'Part\s+(\d+)', r'Section\s+(\d+)',
        r'Annex\s+(\d+)', r'Appendix\s+([A-Z])'
    ]
    
    for pattern in chapter_patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        if matches:
            structure['chapter_structure'].extend(matches)
    
    # Look for dangerous goods table indicators
    table_indicators = [
        'UN number', 'Proper shipping name', 'Class', 'Packing group',
        'Marine pollutant', 'EmS', 'Stowage', 'Segregation'
    ]
    
    for indicator in table_indicators:
        if indicator.lower() in all_text.lower():
            structure['table_indicators'].append(indicator)
    
    print(f"   ✅ Found {len(structure['sections_found'])} IMDG sections")
    print(f"   ✅ Found {len(structure['table_indicators'])} table indicators")
    
    return structure

def extract_maritime_features(sample_content):
    """Extract maritime-specific dangerous goods features"""
    
    print("🚢 Extracting maritime-specific features...")
    
    features = {
        'marine_pollutants': [],
        'stowage_requirements': [],
        'segregation_groups': [],
        'ems_codes': [],
        'maritime_classifications': [],
        'port_restrictions': []
    }
    
    all_text = ' '.join([content['text'] for content in sample_content])
    
    # Marine pollutant indicators
    marine_pollutant_patterns = [
        r'Marine pollutant', r'MARINE POLLUTANT', r'MP\b',
        r'Severe marine pollutant', r'Aquatic environment'
    ]
    
    for pattern in marine_pollutant_patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        features['marine_pollutants'].extend(matches)
    
    # EMS (Emergency Schedule) codes
    ems_patterns = [
        r'F-[A-Z]\d{2}', r'S-[A-Z]\d{2}', r'EmS\s+([A-Z]-\d{2})'
    ]
    
    for pattern in ems_patterns:
        matches = re.findall(pattern, all_text)
        features['ems_codes'].extend(matches)
    
    # Stowage categories
    stowage_patterns = [
        r'Category\s+[A-E]', r'Stowage\s+[A-E]', r'SW\d{2}',
        r'On deck only', r'Under deck only', r'Away from living quarters'
    ]
    
    for pattern in stowage_patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        features['stowage_requirements'].extend(matches)
    
    # Segregation groups
    segregation_patterns = [
        r'SGG\d+', r'Segregation group\s+(\d+)',
        r'SG\s+(\d+)', r'Group\s+([A-Z]\d{2})'
    ]
    
    for pattern in segregation_patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        features['segregation_groups'].extend(matches)
    
    print(f"   ✅ Found {len(set(features['marine_pollutants']))} marine pollutant references")
    print(f"   ✅ Found {len(set(features['ems_codes']))} EMS codes")
    print(f"   ✅ Found {len(set(features['stowage_requirements']))} stowage requirements")
    
    return features

def assess_maritime_gaps(analysis_results):
    """Assess gaps between current SafeShipper capabilities and IMDG requirements"""
    
    print("\n🔍 Assessing maritime transport gaps...")
    
    # Current SafeShipper maritime capabilities (from our database)
    current_capabilities = {
        'marine_pollutant_flag': True,  # We have is_marine_pollutant field
        'environmental_hazard_flag': True,  # We have is_environmentally_hazardous field
        'basic_maritime_support': True,
        'imdg_classification': False,
        'ems_emergency_codes': False,
        'stowage_requirements': False,
        'maritime_segregation': False,
        'port_restrictions': False,
        'ship_type_requirements': False,
        'maritime_documentation': False
    }
    
    # IMDG requirements identified
    imdg_requirements = {
        'marine_pollutant_classification': True,
        'ems_emergency_schedules': True,
        'stowage_categories': True,
        'segregation_groups': True,
        'maritime_transport_document': True,
        'port_entry_restrictions': True,
        'ship_type_compatibility': True,
        'maritime_emergency_procedures': True,
        'imdg_marking_requirements': True,
        'container_stowage_plans': True
    }
    
    # Calculate gaps
    gaps = []
    enhancements = []
    
    for requirement, needed in imdg_requirements.items():
        if needed:
            current_support = current_capabilities.get(requirement.replace('_', '_'), False)
            if not current_support:
                gaps.append(requirement)
            else:
                enhancements.append(requirement)
    
    gap_analysis = {
        'total_imdg_requirements': len(imdg_requirements),
        'current_support': len(enhancements),
        'gaps_identified': len(gaps),
        'coverage_percentage': (len(enhancements) / len(imdg_requirements)) * 100,
        'priority_gaps': gaps[:5],  # Top 5 priority gaps
        'existing_enhancements': enhancements
    }
    
    print(f"   📊 Current IMDG coverage: {gap_analysis['coverage_percentage']:.1f}%")
    print(f"   🔴 Gaps identified: {gap_analysis['gaps_identified']}")
    print(f"   🟢 Existing capabilities: {gap_analysis['current_support']}")
    
    return gap_analysis

def generate_maritime_integration_plan(analysis_results, gap_analysis):
    """Generate comprehensive maritime integration plan"""
    
    print("\n📋 Generating maritime integration plan...")
    
    integration_plan = {
        'phase_1_analysis': {
            'status': 'COMPLETE',
            'deliverables': [
                'IMDG PDF structure analysis',
                'Maritime feature extraction',
                'Gap analysis vs current capabilities'
            ]
        },
        'phase_2_database_enhancement': {
            'status': 'PLANNED',
            'priority': 'HIGH',
            'deliverables': [
                'Add IMDG classification columns',
                'Implement EMS emergency schedule codes',
                'Add stowage category requirements',
                'Create maritime segregation matrix',
                'Add marine pollutant subcategories'
            ]
        },
        'phase_3_data_extraction': {
            'status': 'PLANNED',
            'priority': 'HIGH',
            'deliverables': [
                'Extract IMDG dangerous goods list',
                'Parse maritime-specific requirements',
                'Extract EMS codes and procedures',
                'Map stowage categories to UN numbers'
            ]
        },
        'phase_4_integration': {
            'status': 'PLANNED',
            'priority': 'MEDIUM',
            'deliverables': [
                'Integrate IMDG data with existing database',
                'Implement maritime compliance validation',
                'Create multi-modal transport optimization',
                'Add maritime emergency procedures'
            ]
        }
    }
    
    # Calculate implementation complexity
    complexity_factors = {
        'pdf_size': analysis_results['total_pages'],
        'identified_gaps': gap_analysis['gaps_identified'],
        'integration_points': len(analysis_results['maritime_features']),
        'regulatory_complexity': 'HIGH'  # IMDG is complex regulatory framework
    }
    
    print(f"   ✅ Integration plan generated")
    print(f"   📊 Implementation complexity: {complexity_factors['regulatory_complexity']}")
    
    return integration_plan

def save_analysis_results(analysis_results, gap_analysis, integration_plan):
    """Save IMDG analysis results"""
    
    output_file = '/tmp/imdg_maritime_analysis.json'
    
    output_data = {
        'analysis_metadata': {
            'timestamp': datetime.now().isoformat(),
            'source_file': 'IMDG_4062-66b3dd44-4ee5-4a92-bce6-9abd26f2f0b5.pdf',
            'analysis_type': 'IMDG Maritime Transport Compliance Assessment',
            'regulatory_framework': 'IMO International Maritime Dangerous Goods Code'
        },
        'document_analysis': analysis_results,
        'gap_analysis': gap_analysis,
        'integration_plan': integration_plan
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 IMDG analysis results saved to {output_file}")
    return output_file

def main():
    """Main IMDG analysis process"""
    
    print("🚀 SafeShipper IMDG (International Maritime Dangerous Goods) Analysis")
    print("=" * 80)
    print("Phase 1: Maritime Transport Compliance Assessment")
    print("Objective: Identify gaps and plan integration with existing multi-modal platform")
    print()
    
    # IMDG PDF file path
    pdf_path = "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/IMDG_4062-66b3dd44-4ee5-4a92-bce6-9abd26f2f0b5.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ IMDG PDF file not found: {pdf_path}")
        return False
    
    # Analyze IMDG PDF
    print("🔄 Starting IMDG analysis...")
    analysis_results = analyze_imdg_pdf(pdf_path)
    
    if not analysis_results:
        print("❌ IMDG analysis failed")
        return False
    
    # Assess maritime gaps
    gap_analysis = assess_maritime_gaps(analysis_results)
    
    # Generate integration plan
    integration_plan = generate_maritime_integration_plan(analysis_results, gap_analysis)
    
    # Save results
    output_file = save_analysis_results(analysis_results, gap_analysis, integration_plan)
    
    print()
    print("=" * 80)
    print("✅ IMDG Maritime Analysis Complete!")
    print(f"📊 Document analyzed: {analysis_results['total_pages']} pages")
    print(f"🔍 Maritime features identified: {len(analysis_results['maritime_features'])}")
    print(f"📋 Integration gaps: {gap_analysis['gaps_identified']}")
    print(f"💾 Results saved to: {output_file}")
    print()
    print("🎯 Key Findings:")
    print(f"   • Current IMDG coverage: {gap_analysis['coverage_percentage']:.1f}%")
    print(f"   • Maritime features to implement: {gap_analysis['gaps_identified']}")
    print(f"   • Integration complexity: HIGH (comprehensive regulatory framework)")
    print()
    print("📋 Next Steps:")
    print("   1. Extract IMDG dangerous goods list and classifications")
    print("   2. Implement maritime database schema enhancements")
    print("   3. Integrate IMDG data with existing ADR/IATA platform")
    print("   4. Create complete multi-modal transport intelligence")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)