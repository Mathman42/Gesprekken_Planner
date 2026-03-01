/*
  # Fix Orphaned Availability Records

  1. Changes
    - Links existing teacher_availability records without agenda_id to their teacher's first active agenda
    - If no active agenda exists, links to the teacher's most recent agenda
    - Ensures all availability records are properly associated with an agenda

  2. Notes
    - This migration is idempotent and safe to run multiple times
    - Only updates records where agenda_id is NULL
*/

DO $$
DECLARE
  availability_record RECORD;
  target_agenda_id UUID;
BEGIN
  -- Loop through all availability records without an agenda_id
  FOR availability_record IN 
    SELECT id, teacher_id, date
    FROM teacher_availability
    WHERE agenda_id IS NULL
  LOOP
    -- Try to find an active agenda for this teacher
    SELECT id INTO target_agenda_id
    FROM teacher_agendas
    WHERE teacher_id = availability_record.teacher_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no active agenda, get the most recent one
    IF target_agenda_id IS NULL THEN
      SELECT id INTO target_agenda_id
      FROM teacher_agendas
      WHERE teacher_id = availability_record.teacher_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    -- Update the availability record if we found an agenda
    IF target_agenda_id IS NOT NULL THEN
      UPDATE teacher_availability
      SET agenda_id = target_agenda_id
      WHERE id = availability_record.id;
    END IF;
  END LOOP;
END $$;
