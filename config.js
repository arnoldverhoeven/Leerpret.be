/* ============================================================
   Leerpret – configuratie
   Vul hier de gegevens van je Supabase-project in.
   Supabase → Project Settings → API:
     - Project URL        → SUPABASE_URL
     - anon public key    → SUPABASE_ANON_KEY   (deze mag publiek zijn;
                            de toegang wordt afgedwongen door RLS in de database)
   ============================================================ */
window.LEERPRET_CONFIG = {
  SUPABASE_URL: "https://qgknorctvcdfcinbpeau.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFna25vcmN0dmNkZmNpbmJwZWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDMyNDgsImV4cCI6MjEwNDc3OTI0OH0.fGkHX15G27IU_iEx_kS2QFBoc4Dypm4pzBIdS6Bi7G8",
  // Gebruikersnamen zonder @ (bv. "marielle.peeters") worden aangevuld met dit domein.
  // Maak de login in Supabase dus aan als marielle.peeters@login.leerpret.be
  LOGIN_DOMAIN: "login.leerpret.be",
  SITE_NAME: "Leerpret",
  CONTACT_EMAIL: "info@leerpret.be"
};