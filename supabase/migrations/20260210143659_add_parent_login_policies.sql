/*
  # Add RLS policies for anonymous parent login

  1. Changes
    - Add policy to allow anonymous users to read parent data (for login verification)
    - Add policy to allow anonymous users to update parent password (for password change after magic link)
    
  2. Security
    - Anonymous users can only SELECT parent records (needed for login)
    - Anonymous users can UPDATE parent records (needed for password changes via magic link)
    - These policies are necessary for the login flow to work
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view parents for login" ON parents;
DROP POLICY IF EXISTS "Anyone can update parents for password change" ON parents;

-- Allow anonymous users to view parent data (needed for login verification)
CREATE POLICY "Anyone can view parents for login"
  ON parents
  FOR SELECT
  TO public
  USING (true);

-- Allow anonymous users to update parent password (needed for password changes)
CREATE POLICY "Anyone can update parents for password change"
  ON parents
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
