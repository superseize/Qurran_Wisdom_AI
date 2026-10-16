import { classifyWord, buildDictionary, lookupDictionaryWord } from '@/lib/dictionary';
import { SURAHS, TOTAL_SURAHS, TOTAL_AYAHS, TOTAL_WORDS, detectCategory, isFatihah, getFatihahAnalysis } from '@/lib/data';
import { backend } from '@/api/backend';

// ───────── lib/quranApis.js ─────────
// ════════════════════════════════════════════════════════════════
// External Quran & Hadith APIs — the SINGLE file that talks to third-party
// data sources. Everything the app fetches from third-party data sources lives here:
//   • alquran.cloud   — Quran text, translations, audio, full-text search
//   • quran.com       — word-by-word data and tafsir
//   • fawazahmed0 hadith-api (jsDelivr CDN) — hadith collections
// Swapping or adding a provider means changing only this module.
// ════════════════════════════════════════════════════════════════

// ─── External API base URLs ───
export const API_ENDPOINTS = {
  ALQURAN_CLOUD: 'https://api.alquran.cloud/v1',
  QURAN_COM: 'https://api.quran.com/api/v4',
  HADITH_CDN: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1',
  WORD_AUDIO: 'https://audio.qurancdn.com/',
};

// ─── alquran.cloud API ───
export const quranApi = {
  /** GET /surah — list all 114 surahs */
  async getSurahs() {
    const r = await fetch(`${API_ENDPOINTS.ALQURAN_CLOUD}/surah`);
    return (await r.json()).data;
  },

  /** GET /surah/{n}/editions/{edition1,edition2,...} */
  async getSurahEditions(surahNumber, editions) {
    const r = await fetch(`${API_ENDPOINTS.ALQURAN_CLOUD}/surah/${surahNumber}/editions/${editions}`);
    return (await r.json()).data;
  },

  /** GET /ayah/{surah:ayah}/editions/{edition1,edition2,...} */
  async getAyahEditions(verseKey, editions) {
    const r = await fetch(`${API_ENDPOINTS.ALQURAN_CLOUD}/ayah/${verseKey}/editions/${editions}`);
    return (await r.json()).data;
  },

  /** GET /ayah/{surah:ayah}/{edition} */
  async getAyahEdition(verseKey, edition) {
    const r = await fetch(`${API_ENDPOINTS.ALQURAN_CLOUD}/ayah/${verseKey}/${edition}`);
    return (await r.json()).data;
  },

  /** GET /quran/{edition} — full Quran in one edition */
  async getFullQuranEdition(edition) {
    const r = await fetch(`${API_ENDPOINTS.ALQURAN_CLOUD}/quran/${edition}`);
    return (await r.json()).data;
  },

  /** Exact full-corpus token count; search results count verses, not words. */
  async searchWordCount(keyword) {
    return (await getExactWordCount(keyword)).count;
  },

  /** GET /search/{keyword}/all/quran-uthmani — search Uthmani Quran, return matched verses */
  async searchQuranVerses(keyword, limit = 5) {
    const r = await fetch(`${API_ENDPOINTS.ALQURAN_CLOUD}/search/${encodeURIComponent(keyword)}/all/quran-uthmani`);
    const json = await r.json();
    const matches = json?.data?.matches || [];
    return matches.slice(0, limit).map(m => ({
      surah: m.surah?.number,
      ayah: m.numberInSurah,
      text: m.text,
      surahName: m.surah?.name,
    }));
  },
};

// ─── quran.com API (word-level data, tafsirs) ───
export const quranComApi = {
  /** GET /verses/by_key/{key}?words=true&word_fields=... */
  async getVerseWords(verseKey, fields = 'text_uthmani,char_type_name,audio_url,transliteration') {
    const r = await fetch(`${API_ENDPOINTS.QURAN_COM}/verses/by_key/${verseKey}?words=true&word_fields=${fields}`);
    return (await r.json()).verse;
  },

  /** GET /verses/by_key/{key}?tafsirs=ibn_kathir&fields=... */
  async getVerseTafsir(verseKey, tafsir = 'ibn_kathir', fields = 'tafsirs,text_uthmani') {
    const r = await fetch(`${API_ENDPOINTS.QURAN_COM}/verses/by_key/${verseKey}?tafsirs=${tafsir}&fields=${fields}`);
    return (await r.json()).verse;
  },

  /** GET /verses/by_key/{key}?words=true&word_fields=text_uthmani,translation,transliteration */
  async getVerseWordTranslations(verseKey, language = 'en') {
    const r = await fetch(`${API_ENDPOINTS.QURAN_COM}/verses/by_key/${verseKey}?language=${language}&words=true&word_fields=text_uthmani,translation,transliteration`);
    return (await r.json()).verse;
  },

  /** GET /verses/by_chapter/{surah}?words=true&... — paginated chapter verses */
  async getChapterVerses(surahNumber, page = 1, perPage = 300, fields = 'text_uthmani,char_type_name,audio_url,transliteration,translation', translation = null) {
    let url = `${API_ENDPOINTS.QURAN_COM}/verses/by_chapter/${surahNumber}?words=true&word_fields=${fields}&per_page=${perPage}&page=${page}`;
    if (translation) url += `&translation=${translation}`;
    const r = await fetch(url);
    return await r.json();
  },
};

// ─── Hadith CDN API (fawazahmed0) ───
export const hadithApi = {
  /** GET /editions/{editionId}.min.json — full edition */
  async getEdition(editionId) {
    const r = await fetch(`${API_ENDPOINTS.HADITH_CDN}/editions/${editionId}.min.json`);
    if (!r.ok) throw new Error('Failed to load hadith edition');
    return await r.json();
  },

  /** GET /editions/{editionId}/{num}.json — single hadith (full JSON) */
  async getHadith(editionId, num) {
    const r = await fetch(`${API_ENDPOINTS.HADITH_CDN}/editions/${editionId}/${num}.json`);
    return await r.json();
  },
};

// ─── Word audio URL builder ───
export function wordAudioUrl(audioPath) {
  return API_ENDPOINTS.WORD_AUDIO + audioPath;
}

// ───────── lib/quranCache.js ─────────
// Lightweight localStorage cache so a loaded surah and its per-verse analysis
// persist across visits instead of reloading / clearing each time.

const EDITION_PREFIX = 'quran-edition-';
const WORDS_PREFIX = 'quran-words-';
const ANALYSIS_PREFIX = 'quran-analysis-v2-'; // v2: Urdu word meanings fixed

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — silently skip; app still works uncached
  }
}

export const getCachedEdition = (surahNumber) => read(EDITION_PREFIX + surahNumber);
export const setCachedEdition = (surahNumber, edition) => write(EDITION_PREFIX + surahNumber, edition);

export const getCachedWords = (verseKey) => read(WORDS_PREFIX + verseKey);
export const setCachedWords = (verseKey, words) => write(WORDS_PREFIX + verseKey, words);

export const getCachedAnalysis = (verseKey) => read(ANALYSIS_PREFIX + verseKey);
export const setCachedAnalysis = (verseKey, analysis) => write(ANALYSIS_PREFIX + verseKey, analysis);

const PAGE_PREFIX = 'quran-page-';
const AYAH_PREFIX = 'quran-ayah-';

export const getCachedPage = (verseKey) => read(PAGE_PREFIX + verseKey);
export const setCachedPage = (verseKey, page) => write(PAGE_PREFIX + verseKey, page);

export const getCachedAyah = (surahNumber) => read(AYAH_PREFIX + surahNumber);
export const setCachedAyah = (surahNumber, ayah) => write(AYAH_PREFIX + surahNumber, ayah);

const SURAHS_KEY = 'quran-surahs';
export const getCachedSurahs = () => read(SURAHS_KEY);
export const setCachedSurahs = (surahs) => write(SURAHS_KEY, surahs);

// Qaida lessons cache — so Tajweed page opens instantly offline
const QAIDA_PREFIX = 'qaida-lessons-';
export const getCachedQaida = (type) => read(QAIDA_PREFIX + type);
export const setCachedQaida = (type, lessons) => write(QAIDA_PREFIX + type, lessons);

// Tajweed categories cache
const TAJWEED_KEY = 'tajweed-categories';
export const getCachedTajweed = () => read(TAJWEED_KEY);
export const setCachedTajweed = (data) => write(TAJWEED_KEY, data);

// Generic cache helper for any JSON data
const GENERIC_PREFIX = 'quran-cache-';
export const getCachedData = (key) => read(GENERIC_PREFIX + key);
export const setCachedData = (key, value) => write(GENERIC_PREFIX + key, value);

// ───────── lib/offlineStore.js ─────────
// Offline Quran Store — IndexedDB-based full Quran cache.
// Downloads Arabic + Urdu + English translations on first launch.
// This is the foundation for the offline research engine.



const DB_NAME = 'quran-wisdom-offline';
const DB_VERSION = 2;
const STORE_VERSES = 'verses';
const STORE_SURAHS = 'surahs';
const STORE_META = 'meta';
const STORE_HADITHS = 'hadiths';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_VERSES)) {
        const s = db.createObjectStore(STORE_VERSES, { keyPath: 'ayah_global' });
        s.createIndex('surah', 'surah', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SURAHS)) {
        db.createObjectStore(STORE_SURAHS, { keyPath: 'number' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_HADITHS)) {
        const h = db.createObjectStore(STORE_HADITHS, { keyPath: 'id' });
        h.createIndex('collection', 'collection', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
    req.onblocked = () => { dbPromise = null; reject(new Error('DB blocked')); };
  });
  return dbPromise;
}

function store(db, name, mode) {
  return db.transaction(name, mode).objectStore(name);
}

