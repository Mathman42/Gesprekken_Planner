/*
  # Fix RLS policies for parent bookings

  1. Changes
    - Drop existing restrictive INSERT policy for bookings
    - Add new policy that allows anonymous users to create bookings
    - Keep security by validating that the time slot exists and is available
    
  2. Security
    - Anonymous users can create bookings (needed because parents don't use Supabase auth)
    - Validation ensures bookings are only made for valid, available time slots
    - Parents can still only view/delete their own bookings when authenticated
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Parents can create own bookings" ON teacher_bookings;

-- Allow anyone to create bookings (needed for parent booking flow)
-- Security is maintained by validating the time slot exists and is not blocked
CREATE POLICY "Anyone can create bookings"
  ON teacher_bookings
  FOR INSERT
  TO public
  WITH CHECK (
    -- Ensure the time slot exists and is not blocked
    EXISTS (
      SELECT 1 
      FROM teacher_time_slots 
      WHERE id = teacher_time_slot_id 
      AND is_blocked = false
    )
    -- And ensure the slot is not already booked
    AND NOT EXISTS (
      SELECT 1 
      FROM teacher_bookings 
      WHERE teacher_time_slot_id = teacher_bookings.teacher_time_slot_id
    )
  );
