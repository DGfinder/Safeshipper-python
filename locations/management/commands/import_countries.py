# locations/management/commands/import_countries.py
import pycountry
from django.core.management.base import BaseCommand
from django.db import transaction
from locations.models import Country

class Command(BaseCommand):
    help = 'Imports countries from pycountry library into the database'

    def handle(self, *args, **options):
        self.stdout.write('Starting country import...')
        
        try:
            with transaction.atomic():
                # Get all countries from pycountry
                countries = list(pycountry.countries)
                
                # Create or update countries
                created_count = 0
                updated_count = 0
                
                for country in countries:
                    # Get additional data
                    subdivisions = list(pycountry.subdivisions.get(country_code=country.alpha_2))
                    languages = [lang.name for lang in pycountry.languages.get(alpha_2=country.alpha_2)] if hasattr(country, 'alpha_2') else []
                    
                    # Prepare country data
                    country_data = {
                        'name': country.name,
                        'alpha_2': country.alpha_2,
                        'alpha_3': country.alpha_3,
                        'numeric_code': country.numeric,
                        'official_name': getattr(country, 'official_name', country.name),
                        'common_name': getattr(country, 'common_name', country.name),
                        'region': getattr(country, 'region', None),
                        'subregion': getattr(country, 'subregion', None),
                        'is_independent': getattr(country, 'independent', True),
                        'is_un_member': getattr(country, 'un_member', False),
                        'currencies': [c.alpha_3 for c in pycountry.currencies.get(country_code=country.alpha_2)] if hasattr(country, 'alpha_2') else [],
                        'languages': languages,
                        'subdivisions_count': len(subdivisions),
                        'metadata': {
                            'subdivisions': [{'code': s.code, 'name': s.name} for s in subdivisions],
                            'calling_codes': getattr(country, 'calling_codes', []),
                            'capital': getattr(country, 'capital', None),
                            'flag': getattr(country, 'flag', None),
                        }
                    }
                    
                    # Update or create the country
                    country_obj, created = Country.objects.update_or_create(
                        alpha_2=country.alpha_2,
                        defaults=country_data
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully imported countries: {created_count} created, {updated_count} updated'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error importing countries: {str(e)}')
            )
            raise
