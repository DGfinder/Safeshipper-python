from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import TrainingEnrollment, TrainingRecord, ComplianceStatus


@receiver(post_save, sender=TrainingEnrollment)
def create_training_record(sender, instance, created, **kwargs):
    """Create training record when enrollment is completed successfully"""
    if not created and instance.status == 'completed' and instance.passed:
        # Check if record already exists
        if not TrainingRecord.objects.filter(
            employee=instance.employee,
            program=instance.session.program,
            enrollment=instance
        ).exists():
            
            TrainingRecord.objects.create(
                employee=instance.employee,
                program=instance.session.program,
                enrollment=instance,
                completed_at=instance.completed_at or timezone.now(),
                score=instance.score,
                passed=instance.passed
            )
            
            # Update compliance status
            update_compliance_status(instance.employee)


def update_compliance_status(employee):
    """Update compliance status for an employee"""
    from .models import ComplianceRequirement
    
    # Get all applicable requirements for this employee
    requirements = ComplianceRequirement.objects.filter(is_active=True)
    
    for requirement in requirements:
        # Check if requirement applies to this employee
        if (employee.role in requirement.applicable_roles or 
            getattr(employee, 'department', None) in requirement.applicable_departments):
            
            # Get or create compliance status
            status, created = ComplianceStatus.objects.get_or_create(
                employee=employee,
                requirement=requirement,
                defaults={
                    'due_date': timezone.now().date() + timezone.timedelta(
                        days=requirement.deadline_days
                    )
                }
            )
            
            # Check compliance
            status.check_compliance()