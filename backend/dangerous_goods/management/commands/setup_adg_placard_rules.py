# dangerous_goods/management/commands/setup_adg_placard_rules.py

from django.core.management.base import BaseCommand
from dangerous_goods.models import ADGPlacardRule
from dangerous_goods.placard_calculator import setup_default_adg_rules


class Command(BaseCommand):
    help = 'Set up default ADG Code 7.9 placard rules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing rules',
        )

    def handle(self, *args, **options):
        self.stdout.write('Setting up ADG Code 7.9 placard rules...')
        
        # Check if rules already exist
        existing_count = ADGPlacardRule.objects.count()
        
        if existing_count > 0 and not options['force']:
            self.stdout.write(
                self.style.WARNING(
                    f'Found {existing_count} existing placard rules. '
                    'Use --force to update existing rules.'
                )
            )
            return
        
        if options['force'] and existing_count > 0:
            self.stdout.write(f'Removing {existing_count} existing rules...')
            ADGPlacardRule.objects.all().delete()
        
        # Set up default rules
        setup_default_adg_rules()
        
        # Report results
        final_count = ADGPlacardRule.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully set up {final_count} ADG placard rules.'
            )
        )
        
        # List the rules
        self.stdout.write('\nCreated rules:')
        for rule in ADGPlacardRule.objects.order_by('priority'):
            self.stdout.write(f'  - {rule}')