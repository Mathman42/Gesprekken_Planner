# Kempenhorst College - Ouderavond Boeking Systeem

Een complete web applicatie voor het beheren en boeken van ouderavond gesprekstijden voor Kempenhorst College.

## Kenmerken

### Voor Ouders/Verzorgers
- ✉️ **Magic Link Authenticatie** - Eenvoudig inloggen via e-mail link (geen wachtwoord nodig)
- 📅 **Eenvoudig Tijdslot Kiezen** - Overzichtelijke kalender met beschikbare tijden
- ✅ **Direct Bevestiging** - Directe bevestiging na boeking
- 📱 **Mobiel Responsive** - Werkt perfect op alle apparaten
- 🔒 **Privacy First** - Ouders zien alleen beschikbaarheid, geen andere boekingen

### Voor Docenten/Beheerders
- 📊 **Dashboard met Overzicht** - Realtime statistieken en overzicht
- ➕ **Dag Toevoegen** - Snel nieuwe ouderavond dagen aanmaken met automatische tijdslot generatie
- ⚙️ **Basisinstellingen** - Configureer gespreksduur (10/15/20 min), buffertijd (0/5/10 min)
- 👥 **Boekingen Beheren** - Volledig overzicht, zoeken, filteren en exporteren (CSV)
- 🔐 **Boekingcontrole** - Globale aan/uit schakelaar voor boekingen
- 📋 **Activity Log (Logboek)** - Complete audit trail van alle acties
- 🎛️ **Tijdslot Beheer** - Individuele slots aan/uit zetten

### Technische Kenmerken
- 🔐 **Rate Limiting** - Bescherming tegen misbruik (3 requests per IP/uur, 5 per email/uur)
- 🛡️ **Row Level Security** - Volledige database beveiliging via Supabase RLS
- 📧 **Email Integratie** - Klaar voor productie email service integratie
- 🎨 **Kempenhorst Branding** - Volledig gebranded met school logo en kleuren
- ♿ **Toegankelijk** - WCAG compliant met keyboard navigatie

## Technologie Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom Magic Link systeem
- **Icons**: Lucide React

## Aan de Slag

### Admin Login Gegevens

**Email**: `admin@kempenhorst.nl`
**Wachtwoord**: `KempenhorstAdmin2024!`

⚠️ **BELANGRIJK**: Wijzig dit wachtwoord onmiddellijk na eerste login!

### Eerste Gebruik

1. **Login als Admin**
   - Ga naar de applicatie
   - Klik op "Docent"
   - Log in met bovenstaande gegevens

2. **Configureer Basisinstellingen**
   - Ga naar "Basisinstellingen"
   - Stel gespreksduur in (10/15/20 minuten)
   - Stel buffertijd in (0/5/10 minuten)
   - Schakel CAPTCHA in/uit (standaard UIT)
   - Schakel bevestigingsmail in/uit

3. **Voeg een Dag Toe**
   - Ga naar "Dag toevoegen"
   - Vul naam in (bijv. "Ouderavond December 2024")
   - Kies datum
   - Stel start en eindtijd in (max 23:00)
   - Klik "Dag Aanmaken"
   - Tijdslots worden automatisch gegenereerd op basis van uw instellingen

4. **Beheer Tijdslots**
   - In "Dag toevoegen" kunt u elke dag uitklappen
   - Schakel individuele tijdslots aan/uit met het groene/grijze icoon
   - Geblokkeerde slots kunnen niet geboekt worden door ouders
   - Geboekte slots tonen de naam van de student

5. **Open Boekingen**
   - Ga naar "Boekingen beheren"
   - Klik op de groene "Boekingen Open" knop
   - Ouders kunnen nu beginnen met boeken

## Voor Ouders: Hoe te Boeken

1. Ga naar de applicatie homepage
2. Klik op "Ouder/Verzorger"
3. Voer uw e-mailadres in
4. Controleer uw inbox voor de magic link (geldig 15 minuten)
5. Klik op de link in de email
6. Kies een beschikbaar tijdslot
7. Voer de naam van uw kind in
8. Bevestig de boeking
9. U ontvangt een bevestiging (optioneel per email)

## Database Structuur

### Belangrijkste Tabellen

