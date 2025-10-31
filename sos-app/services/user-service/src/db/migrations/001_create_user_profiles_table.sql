-- Migration: Create user_profiles table
-- Date: 2025-10-31

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  gender gender_type,
  phone_number VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  blood_type blood_type,
  medical_conditions TEXT,
  allergies TEXT,
  medications TEXT,
  emergency_notes TEXT,
  profile_picture_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_phone_number ON user_profiles(phone_number);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX idx_user_profiles_deleted_at ON user_profiles(deleted_at);

-- Comments
COMMENT ON TABLE user_profiles IS 'User profile information for SOS App users';
COMMENT ON COLUMN user_profiles.user_id IS 'References user ID from auth service';
COMMENT ON COLUMN user_profiles.medical_conditions IS 'Known medical conditions (comma-separated)';
COMMENT ON COLUMN user_profiles.allergies IS 'Known allergies (comma-separated)';
COMMENT ON COLUMN user_profiles.medications IS 'Current medications (comma-separated)';
COMMENT ON COLUMN user_profiles.emergency_notes IS 'Important notes for emergency responders';
