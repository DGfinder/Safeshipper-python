#!/usr/bin/env python3
"""
Extract dangerous goods data from ADR 2025 PDF documents
"""
import pypdf as PyPDF2
import re
import csv
import sys

def extract_adr_chapter_3_2(pdf_path):
    """Extract Chapter 3.2 dangerous goods list from ADR PDF"""
    
    print(f"Opening ADR document: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"Total pages in PDF: {total_pages}")
            
            # Find Chapter 3.2 pages (usually around page 100-300 in ADR Vol II)
            chapter_3_2_found = False
            start_page = None
            end_page = None
            
            # Search for Chapter 3.2
            for page_num in range(min(50, total_pages)):  # Search first 50 pages for TOC
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                if "3.2" in text and ("Dangerous goods list" in text or "dangerous goods" in text.lower()):
                    print(f"Found Chapter 3.2 reference on page {page_num + 1}")
                    # Extract page number reference
                    lines = text.split('\n')
                    for line in lines:
                        if "3.2" in line and any(char.isdigit() for char in line):
                            # Look for page numbers
                            numbers = re.findall(r'\b\d{2,4}\b', line)
                            if numbers:
                                start_page = int(numbers[-1]) - 1  # Convert to 0-based indexing
                                print(f"Chapter 3.2 likely starts at page {start_page + 1}")
                                break
                    break
            
            # If we couldn't find it in TOC, search content directly
            if start_page is None:
                print("Searching for Chapter 3.2 content directly...")
                for page_num in range(50, min(400, total_pages)):
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    
                    if "3.2" in text and ("UN" in text or "Name and description" in text):
                        start_page = page_num
                        print(f"Found Chapter 3.2 content starting at page {page_num + 1}")
                        break
            
            if start_page is None:
                print("Could not locate Chapter 3.2. Extracting sample pages...")
                start_page = 100  # Reasonable guess for ADR structure
            
            # Extract text from likely Chapter 3.2 pages
            extracted_text = ""
            pages_to_extract = min(100, total_pages - start_page)  # Extract up to 100 pages
            
            print(f"Extracting text from pages {start_page + 1} to {start_page + pages_to_extract}...")
            
            for page_num in range(start_page, start_page + pages_to_extract):
                if page_num < total_pages:
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    extracted_text += f"\n--- PAGE {page_num + 1} ---\n{page_text}\n"
                    
                    # Stop if we've reached next chapter
                    if "3.3" in page_text and "Special provisions" in page_text:
                        print(f"Reached Chapter 3.3 at page {page_num + 1}, stopping extraction")
                        break
            
            return extracted_text
            
    except Exception as e:
        print(f"Error reading PDF: {str(e)}")
        return None

def parse_dangerous_goods_entries(text):
    """Parse dangerous goods entries from extracted text"""
    
    print("Parsing dangerous goods entries...")
    
    # Look for UN number patterns
    un_pattern = r'(?:^|\s)(UN\s*)?(\d{4})(?:\s|$)'
    lines = text.split('\n')
    
    entries = []
    current_entry = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Look for UN numbers
        un_match = re.search(un_pattern, line)
        if un_match:
            # Save previous entry if complete
            if current_entry.get('un_number'):
                entries.append(current_entry)
            
            # Start new entry
            current_entry = {
                'un_number': un_match.group(2),
                'line_content': line
            }
        elif current_entry.get('un_number'):
            # Add to current entry content
            current_entry['line_content'] += ' ' + line
    
    # Add final entry
    if current_entry.get('un_number'):
        entries.append(current_entry)
    
    print(f"Found {len(entries)} potential dangerous goods entries")
    
    # Show samples
    for i, entry in enumerate(entries[:10]):
        print(f"  {i+1}. UN{entry['un_number']}: {entry['line_content'][:100]}...")
    
    return entries

def main():
    """Main extraction process"""
    
    pdf_path = "/tmp/ADR_Vol_II.pdf"
    
    # Extract text from ADR document
    extracted_text = extract_adr_chapter_3_2(pdf_path)
    
    if not extracted_text:
        print("Failed to extract text from PDF")
        return
    
    # Save extracted text for analysis
    with open('/tmp/adr_extracted_text.txt', 'w', encoding='utf-8') as f:
        f.write(extracted_text)
    print("Extracted text saved to /tmp/adr_extracted_text.txt")
    
    # Parse dangerous goods entries
    entries = parse_dangerous_goods_entries(extracted_text)
    
    # Save entries to CSV for analysis
    with open('/tmp/adr_entries.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['UN_Number', 'Content'])
        
        for entry in entries:
            writer.writerow([entry['un_number'], entry['line_content']])
    
    print(f"Saved {len(entries)} entries to /tmp/adr_entries.csv")
    print("\n✅ ADR data extraction completed!")

if __name__ == "__main__":
    main()