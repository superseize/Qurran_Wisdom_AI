import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Volume2, Mic, Square, Loader2, Play, GraduationCap, Sparkles, AlertTriangle, CheckCircle2, XCircle, MinusCircle, Check, RotateCcw, BookOpen, Flame, Trophy, Eye, HelpCircle, Scroll, ChevronDown, Award, Target, TrendingUp, AlertCircle, ChevronLeft, Search, X, ChevronRight, Headphones, Landmark, SpellCheck, FileText } from 'lucide-react';
import { quranComApi, wordAudioUrl, getCachedQaida, setCachedQaida, getQuranCountIndex, countWordWithAffixes, getCachedEdition, setCachedEdition, getCachedWords, setCachedWords, getCachedAnalysis, getCachedSurahs, setCachedSurahs, getOfflineAnalysis, preloadVerse, quranApi, setCachedAnalysis, getWordData, getDictionaryEntry, getWordCount } from '@/lib/quran';
import { backend } from '@/api/backend';
import { SURAHS, TOTAL_WORDS, mergedQaida, VOCAB_LESSONS, VOCAB_CATEGORIES, isFatihah, getFatihahWords, getFatihahAnalysis } from '@/lib/data';
import { lookupDictionaryWord, buildDictionary, getFrequencyCategory, FREQUENCY_CATEGORIES, ARABIC_ALPHABET, GRAMMAR_TYPES, getGrammarTypeMeta, classifyWord } from '@/lib/dictionary';
import { analyzeAyah, letterClass, TUTOR_LEGEND, analyzeRecitation, speak, stopSpeaking, listen, ttsSupported, sttSupported, detectTajweedIndicators } from '@/lib/tajweed';
import { useAuth, useLanguage } from '@/lib/app';
import { arabicSkeleton } from '@/lib/utils';
import { GOALS, loadProgress, syncFromCloud, getTodaysWords, setGoal, startToday, markLearned, getWordStats, getAllWords, getStats, getWeakAreas, getMasteryMap, clearWeakArea } from '@/lib/stores';
import { QaidaLesson, TajweedRulesNav, TajweedPractice, TajweedTracker, VocabLesson } from '@/components/practice';
import { OrnateFrame, LearningAnalytics, WordMeaning, getWordMeaning } from '@/components/quran';

// ───────── pages/Tutor.jsx ─────────
const globalAyah = (surah, ayah) => SURAHS.slice(0, surah - 1).reduce((s, x) => s + x.ayahCount, 0) + ayah;
const ayahAudioUrl = (surah, ayah) => `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyah(surah, ayah)}.mp3`;

function TajweedWord({ analysis, size = 'text-4xl' }) {
  return (
    <span className={`font-quran ${size} leading-[2.4]`} dir="rtl">
      {analysis.letters.map((l, i) => <span key={i} className={letterClass(l.flags)}>{l.glyph}</span>)}
    </span>
  );
}

const STATUS_STYLE = {
  correct: { icon: CheckCircle2, cls: 'border-emerald-500/60 bg-emerald-500/10', label: 'درست' },
  mispronounced: { icon: XCircle, cls: 'border-amber-500/70 bg-amber-500/10', label: 'غلط تلفظ' },
  missing: { icon: MinusCircle, cls: 'border-destructive/60 bg-destructive/10', label: 'سنائی نہیں دیا' },
};

