from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import (
    AssessmentTemplate, AssessmentSection, AssessmentQuestion,
    HazardAssessment, AssessmentAnswer, AssessmentAssignment
)
from documents.serializers import DocumentSerializer
from shipments.serializers import ShipmentListSerializer
from users.serializers import UserBasicSerializer
from freight_types.models import FreightType


class AssessmentQuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for assessment questions with conditional logic rules.
    """
    
    class Meta:
        model = AssessmentQuestion
        fields = [
            'id', 'text', 'question_type', 'order', 'is_photo_required_on_fail',
            'is_comment_required_on_fail', 'is_critical_failure', 'is_required',
            'help_text', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_order(self, value):
        """Ensure order is unique within the section"""
        if self.instance and self.instance.order == value:
            return value
            
        section = self.parent.instance if hasattr(self.parent, 'instance') else None
        if hasattr(self, 'context') and 'section' in self.context:
            section = self.context['section']
            
        if section and AssessmentQuestion.objects.filter(
            section=section, order=value
        ).exclude(id=getattr(self.instance, 'id', None)).exists():
            raise ValidationError(_("Order must be unique within the section"))
            
        return value


class AssessmentSectionSerializer(serializers.ModelSerializer):
    """
    Serializer for assessment sections with nested questions.
    """
    questions = AssessmentQuestionSerializer(many=True, read_only=True)
    questions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AssessmentSection
        fields = [
            'id', 'title', 'description', 'order', 'is_required',
            'questions', 'questions_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'questions_count']
    
    def get_questions_count(self, obj):
        """Get count of questions in this section"""
        return obj.questions.count()
    
    def validate_order(self, value):
        """Ensure order is unique within the template"""
        if self.instance and self.instance.order == value:
            return value
            
        template = self.parent.instance if hasattr(self.parent, 'instance') else None
        if hasattr(self, 'context') and 'template' in self.context:
            template = self.context['template']
            
        if template and AssessmentSection.objects.filter(
            template=template, order=value
        ).exclude(id=getattr(self.instance, 'id', None)).exists():
            raise ValidationError(_("Order must be unique within the template"))
            
        return value


class AssessmentTemplateListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for template lists.
    """
    sections_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = AssessmentTemplate
        fields = [
            'id', 'name', 'description', 'version', 'is_active', 'is_default',
            'sections_count', 'questions_count', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_sections_count(self, obj):
        """Get count of sections in this template"""
        return obj.sections.count()
    
    def get_questions_count(self, obj):
        """Get total count of questions across all sections"""
        return AssessmentQuestion.objects.filter(section__template=obj).count()


class AssessmentTemplateSerializer(serializers.ModelSerializer):
    """
    Full serializer for assessment templates with nested sections and questions.
    """
    sections = AssessmentSectionSerializer(many=True, read_only=True)
    freight_types = serializers.PrimaryKeyRelatedField(
        many=True, queryset=FreightType.objects.all(), required=False
    )
    created_by = UserBasicSerializer(read_only=True)
    sections_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AssessmentTemplate
        fields = [
            'id', 'name', 'description', 'version', 'is_active', 'is_default',
            'freight_types', 'sections', 'created_by', 'sections_count',
            'questions_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'version', 'created_at', 'updated_at']
    
    def get_sections_count(self, obj):
        """Get count of sections in this template"""
        return obj.sections.count()
    
    def get_questions_count(self, obj):
        """Get total count of questions across all sections"""
        return AssessmentQuestion.objects.filter(section__template=obj).count()
    
    def validate_name(self, value):
        """Ensure template name is unique within company"""
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'company'):
            return value
            
        company = request.user.company
        queryset = AssessmentTemplate.objects.filter(company=company, name=value)
        
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
            
        if queryset.exists():
            raise ValidationError(_("Template name must be unique within your company"))
            
        return value
    
    def create(self, validated_data):
        """Create template with company assignment"""
        request = self.context.get('request')
        if request and hasattr(request.user, 'company'):
            validated_data['company'] = request.user.company
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class AssessmentAnswerSerializer(serializers.ModelSerializer):
    """
    Serializer for individual assessment answers.
    """
    photo = DocumentSerializer(read_only=True)
    question_text = serializers.CharField(source='question.text', read_only=True)
    requires_photo = serializers.SerializerMethodField()
    requires_comment = serializers.SerializerMethodField()
    is_failure_answer = serializers.SerializerMethodField()
    
    class Meta:
        model = AssessmentAnswer
        fields = [
            'id', 'question', 'answer_value', 'text_answer', 'numeric_answer',
            'comment', 'photo', 'is_override', 'override_reason', 'answered_at',
            'gps_latitude', 'gps_longitude', 'question_text', 'requires_photo',
            'requires_comment', 'is_failure_answer', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_requires_photo(self, obj):
        """Check if this answer requires a photo"""
        return obj.requires_photo
    
    def get_requires_comment(self, obj):
        """Check if this answer requires a comment"""
        return obj.requires_comment
    
    def get_is_failure_answer(self, obj):
        """Check if this is a failure answer"""
        return obj.is_failure_answer
    
    def validate(self, data):
        """Validate answer requirements based on question configuration"""
        answer_value = data.get('answer_value')
        comment = data.get('comment', '')
        photo = data.get('photo')
        is_override = data.get('is_override', False)
        
        # Get question from data or instance
        question = data.get('question') or (self.instance.question if self.instance else None)
        
        if not question:
            return data
        
        # Check if this is a failure answer
        is_failure = answer_value in ['NO', 'FAIL']
        
        if is_failure and not is_override:
            # Check photo requirement
            if question.is_photo_required_on_fail and not photo:
                raise ValidationError({
                    'photo': _("Photo is required for 'No' or 'Fail' answers on this question")
                })
            
            # Check comment requirement
            if question.is_comment_required_on_fail and not comment.strip():
                raise ValidationError({
                    'comment': _("Comment is required for 'No' or 'Fail' answers on this question")
                })
        
        # Validate override reason if override is used
        if is_override and not data.get('override_reason', '').strip():
            raise ValidationError({
                'override_reason': _("Override reason is required when using override")
            })
        
        return data


class HazardAssessmentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for assessment lists.
    """
    template_name = serializers.CharField(source='template.name', read_only=True)
    shipment_tracking = serializers.CharField(source='shipment.tracking_number', read_only=True)
    completed_by_name = serializers.CharField(source='completed_by.username', read_only=True)
    completion_time_display = serializers.ReadOnlyField()
    is_suspiciously_fast = serializers.ReadOnlyField()
    answers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = HazardAssessment
        fields = [
            'id', 'template_name', 'shipment', 'shipment_tracking', 'completed_by_name',
            'status', 'overall_result', 'completion_time_display', 'is_suspiciously_fast',
            'answers_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_answers_count(self, obj):
        """Get count of answers provided"""
        return obj.answers.count()


class HazardAssessmentSerializer(serializers.ModelSerializer):
    """
    Full serializer for hazard assessments with all related data.
    """
    template = AssessmentTemplateSerializer(read_only=True)
    shipment = ShipmentListSerializer(read_only=True)
    completed_by = UserBasicSerializer(read_only=True)
    answers = AssessmentAnswerSerializer(many=True, read_only=True)
    override_requested_by = UserBasicSerializer(read_only=True)
    override_reviewed_by = UserBasicSerializer(read_only=True)
    completion_time_display = serializers.ReadOnlyField()
    is_suspiciously_fast = serializers.ReadOnlyField()
    
    class Meta:
        model = HazardAssessment
        fields = [
            'id', 'template', 'shipment', 'completed_by', 'status', 'overall_result',
            'start_timestamp', 'end_timestamp', 'start_gps_latitude', 'start_gps_longitude',
            'end_gps_latitude', 'end_gps_longitude', 'override_reason', 'override_requested_by',
            'override_requested_at', 'override_reviewed_by', 'override_reviewed_at',
            'override_review_notes', 'device_info', 'completion_time_seconds',
            'completion_time_display', 'is_suspiciously_fast', 'answers', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'template', 'shipment', 'completion_time_seconds',
            'completion_time_display', 'is_suspiciously_fast', 'created_at', 'updated_at'
        ]
    
    def validate(self, data):
        """Validate assessment data"""
        status = data.get('status')
        
        # If marking as completed, ensure all required questions are answered
        if status == HazardAssessment.AssessmentStatus.COMPLETED and self.instance:
            required_questions = AssessmentQuestion.objects.filter(
                section__template=self.instance.template,
                is_required=True
            )
            answered_questions = self.instance.answers.values_list('question_id', flat=True)
            
            missing_questions = required_questions.exclude(id__in=answered_questions)
            if missing_questions.exists():
                raise ValidationError({
                    'status': _("Cannot complete assessment with unanswered required questions")
                })
        
        return data


class AssessmentAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for assessment assignment rules.
    """
    template = AssessmentTemplateListSerializer(read_only=True)
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=AssessmentTemplate.objects.all(),
        source='template',
        write_only=True
    )
    created_by = UserBasicSerializer(read_only=True)
    trigger_condition_display = serializers.CharField(
        source='get_trigger_condition_display', read_only=True
    )
    
    class Meta:
        model = AssessmentAssignment
        fields = [
            'id', 'template', 'template_id', 'trigger_condition', 'trigger_condition_display',
            'condition_data', 'is_active', 'priority', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create assignment rule with company assignment"""
        request = self.context.get('request')
        if request and hasattr(request.user, 'company'):
            validated_data['company'] = request.user.company
            validated_data['created_by'] = request.user
        return super().create(validated_data)
    
    def validate_template_id(self, value):
        """Ensure template belongs to user's company"""
        request = self.context.get('request')
        if request and hasattr(request.user, 'company'):
            if value.company != request.user.company:
                raise ValidationError(_("Template must belong to your company"))
        return value


# Mobile-specific serializers for optimized mobile app performance
class MobileAssessmentTemplateSerializer(serializers.ModelSerializer):
    """
    Optimized serializer for mobile assessment templates.
    """
    sections = AssessmentSectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = AssessmentTemplate
        fields = ['id', 'name', 'description', 'sections']


class MobileAssessmentAnswerSerializer(serializers.ModelSerializer):
    """
    Optimized serializer for mobile assessment answers.
    """
    
    class Meta:
        model = AssessmentAnswer
        fields = [
            'id', 'question', 'answer_value', 'text_answer', 'numeric_answer',
            'comment', 'photo', 'is_override', 'override_reason', 'gps_latitude',
            'gps_longitude'
        ]
    
    def validate(self, data):
        """Mobile-specific validation with detailed error messages"""
        return super().validate(data)


class MobileHazardAssessmentSerializer(serializers.ModelSerializer):
    """
    Optimized serializer for mobile hazard assessments.
    """
    answers = MobileAssessmentAnswerSerializer(many=True, required=False)
    
    class Meta:
        model = HazardAssessment
        fields = [
            'id', 'template', 'shipment', 'status', 'start_timestamp', 'end_timestamp',
            'start_gps_latitude', 'start_gps_longitude', 'end_gps_latitude',
            'end_gps_longitude', 'device_info', 'override_reason', 'answers'
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        """Create assessment with answers in a single transaction"""
        answers_data = validated_data.pop('answers', [])
        
        # Set completed_by from request context
        request = self.context.get('request')
        if request and request.user:
            validated_data['completed_by'] = request.user
        
        assessment = super().create(validated_data)
        
        # Create answers
        for answer_data in answers_data:
            answer_data['assessment'] = assessment
            AssessmentAnswer.objects.create(**answer_data)
        
        return assessment
    
    def update(self, instance, validated_data):
        """Update assessment and handle answers"""
        answers_data = validated_data.pop('answers', [])
        
        assessment = super().update(instance, validated_data)
        
        # Update or create answers
        for answer_data in answers_data:
            question = answer_data.get('question')
            if question:
                answer, created = AssessmentAnswer.objects.update_or_create(
                    assessment=assessment,
                    question=question,
                    defaults=answer_data
                )
        
        return assessment
