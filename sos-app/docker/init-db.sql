-- Initialize databases for SOS App services

-- Create databases
CREATE DATABASE sos_auth;
CREATE DATABASE sos_user;
CREATE DATABASE sos_medical;

-- Enable pgcrypto extension for encryption (Medical Service)
\c sos_medical;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE sos_auth TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sos_user TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sos_medical TO postgres;

-- Log successful initialization
\echo 'SOS App databases initialized successfully!'
\echo 'Databases created: sos_auth, sos_user, sos_medical'
