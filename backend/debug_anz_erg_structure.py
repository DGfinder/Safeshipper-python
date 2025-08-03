#!/usr/bin/env python3
"""
Debug ANZ-ERG2021 PDF structure to understand the format
"""
import os
import re
import PyPDF2

def debug_erg_structure():
    """Debug the structure of ANZ-ERG2021 to understand the format"""
    
    pdf_path = "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/Australian and New Zealand Emergency Response Guide - ANZ-ERG2021 UPDATED 18 OCTOBER 2022.pdf"
    
    print("🔍 Debugging ANZ-ERG2021 PDF structure...")
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            print(f"Total pages: {total_pages}")
            
            # Sample different sections of the PDF
            sample_pages = [1, 10, 50, 100, 150, 200, 250, 300, 350, 390]
            
            for page_num in sample_pages:
                if page_num <= total_pages:
                    try:
                        page = pdf_reader.pages[page_num - 1]  # 0-indexed
                        text = page.extract_text()
                        
                        print(f"\n{'='*60}")
                        print(f"PAGE {page_num} SAMPLE (first 500 characters):")
                        print('='*60)
                        print(text[:500])
                        
                        # Look for specific patterns
                        print(f"\n--- PAGE {page_num} ANALYSIS ---")
                        
                        # Check for UN numbers
                        un_patterns = re.findall(r'\bun\s*\d{4}\b', text.lower())
                        if un_patterns:
                            print(f"UN patterns found: {un_patterns[:5]}")
                        else:
                            print("No UN patterns found")
                        
                        # Check for guide numbers
                        guide_patterns = re.findall(r'guide\s*\d{3}', text.lower())
                        if guide_patterns:
                            print(f"Guide patterns found: {guide_patterns[:5]}")
                        else:
                            print("No guide patterns found")
                        
                        # Check for table structures
                        if '|' in text or '\t' in text:
                            print("Possible table structure detected")
                        
                        # Check for specific keywords
                        keywords = ['emergency', 'fire', 'spill', 'evacuation', 'chemcall', 'australia']
                        found_keywords = [kw for kw in keywords if kw in text.lower()]
                        if found_keywords:
                            print(f"Keywords found: {found_keywords}")
                        
                    except Exception as e:
                        print(f"Error reading page {page_num}: {str(e)}")
                        
    except Exception as e:
        print(f"Error opening PDF: {str(e)}")

if __name__ == "__main__":
    debug_erg_structure()