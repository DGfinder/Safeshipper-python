from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class TrainingCategory(models.Model):
    """Categories of training programs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    is_mandatory = models.BooleanField(default=False)
    renewal_period_months = models.IntegerField(null=True, blank=True)  # How often to renew
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Training Categories'
    
    def __str__(self):
        return self.name


class TrainingProgram(models.Model):
    """Training programs and courses"""
    DELIVERY_METHODS = [
        ('online', 'Online'),
        ('classroom', 'Classroom'),
        ('hands_on', 'Hands-on'),
        ('blended', 'Blended'),
    ]
    
    DIFFICULTY_LEVELS = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(TrainingCategory, on_delete=models.CASCADE)
    delivery_method = models.CharField(max_length=20, choices=DELIVERY_METHODS)
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_LEVELS)
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2)
    
    # Prerequisites
    prerequisites = models.ManyToManyField('self', blank=True, symmetrical=False)
    
    # Content
    learning_objectives = models.TextField()
    content_outline = models.TextField()
    materials_url = models.URLField(blank=True)
    
    # Compliance
    is_mandatory = models.BooleanField(default=False)
    compliance_required = models.BooleanField(default=False)
    passing_score = models.IntegerField(default=80, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Validity
    certificate_validity_months = models.IntegerField(null=True, blank=True)
    
    # Instructor
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class TrainingSession(models.Model):
    """Scheduled training sessions"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(TrainingProgram, on_delete=models.CASCADE)
    session_name = models.CharField(max_length=200)
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='instructed_sessions')
    
    # Schedule
    scheduled_date = models.DateTimeField()
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2)
    location = models.CharField(max_length=200, blank=True)  # Physical or virtual
    
    # Capacity
    max_participants = models.IntegerField(default=20)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Notes
    session_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-scheduled_date']
    
    def __str__(self):
        return f"{self.program.name} - {self.session_name}"
    
    @property
    def enrolled_count(self):
        return self.enrollments.filter(status='enrolled').count()
    
    @property
    def available_spots(self):
        return self.max_participants - self.enrolled_count


