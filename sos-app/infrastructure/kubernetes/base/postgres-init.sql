-- =============================================================================
-- SOS App - PostgreSQL Database Initialization Script
-- =============================================================================
-- Purpose: Initialize database structure with proper isolation
-- Creates: 5 databases with dedicated roles and least privilege access
-- Security: RBAC-based access control per service
-- =============================================================================

-- This script runs automatically when PostgreSQL starts for the first time
-- Place this file in /docker-entrypoint-initdb.d/ in the postgres container

\set ON_ERROR_STOP on

-- Set timezone and locale
SET TIME ZONE 'UTC';

-- Enable required extensions (will be created per database)
-- Extensions are database-specific in PostgreSQL

BEGIN;

-- =============================================================================
-- 1. Authentication Service Database
-- =============================================================================

-- Create database
CREATE DATABASE sos_app_auth
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Create role with limited privileges
CREATE ROLE auth_service WITH
    LOGIN
    PASSWORD 'CHANGE_ME_auth_service_password'  -- Change in production!
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    CONNECTION LIMIT 50;

-- Grant connection to database
GRANT CONNECT ON DATABASE sos_app_auth TO auth_service;

-- Connect to auth database and set up schema
\c sos_app_auth

-- Create schema
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION auth_service;

-- Set default schema for role
ALTER ROLE auth_service SET search_path TO auth, public;

-- Grant schema privileges
GRANT USAGE ON SCHEMA auth TO auth_service;
GRANT CREATE ON SCHEMA auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO auth_service;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT ALL ON TABLES TO auth_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT ALL ON SEQUENCES TO auth_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT ALL ON FUNCTIONS TO auth_service;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions

-- Add comment
COMMENT ON DATABASE sos_app_auth IS 'SOS App - Authentication and authorization data';

-- =============================================================================
-- 2. User Service Database
-- =============================================================================

\c postgres

CREATE DATABASE sos_app_users
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE ROLE user_service WITH
    LOGIN
    PASSWORD 'CHANGE_ME_user_service_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    CONNECTION LIMIT 50;

GRANT CONNECT ON DATABASE sos_app_users TO user_service;

\c sos_app_users

CREATE SCHEMA IF NOT EXISTS users AUTHORIZATION user_service;
ALTER ROLE user_service SET search_path TO users, public;
GRANT USAGE ON SCHEMA users TO user_service;
GRANT CREATE ON SCHEMA users TO user_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA users TO user_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA users TO user_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA users TO user_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA users
    GRANT ALL ON TABLES TO user_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA users
    GRANT ALL ON SEQUENCES TO user_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA users
    GRANT ALL ON FUNCTIONS TO user_service;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMENT ON DATABASE sos_app_users IS 'SOS App - User profiles and emergency contacts';

-- =============================================================================
-- 3. Emergency Service Database
-- =============================================================================

\c postgres

CREATE DATABASE sos_app_emergency
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE ROLE emergency_service WITH
    LOGIN
    PASSWORD 'CHANGE_ME_emergency_service_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    CONNECTION LIMIT 100;  -- Higher limit for critical service

GRANT CONNECT ON DATABASE sos_app_emergency TO emergency_service;

\c sos_app_emergency

CREATE SCHEMA IF NOT EXISTS emergency AUTHORIZATION emergency_service;
ALTER ROLE emergency_service SET search_path TO emergency, public;
GRANT USAGE ON SCHEMA emergency TO emergency_service;
GRANT CREATE ON SCHEMA emergency TO emergency_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA emergency TO emergency_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA emergency TO emergency_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA emergency TO emergency_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA emergency
    GRANT ALL ON TABLES TO emergency_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA emergency
    GRANT ALL ON SEQUENCES TO emergency_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA emergency
    GRANT ALL ON FUNCTIONS TO emergency_service;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";        -- Geospatial support

COMMENT ON DATABASE sos_app_emergency IS 'SOS App - Emergency alerts and acknowledgments';

-- =============================================================================
-- 4. Medical Service Database
-- =============================================================================

\c postgres

CREATE DATABASE sos_app_medical
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE ROLE medical_service WITH
    LOGIN
    PASSWORD 'CHANGE_ME_medical_service_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    CONNECTION LIMIT 50;

GRANT CONNECT ON DATABASE sos_app_medical TO medical_service;

\c sos_app_medical

CREATE SCHEMA IF NOT EXISTS medical AUTHORIZATION medical_service;
ALTER ROLE medical_service SET search_path TO medical, public;
GRANT USAGE ON SCHEMA medical TO medical_service;
GRANT CREATE ON SCHEMA medical TO medical_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA medical TO medical_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA medical TO medical_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA medical TO medical_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA medical
    GRANT ALL ON TABLES TO medical_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA medical
    GRANT ALL ON SEQUENCES TO medical_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA medical
    GRANT ALL ON FUNCTIONS TO medical_service;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption

COMMENT ON DATABASE sos_app_medical IS 'SOS App - Medical profiles and health data (HIPAA-compliant)';

-- =============================================================================
-- 5. Device Service Database
-- =============================================================================

\c postgres

CREATE DATABASE sos_app_devices
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE ROLE device_service WITH
    LOGIN
    PASSWORD 'CHANGE_ME_device_service_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    CONNECTION LIMIT 50;

GRANT CONNECT ON DATABASE sos_app_devices TO device_service;

\c sos_app_devices

