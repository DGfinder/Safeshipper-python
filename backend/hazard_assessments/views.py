import logging
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q, Avg
from django.shortcuts import get_object_or_404

from .models import (
    AssessmentTemplate, AssessmentSection, AssessmentQuestion,
    HazardAssessment, AssessmentAnswer, AssessmentAssignment
)
from .serializers import (
    AssessmentTemplateSerializer, AssessmentTemplateListSerializer,
    AssessmentSectionSerializer, AssessmentQuestionSerializer,
    HazardAssessmentSerializer, HazardAssessmentListSerializer,
    AssessmentAnswerSerializer, AssessmentAssignmentSerializer,
    MobileAssessmentTemplateSerializer, MobileHazardAssessmentSerializer
)
from .permissions import (
    HazardAssessmentTemplatePermission, HazardAssessmentPermission,
    HazardAssessmentAssignmentPermission, HazardAssessmentMobilePermission,
    CanManageHazardAssessmentTemplates, CanCompleteHazardAssessments,
    CanReviewHazardAssessments, CanViewHazardAssessmentAnalytics,
    CompanyFilteredPermissionMixin, AuditLogPermissionMixin, RoleBasedFieldPermissionMixin
)
from shipments.models import Shipment
from documents.models import Document

logger = logging.getLogger(__name__)


class AssessmentTemplateViewSet(
    CompanyFilteredPermissionMixin, 
    AuditLogPermissionMixin,
    RoleBasedFieldPermissionMixin,
    viewsets.ModelViewSet
):
    """
    ViewSet for managing assessment templates.
    
    Provides endpoints for template CRUD operations, section/question management,
    and template assignment functionality.
    """
    permission_classes = [permissions.IsAuthenticated, HazardAssessmentTemplatePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'name': ['exact', 'icontains'],
        'is_active': ['exact'],
        'is_default': ['exact'],
        'version': ['exact', 'gte', 'lte'],
        'created_at': ['date', 'gte', 'lte'],
        'freight_types': ['exact'],
    }
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'version']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get templates filtered by company"""
        queryset = AssessmentTemplate.objects.select_related('created_by').prefetch_related(
            'sections__questions', 'freight_types'
        )
        return super().get_queryset().filter(id__in=queryset.values_list('id', flat=True))
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return AssessmentTemplateListSerializer
        return AssessmentTemplateSerializer
    
    @action(detail=True, methods=['post'])
    def clone_template(self, request, pk=None):
        """Clone an existing template with a new name"""
        template = self.get_object()
        new_name = request.data.get('name')
        
        if not new_name:
            return Response(
                {'error': 'New template name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if name already exists
        if AssessmentTemplate.objects.filter(
            company=request.user.company, name=new_name
        ).exists():
            return Response(
                {'error': 'Template name already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Clone template
                new_template = AssessmentTemplate.objects.create(
                    name=new_name,
                    description=f"Clone of {template.name}",
                    company=request.user.company,
                    created_by=request.user,
                    is_active=True,
                    is_default=False
                )
                
                # Clone sections and questions
                for section in template.sections.all():
                    new_section = AssessmentSection.objects.create(
                        template=new_template,
                        title=section.title,
                        description=section.description,
                        order=section.order,
                        is_required=section.is_required
                    )
                    
                    # Clone questions
                    for question in section.questions.all():
                        AssessmentQuestion.objects.create(
                            section=new_section,
                            text=question.text,
                            question_type=question.question_type,
                            order=question.order,
                            is_photo_required_on_fail=question.is_photo_required_on_fail,
                            is_comment_required_on_fail=question.is_comment_required_on_fail,
                            is_critical_failure=question.is_critical_failure,
                            is_required=question.is_required,
                            help_text=question.help_text
                        )
                
                # Copy freight type assignments
                new_template.freight_types.set(template.freight_types.all())
                
                serializer = AssessmentTemplateSerializer(new_template, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error cloning template {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to clone template'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def assign_to_shipment(self, request, pk=None):
        """Manually assign template to a specific shipment"""
        template = self.get_object()
        shipment_id = request.data.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {'error': 'Shipment ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
            
            # Check if user has access to this shipment
            if not (shipment.customer == request.user.company or 
                   shipment.carrier == request.user.company):
                raise PermissionDenied("You don't have access to this shipment")
            
            # Create assessment instance
            assessment = HazardAssessment.objects.create(
                template=template,
                shipment=shipment,
                status=HazardAssessment.AssessmentStatus.IN_PROGRESS
            )
            
            serializer = HazardAssessmentSerializer(assessment, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error assigning template to shipment: {str(e)}")
            return Response(
                {'error': 'Failed to assign template'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for template usage"""
        template = self.get_object()
        
        # Basic usage statistics
        assessments = HazardAssessment.objects.filter(template=template)
        
        analytics_data = {
            'total_assessments': assessments.count(),
            'completed_assessments': assessments.filter(
                status=HazardAssessment.AssessmentStatus.COMPLETED
            ).count(),
            'failed_assessments': assessments.filter(
                overall_result='FAIL'
            ).count(),
            'average_completion_time': assessments.filter(
                completion_time_seconds__isnull=False
            ).aggregate(avg_time=Avg('completion_time_seconds'))['avg_time'],
            'override_requests': assessments.filter(
                status__in=['OVERRIDE_REQUESTED', 'OVERRIDE_APPROVED', 'OVERRIDE_DENIED']
            ).count(),
            'recent_usage': assessments.filter(
                created_at__gte=timezone.now().date() - timezone.timedelta(days=30)
            ).count()
        }
        
        return Response(analytics_data)