function dbGet(name, key) {
  return openDB().then(db => new Promise((res, rej) => {
    const r = store(db, name, 'readonly').get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}

function dbAll(name) {
  return openDB().then(db => new Promise((res, rej) => {
    const r = store(db, name, 'readonly').getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  }));
}

function dbCount(name) {
  return openDB().then(db => new Promise((res) => {
    const r = store(db, name, 'readonly').count();
    r.onsuccess = () => res(r.result);
    r.onerror = () => res(0);
  })).catch(() => 0);
}

// ─── Public read API ───

export async function getVerse(ayahGlobal) {
  return dbGet(STORE_VERSES, ayahGlobal);
}

export async function getSurahVerses(surahNumber) {
  const all = await dbAll(STORE_VERSES);
  return all.filter(v => v.surah === surahNumber).sort((a, b) => a.ayah - b.ayah);
}

export async function getAllSurahs() {
  return dbAll(STORE_SURAHS);
}

export async function getSurahMeta(number) {
  return dbGet(STORE_SURAHS, number);
}

export async function isDownloaded() {
  const count = await dbCount(STORE_VERSES);
  return count >= 6236;
}

export async function getVerseCount() {
  return dbCount(STORE_VERSES);
}

export async function searchOffline(query, limit = 30) {
  const all = await dbAll(STORE_VERSES);
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return all.filter(v =>
    (v.text_uthmani && v.text_uthmani.includes(q)) ||
    (v.translation_urdu && v.translation_urdu.toLowerCase().includes(q)) ||
    (v.translation_english && v.translation_english.toLowerCase().includes(q))
  ).slice(0, limit);
}

// ─── Hadith offline store ───

const HADITH_COLLECTIONS = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'];

export async function isHadithDownloaded() {
  const count = await dbCount(STORE_HADITHS);
  return count > 0;
}

export async function getHadithCount() {
  return dbCount(STORE_HADITHS);
}

export async function downloadHadithCollections(onProgress) {
  const db = await openDB();
  let total = 0;
  for (let i = 0; i < HADITH_COLLECTIONS.length; i++) {
    const col = HADITH_COLLECTIONS[i];
    const edition = `urd-${col}`;
    onProgress?.({ stage: `احادیث: ${col}`, percent: Math.round(((i) / HADITH_COLLECTIONS.length) * 100) });
    try {
      let d;
      try { d = await hadithApi.getEdition(edition); } catch { continue; }
      const hadiths = d?.hadiths || [];
      const records = hadiths.map((h) => ({
        id: `${col}-${h.hadithnumber}`,
        collection: col,
        hadith_number: h.hadithnumber,
        text: h.text || '',
        book: h.reference?.book ?? null,
      })).filter((r) => r.text);
      await new Promise((resolve, reject) => {
        const t = db.transaction(STORE_HADITHS, 'readwrite');
        const s = t.objectStore(STORE_HADITHS);
        for (const r of records) s.put(r);
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
      total += records.length;
    } catch (e) { console.error('Hadith download failed', col, e); }
  }
  await new Promise((resolve) => {
    const t = db.transaction(STORE_META, 'readwrite');
    t.objectStore(STORE_META).put({ key: 'hadith_download_complete', value: true, timestamp: Date.now() });
    t.oncomplete = resolve;
    t.onerror = resolve;
  });
  onProgress?.({ stage: 'احادیث مکمل', percent: 100 });
  return total;
}

export async function searchHadithsOffline(query, limit = 30) {
  const all = await dbAll(STORE_HADITHS);
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return all.filter(h => h.text && h.text.toLowerCase().includes(q)).slice(0, limit);
}

// ─── Download ───

const EDITIONS = [
  { key: 'arabic', edition: 'quran-uthmani', label: 'عربی متن (قرآن پاک)' },
  { key: 'urdu', edition: 'ur.junagarhi', label: 'اردو ترجمہ' },
  { key: 'english', edition: 'en.sahih', label: 'English Translation' },
];

export async function downloadFullQuran(onProgress) {
  const verseMap = new Map();

  // 1. Surah metadata
  onProgress?.({ stage: 'سورتوں کی معلومات', percent: 5, current: 0, total: 4 });
  try {
    const surahs = await quranApi.getSurahs() || [];
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE_SURAHS, 'readwrite');
      const s = t.objectStore(STORE_SURAHS);
      s.clear();
      for (const sr of surahs) {
        s.add({
          number: sr.number,
          name: sr.name,
          englishName: sr.englishName,
          englishNameTranslation: sr.englishNameTranslation,
          numberOfAyahs: sr.numberOfAyahs,
          revelationType: sr.revelationType,
        });
      }
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
  } catch (e) { console.error('Surah metadata failed', e); }

  // 2. Each edition (Arabic, Urdu, English)
  for (let i = 0; i < EDITIONS.length; i++) {
    const ed = EDITIONS[i];
    onProgress?.({ stage: ed.label, percent: Math.round(((i + 1) / 4) * 100), current: i + 1, total: 4 });
    try {
      const data = await quranApi.getFullQuranEdition(ed.edition);
      const ayahs = data?.ayahs || [];
      for (const a of ayahs) {
        const global = a.number;
        if (!verseMap.has(global)) {
          verseMap.set(global, {
            ayah_global: global,
            surah: a.surah.number,
            ayah: a.numberInSurah,
            text_uthmani: '',
            translation_urdu: '',
            translation_english: '',
            surah_name_arabic: a.surah.name,
            surah_name_english: a.surah.englishName,
          });
        }
        const v = verseMap.get(global);
        if (ed.key === 'arabic') v.text_uthmani = a.text;
        else if (ed.key === 'urdu') v.translation_urdu = a.text;
        else if (ed.key === 'english') v.translation_english = a.text;
      }
    } catch (e) { console.error('Edition failed', ed.edition, e); }
  }

  // 3. Store all verses
  onProgress?.({ stage: 'محفوظ کر رہا ہے…', percent: 90, current: 3, total: 4 });
  const db = await openDB();
  const verses = [...verseMap.values()];
  await new Promise((resolve, reject) => {
    const t = db.transaction(STORE_VERSES, 'readwrite');
    const s = t.objectStore(STORE_VERSES);
    s.clear();
    for (const v of verses) s.add(v);
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });

  // 4. Mark complete
  await new Promise((resolve) => {
    const t = db.transaction(STORE_META, 'readwrite');
    t.objectStore(STORE_META).put({ key: 'download_complete', value: true, timestamp: Date.now() });
    t.oncomplete = resolve;
    t.onerror = resolve;
  });

  onProgress?.({ stage: 'مکمل', percent: 100, current: 4, total: 4 });
  return verses.length;
}

// ───────── components/quran/quranCorpusCounts.js ─────────
// Counts written forms, not roots or verse search hits. Diacritics are ignored;
// attached prefixes, hamza letters, and suffixes remain separate word forms.
export function normalizeCountWord(text) {
  return (text || '').normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF]/g, '').replace(/ٱ/g, 'ا').trim();
}
export function buildCorpusCounts(data) {
  if (data?.surahs?.length !== 114 || data.surahs.reduce((n, s) => n + s.ayahs.length, 0) !== 6236) throw new Error('Complete Quran text unavailable');
  const counts = Object.create(null);
  const verses = [];
  let totalTokens = 0;
  for (const surah of data.surahs) {
    for (const ayah of surah.ayahs) {
      let tokens = normalizeCountWord(ayah.text).split(/\s+/).filter(w => /[\u0621-\u063A\u0641-\u064A\u0671]/.test(w));
      // The API prepends an unnumbered basmala to most surahs. Do not count
      // those headers, but retain 1:1 and the basmala inside 27:30.
      if (surah.number !== 1 && surah.number !== 9 && ayah.numberInSurah === 1 && tokens.slice(0, 4).join(' ') === 'بسم الله الرحمن الرحيم') tokens = tokens.slice(4);
      verses.push(` ${tokens.join(' ')} `);
      for (const word of tokens) { counts[word] = (counts[word] || 0) + 1; totalTokens++; }
    }
  }
  return { version: 1, surahs: 114, ayahs: 6236, totalTokens, counts, verses };
}
export function countCorpusWord(index, word) {
  const key = normalizeCountWord(word).replace(/\s+/g, ' ');
  if (!key.includes(' ')) return index.counts[key] || 0;
  // Dictionary phrases are counted as consecutive words within one ayah.
  let total = 0;
  const needle = ` ${key} `;
  for (const verse of index.verses) {
    let position = verse.indexOf(needle);
    while (position !== -1) { total++; position = verse.indexOf(needle, position + 1); }
  }
  return total;
}

// Prefix-aware counting for dictionary base-forms. Many Quranic words appear
// only with an attached prefix (ال, و, ف, ب, ل, ك) in the text, so an exact
// token match misses them. This sums the base form plus all common prefixed
// variants. When the base starts with alif, "ل"+word drops the alif (Quranic
// orthography: ل+الله → لله), so those alif-dropped forms are included too.
const COUNT_PREFIXES = ['', 'ال', 'و', 'ف', 'ب', 'ل', 'ك', 'وال', 'فال', 'بال', 'كال', 'لل', 'فل', 'بل', 'كل', 'ول'];
const ALIF_DROP_PREFIXES = ['ل', 'فل', 'بل', 'كل', 'ول', 'لل'];

export function countWordWithAffixes(index, word) {
  const base = normalizeCountWord(word).replace(/\s+/g, ' ');
  if (!base || base.includes(' ')) return countCorpusWord(index, word);
  const variants = new Set();
  for (const p of COUNT_PREFIXES) variants.add(p + base);
  if (base.startsWith('ا')) {
    const noAlif = base.slice(1);
    for (const p of ALIF_DROP_PREFIXES) variants.add(p + noAlif);
  }
  let total = 0;
  for (const v of variants) total += index.counts[v] || 0;
  return total;
}

// ───────── components/quran/wordCountIndex.js ─────────
const CACHE = 'quran-exact-word-counts-v1';
const KEY = '/quran-exact-word-counts-v1.json';
let pending;
export function getQuranCountIndex() {
  if (!pending) pending = loadIndex().catch(error => { pending = null; throw error; });
  return pending;
}
async function loadIndex() {
  const cache = typeof caches !== 'undefined' ? await caches.open(CACHE) : null;
  const stored = cache ? await cache.match(KEY) : null;
  if (stored) {
    const index = await stored.json();
    if (index.version === 1 && index.surahs === 114 && index.ayahs === 6236 && index.counts && index.verses) return index;
  }
  const index = buildCorpusCounts(await quranApi.getFullQuranEdition('quran-uthmani'));
  if (cache) await cache.put(KEY, new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } }));
  return index;
}
export async function getExactWordCount(word) {
  return { count: countCorpusWord(await getQuranCountIndex(), word), source: 'complete-quran', complete: true };
}

// ───────── lib/fullQuranData.js ─────────
// Full Quran Word Database — downloads, stores, and indexes every word in the Quran
// with grammar classification, translations, occurrence counts, and audio.






export { TOTAL_SURAHS, TOTAL_AYAHS, TOTAL_WORDS };

const DB_NAME_fullQuranData = 'quran-word-db';
const DB_VERSION_fullQuranData = 1;
const STORE_WORDS = 'words';
const STORE_PROGRESS = 'progress';
const STORE_COUNTS = 'wordCounts';

let dbPromise_fullQuranData = null;
let dictMap = null;

function normalizeArabic(word) {
  return (word || '')
    .replace(/[ًٌٍَُِّْـٰ]/g, '')    // strip harakat and superscript alif
    .replace(/[ٱإأآ]/g, 'ا')        // normalize alif variants to regular alif
    .replace(/ؤ/g, 'و')             // normalize waw hamza to waw
    .replace(/ئ/g, 'ي');            // normalize ya hamza to ya
}

function getDictMap() {
  if (!dictMap) {
    const dict = buildDictionary();
    dictMap = new Map();
    for (const w of dict) {
      const key = normalizeArabic(w.ar);
      if (!dictMap.has(key) || dictMap.get(key).count < w.count) {
        dictMap.set(key, w);
      }
    }
  }
  return dictMap;
}

// Direct dictionary lookup with normalized matching — works without IndexedDB
export function getDictionaryEntry(arabicWord) {
  const dict = getDictMap();
  return dict.get(normalizeArabic(arabicWord)) || null;
}

export function getDictionaryCount(arabicWord) {
  const entry = getDictionaryEntry(arabicWord);
  return entry?.count || 0;
}

// Only a complete corpus may supply a Quran-wide occurrence count.
export const getWordCount = getExactWordCount;

