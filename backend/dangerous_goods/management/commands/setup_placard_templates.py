# dangerous_goods/management/commands/setup_placard_templates.py

from django.core.management.base import BaseCommand
from dangerous_goods.models import PlacardTemplate
from dangerous_goods.placard_generator import setup_default_placard_templates


class Command(BaseCommand):
    help = 'Set up default ADG-compliant placard templates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing templates',
        )

    def handle(self, *args, **options):
        self.stdout.write('Setting up ADG placard templates...')
        
        # Check if templates already exist
        existing_count = PlacardTemplate.objects.count()
        
        if existing_count > 0 and not options['force']:
            self.stdout.write(
                self.style.WARNING(
                    f'Found {existing_count} existing placard templates. '
                    'Use --force to update existing templates.'
                )
            )
            return
        
        if options['force'] and existing_count > 0:
            self.stdout.write(f'Removing {existing_count} existing templates...')
            PlacardTemplate.objects.all().delete()
        
        # Set up default templates
        setup_default_placard_templates()
        
        # Report results
        final_count = PlacardTemplate.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully set up {final_count} placard templates.'
            )
        )
        
        # List the templates
        self.stdout.write('\nCreated templates:')
        for template in PlacardTemplate.objects.order_by('template_type'):
            self.stdout.write(f'  - {template}')