class AssessmentSectionViewSet(
    CompanyFilteredPermissionMixin,
    AuditLogPermissionMixin,
    viewsets.ModelViewSet
):
    """
    ViewSet for managing assessment sections within templates.
    """
    serializer_class = AssessmentSectionSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageHazardAssessmentTemplates]
    
    def get_queryset(self):
        """Get sections filtered by company through template"""
        return AssessmentSection.objects.select_related('template').prefetch_related('questions')
    
    def perform_create(self, serializer):
        """Ensure section belongs to user's company template"""
        template = serializer.validated_data['template']
        if template.company != self.request.user.company:
            raise PermissionDenied("Template must belong to your company")
        super().perform_create(serializer)


class AssessmentQuestionViewSet(
    CompanyFilteredPermissionMixin,
    AuditLogPermissionMixin,
    viewsets.ModelViewSet
):
    """
    ViewSet for managing assessment questions within sections.
    """
    serializer_class = AssessmentQuestionSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageHazardAssessmentTemplates]
    
    def get_queryset(self):
        """Get questions filtered by company through template"""
        return AssessmentQuestion.objects.select_related('section__template')
    
    def perform_create(self, serializer):
        """Ensure question belongs to user's company template"""
        section = serializer.validated_data['section']
        if section.template.company != self.request.user.company:
            raise PermissionDenied("Section must belong to your company template")
        super().perform_create(serializer)


