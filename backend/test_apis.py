#!/usr/bin/env python3
"""
Simple test script to validate our new API implementations.
This script checks the syntax and basic structure of our implementations.
"""

def test_user_management_api():
    """Test User Management API structure"""
    print("🔍 Testing User Management API...")
    
    # Check that critical files exist and have proper structure
    try:
        from users.serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
        print("✅ User serializers imported successfully")
        
        from users.permissions import IsAdminOrSelf
        print("✅ IsAdminOrSelf permission imported successfully")
        
        from users.api_views import UserViewSet
        print("✅ UserViewSet imported successfully")
        
        # Check that UserViewSet has required methods
        assert hasattr(UserViewSet, 'get_serializer_class')
        assert hasattr(UserViewSet, 'get_queryset')
        print("✅ UserViewSet has required methods")
        
        return True
    except Exception as e:
        print(f"❌ User Management API test failed: {e}")
        return False

def test_dangerous_goods_api():
    """Test Dangerous Goods API structure"""
    print("\n🔍 Testing Dangerous Goods API...")
    
    try:
        from dangerous_goods.api_views import DangerousGoodViewSet, DGCompatibilityCheckView
        print("✅ DG viewsets imported successfully")
        
        from dangerous_goods.services import check_list_compatibility
        print("✅ check_list_compatibility function imported successfully")
        
        # Check that DGCompatibilityCheckView has required methods
        assert hasattr(DGCompatibilityCheckView, 'post')
        print("✅ DGCompatibilityCheckView has post method")
        
        # Test function signature
        import inspect
        sig = inspect.signature(check_list_compatibility)
        assert 'un_numbers' in sig.parameters
        print("✅ check_list_compatibility has correct signature")
        
        return True
    except Exception as e:
        print(f"❌ Dangerous Goods API test failed: {e}")
        return False

def test_api_endpoints():
    """Test that API endpoints are properly configured"""
    print("\n🔍 Testing API endpoint configurations...")
    
    try:
        # Check users URLs
        from users.urls import urlpatterns as user_urls
        print(f"✅ Users URLs configured: {len(user_urls)} patterns")
        
        # Check dangerous goods URLs  
        from dangerous_goods.urls import urlpatterns as dg_urls
        print(f"✅ Dangerous Goods URLs configured: {len(dg_urls)} patterns")
        
        return True
    except Exception as e:
        print(f"❌ API endpoints test failed: {e}")
        return False

def main():
    """Main test runner"""
    print("🧪 Running API Implementation Tests\n")
    
    tests = [
        test_user_management_api,
        test_dangerous_goods_api, 
        test_api_endpoints
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! APIs are ready for integration.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the implementations.")
        return False

if __name__ == "__main__":
    main()