export function Tutor() {
  const navigate = useNavigate();
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(0);
  const [lesson, setLesson] = useState(false);
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState('');
  const [result, setResult] = useState(null);
  const [coach, setCoach] = useState({ loading: false, text: '', error: '' });
  const recRef = useRef(null);
  const audioRef = useRef(null);
  const lessonToken = useRef(0);

  const meta = SURAHS[surah - 1];

  useEffect(() => {
    let cancelled = false;
    stopEverything();
    setLoading(true); setError(''); setWords([]); setSel(0); setResult(null); setHeard(''); setCoach({ loading: false, text: '', error: '' });
    quranComApi.getVerseWords(`${surah}:${ayah}`, 'text_uthmani,char_type_name,audio_url,transliteration,translation')
      .then((v) => {
        if (cancelled) return;
        const ws = (v?.words || []).filter((w) => w.char_type_name === 'word').map((w) => {
          const d = lookupDictionaryWord(w.text_uthmani);
          return { arabic: w.text_uthmani, translit: w.transliteration?.text || '', en: w.translation?.text || d?.en || '', ur: d?.ur || '', audio: w.audio_url ? wordAudioUrl(w.audio_url) : '' };
        });
        if (!ws.length) throw new Error('empty');
        setWords(ws);
      })
      .catch(() => { if (!cancelled) setError('آیت کے الفاظ لوڈ نہیں ہو سکے۔ انٹرنیٹ چیک کریں۔'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [surah, ayah]);

  useEffect(() => () => stopEverything(), []);

  const analyses = useMemo(() => (words.length ? analyzeAyah(words.map((w) => w.arabic)) : []), [words]);
  const current = analyses[sel];
  const w = words[sel];

  function stopEverything() {
    lessonToken.current++;
    stopSpeaking();
    audioRef.current?.pause();
    recRef.current?.stop();
    setLesson(false);
    setRecording(false);
  }

  const playUrl = (url) => new Promise((resolve) => {
    if (!url) return resolve();
    audioRef.current?.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = resolve; a.onerror = resolve;
    a.play().catch(resolve);
  });
  const say = (text, lang = 'ur') => new Promise((resolve) => speak(text, { lang, onEnd: resolve }));

  const speakWordLesson = async (i, token) => {
    const a = analyses[i], word = words[i];
    if (!a || !word) return;
    setSel(i);
    await say(`لفظ نمبر ${i + 1}۔`);
    if (token !== lessonToken.current) return;
    await playUrl(word.audio);
    if (token !== lessonToken.current) return;
    const meaning = word.ur || word.en;
    if (meaning) await say(`معنی: ${meaning}۔`);
    if (token !== lessonToken.current) return;
    await say(a.script);
  };

  const playWholeLesson = async () => {
    if (lesson) { stopEverything(); return; }
    stopEverything();
    const token = ++lessonToken.current;
    setLesson(true);
    await say(`سورہ ${meta.name}، آیت ${ayah}۔ پہلے پوری آیت سنیں۔`);
    if (token !== lessonToken.current) return;
    await playUrl(ayahAudioUrl(surah, ayah));
    for (let i = 0; i < words.length; i++) {
      if (token !== lessonToken.current) return;
      await speakWordLesson(i, token);
    }
    if (token === lessonToken.current) { setLesson(false); await say('سبق مکمل ہوا۔ اب میں پڑھتا ہوں کا بٹن دبا کر خود پڑھیں۔'); }
  };

  const startRecite = () => {
    if (recording) { recRef.current?.stop(); return; }
    stopEverything();
    setResult(null); setHeard(''); setCoach({ loading: false, text: '', error: '' });
    setRecording(true);
    recRef.current = listen({
      lang: 'ar-SA', continuous: true,
      onResult: (finalText, interim) => setHeard(`${finalText} ${interim}`.trim()),
      onError: () => setRecording(false),
      onEnd: (finalText) => {
        setRecording(false);
        if (finalText) {
          const r = analyzeRecitation(finalText, words.map((x) => x.arabic));
          setResult(r);
          const firstBad = r.wordDetails.find((d) => d.status !== 'correct');
          if (firstBad) setSel(firstBad.index);
          speak(r.summary, { lang: 'ur' });
        }
      },
    });
    if (!recRef.current) setRecording(false);
  };

  const askCoach = async () => {
    if (!result) return;
    setCoach({ loading: true, text: '', error: '' });
    try {
      const bad = result.wordDetails.filter((d) => d.status !== 'correct').map((d) => ({
        word: d.expected, heard: d.said, status: d.status, rules: analyses[d.index]?.rules.map((r) => `${r.title}: ${r.how}`) || [],
      }));
      const text = await backend.ai.invoke({
        prompt: `You are a gentle tajweed teacher. A student recited Quran ${surah}:${ayah}. Speech recognition output (may be imperfect): "${heard}". Words needing attention with the exact tajweed rules for each (use ONLY these rules, do not invent new ones):\n${JSON.stringify(bad, null, 1)}\n\nWrite a short, encouraging coaching note in simple Urdu (max 8 sentences): for each word say what to fix and how (makhraj, thick/thin, madd length, ghunnah) using the rules above. Remind that speech recognition can err and that learning from a qualified qari is best. Do not quote any verse text.`,
      });
      setCoach({ loading: false, text: typeof text === 'string' ? text : JSON.stringify(text), error: '' });
    } catch {
      setCoach({ loading: false, text: '', error: 'AI استاد دستیاب نہیں (Edge Function سیٹ اپ دیکھیں)۔ اوپر دیے گئے قواعد خودکار طور پر محفوظ ہیں۔' });
    }
  };

  const wordStatus = (i) => result?.wordDetails.find((d) => d.index === i)?.status;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-lg font-semibold flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> آواز والا قرآنی استاد</h1>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 mb-4 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80 leading-relaxed" dir="rtl">یہ تجوید کے معروف قواعد (حفص عن عاصم) کے مطابق مدد گار ہے۔ صحیح تلاوت کے لیے کسی مستند قاری سے سننا اور سیکھنا ضروری ہے۔ آواز کی جانچ براؤزر کی speech recognition پر ہے جو غلطی کر سکتی ہے۔</p>
      </div>

      {/* Picker */}
      <div className="grid grid-cols-[1fr_90px] gap-2 mb-4">
        <select value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah(1); }} className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm" dir="rtl">
          {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name} — {s.englishName}</option>)}
        </select>
        <select value={ayah} onChange={(e) => setAyah(Number(e.target.value))} className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm" dir="ltr">
          {Array.from({ length: meta.ayahCount }, (_, i) => <option key={i + 1} value={i + 1}>آیت {i + 1}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
      {error && <p className="text-center text-sm text-destructive py-6" dir="rtl">{error}</p>}

      {!loading && words.length > 0 && (
        <>
          {/* Ayah with colored tajweed */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-[rgba(25,62,47,0.5)] to-card p-4 mb-3">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1" dir="rtl">
              {analyses.map((a, i) => {
                const st = wordStatus(i);
                return (
                  <button key={i} onClick={() => setSel(i)} className={`px-1.5 rounded-lg border-2 transition-colors ${sel === i ? 'border-primary bg-primary/10' : st ? STATUS_STYLE[st].cls : 'border-transparent'}`}>
                    <TajweedWord analysis={a} size="text-3xl" />
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border/50 justify-center">
              {TUTOR_LEGEND.map((l, i) => <span key={i} className={`text-[11px] ${l.cls}`} dir="rtl">● {l.text}</span>)}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={playWholeLesson} disabled={!ttsSupported()} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium ${lesson ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'} disabled:opacity-50`}>
              {lesson ? <><Square className="w-4 h-4" /> روکیں</> : <><Play className="w-4 h-4" /> پورا سبق سنیں</>}
            </button>
            <button onClick={startRecite} disabled={!sttSupported()} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border ${recording ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse' : 'bg-card border-border text-foreground'} disabled:opacity-50`}>
              <Mic className="w-4 h-4" /> {recording ? 'ختم کریں' : 'میں پڑھتا ہوں'}
            </button>
          </div>
          {!sttSupported() && <p className="text-[11px] text-muted-foreground text-center mb-3" dir="rtl">آپ کے براؤزر میں آواز کی پہچان دستیاب نہیں؛ Chrome/Edge/Safari استعمال کریں۔</p>}

          {(recording || heard) && (
            <div className="rounded-xl border border-border bg-card p-3 mb-3">
              <p className="text-[11px] text-muted-foreground mb-1" dir="rtl">{recording ? 'سن رہا ہوں — آیت پڑھیں…' : 'جو سنائی دیا:'}</p>
              <p className="font-quran text-xl text-right leading-loose" dir="rtl">{heard || '…'}</p>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-border bg-card p-3 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" dir="rtl">نتیجہ: {result.overallScore}٪</p>
                <button onClick={askCoach} disabled={coach.loading} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 disabled:opacity-60">
                  {coach.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI استاد سے رہنمائی
                </button>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed" dir="rtl">{result.summary}</p>
              <div className="flex flex-wrap gap-1.5" dir="rtl">
                {result.wordDetails.map((d) => {
                  const S = STATUS_STYLE[d.status]; const Icon = S.icon;
                  return <button key={d.index} onClick={() => setSel(d.index)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${S.cls}`}><Icon className="w-3 h-3" /><span className="font-quran text-base">{d.expected}</span></button>;
                })}
              </div>
              {coach.text && <p className="text-sm leading-relaxed whitespace-pre-wrap font-urdu border-t border-border pt-2" dir="rtl">{coach.text}</p>}
              {coach.error && <p className="text-xs text-muted-foreground" dir="rtl">{coach.error}</p>}
            </div>
          )}

          {/* Word lesson */}
          {current && w && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div className="text-center">
                <TajweedWord analysis={current} size="text-5xl" />
                <p className="text-sm text-muted-foreground mt-1" dir="ltr">{w.translit}</p>
                <p className="text-base font-urdu mt-1" dir="rtl">{w.ur || w.en || 'معنی دستیاب نہیں'}{w.ur && w.en ? <span className="text-xs text-muted-foreground"> · {w.en}</span> : null}</p>
                <div className="flex justify-center gap-2 mt-3">
                  <button onClick={() => playUrl(w.audio)} disabled={!w.audio} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Volume2 className="w-3.5 h-3.5" /> قاری کی آواز</button>
                  <button onClick={() => say(current.script)} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-primary/40 text-primary"><GraduationCap className="w-3.5 h-3.5" /> استاد سے سنیں</button>
                </div>
              </div>

              {current.rules.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-primary" dir="rtl">اس لفظ کے تجویدی قواعد</p>
                  {current.rules.map((r, i) => (
                    <div key={i} className="rounded-xl bg-muted/40 border border-border p-2.5" dir="rtl">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{r.title}</p>
                        {r.beats && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">{r.beats} حرکت</span>}
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed mt-1 font-urdu">{r.how}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center" dir="rtl">اس لفظ میں کوئی خاص قاعدہ لاگو نہیں — ہر حرف کو اس کے مخرج سے صاف ادا کریں۔</p>}

              <div className="space-y-2">
                <p className="text-xs font-bold text-primary" dir="rtl">حروف کے مخارج اور صفات</p>
                {current.letters.filter((l) => l.makhraj).map((l, i) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-border p-2.5" dir="rtl">
                    <span className={`font-quran text-3xl w-12 text-center shrink-0 ${letterClass(l.flags)}`}>{l.glyph}</span>
                    <div className="text-xs leading-relaxed space-y-0.5 min-w-0">
                      <p className="font-semibold text-foreground">{l.name}{l.vowel ? <span className="font-normal text-muted-foreground"> — {l.vowel}</span> : null}</p>
                      <p className="text-foreground/80 font-urdu"><b>مخرج:</b> {l.makhraj.name} — {l.makhraj.where}</p>
                      {l.sifat.map((t, j) => <p key={j} className={`font-urdu ${j === 0 && l.heavy ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}>• {t}</p>)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-1">
                <button onClick={() => setSel(Math.max(0, sel - 1))} disabled={sel === 0} className="text-xs px-3 py-1.5 rounded-full border border-border disabled:opacity-40">← پچھلا لفظ</button>
                <span className="text-xs text-muted-foreground self-center tabular-nums">{sel + 1} / {words.length}</span>
                <button onClick={() => setSel(Math.min(words.length - 1, sel + 1))} disabled={sel === words.length - 1} className="text-xs px-3 py-1.5 rounded-full border border-border disabled:opacity-40">اگلا لفظ →</button>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <button onClick={() => ayah > 1 && setAyah(ayah - 1)} disabled={ayah <= 1} className="text-xs px-4 py-2 rounded-full border border-border disabled:opacity-40">پچھلی آیت</button>
            <button onClick={() => ayah < meta.ayahCount && setAyah(ayah + 1)} disabled={ayah >= meta.ayahCount} className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground disabled:opacity-40">اگلی آیت</button>
          </div>
        </>
      )}
    </div>
  );
}

// ───────── pages/Words.jsx ─────────
function Example({ word }) {
  const [state, setState] = useState({ open: false, loading: false, items: null });
  const load = async () => {
    if (state.items) { setState((s) => ({ ...s, open: !s.open })); return; }
    setState({ open: true, loading: true, items: null });
    let items = [];
    try {
      const sk = arabicSkeleton(word.ar);
      if (sk.replace(/ /g, '').length >= 3) {
        const rows = await backend.entities.Ayah.filter({ text_skeleton: { $regex: sk } }, 'ayah_global', 2);
        const ids = rows.map((r) => r.ayah_global);
        const tr = ids.length ? await backend.entities.Translation.filter({ ayah_global: { $in: ids }, language: 'ur' }, null, 4) : [];
        items = rows.map((r) => ({ ...r, urdu: tr.find((t) => t.ayah_global === r.ayah_global)?.text || '' }));
      }
    } catch { items = []; }
    setState({ open: true, loading: false, items });
  };
  return (
    <div>
      <button onClick={load} className="inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline"><BookOpen className="w-3 h-3" /> قرآنی مثال</button>
      {state.open && (state.loading ? <Loader2 className="w-4 h-4 animate-spin mt-2 text-muted-foreground" /> : state.items?.length ? (
        <div className="mt-2 space-y-2">
          {state.items.map((a) => (
            <Link key={a.id} to={`/reader/${a.surah}?ayah=${a.ayah}`} className="block rounded-lg bg-muted/40 border border-border p-2">
              <p className="font-quran text-lg text-right leading-loose" dir="rtl">{a.text_uthmani}</p>
              {a.urdu && <p className="text-xs text-foreground/75 font-urdu leading-relaxed mt-1" dir="rtl">{a.urdu}</p>}
              <p className="text-[10px] text-primary mt-1 tabular-nums" dir="ltr">{a.surah}:{a.ayah}</p>
            </Link>
          ))}
        </div>
      ) : <p className="text-[11px] text-muted-foreground mt-1" dir="rtl">مثال نہیں ملی (ڈیٹا بیس میں قرآن لوڈ کریں: npm run seed)۔</p>)}
    </div>
  );
}

function Card({ word, learned, onLearn, onUnlearn }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${learned ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => speak(word.ar, { lang: 'ar' })} className="p-2 rounded-full bg-secondary/60 text-foreground shrink-0" aria-label="تلفظ سنیں"><Volume2 className="w-4 h-4" /></button>
        <p className="font-quran text-4xl text-right flex-1 leading-[1.8] text-foreground" dir="rtl">{word.ar}</p>
      </div>
      <p className="text-xs text-muted-foreground text-right mt-1" dir="rtl">قرآن میں تقریباً <b className="text-primary tabular-nums">{word.count}</b> مرتبہ آیا ہے</p>

      {show ? (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-1 text-right" dir="rtl">
          <p className="text-xl font-urdu text-foreground">{word.ur}</p>
          {word.en && <p className="text-sm text-muted-foreground" dir="ltr">{word.en}</p>}
          <div className="pt-2"><Example word={word} /></div>
        </div>
      ) : (
        <button onClick={() => setShow(true)} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary/40 text-primary text-sm"><Eye className="w-4 h-4" /> پہلے خود سوچیں، پھر معنی دیکھیں</button>
      )}

      <div className="flex gap-2 mt-3">
        {learned ? (
          <button onClick={onUnlearn} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs text-muted-foreground"><RotateCcw className="w-3.5 h-3.5" /> دوبارہ سیکھنا ہے</button>
        ) : (
          <button onClick={() => { setShow(true); onLearn(); }} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"><Check className="w-4 h-4" /> یاد ہو گیا</button>
        )}
      </div>
    </div>
  );
}

function Quiz({ words, onClose }) {
  const all = useMemo(() => getAllWords(), []);
  const questions = useMemo(() => words.map((w) => {
    const wrong = [];
    while (wrong.length < 3) {
      const c = all[Math.floor(Math.random() * all.length)];
      if (c.id !== w.id && c.ur !== w.ur && !wrong.includes(c.ur)) wrong.push(c.ur);
    }
    return { w, options: [...wrong, w.ur].sort(() => Math.random() - 0.5) };
  }), [words, all]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const q = questions[i];

  if (!q) return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center space-y-3">
      <Trophy className="w-8 h-8 text-primary mx-auto" />
      <p className="text-lg font-semibold" dir="rtl">آپ کا اسکور: {score} / {questions.length}</p>
      <button onClick={onClose} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm">واپس جائیں</button>
    </div>
  );
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs text-muted-foreground text-center tabular-nums">{i + 1} / {questions.length}</p>
      <p className="font-quran text-4xl text-center leading-[1.8]" dir="rtl">{q.w.ar}</p>
      <div className="grid gap-2">
        {q.options.map((o) => {
          const correct = o === q.w.ur;
          const style = picked == null ? 'border-border' : correct ? 'border-emerald-500 bg-emerald-500/10' : picked === o ? 'border-destructive bg-destructive/10' : 'border-border opacity-60';
          return <button key={o} disabled={picked != null} onClick={() => { setPicked(o); if (correct) setScore((s) => s + 1); }} className={`py-2.5 rounded-xl border text-base font-urdu ${style}`} dir="rtl">{o}</button>;
        })}
      </div>
      {picked != null && <button onClick={() => { setPicked(null); setI(i + 1); }} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm">{i + 1 === questions.length ? 'نتیجہ' : 'اگلا سوال'}</button>}
    </div>
  );
}

export function Words() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [p, setP] = useState(() => loadProgress());
  const [quiz, setQuiz] = useState(false);
  const [showLearned, setShowLearned] = useState(false);

  useEffect(() => {
    startToday(loadProgress()).then(setP);
    if (isAuthenticated) syncFromCloud().then((m) => startToday(m).then(setP));
  }, [isAuthenticated]);

  const today = useMemo(() => getTodaysWords(p), [p]);
  const stats = useMemo(() => getWordStats(p), [p]);
  const doneToday = today.words.filter((w) => p.learned[w.id]).length;
  const learnedList = useMemo(() => getAllWords().filter((w) => p.learned[w.id]), [p]);

  const learn = async (id) => setP(await markLearned(p, id, true));
  const unlearn = async (id) => setP(await markLearned(p, id, false));
  const changeGoal = async (g) => setP(await setGoal(p, g));

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-lg font-semibold">روزانہ قرآنی الفاظ</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-primary tabular-nums">{stats.learned}</p>
          <p className="text-[11px] text-muted-foreground" dir="rtl">سیکھے ہوئے الفاظ</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">از {stats.totalWords}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-primary tabular-nums">{stats.coveragePct}٪</p>
          <p className="text-[11px] text-muted-foreground" dir="rtl">قرآنی الفاظ کی سمجھ</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">{stats.occurrences.toLocaleString()} / {TOTAL_WORDS.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-primary tabular-nums flex items-center justify-center gap-1"><Flame className="w-5 h-5" />{stats.streak}</p>
          <p className="text-[11px] text-muted-foreground" dir="rtl">مسلسل دن</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mb-4 leading-relaxed" dir="rtl">«قرآنی الفاظ کی سمجھ» = آپ کے سیکھے ہوئے الفاظ قرآن کے کل 77,439 الفاظ میں جتنی بار آتے ہیں۔ سب سے زیادہ آنے والے الفاظ پہلے سکھائے جاتے ہیں۔</p>

      {/* Goal */}
      <div className="rounded-xl border border-border bg-card p-3 mb-4">
        <p className="text-xs text-muted-foreground mb-2" dir="rtl">روزانہ کا ہدف</p>
        <div className="grid grid-cols-3 gap-2">
          {GOALS.map((g) => (
            <button key={g} onClick={() => changeGoal(g)} className={`py-2 rounded-lg text-sm font-semibold border ${p.goal === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground'}`}>{g} الفاظ</button>
          ))}
        </div>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${today.words.length ? (doneToday / today.words.length) * 100 : 0}%` }} /></div>
        <p className="text-[11px] text-muted-foreground mt-1.5 text-center tabular-nums" dir="rtl">آج: {doneToday} / {today.words.length}</p>
      </div>

      {quiz ? <Quiz words={today.words} onClose={() => setQuiz(false)} /> : (
        <>
          <div className="space-y-3">
            {today.words.length === 0 && <p className="text-center text-sm text-muted-foreground py-8" dir="rtl">ماشاءاللہ! آپ نے تمام الفاظ سیکھ لیے ہیں۔</p>}
            {today.words.map((w) => <Card key={w.id} word={w} learned={!!p.learned[w.id]} onLearn={() => learn(w.id)} onUnlearn={() => unlearn(w.id)} />)}
          </div>
          {today.words.length > 0 && (
            <button onClick={() => setQuiz(true)} className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/40 text-primary text-sm font-medium"><HelpCircle className="w-4 h-4" /> آج کے الفاظ کا امتحان</button>
          )}
        </>
      )}

      {learnedList.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowLearned((s) => !s)} className="text-sm font-semibold text-foreground" dir="rtl">سیکھے ہوئے الفاظ ({learnedList.length}) {showLearned ? '▲' : '▼'}</button>
          {showLearned && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {learnedList.map((w) => (
                <div key={w.id} className="rounded-lg border border-border bg-card p-2 text-center">
                  <p className="font-quran text-xl">{w.ar}</p>
                  <p className="text-xs font-urdu text-muted-foreground">{w.ur}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!isAuthenticated && <p className="text-[11px] text-muted-foreground text-center mt-6" dir="rtl">آپ کی پراگریس اس ڈیوائس پر محفوظ ہے۔ <Link to="/login" className="text-primary underline">لاگ اِن</Link> کریں تو ہر ڈیوائس پر ملے گی۔</p>}
    </div>
  );
}

// ───────── pages/Tajweed.jsx ─────────
if (typeof window !== 'undefined') { if (!getCachedQaida('merged')) setCachedQaida('merged', mergedQaida); }

export function Tajweed() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('qaida');
  const [openLesson, setOpenLesson] = useState(null);

  const tabs = [
    { id: 'qaida', label: 'قاعدہ', icon: BookOpen },
    { id: 'rules', label: 'احکام تجوید', icon: Scroll },
    { id: 'practice', label: 'پریکٹس', icon: Mic },
  ];

  return (
    <div className="px-3.5 pt-4 pb-[102px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 animate-rise">
        <button onClick={() => navigate('/')} className="w-[34px] h-[34px] border border-border rounded-[11px] bg-secondary/72 text-muted-foreground grid place-items-center transition-all hover:bg-secondary hover:text-foreground" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            <GraduationCap className="w-4 h-4" /><span dir="rtl">تجوید</span>
          </span>
        </div>
        <div className="w-[34px]" />
      </div>

      {/* Intro banner */}
      <div className="mb-5 rounded-2xl border border-border bg-gradient-to-br from-secondary/80 to-card/60 p-4 animate-rise" style={{ animationDelay: '0.04s' }}>
        <p className="font-quran text-2xl text-center text-primary mb-2" dir="rtl">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</p>
        <p className="text-xs text-center text-muted-foreground" dir="rtl">"اور قرآن کو خوب ترتیل کے ساتھ پڑھا کرو" — (المزمل: ۴)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 p-1 rounded-xl border border-border bg-secondary/50 animate-rise" style={{ animationDelay: '0.08s' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} dir="rtl">
            <t.icon className="w-3.5 h-3.5" /><span className="font-urdu">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Qaida */}
      {tab === 'qaida' && (
        openLesson ? (
          <QaidaLesson lesson={openLesson} onClose={() => setOpenLesson(null)} />
        ) : (
          <div className="space-y-2">
            {mergedQaida.map((lesson, i) => (
              <button key={lesson.id} onClick={() => setOpenLesson(lesson)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-gradient-to-br from-secondary/90 to-card/82 transition-all hover:border-primary animate-rise" style={{ animationDelay: `${i * 0.03}s` }} dir="rtl">
                <span className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold shrink-0">{lesson.id}</span>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-semibold text-foreground font-urdu truncate">{lesson.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{lesson.titleEn}</p>
                </div>
                <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )
      )}

      {/* Tab: Rules */}
      {tab === 'rules' && <TajweedRulesNav />}

      {/* Tab: Practice */}
      {tab === 'practice' && (
        <div className="space-y-4">
          <TajweedPractice />
          <TajweedTracker />
        </div>
      )}
    </div>
  );
}

// ───────── pages/QuranicArabic.jsx ─────────
const circle = "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] shadow-[0_4px_7px_rgba(62,42,29,0.28),inset_0_1.5px_1px_rgba(255,255,255,0.7)] active:translate-y-0.5 transition-transform";

function CognateCategory({ category, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const renderRows = () => {
    switch (category.type) {
      case 'cognate':
        return (
          <div className="max-h-[55vh] overflow-y-auto" dir="rtl">
            {category.data.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 py-2 border-b border-primary/20 items-center hover:bg-secondary/50 rounded" dir="rtl">
                <span className="col-span-4 text-right font-quran text-lg text-foreground" dir="rtl">{c.ar}</span>
                <span className="col-span-4 text-right text-sm font-urdu text-foreground" dir="rtl">{c.ur}</span>
                <span className="col-span-4 text-left text-xs text-muted-foreground" dir="ltr">{c.en}</span>
              </div>
            ))}
          </div>
        );
      case 'frequency':
        return (
          <div className="max-h-[55vh] overflow-y-auto" dir="rtl">
            {category.data.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 py-2 border-b border-primary/20 items-center hover:bg-secondary/50 rounded" dir="rtl">
                <span className="col-span-4 text-right font-quran text-lg text-foreground" dir="rtl">{c.ar}</span>
                <span className="col-span-3 text-right text-sm font-urdu text-foreground" dir="rtl">{c.ur}</span>
                <span className="col-span-3 text-left text-xs text-muted-foreground" dir="ltr">{c.en}</span>
                <span className="col-span-2 text-center text-xs font-semibold text-[#9c6b3a] tabular-nums" dir="ltr">{c.count}×</span>
              </div>
            ))}
          </div>
        );
      case 'compound':
        return (
          <div className="max-h-[55vh] overflow-y-auto" dir="rtl">
            {category.data.map((c, i) => (
              <div key={i} className="py-3 border-b border-primary/20 hover:bg-secondary/50 rounded px-2" dir="rtl">
                <div className="flex items-center justify-end gap-2 mb-1 flex-wrap" dir="rtl">
                  {c.parts.map((p, j) => (
                    <React.Fragment key={j}>
                      <span className="font-quran text-lg text-foreground/70" dir="rtl">{p}</span>
                      {j < c.parts.length - 1 && <span className="text-[#9c6b3a] font-bold">+</span>}
                    </React.Fragment>
                  ))}
                  <span className="text-[#9c6b3a] font-bold mx-1">=</span>
                  <span className="font-quran text-xl text-red-400 font-semibold" dir="rtl">{c.compound}</span>
                </div>
                <div className="flex justify-between gap-4 text-xs" dir="rtl">
                  <span className="text-muted-foreground text-left" dir="ltr">— {c.en}</span>
                  <span className="font-urdu text-foreground text-right" dir="rtl">{c.ur}</span>
                </div>
              </div>
            ))}
          </div>
        );
      case 'antonym':
        return (
          <div className="max-h-[55vh] overflow-y-auto" dir="rtl">
            {category.data.map((c, i) => (
              <div key={i} className="py-3 border-b border-primary/20 hover:bg-secondary/50 rounded px-2" dir="rtl">
                <div className="flex items-center justify-end gap-3 flex-wrap" dir="rtl">
                  <div className="text-right">
                    <p className="font-quran text-lg text-foreground" dir="rtl">{c.ar}</p>
                    <p className="text-xs font-urdu text-foreground" dir="rtl">{c.ur}</p>
                    <p className="text-[10px] text-muted-foreground text-left" dir="ltr">{c.en}</p>
                  </div>
                  <span className="text-[#9c6b3a] font-bold text-lg">⇄</span>
                  <div className="text-right">
                    <p className="font-quran text-lg text-red-400" dir="rtl">{c.antAr}</p>
                    <p className="text-xs font-urdu text-foreground" dir="rtl">{c.antUr}</p>
                    <p className="text-[10px] text-muted-foreground text-left" dir="ltr">{c.antEn}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'synonym':
        return (
          <div className="max-h-[55vh] overflow-y-auto" dir="rtl">
            {category.data.map((group, i) => (
              <div key={i} className="py-3 border-b border-primary/20 hover:bg-secondary/50 rounded px-2" dir="rtl">
                <p className="text-left text-xs text-muted-foreground mb-2" dir="ltr">{group.en}</p>
                <div className="flex items-center justify-end gap-3 flex-wrap" dir="rtl">
                  {group.words.map((w, j) => (
                    <React.Fragment key={j}>
                      <div className="text-right">
                        <p className="font-quran text-lg text-foreground" dir="rtl">{w.ar}</p>
                        <p className="text-xs font-urdu text-foreground" dir="rtl">{w.ur}</p>
                      </div>
                      {j < group.words.length - 1 && <span className="text-[#9c6b3a] font-bold">≈</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-primary/40 bg-card hover:border-primary/70 transition-colors"
      >
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold text-foreground font-urdu" dir="rtl">{category.title}</p>
          <p className="text-[10px] text-muted-foreground">{category.titleEn} • {category.data.length} الفاظ</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <OrnateFrame className="mt-2 rounded-xl border-2 border-primary/50 bg-card">
          <div className="p-3">
            {renderRows()}
          </div>
        </OrnateFrame>
      )}
    </div>
  );
}

export function QuranicArabic() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('lessons'); // 'lessons' | 'cognates'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className={circle} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            <BookOpen className="w-4 h-4" />
            <span dir="rtl">قرآنی عربی سبق</span>
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">Aasan Quranic Arabic</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Intro banner */}
      <div className="mb-5 rounded-2xl border-2 border-primary/50 bg-gradient-to-b from-secondary/80 to-card/60 p-4 shadow-sm">
        <p className="font-arabic text-2xl text-center text-foreground mb-2" dir="rtl">
          إِنَّا أَنزَلْنَاهُ قُرْآنًا عَرَبِيًّا
        </p>
        <p className="text-xs text-center text-muted-foreground" dir="rtl">
          "بے شک ہم نے اسے عربی قرآن نازل کیا ہے" — (یوسف: ۲)
        </p>
        <p className="text-sm font-urdu leading-relaxed text-foreground/80 mt-3 text-center" dir="rtl">
          قرآن پاک کی زبان سیکھنے کا آسان طریقہ۔ اشارے کے الفاظ، مشترک الفاظ، بار بار آنے والے الفاظ، مرکب الفاظ، متضاد اور مترادف الفاظ سے سیکھیں۔
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('lessons')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold font-urdu transition-colors ${tab === 'lessons' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}
          dir="rtl"
        >
          اشارے کے الفاظ
        </button>
        <button
          onClick={() => setTab('cognates')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold font-urdu transition-colors ${tab === 'cognates' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}
          dir="rtl"
        >
          الفاظ کی اقسام
        </button>
      </div>

      {tab === 'lessons' ? (
        <div className="space-y-3">
          {VOCAB_LESSONS.map((lesson, i) => (
            <VocabLesson key={lesson.id} lesson={lesson} defaultOpen={i === 0} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {VOCAB_CATEGORIES.map((cat, i) => (
            <CognateCategory key={cat.id} category={cat} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 rounded-xl bg-accent/10 border border-accent/30 p-4">
        <p className="text-xs font-urdu leading-relaxed text-foreground/80 text-center" dir="rtl">
          علم القرآن: قرآن خود سیکھنے کے لیے آسان انداز اور جامع نظام۔
        </p>
      </div>
    </div>
  );
}

// ───────── pages/Progress.jsx ─────────
export function Progress() {
  const [stats, setStats] = useState(null);
  const [weak, setWeak] = useState([]);
  const [mastery, setMastery] = useState({});

  useEffect(() => {
    setStats(getStats());
    setWeak(getWeakAreas());
    setMastery(getMasteryMap());
  }, []);

  const refresh = () => {
    setStats(getStats());
    setWeak(getWeakAreas());
    setMastery(getMasteryMap());
  };

  if (!stats) return null;

  const masteredEntries = Object.entries(mastery).filter(([, v]) => v.level === 3);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-lg font-bold flex items-center gap-2"><Award className="w-5 h-5 text-primary" /><span dir="rtl">میری پیش رفت</span></h1>
        <div className="w-9" />
      </div>

      {/* Daily milestone */}
      <div className="rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/30 p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-accent-foreground" />
          <span className="text-sm font-semibold" dir="rtl">آج کا ہدف</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">{stats.todayCount}</span>
          <span className="text-sm text-muted-foreground mb-1" dir="rtl">/ {stats.todayGoal} آیات پریکٹس</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, (stats.todayCount / stats.todayGoal) * 100)}%` }} />
        </div>
        {stats.todayCount >= stats.todayGoal && (
          <p className="mt-2 text-xs text-emerald-400 font-medium" dir="rtl"> Mashallah! آج کا ہدف مکمل ہو گیا۔</p>
        )}
      </div>

      {/* Streak + stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><Flame className="w-4 h-4 text-orange-500" /><span className="text-xs text-muted-foreground" dir="rtl">تسلسل</span></div>
          <p className="text-2xl font-bold tabular-nums">{stats.streak} <span className="text-xs font-normal text-muted-foreground" dir="rtl">دن</span></p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground" dir="rtl">کل پریکٹس</span></div>
          <p className="text-2xl font-bold tabular-nums">{stats.totalPracticed}</p>
        </div>
      </div>

      {/* Mastery breakdown */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <p className="text-sm font-semibold mb-3" dir="rtl">مستعدی کی سطح</p>
        <div className="space-y-2">
          {[
            { label: 'مکمل (Mastered)', count: stats.mastered, color: 'bg-emerald-500/100' },
            { label: 'جانچتا (Familiar)', count: stats.familiar, color: 'bg-blue-500' },
            { label: 'سیکھ رہا (Learning)', count: stats.learning, color: 'bg-amber-500/100' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs flex-1" dir="rtl">{row.label}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${row.color}`} style={{ width: `${stats.totalPracticed ? (row.count / stats.totalPracticed) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-semibold tabular-nums w-6 text-right">{row.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Learning Analytics — collaborative best methods */}
      <LearningAnalytics />

      {/* Practice pool — weak areas */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold" dir="rtl">پریکٹس پول — کمزور آیات</span>
          {weak.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 tabular-nums">{weak.length}</span>}
        </div>
        {weak.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4" dir="rtl">کوئی کمزور آیت نہیں۔ پریکٹس کریں اور کم اسکور والی آیات یہاں خود بخود آ جائیں گی۔</p>
        ) : (
          <div className="space-y-2">
            {weak.map(w => (
              <div key={w.verseKey} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <Link to={`/reader/${w.verseKey.split(':')[0]}?ayah=${w.verseKey.split(':')[1]}`} className="flex items-center gap-2 flex-1 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium" dir="rtl">آیت {w.verseKey}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">({w.score}%)</span>
                </Link>
                <button onClick={() => { clearWeakArea(w.verseKey); refresh(); }} className="text-xs text-muted-foreground hover:text-foreground px-2" dir="rtl">ہٹائیں</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mastered list */}
      {masteredEntries.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold" dir="rtl">مکمل کی گئی آیات</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {masteredEntries.map(([key]) => (
              <Link key={key} to={`/reader/${key.split(':')[0]}?ayah=${key.split(':')[1]}`} className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium" dir="rtl">{key}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── pages/QuranDictionary.jsx ─────────
const categoryColor = cat => (cat?.color || 'bg-muted text-muted-foreground border-border').replace('text-red-800', 'text-red-300').replace('text-amber-800', 'text-amber-300');

const circle_QuranDictionary = "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] shadow-[0_4px_7px_rgba(62,42,29,0.28),inset_0_1.5px_1px_rgba(255,255,255,0.7)] active:translate-y-0.5 transition-transform";

export function QuranDictionary() {
  const navigate = useNavigate();
  const [countIndex, setCountIndex] = useState(null);
  const [countError, setCountError] = useState(false);
  const [countAttempt, setCountAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setCountError(false);
    getQuranCountIndex().then(index => { if (!cancelled) setCountIndex(index); }).catch(() => { if (!cancelled) setCountError(true); });
    return () => { cancelled = true; };
  }, [countAttempt]);
  const dictionary = useMemo(() => countIndex ? buildDictionary().map(word => {
    const corpusCount = countWordWithAffixes(countIndex, word.ar);
    const count = corpusCount > 0 ? corpusCount : (word.count || 0);
    return { ...word, count, frequency_category: count === 0 ? null : getFrequencyCategory(count) };
  }) : [], [countIndex]);
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeGrammarType, setActiveGrammarType] = useState(null);
  const [expandedWord, setExpandedWord] = useState(null);

  // Get available Arabic letters from the dictionary
  const availableLetters = useMemo(() => {
    const letters = new Set(dictionary.map(w => w.arabic_letter));
    return ARABIC_ALPHABET.filter(l => letters.has(l));
  }, [dictionary]);

  // Filter words based on search, letter, and category
  const filtered = useMemo(() => {
    let result = dictionary;
    if (activeCategory) {
      result = result.filter(w => w.frequency_category === activeCategory);
    }
    if (activeGrammarType) {
      result = result.filter(w => w.grammar_type === activeGrammarType);
    }
    if (activeLetter) {
      result = result.filter(w => w.arabic_letter === activeLetter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(w =>
        w.ar.includes(search.trim()) ||
        w.ur.toLowerCase().includes(q) ||
        w.en.toLowerCase().includes(q)
      );
    }
    return result;
  }, [dictionary, search, activeLetter, activeCategory, activeGrammarType]);

  // Count words per category
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const cat of FREQUENCY_CATEGORIES) {
      counts[cat.id] = dictionary.filter(w => w.frequency_category === cat.id).length;
    }
    return counts;
  }, [dictionary]);

  const clearFilters = () => {
    setSearch('');
    setActiveLetter(null);
    setActiveCategory(null);
    setActiveGrammarType(null);
  };

  const hasFilters = search || activeLetter || activeCategory || activeGrammarType;

  // Count words per grammar type
  const grammarCounts = useMemo(() => {
    const counts = {};
    for (const key of Object.keys(GRAMMAR_TYPES)) counts[key] = 0;
    for (const w of dictionary) {
      if (w.grammar_type && counts[w.grammar_type] !== undefined) counts[w.grammar_type]++;
    }
    return counts;
  }, [dictionary]);

  if (!countIndex) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-muted-foreground" dir="rtl">{countError ? <button onClick={() => setCountAttempt(n => n + 1)} className="text-primary underline">قرآن کا مکمل متن لوڈ نہیں ہوا — دوبارہ کوشش کریں</button> : 'پورے قرآن سے اصل لفظی تعداد تیار ہو رہی ہے…'}</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className={circle_QuranDictionary} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            <BookOpen className="w-4 h-4" />
            <span dir="rtl">قرآن ڈکشنری</span>
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">Quran Dictionary • {dictionary.length} الفاظ</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Intro banner */}
      <div className="mb-5 rounded-2xl border-2 border-primary/50 bg-gradient-to-b from-secondary/80 to-card/60 p-4 shadow-sm">
        <p className="font-arabic text-2xl text-center text-foreground mb-2" dir="rtl">
          وَقُل رَّبِّ زِدْنِي عِلْمًا
        </p>
        <p className="text-xs text-center text-muted-foreground" dir="rtl">
          "اے میرے رب! میرے علم میں اضافہ فرما" — (طٰہ: ۱۱۴)
        </p>
        <p className="text-sm font-urdu leading-relaxed text-foreground/80 mt-3 text-center" dir="rtl">
          قرآن پاک کے اصل عربی الفاظ کی مکمل ڈکشنری۔ ہر لفظ کا اردو اور انگریزی مطلب، اور قرآن میں اس کی تعداد۔ حروف تہجی کے مطابق ترتیب دی گئی ہے۔
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-4 relative">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-primary/40 bg-card focus-within:border-primary/70 transition-colors">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="عربی، اردو یا انگریزی میں تلاش کریں..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            dir="rtl"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Frequency category filters */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2 text-center" dir="rtl">تعدد کے مطابق اقسام</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setActiveCategory(activeCategory ? null : null)}
            className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-colors ${!activeCategory ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-accent/50'}`}
          >
            سب ({dictionary.length})
          </button>
          {FREQUENCY_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-colors ${activeCategory === cat.id ? 'bg-primary text-primary-foreground border-primary' : `${categoryColor(cat)} hover:opacity-80`}`}
              dir="rtl"
            >
              {cat.title} ({categoryCounts[cat.id]})
            </button>
          ))}
        </div>
      </div>

      {/* Grammar type filter */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2 text-center" dir="rtl">گرامر کی قسم</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {Object.values(GRAMMAR_TYPES).map(gt => {
            if (grammarCounts[gt.id] === 0) return null;
            return (
              <button
                key={gt.id}
                onClick={() => setActiveGrammarType(activeGrammarType === gt.id ? null : gt.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${activeGrammarType === gt.id ? 'bg-primary text-primary-foreground border-primary' : `${gt.color} hover:opacity-80`}`}
                dir="rtl"
              >
                {gt.label} ({grammarCounts[gt.id]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Alphabetical filter */}
      {!activeCategory && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 text-center" dir="rtl">حروف تہجی کے مطابق</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {availableLetters.map(letter => (
              <button
                key={letter}
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                className={`w-9 h-9 rounded-lg border text-sm font-arabic font-semibold transition-colors ${activeLetter === letter ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-accent/50'}`}
                dir="rtl"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filters bar */}
      {hasFilters && (
        <div className="mb-4 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
          <span className="text-xs text-foreground/80" dir="rtl">
            {filtered.length} الفاظ ملے
          </span>
          <button onClick={clearFilters} className="text-xs text-accent font-medium hover:underline flex items-center gap-1" dir="rtl">
            <X className="w-3 h-3" /> فلٹر صاف کریں
          </button>
        </div>
      )}

      {/* Dictionary entries */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm" dir="rtl">کوئی لفظ نہیں ملا</p>
          </div>
        ) : (
          filtered.map((word, i) => {
            const isExpanded = expandedWord === word.serial_no;
            const cat = FREQUENCY_CATEGORIES.find(c => c.id === word.frequency_category);
            return (
              <div
                key={word.serial_no}
                className="rounded-xl border border-border bg-card overflow-hidden hover:border-accent/40 transition-colors"
              >
                <button
                  onClick={() => setExpandedWord(isExpanded ? null : word.serial_no)}
                  className="w-full flex items-center gap-3 p-3 text-right"
                  dir="rtl"
                >
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center tabular-nums">
                    {word.serial_no}
                  </span>
                  <span className="shrink-0 font-quran text-2xl text-foreground" dir="rtl" style={{ wordSpacing: '0.2em' }}>
                    {word.ar}
                  </span>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm text-foreground truncate"><WordMeaning word={{ urdu: word.ur, english: word.en }} /></p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{word.en}</p>
                      {word.grammar_type && (
                        <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border ${getGrammarTypeMeta(word.grammar_type).color} font-medium`} dir="rtl">
                          {getGrammarTypeMeta(word.grammar_type).label}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-semibold tabular-nums ${categoryColor(cat)}`} dir="ltr">
                    {word.count}×
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">{getWordMeaning({ urdu: word.ur }).urdu ? 'اردو مطلب' : 'مطلب (انگریزی متبادل)'}</p>
                        <WordMeaning word={{ urdu: word.ur, english: word.en }} className="text-foreground" />
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground mb-1" dir="ltr">English Meaning</p>
                        <p className="text-foreground" dir="ltr">{word.en}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground" dir="rtl">حرف:</span>
                        <span className="font-arabic text-sm font-semibold text-foreground" dir="rtl">{word.arabic_letter}</span>
                      </div>
                      {word.grammar_type && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground" dir="rtl">قسم:</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getGrammarTypeMeta(word.grammar_type).color} font-medium`} dir="rtl">
                            {word.grammar_subtype || getGrammarTypeMeta(word.grammar_type).label}
                          </span>
                        </div>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryColor(cat)}`} dir="rtl">
                        {cat?.title} — {cat?.titleEn}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer note */}
      <div className="mt-6 rounded-xl bg-accent/10 border border-accent/30 p-4">
        <p className="text-xs font-urdu leading-relaxed text-foreground/80 text-center" dir="rtl">
          تعداد تمام ۶۲۳۶ آیات کے عثمانی متن میں اسی لفظی صورت کی ہے؛ اعراب نظر انداز، جڑے حروف اور لاحقے الگ شمار ہیں۔ غیر نمبر شدہ بسم اللہ شامل نہیں۔ مرکب عبارت اسی آیت میں مسلسل الفاظ کے مطابق شمار ہوتی ہے؛ ۰ کا مطلب یہ صورت متن میں نہیں ملی۔
        </p>
      </div>
    </div>
  );
}

// ───────── pages/VerseGrammar.jsx ─────────
const POS_LABEL = { ism: 'اسم', fail: 'فعل', harf: 'حرف' };

export function VerseGrammar() {
  const { surahNumber, ayah } = useParams();
  const navigate = useNavigate();
  const [surahs, setSurahs] = useState([]);
  const [edition, setEdition] = useState(null);
  const [quranWords, setQuranWords] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);
  const [reciter] = useState(localStorage.getItem('quran-reciter') || 'ar.alafasy');
  const audioRef = useRef(null);

  const ayahNum = Math.max(1, Number(ayah)); // 1-based
  const selectedAyah = ayahNum - 1; // 0-based index into edition arrays

  useEffect(() => {
    const cachedSurahs = getCachedSurahs();
    if (cachedSurahs) setSurahs(cachedSurahs);
    quranApi.getSurahs().then(data => { setSurahs(data); setCachedSurahs(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setEdition(null); setQuranWords([]); setAnalysis(null); setSelectedWord(null);
    const verseKey = `${surahNumber}:${ayahNum}`;

    const cachedEd = getCachedEdition(surahNumber);
    if (cachedEd) {
      setEdition(cachedEd);
      if (!cachedEd.urdu || cachedEd.urdu?.edition?.identifier !== 'ur.jalandhry') {
        quranApi.getSurahEditions(surahNumber, 'ur.jalandhry').then(data => {
          if (cancelled) return;
          const updated = { ...cachedEd, urdu: data };
          setEdition(updated); setCachedEdition(surahNumber, updated);
        }).catch(() => {});
      }
    } else {
      quranApi.getSurahEditions(surahNumber, `quran-uthmani,${reciter}`).then(data => {
        if (cancelled) return;
        const ed = { arabic: data[0], audio: data[1] };
        setEdition(ed); setCachedEdition(surahNumber, ed);
        quranApi.getSurahEditions(surahNumber, 'en.asad,ur.jalandhry').then(data2 => {
          if (cancelled) return;
          const updated = { ...ed, english: data2[0], urdu: data2[1] };
          setEdition(updated); setCachedEdition(surahNumber, updated);
        }).catch(() => {});
      }).catch(() => {});
    }

    (async () => {
      const cWords = getCachedWords(verseKey);
      const cAna = getCachedAnalysis(verseKey);
      let ws = cWords;
      if (ws) setQuranWords(ws);
      if (cAna) setAnalysis(cAna);
      try {
        if (!ws) {
          const v = await quranComApi.getVerseWords(verseKey);
          ws = (v.words || []).filter(w => w.char_type_name === 'word' && w.audio_url).map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url), transliteration: (w.transliteration && w.transliteration.text) || '' }));
          setQuranWords(ws); setCachedWords(verseKey, ws);
        }
        if (!cAna) {
          const offline = await getOfflineAnalysis(verseKey, surahNumber, ayahNum);
          if (offline) setAnalysis(offline);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [surahNumber, ayahNum, reciter]);

  useEffect(() => {
    if (edition?.arabic && ayahNum + 1 <= edition.arabic.numberOfAyahs) preloadVerse(surahNumber, ayahNum + 1);
  }, [edition, surahNumber, ayahNum]);

  const playWord = (i) => {
    const w = words[i]; if (!w?.audioUrl) return;
    const a = audioRef.current || (audioRef.current = new Audio());
    a.onended = () => setActiveIdx(null);
    a.src = w.audioUrl; setActiveIdx(i); a.play().catch(() => {});
  };
  const playVerse = () => {
    if (!edition?.audio) return;
    const a = audioRef.current || (audioRef.current = new Audio());
    a.onended = () => setActiveIdx(null);
    a.src = edition.audio.ayahs[selectedAyah].audio; a.play().catch(() => {});
  };

  if (!edition?.arabic) {
    return <div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const verse = edition.arabic.ayahs[selectedAyah];
  const eng = edition.english?.ayahs?.[selectedAyah]?.text || '…';
  const urdu = analysis?.translationUrdu || edition.urdu?.ayahs?.[selectedAyah]?.text || '';
  const meta = analysis?.wordMeta || [];
  const words = quranWords.map((w, i) => ({ ...w, ...(meta[i] || {}) }));
  const totalAyahs = edition.arabic.numberOfAyahs;
  const currentSurah = surahs.find(s => s.number === Number(surahNumber));
  const goAyah = (n) => navigate(`/reader/${surahNumber}/grammar/${n}`);
  const backToReader = () => navigate(`/reader/${surahNumber}?ayah=${ayahNum}`);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: 'radial-gradient(circle at 92% 0%, hsl(162 46% 20%) 0%, transparent 38%), linear-gradient(135deg, transparent 60%, rgba(190,142,54,0.08))' }} />

      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={backToReader} className="flex items-center gap-1 text-primary text-sm px-1.5 py-1 rounded-lg transition-colors hover:text-primary hover:bg-secondary/70 active:translate-x-[-2px] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
            <ArrowLeft className="w-4 h-4" /> <span dir="rtl">واپس</span>
          </button>
          <span className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Tajweed / grammar</span>
          <div className="flex items-center gap-1">
            <button onClick={() => goAyah(Math.max(1, ayahNum - 1))} disabled={ayahNum <= 1} className="w-8 h-9 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 flex items-center justify-center text-[#3e2a1d] shadow-[0_3px_5px_rgba(62,42,29,0.25)] active:translate-y-0.5 disabled:opacity-40" aria-label="پچھلی آیت"><ChevronRight className="w-4 h-4" /></button>
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-b from-[#d9924a] to-[#bc7d45] text-white text-[10px] font-semibold tabular-nums">آیت {ayahNum}</span>
            <button onClick={() => goAyah(Math.min(totalAyahs, ayahNum + 1))} disabled={ayahNum >= totalAyahs} className="w-8 h-9 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 flex items-center justify-center text-[#3e2a1d] shadow-[0_3px_5px_rgba(62,42,29,0.25)] active:translate-y-0.5 disabled:opacity-40" aria-label="اگلی آیت"><ChevronLeft className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-20 pb-16">
        {/* Verse card */}
        <div className="border border-border bg-card rounded-2xl p-3.5 text-right animate-[rise_0.55s_0.08s_both]" dir="rtl">
          <p className="m-0 text-primary font-quran text-[25px] leading-[2.0]" style={{ wordSpacing: '0.3em' }}>{verse.text}</p>
          <p className="mt-1.5 text-muted-foreground text-[11px] leading-[1.5]" dir="rtl">{urdu || eng}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-2 mt-3 animate-[rise_0.55s_0.16s_both]">
          <button onClick={playVerse} className="border border-border bg-secondary text-foreground/80 rounded-full px-3 py-1.5 text-[10px] flex items-center gap-1.5 transition-colors hover:bg-secondary/70 hover:text-primary hover:shadow-[0_4px_12px_rgba(0,0,0,0.22)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"><Headphones className="w-3.5 h-3.5" /><span>Listen</span></button>
          <button onClick={backToReader} className="border border-border bg-secondary text-foreground/80 rounded-full px-3 py-1.5 text-[10px] flex items-center gap-1.5 transition-colors hover:bg-secondary/70 hover:text-primary hover:shadow-[0_4px_12px_rgba(0,0,0,0.22)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"><BookOpen className="w-3.5 h-3.5" /><span>Practice</span></button>
          <button onClick={backToReader} className="border border-border bg-secondary text-foreground/80 rounded-full px-3 py-1.5 text-[10px] flex items-center gap-1.5 transition-colors hover:bg-secondary/70 hover:text-primary hover:shadow-[0_4px_12px_rgba(0,0,0,0.22)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"><Landmark className="w-3.5 h-3.5" /><span>Revelation</span></button>
        </div>

        {/* Detail */}
        <div className="mt-4 pt-2.5 border-t border-border animate-[rise_0.55s_0.24s_both]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs text-muted-foreground" dir="rtl">تجزیہ تیار ہو رہا ہے…</p></div>
          ) : words.length ? (
            <>
              <p className="text-center text-xs text-muted-foreground mb-3" dir="rtl">لفظ پر کلک کریں — تجوید اور گرامر کی تفصیل دیکھیں۔</p>
              <div className="grid grid-cols-3 gap-2" dir="rtl">
                {words.map((w, i) => {
                  const active = selectedWord === i;
                  return (
                    <button key={i} onClick={() => setSelectedWord(active ? null : i)} className={`border rounded-[10px] p-2 text-center flex flex-col justify-center gap-1 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${active ? 'bg-secondary border-primary' : 'bg-card border-border hover:bg-secondary hover:border-primary'}`}>
                      <span className="font-quran text-primary text-[20px] leading-[1.3]">{w.arabic}</span>
                      <span className="text-[9px] text-emerald-400 tracking-[0.08em]">{POS_LABEL[w.category] || '—'}</span>
                      <span className="text-[10px] text-foreground/80 leading-[1.3] font-urdu">{w.urduTranslation || ''}</span>
                    </button>
                  );
                })}
              </div>

              {/* Expanded detail */}
              {selectedWord !== null && (() => {
                const w = words[selectedWord];
                const indicators = detectTajweedIndicators(w.arabic);
                return (
                  <div className="mt-4 rounded-2xl border border-border bg-card p-4 animate-[rise_0.4s_both]" dir="rtl">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="text-right">
                        <p className="font-quran text-3xl text-primary">{w.arabic}</p>
                        {w.transliteration && <p className="text-xs text-muted-foreground mt-1" dir="ltr">{w.transliteration}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-emerald-400">{POS_LABEL[w.category] || '—'}</span>
                        <button onClick={() => playWord(selectedWord)} className="flex items-center gap-1 text-primary text-xs hover:text-primary transition-colors"><Volume2 className="w-3.5 h-3.5" fill={activeIdx === selectedWord ? 'currentColor' : 'none'} /> سنیں</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-lg bg-muted border border-border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">اردو مطلب</p>
                        <p className="text-sm text-foreground/80 font-urdu">{w.urduTranslation || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-muted border border-border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1" dir="ltr">English</p>
                        <p className="text-sm text-foreground/80" dir="ltr">{w.translation || eng}</p>
                      </div>
                    </div>

                    {w.root && w.root !== '—' && (
                      <div className="rounded-lg bg-muted border border-border p-2.5 mb-3">
                        <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">روٹ لفظ</p>
                        <p className="text-sm text-foreground/80 font-quran">{w.root}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5" dir="rtl"><SpellCheck className="w-3.5 h-3.5" /> تجوید اشاریے</p>
                      {indicators.length ? (
                        <div className="space-y-2">
                          {indicators.map((ind, k) => (
                            <div key={k} className="rounded-lg bg-muted border border-border p-2.5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-emerald-400" dir="rtl">{ind.label}</span>
                                <span className="text-xs text-foreground/80" dir="rtl">{ind.value}</span>
                              </div>
                              <p className="text-[11px] text-foreground/70 leading-relaxed font-urdu" dir="rtl">{ind.desc}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground" dir="rtl">اس لفظ میں کوئی خاص تجوید اشاریہ نہیں۔</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-10" dir="rtl">کوئی ڈیٹا دستیاب نہیں۔</p>
          )}
        </div>

        {currentSurah && (
          <p className="text-center text-xs text-muted-foreground mt-6" dir="rtl">سورة {currentSurah.name} • آیت {ayahNum} از {totalAyahs}</p>
        )}
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

// ───────── pages/WordDetail.jsx ─────────
function ReportRow({ label, value, lang, direction = 'rtl' }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2.5">
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0" dir={lang === 'ur' ? 'rtl' : 'ltr'}>{label}</span>
      <span className={`text-sm text-foreground text-right flex-1 min-w-0 break-words ${direction === 'rtl' ? 'font-urdu' : 'font-body'}`} dir={direction}>{value || '—'}</span>
    </div>
  );
}

export function WordDetail() {
  const { surahNumber, ayah, wordIndex } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const idx = Number(wordIndex);
  const [word, setWord] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wordCount, setWordCount] = useState(null);
  const [countError, setCountError] = useState(false);
  const [countAttempt, setCountAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setWordCount(null); setCountError(false);
    if (word?.arabic) getWordCount(word.arabic).then(result => {
      if (!cancelled) setWordCount(result.count);
    }).catch(() => { if (!cancelled) setCountError(true); });
    return () => { cancelled = true; };
  }, [word?.arabic, countAttempt]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const verseKey = `${surahNumber}:${ayah}`;
      let words = getCachedWords(verseKey);
      if (!words && isFatihah(surahNumber)) {
        const staticWs = getFatihahWords(Number(ayah));
        if (staticWs) { words = staticWs; setCachedWords(verseKey, words); }
      }
      if (!words) {
        const verse = await quranComApi.getVerseWords(verseKey, 'text_uthmani,char_type_name,audio_url,transliteration,translation');
        words = (verse.words || [])
          .filter(w => w.char_type_name === 'word' && w.audio_url)
          .map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url), transliteration: (w.transliteration && w.transliteration.text) || '', english: w.translation?.text || '' }));
        setCachedWords(verseKey, words);
      }
      if (!cancelled) { setWord(words[idx] || null); setTotal(words.length); setLoading(false); }
      let analysis = getCachedAnalysis(verseKey);
      if (!analysis && isFatihah(surahNumber)) {
        const staticAnalysis = getFatihahAnalysis(Number(ayah));
        if (staticAnalysis) { analysis = staticAnalysis; setCachedAnalysis(verseKey, analysis); }
      }
      if (!analysis) {
        try {
          analysis = await getOfflineAnalysis(verseKey, surahNumber, Number(ayah));
          if (analysis) setCachedAnalysis(verseKey, analysis);
        } catch {}
      }
      const meta = analysis?.wordMeta || [];
      let w = { ...(words[idx] || {}), ...(meta[idx] || {}) };

      // Enrich with dictionary data (normalized matching) + IndexedDB data
      try {
        const dictEntry = w.arabic ? getDictionaryEntry(w.arabic) : null;
        const dbWord = await getWordData(Number(surahNumber), Number(ayah), idx);
        if (dbWord) {
          w = {
            ...w,
            ...dbWord,
            // Never present a whole ayah translation as this word's meaning.
            urdu: dictEntry?.ur || dbWord.urduTranslation || w.urdu || '',
            english: dbWord.englishTranslation || dictEntry?.en || w.english || '',
            category: dbWord.grammarType || w.category,
            partOfSpeech: dbWord.grammarSubType || w.partOfSpeech || '',
            root: dictEntry?.root || dbWord.root || w.root || '',
            derivatives: dictEntry?.derivatives || dbWord.derivatives || w.derivatives || '',
          };
        } else if (dictEntry) {
          w = {
            ...w,
            urdu: dictEntry.ur || w.urdu || '',
            english: dictEntry.en || w.english || '',
            root: dictEntry.root || w.root || '',
            derivatives: dictEntry.derivatives || w.derivatives || '',
          };
        }
        const meaning = getWordMeaning(w);
        if (!meaning.urdu && !meaning.english) {
          const verse = await quranComApi.getVerseWordTranslations(verseKey);
          const translatedWord = (verse?.words || []).filter(item => item.char_type_name === 'word')[idx];
          w.english = translatedWord?.translation?.text || '';
        }
      } catch {}

      if (!cancelled) setWord(w);
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [surahNumber, ayah, wordIndex]);

  const play = () => { if (word?.audioUrl) new Audio(word.audioUrl).play().catch(() => {}); };

  // Enrich with grammar classifier if no category from analysis
  const grammarInfo = word?.arabic ? classifyWord(word.arabic, word.english || word.urdu || '') : null;
  const grammarType = word?.category || grammarInfo?.type || 'ism';
  const grammarMeta = getGrammarTypeMeta(grammarType);
  const grammarSubType = word?.partOfSpeech || grammarInfo?.subType || '—';
  const meaning = getWordMeaning(word || {});

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background">
        <button onClick={() => navigate(`/reader/${surahNumber}`)} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <span className="font-heading text-sm font-semibold text-foreground" dir={lang === 'ur' ? 'rtl' : 'ltr'}>{t('word_title')}</span>
        <span className="text-xs text-muted-foreground tabular-nums" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
          {surahNumber}:{ayah} • {t('word_word')} {idx + 1}/{total || '—'}
        </span>
      </div>

      <OrnateFrame className="mx-4 mt-2 rounded-2xl border border-border bg-card">
        {loading || !word ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <p className="text-xs text-muted-foreground" dir={lang === 'ur' ? 'rtl' : 'ltr'}>{t('word_loading')}</p>
          </div>
        ) : (
          <div className="text-center">
            {/* Word display */}
            <p className="font-quran text-6xl text-foreground mb-2 leading-loose" dir="rtl" style={{ wordSpacing: '0.15em' }}>{word.arabic}</p>
            {word.transliteration && <p className="text-xs text-muted-foreground mb-4" dir="ltr">{word.transliteration}</p>}

            {/* Grammar type badge */}
            <div className="flex justify-center gap-2 mb-5 flex-wrap">
              <span className={`text-xs px-3 py-1 rounded-full border font-medium ${grammarMeta.color}`} dir="rtl">
                {lang === 'ur' ? grammarMeta.label : grammarMeta.labelEn}
              </span>
              {grammarSubType !== '—' && (
                <span className="text-xs px-3 py-1 rounded-full bg-secondary/60 text-secondary-foreground border border-border font-medium" dir="rtl">
                  {grammarSubType}
                </span>
              )}
            </div>

            {/* Listen button */}
            <button onClick={play} className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Volume2 className="w-4 h-4" /> <span dir={lang === 'ur' ? 'rtl' : 'ltr'}>{t('word_listen')}</span>
            </button>

            {/* Analytical Report — simple clear list */}
            <div className="text-right space-y-3 max-w-sm mx-auto" dir="rtl">
              <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-primary/30">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary" dir={lang === 'ur' ? 'rtl' : 'ltr'}>{t('word_report')}</span>
              </div>

              <ReportRow label={t('word_grammar')} value={lang === 'ur' ? grammarMeta.label : grammarMeta.labelEn} lang={lang} />
              <ReportRow label={t('word_subcategory')} value={grammarSubType} lang={lang} />
              <ReportRow label={t('word_root')} value={word.root || '—'} lang={lang} />
              <ReportRow label={meaning.urdu ? t('word_meaning') : (lang === 'ur' ? 'مطلب (انگریزی متبادل)' : 'Meaning (English fallback)')} value={<WordMeaning word={word} />} direction={meaning.urdu ? 'rtl' : 'ltr'} lang={lang} />
              {meaning.urdu && <ReportRow label={t('word_meaning_en')} value={meaning.english || (lang === 'ur' ? 'معنی دستیاب نہیں' : 'Unavailable')} direction="ltr" lang={lang} />}
              <ReportRow label={t('word_count')} value={countError ? <button onClick={() => setCountAttempt(n => n + 1)} className="text-primary underline">{lang === 'ur' ? 'دوبارہ کوشش کریں' : 'Retry count'}</button> : wordCount !== null ? `${wordCount} ${t('word_times')}` : (lang === 'ur' ? 'اصل تعداد شمار ہو رہی ہے…' : 'Counting full Quran…')} lang={lang} />
              <p className="text-[10px] text-muted-foreground leading-relaxed" dir={lang === 'ur' ? 'rtl' : 'ltr'}>{lang === 'ur' ? 'تمام ۶۲۳۶ آیات میں یہی لفظی صورت؛ اعراب نظر انداز، جڑے حروف اور لاحقے الگ شمار۔ غیر نمبر شدہ بسم اللہ شامل نہیں۔' : 'Same written form across all 6,236 ayahs; diacritics ignored, attached prefixes and suffixes counted separately. Unnumbered basmala headers excluded.'}</p>
              {word.derivatives && word.derivatives !== '—' && (
                <ReportRow label={t('word_derivatives')} value={word.derivatives} lang={lang} />
              )}
            </div>
          </div>
        )}
      </OrnateFrame>

      {/* Navigation */}
      {!loading && word && (
        <div className="flex items-center justify-between mx-4 mt-4">
          <button disabled={idx <= 0} onClick={() => navigate(`/reader/${surahNumber}/word/${ayah}/${idx - 1}`)} className="flex items-center gap-1 text-sm text-foreground disabled:opacity-40">
            <ChevronRight className="w-4 h-4" /> <span dir={lang === 'ur' ? 'rtl' : 'ltr'}>{t('word_prev')}</span>
          </button>
          <button onClick={() => navigate(`/reader/${surahNumber}`)} className="flex items-center gap-1 text-sm text-accent font-medium">
            <BookOpen className="w-4 h-4" /> <span dir={lang === 'ur' ? 'rtl' : 'ltr'}>{t('word_back')}</span>
          </button>
          <button disabled={idx >= total - 1} onClick={() => navigate(`/reader/${surahNumber}/word/${ayah}/${idx + 1}`)} className="flex items-center gap-1 text-sm text-foreground disabled:opacity-40">
            <span dir={lang === 'ur' ? 'rtl' : 'ltr'}>{t('word_next')}</span> <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
