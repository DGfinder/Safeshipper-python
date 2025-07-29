import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.postgres.fields import JSONField
from companies.models import Company
from shipments.models import Shipment
from documents.models import Document
from freight_types.models import FreightType 
from simple_history.models import HistoricalRecords
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class AssessmentTemplate(models.Model):
    """
    Master template for hazard assessments. Defines the structure and rules
    for assessments that will be assigned to shipments.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_("Template Name"), max_length=200, db_index=True)
    description = models.TextField(_("Description"), blank=True)
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='assessment_templates',
        help_text=_("Company that owns this template")
    )
    
    # Template metadata
    version = models.PositiveIntegerField(_("Version"), default=1)
    is_active = models.BooleanField(_("Is Active"), default=True, db_index=True)
    is_default = models.BooleanField(_("Is Default Template"), default=False)
    
    # Assignment rules
    freight_types = models.ManyToManyField(
        FreightType,
        blank=True,
        related_name='assessment_templates',
        help_text=_("Freight types that should use this template")
    )
    
    # Audit fields
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # History tracking
    history = HistoricalRecords()
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Assessment Template")
        verbose_name_plural = _("Assessment Templates")
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['name']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'name', 'version'],
                name='unique_template_version_per_company'
            )
        ]
    
    def __str__(self):
        return f"{self.name} v{self.version} ({self.company.name})"


class AssessmentSection(models.Model):
    """
    Sections within an assessment template for grouping related questions.
    Examples: "Pre-Loading Checks", "Vehicle Inspection", "Load Securing"
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        AssessmentTemplate,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    title = models.CharField(_("Section Title"), max_length=200)
    description = models.TextField(_("Section Description"), blank=True)
    order = models.PositiveIntegerField(_("Display Order"), validators=[MinValueValidator(1)])
    
    # Section behavior
    is_required = models.BooleanField(_("Is Required"), default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']
        verbose_name = _("Assessment Section")
        verbose_name_plural = _("Assessment Sections")
        indexes = [
            models.Index(fields=['template', 'order']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['template', 'order'],
                name='unique_section_order_per_template'
            )
        ]
    
    def __str__(self):
        return f"{self.template.name} - {self.title}"


class AssessmentQuestion(models.Model):
    """
    Individual questions within assessment sections with conditional logic rules.
    """
    
    class QuestionType(models.TextChoices):
        YES_NO_NA = 'YES_NO_NA', _('Yes / No / N/A')
        PASS_FAIL_NA = 'PASS_FAIL_NA', _('Pass / Fail / N/A')
        TEXT = 'TEXT', _('Text Input')
        NUMERIC = 'NUMERIC', _('Numeric Input')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(
        AssessmentSection,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    text = models.TextField(_("Question Text"))
    question_type = models.CharField(
        _("Question Type"),
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.YES_NO_NA
    )
    order = models.PositiveIntegerField(_("Display Order"), validators=[MinValueValidator(1)])
    
    # Conditional requirements - the core logic for requiring photos/comments
    is_photo_required_on_fail = models.BooleanField(
        _("Require Photo on Fail"),
        default=False,
        help_text=_("Require photo when answer is 'No' or 'Fail'")
    )
    is_comment_required_on_fail = models.BooleanField(
        _("Require Comment on Fail"), 
        default=False,
        help_text=_("Require comment when answer is 'No' or 'Fail'")
    )
    is_critical_failure = models.BooleanField(
        _("Critical Failure Item"),
        default=False,
        help_text=_("Mark entire assessment as failed if this question fails")
    )
    
    # Question behavior
    is_required = models.BooleanField(_("Is Required"), default=True)
    help_text = models.TextField(_("Help Text"), blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']
        verbose_name = _("Assessment Question")
        verbose_name_plural = _("Assessment Questions")
        indexes = [
            models.Index(fields=['section', 'order']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['section', 'order'],
                name='unique_question_order_per_section'
            )
        ]
    
    def __str__(self):
        return f"{self.section.title} - Q{self.order}: {self.text[:50]}..."


class HazardAssessment(models.Model):
    """
    Completed assessment instance with full audit trail and safeguard data.
    This is the record of a driver/loader completing an assessment in the field.
    """
    
    class AssessmentStatus(models.TextChoices):
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        COMPLETED = 'COMPLETED', _('Completed')
        FAILED = 'FAILED', _('Failed')
        OVERRIDE_REQUESTED = 'OVERRIDE_REQUESTED', _('Override Requested')
        OVERRIDE_APPROVED = 'OVERRIDE_APPROVED', _('Override Approved')
        OVERRIDE_DENIED = 'OVERRIDE_DENIED', _('Override Denied')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        AssessmentTemplate,
        on_delete=models.PROTECT,
        related_name='completed_assessments'
    )
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name='hazard_assessments'
    )
    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='completed_assessments'
    )
    
    # Assessment outcome
    status = models.CharField(
        _("Assessment Status"),
        max_length=20,
        choices=AssessmentStatus.choices,
        default=AssessmentStatus.IN_PROGRESS,
        db_index=True
    )
    overall_result = models.CharField(
        _("Overall Result"),
        max_length=20,
        choices=[('PASS', _('Pass')), ('FAIL', _('Fail')), ('INCOMPLETE', _('Incomplete'))],
        null=True,
        blank=True
    )
    
    # Safeguard data - anti-cheating measures
    start_timestamp = models.DateTimeField(_("Start Timestamp"), null=True, blank=True)
    end_timestamp = models.DateTimeField(_("End Timestamp"), null=True, blank=True)
    start_gps_latitude = models.DecimalField(
        _("Start GPS Latitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    start_gps_longitude = models.DecimalField(
        _("Start GPS Longitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    end_gps_latitude = models.DecimalField(
        _("End GPS Latitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    end_gps_longitude = models.DecimalField(
        _("End GPS Longitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    
    # Override system
    override_reason = models.TextField(
        _("Override Reason"),
        blank=True,
        help_text=_("Detailed reason for override request")
    )
    override_requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_overrides'
    )
    override_requested_at = models.DateTimeField(_("Override Requested At"), null=True, blank=True)
    override_reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_overrides'
    )
    override_reviewed_at = models.DateTimeField(_("Override Reviewed At"), null=True, blank=True)
    override_review_notes = models.TextField(_("Override Review Notes"), blank=True)
    
    # Additional metadata
    device_info = JSONField(
        _("Device Information"),
        default=dict,
        blank=True,
        help_text=_("Mobile device and app information")
    )
    completion_time_seconds = models.PositiveIntegerField(
        _("Completion Time (seconds)"),
        null=True,
        blank=True,
        help_text=_("Time taken to complete assessment")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # History tracking
    history = HistoricalRecords()
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Hazard Assessment")
        verbose_name_plural = _("Hazard Assessments")
        indexes = [
            models.Index(fields=['shipment', 'status']),
            models.Index(fields=['completed_by', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def save(self, *args, **kwargs):
        # Auto-calculate completion time if both timestamps exist
        if self.start_timestamp and self.end_timestamp:
            duration = self.end_timestamp - self.start_timestamp
            self.completion_time_seconds = int(duration.total_seconds())
        super().save(*args, **kwargs)
    
    @property
    def completion_time_display(self):
        """Human-readable completion time"""
        if not self.completion_time_seconds:
            return "N/A"
        minutes, seconds = divmod(self.completion_time_seconds, 60)
        return f"{minutes}m {seconds}s"
    
    @property
    def is_suspiciously_fast(self):
        """Flag assessments completed suspiciously quickly"""
        if not self.completion_time_seconds:
            return False
        # Flag if completed in less than 2 seconds per question
        expected_questions = self.template.sections.aggregate(
            total=models.Count('questions')
        )['total'] or 1
        minimum_expected_time = expected_questions * 2  # 2 seconds per question
        return self.completion_time_seconds < minimum_expected_time
    
    def __str__(self):
        return f"Assessment {self.id} - {self.shipment.tracking_number}"


class AssessmentAnswer(models.Model):
    """
    Individual answer to an assessment question with support for photos and comments.
    """
    
    class AnswerValue(models.TextChoices):
        YES = 'YES', _('Yes')
        NO = 'NO', _('No')
        NA = 'NA', _('N/A')
        PASS = 'PASS', _('Pass')
        FAIL = 'FAIL', _('Fail')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(
        HazardAssessment,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    question = models.ForeignKey(
        AssessmentQuestion,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    
    # Answer data
    answer_value = models.CharField(
        _("Answer"),
        max_length=10,
        choices=AnswerValue.choices,
        null=True,
        blank=True
    )
    text_answer = models.TextField(_("Text Answer"), blank=True)
    numeric_answer = models.DecimalField(
        _("Numeric Answer"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    comment = models.TextField(_("Comment"), blank=True)
    
    # Supporting documentation
    photo = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assessment_answers',
        help_text=_("Photo evidence for this answer")
    )
    
    # Override handling
    is_override = models.BooleanField(
        _("Is Override"),
        default=False,
        help_text=_("This answer was provided via override")
    )
    override_reason = models.TextField(_("Override Reason"), blank=True)
    
    # Answer metadata
    answered_at = models.DateTimeField(_("Answered At"), default=timezone.now)
    gps_latitude = models.DecimalField(
        _("GPS Latitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    gps_longitude = models.DecimalField(
        _("GPS Longitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Assessment Answer")
        verbose_name_plural = _("Assessment Answers")
        indexes = [
            models.Index(fields=['assessment', 'question']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['assessment', 'question'],
                name='unique_answer_per_question'
            )
        ]
    
    @property
    def is_failure_answer(self):
        """Check if this answer represents a failure"""
        return self.answer_value in ['NO', 'FAIL']
    
    @property
    def requires_photo(self):
        """Check if this answer should require a photo"""
        return self.is_failure_answer and self.question.is_photo_required_on_fail
    
    @property
    def requires_comment(self):
        """Check if this answer should require a comment"""
        return self.is_failure_answer and self.question.is_comment_required_on_fail
    
    def __str__(self):
        return f"{self.assessment.id} - {self.question.text[:30]}... = {self.answer_value}"


class AssessmentAssignment(models.Model):
    """
    Rules for automatically assigning assessment templates to shipments.
    """
    
    class TriggerCondition(models.TextChoices):
        FREIGHT_TYPE = 'FREIGHT_TYPE', _('Freight Type Match')
        DANGEROUS_GOODS = 'DANGEROUS_GOODS', _('Contains Dangerous Goods')
        WORKGROUP = 'WORKGROUP', _('User Workgroup')
        MANUAL = 'MANUAL', _('Manual Assignment')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        AssessmentTemplate,
        on_delete=models.CASCADE,
        related_name='assignment_rules'
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='assessment_assignments'
    )
    
    # Assignment conditions
    trigger_condition = models.CharField(
        _("Trigger Condition"),
        max_length=20,
        choices=TriggerCondition.choices
    )
    condition_data = JSONField(
        _("Condition Data"),
        default=dict,
        help_text=_("JSON data for the trigger condition")
    )
    
    # Assignment behavior
    is_active = models.BooleanField(_("Is Active"), default=True, db_index=True)
    priority = models.PositiveIntegerField(
        _("Priority"),
        default=100,
        help_text=_("Lower numbers = higher priority")
    )
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['priority', '-created_at']
        verbose_name = _("Assessment Assignment Rule")
        verbose_name_plural = _("Assessment Assignment Rules")
        indexes = [
            models.Index(fields=['company', 'is_active', 'priority']),
            models.Index(fields=['trigger_condition']),
        ]
    
    def __str__(self):
        return f"{self.template.name} - {self.get_trigger_condition_display()}"
