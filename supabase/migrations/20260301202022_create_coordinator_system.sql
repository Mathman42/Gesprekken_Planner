/*
  # Create Student Coordinator System

  1. New Tables
    - `coordinators`
      - Stores coordinator accounts
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `created_at` (timestamptz)

    - `coordinator_teachers`
      - Links coordinators to teachers they can monitor
      - `id` (uuid, primary key)
      - `coordinator_id` (uuid, FK to coordinators)
      - `teacher_id` (uuid, FK to teachers)
      - `created_at` (timestamptz)

    - `coordinator_agenda_access`
      - Links coordinators to specific agendas they can view
      - `id` (uuid, primary key)
      - `coordinator_id` (uuid, FK to coordinators)
      - `agenda_id` (uuid, FK to teacher_agendas)
      - `teacher_id` (uuid, FK to teachers)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all coordinator tables
    - Coordinators can view their own record
    - Coordinators can view teachers/agendas they're linked to
    - Coordinators have READ-ONLY access to bookings and time slots
    - Teachers can manage coordinator access to their agendas
    - Admins can create and manage coordinators

  3. Indexes
    - Fast lookups for coordinator access checks
*/

-- Create coordinators table
CREATE TABLE IF NOT EXISTS coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create coordinator_teachers junction table
CREATE TABLE IF NOT EXISTS coordinator_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id uuid NOT NULL REFERENCES coordinators(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coordinator_id, teacher_id)
);

-- Create coordinator_agenda_access table
CREATE TABLE IF NOT EXISTS coordinator_agenda_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id uuid NOT NULL REFERENCES coordinators(id) ON DELETE CASCADE,
  agenda_id uuid NOT NULL REFERENCES teacher_agendas(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coordinator_id, agenda_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coordinator_teachers_coordinator 
  ON coordinator_teachers(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_teachers_teacher 
  ON coordinator_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_agenda_access_coordinator 
  ON coordinator_agenda_access(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_agenda_access_agenda 
  ON coordinator_agenda_access(agenda_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_agenda_access_teacher 
  ON coordinator_agenda_access(teacher_id);

-- Enable RLS
ALTER TABLE coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_agenda_access ENABLE ROW LEVEL SECURITY;

-- Coordinators RLS Policies
CREATE POLICY "Coordinators can view own record"
  ON coordinators
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

CREATE POLICY "Public can view coordinators for login"
  ON coordinators
  FOR SELECT
  TO public
  USING (true);

-- Coordinator-Teachers RLS Policies
CREATE POLICY "Coordinators can view their teacher links"
  ON coordinator_teachers
  FOR SELECT
  TO authenticated
  USING (
    coordinator_id IN (
      SELECT id FROM coordinators WHERE email = auth.email()
    )
  );

CREATE POLICY "Teachers can view coordinators linked to them"
  ON coordinator_teachers
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

CREATE POLICY "Teachers can add coordinators to themselves"
  ON coordinator_teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

CREATE POLICY "Teachers can remove coordinators from themselves"
  ON coordinator_teachers
  FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

-- Coordinator-Agenda Access RLS Policies
CREATE POLICY "Coordinators can view their agenda access"
  ON coordinator_agenda_access
  FOR SELECT
  TO authenticated
  USING (
    coordinator_id IN (
      SELECT id FROM coordinators WHERE email = auth.email()
    )
  );

CREATE POLICY "Teachers can view coordinators with agenda access"
  ON coordinator_agenda_access
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

CREATE POLICY "Teachers can grant agenda access to coordinators"
  ON coordinator_agenda_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

CREATE POLICY "Teachers can revoke agenda access from coordinators"
  ON coordinator_agenda_access
  FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE email = auth.email()
    )
  );

-- Grant coordinators READ-ONLY access to bookings and agendas
CREATE POLICY "Coordinators can view accessible agendas"
  ON teacher_agendas
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT agenda_id 
      FROM coordinator_agenda_access 
      WHERE coordinator_id IN (
        SELECT id FROM coordinators WHERE email = auth.email()
      )
    )
  );

CREATE POLICY "Coordinators can view bookings for accessible agendas"
  ON teacher_bookings
  FOR SELECT
  TO authenticated
  USING (
    agenda_id IN (
      SELECT agenda_id 
      FROM coordinator_agenda_access 
      WHERE coordinator_id IN (
        SELECT id FROM coordinators WHERE email = auth.email()
      )
    )
  );

CREATE POLICY "Coordinators can view time slots for accessible agendas"
  ON teacher_time_slots
  FOR SELECT
  TO authenticated
  USING (
    agenda_id IN (
      SELECT agenda_id 
      FROM coordinator_agenda_access 
      WHERE coordinator_id IN (
        SELECT id FROM coordinators WHERE email = auth.email()
      )
    )
  );
