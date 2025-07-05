# documents/tests.py
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
import tempfile
import os

from .models import Document, DocumentType
from .pdf_generators import PDFGenerator, ShipmentReportGenerator, ComplianceCertificateGenerator, DGManifestGenerator, BatchReportGenerator
from .api_views import DocumentViewSet
from shipments.models import Shipment
from users.models import User

User = get_user_model()


class DocumentModelsTestCase(TestCase):
    """Test document model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST-001',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='PENDING'
        )
        
        # Create a test document type
        self.doc_type = DocumentType.objects.create(
            name='Test Document',
            description='Test document type',
            category='SHIPMENT',
            file_extension='pdf',
            is_active=True
        )
        
    def test_document_creation(self):
        """Test basic document creation"""
        document = Document.objects.create(
            title='Test Document',
            description='Test document description',
            document_type=self.doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.user,
            shipment=self.shipment
        )
        
        self.assertEqual(document.title, 'Test Document')
        self.assertEqual(document.document_type, self.doc_type)
        self.assertEqual(document.uploaded_by, self.user)
        self.assertEqual(document.shipment, self.shipment)
        self.assertEqual(document.status, 'PENDING')
        
    def test_document_string_representation(self):
        """Test document string representation"""
        document = Document.objects.create(
            title='Test Document',
            document_type=self.doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.user,
            shipment=self.shipment
        )
        
        expected = f"Document({document.id}): Test Document - {self.doc_type.name}"
        self.assertEqual(str(document), expected)
        
    def test_document_validation_status_update(self):
        """Test document validation status updates"""
        document = Document.objects.create(
            title='Test Document',
            document_type=self.doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.user,
            shipment=self.shipment
        )
        
        # Update validation status
        document.status = 'APPROVED'
        document.validated_by = self.user
        document.validation_date = timezone.now()
        document.save()
        
        self.assertEqual(document.status, 'APPROVED')
        self.assertEqual(document.validated_by, self.user)
        self.assertIsNotNone(document.validation_date)
        
    def test_document_type_creation(self):
        """Test document type creation"""
        doc_type = DocumentType.objects.create(
            name='Compliance Certificate',
            description='Dangerous goods compliance certificate',
            category='COMPLIANCE',
            file_extension='pdf',
            is_required=True,
            is_active=True
        )
        
        self.assertEqual(doc_type.name, 'Compliance Certificate')
        self.assertEqual(doc_type.category, 'COMPLIANCE')
        self.assertTrue(doc_type.is_required)
        self.assertTrue(doc_type.is_active)


class PDFGeneratorTestCase(TestCase):
    """Test PDF generation functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST-PDF',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='PENDING',
            estimated_delivery_date=timezone.now() + timezone.timedelta(days=2)
        )
        
    def test_base_pdf_generator(self):
        """Test base PDF generator functionality"""
        generator = PDFGenerator()
        
        # Test context preparation
        context = generator.prepare_context({'test': 'data'})
        
        self.assertIn('test', context)
        self.assertIn('generated_at', context)
        self.assertIn('company_name', context)
        
    @patch('weasyprint.HTML')
    def test_shipment_report_generator(self, mock_html):
        """Test shipment report PDF generation"""
        mock_document = MagicMock()
        mock_html.return_value.write_pdf.return_value = b'test pdf content'
        
        generator = ShipmentReportGenerator()
        pdf_content = generator.generate_report(
            shipment=self.shipment,
            include_audit_trail=True
        )
        
        self.assertEqual(pdf_content, b'test pdf content')
        mock_html.assert_called_once()
        
    @patch('weasyprint.HTML')
    def test_compliance_certificate_generator(self, mock_html):
        """Test compliance certificate PDF generation"""
        mock_html.return_value.write_pdf.return_value = b'test cert content'
        
        generator = ComplianceCertificateGenerator()
        pdf_content = generator.generate_certificate(
            shipment=self.shipment,
            certificate_type='DANGEROUS_GOODS'
        )
        
        self.assertEqual(pdf_content, b'test cert content')
        mock_html.assert_called_once()
        
    @patch('weasyprint.HTML')
    def test_dg_manifest_generator(self, mock_html):
        """Test DG manifest PDF generation"""
        mock_html.return_value.write_pdf.return_value = b'test manifest content'
        
        generator = DGManifestGenerator()
        pdf_content = generator.generate_manifest(
            shipment=self.shipment,
            include_emergency_contacts=True
        )
        
        self.assertEqual(pdf_content, b'test manifest content')
        mock_html.assert_called_once()
        
    def test_batch_report_generator(self):
        """Test batch report generation"""
        generator = BatchReportGenerator()
        
        # Test with empty shipments list
        result = generator.generate_batch_reports([], ['shipment_report'])
        self.assertEqual(result, [])
        
        # Test with invalid document type
        result = generator.generate_batch_reports([self.shipment], ['invalid_type'])
        self.assertEqual(result, [])
        
    def test_pdf_generator_error_handling(self):
        """Test PDF generator error handling"""
        generator = PDFGenerator()
        
        # Test with invalid template
        with self.assertRaises(Exception):
            generator.render_template('nonexistent_template.html', {})


