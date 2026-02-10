/*
  # Remove password_hash from teachers table
  
  1. Purpose
    - Teachers are now managed via Supabase Auth
    - Passwords are stored in auth.users, not in teachers table
    - Clean up the schema to remove unused password_hash column
  
  2. Changes
    - Drop password_hash column from teachers table
    - Teacher IDs now correspond to auth.users IDs
*/

-- Remove password_hash column as it's no longer needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE teachers DROP COLUMN password_hash;
  END IF;
END $$;
