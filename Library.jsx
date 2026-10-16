import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, BookOpen, Loader2, ArrowLeft, BookText, ScrollText, Sparkles, Search as SearchIcon, BookMarked, WifiOff, History, Trash2, Download, CheckCircle2, Database, FileText, AlertCircle, RotateCcw } from 'lucide-react';
import { getCachedSurahs, setCachedSurahs, quranApi, TOPICS, hadithApi, searchOffline, searchHadithsOffline, isDownloaded, isHadithDownloaded, getAllSurahs, getOverallProgress, downloadAllQuran, downloadSurah } from '@/lib/quran';
import { HadithBook } from '@/components/quran';
import { useLanguage } from '@/lib/app';
import { buildDictionary, getGrammarTypeMeta } from '@/lib/dictionary';
import { getHistory, clearHistory } from '@/lib/stores';
import { SURAHS, TOTAL_SURAHS, TOTAL_AYAHS, TOTAL_WORDS } from '@/lib/data';

// ───────── pages/Quran.jsx ─────────
export function Quran() {
  const [surahs, setSurahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const cached = getCachedSurahs();
    if (cached) { setSurahs(cached); setLoading(false); }
    quranApi.getSurahs()
      .then(data => { setSurahs(data); setCachedSurahs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = surahs.filter(s => {
    const q = query.toLowerCase();
    return s.englishName.toLowerCase().includes(q) || s.name.includes(query) || String(s.number) === query;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-xl font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> القرآن</h1>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="سورت کا نام یا نمبر تلاش کریں..."
          dir="rtl"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <button
              key={s.number}
              onClick={() => navigate(`/reader/${s.number}`)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-accent/50 text-left transition-colors"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 text-primary text-sm font-semibold shrink-0">{s.number}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.englishName} <span className="text-muted-foreground font-normal">• {s.englishNameTranslation}</span></p>
                <p className="text-sm text-muted-foreground">{s.numberOfAyahs} verses • {s.revelationType}</p>
              </div>
              <span className="font-arabic text-xl text-foreground shrink-0">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── pages/Hadith.jsx ─────────
const BOOKS = [
  { id: 'bukhari', name: 'صحیح بخاری' },
  { id: 'muslim', name: 'صحیح مسلم' },
  { id: 'abudawud', name: 'سنن ابی داؤد' },
  { id: 'tirmidhi', name: 'جامع ترمذی' },
  { id: 'nasai', name: 'سنن نسائی' },
  { id: 'ibnmajah', name: 'سنن ابن ماجہ' },
];
const LANGS = [
  { p: 'urd', label: 'اردو' },
  { p: 'ara', label: 'عربی' },
  { p: 'eng', label: 'English' },
];

export function Hadith() {
  const [book, setBook] = useState('bukhari');
  const [lang, setLang] = useState('urd');
  const editionId = `${lang}-${book}`;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="px-4 pt-6">
        <h1 className="font-heading text-xl font-bold flex items-center justify-center gap-2 mb-1"><BookText className="w-5 h-5 text-primary" /><span dir="rtl">کتب حدیث</span></h1>
        <p className="text-center text-xs text-muted-foreground mb-4" dir="rtl">کتبِ ستہ — مکمل (نمبر سے ڈائریکٹ رسائی)</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {BOOKS.map(b => (
            <button key={b.id} onClick={() => setBook(b.id)} className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${book === b.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`} dir="rtl">{b.name}</button>
          ))}
        </div>
        <div className="flex justify-center gap-2 mb-4">
          {LANGS.map(l => (
            <button key={l.p} onClick={() => setLang(l.p)} className={`px-4 h-9 rounded-full text-sm border transition-colors ${lang === l.p ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border'}`} dir="rtl">{l.label}</button>
          ))}
        </div>
      </div>

      <HadithBook editionId={editionId} collection={book} language={lang} key={editionId} />
    </div>
  );
}

// ───────── pages/Topics.jsx ─────────
export function Topics() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [selected, setSelected] = useState(null);
  const [ayahs, setAyahs] = useState([]);
  const [hadiths, setHadiths] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectTopic = async (topic) => {
    setSelected(topic);
    setLoading(true);
    setAyahs([]);
    setHadiths([]);

    // Fetch ayahs in parallel
    const ayahResults = await Promise.all(
      topic.ayahs.map(async (ref) => {
        try {
          const d = await quranApi.getAyahEditions(`${ref.s}:${ref.a}`, 'quran-uthmani,ur.jalandhry');
          if (d?.data?.[0]?.text) {
            return { surah: ref.s, ayah: ref.a, arabic: d.data[0].text, urdu: d.data[1]?.text || '' };
          }
        } catch {}
        return null;
      })
    );
    setAyahs(ayahResults.filter(Boolean));

    // Fetch hadiths in parallel
    const hadithResults = await Promise.all(
      topic.hadiths.map(async (num) => {
        try {
          const d = await hadithApi.getHadith('urd-bukhari', num);
          if (d?.hadiths?.[0]?.text) return { number: num, text: d.hadiths[0].text };
        } catch {}
        return null;
      })
    );
    setHadiths(hadithResults.filter(Boolean));
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> {t('topics_title')}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground mb-4" dir="auto">{t('topics_subtitle')}</p>

      {/* Topic grid */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {TOPICS.map(topic => (
          <button
            key={topic.id}
            onClick={() => selectTopic(topic)}
            className={`p-3 rounded-xl border text-sm font-medium transition-all text-right ${
              selected?.id === topic.id
                ? 'border-primary bg-primary text-primary-foreground shadow-md'
                : 'border-border bg-card hover:border-accent/50'
            }`}
            dir="rtl"
          >
            {topic.label}
          </button>
        ))}
      </div>

      {/* Selected topic content */}
      {selected && (
        <div className="space-y-4 animate-rise">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && ayahs.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-2 flex items-center gap-1.5" dir="rtl">
                <BookOpen className="w-4 h-4" /> {t('topics_ayahs')}
              </h2>
              <div className="space-y-2">
                {ayahs.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/reader/${a.surah}?ayah=${a.ayah}`)}
                    className="w-full text-right p-4 rounded-xl bg-card border border-border hover:border-accent/50 transition-colors"
                  >
                    <p className="font-arabic text-lg text-foreground leading-loose mb-1" dir="rtl">{a.arabic}</p>
                    {a.urdu && <p className="text-sm text-foreground/80 font-urdu leading-relaxed mb-1" dir="rtl">{a.urdu}</p>}
                    <p className="text-xs text-muted-foreground tabular-nums">{a.surah}:{a.ayah}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && hadiths.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-2 flex items-center gap-1.5" dir="rtl">
                <ScrollText className="w-4 h-4" /> {t('topics_hadiths')}
              </h2>
              <div className="space-y-2">
                {hadiths.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl bg-card border border-border">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground tabular-nums mb-2 inline-block" dir="rtl">حدیث {h.number}</span>
                    <p className="text-sm text-foreground/90 font-urdu leading-relaxed" dir="rtl">{h.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && ayahs.length === 0 && hadiths.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10" dir="rtl">{t('topics_no_content')}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ───────── pages/Search.jsx ─────────
export function SearchPage() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('quran');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasData, setHasData] = useState({ quran: null, hadith: null });
  const [surahFilter, setSurahFilter] = useState('all');
  const [revelationFilter, setRevelationFilter] = useState('all');
  const [surahs, setSurahs] = useState([]);
  const dictionary = useMemo(() => buildDictionary(), []);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Check offline data availability once
  useEffect(() => {
    (async () => {
      setHasData({ quran: await isDownloaded(), hadith: await isHadithDownloaded() });
      setSurahs(await getAllSurahs());
    })();
  }, []);

  const run = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      if (mode === 'dictionary') {
        const query = q.trim().toLowerCase();
        const list = dictionary.filter(w =>
          w.ar.includes(q.trim()) ||
          w.ur.toLowerCase().includes(query) ||
          w.en.toLowerCase().includes(query)
        ).slice(0, 50);
        setResults(list);
      } else {
        let list = mode === 'quran'
          ? await searchOffline(q, 50)
          : await searchHadithsOffline(q, 50);
        if (mode === 'quran') {
          list = list.filter(v => {
            if (surahFilter !== 'all' && v.surah !== parseInt(surahFilter)) return false;
            if (revelationFilter !== 'all') {
              const sr = surahs.find(s => s.number === v.surah);
              if (sr && sr.revelationType !== revelationFilter) return false;
            }
            return true;
          });
        }
        setResults(list);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setResults([]);
    setSearched(false);
  };

  const dataReady = mode === 'quran' ? hasData.quran : mode === 'hadith' ? hasData.hadith : true;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-xl font-semibold flex items-center gap-2"><SearchIcon className="w-5 h-5 text-primary" /> {t('search_title')}</h1>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-full">
          <WifiOff className="w-3 h-3" /> {t('search_offline')}
        </span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => switchMode('quran')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${mode === 'quran' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
          dir="rtl"
        >
          <BookOpen className="w-4 h-4" /> {t('search_quran')}
        </button>
        <button
          onClick={() => switchMode('hadith')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${mode === 'hadith' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
          dir="rtl"
        >
          <BookText className="w-4 h-4" /> {t('search_hadith')}
        </button>
        <button
          onClick={() => switchMode('dictionary')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${mode === 'dictionary' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
          dir="rtl"
        >
          <BookMarked className="w-4 h-4" /> {t('search_dictionary')}
        </button>
      </div>

      {mode === 'quran' && hasData.quran && surahs.length > 0 && (
        <div className="flex gap-2 mb-4">
          <select
            value={surahFilter}
            onChange={e => setSurahFilter(e.target.value)}
            className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            dir="rtl"
          >
            <option value="all">{t('search_all')} — {t('search_filter_surah')}</option>
            {surahs.map(s => (
              <option key={s.number} value={s.number}>{s.number}. {s.englishName} — {s.name}</option>
            ))}
          </select>
          <select
            value={revelationFilter}
            onChange={e => setRevelationFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            dir="rtl"
          >
            <option value="all">{t('search_all')}</option>
            <option value="Meccan">{t('search_meccan')}</option>
            <option value="Medinan">{t('search_medinan')}</option>
          </select>
        </div>
      )}

      <form onSubmit={run} className="relative mb-5">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={mode === 'quran' ? t('search_quran_ph') : t('search_hadith_ph')}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </form>

      {hasData[mode] === false && (
        <p className="text-center text-sm text-muted-foreground py-6" dir="rtl">
          {t('search_no_data')}
        </p>
      )}

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      {!loading && searched && results.length === 0 && dataReady !== false && (
        <p className="text-center text-sm text-muted-foreground py-10" dir="rtl">{t('search_no_results')}</p>
      )}

      <div className="space-y-2">
        {mode === 'quran' && results.map((v) => (
          <button
            key={v.ayah_global}
            onClick={() => navigate(`/reader/${v.surah}?ayah=${v.ayah}`)}
            className="w-full text-right p-4 rounded-xl bg-card border border-border hover:border-accent/50 transition-colors"
          >
            <p className="font-arabic text-lg text-foreground leading-loose mb-1" dir="rtl">{v.text_uthmani}</p>
            {v.translation_urdu && <p className="text-sm text-foreground/80 font-urdu leading-relaxed mb-1" dir="rtl">{v.translation_urdu}</p>}
            <p className="text-xs text-muted-foreground tabular-nums">{v.surah_name_english} {v.surah}:{v.ayah}</p>
          </button>
        ))}

        {mode === 'hadith' && results.map((h) => (
          <button
            key={h.id}
            onClick={() => navigate('/hadith')}
            className="w-full text-right p-4 rounded-xl bg-card border border-border hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground tabular-nums">حدیث {h.hadith_number}</span>
              <span className="text-xs text-muted-foreground" dir="rtl">{h.collection}</span>
            </div>
            <p className="text-sm text-foreground/90 font-urdu leading-relaxed line-clamp-3" dir="rtl">{h.text}</p>
          </button>
        ))}

        {mode === 'dictionary' && results.map((w) => (
          <div
            key={w.serial_no}
            className="w-full text-right p-4 rounded-xl bg-card border border-border hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="font-quran text-2xl text-foreground" dir="rtl" style={{ wordSpacing: '0.2em' }}>{w.ar}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold tabular-nums shrink-0">
                {w.count}× {t('search_dict_count')}
              </span>
            </div>
            <p className="text-sm font-urdu text-foreground/90 leading-relaxed" dir="rtl">{w.ur}</p>
            <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{w.en}</p>
            {w.grammar_type && (
              <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border ${getGrammarTypeMeta(w.grammar_type).color} font-medium`} dir="rtl">
                {w.grammar_subtype || getGrammarTypeMeta(w.grammar_type).label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── pages/ReadingHistory.jsx ─────────
export function ReadingHistory() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const surahs = getCachedSurahs() || [];
    const raw = getHistory(30);
    setHistory(raw.map(e => {
      const info = surahs.find(s => s.number === Number(e.surah));
      return {
        ...e,
        surahName: e.surahName || info?.englishName || `Surah ${e.surah}`,
        arabicName: e.arabicName || info?.name || '',
      };
    }));
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const formatTime = (ts) => {
    const diff = Date.now() - ts;
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days} دن پہلے`;
    if (hrs > 0) return `${hrs} گھنٹے پہلے`;
    const mins = Math.floor(diff / 60000);
    return mins > 0 ? `${mins} منٹ پہلے` : 'ابھی';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background sticky top-0 z-10 border-b border-border">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-sm font-semibold text-foreground flex items-center gap-1.5" dir="rtl">
          <History className="w-4 h-4 text-primary" />
          {t('home_last_read')}
        </h1>
        {history.length > 0 ? (
          <button onClick={handleClear} className="p-2 -mr-2 text-muted-foreground hover:text-destructive" aria-label="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : <span className="w-9" />}
      </div>

      {/* List */}
      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 border border-border grid place-items-center">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-urdu" dir="rtl">
            ابھی کوئی پڑھی ہوئی آیت نہیں۔ قرآن کھولیں اور مطالعہ شروع کریں — یہاں خود بخود محفوظ ہو جائے گی۔
          </p>
          <Link to="/quran" className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            <BookOpen className="w-4 h-4" /> قرآن کھولیں
          </Link>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-2.5">
          {history.map((h, i) => (
            <Link
              key={h.key}
              to={`/reader/${h.surah}?ayah=${h.ayah}`}
              className={`flex items-center gap-3 p-3.5 border rounded-2xl bg-gradient-to-br from-secondary/90 to-card/82 transition-all hover:border-primary hover:shadow-[0_8px_22px_rgba(0,0,0,0.2)] ${i === 0 ? 'border-primary/50' : 'border-border'}`}
            >
              <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'}`}>
                {i === 0 ? <History className="w-5 h-5" /> : <span className="text-xs font-bold tabular-nums">{h.ayah}</span>}
              </span>
              <div className="flex-1 min-w-0 text-right">
                <span className="block text-[10px] text-muted-foreground mb-0.5" dir="rtl">
                  {i === 0 ? 'آخری بار پڑھی' : formatTime(h.visitedAt)}
                </span>
                <span className="block text-sm font-bold text-foreground truncate">{h.surahName} • آیت {h.ayah}</span>
              </div>
              {h.arabicName && <span className="font-quran text-xl text-[#e2c878] whitespace-nowrap">{h.arabicName}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── pages/QuranDataStatus.jsx ─────────
export function QuranDataStatus() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [progress, setProgress] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [error, setError] = useState('');

  const loadProgress = useCallback(async () => {
    try {
      const p = await getOverallProgress();
      setProgress(p);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const handleDownloadAll = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadAllQuran((status) => {
        if (status.done) {
          setDownloadStatus(lang === 'ur' ? 'مکمل ہو گیا!' : 'Complete!');
        } else if (status.currentSurah) {
          setDownloadStatus(`${lang === 'ur' ? 'سورہ' : 'Surah'} ${status.currentSurah}/${status.totalSurahs} — ${status.surahName || ''}`);
        }
      });
      await loadProgress();
    } catch (e) {
      setError(e.message);
    }
    setDownloading(false);
  };

  const handleDownloadOne = async (surahNumber) => {
    setDownloading(true);
    setError('');
    try {
      setDownloadStatus(`${lang === 'ur' ? 'سورہ' : 'Surah'} ${surahNumber}...`);
      await downloadSurah(surahNumber);
      await loadProgress();
      setDownloadStatus(lang === 'ur' ? 'مکمل!' : 'Done!');
    } catch (e) {
      setError(e.message);
    }
    setDownloading(false);
  };

  const p = progress || { totalSurahs: TOTAL_SURAHS, downloadedSurahs: 0, verifiedSurahs: 0, totalAyahs: TOTAL_AYAHS, downloadedAyahs: 0, totalWords: TOTAL_WORDS, downloadedWords: 0, surahProgress: [], percent: 0 };
  const surahProgressMap = new Map((p.surahProgress || []).map(sp => [sp.surahNumber, sp]));
  const isUr = lang === 'ur';

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <span dir={isUr ? 'rtl' : 'ltr'}>{isUr ? 'قرآن مکمل ڈیٹا بیس' : 'Quran Full Database'}</span>
        </h1>
      </div>

      {/* Overall progress card */}
      <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-secondary/80 to-card/60 p-5 mb-4 shadow-sm">
        <div className="text-center mb-4">
          <p className="font-arabic text-xl text-foreground mb-1" dir="rtl">القرآن — مکمل ورڈ ڈیٹا</p>
          <p className="text-xs text-muted-foreground" dir={isUr ? 'rtl' : 'ltr'}>
            {isUr ? 'سورہ فاتحہ سے سورہ ناس تک — ہر لفظ کی مکمل تفصیل' : 'Al-Fatihah to An-Nas — every word fully indexed'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground" dir={isUr ? 'rtl' : 'ltr'}>{isUr ? 'پوگرس' : 'Progress'}</span>
            <span className="font-bold text-primary tabular-nums">{p.percent}%</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden border border-border">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${p.percent}%` }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card/80 border border-border p-3 text-center">
            <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground tabular-nums">{p.downloadedSurahs}/{p.totalSurahs}</p>
            <p className="text-[10px] text-muted-foreground" dir={isUr ? 'rtl' : 'ltr'}>{isUr ? 'سورتیں' : 'Surahs'}</p>
          </div>
          <div className="rounded-xl bg-card/80 border border-border p-3 text-center">
            <FileText className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground tabular-nums">{p.downloadedAyahs}/{p.totalAyahs}</p>
            <p className="text-[10px] text-muted-foreground" dir={isUr ? 'rtl' : 'ltr'}>{isUr ? 'آیات' : 'Ayahs'}</p>
          </div>
          <div className="rounded-xl bg-card/80 border border-border p-3 text-center">
            <Database className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground tabular-nums">{p.downloadedWords.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground" dir={isUr ? 'rtl' : 'ltr'}>{isUr ? 'الفاظ' : 'Words'}</p>
          </div>
        </div>

        {/* Verified badge */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <CheckCircle2 className={`w-4 h-4 ${p.verifiedSurahs === p.totalSurahs ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-muted-foreground" dir={isUr ? 'rtl' : 'ltr'}>
            {isUr ? `${p.verifiedSurahs} سورتیں ویریفائیڈ` : `${p.verifiedSurahs} surahs verified`}
          </span>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownloadAll}
          disabled={downloading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span dir={isUr ? 'rtl' : 'ltr'}>
            {downloading
              ? (downloadStatus || (isUr ? 'ڈاؤن لوڈ ہو رہا ہے…' : 'Downloading…'))
              : isUr ? 'پورا قرآن ڈاؤن لوڈ کریں' : 'Download Full Quran'}
          </span>
        </button>

        {error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-destructive" dir={isUr ? 'rtl' : 'ltr'}>
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        )}
      </div>

      {/* Per-surah status list */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5" dir={isUr ? 'rtl' : 'ltr'}>
          <BookOpen className="w-4 h-4 text-primary" />
          {isUr ? 'سورت کے مطابق اسٹیٹس' : 'Per-Surah Status'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
          {SURAHS.map(surah => {
            const sp = surahProgressMap.get(surah.number);
            const verified = !!sp?.verified;
            return (
              <div
                key={surah.number}
                className={`rounded-lg border p-2 text-xs flex items-center gap-2 ${verified ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-secondary/30'}`}
              >
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${verified ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                  {surah.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-arabic text-sm text-foreground truncate" dir="rtl">{surah.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{surah.englishName} • {surah.ayahCount}</p>
                </div>
                {verified ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <button
                    onClick={() => handleDownloadOne(surah.number)}
                    disabled={downloading}
                    className="shrink-0 text-primary hover:text-accent disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info note */}
      <div className="mt-4 rounded-xl bg-accent/10 border border-accent/30 p-4">
        <p className="text-xs font-urdu leading-relaxed text-foreground/80 text-center" dir="rtl">
          یہ ڈیٹا بیس قرآن پاک کے ہر لفظ کی مکمل تفصیل محفوظ کرتا ہے: عربی متن، اردو مطلب، انگریزی مطلب، گرامر کی قسم (اسم، فعل، حرف، ضمیر وغیرہ)، ذیلی قسم (حرف جر، حرف ندا، فعل ماضی وغیرہ)، قرآن میں آمد کی تعداد، تلفظ، اور آڈیو۔ ڈاؤن لوڈ کرنے کے بعد یہ ڈیٹا آف لائن دستیاب رہتا ہے۔
        </p>
      </div>
    </div>
  );
}

// ───────── pages/Tasbih.jsx ─────────
const DHIKR = [
  { arabic: 'سُبْحَانَ ٱللَّٰهِ', urdu: 'اللہ پاک ہے', target: 33 },
  { arabic: 'ٱلْحَمْدُ لِلَّٰهِ', urdu: 'تمام تعریفیں اللہ کے لیے', target: 33 },
  { arabic: 'ٱللَّٰهُ أَكْبَرُ', urdu: 'اللہ سب سے بڑا ہے', target: 34 },
  { arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', urdu: 'اللہ کے سوا کوئی معبود نہیں', target: 100 },
  { arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ', urdu: 'میں اللہ سے بخشش مانگتا ہوں', target: 100 },
  { arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّٰهِ', urdu: 'نہ کوئی طاقت ہے نہ قوت مگر اللہ سے', target: 100 },
];

export function Tasbih() {
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  const dhikr = DHIKR[selected];
  const target = dhikr.target;
  const done = count >= target;
  const progress = Math.min(100, (count / target) * 100);
  const R = 100;
  const C = 2 * Math.PI * R;

  const tap = () => {
    if (done) return;
    setCount((c) => c + 1);
    if (navigator.vibrate) navigator.vibrate(15);
  };
  const reset = () => { setCount(0); if (navigator.vibrate) navigator.vibrate(30); };
  const selectDhikr = (i) => { setSelected(i); setCount(0); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium border border-accent/40">تسبیح</span>
        <p className="mt-3 text-sm text-muted-foreground font-urdu" dir="rtl">ذکر کا شمار کرنے کے لیے دائرے پر دبائیں</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {DHIKR.map((d, i) => (
          <button key={i} onClick={() => selectDhikr(i)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selected === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`} dir="rtl">{d.arabic}</button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <p className="font-arabic text-3xl text-foreground mb-2" dir="rtl">{dhikr.arabic}</p>
        <p className="text-sm text-muted-foreground mb-6 font-urdu" dir="rtl">{dhikr.urdu}</p>

        <button onClick={tap} className="relative w-56 h-56 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border-4 border-primary/50 shadow-[0_8px_16px_rgba(62,42,29,0.3),inset_0_2px_3px_rgba(255,255,255,0.7)] flex items-center justify-center active:translate-y-0.5 transition-transform">
          <svg className="absolute inset-0" viewBox="0 0 224 224">
            <circle cx="112" cy="112" r={R} fill="none" stroke="rgba(62,42,29,0.15)" strokeWidth="8" />
            <circle cx="112" cy="112" r={R} fill="none" stroke="#126E51" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress / 100)} transform="rotate(-90 112 112)" />
          </svg>
          <div className="relative z-10 text-center">
            <p className="text-5xl font-bold text-[#3e2a1d] tabular-nums">{count}</p>
            <p className="text-xs text-[#3e2a1d]/70 mt-1">/ {target}</p>
          </div>
        </button>

        {done && <p className="mt-4 text-sm text-primary font-medium font-urdu" dir="rtl">✓ مکمل ہو گیا — اللہ قبول فرمائے</p>}

        <button onClick={reset} className="mt-6 flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-card border border-border text-foreground" dir="rtl">
          <RotateCcw className="w-4 h-4" /> صفر کریں
        </button>
      </div>
    </div>
  );
}
