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