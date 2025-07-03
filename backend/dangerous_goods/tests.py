# dangerous_goods/tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse

from .models import DangerousGood, DGProductSynonym, SegregationGroup, SegregationRule, PackingGroup
from .services import get_dangerous_good_by_un_number, check_dg_compatibility, match_synonym_to_dg, lookup_packing_instruction
from .serializers import DangerousGoodSerializer # For comparing data

User = get_user_model()

class DangerousGoodModelTests(TestCase):
    def test_create_dangerous_good(self):
        dg = DangerousGood.objects.create(
            un_number="UN1090",
            proper_shipping_name="ACETONE",
            hazard_class="3",
            packing_group=PackingGroup.II
        )
        self.assertEqual(str(dg), "UN1090 - ACETONE (Class: 3)")
        self.assertEqual(DangerousGood.objects.count(), 1)

    def test_dg_product_synonym(self):
        dg = DangerousGood.objects.create(un_number="UN1203", proper_shipping_name="GASOLINE", hazard_class="3")
        synonym = DGProductSynonym.objects.create(dangerous_good=dg, synonym="Petrol", source=DGProductSynonym.Source.MANUAL)
        self.assertEqual(str(synonym), "Petrol (for UN1203)")
        self.assertEqual(dg.synonyms.count(), 1)
        with self.assertRaises(Exception): # Test unique_together
             DGProductSynonym.objects.create(dangerous_good=dg, synonym="Petrol")


class DangerousGoodsServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dg_acetone = DangerousGood.objects.create(un_number="UN1090", proper_shipping_name="ACETONE", hazard_class="3", packing_group=PackingGroup.II, packing_instruction_passenger_aircraft="PI353", packing_instruction_cargo_aircraft="PI364")
        cls.dg_acid = DangerousGood.objects.create(un_number="UN1779", proper_shipping_name="FORMIC ACID", hazard_class="8", subsidiary_risks="3", packing_group=PackingGroup.II)
        cls.dg_alkali = DangerousGood.objects.create(un_number="UN1824", proper_shipping_name="SODIUM HYDROXIDE SOLUTION", hazard_class="8", packing_group=PackingGroup.II)
        
        DGProductSynonym.objects.create(dangerous_good=cls.dg_acetone, synonym="Dimethyl ketone", source=DGProductSynonym.Source.MANUAL)
        DGProductSynonym.objects.create(dangerous_good=cls.dg_acetone, synonym="Propanone", source=DGProductSynonym.Source.MANUAL)

        cls.acid_group = SegregationGroup.objects.create(code="SGG1a", name="Strong acids")
        cls.acid_group.dangerous_goods.add(cls.dg_acid)
        
        # Example rule: Class 3 and Class 8 (Acids) are incompatible
        SegregationRule.objects.create(
            rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
            primary_hazard_class="3",
            secondary_hazard_class="8", # Assuming all class 8s for this rule, can be more specific with groups
            compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED,
            notes="Flammable liquids and strong acids are generally incompatible."
        )

    def test_get_dg_by_un_number(self):
        found_dg = get_dangerous_good_by_un_number("UN1090")
        self.assertEqual(found_dg, self.dg_acetone)
        self.assertIsNone(get_dangerous_good_by_un_number("UN9999"))

    def test_match_synonym_to_dg(self):
        self.assertEqual(match_synonym_to_dg("Dimethyl ketone"), self.dg_acetone)
        self.assertEqual(match_synonym_to_dg("propanone"), self.dg_acetone) # Test case-insensitivity
        self.assertIsNone(match_synonym_to_dg("Unknown Chemical"))

    def test_lookup_packing_instruction(self):
        self.assertEqual(lookup_packing_instruction("UN1090", mode='air_passenger'), "PI353")
        self.assertEqual(lookup_packing_instruction("UN1090", mode='air_cargo'), "PI364")
        self.assertIn("not available", lookup_packing_instruction("UN1090", mode='sea'))

    def test_check_dg_compatibility_with_rule(self):
        # Test class 3 vs class 8 (should be incompatible based on rule above)
        result = check_dg_compatibility(self.dg_acetone, self.dg_acid)
        self.assertFalse(result['compatible'])
        self.assertIn("Flammable liquids and strong acids", result['reason'])

    def test_check_dg_compatibility_no_specific_rule(self):
        # Test class 8 (acid) vs class 8 (alkali) - no specific rule added for this pair yet,
        # so basic check might pass or fail based on detailed implementation
        # For current basic service, it might pass if no direct prohibition is found.
        result = check_dg_compatibility(self.dg_acid, self.dg_alkali)
        self.assertTrue(result['compatible']) # Based on current simplified service logic
        self.assertIn("No direct prohibition rule found", result['reason'])


class DangerousGoodsAPITests(APITestCase):
    def setUp(self):
        self.staff_user = User.objects.create_user(username='staffuser', password='password123', is_staff=True)
        self.normal_user = User.objects.create_user(username='normaluser', password='password123')
        self.dg1 = DangerousGood.objects.create(un_number="UN1203", proper_shipping_name="GASOLINE", hazard_class="3", packing_group=PackingGroup.II)
        DangerousGood.objects.create(un_number="UN1950", proper_shipping_name="AEROSOLS", hazard_class="2.1")

    def test_list_dangerous_goods_authenticated(self):
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('dangerousgood-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2) # Should see all DGs as read-only is allowed

    def test_retrieve_dangerous_good(self):
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('dangerousgood-detail', kwargs={'pk': self.dg1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['un_number'], "UN1203")

    def test_create_dangerous_good_staff(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('dangerousgood-list')
        payload = {
            "un_number": "UN3082",
            "proper_shipping_name": "ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",
            "hazard_class": "9",
            "packing_group": "III",
            "is_environmentally_hazardous": True
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DangerousGood.objects.count(), 3)

    def test_create_dangerous_good_normal_user_denied(self):
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('dangerousgood-list')
        payload = {"un_number": "UN3077", "proper_shipping_name": "FAIL TEST", "hazard_class": "9"}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_compatibility_check_endpoint(self):
        self.client.force_authenticate(user=self.normal_user)
        # Create a rule for testing
        SegregationRule.objects.create(
            rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
            primary_hazard_class="3", 
            secondary_hazard_class="2.1",
            compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED
        )
        url = reverse('segregationrule-check-dg-item-compatibility') # Note: Corrected action name
        payload = {"un_number1": "UN1203", "un_number2": "UN1950"} # Gasoline (3) vs Aerosols (2.1)
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['compatible'])

    def test_lookup_by_synonym_endpoint(self):
        DGProductSynonym.objects.create(dangerous_good=self.dg1, synonym="Petrol")
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('dangerousgood-lookup-by-synonym') + "?query=Petrol"
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['un_number'], 'UN1203')

