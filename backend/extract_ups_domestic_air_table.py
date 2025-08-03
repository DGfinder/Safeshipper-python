#!/usr/bin/env python3
"""
Extract UPS Air Domestic Table - Detailed Operational Restrictions
Phase 1B: UPS-specific air transport operational intelligence
"""
import os
import sys
import json
import re
import PyPDF2
from datetime import datetime

def extract_ups_domestic_air_table(pdf_path):
    """Extract UPS domestic air operational data"""
    
    print(f"🚛✈️ Extracting UPS domestic air operational data: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"   Total pages: {total_pages}")
            
            all_entries = []
            
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                
                # Parse UPS operational entries from this page
                page_entries = parse_ups_domestic_page(page_text, page_num + 1)
                all_entries.extend(page_entries)
                
                if (page_num + 1) % 20 == 0:
                    print(f"   Processed page {page_num + 1}/{total_pages}...")
            
            print(f"   ✅ Found {len(all_entries)} UPS operational entries")
            return all_entries
            
    except Exception as e:
        print(f"❌ Error extracting UPS domestic table: {str(e)}")
        return []

def parse_ups_domestic_page(page_text, page_num):
    """Parse UPS domestic operational entries from a single page"""
    
    entries = []
    lines = page_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 15:
            continue
            
        # Skip header rows
        if any(header in line.upper() for header in [
            'PROPER SHIPPING NAME', 'HAZARD CLASS', 'UPS DOMESTIC',
            'GROUND SERVICE', 'AIR SERVICE', 'EFFECTIVE DATE'
        ]):
            continue
        
        # Look for lines with UN numbers indicating dangerous goods entries
        if 'UN' in line and re.search(r'UN\d{4}', line):
            entry = parse_ups_domestic_line(line, page_num)
            if entry:
                entries.append(entry)
    
    return entries

def parse_ups_domestic_line(line, page_num):
    """Parse a single UPS domestic operational line"""
    
    try:
        entry = {
            'page_number': page_num,
            'raw_line': line,
            'source': 'ups_domestic_air_table'
        }
        
        # Extract UN number
        un_match = re.search(r'UN(\d{4})', line)
        if not un_match:
            return None
        
        entry['un_number'] = un_match.group(1)
        
        # Extract proper shipping name (before UN number)
        name_part = line[:line.find('UN' + entry['un_number'])].strip()
        if name_part:
            entry['proper_shipping_name'] = name_part
        
        # Extract hazard class
        class_match = re.search(r'\b([1-9](?:\.[1-9])?[A-Z]?)\b', line)
        if class_match:
            entry['hazard_class'] = class_match.group(1)
        
        # Extract packing group
        pg_patterns = [r'\bI{1,3}\b', r'\bPG\s*([I{1,3}])\b']
        for pattern in pg_patterns:
            pg_match = re.search(pattern, line)
            if pg_match:
                pg_text = pg_match.group(1) if pg_match.lastindex else pg_match.group(0)
                pg_map = {'I': '1', 'II': '2', 'III': '3'}
                entry['packing_group'] = pg_map.get(pg_text, pg_text)
                break
        
        # UPS service-specific analysis
        line_upper = line.upper()
        
        # UPS service types
        service_indicators = {
            'ground': ['GROUND', 'UPS GROUND', 'SURFACE'],
            'next_day_air': ['NEXT DAY AIR', 'NDA', 'OVERNIGHT'],
            'two_day_air': ['2ND DAY AIR', '2 DAY AIR', 'TWO DAY'],
            'three_day_select': ['3 DAY SELECT', 'THREE DAY'],
            'air_services': ['AIR SERVICE', 'AIR ONLY']
        }
        
        for service, keywords in service_indicators.items():
            if any(keyword in line_upper for keyword in keywords):
                entry[f'ups_{service}_available'] = True
        
        # UPS operational restrictions
        restriction_indicators = {
            'restricted': ['RESTRICTED', 'LIMITATION', 'NOT ACCEPTED'],
            'forbidden': ['FORBIDDEN', 'PROHIBITED', 'NOT PERMITTED'],
            'contract_required': ['CONTRACT REQUIRED', 'AGREEMENT REQUIRED'],
            'limited_quantity': ['LIMITED QUANTITY', 'LTD QTY'],
            'special_handling': ['SPECIAL HANDLING', 'SPECIAL REQUIREMENTS'],
            'temperature_controlled': ['TEMPERATURE CONTROLLED', 'TEMP CONTROL'],
            'hazmat_contract': ['HAZMAT CONTRACT', 'DG CONTRACT']
        }
        
        for restriction, keywords in restriction_indicators.items():
            if any(keyword in line_upper for keyword in keywords):
                entry[f'ups_{restriction}'] = True
        
        # Extract quantity limitations
        qty_patterns = [
            r'(\d+(?:\.\d+)?)\s*(L|KG|ML|G|LB|OZ)\b',
            r'(\d+)\s*(LITER|KILOGRAM|GRAM|POUND|OUNCE)'
        ]
        
        quantities = []
        for pattern in qty_patterns:
            qty_matches = re.findall(pattern, line_upper)
            quantities.extend([f"{qty} {unit}" for qty, unit in qty_matches])
        
        if quantities:
            entry['ups_quantity_limits'] = quantities
        
        # Extract packaging requirements
        pkg_indicators = ['PACKAGE', 'PACKAGING', 'CONTAINER', 'RECEPTACLE']
        if any(indicator in line_upper for indicator in pkg_indicators):
            entry['ups_packaging_requirements'] = True
        
        # Extract special provisions
        sp_patterns = [r'SP\s*(\d+)', r'A\d+', r'N\d+']
        special_provisions = []
        for pattern in sp_patterns:
            sp_matches = re.findall(pattern, line)
            special_provisions.extend(sp_matches)
        
        if special_provisions:
            entry['ups_special_provisions'] = special_provisions
        
        return entry
        
    except Exception as e:
        print(f"   ⚠️  Error parsing UPS line: {str(e)[:50]}...")
        return None

def clean_and_validate_ups_entries(entries):
    """Clean and validate UPS operational entries"""
    
    print(f"🧹 Cleaning and validating {len(entries)} UPS entries...")
    
    valid_entries = []
    seen_un_numbers = set()
    
    for entry in entries:
        # Validate UN number
        un_num = entry.get('un_number')
        if not un_num or not re.match(r'^\d{4}$', un_num):
            continue
        
        # Handle duplicates by merging operational data
        if un_num in seen_un_numbers:
            existing = next((e for e in valid_entries if e['un_number'] == un_num), None)
            if existing:
                # Merge UPS operational data
                for key, value in entry.items():
                    if value and not existing.get(key):
                        existing[key] = value
            continue
        
        seen_un_numbers.add(un_num)
        valid_entries.append(entry)
    
    print(f"   ✅ Validated {len(valid_entries)} unique UPS operational entries")
    return valid_entries

def analyze_ups_operational_data(entries):
    """Analyze UPS operational restrictions and capabilities"""
    
    print("\n📊 Analyzing UPS operational intelligence...")
    
    total_entries = len(entries)
    
    # Service availability analysis
    service_analysis = {
        'ground_available': len([e for e in entries if e.get('ups_ground_available')]),
        'next_day_air_available': len([e for e in entries if e.get('ups_next_day_air_available')]),
        'two_day_air_available': len([e for e in entries if e.get('ups_two_day_air_available')]),
        'air_services_available': len([e for e in entries if e.get('ups_air_services_available')])
    }
    
    # Restriction analysis
    restriction_analysis = {
        'restricted_items': len([e for e in entries if e.get('ups_restricted')]),
        'forbidden_items': len([e for e in entries if e.get('ups_forbidden')]),
        'contract_required': len([e for e in entries if e.get('ups_contract_required')]),
        'special_handling': len([e for e in entries if e.get('ups_special_handling')]),
        'temperature_controlled': len([e for e in entries if e.get('ups_temperature_controlled')]),
        'with_quantity_limits': len([e for e in entries if 'ups_quantity_limits' in e]),
        'packaging_requirements': len([e for e in entries if e.get('ups_packaging_requirements')])
    }
    
    print(f"   Total UPS operational entries: {total_entries}")
    
    print(f"\n🚛 UPS Service Availability:")
    for service, count in service_analysis.items():
        percentage = (count / total_entries * 100) if total_entries > 0 else 0
        print(f"   {service.replace('_', ' ').title()}: {count} ({percentage:.1f}%)")
    
    print(f"\n🚫 UPS Operational Restrictions:")
    for restriction, count in restriction_analysis.items():
        percentage = (count / total_entries * 100) if total_entries > 0 else 0
        print(f"   {restriction.replace('_', ' ').title()}: {count} ({percentage:.1f}%)")
    
    # Show sample operational entries
    print(f"\n🔍 Sample UPS operational entries:")
    for i, entry in enumerate(entries[:8]):
        un_num = entry['un_number']
        name = entry.get('proper_shipping_name', 'No name')[:25]
        restrictions = []
        if entry.get('ups_forbidden'):
            restrictions.append('FORBIDDEN')
        if entry.get('ups_restricted'):
            restrictions.append('RESTRICTED')
        if entry.get('ups_contract_required'):
            restrictions.append('CONTRACT REQ')
        
        restriction_text = f" [{', '.join(restrictions)}]" if restrictions else ""
        print(f"   {i+1}. UN{un_num}: {name}...{restriction_text}")
    
    return {**service_analysis, **restriction_analysis}

def save_ups_operational_data(entries, analysis):
    """Save UPS operational data to JSON"""
    
    output_file = '/tmp/ups_domestic_air_operational_data.json'
    
    output_data = {
        'extraction_metadata': {
            'timestamp': datetime.now().isoformat(),
            'total_entries': len(entries),
            'unique_un_numbers': len(set(entry['un_number'] for entry in entries)),
            'source_file': 'ups-air-domestic-table-us-en.pdf',
            'table_type': 'UPS Domestic Air Operational Restrictions',
            'coverage': 'UPS-specific service availability and operational restrictions',
            'analysis': analysis
        },
        'entries': entries
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 UPS operational data saved to {output_file}")
    return output_file

def main():
    """Main UPS operational data extraction"""
    
    print("🚀 SafeShipper UPS Domestic Air Operational Intelligence")
    print("=" * 80)
    print("Phase 1B: Extracting UPS-Specific Air Transport Operational Data")
    print("Source: UPS Air Domestic Table (US Domestic Air Services)")
    print("Focus: Service availability, restrictions, and operational requirements")
    print()
    
    # PDF file path
    pdf_path = "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/ups-air-domestic-table-us-en.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    # Extract UPS operational data
    print("🔄 Starting UPS operational extraction...")
    raw_entries = extract_ups_domestic_air_table(pdf_path)
    
    if not raw_entries:
        print("❌ No UPS operational entries extracted")
        return False
    
    # Clean and validate
    entries = clean_and_validate_ups_entries(raw_entries)
    
    if not entries:
        print("❌ No valid UPS entries after cleaning")
        return False
    
    # Analyze operational intelligence
    analysis = analyze_ups_operational_data(entries)
    
    # Save operational data
    output_file = save_ups_operational_data(entries, analysis)
    
    print()
    print("=" * 80)
    print("✅ UPS Operational Intelligence Extraction Complete!")
    print(f"📊 Extracted {len(entries)} UPS operational entries")
    print(f"🚛 Covering UPS domestic air service capabilities and restrictions")
    print(f"💾 Data saved to: {output_file}")
    print()
    print("🎯 UPS Operational Intelligence Extracted:")
    print(f"   • Service availability (Ground, Next Day Air, 2nd Day Air)")
    print(f"   • Operational restrictions and limitations")
    print(f"   • Contract requirements and special handling")
    print(f"   • Quantity limits and packaging requirements")
    print(f"   • Temperature control and special provisions")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)