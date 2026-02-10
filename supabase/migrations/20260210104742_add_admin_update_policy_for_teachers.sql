/*
  # Add Admin UPDATE Policy for Teachers

  1. Changes
    - Add UPDATE policy for teachers table so admins can update any teacher's data
    - This complements the existing teacher self-update policy
  
  2. Security
    - Policy verifies that the user is an admin by checking if their email is 'admin@kempenhorst.nl'
    - Admins can update any teacher record (name, email, password, etc.)
    - Teachers can still update their own data via the existing policy
*/

-- Policy voor admin om alle docenten te kunnen bijwerken
CREATE POLICY "Admin can update all teachers"
  ON teachers FOR UPDATE
  TO authenticated
  USING (
    auth.jwt()->>'email' = 'admin@kempenhorst.nl'
  )
  WITH CHECK (
    auth.jwt()->>'email' = 'admin@kempenhorst.nl'
  );