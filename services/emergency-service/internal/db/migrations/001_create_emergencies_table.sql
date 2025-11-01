-- Migration: 001_create_emergencies_table
-- Description: Create emergencies table for tracking emergency alerts
-- Created: 2025-10-30

-- Create emergencies table
CREATE TABLE IF NOT EXISTS emergencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    emergency_type VARCHAR(50) NOT NULL CHECK (emergency_type IN ('MEDICAL', 'FIRE', 'POLICE', 'GENERAL', 'FALL_DETECTED', 'DEVICE_ALERT')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED', 'RESOLVED')),
    initial_location JSONB NOT NULL,
    initial_message TEXT,
    auto_triggered BOOLEAN DEFAULT FALSE,
    triggered_by VARCHAR(255) NOT NULL,
    countdown_seconds INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    metadata JSONB,

    -- Constraints
    CONSTRAINT valid_countdown CHECK (countdown_seconds >= 0),
    CONSTRAINT valid_timestamps CHECK (
        (status = 'ACTIVE' AND activated_at IS NOT NULL) OR
        (status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR
        (status = 'RESOLVED' AND resolved_at IS NOT NULL AND activated_at IS NOT NULL) OR
        (status = 'PENDING')
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergencies_user_id ON emergencies(user_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_emergencies_created_at ON emergencies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergencies_user_status ON emergencies(user_id, status);
CREATE INDEX IF NOT EXISTS idx_emergencies_active ON emergencies(user_id, status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_emergencies_type ON emergencies(emergency_type);

-- Index on JSONB location field for geospatial queries (optional)
CREATE INDEX IF NOT EXISTS idx_emergencies_location ON emergencies USING GIN (initial_location);

-- Add comments for documentation
COMMENT ON TABLE emergencies IS 'Stores all emergency alerts triggered by users or IoT devices';
COMMENT ON COLUMN emergencies.id IS 'Unique identifier for the emergency';
COMMENT ON COLUMN emergencies.user_id IS 'ID of the user who triggered or owns this emergency';
COMMENT ON COLUMN emergencies.emergency_type IS 'Type of emergency: MEDICAL, FIRE, POLICE, GENERAL, FALL_DETECTED, DEVICE_ALERT';
COMMENT ON COLUMN emergencies.status IS 'Current status: PENDING (countdown), ACTIVE, CANCELLED, RESOLVED';
COMMENT ON COLUMN emergencies.initial_location IS 'Location where emergency was triggered (JSONB with lat, lng, accuracy, etc.)';
COMMENT ON COLUMN emergencies.auto_triggered IS 'True if triggered automatically by IoT device, false if manual';
COMMENT ON COLUMN emergencies.triggered_by IS 'Source of trigger: user, device:dev_123, or system';
COMMENT ON COLUMN emergencies.countdown_seconds IS 'Duration of countdown before activation (default 10 seconds)';
COMMENT ON COLUMN emergencies.activated_at IS 'Timestamp when emergency became ACTIVE after countdown';
COMMENT ON COLUMN emergencies.cancelled_at IS 'Timestamp when emergency was cancelled during countdown';
COMMENT ON COLUMN emergencies.resolved_at IS 'Timestamp when emergency was marked as resolved';
COMMENT ON COLUMN emergencies.metadata IS 'Additional context data in JSON format';
