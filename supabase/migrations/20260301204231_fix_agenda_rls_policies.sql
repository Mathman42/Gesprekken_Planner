/*
  # Fix RLS Policies for Teacher Agendas

  ## Changes
  This migration fixes the Row Level Security policies for the teacher_agendas table.
  The issue was that policies were trying to access the auth.users table which caused
  permission errors.

  ## Solution
  - Remove policies that reference auth.users table
  - Simplify teacher policies to only check the teachers table
  - Ensure teachers can view/manage their own agendas
  - Keep public policy for active agendas

  ## Security
  - Teachers can only access their own agendas
  - Public users can view active, open agendas for booking
  - All policies remain restrictive and secure
*/

-- Drop existing policies that reference auth.users
DROP POLICY IF EXISTS "Admins can view all agendas" ON teacher_agendas;
DROP POLICY IF EXISTS "Admins can update all agendas" ON teacher_agendas;

-- Drop and recreate teacher policies with simplified checks
DROP POLICY IF EXISTS "Teachers can view own agendas" ON teacher_agendas;
DROP POLICY IF EXISTS "Teachers can create own agendas" ON teacher_agendas;
DROP POLICY IF EXISTS "Teachers can update own agendas" ON teacher_agendas;
DROP POLICY IF EXISTS "Teachers can delete own draft agendas" ON teacher_agendas;

-- Teachers can view their own agendas
CREATE POLICY "Teachers can view own agendas"
  ON teacher_agendas FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Teachers can create their own agendas
CREATE POLICY "Teachers can create own agendas"
  ON teacher_agendas FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Teachers can update their own agendas
CREATE POLICY "Teachers can update own agendas"
  ON teacher_agendas FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Teachers can delete their own draft agendas only
CREATE POLICY "Teachers can delete own draft agendas"
  ON teacher_agendas FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers
      WHERE email = auth.jwt()->>'email'
    )
    AND status = 'draft'
  );
