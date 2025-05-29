# dangerous_goods/management/commands/import_dg_data.py
import csv
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError
from dangerous_goods.models import DangerousGood, PackingGroup, DGProductSynonym # Ensure DGProductSynonym is imported

class Command(BaseCommand):
    help = 'Imports Dangerous Goods data from a specified CSV file into the DangerousGood model and populates DGProductSynonym.'

    def add_arguments(self, parser):
        parser.add_argument('csv_file_path', type=str, help='The full path to the CSV file to import.')

    def handle(self, *args, **options):
        csv_file_path = options['csv_file_path']
        self.stdout.write(self.style.SUCCESS(f'Starting import from: {csv_file_path}'))

        header_to_field_map = {
            # CSV Header : Model Field on DangerousGood (or None to ignore)
            'S.No': None, 
            'un_number': 'un_number',
            'proper_shipping_name': 'proper_shipping_name',
            'simplified_name': 'simplified_name', # This column will also be used for synonyms
            'hazard_class': 'hazard_class',
            'subsidiary_risks': 'subsidiary_risks',
            'packing_group': 'packing_group',
            'hazard_labels_required': 'hazard_labels_required',
            'erg_guide_number': 'erg_guide_number',
            'special_provisions': 'special_provisions',
            'qty_ltd_passenger_aircraft': 'qty_ltd_passenger_aircraft',
            'packing_instruction_passenger_aircraft': 'packing_instruction_passenger_aircraft',
            'qty_ltd_cargo_aircraft': 'qty_ltd_cargo_aircraft',
            'packing_instruction_cargo_aircraft': 'packing_instruction_cargo_aircraft',
            'description_notes': 'description_notes',
            'is_marine_pollutant': 'is_marine_pollutant',
            'is_environmentally_hazardous': 'is_environmentally_hazardous',
        }
        
        created_dg_count = 0
        updated_dg_count = 0
        created_synonym_count = 0
        updated_synonym_count = 0
        skipped_row_count = 0

        try:
            with open(csv_file_path, mode='r', encoding='utf-8-sig') as csvfile:
                reader = csv.DictReader(csvfile)
                
                csv_headers = reader.fieldnames
                for expected_header in header_to_field_map.keys():
                    if expected_header == 'S.No': continue
                    if expected_header not in csv_headers:
                        self.stderr.write(self.style.WARNING(f"Warning: Expected CSV header '{expected_header}' not found. This column will be skipped for all rows."))

                for row_num, row in enumerate(reader, start=2):
                    try:
                        un_number_val = row.get('un_number', '').strip()
                        if not un_number_val:
                            self.stderr.write(self.style.WARNING(f"Skipping row {row_num}: UN Number is missing or empty."))
                            skipped_row_count += 1
                            continue

                        dg_model_data = {}
                        csv_simplified_name_full_string = None

                        for csv_header, model_field_name in header_to_field_map.items():
                            if not model_field_name or csv_header not in row:
                                continue
                            
                            value = row[csv_header].strip() if row[csv_header] is not None else None

                            if model_field_name == 'simplified_name':
                                csv_simplified_name_full_string = value # Store the full string for synonym processing
                                # For DangerousGood.simplified_name, store the first part or the whole string if not comma-separated
                                if value:
                                    dg_model_data[model_field_name] = value.split(',')[0].strip()
                                else:
                                    dg_model_data[model_field_name] = None
                                continue # Handled simplified_name, move to next field

                            if model_field_name in ['is_marine_pollutant', 'is_environmentally_hazardous']:
                                if value and value.upper() == 'TRUE':
                                    dg_model_data[model_field_name] = True
                                else: # Default to False for empty, "FALSE", or any other value
                                    dg_model_data[model_field_name] = False
                            elif model_field_name == 'packing_group':
                                if value and value.upper() in [pg[0] for pg in PackingGroup.choices]:
                                    dg_model_data[model_field_name] = value.upper()
                                elif value:
                                    self.stderr.write(self.style.WARNING(f"Row {row_num}, UN {un_number_val}: Invalid Packing Group '{value}'. Setting to None."))
                                    dg_model_data[model_field_name] = None
                                else:
                                    dg_model_data[model_field_name] = None
                            elif value is None or value == '':
                                dg_model_data[model_field_name] = None
                            else:
                                dg_model_data[model_field_name] = value
                        
                        # Ensure un_number is in dg_model_data if it's not the defaults key
                        if 'un_number' not in dg_model_data:
                             dg_model_data['un_number'] = un_number_val

                        dg_object, created = DangerousGood.objects.update_or_create(
                            un_number=un_number_val,
                            defaults=dg_model_data
                        )
                        
                        if created:
                            created_dg_count += 1
                        else:
                            updated_dg_count += 1

                        # Now process synonyms from the csv_simplified_name_full_string
                        if csv_simplified_name_full_string:
                            synonyms_from_csv = [s.strip() for s in csv_simplified_name_full_string.split(',') if s.strip()]
                            for syn_text in synonyms_from_csv:
                                synonym_obj, syn_created = DGProductSynonym.objects.update_or_create(
                                    dangerous_good=dg_object,
                                    synonym__iexact=syn_text, # Case-insensitive match for existing
                                    defaults={
                                        'synonym': syn_text,
                                        'source': DGProductSynonym.Source.IATA_IMPORT # Or a more specific source
                                    }
                                )
                                if syn_created:
                                    created_synonym_count += 1
                                else:
                                    updated_synonym_count +=1


                    except Exception as e:
                        self.stderr.write(self.style.ERROR(f"Error processing row {row_num} for UN {row.get('un_number', 'N/A')}: {e}"))
                        self.stderr.write(self.style.WARNING(f"Problematic row data: {row}"))
                        skipped_row_count += 1
                        continue
            
            self.stdout.write(self.style.SUCCESS(f'Successfully processed file: {csv_file_path}'))
            self.stdout.write(self.style.SUCCESS(f'Dangerous Goods created: {created_dg_count}'))
            self.stdout.write(self.style.SUCCESS(f'Dangerous Goods updated: {updated_dg_count}'))
            self.stdout.write(self.style.SUCCESS(f'DG Synonyms created: {created_synonym_count}'))
            self.stdout.write(self.style.SUCCESS(f'DG Synonyms updated: {updated_synonym_count}'))
            self.stdout.write(self.style.WARNING(f'Rows skipped due to errors or missing UN: {skipped_row_count}'))

        except FileNotFoundError:
            raise CommandError(f'Error: CSV file not found at "{csv_file_path}"')
        except Exception as e:
            raise CommandError(f'An unexpected error occurred: {e}')

