/* Leerpret – gedeelde app-helpers (vereist supabase-js v2 + config.js) */
(function () {
  const C = window.LEERPRET_CONFIG || {};
  const configured = C.SUPABASE_URL && !C.SUPABASE_URL.includes('JOUW-PROJECT') && C.SUPABASE_ANON_KEY && C.SUPABASE_ANON_KEY !== 'JOUW-ANON-KEY';
  const sb = configured && window.supabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  async function currentUser() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session ? data.session.user : null;
  }

  // Stuurt naar login als er geen sessie is. Geeft user terug.
  async function requireAuth() {
    if (!sb) { location.href = '/login.html?err=config'; return null; }
    const u = await currentUser();
    if (!u) { location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search); return null; }
    return u;
  }

  async function myProfile() {
    const u = await currentUser(); if (!u) return null;
    const { data } = await sb.from('profiles').select('id, full_name, role, school_id, schools(name, slug)').eq('id', u.id).single();
    return data;
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  window.LP = { sb, configured, currentUser, requireAuth, myProfile, esc };
})();
