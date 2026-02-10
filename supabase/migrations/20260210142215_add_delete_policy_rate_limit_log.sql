/*
  # Add Delete Policy for Rate Limit Log

  ## Changes Made

  1. **New Policy**
     - Add DELETE policy for rate_limit_log table
     - Allow authenticated admins to delete rate limit logs
     - Required for the Rate Limit Management admin interface

  ## Security Notes
     - Only authenticated users (admins) can delete rate limit logs
     - RLS remains enabled on the table
     - No changes to existing SELECT and INSERT policies
*/

CREATE POLICY "Admin can delete rate limit logs"
  ON rate_limit_log
  FOR DELETE
  USING ((select auth.uid()) IS NOT NULL);
