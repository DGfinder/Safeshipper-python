"""
Django management command to seed the database with standard safety equipment types
required for ADR compliance.
"""

from django.core.management.base import BaseCommand, CommandError
from vehicles.safety_services import seed_standard_equipment_types


class Command(BaseCommand):
    help = 'Seed the database with standard safety equipment types required for ADR compliance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of equipment types (will skip existing types by default)',
        )

    def handle(self, *args, **options):
        self.stdout.write('Seeding standard safety equipment types...')
        
        try:
            created_count = seed_standard_equipment_types()
            
            if created_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created {created_count} safety equipment types'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'No new safety equipment types were created (they may already exist)'
                    )
                )
                
        except Exception as e:
            raise CommandError(f'Failed to seed safety equipment types: {str(e)}')
        
        self.stdout.write(
            self.style.SUCCESS('Safety equipment seeding completed successfully!')
        )