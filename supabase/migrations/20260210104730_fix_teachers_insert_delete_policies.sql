/*
  # Fix Teachers Table RLS Policies

  1. Changes
    - Add INSERT policy for teachers table so admins can add new teachers
    - Add DELETE policy for teachers table so admins can remove teachers
  
  2. Security
    - Both policies verify that the user is an admin by checking if their email is 'admin@kempenhorst.nl'
    - Only the authenticated admin user can insert or delete teacher records
    
  3. Notes
    - This uses email-based admin detection which matches the current authentication setup
    - If multiple admins are needed in the future, consider using user metadata or a separate admins table
*/

-- Policy voor admin om docenten toe te voegen
CREATE POLICY "Admin can insert teachers"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'email' = 'admin@kempenhorst.nl'
  );

-- Policy voor admin om docenten te verwijderen
CREATE POLICY "Admin can delete teachers"
  ON teachers FOR DELETE
  TO authenticated
  USING (
    auth.jwt()->>'email' = 'admin@kempenhorst.nl'
  );