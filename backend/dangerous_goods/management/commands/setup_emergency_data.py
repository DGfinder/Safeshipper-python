# dangerous_goods/management/commands/setup_emergency_data.py

from django.core.management.base import BaseCommand
from dangerous_goods.emergency_info_panel import EmergencyContact, EmergencyProcedure, setup_default_emergency_contacts


class Command(BaseCommand):
    help = 'Set up default emergency contacts and procedures for EIP generation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing data',
        )

    def handle(self, *args, **options):
        self.stdout.write('Setting up emergency contacts and procedures...')
        
        # Check if data already exists
        existing_contacts = EmergencyContact.objects.count()
        existing_procedures = EmergencyProcedure.objects.count()
        
        if (existing_contacts > 0 or existing_procedures > 0) and not options['force']:
            self.stdout.write(
                self.style.WARNING(
                    f'Found {existing_contacts} emergency contacts and {existing_procedures} procedures. '
                    'Use --force to update existing data.'
                )
            )
            return
        
        if options['force']:
            if existing_contacts > 0:
                self.stdout.write(f'Removing {existing_contacts} existing emergency contacts...')
                EmergencyContact.objects.all().delete()
            
            if existing_procedures > 0:
                self.stdout.write(f'Removing {existing_procedures} existing emergency procedures...')
                EmergencyProcedure.objects.all().delete()
        
        # Set up default emergency contacts
        setup_default_emergency_contacts()
        
        # Set up some basic emergency procedures
        self._setup_basic_emergency_procedures()
        
        # Report results
        final_contacts = EmergencyContact.objects.count()
        final_procedures = EmergencyProcedure.objects.count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully set up {final_contacts} emergency contacts and {final_procedures} emergency procedures.'
            )
        )
        
        # List the contacts
        self.stdout.write('\nCreated emergency contacts:')
        for contact in EmergencyContact.objects.order_by('priority'):
            self.stdout.write(f'  - {contact}')
    
    def _setup_basic_emergency_procedures(self):
        """Set up basic emergency procedures for common hazard classes."""
        
        procedures_data = [
            {
                'hazard_class': '3',
                'procedure_type': EmergencyProcedure.ProcedureType.FIRE_RESPONSE,
                'procedure_title': 'Flammable Liquid Fire Response',
                'immediate_actions': [
                    'Call Fire & Rescue: 000',
                    'Evacuate area immediately',
                    'Remove ignition sources if safe to do so',
                    'Cool containers with water from maximum distance'
                ],
                'detailed_steps': [
                    'Use foam, dry chemical, or CO2 to extinguish fire',
                    'Do not use water jet directly on burning liquid',
                    'Let burn if leak cannot be stopped safely',
                    'Withdraw and let burn until fuel is consumed'
                ],
                'ppe_requirements': [
                    'Full protective clothing',
                    'Self-contained breathing apparatus',
                    'Chemical resistant gloves'
                ],
                'priority': 10
            },
            
            {
                'hazard_class': '8',
                'procedure_type': EmergencyProcedure.ProcedureType.SPILL_RESPONSE,
                'procedure_title': 'Corrosive Material Spill Response',
                'immediate_actions': [
                    'Stop leak if safe to do so',
                    'Keep people away from spill',
                    'Ventilate area if indoors',
                    'Avoid walking through spilled material'
                ],
                'detailed_steps': [
                    'Neutralize spill with appropriate materials',
                    'Absorb or contain spill with inert materials',
                    'Do not use combustible materials as absorbent',
                    'Collect for proper disposal'
                ],
                'ppe_requirements': [
                    'Chemical resistant clothing',
                    'Acid/alkali resistant gloves',
                    'Eye protection',
                    'Respiratory protection if vapors present'
                ],
                'priority': 10
            },
            
            {
                'hazard_class': '2.1',
                'procedure_type': EmergencyProcedure.ProcedureType.FIRE_RESPONSE,
                'procedure_title': 'Flammable Gas Fire Response',
                'immediate_actions': [
                    'Call Fire & Rescue: 000',
                    'Evacuate area immediately',
                    'Remove ignition sources',
                    'Do not extinguish gas fire unless leak can be stopped'
                ],
                'detailed_steps': [
                    'Cool containers with water from maximum distance',
                    'Let gas burn to prevent vapor cloud formation',
                    'If fire is extinguished, prevent re-ignition',
                    'Monitor for gas accumulation'
                ],
                'ppe_requirements': [
                    'Full protective clothing',
                    'Self-contained breathing apparatus',
                    'Explosion-proof equipment only'
                ],
                'priority': 10
            }
        ]
        
        for proc_data in procedures_data:
            EmergencyProcedure.objects.get_or_create(
                hazard_class=proc_data['hazard_class'],
                procedure_type=proc_data['procedure_type'],
                defaults=proc_data
            )