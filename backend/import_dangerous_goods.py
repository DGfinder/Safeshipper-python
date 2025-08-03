#!/usr/bin/env python3
"""
Import dangerous goods from CSV with proper data mapping
"""
import os
import sys
import csv
import psycopg2
from datetime import datetime

# Database connection parameters
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'safeshipper'
DB_USER = 'safeshipper'
DB_PASSWORD = 'admin'

def clean_value(value):
    """Clean and prepare values for database insertion"""
    if value is None or value.strip() == '' or value.upper() == 'FALSE':
        return None
    return value.strip()

def convert_boolean(value):
    """Convert string to boolean"""
    if not value or value.strip() == '' or value.upper() == 'FALSE':
        return False
    return value.upper() == 'TRUE'

def import_dangerous_goods(csv_file_path):
    """Import dangerous goods from CSV file"""
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        # Clear existing data
        print("Clearing existing dangerous goods data...")
        cursor.execute("DELETE FROM dangerous_goods_dangerousgood;")
        
        imported_count = 0
        error_count = 0
        
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                try:
                    # Map CSV columns to database fields
                    un_number = clean_value(row.get('un_number'))
                    proper_shipping_name = clean_value(row.get('proper_shipping_name'))
                    simplified_name = clean_value(row.get('simplified_name'))
                    hazard_class = clean_value(row.get('hazard_class'))
                    subsidiary_risks = clean_value(row.get('subsidiary_risks'))
                    packing_group = clean_value(row.get('packing_group'))
                    hazard_labels_required = clean_value(row.get('hazard_labels_required'))
                    erg_guide_number = clean_value(row.get('erg_guide_number'))
                    special_provisions = clean_value(row.get('special_provisions'))
                    description_notes = clean_value(row.get('description_notes'))
                    
                    # Boolean conversions
                    is_marine_pollutant = convert_boolean(row.get('is_marine_pollutant'))
                    is_environmentally_hazardous = convert_boolean(row.get('is_environmentally_hazardous'))
                    
                    # Skip if no UN number
                    if not un_number or not proper_shipping_name:
                        continue
                    
                    # Insert into database
                    insert_query = """
                    INSERT INTO dangerous_goods_dangerousgood (
                        un_number, proper_shipping_name, simplified_name, hazard_class,
                        subsidiary_risks, packing_group, hazard_labels_required, 
                        erg_guide_number, special_provisions, description_notes,
                        is_marine_pollutant, is_environmentally_hazardous,
                        created_at, updated_at, is_bulk_transport_allowed,
                        is_fire_risk, physical_form,
                        qty_ltd_passenger_aircraft, packing_instruction_passenger_aircraft,
                        qty_ltd_cargo_aircraft, packing_instruction_cargo_aircraft
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """
                    
                    cursor.execute(insert_query, (
                        un_number, proper_shipping_name, simplified_name, hazard_class,
                        subsidiary_risks, packing_group, hazard_labels_required,
                        erg_guide_number, special_provisions, description_notes,
                        is_marine_pollutant, is_environmentally_hazardous,
                        datetime.now(), datetime.now(), False, False, 'UNKNOWN',
                        None, None, None, None
                    ))
                    
                    imported_count += 1
                    
                    if imported_count % 100 == 0:
                        print(f"Imported {imported_count} records...")
                        
                except Exception as e:
                    error_count += 1
                    print(f"Error importing row {imported_count + error_count}: {str(e)}")
                    print(f"Row data: {row}")
                    continue
        
        # Commit changes
        conn.commit()
        print(f"✅ Import completed!")
        print(f"Successfully imported: {imported_count} dangerous goods")
        print(f"Errors encountered: {error_count}")
        
        # Verify import
        cursor.execute("SELECT COUNT(*) FROM dangerous_goods_dangerousgood;")
        count = cursor.fetchone()[0]
        print(f"Total records in database: {count}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    csv_file = "/tmp/dangerous_goods.csv"
    if import_dangerous_goods(csv_file):
        print("🎉 Dangerous goods import successful!")
    else:
        print("💥 Import failed!")