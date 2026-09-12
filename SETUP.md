# Leerpret.be – opzet in 5 stappen

Alles in deze map is een statische website (geen build-stap). De database en de logins draaien op Supabase.

## 1. Supabase (± 10 min)

1. Ga naar https://supabase.com/dashboard → **New project** (naam: `leerpret`, regio: **West EU (Ireland)** of **Central EU (Frankfurt)** – dan staan de gegevens in Europa). Gebruik een apart project, niet dat van Shopzo.
2. Open **SQL Editor → New query**, plak de inhoud van `supabase/schema.sql` en klik **Run**.
3. Doe hetzelfde met `supabase/seed.sql` (maakt school De Kleine Wereld, klas 3A met namenlijst en de Ruimte Quiz aan).
4. Maak de logins: **Authentication → Users → Add user → Create new user**. Vink **Auto Confirm User** aan. Bijvoorbeeld:
   - `arnold.verhoeven@agv-it.be` (jij, beheerder)
   - `juf.marielle@dekleinewereld.be` (of het echte adres van de juf) + een wachtwoord dat je haar doorgeeft
5. Maak jezelf beheerder (één keer, SQL Editor):
   ```sql
   update public.profiles set role = 'admin',
          school_id = (select id from public.schools where slug = 'de-kleine-wereld')
    where id = (select id from auth.users where email = 'arnold.verhoeven@agv-it.be');
   ```
   Alle andere accounts koppel je daarna gewoon in het beheerdersscherm (`leerpret.be/admin` → tab *Scholen & leerkrachten*).
6. **Authentication → Providers → Email**: zet *Confirm email* uit (je maakt accounts zelf aan, niemand registreert zich zelf). Laat *Enable sign ups* het liefst ook **uit**, zodat enkel jij accounts kan maken.
7. **Project Settings → API**: kopieer de **Project URL** en de **anon public** key naar `js/config.js`.

## 2. Netlify (± 5 min)

