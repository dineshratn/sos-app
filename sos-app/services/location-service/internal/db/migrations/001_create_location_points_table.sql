-- Enable TimescaleDB extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create location_points table
CREATE TABLE IF NOT EXISTS location_points (
    id BIGSERIAL,
    emergency_id UUID NOT NULL,
    user_id UUID NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy DOUBLE PRECISION CHECK (accuracy >= 0),
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION CHECK (speed >= 0),
    heading DOUBLE PRECISION CHECK (heading BETWEEN 0 AND 360),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('GPS', 'CELLULAR', 'WIFI', 'HYBRID')),
    address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable
-- Partition by timestamp with 7-day chunks for optimal performance
SELECT create_hypertable(
    'location_points',
    'timestamp',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_location_emergency_timestamp
    ON location_points (emergency_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_user_timestamp
    ON location_points (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_timestamp
    ON location_points (timestamp DESC);

-- Create geospatial index for proximity queries
CREATE INDEX IF NOT EXISTS idx_location_coordinates
    ON location_points (latitude, longitude);

-- Create continuous aggregate for location statistics (5-minute buckets)
CREATE MATERIALIZED VIEW IF NOT EXISTS location_summary_5min
WITH (timescaledb.continuous) AS
SELECT
    emergency_id,
    time_bucket('5 minutes', timestamp) AS bucket,
    COUNT(*) as point_count,
    AVG(accuracy) as avg_accuracy,
    AVG(speed) as avg_speed,
    first(latitude, timestamp) as start_lat,
    first(longitude, timestamp) as start_lng,
    last(latitude, timestamp) as end_lat,
    last(longitude, timestamp) as end_lng,
    MIN(timestamp) as start_time,
    MAX(timestamp) as end_time
FROM location_points
GROUP BY emergency_id, bucket
WITH NO DATA;

-- Create policy to refresh the continuous aggregate every 5 minutes
SELECT add_continuous_aggregate_policy('location_summary_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE
);

-- Add retention policy to automatically delete data older than 2 years
SELECT add_retention_policy('location_points',
    INTERVAL '2 years',
    if_not_exists => TRUE
);

-- Add compression policy to compress data older than 7 days
SELECT add_compression_policy('location_points',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    earth_radius DOUBLE PRECISION := 6371000; -- Earth radius in meters
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);

    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon/2) * sin(dlon/2);

    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for latest location per emergency
CREATE OR REPLACE VIEW latest_emergency_locations AS
SELECT DISTINCT ON (emergency_id)
    id,
    emergency_id,
    user_id,
    latitude,
    longitude,
    accuracy,
    altitude,
    speed,
    heading,
    provider,
    address,
    timestamp,
    battery_level
FROM location_points
ORDER BY emergency_id, timestamp DESC;

-- Add comments for documentation
COMMENT ON TABLE location_points IS 'Time-series location data for emergency tracking';
COMMENT ON COLUMN location_points.emergency_id IS 'UUID of the emergency this location belongs to';
COMMENT ON COLUMN location_points.user_id IS 'UUID of the user being tracked';
COMMENT ON COLUMN location_points.latitude IS 'Latitude in decimal degrees (-90 to 90)';
COMMENT ON COLUMN location_points.longitude IS 'Longitude in decimal degrees (-180 to 180)';
COMMENT ON COLUMN location_points.accuracy IS 'Location accuracy in meters';
COMMENT ON COLUMN location_points.provider IS 'Source of location data (GPS, CELLULAR, WIFI, HYBRID)';
COMMENT ON COLUMN location_points.timestamp IS 'Time when the location was captured';
