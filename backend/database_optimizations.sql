-- SafeShipper Database Performance Optimizations
-- This script adds database indexes and constraints to improve query performance

-- Begin transaction for safety
BEGIN;

-- Companies table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_name ON companies_company (name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_abn ON companies_company (abn);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_is_active ON companies_company (is_active);

-- Users table optimizations  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users_user (email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company ON users_user (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users_user (role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_active ON users_user (is_active);

-- Shipments table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_reference ON shipments_shipment (reference_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status ON shipments_shipment (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_company ON shipments_shipment (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_created_at ON shipments_shipment (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_pickup_date ON shipments_shipment (pickup_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_delivery_date ON shipments_shipment (delivery_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_pickup_location ON shipments_shipment (pickup_location_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_delivery_location ON shipments_shipment (delivery_location_id);

-- Dangerous goods table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_un_number ON dangerous_goods_dangerousgood (un_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_proper_shipping_name ON dangerous_goods_dangerousgood (proper_shipping_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_hazard_class ON dangerous_goods_dangerousgood (hazard_class);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_packing_group ON dangerous_goods_dangerousgood (packing_group);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_is_active ON dangerous_goods_dangerousgood (is_active);

-- Shipment dangerous goods relationship optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_dg_shipment ON shipments_shipmentdangerousgood (shipment_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_dg_dangerous_good ON shipments_shipmentdangerousgood (dangerous_good_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipment_dg_compound ON shipments_shipmentdangerousgood (shipment_id, dangerous_good_id);

-- Vehicles table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_registration ON vehicles_vehicle (registration_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_company ON vehicles_vehicle (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles_vehicle (vehicle_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_is_active ON vehicles_vehicle (is_active);

-- Locations table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_name ON locations_location (name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_postcode ON locations_location (postcode);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_state ON locations_location (state);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_company ON locations_location (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_is_active ON locations_location (is_active);

-- Geospatial index for location coordinates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_coordinates ON locations_location USING GIST (coordinates);

-- Incidents table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_incident_type ON incidents_incident (incident_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_severity ON incidents_incident (severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status ON incidents_incident (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_company ON incidents_incident (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_occurred_at ON incidents_incident (occurred_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_shipment ON incidents_incident (shipment_id);

-- Documents table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_document_type ON documents_document (document_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_company ON documents_document (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_created_at ON documents_document (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_uploaded_by ON documents_document (uploaded_by_id);

-- Manifests table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_manifest_number ON manifests_manifest (manifest_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_status ON manifests_manifest (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_company ON manifests_manifest (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_created_at ON manifests_manifest (created_at);

-- Audits table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_audit_type ON audits_audit (audit_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_status ON audits_audit (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_company ON audits_audit (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_scheduled_date ON audits_audit (scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_completed_date ON audits_audit (completed_date);

-- Training table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_course_name ON training_trainingcourse (course_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_company ON training_trainingcourse (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_is_active ON training_trainingcourse (is_active);

-- Training records optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_records_user ON training_trainingrecord (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_records_course ON training_trainingrecord (course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_records_completion_date ON training_trainingrecord (completion_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_records_expiry_date ON training_trainingrecord (expiry_date);

-- ERP Integration optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_erp_systems_company ON erp_integration_erpsystem (company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_erp_systems_system_type ON erp_integration_erpsystem (system_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_erp_systems_status ON erp_integration_erpsystem (status);

-- Communication logs optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communications_message_type ON communications_message (message_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communications_status ON communications_message (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communications_created_at ON communications_message (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communications_recipient_id ON communications_message (recipient_id);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_company_status ON shipments_shipment (company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_company_created_at ON shipments_shipment (company_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_company_severity ON incidents_incident (company_id, severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_role ON users_user (company_id, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_hazard_class_packing_group ON dangerous_goods_dangerousgood (hazard_class, packing_group);

-- Partial indexes for performance on commonly filtered active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_active ON companies_company (name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users_user (email) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_active ON vehicles_vehicle (registration_number) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_active ON locations_location (name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_active ON dangerous_goods_dangerousgood (un_number) WHERE is_active = true;

-- Database maintenance and statistics
ANALYZE;

-- Update table statistics for query planner
UPDATE pg_stat_user_tables SET n_tup_ins = n_tup_ins;

COMMIT;