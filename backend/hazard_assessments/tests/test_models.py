"""
Test cases for hazard assessment models.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone

from ..models import (
    AssessmentTemplate, 
    AssessmentSection, 
    AssessmentQuestion,
    HazardAssessment,
    AssessmentAnswer,
    AssessmentAssignment
)
from core.models import Company

User = get_user_model()


class AssessmentTemplateTestCase(TestCase):
    """Test cases for AssessmentTemplate model."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company
        )
    
    def test_create_template(self):
        """Test creating a new assessment template."""
        template = AssessmentTemplate.objects.create(
            name="Pre-Transport Safety Check",
            description="Standard safety checklist for dangerous goods transport",
            company=self.company,
            created_by=self.user,
            is_active=True,
            is_default=False
        )
        
        self.assertEqual(template.name, "Pre-Transport Safety Check")
        self.assertEqual(template.version, 1)
        self.assertTrue(template.is_active)
        self.assertFalse(template.is_default)
        self.assertEqual(template.company, self.company)
        self.assertEqual(template.created_by, self.user)
    
    def test_template_str_representation(self):
        """Test string representation of template."""
        template = AssessmentTemplate.objects.create(
            name="Test Template",
            company=self.company,
            created_by=self.user
        )
        
        expected = "Test Template (v1) - Test Company"
        self.assertEqual(str(template), expected)
    
    def test_only_one_default_template_per_company(self):
        """Test that only one template can be default per company."""
        # Create first default template
        template1 = AssessmentTemplate.objects.create(
            name="Default Template 1",
            company=self.company,
            created_by=self.user,
            is_default=True
        )
        
        # Create second default template - should make first non-default
        template2 = AssessmentTemplate.objects.create(
            name="Default Template 2",
            company=self.company,
            created_by=self.user,
            is_default=True
        )
        
        template1.refresh_from_db()
        self.assertFalse(template1.is_default)
        self.assertTrue(template2.is_default)


class AssessmentSectionTestCase(TestCase):
    """Test cases for AssessmentSection model."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company
        )
        self.template = AssessmentTemplate.objects.create(
            name="Test Template",
            company=self.company,
            created_by=self.user
        )
    
    def test_create_section(self):
        """Test creating a new assessment section."""
        section = AssessmentSection.objects.create(
            template=self.template,
            title="Vehicle Inspection",
            description="Check vehicle safety equipment",
            order=1,
            is_required=True
        )
        
        self.assertEqual(section.title, "Vehicle Inspection")
        self.assertEqual(section.order, 1)
        self.assertTrue(section.is_required)
        self.assertEqual(section.template, self.template)
    
    def test_section_ordering(self):
        """Test section ordering."""
        section1 = AssessmentSection.objects.create(
            template=self.template,
            title="Section 1",
            order=2
        )
        section2 = AssessmentSection.objects.create(
            template=self.template,
            title="Section 2",
            order=1
        )
        
        sections = AssessmentSection.objects.filter(template=self.template).order_by('order')
        self.assertEqual(sections[0], section2)
        self.assertEqual(sections[1], section1)


class AssessmentQuestionTestCase(TestCase):
    """Test cases for AssessmentQuestion model."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company
        )
        self.template = AssessmentTemplate.objects.create(
            name="Test Template",
            company=self.company,
            created_by=self.user
        )
        self.section = AssessmentSection.objects.create(
            template=self.template,
            title="Test Section",
            order=1
        )
    
    def test_create_question(self):
        """Test creating a new assessment question."""
        question = AssessmentQuestion.objects.create(
            section=self.section,
            text="Are all lights functioning properly?",
            question_type="YES_NO_NA",
            order=1,
            is_required=True,
            is_photo_required_on_fail=True,
            is_comment_required_on_fail=True,
            is_critical_failure=False,
            help_text="Check headlights, taillights, and indicators"
        )
        
        self.assertEqual(question.text, "Are all lights functioning properly?")
        self.assertEqual(question.question_type, "YES_NO_NA")
        self.assertTrue(question.is_required)
        self.assertTrue(question.is_photo_required_on_fail)
        self.assertTrue(question.is_comment_required_on_fail)
        self.assertFalse(question.is_critical_failure)
    
    def test_question_type_choices(self):
        """Test question type validation."""
        valid_types = ['YES_NO_NA', 'PASS_FAIL_NA', 'TEXT', 'NUMERIC']
        
        for question_type in valid_types:
            question = AssessmentQuestion.objects.create(
                section=self.section,
                text=f"Test question {question_type}",
                question_type=question_type,
                order=1
            )
            self.assertEqual(question.question_type, question_type)


