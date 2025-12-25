-- Add is_active column to users table for soft delete functionality
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_users_is_active ON users(is_active);

-- Update existing users to be active
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

