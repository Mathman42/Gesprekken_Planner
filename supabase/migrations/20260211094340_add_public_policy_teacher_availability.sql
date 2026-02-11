/*
  # Add public SELECT policy for teacher_availability
  
  1. Problem
    - Parents cannot see available dates when trying to book
    - teacher_availability only has policy for authenticated users
    - After canceling a booking, parents can't see dates to rebook
    
  2. Solution
    - Add public SELECT policy for teacher_availability table
    - Allows anyone to see which dates teachers are available
    
  3. Changes
    - CREATE POLICY "Public can view teacher availability"
    
  4. Security
    - Read-only policy
    - Teacher availability is not sensitive (needed for public booking)
    - INSERT/UPDATE/DELETE still require authentication
*/

-- Add public SELECT policy for teacher_availability table
CREATE POLICY "Public can view teacher availability"
  ON teacher_availability
  FOR SELECT
  TO public
  USING (true);
