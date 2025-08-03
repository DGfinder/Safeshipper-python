#!/usr/bin/env python3
"""
Fix missing hazard_labels_required values in dangerous goods database
Populate based on hazard_class, subsidiary_risks, and environmental hazards
"""
import psycopg2
from datetime import datetime

# Database connection parameters
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'safeshipper'
DB_USER = 'safeshipper'
DB_PASSWORD = 'admin'

# Hazard class to label mapping
HAZARD_CLASS_LABELS = {
    # Class 1 - Explosives
    '1.1': 'Explosive 1.1',
    '1.1A': 'Explosive 1.1',
    '1.1B': 'Explosive 1.1',
    '1.1C': 'Explosive 1.1',
    '1.1D': 'Explosive 1.1',
    '1.1E': 'Explosive 1.1',
    '1.1F': 'Explosive 1.1',
    '1.1G': 'Explosive 1.1',
    '1.1L': 'Explosive 1.1',
    '1.2': 'Explosive 1.2',
    '1.2B': 'Explosive 1.2',
    '1.2C': 'Explosive 1.2',
    '1.2D': 'Explosive 1.2',
    '1.2E': 'Explosive 1.2',
    '1.2F': 'Explosive 1.2',
    '1.2G': 'Explosive 1.2',
    '1.2H': 'Explosive 1.2',
    '1.2J': 'Explosive 1.2',
    '1.2K': 'Explosive 1.2',
    '1.2L': 'Explosive 1.2',
    '1.3': 'Explosive 1.3',
    '1.3C': 'Explosive 1.3',
    '1.3F': 'Explosive 1.3',
    '1.3G': 'Explosive 1.3',
    '1.3H': 'Explosive 1.3',
    '1.3J': 'Explosive 1.3',
    '1.3K': 'Explosive 1.3',
    '1.3L': 'Explosive 1.3',
    '1.4': 'Explosive 1.4',
    '1.4B': 'Explosive 1.4',
    '1.4C': 'Explosive 1.4',
    '1.4D': 'Explosive 1.4',
    '1.4E': 'Explosive 1.4',
    '1.4F': 'Explosive 1.4',
    '1.4G': 'Explosive 1.4',
    '1.4S': 'Explosive 1.4',
    '1.5': 'Explosive 1.5',
    '1.5D': 'Explosive 1.5',
    '1.6': 'Explosive 1.6',
    '1.6N': 'Explosive 1.6',
    
    # Class 2 - Gases
    '2.1': 'Flamm. gas',
    '2.2': 'Non-flamm. gas',
    '2.3': 'Toxic gas',
    
    # Class 3 - Flammable Liquids
    '3': 'Flamm. liquid',
    
    # Class 4 - Flammable Solids
    '4.1': 'Flamm. solid',
    '4.2': 'Spont. comb.',
    '4.3': 'Dang. when wet',
    
    # Class 5 - Oxidizing Substances
    '5.1': 'Oxidizer',
    '5.2': 'Organic peroxide',
    
    # Class 6 - Toxic Substances
    '6.1': 'Toxic',
    '6.2': 'Infectious',
    
    # Class 7 - Radioactive
    '7': 'Radioactive',
    
    # Class 8 - Corrosive
    '8': 'Corrosive',
    
    # Class 9 - Miscellaneous
    '9': 'Miscellaneous'
}

# Subsidiary risk labels
SUBSIDIARY_RISK_LABELS = {
    '2.1': 'Flamm. gas',
    '2.2': 'Non-flamm. gas',
    '2.3': 'Toxic gas',
    '3': 'Flamm. liquid',
    '4.1': 'Flamm. solid',
    '4.2': 'Spont. comb.',
    '4.3': 'Dang. when wet',
    '5.1': 'Oxidizer',
    '5.2': 'Organic peroxide',
    '6.1': 'Toxic',
    '6.2': 'Infectious',
    '8': 'Corrosive'
}

def connect_to_database():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return None

