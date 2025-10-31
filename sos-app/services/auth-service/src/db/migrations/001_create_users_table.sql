-- Migration: 001_create_users_table
-- Description: Create users table for authentication
-- Date: 2025-10-31

-- Create ENUM type for auth providers
CREATE TYPE auth_provider AS ENUM ('local', 'google', 'apple');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  auth_provider auth_provider NOT NULL DEFAULT 'local',
  provider_id VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMP,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  account_locked_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_phone_number CHECK (
    phone_number IS NULL OR phone_number ~ '^\+?[1-9]\d{1,14}$'
  ),
  CONSTRAINT valid_provider_combination CHECK (
    (auth_provider = 'local' AND password_hash IS NOT NULL) OR
    (auth_provider IN ('google', 'apple') AND provider_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone_number ON users(phone_number) WHERE deleted_at IS NULL AND phone_number IS NOT NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider, provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_last_login ON users(last_login_at DESC) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE users IS 'User accounts for SOS App authentication';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.phone_number IS 'User phone number in E.164 format (unique)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (for local auth)';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider (local, google, apple)';
COMMENT ON COLUMN users.provider_id IS 'External provider user ID (for OAuth)';
COMMENT ON COLUMN users.mfa_enabled IS 'Multi-factor authentication enabled flag';
COMMENT ON COLUMN users.mfa_secret IS 'TOTP secret for MFA (encrypted)';
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for failed login attempts';
COMMENT ON COLUMN users.account_locked_until IS 'Account lock expiration timestamp';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp (paranoid delete)';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