function openDB_fullQuranData() {
  if (dbPromise_fullQuranData) return dbPromise_fullQuranData;
  dbPromise_fullQuranData = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME_fullQuranData, DB_VERSION_fullQuranData);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_WORDS)) {
        const s = db.createObjectStore(STORE_WORDS, { keyPath: 'key' });
        s.createIndex('surah', 'surah', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        db.createObjectStore(STORE_PROGRESS, { keyPath: 'surahNumber' });
      }
      if (!db.objectStoreNames.contains(STORE_COUNTS)) {
        db.createObjectStore(STORE_COUNTS, { keyPath: 'word' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise_fullQuranData = null; reject(req.error); };
  });
  return dbPromise_fullQuranData;
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

function dbGet_fullQuranData(store, key) {
  return openDB_fullQuranData().then(db => new Promise((res) => {
    const r = tx(db, store, 'readonly').get(key);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  }));
}

function dbAllKeys(store) {
  return openDB_fullQuranData().then(db => new Promise((res) => {
    const r = tx(db, store, 'readonly').getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => res([]);
  }));
}

function dbCount_fullQuranData(store) {
  return openDB_fullQuranData().then(db => new Promise((res) => {
    const r = tx(db, store, 'readonly').count();
    r.onsuccess = () => res(r.result || 0);
    r.onerror = () => res(0);
  })).catch(() => 0);
}

// ─── Download a single surah ───
export async function downloadSurah(surahNumber, onProgress) {
  const surahMeta = SURAHS.find(s => s.number === surahNumber);
  if (!surahMeta) throw new Error('Invalid surah number');

  const allVerses = [];
  let page = 1;
  while (true) {
    const data = await quranComApi.getChapterVerses(surahNumber, page, 300, 'text_uthmani,char_type_name,audio_url,transliteration,translation');
    allVerses.push(...(data.verses || []));
    if (!data.pagination || page >= data.pagination.total_pages) break;
    page++;
  }

  // Fetch Urdu ayah-level translation from alquran.cloud (ur.ahmedali confirmed working)
  let urduAyahs = [];
  try {
    const editions = await quranApi.getSurahEditions(surahNumber, 'ur.ahmedali');
    if (Array.isArray(editions) && editions.length > 0) {
      urduAyahs = editions[0].ayahs || [];
    }
  } catch {}

  const dict = getDictMap();
  const db = await openDB_fullQuranData();
  const wordEntries = [];
  const wordCountsDelta = {}; // word -> count in this surah

  for (const verse of allVerses) {
    const words = (verse.words || []).filter(w => w.char_type_name === 'word' && w.text_uthmani);
    words.forEach((w, idx) => {
      const arabic = w.text_uthmani;
      const grammar = classifyWord(arabic, w.translation?.text || '');
      const dictEntry = dict.get(normalizeArabic(arabic));
      const key = `${surahNumber}:${verse.verse_number}:${idx}`;

      // Urdu: dictionary word-level → ayah-level fallback
      let urduTranslation = dictEntry?.ur || '';
      const urduAyah = urduAyahs[verse.verse_number - 1]?.text || '';

      wordEntries.push({
        key,
        surah: surahNumber,
        ayah: verse.verse_number,
        wordIndex: idx,
        arabic,
        transliteration: w.transliteration?.text || '',
        audioUrl: w.audio_url ? wordAudioUrl(w.audio_url) : '',
        englishTranslation: w.translation?.text || '',
        urduTranslation,
        urduAyah,
        grammarType: grammar.type,
        grammarSubType: grammar.subType || '',
        root: dictEntry?.root || '',
        derivatives: dictEntry?.derivatives || '',
        dictCount: dictEntry?.count || 0,
      });

      wordCountsDelta[arabic] = (wordCountsDelta[arabic] || 0) + 1;
    });
  }

  // Delete old words for this surah, then insert new ones
  await new Promise((resolve, reject) => {
    const t = db.transaction([STORE_WORDS, STORE_PROGRESS, STORE_COUNTS], 'readwrite');
    const wordsStore = t.objectStore(STORE_WORDS);
    const idx = wordsStore.index('surah');
    const cursorReq = idx.openCursor(IDBKeyRange.only(surahNumber));
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    cursorReq.onerror = () => reject(cursorReq.error);

    // Insert new words
    for (const w of wordEntries) wordsStore.put(w);

    // Update progress
    t.objectStore(STORE_PROGRESS).put({
      surahNumber,
      surahName: surahMeta.name,
      surahNameEn: surahMeta.englishName,
      totalAyahs: allVerses.length,
      totalWords: wordEntries.length,
      verified: true,
      downloadedAt: new Date().toISOString(),
    });

    // Update word counts: subtract old, add new
    const countsStore = t.objectStore(STORE_COUNTS);
    // Get old words for this surah to subtract
    const oldWords = [];
    const oldCursorReq = idx.openCursor(IDBKeyRange.only(surahNumber));
    // Actually we already deleted them, so we can't get old words.
    // Simpler: just add the new counts. For re-downloads, we need to handle this.
    // For now, just add the new counts to existing.
    for (const [word, count] of Object.entries(wordCountsDelta)) {
      const getReq = countsStore.get(word);
      // We'll update in a separate pass after the transaction
    }

    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });

  // Update word counts in a separate transaction
  await new Promise((resolve) => {
    const t = db.transaction(STORE_COUNTS, 'readwrite');
    const countsStore = t.objectStore(STORE_COUNTS);
    for (const [word, count] of Object.entries(wordCountsDelta)) {
      const getReq = countsStore.get(word);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        countsStore.put({ word, count: (existing?.count || 0) + count });
      };
    }
    t.oncomplete = resolve;
    t.onerror = resolve;
  });

  onProgress?.({ surah: surahNumber, ayahs: allVerses.length, words: wordEntries.length });
  return { surahNumber, ayahs: allVerses.length, words: wordEntries.length };
}

// ─── Download all surahs ───
export async function downloadAllQuran(onProgress) {
  const results = [];
  for (let i = 0; i < SURAHS.length; i++) {
    const surah = SURAHS[i];
    try {
      onProgress?.({ currentSurah: i + 1, totalSurahs: SURAHS.length, surahName: surah.name });
      const result = await downloadSurah(surah.number);
      results.push(result);
      // Small delay to avoid rate limiting
      if (i < SURAHS.length - 1) await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`Failed surah ${surah.number}:`, e);
      onProgress?.({ error: surah.number });
    }
  }
  onProgress?.({ done: true });
  return results;
}

// ─── Progress ───
export async function getOverallProgress() {
  const allProgress = await dbAllKeys(STORE_PROGRESS);
  const totalWords = await dbCount_fullQuranData(STORE_WORDS);
  const downloadedSurahs = allProgress.length;
  const downloadedAyahs = allProgress.reduce((s, p) => s + (p.totalAyahs || 0), 0);
  const verifiedSurahs = allProgress.filter(p => p.verified).length;
  return {
    totalSurahs: TOTAL_SURAHS,
    downloadedSurahs,
    verifiedSurahs,
    totalAyahs: TOTAL_AYAHS,
    downloadedAyahs,
    totalWords: TOTAL_WORDS,
    downloadedWords: totalWords,
    surahProgress: allProgress,
    percent: Math.round((downloadedSurahs / TOTAL_SURAHS) * 100),
  };
}

export async function isSurahDownloaded(surahNumber) {
  const p = await dbGet_fullQuranData(STORE_PROGRESS, surahNumber);
  return !!p?.verified;
}

export async function getSurahProgress(surahNumber) {
  return dbGet_fullQuranData(STORE_PROGRESS, surahNumber);
}

// ─── Word lookup ───
export async function getWordData(surah, ayah, wordIndex) {
  const key = `${surah}:${ayah}:${wordIndex}`;
  return dbGet_fullQuranData(STORE_WORDS, key);
}

export async function getWordOccurrenceCount(arabicWord) {
  return (await getExactWordCount(arabicWord)).count;
}

export async function searchWords(query, limit = 50) {
  const all = await dbAllKeys(STORE_WORDS);
  const q = query.trim().toLowerCase();
  return all.filter(w =>
    w.arabic.includes(query.trim()) ||
    (w.urduTranslation || '').toLowerCase().includes(q) ||
    (w.englishTranslation || '').toLowerCase().includes(q)
  ).slice(0, limit);
}

export async function getSurahWords(surahNumber) {
  const all = await dbAllKeys(STORE_WORDS);
  return all.filter(w => w.surah === surahNumber).sort((a, b) => a.ayah - b.ayah || a.wordIndex - b.wordIndex);
}

// ───────── lib/quranFallback.js ─────────
// Offline Quran analysis using free APIs + database — works without AI credits.
// Provides tafsir from: database (Arabic Muyassar), alquran.cloud (Jalalayn), quran.com (Ibn Kathir).
// Everything is cached in localStorage for instant offline access on repeat visits.







// Fetch tafsir from our database (Arabic Muyassar — 5000 records)
async function getDbTafsirs(surah, ayah) {
  try {
    return await backend.entities.Tafsir.filter({ surah: Number(surah), ayah: Number(ayah) }, '-created_date', 5);
  } catch { return []; }
}

// Fetch Tafsir al-Jalalayn (Arabic) from alquran.cloud
async function getJalalayn(verseKey) {
  try {
    const data = await quranApi.getAyahEdition(verseKey, 'ar.jalalayn');
    return data?.text || null;
  } catch { return null; }
}

// Fetch Ibn Kathir tafsir (English) from quran.com — often includes context of revelation
async function getIbnKathir(verseKey) {
  try {
    const v = await quranComApi.getVerseTafsir(verseKey);
    let text = v?.tafsirs?.[0]?.text;
    if (!text) {
      // Retry without fields param (some verses need different API format)
      const v2 = await quranComApi.getVerseTafsir(verseKey, 'ibn_kathir', 'tafsirs');
      text = v2?.tafsirs?.[0]?.text;
    }
    return text || null;
  } catch { return null; }
}

// Strip HTML tags from tafsir text
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<h[1-6][^>]*>/g, '\n\n')
    .replace(/<\/h[1-6]>/g, '\n')
    .replace(/<p[^>]*>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extract شان نزول (occasion of revelation) from Ibn Kathir tafsir text.
// Ibn Kathir typically discusses the context of revelation near the beginning.
function extractShanNuzool(ibnKathirText) {
  if (!ibnKathirText) return null;
  const plain = stripHtml(ibnKathirText);
  if (!plain) return null;

  // Look for keywords indicating occasion of revelation
  const markers = [
    /(occasion|context|reason|cause)\s+of\s+revelation/i,
    /revealed\s+(when|because|after|in\s+response)/i,
    /this\s+verse\s+was\s+revealed/i,
    /asbab\s+al-nuzul/i,
    /circumstances?\s+of\s+revelation/i,
  ];

  // Look for Makkah/Medinah revelation context
  const revelationMarkers = [
    ...markers,
    /revealed\s+in\s+(makkah|medina|mecca|medinah)/i,
    /(this\s+surah|this\s+chapter)\s+(was\s+)?revealed/i,
  ];

  // Find the first paragraph containing a revelation marker
  const paragraphs = plain.split(/\n\n+/).filter(p => p.trim().length > 20);
  for (const marker of revelationMarkers) {
    const found = paragraphs.find(p => marker.test(p));
    if (found) return found.trim();
  }

  // Fallback: use the first substantial paragraph (Ibn Kathir intros often give context)
  if (paragraphs.length > 0) return paragraphs[0].trim();
  // Last resort: first 300 chars of stripped text
  return plain.substring(0, 300).trim() || null;
}

// Fetch word-level English translations from quran.com (fallback when AI Urdu translations unavailable)
async function getWordTranslations(verseKey) {
  const clean = (v) => (v?.words || []).filter(w => w.char_type_name === 'word');
  const [en, ur] = await Promise.all([
    quranComApi.getVerseWordTranslations(verseKey, 'en').catch(() => null),
    quranComApi.getVerseWordTranslations(verseKey, 'ur').catch(() => null),
  ]);
  const enWords = clean(en), urWords = clean(ur);
  const base = enWords.length ? enWords : urWords;
  return base.map((w, i) => {
    const urText = urWords[i]?.translation;
    // quran.com returns the English text again when no Urdu word translation exists — only keep real Urdu.
    const urdu = urText && /[\u0600-\u06FF]/.test(urText.text || '') ? urText.text : '';
    return {
      arabic: w.text_uthmani,
      translation: enWords[i]?.translation?.text || '',
      urdu,
      transliteration: w.transliteration?.text || '',
    };
  });
}

// Main: get offline analysis for a verse — fast, no AI credits needed.
export async function getOfflineAnalysis(verseKey, surah, ayah) {
  // Static data for Surah Al-Fatihah — instant, complete, offline
  if (isFatihah(surah)) {
    const staticData = getFatihahAnalysis(Number(ayah));
    if (staticData) {
      setCachedAnalysis(verseKey, staticData);
      return staticData;
    }
  }

  const cached = getCachedAnalysis(verseKey);
  if (cached) {
    // If cached data is missing shanNuzool, try to extract it from Ibn Kathir
    if (!cached.shanNuzool) {
      try {
        const ibnKathir = await getIbnKathir(verseKey);
        if (ibnKathir) {
          const shan = extractShanNuzool(ibnKathir);
          if (shan) {
            cached.shanNuzool = shan;
            setCachedAnalysis(verseKey, cached);
          }
        }
      } catch {}
    }
    return cached;
  }

  const [dbTafsirs, jalalayn, ibnKathir, wordTrans] = await Promise.all([
    getDbTafsirs(surah, ayah),
    getJalalayn(verseKey),
    getIbnKathir(verseKey),
    getWordTranslations(verseKey),
  ]);

  const result = {
    tafsirSources: [],
    tafsirUrdu: null,
    tafsirSource: null,
    shanNuzool: null,
    wordMeta: [],
  };

  // Database tafsirs (Arabic Muyassar — concise, widely understood by Urdu speakers)
  if (dbTafsirs?.length) {
    dbTafsirs.forEach(t => {
      if (t.text) result.tafsirSources.push({ language: t.language || 'ar', author: t.author || 'Tafsir al-Muyassar', text: t.text });
    });
    if (!result.tafsirUrdu && dbTafsirs[0]?.text) {
      result.tafsirUrdu = dbTafsirs[0].text;
      result.tafsirSource = dbTafsirs[0].author || 'Tafsir al-Muyassar';
    }
  }

  // Jalalayn (Arabic)
  if (jalalayn) {
    result.tafsirSources.push({ language: 'ar', author: 'Tafsir al-Jalalayn', text: jalalayn });
    if (!result.tafsirUrdu) {
      result.tafsirUrdu = jalalayn;
      result.tafsirSource = 'Tafsir al-Jalalayn';
    }
  }

  // Ibn Kathir (English) — often contains context of revelation
  if (ibnKathir) {
    const plainIbnKathir = stripHtml(ibnKathir);
    result.tafsirSources.push({ language: 'en', author: 'Tafsir Ibn Kathir', text: plainIbnKathir || ibnKathir });
    if (!result.tafsirUrdu) {
      result.tafsirUrdu = plainIbnKathir || ibnKathir;
      result.tafsirSource = 'Tafsir Ibn Kathir (English)';
    }
    // Extract شان نزول from Ibn Kathir (revelation context)
    const shan = extractShanNuzool(ibnKathir);
    if (shan) result.shanNuzool = shan;
  }

  // Word-level translations (English fallback when AI Urdu unavailable)
  // Detect grammatical category from word text for color coding
  if (wordTrans?.length) {
    // Urdu meaning priority: curated dictionary → quran.com Urdu word translation → (English shown & labelled by the UI)
    result.wordMeta = wordTrans.map(w => {
      const dict = lookupDictionaryWord(w.arabic);
      return {
        partOfSpeech: '—',
        category: detectCategory(w.arabic),
        urduTranslation: dict?.ur || w.urdu || '',
        englishTranslation: w.translation || dict?.en || '',
        root: '—',
        quranCount: dict?.count || 0,
      };
    });
  }

  if (result.tafsirUrdu || result.wordMeta.length) {
    setCachedAnalysis(verseKey, result);
  }
  return result;
}

// Preload a verse's words + offline analysis in background (fire-and-forget).
// Call this for the NEXT verse so it's instant when the user navigates.
export function preloadVerse(surah, ayah) {
  if (!surah || !ayah || ayah < 1) return;
  const verseKey = `${surah}:${ayah}`;

  // Preload words if not cached
  if (!getCachedWords(verseKey)) {
    quranComApi.getVerseWords(verseKey)
      .then(v => {
        const ws = (v?.words || [])
          .filter(w => w.char_type_name === 'word' && w.audio_url)
          .map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url), transliteration: (w.transliteration && w.transliteration.text) || '' }));
        if (ws.length) {
          setCachedWords(verseKey, ws);
          if (v.page_number) setCachedPage(verseKey, v.page_number);
        }
      })
      .catch(() => {});
  }

  // Preload offline analysis if not cached
  if (!getCachedAnalysis(verseKey)) {
    getOfflineAnalysis(verseKey, surah, ayah).catch(() => {});
  }
}