class TrainingEnrollment(models.Model):
    """Employee enrollment in training sessions"""
    STATUS_CHOICES = [
        ('enrolled', 'Enrolled'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='training_enrollments')
    session = models.ForeignKey(TrainingSession, on_delete=models.CASCADE, related_name='enrollments')
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    
    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    passed = models.BooleanField(default=False)
    
    # Feedback
    feedback = models.TextField(blank=True)
    rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-enrolled_at']
        unique_together = ['employee', 'session']
    
    def __str__(self):
        return f"{self.employee.username} - {self.session.program.name}"


class TrainingRecord(models.Model):
    """Employee training completion records"""
    STATUS_CHOICES = [
        ('valid', 'Valid'),
        ('expired', 'Expired'),
        ('expiring_soon', 'Expiring Soon'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='training_records')
    program = models.ForeignKey(TrainingProgram, on_delete=models.CASCADE)
    enrollment = models.ForeignKey(TrainingEnrollment, on_delete=models.CASCADE)
    
    # Completion details
    completed_at = models.DateTimeField()
    score = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    passed = models.BooleanField()
    
    # Certificate
    certificate_number = models.CharField(max_length=50, unique=True)
    certificate_issued_at = models.DateTimeField(auto_now_add=True)
    certificate_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valid')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-completed_at']
        unique_together = ['employee', 'program']
    
    def __str__(self):
        return f"{self.employee.username} - {self.program.name} Certificate"
    
    def save(self, *args, **kwargs):
        if not self.certificate_number:
            # Generate certificate number: CERT-YYYY-NNNN
            year = timezone.now().year
            last_cert = TrainingRecord.objects.filter(
                certificate_number__startswith=f'CERT-{year}-'
            ).order_by('-certificate_number').first()
            
            if last_cert:
                last_number = int(last_cert.certificate_number.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1
            
            self.certificate_number = f'CERT-{year}-{new_number:04d}'
        
        # Set expiration date if program has validity period
        if self.program.certificate_validity_months and not self.certificate_expires_at:
            from dateutil.relativedelta import relativedelta
            self.certificate_expires_at = self.completed_at + relativedelta(
                months=self.program.certificate_validity_months
            )
        
        super().save(*args, **kwargs)
    
    def update_status(self):
        """Update record status based on expiration"""
        if self.certificate_expires_at:
            now = timezone.now()
            days_until_expiry = (self.certificate_expires_at - now).days
            
            if days_until_expiry < 0:
                self.status = 'expired'
            elif days_until_expiry <= 30:
                self.status = 'expiring_soon'
            else:
                self.status = 'valid'
            
            self.save()


class ComplianceRequirement(models.Model):
    """Compliance requirements for roles/departments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField()
    
    # Applicability
    applicable_roles = models.JSONField(default=list)  # List of role names
    applicable_departments = models.JSONField(default=list)  # List of department names
    
    # Requirements
    required_programs = models.ManyToManyField(TrainingProgram)
    
    # Deadlines
    deadline_days = models.IntegerField(default=30)  # Days after hire/role change
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ComplianceStatus(models.Model):
    """Employee compliance status tracking"""
    STATUS_CHOICES = [
        ('compliant', 'Compliant'),
        ('non_compliant', 'Non-Compliant'),
        ('pending', 'Pending'),
        ('overdue', 'Overdue'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliance_statuses')
    requirement = models.ForeignKey(ComplianceRequirement, on_delete=models.CASCADE)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField()
    last_checked = models.DateTimeField(auto_now=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['due_date']
        unique_together = ['employee', 'requirement']
    
    def __str__(self):
        return f"{self.employee.username} - {self.requirement.name}"
    
    def check_compliance(self):
        """Check if employee meets compliance requirements"""
        required_programs = self.requirement.required_programs.all()
        
        for program in required_programs:
            try:
                record = TrainingRecord.objects.get(
                    employee=self.employee,
                    program=program,
                    status='valid'
                )
            except TrainingRecord.DoesNotExist:
                self.status = 'non_compliant'
                self.save()
                return False
        
        self.status = 'compliant'
        self.save()
        return True


class TrainingModule(models.Model):
    """
    Modular components within training programs.
    Allows programs to be broken down into smaller, trackable units.
    """
    MODULE_TYPES = [
        ('lesson', 'Lesson'),
        ('quiz', 'Quiz'),
        ('assessment', 'Assessment'),
        ('practical', 'Practical Exercise'),
        ('video', 'Video Content'),
        ('reading', 'Reading Material'),
        ('simulation', 'Simulation'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(TrainingProgram, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=200)
    description = models.TextField()
    module_type = models.CharField(max_length=20, choices=MODULE_TYPES)
    
    # Ordering and structure
    order = models.IntegerField(default=0)  # Order within the program
    is_mandatory = models.BooleanField(default=True)
    
    # Content
    content = models.TextField(blank=True)  # Rich text content
    video_url = models.URLField(blank=True)
    document_url = models.URLField(blank=True)
    external_link = models.URLField(blank=True)
    
    # Assessment details (for quiz/assessment modules)
    passing_score = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    max_attempts = models.IntegerField(default=3)
    time_limit_minutes = models.IntegerField(null=True, blank=True)
    
    # Completion tracking
    estimated_duration_minutes = models.IntegerField(default=30)
    completion_criteria = models.JSONField(default=dict)  # Flexible completion rules
    
    # Prerequisites
    prerequisite_modules = models.ManyToManyField(
        'self', blank=True, symmetrical=False, related_name='dependent_modules'
    )
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_modules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['program', 'order', 'title']
        unique_together = ['program', 'order']
    
    def __str__(self):
        return f"{self.program.name} - {self.title}"
    
    @property
    def completion_rate(self):
        """Calculate overall completion rate for this module"""
        total_attempts = self.user_module_progress.count()
        if total_attempts == 0:
            return 0
        completed = self.user_module_progress.filter(status='completed').count()
        return (completed / total_attempts) * 100
    
    def get_next_module(self):
        """Get the next module in the program sequence"""
        return TrainingModule.objects.filter(
            program=self.program,
            order__gt=self.order,
            status='published'
        ).first()
    
    def get_previous_module(self):
        """Get the previous module in the program sequence"""
        return TrainingModule.objects.filter(
            program=self.program,
            order__lt=self.order,
            status='published'
        ).last()


class UserTrainingRecord(models.Model):
    """
    Comprehensive training record for users with detailed progress tracking.
    This extends beyond the basic TrainingRecord to provide granular tracking.
    """
    PROGRESS_STATUS = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('expired', 'Expired'),
        ('suspended', 'Suspended'),
    ]
    
    COMPLIANCE_STATUS = [
        ('compliant', 'Compliant'),
        ('non_compliant', 'Non-Compliant'),
        ('pending_renewal', 'Pending Renewal'),
        ('overdue', 'Overdue'),
        ('exempt', 'Exempt'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_training_records')
    program = models.ForeignKey(TrainingProgram, on_delete=models.CASCADE, related_name='user_records')
    enrollment = models.ForeignKey(
        TrainingEnrollment, on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Progress tracking
    progress_status = models.CharField(max_length=20, choices=PROGRESS_STATUS, default='not_started')
    overall_progress_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Assessment results
    total_attempts = models.IntegerField(default=0)
    best_score = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    latest_score = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    passed = models.BooleanField(default=False)
    
    # Compliance tracking
    compliance_status = models.CharField(max_length=20, choices=COMPLIANCE_STATUS, default='pending_renewal')
    is_mandatory_for_role = models.BooleanField(default=False)
    required_by_date = models.DateField(null=True, blank=True)
    
    # Certification details
    certificate_issued = models.BooleanField(default=False)
    certificate_number = models.CharField(max_length=100, blank=True)
    certificate_issued_at = models.DateTimeField(null=True, blank=True)
    certificate_expires_at = models.DateTimeField(null=True, blank=True)
    certificate_renewed_count = models.IntegerField(default=0)
    
    # Time tracking
    total_time_spent_minutes = models.IntegerField(default=0)
    estimated_completion_time_minutes = models.IntegerField(null=True, blank=True)
    
    # Engagement metrics
    modules_completed = models.IntegerField(default=0)
    total_modules = models.IntegerField(default=0)
    bookmarks = models.JSONField(default=list)  # Bookmarked content/modules
    notes = models.TextField(blank=True)  # User's personal notes
    
    # Supervisor/Manager tracking
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_training_records'
    )
    supervisor_approved = models.BooleanField(default=False)
    supervisor_approval_date = models.DateTimeField(null=True, blank=True)
    supervisor_notes = models.TextField(blank=True)
    
    # Renewal tracking
    renewal_due_date = models.DateField(null=True, blank=True)
    renewal_reminders_sent = models.IntegerField(default=0)
    last_reminder_sent = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'program']
        indexes = [
            models.Index(fields=['user', 'progress_status']),
            models.Index(fields=['compliance_status', 'required_by_date']),
            models.Index(fields=['certificate_expires_at']),
            models.Index(fields=['renewal_due_date']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.program.name}"
    
    def save(self, *args, **kwargs):
        # Auto-set total modules count
        if not self.total_modules:
            self.total_modules = self.program.modules.filter(status='published').count()
        
        # Set estimated completion time from program
        if not self.estimated_completion_time_minutes:
            total_minutes = self.program.modules.filter(
                status='published'
            ).aggregate(
                total=models.Sum('estimated_duration_minutes')
            )['total'] or 0
            self.estimated_completion_time_minutes = total_minutes
        
        # Update compliance status based on various factors
        self._update_compliance_status()
        
        super().save(*args, **kwargs)
    
    def _update_compliance_status(self):
        """Update compliance status based on current state"""
        now = timezone.now()
        
        if self.progress_status == 'completed' and self.passed:
            if self.certificate_expires_at:
                if self.certificate_expires_at < now:
                    self.compliance_status = 'non_compliant'
                elif (self.certificate_expires_at - now).days <= 30:
                    self.compliance_status = 'pending_renewal'
                else:
                    self.compliance_status = 'compliant'
            else:
                self.compliance_status = 'compliant'
        
        elif self.required_by_date and self.required_by_date < now.date():
            self.compliance_status = 'overdue'
        
        else:
            self.compliance_status = 'non_compliant'
    
    def calculate_progress(self):
        """Calculate and update progress percentage based on module completion"""
        if self.total_modules == 0:
            self.overall_progress_percentage = 0
            return 0
        
        # Get completed modules count
        completed_modules = UserModuleProgress.objects.filter(
            user_record=self,
            status='completed'
        ).count()
        
        self.modules_completed = completed_modules
        progress = (completed_modules / self.total_modules) * 100
        self.overall_progress_percentage = round(progress, 2)
        
        # Update progress status
        if progress == 100:
            self.progress_status = 'completed'
            if not self.completed_at:
                self.completed_at = timezone.now()
        elif progress > 0:
            self.progress_status = 'in_progress'
            if not self.started_at:
                self.started_at = timezone.now()
        
        self.save()
        return self.overall_progress_percentage
    
    def is_due_for_renewal(self, days_ahead=30):
        """Check if training is due for renewal within specified days"""
        if not self.renewal_due_date:
            return False
        
        cutoff_date = timezone.now().date() + timezone.timedelta(days=days_ahead)
        return self.renewal_due_date <= cutoff_date
    
    def get_time_spent_formatted(self):
        """Get formatted time spent (e.g., '2h 30m')"""
        if self.total_time_spent_minutes == 0:
            return "0m"
        
        hours = self.total_time_spent_minutes // 60
        minutes = self.total_time_spent_minutes % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
        return f"{minutes}m"
    
    def get_next_module(self):
        """Get the next incomplete module for this user"""
        completed_modules = UserModuleProgress.objects.filter(
            user_record=self,
            status='completed'
        ).values_list('module_id', flat=True)
        
        return self.program.modules.filter(
            status='published',
            is_mandatory=True
        ).exclude(
            id__in=completed_modules
        ).order_by('order').first()


class UserModuleProgress(models.Model):
    """
    Tracks individual module progress within training programs.
    Provides granular tracking of each module's completion status.
    """
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_record = models.ForeignKey(
        UserTrainingRecord, on_delete=models.CASCADE, related_name='module_progress'
    )
    module = models.ForeignKey(
        TrainingModule, on_delete=models.CASCADE, related_name='user_module_progress'
    )
    
    # Progress tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    progress_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_minutes = models.IntegerField(default=0)
    
    # Assessment results (for quiz/assessment modules)
    attempts_count = models.IntegerField(default=0)
    best_score = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    latest_score = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    passed = models.BooleanField(default=False)
    
    # Engagement data
    last_position = models.JSONField(default=dict)  # Last position in content (page, video time, etc.)
    bookmarked_positions = models.JSONField(default=list)  # Bookmarked positions
    interaction_data = models.JSONField(default=dict)  # Clicks, views, etc.
    
    # Notes and feedback
    user_notes = models.TextField(blank=True)
    completion_feedback = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['module__order', '-updated_at']
        unique_together = ['user_record', 'module']
        indexes = [
            models.Index(fields=['user_record', 'status']),
            models.Index(fields=['module', 'status']),
            models.Index(fields=['completed_at']),
        ]
    
    def __str__(self):
        return f"{self.user_record.user.get_full_name()} - {self.module.title}"
    
    def save(self, *args, **kwargs):
        # Auto-set timestamps
        if self.status == 'in_progress' and not self.started_at:
            self.started_at = timezone.now()
        elif self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
            self.progress_percentage = 100.00
        
        super().save(*args, **kwargs)
        
        # Update parent UserTrainingRecord progress
        if self.user_record_id:
            self.user_record.calculate_progress()
    
    def mark_completed(self, score=None):
        """Mark module as completed with optional score"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.progress_percentage = 100.00
        
        if score is not None:
            self.latest_score = score
            if self.best_score is None or score > self.best_score:
                self.best_score = score
            
            # Check if passed based on module's passing score
            if self.module.passing_score:
                self.passed = score >= self.module.passing_score
            else:
                self.passed = True
        else:
            self.passed = True
        
        self.save()
    
    def add_time_spent(self, minutes):
        """Add time spent on this module"""
        self.time_spent_minutes += minutes
        self.save()
        
        # Also update the parent record
        self.user_record.total_time_spent_minutes += minutes
        self.user_record.last_accessed_at = timezone.now()
        self.user_record.save()
    
    def update_progress(self, percentage):
        """Update progress percentage"""
        self.progress_percentage = min(100.00, max(0.00, percentage))
        
        if self.progress_percentage > 0 and self.status == 'not_started':
            self.status = 'in_progress'
        elif self.progress_percentage == 100 and self.status != 'completed':
            self.mark_completed()
        
        self.save()