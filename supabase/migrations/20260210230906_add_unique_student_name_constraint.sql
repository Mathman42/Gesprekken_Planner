/*
  # Add unique constraint for student names
  
  1. Changes
    - Add case-insensitive unique constraint on student_name in teacher_bookings table
    - Ensures only one booking per student name (regardless of case)
    - Trims whitespace and normalizes student names
  
  2. Security
    - No changes to RLS policies
  
  3. Notes
    - This is a trust-based system
    - Multiple email addresses are allowed
    - Only one booking per student name is enforced at database level
*/

-- Create a unique index on lowercase, trimmed student_name
-- This prevents duplicate bookings for the same student (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_name 
ON teacher_bookings (LOWER(TRIM(student_name)));