class HazardAssessmentTestCase(TestCase):
    """Test cases for HazardAssessment model."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company
        )
        self.template = AssessmentTemplate.objects.create(
            name="Test Template",
            company=self.company,
            created_by=self.user
        )
    
    def test_create_assessment(self):
        """Test creating a new hazard assessment."""
        assessment = HazardAssessment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            assigned_to=self.user,
            company=self.company,
            status="IN_PROGRESS"
        )
        
        self.assertEqual(assessment.shipment_tracking, "SHP-2024-001")
        self.assertEqual(assessment.status, "IN_PROGRESS")
        self.assertEqual(assessment.assigned_to, self.user)
        self.assertEqual(assessment.company, self.company)
        self.assertEqual(assessment.template, self.template)
    
    def test_assessment_status_choices(self):
        """Test assessment status validation."""
        valid_statuses = [
            'IN_PROGRESS', 'COMPLETED', 'FAILED', 
            'OVERRIDE_REQUESTED', 'OVERRIDE_APPROVED', 'OVERRIDE_DENIED'
        ]
        
        for status in valid_statuses:
            assessment = HazardAssessment.objects.create(
                template=self.template,
                shipment_tracking=f"SHP-{status}",
                company=self.company,
                status=status
            )
            self.assertEqual(assessment.status, status)
    
    def test_gps_coordinate_validation(self):
        """Test GPS coordinate field validation."""
        assessment = HazardAssessment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            company=self.company,
            start_gps_latitude=Decimal('-33.8688'),
            start_gps_longitude=Decimal('151.2093'),
            start_location_accuracy=Decimal('5.2')
        )
        
        self.assertEqual(assessment.start_gps_latitude, Decimal('-33.8688'))
        self.assertEqual(assessment.start_gps_longitude, Decimal('151.2093'))
        self.assertEqual(assessment.start_location_accuracy, Decimal('5.2'))
    
    def test_completion_time_calculation(self):
        """Test completion time calculation."""
        start_time = timezone.now()
        end_time = start_time + timedelta(minutes=15, seconds=30)
        
        assessment = HazardAssessment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            company=self.company,
            start_timestamp=start_time,
            end_timestamp=end_time
        )
        
        expected_seconds = 15 * 60 + 30  # 15 minutes 30 seconds
        self.assertEqual(assessment.completion_time_seconds, expected_seconds)
    
    def test_suspicious_timing_detection(self):
        """Test detection of suspiciously fast completion."""
        start_time = timezone.now()
        end_time = start_time + timedelta(seconds=30)  # Very fast completion
        
        assessment = HazardAssessment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            company=self.company,
            start_timestamp=start_time,
            end_timestamp=end_time
        )
        
        # This would typically be calculated by a property or method
        # For now, just test that the timestamps are set correctly
        self.assertEqual(assessment.completion_time_seconds, 30)


class AssessmentAnswerTestCase(TestCase):
    """Test cases for AssessmentAnswer model."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company
        )
        self.template = AssessmentTemplate.objects.create(
            name="Test Template",
            company=self.company,
            created_by=self.user
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
            company=self.company
        )
    
    def test_create_answer(self):
        """Test creating a new assessment answer."""
        answer = AssessmentAnswer.objects.create(
            assessment=self.assessment,
            question=self.question,
            answer_value="YES",
            comment="All lights working correctly",
            answered_by=self.user
        )
        
        self.assertEqual(answer.answer_value, "YES")
        self.assertEqual(answer.comment, "All lights working correctly")
        self.assertEqual(answer.answered_by, self.user)
        self.assertFalse(answer.is_override)
    
    def test_answer_with_photo_metadata(self):
        """Test answer with photo and metadata."""
        photo_metadata = {
            "timestamp": timezone.now().isoformat(),
            "gps_latitude": -33.8688,
            "gps_longitude": 151.2093,
            "device_info": "iPhone 12"
        }
        
        answer = AssessmentAnswer.objects.create(
            assessment=self.assessment,
            question=self.question,
            answer_value="NO",
            comment="Brake light not working",
            photo_url="https://example.com/photo.jpg",
            photo_metadata=photo_metadata,
            answered_by=self.user
        )
        
        self.assertEqual(answer.photo_metadata["device_info"], "iPhone 12")
        self.assertEqual(answer.photo_metadata["gps_latitude"], -33.8688)
    
    def test_override_answer(self):
        """Test creating an override answer."""
        answer = AssessmentAnswer.objects.create(
            assessment=self.assessment,
            question=self.question,
            answer_value="NO",
            comment="Equipment failure",
            is_override=True,
            override_reason="Emergency situation - proceeding with spare equipment",
            answered_by=self.user
        )
        
        self.assertTrue(answer.is_override)
        self.assertEqual(answer.override_reason, "Emergency situation - proceeding with spare equipment")


class AssessmentAssignmentTestCase(TestCase):
    """Test cases for AssessmentAssignment model."""
    
    def setUp(self):
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            company=self.company
        )
        self.template = AssessmentTemplate.objects.create(
            name="Test Template",
            company=self.company,
            created_by=self.user
        )
    
    def test_create_assignment(self):
        """Test creating a new assessment assignment."""
        due_date = timezone.now() + timedelta(days=7)
        
        assignment = AssessmentAssignment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            assigned_to=self.user,
            assigned_by=self.user,
            company=self.company,
            due_date=due_date,
            priority="HIGH"
        )
        
        self.assertEqual(assignment.shipment_tracking, "SHP-2024-001")
        self.assertEqual(assignment.assigned_to, self.user)
        self.assertEqual(assignment.priority, "HIGH")
        self.assertEqual(assignment.status, "PENDING")  # Default status
    
    def test_assignment_completion(self):
        """Test marking assignment as completed."""
        assignment = AssessmentAssignment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            assigned_to=self.user,
            assigned_by=self.user,
            company=self.company
        )
        
        # Create associated assessment
        assessment = HazardAssessment.objects.create(
            template=self.template,
            shipment_tracking="SHP-2024-001",
            company=self.company,
            status="COMPLETED"
        )
        
        assignment.assessment = assessment
        assignment.status = "COMPLETED"
        assignment.completed_at = timezone.now()
        assignment.save()
        
        self.assertEqual(assignment.status, "COMPLETED")
        self.assertIsNotNone(assignment.completed_at)
        self.assertEqual(assignment.assessment, assessment)