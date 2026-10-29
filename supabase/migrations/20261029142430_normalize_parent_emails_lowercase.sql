/*
# Normaliseer ouder-e-mailadressen naar kleine letters

1. Wijzigingen
- Bestaande e-mailadressen van ouders worden omgezet naar kleine letters en spaties aan begin en eind worden verwijderd.
- Er komt een unieke index op het kleine-letter-adres, zodat twee accounts die alleen in hoofdletters verschillen niet meer kunnen bestaan.

2. Beveiliging
- Geen wijzigingen aan rechten of RLS-regels.

3. Belangrijk
- De update raakt alleen de kolom met het e-mailadres van de ouder; wachtwoorden en gesprekken blijven ongewijzigd.
- Het script is veilig om opnieuw uit te voeren.
*/

UPDATE parents
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS parents_email_lower_unique
  ON parents (lower(email));
