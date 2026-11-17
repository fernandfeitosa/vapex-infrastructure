-- Add refresh_token to users table for Google Drive offline access
ALTER TABLE users
ADD COLUMN IF NOT EXISTS refresh_token TEXT;
