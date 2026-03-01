/*
  # Add Booking Schedule to Agendas

  1. Changes
    - Add booking_open_date field for scheduled opening
    - Add booking_close_date field for scheduled closing
    - Add auto_schedule_enabled flag to enable/disable automatic scheduling
    - These fields allow teachers to schedule when parents can book appointments

  2. Notes
    - All fields are optional (nullable)
    - When auto_schedule_enabled is true, the system can automatically update is_booking_open
    - Dates include time (timestamptz) for precise scheduling
*/

DO $$
BEGIN
  -- Add booking_open_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_agendas' AND column_name = 'booking_open_date'
  ) THEN
    ALTER TABLE teacher_agendas ADD COLUMN booking_open_date timestamptz;
  END IF;

  -- Add booking_close_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_agendas' AND column_name = 'booking_close_date'
  ) THEN
    ALTER TABLE teacher_agendas ADD COLUMN booking_close_date timestamptz;
  END IF;

  -- Add auto_schedule_enabled if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_agendas' AND column_name = 'auto_schedule_enabled'
  ) THEN
    ALTER TABLE teacher_agendas ADD COLUMN auto_schedule_enabled boolean DEFAULT false;
  END IF;
END $$;
