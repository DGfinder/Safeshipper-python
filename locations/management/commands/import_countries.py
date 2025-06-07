# locations/management/commands/import_countries.py
import pycountry
from django.core.management.base import BaseCommand, CommandError
from locations.models import Country # Assuming your app is 'locations'

class Command(BaseCommand):
    help = 'Imports ISO 3166-1 countries into the Country model.'

    def handle(self, *args, **options):
        self.stdout.write("Importing ISO 3166-1 countries...")
        created_count = 0
        updated_count = 0

        for country_data in pycountry.countries:
            try:
                code = country_data.alpha_2
                name = country_data.name
                # Use official_name if available, otherwise common name
                official_name = getattr(country_data, 'official_name', name)

                # continent_region from your Country model is CharField(null=True, blank=True)
                # pycountry doesn't have a direct, reliable continent mapping for all countries.
                # This part would need a more robust mapping or a different data source for continents.
                # For now, we'll leave it as None.
                continent_region_val = None 

                country, created = Country.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': official_name,
                        'continent_region': continent_region_val
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Error processing country {getattr(country_data, 'name', 'N/A')}: {e}"))
        
        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} countries and updated {updated_count} countries."))
