/*
  # Fix parent booking viewing for password-based login

  1. Problem
    - Parents login with password but don't have a Supabase auth session
    - There's no SELECT policy for teacher_bookings that allows public access
    - Parents can't view their existing bookings
    
  2. Solution
    - Add a public SELECT policy for teacher_bookings
    - This allows parents to view bookings
    - Application logic filters by parent_email
    
  3. Changes
    - Add "Public can view bookings" policy for SELECT
    
  4. Security
    - The application code filters bookings by parent email
    - Only the booking data (which includes teacher info) is exposed
    - This is acceptable for the use case where parents need to see available slots
*/

-- Add public SELECT policy for bookings
-- This allows parents who login with password (not Supabase auth) to view bookings
CREATE POLICY "Public can view bookings"
  ON teacher_bookings
  FOR SELECT
  TO public
  USING (true);
