import { backend } from '@/api/backend';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { buildDictionary } from '@/lib/dictionary';
import { TOTAL_WORDS } from '@/lib/data';

// ───────── lib/collectionStore.js ─────────
// Collection store — per-user personal folders for organizing research notes.
// Uses the Collection entity when available (server-side), falls back to
// per-user localStorage so the feature works immediately.



const STORAGE_PREFIX = 'quran-wisdom-collections';
let cachedUserId = null;

function hasEntity() {
  try { return !!(backend.entities && backend.entities.Collection); } catch { return false; }
}

async function getUserKey() {
  if (cachedUserId) return `${STORAGE_PREFIX}-${cachedUserId}`;
  try {
    const me = await backend.auth.me();
    cachedUserId = me?.id || 'anonymous';
  } catch {
    cachedUserId = 'anonymous';
  }
  return `${STORAGE_PREFIX}-${cachedUserId}`;
}

// ─── localStorage helpers ───
async function loadLocal() {
  const key = await getUserKey();
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
async function saveLocal(list) {
  const key = await getUserKey();
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

// ─── Public API (async in both modes) ───
export async function getCollections() {
  if (hasEntity()) {
    try { return await backend.entities.Collection.list('-created_date', 50) || []; } catch {}
  }
  return loadLocal();
}

export async function createCollection({ name, description = '', color = 'gold' }) {
  if (hasEntity()) {
    try { return await backend.entities.Collection.create({ name, description, color }); } catch {}
  }
  const list = await loadLocal();
  const col = {
    id: 'col_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    name, description, color,
    created_date: new Date().toISOString(),
  };
  list.push(col);
  await saveLocal(list);
  return col;
}

export async function deleteCollection(id) {
  if (hasEntity()) {
    try { await backend.entities.Collection.delete(id); } catch {}
  }
  await saveLocal((await loadLocal()).filter(c => c.id !== id));
}

// ───────── lib/notebookStore.js ─────────
// Per-user localStorage store for research notes (bookmarks).
// Each user gets their own namespaced storage key based on their auth ID.
// Replaces the Supabase ResearchNote entity for offline-first per-user data.



const STORAGE_PREFIX_notebookStore = 'quran-wisdom-notes';
let cachedUserId_notebookStore = null;

async function getUserKey_notebookStore() {
  if (cachedUserId_notebookStore) return `${STORAGE_PREFIX_notebookStore}-${cachedUserId_notebookStore}`;
  try {
    const me = await backend.auth.me();
    cachedUserId_notebookStore = me?.id || 'anonymous';
  } catch {
    cachedUserId_notebookStore = 'anonymous';
  }
  return `${STORAGE_PREFIX_notebookStore}-${cachedUserId_notebookStore}`;
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function save(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

// ─── Public API (async, matches the old entity API shape) ───

export async function listNotes() {
  const key = await getUserKey_notebookStore();
  return load(key).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

export async function createNote(data) {
  const key = await getUserKey_notebookStore();
  const list = load(key);
  const note = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    item_type: data.item_type || 'verse',
    citation: data.citation || '',
    content: data.content || '',
    source_ref: data.source_ref || '',
    tags: data.tags || '',
    notes: data.notes || '',
    collection_id: data.collection_id || '',
    created_date: new Date().toISOString(),
  };
  list.push(note);
  save(key, list);
  return note;
}

export async function updateNote(id, updates) {
  const key = await getUserKey_notebookStore();
  const list = load(key);
  const idx = list.findIndex(n => n.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...updates };
  save(key, list);
  return list[idx];
}

export async function deleteNote(id) {
  const key = await getUserKey_notebookStore();
  save(key, load(key).filter(n => n.id !== id));
}

// ───────── lib/notebookTags.js ─────────
// Theological theme tags for the Research Notebook.
// Users label saved verses, Hadith, and insights with these themes for easier browsing.

export const THEOLOGICAL_TAGS = [
  { id: 'theology',     label: 'عقیدہ',      en: 'Theology' },
  { id: 'worship',      label: 'عبادات',     en: 'Worship' },
  { id: 'ethics',       label: 'اخلاقیات',   en: 'Ethics' },
  { id: 'history',      label: 'تاریخ',      en: 'History' },
  { id: 'prophets',     label: 'انبیاء',     en: 'Prophets' },
  { id: 'afterlife',    label: 'آخرت',       en: 'Afterlife' },
  { id: 'law',          label: 'فقه',        en: 'Law' },
  { id: 'spirituality', label: 'روحانیت',    en: 'Spirituality' },
];

export const TAG_MAP = Object.fromEntries(THEOLOGICAL_TAGS.map(t => [t.id, t]));

// Parse a comma-separated tags string into an array of tag ids.
export function parseTags(tagsStr) {
  if (!tagsStr) return [];
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
}

// Convert an array of tag ids back to a comma-separated string.
export function joinTags(tagIds) {
  return (tagIds || []).join(', ');
}

// ───────── lib/notebookExport.js ─────────
// Research Notebook export utilities — JSON, Markdown, plain text, and PDF.




function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function download(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const TYPE_LABELS = {
  verse: 'آیت',
  hadith: 'حدیث',
  insight: 'AI تجزیہ',
};

export function exportJSON(notes) {
  const data = JSON.stringify(notes.map(n => ({
    item_type: n.item_type,
    citation: n.citation,
    content: n.content,
    source_ref: n.source_ref || '',
    notes: n.notes || '',
    tags: n.tags || '',
    saved_at: n.created_date,
  })), null, 2);
  download(`research-notebook-${timestamp()}.json`, 'application/json', data);
}

export function exportMarkdown(notes) {
  const lines = ['# Quran Wisdom AI — Research Notebook', ''];
  const byType = { verse: [], hadith: [], insight: [] };
  for (const n of notes) (byType[n.item_type] || (byType.insight = [])).push(n);

  for (const [type, items] of Object.entries(byType)) {
    if (!items.length) continue;
    lines.push(`## ${TYPE_LABELS[type] || type} (${items.length})`, '');
    for (const n of items) {
      lines.push(`### ${n.citation}`, '');
      lines.push(n.content, '');
      if (n.notes) { lines.push(`**Notes:** ${n.notes}`, ''); }
      if (n.tags) { lines.push(`**Tags:** ${n.tags}`, ''); }
      lines.push(`*Saved: ${n.created_date || ''}*`, '');
      lines.push('---', '');
    }
  }
  download(`research-notebook-${timestamp()}.md`, 'text/markdown', lines.join('\n'));
}

export function exportText(notes) {
  const lines = ['Quran Wisdom AI — Research Notebook', '=============================================', ''];
  for (const n of notes) {
    lines.push(`[${TYPE_LABELS[n.item_type] || n.item_type}] ${n.citation}`);
    lines.push('---------------------------------------------');
    lines.push(n.content, '');
    if (n.notes) { lines.push(`Notes: ${n.notes}`, ''); }
    if (n.tags) { lines.push(`Tags: ${n.tags}`, ''); }
    lines.push(`Saved: ${n.created_date || ''}`, '');
    lines.push('', '');
  }
  download(`research-notebook-${timestamp()}.txt`, 'text/plain', lines.join('\n'));
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPdfHtml(notes) {
  const byType = { verse: [], hadith: [], insight: [] };
  for (const n of notes) (byType[n.item_type] || (byType.insight = [])).push(n);

  const sections = Object.entries(byType)
    .filter(([, items]) => items.length)
    .map(([type, items]) => {
      const cards = items.map(n => {
        const tags = (n.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        const tagHtml = tags.length
          ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
          : '';
        const notesHtml = n.notes ? `<div class="notes"><b>نوٹس:</b> ${escapeHtml(n.notes)}</div>` : '';
        const date = n.created_date ? new Date(n.created_date).toLocaleString('ur-PK') : '';
        return `
          <div class="card">
            <div class="citation">${escapeHtml(n.citation)}</div>
            <div class="content">${escapeHtml(n.content)}</div>
            ${notesHtml}
            ${tagHtml}
            ${date ? `<div class="date">${escapeHtml(date)}</div>` : ''}
          </div>`;
      }).join('');
      return `<div class="section"><h2>${TYPE_LABELS[type] || type} (${items.length})</h2>${cards}</div>`;
    }).join('');

  return `
    <div class="doc">
      <h1>Quran Wisdom AI — Research Notebook</h1>
      <p class="meta">${notes.length} entries · ${new Date().toLocaleDateString('ur-PK')}</p>
      ${sections}
    </div>`;
}

export async function exportPDF(notes) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:780px;padding:40px;background:#0a1a14;color:#edf0e8;direction:rtl;';
  container.innerHTML = `
    <style>
      .doc { font-family: 'Noto Nastaliq Urdu','Amiri',serif; }
      h1 { font-size: 22px; color: #d4af37; text-align: center; margin: 0 0 4px; font-family: 'Amiri',serif; direction: ltr; }
      .meta { text-align: center; font-size: 12px; color: #8a9a8e; margin: 0 0 24px; }
      .section { margin-bottom: 20px; }
      .section h2 { font-size: 16px; color: #c5a059; border-bottom: 1px solid #2a4a3a; padding-bottom: 6px; margin: 18px 0 10px; }
      .card { background: #122a20; border: 1px solid #2a4a3a; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
      .citation { font-size: 14px; font-weight: 700; color: #e8d8a7; margin-bottom: 6px; }
      .content { font-size: 13px; line-height: 1.9; color: #d4d8d0; }
      .notes { font-size: 12px; color: #aab7ab; margin-top: 8px; }
      .tags { margin-top: 8px; }
      .tag { display: inline-block; font-size: 10px; padding: 2px 8px; margin: 2px; border-radius: 999px; background: rgba(212,175,55,0.15); color: #d4af37; border: 1px solid rgba(212,175,55,0.3); }
      .date { font-size: 10px; color: #6a7a6e; margin-top: 8px; }
    </style>
    ${buildPdfHtml(notes)}`;
  document.body.appendChild(container);

  try {
    // Wait for fonts to settle
    await new Promise(r => setTimeout(r, 300));
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#0a1a14', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(`research-notebook-${timestamp()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// ───────── lib/readingHistory.js ─────────
// Reading history — tracks every verse the user visits so they can resume
// from any point in their study session. Stored in localStorage.

const STORAGE_KEY = 'quran-reading-history';
const MAX_ENTRIES = 30;

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function write(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

/** Record a verse visit. Moves existing entry to top, caps at MAX_ENTRIES. */
export function recordVisit(surah, ayah, surahName, arabicName) {
  const list = read();
  const key = `${surah}:${ayah}`;
  const filtered = list.filter(e => e.key !== key);
  filtered.unshift({ key, surah, ayah, surahName, arabicName, visitedAt: Date.now() });
  if (filtered.length > MAX_ENTRIES) filtered.length = MAX_ENTRIES;
  write(filtered);
}

/** Get recent visited verses (most recent first). */
export function getHistory(limit = 10) {
  return read().slice(0, limit);
}

/** Clear all reading history. */
export function clearHistory() {
  write([]);
}

// ───────── lib/progress.js ─────────
// ─── Progress Tracker (Quran self-learning) ───
const MASTERY_KEY = 'quran-mastery';
const WEAK_KEY = 'quran-weak-areas';
const STREAK_KEY = 'quran-streak';
const MILESTONE_KEY = 'quran-daily-milestone';

function read_progress(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function write_progress(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function getMasteryMap() { return read_progress(MASTERY_KEY, {}); }

export function getMastery(verseKey) {
  const map = getMasteryMap();
  return map[verseKey] || { level: 0, lastPracticed: null, attempts: 0, bestScore: 0 };
}

export function recordPractice(verseKey, score) {
  const map = getMasteryMap();
  const cur = map[verseKey] || { level: 0, lastPracticed: null, attempts: 0, bestScore: 0 };
  const attempts = cur.attempts + 1;
  const bestScore = Math.max(cur.bestScore, score);
  let level = cur.level;
  if (score >= 90) level = 3;
  else if (score >= 70) level = Math.max(level, 2);
  else if (score >= 50) level = Math.max(level, 1);
  else level = Math.max(level, 0);
  map[verseKey] = { level, lastPracticed: Date.now(), attempts, bestScore };
  write_progress(MASTERY_KEY, map);
  const weak = read_progress(WEAK_KEY, []);
  const idx = weak.findIndex(w => w.verseKey === verseKey);
  if (score < 70) { const entry = { verseKey, score, addedAt: Date.now() }; if (idx >= 0) weak[idx] = entry; else weak.push(entry); }
  else { if (idx >= 0) weak.splice(idx, 1); }
  write_progress(WEAK_KEY, weak);
  bumpMilestone();
  return map[verseKey];
}

export function getWeakAreas() { return read_progress(WEAK_KEY, []); }

export function clearWeakArea(verseKey) {
  const weak = read_progress(WEAK_KEY, []).filter(w => w.verseKey !== verseKey);
  write_progress(WEAK_KEY, weak);
}

function readTodayMilestone() {
  const today = new Date().toDateString();
  const m = read_progress(MILESTONE_KEY, { date: null, count: 0 });
  if (m.date !== today) return { date: today, count: 0 };
  return m;
}

function bumpMilestone() {
  const today = new Date().toDateString();
  const m = read_progress(MILESTONE_KEY, { date: null, count: 0 });
  if (m.date !== today) write_progress(MILESTONE_KEY, { date: today, count: 1 });
  else write_progress(MILESTONE_KEY, { date: today, count: m.count + 1 });
}

export function getTodayMilestone() { return readTodayMilestone(); }

function getStreak() {
  const s = read_progress(STREAK_KEY, { lastDate: null, count: 0 });
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (s.lastDate === today) return s.count;
  if (s.lastDate === yesterday) return s.count;
  return 0;
}

export function getStats() {
  const map = getMasteryMap();
  const entries = Object.values(map);
  return {
    totalPracticed: entries.length,
    mastered: entries.filter(e => e.level === 3).length,
    familiar: entries.filter(e => e.level === 2).length,
    learning: entries.filter(e => e.level === 1).length,
    weakCount: read_progress(WEAK_KEY, []).length,
    streak: getStreak(),
    todayCount: getTodayMilestone().count,
    todayGoal: 5,
  };
}

export function getMasteryLabel(level) {
  return ['نئی', 'سیکھ رہا', 'جانچتا', 'مکمل'][level] || 'نئی';
}

export function getMasteryColor(level) {
  return [
    'bg-muted text-muted-foreground',
    'bg-amber-500/100/20 text-amber-400 border-amber-500/40',
    'bg-blue-500/20 text-blue-700 border-blue-500/40',
    'bg-emerald-500/100/20 text-emerald-400 border-emerald-500/40',
  ][level] || 'bg-muted text-muted-foreground';
}

// ─── Qaid Progress (spaced repetition + advice) ───
const QAID_KEY = 'qaid_progress_v1';

function qaidLoad() { try { return JSON.parse(localStorage.getItem(QAID_KEY) || '{}'); } catch { return {}; } }
function qaidSave(data) { try { localStorage.setItem(QAID_KEY, JSON.stringify(data)); } catch {} }

export function recordWordAttempt(wordKey, word, correct) {
  const data = qaidLoad();
  const now = Date.now();
  if (!data[wordKey]) data[wordKey] = { word, attempts: 0, wrongCount: 0, correctCount: 0, lastAttempt: 0, nextReview: 0, interval: 0, history: [] };
  const entry = data[wordKey];
  entry.word = word; entry.attempts++;
  if (correct) entry.correctCount++; else entry.wrongCount++;
  entry.lastAttempt = now;
  entry.history.push({ correct, ts: now });
  if (entry.history.length > 20) entry.history = entry.history.slice(-20);
  if (correct) {
    const intervals = [1, 3, 7, 14, 30, 60];
    const level = Math.min(entry.correctCount - entry.wrongCount, intervals.length - 1);
    entry.interval = intervals[Math.max(0, level)];
  } else { entry.interval = 1; }
  entry.nextReview = now + entry.interval * 86400000;
  qaidSave(data);
  return entry;
}

export function getRepeatedlyWrongWords() {
  const data = qaidLoad();
  return Object.entries(data).filter(([, v]) => v.wrongCount >= 2).sort((a, b) => b[1].wrongCount - a[1].wrongCount).map(([key, v]) => ({ key, ...v }));
}

export function getReviewDueWords() {
  const data = qaidLoad();
  const now = Date.now();
  return Object.entries(data).filter(([, v]) => v.nextReview > 0 && v.nextReview <= now && v.wrongCount > 0).sort((a, b) => a[1].nextReview - b[1].nextReview).map(([key, v]) => ({ key, ...v }));
}

export function getOverallStats() {
  const data = qaidLoad();
  const entries = Object.values(data);
  return {
    totalAttempts: entries.reduce((s, e) => s + e.attempts, 0),
    totalWrong: entries.reduce((s, e) => s + e.wrongCount, 0),
    totalCorrect: entries.reduce((s, e) => s + e.correctCount, 0),
    wordsPracticed: entries.length,
    masteredWords: entries.filter(e => e.correctCount >= 3 && e.wrongCount === 0).length,
  };
}

export function getAdvice() {
  const wrongWords = getRepeatedlyWrongWords();
  const dueWords = getReviewDueWords();
  const stats = getOverallStats();
  if (stats.totalAttempts === 0) return { hasData: false, text: 'ابھی کوئی ڈیٹا نہیں۔ قائد موڈ میں پریکٹس شروع کریں — مشورہ خود بخود تیار ہو گا۔', wrongWords: [], dueWords: [] };
  let text = '';
  if (wrongWords.length > 0) {
    const top = wrongWords.slice(0, 3);
    text += `آپ نے یہ الفاظ بار بار غلط پڑھے ہیں:\n${top.map(w => `• ${w.word} (${w.wrongCount} مرتبہ غلط)`).join('\n')}\n\nان الفاظ پر خصوصی توجہ دیں — آہستہ سن کر دہرائیں۔`;
  } else { text += 'آپ کی کارکردگی بہتر ہے — کوئی بار بار غلط لفظ نہیں ملا۔'; }
  if (dueWords.length > 0) { text += `\n\n🔁 دوبارہ پریکٹس کا وقت:\n${dueWords.slice(0, 3).map(w => `• ${w.word}`).join('، ')}\nان الفاظ کی مشق اب دہرائیں۔`; }
  else if (wrongWords.length > 0) { text += '\n\nابھی کوئی لفظ دوبارہ پریکٹس کے لیے نہیں۔'; }
  return { hasData: true, text, wrongWords, dueWords, stats };
}

export function clearProgress() { qaidSave({}); }

// ───────── lib/dailyReminder.js ─────────
// Daily recitation reminder via browser Notifications API.
// Fires once per day at the user's chosen time while the app is open.
const STORAGE_KEY_dailyReminder = 'quran-daily-reminder';
const DEFAULT_TIME = '06:30';

export function getReminderSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_dailyReminder);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { enabled: !!parsed.enabled, time: parsed.time || DEFAULT_TIME };
    }
  } catch {}
  return { enabled: false, time: DEFAULT_TIME };
}

export function saveReminderSettings(settings) {
  localStorage.setItem(STORAGE_KEY_dailyReminder, JSON.stringify(settings));
}

export function notificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission() {
  if (!notificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function requestPermission() {
  if (!notificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function fireReminder() {
  if (getPermission() !== 'granted') return;
  try {
    const n = new Notification('قرآن کی تلاوت کا وقت', {
      body: 'آپ کا روزانہ کا تذکرہ — ابھی قرآن کی تلاوت اور تجوید کی پریکٹس کریں۔',
      icon: '/icon-192.png',
      tag: 'quran-daily-reminder',
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
}

let intervalId = null;
let lastFiredKey = null;

// Starts a lightweight interval that checks the clock against the chosen time.
// Reads fresh settings each tick, so toggles/time changes take effect immediately.
export function initReminderScheduler() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    const { enabled, time } = getReminderSettings();
    if (!enabled) return;
    const now = new Date();
    const parts = String(time).split(':').map(Number);
    if (now.getHours() === parts[0] && now.getMinutes() === parts[1]) {
      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (key !== lastFiredKey) {
        lastFiredKey = key;
        fireReminder();
      }
    }
  }, 20000);
}

// ───────── lib/learningAnalytics.js ─────────
// Collaborative learning analytics — detects patterns from LearningRecord data
// and derives best practice sequences per Tajweed category.
// Logic runs locally (offline-capable); AI only refines recommendations when available.

export async function loadBestMethods(backend) {
  try {
    const methods = await backend.entities.LearningMethod.list();
    return methods || [];
  } catch {
    return [];
  }
}

// Detect the user's weakest Tajweed category from their own records
export function detectWeakestArea(records) {
  if (!records || records.length === 0) return null;
  const errorCounts = {};
  records.forEach(r => {
    if (!r.mastered && r.error_type) {
      errorCounts[r.error_type] = (errorCounts[r.error_type] || 0) + 1;
    }
  });
  const sorted = Object.keys(errorCounts).sort((a, b) => errorCounts[b] - errorCounts[a]);
  return sorted.length > 0 ? { category: sorted[0], count: errorCounts[sorted[0]] } : null;
}

// Find the most frequent verse sequence among users who mastered a category
export function findMostFrequentSequence(sequences) {
  if (!sequences || sequences.length === 0) return [];
  const freq = {};
  sequences.forEach(seq => {
    const key = JSON.stringify(seq);
    freq[key] = (freq[key] || 0) + 1;
  });
  const best = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
  return best ? JSON.parse(best) : [];
}

// Aggregate every user's LearningRecords into shared LearningMethod rows.
// Cross-user aggregation needs elevated access, so it runs in the
// `analyze-learning` Edge Function (supabase/functions/analyze-learning).
export async function analyzeAndStoreBestMethods(backend) {
  try {
    const res = await backend.learning.refreshBestMethods();
    return { updated: res?.updated || 0 };
  } catch {
    return { updated: 0, error: true };
  }
}

// Get recommended verses for a user based on their weakest area + best method
export async function getRecommendedVerses(backend, userRecords) {
  const weakest = detectWeakestArea(userRecords);
  if (!weakest) return { category: null, verses: [], message: 'ابھی تجزیہ کے لیے کافی ڈیٹا نہیں۔ پریکٹس جاری رکھیں۔' };

  const methods = await loadBestMethods(backend);
  const method = methods.find(m => m.tajweed_category === weakest.category);

  if (!method || !method.best_sequence) {
    return {
      category: weakest.category,
      verses: [],
      message: `آپ کو "${weakest.category}" میں مشکل ہو رہی ہے۔ ابھی اجتماعی طریقہ تیار ہو رہا ہے — جلد ہی ذاتی مشق دستیاب ہو گی۔`
    };
  }

  let verses = [];
  try { verses = JSON.parse(method.best_sequence); } catch { verses = []; }

  return {
    category: weakest.category,
    verses,
    effectiveness: method.effectiveness_score,
    usersBenefited: method.users_who_benefited,
    message: `آپ کو "${weakest.category}" میں مشکل ہو رہی ہے۔ ${method.users_who_benefited || 0} صارفین نے یہ ترتیب اپنا کر یہ سیکھ لیا ہے۔`
  };
}

// Save a practice session's mistakes as LearningRecord entries
export async function saveLearningRecords(backend, verseKey, feedback) {
  if (!feedback || !feedback.mistakes) return;
  const records = feedback.mistakes.map(m => ({
    verse_key: verseKey,
    word_index: m.wordIndex || 0,
    error_type: m.tajweedCategory || 'other',
    accuracy_score: feedback.overallScore || 0,
    mastered: false,
  }));

  // Also record missing/extra words
  if (feedback.verseAccuracy) {
    if (feedback.verseAccuracy.missingWords) {
      feedback.verseAccuracy.missingWords.forEach((_, i) => {
        records.push({
          verse_key: verseKey,
          word_index: -(i + 1),
          error_type: 'missing_word',
          accuracy_score: feedback.overallScore || 0,
          mastered: false,
        });
      });
    }
  }

  // Mark as mastered if score is high
  if (feedback.overallScore >= 90 && feedback.verseAccuracy?.isComplete) {
    records.forEach(r => { r.mastered = true; });
  }

  try {
    if (records.length > 0) {
      await backend.entities.LearningRecord.bulkCreate(records);
    }
  } catch {
    // silent fail — offline-first
  }
}

export const categoryLabels = {
  makharij: 'مخارج',
  sifat: 'صفات',
  noon_sakinah: 'نون ساکنہ',
  meem_sakinah: 'میم ساکنہ',
  madd: 'مد',
  qalqalah: 'قلقلہ',
  idgham: 'إدغام',
  waqf: 'وقف',
  tafkheem: 'تفخیم',
  missing_word: 'چھوڑے ہوئے الفاظ',
  extra_word: 'اضافی الفاظ',
  other: 'دیگر',
};

// ───────── lib/wordsStore.js ─────────
// ════════════════════════════════════════════════════════════════════
// Daily Quranic-words learning: picks the next most frequent unlearned words from the
// Quran dictionary, tracks learned words, coverage of the Quran's words and a streak.
// Stored locally; synced to Supabase (user_state) when the user is signed in.
// ════════════════════════════════════════════════════════════════




const KEY = 'quran-words-progress-v1';
export const GOALS = [5, 10, 50];
let cache = null;

export function getAllWords() {
  if (!cache) {
    // Most frequent first: the words that unlock the most of the Quran come first.
    cache = buildDictionary()
      .filter((w) => w.ar && w.ur)
      .map((w) => ({ id: String(w.serial_no), ar: w.ar, ur: w.ur, en: w.en || '', count: w.count || 0, type: w.grammar_type || '', root: w.root || '' }))
      .sort((a, b) => b.count - a.count || a.id - b.id);
  }
  return cache;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const empty = () => ({ goal: 10, learned: {}, today: { date: '', ids: [] }, days: {}, streak: 0, lastDay: '' });

export function loadProgress() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return empty(); }
}

async function persist(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full */ }
  try { await backend.state.set(KEY, p); } catch { /* offline / signed out */ }
}

/** Merge cloud progress into local (union of learned words) — call once after sign-in. */
export async function syncFromCloud() {
  try {
    const remote = await backend.state.get(KEY);
    if (!remote) return loadProgress();
    const local = loadProgress();
    const merged = { ...local, goal: local.goal, learned: { ...remote.learned, ...local.learned }, days: { ...remote.days, ...local.days } };
    merged.streak = Math.max(local.streak || 0, remote.streak || 0);
    merged.lastDay = [local.lastDay, remote.lastDay].sort().pop() || '';
    await persist(merged);
    return merged;
  } catch { return loadProgress(); }
}

/** The words for today (stable for the whole day, refilled if the goal changes). */
export function getTodaysWords(p) {
  const all = getAllWords();
  const byId = new Map(all.map((w) => [w.id, w]));
  let ids = p.today.date === todayStr() ? p.today.ids.filter((id) => byId.has(id)) : [];
  const unlearnedNeeded = p.goal - ids.length;
  if (unlearnedNeeded > 0) {
    const have = new Set(ids);
    for (const w of all) {
      if (ids.length >= p.goal) break;
      if (!p.learned[w.id] && !have.has(w.id)) { ids.push(w.id); have.add(w.id); }
    }
  }
  return { ids, words: ids.map((id) => byId.get(id)).filter(Boolean) };
}

export async function setGoal(p, goal) {
  // Fix the day's list right away so it stays stable while the user marks words as learned.
  const base = { ...p, goal, today: { date: '', ids: [] } };
  const next = { ...base, today: { date: todayStr(), ids: getTodaysWords(base).ids } };
  await persist(next);
  return next;
}

export async function startToday(p) {
  const { ids } = getTodaysWords(p);
  const next = { ...p, today: { date: todayStr(), ids } };
  await persist(next);
  return next;
}

export async function markLearned(p, id, learned = true) {
  const next = { ...p, learned: { ...p.learned }, days: { ...p.days } };
  if (learned) {
    next.learned[id] = todayStr();
    next.days[todayStr()] = (next.days[todayStr()] || 0) + 1;
    // streak
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (next.lastDay !== todayStr()) {
      next.streak = next.lastDay === y ? (next.streak || 0) + 1 : 1;
      next.lastDay = todayStr();
    }
  } else {
    delete next.learned[id];
  }
  await persist(next);
  return next;
}

export function getWordStats(p) {
  const all = getAllWords();
  const learnedWords = all.filter((w) => p.learned[w.id]);
  const occurrences = learnedWords.reduce((s, w) => s + (w.count || 0), 0);
  return {
    totalWords: all.length,
    learned: learnedWords.length,
    // share of all running words of the Quran that the learned vocabulary accounts for
    coveragePct: Math.min(100, Math.round((occurrences / TOTAL_WORDS) * 1000) / 10),
    occurrences,
    todayDone: Object.values(p.learned).filter((d) => d === todayStr()).length,
    streak: p.lastDay === todayStr() || p.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? p.streak || 0 : 0,
  };
}
