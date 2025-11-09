-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    paired_at TIMESTAMP NOT NULL DEFAULT NOW(),
    battery_level INTEGER DEFAULT 100 CHECK (battery_level >= 0 AND battery_level <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    capabilities TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_mac_address UNIQUE (mac_address)
);

-- Create index on user_id for faster queries
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- Create index on mac_address for faster lookups
CREATE INDEX idx_devices_mac_address ON devices(mac_address);

-- Create index on status for filtering
CREATE INDEX idx_devices_status ON devices(status);

-- Create index on device_type for filtering
CREATE INDEX idx_devices_type ON devices(device_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
