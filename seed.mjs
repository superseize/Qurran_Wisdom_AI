#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Quran Wisdom AI — authentic data seeder
//
// Downloads published datasets, normalises them to the table shapes in
// supabase/schema.sql and loads them into Supabase. Safe to re-run:
// each dataset is deleted and re-inserted.
//
//   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  npm run seed
//   npm run seed -- --only=quran,tafsir        (subset)
//   npm run seed:dry                           (download + validate only)
//
// Sources (all public GitHub repositories, fetched via raw.githubusercontent.com):
//   • fawazahmed0/quran-api   — Quran text (KFGQPC Uthmani Hafs), Urdu & English translations, structure
//   • fawazahmed0/hadith-api  — Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Malik, 40 Hadith sets
//   • spa5k/tafsir_api        — Tafsir Ibn Kathir (Urdu/English), Maarif-ul-Quran, Bayan-ul-Quran, Muyassar
//   • src/lib/dictionary.js — the bundled Quranic vocabulary list
// ════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.seed-cache');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (name) => !ONLY || ONLY.has(name);

const QURAN_API = 'https://raw.githubusercontent.com/fawazahmed0/quran-api/1';
const HADITH_API = 'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions';
const TAFSIR_API = 'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir';
const VERSION = new Date().toISOString().slice(0, 10);

// ─── Dataset definitions ───
const TRANSLATIONS = [
  { file: 'urd-fatehmuhammadja', language: 'ur', edition: 'ur.jalandhry', translator: 'Fateh Muhammad Jalandhry' },
  { file: 'eng-ummmuhammad', language: 'en', edition: 'en.sahih', translator: 'Saheeh International (Umm Muhammad)' },
];
const TAFSIRS = [
  { slug: 'ar-tafsir-muyassar', language: 'ar', edition: 'ar-muyassar', author: 'التفسير الميسر (Tafsir al-Muyassar)' },
  { slug: 'ur-tafseer-ibn-e-kaseer', language: 'ur', edition: 'ur-ibn-kathir', author: 'تفسیر ابن کثیر (Ibn Kathir — Urdu)' },
  { slug: 'en-tafisr-ibn-kathir', language: 'en', edition: 'en-ibn-kathir', author: 'Tafsir Ibn Kathir (English)' },
  { slug: 'en-tafsir-maarif-ul-quran', language: 'en', edition: 'en-maarif-ul-quran', author: 'Maarif-ul-Quran (Mufti Muhammad Shafi)' },
  { slug: 'ur-tafsir-bayan-ul-quran', language: 'ur', edition: 'ur-bayan-ul-quran', author: 'بیان القرآن (Dr. Israr Ahmad)' },
];
const HADITH_COLLECTIONS = [
  { id: 'bukhari', name: 'Sahih al-Bukhari' },
  { id: 'muslim', name: 'Sahih Muslim' },
  { id: 'abudawud', name: 'Sunan Abu Dawud' },
  { id: 'tirmidhi', name: 'Jami at-Tirmidhi' },
  { id: 'nasai', name: "Sunan an-Nasa'i" },
  { id: 'ibnmajah', name: 'Sunan Ibn Majah' },
  { id: 'malik', name: 'Muwatta Malik' },
  { id: 'nawawi', name: 'Forty Hadith of an-Nawawi' },
  { id: 'qudsi', name: 'Forty Hadith Qudsi' },
  { id: 'dehlawi', name: 'Forty Hadith of Shah Waliullah Dehlawi' },
];
const HADITH_LANGS = [{ code: 'urd', lang: 'ur' }, { code: 'eng', lang: 'en' }];