class HazardAssessmentViewSet(
    CompanyFilteredPermissionMixin,
    AuditLogPermissionMixin,
    RoleBasedFieldPermissionMixin,
    viewsets.ModelViewSet
):
    """
    ViewSet for managing hazard assessments.
    
    Provides endpoints for assessment completion, review, and override management.
    """
    permission_classes = [permissions.IsAuthenticated, HazardAssessmentPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'status': ['exact', 'in'],
        'overall_result': ['exact'],
        'template': ['exact'],
        'shipment': ['exact'],
        'completed_by': ['exact'],
        'created_at': ['date', 'gte', 'lte'],
    }
    search_fields = ['shipment__tracking_number', 'template__name']
    ordering_fields = ['created_at', 'updated_at', 'completion_time_seconds']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get assessments filtered by company"""
        queryset = HazardAssessment.objects.select_related(
            'template', 'shipment', 'completed_by', 'override_requested_by', 'override_reviewed_by'
        ).prefetch_related('answers__question', 'answers__photo')
        return super().get_queryset().filter(id__in=queryset.values_list('id', flat=True))
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return HazardAssessmentListSerializer
        return HazardAssessmentSerializer
    
    @action(detail=True, methods=['post'])
    def start_assessment(self, request, pk=None):
        """Start an assessment by recording start timestamp and GPS"""
        assessment = self.get_object()
        
        if assessment.status != HazardAssessment.AssessmentStatus.IN_PROGRESS:
            return Response(
                {'error': 'Assessment is not in progress'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Record start data
        assessment.start_timestamp = timezone.now()
        assessment.start_gps_latitude = request.data.get('gps_latitude')
        assessment.start_gps_longitude = request.data.get('gps_longitude')
        assessment.device_info = request.data.get('device_info', {})
        assessment.completed_by = request.user
        assessment.save()
        
        serializer = self.get_serializer(assessment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_assessment(self, request, pk=None):
        """Complete an assessment by recording end timestamp and calculating result"""
        assessment = self.get_object()
        
        # Record end data
        assessment.end_timestamp = timezone.now()
        assessment.end_gps_latitude = request.data.get('gps_latitude')
        assessment.end_gps_longitude = request.data.get('gps_longitude')
        
        # Calculate overall result based on answers
        failed_answers = assessment.answers.filter(
            answer_value__in=['NO', 'FAIL'],
            question__is_critical_failure=True
        )
        
        if failed_answers.exists():
            assessment.overall_result = 'FAIL'
            assessment.status = HazardAssessment.AssessmentStatus.FAILED
        else:
            # Check if all required questions are answered
            required_questions = AssessmentQuestion.objects.filter(
                section__template=assessment.template,
                is_required=True
            )
            answered_questions = assessment.answers.values_list('question_id', flat=True)
            
            if required_questions.filter(id__in=answered_questions).count() == required_questions.count():
                assessment.overall_result = 'PASS'
                assessment.status = HazardAssessment.AssessmentStatus.COMPLETED
            else:
                assessment.overall_result = 'INCOMPLETE'
        
        assessment.save()
        
        serializer = self.get_serializer(assessment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def request_override(self, request, pk=None):
        """Request override for missing photos or comments"""
        assessment = self.get_object()
        override_reason = request.data.get('override_reason', '').strip()
        
        if not override_reason:
            return Response(
                {'error': 'Override reason is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assessment.status = HazardAssessment.AssessmentStatus.OVERRIDE_REQUESTED
        assessment.override_reason = override_reason
        assessment.override_requested_by = request.user
        assessment.override_requested_at = timezone.now()
        assessment.save()
        
        # TODO: Send notification to managers
        
        serializer = self.get_serializer(assessment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def review_override(self, request, pk=None):
        """Approve or deny override request"""
        assessment = self.get_object()
        action_type = request.data.get('action')  # 'approve' or 'deny'
        review_notes = request.data.get('review_notes', '')
        
        if action_type not in ['approve', 'deny']:
            return Response(
                {'error': 'Action must be "approve" or "deny"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action_type == 'approve':
            assessment.status = HazardAssessment.AssessmentStatus.OVERRIDE_APPROVED
        else:
            assessment.status = HazardAssessment.AssessmentStatus.OVERRIDE_DENIED
        
        assessment.override_reviewed_by = request.user
        assessment.override_reviewed_at = timezone.now()
        assessment.override_review_notes = review_notes
        assessment.save()
        
        serializer = self.get_serializer(assessment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get assessment analytics for the company"""
        user_role = getattr(request.user, 'role', '').lower()
        if user_role not in ['manager', 'admin']:
            raise PermissionDenied("Only managers and admins can view analytics")
        
        assessments = self.get_queryset()
        
        analytics_data = {
            'total_assessments': assessments.count(),
            'completed_assessments': assessments.filter(
                status=HazardAssessment.AssessmentStatus.COMPLETED
            ).count(),
            'failed_assessments': assessments.filter(overall_result='FAIL').count(),
            'pending_overrides': assessments.filter(
                status=HazardAssessment.AssessmentStatus.OVERRIDE_REQUESTED
            ).count(),
            'average_completion_time': assessments.filter(
                completion_time_seconds__isnull=False
            ).aggregate(avg_time=Avg('completion_time_seconds'))['avg_time'],
            'suspicious_assessments': assessments.filter(
                completion_time_seconds__lt=30  # Less than 30 seconds
            ).count(),
            'recent_assessments': assessments.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=7)
            ).count(),
        }
        
        return Response(analytics_data)


class AssessmentAnswerViewSet(
    CompanyFilteredPermissionMixin,
    viewsets.ModelViewSet
):
    """
    ViewSet for managing individual assessment answers.
    """
    serializer_class = AssessmentAnswerSerializer
    permission_classes = [permissions.IsAuthenticated, CanCompleteHazardAssessments]
    
    def get_queryset(self):
        """Get answers filtered by company through assessment"""
        return AssessmentAnswer.objects.select_related(
            'assessment__template', 'question', 'photo'
        )


class AssessmentAssignmentViewSet(
    CompanyFilteredPermissionMixin,
    AuditLogPermissionMixin,
    viewsets.ModelViewSet
):
    """
    ViewSet for managing assessment assignment rules.
    """
    serializer_class = AssessmentAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, HazardAssessmentAssignmentPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    
    filterset_fields = {
        'template': ['exact'],
        'trigger_condition': ['exact'],
        'is_active': ['exact'],
        'priority': ['exact', 'gte', 'lte'],
    }
    ordering_fields = ['priority', 'created_at']
    ordering = ['priority', '-created_at']
    
    def get_queryset(self):
        """Get assignment rules filtered by company"""
        return AssessmentAssignment.objects.select_related('template', 'created_by')


