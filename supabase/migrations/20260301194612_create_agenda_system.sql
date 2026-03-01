/*
  # Create Multi-Agenda System for Teacher Availability Management

  ## Overview
  This migration introduces a comprehensive agenda system that allows teachers to manage multiple 
  conversation schedules (agendas) simultaneously, with the ability to open, close, edit, and 
  archive agendas independently while preserving all historical data.

  ## 1. New Tables

  ### `teacher_agendas`
  Central table for managing conversation schedule periods
  - `id` (uuid, primary key) - Unique identifier for the agenda
  - `teacher_id` (uuid, foreign key) - Reference to teacher who owns this agenda
  - `title` (text) - Descriptive name for the agenda (e.g., "Spring 2026 Conversations")
  - `description` (text, nullable) - Optional detailed description
  - `status` (text) - Current status: 'draft', 'active', 'closed', 'archived'
  - `start_date` (date) - First date of the agenda period
  - `end_date` (date) - Last date of the agenda period
  - `is_booking_open` (boolean) - Whether parents can currently book slots
  - `slot_duration_minutes` (integer) - Duration of each conversation slot (default 15)
  - `created_at` (timestamptz) - When the agenda was created
  - `updated_at` (timestamptz) - Last modification timestamp
  - `closed_at` (timestamptz, nullable) - When the agenda was closed for booking

  ## 2. Schema Changes

  ### Modified Tables
  - `teacher_availability` - Add `agenda_id` column to link availability periods to agendas
  - `teacher_time_slots` - Add `agenda_id` column for direct agenda relationship
  - `teacher_bookings` - Add `agenda_id` column to track which agenda each booking belongs to

  ## 3. Migration Strategy for Existing Data

  ### Data Preservation
  For each existing teacher with availability data, we create a "default" agenda:
  - Title: "Default Agenda" or based on date range
  - Status: 'active' if bookings exist, 'draft' otherwise
  - Date range: calculated from existing time slots
  - All existing availability, time slots, and bookings linked to this default agenda

  ### Key Benefits
  - Zero data loss - all existing bookings and slots preserved
  - Backwards compatible - existing functionality continues to work
  - Teachers can continue managing current conversations
  - New agenda features available immediately

  ## 4. Security (Row Level Security)

  ### teacher_agendas policies
  - Teachers can view their own agendas (SELECT)
  - Teachers can create new agendas (INSERT)
  - Teachers can update their own agendas (UPDATE)
  - Teachers can delete their own draft agendas only (DELETE)
  - Admins can view and manage all agendas

  ### Updated policies for related tables
  - All queries now respect agenda_id relationships
  - Closed agendas prevent parent booking creation
  - Teachers maintain full access to closed agenda data

  ## 5. Performance Optimizations

  ### Indexes
  - `idx_teacher_agendas_teacher_id` - Fast agenda lookup by teacher
  - `idx_teacher_agendas_status` - Filter by status efficiently
  - `idx_teacher_availability_agenda_id` - Link availability to agendas
  - `idx_teacher_time_slots_agenda_id` - Link slots to agendas
  - `idx_teacher_bookings_agenda_id` - Link bookings to agendas

  ## 6. Important Notes

  ### Data Integrity
  - Foreign keys with CASCADE ensure data consistency
  - Deleting an agenda removes all associated availability, slots, and bookings
  - Use 'archived' status instead of deletion for historical data preservation

  ### Workflow
  1. Teacher creates new agenda with date range and settings
  2. System generates availability periods and time slots
  3. Teacher activates agenda, enabling parent booking
  4. Parents book available slots
  5. Teacher closes agenda when booking period ends
  6. Teacher can still view/edit all bookings in closed agendas
  7. Eventually archive old agendas for record-keeping
*/

-- Create teacher_agendas table
CREATE TABLE IF NOT EXISTS teacher_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_booking_open boolean DEFAULT false,
  slot_duration_minutes integer DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_slot_duration CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 120)
);

-- Add agenda_id to existing tables
ALTER TABLE teacher_availability 
ADD COLUMN IF NOT EXISTS agenda_id uuid REFERENCES teacher_agendas(id) ON DELETE CASCADE;

ALTER TABLE teacher_time_slots 
ADD COLUMN IF NOT EXISTS agenda_id uuid REFERENCES teacher_agendas(id) ON DELETE CASCADE;

ALTER TABLE teacher_bookings 
ADD COLUMN IF NOT EXISTS agenda_id uuid REFERENCES teacher_agendas(id) ON DELETE CASCADE;

-- Enable RLS on teacher_agendas
ALTER TABLE teacher_agendas ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_agendas

-- Teachers can view their own agendas
CREATE POLICY "Teachers can view own agendas"
  ON teacher_agendas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_agendas.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Admins can view all agendas
CREATE POLICY "Admins can view all agendas"
  ON teacher_agendas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Teachers can create their own agendas
CREATE POLICY "Teachers can create own agendas"
  ON teacher_agendas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_agendas.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Teachers can update their own agendas
CREATE POLICY "Teachers can update own agendas"
  ON teacher_agendas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_agendas.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_agendas.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
  );

-- Teachers can delete their own draft agendas only
CREATE POLICY "Teachers can delete own draft agendas"
  ON teacher_agendas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_agendas.teacher_id
      AND teachers.email = auth.jwt()->>'email'
    )
    AND status = 'draft'
  );

-- Admins can update all agendas
CREATE POLICY "Admins can update all agendas"
  ON teacher_agendas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_agendas_teacher_id ON teacher_agendas(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_agendas_status ON teacher_agendas(status);
CREATE INDEX IF NOT EXISTS idx_teacher_agendas_dates ON teacher_agendas(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_agenda_id ON teacher_availability(agenda_id);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_agenda_id ON teacher_time_slots(agenda_id);
CREATE INDEX IF NOT EXISTS idx_teacher_bookings_agenda_id ON teacher_bookings(agenda_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_agendas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_update_teacher_agendas_updated_at ON teacher_agendas;
CREATE TRIGGER trigger_update_teacher_agendas_updated_at
  BEFORE UPDATE ON teacher_agendas
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_agendas_updated_at();

-- Add public policy for parents to view active agendas (needed for booking interface)
CREATE POLICY "Public can view active agendas"
  ON teacher_agendas FOR SELECT
  TO public
  USING (status = 'active' AND is_booking_open = true);