1. Netlify → **Add new site → Deploy manually** en sleep deze hele map erin (of koppel een Git-repo met deze map; `netlify.toml` staat al klaar, publish directory = `.`).
2. **Site settings → Domain management → Add a domain** → `leerpret.be` (en `www.leerpret.be`). Netlify toont dan de DNS-records die je bij Easyhost moet zetten.
3. Zodra de DNS goed staat: **HTTPS → Verify DNS → Provision certificate** (Let's Encrypt, gratis).

## 3. Easyhost DNS

Klantenzone → domeinnaam `leerpret.be` → **DNS-beheer**. Voeg toe (bestaande A-records voor `@` verwijderen):

| Type  | Naam | Waarde                                  |
|-------|------|-----------------------------------------|
| A     | @    | `75.2.60.5` (Netlify load balancer)     |
| CNAME | www  | `<jouw-site>.netlify.app`               |

Controleer het IP altijd in Netlify zelf (Domain management → *Check DNS configuration*), dat is de bron van waarheid. Verspreiden duurt 15 min tot enkele uren.

Voor e-mail op `info@leerpret.be`: dat blijft via Easyhost (MX-records niet aanraken) of zet een doorstuurregel naar je AGV-mailbox.

## 4. Testen

- `https://leerpret.be` → homepage, favicon in het tabblad.
- `https://leerpret.be/quiz?demo=1` → demo zonder login (met neutrale namen, niet de echte klas).
- `https://leerpret.be/login` → inloggen als de juf → dashboard → klas 3A → **Start** bij Ruimte Quiz.
- Deelvoorvertoning: plak `https://leerpret.be` in https://www.opengraph.xyz of in een WhatsApp-chat. Facebook kan een oude versie cachen: https://developers.facebook.com/tools/debug/ → *Scrape again*.

## 5. Beheerdersscherm: quizzen, scholen en leerkrachten

Log in als beheerder en ga naar **leerpret.be/admin** (ook via de knop *Beheer* op het dashboard).

**Quiz toevoegen of bewerken.** Klik *+ Nieuwe quiz*, vul titel, thema, emoji en leerjaren in en kies of de quiz voor *alle scholen* of voor één school is. Vragen kan je op drie manieren invoeren:

- **Word-bestand (.docx)** slepen of kiezen. Gebruik het sjabloon (`assets/sjabloon-quiz.docx`, ook te downloaden in het scherm). Regels: elke vraag begint met `1.` `2.` …, elk antwoord met `A.` `B.` `C.` `D.`, een `*` vóór het juiste antwoord, de uitleg op de lijn eronder. Twee juiste antwoorden? Zet `(kies 2)` achter de vraag en een `*` bij beide. Bovenaan mag je `Titel:`, `Thema:`, `Emoji:` en `Leerjaar: 2-4` zetten. Ook de automatische nummering van Word (genummerde lijst = vraag, lijst met letters ingesprongen = antwoord) wordt herkend.
- **Tekst plakken** in hetzelfde formaat (bv. uit een e-mail van de juf, of uit Claude/ChatGPT: "maak 15 quizvragen over dieren voor het 2de leerjaar in dit formaat: …").
- **JSON** (het interne formaat; met *⬇ JSON* kan je een quiz ook exporteren).

Na het inlezen zie je alle vragen in een formulier: tekst aanpassen, juiste antwoord aan- of uitvinken (groen vinkje), uitleg aanvullen, antwoorden of vragen toevoegen/verwijderen/verschuiven, en per antwoord eventueel een visueel planeetje kiezen. *✔ Controleren* wijst op ontbrekende juiste antwoorden of uitleg. Klik daarna *Bewaren*; met *Uitproberen* opent de quiz meteen op een nieuw tabblad. *Gepubliceerd* uitvinken verbergt een quiz voor leerkrachten zonder ze te verwijderen.

**Nieuwe school.** Tab *Scholen & leerkrachten* → naam typen → *School toevoegen*. Daarna in Supabase de login(s) aanmaken (*Authentication → Users → Add user*, *Auto Confirm* aan); ze verschijnen automatisch in de tabel, waar je naam, school en rol instelt. De juf maakt vervolgens zelf haar klassen en namenlijsten aan in het dashboard.

Het interne vraagformaat (voor wie JSON wil aanleveren):
```json
[{ "q": "Vraag?", "multi": 2,
   "a": [ { "t": "Antwoord", "ok": true, "e": "Uitleg waarom juist", "planet": "saturn ring" },
          { "t": "Antwoord", "ok": false, "e": "Uitleg waarom fout" } ] }]
```
`multi` en `planet` zijn optioneel.

## Bestanden

```
index.html          homepage (thema's, leerjaarfilter, OG-tags)
login.html          inloggen (e-mail + wachtwoord)
dashboard.html      klassen, namenlijsten, quizzen starten
admin.html          beheer: quizzen (import uit .docx/tekst/JSON), scholen, leerkrachten
quiz.html           de quiz zelf (?demo=1 of ?quiz=<id>&class=<id>)
privacy.html        privacyverklaring (eerste versie)
css/leerpret.css    huisstijl + zelf-gehoste fonts (Baloo 2, Nunito)
js/config.js        ← Supabase URL + anon key invullen
js/app.js           gedeelde helpers (login-check, profiel)
js/quiz-import.js   .docx/tekst/JSON → quizformaat (zonder externe bibliotheken)
js/demo-ruimte.json de 20 ruimtevragen (ook in seed.sql)
assets/sjabloon-quiz.docx / .txt   invulsjablonen voor nieuwe quizzen
assets/             logo's (3 concepten + witte varianten), icon, favicons, og-image.png, fonts
supabase/           schema.sql (tabellen + toegangsregels), seed.sql (startgegevens)
netlify.toml        headers + nette URL's
site.webmanifest    icoon op beginscherm van tablet/telefoon
```