# Mobile-specific ViewSets for optimized mobile app performance
class MobileHazardAssessmentViewSet(
    CompanyFilteredPermissionMixin,
    viewsets.ModelViewSet
):
    """
    Mobile-optimized ViewSet for hazard assessments.
    Provides streamlined endpoints for mobile app operations.
    """
    serializer_class = MobileHazardAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated, HazardAssessmentMobilePermission]
    
    def get_queryset(self):
        """Get assessments assigned to current user or their shipments"""
        user = self.request.user
        return HazardAssessment.objects.filter(
            Q(completed_by=user) |
            Q(shipment__assigned_driver=user) |
            Q(shipment__customer=user.company) |
            Q(shipment__carrier=user.company)
        ).select_related('template', 'shipment')
    
    @action(detail=False, methods=['get'])
    def assigned_assessments(self, request):
        """Get assessments assigned to current user"""
        user = request.user
        assessments = HazardAssessment.objects.filter(
            Q(shipment__assigned_driver=user) | Q(completed_by=user),
            status__in=[
                HazardAssessment.AssessmentStatus.IN_PROGRESS,
                HazardAssessment.AssessmentStatus.OVERRIDE_REQUESTED
            ]
        ).select_related('template', 'shipment')
        
        serializer = self.get_serializer(assessments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def template_with_questions(self, request, pk=None):
        """Get assessment template with all questions for mobile completion"""
        assessment = self.get_object()
        serializer = MobileAssessmentTemplateSerializer(
            assessment.template,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        """Submit or update an individual answer"""
        assessment = self.get_object()
        question_id = request.data.get('question_id')
        
        if not question_id:
            return Response(
                {'error': 'Question ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            question = AssessmentQuestion.objects.get(
                id=question_id,
                section__template=assessment.template
            )
            
            # Create or update answer
            answer_data = {
                'assessment': assessment,
                'question': question,
                'answer_value': request.data.get('answer_value'),
                'text_answer': request.data.get('text_answer', ''),
                'numeric_answer': request.data.get('numeric_answer'),
                'comment': request.data.get('comment', ''),
                'gps_latitude': request.data.get('gps_latitude'),
                'gps_longitude': request.data.get('gps_longitude'),
                'is_override': request.data.get('is_override', False),
                'override_reason': request.data.get('override_reason', ''),
            }
            
            # Handle photo upload if provided
            photo_id = request.data.get('photo_id')
            if photo_id:
                try:
                    photo = Document.objects.get(id=photo_id)
                    answer_data['photo'] = photo
                except Document.DoesNotExist:
                    pass
            
            answer, created = AssessmentAnswer.objects.update_or_create(
                assessment=assessment,
                question=question,
                defaults=answer_data
            )
            
            serializer = AssessmentAnswerSerializer(answer, context={'request': request})
            return Response(serializer.data)
            
        except AssessmentQuestion.DoesNotExist:
            return Response(
                {'error': 'Question not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def upload_photo(self, request, pk=None):
        """Upload photo for assessment answer"""
        assessment = self.get_object()
        
        if 'photo' not in request.FILES:
            return Response(
                {'error': 'Photo file is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create document for photo
        document = Document.objects.create(
            file=request.FILES['photo'],
            document_type='OTHER',
            uploaded_by=request.user,
            status='UPLOADED'
        )
        
        return Response({
            'photo_id': document.id,
            'photo_url': document.file.url if document.file else None
        })


# Service functions for assessment logic
def auto_assign_assessment_template(shipment):
    """
    Automatically assign assessment template to shipment based on rules.
    """
    if not hasattr(shipment, 'customer') or not shipment.customer:
        return None
    
    # Get active assignment rules for the company
    assignment_rules = AssessmentAssignment.objects.filter(
        company=shipment.customer,
        is_active=True
    ).order_by('priority')
    
    for rule in assignment_rules:
        if evaluate_assignment_rule(rule, shipment):
            # Create assessment instance
            assessment = HazardAssessment.objects.create(
                template=rule.template,
                shipment=shipment,
                status=HazardAssessment.AssessmentStatus.IN_PROGRESS
            )
            return assessment
    
    return None


def evaluate_assignment_rule(rule, shipment):
    """
    Evaluate if assignment rule matches shipment criteria.
    """
    condition = rule.trigger_condition
    condition_data = rule.condition_data
    
    if condition == AssessmentAssignment.TriggerCondition.FREIGHT_TYPE:
        freight_type_ids = condition_data.get('freight_type_ids', [])
        return shipment.freight_type_id in freight_type_ids
    
    elif condition == AssessmentAssignment.TriggerCondition.DANGEROUS_GOODS:
        # Check if shipment contains dangerous goods
        return shipment.consignmentitem_set.filter(
            dangerous_good__isnull=False
        ).exists()
    
    elif condition == AssessmentAssignment.TriggerCondition.WORKGROUP:
        workgroup_ids = condition_data.get('workgroup_ids', [])
        # This would need to be implemented based on user workgroup model
        return False
    
    elif condition == AssessmentAssignment.TriggerCondition.MANUAL:
        # Manual assignments are handled separately
        return False
    
    return False
