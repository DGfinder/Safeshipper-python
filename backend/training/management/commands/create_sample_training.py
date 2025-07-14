from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, date
from training.models import (
    TrainingCategory, TrainingProgram, TrainingSession, 
    TrainingEnrollment, TrainingRecord, ComplianceRequirement, 
    ComplianceStatus
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample training and certification data for testing and demonstration'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample training data...')
        
        # Get or create admin user for instructor
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                username='training_admin',
                email='training@safeshipper.com',
                password='admin123',
                first_name='Training',
                last_name='Administrator'
            )
            self.stdout.write(f'Created training admin user: {admin_user.username}')
        
        # Create training categories
        safety_category, created = TrainingCategory.objects.get_or_create(
            name='Safety & Compliance',
            defaults={
                'description': 'Mandatory safety and compliance training programs',
                'is_mandatory': True,
                'renewal_period_months': 12
            }
        )
        
        dg_category, created = TrainingCategory.objects.get_or_create(
            name='Dangerous Goods',
            defaults={
                'description': 'Specialized dangerous goods handling and transport training',
                'is_mandatory': True,
                'renewal_period_months': 24
            }
        )
        
        operational_category, created = TrainingCategory.objects.get_or_create(
            name='Operational Excellence',
            defaults={
                'description': 'Operational procedures and best practices',
                'is_mandatory': False,
                'renewal_period_months': 36
            }
        )
        
        # Create training programs
        programs_data = [
            {
                'name': 'ADG Code Awareness Training',
                'category': dg_category,
                'delivery_method': 'blended',
                'difficulty_level': 'intermediate',
                'duration_hours': 8.0,
                'learning_objectives': 'Understand Australian Dangerous Goods Code requirements and classification',
                'content_outline': 'DG classification, packaging, marking, labeling, documentation',
                'is_mandatory': True,
                'compliance_required': True,
                'passing_score': 85,
                'certificate_validity_months': 24
            },
            {
                'name': 'Driver Safety Induction',
                'category': safety_category,
                'delivery_method': 'classroom',
                'difficulty_level': 'beginner',
                'duration_hours': 4.0,
                'learning_objectives': 'Basic safety procedures for commercial drivers',
                'content_outline': 'Vehicle safety checks, emergency procedures, workplace safety',
                'is_mandatory': True,
                'compliance_required': True,
                'passing_score': 80,
                'certificate_validity_months': 12
            },
            {
                'name': 'Load Planning Optimization',
                'category': operational_category,
                'delivery_method': 'online',
                'difficulty_level': 'advanced',
                'duration_hours': 6.0,
                'learning_objectives': 'Advanced load planning and optimization techniques',
                'content_outline': 'Weight distribution, cargo securing, route optimization',
                'is_mandatory': False,
                'compliance_required': False,
                'passing_score': 75,
                'certificate_validity_months': 36
            },
            {
                'name': 'Emergency Response Procedures',
                'category': safety_category,
                'delivery_method': 'hands_on',
                'difficulty_level': 'intermediate',
                'duration_hours': 3.0,
                'learning_objectives': 'Emergency response protocols for dangerous goods incidents',
                'content_outline': 'Spill response, fire safety, evacuation procedures, first aid',
                'is_mandatory': True,
                'compliance_required': True,
                'passing_score': 90,
                'certificate_validity_months': 12
            }
        ]
        
        programs = []
        for prog_data in programs_data:
            program, created = TrainingProgram.objects.get_or_create(
                name=prog_data['name'],
                defaults={
                    **prog_data,
                    'instructor': admin_user
                }
            )
            programs.append(program)
            if created:
                self.stdout.write(f'Created training program: {program.name}')
        
        # Create training sessions
        for i, program in enumerate(programs):
            session_date = timezone.now() + timedelta(days=7 + (i * 14))  # Stagger sessions
            session, created = TrainingSession.objects.get_or_create(
                program=program,
                session_name=f'{program.name} - Session {i+1}',
                defaults={
                    'instructor': admin_user,
                    'scheduled_date': session_date,
                    'duration_hours': program.duration_hours,
                    'location': f'Training Room {i+1}' if program.delivery_method == 'classroom' else 'Online Platform',
                    'max_participants': 15,
                    'status': 'scheduled'
                }
            )
            if created:
                self.stdout.write(f'Created training session: {session.session_name}')
        
        # Create sample employees (drivers) for training
        driver_users = []
        for i in range(5):
            driver, created = User.objects.get_or_create(
                username=f'driver_{i+1:02d}',
                defaults={
                    'first_name': f'Driver{i+1}',
                    'last_name': 'Test',
                    'email': f'driver{i+1}@safeshipper.com',
                    'role': 'DRIVER',
                    'is_active': True
                }
            )
            if created:
                driver.set_password('driver123')
                driver.save()
            driver_users.append(driver)
            if created:
                self.stdout.write(f'Created driver: {driver.username}')
        
        # Create compliance requirements
        safety_requirement, created = ComplianceRequirement.objects.get_or_create(
            name='Driver Safety Certification',
            defaults={
                'description': 'Mandatory safety training for all drivers',
                'applicable_roles': ['DRIVER'],
                'applicable_departments': ['TRANSPORT', 'LOGISTICS'],
                'deadline_days': 30,
                'is_active': True
            }
        )
        if created:
            safety_requirement.required_programs.set([programs[1], programs[3]])  # Safety induction + emergency response
        
        dg_requirement, created = ComplianceRequirement.objects.get_or_create(
            name='Dangerous Goods Authorization',
            defaults={
                'description': 'ADG certification for dangerous goods transport',
                'applicable_roles': ['DRIVER'],
                'applicable_departments': ['DANGEROUS_GOODS'],
                'deadline_days': 14,
                'is_active': True
            }
        )
        if created:
            dg_requirement.required_programs.set([programs[0]])  # ADG training
        
        # Create some training enrollments and records
        for i, driver in enumerate(driver_users):
            # Some completed training
            if i < 3:  # First 3 drivers have completed safety training
                safety_session = TrainingSession.objects.filter(program=programs[1]).first()
                enrollment, created = TrainingEnrollment.objects.get_or_create(
                    employee=driver,
                    session=safety_session,
                    defaults={
                        'status': 'completed',
                        'completed_at': timezone.now() - timedelta(days=30),
                        'score': 85 + (i * 5),  # Varying scores
                        'passed': True,
                        'rating': 4
                    }
                )
                
                if created:
                    # Create training record
                    TrainingRecord.objects.create(
                        employee=driver,
                        program=programs[1],
                        enrollment=enrollment,
                        completed_at=enrollment.completed_at,
                        score=enrollment.score,
                        passed=enrollment.passed
                    )
                    self.stdout.write(f'Created training record for {driver.username}')
            
            # Some expired training (for testing)
            if i == 4:  # Last driver has expired certification
                old_session = TrainingSession.objects.filter(program=programs[1]).first()
                old_enrollment, created = TrainingEnrollment.objects.get_or_create(
                    employee=driver,
                    session=old_session,
                    defaults={
                        'status': 'completed',
                        'completed_at': timezone.now() - timedelta(days=400),
                        'score': 82,
                        'passed': True,
                        'rating': 3
                    }
                )
                
                if created:
                    # Create expired training record
                    record = TrainingRecord.objects.create(
                        employee=driver,
                        program=programs[1],
                        enrollment=old_enrollment,
                        completed_at=old_enrollment.completed_at,
                        score=old_enrollment.score,
                        passed=old_enrollment.passed,
                        status='expired'
                    )
                    # Manually set expiry date in the past
                    record.certificate_expires_at = timezone.now() - timedelta(days=30)
                    record.save()
                    self.stdout.write(f'Created expired training record for {driver.username}')
        
        # Create compliance status for all drivers
        for driver in driver_users:
            # Safety requirement
            due_date = driver.date_joined.date() + timedelta(days=30) if hasattr(driver, 'date_joined') else date.today()
            ComplianceStatus.objects.get_or_create(
                employee=driver,
                requirement=safety_requirement,
                defaults={
                    'status': 'compliant' if TrainingRecord.objects.filter(
                        employee=driver, program__in=safety_requirement.required_programs.all(), status='valid'
                    ).exists() else 'non_compliant',
                    'due_date': due_date
                }
            )
            
            # DG requirement
            ComplianceStatus.objects.get_or_create(
                employee=driver,
                requirement=dg_requirement,
                defaults={
                    'status': 'pending',  # Most drivers haven't completed DG training yet
                    'due_date': due_date
                }
            )
        
        # Summary
        total_categories = TrainingCategory.objects.count()
        total_programs = TrainingProgram.objects.count()
        total_sessions = TrainingSession.objects.count()
        total_enrollments = TrainingEnrollment.objects.count()
        total_records = TrainingRecord.objects.count()
        total_requirements = ComplianceRequirement.objects.count()
        total_compliance = ComplianceStatus.objects.count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Sample training data created successfully:\n'
                f'- {total_categories} training categories\n'
                f'- {total_programs} training programs\n'
                f'- {total_sessions} training sessions\n'
                f'- {total_enrollments} training enrollments\n'
                f'- {total_records} training records\n'
                f'- {total_requirements} compliance requirements\n'
                f'- {total_compliance} compliance statuses'
            )
        )