const TOPICS = [
  ['tawheed', 'توحید', 'توحید', 'Tawheed (Oneness of God)'], ['prophethood', 'نبوة', 'نبوت', 'Prophethood'],
  ['faith', 'إيمان', 'ایمان', 'Faith'], ['piety', 'تقوى', 'تقویٰ', 'Piety (Taqwa)'],
  ['remembrance', 'ذكر', 'ذکر', 'Remembrance of Allah'], ['supplication', 'دعاء', 'دعا', 'Supplication'],
  ['knowledge', 'علم', 'علم', 'Knowledge'], ['salah', 'صلاة', 'نماز', 'Prayer (Salah)'],
  ['zakat', 'زكاة', 'زکوٰۃ', 'Zakat and Charity'], ['fasting', 'صيام', 'روزہ', 'Fasting'],
  ['gratitude', 'شكر', 'شکر', 'Gratitude'], ['repentance', 'توبة', 'توبہ', 'Repentance'],
  ['resurrection', 'بعث', 'قیامت', 'Resurrection'], ['jannah', 'جنة', 'جنت', 'Paradise (Jannah)'],
  ['jahannam', 'جهنم', 'جہنم', 'Hellfire (Jahannam)'], ['death', 'موت', 'موت', 'Death'],
  ['modesty', 'حياء', 'حیاء و پردہ', 'Modesty and Hijab'], ['backbiting', 'غيبة', 'غیبت', 'Backbiting'],
  ['envy', 'حسد', 'حسد', 'Envy'], ['forgiveness', 'عفو', 'معافی', 'Forgiveness'],
  ['good character', 'أخلاق', 'اخلاق', 'Good Character (Akhlaq)'], ['honesty', 'صدق', 'سچائی و امانت', 'Honesty and Trustworthiness'],
  ['patience', 'صبر', 'صبر', 'Patience (Sabr)'], ['mercy', 'رحمة', 'رحمت', 'Mercy'],
  ['justice', 'عدل', 'عدل', 'Justice'], ['parents', 'والدين', 'والدین', 'Parents and Kinship'],
  ['hypocrisy', 'نفاق', 'نفاق', 'Hypocrisy'], ['prophet stories', 'قصص الأنبياء', 'قصص الانبیاء', 'Stories of the Prophets'],
  ['people of the book', 'أهل الكتاب', 'اہل کتاب', 'People of the Book'], ['creation', 'خلق', 'تخلیق و آیات کائنات', 'Creation and Signs in Nature'],
];

// ─── Helpers ───
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(CACHE, { recursive: true });

async function fetchJson(url, { optional = false } = {}) {
  const key = path.join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_'));
  if (fs.existsSync(key)) return JSON.parse(fs.readFileSync(key, 'utf8'));
  let lastErr;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404 && optional) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = await r.text();
      const json = JSON.parse(txt);
      fs.writeFileSync(key, txt);
      return json;
    } catch (e) { lastErr = e; await sleep(800 * (i + 1)); }
  }
  throw new Error(`Failed to fetch ${url}: ${lastErr?.message}`);
}

async function pool(items, size, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const n = i++; out[n] = await fn(items[n], n); }
  }));
  return out;
}

