# dangerous_goods/management/commands/import_chemical_reactivity.py
import csv
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from dangerous_goods.models import DangerousGood, ChemicalReactivityProfile

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Import strong alkaline and acid data from CSV files to create ChemicalReactivityProfile records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--alkaline-csv',
            type=str,
            help='Path to the strong alkaline CSV file',
            default='/mnt/c/Users/Hayden/Downloads/IATA Dangerous Goods - Strong Alkaline List (1).csv'
        )
        parser.add_argument(
            '--acid-csv',
            type=str,
            help='Path to the strong acid CSV file',
            default='/mnt/c/Users/Hayden/Downloads/IATA Dangerous Goods - Strong Acid List.csv'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without actually creating records'
        )
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing ChemicalReactivityProfile records'
        )

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                # Import strong alkaline materials
                if options['alkaline_csv']:
                    alkaline_count = self.import_alkaline_materials(
                        options['alkaline_csv'], 
                        options['dry_run'], 
                        options['update_existing']
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f'Processed {alkaline_count} strong alkaline materials')
                    )

                # Import strong acid materials
                if options['acid_csv']:
                    acid_count = self.import_acid_materials(
                        options['acid_csv'], 
                        options['dry_run'], 
                        options['update_existing']
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f'Processed {acid_count} strong acid materials')
                    )

                if options['dry_run']:
                    self.stdout.write(
                        self.style.WARNING('DRY RUN: No changes were actually made to the database')
                    )
                    raise Exception("Dry run - rolling back transaction")

        except Exception as e:
            if not options['dry_run']:
                logger.error(f"Failed to import chemical reactivity data: {str(e)}")
                raise CommandError(f"Import failed: {str(e)}")

    def import_alkaline_materials(self, csv_path: str, dry_run: bool, update_existing: bool) -> int:
        """Import strong alkaline materials from CSV."""
        count = 0
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                for row in reader:
                    un_number = str(row['un_number']).strip()
                    if not un_number or un_number.lower() in ['', 'nan', 'null']:
                        continue
                    
                    # Clean UN number format
                    if not un_number.startswith('UN'):
                        un_number = f'UN{un_number}'
                    
                    # Find the dangerous good
                    try:
                        dangerous_good = DangerousGood.objects.get(un_number=un_number)
                    except DangerousGood.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f'Dangerous good {un_number} not found in database')
                        )
                        continue
                    
                    # Check if profile already exists
                    profile_exists = ChemicalReactivityProfile.objects.filter(
                        dangerous_good=dangerous_good
                    ).exists()
                    
                    if profile_exists and not update_existing:
                        self.stdout.write(
                            self.style.WARNING(f'Profile for {un_number} already exists, skipping')
                        )
                        continue
                    
                    # Determine strength level based on common knowledge
                    strength_level = self.determine_alkaline_strength(row)
                    
                    # Create or update profile
                    if not dry_run:
                        profile_data = {
                            'reactivity_type': ChemicalReactivityProfile.ReactivityType.STRONG_ALKALI,
                            'strength_level': strength_level,
                            'typical_ph_min': 12.0,  # Typical for strong alkali
                            'typical_ph_max': 14.0,
                            'incompatible_with': [
                                ChemicalReactivityProfile.ReactivityType.STRONG_ACID,
                                ChemicalReactivityProfile.ReactivityType.MODERATE_ACID
                            ],
                            'min_segregation_distance': 15,  # Strong alkali separation
                            'data_source': ChemicalReactivityProfile.DataSource.IATA_LIST,
                            'confidence_level': 1.0,
                            'regulatory_basis': 'IATA Dangerous Goods List - Strong Alkaline Materials',
                            'notes': f"Material: {row.get('proper_shipping_name', '')}"
                        }
                        
                        if profile_exists:
                            ChemicalReactivityProfile.objects.filter(
                                dangerous_good=dangerous_good
                            ).update(**profile_data)
                            action = 'Updated'
                        else:
                            ChemicalReactivityProfile.objects.create(
                                dangerous_good=dangerous_good,
                                **profile_data
                            )
                            action = 'Created'
                        
                        self.stdout.write(f'{action} strong alkaline profile for {un_number}')
                    else:
                        self.stdout.write(f'Would create/update strong alkaline profile for {un_number}')
                    
                    count += 1
                    
        except FileNotFoundError:
            raise CommandError(f'CSV file not found: {csv_path}')
        except Exception as e:
            raise CommandError(f'Error reading alkaline CSV: {str(e)}')
        
        return count

    def import_acid_materials(self, csv_path: str, dry_run: bool, update_existing: bool) -> int:
        """Import strong acid materials from CSV."""
        count = 0
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                for row in reader:
                    un_number = str(row['un_number']).strip()
                    if not un_number or un_number.lower() in ['', 'nan', 'null']:
                        continue
                    
                    # Clean UN number format
                    if not un_number.startswith('UN'):
                        un_number = f'UN{un_number}'
                    
                    # Find the dangerous good
                    try:
                        dangerous_good = DangerousGood.objects.get(un_number=un_number)
                    except DangerousGood.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f'Dangerous good {un_number} not found in database')
                        )
                        continue
                    
                    # Check if profile already exists
                    profile_exists = ChemicalReactivityProfile.objects.filter(
                        dangerous_good=dangerous_good
                    ).exists()
                    
                    if profile_exists and not update_existing:
                        self.stdout.write(
                            self.style.WARNING(f'Profile for {un_number} already exists, skipping')
                        )
                        continue
                    
                    # Determine strength level
                    strength_level = self.determine_acid_strength(row)
                    
                    # Create or update profile
                    if not dry_run:
                        profile_data = {
                            'reactivity_type': ChemicalReactivityProfile.ReactivityType.STRONG_ACID,
                            'strength_level': strength_level,
                            'typical_ph_min': 0.0,  # Typical for strong acid
                            'typical_ph_max': 2.0,
                            'incompatible_with': [
                                ChemicalReactivityProfile.ReactivityType.STRONG_ALKALI,
                                ChemicalReactivityProfile.ReactivityType.MODERATE_ALKALI
                            ],
                            'min_segregation_distance': 15,  # Strong acid separation
                            'data_source': ChemicalReactivityProfile.DataSource.IATA_LIST,
                            'confidence_level': 1.0,
                            'regulatory_basis': 'IATA Dangerous Goods List - Strong Acid Materials',
                            'notes': f"Material: {row.get('proper_shipping_name', '')}"
                        }
                        
                        if profile_exists:
                            ChemicalReactivityProfile.objects.filter(
                                dangerous_good=dangerous_good
                            ).update(**profile_data)
                            action = 'Updated'
                        else:
                            ChemicalReactivityProfile.objects.create(
                                dangerous_good=dangerous_good,
                                **profile_data
                            )
                            action = 'Created'
                        
                        self.stdout.write(f'{action} strong acid profile for {un_number}')
                    else:
                        self.stdout.write(f'Would create/update strong acid profile for {un_number}')
                    
                    count += 1
                    
        except FileNotFoundError:
            raise CommandError(f'CSV file not found: {csv_path}')
        except Exception as e:
            raise CommandError(f'Error reading acid CSV: {str(e)}')
        
        return count

    def determine_alkaline_strength(self, row: dict) -> str:
        """Determine the strength level of an alkaline material based on its properties."""
        material_name = row.get('proper_shipping_name', '').lower()
        
        # Very strong alkalis
        if any(indicator in material_name for indicator in ['sodium hydroxide', 'potassium hydroxide']):
            return ChemicalReactivityProfile.StrengthLevel.VERY_STRONG
        
        # Strong alkalis
        if any(indicator in material_name for indicator in ['hydroxide', 'caustic']):
            return ChemicalReactivityProfile.StrengthLevel.STRONG
        
        # Default to strong for materials in the strong alkaline list
        return ChemicalReactivityProfile.StrengthLevel.STRONG

    def determine_acid_strength(self, row: dict) -> str:
        """Determine the strength level of an acid material based on its properties."""
        material_name = row.get('proper_shipping_name', '').lower()
        
        # Very strong acids
        if any(indicator in material_name for indicator in [
            'perchloric acid', 'hydrochloric acid', 'sulfuric acid', 'nitric acid'
        ]):
            return ChemicalReactivityProfile.StrengthLevel.VERY_STRONG
        
        # Strong acids
        if 'acid' in material_name:
            return ChemicalReactivityProfile.StrengthLevel.STRONG
        
        # Default to strong for materials in the strong acid list
        return ChemicalReactivityProfile.StrengthLevel.STRONG