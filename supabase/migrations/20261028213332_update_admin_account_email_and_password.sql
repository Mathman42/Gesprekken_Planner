/*
# Update admin account email and password

1. Purpose
   - Verwijdert het oude admin-account (admin@kempenhorst.nl) uit auth.users
   - Het nieuwe admin-account (sk.janssen@gmail.com) bestaat al in auth.users
   - Stelt het wachtwoord van het nieuwe admin-account in op *Admini*
   - De admin kan dit wachtwoord later zelf wijzigen

2. Changes
   - DELETE het oude admin-gebruiker uit auth.users (admin@kempenhorst.nl)
   - UPDATE het wachtwoord van sk.janssen@gmail.com naar *Admini*
   - Beide accounts zijn bevestigd (email_confirmed_at staat ingesteld)

3. Security
   - Het oude admin-account wordt verwijderd om misbruik te voorkomen
   - Het nieuwe wachtwoord is tijdelijk; de admin moet het wijzigen na eerste login
*/

-- Verwijder het oude admin-account
DELETE FROM auth.users WHERE email = 'admin@kempenhorst.nl';

-- Update het wachtwoord van het nieuwe admin-account
UPDATE auth.users
SET
  encrypted_password = crypt('*Admini*', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'sk.janssen@gmail.com';