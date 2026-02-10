/*
  # Add Email Template and Magic Link Settings

  1. Changes to Tables
    - Add `invitation_email_template` column to `teacher_settings` table
      - Stores customizable email template per teacher
      - Allows placeholders like [naam-ouder], [email-ouder], etc.
    
    - Add `magic_link_enabled` setting to `settings` table
      - Allows admin to toggle magic link functionality on/off
      - Default value is true (enabled)
  
  2. Default Template
    - Provides a professional default template in Dutch
    - Includes all necessary placeholders for personalization
    
  3. Security
    - No changes to RLS policies needed
    - Uses existing security model
*/

-- Add invitation_email_template column to teacher_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_settings' AND column_name = 'invitation_email_template'
  ) THEN
    ALTER TABLE teacher_settings 
    ADD COLUMN invitation_email_template text;
  END IF;
END $$;

-- Set default template for all existing teachers
UPDATE teacher_settings
SET invitation_email_template = 'Onderwerp: Uitnodiging voortgangsgesprek

Beste [naam-ouder],

U bent uitgenodigd om een voortgangsgesprek in te plannen.
Klik op de link hieronder om een datum en tijd te kiezen.

Inloggen kan met:

Gebruikersnaam: [email-ouder]
Wachtwoord: [wachtwoord]

Link: [login-link]

Met vriendelijke groet,
[naam-docent]'
WHERE invitation_email_template IS NULL;

-- Add magic_link_enabled setting (value must be jsonb)
INSERT INTO settings (key, value, updated_at)
VALUES ('magic_link_enabled', 'true'::jsonb, now())
ON CONFLICT (key) DO NOTHING;