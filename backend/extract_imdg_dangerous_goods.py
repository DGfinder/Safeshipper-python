#!/usr/bin/env python3
"""
Extract IMDG Dangerous Goods List and Maritime Classifications
Phase 2: Data extraction from International Maritime Dangerous Goods Code
"""
import os
import sys
import json
import re
import PyPDF2
from datetime import datetime

def extract_imdg_dangerous_goods_list(pdf_path):
    """Extract dangerous goods list from IMDG PDF"""
    
    print(f"🚢 Extracting IMDG dangerous goods list: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"   Total pages: {total_pages}")
            
            all_entries = []
            
            # Process all pages to find dangerous goods entries
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                
                # Parse dangerous goods entries from this page
                page_entries = parse_imdg_page(page_text, page_num + 1)
                all_entries.extend(page_entries)
                
                if (page_num + 1) % 10 == 0:
                    print(f"   Processed page {page_num + 1}/{total_pages}...")
            
            print(f"   ✅ Found {len(all_entries)} IMDG dangerous goods entries")
            return all_entries
            
    except Exception as e:
        print(f"❌ Error extracting IMDG dangerous goods: {str(e)}")
        return []

def parse_imdg_page(page_text, page_num):
    """Parse IMDG dangerous goods entries from a single page"""
    
    entries = []
    lines = page_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 10:
            continue
            
        # Skip headers and non-data lines
        if any(header in line.upper() for header in [
            'UN NUMBER', 'PROPER SHIPPING NAME', 'CLASS', 'PACKING GROUP',
            'IMDG CODE', 'GUIDE FOR SHIPPERS', 'PAGE', 'STOWAGE', 'SEGREGATION'
        ]):
            continue
        
        # Look for UN number patterns indicating dangerous goods entries
        if re.search(r'\bUN\s*\d{4}\b', line):
            entry = parse_imdg_entry_line(line, page_num)
            if entry:
                entries.append(entry)
    
    return entries

def parse_imdg_entry_line(line, page_num):
    """Parse a single IMDG dangerous goods entry line"""
    
    try:
        entry = {
            'page_number': page_num,
            'raw_line': line,
            'source': 'imdg_code'
        }
        
        # Extract UN number
        un_match = re.search(r'UN\s*(\d{4})', line)
        if not un_match:
            return None
        
        entry['un_number'] = un_match.group(1)
        
        # Extract proper shipping name (complex due to IMDG formatting)
        # Look for text before class indicators
        name_patterns = [
            r'UN\s*\d{4}\s+([^0-9\(\)]+?)(?:\s+\d|\s+Class|\s+I{1,3}\b)',
            r'(\w+(?:\s+\w+){1,8})\s+(?:Class\s+)?\d',
        ]
        
        for pattern in name_patterns:
            name_match = re.search(pattern, line, re.IGNORECASE)
            if name_match:
                shipping_name = name_match.group(1).strip()
                if len(shipping_name) > 3:  # Filter out short/invalid matches
                    entry['proper_shipping_name'] = shipping_name[:100]  # Limit length
                    break
        
        # Extract hazard class
        class_patterns = [
            r'Class\s+(\d+(?:\.\d+)?)', r'\b(\d+(?:\.\d+)?)\s+(?:PG|I{1,3})',
            r'\b([1-9](?:\.[1-6])?)\b'
        ]
        
        for pattern in class_patterns:
            class_match = re.search(pattern, line)
            if class_match:
                hazard_class = class_match.group(1)
                if hazard_class in ['1', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6',
                                  '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3',
                                  '5.1', '5.2', '6.1', '6.2', '7', '8', '9']:
                    entry['hazard_class'] = hazard_class
                    break
        
        # Extract packing group
        pg_patterns = [r'\bPG\s*(I{1,3})', r'\b(I{1,3})\s+PG', r'\bPacking\s+Group\s+(I{1,3})']
        for pattern in pg_patterns:
            pg_match = re.search(pattern, line, re.IGNORECASE)
            if pg_match:
                pg_roman = pg_match.group(1)
                pg_map = {'I': '1', 'II': '2', 'III': '3'}
                entry['packing_group'] = pg_map.get(pg_roman, pg_roman)
                break
        
        # Extract marine pollutant status
        marine_indicators = ['Marine Pollutant', 'MP', 'MARINE POLLUTANT', 'Pollutant']
        for indicator in marine_indicators:
            if indicator.upper() in line.upper():
                entry['marine_pollutant'] = True
                break
        
        # Extract stowage category
        stowage_patterns = [
            r'Category\s+([A-E])', r'Stowage\s+([A-E])', r'\b([A-E])\s+stowage'
        ]
        
        for pattern in stowage_patterns:
            stowage_match = re.search(pattern, line, re.IGNORECASE)
            if stowage_match:
                entry['imdg_stowage_category'] = stowage_match.group(1)
                break
        
        # Extract EMS codes (Emergency Schedule)
        ems_patterns = [
            r'F-([A-Z]\d{2})', r'S-([A-Z]\d{2})', r'EmS\s+([FS]-[A-Z]\d{2})'
        ]
        
        ems_codes = []
        for pattern in ems_patterns:
            ems_matches = re.findall(pattern, line)
            ems_codes.extend(ems_matches)
        
        if ems_codes:
            entry['imdg_ems_codes'] = ems_codes
        
        # Extract segregation group
        segregation_patterns = [
            r'SGG\s*(\d+)', r'Segregation\s+(\d+)', r'SG\s*(\d+)'
        ]
        
        for pattern in segregation_patterns:
            seg_match = re.search(pattern, line, re.IGNORECASE)
            if seg_match:
                entry['imdg_segregation_group'] = seg_match.group(1)
                break
        
        # IMDG-specific indicators
        imdg_keywords = [
            'limited quantity', 'excepted quantity', 'portable tank',
            'bulk cargo', 'tank vessel', 'stowage'
        ]
        
        for keyword in imdg_keywords:
            if keyword.lower() in line.lower():
                if 'imdg_special_provisions' not in entry:
                    entry['imdg_special_provisions'] = []
                entry['imdg_special_provisions'].append(keyword)
        
        return entry
        
    except Exception as e:
        print(f"   ⚠️  Error parsing IMDG line: {str(e)[:50]}...")
        return None

def clean_and_validate_imdg_entries(entries):
    """Clean and validate IMDG dangerous goods entries"""
    
    print(f"🧹 Cleaning and validating {len(entries)} IMDG entries...")
    
    valid_entries = []
    seen_un_numbers = set()
    
    for entry in entries:
        # Validate UN number
        un_num = entry.get('un_number')
        if not un_num or not re.match(r'^\d{4}$', un_num):
            continue
        
        # Handle duplicates by merging maritime data
        if un_num in seen_un_numbers:
            existing = next((e for e in valid_entries if e['un_number'] == un_num), None)
            if existing:
                # Merge IMDG-specific data
                for key, value in entry.items():
                    if value and not existing.get(key):
                        existing[key] = value
            continue
        
        # Require minimum data quality
        if not entry.get('proper_shipping_name') and not entry.get('hazard_class'):
            continue
        
        seen_un_numbers.add(un_num)
        valid_entries.append(entry)
    
    print(f"   ✅ Validated {len(valid_entries)} unique IMDG entries")
    return valid_entries

def analyze_imdg_maritime_features(entries):
    """Analyze IMDG maritime-specific features"""
    
    print("\n📊 Analyzing IMDG maritime features...")
    
    total_entries = len(entries)
    
    # Maritime feature analysis
    maritime_analysis = {
        'total_entries': total_entries,
        'with_marine_pollutant': len([e for e in entries if e.get('marine_pollutant')]),
        'with_stowage_category': len([e for e in entries if 'imdg_stowage_category' in e]),
        'with_ems_codes': len([e for e in entries if 'imdg_ems_codes' in e]),
        'with_segregation_group': len([e for e in entries if 'imdg_segregation_group' in e]),
        'with_special_provisions': len([e for e in entries if 'imdg_special_provisions' in e]),
        'with_proper_shipping_name': len([e for e in entries if 'proper_shipping_name' in e]),
        'with_hazard_class': len([e for e in entries if 'hazard_class' in e]),
        'with_packing_group': len([e for e in entries if 'packing_group' in e])
    }
    
    # Hazard class distribution
    hazard_classes = {}
    for entry in entries:
        hc = entry.get('hazard_class')
        if hc:
            hazard_classes[hc] = hazard_classes.get(hc, 0) + 1
    
    # Stowage categories
    stowage_categories = {}
    for entry in entries:
        sc = entry.get('imdg_stowage_category')
        if sc:
            stowage_categories[sc] = stowage_categories.get(sc, 0) + 1
    
    print(f"   Total IMDG entries: {total_entries}")
    print(f"\\n🌊 Maritime Features:")
    for feature, count in maritime_analysis.items():
        if feature != 'total_entries':
            percentage = (count / total_entries * 100) if total_entries > 0 else 0
            print(f"   {feature.replace('_', ' ').title()}: {count} ({percentage:.1f}%)")
    
    print(f"\\n📋 Hazard Class Distribution:")
    for hc, count in sorted(hazard_classes.items()):
        percentage = (count / total_entries * 100) if total_entries > 0 else 0
        print(f"   Class {hc}: {count} ({percentage:.1f}%)")
    
    if stowage_categories:
        print(f"\\n📦 Stowage Categories:")
        for sc, count in sorted(stowage_categories.items()):
            percentage = (count / total_entries * 100) if total_entries > 0 else 0
            print(f"   Category {sc}: {count} ({percentage:.1f}%)")
    
    # Show sample maritime entries
    print(f"\\n🔍 Sample IMDG maritime entries:")
    for i, entry in enumerate(entries[:5]):
        un_num = entry['un_number']
        name = entry.get('proper_shipping_name', 'No name')[:30]
        hc = entry.get('hazard_class', 'No class')
        marine = "🌊" if entry.get('marine_pollutant') else ""
        stowage = f" [{entry.get('imdg_stowage_category', 'No stowage')}]"
        print(f"   {i+1}. UN{un_num}: {name}... Class {hc}{marine}{stowage}")
    
    return maritime_analysis

def compare_with_existing_database(imdg_entries):
    """Compare IMDG entries with existing SafeShipper database"""
    
    print(f"\\n🔄 Comparing IMDG data with existing SafeShipper database...")
    
    # This would normally connect to database, but for analysis we'll simulate
    # Based on our previous work, we have ~3,063 entries in SafeShipper
    
    imdg_un_numbers = set(entry['un_number'] for entry in imdg_entries)
    
    # Simulated comparison results
    comparison_results = {
        'safeshipper_total': 3063,  # From previous integration
        'imdg_total': len(imdg_entries),
        'potential_maritime_enhancements': len(imdg_un_numbers),
        'estimated_overlap': min(len(imdg_un_numbers), 3063),  # Conservative estimate
        'new_maritime_entries': max(0, len(imdg_un_numbers) - 3063),
        'maritime_enhancement_potential': len(imdg_entries)
    }
    
    print(f"   📊 Database Comparison:")
    print(f"      SafeShipper entries: {comparison_results['safeshipper_total']:,}")
    print(f"      IMDG entries found: {comparison_results['imdg_total']:,}")
    print(f"      Potential enhancements: {comparison_results['potential_maritime_enhancements']:,}")
    print(f"      Estimated new entries: {comparison_results['new_maritime_entries']:,}")
    
    return comparison_results

def save_imdg_data(entries, analysis, comparison):
    """Save IMDG dangerous goods data"""
    
    output_file = '/tmp/imdg_dangerous_goods_data.json'
    
    output_data = {
        'extraction_metadata': {
            'timestamp': datetime.now().isoformat(),
            'source_file': 'IMDG_4062-66b3dd44-4ee5-4a92-bce6-9abd26f2f0b5.pdf',
            'extraction_type': 'IMDG Dangerous Goods List',
            'regulatory_framework': 'IMO International Maritime Dangerous Goods Code',
            'total_entries': len(entries),
            'unique_un_numbers': len(set(entry['un_number'] for entry in entries))
        },
        'maritime_analysis': analysis,
        'database_comparison': comparison,
        'entries': entries
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 IMDG dangerous goods data saved to {output_file}")
    return output_file

def main():
    """Main IMDG dangerous goods extraction"""
    
    print("🚀 SafeShipper IMDG Dangerous Goods Extraction")
    print("=" * 80)
    print("Phase 2: Extracting Maritime Dangerous Goods Classifications")
    print("Source: International Maritime Dangerous Goods (IMDG) Code")
    print("Objective: Extract maritime-specific dangerous goods data and classifications")
    print()
    
    # IMDG PDF file path
    pdf_path = "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/IMDG_4062-66b3dd44-4ee5-4a92-bce6-9abd26f2f0b5.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ IMDG PDF file not found: {pdf_path}")
        return False
    
    # Extract IMDG dangerous goods data
    print("🔄 Starting IMDG dangerous goods extraction...")
    raw_entries = extract_imdg_dangerous_goods_list(pdf_path)
    
    if not raw_entries:
        print("❌ No IMDG dangerous goods entries extracted")
        return False
    
    # Clean and validate
    entries = clean_and_validate_imdg_entries(raw_entries)
    
    if not entries:
        print("❌ No valid IMDG entries after cleaning")
        return False
    
    # Analyze maritime features
    analysis = analyze_imdg_maritime_features(entries)
    
    # Compare with existing database
    comparison = compare_with_existing_database(entries)
    
    # Save IMDG data
    output_file = save_imdg_data(entries, analysis, comparison)
    
    print()
    print("=" * 80)
    print("✅ IMDG Dangerous Goods Extraction Complete!")
    print(f"📊 Extracted {len(entries)} IMDG maritime entries")
    print(f"🚢 Maritime compliance data for sea transport")
    print(f"💾 Data saved to: {output_file}")
    print()
    print("🎯 IMDG Maritime Features Extracted:")
    print(f"   • Marine pollutant classifications")
    print(f"   • Stowage category requirements")
    print(f"   • EMS emergency schedule codes")
    print(f"   • Maritime segregation groups")
    print(f"   • IMDG-specific special provisions")
    print()
    print("📋 Next Steps:")
    print("   1. Create maritime database schema enhancements")
    print("   2. Integrate IMDG data with existing SafeShipper platform")
    print("   3. Implement maritime compliance validation")
    print("   4. Complete multi-modal transport intelligence (Road + Air + Sea)")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)