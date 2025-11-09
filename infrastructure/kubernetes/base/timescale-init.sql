-- =============================================================================
-- SOS App - TimescaleDB Initialization Script
-- =============================================================================
-- Purpose: Initialize TimescaleDB with hypertables, retention, and compression
-- Database: sos_app_location (location tracking time-series data)
-- Features: Hypertables, continuous aggregates, retention policies, compression
-- =============================================================================

\set ON_ERROR_STOP on

-- Set timezone
SET TIME ZONE 'UTC';

-- =============================================================================
-- 1. Enable TimescaleDB Extension
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- For geospatial support

-- =============================================================================
-- 2. Create Application Role
-- =============================================================================

-- Create role for location service
CREATE ROLE location_service WITH
    LOGIN
    PASSWORD 'CHANGE_ME_location_service_password'  -- Change in production!
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    CONNECTION LIMIT 100;  -- Higher limit for critical service

-- Grant connection to database
GRANT CONNECT ON DATABASE sos_app_location TO location_service;

-- Create schema
CREATE SCHEMA IF NOT EXISTS location AUTHORIZATION location_service;

-- Set default schema for role
ALTER ROLE location_service SET search_path TO location, public;

-- Grant schema privileges
GRANT USAGE ON SCHEMA location TO location_service;
GRANT CREATE ON SCHEMA location TO location_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA location TO location_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA location TO location_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA location TO location_service;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA location
    GRANT ALL ON TABLES TO location_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA location
    GRANT ALL ON SEQUENCES TO location_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA location
    GRANT ALL ON FUNCTIONS TO location_service;

-- =============================================================================
-- 3. Create Location Updates Table (Hypertable)
-- =============================================================================

CREATE TABLE IF NOT EXISTS location.location_updates (
    id UUID DEFAULT uuid_generate_v4() NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL,
    device_id UUID,
    emergency_id UUID,

    -- Location data
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,  -- meters
    altitude DOUBLE PRECISION,  -- meters
    speed DOUBLE PRECISION,     -- meters/second
    heading DOUBLE PRECISION,   -- degrees (0-360)

    -- PostGIS geometry (for spatial queries)
    location GEOGRAPHY(POINT, 4326),

    -- Source information
    source VARCHAR(50) NOT NULL,  -- 'GPS', 'NETWORK', 'MANUAL', 'DEVICE'
    battery_level INTEGER,        -- 0-100

    -- Metadata
    is_emergency BOOLEAN DEFAULT false,
    provider VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT location_updates_pkey PRIMARY KEY (timestamp, id),
    CONSTRAINT location_updates_latitude_check CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT location_updates_longitude_check CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT location_updates_accuracy_check CHECK (accuracy >= 0),
    CONSTRAINT location_updates_battery_check CHECK (battery_level >= 0 AND battery_level <= 100)
);

