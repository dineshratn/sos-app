-- Migration: Create emergency_contacts table
-- Date: 2025-10-31

CREATE TYPE contact_relationship AS ENUM (
  'spouse',
  'parent',
  'child',
  'sibling',
  'friend',
  'partner',
  'relative',
  'guardian',
  'caregiver',
  'neighbor',
  'colleague',
  'other'
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  relationship contact_relationship NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  alternate_phone_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  priority INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_emergency_contacts_user_profile
    FOREIGN KEY (user_profile_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_emergency_contacts_user_profile_id ON emergency_contacts(user_profile_id);
CREATE INDEX idx_emergency_contacts_phone_number ON emergency_contacts(phone_number);
CREATE INDEX idx_emergency_contacts_is_primary ON emergency_contacts(is_primary);
CREATE INDEX idx_emergency_contacts_priority ON emergency_contacts(priority);
CREATE INDEX idx_emergency_contacts_created_at ON emergency_contacts(created_at);
CREATE INDEX idx_emergency_contacts_deleted_at ON emergency_contacts(deleted_at);

-- Ensure only one primary contact per user
CREATE UNIQUE INDEX idx_emergency_contacts_one_primary_per_user
  ON emergency_contacts(user_profile_id)
  WHERE is_primary = TRUE AND deleted_at IS NULL;

-- Comments
COMMENT ON TABLE emergency_contacts IS 'Emergency contact information for user profiles';
COMMENT ON COLUMN emergency_contacts.user_profile_id IS 'References user_profiles.id';
COMMENT ON COLUMN emergency_contacts.is_primary IS 'Indicates primary emergency contact';
COMMENT ON COLUMN emergency_contacts.priority IS 'Contact priority order (1 = highest)';
COMMENT ON COLUMN emergency_contacts.notes IS 'Additional notes about contact';
