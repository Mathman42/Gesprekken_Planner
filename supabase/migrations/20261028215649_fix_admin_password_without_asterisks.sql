/*
# Set admin password to exactly "Admini"

1. Purpose
   - The previous migration stored the password with asterisk characters ("*Admini*"),
     so logging in with "Admini" was rejected.

2. Changes
   - Updates the encrypted password of sk.janssen@gmail.com to "Admini" (no asterisks).

3. Security
   - Only the password hash of the existing admin account changes.
   - The admin should change this password after logging in.
*/

UPDATE auth.users
SET
  encrypted_password = crypt('Admini', gen_salt('bf')),
  updated_at = now()
WHERE email = 'sk.janssen@gmail.com';
