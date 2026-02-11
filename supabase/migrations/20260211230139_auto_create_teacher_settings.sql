/*
  # Auto-create Teacher Settings on Teacher Creation

  1. Changes
    - Create trigger function to automatically insert teacher_settings when a new teacher is created
    - Create trigger that fires after teacher insert
    - Backfill any existing teachers that don't have settings yet

  2. Default Values
    - slot_duration: 15 minutes (gespreksduur)
    - buffer_time: 5 minutes (buffertijd)

  3. Purpose
    - Ensures every teacher always has settings configured
    - Prevents error message "Docent instellingen niet gevonden"
    - Teachers can start adding availability immediately after account creation
*/

-- Create function to automatically create teacher settings
CREATE OR REPLACE FUNCTION create_teacher_settings_for_new_teacher()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO teacher_settings (teacher_id, slot_duration, buffer_time)
  VALUES (NEW.id, 15, 5)
  ON CONFLICT (teacher_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new teacher is inserted
DROP TRIGGER IF EXISTS auto_create_teacher_settings ON teachers;
CREATE TRIGGER auto_create_teacher_settings
  AFTER INSERT ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION create_teacher_settings_for_new_teacher();

-- Backfill any existing teachers that don't have settings
INSERT INTO teacher_settings (teacher_id, slot_duration, buffer_time)
SELECT t.id, 15, 5
FROM teachers t
LEFT JOIN teacher_settings ts ON t.id = ts.teacher_id
WHERE ts.id IS NULL
ON CONFLICT (teacher_id) DO NOTHING;
