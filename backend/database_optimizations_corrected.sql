-- SafeShipper Database Performance Optimizations (Corrected Table Names)
-- This script adds database indexes and constraints to improve query performance

-- Begin transaction for safety
BEGIN;

-- Companies table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_name ON companies_company (name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_abn ON companies_company (abn);

-- Dangerous goods table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_un_number ON dangerous_goods_dangerousgood (un_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_proper_shipping_name ON dangerous_goods_dangerousgood (proper_shipping_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_hazard_class ON dangerous_goods_dangerousgood (hazard_class);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_packing_group ON dangerous_goods_dangerousgood (packing_group);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dg_hazard_class_packing_group ON dangerous_goods_dangerousgood (hazard_class, packing_group);

-- Database maintenance and statistics
ANALYZE companies_company;
ANALYZE dangerous_goods_dangerousgood;

COMMIT;