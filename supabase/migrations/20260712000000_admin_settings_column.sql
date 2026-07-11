-- Add settings JSONB column to profiles for admin panel persistence
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Backfill existing profiles
UPDATE profiles SET settings = '{}' WHERE settings IS NULL;