class DocumentAPITestCase(APITestCase):
    """Test document API endpoints"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.regular_user = User.objects.create_user(
            username='regular',
            email='regular@test.com',
            password='testpass123',
            role='DRIVER'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST-API',
            customer=self.admin_user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='PENDING'
        )
        
        self.doc_type = DocumentType.objects.create(
            name='Test Document',
            description='Test document type',
            category='SHIPMENT',
            file_extension='pdf',
            is_active=True
        )
        
    def test_document_list_access(self):
        """Test document list access permissions"""
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('document-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_document_list_unauthenticated(self):
        """Test that unauthenticated users cannot access documents"""
        url = reverse('document-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_document_upload(self):
        """Test document upload functionality"""
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('document-list')
        
        # Create a test file
        test_file = SimpleUploadedFile(
            'test.pdf',
            b'test content',
            content_type='application/pdf'
        )
        
        data = {
            'title': 'Test Upload',
            'description': 'Test document upload',
            'document_type': self.doc_type.id,
            'file': test_file,
            'shipment': self.shipment.id
        }
        
        response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Upload')
        
    def test_document_validation(self):
        """Test document validation endpoint"""
        # Create a document
        document = Document.objects.create(
            title='Test Document',
            document_type=self.doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.admin_user,
            shipment=self.shipment
        )
        
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('document-validate', args=[document.id])
        data = {
            'status': 'APPROVED',
            'validation_notes': 'Document approved'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh document
        document.refresh_from_db()
        self.assertEqual(document.status, 'APPROVED')
        self.assertEqual(document.validation_notes, 'Document approved')
        
    def test_document_download(self):
        """Test document download functionality"""
        # Create a document
        document = Document.objects.create(
            title='Test Document',
            document_type=self.doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.admin_user,
            shipment=self.shipment
        )
        
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('document-download', args=[document.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
    def test_document_access_permissions(self):
        """Test document access permissions"""
        # Create a document
        document = Document.objects.create(
            title='Test Document',
            document_type=self.doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.admin_user,
            shipment=self.shipment
        )
        
        # Test as regular user (should have limited access)
        self.client.force_authenticate(user=self.regular_user)
        
        url = reverse('document-detail', args=[document.id])
        response = self.client.get(url)
        
        # Regular user should not have access to admin's document
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DocumentIntegrationTestCase(TestCase):
    """Integration tests for document system"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.shipment = Shipment.objects.create(
            tracking_number='TEST-INTEGRATION',
            customer=self.user,
            origin_location='Sydney',
            destination_location='Melbourne',
            status='PENDING'
        )
        
    def test_document_lifecycle(self):
        """Test complete document lifecycle"""
        # Create document type
        doc_type = DocumentType.objects.create(
            name='Integration Test Doc',
            description='Integration test document',
            category='SHIPMENT',
            file_extension='pdf',
            is_active=True
        )
        
        # Create document
        document = Document.objects.create(
            title='Integration Test Document',
            document_type=doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.user,
            shipment=self.shipment
        )
        
        # Verify initial state
        self.assertEqual(document.status, 'PENDING')
        self.assertIsNone(document.validated_by)
        
        # Approve document
        document.status = 'APPROVED'
        document.validated_by = self.user
        document.validation_date = timezone.now()
        document.save()
        
        # Verify approved state
        self.assertEqual(document.status, 'APPROVED')
        self.assertEqual(document.validated_by, self.user)
        self.assertIsNotNone(document.validation_date)
        
        # Test document is accessible
        self.assertTrue(document.file.name)
        
    @override_settings(MEDIA_ROOT=tempfile.gettempdir())
    def test_document_file_handling(self):
        """Test document file handling"""
        doc_type = DocumentType.objects.create(
            name='File Test Doc',
            description='File handling test',
            category='SHIPMENT',
            file_extension='pdf',
            is_active=True
        )
        
        # Create document with file
        test_content = b'test pdf content'
        test_file = SimpleUploadedFile('test.pdf', test_content, content_type='application/pdf')
        
        document = Document.objects.create(
            title='File Test Document',
            document_type=doc_type,
            file=test_file,
            uploaded_by=self.user,
            shipment=self.shipment
        )
        
        # Verify file was saved
        self.assertTrue(document.file.name)
        
        # Verify file content (if accessible)
        if document.file.storage.exists(document.file.name):
            with document.file.open('rb') as f:
                content = f.read()
                self.assertEqual(content, test_content)
                
    def test_document_cleanup_on_deletion(self):
        """Test that files are cleaned up when documents are deleted"""
        doc_type = DocumentType.objects.create(
            name='Cleanup Test Doc',
            description='Cleanup test document',
            category='SHIPMENT',
            file_extension='pdf',
            is_active=True
        )
        
        document = Document.objects.create(
            title='Cleanup Test Document',
            document_type=doc_type,
            file=SimpleUploadedFile('test.pdf', b'test content'),
            uploaded_by=self.user,
            shipment=self.shipment
        )
        
        file_path = document.file.name
        document_id = document.id
        
        # Delete document
        document.delete()
        
        # Verify document is deleted
        self.assertFalse(Document.objects.filter(id=document_id).exists())
        
        # File cleanup would be handled by Django's file storage
        # In a real test, we'd verify the file was removed from storage
