# vehicles/management/commands/setup_adg_equipment.py

from django.core.management.base import BaseCommand
from vehicles.adg_safety_services import setup_adg_equipment_types


class Command(BaseCommand):
    help = 'Set up ADG Code 7.9 compliant safety equipment types'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing equipment types with ADG requirements',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Setting up ADG Code 7.9 safety equipment types...')
        )
        
        try:
            created_count = setup_adg_equipment_types()
            
            if created_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created {created_count} ADG equipment types.'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'No new ADG equipment types created. All types already exist.'
                    )
                )
            
            self.stdout.write(
                self.style.SUCCESS(
                    'ADG Code 7.9 safety equipment setup completed successfully!'
                )
            )
            
            # Display summary of ADG requirements
            self.stdout.write('\n' + '='*60)
            self.stdout.write(
                self.style.SUCCESS('ADG Code 7.9 Equipment Summary:')
            )
            self.stdout.write('='*60)
            
            equipment_summary = [
                'Fire Extinguisher (ABE Type) - AS/NZS 1841.1',
                'First Aid Kit (AS 2675) - Australian Standard',
                'Spill Absorption Material - Classes 3, 5',
                'Acid Spill Kit - Class 8 Corrosives',
                'Emergency Chocks - All Classes',
                'Personal Protective Equipment Set - AS/NZS Standards',
                'Eye Wash Equipment - Classes 6, 8',
                'Non-Sparking Tools - Classes 1, 4',
                'Sand for Smothering - Class 4'
            ]
            
            for equipment in equipment_summary:
                self.stdout.write(f'✓ {equipment}')
            
            self.stdout.write('\n' + self.style.WARNING(
                'Note: Ensure all vehicles are validated against ADG requirements '
                'using the new ADG compliance endpoints.'
            ))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error setting up ADG equipment types: {str(e)}')
            )
            raise