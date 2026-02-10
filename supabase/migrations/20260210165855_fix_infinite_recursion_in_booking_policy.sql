/*
  # Fix infinite recursion in booking policy

  1. Problem
    - The INSERT policy on teacher_bookings was checking if a slot is already booked
    - This caused infinite recursion because the policy queried the same table it was protecting
    
  2. Solution
    - Remove the recursive check from the policy
    - Rely on the UNIQUE constraint on teacher_time_slot_id to prevent double bookings
    - The database will return a unique constraint violation error instead of allowing duplicates
    
  3. Changes
    - Drop the problematic "Anyone can create bookings" policy
    - Create a new simplified policy that only checks if the slot exists and is not blocked
    - The UNIQUE constraint on teacher_time_slot_id handles double-booking prevention
    
  4. Security
    - Public users can create bookings (needed for parent booking flow)
    - Validation ensures bookings are only for valid, available time slots
    - Database constraint prevents double bookings at the database level
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Anyone can create bookings" ON teacher_bookings;

-- Create simplified policy without recursion
CREATE POLICY "Public can create bookings for available slots"
  ON teacher_bookings
  FOR INSERT
  TO public
  WITH CHECK (
    -- Only check that the time slot exists and is not blocked
    -- The UNIQUE constraint on teacher_time_slot_id prevents double bookings
    EXISTS (
      SELECT 1 
      FROM teacher_time_slots 
      WHERE id = teacher_time_slot_id 
      AND is_blocked = false
    )
  );
