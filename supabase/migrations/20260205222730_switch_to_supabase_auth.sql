/*
  # Switch Admin Authentication to Supabase Auth
  
  ## Changes Made
  
  1. **Remove Custom Admin Table**
     - Drop the admin_users table since we'll use Supabase's built-in auth.users
     - Supabase Auth is more secure and handles password hashing automatically
  
  2. **Create Admin User in Supabase Auth**
     - Admin account will be created with email: admin@kempenhorst.nl
     - Password will be set via Supabase dashboard or auth API
     - This uses proper bcrypt hashing and security best practices
  
  ## Security Notes
     - Removes insecure plain-text password storage
     - Uses Supabase's built-in authentication which includes:
       - Proper password hashing (bcrypt)
       - Rate limiting
       - Session management
       - Security best practices
*/

-- Drop the custom admin_users table as we'll use Supabase Auth
DROP TABLE IF EXISTS admin_users CASCADE;