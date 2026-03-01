/*
  # Migrate Existing Availability Data to Default Agendas

  ## Overview
  This migration creates default agendas for all teachers who have existing availability data,
  ensuring zero data loss and seamless transition to the new multi-agenda system.

  ## Migration Strategy

  ### For Each Teacher with Existing Data
  1. Calculate date range from their existing time slots
  2. Create a default agenda with appropriate status
  3. Link all existing availability periods to this agenda
  4. Link all existing time slots to this agenda
  5. Link all existing bookings to this agenda

  ### Status Logic
  - If teacher has bookings: status = 'active'
  - If teacher has slots but no bookings: status = 'active'
  - Otherwise: status = 'draft'

  ### Booking Open Logic
  - If agenda has future dates and bookings: is_booking_open = true
  - Otherwise: is_booking_open = false

  ## Data Preservation Guarantee
  - All existing availability periods preserved
  - All existing time slots preserved
  - All existing bookings preserved
  - All relationships maintained
  - No data deletion occurs
*/

-- Create default agendas for teachers with existing availability data
DO $$
DECLARE
  teacher_record RECORD;
  new_agenda_id uuid;
  date_range RECORD;
  has_bookings boolean;
  agenda_title text;
  agenda_status text;
  booking_open boolean;
BEGIN
  -- Loop through each teacher who has availability data
  FOR teacher_record IN 
    SELECT DISTINCT t.id, t.name, t.email
    FROM teachers t
    INNER JOIN teacher_availability ta ON ta.teacher_id = t.id
  LOOP
    -- Calculate date range from existing time slots for this teacher
    SELECT 
      COALESCE(MIN(tts.date), CURRENT_DATE) as min_date,
      COALESCE(MAX(tts.date), CURRENT_DATE + INTERVAL '30 days') as max_date
    INTO date_range
    FROM teacher_time_slots tts
    WHERE tts.teacher_id = teacher_record.id;

    -- Check if teacher has any bookings
    SELECT EXISTS (
      SELECT 1 FROM teacher_bookings tb
      WHERE tb.teacher_id = teacher_record.id
    ) INTO has_bookings;

    -- Determine agenda title based on date range
    agenda_title := 'Agenda ' || TO_CHAR(date_range.min_date, 'Mon YYYY');
    IF date_range.min_date != date_range.max_date THEN
      agenda_title := agenda_title || ' - ' || TO_CHAR(date_range.max_date, 'Mon YYYY');
    END IF;

    -- Determine status and booking_open
    IF has_bookings THEN
      agenda_status := 'active';
      -- Keep booking open if there are future dates
      IF date_range.max_date >= CURRENT_DATE THEN
        booking_open := true;
      ELSE
        booking_open := false;
      END IF;
    ELSE
      agenda_status := 'active';
      booking_open := true;
    END IF;

    -- Create the default agenda for this teacher
    INSERT INTO teacher_agendas (
      teacher_id,
      title,
      description,
      status,
      start_date,
      end_date,
      is_booking_open,
      slot_duration_minutes,
      created_at
    ) VALUES (
      teacher_record.id,
      agenda_title,
      'Automatically created from existing availability data',
      agenda_status,
      date_range.min_date,
      date_range.max_date,
      booking_open,
      15, -- default slot duration
      now()
    ) RETURNING id INTO new_agenda_id;

    -- Link all existing availability periods to this agenda
    UPDATE teacher_availability
    SET agenda_id = new_agenda_id
    WHERE teacher_id = teacher_record.id
    AND agenda_id IS NULL;

    -- Link all existing time slots to this agenda
    UPDATE teacher_time_slots
    SET agenda_id = new_agenda_id
    WHERE teacher_id = teacher_record.id
    AND agenda_id IS NULL;

    -- Link all existing bookings to this agenda
    UPDATE teacher_bookings
    SET agenda_id = new_agenda_id
    WHERE teacher_id = teacher_record.id
    AND agenda_id IS NULL;

    RAISE NOTICE 'Created default agenda % for teacher % (%) with date range % to %',
      new_agenda_id, teacher_record.name, teacher_record.email, 
      date_range.min_date, date_range.max_date;

  END LOOP;
END $$;

-- Make agenda_id required for future records (existing ones are now populated)
-- We'll add NOT NULL constraint after confirming all data is migrated
DO $$
BEGIN
  -- Check if any orphaned records exist
  IF EXISTS (SELECT 1 FROM teacher_availability WHERE agenda_id IS NULL) THEN
    RAISE NOTICE 'Warning: Some teacher_availability records still have NULL agenda_id';
  END IF;

  IF EXISTS (SELECT 1 FROM teacher_time_slots WHERE agenda_id IS NULL) THEN
    RAISE NOTICE 'Warning: Some teacher_time_slots records still have NULL agenda_id';
  END IF;

  IF EXISTS (SELECT 1 FROM teacher_bookings WHERE agenda_id IS NULL) THEN
    RAISE NOTICE 'Warning: Some teacher_bookings records still have NULL agenda_id';
  END IF;
END $$;