// Bundle & import a source module (resolves the app's own relative/alias imports).
async function loadSrc(rel) {
  const { build } = await import('esbuild');
  const outfile = path.join(CACHE, rel.replace(/[\\/]/g, '_') + '.bundle.mjs');
  await build({
    entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent',
    alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{}' }, external: ['react', 'react-dom', 'lucide-react'],
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

const clean = (s) => (s == null ? '' : String(s).replace(/\u0000/g, '').trim());

// ─── Supabase sink ───
let supabase = null;
if (!DRY) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (service role key — never ship it to the browser).\nUse --dry-run to only download and validate.');
    process.exit(1);
  }
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(url, key, { auth: { persistSession: false } });
}
const stats = {};

async function deleteWhere(table, filters) {
  if (DRY) return;
  let q = supabase.from(table).delete();
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  if (!Object.keys(filters).length) q = q.not('id', 'is', null);
  const { error } = await q;
  if (error) throw new Error(`delete ${table}: ${error.message}`);
}

async function insertRows(table, rows, label) {
  stats[label] = (stats[label] || 0) + rows.length;
  if (DRY) return;
  const MAX_BYTES = 700_000, MAX_ROWS = 500;
  let batch = [], bytes = 0;
  const flush = async () => {
    if (!batch.length) return;
    for (let attempt = 0; ; attempt++) {
      const { error } = await supabase.from(table).insert(batch);
      if (!error) break;
      if (attempt >= 3) throw new Error(`insert ${table}: ${error.message}`);
      await sleep(1000 * (attempt + 1));
    }
    batch = []; bytes = 0;
  };
  for (const r of rows) {
    const sz = JSON.stringify(r).length;
    if (batch.length && (batch.length >= MAX_ROWS || bytes + sz > MAX_BYTES)) await flush();
    batch.push(r); bytes += sz;
  }
  await flush();
}

async function logImport(dataset, source, count, status = 'completed', notes = '') {
  if (DRY) return;
  await supabase.from('import_logs').insert({
    dataset, source, records_imported: count, records_failed: 0, version: VERSION, status,
    started_at: new Date().toISOString(), finished_at: new Date().toISOString(), notes,
  });
}

// ─── 1. Quran ───
async function seedQuran() {
  log('\n▶ Quran (Arabic text + translations)');
  const { SURAHS } = await loadSrc('src/lib/data.js');
  const { arabicSkeleton } = await loadSrc('src/lib/utils.js');
  const info = await fetchJson(`${QURAN_API}/info.json`);
  const arabic = (await fetchJson(`${QURAN_API}/editions/ara-quranuthmanihaf.json`)).quran;
  if (arabic.length !== 6236) throw new Error(`Arabic text has ${arabic.length} verses, expected 6236`);

  const key = (c, v) => `${c}:${v}`;
  const cumulative = {}; let acc = 0;
  for (const s of SURAHS) { cumulative[s.number] = acc; acc += s.ayahCount; }
  const global = (c, v) => cumulative[c] + v;
  const rangeMap = (refs, field) => {
    const m = new Map();
    for (const r of refs) {
      const a = global(r.start.chapter, r.start.verse), b = global(r.end.chapter, r.end.verse);
      for (let g = a; g <= b; g++) m.set(g, r[field]);
    }
    return m;
  };
  const juz = rangeMap(info.juzs.references, 'juz');
  const page = rangeMap(info.pages.references, 'page');
  const ruku = rangeMap(info.rukus.references, 'ruku');
  const manzil = rangeMap(info.manzils.references, 'manzil');
  const maqra = rangeMap(info.maqras.references, 'maqra');
  const sajdas = new Set(info.sajdas.references.map((s) => key(s.chapter, s.verse)));

  const ayahRows = arabic.map((a) => {
    const g = global(a.chapter, a.verse);
    const meta = SURAHS[a.chapter - 1];
    return {
      surah: a.chapter, ayah: a.verse, ayah_global: g,
      surah_name_arabic: meta.name || null,
      surah_name_english: meta.englishName || null,
      text_uthmani: clean(a.text), text_skeleton: arabicSkeleton(a.text),
      juz: juz.get(g) ?? null, page: page.get(g) ?? null, ruku: ruku.get(g) ?? null,
      manzil: manzil.get(g) ?? null,
      hizb: maqra.has(g) ? Math.ceil(maqra.get(g) / 4) : null,
      sajdah: sajdas.has(key(a.chapter, a.verse)),
    };
  });
  const missing = ayahRows.filter((r) => !r.juz || !r.page);
  if (missing.length) throw new Error(`${missing.length} ayahs lack juz/page metadata`);
  if (!ayahRows[0].surah_name_english) throw new Error('Surah metadata fields not found in src/lib/data.js');

  await deleteWhere('ayahs', {});
  await insertRows('ayahs', ayahRows, 'ayahs');
  await logImport('ayahs', 'fawazahmed0/quran-api (ara-quranuthmanihaf, KFGQPC Uthmani Hafs v13)', ayahRows.length);
  log(`  ayahs: ${ayahRows.length}`);

  for (const t of TRANSLATIONS) {
    const verses = (await fetchJson(`${QURAN_API}/editions/${t.file}.json`)).quran;
    if (verses.length !== 6236) throw new Error(`${t.file}: ${verses.length} verses`);
    const rows = verses.map((v) => ({
      surah: v.chapter, ayah: v.verse, ayah_global: global(v.chapter, v.verse),
      language: t.language, translator: t.translator, edition: t.edition, text: clean(v.text),
      source: `fawazahmed0/quran-api/${t.file} (Tanzil)`, license: 'Tanzil / see source repository', version: VERSION,
    }));
    await deleteWhere('translations', { edition: t.edition });
    await insertRows('translations', rows, `translations:${t.edition}`);
    await logImport(`translation:${t.edition}`, `fawazahmed0/quran-api/${t.file}`, rows.length);
    log(`  translation ${t.edition}: ${rows.length}`);
  }
  return { global };
}

// ─── 2. Tafsir ───
function extractAyahTexts(payload, surah) {
  const list = Array.isArray(payload) ? payload : payload?.ayahs || [];
  const out = [];
  for (const it of list) {
    const ayah = Number(it.ayah ?? it.verse ?? it.ayah_number);
    const text = clean(it.text);
    if (ayah && text) out.push({ ayah, text });
  }
  return out;
}

async function seedTafsir(globalFn) {
  log('\n▶ Tafsir');
  const { SURAHS } = await loadSrc('src/lib/data.js');
  let acc = 0; const cum = {}; for (const s of SURAHS) { cum[s.number] = acc; acc += s.ayahCount; }
  for (const t of TAFSIRS) {
    const surahs = await pool(SURAHS.map((s) => s.number), 8, async (n) => {
      const j = await fetchJson(`${TAFSIR_API}/${t.slug}/${n}.json`, { optional: true });
      return { n, items: j ? extractAyahTexts(j, n) : [] };
    });
    const rows = [];
    for (const { n, items } of surahs) {
      const seen = new Set();
      for (const it of items) {
        if (seen.has(it.ayah) || it.ayah > SURAHS[n - 1].ayahCount) continue;
        seen.add(it.ayah);
        rows.push({
          surah: n, ayah: it.ayah, ayah_global: cum[n] + it.ayah, language: t.language, author: t.author,
          edition: t.edition, text: it.text, source: `spa5k/tafsir_api/${t.slug}`, license: 'See source repository', version: VERSION,
        });
      }
    }
    if (rows.length < 3000) throw new Error(`${t.slug}: only ${rows.length} entries — source incomplete`);
    await deleteWhere('tafsirs', { edition: t.edition });
    await insertRows('tafsirs', rows, `tafsir:${t.edition}`);
    await logImport(`tafsir:${t.edition}`, `spa5k/tafsir_api/${t.slug}`, rows.length);
    log(`  tafsir ${t.edition}: ${rows.length} ayah entries`);
  }
}

// ─── 3. Hadith ───
async function seedHadith() {
  log('\n▶ Hadith');
  for (const col of HADITH_COLLECTIONS) {
    for (const { code, lang } of HADITH_LANGS) {
      const edition = `${code}-${col.id}`;
      const d = await fetchJson(`${HADITH_API}/${edition}.min.json`, { optional: true });
      if (!d) { log(`  (skip ${edition}: not published)`); continue; }
      const sections = d.metadata?.sections || {};
      const details = d.metadata?.section_details || {};
      const rows = [], seen = new Set();
      for (const h of d.hadiths) {
        const text = clean(h.text);
        const num = Number(h.hadithnumber);
        if (!text || !Number.isFinite(num)) continue; // sub-numbered hadith (e.g. 1.1) are kept; number is truncated
        const book = h.reference?.book ?? null;
        const dedupe = `${h.hadithnumber}|${book}|${h.reference?.hadith}`;
        if (seen.has(dedupe)) continue; seen.add(dedupe);
        const grade = (h.grades || []).map((g) => `${g.grade}${g.name ? ` (${g.name})` : ''}`).join('; ') || null;
        rows.push({
          collection: col.id, hadith_number: Math.trunc(num), book, chapter: book != null ? clean(sections[String(book)]) || null : null,
          language: lang, text, grade, narrator: null,
          reference: `${col.name}, Book ${book ?? '?'}, Hadith ${h.reference?.hadith ?? num}`,
          source: `fawazahmed0/hadith-api/${edition}`, edition, license: 'See source repository', version: VERSION, status: 'imported',
        });
      }
      const chapters = Object.entries(sections).filter(([id, name]) => id !== '0' && clean(name)).map(([id, name]) => ({
        collection: col.id, language: lang, book: Number(id), chapter_name: clean(name),
        hadith_first: details[id]?.hadithnumber_first ? Math.trunc(details[id].hadithnumber_first) : null,
        hadith_last: details[id]?.hadithnumber_last ? Math.trunc(details[id].hadithnumber_last) : null,
      }));
      await deleteWhere('hadiths', { collection: col.id, language: lang });
      await deleteWhere('hadith_chapters', { collection: col.id, language: lang });
      await insertRows('hadiths', rows, `hadith:${edition}`);
      await insertRows('hadith_chapters', chapters, `hadith_chapters:${edition}`);
      await logImport(`hadith:${edition}`, `fawazahmed0/hadith-api/${edition}`, rows.length);
      log(`  ${edition}: ${rows.length} hadiths, ${chapters.length} chapters`);
    }
  }
}

// ─── 4. Dictionary ───
async function seedDictionary() {
  log('\n▶ Quran dictionary');
  const { buildDictionary } = await loadSrc('src/lib/dictionary.js');
  const words = buildDictionary();
  const rows = words.map((w) => ({
    serial_no: w.serial_no, arabic_word: w.ar, urdu_meaning: w.ur || null, english_meaning: w.en || null,
    occurrence_count: w.count ?? null, frequency_category: w.frequency_category, arabic_letter: w.arabic_letter,
  }));
  await deleteWhere('quran_dictionary', {});
  await insertRows('quran_dictionary', rows, 'quran_dictionary');
  await logImport('quran_dictionary', 'src/lib/dictionary.js', rows.length);
  log(`  dictionary: ${rows.length} words`);
}

// ─── 5. Topic taxonomy (names only — no verse mappings are invented) ───
async function seedTopics() {
  log('\n▶ Topic taxonomy');
  const rows = TOPICS.map(([en, ar, ur, label]) => ({ name_en: label, name_ar: ar, name_ur: ur, keywords: en, status: 'active' }));
  await deleteWhere('topics', {});
  await insertRows('topics', rows, 'topics');
  await logImport('topics', 'taxonomy used by the AI query planner', rows.length, 'completed', 'Taxonomy only; ayah/hadith ↔ topic relations are not auto-generated.');
  log(`  topics: ${rows.length}`);
}

// ─── Run ───
const t0 = Date.now();
log(`Quran Wisdom AI seeder ${DRY ? '(dry-run: no database writes)' : ''}`);
let g;
if (want('quran')) g = await seedQuran();
if (want('tafsir')) await seedTafsir(g?.global);
if (want('hadith')) await seedHadith();
if (want('dictionary')) await seedDictionary();
if (want('topics')) await seedTopics();
log('\nSummary:'); for (const [k, v] of Object.entries(stats)) log(`  ${k.padEnd(34)} ${v}`);
log(`\nDone in ${Math.round((Date.now() - t0) / 1000)}s`);
