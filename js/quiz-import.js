/* Leerpret – quiz-import: Word (.docx), tekst en JSON omzetten naar het quizformaat.
   Werkt in de browser zonder externe bibliotheken (docx = zip + xml, uitgepakt met DecompressionStream). */
(function (root) {
  'use strict';

  /* ---------------- .docx → paragrafen ---------------- */
  async function inflateRaw(bytes) {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  // Minimale zip-lezer: leest de central directory en haalt één bestand eruit.
  async function zipEntry(buf, wanted) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), td = new TextDecoder();
    // End of central directory zoeken
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('Geen geldig .docx-bestand (zip).');
    const count = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true);
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
      const nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
      const lho = dv.getUint32(off + 42, true);
      const name = td.decode(u8.subarray(off + 46, off + 46 + nlen));
      if (name === wanted) {
        const ln = dv.getUint16(lho + 26, true), le = dv.getUint16(lho + 28, true);
        const start = lho + 30 + ln + le; const data = u8.subarray(start, start + csize);
        if (method === 0) return td.decode(data);
        if (method === 8) return td.decode(await inflateRaw(data));
        throw new Error('Onbekende compressie in .docx');
      }
      off += 46 + nlen + elen + clen;
    }
    throw new Error('word/document.xml niet gevonden in dit bestand.');
  }
  function decodeXml(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&'); }

  // Geeft [{text, lvl}] – lvl = niveau van automatische nummering in Word (null = geen lijst)
  async function docxToParagraphs(arrayBuffer) {
    const xml = await zipEntry(arrayBuffer, 'word/document.xml');
    const paras = []; const re = /<w:p[ >][\s\S]*?<\/w:p>/g; let m;
    while ((m = re.exec(xml))) {
      const p = m[0];
      let lvl = null; const np = p.match(/<w:numPr>[\s\S]*?<\/w:numPr>/);
      if (np) { const il = np[0].match(/<w:ilvl w:val="(\d+)"/); lvl = il ? +il[1] : 0; }
      const text = (p.replace(/<w:tab\/>/g, '\t').match(/<w:t(?: [^>]*)?>[\s\S]*?<\/w:t>|<w:tab\/>/g) || [])
        .map(t => t === '<w:tab/>' ? ' ' : decodeXml(t.replace(/<[^>]+>/g, ''))).join('').trim();
      if (text) paras.push({ text, lvl });
    }
    return paras;
  }

  /* ---------------- tekst → paragrafen ---------------- */
  function textToParagraphs(text) {
    return text.replace(/\r/g, '').split('\n').map(s => ({ text: s.replace(/\t/g, ' ').trim(), lvl: null })).filter(p => p.text);
  }

  /* ---------------- paragrafen → quiz ---------------- */
  const CORRECT_RE = /(\(\s*(juist|correct|goed)\s*\)|[✓✔]|\*)/gi;
  const HEADERS = { titel: 'title', title: 'title', thema: 'theme', theme: 'theme', emoji: 'emoji', leerjaar: 'grades', leerjaren: 'grades', grades: 'grades' };

  function parseParagraphs(paras) {
    const quiz = { title: '', theme: '', emoji: '', grade_min: 1, grade_max: 6, questions: [] };
    let q = null, a = null;
    for (const p of paras) {
      let t = p.text;
      // kopregels
      const h = t.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
      if (h && HEADERS[h[1].toLowerCase()] && !q) {
        const k = HEADERS[h[1].toLowerCase()], v = h[2].trim();
        if (k === 'grades') { const g = v.match(/(\d)\s*(?:-|–|tot|t\/m)?\s*(\d)?/); if (g) { quiz.grade_min = +g[1]; quiz.grade_max = +(g[2] || g[1]); } }
        else quiz[k] = v;
        continue;
      }
      const qm = t.match(/^(?:vraag\s*)?(\d{1,3})\s*[.):]\s*(.+)$/i);
      const am = t.match(/^(\*?)\s*([A-Ha-h])\s*[.):]\s*(.+)$/);
      const isQ = qm || (p.lvl === 0 && !am);
      const isA = !isQ && (am || p.lvl === 1 || p.lvl === 2);
      if (isQ) {
        q = { q: (qm ? qm[2] : t).trim(), a: [] }; a = null; quiz.questions.push(q);
        const k = q.q.match(/\(\s*kies\s*(\d)\s*\)/i); if (k) q.multi = +k[1];
        continue;
      }
      if (isA && q) {
        let body = am ? am[3] : t; let ok = !!(am && am[1]);
        if (CORRECT_RE.test(body)) { ok = true; body = body.replace(CORRECT_RE, ''); } CORRECT_RE.lastIndex = 0;
        if (/^\*/.test(t)) ok = true;
        a = { t: body.replace(/\s+/g, ' ').trim(), ok, e: '' }; q.a.push(a); continue;
      }
      // uitleg / vervolgregel
      t = t.replace(/^(uitleg|waarom|toelichting)\s*:\s*/i, '');
      if (a) a.e = (a.e ? a.e + ' ' : '') + t;
      else if (q) q.q = q.q + ' ' + t;
    }
    // multi afleiden + opschonen
    for (const qq of quiz.questions) {
      const n = qq.a.filter(x => x.ok).length;
      if (n > 1 && !qq.multi) qq.multi = n;
      if (qq.multi && qq.multi < 2) delete qq.multi;
      qq.q = qq.q.replace(/\(\s*kies\s*\d\s*\)/i, '').replace(/\s+/g, ' ').trim();
    }
    return quiz;
  }

  function parseJson(text) {
    const d = JSON.parse(text);
    if (Array.isArray(d)) return { title: '', theme: '', emoji: '', grade_min: 1, grade_max: 6, questions: d };
    if (d && Array.isArray(d.questions)) return d;
    throw new Error('JSON moet een lijst met vragen zijn, of een object met "questions".');
  }

  // Controle: geeft lijst met waarschuwingen
  function validate(quiz) {
    const w = [];
    if (!quiz.questions.length) w.push('Geen vragen gevonden.');
    quiz.questions.forEach((q, i) => {
      const n = i + 1;
      if (!q.q) w.push(`Vraag ${n}: geen vraagtekst.`);
      if (!q.a || q.a.length < 2) w.push(`Vraag ${n}: minstens 2 antwoorden nodig.`);
      else {
        if (q.a.length > 4) w.push(`Vraag ${n}: maximaal 4 antwoorden (nu ${q.a.length}).`);
        const ok = q.a.filter(a => a.ok).length;
        if (ok === 0) w.push(`Vraag ${n}: geen juist antwoord aangeduid (zet een * voor het juiste antwoord).`);
        if (q.multi && ok !== q.multi) w.push(`Vraag ${n}: "kies ${q.multi}" maar ${ok} juiste antwoorden.`);
        if (!q.multi && ok > 1) w.push(`Vraag ${n}: ${ok} juiste antwoorden, maar "aantal te kiezen" staat op 1.`);
        q.a.forEach((a, j) => { if (!a.e) w.push(`Vraag ${n}${'ABCD'[j]}: geen uitleg (mag, maar is leuker mét).`); });
      }
    });
    return w;
  }

  root.QuizImport = { docxToParagraphs, textToParagraphs, parseParagraphs, parseJson, validate };
})(typeof window !== 'undefined' ? window : module.exports);
