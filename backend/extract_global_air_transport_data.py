#!/usr/bin/env python3
"""
Extract Global Air Transport Data from accepted-table-us-en.pdf
Phase 1: Global Multi-Modal Dangerous Goods Database Transformation
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

def extract_global_air_transport_pdf(pdf_path):
    """Extract global air transport data from accepted-table PDF"""
    
    print(f"🌍 Extracting global air transport data from: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"   Total pages: {total_pages}")
            
            extracted_text = ""
            air_transport_entries = []
            
            print(f"   Extracting text from all {total_pages} pages...")
            
            # Extract text from all pages to capture complete global data
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                extracted_text += f"\n--- PAGE {page_num + 1} ---\n{page_text}\n"
                
                # Parse entries from this page
                page_entries = parse_air_transport_entries_from_page(page_text, page_num + 1)
                air_transport_entries.extend(page_entries)
                
                if (page_num + 1) % 10 == 0:
                    print(f"   Processed page {page_num + 1}/{total_pages}...")
            
            # Save extracted text for analysis
            text_file = '/tmp/global_air_transport_extracted.txt'
            with open(text_file, 'w', encoding='utf-8') as f:
                f.write(extracted_text)
            
            print(f"   ✅ Extracted text saved to {text_file}")
            print(f"   ✅ Found {len(air_transport_entries)} air transport entries")
            
            return air_transport_entries, extracted_text
            
    except Exception as e:
        print(f"❌ Error extracting PDF: {str(e)}")
        return [], ""

def parse_air_transport_entries_from_page(page_text, page_num):
    """Parse air transport dangerous goods entries from a single page"""
    
    entries = []
    lines = page_text.split('\n')
    
    # Patterns to match dangerous goods entries
    un_pattern = r'(?:^|\s)(UN\s*)?(\d{4})(?:\s|$)'
    
    # Look for table-like structures with UN numbers
    for i, line in enumerate(lines):
        line = line.strip()
        if not line or len(line) < 10:
            continue
        
        # Look for UN numbers at start of line (typical table format)
        un_match = re.match(r'^(UN\s*)?(\d{4})\s+(.+)', line)
        if un_match:
            un_number = un_match.group(2)
            description_part = un_match.group(3)
            
            # Try to parse additional data from the line
            entry = {
                'un_number': un_number,
                'page_number': page_num,
                'raw_line': line,
                'description': description_part,
                'source': 'global_air_transport_table'
            }
            
            # Parse additional fields from the line
            parse_air_transport_line_data(entry, line, lines, i)
            
            entries.append(entry)
    
    return entries

def parse_air_transport_line_data(entry, line, all_lines, line_index):
    """Extract additional air transport data from the line"""
    
    line_upper = line.upper()
    
    # Parse packing group (Roman numerals or numbers)
    pg_match = re.search(r'\b(I{1,3}|[123])\b', line)
    if pg_match:
        pg_map = {'I': '1', 'II': '2', 'III': '3'}
        entry['air_packing_group'] = pg_map.get(pg_match.group(1), pg_match.group(1))
    
    # Parse hazard class
    class_match = re.search(r'\b([1-9](?:\.[1-9])?[A-Z]?)\b', line)
    if class_match:
        entry['air_hazard_class'] = class_match.group(1)
    
    # Look for air transport specific indicators
    air_indicators = {
        'passenger_aircraft': ['PASSENGER', 'PAX', 'PASS'],
        'cargo_aircraft': ['CARGO', 'CAO', 'FREIGHT'],
        'forbidden': ['FORBIDDEN', 'PROHIBITED', 'NOT PERMITTED'],
        'restricted': ['RESTRICTED', 'LIMITATION', 'LIMIT']
    }
    
    for category, keywords in air_indicators.items():
        if any(keyword in line_upper for keyword in keywords):
            entry[f'air_{category}'] = True
    
    # Look for quantity limitations
    qty_match = re.search(r'(\d+(?:\.\d+)?)\s*(KG|L|ML|G)', line_upper)
    if qty_match:
        entry['air_quantity_limit'] = f"{qty_match.group(1)} {qty_match.group(2)}"
    
    # Look for regional/continental indicators
    regions = {
        'us_domestic': ['US DOMESTIC', 'WITHIN US', 'CONTINENTAL US'],
        'us_international': ['US INTERNATIONAL', 'FROM US', 'TO US'],
        'europe': ['EUROPE', 'EUROPEAN', 'EU'],
        'asia': ['ASIA', 'ASIAN', 'PACIFIC'],
        'canada': ['CANADA', 'CANADIAN']
    }
    
    for region, keywords in regions.items():
        if any(keyword in line_upper for keyword in keywords):
            entry[f'air_{region}_applicable'] = True
    
    # Look for special provisions or notes
    sp_match = re.search(r'SP\s*(\d+)', line_upper)
    if sp_match:
        entry['air_special_provisions'] = sp_match.group(1)

def analyze_extracted_entries(entries):
    """Analyze extracted air transport entries"""
    
    print("\n📊 Analyzing extracted air transport data...")
    
    # Statistics
    total_entries = len(entries)
    unique_un_numbers = len(set(entry['un_number'] for entry in entries))
    
    print(f"   Total entries found: {total_entries}")
    print(f"   Unique UN numbers: {unique_un_numbers}")
    
    # Analyze by categories
    categories = {
        'with_packing_group': len([e for e in entries if 'air_packing_group' in e]),
        'with_hazard_class': len([e for e in entries if 'air_hazard_class' in e]),
        'passenger_aircraft': len([e for e in entries if e.get('air_passenger_aircraft')]),
        'cargo_aircraft': len([e for e in entries if e.get('air_cargo_aircraft')]),
        'forbidden': len([e for e in entries if e.get('air_forbidden')]),
        'with_quantity_limits': len([e for e in entries if 'air_quantity_limit' in e])
    }
    
    print(f"\n📋 Category breakdown:")
    for category, count in categories.items():
        percentage = (count / total_entries * 100) if total_entries > 0 else 0
        print(f"   {category.replace('_', ' ').title()}: {count} ({percentage:.1f}%)")
    
    # Show sample entries
    print(f"\n🔍 Sample entries:")
    for i, entry in enumerate(entries[:10]):
        un_num = entry['un_number']
        desc = entry.get('description', 'No description')[:40]
        pg = entry.get('air_packing_group', 'N/A')
        hc = entry.get('air_hazard_class', 'N/A')
        print(f"   {i+1}. UN{un_num}: {desc}... | PG: {pg} | Class: {hc}")
    
    return categories

def save_extracted_data(entries, analysis):
    """Save extracted data to JSON for further processing"""
    
    output_file = '/tmp/global_air_transport_entries.json'
    
    output_data = {
        'extraction_metadata': {
            'timestamp': datetime.now().isoformat(),
            'total_entries': len(entries),
            'unique_un_numbers': len(set(entry['un_number'] for entry in entries)),
            'source_file': 'accepted-table-us-en.pdf',
            'analysis': analysis
        },
        'entries': entries
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Extracted data saved to {output_file}")
    
    return output_file

def main():
    """Main extraction process"""
    
    print("🚀 SafeShipper Global Air Transport Data Extraction")
    print("=" * 70)
    print("Phase 1: Extracting Global Air Transport Dangerous Goods Data")
    print("Source: Global air transport acceptance table (US, Europe, Asia, Canada)")
    print()
    
    # PDF file path
    pdf_path = "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/accepted-table-us-en.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    # Extract data
    print("🔄 Starting extraction...")
    entries, extracted_text = extract_global_air_transport_pdf(pdf_path)
    
    if not entries:
        print("❌ No entries extracted")
        return False
    
    # Analyze data
    analysis = analyze_extracted_entries(entries)
    
    # Save data
    output_file = save_extracted_data(entries, analysis)
    
    print()
    print("=" * 70)
    print("✅ Global Air Transport Data Extraction Complete!")
    print(f"📊 Extracted {len(entries)} air transport entries")
    print(f"🌍 Ready for global multi-modal database integration")
    print(f"💾 Data saved to: {output_file}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)