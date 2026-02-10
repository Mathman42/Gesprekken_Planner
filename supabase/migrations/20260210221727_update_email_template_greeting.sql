/*
  # Update Email Template Greeting

  1. Changes
    - Updates the default email template greeting from "Beste [naam-ouder]," to "Beste ouder/verzorger,"
    - This affects all teacher_settings records that still use the old default template

  2. Notes
    - Only updates templates that exactly match the old default template
    - Teachers who customized their template will keep their custom version
    - New teachers will get the updated greeting in their default template
*/

-- Update existing templates that still use the old greeting
UPDATE teacher_settings
SET invitation_email_template = 'Onderwerp: Uitnodiging voortgangsgesprek

Beste ouder/verzorger,

U bent uitgenodigd om een voortgangsgesprek in te plannen.
Klik op de link hieronder om een datum en tijd te kiezen.

Inloggen kan met:

Gebruikersnaam: [email-ouder]
Wachtwoord: [wachtwoord]

Link: [login-link]

Met vriendelijke groet,
[naam-docent]'
WHERE invitation_email_template = 'Onderwerp: Uitnodiging voortgangsgesprek

Beste [naam-ouder],

U bent uitgenodigd om een voortgangsgesprek in te plannen.
Klik op de link hieronder om een datum en tijd te kiezen.

Inloggen kan met:

Gebruikersnaam: [email-ouder]
Wachtwoord: [wachtwoord]

Link: [login-link]

Met vriendelijke groet,
[naam-docent]';
