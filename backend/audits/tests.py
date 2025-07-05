# audits/tests.py
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from unittest.mock import patch, MagicMock
import json

from .models import AuditLog, ShipmentAuditLog, ComplianceAuditLog
from .signals import serialize_for_audit
from .middleware import AuditMiddleware
from shipments.models import Shipment
from users.models import User

User = get_user_model()


class AuditModelsTestCase(TestCase):
    """Test audit model functionality"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        self.compliance_user = User.objects.create_user(
            username='compliance',
            email='compliance@test.com',
            password='testpass123',
            role='COMPLIANCE_OFFICER'
        )
        
    def test_audit_log_creation(self):
        """Test basic audit log creation"""
        audit_log = AuditLog.objects.create(
            user=self.admin_user,
            action='CREATE',
            action_description='Test audit log',
            ip_address='192.168.1.1',
            user_agent='Test Agent',
            user_role='ADMIN'
        )
        
        self.assertEqual(audit_log.user, self.admin_user)
        self.assertEqual(audit_log.action, 'CREATE')
        self.assertEqual(audit_log.user_role, 'ADMIN')
        self.assertIsNotNone(audit_log.id)
        self.assertIsNotNone(audit_log.timestamp)
        
    def test_audit_log_string_representation(self):
        """Test audit log string representation"""
        audit_log = AuditLog.objects.create(
            user=self.admin_user,
            action='UPDATE',
            action_description='Updated shipment status',
            user_role='ADMIN'
        )
        
        expected = f"AuditLog({audit_log.id}): admin - UPDATE - Updated shipment status"
        self.assertEqual(str(audit_log), expected)
        
    def test_audit_log_without_user(self):
        """Test audit log creation without user (system action)"""
        audit_log = AuditLog.objects.create(
            action='SYSTEM',
            action_description='System automated action',
            ip_address='127.0.0.1',
            user_role='SYSTEM'
        )
        
        self.assertIsNone(audit_log.user)
        self.assertEqual(audit_log.action, 'SYSTEM')
        self.assertEqual(audit_log.user_role, 'SYSTEM')


class AuditSignalsTestCase(TransactionTestCase):
    """Test audit signal functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
    def test_serialize_for_audit(self):
        """Test serialization function for audit logging"""
        shipment = Shipment.objects.create(
            tracking_number='TEST-SERIALIZE',
            customer=self.user,
            origin_location='Test Origin',
            destination_location='Test Destination',
            status='PENDING'
        )
        
        serialized = serialize_for_audit(shipment)
        
        self.assertIn('tracking_number', serialized)
        self.assertIn('status', serialized)
        self.assertIn('origin_location', serialized)
        self.assertEqual(serialized['tracking_number'], 'TEST-SERIALIZE')
        self.assertEqual(serialized['status'], 'PENDING')


class AuditAPITestCase(APITestCase):
    """Test audit API endpoints"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.compliance_user = User.objects.create_user(
            username='compliance',
            email='compliance@test.com',
            password='testpass123',
            role='COMPLIANCE_OFFICER'
        )
        
        self.regular_user = User.objects.create_user(
            username='regular',
            email='regular@test.com',
            password='testpass123',
            role='DRIVER'
        )
        
        # Create test audit logs
        self.audit_log_1 = AuditLog.objects.create(
            user=self.admin_user,
            action='CREATE',
            action_description='Created test shipment',
            ip_address='192.168.1.1',
            user_role='ADMIN'
        )
        
        self.audit_log_2 = AuditLog.objects.create(
            user=self.regular_user,
            action='VIEW',
            action_description='Viewed shipment details',
            ip_address='192.168.1.2',
            user_role='DRIVER'
        )
        
    def test_audit_logs_list_admin_access(self):
        """Test that admin users can access all audit logs"""
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('audit-logs-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
    def test_audit_logs_list_regular_user_access(self):
        """Test that regular users can only see their own audit logs"""
        self.client.force_authenticate(user=self.regular_user)
        
        url = reverse('audit-logs-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['user']['username'], 'regular')
        
    def test_audit_logs_list_unauthenticated(self):
        """Test that unauthenticated users cannot access audit logs"""
        url = reverse('audit-logs-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
