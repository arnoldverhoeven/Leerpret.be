/* ============================================================
   Leerpret – configuratie
   Vul hier de gegevens van je Supabase-project in.
   Supabase → Project Settings → API:
     - Project URL        → SUPABASE_URL
     - anon public key    → SUPABASE_ANON_KEY   (deze mag publiek zijn;
                            de toegang wordt afgedwongen door RLS in de database)
   ============================================================ */
window.LEERPRET_CONFIG = {
  SUPABASE_URL: "https://JOUW-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "JOUW-ANON-KEY",
  // Gebruikersnamen zonder @ (bv. "marielle.peeters") worden aangevuld met dit domein.
  // Maak de login in Supabase dus aan als marielle.peeters@login.leerpret.be
  LOGIN_DOMAIN: "login.leerpret.be",
  SITE_NAME: "Leerpret",
  CONTACT_EMAIL: "info@leerpret.be"
};
