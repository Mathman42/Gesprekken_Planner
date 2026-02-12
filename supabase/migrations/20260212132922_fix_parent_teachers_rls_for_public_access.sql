/*
  # Fix Parent-Teachers RLS for Public Read Access

  1. Problem
    - Ouders gebruiken custom login (niet Supabase auth)
    - RLS policies op parent_teachers verwachten auth.jwt()->>'email'
    - Hierdoor kunnen ouders hun toegewezen docenten niet zien

  2. Changes
    - Drop bestaande SELECT policies
    - Maak nieuwe public SELECT policy voor parent_teachers
    - Docenten kunnen nog steeds alleen hun eigen relaties beheren (INSERT/DELETE)

  3. Security
    - parent_teachers bevat alleen relatie IDs (niet gevoelige data)
    - parents en teachers tabellen hebben eigen RLS bescherming
    - Alleen read-only access wordt public gemaakt
    - Write operations blijven beperkt tot authenticated teachers
*/

-- Drop oude SELECT policies
DROP POLICY IF EXISTS "Teachers can view own parent relationships" ON parent_teachers;
DROP POLICY IF EXISTS "Parents can view own teacher relationships" ON parent_teachers;

-- Maak nieuwe public SELECT policy (iedereen kan relaties zien)
CREATE POLICY "Anyone can view parent-teacher relationships"
  ON parent_teachers
  FOR SELECT
  TO public
  USING (true);
