# training/management/commands/setup_adg_training.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from training.adg_driver_qualifications import setup_adg_training_programs
from training.models import ComplianceRequirement

User = get_user_model()


class Command(BaseCommand):
    help = 'Set up ADG driver training programs and compliance requirements'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-compliance-requirements',
            action='store_true',
            help='Create compliance requirements for drivers',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Setting up ADG driver training programs...')
        )
        
        try:
            # Set up ADG training programs
            category, created_programs = setup_adg_training_programs()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created ADG training category: {category.name}'
                )
            )
            
            if created_programs:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created {len(created_programs)} new training programs:'
                    )
                )
                for program in created_programs:
                    self.stdout.write(f'  ✓ {program.name}')
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'No new training programs created. All programs already exist.'
                    )
                )
            
            # Create compliance requirements if requested
            if options['create_compliance_requirements']:
                self.stdout.write('\nCreating driver compliance requirements...')
                self._create_driver_compliance_requirements(category, created_programs)
            
            self.stdout.write('\n' + '='*60)
            self.stdout.write(
                self.style.SUCCESS('ADG Training Program Summary:')
            )
            self.stdout.write('='*60)
            
            # Display summary of training programs
            from training.models import TrainingProgram
            adg_programs = TrainingProgram.objects.filter(category=category)
            
            for program in adg_programs:
                mandatory_status = "MANDATORY" if program.is_mandatory else "OPTIONAL"
                validity = f"{program.certificate_validity_months} months" if program.certificate_validity_months else "No expiry"
                
                self.stdout.write(
                    f'✓ {program.name}'
                )
                self.stdout.write(
                    f'  Duration: {program.duration_hours}h | '
                    f'Status: {mandatory_status} | '
                    f'Validity: {validity}'
                )
            
            self.stdout.write('\n' + self.style.SUCCESS(
                'Setup completed successfully!'
            ))
            
            self.stdout.write('\n' + self.style.WARNING(
                'Next Steps:'
            ))
            self.stdout.write(
                '1. Set up training sessions for the programs\n'
                '2. Enroll drivers in mandatory training\n'
                '3. Configure competency profiles for existing drivers\n'
                '4. Run driver qualification validation'
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error setting up ADG training: {str(e)}')
            )
            raise

    def _create_driver_compliance_requirements(self, category, programs):
        """Create compliance requirements for drivers"""
        
        # Get mandatory programs
        mandatory_programs = [p for p in programs if p.is_mandatory]
        
        if not mandatory_programs:
            from training.models import TrainingProgram
            mandatory_programs = TrainingProgram.objects.filter(
                category=category,
                is_mandatory=True
            )
        
        # Create basic compliance requirement for all drivers
        basic_requirement, created = ComplianceRequirement.objects.get_or_create(
            name='ADG Basic Driver Qualification',
            defaults={
                'description': 'Basic ADG dangerous goods training required for all drivers',
                'applicable_roles': ['DRIVER'],
                'applicable_departments': [],
                'deadline_days': 30
            }
        )
        
        if created:
            # Add mandatory programs to the requirement
            basic_requirement.required_programs.set(mandatory_programs)
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Created compliance requirement: {basic_requirement.name}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Compliance requirement already exists: {basic_requirement.name}'
                )
            )
        
        # Create advanced compliance requirement for senior drivers
        advanced_requirement, created = ComplianceRequirement.objects.get_or_create(
            name='ADG Advanced Driver Qualification',
            defaults={
                'description': 'Advanced ADG training for experienced dangerous goods drivers',
                'applicable_roles': ['DRIVER'],
                'applicable_departments': ['DANGEROUS_GOODS', 'LOGISTICS'],
                'deadline_days': 60
            }
        )
        
        if created:
            from training.models import TrainingProgram
            # Add all ADG programs to advanced requirement
            all_adg_programs = TrainingProgram.objects.filter(category=category)
            advanced_requirement.required_programs.set(all_adg_programs)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Created advanced compliance requirement: {advanced_requirement.name}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Advanced compliance requirement already exists: {advanced_requirement.name}'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                'Driver compliance requirements created successfully!'
            )
        )