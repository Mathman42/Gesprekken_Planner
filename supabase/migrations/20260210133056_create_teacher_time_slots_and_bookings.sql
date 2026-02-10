/*
  # Teacher Time Slots and Bookings System

  1. New Tables
    - `teacher_time_slots`
      - `id` (uuid, primary key) - Unique identifier for time slot
      - `teacher_availability_id` (uuid, foreign key) - Reference to parent availability period
      - `teacher_id` (uuid, foreign key) - Reference to teacher (for faster queries)
      - `date` (date) - Date of the time slot
      - `start_time` (time) - Start time of the slot
      - `end_time` (time) - End time of the slot
      - `is_blocked` (boolean) - Whether teacher has blocked this slot
      - `created_at` (timestamptz) - Creation timestamp
    
    - `teacher_bookings`
      - `id` (uuid, primary key) - Unique identifier for booking
      - `teacher_time_slot_id` (uuid, foreign key, unique) - Reference to booked time slot (one booking per slot)
      - `teacher_id` (uuid, foreign key) - Reference to teacher
      - `parent_id` (uuid, foreign key, nullable) - Reference to parent user in auth.users
      - `parent_email` (text) - Email of parent who booked
      - `student_name` (text) - Name of the student
      - `booking_ip` (text, nullable) - IP address for logging
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Teachers can view and manage their own slots
    - Parents can view available slots and create bookings
    - Authenticated users can view slot availability
    
  3. Performance
    - Indexes on teacher_id, date, and teacher_availability_id for fast queries
    - Unique constraint on teacher_time_slot_id in bookings to prevent double-booking
*/

-- Create teacher_time_slots table
CREATE TABLE IF NOT EXISTS teacher_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_availability_id uuid REFERENCES teacher_availability(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create teacher_bookings table
CREATE TABLE IF NOT EXISTS teacher_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_time_slot_id uuid REFERENCES teacher_time_slots(id) ON DELETE CASCADE NOT NULL UNIQUE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_email text NOT NULL,
  student_name text NOT NULL,
  booking_ip text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE teacher_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_bookings ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_time_slots
CREATE POLICY "Authenticated users can view time slots"
  ON teacher_time_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can insert own time slots"
  ON teacher_time_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_time_slots.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Teachers can update own time slots"
  ON teacher_time_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_time_slots.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_time_slots.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Teachers can delete own time slots"
  ON teacher_time_slots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_time_slots.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Policies for teacher_bookings
CREATE POLICY "Authenticated users can view bookings"
  ON teacher_bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Parents can create own bookings"
  ON teacher_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = parent_email);

CREATE POLICY "Parents can delete own bookings"
  ON teacher_bookings FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'email' = parent_email);

CREATE POLICY "Teachers can view own bookings"
  ON teacher_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_bookings.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_teacher_id ON teacher_time_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_date ON teacher_time_slots(date);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_availability_id ON teacher_time_slots(teacher_availability_id);
CREATE INDEX IF NOT EXISTS idx_teacher_bookings_teacher_id ON teacher_bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_bookings_parent_email ON teacher_bookings(parent_email);
CREATE INDEX IF NOT EXISTS idx_teacher_bookings_slot_id ON teacher_bookings(teacher_time_slot_id);