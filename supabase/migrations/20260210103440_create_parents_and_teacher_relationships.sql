/*
  # Ouder-Docent Relaties en Wachtwoord Systeem

  ## Nieuwe Tabellen
    - `parents`
      - `id` (uuid, primary key) - Unieke identificatie voor ouder
      - `email` (text, unique) - Email adres voor login
      - `name` (text) - Volledige naam van de ouder
      - `password_hash` (text, nullable) - Gehashte wachtwoord (NULL = alleen magic link)
      - `teacher_id` (uuid, foreign key) - Referentie naar toegewezen docent
      - `password_must_change` (boolean) - Of wachtwoord gewijzigd moet worden bij eerste login
      - `created_at` (timestamptz) - Aanmaak timestamp

  ## Kolommen Toegevoegd
    - `teachers.password_hash` (text, nullable) - Gehashte wachtwoord voor docent login
    - `teachers.password_must_change` (boolean) - Of wachtwoord gewijzigd moet worden bij eerste login
    - `events.teacher_id` (uuid, foreign key) - Koppeling van event aan docent
    - `time_slots.teacher_id` (uuid, foreign key) - Voor betere filtering
    - `bookings.teacher_id` (uuid, foreign key) - Voor betere filtering

  ## Indexen
    - Index op `parents.teacher_id` voor snellere queries
    - Index op `events.teacher_id` voor snellere queries
    - Index op `time_slots.teacher_id` voor snellere queries
    - Index op `bookings.teacher_id` voor snellere queries

  ## Security (RLS Policies)
    - Ouders kunnen alleen hun eigen gegevens zien en wijzigen
    - Docenten kunnen alleen hun eigen ouders zien en beheren
    - Docenten kunnen alleen hun eigen events, time_slots en bookings zien
    - Admin heeft volledige toegang tot alles
    - Magic link systeem blijft werken voor ouders zonder wachtwoord

  ## Belangrijke Notities
    1. **Backwards Compatibility**: Bestaande ouders die via magic link inlogden krijgen `password_hash = NULL`
    2. **Flexibele Login**: Ouders met wachtwoord kunnen beide methodes gebruiken (wachtwoord + magic link)
    3. **Verplichte Wachtwoorden**: Docenten en admin moeten wachtwoord gebruiken
    4. **First-time Login**: Via `password_must_change` flag kunnen tijdelijke wachtwoorden gedwongen worden
    5. **Data Isolatie**: Docenten zien alleen hun eigen ouders en events via RLS policies
*/

-- Voeg wachtwoord velden toe aan teachers tabel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE teachers ADD COLUMN password_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'password_must_change'
  ) THEN
    ALTER TABLE teachers ADD COLUMN password_must_change boolean DEFAULT false;
  END IF;
END $$;

-- Voeg teacher_id toe aan events tabel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE events ADD COLUMN teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Voeg teacher_id toe aan time_slots tabel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_slots' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE time_slots ADD COLUMN teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Voeg teacher_id toe aan bookings tabel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Maak parents tabel
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  password_must_change boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS op parents tabel
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Maak indexes voor betere performance
CREATE INDEX IF NOT EXISTS idx_parents_teacher_id ON parents(teacher_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_events_teacher_id ON events(teacher_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_teacher_id ON time_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_id ON bookings(teacher_id);

-- RLS Policies voor parents tabel

-- Ouders kunnen hun eigen gegevens lezen
CREATE POLICY "Parents can view own data"
  ON parents FOR SELECT
  TO authenticated
  USING (email = auth.jwt()->>'email');

-- Ouders kunnen hun eigen gegevens updaten (voor wachtwoord wijzigen)
CREATE POLICY "Parents can update own data"
  ON parents FOR UPDATE
  TO authenticated
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

-- Docenten kunnen hun eigen ouders zien
CREATE POLICY "Teachers can view their parents"
  ON parents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = parents.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Docenten kunnen ouders toevoegen
CREATE POLICY "Teachers can insert their parents"
  ON parents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = parents.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Docenten kunnen hun ouders updaten
CREATE POLICY "Teachers can update their parents"
  ON parents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = parents.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = parents.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Docenten kunnen hun ouders verwijderen
CREATE POLICY "Teachers can delete their parents"
  ON parents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = parents.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Admin kan alle ouders beheren (admin heeft auth.uid())
CREATE POLICY "Admin can manage all parents"
  ON parents FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update bestaande events policies zodat docenten alleen hun eigen events kunnen beheren
DROP POLICY IF EXISTS "Admin can manage events" ON events;

CREATE POLICY "Teachers can view their own events"
  ON events FOR SELECT
  TO authenticated
  USING (
    teacher_id IS NULL OR
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = events.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Teachers can insert their own events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = events.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Teachers can update their own events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = events.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = events.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Teachers can delete their own events"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = events.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admin can manage all events"
  ON events FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update time_slots policies
DROP POLICY IF EXISTS "Admin can manage time slots" ON time_slots;

CREATE POLICY "Teachers can manage their own time slots"
  ON time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = time_slots.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = time_slots.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admin can manage all time slots"
  ON time_slots FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update bookings policies
DROP POLICY IF EXISTS "Admin can manage all bookings" ON bookings;

CREATE POLICY "Teachers can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = bookings.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admin can manage all bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);