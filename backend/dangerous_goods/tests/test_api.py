# dangerous_goods/tests/test_api.py
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from ..models import (
    DangerousGood, 
    DGProductSynonym, 
    SegregationGroup, 
    SegregationRule,
    PackingGroup
)
from ..services import (
    get_dangerous_good_by_un_number,
    check_dg_compatibility,
    match_synonym_to_dg,
    check_list_compatibility
)
from ..serializers import DangerousGoodSerializer

User = get_user_model()

class DangerousGoodsSearchAPITests(APITestCase):
    """Test dangerous goods search and lookup endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.admin_user = User.objects.create_user(
            username='admin_dg',
            email='admin@dg.com',
            password='AdminDG123!',
            role=User.Role.ADMIN,
            is_staff=True
        )
        
        self.dispatcher_user = User.objects.create_user(
            username='dispatcher_dg',
            email='dispatcher@dg.com',
            password='DispatcherDG123!',
            role=User.Role.DISPATCHER
        )
        
        self.driver_user = User.objects.create_user(
            username='driver_dg',
            email='driver@dg.com',
            password='DriverDG123!',
            role=User.Role.DRIVER
        )
        
        # Create test dangerous goods
        self.dg_acetone = DangerousGood.objects.create(
            un_number='UN1090',
            proper_shipping_name='ACETONE',
            hazard_class='3',
            packing_group=PackingGroup.II,
            simplified_name='Acetone',
            is_marine_pollutant=False,
            is_environmentally_hazardous=False
        )
        
        self.dg_gasoline = DangerousGood.objects.create(
            un_number='UN1203',
            proper_shipping_name='GASOLINE',
            hazard_class='3',
            packing_group=PackingGroup.II,
            simplified_name='Gasoline',
            is_marine_pollutant=False,
            is_environmentally_hazardous=False
        )
        
        self.dg_acid = DangerousGood.objects.create(
            un_number='UN1779',
            proper_shipping_name='FORMIC ACID',
            hazard_class='8',
            subsidiary_risks='3',
            packing_group=PackingGroup.II,
            simplified_name='Formic Acid',
            is_marine_pollutant=False,
            is_environmentally_hazardous=True
        )
        
        self.dg_oxidizer = DangerousGood.objects.create(
            un_number='UN1479',
            proper_shipping_name='OXIDIZING SOLID, N.O.S.',
            hazard_class='5.1',
            packing_group=PackingGroup.III,
            simplified_name='Oxidizing Solid',
            is_marine_pollutant=False,
            is_environmentally_hazardous=False
        )
        
        # Create synonyms
        DGProductSynonym.objects.create(
            dangerous_good=self.dg_acetone,
            synonym='Dimethyl ketone',
            source=DGProductSynonym.Source.MANUAL
        )
        
        DGProductSynonym.objects.create(
            dangerous_good=self.dg_acetone,
            synonym='Propanone',
            source=DGProductSynonym.Source.MANUAL
        )
        
        DGProductSynonym.objects.create(
            dangerous_good=self.dg_gasoline,
            synonym='Petrol',
            source=DGProductSynonym.Source.MANUAL
        )

    def test_search_dangerous_goods_by_un_number(self):
        """Test searching dangerous goods by UN number"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-list')
        
        # Search by exact UN number
        response = self.client.get(url, {'search': 'UN1090'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['un_number'], 'UN1090')
        self.assertEqual(response.data[0]['proper_shipping_name'], 'ACETONE')

    def test_search_dangerous_goods_by_shipping_name(self):
        """Test searching dangerous goods by proper shipping name"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-list')
        
        # Search by partial shipping name
        response = self.client.get(url, {'search': 'GASOLINE'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['un_number'], 'UN1203')
        self.assertEqual(response.data[0]['proper_shipping_name'], 'GASOLINE')

    def test_search_dangerous_goods_partial_match(self):
        """Test partial matching in search"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-list')
        
        # Search by partial name - should find both acetone and acid
        response = self.client.get(url, {'search': 'ACID'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Only formic acid matches
        self.assertEqual(response.data[0]['proper_shipping_name'], 'FORMIC ACID')

    def test_filter_by_hazard_class(self):
        """Test filtering dangerous goods by hazard class"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-list')
        
        # Filter by Class 3 (flammable liquids)
        response = self.client.get(url, {'hazard_class': '3'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Acetone and Gasoline
        
        un_numbers = [item['un_number'] for item in response.data]
        self.assertIn('UN1090', un_numbers)
        self.assertIn('UN1203', un_numbers)

    def test_filter_by_packing_group(self):
        """Test filtering dangerous goods by packing group"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-list')
        
        # Filter by Packing Group II
        response = self.client.get(url, {'packing_group': 'II'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # Acetone, Gasoline, Formic Acid
        
        packing_groups = [item['packing_group'] for item in response.data]
        for pg in packing_groups:
            self.assertEqual(pg, 'II')

    def test_filter_by_environmental_hazard(self):
        """Test filtering by environmental hazard status"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-list')
        
        # Filter for environmentally hazardous substances
        response = self.client.get(url, {'is_environmentally_hazardous': 'true'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Only formic acid
        self.assertEqual(response.data[0]['un_number'], 'UN1779')
        self.assertTrue(response.data[0]['is_environmentally_hazardous'])

    def test_lookup_by_synonym_endpoint(self):
        """Test lookup of dangerous goods by synonym"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-lookup-by-synonym')
        
        # Test lookup by synonym
        response = self.client.get(url, {'query': 'Dimethyl ketone'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['un_number'], 'UN1090')
        self.assertEqual(response.data['proper_shipping_name'], 'ACETONE')

    def test_lookup_by_synonym_case_insensitive(self):
        """Test that synonym lookup is case insensitive"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-lookup-by-synonym')
        
        # Test case insensitive lookup
        response = self.client.get(url, {'query': 'petrol'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['un_number'], 'UN1203')
        self.assertEqual(response.data['proper_shipping_name'], 'GASOLINE')

    def test_lookup_by_synonym_not_found(self):
        """Test lookup with non-existent synonym"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-lookup-by-synonym')
        
        response = self.client.get(url, {'query': 'NonExistentChemical'})
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_lookup_by_synonym_missing_query(self):
        """Test lookup endpoint with missing query parameter"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-lookup-by-synonym')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_dangerous_goods_list_unauthenticated(self):
        """Test that dangerous goods endpoints require authentication"""
        url = reverse('dangerousgood-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dangerous_goods_list_authenticated_user(self):
        """Test that authenticated users can read dangerous goods"""
        self.client.force_authenticate(user=self.driver_user)
        url = reverse('dangerousgood-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)  # All 4 DGs created in setUp

    def test_dangerous_goods_ordering(self):
        """Test that dangerous goods are properly ordered by UN number"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dangerousgood-list')
        
        response = self.client.get(url, {'ordering': 'un_number'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify ordering by UN number
        un_numbers = [item['un_number'] for item in response.data]
        self.assertEqual(un_numbers, ['UN1090', 'UN1203', 'UN1479', 'UN1779'])


class DangerousGoodsCompatibilityAPITests(APITestCase):
    """Test dangerous goods compatibility checking endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test user
        self.dispatcher_user = User.objects.create_user(
            username='compatibility_dispatcher',
            email='compatibility@dg.com',
            password='CompatibilityDG123!',
            role=User.Role.DISPATCHER
        )
        
        # Create test dangerous goods
        self.dg_flammable_liquid = DangerousGood.objects.create(
            un_number='UN1203',
            proper_shipping_name='GASOLINE',
            hazard_class='3',
            packing_group=PackingGroup.II
        )
        
        self.dg_oxidizer = DangerousGood.objects.create(
            un_number='UN1479',
            proper_shipping_name='OXIDIZING SOLID, N.O.S.',
            hazard_class='5.1',
            packing_group=PackingGroup.III
        )
        
        self.dg_acid = DangerousGood.objects.create(
            un_number='UN1779',
            proper_shipping_name='FORMIC ACID',
            hazard_class='8',
            subsidiary_risks='3',
            packing_group=PackingGroup.II
        )
        
        self.dg_compatible = DangerousGood.objects.create(
            un_number='UN3082',
            proper_shipping_name='ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.',
            hazard_class='9',
            packing_group=PackingGroup.III
        )
        
        # Create segregation groups
        self.flammable_group = SegregationGroup.objects.create(
            code='SGG1',
            name='Flammable Liquids Class 3'
        )
        self.flammable_group.dangerous_goods.add(self.dg_flammable_liquid)
        
        self.oxidizer_group = SegregationGroup.objects.create(
            code='SGG5',
            name='Oxidizing Substances Class 5.1'
        )
        self.oxidizer_group.dangerous_goods.add(self.dg_oxidizer)
        
        # Create incompatibility rules
        self.incompatible_rule = SegregationRule.objects.create(
            rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
            primary_hazard_class='3',
            secondary_hazard_class='5.1',
            compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED,
            notes='Flammable liquids and oxidizers are incompatible - high fire/explosion risk'
        )
        
        # Create another incompatible rule for acids and flammables
        self.acid_flammable_rule = SegregationRule.objects.create(
            rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
            primary_hazard_class='8',
            secondary_hazard_class='3',
            compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED,
            notes='Acids and flammable liquids are incompatible'
        )

    def test_check_compatibility_compatible_items(self):
        """Test compatibility check for compatible dangerous goods"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        # Test two Class 9 items (should be compatible)
        payload = {
            'un_numbers': ['UN3082', 'UN3082']  # Same item with itself
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_compatible'])
        self.assertEqual(len(response.data['conflicts']), 0)

    def test_check_compatibility_incompatible_class_3_and_5_1(self):
        """Test compatibility check for incompatible flammable liquid and oxidizer"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        # Test Class 3 (flammable) and Class 5.1 (oxidizer) - should be incompatible
        payload = {
            'un_numbers': ['UN1203', 'UN1479']
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_compatible'])
        self.assertGreater(len(response.data['conflicts']), 0)
        
        # Check conflict details
        conflict = response.data['conflicts'][0]
        self.assertIn('UN1203', [conflict['un_number_1'], conflict['un_number_2']])
        self.assertIn('UN1479', [conflict['un_number_1'], conflict['un_number_2']])
        self.assertIn('fire', conflict['reason'].lower())

    def test_check_compatibility_incompatible_acid_and_flammable(self):
        """Test compatibility check for incompatible acid and flammable liquid"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        # Test Class 8 (acid) and Class 3 (flammable) - should be incompatible
        payload = {
            'un_numbers': ['UN1779', 'UN1203']
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_compatible'])
        self.assertGreater(len(response.data['conflicts']), 0)
        
        # Check conflict details
        conflict = response.data['conflicts'][0]
        self.assertIn('UN1779', [conflict['un_number_1'], conflict['un_number_2']])
        self.assertIn('UN1203', [conflict['un_number_1'], conflict['un_number_2']])

    def test_check_compatibility_multiple_conflicts(self):
        """Test compatibility check with multiple incompatible combinations"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        # Test multiple incompatible items
        payload = {
            'un_numbers': ['UN1203', 'UN1479', 'UN1779']  # Flammable, Oxidizer, Acid
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_compatible'])
        self.assertGreaterEqual(len(response.data['conflicts']), 2)  # At least 2 conflicts

    def test_check_compatibility_invalid_un_number(self):
        """Test compatibility check with invalid UN number"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        payload = {
            'un_numbers': ['UN1203', 'UN9999']  # UN9999 doesn't exist
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_check_compatibility_single_item(self):
        """Test compatibility check with single item (should be compatible)"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        payload = {
            'un_numbers': ['UN1203']
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_compatible'])
        self.assertEqual(len(response.data['conflicts']), 0)

    def test_check_compatibility_empty_list(self):
        """Test compatibility check with empty UN numbers list"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        payload = {
            'un_numbers': []
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_check_compatibility_missing_un_numbers(self):
        """Test compatibility check with missing un_numbers field"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('dg-compatibility-check')
        
        payload = {}
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_check_compatibility_unauthenticated(self):
        """Test that compatibility check requires authentication"""
        url = reverse('dg-compatibility-check')
        
        payload = {
            'un_numbers': ['UN1203', 'UN1479']
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DangerousGoodsManagementAPITests(APITestCase):
    """Test dangerous goods CRUD operations for staff users"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.admin_user = User.objects.create_user(
            username='admin_dg_mgmt',
            email='admin@dgmgmt.com',
            password='AdminDGMgmt123!',
            role=User.Role.ADMIN,
            is_staff=True
        )
        
        self.staff_user = User.objects.create_user(
            username='staff_dg_mgmt',
            email='staff@dgmgmt.com',
            password='StaffDGMgmt123!',
            role=User.Role.COMPLIANCE_OFFICER,
            is_staff=True
        )
        
        self.normal_user = User.objects.create_user(
            username='normal_dg_mgmt',
            email='normal@dgmgmt.com',
            password='NormalDGMgmt123!',
            role=User.Role.DRIVER
        )
        
        # Create test dangerous good
        self.test_dg = DangerousGood.objects.create(
            un_number='UN1234',
            proper_shipping_name='TEST CHEMICAL',
            hazard_class='6.1',
            packing_group=PackingGroup.II
        )

    def test_staff_can_create_dangerous_good(self):
        """Test that staff users can create new dangerous goods"""
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('dangerousgood-list')
        
        payload = {
            'un_number': 'UN5678',
            'proper_shipping_name': 'NEW TEST CHEMICAL',
            'hazard_class': '4.1',
            'packing_group': 'III',
            'simplified_name': 'New Test Chemical',
            'is_marine_pollutant': False,
            'is_environmentally_hazardous': True
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['un_number'], 'UN5678')
        self.assertEqual(response.data['proper_shipping_name'], 'NEW TEST CHEMICAL')
        self.assertTrue(response.data['is_environmentally_hazardous'])

    def test_admin_can_create_dangerous_good(self):
        """Test that admin users can create new dangerous goods"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('dangerousgood-list')
        
        payload = {
            'un_number': 'UN9876',
            'proper_shipping_name': 'ADMIN TEST CHEMICAL',
            'hazard_class': '2.3',
            'simplified_name': 'Admin Test Chemical'
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['un_number'], 'UN9876')

    def test_normal_user_cannot_create_dangerous_good(self):
        """Test that normal users cannot create dangerous goods"""
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('dangerousgood-list')
        
        payload = {
            'un_number': 'UN9999',
            'proper_shipping_name': 'UNAUTHORIZED CHEMICAL',
            'hazard_class': '1.1'
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_update_dangerous_good(self):
        """Test that staff users can update dangerous goods"""
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('dangerousgood-detail', kwargs={'pk': self.test_dg.pk})
        
        payload = {
            'simplified_name': 'Updated Test Chemical',
            'is_environmentally_hazardous': True
        }
        
        response = self.client.patch(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['simplified_name'], 'Updated Test Chemical')
        self.assertTrue(response.data['is_environmentally_hazardous'])

    def test_normal_user_cannot_update_dangerous_good(self):
        """Test that normal users cannot update dangerous goods"""
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('dangerousgood-detail', kwargs={'pk': self.test_dg.pk})
        
        payload = {
            'simplified_name': 'Unauthorized Update'
        }
        
        response = self.client.patch(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_dangerous_good_validation(self):
        """Test dangerous good creation validation"""
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('dangerousgood-list')
        
        # Test duplicate UN number
        duplicate_payload = {
            'un_number': 'UN1234',  # Already exists
            'proper_shipping_name': 'DUPLICATE TEST',
            'hazard_class': '3'
        }
        
        response = self.client.post(url, duplicate_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test missing required fields
        incomplete_payload = {
            'un_number': 'UN1111'
            # Missing proper_shipping_name and hazard_class
        }
        
        response = self.client.post(url, incomplete_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DangerousGoodsServiceTests(TestCase):
    """Test dangerous goods service layer functions"""
    
    def setUp(self):
        # Create test dangerous goods
        self.dg_acetone = DangerousGood.objects.create(
            un_number='UN1090',
            proper_shipping_name='ACETONE',
            hazard_class='3',
            packing_group=PackingGroup.II
        )
        
        self.dg_oxidizer = DangerousGood.objects.create(
            un_number='UN1479',
            proper_shipping_name='OXIDIZING SOLID, N.O.S.',
            hazard_class='5.1',
            packing_group=PackingGroup.III
        )
        
        # Create synonym
        DGProductSynonym.objects.create(
            dangerous_good=self.dg_acetone,
            synonym='Propanone',
            source=DGProductSynonym.Source.MANUAL
        )
        
        # Create incompatibility rule
        SegregationRule.objects.create(
            rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
            primary_hazard_class='3',
            secondary_hazard_class='5.1',
            compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED,
            notes='Test incompatibility rule'
        )

    def test_get_dangerous_good_by_un_number_service(self):
        """Test get_dangerous_good_by_un_number service function"""
        # Test existing UN number
        result = get_dangerous_good_by_un_number('UN1090')
        self.assertEqual(result, self.dg_acetone)
        
        # Test non-existent UN number
        result = get_dangerous_good_by_un_number('UN9999')
        self.assertIsNone(result)

    def test_match_synonym_to_dg_service(self):
        """Test match_synonym_to_dg service function"""
        # Test existing synonym
        result = match_synonym_to_dg('Propanone')
        self.assertEqual(result, self.dg_acetone)
        
        # Test case insensitive
        result = match_synonym_to_dg('propanone')
        self.assertEqual(result, self.dg_acetone)
        
        # Test non-existent synonym
        result = match_synonym_to_dg('NonExistentChemical')
        self.assertIsNone(result)

    def test_check_dg_compatibility_service(self):
        """Test check_dg_compatibility service function"""
        # Test compatible items (same with itself)
        result = check_dg_compatibility(self.dg_acetone, self.dg_acetone)
        self.assertTrue(result['compatible'])
        
        # Test incompatible items
        result = check_dg_compatibility(self.dg_acetone, self.dg_oxidizer)
        self.assertFalse(result['compatible'])
        self.assertIn('reason', result)

    def test_check_list_compatibility_service(self):
        """Test check_list_compatibility service function"""
        # Test compatible list (single item)
        result = check_list_compatibility(['UN1090'])
        self.assertTrue(result['is_compatible'])
        self.assertEqual(len(result['conflicts']), 0)
        
        # Test incompatible list
        result = check_list_compatibility(['UN1090', 'UN1479'])
        self.assertFalse(result['is_compatible'])
        self.assertGreater(len(result['conflicts']), 0)
        
        # Test with invalid UN number
        result = check_list_compatibility(['UN1090', 'UN9999'])
        self.assertFalse(result['is_compatible'])
        self.assertIn('error', result.get('conflicts', [{}])[0].get('reason', '').lower())

    def test_check_list_compatibility_empty_list(self):
        """Test check_list_compatibility with empty list"""
        result = check_list_compatibility([])
        self.assertTrue(result['is_compatible'])
        self.assertEqual(len(result['conflicts']), 0)