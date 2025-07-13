-- init-db.sql
-- Initialize SafeShipper database with extensions

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create read-only user for monitoring
CREATE USER safeshipper_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE safeshipper TO safeshipper_readonly;
GRANT USAGE ON SCHEMA public TO safeshipper_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO safeshipper_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO safeshipper_readonly;