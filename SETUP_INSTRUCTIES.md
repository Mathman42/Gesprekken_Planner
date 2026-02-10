# Setup Instructies

## Stap 1: Admin Account Aanmaken

1. Ga naar `/setup` in je browser
2. Het formulier is al vooringevuld met:
   - Email: `sk.janssen@gmail.com`
   - Wachtwoord: `*Adm1n*`
3. Klik op "Admin Account Aanmaken"
4. Je wordt automatisch ingelogd

## Stap 2: Docent Account Aanmaken

Het docent account moet handmatig worden aangemaakt in Supabase Auth:

### Via Supabase Dashboard:

1. Ga naar je Supabase project dashboard
2. Navigeer naar "Authentication" > "Users"
3. Klik op "Add User"
4. Vul de volgende gegevens in:
   - Email: `s.janssen@kempenhorst.nl`
   - Password: `*D0cent*`
   - Email Confirm: ✓ (vink aan)
5. Klik op "Create User"

Het docent profiel en beschikbaarheidsdagen zijn al aangemaakt in de database:
- Dinsdag 3 maart 2026: 08:00 - 19:00
- Donderdag 5 maart 2026: 12:00 - 17:00

## Stap 3: Inloggen

### Als Admin:
- Ga naar de homepage en klik op "Admin"
- Log in met `sk.janssen@gmail.com` en wachtwoord `*Adm1n*`

### Als Docent:
- Ga naar de homepage en klik op "Docent"
- Log in met `s.janssen@kempenhorst.nl` en wachtwoord `*D0cent*`

## Wachtwoord Wijzigen

### Admin:
Na het inloggen kun je je wachtwoord wijzigen via:
1. Navigeer naar "Basisinstellingen" in het admin dashboard
2. Scroll naar de sectie "Wachtwoord Wijzigen"
3. Vul het nieuwe wachtwoord in en bevestig
4. Klik op "Wachtwoord Wijzigen"

### Docent:
Voor nu is er geen wachtwoord wijzigingsfunctionaliteit in het docent dashboard. Dit kan later worden toegevoegd indien gewenst.

## Overzicht Rollen

Het systeem heeft drie rollen:

1. **Ouder/Verzorger**: Kan gesprekken inplannen via magic link
2. **Docent**: Kan beschikbaarheid beheren en zien welke tijden geboekt zijn
3. **Admin**: Heeft volledige toegang tot alle functionaliteiten

## Database Structuur

### Teachers Tabel:
- `id`: UUID (primary key)
- `email`: Email adres voor login
- `name`: Naam van de docent
- `created_at`: Aanmaak timestamp

### Teacher Availability Tabel:
- `id`: UUID (primary key)
- `teacher_id`: Referentie naar docent
- `date`: Datum van beschikbaarheid
- `start_time`: Starttijd
- `end_time`: Eindtijd
- `is_available`: Of deze tijd beschikbaar is
- `created_at`: Aanmaak timestamp