-- Create indexes BEFORE converting to hypertable
CREATE INDEX IF NOT EXISTS idx_location_updates_user_id
    ON location.location_updates (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_updates_emergency_id
    ON location.location_updates (emergency_id, timestamp DESC)
    WHERE emergency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_updates_device_id
    ON location.location_updates (device_id, timestamp DESC)
    WHERE device_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_updates_is_emergency
    ON location.location_updates (is_emergency, timestamp DESC)
    WHERE is_emergency = true;

-- Spatial index on location column
CREATE INDEX IF NOT EXISTS idx_location_updates_location
    ON location.location_updates USING GIST (location);

-- Add comments
COMMENT ON TABLE location.location_updates IS 'Time-series location tracking data for SOS App';
COMMENT ON COLUMN location.location_updates.timestamp IS 'Location update timestamp (partition key)';
COMMENT ON COLUMN location.location_updates.location IS 'PostGIS geography for spatial queries';

-- =============================================================================
-- 4. Convert to Hypertable
-- =============================================================================

-- Convert table to hypertable (partitioned by time)
SELECT create_hypertable(
    'location.location_updates',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- =============================================================================
-- 5. Retention Policy (keep detailed data for 7 days)
-- =============================================================================

-- Drop old data after 7 days
SELECT add_retention_policy(
    'location.location_updates',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- =============================================================================
-- 6. Compression Policy (compress data after 1 day)
-- =============================================================================

-- Enable compression
ALTER TABLE location.location_updates SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Add compression policy (compress chunks older than 1 day)
SELECT add_compression_policy(
    'location.location_updates',
    INTERVAL '1 day',
    if_not_exists => TRUE
);

-- =============================================================================
-- 7. Continuous Aggregates (for performance)
-- =============================================================================

-- Hourly aggregates (for analytics and visualizations)
CREATE MATERIALIZED VIEW IF NOT EXISTS location.location_updates_hourly
WITH (timescaledb.continuous) AS
SELECT
    user_id,
    time_bucket('1 hour', timestamp) AS hour,
    COUNT(*) as update_count,
    AVG(latitude) as avg_latitude,
    AVG(longitude) as avg_longitude,
    AVG(accuracy) as avg_accuracy,
    AVG(speed) as avg_speed,
    MIN(timestamp) as first_update,
    MAX(timestamp) as last_update,
    BOOL_OR(is_emergency) as had_emergency,
    AVG(battery_level) as avg_battery_level
FROM location.location_updates
GROUP BY user_id, hour
WITH NO DATA;

-- Add refresh policy (refresh every 30 minutes)
SELECT add_continuous_aggregate_policy(
    'location.location_updates_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE
);

-- Refresh the aggregate initially
CALL refresh_continuous_aggregate('location.location_updates_hourly', NULL, NULL);

-- Add comment
COMMENT ON MATERIALIZED VIEW location.location_updates_hourly IS 'Hourly aggregated location statistics';

-- Daily aggregates (for long-term analytics)
CREATE MATERIALIZED VIEW IF NOT EXISTS location.location_updates_daily
WITH (timescaledb.continuous) AS
SELECT
    user_id,
    time_bucket('1 day', timestamp) AS day,
    COUNT(*) as update_count,
    AVG(latitude) as avg_latitude,
    AVG(longitude) as avg_longitude,
    MIN(timestamp) as first_update,
    MAX(timestamp) as last_update,
    BOOL_OR(is_emergency) as had_emergency,
    COUNT(DISTINCT emergency_id) FILTER (WHERE emergency_id IS NOT NULL) as emergency_count,
    AVG(battery_level) as avg_battery_level
FROM location.location_updates
GROUP BY user_id, day
WITH NO DATA;

-- Add refresh policy (refresh once per day)
SELECT add_continuous_aggregate_policy(
    'location.location_updates_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Refresh the aggregate initially
CALL refresh_continuous_aggregate('location.location_updates_daily', NULL, NULL);

-- Add comment
COMMENT ON MATERIALIZED VIEW location.location_updates_daily IS 'Daily aggregated location statistics';

-- Grant permissions on continuous aggregates
GRANT SELECT ON location.location_updates_hourly TO location_service;
GRANT SELECT ON location.location_updates_daily TO location_service;

-- =============================================================================
-- 8. Emergency Location Trail Table (Separate for long retention)
-- =============================================================================

CREATE TABLE IF NOT EXISTS location.emergency_location_trail (
    id UUID DEFAULT uuid_generate_v4() NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    emergency_id UUID NOT NULL,
    user_id UUID NOT NULL,

    -- Location data
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    location GEOGRAPHY(POINT, 4326),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT emergency_location_trail_pkey PRIMARY KEY (timestamp, id),
    CONSTRAINT emergency_location_trail_latitude_check CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT emergency_location_trail_longitude_check CHECK (longitude >= -180 AND longitude <= 180)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emergency_location_trail_emergency_id
    ON location.emergency_location_trail (emergency_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_location_trail_user_id
    ON location.emergency_location_trail (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_location_trail_location
    ON location.emergency_location_trail USING GIST (location);

-- Convert to hypertable
SELECT create_hypertable(
    'location.emergency_location_trail',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Retention policy (keep emergency trails for 90 days)
SELECT add_retention_policy(
    'location.emergency_location_trail',
    INTERVAL '90 days',
    if_not_exists => TRUE
);

-- Compression policy (compress after 7 days)
ALTER TABLE location.emergency_location_trail SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'emergency_id',
    timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy(
    'location.emergency_location_trail',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Add comment
COMMENT ON TABLE location.emergency_location_trail IS 'Emergency location trails (90-day retention for compliance)';

-- =============================================================================
-- 9. Helper Functions
-- =============================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION location.calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    earth_radius CONSTANT DOUBLE PRECISION := 6371000; -- meters
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);

    a := sin(dlat / 2) * sin(dlat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon / 2) * sin(dlon / 2);

    c := 2 * atan2(sqrt(a), sqrt(1 - a));

    RETURN earth_radius * c;
END;
$$;

-- Function to get latest location for a user
CREATE OR REPLACE FUNCTION location.get_latest_location(p_user_id UUID)
RETURNS TABLE (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    timestamp TIMESTAMPTZ,
    source VARCHAR(50)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lu.latitude,
        lu.longitude,
        lu.accuracy,
        lu.timestamp,
        lu.source
    FROM location.location_updates lu
    WHERE lu.user_id = p_user_id
    ORDER BY lu.timestamp DESC
    LIMIT 1;
END;
$$;

-- Function to get location trail for an emergency
CREATE OR REPLACE FUNCTION location.get_emergency_trail(p_emergency_id UUID)
RETURNS TABLE (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        elt.latitude,
        elt.longitude,
        elt.accuracy,
        elt.timestamp
    FROM location.emergency_location_trail elt
    WHERE elt.emergency_id = p_emergency_id
    ORDER BY elt.timestamp ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION location.calculate_distance TO location_service;
GRANT EXECUTE ON FUNCTION location.get_latest_location TO location_service;
GRANT EXECUTE ON FUNCTION location.get_emergency_trail TO location_service;

-- =============================================================================
-- 10. Read-Only Role (for analytics)
-- =============================================================================

-- Grant read-only access to readonly_service role
GRANT CONNECT ON DATABASE sos_app_location TO readonly_service;
GRANT USAGE ON SCHEMA location TO readonly_service;
GRANT SELECT ON ALL TABLES IN SCHEMA location TO readonly_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA location
    GRANT SELECT ON TABLES TO readonly_service;

-- =============================================================================
-- 11. Summary and Verification
-- =============================================================================

-- List all hypertables
SELECT * FROM timescaledb_information.hypertables;

-- List all continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;

-- List all compression policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_compression';

-- List all retention policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';

-- List all refresh policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_refresh_continuous_aggregate';

-- =============================================================================
-- Production Notes:
-- =============================================================================
--
-- 1. CHANGE ALL PASSWORDS!
--    - Replace 'CHANGE_ME_*_password' with strong passwords
--    - Use: openssl rand -base64 32
--    - Store in Kubernetes secrets
--
-- 2. Retention Policies:
--    - location_updates: 7 days (can be adjusted based on storage)
--    - emergency_location_trail: 90 days (compliance requirement)
--
-- 3. Compression:
--    - Saves 90-95% storage space
--    - Compressed chunks are read-only
--    - Decompress if needed: SELECT decompress_chunk('_timescaledb_internal._hyper_1_1_chunk');
--
-- 4. Continuous Aggregates:
--    - Pre-computed for fast queries
--    - Refreshed automatically
--    - Query like normal tables: SELECT * FROM location.location_updates_hourly
--
-- 5. Performance Tuning:
--    - Adjust chunk_time_interval based on ingestion rate
--    - Add more indexes if needed (but avoid over-indexing)
--    - Monitor query performance and adjust
--
-- 6. Backup:
--    - pg_dump: pg_dump -U postgres -d sos_app_location -Fc -f location_backup.dump
--    - pg_restore: pg_restore -U postgres -d sos_app_location location_backup.dump
--
-- 7. Monitoring:
--    - Monitor chunk count: SELECT * FROM timescaledb_information.chunks;
--    - Monitor compression ratio: SELECT * FROM timescaledb_information.compression_settings;
--    - Monitor job status: SELECT * FROM timescaledb_information.job_stats;
--
-- =============================================================================
-- Connection String (for services):
-- =============================================================================
--
-- Location Service:
--   postgresql://location_service:PASSWORD@timescale-service:5432/sos_app_location
--
-- Read-Only (Analytics):
--   postgresql://readonly_service:PASSWORD@timescale-readonly-service:5432/sos_app_location
--
-- =============================================================================
-- Example Queries:
-- =============================================================================
--
-- Insert location update:
--   INSERT INTO location.location_updates (user_id, latitude, longitude, accuracy, source, is_emergency)
--   VALUES ('user-uuid', 37.7749, -122.4194, 10.0, 'GPS', false);
--
-- Get latest location for user:
--   SELECT * FROM location.get_latest_location('user-uuid');
--
-- Get location trail for emergency:
--   SELECT * FROM location.get_emergency_trail('emergency-uuid');
--
-- Get hourly location statistics:
--   SELECT * FROM location.location_updates_hourly
--   WHERE user_id = 'user-uuid' AND hour >= NOW() - INTERVAL '7 days'
--   ORDER BY hour DESC;
--
-- Find users within radius:
--   SELECT user_id, latitude, longitude, timestamp
--   FROM location.location_updates
--   WHERE ST_DWithin(
--     location,
--     ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
--     1000  -- 1000 meters radius
--   )
--   AND timestamp >= NOW() - INTERVAL '1 hour'
--   ORDER BY timestamp DESC;
--
-- =============================================================================
