#!/usr/bin/env python3
"""
Create Global Multi-Modal Database Schema Enhancements
Phase 2: Database architecture for global air transport intelligence
"""
import os
import sys
import psycopg2
from datetime import datetime

# Database connection parameters
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'safeshipper'
DB_USER = 'safeshipper'
DB_PASSWORD = 'admin'

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

def add_global_air_transport_columns():
    """Add global air transport compliance columns to dangerous goods table"""
    
    print("🌍 Adding global air transport columns...")
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Check existing columns
        cursor.execute("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'dangerous_goods_dangerousgood' 
        AND table_schema = 'public'
        """)
        
        existing_columns = {row[0] for row in cursor.fetchall()}
        
        # Global air transport columns
        new_columns = [
            # ICAO/IATA Global Compliance
            ('global_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('iata_classification', 'VARCHAR(50)'),
            ('icao_technical_instructions', 'VARCHAR(100)'),
            ('global_air_packing_group', 'VARCHAR(10)'),
            ('iata_packaging_instruction', 'VARCHAR(20)'),
            
            # Regional Air Transport Compliance
            ('us_air_domestic_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('us_air_international_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('europe_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('asia_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('canada_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            
            # Cross-Continental Air Routes
            ('us_europe_air_route_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('us_asia_air_route_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('europe_asia_air_route_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('transatlantic_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('transpacific_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            
            # Aircraft Type Restrictions
            ('passenger_aircraft_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('cargo_aircraft_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('passenger_aircraft_quantity_limit', 'VARCHAR(50)'),
            ('cargo_aircraft_quantity_limit', 'VARCHAR(50)'),
            
            # International Air Packaging & Quantities
            ('global_air_quantity_limits', 'TEXT'),
            ('international_packaging_requirements', 'TEXT'),
            ('air_transport_special_provisions', 'TEXT'),
            ('international_routing_restrictions', 'TEXT'),
            
            # Air Transport Documentation
            ('air_transport_documentation_required', 'TEXT'),
            ('shipper_declaration_required', 'BOOLEAN DEFAULT FALSE'),
            ('dangerous_goods_declaration_required', 'BOOLEAN DEFAULT FALSE')
        ]
        
        # Add new columns
        added_columns = 0
        for col_name, col_definition in new_columns:
            if col_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE dangerous_goods_dangerousgood ADD COLUMN {col_name} {col_definition}")
                    added_columns += 1
                    print(f"   ✅ Added: {col_name}")
                except Exception as e:
                    print(f"   ⚠️  Could not add {col_name}: {str(e)}")
        
        if added_columns > 0:
            conn.commit()
            print(f"   ✅ Added {added_columns} global air transport columns")
        else:
            print(f"   ℹ️  All global air transport columns already exist")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error adding global air transport columns: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def add_ups_operational_columns():
    """Add UPS-specific operational intelligence columns"""
    
    print("🚛 Adding UPS operational intelligence columns...")
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Check existing columns
        cursor.execute("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'dangerous_goods_dangerousgood' 
        AND table_schema = 'public'
        """)
        
        existing_columns = {row[0] for row in cursor.fetchall()}
        
        # UPS operational columns
        ups_columns = [
            # UPS Service Availability
            ('ups_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('ups_ground_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('ups_next_day_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('ups_2day_air_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('ups_3day_select_accepted', 'BOOLEAN DEFAULT FALSE'),
            ('ups_air_services_accepted', 'BOOLEAN DEFAULT FALSE'),
            
            # UPS Operational Restrictions
            ('ups_forbidden', 'BOOLEAN DEFAULT FALSE'),
            ('ups_restricted', 'BOOLEAN DEFAULT FALSE'),
            ('ups_contract_required', 'BOOLEAN DEFAULT FALSE'),
            ('ups_hazmat_contract_required', 'BOOLEAN DEFAULT FALSE'),
            
            # UPS Operational Requirements
            ('ups_special_handling_required', 'BOOLEAN DEFAULT FALSE'),
            ('ups_temperature_controlled', 'BOOLEAN DEFAULT FALSE'),
            ('ups_packaging_requirements', 'TEXT'),
            ('ups_quantity_limits', 'TEXT'),
            ('ups_operational_restrictions', 'TEXT'),
            
            # UPS Routing and Geographic
            ('ups_routing_limitations', 'TEXT'),
            ('ups_handling_requirements', 'TEXT'),
            ('ups_service_recommendations', 'TEXT'),
            
            # UPS Intelligence and Analysis
            ('ups_compliance_vs_operational_status', 'VARCHAR(100)'),
            ('ups_alternative_service_suggestions', 'TEXT'),
            ('ups_operational_notes', 'TEXT')
        ]
        
        # Add UPS columns
        added_columns = 0
        for col_name, col_definition in ups_columns:
            if col_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE dangerous_goods_dangerousgood ADD COLUMN {col_name} {col_definition}")
                    added_columns += 1
                    print(f"   ✅ Added: {col_name}")
                except Exception as e:
                    print(f"   ⚠️  Could not add {col_name}: {str(e)}")
        
        if added_columns > 0:
            conn.commit()
            print(f"   ✅ Added {added_columns} UPS operational columns")
        else:
            print(f"   ℹ️  All UPS operational columns already exist")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error adding UPS operational columns: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def create_global_air_transport_tables():
    """Create supporting tables for global air transport intelligence"""
    
    print("📋 Creating global air transport intelligence tables...")
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Global air route restrictions table
        air_route_table = """
        CREATE TABLE IF NOT EXISTS global_air_route_restrictions (
            id SERIAL PRIMARY KEY,
            origin_region VARCHAR(50) NOT NULL,
            destination_region VARCHAR(50) NOT NULL,
            hazard_class VARCHAR(10) NOT NULL,
            restriction_type VARCHAR(50) NOT NULL,
            restriction_description TEXT,
            quantity_limitations TEXT,
            routing_requirements TEXT,
            effective_date DATE,
            source_regulation VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        
        cursor.execute(air_route_table)
        
        # Carrier operational intelligence table
        carrier_intelligence_table = """
        CREATE TABLE IF NOT EXISTS carrier_operational_intelligence (
            id SERIAL PRIMARY KEY,
            carrier_name VARCHAR(100) NOT NULL,
            service_type VARCHAR(100) NOT NULL,
            un_number VARCHAR(10) NOT NULL,
            operational_status VARCHAR(50) NOT NULL,
            restrictions TEXT,
            requirements TEXT,
            quantity_limits TEXT,
            special_provisions TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_source VARCHAR(100)
        )
        """
        
        cursor.execute(carrier_intelligence_table)
        
        # Multi-modal transport compatibility table
        multimodal_compatibility_table = """
        CREATE TABLE IF NOT EXISTS multimodal_transport_compatibility (
            id SERIAL PRIMARY KEY,
            un_number VARCHAR(10) NOT NULL,
            transport_mode VARCHAR(50) NOT NULL,
            compliance_status VARCHAR(50) NOT NULL,
            regulatory_framework VARCHAR(50) NOT NULL,
            operational_feasibility VARCHAR(50) NOT NULL,
            route_restrictions TEXT,
            carrier_limitations TEXT,
            optimization_recommendations TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        
        cursor.execute(multimodal_compatibility_table)
        
        # Global packing group harmonization table
        packing_group_harmonization_table = """
        CREATE TABLE IF NOT EXISTS global_packing_group_harmonization (
            id SERIAL PRIMARY KEY,
            un_number VARCHAR(10) NOT NULL,
            transport_mode VARCHAR(50) NOT NULL,
            regulatory_framework VARCHAR(50) NOT NULL,
            packing_group VARCHAR(10),
            variance_explanation TEXT,
            compliance_impact TEXT,
            harmonization_status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        
        cursor.execute(packing_group_harmonization_table)
        
        conn.commit()
        
        print("   ✅ Created global air route restrictions table")
        print("   ✅ Created carrier operational intelligence table")
        print("   ✅ Created multi-modal transport compatibility table")
        print("   ✅ Created global packing group harmonization table")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating global air transport tables: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def create_enhanced_views():
    """Create enhanced database views for global multi-modal intelligence"""
    
    print("👁️  Creating enhanced multi-modal intelligence views...")
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Global dangerous goods with complete transport intelligence
        global_transport_view = """
        CREATE OR REPLACE VIEW global_dangerous_goods_intelligence AS
        SELECT 
            dg.*,
            pr.primary_placard,
            pr.placard_color,
            pr.symbol_description,
            CASE 
                WHEN dg.global_air_accepted = TRUE AND dg.adr_tunnel_code IS NOT NULL 
                THEN 'Multi-Modal Compliant'
                WHEN dg.global_air_accepted = TRUE 
                THEN 'Air Transport Only'
                WHEN dg.adr_tunnel_code IS NOT NULL 
                THEN 'Road Transport Only'
                ELSE 'Limited Transport Options'
            END as transport_mode_availability,
            CASE 
                WHEN dg.ups_forbidden = TRUE 
                THEN 'UPS Operational Restriction'
                WHEN dg.ups_restricted = TRUE 
                THEN 'UPS Limited Acceptance'
                WHEN dg.ups_accepted = TRUE 
                THEN 'UPS Operational'
                ELSE 'UPS Status Unknown'
            END as ups_operational_status
        FROM dangerous_goods_dangerousgood dg
        LEFT JOIN adr_placard_requirements pr ON dg.hazard_class = pr.hazard_class
        """
        
        cursor.execute(global_transport_view)
        
        # Multi-modal compliance summary view
        compliance_summary_view = """
        CREATE OR REPLACE VIEW multimodal_compliance_summary AS
        SELECT 
            un_number,
            proper_shipping_name,
            hazard_class,
            
            -- European road transport (ADR)
            CASE WHEN adr_tunnel_code IS NOT NULL THEN 'Compliant' ELSE 'Not Assessed' END as adr_road_compliance,
            
            -- Global air transport (ICAO/IATA)
            CASE WHEN global_air_accepted = TRUE THEN 'Compliant' ELSE 'Not Compliant' END as global_air_compliance,
            
            -- Regional air transport
            CASE WHEN us_air_domestic_accepted = TRUE THEN 'Yes' ELSE 'No' END as us_domestic_air,
            CASE WHEN europe_air_accepted = TRUE THEN 'Yes' ELSE 'No' END as europe_air,
            CASE WHEN asia_air_accepted = TRUE THEN 'Yes' ELSE 'No' END as asia_air,
            
            -- UPS operational
            CASE 
                WHEN ups_forbidden = TRUE THEN 'Forbidden'
                WHEN ups_restricted = TRUE THEN 'Restricted' 
                WHEN ups_accepted = TRUE THEN 'Accepted'
                ELSE 'Unknown'
            END as ups_status,
            
            -- Packing group harmonization
            packing_group as adr_packing_group,
            global_air_packing_group,
            CASE 
                WHEN packing_group = global_air_packing_group THEN 'Harmonized'
                WHEN packing_group IS NOT NULL AND global_air_packing_group IS NOT NULL THEN 'Variance'
                ELSE 'Incomplete Data'
            END as packing_group_status
            
        FROM dangerous_goods_dangerousgood
        """
        
        cursor.execute(compliance_summary_view)
        
        conn.commit()
        
        print("   ✅ Created global dangerous goods intelligence view")
        print("   ✅ Created multi-modal compliance summary view")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating enhanced views: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def add_performance_indexes():
    """Add performance indexes for global multi-modal queries"""
    
    print("🔍 Adding global multi-modal performance indexes...")
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        indexes = [
            # Global air transport indexes
            "CREATE INDEX IF NOT EXISTS idx_global_air_accepted ON dangerous_goods_dangerousgood(global_air_accepted)",
            "CREATE INDEX IF NOT EXISTS idx_iata_classification ON dangerous_goods_dangerousgood(iata_classification)",
            "CREATE INDEX IF NOT EXISTS idx_global_air_packing_group ON dangerous_goods_dangerousgood(global_air_packing_group)",
            
            # Regional air transport indexes
            "CREATE INDEX IF NOT EXISTS idx_us_air_domestic ON dangerous_goods_dangerousgood(us_air_domestic_accepted)",
            "CREATE INDEX IF NOT EXISTS idx_passenger_aircraft ON dangerous_goods_dangerousgood(passenger_aircraft_accepted)",
            "CREATE INDEX IF NOT EXISTS idx_cargo_aircraft ON dangerous_goods_dangerousgood(cargo_aircraft_accepted)",
            
            # UPS operational indexes
            "CREATE INDEX IF NOT EXISTS idx_ups_accepted ON dangerous_goods_dangerousgood(ups_accepted)",
            "CREATE INDEX IF NOT EXISTS idx_ups_forbidden ON dangerous_goods_dangerousgood(ups_forbidden)",
            "CREATE INDEX IF NOT EXISTS idx_ups_ground ON dangerous_goods_dangerousgood(ups_ground_accepted)",
            "CREATE INDEX IF NOT EXISTS idx_ups_air ON dangerous_goods_dangerousgood(ups_next_day_air_accepted)",
            
            # Multi-modal composite indexes
            "CREATE INDEX IF NOT EXISTS idx_multimodal_status ON dangerous_goods_dangerousgood(global_air_accepted, adr_tunnel_code, ups_accepted)",
            "CREATE INDEX IF NOT EXISTS idx_packing_group_comparison ON dangerous_goods_dangerousgood(packing_group, global_air_packing_group)",
            
            # Supporting table indexes
            "CREATE INDEX IF NOT EXISTS idx_air_route_origin_dest ON global_air_route_restrictions(origin_region, destination_region)",
            "CREATE INDEX IF NOT EXISTS idx_carrier_intelligence_un ON carrier_operational_intelligence(carrier_name, un_number)",
            "CREATE INDEX IF NOT EXISTS idx_multimodal_compatibility ON multimodal_transport_compatibility(un_number, transport_mode)"
        ]
        
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
            except Exception as e:
                print(f"   ⚠️  Index may already exist: {str(e)}")
        
        conn.commit()
        print("   ✅ Added performance indexes for global multi-modal queries")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error adding performance indexes: {str(e)}")
        return False

def validate_schema_enhancements():
    """Validate the enhanced schema"""
    
    print("✅ Validating global multi-modal schema enhancements...")
    
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Check dangerous goods table columns
        cursor.execute("""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'dangerous_goods_dangerousgood' 
        AND column_name LIKE '%air%' OR column_name LIKE '%ups%' OR column_name LIKE '%global%'
        """)
        
        air_transport_columns = cursor.fetchone()[0]
        
        # Check supporting tables
        supporting_tables = [
            'global_air_route_restrictions',
            'carrier_operational_intelligence', 
            'multimodal_transport_compatibility',
            'global_packing_group_harmonization'
        ]
        
        existing_tables = 0
        for table in supporting_tables:
            cursor.execute(f"SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = '{table}')")
            if cursor.fetchone()[0]:
                existing_tables += 1
        
        # Check views
        cursor.execute("""
        SELECT COUNT(*) FROM information_schema.views 
        WHERE table_name IN ('global_dangerous_goods_intelligence', 'multimodal_compliance_summary')
        """)
        
        enhanced_views = cursor.fetchone()[0]
        
        print(f"   📊 Schema validation results:")
        print(f"      Air transport columns: {air_transport_columns}")
        print(f"      Supporting tables: {existing_tables}/{len(supporting_tables)}")
        print(f"      Enhanced views: {enhanced_views}/2")
        
        cursor.close()
        conn.close()
        
        return air_transport_columns > 0 and existing_tables == len(supporting_tables) and enhanced_views == 2
        
    except Exception as e:
        print(f"❌ Error validating schema: {str(e)}")
        return False

def main():
    """Create global multi-modal database schema enhancements"""
    
    print("🚀 SafeShipper Global Multi-Modal Database Schema Enhancement")
    print("=" * 80)
    print("Phase 2: Creating Global Air Transport Database Architecture")
    print("Transforming from European ADR to Global Multi-Modal Intelligence")
    print()
    
    # Schema enhancement steps
    enhancement_steps = [
        ("Add global air transport columns", add_global_air_transport_columns),
        ("Add UPS operational columns", add_ups_operational_columns),
        ("Create global transport tables", create_global_air_transport_tables),
        ("Create enhanced intelligence views", create_enhanced_views),
        ("Add performance indexes", add_performance_indexes),
        ("Validate schema enhancements", validate_schema_enhancements)
    ]
    
    for step_name, step_function in enhancement_steps:
        print(f"➡️  {step_name}...")
        
        if not step_function():
            print(f"❌ Failed: {step_name}")
            return False
        
        print(f"✅ Completed: {step_name}")
        print()
    
    print("=" * 80)
    print("🏆 Global Multi-Modal Schema Enhancement Complete!")
    print()
    print("🌍 Database Transformation Summary:")
    print("   ✅ Global air transport compliance columns added")
    print("   ✅ UPS operational intelligence columns added") 
    print("   ✅ Multi-modal transport intelligence tables created")
    print("   ✅ Enhanced views for global compliance analysis")
    print("   ✅ Performance indexes for high-speed queries")
    print()
    print("🎯 Database Capabilities Enhanced:")
    print("   • Global air transport compliance (US, Europe, Asia, Canada)")
    print("   • UPS operational intelligence and restrictions")
    print("   • Multi-modal transport planning and optimization")
    print("   • Cross-continental routing requirements")
    print("   • Carrier-specific operational intelligence")
    print("   • Global packing group harmonization")
    print()
    print("🚀 Ready for global air transport data integration!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)