// ───────── lib/relatedContent.js ─────────
// Related content — Concept-based matching for Quranic ayahs and Hadiths.
// Detects the thematic concept of a verse from its translation (English + Urdu),
// then returns curated verses and hadiths on the same concept with Urdu translations.
// Matching is concept-based (مطلب) not word-based — different expressions for the
// same concept (قیامت، جزا و سزا کا دن، یوم اخرت، حساب کا دن، دنیا کا فنا…) all map to one topic.



const AYAH_CACHE_PREFIX = 'topic-ayahs-v3-';
const HADITH_CACHE_PREFIX = 'topic-hadiths-v3-';

// ─── Concept Topics ───
// Each topic has: English concept keywords, Urdu/Arabic concept keywords,
// curated verse refs, and Bukhari hadith numbers.
export const TOPICS = [
  {
    id: 'tawheed', label: 'توحید',
    en: ['god', 'lord', 'worship', 'deity', 'alone', 'partner', 'associate', 'divinity', 'creator', 'sustain',
      'one god', 'none but', 'no god but', 'only', 'unity', 'oneness', 'monotheism', 'beside', 'besides',
      'other than', 'equal', 'compeer', 'rival', 'beget', 'begotten', 'son of god', 'sustainer', 'provider',
      'cherisher', 'sovereign', 'master', 'owner', 'possessor', 'eternal', 'everlasting', 'first and last'],
    ur: ['اللہ', 'خدا', 'رب', 'عبادت', 'توحید', 'اک', 'ایک', 'شریک', 'بے شریک', 'لاشریک', 'معبود', 'پروردگار',
      'خالق', 'رزق دینے', 'حاکم', 'مالک', 'بندگی', 'اکا', 'اکہ', 'نہیں ہے', 'اس کے سوا'],
    ayahs: [{ s: 2, a: 255 }, { s: 112, a: 1 }, { s: 47, a: 19 }, { s: 3, a: 2 }, { s: 20, a: 14 }],
    hadiths: [7377, 7378, 7379],
  },
  {
    id: 'salah', label: 'نماز',
    en: ['prayer', 'pray', 'prostrate', 'bow', 'salat', 'establish prayer', 'mosque', 'worship',
      'ablution', 'wudu', 'call to prayer', 'adhan', 'iqama', 'congregation', 'jumuah', 'friday',
      'kneel', 'sujud', 'ruku', 'qiyam', 'qibla', 'kaaba'],
    ur: ['نماز', 'عبادت', 'سجدہ', 'رکوع', 'قیام', 'قاعدہ', 'وضو', 'آذان', 'اقامت', 'جماعت',
      'مسجد', 'قبلہ', 'کعبہ', 'جمعہ', 'پنجگانہ', 'صلوٰۃ', 'صلوۃ', 'مصلین', 'نمازی'],
    ayahs: [{ s: 2, a: 3 }, { s: 29, a: 45 }, { s: 11, a: 114 }, { s: 70, a: 22 }, { s: 107, a: 4 }],
    hadiths: [8, 9, 10, 523, 524],
  },
  {
    id: 'zakat', label: 'زکوٰۃ و صدقہ',
    en: ['charity', 'poor', 'needy', 'zakat', 'alms', 'spend', 'wealth', 'orphan', 'destitute',
      'give', 'donate', 'generous', 'generosity', 'sadaqah', 'beggar', 'miser', 'stingy', 'hoard'],
    ur: ['زکوٰۃ', 'زکوۃ', 'صدقہ', 'خیرات', 'دینا', 'فقیروں', 'غریبوں', 'یتیم', 'محتاج',
      'سخاوت', 'بخیل', 'کنجوس', 'مال خرچ', 'انفاق', 'بخشش', 'عطیا', 'دات', 'نیکی'],
    ayahs: [{ s: 2, a: 43 }, { s: 2, a: 177 }, { s: 107, a: 1 }, { s: 2, a: 271 }, { s: 63, a: 10 }],
    hadiths: [1410, 1411, 1412, 1413, 1414],
  },
  {
    id: 'patience', label: 'صبر',
    en: ['patient', 'patience', 'persevere', 'steadfast', 'endure', 'trial', 'hardship', 'affliction',
      'suffer', 'suffering', 'bear', 'withstand', 'firm', 'resolve', 'calamity', 'distress', 'adversity'],
    ur: ['صبر', 'ضرب', 'استقامت', 'مصیبت', 'آزمائش', 'مشکل', 'تکلیف', 'برداشت', 'ثابت قدم',
      'سہنا', 'جھیلنا', 'استقامت', 'ٹھہرنا', 'دکھ', 'غمی', 'پریشانی', 'صابر'],
    ayahs: [{ s: 2, a: 153 }, { s: 94, a: 5 }, { s: 39, a: 10 }, { s: 31, a: 17 }, { s: 2, a: 155 }],
    hadiths: [5690, 5691, 5692, 5693, 5694],
  },
  {
    id: 'mercy', label: 'رحمت',
    en: ['mercy', 'merciful', 'compassionate', 'kindness', 'kind', 'forgiving', 'pardon',
      'grace', 'favor', 'blessing', 'benevolent', 'tender', 'gentle', 'loving', 'affection'],
    ur: ['رحمت', 'رحم', 'مہربان', 'کریم', 'شفق', 'نرمی', 'بخشش', 'فضل', 'احسان', 'مہربانی',
      'رحم دل', 'ترس', 'کرم', 'عطا', 'بخشنا', 'معاف'],
    ayahs: [{ s: 7, a: 56 }, { s: 17, a: 87 }, { s: 6, a: 54 }, { s: 39, a: 53 }, { s: 2, a: 143 }],
    hadiths: [7556, 7557, 7558, 7559, 7560],
  },
  {
    id: 'knowledge', label: 'علم',
    en: ['knowledge', 'know', 'learn', 'wisdom', 'understand', 'wise', 'teach', 'reflect',
      'ponder', 'think', 'contemplate', 'study', 'scholar', 'learned', 'ignorance', 'ignorant'],
    ur: ['علم', 'جاننا', 'سیکھنا', 'حکمت', 'سمجھ', 'عقل', 'فکر', 'غور', 'تدبر', 'مطالعہ',
      'عالم', 'جاہل', 'جانکاری', 'معرفت', 'دانش', 'فقیہ', 'مفکر'],
    ayahs: [{ s: 58, a: 11 }, { s: 39, a: 9 }, { s: 20, a: 114 }, { s: 96, a: 1 }, { s: 2, a: 269 }],
    hadiths: [71, 72, 73, 74, 75],
  },
  {
    id: 'faith', label: 'ایمان',
    en: ['believe', 'faith', 'believer', 'trust in', 'submit', 'devout', 'pious', 'righteous',
      'godfearing', 'convinced', 'certainty', 'conviction', 'surrender', 'devotion'],
    ur: ['ایمان', 'مومن', 'مومنہ', 'یقین', 'تسلیم', 'نیک', 'پرہیزگار', 'متقی', 'بندگ',
      'بندگی', 'وفادار', 'سچا', 'دل سے', 'اعتقاد', 'تصدیق'],
    ayahs: [{ s: 2, a: 62 }, { s: 49, a: 15 }, { s: 3, a: 8 }, { s: 8, a: 2 }, { s: 2, a: 285 }],
    hadiths: [6010, 6011, 6012, 6013, 6014],
  },
  {
    id: 'repentance', label: 'توبہ و بخشش',
    en: ['repent', 'repentance', 'forgive', 'forgiveness', 'sin', 'turn back', 'despair',
      'pardon', 'absolve', 'atonement', 'remorse', 'regret', 'seek forgiveness', 'wrongdoer'],
    ur: ['توبہ', 'معافی', 'بخشش', 'گناہ', 'رجوع', 'ناامید', 'پشیمانی', 'افسوس', 'استغفار',
      'خطا', 'جرم', 'عفو', 'درگزر', 'چھوڑنا', 'بخشنا', 'توبہ دار'],
    ayahs: [{ s: 2, a: 222 }, { s: 39, a: 53 }, { s: 25, a: 70 }, { s: 66, a: 8 }, { s: 4, a: 17 }],
    hadiths: [7501, 7502, 7503, 7504, 7505],
  },
  {
    id: 'gratitude', label: 'شکر',
    en: ['grateful', 'gratitude', 'thank', 'thankful', 'blessing', 'appreciate', 'acknowledge',
      'ungrateful', 'deny', 'deny the favor', 'bounties', 'bestowed', 'gift', 'granted'],
    ur: ['شکر', 'شکرگزار', 'احسان', 'نعمت', 'بخشش', 'ناشکری', 'ناشکر', 'منکر', 'عطا',
      'دیا', 'بہت بھلا', 'احسان ماننا', 'شکر ادا'],
    ayahs: [{ s: 2, a: 152 }, { s: 14, a: 7 }, { s: 31, a: 12 }, { s: 76, a: 3 }, { s: 2, a: 172 }],
    hadiths: [7563, 7564, 7565, 7566, 7567],
  },
  {
    id: 'creation', label: 'مخلوقات و نشانیاں',
    en: ['create', 'creation', 'heavens', 'earth', 'universe', 'nature', 'signs', 'origin',
      'sky', 'skies', 'mountains', 'rivers', 'sea', 'sun', 'moon', 'stars', 'night', 'day',
      'rain', 'vegetation', 'plants', 'animals', 'cattle', 'cosmos', 'galaxy'],
    ur: ['مخلوق', 'خلق', 'آسمان', 'زمین', 'زمیں', 'کائنات', 'نشانی', 'آیت', 'کرتوب',
      'پہاڑ', 'ندی', 'سمندر', 'سورج', 'چاند', 'تارے', 'رات', 'دن', 'بارش', 'پودے', 'جانور'],
    ayahs: [{ s: 7, a: 185 }, { s: 3, a: 190 }, { s: 21, a: 30 }, { s: 2, a: 164 }, { s: 45, a: 3 }],
    hadiths: [3190, 3191, 3192, 3193, 3194],
  },
  {
    id: 'prophethood', label: 'نبوت و رسالت',
    en: ['prophet', 'messenger', 'apostle', 'revelation', 'reveal', 'inspire', 'guidance',
      'scripture', 'book', 'torah', 'gospel', 'psalms', 'quran', 'send', 'commissioned', 'warner',
      'glad tidings', 'nabi', 'rasul', 'muhammad', 'moses', 'jesus', 'abraham', 'noah'],
    ur: ['نبی', 'رسول', 'پیغمبر', 'پغمبر', 'وحی', 'نزول', 'ہدایت', 'کتاب', 'تورات', 'انجیل',
      'زبور', 'قرآن', 'بھیجا', 'مبعوث', 'متذکر', 'بشارت', 'محمد', 'موسیٰ', 'عیسیٰ', 'ابراہیم', 'نوح'],
    ayahs: [{ s: 33, a: 40 }, { s: 3, a: 144 }, { s: 19, a: 51 }, { s: 2, a: 136 }, { s: 42, a: 13 }],
    hadiths: [6090, 6091, 6092, 6093, 6094],
  },
  {
    id: 'resurrection', label: 'بعث و حشر',
    en: ['resurrection', 'resurrect', 'raise from', 'raise the dead', 'recreate', 'bones',
      'scattered', 'dust', 'gather', 'gathering', 'assembly', 'stand before', 'meeting',
      'trumpet', 'blast', 'blown', 'the hour', 'reckoning', 'account', 'questioned',
      'answer', 'record', 'book of deeds', 'scroll', 'scale', 'balance', 'weigh',
      'intercession', 'intercede', 'recompense', 'reward', 'punishment', 'final return',
      'return to', 'day of judgment', 'last day', 'doom', 'destruction', 'destroy',
      'end of world', 'afterlife', 'abode', 'dwelling', 'eternal', 'eternity', 'forever',
      'good deed', 'evil deed', 'earned', 'wage', 'paid', 'wronged', 'oppressor',
      'arrogant', 'cast', 'thrown', 'dragged', 'seized', 'bound', 'chained', 'driven',
      'herded', 'assembled', 'rows', 'ranks', 'terrified', 'dread', 'terror', 'horror',
      'flee', 'refuge', 'witness', 'testify', 'burden', 'bearer', 'heavy', 'load',
      'stagger', 'crush', 'snap', 'spine', 'faint', 'panic', 'frightful', 'awful',
      'dreadful', 'terrible', 'horrible', 'calamity', 'catastrophe', 'disaster',
      'cataclysm', 'apocalypse', 'end times', 'last hour', 'reality', 'event',
      'overwhelming', 'striking', 'decree', 'destined', 'life of this world',
      'worldly life', 'amusement', 'play', 'pastime', 'deception', 'illusion',
      'fleeting', 'temporary', 'provision', 'carry', 'sin', 'laden', 'loaded',
      'wish', 'return', 'ransom', 'redeem', 'worthless', 'vain', 'no avail'],
    ur: ['بعث', 'حشر', 'نشر', 'قیامت', 'قیام', 'یوم قیام', 'حساب', 'حساب کتاب', 'جزا',
      'سزا', 'جزا و سزا', 'روز جزا', 'یوم الدین', 'دین کا دن', 'صور', 'نفخ صور', 'پھر زندہ',
      'دوبارہ پیدا', 'ہڈیاں', 'گرد', 'جمع ہونا', 'حاضر ہونا', 'کھڑا ہونا', 'نامہ اعمال',
      'کتاب', 'ترازو', 'میزان', 'پل صراط', 'صراط', 'شفاعت', 'شفیع', 'اجرت', 'پورا',
      'ظلم', 'ظالم', 'تکبر', 'پھینکا', 'گھسیٹا', 'پکڑا', 'باندھا', 'زنجیر', 'ہانکا',
      'قطار', 'خوف', 'دہشت', 'بھاگنا', 'پناہ', 'گواہ', 'گواہی', 'پوچھا', 'جواب', 'بوجھ',
      'بوجھ اٹھانا', 'گرا', 'لڑکھڑا', 'بے ہوش', 'خوف ناک', 'ہولناک', 'بھیانک', 'تباہی',
      'آفت', 'حقیقت', 'واقعہ', 'تقدیر', 'لکھا', 'دنیا کی زندگی', 'دنیاوی زندگی', 'تفریح',
      'کھیل', 'دھوکہ', 'فانی', 'عارضی', 'سامان', 'اٹھانا', 'کاش', 'واپس', 'فدیہ',
      'بے کار', 'فضول', 'دنیا کا خاتمہ', 'دنیا کا فنا', 'فنا', 'فنا ہونا'],
    ayahs: [{ s: 22, a: 1 }, { s: 22, a: 7 }, { s: 75, a: 1 }, { s: 75, a: 3 }, { s: 36, a: 78 }, { s: 80, a: 21 }, { s: 99, a: 1 }],
    hadiths: [6522, 6523, 6524, 6525, 6526],
  },
  {
    id: 'jannah', label: 'جنت و نعیم',
    en: ['paradise', 'heaven', 'garden', 'gardens', 'bliss', 'delight', 'rivers', 'springs',
      'fruits', 'shade', 'throne', 'couches', 'reclining', 'houri', 'companions',
      'pure', 'spotless', 'dwellers', 'abode of peace', 'firdaus', 'eden', 'reward of the righteous',
      'enter paradise', 'enter garden', 'eternal life', 'pleasure of allah',
      'good news', 'glad tidings', 'success', 'triumphant', 'winners', 'inheritors',
      'no fear', 'no grief', 'no sorrow', 'content', 'satisfied', 'coolness',
      'radiant', 'joyful', 'honored', 'blessed', 'bounty', 'favor', 'generous reward'],
    ur: ['جنت', 'بہشت', 'باغ', 'فردوس', 'عدن', 'نعیم', 'راحت', 'خوشی', 'نہریں', 'چشمے',
      'پھل', 'سایہ', 'عرش', 'مسند', 'تکیتے', 'حور', 'حوریں', 'پاک', 'بے داغ', 'نیک',
      'بہشت کے لوگ', 'دارالسلام', 'دارالسلام', 'بہشت میں داخل', 'اجرت', 'انعام',
      'فضل', 'بخشش', 'نعمت', 'خوشخبری', 'بشارت', 'کامیاب', 'فلاح', 'نہ ڈر', 'نہ غم',
      'نہ افسوس', 'خوش', 'راضی', 'خنکی', 'روشن', 'عزت', 'مبارک', 'سعادت'],
    ayahs: [{ s: 2, a: 25 }, { s: 3, a: 15 }, { s: 47, a: 15 }, { s: 55, a: 46 }, { s: 56, a: 12 }, { s: 76, a: 12 }, { s: 88, a: 8 }],
    hadiths: [3244, 3245, 3246, 3247, 3248],
  },
  {
    id: 'jahannam', label: 'جہنم و عذاب',
    en: ['hell', 'hellfire', 'fire', 'blazing', 'furnace', 'torment', 'agony', 'punishment',
      'scorching', 'heat', 'burning', 'boiling', 'drink', 'thirst', 'hunger', 'food',
      'tree', 'zaqqum', 'bitter', 'foul', 'pus', 'sweat', 'dark', 'dungeon', 'pit',
      'abyss', 'fuel', 'sparks', 'embers', 'coals', 'flame', 'consumed', 'engulfing',
      'drowning', 'choking', 'crying', 'wailing', 'grief', 'sorrow', 'regret', 'remorse',
      'wrongdoer', 'disbeliever', 'rejecter', 'arrogant', 'punished', 'chastised',
      'driven', 'herded', 'chained', 'bound', 'seized', 'dragged', 'cast into',
      'thrown into', 'fuel for the fire', 'companions of the fire', 'companions of the blaze',
      'dwelling in hell', 'abode of fire', 'evil destination', 'miserable', 'wretched'],
    ur: ['جہنم', 'دوزخ', 'آگ', 'آتش', 'تپتا', 'عذاب', 'تکلیف', 'جھلسا', 'تپش', 'ابالنا',
      'پیاس', 'بھوک', 'کھانا', 'درخت', 'زقوم', 'تلخ', 'میٹھا', 'پیپ', 'پسینہ', 'اندھیرا',
      'گڑھا', 'گہرا', 'ایندھن', 'چنگاری', 'انگارا', 'شعلہ', 'نگلا', 'ڈوبنا', 'گھٹنا',
      'رونا', 'چیخنا', 'افسوس', 'پشیمانی', 'ظالم', 'کافر', 'نہ ماننے والا', 'متکبر',
      'سزا', 'عذاب', 'باندھا', 'زنجیر', 'پکڑا', 'گھسیٹا', 'پھینکا', 'آگ کا ایندھن',
      'آگ کے ساتھی', 'آگ کا ٹھکانہ', 'برا ٹھکانہ', 'بدبخت', 'خراب'],
    ayahs: [{ s: 2, a: 24 }, { s: 4, a: 56 }, { s: 22, a: 19 }, { s: 56, a: 41 }, { s: 67, a: 7 }, { s: 74, a: 26 }, { s: 78, a: 21 }],
    hadiths: [3245, 605, 606, 607, 608],
  },
  {
    id: 'signs_hour', label: 'قیامت کی نشانیاں',
    en: ['sign of the hour', 'signs of the end', 'sign of the day', 'portents', 'omens',
      'end times', 'last hour', 'the hour is coming', 'unknown hour', 'sudden', 'unexpected',
      'when will it be', 'dajjal', 'antichrist', 'mahdi', 'descent of jesus', 'return of jesus',
      'sun rising from west', 'smoke', 'beast', 'moon split', 'earthquake', 'eclipse',
      'knowledge taken away', 'ignorance', 'widespread', 'tall buildings', 'competition',
      'ornate mosques', 'time passes quickly', 'tribulations', 'trials', 'fitnah', 'turmoil',
      'killing', 'wars', 'gog and magog', 'yajuj majuj'],
    ur: ['قیامت کی نشانیاں', 'قیامت کے نزدیک', 'قیامت قریب', 'آخر زمانہ', 'آخری زمانہ',
      'نشانی', 'علامت', 'دجال', 'مہدی', 'عیسیٰ کا نزول', 'سورج مغرب سے', 'دھواں', 'دابہ',
      'چاند پھٹنا', 'زلزلہ', 'گرہن', 'علم اٹھا لیا', 'جاہلیت', 'پھیلنا', 'اونچی عمارتیں',
      'مسجدوں کی آرائش', 'وقت تیز', 'فتنے', 'آزمائش', 'فساد', 'قتل', 'جنگیں', 'یاجوج ماجوج'],
    ayahs: [{ s: 47, a: 18 }, { s: 7, a: 187 }, { s: 33, a: 63 }, { s: 43, a: 61 }, { s: 6, a: 158 }, { s: 79, a: 42 }],
    hadiths: [6501, 6502, 6503, 6504, 6505],
  },
  {
    id: 'barzakh', label: 'برزخ و قبر',
    en: ['barzakh', 'barrier', 'intermediate', 'grave', 'tomb', 'burial', 'after death',
      'soul after death', 'torment of the grave', 'bliss of the grave', 'munkar nakir',
      'questioning in the grave', 'life of the grave', 'until the day they are resurrected',
      'behind a barrier', 'partition', 'departed', 'pass away', 'expire', 'perish',
      'mortal', 'appointed term', 'fixed term', 'when their term comes', 'delayed',
      'cannot return', 'cannot go back', 'cannot be sent back'],
    ur: ['برزخ', 'حائل', 'آڑ', 'قبر', 'کفن', 'دفن', 'موت کے بعد', 'موت کے بعد جان',
      'عذاب قبر', 'نعیم قبر', 'منکر نکیر', 'قبر میں سوال', 'قبر کی زندگی', 'بعث تک',
      'اڑتے', 'فوت', 'وفات', 'اجل', 'وقت مقررہ', 'جب ان کا وقت آئے', 'واپس نہیں',
      'واپس نہیں بھیجا جا', 'لوٹ نہیں سکتے'],
    ayahs: [{ s: 23, a: 100 }, { s: 40, a: 46 }, { s: 36, a: 26 }, { s: 56, a: 60 }, { s: 63, a: 10 }, { s: 3, a: 169 }],
    hadiths: [1372, 1373, 1374, 1375, 1376],
  },
  {
    id: 'modesty', label: 'حیا و پردہ',
    en: ['modesty', 'hijab', 'veil', 'cover', 'covering', 'chastity', 'lower the gaze',
      'guard the private parts', 'guard modesty', 'conceal', 'wrap', 'cloak', 'outer garment',
      'jilbab', 'khimar', 'adorn', 'adornment', 'beautify', 'display', 'show off',
      'attract attention', 'seductive', 'provocative', 'nakedness', 'awrah', 'shame',
      'bashful', 'decent', 'decently', 'privacy', 'private', 'intermingling',
      'mixing', 'seclusion', 'khalwa', 'looking', 'gaze', 'glance', 'lewd', 'indecency',
      'fornication', 'adultery', 'zina', 'promiscuity', 'immorality', 'obscenity'],
    ur: ['حیا', 'پردہ', 'حجاب', 'نقاب', 'برقع', 'چادر', 'عفت', 'پاک دامنی', 'نگاہ نیچی',
      'نگاہ بچانا', 'غیرت', 'شرم', 'شرمیلا', 'سینہ', 'زینت', 'آرائش', 'دکھانا', 'دکھاوا',
      'بے حیائی', 'بے شرمی', 'برہنگی', 'عورت', 'خواتین', 'ملاپ', 'خلوت', 'نگاہ', 'دید',
      'فحش', 'بدکاری', 'زنا', 'بے عفتی', 'غیر اخلاقی', 'ریا کاری'],
    ayahs: [{ s: 24, a: 30 }, { s: 24, a: 31 }, { s: 33, a: 59 }, { s: 7, a: 26 }, { s: 24, a: 60 }, { s: 17, a: 32 }],
    hadiths: [5557, 5558, 5559, 5560, 5561],
  },
  {
    id: 'backbiting', label: 'غیبت و تہمت',
    en: ['backbiting', 'backbite', 'slander', 'slanderer', 'gossip', 'rumor', 'tale-bearing',
      'talebearer', 'mockery', 'mock', 'ridicule', 'insult', 'defame', 'name-calling',
      'offensive name', 'sneer', 'scoff', 'taunt', 'caricature', 'satirize', 'scandal',
      'whisper', 'whisperer', 'murmur', 'complain', 'fault-finding', 'fault-finder',
      'spying', 'spy', 'investigate', 'pry', 'snoop', 'eavesdrop', 'suspicion',
      'suspect', 'bad thoughts', 'assume the worst'],
    ur: ['غیبت', 'تہمت', 'بہتان', 'چغل خوری', 'چغل', 'مذاق', 'مذاق اڑانا', 'طعنہ',
      'بدنام', 'برا نام', 'ستا', 'چپکے', 'گوشمال', 'شکوہ', 'عیب جوئی', 'جاسوسی',
      'جاسوس', 'تجسس', 'بدگمانی', 'شک', 'بدگمان', 'بدنظری', 'غلط فیصلہ'],
    ayahs: [{ s: 49, a: 11 }, { s: 49, a: 12 }, { s: 24, a: 19 }, { s: 104, a: 1 }, { s: 68, a: 11 }],
    hadiths: [6063, 6064, 6065, 6066, 6067],
  },
  {
    id: 'envy', label: 'حسد و بغض',
    en: ['envy', 'envious', 'jealousy', 'jealous', 'covet', 'covetous', 'grudge', 'malice',
      'spite', 'hatred', 'hate', 'resentment', 'begrudge', 'ill will', 'wish evil',
      'wish harm', 'wish the blessing removed', 'blessing taken away', 'consume',
      'eats up', 'fire', 'consume good deeds', 'rivalry', 'competition in wealth',
      'compete for', 'boast', 'show off', 'accumulate', 'pile up'],
    ur: ['حسد', 'حاسد', 'جلتا', 'بغض', 'عداوت', 'نفرت', 'ناراضگی', 'کینہ', 'کینہ پروری',
      'برائی مانگنا', 'نعمت کا زوال', 'رشک', 'للہ', 'بخیل', 'جمع کرنا', 'بڑھ چڑھ کر',
      'اکٹھا', 'ریا کاری', 'دکھاوا'],
    ayahs: [{ s: 4, a: 54 }, { s: 113, a: 5 }, { s: 113, a: 1 }, { s: 2, a: 109 }, { s: 3, a: 120 }],
    hadiths: [6065, 6066, 6067, 6068, 6069],
  },
  {
    id: 'anger', label: 'غصہ و معافی',
    en: ['anger', 'angry', 'rage', 'fury', 'wrath', 'indignation', 'irritation', 'annoyance',
      'frustration', 'temper', 'provocation', 'provoke', 'restrain anger', 'swallow anger',
      'suppress', 'control', 'forgive', 'forgiveness', 'pardon', 'overlook', 'let go',
      'reconcile', 'reconciliation', 'make peace', 'respond with peace', 'repel evil with good',
      'patience', 'forbearance', 'clemency', 'gentleness', 'mildness', 'softness'],
    ur: ['غصہ', 'غصے', 'غصہ کنٹرول', 'غصہ پی جانا', 'غصہ پینا', 'ضبط', 'معافی', 'درگزر',
      'بھلا دینا', 'صلح', 'مصالحت', 'برائی بھلائی', 'نرمی', 'نرم خوئ', 'حلم', 'تحمل',
      'بردباری', 'غصہ نہ کرنا', 'چپ رہنا', 'ٹھنڈا'],
    ayahs: [{ s: 3, a: 134 }, { s: 41, a: 34 }, { s: 42, a: 37 }, { s: 7, a: 199 }, { s: 25, a: 63 }],
    hadiths: [6113, 6114, 6115, 6116, 6117],
  },
  {
    id: 'good_character', label: 'اخلاق و آداب',
    en: ['character', 'manner', 'manners', 'etiquette', 'conduct', 'behavior', 'behaviour',
      'morals', 'moral', 'virtue', 'virtuous', 'kindness', 'kind', 'gentle', 'gentleness',
      'courtesy', 'civility', 'politeness', 'respect', 'honor', 'dignity', 'nobility',
      'grace', 'gracious', 'compassion', 'empathy', 'sympathy', 'charitable', 'benevolent',
      'good to', 'good towards', 'treat well', 'treat kindly', 'neighbor', 'neighborhood',
      'guest', 'hospitality', 'orphan', 'widow', 'poor', 'needy', 'smile', 'greeting',
      'salam', 'shake hands', 'embrace', 'visit the sick', 'help', 'assist', 'serve'],
    ur: ['اخلاق', 'آداب', 'طور طریقہ', 'کردار', 'کردار', 'سلوک', 'نیکی', 'نیک اخلاق',
      'مہربانی', 'نرمی', 'نرم خوئ', 'شائستگی', 'ادب', 'احترام', 'عزت', 'تکریم',
      'رحم دلی', 'ہمدردی', 'غم خواری', 'سخی', 'بھلا', 'اچھا سلوک', 'پڑوسی', 'مہمان',
      'میزبانی', 'یتیم', 'بیوہ', 'غریب', 'محتاج', 'مسکراہٹ', 'سلام', 'مصافحہ',
      'بیمار کی عیادت', 'مدد', 'خدمت'],
    ayahs: [{ s: 3, a: 159 }, { s: 41, a: 34 }, { s: 17, a: 53 }, { s: 31, a: 18 }, { s: 49, a: 11 }],
    hadiths: [6018, 6019, 6020, 6021, 6022],
  },
  {
    id: 'honesty', label: 'امانت و دیانت',
    en: ['honest', 'honesty', 'truthful', 'truthfulness', 'trust', 'trustworthy', 'reliable',
      'faithful', 'keep promise', 'fulfill covenant', 'fulfill pledge', 'fulfill oath',
      'honor agreement', 'honor commitment', 'amanah', 'entrust', 'deposit', 'safekeeping',
      'restore', 'return what is entrusted', 'do not betray', 'do not break',
      'do not violate', 'do not defraud', 'do not cheat', 'do not deceive',
      'do not lie', 'do not bear false witness', 'perjury', 'false oath', 'false testimony'],
    ur: ['امانت', 'دیانت', 'ایمانداری', 'سچا', 'صداقت', 'بھروسہ', 'قابل اعتماد', 'وفادار',
      'وعدہ پورا', 'عہد پورا', 'عہد وعدہ', 'حلف', 'قسم', 'معاہدہ', 'اڑانا', 'خلاف ورزی',
      'دھوکہ', 'دھوکہ دہی', 'فراڈ', 'جھوٹ', 'جھوٹی گواہی', 'جھوٹی قسم', 'خائن', 'خیانت'],
    ayahs: [{ s: 4, a: 58 }, { s: 8, a: 27 }, { s: 23, a: 8 }, { s: 70, a: 32 }, { s: 2, a: 40 }],
    hadiths: [5531, 5532, 5533, 5534, 5535],
  },
  {
    id: 'greed_contentment', label: 'حرص و قناعت',
    en: ['greed', 'greedy', 'avarice', 'covetous', 'miser', 'miserly', 'stingy', 'niggardly',
      'hoard', 'hoarding', 'accumulate', 'pile up', 'amass', 'wealth', 'riches',
      'materialism', 'materialistic', 'worldly gain', 'love of the world', 'love of wealth',
      'attachment', 'attached to', 'clinging', 'insatiable', 'never satisfied',
      'always wanting more', 'content', 'contentment', 'satisfied', 'sufficiency',
      'enough', 'qanaah', 'qanaat', 'ascetic', 'zuhd', 'renounce', 'detach',
      'indifferent to', 'indifference', 'simplicity', 'frugal', 'moderate', 'balanced'],
    ur: ['حرص', 'لالچ', 'طمع', 'بخیل', 'کنجوس', 'جمع کرنا', 'ذخیرہ', 'مال', 'دولت',
      'مادیات', 'دنیا کی محبت', 'مال کی محبت', 'لگاؤ', 'کبھی نہ بھرا', 'قناعت',
      'قانع', 'بھرا', 'کفایت', 'کافی', 'زہد', 'ترک', 'دنیا سے بے نیازی', 'سادگی',
      'متوازن', 'اعتدال'],
    ayahs: [{ s: 102, a: 1 }, { s: 9, a: 34 }, { s: 3, a: 180 }, { s: 64, a: 16 }, { s: 2, a: 96 }],
    hadiths: [6430, 6431, 6432, 6433, 6434],
  },
  {
    id: 'prophet_stories', label: 'قصص الانبیاء',
    en: ['story', 'stories', 'narrate', 'narrative', 'narration', 'account', 'tale',
      'prophet', 'prophets', 'messenger', 'messengers', 'noah', 'nuh', 'ark', 'flood',
      'abraham', 'ibrahim', 'sacrifice', 'ismael', 'ismael', 'ismail',
      'joseph', 'yusuf', 'yusuf and his brothers', 'well', 'egypt',
      'moses', 'musa', 'pharaoh', 'firawn', 'exodus', 'parting the sea', 'red sea',
      'jesus', 'isa', 'mary', 'maryam', 'birth', 'miracles', 'gospel',
      'david', 'dawud', 'psalms', 'zabur', 'solomon', 'sulaiman', 'kingdom',
      'jonah', 'yunus', 'fish', 'whale', 'nineveh',
      'job', 'ayyub', 'patience of job', 'suffering',
      'luqman', 'wisdom of luqman', 'advice to his son',
      'hud', 'hud', 'salih', 'salih', 'shuaib', 'shuaib', 'lot', 'lut'],
    ur: ['قصہ', 'قصے', 'کہانی', 'نبی', 'انبیاء', 'رسول', 'نوح', 'کشتی', 'طوفان',
      'ابراہیم', 'قربانی', 'اسماعیل', 'اسماعیل', 'یوسف', 'یوسف اور بھائی', 'کنواں',
      'مصر', 'موسیٰ', 'فرعون', 'بحر', 'تقسیم سمندر', 'عیسیٰ', 'مریم', 'مریم',
      'پیدائش', 'معجزہ', 'انجیل', 'داود', 'زبور', 'سلیمان', 'مملکت', 'یونس',
      'مچھلی', 'ایوب', 'ایوب کا صبر', 'لقمان', 'لقمان کی حکمت', 'بیٹے کو نصیحت',
      'ہود', 'صالح', 'شعیب', 'لوط'],
    ayahs: [{ s: 11, a: 25 }, { s: 12, a: 3 }, { s: 19, a: 2 }, { s: 28, a: 3 }, { s: 38, a: 12 }, { s: 21, a: 51 }, { s: 37, a: 83 }],
    hadiths: [3329, 3330, 3331, 3332, 3333],
  },
  {
    id: 'jihad_struggle', label: 'جہاد و کوشش',
    en: ['jihad', 'struggle', 'strive', 'striving', 'fight', 'fighting', 'fight in the way',
      'fight in the cause', 'battle', 'battles', 'war', 'combat', 'defense', 'defend',
      'protect', 'resist', 'stand firm', 'standfast', 'persevere', 'sacrifice',
      'martyr', 'martyrdom', 'slain', 'killed in the way', 'killed in the cause',
      'expel', 'expelled', 'driven out', 'evicted', 'persecution', 'persecuted',
      'oppression', 'oppressed', 'transgression', 'aggression', 'aggressor',
      'permission to fight', 'allowed to fight', 'arms', 'weapon', 'armor',
      'cavalry', 'horses', 'prepare', 'preparation', 'strength', 'power', 'force'],
    ur: ['جہاد', 'کوشش', 'جدوجہد', 'لڑنا', 'جنگ', 'لڑائی', 'جہاد فی سبیل اللہ', 'دفاع',
      'بچا', 'مظلوم', 'ظلم', 'ایذاء', 'ستا', 'نکالا', 'بے دخل', 'اجازت لڑنے کی',
      'ہتھیار', 'اسلحہ', 'گھوڑا', 'تیاری', 'طاقت', 'قوت', 'شہید', 'شہادت', 'قتل',
      'جان نثارانہ', 'قربانی'],
    ayahs: [{ s: 2, a: 190 }, { s: 2, a: 216 }, { s: 4, a: 74 }, { s: 22, a: 39 }, { s: 61, a: 4 }, { s: 9, a: 14 }, { s: 47, a: 4 }],
    hadiths: [2733, 2734, 2735, 2736, 2737],
  },
  {
    id: 'people_book', label: 'اہل کتاب',
    en: ['people of the book', 'people of the scripture', 'jews', 'jews and christians',
      'christians', 'torah', 'gospel', 'psalms', 'previous scripture', 'previous revelation',
      'previous books', 'revealed before', 'sent down before', 'those who were given',
      'those who received the scripture', 'rabbi', 'priest', 'monk', 'monastery',
      'church', 'synagogue', 'covenant', 'covenant of allah', 'pact', 'treaty',
      'agreement', 'common word', 'come to common terms', 'dispute', 'argue',
      'argue in the best way', 'debate', 'dialogue'],
    ur: ['اہل کتاب', 'یہودی', 'نصاریٰ', 'عیسائی', 'تورات', 'انجیل', 'زبور',
      'پہلے صحیفے', 'پہلے کتب', 'جنہیں دی گئی', 'عالم', 'پادری', 'راہب', 'خانقاہ',
      'گرجا', 'کنیسہ', 'عہد', 'اللہ کا عہد', 'معاہدہ', 'مشترکہ بات', 'بحث', 'مناظرہ',
      'بہترین طریقہ', 'بحث کرو'],
    ayahs: [{ s: 2, a: 62 }, { s: 3, a: 64 }, { s: 3, a: 113 }, { s: 5, a: 68 }, { s: 29, a: 46 }, { s: 2, a: 105 }],
    hadiths: [3189, 3190, 3191, 3192, 3193],
  },
  {
    id: 'ancient_nations', label: 'قدیم قومیں',
    en: ['ancient', 'of old', 'former', 'previous', 'past', 'bygone', 'generations',
      'nations', 'people of', 'tribe', 'tribes', 'ad', 'thamud', 'people of lut',
      'people of noah', 'people of hud', 'people of salih', 'people of shuaib',
      'pharaoh', 'firawn', 'haman', 'qarun', 'korah', 'qaroon', 'rich',
      'destroyed', 'annihilated', 'wiped out', 'perished', 'ruined', 'overthrown',
      'earthquake', 'blast', 'scream', 'flood', 'drowning', 'stones', 'rained stones',
      'volcano', 'shower of brimstone', 'lesson', 'example', 'sign', 'warning',
      'take heed', 'reflect on', 'travel through', 'see their dwelling'],
    ur: ['قدیم', 'پچھلی', 'گزرے', 'گزر گئی', 'قومیں', 'قوم', 'گروہ', 'قبیلہ', 'عاد',
      'ثمود', 'قوم لوط', 'قوم نوح', 'قوم ہود', 'قوم صالح', 'قوم شعیب', 'فرعون',
      'ہامان', 'قارون', 'تباہ', 'برباد', 'فنا', 'زلزلہ', 'آواز', 'سیلاب', 'ڈوبنا',
      'پتھر', 'پتھر برسے', 'نشانی', 'سبق', ' عبرت', 'دیکھو', 'ان کے ٹھکانے',
      'ان کے مکان', 'گھومو دیکھو'],
    ayahs: [{ s: 7, a: 59 }, { s: 11, a: 50 }, { s: 69, a: 4 }, { s: 89, a: 6 }, { s: 26, a: 38 }, { s: 7, a: 74 }, { s: 15, a: 80 }],
    hadiths: [3320, 3321, 3322, 3323, 3324],
  },
  {
    id: 'remembrance', label: 'ذکر و یادِ خدا',
    en: ['remember', 'remembrance', 'mention', 'dhikr', 'remember allah', 'mention allah',
      'invoke', 'glorify', 'praise', 'exalt', 'magnify', 'tasbeeh', 'takbir', 'tahleel',
      'heart finds rest', 'tranquility', 'peace of heart', 'contemplate'],
    ur: ['ذکر', 'یاد', 'یاد خدا', 'تسبیح', 'تکبیر', 'تحلیل', 'تہلیل', 'بھجن', 'پکارنا',
      'پاک', 'منانا', 'تعریف', 'دل کو سکون', 'سکون قلب', 'غور', 'فکر', 'اللہ اللہ'],
    ayahs: [{ s: 13, a: 28 }, { s: 33, a: 41 }, { s: 2, a: 152 }, { s: 2, a: 200 }, { s: 3, a: 191 }],
    hadiths: [6406, 6407, 6408, 6409, 6410],
  },
  {
    id: 'justice', label: 'انصاف و عدل',
    en: ['justice', 'just', 'fair', 'wrong', 'oppress', 'oppression', 'wronged', 'rights',
      'equity', 'fairness', 'impartial', 'honest', 'truthful', 'fulfill', 'promise', 'covenant',
      'balance', 'measure', 'weight', 'scale', 'shortchange', 'defraud', 'cheat'],
    ur: ['انصاف', 'عدل', 'ظلم', 'ظالم', 'مظلوم', 'حق', 'حقوق', 'بے انصافی', 'تکبر',
      'امانت', 'دھوکہ', 'نا انصافی', 'ترازو', 'وزن', 'ناپ', 'تول', 'کم دینا', 'فراڈ'],
    ayahs: [{ s: 4, a: 135 }, { s: 5, a: 8 }, { s: 16, a: 90 }, { s: 55, a: 8 }, { s: 57, a: 25 }],
    hadiths: [2447, 2448, 2449, 2450, 2451],
  },
  {
    id: 'parents', label: 'والدین و رشتہ داری',
    en: ['parents', 'mother', 'father', 'orphan', 'family', 'kindness to parents', 'honor',
      'relatives', 'kin', 'children', 'offspring', 'sons', 'daughters', 'widow', 'elderly'],
    ur: ['والدین', 'ماں', 'باپ', 'اپنی ماں', 'اپنے باپ', 'یتیم', 'خاندان', 'رشتہ دار',
      'اولاد', 'بیٹے', 'بیٹیاں', 'بیوہ', 'بزرگ', 'احسان', 'نیکی', 'خدمت'],
    ayahs: [{ s: 17, a: 23 }, { s: 31, a: 14 }, { s: 46, a: 15 }, { s: 2, a: 83 }, { s: 4, a: 36 }],
    hadiths: [5970, 5971, 5972, 5973, 5974],
  },
  {
    id: 'halal_haram', label: 'حلال و حرام',
    en: ['lawful', 'unlawful', 'forbidden', 'prohibited', 'permitted', 'food', 'eat',
      'intoxicant', 'wine', 'alcohol', 'gambling', 'idol', 'pork', 'swine', 'slaughter',
      'ritual', 'purity', 'clean', 'unclean', 'impure', 'abomination'],
    ur: ['حلال', 'حرام', 'ممنوع', 'منع', 'کھانا', 'شراب', 'جوا', 'بت', 'سور', 'خنزیر',
      'ذبیحہ', 'پاک', 'ناپاک', 'نجس', 'مکروہ', 'گناہ', 'جائز', 'ناجائز'],
    ayahs: [{ s: 2, a: 168 }, { s: 5, a: 88 }, { s: 7, a: 157 }, { s: 2, a: 219 }, { s: 5, a: 90 }],
    hadiths: [5550, 5551, 5552, 5553, 5554],
  },
  {
    id: 'hypocrisy', label: 'نفاق',
    en: ['hypocrite', 'hypocrisy', 'pretend', 'two-faced', 'mischief', 'corrupt', 'plot',
      'scheme', 'conspire', 'deceive', 'lie', 'false', 'doubt', 'doubtful', 'waver', 'forsake'],
    ur: ['منافق', 'نفاق', 'دہلہ', 'فتنہ', 'فساد', ' سازش', 'دھوکہ', 'جھوٹ', 'جھوٹا', 'شک',
      'شکی', 'چھوڑنا', 'پیچھے ہٹنا', 'ظاہر داری'],
    ayahs: [{ s: 4, a: 145 }, { s: 63, a: 4 }, { s: 2, a: 8 }, { s: 9, a: 64 }, { s: 33, a: 1 }],
    hadiths: [33, 34, 35, 36, 37],
  },
  {
    id: 'supplication', label: 'دعا',
    en: ['call upon', 'supplicate', 'pray to', 'ask me', 'invoke', 'dua', 'beseech',
      'plead', 'request', 'entreat', 'cry out', 'turn to', 'seek help', 'seek refuge'],
    ur: ['دعا', 'پکارنا', 'مانگنا', 'سوال', 'استعانت', 'پناہ', ' التجا', 'التجا',
      'رونا', 'گڑنا', 'اللہ سے', 'دعا مانگنا', 'دعا کریں'],
    ayahs: [{ s: 2, a: 186 }, { s: 40, a: 60 }, { s: 7, a: 55 }, { s: 28, a: 89 }, { s: 2, a: 286 }],
    hadiths: [6304, 6305, 6306, 6307, 6308],
  },
  {
    id: 'piety', label: 'تقویٰ و پرہیزگاری',
    en: ['piety', 'pious', 'righteous', 'godfearing', 'fear of god', 'devout', 'virtuous',
      'upright', 'moral', 'ethical', 'conscience', 'restraint', 'self-control', 'discipline'],
    ur: ['تقویٰ', 'تقوی', 'پرہیزگار', 'متقی', 'خوفِ خدا', 'خدا ترس', 'نیک', 'پاک',
      'پاک دامن', 'بھگت', 'عبادت گزار', 'خدا پرست'],
    ayahs: [{ s: 2, a: 197 }, { s: 3, a: 133 }, { s: 2, a: 189 }, { s: 91, a: 8 }, { s: 2, a: 21 }],
    hadiths: [52, 53, 54, 55, 56],
  },
  {
    id: 'fear_god', label: 'خوفِ خدا',
    en: ['fear', 'fear allah', 'fear god', 'fear your lord', 'dread', 'awe', 'reverence',
      'tremble', 'wary', 'cautious', 'vigilant', 'guard', 'beware', 'warning', 'warn'],
    ur: ['خوف', 'خوفِ خدا', 'خدا کا خوف', 'ڈر', 'رعب', 'ہیبت', 'خوف ناک', 'ہوشیار',
      'محتاط', 'چوکنا', 'تنبیہ', 'آگاہ', 'خوف کرو', 'ڈرو'],
    ayahs: [{ s: 2, a: 40 }, { s: 3, a: 175 }, { s: 8, a: 29 }, { s: 59, a: 18 }, { s: 2, a: 278 }],
    hadiths: [50, 51, 57, 58, 59],
  },
  {
    id: 'hope', label: 'امید و توکل',
    en: ['hope', 'trust in god', 'rely on', 'depend on', 'tawakkul', 'put faith in',
      'expect', 'anticipate', 'look forward', 'optimism', 'confidence', 'assurance'],
    ur: ['امید', 'توکل', 'بھروسہ', 'بھروسا', 'اعتماد', 'آس', 'امیدی', 'پر امید',
      'اللہ پر', 'سپرد', 'بھروسی', 'امید رکھنا'],
    ayahs: [{ s: 65, a: 3 }, { s: 39, a: 53 }, { s: 14, a: 7 }, { s: 3, a: 159 }, { s: 2, a: 218 }],
    hadiths: [7563, 7564, 7565, 7566, 7567],
  },
  {
    id: 'truth', label: 'سچ و راستی',
    en: ['truth', 'true', 'truthful', 'honest', 'sincere', 'genuine', 'authentic', 'real',
      'reality', 'fact', 'veracity', 'integrity', 'upright', 'straight', 'speak truth'],
    ur: ['سچ', 'حق', 'حقیقت', 'سچا', 'دیانت', 'ایمانداری', 'راستی', 'سیدھا',
      'صادق', 'صداقت', 'حق گوئ', 'راستہ', 'سچ بولنا'],
    ayahs: [{ s: 9, a: 119 }, { s: 33, a: 35 }, { s: 2, a: 42 }, { s: 4, a: 135 }, { s: 47, a: 19 }],
    hadiths: [6094, 6095, 6096, 6097, 6098],
  },
  {
    id: 'death', label: 'موت و حیات',
    en: ['death', 'die', 'dead', 'mortal', 'life', 'live', 'soul', 'spirit', 'breath',
      'expire', 'perish', 'depart', 'pass away', 'grave', 'tomb', 'burial', 'barzakh'],
    ur: ['موت', 'مرنا', 'مردہ', 'جان', 'روح', 'دم', 'حیات', 'زندگی', 'فوت',
      'وفات', 'قبر', 'کفن', 'دفن', 'برزخ', 'موت کا وقت', 'اجل', 'وقت'],
    ayahs: [{ s: 3, a: 185 }, { s: 67, a: 2 }, { s: 39, a: 42 }, { s: 2, a: 28 }, { s: 62, a: 8 }],
    hadiths: [6513, 6514, 6515, 6516, 6517],
  },
];