CREATE SCHEMA IF NOT EXISTS devices AUTHORIZATION device_service;
ALTER ROLE device_service SET search_path TO devices, public;
GRANT USAGE ON SCHEMA devices TO device_service;
GRANT CREATE ON SCHEMA devices TO device_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA devices TO device_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA devices TO device_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA devices TO device_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA devices
    GRANT ALL ON TABLES TO device_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA devices
    GRANT ALL ON SEQUENCES TO device_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA devices
    GRANT ALL ON FUNCTIONS TO device_service;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMENT ON DATABASE sos_app_devices IS 'SOS App - IoT device management and telemetry';

-- =============================================================================
-- Read-Only Role (for analytics, reporting)
-- =============================================================================

\c postgres

CREATE ROLE readonly_service WITH
    LOGIN
    PASSWORD 'CHANGE_ME_readonly_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    CONNECTION LIMIT 20;

-- Grant read-only access to all databases
GRANT CONNECT ON DATABASE sos_app_auth TO readonly_service;
GRANT CONNECT ON DATABASE sos_app_users TO readonly_service;
GRANT CONNECT ON DATABASE sos_app_emergency TO readonly_service;
GRANT CONNECT ON DATABASE sos_app_medical TO readonly_service;
GRANT CONNECT ON DATABASE sos_app_devices TO readonly_service;

-- Set up read-only permissions for each database
\c sos_app_auth
GRANT USAGE ON SCHEMA auth TO readonly_service;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO readonly_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT SELECT ON TABLES TO readonly_service;

\c sos_app_users
GRANT USAGE ON SCHEMA users TO readonly_service;
GRANT SELECT ON ALL TABLES IN SCHEMA users TO readonly_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA users
    GRANT SELECT ON TABLES TO readonly_service;

\c sos_app_emergency
GRANT USAGE ON SCHEMA emergency TO readonly_service;
GRANT SELECT ON ALL TABLES IN SCHEMA emergency TO readonly_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA emergency
    GRANT SELECT ON TABLES TO readonly_service;

\c sos_app_medical
GRANT USAGE ON SCHEMA medical TO readonly_service;
GRANT SELECT ON ALL TABLES IN SCHEMA medical TO readonly_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA medical
    GRANT SELECT ON TABLES TO readonly_service;

\c sos_app_devices
GRANT USAGE ON SCHEMA devices TO readonly_service;
GRANT SELECT ON ALL TABLES IN SCHEMA devices TO readonly_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA devices
    GRANT SELECT ON TABLES TO readonly_service;

-- =============================================================================
-- Summary and Verification
-- =============================================================================

\c postgres

-- List all databases
SELECT datname as "Database",
       pg_encoding_to_char(encoding) as "Encoding",
       datcollate as "Collate",
       datctype as "Ctype"
FROM pg_database
WHERE datname LIKE 'sos_app_%'
ORDER BY datname;

-- List all service roles
SELECT rolname as "Role",
       rolconnlimit as "Connection Limit",
       CASE WHEN rolcanlogin THEN 'Yes' ELSE 'No' END as "Can Login",
       CASE WHEN rolsuper THEN 'Yes' ELSE 'No' END as "Superuser"
FROM pg_roles
WHERE rolname LIKE '%_service'
ORDER BY rolname;

COMMIT;

-- =============================================================================
-- Production Security Notes:
-- =============================================================================
--
-- 1. CHANGE ALL PASSWORDS!
--    - Replace 'CHANGE_ME_*_password' with strong passwords
--    - Use: openssl rand -base64 32
--    - Store in Kubernetes secrets, not in this file
--
-- 2. Connection Limits:
--    - Adjust based on actual service needs
--    - Emergency service has higher limit (100) due to criticality
--
-- 3. SSL/TLS:
--    - Enable SSL in postgresql.conf for production
--    - Require SSL connections: ALTER ROLE service_name REQUIRE SSL;
--
-- 4. Audit Logging:
--    - Enable pgaudit extension for HIPAA compliance
--    - Log all DDL and DML for medical database
--
-- 5. Encryption:
--    - pgcrypto extension enabled for field-level encryption
--    - Use for medical data and PII
--
-- 6. Backup:
--    - Configure pg_basebackup or use cloud-native backups
--    - Retention: 30 days for compliance
--
-- 7. Monitoring:
--    - PostgreSQL Exporter already configured in StatefulSet
--    - Monitor connection counts, query performance, replication lag
--
-- =============================================================================
-- Usage in ConfigMap:
-- =============================================================================
--
-- Create ConfigMap from this file:
--   kubectl create configmap postgres-init-scripts \
--     --from-file=init.sql=postgres-init.sql \
--     -n sos-app
--
-- The StatefulSet already mounts this as:
--   volumeMounts:
--   - name: postgres-init-scripts
--     mountPath: /docker-entrypoint-initdb.d
--
-- =============================================================================
-- Connection Strings (for services):
-- =============================================================================
--
-- Auth Service:
--   postgresql://auth_service:PASSWORD@postgres-service:5432/sos_app_auth
--
-- User Service:
--   postgresql://user_service:PASSWORD@postgres-service:5432/sos_app_users
--
-- Emergency Service:
--   postgresql://emergency_service:PASSWORD@postgres-service:5432/sos_app_emergency
--
-- Medical Service:
--   postgresql://medical_service:PASSWORD@postgres-service:5432/sos_app_medical
--
-- Device Service:
--   postgresql://device_service:PASSWORD@postgres-service:5432/sos_app_devices
--
-- Read-Only (Analytics):
--   postgresql://readonly_service:PASSWORD@postgres-readonly-service:5432/sos_app_*
--
-- =============================================================================
