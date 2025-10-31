-- Migration: 002_create_sessions_table
-- Description: Create sessions table for managing user sessions and refresh tokens
-- Date: 2025-10-31

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  refresh_token TEXT NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_device_id ON sessions(device_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_user_device ON sessions(user_id, device_id);
CREATE INDEX idx_sessions_active ON sessions(user_id, expires_at) WHERE expires_at > NOW();

-- Add comments
COMMENT ON TABLE sessions IS 'User sessions for JWT refresh token management';
COMMENT ON COLUMN sessions.id IS 'Unique session identifier (UUID)';
COMMENT ON COLUMN sessions.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN sessions.device_id IS 'Unique device identifier (from client)';
COMMENT ON COLUMN sessions.device_name IS 'Human-readable device name';
COMMENT ON COLUMN sessions.device_type IS 'Device type (ios, android, web, etc.)';
COMMENT ON COLUMN sessions.refresh_token IS 'JWT refresh token (hashed)';
COMMENT ON COLUMN sessions.ip_address IS 'IP address from which session was created';
COMMENT ON COLUMN sessions.user_agent IS 'User agent string from client';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN sessions.last_active_at IS 'Last activity timestamp for session';

-- Create trigger for updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Removes expired sessions and returns count of deleted rows';
