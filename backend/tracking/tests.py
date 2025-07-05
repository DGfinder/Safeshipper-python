# tracking/tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
import json

from .api_views import PublicShipmentTrackingView, PublicDocumentDownloadView, PublicDeliveryTimelineView
from .models import TrackingEvent, DeliveryProof
from shipments.models import Shipment
from documents.models import Document, DocumentType
from communications.models import Communication
from users.models import User

User = get_user_model()


class TrackingModelsTestCase(TestCase):
    """Test tracking model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST-TRACKING-001',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='PENDING'
        )
        
    def test_tracking_event_creation(self):
        """Test basic tracking event creation"""
        event = TrackingEvent.objects.create(
            shipment=self.shipment,
            status='IN_TRANSIT',
            description='Shipment departed from origin facility',
            location='Sydney Depot',
            timestamp=timezone.now()
        )
        
        self.assertEqual(event.shipment, self.shipment)
        self.assertEqual(event.status, 'IN_TRANSIT')
        self.assertEqual(event.location, 'Sydney Depot')
        
    def test_tracking_event_string_representation(self):
        """Test tracking event string representation"""
        event = TrackingEvent.objects.create(
            shipment=self.shipment,
            status='DELIVERED',
            description='Package delivered',
            location='Melbourne',
            timestamp=timezone.now()
        )
        
        expected = f"TrackingEvent: {self.shipment.tracking_number} - DELIVERED"
        self.assertEqual(str(event), expected)
        
    def test_delivery_proof_creation(self):
        """Test delivery proof creation"""
        proof = DeliveryProof.objects.create(
            shipment=self.shipment,
            delivery_date=timezone.now(),
            recipient_name='John Doe',
            delivered_by='Driver Smith',
            delivery_notes='Left at front door'
        )
        
        self.assertEqual(proof.shipment, self.shipment)
        self.assertEqual(proof.recipient_name, 'John Doe')
        self.assertEqual(proof.delivered_by, 'Driver Smith')
        self.assertEqual(proof.delivery_notes, 'Left at front door')
        
    def test_delivery_proof_string_representation(self):
        """Test delivery proof string representation"""
        proof = DeliveryProof.objects.create(
            shipment=self.shipment,
            delivery_date=timezone.now(),
            delivered_by='Driver Smith'
        )
        
        expected = f"DeliveryProof: {self.shipment.tracking_number} - Driver Smith"
        self.assertEqual(str(proof), expected)


class PublicTrackingAPITestCase(APITestCase):
    """Test public tracking API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='PUB-TRACK-001',
            customer=self.user,
            origin_location='Sydney, NSW',
            destination_location='Melbourne, VIC',
            status='IN_TRANSIT',
            estimated_delivery_date=timezone.now() + timezone.timedelta(days=2)
        )
        
        # Create tracking events
        self.tracking_events = [
            TrackingEvent.objects.create(
                shipment=self.shipment,
                status='PENDING',
                description='Shipment created',
                location='Sydney',
                timestamp=timezone.now() - timezone.timedelta(hours=48)
            ),
            TrackingEvent.objects.create(
                shipment=self.shipment,
                status='IN_TRANSIT',
                description='Package in transit',
                location='Sydney Depot',
                timestamp=timezone.now() - timezone.timedelta(hours=24)
            )
        ]
        
        # Create document type and document
        self.doc_type = DocumentType.objects.create(
            name='Shipment Manifest',
            description='Shipment manifest document',
            category='SHIPMENT',
            file_extension='pdf',
            is_active=True
        )
        
        self.document = Document.objects.create(
            title='Shipment Manifest',
            document_type=self.doc_type,
            shipment=self.shipment,
            uploaded_by=self.user,
            status='APPROVED'
        )
        
        # Create communication
        self.communication = Communication.objects.create(
            shipment=self.shipment,
            type='STATUS_UPDATE',
            subject='Shipment Update',
            message='Your shipment is on its way',
            sender='SafeShipper Team',
            sent_at=timezone.now() - timezone.timedelta(hours=12),
            is_customer_visible=True
        )
        
    def test_public_shipment_tracking_success(self):
        """Test successful public shipment tracking"""
        url = reverse('public-shipment-tracking', args=[self.shipment.tracking_number])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response data structure
        data = response.data
        self.assertEqual(data['tracking_number'], self.shipment.tracking_number)
        self.assertEqual(data['status'], 'IN_TRANSIT')
        self.assertEqual(data['origin_location'], 'Sydney, NSW')
        self.assertEqual(data['destination_location'], 'Melbourne, VIC')
        
        # Check status timeline
        self.assertIn('status_timeline', data)
        self.assertEqual(len(data['status_timeline']), 2)
        
        # Check documents
        self.assertIn('documents', data)
        self.assertEqual(len(data['documents']), 1)
        self.assertEqual(data['documents'][0]['type_display'], self.doc_type.name)
        
        # Check communications
        self.assertIn('communications', data)
        self.assertEqual(len(data['communications']), 1)
        self.assertEqual(data['communications'][0]['subject'], 'Shipment Update')
        
    def test_public_shipment_tracking_not_found(self):
        """Test public tracking with invalid tracking number"""
        url = reverse('public-shipment-tracking', args=['INVALID-TRACKING'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        
    def test_public_shipment_tracking_no_auth_required(self):
        """Test that public tracking doesn't require authentication"""
        # Ensure no authentication is set
        self.client.force_authenticate(user=None)
        
        url = reverse('public-shipment-tracking', args=[self.shipment.tracking_number])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_public_tracking_data_minimization(self):
        """Test that sensitive data is not exposed in public tracking"""
        url = reverse('public-shipment-tracking', args=[self.shipment.tracking_number])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that sensitive customer data is not exposed
        data = response.data
        self.assertNotIn('customer_email', data)
        self.assertNotIn('customer_phone', data)
        
        # Check that internal notes are not exposed
        if 'communications' in data:
            for comm in data['communications']:
                self.assertTrue(comm.get('is_customer_visible', True))
                
    def test_public_tracking_with_delivery_proof(self):
        """Test public tracking for delivered shipment with proof of delivery"""
        # Update shipment to delivered
        self.shipment.status = 'DELIVERED'
        self.shipment.save()
        
        # Create delivery proof
        delivery_proof = DeliveryProof.objects.create(
            shipment=self.shipment,
            delivery_date=timezone.now(),
            recipient_name='John Customer',
            delivered_by='Driver Smith',
            delivery_notes='Package delivered to front door'
        )
        
        url = reverse('public-shipment-tracking', args=[self.shipment.tracking_number])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check proof of delivery is included
        data = response.data
        self.assertIn('proof_of_delivery', data)
        
        pod = data['proof_of_delivery']
        self.assertEqual(pod['recipient_name'], 'John Customer')
        self.assertEqual(pod['delivered_by'], 'Driver Smith')
        self.assertEqual(pod['delivery_notes'], 'Package delivered to front door')
        
    def test_public_tracking_items_summary(self):
        """Test that items summary is included in public tracking"""
        url = reverse('public-shipment-tracking', args=[self.shipment.tracking_number])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertIn('items_summary', data)
        
        items_summary = data['items_summary']
        self.assertIn('total_items', items_summary)
        self.assertIn('total_weight_kg', items_summary)
        self.assertIn('has_dangerous_goods', items_summary)
        self.assertIn('dangerous_goods_count', items_summary)


class PublicDocumentDownloadTestCase(APITestCase):
    """Test public document download functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='DOC-TEST-001',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='DELIVERED'
        )
        
        self.doc_type = DocumentType.objects.create(
            name='Public Document',
            description='Publicly accessible document',
            category='SHIPMENT',
            file_extension='pdf',
            is_active=True
        )
        
        self.public_document = Document.objects.create(
            title='Public Test Document',
            document_type=self.doc_type,
            shipment=self.shipment,
            uploaded_by=self.user,
            status='APPROVED',
            is_public=True
        )
        
        self.private_document = Document.objects.create(
            title='Private Test Document',
            document_type=self.doc_type,
            shipment=self.shipment,
            uploaded_by=self.user,
            status='APPROVED',
            is_public=False
        )
        
    def test_public_document_download_success(self):
        """Test successful public document download"""
        url = reverse('public-document-download', args=[
            self.shipment.tracking_number,
            self.public_document.id
        ])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
    def test_private_document_download_forbidden(self):
        """Test that private documents cannot be downloaded publicly"""
        url = reverse('public-document-download', args=[
            self.shipment.tracking_number,
            self.private_document.id
        ])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_document_download_invalid_tracking(self):
        """Test document download with invalid tracking number"""
        url = reverse('public-document-download', args=[
            'INVALID-TRACKING',
            self.public_document.id
        ])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_document_download_no_auth_required(self):
        """Test that public document download doesn't require authentication"""
        self.client.force_authenticate(user=None)
        
        url = reverse('public-document-download', args=[
            self.shipment.tracking_number,
            self.public_document.id
        ])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class PublicDeliveryTimelineTestCase(APITestCase):
    """Test public delivery timeline functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TIMELINE-001',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='DELIVERED'
        )
        
        # Create detailed tracking events
        self.events = [
            TrackingEvent.objects.create(
                shipment=self.shipment,
                status='PENDING',
                description='Shipment created and waiting for pickup',
                location='Sydney Warehouse',
                timestamp=timezone.now() - timezone.timedelta(days=3)
            ),
            TrackingEvent.objects.create(
                shipment=self.shipment,
                status='IN_TRANSIT',
                description='Package collected and in transit',
                location='Sydney Depot',
                timestamp=timezone.now() - timezone.timedelta(days=2)
            ),
            TrackingEvent.objects.create(
                shipment=self.shipment,
                status='OUT_FOR_DELIVERY',
                description='Out for delivery to destination',
                location='Melbourne Depot',
                timestamp=timezone.now() - timezone.timedelta(hours=4)
            ),
            TrackingEvent.objects.create(
                shipment=self.shipment,
                status='DELIVERED',
                description='Package delivered successfully',
                location='123 Customer Street, Melbourne',
                timestamp=timezone.now() - timezone.timedelta(hours=1)
            )
        ]
        
    def test_public_delivery_timeline_success(self):
        """Test successful delivery timeline retrieval"""
        url = reverse('public-delivery-timeline', args=[self.shipment.tracking_number])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check timeline data
        data = response.data
        self.assertIn('tracking_number', data)
        self.assertIn('timeline', data)
        self.assertIn('summary', data)
        
        # Check timeline events
        timeline = data['timeline']
        self.assertEqual(len(timeline), 4)
        
        # Check events are in chronological order
        for i in range(1, len(timeline)):
            self.assertGreaterEqual(
                timeline[i]['timestamp'],
                timeline[i-1]['timestamp']
            )
            
    def test_public_delivery_timeline_not_found(self):
        """Test timeline with invalid tracking number"""
        url = reverse('public-delivery-timeline', args=['INVALID-TRACKING'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_public_delivery_timeline_summary(self):
        """Test that timeline includes useful summary information"""
        url = reverse('public-delivery-timeline', args=[self.shipment.tracking_number])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        summary = data['summary']
        
        self.assertIn('total_events', summary)
        self.assertIn('delivery_status', summary)
        self.assertIn('estimated_delivery', summary)
        self.assertIn('actual_delivery', summary)
        
        self.assertEqual(summary['total_events'], 4)
        self.assertEqual(summary['delivery_status'], 'DELIVERED')


class TrackingIntegrationTestCase(TestCase):
    """Integration tests for tracking system"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='integration_user',
            email='integration@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
    def test_complete_tracking_workflow(self):
        """Test complete tracking workflow from creation to delivery"""
        # Create shipment
        shipment = Shipment.objects.create(
            tracking_number='INTEGRATION-WORKFLOW',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='PENDING'
        )
        
        # Create tracking events in sequence
        events = [
            ('PENDING', 'Shipment created'),
            ('READY_FOR_DISPATCH', 'Ready for pickup'),
            ('IN_TRANSIT', 'Package collected'),
            ('OUT_FOR_DELIVERY', 'Out for delivery'),
            ('DELIVERED', 'Package delivered')
        ]
        
        tracking_events = []
        for i, (status, description) in enumerate(events):
            event = TrackingEvent.objects.create(
                shipment=shipment,
                status=status,
                description=description,
                location=f'Location {i+1}',
                timestamp=timezone.now() - timezone.timedelta(hours=24-i*4)
            )
            tracking_events.append(event)
            
        # Update shipment status to final
        shipment.status = 'DELIVERED'
        shipment.save()
        
        # Create delivery proof
        delivery_proof = DeliveryProof.objects.create(
            shipment=shipment,
            delivery_date=timezone.now(),
            recipient_name='Test Customer',
            delivered_by='Test Driver'
        )
        
        # Verify tracking events
        events = TrackingEvent.objects.filter(shipment=shipment).order_by('timestamp')
        self.assertEqual(events.count(), 5)
        self.assertEqual(events.last().status, 'DELIVERED')
        
        # Verify delivery proof
        self.assertEqual(delivery_proof.shipment, shipment)
        self.assertEqual(delivery_proof.recipient_name, 'Test Customer')
        
    def test_tracking_event_performance(self):
        """Test tracking system performance with multiple events"""
        shipment = Shipment.objects.create(
            tracking_number='PERFORMANCE-TEST',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='IN_TRANSIT'
        )
        
        # Create many tracking events
        events = []
        for i in range(50):
            events.append(TrackingEvent(
                shipment=shipment,
                status='IN_TRANSIT',
                description=f'Event {i}',
                location=f'Location {i}',
                timestamp=timezone.now() - timezone.timedelta(minutes=i)
            ))
            
        # Bulk create events
        TrackingEvent.objects.bulk_create(events)
        
        # Test querying performance
        event_count = TrackingEvent.objects.filter(shipment=shipment).count()
        self.assertEqual(event_count, 50)
        
        # Test ordering performance
        latest_events = TrackingEvent.objects.filter(
            shipment=shipment
        ).order_by('-timestamp')[:10]
        
        self.assertEqual(len(latest_events), 10)