- **admin_users** - Admin account(s)
- **events** - Ouderavond dagen
- **time_slots** - Individuele gesprekstijden
- **bookings** - Gemaakte boekingen
- **magic_links** - Magic link tokens (15 min geldigheid)
- **rate_limit_log** - Rate limiting voor beveiliging
- **activity_log** - Audit trail van alle acties
- **settings** - Systeem configuratie

### Beveiliging

Alle tabellen hebben Row Level Security (RLS) policies:
- Ouders kunnen alleen hun eigen boekingen zien
- Alleen beschikbare tijdslots zijn zichtbaar voor ouders
- Admin heeft volledige toegang via authenticated sessies
- Magic links zijn één keer bruikbaar en expireren na 15 minuten

## Email Configuratie

De applicatie bevat een Supabase Edge Function voor het verzenden van magic link emails.

### Development
In development mode worden emails gelogd naar de console in plaats van verzonden.

### Production Setup
Om emails te verzenden in productie, integreer een email service:

**Optie 1: Resend (Aanbevolen)**
```typescript
// In supabase/functions/send-magic-link/index.ts
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Kempenhorst College <noreply@kempenhorst.nl>',
    to: email,
    subject: 'Uw inloglink voor ouderavond boeking',
    html: emailBody,
  }),
});
```

**Optie 2: SendGrid, AWS SES, of andere email providers**
Pas de edge function aan om uw voorkeursservice te gebruiken.

## Rate Limiting

Het systeem heeft ingebouwde rate limiting:
- **Per IP adres**: 3 magic link requests per uur
- **Per email**: 5 magic link requests per uur

Dit voorkomt misbruik en spam. De limieten kunnen aangepast worden in `/src/lib/utils/rateLimit.ts`.

## Boekingsflow

### Ouder Perspectief
1. Request magic link → Rate limit check → Link gegenereerd
2. Klik magic link → Token verificatie → Sessie aangemaakt
3. Bekijk beschikbare slots → Kies slot → Voer student naam in
4. Bevestig → Boeking aangemaakt → Bevestigingsscherm

### Admin Perspectief
1. Login met email/password
2. Dashboard met realtime statistieken
3. Beheer dagen, slots en boekingen
4. Bekijk activity log voor audit trail
5. Export boekingen naar CSV

## Activity Log Acties

Het systeem logt de volgende acties:
- `admin_login` - Admin ingelogd
- `admin_logout` - Admin uitgelogd
- `magic_link_request` - Ouder vraagt magic link aan
- `magic_link_used` - Magic link gebruikt voor login
- `event_created` - Dag aangemaakt
- `event_updated` - Dag bijgewerkt
- `event_deleted` - Dag verwijderd
- `slot_created` - Tijdslot aangemaakt
- `slot_updated` - Tijdslot gewijzigd
- `slot_deleted` - Tijdslot verwijderd
- `booking_created` - Boeking aangemaakt
- `booking_cancelled` - Boeking geannuleerd
- `settings_updated` - Instellingen gewijzigd

## Export Functionaliteit

### Boekingen Exporteren
1. Ga naar "Boekingen beheren"
2. Optioneel: filter op evenement of zoek op naam/email
3. Klik "Exporteer CSV"
4. Download bevat: Student Naam, Ouder Email, Datum, Tijd, Evenement, Geboekt Op

## Troubleshooting

### Ouders kunnen niet inloggen
- Controleer of boekingen open staan ("Boekingen beheren" → groene knop)
- Controleer of er een evenement met beschikbare slots bestaat
- Controleer rate limiting (wacht 1 uur als limiet bereikt)

### Magic link werkt niet
- Links zijn 15 minuten geldig
- Links kunnen maar 1x gebruikt worden
- Vraag een nieuwe link aan als nodig

### Geen emails ontvangen
- In development: check de browser console voor gelogde emails
- In production: configureer een email service in de edge function

### Tijdslots genereren niet
- Controleer dat eindtijd later is dan starttijd
- Check dat tijden binnen 23:00 vallen
- Zorg dat gespreksduur + buffertijd past in de tijdsperiode

## Kempenhorst College Contact

**Adres**: Eikenbussel 1, 5689 AA Oirschot
**Telefoon**: +31 (0)499 58 21 60
**Website**: [kempenhorst.nl](https://kempenhorst.nl)

---

Ontwikkeld voor Kempenhorst College - Ouderavond Beheer Systeem
