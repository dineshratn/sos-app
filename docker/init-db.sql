-- Initialize databases for SOS App services

-- Create databases for Node.js services
CREATE DATABASE sos_auth;
CREATE DATABASE sos_user;
CREATE DATABASE sos_medical;

-- Create databases for Go services
CREATE DATABASE sos_app_emergency;
CREATE DATABASE sos_app_location;
CREATE DATABASE device_db;

-- Enable pgcrypto extension for encryption (Medical Service)
\c sos_medical;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Note: TimescaleDB extension for location service would need timescaledb/timescaledb-ha image
-- Skipping for now - location service will work without it but won't have time-series optimizations

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE sos_auth TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sos_user TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sos_medical TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sos_app_emergency TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sos_app_location TO postgres;
GRANT ALL PRIVILEGES ON DATABASE device_db TO postgres;

-- Log successful initialization
\echo 'SOS App databases initialized successfully!'
\echo 'Node.js services: sos_auth, sos_user, sos_medical'
\echo 'Go services: sos_app_emergency, sos_app_location, device_db'