// ─── Primary Keywords ───
// Most distinctive terms for each topic — get 5x weight in scoring.
// This ensures specific concepts (e.g. "حجاب" → modesty) outrank
// generic matches (e.g. "قرآن" → prophethood) that happen to appear in the question.
const PRIMARY_KEYWORDS = {
  tawheed: ['توحید', 'لاشریک', 'بے شریک', 'oneness', 'monotheism', 'no god but'],
  salah: ['نماز', 'صلوٰۃ', 'صلوۃ', 'سجدہ', 'رکوع', 'وضو', 'prayer', 'salat', 'prostrate', 'ablution'],
  zakat: ['زکوٰۃ', 'زکوۃ', 'صدقہ', 'خیرات', 'charity', 'zakat', 'alms', 'sadaqah'],
  patience: ['صبر', 'استقامت', 'patient', 'patience', 'persevere', 'steadfast'],
  mercy: ['رحمت', 'رحم دل', 'mercy', 'merciful', 'compassionate'],
  knowledge: ['علم', 'حکمت', 'knowledge', 'wisdom', 'scholar'],
  faith: ['ایمان', 'مومن', 'یقین', 'faith', 'believer', 'believe'],
  repentance: ['توبہ', 'استغفار', 'repent', 'repentance', 'seek forgiveness'],
  gratitude: ['شکر', 'شکرگزار', 'gratitude', 'grateful', 'thankful'],
  creation: ['مخلوق', 'خلق', 'کائنات', 'creation', 'universe', 'heavens and earth'],
  prophethood: ['نبی', 'رسول', 'پیغمبر', 'وحی', 'prophet', 'messenger', 'apostle', 'revelation'],
  resurrection: ['بعث', 'حشر', 'قیامت', 'حساب', 'جزا', 'resurrection', 'day of judgment', 'reckoning'],
  jannah: ['جنت', 'بہشت', 'فردوس', 'نعیم', 'paradise', 'heaven', 'garden'],
  jahannam: ['جہنم', 'دوزخ', 'عذاب', 'hell', 'hellfire', 'blazing'],
  signs_hour: ['قیامت کی نشانیاں', 'دجال', 'مہدی', 'نزول', 'signs of the hour', 'dajjal', 'end times'],
  barzakh: ['برزخ', 'قبر', 'عذاب قبر', 'نعیم قبر', 'barzakh', 'grave', 'torment of the grave'],
  modesty: ['حجاب', 'پردہ', 'حیا', 'نقاب', 'عفت', 'hijab', 'veil', 'modesty', 'chastity', 'covering'],
  backbiting: ['غیبت', 'تہمت', 'بہتان', 'چغل', 'backbiting', 'slander', 'gossip'],
  envy: ['حسد', 'حاسد', 'جلتا', 'بغض', 'envy', 'jealous', 'jealousy'],
  anger: ['غصہ', 'غصے', 'حلم', 'معافی', 'anger', 'wrath', 'forgive'],
  good_character: ['اخلاق', 'آداب', 'کردار', 'سلوک', 'character', 'manners', 'etiquette', 'morals'],
  honesty: ['امانت', 'دیانت', 'ایمانداری', 'صداقت', 'honest', 'honesty', 'trustworthy', 'amanah'],
  greed_contentment: ['حرص', 'لالچ', 'قناعت', 'بخیل', 'کنجوس', 'greed', 'greedy', 'contentment', 'miser'],
  prophet_stories: ['قصص', 'قصہ', 'قصے', 'کہانی', 'نوح', 'ابراہیم', 'یوسف', 'موسیٰ', 'عیسیٰ', 'story', 'stories', 'narrative'],
  jihad_struggle: ['جہاد', 'لڑنا', 'جنگ', 'شہادت', 'شہید', 'jihad', 'strive', 'fight', 'martyr'],
  people_book: ['اہل کتاب', 'یہودی', 'نصاریٰ', 'تورات', 'انجیل', 'people of the book', 'jews', 'christians'],
  ancient_nations: ['قدیم', 'عاد', 'ثمود', 'قوم لوط', 'فرعون', 'ancient', 'nations', 'ad', 'thamud', 'pharaoh'],
  remembrance: ['ذکر', 'تسبیح', 'یاد خدا', 'remember', 'remembrance', 'dhikr'],
  justice: ['انصاف', 'عدل', 'ظلم', 'justice', 'just', 'fair', 'oppression'],
  parents: ['والدین', 'ماں', 'باپ', 'یتیم', 'parents', 'mother', 'father', 'orphan'],
  halal_haram: ['حلال', 'حرام', 'شراب', 'سور', 'خنزیر', 'lawful', 'unlawful', 'forbidden', 'halal', 'haram'],
  hypocrisy: ['منافق', 'نفاق', 'دہلہ', 'hypocrite', 'hypocrisy', 'two-faced'],
  supplication: ['دعا', 'پکارنا', 'مانگنا', 'supplication', 'dua', 'invoke'],
  piety: ['تقویٰ', 'تقوی', 'پرہیزگار', 'متقی', 'piety', 'pious', 'godfearing'],
  fear_god: ['خوفِ خدا', 'خدا کا خوف', 'ڈر', 'خوف', 'fear allah', 'fear god', 'fear your lord'],
  hope: ['امید', 'توکل', 'بھروسہ', 'hope', 'trust in god', 'tawakkul'],
  truth: ['سچ', 'حق', 'حقیقت', 'سچا', 'truth', 'truthful', 'honest', 'sincere'],
  death: ['موت', 'مرنا', 'وفات', 'اجل', 'death', 'die', 'dead', 'mortal'],
};

