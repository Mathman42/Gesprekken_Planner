/*
  # Create Parent-Teachers Junction Table
  
  1. New Tables
    - `parent_teachers` - Junction table for many-to-many relationship between parents and teachers
      - `id` (uuid, primary key)
      - `parent_id` (uuid, foreign key to parents)
      - `teacher_id` (uuid, foreign key to teachers)
      - `created_at` (timestamp)
      - Unique constraint on (parent_id, teacher_id) combination
  
  2. Data Migration
    - Migrate all existing parent-teacher relationships from `parents.teacher_id` to the junction table
    - This preserves all existing relationships while enabling many-to-many support
  
  3. Teacher Settings
    - Create teacher_settings record for Bas Renders (b.renders@kempenhorst.nl)
    - Use slot_duration: 15 and buffer_time: 0 as specified
    - Copy email template from Stijn Janssen's settings
  
  4. Security
    - Enable RLS on parent_teachers table
    - Allow teachers to view their own parent relationships
    - Allow parents to view their own teacher relationships
    - Restrict insert/update/delete to authenticated teachers only
*/

-- Create parent_teachers junction table
CREATE TABLE IF NOT EXISTS parent_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, teacher_id)
);

-- Migrate existing relationships from parents.teacher_id to junction table
INSERT INTO parent_teachers (parent_id, teacher_id, created_at)
SELECT id, teacher_id, created_at
FROM parents
WHERE teacher_id IS NOT NULL
ON CONFLICT (parent_id, teacher_id) DO NOTHING;

-- Create teacher_settings for Bas Renders using the same template as Stijn Janssen
INSERT INTO teacher_settings (teacher_id, slot_duration, buffer_time, invitation_email_template)
SELECT 
  'b08fb4a8-a5a6-434c-9c87-1abf71b471e2'::uuid,
  15,
  0,
  invitation_email_template
FROM teacher_settings
WHERE teacher_id = 'eba5eec7-4619-4f37-b3a1-ee239fcc3638'::uuid
ON CONFLICT (teacher_id) DO UPDATE
SET 
  slot_duration = 15,
  buffer_time = 0,
  invitation_email_template = EXCLUDED.invitation_email_template,
  updated_at = now();

-- Enable RLS on parent_teachers table
ALTER TABLE parent_teachers ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own parent relationships
CREATE POLICY "Teachers can view own parent relationships"
  ON parent_teachers
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.jwt()->>'email'
    )
  );

-- Parents can view their own teacher relationships
CREATE POLICY "Parents can view own teacher relationships"
  ON parent_teachers
  FOR SELECT
  TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE email = auth.jwt()->>'email'
    )
  );

-- Teachers can insert parent relationships for themselves
CREATE POLICY "Teachers can create parent relationships"
  ON parent_teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.jwt()->>'email'
    )
  );

-- Teachers can delete their own parent relationships
CREATE POLICY "Teachers can delete own parent relationships"
  ON parent_teachers
  FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.jwt()->>'email'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_parent_teachers_parent_id ON parent_teachers(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_teachers_teacher_id ON parent_teachers(teacher_id);