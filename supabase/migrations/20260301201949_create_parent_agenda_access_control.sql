/*
  # Create Parent-Agenda Access Control System

  1. New Tables
    - `parent_agenda_access`
      - Links parents to specific agendas
      - Allows teachers to control which parents can book which agendas
      - `id` (uuid, primary key)
      - `parent_id` (uuid, FK to parents)
      - `agenda_id` (uuid, FK to teacher_agendas)
      - `teacher_id` (uuid, FK to teachers)
      - `granted_at` (timestamptz)

  2. Security
    - Enable RLS on parent_agenda_access table
    - Teachers can manage access for their own agendas
    - Parents can view their own access grants
    - Public can check if a parent has access to an agenda (for booking validation)

  3. Indexes
    - Index on (parent_id, agenda_id) for fast access checks
    - Index on (teacher_id) for teacher management views
*/

CREATE TABLE IF NOT EXISTS parent_agenda_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  agenda_id uuid NOT NULL REFERENCES teacher_agendas(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, agenda_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parent_agenda_access_parent_agenda 
  ON parent_agenda_access(parent_id, agenda_id);
CREATE INDEX IF NOT EXISTS idx_parent_agenda_access_teacher 
  ON parent_agenda_access(teacher_id);
CREATE INDEX IF NOT EXISTS idx_parent_agenda_access_agenda 
  ON parent_agenda_access(agenda_id);

-- Enable RLS
ALTER TABLE parent_agenda_access ENABLE ROW LEVEL SECURITY;

-- Teachers can view access grants for their own agendas
CREATE POLICY "Teachers can view own agenda access grants"
  ON parent_agenda_access
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

-- Teachers can create access grants for their own agendas
CREATE POLICY "Teachers can grant access to own agendas"
  ON parent_agenda_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

-- Teachers can revoke access grants for their own agendas
CREATE POLICY "Teachers can revoke access from own agendas"
  ON parent_agenda_access
  FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

-- Parents can view their own access grants
CREATE POLICY "Parents can view own access grants"
  ON parent_agenda_access
  FOR SELECT
  TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE email = auth.email()
    )
  );

-- Public access for booking validation
CREATE POLICY "Public can check parent agenda access"
  ON parent_agenda_access
  FOR SELECT
  TO public
  USING (true);
