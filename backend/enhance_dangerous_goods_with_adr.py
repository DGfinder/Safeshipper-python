#!/usr/bin/env python3
"""
Enhance dangerous goods database with comprehensive ADR 2025 data
Phase 2: Parse extracted ADR data and integrate with existing entries
"""
import os
import sys
import csv
import json
import re
import psycopg2
from datetime import datetime
import PyPDF2

# Database connection parameters
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'safeshipper'
DB_USER = 'safeshipper'
DB_PASSWORD = 'admin'

def extract_adr_chapter_3_2(pdf_path):
    """Extract Chapter 3.2 dangerous goods list from ADR PDF"""
    
    print(f"📖 Extracting ADR data from: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"   Total pages: {total_pages}")
            
            # Search for Chapter 3.2 content (ADR dangerous goods table)
            start_page = None
            
            # Look for Chapter 3.2 starting around page 50-200
            for page_num in range(50, min(300, total_pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                # Look for the dangerous goods table structure
                if ("3.2" in text and 
                    ("UN No" in text or "UN number" in text or "Name and description" in text) and
                    ("Class" in text or "Hazard" in text)):
                    start_page = page_num
                    print(f"   Found Chapter 3.2 at page {page_num + 1}")
                    break
            
            if start_page is None:
                print("   ⚠️  Could not locate Chapter 3.2, using estimated range")
                start_page = 100  # Reasonable guess
            
            # Extract dangerous goods table data
            extracted_entries = []
            pages_to_extract = min(200, total_pages - start_page)
            
            print(f"   Extracting from pages {start_page + 1} to {start_page + pages_to_extract}")
            
            for page_num in range(start_page, start_page + pages_to_extract):
                if page_num >= total_pages:
                    break
                    
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                
                # Stop if we've reached the next chapter
                if "3.3" in page_text and ("Special provisions" in page_text or "Exemptions" in page_text):
                    print(f"   Reached end of Chapter 3.2 at page {page_num + 1}")
                    break
                
                # Parse dangerous goods entries from this page
                entries = parse_adr_entries_from_page(page_text)
                extracted_entries.extend(entries)
                
                if len(extracted_entries) % 50 == 0 and len(extracted_entries) > 0:
                    print(f"   Extracted {len(extracted_entries)} entries so far...")
            
            print(f"✅ Extracted {len(extracted_entries)} ADR entries total")
            return extracted_entries
            
    except Exception as e:
        print(f"❌ Error reading PDF: {str(e)}")
        return []

def parse_adr_entries_from_page(page_text):
    """Parse dangerous goods entries from a single page of ADR text"""
    
    entries = []
    lines = page_text.split('\n')
    
    # Pattern to match UN numbers
    un_pattern = r'(?:^|\s)(UN\s*)?(\d{4})(?:\s|$)'
    
    current_entry = None
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue
        
        # Look for UN number at start of line (typical ADR table format)
        un_match = re.match(r'^(\d{4})\s+(.+)', line)
        if un_match:
            # Save previous entry
            if current_entry:
                entries.append(current_entry)
            
            # Start new entry
            un_number = un_match.group(1)
            description = un_match.group(2)
            
            current_entry = {
                'un_number': un_number,
                'description': description,
                'raw_line': line
            }
            
            # Try to parse additional data from the line
            parse_adr_line_data(current_entry, line)
            
        elif current_entry and not re.match(r'^\d', line):
            # Continue previous entry (multi-line descriptions)
            current_entry['description'] += ' ' + line
            current_entry['raw_line'] += ' ' + line
    
    # Add final entry
    if current_entry:
        entries.append(current_entry)
    
    return entries

def parse_adr_line_data(entry, line):
    """Extract additional data from ADR table line"""
    
    # Split line into potential columns
    parts = re.split(r'\s{2,}', line)  # Split on multiple spaces
    
    if len(parts) >= 3:
        # Typical ADR format: UN | Name | Class | PG | SP | ...
        
        # Extract hazard class (usually 3rd or 4th column)
        for part in parts[2:5]:
            if re.match(r'^[1-9](\.[1-9])?$', part.strip()):
                entry['hazard_class'] = part.strip()
                break
        
        # Extract packing group (Roman numerals or "I", "II", "III")
        for part in parts:
            if re.match(r'^(I{1,3}|[123])$', part.strip()):
                pg_map = {'I': '1', 'II': '2', 'III': '3'}
                entry['packing_group'] = pg_map.get(part.strip(), part.strip())
                break
        
        # Extract special provisions (usually numeric codes)
        sp_codes = []
        for part in parts:
            # Look for special provision codes (numbers like 274, 367, etc.)
            if re.match(r'^\d{2,3}$', part.strip()):
                sp_codes.append(part.strip())
        
        if sp_codes:
            entry['special_provisions'] = ', '.join(sp_codes)

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

def get_current_dangerous_goods():
    """Get current dangerous goods from database"""
    
    conn = connect_to_database()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        
        query = """
        SELECT un_number, proper_shipping_name, hazard_class, 
               packing_group, special_provisions, description_notes
        FROM dangerous_goods_dangerousgood
        ORDER BY un_number
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Create lookup dictionary
        current_goods = {}
        for row in rows:
            un_num = row[0]
            current_goods[un_num] = {
                'proper_shipping_name': row[1],
                'hazard_class': row[2],
                'packing_group': row[3],
                'special_provisions': row[4],
                'description_notes': row[5]
            }
        
        print(f"📊 Found {len(current_goods)} existing dangerous goods in database")
        
        cursor.close()
        conn.close()
        
        return current_goods
        
    except Exception as e:
        print(f"❌ Error reading database: {str(e)}")
        return {}

def enhance_database_with_adr(adr_entries, current_goods):
    """Enhance database entries with ADR data"""
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        enhanced_count = 0
        new_entries_count = 0
        
        for adr_entry in adr_entries:
            un_number = adr_entry['un_number']
            
            if un_number in current_goods:
                # Enhance existing entry
                updates = []
                values = []
                
                # Update packing group if we have better data
                if adr_entry.get('packing_group') and not current_goods[un_number].get('packing_group'):
                    updates.append("packing_group = %s")
                    values.append(adr_entry['packing_group'])
                
                # Update special provisions
                if adr_entry.get('special_provisions'):
                    current_sp = current_goods[un_number].get('special_provisions') or ''
                    new_sp = adr_entry['special_provisions']
                    
                    # Merge special provisions
                    if current_sp and new_sp not in current_sp:
                        combined_sp = f"{current_sp}, {new_sp}"
                    else:
                        combined_sp = new_sp
                    
                    updates.append("special_provisions = %s")
                    values.append(combined_sp)
                
                # Update description notes with ADR reference
                current_notes = current_goods[un_number].get('description_notes') or ''
                adr_note = f"ADR 2025: {adr_entry.get('description', '')[:100]}"
                
                if adr_note not in current_notes:
                    new_notes = f"{current_notes}\n{adr_note}".strip()
                    updates.append("description_notes = %s")
                    values.append(new_notes)
                
                # Update timestamp
                updates.append("updated_at = %s")
                values.append(datetime.now())
                
                if updates:
                    values.append(un_number)
                    
                    update_query = f"""
                    UPDATE dangerous_goods_dangerousgood 
                    SET {', '.join(updates)}
                    WHERE un_number = %s
                    """
                    
                    cursor.execute(update_query, values)
                    enhanced_count += 1
            
            else:
                # Create new entry from ADR data
                insert_query = """
                INSERT INTO dangerous_goods_dangerousgood (
                    un_number, proper_shipping_name, hazard_class,
                    packing_group, special_provisions, description_notes,
                    created_at, updated_at, is_bulk_transport_allowed,
                    is_fire_risk, physical_form
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                """
                
                # Extract proper shipping name from description
                description = adr_entry.get('description', '')
                proper_name = description.split(',')[0].strip() if ',' in description else description
                
                cursor.execute(insert_query, (
                    un_number,
                    proper_name[:255],  # Limit length
                    adr_entry.get('hazard_class'),
                    adr_entry.get('packing_group'),
                    adr_entry.get('special_provisions'),
                    f"ADR 2025: {description}"[:500],  # Limit length
                    datetime.now(),
                    datetime.now(),
                    False,  # Default values
                    False,
                    'UNKNOWN'
                ))
                
                new_entries_count += 1
            
            # Commit every 50 entries
            if (enhanced_count + new_entries_count) % 50 == 0:
                conn.commit()
                print(f"   Processed {enhanced_count + new_entries_count} entries...")
        
        # Final commit
        conn.commit()
        
        print(f"✅ Enhancement completed!")
        print(f"   Enhanced existing entries: {enhanced_count}")
        print(f"   Added new entries: {new_entries_count}")
        
        # Final count
        cursor.execute("SELECT COUNT(*) FROM dangerous_goods_dangerousgood")
        total_count = cursor.fetchone()[0]
        print(f"   Total dangerous goods in database: {total_count}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Enhancement error: {str(e)}")
        conn.rollback()
        return False

def main():
    """Main enhancement process"""
    
    print("🚀 Starting SafeShipper Dangerous Goods ADR Enhancement")
    print("=" * 60)
    
    # Find ADR PDF files
    pdf_files = [
        "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/2412010_E_ECE_TRANS_352_Vol.II_WEB.pdf",
        "/tmp/ADR_Vol_II.pdf"
    ]
    
    adr_pdf = None
    for pdf_file in pdf_files:
        if os.path.exists(pdf_file):
            adr_pdf = pdf_file
            break
    
    if not adr_pdf:
        print("❌ ADR PDF file not found. Please ensure ADR Volume II is available.")
        return False
    
    # Step 1: Extract ADR data
    print("\n📖 Phase 1: Extracting ADR 2025 data...")
    adr_entries = extract_adr_chapter_3_2(adr_pdf)
    
    if not adr_entries:
        print("❌ No ADR entries extracted")
        return False
    
    # Save ADR data for analysis
    with open('/tmp/adr_extracted_entries.json', 'w') as f:
        json.dump(adr_entries, f, indent=2)
    print(f"💾 Saved ADR data to /tmp/adr_extracted_entries.json")
    
    # Step 2: Get current database state
    print("\n📊 Phase 2: Reading current database...")
    current_goods = get_current_dangerous_goods()
    
    # Step 3: Enhance database
    print("\n🔧 Phase 3: Enhancing database with ADR data...")
    
    if enhance_database_with_adr(adr_entries, current_goods):
        print("\n🎉 ADR Enhancement completed successfully!")
        print("\nDatabase now contains comprehensive ADR 2025 regulatory data")
        return True
    else:
        print("\n💥 Enhancement failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)