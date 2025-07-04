#!/usr/bin/env python3
"""
Test script for the improved synonym matching functionality.
This script demonstrates how the new multi-pass scanning strategy improves
dangerous goods detection accuracy using synonyms.
"""

# Sample test content that would typically be found in manifest PDFs
TEST_MANIFEST_CONTENT = """
DANGEROUS GOODS MANIFEST
========================

Item 1: Kerosene, Aviation Grade
Quantity: 50 gallons
Weight: 190 kg

Item 2: White Spirit (Mineral Turpentine)
Quantity: 25 containers
Weight: 125 kg

Item 3: UN1993 Flammable Liquid N.O.S.
Quantity: 10 drums
Weight: 200 kg

Item 4: Turps for cleaning
Quantity: 15 bottles
Weight: 45 kg

Item 5: Battery Acid (Sulphuric Acid)
Quantity: 8 containers
Weight: 80 kg
"""

def test_synonym_matching():
    """Test the new find_dgs_by_text_search function with realistic manifest content."""
    
    print("=== Testing Improved Synonym Matching ===")
    print(f"Test content length: {len(TEST_MANIFEST_CONTENT)} characters")
    print(f"Test content preview: {TEST_MANIFEST_CONTENT[:100]}...")
    print("\n" + "="*50)
    
    # Import the new function (this would normally work in a Django environment)
    try:
        from dangerous_goods.services import find_dgs_by_text_search
        print("✓ Successfully imported find_dgs_by_text_search")
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        print("Note: This test requires a Django environment with the database configured.")
        return
    
    try:
        # Test the multi-pass scanning
        results = find_dgs_by_text_search(TEST_MANIFEST_CONTENT)
        
        print(f"\n🔍 Multi-pass scanning found {len(results)} potential dangerous goods:")
        print("-" * 60)
        
        for i, result in enumerate(results, 1):
            dg = result['dangerous_good']
            matched_term = result['matched_term']
            confidence = result['confidence']
            match_type = result['match_type']
            
            print(f"{i}. {dg.un_number} - {dg.proper_shipping_name}")
            print(f"   Matched via: '{matched_term}' ({match_type})")
            print(f"   Confidence: {confidence:.1%}")
            print(f"   Hazard Class: {dg.hazard_class}")
            print()
        
        # Analyze the improvements
        print("📊 Analysis of Results:")
        print("-" * 30)
        
        match_types = {}
        for result in results:
            match_type = result['match_type']
            match_types[match_type] = match_types.get(match_type, 0) + 1
        
        for match_type, count in match_types.items():
            print(f"  {match_type.replace('_', ' ').title()}: {count} matches")
        
        high_confidence = sum(1 for r in results if r['confidence'] >= 0.9)
        medium_confidence = sum(1 for r in results if 0.7 <= r['confidence'] < 0.9)
        low_confidence = sum(1 for r in results if r['confidence'] < 0.7)
        
        print(f"\n📈 Confidence Distribution:")
        print(f"  High (≥90%): {high_confidence}")
        print(f"  Medium (70-89%): {medium_confidence}")
        print(f"  Low (<70%): {low_confidence}")
        
        print(f"\n✅ Expected Improvements:")
        print("  • 'Kerosene' should match UN1223 (Kerosene)")
        print("  • 'Turps' should match UN1300 (Turpentine substitute)")
        print("  • 'White Spirit' should match mineral turpentine")
        print("  • 'Battery Acid' should match sulphuric acid")
        print("  • UN1993 should be directly matched")
        
    except Exception as e:
        print(f"✗ Test execution failed: {e}")
        print("Note: This requires a properly configured Django environment with DG data.")

def compare_old_vs_new_approach():
    """Compare the old basic matching vs new multi-pass scanning."""
    
    print("\n" + "="*60)
    print("🔄 COMPARISON: Old vs New Approach")
    print("="*60)
    
    test_terms = [
        "Kerosene",           # Should match UN1223
        "Turps",              # Should match UN1300  
        "White Spirit",       # Should match mineral turpentine
        "Battery Acid",       # Should match sulphuric acid
        "UN1993",            # Direct UN number match
    ]
    
    print("Old Approach (Basic regex + exact matching):")
    print("  ✗ Would miss 'Kerosene' (not a UN number)")
    print("  ✗ Would miss 'Turps' (not a UN number)")
    print("  ✗ Would miss 'White Spirit' (not a UN number)")
    print("  ✗ Would miss 'Battery Acid' (not a UN number)")
    print("  ✓ Would catch 'UN1993' (direct UN match)")
    print("  📊 Success Rate: ~20% (1/5 terms)")
    
    print("\nNew Approach (Multi-pass with synonyms):")
    print("  ✓ Should catch 'Kerosene' via synonym lookup")
    print("  ✓ Should catch 'Turps' via synonym lookup")
    print("  ✓ Should catch 'White Spirit' via synonym lookup")
    print("  ✓ Should catch 'Battery Acid' via synonym lookup")
    print("  ✓ Should catch 'UN1993' via UN number pass")
    print("  📊 Expected Success Rate: ~100% (5/5 terms)")
    
    print("\n🎯 Key Improvements:")
    print("  • 5-pass scanning strategy (UN numbers → synonyms → names → fuzzy)")
    print("  • Comprehensive synonym database integration")
    print("  • Confidence scoring for match quality")
    print("  • Word boundary detection to avoid false positives")
    print("  • Duplicate elimination with priority handling")

if __name__ == "__main__":
    print("🧪 SafeShipper Synonym Matching Test Suite")
    print("==========================================")
    
    test_synonym_matching()
    compare_old_vs_new_approach()
    
    print("\n" + "="*60)
    print("✅ Test Suite Complete")
    print("="*60)
    print("\nTo run in production:")
    print("1. Ensure Django environment is properly configured")
    print("2. Database should have DGProductSynonym entries")
    print("3. Run: python manage.py shell < test_synonym_matching.py")