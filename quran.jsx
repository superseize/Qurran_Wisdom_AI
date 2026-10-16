import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RefreshCw, ChevronDown, Volume2, Check, BookOpen, Copy, Share2, Bookmark, Info, Loader2, Hash, Search, Newspaper, Brain, Sparkles, Users, TrendingUp } from 'lucide-react';
import { getWordTextColor } from '@/lib/data';
import { getExactWordCount, getRelatedAyahs, hadithApi } from '@/lib/quran';
import { Link } from 'react-router-dom';
import { backend } from '@/api/backend';
import { findRelatedAyahs, findArticlesForAyah } from '@/lib/engine';
import { SaveToNotebook } from '@/components/ai';
import { getRecommendedVerses, analyzeAndStoreBestMethods, categoryLabels } from '@/lib/stores';

// ───────── components/quran/Common.jsx ─────────
// ─── Icons ───
export function MosqueIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c1.6 1.6 1.6 3.4 0 5-1.6-1.6-1.6-3.4 0-5z" />
      <path d="M5 21V11c0-2.2 3-3.5 3-3.5M19 21V11c0-2.2-3-3.5-3-3.5" />
      <path d="M8 21v-3.5a4 4 0 018 0V21" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function BookQuillIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5c4 0 6 2 7 5M4 5v15h8c1.8 0 3-1 3-3M4 5c5 0 7 2 8 5" />
      <path d="M20 4c-2 2-3 4-3.5 6.5L13 13l1-3.5C15 7 17 5 20 4z" />
    </svg>
  );
}

// ─── InfoCard ───
export function InfoCard({ title, icon, children }) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {icon}
          <span dir="rtl">{title}</span>
        </span>
      </div>
      <div className="px-4 py-3 text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}

// ─── OrnateFrame ───
function Corner({ className = '', rot = '' }) {
  return (
    <svg className={className} style={{ transform: rot }} width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M2 2 V13 M2 2 H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 2 L9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="2" cy="2" r="2" fill="currentColor" />
    </svg>
  );
}

