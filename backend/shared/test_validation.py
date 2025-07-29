# shared/test_validation.py
"""
Comprehensive test suite for SafeShipper validation service.
Tests dangerous goods specific validation and enhanced security measures.
"""

import unittest
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from rest_framework import serializers
from .validation_service import SafeShipperValidationMixin, EnhancedValidationService


class TestSafeShipperValidationMixin(TestCase):
    """Test the SafeShipperValidationMixin methods"""
    
    def setUp(self):
        # Create a test serializer class that uses the mixin
        class TestSerializer(SafeShipperValidationMixin, serializers.Serializer):
            pass
        
        self.validator = TestSerializer()
    
    def test_validate_un_number_valid(self):
        """Test valid UN number formats"""
        valid_un_numbers = ['UN1203', 'UN0001', 'UN3600', 'un1234', '  UN2345  ']
        
        for un_number in valid_un_numbers:
            with self.subTest(un_number=un_number):
                result = self.validator.validate_un_number(un_number)
                self.assertTrue(result.startswith('UN'))
                self.assertEqual(len(result), 6)
    
    def test_validate_un_number_invalid(self):
        """Test invalid UN number formats"""
        invalid_un_numbers = [
            'UN12345',  # Too many digits
            'UN123',    # Too few digits
            'UN0000',   # Out of range
            'UN3601',   # Out of range
            'ABC1234',  # Wrong prefix
            '1234',     # No prefix
            None,       # None value
            123,        # Not a string
        ]
        
        for un_number in invalid_un_numbers:
            with self.subTest(un_number=un_number):
                if un_number is None:
                    # None should return None
                    result = self.validator.validate_un_number(un_number)
                    self.assertIsNone(result)
                else:
                    with self.assertRaises(serializers.ValidationError):
                        self.validator.validate_un_number(un_number)
    
    def test_validate_hazard_class_valid(self):
        """Test valid hazard class formats"""
        valid_classes = ['1', '1.1', '1.2', '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '6.2', '7', '8', '9']
        
        for hazard_class in valid_classes:
            with self.subTest(hazard_class=hazard_class):
                result = self.validator.validate_hazard_class(hazard_class)
                self.assertEqual(result, hazard_class)
    
    def test_validate_hazard_class_invalid(self):
        """Test invalid hazard class formats"""
        invalid_classes = ['10', '1.7', '2.4', 'A', '1.1.1', '', None]
        
        for hazard_class in invalid_classes:
            with self.subTest(hazard_class=hazard_class):
                if hazard_class is None:
                    result = self.validator.validate_hazard_class(hazard_class)
                    self.assertIsNone(result)
                else:
                    with self.assertRaises(serializers.ValidationError):
                        self.validator.validate_hazard_class(hazard_class)
    
    def test_validate_packing_group_valid(self):
        """Test valid packing group formats"""
        valid_groups = ['I', 'II', 'III', 'i', 'ii', 'iii', '  I  ']
        
        for packing_group in valid_groups:
            with self.subTest(packing_group=packing_group):
                result = self.validator.validate_packing_group(packing_group)
                self.assertIn(result, ['I', 'II', 'III'])
    
    def test_validate_weight_kg_valid(self):
        """Test valid weight values"""
        valid_weights = [0, 1.5, 100, 5000.99, '250.5', Decimal('1000.00')]
        
        for weight in valid_weights:
            with self.subTest(weight=weight):
                result = self.validator.validate_weight_kg(weight)
                self.assertIsInstance(result, float)
                self.assertGreaterEqual(result, 0)
    
    def test_validate_weight_kg_invalid(self):
        """Test invalid weight values"""
        invalid_weights = [-1, 50001, 'abc', '100.123']  # Negative, too large, non-numeric, too precise
        
        for weight in invalid_weights:
            with self.subTest(weight=weight):
                with self.assertRaises(serializers.ValidationError):
                    self.validator.validate_weight_kg(weight)
    
    def test_validate_phone_number_valid(self):
        """Test valid phone number formats"""
        valid_numbers = ['+61412345678', '+1234567890', '+44123456789']
        
        for phone in valid_numbers:
            with self.subTest(phone=phone):
                result = self.validator.validate_phone_number(phone)
                self.assertTrue(result.startswith('+'))
    
    def test_validate_phone_number_invalid(self):
        """Test invalid phone number formats"""
        invalid_numbers = ['123456789', 'abc123', '+', '123-456-7890']
        
        for phone in invalid_numbers:
            with self.subTest(phone=phone):
                with self.assertRaises(serializers.ValidationError):
                    self.validator.validate_phone_number(phone)
    
    def test_validate_email_address_valid(self):
        """Test valid email addresses"""
        valid_emails = ['user@example.com', 'test.user@company.org', 'driver@safeshipper.com']
        
        for email in valid_emails:
            with self.subTest(email=email):
                result = self.validator.validate_email_address(email)
                self.assertEqual(result, email.lower().strip())
    
    def test_validate_email_address_invalid(self):
        """Test invalid email addresses including disposable domains"""
        invalid_emails = [
            'invalid-email',
            'user@',
            '@domain.com',
            'user@10minutemail.com',  # Blocked disposable domain
            'test@guerrillamail.com',  # Blocked disposable domain
        ]
        
        for email in invalid_emails:
            with self.subTest(email=email):
                with self.assertRaises(serializers.ValidationError):
                    self.validator.validate_email_address(email)
    
    def test_validate_text_content_sanitization(self):
        """Test text content sanitization"""
        # Test HTML removal when not allowed
        dangerous_content = '<script>alert("xss")</script>Hello World'
        result = self.validator.validate_text_content(dangerous_content, allow_html=False)
        self.assertEqual(result, 'Hello World')
        
        # Test HTML allowed but sanitized
        html_content = '<p>Safe content</p><script>alert("xss")</script>'
        result = self.validator.validate_text_content(html_content, allow_html=True)
        self.assertIn('<p>Safe content</p>', result)
        self.assertNotIn('<script>', result)
    
    def test_validate_temperature_celsius(self):
        """Test temperature validation for dangerous goods"""
        # Valid temperatures
        valid_temps = [-50, 0, 25.5, 200, 1000]
        for temp in valid_temps:
            with self.subTest(temp=temp):
                result = self.validator.validate_temperature_celsius(temp)
                self.assertEqual(result, float(temp))
        
        # Invalid temperatures
        invalid_temps = [-300, 2500, 'hot', None]  # Below absolute zero, too high, non-numeric
        for temp in invalid_temps:
            with self.subTest(temp=temp):
                if temp is None:
                    result = self.validator.validate_temperature_celsius(temp)
                    self.assertIsNone(result)
                else:
                    with self.assertRaises(serializers.ValidationError):
                        self.validator.validate_temperature_celsius(temp)
    
    def test_validate_ph_value(self):
        """Test pH value validation"""
        # Valid pH values
        valid_ph = [0, 7, 14, 1.5, 12.8]
        for ph in valid_ph:
            with self.subTest(ph=ph):
                result = self.validator.validate_ph_value(ph)
                self.assertEqual(result, float(ph))
        
        # Invalid pH values
        invalid_ph = [-1, 15, 'acidic', None]
        for ph in invalid_ph:
            with self.subTest(ph=ph):
                if ph is None:
                    result = self.validator.validate_ph_value(ph)
                    self.assertIsNone(result)
                else:
                    with self.assertRaises(serializers.ValidationError):
                        self.validator.validate_ph_value(ph)


class TestEnhancedValidationService(TestCase):
    """Test the EnhancedValidationService methods"""
    
    def test_validate_dangerous_goods_shipment_valid(self):
        """Test valid dangerous goods shipment validation"""
        valid_shipment = {
            'customer': 'Test Customer',
            'origin_location': 'Sydney',
            'destination_location': 'Melbourne',
            'estimated_pickup_date': '2024-12-01',
            'estimated_delivery_date': '2024-12-02',
            'items': [
                {
                    'is_dangerous_good': True,
                    'quantity': 10,
                    'dangerous_good_entry': {
                        'un_number': 'UN1203',
                        'proper_shipping_name': 'Gasoline',
                        'hazard_class': '3',
                        'packing_group': 'II'
                    }
                }
            ]
        }
        
        result = EnhancedValidationService.validate_dangerous_goods_shipment(valid_shipment)
        self.assertTrue(result['is_valid'])
        self.assertEqual(len(result['errors']), 0)
    
    def test_validate_dangerous_goods_shipment_invalid(self):
        """Test invalid dangerous goods shipment validation"""
        invalid_shipment = {
            # Missing required fields
            'items': [
                {
                    'is_dangerous_good': True,
                    'quantity': 10,
                    'dangerous_good_entry': {
                        # Missing required fields
                        'un_number': 'UN1203'
                    }
                }
            ]
        }
        
        result = EnhancedValidationService.validate_dangerous_goods_shipment(invalid_shipment)
        self.assertFalse(result['is_valid'])
        self.assertGreater(len(result['errors']), 0)
    
    def test_dangerous_goods_compatibility_check(self):
        """Test dangerous goods compatibility checking"""
        # Test incompatible combination (explosives with flammables)
        incompatible_items = [
            {
                'is_dangerous_good': True,
                'dangerous_good_entry': {'hazard_class': '1.1'}
            },
            {
                'is_dangerous_good': True,
                'dangerous_good_entry': {'hazard_class': '3'}
            }
        ]
        
        result = EnhancedValidationService._check_dg_compatibility(incompatible_items)
        self.assertFalse(result['is_compatible'])
        self.assertGreater(len(result['conflicts']), 0)
        
        # Test compatible combination
        compatible_items = [
            {
                'is_dangerous_good': True,
                'dangerous_good_entry': {'hazard_class': '3'}
            },
            {
                'is_dangerous_good': True,
                'dangerous_good_entry': {'hazard_class': '8'}
            }
        ]
        
        result = EnhancedValidationService._check_dg_compatibility(compatible_items)
        self.assertTrue(result['is_compatible'])
        self.assertEqual(len(result['conflicts']), 0)
    
    def test_packaging_validation_warnings(self):
        """Test packaging validation warnings"""
        # Test Packing Group I item (should generate warning)
        pg1_items = [
            {
                'is_dangerous_good': True,
                'dangerous_good_entry': {
                    'hazard_class': '3',
                    'packing_group': 'I'
                }
            }
        ]
        
        result = EnhancedValidationService._validate_packaging(pg1_items)
        self.assertTrue(result['is_valid'])
        self.assertGreater(len(result['warnings']), 0)
        self.assertIn('Packing Group I', result['warnings'][0])
        
        # Test explosive items (should generate warning)
        explosive_items = [
            {
                'is_dangerous_good': True,
                'dangerous_good_entry': {
                    'hazard_class': '1.1',
                    'packing_group': 'II'
                }
            }
        ]
        
        result = EnhancedValidationService._validate_packaging(explosive_items)
        self.assertTrue(result['is_valid'])
        self.assertGreater(len(result['warnings']), 0)
        self.assertIn('Explosives require', result['warnings'][0])


class TestDangerousGoodsScenarios(TestCase):
    """Test specific dangerous goods transportation scenarios"""
    
    def setUp(self):
        class TestSerializer(SafeShipperValidationMixin, serializers.Serializer):
            pass
        self.validator = TestSerializer()
    
    def test_gasoline_shipment_validation(self):
        """Test validation for gasoline (UN1203) shipment"""
        gasoline_data = {
            'customer': 'Fuel Depot Pty Ltd',
            'origin_location': 'Brisbane',
            'destination_location': 'Gold Coast',
            'estimated_pickup_date': '2024-12-01',
            'estimated_delivery_date': '2024-12-01',
            'items': [
                {
                    'is_dangerous_good': True,
                    'quantity': 1,
                    'dangerous_good_entry': {
                        'un_number': 'UN1203',
                        'proper_shipping_name': 'Gasoline',
                        'hazard_class': '3',
                        'packing_group': 'II'
                    }
                }
            ]
        }
        
        result = EnhancedValidationService.validate_dangerous_goods_shipment(gasoline_data)
        self.assertTrue(result['is_valid'])
    
    def test_corrosive_material_validation(self):
        """Test validation for corrosive materials (Class 8)"""
        corrosive_data = {
            'customer': 'Chemical Company Ltd',
            'origin_location': 'Perth',
            'destination_location': 'Fremantle',
            'estimated_pickup_date': '2024-12-01',
            'estimated_delivery_date': '2024-12-02',
            'items': [
                {
                    'is_dangerous_good': True,
                    'quantity': 5,
                    'dangerous_good_entry': {
                        'un_number': 'UN1789',
                        'proper_shipping_name': 'Hydrochloric acid',
                        'hazard_class': '8',
                        'packing_group': 'II'
                    }
                }
            ]
        }
        
        result = EnhancedValidationService.validate_dangerous_goods_shipment(corrosive_data)
        self.assertTrue(result['is_valid'])
    
    def test_mixed_dangerous_goods_validation(self):
        """Test validation for mixed dangerous goods shipment"""
        mixed_dg_data = {
            'customer': 'Mixed Chemicals Inc',
            'origin_location': 'Adelaide',            'destination_location': 'Mount Gambier',
            'estimated_pickup_date': '2024-12-01',
            'estimated_delivery_date': '2024-12-03',
            'items': [
                {
                    'is_dangerous_good': True,
                    'quantity': 2,
                    'dangerous_good_entry': {
                        'un_number': 'UN1203',
                        'proper_shipping_name': 'Gasoline',
                        'hazard_class': '3',
                        'packing_group': 'II'
                    }
                },
                {
                    'is_dangerous_good': True,
                    'quantity': 1,
                    'dangerous_good_entry': {
                        'un_number': 'UN1789',
                        'proper_shipping_name': 'Hydrochloric acid',
                        'hazard_class': '8',
                        'packing_group': 'II'
                    }
                }
            ]
        }
        
        # This should be valid as Class 3 and Class 8 are generally compatible
        result = EnhancedValidationService.validate_dangerous_goods_shipment(mixed_dg_data)
        self.assertTrue(result['is_valid'])
    
    def test_incompatible_dangerous_goods_validation(self):
        """Test validation for incompatible dangerous goods combination"""
        incompatible_data = {
            'customer': 'Dangerous Mix Co',
            'origin_location': 'Darwin',
            'destination_location': 'Katherine',
            'estimated_pickup_date': '2024-12-01',
            'estimated_delivery_date': '2024-12-02',
            'items': [
                {
                    'is_dangerous_good': True,
                    'quantity': 1,
                    'dangerous_good_entry': {
                        'un_number': 'UN0081',
                        'proper_shipping_name': 'Explosive, blasting, type A',
                        'hazard_class': '1.1',
                        'packing_group': 'II'
                    }
                },
                {
                    'is_dangerous_good': True,
                    'quantity': 1,
                    'dangerous_good_entry': {
                        'un_number': 'UN1203',
                        'proper_shipping_name': 'Gasoline',
                        'hazard_class': '3',
                        'packing_group': 'II'
                    }
                }
            ]
        }
        
        # This should be invalid as explosives and flammables are incompatible
        result = EnhancedValidationService.validate_dangerous_goods_shipment(incompatible_data)
        self.assertFalse(result['is_valid'])
        self.assertGreater(len(result['errors']), 0)
        self.assertIn('Incompatible hazard classes', result['errors'][0])


if __name__ == '__main__':
    unittest.main()