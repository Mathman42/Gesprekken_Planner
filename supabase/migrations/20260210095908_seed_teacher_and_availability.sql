/*
  # Seed Data voor Docent en Beschikbaarheid

  1. Docent Account
    - Email: s.janssen@kempenhorst.nl
    - Naam: S. Janssen
    - Wachtwoord: *D0cent* (wordt via Supabase Auth aangemaakt)

  2. Beschikbaarheid
    - Dinsdag 3 maart 2026: 08:00 - 19:00
    - Donderdag 5 maart 2026: 12:00 - 17:00

  Note: Het wachtwoord moet via de applicatie of Supabase Auth API worden ingesteld
*/

-- Insert docent in teachers tabel
INSERT INTO teachers (email, name)
VALUES ('s.janssen@kempenhorst.nl', 'S. Janssen')
ON CONFLICT (email) DO NOTHING;

-- Haal de teacher_id op en voeg beschikbaarheid toe
DO $$
DECLARE
  teacher_uuid uuid;
BEGIN
  SELECT id INTO teacher_uuid FROM teachers WHERE email = 's.janssen@kempenhorst.nl';
  
  IF teacher_uuid IS NOT NULL THEN
    -- Voeg dinsdag 3 maart 2026 beschikbaarheid toe (8:00 - 19:00)
    INSERT INTO teacher_availability (teacher_id, date, start_time, end_time, is_available)
    VALUES (teacher_uuid, '2026-03-03', '08:00:00', '19:00:00', true)
    ON CONFLICT DO NOTHING;
    
    -- Voeg donderdag 5 maart 2026 beschikbaarheid toe (12:00 - 17:00)
    INSERT INTO teacher_availability (teacher_id, date, start_time, end_time, is_available)
    VALUES (teacher_uuid, '2026-03-05', '12:00:00', '17:00:00', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;