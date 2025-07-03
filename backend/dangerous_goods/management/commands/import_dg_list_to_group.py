# dangerous_goods/management/commands/import_dg_list_to_group.py
import csv
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError
from dangerous_goods.models import DangerousGood, DGProductSynonym, SegregationGroup, PackingGroup

class Command(BaseCommand):
    help = (
        'Imports a list of Dangerous Goods from a CSV file, '
        'updates/creates them in the DangerousGood table, '
        'and associates them with a specified SegregationGroup.'
    )

    def add_arguments(self, parser):
        parser.add_argument('csv_file_path', type=str, help='The full path to the CSV file to import.')
        parser.add_argument('group_code', type=str, help='The code for the SegregationGroup (e.g., SGG1a).')
        parser.add_argument('group_name', type=str, help='The name for the SegregationGroup (e.g., "Strong Acids").')
        parser.add_argument('--group_description', type=str, default="", help='Optional description for the SegregationGroup.')

    def handle(self, *args, **options):
        csv_file_path = options['csv_file_path']
        group_code = options['group_code']
        group_name = options['group_name']
        group_description = options['group_description']

        self.stdout.write(self.style.SUCCESS(f"Processing Segregation Group: {group_name} ({group_code})"))
        self.stdout.write(self.style.SUCCESS(f'Starting import from CSV: {csv_file_path}'))

        seg_group, created = SegregationGroup.objects.get_or_create(
            code=group_code,
            defaults={'name': group_name, 'description': group_description}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created SegregationGroup: {group_name}"))
        else:
            seg_group.name = group_name
            seg_group.description = group_description
            seg_group.save()
            self.stdout.write(self.style.WARNING(f"Using existing SegregationGroup: {group_name} (name/description updated if provided)"))

        # Corrected mapping from actual CSV headers to model field names
        header_to_field_map = {
            'un_number': 'un_number',
            'proper_shipping_name': 'proper_shipping_name',
            'simplified_name': 'simplified_name', # Will also be used for synonyms
            'primary_hazard_class': 'hazard_class', # CSV 'primary_hazard_class' maps to model 'hazard_class'
            'subsidiary_risks': 'subsidiary_risks',
            'packing_group': 'packing_group',
            'hazard_labels_required': 'hazard_labels_required',
            'erg_guide_number': 'erg_guide_number',
            # Add other optional fields if they exist in these specific CSVs and you want to map them
            # 'special_provisions': 'special_provisions', # Example
            # 'description_notes': 'description_notes', # Example
        }
        
        processed_count = 0
        created_dg_count = 0
        updated_dg_count = 0
        # linked_to_group_count = 0 # This counter wasn't being used correctly, relying on seg_group.dangerous_goods.count() is better
        created_synonym_count = 0
        updated_synonym_count = 0 # Added counter for updated synonyms
        skipped_row_count = 0

        try:
            with open(csv_file_path, mode='r', encoding='utf-8-sig') as csvfile:
                reader = csv.DictReader(csvfile)
                
                # Clean CSV headers obtained from DictReader
                # DictReader already handles the first row as headers.
                # We need to ensure the keys we use to access row data match these cleaned headers.
                # The keys in header_to_field_map should now be the exact (case-sensitive) headers from CSV.
                
                # Verify essential headers from the map are present in the CSV
                # Using the keys from header_to_field_map that we expect to be in the CSV
                expected_csv_headers_in_map = ['un_number', 'proper_shipping_name', 'primary_hazard_class'] # Minimal set based on map
                
                if not reader.fieldnames:
                    raise CommandError(f"Error: CSV file at {csv_file_path} appears to be empty or has no headers.")

                actual_csv_headers = [header.strip() for header in reader.fieldnames if header]

                for req_header_key in expected_csv_headers_in_map:
                    if req_header_key not in actual_csv_headers:
                        raise CommandError(f"Error: Expected CSV header '{req_header_key}' (from map key) not found in {csv_file_path}. Actual headers: {actual_csv_headers}")

                for row_num, row_data_raw in enumerate(reader, start=2):
                    # Clean keys and values from the row
                    row = {k.strip() if k else None: v.strip() if isinstance(v, str) else v for k, v in row_data_raw.items()}
                    
                    try:
                        un_number_val = row.get('un_number') 
                        if not un_number_val: # Check after stripping
                            self.stderr.write(self.style.WARNING(f"Skipping row {row_num}: 'un_number' is missing or empty."))
                            skipped_row_count += 1
                            continue

                        dg_defaults_for_update = {}
                        
                        for csv_header_key, model_field_name in header_to_field_map.items():
                            if csv_header_key in row and row[csv_header_key] is not None:
                                value = row[csv_header_key] # Already stripped
                                
                                if value == '' and model_field_name not in ['is_marine_pollutant', 'is_environmentally_hazardous']: # Treat empty strings as None for optional text/char fields
                                    dg_defaults_for_update[model_field_name] = None
                                elif model_field_name == 'packing_group':
                                    if value and value.upper() in [pg[0] for pg in PackingGroup.choices]:
                                        dg_defaults_for_update[model_field_name] = value.upper()
                                    elif value: # If value exists but not a valid choice
                                        self.stderr.write(self.style.WARNING(f"Row {row_num}, UN {un_number_val}: Invalid Packing Group '{value}'. Setting to None for this update."))
                                        dg_defaults_for_update[model_field_name] = None
                                    # else: field remains None if CSV value is empty
                                elif model_field_name in ['is_marine_pollutant', 'is_environmentally_hazardous']:
                                    # This logic was from the other script, assuming these fields are NOT in these specific CSVs
                                    # If they ARE, you'd need to add them to header_to_field_map and handle TRUE/FALSE
                                    pass # These fields will not be updated by this script unless present in CSV and map
                                else:
                                    dg_defaults_for_update[model_field_name] = value
                        
                        # Ensure essential fields are present if creating a new DG record
                        # For update_or_create, un_number is the lookup, others are in defaults
                        if not dg_defaults_for_update.get('proper_shipping_name'):
                            self.stderr.write(self.style.WARNING(f"Row {row_num}, UN {un_number_val}: 'proper_shipping_name' is missing. Skipping this field for update/create."))
                        if not dg_defaults_for_update.get('hazard_class'): # Mapped from 'primary_hazard_class'
                            self.stderr.write(self.style.WARNING(f"Row {row_num}, UN {un_number_val}: 'primary_hazard_class' (for hazard_class) is missing. Skipping this field for update/create."))


                        dg_object, created = DangerousGood.objects.update_or_create(
                            un_number=un_number_val,
                            defaults=dg_defaults_for_update
                        )
                        
                        if created:
                            created_dg_count += 1
                        else:
                            updated_dg_count += 1
                        
                        seg_group.dangerous_goods.add(dg_object)
                        # linked_to_group_count is implicitly tracked by seg_group.dangerous_goods.count()

                        simplified_names_str = row.get('simplified_name', '').strip() # Corrected key
                        if simplified_names_str:
                            # Update the main simplified_name on DG object if it's different
                            # from the first part of the synonym list (optional, depends on desired behavior)
                            first_synonym = simplified_names_str.split(',')[0].strip()
                            if dg_object.simplified_name != first_synonym and first_synonym:
                                dg_object.simplified_name = first_synonym
                                dg_object.save(update_fields=['simplified_name'])
                            
                            synonyms_from_csv = [s.strip() for s in simplified_names_str.split(',') if s.strip()]
                            for syn_text in synonyms_from_csv:
                                _, syn_created = DGProductSynonym.objects.get_or_create(
                                    dangerous_good=dg_object,
                                    synonym__iexact=syn_text,
                                    defaults={'synonym': syn_text, 'source': DGProductSynonym.Source.IATA_IMPORT} # Or a group-specific source
                                )
                                if syn_created:
                                    created_synonym_count += 1
                                else:
                                    updated_synonym_count +=1 # Count as updated if already existed
                        processed_count +=1

                    except Exception as e:
                        self.stderr.write(self.style.ERROR(f"Error processing row {row_num} for UN {row.get('un_number', 'N/A')}: {e}"))
                        self.stderr.write(self.style.WARNING(f"Problematic row data: {row_data_raw}")) # Log raw row data
                        skipped_row_count += 1
                        continue
            
            self.stdout.write(self.style.SUCCESS(f'Successfully processed {processed_count} rows from: {csv_file_path}'))
            self.stdout.write(self.style.SUCCESS(f'Dangerous Goods created: {created_dg_count}'))
            self.stdout.write(self.style.SUCCESS(f'Dangerous Goods updated: {updated_dg_count}'))
            self.stdout.write(self.style.SUCCESS(f'Dangerous Goods linked to group "{group_name}": {seg_group.dangerous_goods.count()} (total unique in group)'))
            self.stdout.write(self.style.SUCCESS(f'DG Synonyms created: {created_synonym_count}'))
            self.stdout.write(self.style.SUCCESS(f'DG Synonyms updated/found: {updated_synonym_count}'))
            self.stdout.write(self.style.WARNING(f'Rows skipped due to errors or missing UN: {skipped_row_count}'))

        except FileNotFoundError:
            raise CommandError(f'Error: CSV file not found at "{csv_file_path}"')
        except Exception as e:
            raise CommandError(f'An unexpected error occurred: {e}')