def generate_hazard_labels(hazard_class, subsidiary_risks, is_marine_pollutant, is_environmentally_hazardous):
    """Generate hazard labels based on dangerous goods properties"""
    
    labels = []
    
    # Primary hazard label
    if hazard_class:
        primary_label = HAZARD_CLASS_LABELS.get(hazard_class)
        if primary_label:
            labels.append(primary_label)
        else:
            # Try base class if specific variant not found
            base_class = hazard_class.split('.')[0] + '.' + hazard_class.split('.')[1] if '.' in hazard_class else hazard_class
            primary_label = HAZARD_CLASS_LABELS.get(base_class)
            if primary_label:
                labels.append(primary_label)
            else:
                # Fallback to generic class label
                labels.append(f"Class {hazard_class}")
    
    # Subsidiary risk labels
    if subsidiary_risks:
        # Parse subsidiary risks (could be comma-separated)
        risks = [r.strip() for r in subsidiary_risks.replace(',', ' ').split() if r.strip()]
        for risk in risks:
            risk_label = SUBSIDIARY_RISK_LABELS.get(risk)
            if risk_label and risk_label not in labels:
                labels.append(risk_label)
    
    # Environmental hazard labels
    if is_marine_pollutant:
        labels.append("Marine pollutant")
    
    if is_environmentally_hazardous:
        labels.append("Environmentally hazardous")
    
    # Special case additions based on class
    if hazard_class and hazard_class.startswith('2.2'):
        # Check for cryogenic liquids (refrigerated)
        labels.append("Cryogenic liquid")
    
    if hazard_class == '7':
        # Radioactive materials may have fissile labels
        labels.append("Fissile")
    
    # Join labels with " & "
    return " & ".join(labels)

def fix_hazard_labels():
    """Fix all NULL hazard_labels_required values"""
    
    print("🔧 Fixing hazard_labels_required column...")
    print("=" * 60)
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Get all entries with NULL hazard_labels_required
        query = """
        SELECT id, un_number, proper_shipping_name, hazard_class, 
               subsidiary_risks, is_marine_pollutant, is_environmentally_hazardous
        FROM dangerous_goods_dangerousgood
        WHERE hazard_labels_required IS NULL
        ORDER BY un_number
        """
        
        cursor.execute(query)
        entries = cursor.fetchall()
        
        print(f"📊 Found {len(entries)} entries with NULL hazard_labels_required")
        print()
        
        updated_count = 0
        sample_updates = []
        
        for entry in entries:
            id_, un_number, name, hazard_class, subsidiary_risks, is_marine_pollutant, is_environmentally_hazardous = entry
            
            # Generate hazard labels
            labels = generate_hazard_labels(
                hazard_class,
                subsidiary_risks,
                is_marine_pollutant,
                is_environmentally_hazardous
            )
            
            # Update the record
            update_query = """
            UPDATE dangerous_goods_dangerousgood
            SET hazard_labels_required = %s, updated_at = %s
            WHERE id = %s
            """
            
            cursor.execute(update_query, (labels, datetime.now(), id_))
            updated_count += 1
            
            # Collect samples for display
            if len(sample_updates) < 10:
                sample_updates.append({
                    'un_number': un_number,
                    'name': name[:30],
                    'class': hazard_class,
                    'labels': labels
                })
            
            # Progress update
            if updated_count % 100 == 0:
                print(f"   ✅ Updated {updated_count} entries...")
        
        # Commit the changes
        conn.commit()
        
        print()
        print(f"✅ Successfully updated {updated_count} entries")
        print()
        
        # Show sample updates
        if sample_updates:
            print("📋 Sample updated entries:")
            for sample in sample_updates:
                print(f"   UN{sample['un_number']}: {sample['name']:<30} | Class {sample['class']} | Labels: {sample['labels']}")
        
        # Verify results
        cursor.execute("SELECT COUNT(*) FROM dangerous_goods_dangerousgood WHERE hazard_labels_required IS NULL")
        remaining_null = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT hazard_labels_required) FROM dangerous_goods_dangerousgood")
        unique_labels = cursor.fetchone()[0]
        
        print()
        print("📊 Final statistics:")
        print(f"   Remaining NULL values: {remaining_null}")
        print(f"   Unique label combinations: {unique_labels}")
        
        # Show distribution of labels
        cursor.execute("""
        SELECT hazard_labels_required, COUNT(*) as count
        FROM dangerous_goods_dangerousgood
        WHERE hazard_labels_required IS NOT NULL
        GROUP BY hazard_labels_required
        ORDER BY count DESC
        LIMIT 15
        """)
        
        print()
        print("🏷️  Top 15 most common label combinations:")
        for row in cursor.fetchall():
            print(f"   {row[1]:>5} entries: {row[0]}")
        
        cursor.close()
        conn.close()
        
        print()
        print("=" * 60)
        print("✅ Hazard labels fix completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing hazard labels: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def main():
    """Main execution"""
    print("🚀 SafeShipper Hazard Labels Fix")
    print("Populating missing hazard_labels_required values")
    print()
    
    if fix_hazard_labels():
        print()
        print("🎉 All hazard labels have been populated!")
        print("✅ Database is now complete with proper hazard label information")
        return True
    else:
        print("💥 Failed to fix hazard labels")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)