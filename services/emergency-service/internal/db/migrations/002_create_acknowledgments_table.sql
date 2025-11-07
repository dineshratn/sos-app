-- Migration: 002_create_acknowledgments_table
-- Description: Create emergency_acknowledgments table for tracking contact acknowledgments
-- Created: 2025-10-30

-- Create emergency_acknowledgments table
CREATE TABLE IF NOT EXISTS emergency_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location JSONB,
    message TEXT,

    -- Constraints
    CONSTRAINT unique_acknowledgment UNIQUE (emergency_id, contact_id),
    CONSTRAINT valid_contact_info CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_acknowledgments_emergency ON emergency_acknowledgments(emergency_id);
CREATE INDEX IF NOT EXISTS idx_acknowledgments_contact ON emergency_acknowledgments(contact_id);
CREATE INDEX IF NOT EXISTS idx_acknowledgments_time ON emergency_acknowledgments(emergency_id, acknowledged_at);

-- Add comments for documentation
COMMENT ON TABLE emergency_acknowledgments IS 'Stores acknowledgments from emergency contacts';
COMMENT ON COLUMN emergency_acknowledgments.id IS 'Unique identifier for the acknowledgment';
COMMENT ON COLUMN emergency_acknowledgments.emergency_id IS 'ID of the emergency being acknowledged';
COMMENT ON COLUMN emergency_acknowledgments.contact_id IS 'ID of the contact who acknowledged';
COMMENT ON COLUMN emergency_acknowledgments.contact_name IS 'Name of the contact';
COMMENT ON COLUMN emergency_acknowledgments.contact_phone IS 'Phone number of the contact';
COMMENT ON COLUMN emergency_acknowledgments.contact_email IS 'Email address of the contact';
COMMENT ON COLUMN emergency_acknowledgments.acknowledged_at IS 'Timestamp when the emergency was acknowledged';
COMMENT ON COLUMN emergency_acknowledgments.location IS 'Contact location when acknowledging (JSONB with lat, lng, etc.)';
COMMENT ON COLUMN emergency_acknowledgments.message IS 'Optional message from the contact';
