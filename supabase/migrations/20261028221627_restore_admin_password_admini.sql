/*
# Restore admin password to "Admini"

1. Purpose
   - The admin password was changed in the app without being saved.
   - This migration sets the password of sk.janssen@gmail.com back to "Admini".

2. Changes
   - Updates the encrypted password of sk.janssen@gmail.com.

3. Security
   - Only the password hash of the existing admin account changes.
   - The admin should change the password to a personal one via "Mijn account" after logging in.
*/

UPDATE auth.users
SET
  encrypted_password = crypt('Admini', gen_salt('bf')),
  updated_at = now()
WHERE email = 'sk.janssen@gmail.com';
