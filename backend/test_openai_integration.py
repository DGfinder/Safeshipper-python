#!/usr/bin/env python
"""
Test script for OpenAI integration with SafeShipper platform
Tests SDS extraction, dangerous goods detection, and compliance analysis
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings_minimal')
django.setup()

import logging
from sds.openai_service import enhanced_openai_service
from dangerous_goods.ai_detection_service import enhanced_dg_detection

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_openai_service():
    """Test basic OpenAI service functionality"""
    print("=" * 60)
    print("TESTING OPENAI SERVICE INTEGRATION")
    print("=" * 60)
    
    # Test 1: Check if OpenAI client is available
    print("\n1. Testing OpenAI Client Availability")
    print("-" * 40)
    
    if enhanced_openai_service.client:
        print("✅ OpenAI client initialized successfully")
        
        # Get model information
        models = enhanced_openai_service.router.models
        print(f"📊 Available models: {list(models.keys())}")
        
        for model_name, config in models.items():
            print(f"   - {model_name}: Input ${config.input_cost_per_1k:.4f}/1K, Output ${config.output_cost_per_1k:.4f}/1K")
    else:
        print("❌ OpenAI client not available - check API key configuration")
        return False
    
    return True

def test_sds_extraction():
    """Test SDS information extraction"""
    print("\n2. Testing SDS Information Extraction")
    print("-" * 40)
    
    # Sample SDS text for testing
    sample_sds_text = """
    SAFETY DATA SHEET
    
    SECTION 1: IDENTIFICATION
    Product Name: Ethyl Alcohol, 99.5%
    Manufacturer: Chemical Solutions Inc.
    Product Code: CHM-001
    
    SECTION 2: HAZARD IDENTIFICATION
    Hazard Class: 3
    Signal Word: DANGER
    Hazard Statements: H225 - Highly flammable liquid and vapor
    Precautionary Statements: P210 - Keep away from heat/sparks/open flames/hot surfaces
    
    SECTION 3: COMPOSITION/INFORMATION ON INGREDIENTS
    Chemical Name: Ethanol
    CAS Number: 64-17-5
    Concentration: 99.5%
    
    SECTION 9: PHYSICAL AND CHEMICAL PROPERTIES
    Physical State: Liquid
    Color: Colorless
    Flash Point: 13°C
    
    SECTION 14: TRANSPORT INFORMATION
    UN Number: UN1170
    Proper Shipping Name: Ethanol or Ethyl alcohol
    Hazard Class: 3
    Packing Group: II
    """
    
    try:
        result = enhanced_openai_service.extract_sds_information(
            sample_sds_text,
            use_cache=False  # Don't use cache for testing
        )
        
        print("✅ SDS extraction completed successfully")
        print(f"📊 Model used: {result.get('model_used', 'unknown')}")
        print(f"💰 Estimated cost: ${result.get('estimated_cost', 0):.4f}")
        print(f"⏱️  Processing time: {result.get('processing_time', 0):.2f}s")
        print(f"🎯 Confidence: {result.get('confidence', 0):.2f}")
        
        extracted_data = result.get('extracted_data', {})
        if extracted_data:
            print("\n📋 Key extracted information:")
            print(f"   - Product Name: {extracted_data.get('product_name', 'N/A')}")
            print(f"   - Manufacturer: {extracted_data.get('manufacturer', 'N/A')}")
            print(f"   - UN Number: {extracted_data.get('un_number', 'N/A')}")
            print(f"   - Hazard Class: {extracted_data.get('hazard_class', 'N/A')}")
            print(f"   - CAS Number: {extracted_data.get('cas_number', 'N/A')}")
            print(f"   - Flash Point: {extracted_data.get('flash_point', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ SDS extraction failed: {e}")
        return False

def test_dangerous_goods_detection():
    """Test dangerous goods detection enhancement"""
    print("\n3. Testing Dangerous Goods Detection Enhancement")
    print("-" * 40)
    
    # Sample manifest text
    sample_manifest_text = """
    DANGEROUS GOODS MANIFEST
    
    Shipment ID: DG-2025-001
    
    Item 1:
    Description: Gasoline, Regular Unleaded
    Quantity: 200 L in 4x 50L drums
    UN Number: UN1203
    Class: 3
    
    Item 2:
    Description: Sodium Hydroxide Solution, 50%
    Quantity: 100 kg
    Class: 8
    Packing Group: II
    
    Item 3:
    Description: Compressed Oxygen
    Quantity: 5 cylinders
    Class: 2.2
    """
    
    try:
        # First, use traditional detection
        traditional_result = enhanced_dg_detection.analyze_document_text(
            sample_manifest_text,
            use_cache=False,
            advanced_features=False  # Disable OpenAI for baseline
        )
        
        print(f"🔍 Traditional detection found {len(traditional_result.detected_items)} items")
        
        # Then, use OpenAI-enhanced detection
        enhanced_result = enhanced_dg_detection.analyze_document_text(
            sample_manifest_text,
            use_cache=False,
            advanced_features=True  # Enable OpenAI
        )
        
        print(f"🤖 Enhanced detection found {len(enhanced_result.detected_items)} items")
        print(f"📊 Processing methods: {', '.join(enhanced_result.processing_method)}")
        print(f"🎯 Overall confidence: {enhanced_result.confidence_score:.2f}")
        
        if enhanced_result.detected_items:
            print("\n📋 Detected dangerous goods:")
            for i, item in enumerate(enhanced_result.detected_items[:3], 1):
                print(f"   {i}. {item.dangerous_good.proper_shipping_name}")
                print(f"      UN: {item.dangerous_good.un_number}, Class: {item.dangerous_good.hazard_class}")
                print(f"      Confidence: {item.confidence:.2f}, Method: {item.match_type}")
                if item.extracted_quantity:
                    print(f"      Quantity: {item.extracted_quantity}")
        
        return True
        
    except Exception as e:
        print(f"❌ Dangerous goods detection failed: {e}")
        return False

def test_compliance_analysis():
    """Test compliance analysis"""
    print("\n4. Testing Compliance Analysis")
    print("-" * 40)
    
    # Sample manifest for compliance checking
    sample_manifest = """
    DANGEROUS GOODS MANIFEST
    Date: 2025-01-27
    
    Consignor: ABC Chemical Co.
    Consignee: XYZ Industries
    
    Item 1:
    Proper Shipping Name: Ethanol
    UN Number: UN1170
    Class: 3
    Packing Group: II
    Quantity: 500L
    Packaging: Steel drums
    
    Item 2:
    Description: Paint related material
    Class: 3
    Quantity: 200L
    
    Emergency Contact: John Smith, +61-123-456-789
    """
    
    try:
        result = enhanced_openai_service.analyze_document_compliance(
            sample_manifest,
            document_type='manifest',
            use_cache=False
        )
        
        print("✅ Compliance analysis completed successfully")
        print(f"📊 Model used: {result.get('model_used', 'unknown')}")
        print(f"💰 Estimated cost: ${result.get('estimated_cost', 0):.4f}")
        print(f"🎯 Compliance score: {result.get('compliance_score', 0):.2f}")
        
        compliance_data = result.get('compliance_analysis', {})
        if compliance_data:
            print(f"\n📋 Compliance Status: {compliance_data.get('compliance_status', 'unknown')}")
            
            violations = compliance_data.get('violations', [])
            if violations:
                print(f"⚠️  Found {len(violations)} violations:")
                for violation in violations[:3]:
                    print(f"   - {violation.get('severity', 'unknown').upper()}: {violation.get('description', 'N/A')}")
            
            missing_info = compliance_data.get('missing_information', [])
            if missing_info:
                print(f"📝 Missing information: {', '.join(missing_info[:3])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Compliance analysis failed: {e}")
        return False

def test_usage_stats():
    """Test usage statistics"""
    print("\n5. Testing Usage Statistics")
    print("-" * 40)
    
    try:
        stats = enhanced_openai_service.get_usage_stats()
        
        print("📊 OpenAI Usage Statistics:")
        print(f"   - Total requests: {stats.get('total_requests', 0)}")
        print(f"   - Total tokens: {stats.get('total_tokens', 0):,}")
        print(f"   - Estimated cost: ${stats.get('estimated_cost', 0):.4f}")
        print(f"   - Cache hit rate: {stats.get('cache_hit_rate', 0):.1%}")
        print(f"   - Avg processing time: {stats.get('average_processing_time', 0):.2f}s")
        
        return True
        
    except Exception as e:
        print(f"❌ Usage stats retrieval failed: {e}")
        return False

def main():
    """Run all OpenAI integration tests"""
    print("🧪 SafeShipper OpenAI Integration Test Suite")
    print("=" * 60)
    
    tests = [
        ("OpenAI Service", test_openai_service),
        ("SDS Extraction", test_sds_extraction),
        ("DG Detection", test_dangerous_goods_detection),
        ("Compliance Analysis", test_compliance_analysis),
        ("Usage Statistics", test_usage_stats),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with error: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<25} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! OpenAI integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the configuration and logs above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)