// ─── Concept Detection ───
// Scans both English and Urdu text, scores each topic by keyword matches.
// Primary keywords get 5x weight; regular keywords score by length.
export function detectTopics(enText, urText, max = 2) {
  const en = (enText || '').toLowerCase();
  const ur = (urText || '');
  if (!en && !ur) return [];

  const scored = TOPICS.map(t => {
    let score = 0;
    // Primary keywords — high weight (5 points each)
    for (const kw of (PRIMARY_KEYWORDS[t.id] || [])) {
      const kwLower = kw.toLowerCase();
      if (en.includes(kwLower) || ur.includes(kw)) score += 5;
    }
    // Regular English keywords
    for (const kw of t.en) {
      if (en.includes(kw)) score += kw.length > 6 ? 3 : (kw.length > 4 ? 2 : 1);
    }
    // Regular Urdu keywords
    for (const kw of t.ur) {
      if (ur.includes(kw)) score += kw.length > 3 ? 3 : 2;
    }
    return { topic: t, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  return scored.slice(0, max).map(s => s.topic);
}

// ─── Related Ayahs (concept-based, with Urdu translation) ───
export async function getRelatedAyahs(verseKey, enText, urText) {
  if (!enText && !urText) return [];
  try {
    const cached = JSON.parse(localStorage.getItem(AYAH_CACHE_PREFIX + verseKey) || 'null');
    if (cached) return cached;
  } catch {}

  const topics = detectTopics(enText, urText, 2);
  if (topics.length === 0) return [];

  const results = [];
  const seen = new Set([verseKey]);
  const maxPerTopic = topics.length === 1 ? 4 : 2;

  for (const topic of topics) {
    let count = 0;
    for (const ref of topic.ayahs) {
      if (count >= maxPerTopic || results.length >= 4) break;
      const key = `${ref.s}:${ref.a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const data = await quranApi.getAyahEditions(key, 'quran-uthmani,ur.jalandhry');
        if (data?.[0]?.text) {
          results.push({
            surah: ref.s,
            ayah: ref.a,
            arabic: data[0].text,
            urdu: data[1]?.text || '',
            topic: topic.label,
          });
          count++;
        }
      } catch {}
    }
    if (results.length >= 4) break;
  }

  if (results.length) try { localStorage.setItem(AYAH_CACHE_PREFIX + verseKey, JSON.stringify(results)); } catch {}
  return results;
}

// ─── Related Hadiths (concept-based, Urdu edition) ───
export async function getRelatedHadiths(verseKey, enText, urText) {
  if (!enText && !urText) return [];
  try {
    const cached = JSON.parse(localStorage.getItem(HADITH_CACHE_PREFIX + verseKey) || 'null');
    if (cached) return cached;
  } catch {}

  const topics = detectTopics(enText, urText, 2);
  if (topics.length === 0) return [];

  const results = [];
  const seen = new Set();
  const maxPerTopic = topics.length === 1 ? 3 : 2;

  for (const topic of topics) {
    let count = 0;
    for (const num of topic.hadiths) {
      if (count >= maxPerTopic || results.length >= 3) break;
      if (seen.has(num)) continue;
      seen.add(num);
      try {
        const d = await hadithApi.getHadith('urd-bukhari', num);
        if (d?.hadiths?.[0]?.text) {
          results.push({
            text: d.hadiths[0].text,
            source: `صحیح بخاری: ${num}`,
            topic: topic.label,
          });
          count++;
        }
      } catch {}
    }
    if (results.length >= 3) break;
  }

  if (results.length) try { localStorage.setItem(HADITH_CACHE_PREFIX + verseKey, JSON.stringify(results)); } catch {}
  return results;
}
