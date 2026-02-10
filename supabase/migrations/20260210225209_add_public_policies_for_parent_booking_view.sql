/*
  # Add public SELECT policies for parent booking view
  
  1. Problem
    - Parents use magic links and don't have Supabase auth sessions
    - teacher_bookings has public SELECT policy
    - But teachers and teacher_time_slots only allow authenticated users
    - This causes joins to fail, so parents can't see teacher name, date, and time
    
  2. Solution
    - Add public SELECT policies for teachers table
    - Add public SELECT policies for teacher_time_slots table
    - This allows the booking query joins to work for non-authenticated users
    
  3. Changes
    - CREATE POLICY "Public can view teachers" on teachers
    - CREATE POLICY "Public can view time slots" on teacher_time_slots
    
  4. Security
    - These are read-only policies
    - Teacher and time slot data is not sensitive (needed for booking system)
    - INSERT/UPDATE/DELETE still require authentication
*/

-- Add public SELECT policy for teachers table
CREATE POLICY "Public can view teachers"
  ON teachers
  FOR SELECT
  TO public
  USING (true);

-- Add public SELECT policy for teacher_time_slots table
CREATE POLICY "Public can view time slots"
  ON teacher_time_slots
  FOR SELECT
  TO public
  USING (true);
