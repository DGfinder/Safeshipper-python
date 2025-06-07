# locations/management/commands/import_countries.py
import pycountry
from django.core.management.base import BaseCommand, CommandError
from locations.models import Country # Assuming your app is 'locations'

class Command(BaseCommand):
    help = 'Import countries from pycountry'

    def handle(self, *args, **options):
        created = 0
        for country in pycountry.countries:
            obj, was_created = Country.objects.get_or_create(
                code=country.alpha_2,
                defaults={'name': country.name}
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Imported {created} countries.'))