export function OrnateFrame({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Corner className="absolute top-1 left-1 text-accent" />
      <Corner className="absolute top-1 right-1 text-accent" rot="rotate(90deg)" />
      <Corner className="absolute bottom-1 right-1 text-accent" rot="rotate(180deg)" />
      <Corner className="absolute bottom-1 left-1 text-accent" rot="rotate(270deg)" />
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}

// ─── BismillahBanner ───
export function BismillahBanner() {
  return (
    <OrnateFrame className="mx-4 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-secondary/80 to-card/60 shadow-[0_4px_10px_rgba(0,0,0,0.25)] mb-3">
      <div className="px-4 py-5 text-center">
        <p className="font-quran text-2xl md:text-[1.7rem] leading-[2.6] text-foreground tracking-[0.02em]" dir="rtl" style={{ wordSpacing: '0.4em' }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-[10px] text-muted-foreground mt-2 font-urdu" dir="rtl">
          شروع اللہ کے نام سے جو نہایت مہربان رحم والا ہے
        </p>
      </div>
    </OrnateFrame>
  );
}

// ─── ExpandableText ───
export function ExpandableText({ text, lines = 3, className = '', lang = 'urdu' }) {
  const [expanded, setExpanded] = useState(false);
  const fontClass = lang === 'urdu' ? 'font-urdu' : '';
  return (
    <div>
      <p dir="rtl" className={`leading-relaxed text-foreground/90 ${fontClass} ${className} ${expanded ? '' : `line-clamp-${lines}`}`}>
        {text || '…'}
      </p>
      <button onClick={() => setExpanded(e => !e)} className="mt-1 text-xs font-semibold text-primary" dir="rtl">
        {expanded ? 'مختصر کریں' : 'مزید پڑھیں'}
      </button>
    </div>
  );
}

// ───────── components/quran/DisplayModeMenu.jsx ─────────
const MODES = [
  { id: 'audio', label: 'صرف تلاوت' },
  { id: 'translation', label: 'تلاوت + ترجمہ' },
  { id: 'wordMeanings', label: 'تلاوت + لفظی معانی' },
  { id: 'study', label: 'تلاوت + ترجمہ + معانی + تفسیر' },
  { id: 'full', label: 'مکمل مطالعہ (احادیث سمیت)' },
];

export function DisplayModeMenu({ mode, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] rounded-full flex items-center justify-center bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] shadow-[0_4px_7px_rgba(62,42,29,0.28),inset_0_1.5px_1px_rgba(255,255,255,0.7)] active:translate-y-0.5 transition-transform" title="ڈسپلے موڈ">
        <RefreshCw className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-primary/40 bg-card shadow-xl z-50 overflow-hidden">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted" dir="rtl">ڈسپلے موڈ</p>
          {MODES.map(m => (
            <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }} className={`w-full text-right px-3 py-2.5 text-sm hover:bg-accent/15 ${mode === m.id ? 'text-accent font-semibold bg-accent/10' : ''}`} dir="rtl">
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── components/quran/ReciterMenu.jsx ─────────
const RECITERS = [
  { id: 'ar.alafasy', name: 'مشارى العفاسی' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط (مرتل)' },
  { id: 'ar.husary', name: 'محمود الحصری' },
  { id: 'ar.minshawi', name: 'محمد المنشاوی' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمٰن السدیس' },
];

export function ReciterMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="h-[38px] sm:h-[42px] px-3 rounded-full flex items-center gap-1.5 bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] text-sm font-semibold shadow-[0_4px_7px_rgba(62,42,29,0.28),inset_0_1.5px_1px_rgba(255,255,255,0.7)] active:translate-y-0.5 transition-transform">
        <Volume2 className="w-4 h-4" />
        <span>آڈیو</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-primary/40 bg-card shadow-xl z-50 overflow-hidden">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted" dir="rtl">قاری منتخب کریں</p>
          {RECITERS.map(r => (
            <button key={r.id} onClick={() => { onChange(r.id); setOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent/15 ${value === r.id ? 'text-accent font-semibold bg-accent/10' : ''}`}>
              <span className="font-urdu" dir="rtl">{r.name}</span>
              {value === r.id && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── components/quran/TafsirSources.jsx ─────────
const LANG_LABEL = { ar: 'عربی', en: 'English', ur: 'اردو' };

export function TafsirSources({ sources = [], excludeAuthor = null }) {
  const [open, setOpen] = useState(false);
  const additional = sources.filter(s => s.text && s.author !== excludeAuthor);
  if (additional.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-card text-sm"
      >
        <span className="flex items-center gap-1.5 font-semibold text-foreground" dir="rtl">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          مزید تفاسیر ({additional.length})
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {additional.map((src, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground" dir="rtl">{src.author}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">{LANG_LABEL[src.language] || src.language}</span>
              </div>
              <ExpandableText text={src.text} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── components/quran/VerseBox.jsx ─────────
// Renders the Quranic verse with optional per-word grammatical color coding.
// When `words` (array of { arabic, category }) is provided, each word is
// colored by its grammatical category (Ism=teal, Harf=brown, Fail=dark brown).
// Otherwise falls back to plain text.
export function VerseBox({ arabic, ayahNumber, words }) {
  const hasColoredWords = words && words.length > 0;

  return (
    <OrnateFrame className="mx-4 rounded-2xl border-2 border-primary/40 bg-card shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
      <div className="flex items-start gap-3 px-4 py-7">
        <span className="shrink-0 w-11 h-11 rounded-lg bg-gradient-to-b from-[#9c6b3a] to-[#7a4f28] text-white font-bold text-lg flex items-center justify-center shadow-[0_3px_5px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-[#5e3d1c] tabular-nums mt-1">{ayahNumber}</span>
        {hasColoredWords ? (
          <p className="font-quran text-[1.85rem] md:text-[2.1rem] leading-[2.6] tracking-[0.01em] text-center flex-1 break-words" dir="rtl" style={{ wordSpacing: '0.4em', lineHeight: '2.6' }}>
            {words.map((w, i) => (
              <span key={i} style={{ color: getWordTextColor(w.category) }} className="font-quran">
                {w.arabic}{' '}
              </span>
            ))}
          </p>
        ) : (
          <p className="font-quran text-[1.85rem] md:text-[2.1rem] text-foreground leading-[2.6] tracking-[0.01em] text-center flex-1 break-words" dir="rtl" style={{ wordSpacing: '0.4em', lineHeight: '2.6' }}>{arabic}</p>
        )}
      </div>
    </OrnateFrame>
  );
}

// ───────── components/quran/WordMeaning.jsx ─────────
const usable = value => typeof value === 'string' && value.trim() && !['—', '-', '…'].includes(value.trim()) ? value.trim() : '';
export function getWordMeaning(word = {}) {
  const candidates = [word.urdu, word.urduTranslation];
  const urdu = candidates.map(usable).find(value => /[\u0600-\u06FF]/.test(value)) || '';
  const english = usable(word.english) || usable(word.englishTranslation) || candidates.map(usable).find(value => value && !/[\u0600-\u06FF]/.test(value)) || '';
  return { urdu, english };
}
export function WordMeaning({ word, className = '' }) {
  const { urdu, english } = getWordMeaning(word);
  return <span className={`${className} ${urdu ? 'font-urdu' : 'font-body'}`} dir={urdu ? 'rtl' : 'ltr'}>{urdu || (english ? `${english} (English)` : 'معنی دستیاب نہیں')}</span>;
}

// ───────── components/quran/WordOccurrence.jsx ─────────
export function WordOccurrence({ arabic }) {
  const [count, setCount] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setCount(null); setFailed(false);
    getExactWordCount(arabic).then(result => { if (!cancelled) setCount(result.count); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [arabic, attempt]);
  return <span className="text-[10px] text-muted-foreground mt-1" dir="rtl">{failed ? <button className="text-primary underline" onClick={() => setAttempt(n => n + 1)}>تعداد دوبارہ لوڈ کریں</button> : count === null ? 'تعداد شمار ہو رہی ہے…' : `${count} بار`}</span>;
}

// ───────── components/quran/WordByWord.jsx ─────────
const POS_COLORS = {
  ism: 'bg-emerald-600 text-white border-emerald-500',
  harf: 'bg-amber-600 text-white border-amber-500',
  fail: 'bg-amber-700 text-white border-amber-600',
};
const WORD_TEXT_COLOR = {
  ism: 'text-emerald-400',
  fail: 'text-amber-500',
  harf: 'text-amber-400',
};

export function WordByWord({ arabicText, words, onWordPlay, onWordClick, activeIndex, verseKey }) {
  const [menu, setMenu] = useState(null);
  const timer = useRef(null);

  const startPress = (i) => { timer.current = setTimeout(() => setMenu(i), 500); };
  const cancelPress = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const closeMenu = () => setMenu(null);

  const doCopy = (w) => { navigator.clipboard?.writeText(`${w.arabic} — ${w.urduTranslation || ''}`).catch(() => {}); closeMenu(); };
  const doShare = async (w) => { const t = `${w.arabic} — ${w.urduTranslation || ''}`; try { if (navigator.share) await navigator.share({ text: t }); else await navigator.clipboard?.writeText(t); } catch {} closeMenu(); };
  const doBookmark = (w, i) => { const key = `quran-word-bm-${verseKey}-${i}`; localStorage.setItem(key, JSON.stringify({ arabic: w.arabic, urdu: w.urduTranslation || '', verseKey })); closeMenu(); };
  const doDetail = (i) => { closeMenu(); onWordClick(i); };

  const menuWord = menu !== null ? words[menu] : null;

  return (
    <div className="relative">
      <p className="text-center text-xs text-muted-foreground mb-5" dir="rtl">لفظ پر کلک کریں — تفصیل دیکھیں۔ دیر سے دبائیں — کاپی / شیئر / بک مارک۔</p>
      <div className="flex flex-wrap justify-start gap-5" dir="rtl">
        {words.map((w, i) => {
          const active = activeIndex === i;
          return (
            <div key={i} className="flex flex-col items-center w-24 text-center">
              <button
                onClick={() => onWordClick(i)}
                onPointerDown={() => startPress(i)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onContextMenu={(e) => { e.preventDefault(); setMenu(i); }}
                className="mb-2 hover:opacity-70 transition-opacity"
              >
                <p className={`font-quran text-[1.75rem] transition-colors ${WORD_TEXT_COLOR[w.category] || 'text-foreground'}`} dir="rtl" style={{ wordSpacing: '0.4em', lineHeight: '2.6' }}>{w.arabic}</p>
              </button>
              <div className="flex items-center gap-1.5 mb-1.5">
                <button onClick={() => onWordPlay(i)} className={`transition-transform ${active ? 'scale-110' : 'hover:scale-110'}`} title="اس لفظ کی تلاوت سنیں">
                  <Volume2 className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} fill={active ? 'currentColor' : 'none'} />
                </button>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${POS_COLORS[w.category] || 'bg-secondary text-foreground/70 border-border'}`} dir="rtl">{w.partOfSpeech || '—'}</span>
              </div>
              <WordMeaning word={w} className="text-xs text-foreground/70" />
              <WordOccurrence arabic={w.arabic} />
            </div>
          );
        })}
      </div>

      {menuWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeMenu}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-64 p-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-center font-quran text-3xl py-2 text-foreground" dir="rtl">{menuWord.arabic}</p>
            <p className="text-center text-xs text-muted-foreground mb-2"><WordMeaning word={menuWord} /></p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => doCopy(menuWord)} className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-muted text-foreground"><Copy className="w-3.5 h-3.5" /> کاپی</button>
              <button onClick={() => doShare(menuWord)} className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-muted text-foreground"><Share2 className="w-3.5 h-3.5" /> شیئر</button>
              <button onClick={() => doBookmark(menuWord, menu)} className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-muted text-foreground"><Bookmark className="w-3.5 h-3.5" /> بک مارک</button>
              <button onClick={() => doDetail(menu)} className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-primary text-primary-foreground"><Info className="w-3.5 h-3.5" /> تفصیل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── components/quran/HadithRelatedAyahs.jsx ─────────
// Related ayahs for a hadith — found by matching distinctive words in our own Quran database.
export function HadithRelatedAyahs({ collection, hadithNumber, hadithText }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ayahs, setAyahs] = useState(null);

  const load = async () => {
    if (ayahs) { setOpen((o) => !o); return; }
    setOpen(true);
    setLoading(true);
    let list = [];
    try {
      let en = '';
      try {
        const rows = await backend.entities.Hadith.filter({ collection, hadith_number: hadithNumber, language: 'en' }, null, 1);
        en = rows?.[0]?.text || '';
      } catch { /* english text is optional */ }
      list = await findRelatedAyahs({ en, ur: hadithText, limit: 5 });
      if (!list.length) list = await getRelatedAyahs(`h:${collection}:${hadithNumber}`, en || hadithText, hadithText); // curated topic fallback
    } catch { list = []; }
    setAyahs(list);
    setLoading(false);
  };

  return (
    <div className="mt-2">
      <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 active:translate-y-0.5 transition-transform">
        <BookOpen className="w-3.5 h-3.5" />
        <span dir="rtl">متعلقہ قرآنی آیات</span>
        {ayahs && <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (
        loading ? (
          <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : ayahs && ayahs.length > 0 ? (
          <div className="mt-2 space-y-2">
            {ayahs.map((a, i) => (
              <Link key={i} to={`/reader/${a.surah}?ayah=${a.ayah}`} className="block rounded-lg bg-muted/50 border border-border p-2">
                <p className="font-arabic text-lg text-center text-foreground leading-loose" dir="rtl">{a.arabic}</p>
                <p className="text-xs text-center text-primary mt-1 tabular-nums">{a.surah}:{a.ayah}</p>
                {a.urdu && <p className="text-xs text-foreground/80 mt-1 font-urdu text-center leading-relaxed" dir="rtl">{a.urdu}</p>}
                {a.matched?.length > 0 && <p className="text-[10px] text-muted-foreground mt-1 font-urdu text-center" dir="rtl">مشترک الفاظ: {a.matched.join('، ')}</p>}
                {a.topic && <p className="text-[10px] text-primary mt-1 font-urdu text-center" dir="rtl">موضوع: {a.topic}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1" dir="rtl">کوئی متعلقہ آیت نہیں ملی۔ (ڈیٹا بیس میں قرآن کا ڈیٹا لوڈ ہونا ضروری ہے: npm run seed)</p>
        )
      )}
    </div>
  );
}

// ───────── components/quran/HadithBook.jsx ─────────
const cdnCache = new Map();

const fontFor = (lang) => (lang === 'ara' ? 'font-arabic' : lang === 'eng' ? 'font-body' : 'font-urdu');

export function HadithBook({ editionId, collection, language }) {
  const [dbChapters, setDbChapters] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [sectionHadiths, setSectionHadiths] = useState({});
  const [loadingSection, setLoadingSection] = useState(false);
  const [jump, setJump] = useState('');
  const [jumped, setJumped] = useState(null);
  const [query, setQuery] = useState('');
  const [cdnData, setCdnData] = useState(null);
  const [cdnLoading, setCdnLoading] = useState(false);
  const [error, setError] = useState('');

  const isUrd = language === 'urd';

  useEffect(() => {
    let cancelled = false;
    setDbChapters(null); setOpenSection(null); setSectionHadiths({}); setJumped(null); setQuery(''); setCdnData(null); setError('');
    (async () => {
      if (isUrd) {
        try {
          const ch = await backend.entities.HadithChapter.filter({ collection, language: 'ur' }, 'book', 5000);
          if (!cancelled) setDbChapters(ch || []);
        } catch { if (!cancelled) setDbChapters([]); }
      } else { if (!cancelled) setDbChapters([]); }
      if (cdnCache.has(editionId)) { if (!cancelled) setCdnData(cdnCache.get(editionId)); return; }
      if (!cancelled) setCdnLoading(true);
      try {
        const d = await hadithApi.getEdition(editionId);
        cdnCache.set(editionId, d);
        if (!cancelled) setCdnData(d);
      } catch { if (!cancelled) setError('کتاب لوڈ نہیں ہوئی۔'); }
      finally { if (!cancelled) setCdnLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [editionId, collection, language, isUrd]);

  const useDB = isUrd && dbChapters && dbChapters.length > 0;
  const mode = isUrd
    ? (dbChapters === null ? 'loading' : useDB ? 'db' : (cdnData ? 'cdn' : (cdnLoading ? 'loading' : 'error')))
    : (cdnData ? 'cdn' : (cdnLoading ? 'loading' : 'error'));

  const fClass = fontFor(language);

  const openDbSection = async (id) => {
    if (openSection === id) { setOpenSection(null); return; }
    setOpenSection(id);
    if (!sectionHadiths[id]) {
      setLoadingSection(true);
      try {
        const h = await backend.entities.Hadith.filter({ collection, language: 'ur', book: id }, 'hadith_number', 5000);
        setSectionHadiths((s) => ({ ...s, [id]: h || [] }));
      } catch { setSectionHadiths((s) => ({ ...s, [id]: [] })); }
      finally { setLoadingSection(false); }
    }
  };

  const doJump = async () => {
    const n = Number(jump);
    if (!n) return;
    if (useDB) {
      try {
        const h = await backend.entities.Hadith.filter({ collection, hadith_number: n, language: 'ur' }, null, 1);
        if (h && h.length) { setJumped(h[0]); setOpenSection(String(h[0].book)); }
      } catch {}
      return;
    }
    if (cdnData) {
      const h = cdnData.hadiths.find((x) => x.hadithnumber === n);
      if (h) { setJumped(h); setOpenSection(String(h.reference?.book)); }
    }
  };

  const cdnSections = useMemo(() => {
    if (!cdnData?.metadata?.sections) return [];
    return Object.entries(cdnData.metadata.sections).filter(([id]) => id !== '0').map(([id, name]) => {
      const det = cdnData.metadata.section_details?.[id] || {};
      return { id, name, first: det.hadithnumber_first, last: det.hadithnumber_last };
    });
  }, [cdnData]);

  const cdnHadithsBySection = (id) => (cdnData?.hadiths || []).filter((h) => String(h.reference?.book) === String(id));

  const dbSearch = useMemo(() => {
    if (!query.trim() || !useDB) return [];
    const q = query.trim();
    return Object.values(sectionHadiths).flat().filter((h) => h.text && h.text.includes(q)).slice(0, 50);
  }, [query, useDB, sectionHadiths]);

  const cdnSearch = useMemo(() => {
    if (!query.trim() || !cdnData) return [];
    const q = query.trim();
    return cdnData.hadiths.filter((h) => h.text && h.text.includes(q)).slice(0, 50);
  }, [query, cdnData]);

  const chapters = useDB
    ? dbChapters.map((c) => ({ id: c.book, name: c.chapter_name, first: c.hadith_first, last: c.hadith_last }))
    : cdnSections;

  if (mode === 'loading')
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground" dir="rtl">کتاب لوڈ ہو رہی ہے…</p>
      </div>
    );
  if (mode === 'error') return <p className="text-center text-sm text-destructive py-8" dir="rtl">{error || 'کتاب دستیاب نہیں۔'}</p>;

  const renderHadith = (h, num) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground tabular-nums">حدیث {num}</span>
        <div className="flex gap-2 items-center">
          <SaveToNotebook
            itemType="hadith"
            citation={`${collection} — حدیث ${num}`}
            content={h.text}
            sourceRef={`${collection}:${num}`}
            label="نوٹ بک"
          />
          <button onClick={() => navigator.clipboard?.writeText(h.text)} className="text-muted-foreground"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={async () => { try { navigator.share ? await navigator.share({ text: h.text }) : navigator.clipboard?.writeText(h.text); } catch {} }} className="text-muted-foreground"><Share2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <p className={`text-sm leading-relaxed text-foreground whitespace-pre-line ${fClass}`} dir="rtl">{h.text}</p>
      <HadithRelatedAyahs collection={collection} hadithNumber={num} hadithText={h.text} />
    </div>
  );

  return (
    <div className="px-4">
      {useDB && (
        <p className="text-xs text-center text-primary mb-3 font-medium" dir="rtl">⬇ محفوظ شدہ (offline) — اپنے ڈیٹا بیس سے</p>
      )}

      <div className="flex gap-2 mb-3">
        <input value={jump} onChange={(e) => setJump(e.target.value)} type="number" inputMode="numeric" placeholder="حدیث نمبر" className="flex-1 h-10 px-3 rounded-full bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" dir="rtl" />
        <button onClick={doJump} className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1"><Hash className="w-4 h-4" /><span dir="rtl">جائیں</span></button>
      </div>

      <div className="flex items-center gap-2 mb-4 rounded-full bg-card border border-border px-3 h-10">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={useDB ? 'کھلے ہوئے ابواب میں تلاش' : 'کتاب میں تلاش کریں'} className="flex-1 bg-transparent text-sm focus:outline-none" dir="rtl" />
      </div>

      {query.trim() && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-muted-foreground" dir="rtl">{useDB ? dbSearch.length : cdnSearch.length} نتائج{useDB && ' (کھلے ابواب میں)'}</p>
          {(useDB ? dbSearch : cdnSearch).map((h) => (
            <div key={h.hadithnumber || h.id} className="rounded-xl border border-border bg-card p-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground tabular-nums">حدیث {h.hadithnumber}</span>
              <p className={`mt-1 text-sm leading-relaxed text-foreground whitespace-pre-line ${fClass}`} dir="rtl">{h.text}</p>
            </div>
          ))}
          {!((useDB ? dbSearch : cdnSearch).length) && <p className="text-xs text-muted-foreground" dir="rtl">کوئی نتیجہ نہیں۔</p>}
        </div>
      )}

      {jumped && (
        <div className="mb-4 rounded-xl border-2 border-accent/40 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground tabular-nums">حدیث {jumped.hadithnumber}</span>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(jumped.text)} className="text-muted-foreground"><Copy className="w-4 h-4" /></button>
              <button onClick={async () => { try { navigator.share ? await navigator.share({ text: jumped.text }) : navigator.clipboard?.writeText(jumped.text); } catch {} }} className="text-muted-foreground"><Share2 className="w-4 h-4" /></button>
            </div>
          </div>
          <p className={`text-sm leading-relaxed text-foreground whitespace-pre-line ${fClass}`} dir="rtl">{jumped.text}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-2" dir="rtl">{chapters.length} ابواب</p>

      <div className="space-y-2">
        {chapters.map((s) => {
          const open = openSection === s.id;
          let list = [];
          if (open) {
            if (useDB) list = sectionHadiths[s.id] || (loadingSection ? null : []);
            else list = cdnHadithsBySection(s.id);
          }
          return (
            <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => (useDB ? openDbSection(s.id) : setOpenSection(open ? null : s.id))} className="w-full flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-right flex-1" dir="rtl">{s.name || `باب ${s.id}`}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">{s.first}–{s.last}</span>
                <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="divide-y divide-border border-t border-border">
                  {list === null ? (
                    <div className="px-4 py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                  ) : list.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted-foreground" dir="rtl">کوئی حدیث نہیں۔</p>
                  ) : (
                    list.map((h) => <div key={h.hadithnumber || h.id}>{renderHadith(h, h.hadithnumber)}</div>)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────── components/quran/HadithCard.jsx ─────────
export function HadithCard({ hadiths, loading }) {
  const [open, setOpen] = useState(false);
  const list = hadiths && hadiths.length ? hadiths : [];

  return (
    <div className="mx-4 mb-3 rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 pt-3 flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          <BookQuillIcon className="w-3.5 h-3.5" />
          <span dir="rtl">متعلقہ احادیث {list.length ? `(${list.length})` : ''}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="divide-y divide-border">
          {loading ? (
            <p className="px-4 py-4 text-sm text-muted-foreground text-center" dir="rtl">احادیث لوڈ ہو رہی ہیں…</p>
          ) : list.length ? (
            list.map((h, i) => (
              <div key={i} className="px-4 py-3">
                {h.topic && <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary mb-2 font-urdu" dir="rtl">موضوع: {h.topic}</span>}
                <ExpandableText text={h.text} className="text-sm font-urdu" lang="urdu" />
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-xs text-muted-foreground font-urdu" dir="rtl">— {h.source}</span>
                  <SaveToNotebook
                    itemType="hadith"
                    citation={h.source || 'حدیث'}
                    content={h.text || ''}
                    sourceRef={h.source || ''}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground text-center" dir="rtl">کوئی متعلقہ حدیث دستیاب نہیں۔</p>
          )}
        </div>
      )}

      {!open && !loading && list.length > 0 && (
        <div className="px-4 py-2.5 text-xs text-muted-foreground" dir="rtl">
          {list.length} متعلقہ احادیث دیکھنے کے لیے کلک کریں →
        </div>
      )}
    </div>
  );
}

// ───────── components/quran/RelatedAyahs.jsx ─────────
// Related ayahs (database keyword match → curated topic fallback) + research articles linked to this ayah.
export function RelatedAyahs({ verseKey, verseText, translationUrdu, translationEnglish }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ayahs, setAyahs] = useState(null);
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(false);

  const load = async () => {
    if (ayahs) { setOpen((o) => !o); return; }
    setOpen(true);
    setLoading(true);
    setError(false);
    const [s, a] = String(verseKey).split(':').map(Number);
    try {
      let list = await findRelatedAyahs({ en: translationEnglish || verseText, ur: translationUrdu, excludeKey: verseKey, limit: 5 });
      if (!list.length) list = await getRelatedAyahs(verseKey, translationEnglish || verseText, translationUrdu);
      setAyahs(list);
    } catch {
      setError(true);
    }
    setArticles(await findArticlesForAyah(s, a));
    setLoading(false);
  };

  return (
    <div className="mx-4 mt-3">
      <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 active:translate-y-0.5 transition-transform">
        <BookOpen className="w-3.5 h-3.5" />
        <span dir="rtl">متعلقہ قرآنی آیات اور مضامین</span>
        {ayahs && <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (
        loading ? (
          <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="text-xs text-muted-foreground mt-1" dir="rtl">متعلقہ آیات فی الحال دستیاب نہیں۔ براہ کرم انٹرنیٹ کنکشن چیک کریں۔</p>
        ) : (
          <>
            {ayahs && ayahs.length > 0 ? (
              <div className="mt-2 space-y-2">
                {ayahs.map((a, i) => (
                  <Link key={i} to={`/reader/${a.surah}?ayah=${a.ayah}`} className="block rounded-lg bg-muted/50 border border-border p-2">
                    <p className="font-arabic text-lg text-center text-foreground leading-loose" dir="rtl">{a.arabic}</p>
                    <p className="text-xs text-center text-primary mt-1 tabular-nums">{a.surah}:{a.ayah}</p>
                    {a.urdu && <p className="text-xs text-foreground/80 mt-1 font-urdu text-center leading-relaxed" dir="rtl">{a.urdu}</p>}
                    {a.matched?.length > 0 && <p className="text-[10px] text-muted-foreground mt-1 font-urdu text-center" dir="rtl">مشترک الفاظ: {a.matched.join('، ')}</p>}
                    {a.topic && <p className="text-[10px] text-primary mt-1 font-urdu text-center" dir="rtl">موضوع: {a.topic}</p>}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1" dir="rtl">کوئی متعلقہ آیت نہیں ملی۔</p>
            )}
            {articles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5" dir="rtl"><Newspaper className="w-3.5 h-3.5 text-primary" /> اس آیت سے متعلق تحقیقی مضامین</p>
                {articles.map((x) => (
                  <Link key={x.id} to={`/articles/${x.id}`} className="block rounded-lg border border-border bg-card p-2.5">
                    <p className="text-sm font-medium text-foreground" dir="auto">{x.title}</p>
                    {x.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2" dir="auto">{x.summary}</p>}
                  </Link>
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

// ───────── components/quran/LearningAnalytics.jsx ─────────
export function LearningAnalytics() {
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [userRecords, setUserRecords] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const records = await backend.entities.LearningRecord.list('-created_date', 200);
        setUserRecords(records || []);
        const rec = await getRecommendedVerses(backend, records || []);
        setRecommendation(rec);
      } catch {
        setRecommendation({ category: null, verses: [], message: 'تجزیہ فی الحال دستیاب نہیں۔' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reanalyze = async () => {
    setAnalyzing(true);
    try {
      await analyzeAndStoreBestMethods(backend);
      const records = await backend.entities.LearningRecord.list('-created_date', 200);
      setUserRecords(records || []);
      const rec = await getRecommendedVerses(backend, records || []);
      setRecommendation(rec);
    } catch {}
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold" dir="rtl">AI سیکھنے کا تجزیہ</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-3" dir="rtl">تجزیہ تیار ہو رہا ہے…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 border border-accent/30 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold" dir="rtl">AI سیکھنے کا تجزیہ</span>
        </div>
        <button
          onClick={reanalyze}
          disabled={analyzing}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          dir="rtl"
        >
          <RefreshCw className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} />
          <span>تجزیہ اپ ڈیٹ</span>
        </button>
      </div>

      {/* Weakest area + recommendation */}
      {recommendation && recommendation.category ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-background/60 border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
              <span className="text-xs font-medium" dir="rtl">آپ کا کمزور پہلو</span>
            </div>
            <p className="text-sm font-semibold" dir="rtl">
              {categoryLabels[recommendation.category] || recommendation.category}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-urdu leading-relaxed" dir="rtl">
              {recommendation.message}
            </p>
          </div>

          {/* Recommended verses sequence */}
          {recommendation.verses && recommendation.verses.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium" dir="rtl">تجویز کردہ ترتیب ({recommendation.usersBenefited || 0} صارفین فائدہ اٹھا چکے)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendation.verses.slice(0, 6).map((v, i) => (
                  <Link
                    key={`${v}-${i}`}
                    to={`/reader/${v.split(':')[0]}?ayah=${v.split(':')[1]}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium hover:bg-primary/20"
                    dir="rtl"
                  >
                    {i + 1}. آیت {v}
                  </Link>
                ))}
              </div>
              {recommendation.effectiveness != null && (
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px] text-muted-foreground" dir="rtl">
                    اثرائیشness: {recommendation.effectiveness}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2" dir="rtl">
              {recommendation.message}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3" dir="rtl">
          {recommendation?.message || 'ابھی تجزیہ کے لیے کافی ڈیٹا نہیں۔ پریکٹس جاری رکھیں۔'}
        </p>
      )}

      {/* User's total records count */}
      {userRecords.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center" dir="rtl">
            کل ریکارڈ: {userRecords.length} — آپ کا ڈیٹا دوسروں کی رہنمائی کے لیے بھی استعمال ہو رہا ہے
          </p>
        </div>
      )}
    </div>
  );
}
