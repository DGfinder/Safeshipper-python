#!/usr/bin/env python3
"""
Parse UPS Chemical Table - ICAO/IATA Version for Global Air Transport Data
Advanced parser for structured dangerous goods air transport table
"""
import os
import sys
import json
import re
import PyPDF2
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

def extract_ups_icao_iata_table(pdf_path):
    """Extract UPS ICAO/IATA air transport table data"""
    
    print(f"🌍 Parsing UPS ICAO/IATA global air transport table: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"   Total pages: {total_pages}")
            
            all_entries = []
            
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                
                # Parse entries from this page
                page_entries = parse_ups_table_page(page_text, page_num + 1)
                all_entries.extend(page_entries)
                
                if (page_num + 1) % 10 == 0:
                    print(f"   Processed page {page_num + 1}/{total_pages}...")
            
            print(f"   ✅ Found {len(all_entries)} air transport entries")
            return all_entries
            
    except Exception as e:
        print(f"❌ Error extracting PDF: {str(e)}")
        return []

def parse_ups_table_page(page_text, page_num):
    """Parse UPS table entries from a single page"""
    
    entries = []
    lines = page_text.split('\n')
    
    # Skip header lines and find data rows
    for line in lines:
        line = line.strip()
        if not line or len(line) < 20:
            continue
            
        # Skip header rows
        if any(header in line.upper() for header in [
            'PROPER SHIPPING NAME', 'HAZARD CLASS', 'BASIC DESCRIPTION', 
            'UPS CHEMICAL TABLE', 'EFFECTIVE', 'PASSENGER AIRCRAFT'
        ]):
            continue
        
        # Look for lines with UN numbers (indicating dangerous goods entries)
        if 'UN' in line and re.search(r'UN\d{4}', line):
            entry = parse_ups_table_line(line, page_num)
            if entry:
                entries.append(entry)
    
    return entries

def parse_ups_table_line(line, page_num):
    """Parse a single line from UPS table"""
    
    try:
        # UPS table has a specific structure - let's parse it carefully
        entry = {
            'page_number': page_num,
            'raw_line': line,
            'source': 'ups_icao_iata_table'
        }
        
        # Extract UN number
        un_match = re.search(r'UN(\d{4})', line)
        if not un_match:
            return None
        
        entry['un_number'] = un_match.group(1)
        
        # Split line into parts (this is tricky with the format)
        parts = re.split(r'\s{2,}', line)  # Split on multiple spaces
        
        # Find the proper shipping name (usually at the beginning)
        name_part = line[:line.find('UN' + entry['un_number'])].strip()
        if name_part:
            entry['proper_shipping_name'] = name_part
        
        # Extract hazard class (pattern: number possibly with decimal and letter)
        class_match = re.search(r'\b([1-9](?:\.[1-9])?[A-Z]?)\b', line)
        if class_match:
            entry['hazard_class'] = class_match.group(1)
        
        # Extract packing group (Roman numerals)
        pg_patterns = [r'\bI{1,3}\b', r'\bPG\s*([I{1,3}])\b']
        for pattern in pg_patterns:
            pg_match = re.search(pattern, line)
            if pg_match:
                pg_text = pg_match.group(1) if pg_match.lastindex else pg_match.group(0)
                pg_map = {'I': '1', 'II': '2', 'III': '3'}
                entry['packing_group'] = pg_map.get(pg_text, pg_text)
                break
        
        # Look for air transport specific information
        air_indicators = {
            'forbidden': ['FORBIDDEN', 'PROHIBITED'],
            'flammable_liquid': ['FLAMMABLE LIQUID'],
            'corrosive': ['CORROSIVE'],
            'toxic': ['TOXIC'],
            'miscellaneous': ['MISCELLANEOUS'],
            'flammable_gas': ['FLAMMABLE GAS'],
            'passenger_aircraft': ['PAX', 'PASSENGER'],
            'cargo_aircraft': ['CAO', 'CARGO'],
        }
        
        line_upper = line.upper()
        for category, keywords in air_indicators.items():
            if any(keyword in line_upper for keyword in keywords):
                entry[f'air_{category}'] = True
        
        # Extract quantity limitations (look for patterns like "1 L", "5 kg", etc.)
        qty_patterns = [
            r'(\d+(?:\.\d+)?)\s*(L|KG|ML|G)\b',
            r'(\d+)\s*(LITER|KILOGRAM|GRAM|MILLILITER)'
        ]
        
        quantities = []
        for pattern in qty_patterns:
            qty_matches = re.findall(pattern, line_upper)
            quantities.extend([f"{qty} {unit}" for qty, unit in qty_matches])
        
        if quantities:
            entry['quantity_limits'] = quantities
        
        # Extract IATA packaging instructions
        iata_match = re.search(r'Y?\d{3}', line)
        if iata_match:
            entry['iata_packaging_instruction'] = iata_match.group(0)
        
        # Extract special provisions
        sp_match = re.search(r'A\d+', line)
        if sp_match:
            entry['special_provisions'] = sp_match.group(0)
        
        return entry
        
    except Exception as e:
        print(f"   ⚠️  Error parsing line: {str(e)[:50]}...")
        return None

def clean_and_validate_entries(entries):
    """Clean and validate extracted entries"""
    
    print(f"🧹 Cleaning and validating {len(entries)} entries...")
    
    valid_entries = []
    seen_un_numbers = set()
    
    for entry in entries:
        # Validate UN number
        un_num = entry.get('un_number')
        if not un_num or not re.match(r'^\d{4}$', un_num):
            continue
        
        # Handle duplicates by enhancing existing entry
        if un_num in seen_un_numbers:
            # Find existing entry and merge data
            existing = next((e for e in valid_entries if e['un_number'] == un_num), None)
            if existing:
                # Merge data (keep non-null values)
                for key, value in entry.items():
                    if value and not existing.get(key):
                        existing[key] = value
            continue
        
        seen_un_numbers.add(un_num)
        valid_entries.append(entry)
    
    print(f"   ✅ Validated {len(valid_entries)} unique entries")
    return valid_entries

def analyze_air_transport_data(entries):
    """Analyze extracted air transport data"""
    
    print("\n📊 Analyzing global air transport data...")
    
    total_entries = len(entries)
    
    # Category analysis
    categories = {
        'with_packing_group': len([e for e in entries if 'packing_group' in e]),
        'with_hazard_class': len([e for e in entries if 'hazard_class' in e]),
        'forbidden_items': len([e for e in entries if e.get('air_forbidden')]),
        'flammable_liquids': len([e for e in entries if e.get('air_flammable_liquid')]),
        'corrosive_items': len([e for e in entries if e.get('air_corrosive')]),
        'toxic_items': len([e for e in entries if e.get('air_toxic')]),
        'with_quantity_limits': len([e for e in entries if 'quantity_limits' in e]),
        'with_iata_packaging': len([e for e in entries if 'iata_packaging_instruction' in e]),
        'with_special_provisions': len([e for e in entries if 'special_provisions' in e])
    }
    
    print(f"   Total entries: {total_entries}")
    print(f"\n📋 Data completeness:")
    for category, count in categories.items():
        percentage = (count / total_entries * 100) if total_entries > 0 else 0
        print(f"   {category.replace('_', ' ').title()}: {count} ({percentage:.1f}%)")
    
    # Packing group distribution
    pg_dist = {}
    for entry in entries:
        pg = entry.get('packing_group', 'None')
        pg_dist[pg] = pg_dist.get(pg, 0) + 1
    
    print(f"\n🏷️  Packing Group Distribution:")
    for pg, count in sorted(pg_dist.items()):
        percentage = (count / total_entries * 100) if total_entries > 0 else 0
        print(f"   PG {pg}: {count} ({percentage:.1f}%)")
    
    # Show sample entries
    print(f"\n🔍 Sample entries:")
    for i, entry in enumerate(entries[:10]):
        un_num = entry['un_number']
        name = entry.get('proper_shipping_name', 'No name')[:30]
        pg = entry.get('packing_group', 'N/A')
        hc = entry.get('hazard_class', 'N/A')
        forbidden = ' [FORBIDDEN]' if entry.get('air_forbidden') else ''
        print(f"   {i+1}. UN{un_num}: {name}... | PG: {pg} | Class: {hc}{forbidden}")
    
    return categories

def save_air_transport_data(entries, analysis):
    """Save extracted air transport data to JSON"""
    
    output_file = '/tmp/ups_icao_iata_air_transport_data.json'
    
    output_data = {
        'extraction_metadata': {
            'timestamp': datetime.now().isoformat(),
            'total_entries': len(entries),
            'unique_un_numbers': len(set(entry['un_number'] for entry in entries)),
            'source_file': 'accepted-table-us-en.pdf',
            'table_type': 'UPS ICAO/IATA Global Air Transport',
            'coverage': 'International Air Packages (US, Europe, Asia, Canada)',
            'analysis': analysis
        },
        'entries': entries
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Air transport data saved to {output_file}")
    return output_file

def main():
    """Main extraction and parsing process"""
    
    print("🚀 SafeShipper UPS ICAO/IATA Global Air Transport Parser")
    print("=" * 80)
    print("Phase 1: Parsing Global Air Transport Dangerous Goods Table")
    print("Source: UPS Chemical Table - ICAO/IATA Version (International Air)")
    print("Coverage: Air shipments to/from US, Europe, Asia, Canada")
    print()
    
    # PDF file path
    pdf_path = "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/accepted-table-us-en.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    # Extract data
    print("🔄 Starting extraction...")
    raw_entries = extract_ups_icao_iata_table(pdf_path)
    
    if not raw_entries:
        print("❌ No entries extracted")
        return False
    
    # Clean and validate
    entries = clean_and_validate_entries(raw_entries)
    
    if not entries:
        print("❌ No valid entries after cleaning")
        return False
    
    # Analyze data
    analysis = analyze_air_transport_data(entries)
    
    # Save data
    output_file = save_air_transport_data(entries, analysis)
    
    print()
    print("=" * 80)
    print("✅ Global Air Transport Data Extraction Complete!")
    print(f"📊 Extracted {len(entries)} validated air transport entries")
    print(f"🌍 Covering international air shipments (US, Europe, Asia, Canada)")
    print(f"💾 Data saved to: {output_file}")
    print()
    print("🎯 Key Data Points Extracted:")
    print(f"   • UN numbers with air transport classifications")
    print(f"   • ICAO/IATA packing groups and hazard classes")
    print(f"   • Passenger vs cargo aircraft restrictions")
    print(f"   • Quantity limitations for air transport")
    print(f"   • IATA packaging instructions")
    print(f"   • Special provisions and restrictions")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)