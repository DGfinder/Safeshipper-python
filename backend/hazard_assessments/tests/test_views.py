"""
Test cases for hazard assessment views and API endpoints.
"""

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock

from ..models import (
    AssessmentTemplate, 
    AssessmentSection, 
    AssessmentQuestion,
    HazardAssessment,
    AssessmentAnswer
)
from core.models import Company

User = get_user_model()


class AssessmentTemplateViewSetTestCase(APITestCase):
    """Test cases for AssessmentTemplate ViewSet."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company,
            role="manager"
        )
        self.client.force_authenticate(user=self.user)
        
        self.template = AssessmentTemplate.objects.create(
            name="Test Template",
            description="Test description",
            company=self.company,
            created_by=self.user
        )
    
    def test_list_templates(self):
        """Test listing assessment templates."""
        url = reverse('assessmenttemplate-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Test Template")
    
    def test_create_template(self):
        """Test creating a new assessment template."""
        url = reverse('assessmenttemplate-list')
        data = {
            'name': 'New Template',
            'description': 'New template description',
            'is_active': True,
            'sections': [
                {
                    'title': 'Vehicle Check',
                    'description': 'Check vehicle safety',
                    'order': 1,
                    'is_required': True,
                    'questions': [
                        {
                            'text': 'Are lights working?',
                            'question_type': 'YES_NO_NA',
                            'order': 1,
                            'is_required': True,
                            'is_photo_required_on_fail': True,
                            'is_comment_required_on_fail': True,
                            'is_critical_failure': False,
                            'help_text': 'Check all vehicle lights'
                        }
                    ]
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Template')
        
        # Verify template was created in database
        template = AssessmentTemplate.objects.get(name='New Template')
        self.assertEqual(template.company, self.company)
        self.assertEqual(template.created_by, self.user)
    
    def test_update_template(self):
        """Test updating an assessment template."""
        url = reverse('assessmenttemplate-detail', kwargs={'pk': self.template.pk})
        data = {
            'name': 'Updated Template',
            'description': 'Updated description'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Template')
        
        # Verify database was updated
        self.template.refresh_from_db()
        self.assertEqual(self.template.name, 'Updated Template')
    
    def test_delete_template(self):
        """Test deleting an assessment template."""
        url = reverse('assessmenttemplate-detail', kwargs={'pk': self.template.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify template was deleted
        with self.assertRaises(AssessmentTemplate.DoesNotExist):
            AssessmentTemplate.objects.get(pk=self.template.pk)
    
    def test_clone_template(self):
        """Test cloning an assessment template."""
        # Create sections and questions for original template
        section = AssessmentSection.objects.create(
            template=self.template,
            title="Test Section",
            order=1
        )
        question = AssessmentQuestion.objects.create(
            section=section,
            text="Test question?",
            question_type="YES_NO_NA",
            order=1
        )
        
        url = reverse('assessmenttemplate-clone-template', kwargs={'pk': self.template.pk})
        data = {'name': 'Cloned Template'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Cloned Template')
        
        # Verify cloned template has sections and questions
        cloned_template = AssessmentTemplate.objects.get(name='Cloned Template')
        self.assertEqual(cloned_template.sections.count(), 1)
        self.assertEqual(cloned_template.sections.first().questions.count(), 1)
    
    def test_company_data_isolation(self):
        """Test that users can only see templates from their company."""
        # Create another company and template
        other_company = Company.objects.create(
            name="Other Company",
            email="other@company.com"
        )
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            company=other_company,
            role="manager"
        )
        AssessmentTemplate.objects.create(
            name="Other Template",
            company=other_company,
            created_by=other_user
        )
        
        url = reverse('assessmenttemplate-list')
        response = self.client.get(url)
        
        # Should only see template from user's company
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Test Template")


class HazardAssessmentViewSetTestCase(APITestCase):
    """Test cases for HazardAssessment ViewSet."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company,
            role="driver"
        )
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@example.com",
            company=self.company,
            role="manager"
        )
        
        self.template = AssessmentTemplate.objects.create(
            name="Test Template",
            company=self.company,
            created_by=self.manager
        )
        self.section = AssessmentSection.objects.create(
            template=self.template,
            title="Test Section",
            order=1
        )
        self.question = AssessmentQuestion.objects.create(
            section=self.section,
            text="Test question?",
            question_type="YES_NO_NA",
            order=1
        )
        
        self.assessment = HazardAssessment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            assigned_to=self.user,
            company=self.company
        )
    
    def test_list_assessments_driver(self):
        """Test driver can list their assigned assessments."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('hazardassessment-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['shipment_tracking'], "SHP-2024-001")
    
    def test_list_assessments_manager(self):
        """Test manager can list all company assessments."""
        self.client.force_authenticate(user=self.manager)
        
        url = reverse('hazardassessment-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_save_answer(self):
        """Test saving an answer to an assessment."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('hazardassessment-save-answer', kwargs={'pk': self.assessment.pk})
        data = {
            'question_id': self.question.id,
            'answer_value': 'YES',
            'comment': 'Everything looks good',
            'photo_metadata': {
                'timestamp': '2024-01-01T12:00:00Z',
                'gps_latitude': -33.8688,
                'gps_longitude': 151.2093
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify answer was saved
        answer = AssessmentAnswer.objects.get(
            assessment=self.assessment,
            question=self.question
        )
        self.assertEqual(answer.answer_value, 'YES')
        self.assertEqual(answer.comment, 'Everything looks good')
    
    def test_complete_assessment(self):
        """Test completing an assessment."""
        self.client.force_authenticate(user=self.user)
        
        # First save an answer
        AssessmentAnswer.objects.create(
            assessment=self.assessment,
            question=self.question,
            answer_value='YES',
            answered_by=self.user
        )
        
        url = reverse('hazardassessment-complete', kwargs={'pk': self.assessment.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify assessment was completed
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.status, 'COMPLETED')
        self.assertIsNotNone(self.assessment.completed_at)
    
    def test_request_override(self):
        """Test requesting an override for a failed answer."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('hazardassessment-request-override', kwargs={'pk': self.assessment.pk})
        data = {
            'question_id': self.question.id,
            'reason': 'Equipment malfunction, using backup'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify override was requested
        answer = AssessmentAnswer.objects.get(
            assessment=self.assessment,
            question=self.question
        )
        self.assertTrue(answer.is_override)
        self.assertEqual(answer.override_reason, 'Equipment malfunction, using backup')
    
    def test_approve_override_manager(self):
        """Test manager approving an override request."""
        self.client.force_authenticate(user=self.manager)
        
        # Create answer with override request
        answer = AssessmentAnswer.objects.create(
            assessment=self.assessment,
            question=self.question,
            answer_value='NO',
            is_override=True,
            override_reason='Equipment issue',
            answered_by=self.user
        )
        self.assessment.status = 'OVERRIDE_REQUESTED'
        self.assessment.save()
        
        url = reverse('hazardassessment-approve-override', kwargs={'pk': self.assessment.pk})
        data = {'notes': 'Approved due to emergency situation'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify override was approved
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.status, 'OVERRIDE_APPROVED')
    
    def test_deny_override_manager(self):
        """Test manager denying an override request."""
        self.client.force_authenticate(user=self.manager)
        
        self.assessment.status = 'OVERRIDE_REQUESTED'
        self.assessment.save()
        
        url = reverse('hazardassessment-deny-override', kwargs={'pk': self.assessment.pk})
        data = {'notes': 'Override not justified'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify override was denied
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.status, 'OVERRIDE_DENIED')
    
    def test_analytics(self):
        """Test assessment analytics endpoint."""
        self.client.force_authenticate(user=self.manager)
        
        url = reverse('hazardassessment-analytics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify analytics structure
        self.assertIn('total_assessments', response.data)
        self.assertIn('completed_assessments', response.data)
        self.assertIn('failed_assessments', response.data)
        self.assertIn('pending_overrides', response.data)


class SecurityTestCase(APITestCase):
    """Test cases for security and permission enforcement."""
    
    def setUp(self):
        self.company1 = Company.objects.create(
            name="Company 1",
            email="company1@example.com"
        )
        self.company2 = Company.objects.create(
            name="Company 2",
            email="company2@example.com"
        )
        
        self.user1 = User.objects.create_user(
            username="user1",
            email="user1@example.com",
            company=self.company1,
            role="driver"
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@example.com",
            company=self.company2,
            role="driver"
        )
        
        self.template1 = AssessmentTemplate.objects.create(
            name="Template 1",
            company=self.company1,
            created_by=self.user1
        )
        self.assessment1 = HazardAssessment.objects.create(
            template=self.template1,
            shipment_tracking="SHP-001",
            company=self.company1
        )
    
    def test_cross_company_access_denied(self):
        """Test that users cannot access other companies' data."""
        self.client.force_authenticate(user=self.user2)
        
        # Try to access company1's template
        url = reverse('assessmenttemplate-detail', kwargs={'pk': self.template1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Try to access company1's assessment
        url = reverse('hazardassessment-detail', kwargs={'pk': self.assessment1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access endpoints."""
        url = reverse('assessmenttemplate-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_role_based_permissions(self):
        """Test role-based permission enforcement."""
        # Driver should not be able to approve overrides
        self.client.force_authenticate(user=self.user1)
        
        url = reverse('hazardassessment-approve-override', kwargs={'pk': self.assessment1.pk})
        response = self.client.post(url, {'notes': 'test'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)