/*
  # Add parent password change on first login setting

  1. Changes
    - Adds a new setting `parent_password_must_change_on_first_login` to control whether parents must change their password upon first login
    - Default value: false (no forced password change required)
    
  2. Purpose
    - Provides admins with a configurable option to enforce password changes for parents on their first login
    - Only affects newly created parent accounts, not existing ones
    
  3. Security
    - No RLS changes needed as settings table already has proper policies
    - Setting is controlled by admins only
*/

-- Insert the new setting with default value false (no forced password change)
INSERT INTO settings (key, value, updated_at)
VALUES ('parent_password_must_change_on_first_login', 'false'::jsonb, now())
ON CONFLICT (key) DO NOTHING;