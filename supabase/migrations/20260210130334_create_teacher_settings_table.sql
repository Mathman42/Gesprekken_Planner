/*
  # Create Teacher Settings Table

  1. New Tables
    - `teacher_settings`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, foreign key to teachers table)
      - `slot_duration` (integer) - Duration of parent-teacher conversation in minutes (10, 15, or 20)
      - `buffer_time` (integer) - Buffer time between slots in minutes (0, 5, or 10)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `teacher_settings` table
    - Add policies for teachers to read and update their own settings
    - Add policy for admins to read all teacher settings

  3. Notes
    - Each teacher has their own configurable settings
    - Default values are set on first login
    - Settings can be different per teacher
*/

-- Create teacher_settings table
CREATE TABLE IF NOT EXISTS teacher_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  slot_duration integer NOT NULL DEFAULT 15 CHECK (slot_duration IN (10, 15, 20)),
  buffer_time integer NOT NULL DEFAULT 5 CHECK (buffer_time IN (0, 5, 10)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Enable RLS
ALTER TABLE teacher_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can read their own settings
CREATE POLICY "Teachers can read own settings"
  ON teacher_settings
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.jwt()->>'email'
    )
  );

-- Policy: Teachers can insert their own settings
CREATE POLICY "Teachers can insert own settings"
  ON teacher_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.jwt()->>'email'
    )
  );

-- Policy: Teachers can update their own settings
CREATE POLICY "Teachers can update own settings"
  ON teacher_settings
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.jwt()->>'email'
    )
  );

-- Policy: Admins can read all teacher settings
CREATE POLICY "Admins can read all teacher settings"
  ON teacher_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM settings 
      WHERE key = 'admin_email' 
      AND value::text = concat('"', auth.jwt()->>'email', '"')
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS teacher_settings_updated_at ON teacher_settings;
CREATE TRIGGER teacher_settings_updated_at
  BEFORE UPDATE ON teacher_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_settings_updated_at();

-- Create default settings for existing teachers
INSERT INTO teacher_settings (teacher_id, slot_duration, buffer_time)
SELECT id, 15, 5 FROM teachers
ON CONFLICT (teacher_id) DO NOTHING;