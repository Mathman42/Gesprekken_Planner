/*
  # Docent Beschikbaarheidssysteem

  1. Nieuwe Tabellen
    - `teachers`
      - `id` (uuid, primary key) - Unieke identificatie voor docent
      - `email` (text, unique) - Email adres voor login
      - `name` (text) - Volledige naam van de docent
      - `created_at` (timestamptz) - Aanmaak timestamp
    
    - `teacher_availability`
      - `id` (uuid, primary key) - Unieke identificatie voor beschikbaarheid
      - `teacher_id` (uuid, foreign key) - Referentie naar docent
      - `date` (date) - Datum van beschikbaarheid
      - `start_time` (time) - Starttijd van beschikbaarheid
      - `end_time` (time) - Eindtijd van beschikbaarheid
      - `is_available` (boolean) - Of deze tijd beschikbaar is
      - `created_at` (timestamptz) - Aanmaak timestamp

  2. Security
    - Enable RLS op beide tabellen
    - Authenticated users kunnen teacher data lezen
    - Alleen de teacher kan hun eigen availability beheren
*/

-- Maak teachers tabel
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Maak teacher_availability tabel
CREATE TABLE IF NOT EXISTS teacher_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;

-- Teachers policies - authenticated users kunnen teachers zien
CREATE POLICY "Authenticated users can view teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can update own data"
  ON teachers FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'email' = email)
  WITH CHECK (auth.jwt()->>'email' = email);

-- Teacher availability policies - authenticated users kunnen beschikbaarheid zien
CREATE POLICY "Authenticated users can view teacher availability"
  ON teacher_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can insert own availability"
  ON teacher_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_availability.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Teachers can update own availability"
  ON teacher_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_availability.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_availability.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Teachers can delete own availability"
  ON teacher_availability FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_availability.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Index voor snellere queries
CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher_id ON teacher_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_date ON teacher_availability(date);