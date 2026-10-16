import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Volume2, Play, Mic, Square, CheckCircle2, XCircle, RotateCcw, Globe, Turtle, AlertTriangle, BookOpen, Sparkles, Repeat, Focus, Gauge, X, Headphones, ChevronDown, AlertCircle, ChevronRight, ChevronLeft, Activity, GraduationCap, Lightbulb, Type, Trash2, Target, TrendingDown } from 'lucide-react';
import { createRecognition, isSpeechRecognitionSupported, checkWord, getOnlineVerifyUrls, analyzeRecitation, speakUrdu, speakSaidWord, speakArabic, normalizeArabic, speakMispronouncedSummary } from '@/lib/tajweed';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui';
import { backend } from '@/api/backend';
import { VerseBox, OrnateFrame, BookQuillIcon } from '@/components/quran';
import { recordPractice, saveLearningRecords, recordWordAttempt, getAdvice, clearProgress, getOverallStats } from '@/lib/stores';
import { quranApi, quranComApi, wordAudioUrl } from '@/lib/quran';
import { arabicBasics, analyzeMakharijErrors, recommendFirstLesson, tajweedCategories } from '@/lib/data';

// ───────── components/quran/GuidedPractice.jsx ─────────
// Self-contained guided "listen and repeat" practice — the teacher plays
// each word, the user repeats, and speech recognition checks correctness.
// On mistakes, an online verification option is shown.
export function GuidedPractice({ words, verseKey }) {
  const [active, setActive] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [results, setResults] = useState([]);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionSupported = isSpeechRecognitionSupported();

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  };

  const stopAll = () => {
    if (audioRef.current) audioRef.current.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopRecognition();
  };

  useEffect(() => () => stopAll(), []);

  const playGuide = useCallback((w) => {
    return new Promise((resolve) => {
      if (!w.audioUrl) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(w.arabic);
          utter.lang = 'ar-SA';
          utter.rate = 0.75;
          utter.onend = resolve;
          utter.onerror = resolve;
          window.speechSynthesis.speak(utter);
        } else resolve();
      } else {
        const a = new Audio(w.audioUrl);
        audioRef.current = a;
        a.onended = resolve;
        a.onerror = resolve;
        a.play().catch(resolve);
      }
    });
  }, []);

  const setResult = (idx, correct, spoken) => {
    setResults(prev => {
      const next = [...prev];
      next[idx] = { correct, spoken };
      return next;
    });
  };

  const guideAndListen = useCallback(async (idx) => {
    if (idx >= words.length) {
      setPhase('done');
      return;
    }
    const w = words[idx];
    if (!w?.arabic) return;

    // Phase 1: Guide plays the word
    setPhase('playing');
    await playGuide(w);
    await new Promise(r => setTimeout(r, 400));

    // Phase 2: Listen for user's repetition
    if (!recognitionSupported) {
      setPhase('listening');
      await new Promise(r => setTimeout(r, 1500));
      setResult(idx, null, 'غیر دستیاب');
      setPhase('idle');
      setCurrentIdx(idx + 1);
      guideAndListen(idx + 1);
      return;
    }

    setPhase('listening');
    const recognition = createRecognition('ar-SA');
    if (!recognition) {
      setResult(idx, null, '');
      setPhase('idle');
      setCurrentIdx(idx + 1);
      guideAndListen(idx + 1);
      return;
    }

    let resolved = false;
    let finalTranscript = '';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
    };

    recognition.onerror = () => {
      if (resolved) return;
      resolved = true;
      stopRecognition();
      setResult(idx, null, '');
      setPhase('idle');
      setCurrentIdx(idx + 1);
      setTimeout(() => guideAndListen(idx + 1), 300);
    };

    recognition.onend = () => {
      if (resolved) return;
      resolved = true;
      stopRecognition();
      setPhase('checking');
      const spoken = finalTranscript.trim();
      const correct = checkWord(spoken, w.arabic);
      setResult(idx, correct, spoken);
      setTimeout(() => {
        setPhase('idle');
        setCurrentIdx(idx + 1);
        guideAndListen(idx + 1);
      }, 1000);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {
      if (!resolved) {
        resolved = true;
        setResult(idx, null, '');
        setPhase('idle');
        setCurrentIdx(idx + 1);
        guideAndListen(idx + 1);
      }
    }

    setTimeout(() => {
      if (!resolved && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    }, 5000);
  }, [words, recognitionSupported, playGuide]);

  const startGuided = () => {
    if (!words?.length) return;
    stopAll();
    setCurrentIdx(0);
    setResults([]);
    setPhase('idle');
    setActive(true);
    setTimeout(() => guideAndListen(0), 200);
  };

  const stopGuided = () => {
    stopAll();
    setActive(false);
    setPhase('idle');
    setCurrentIdx(0);
  };

  const replayWord = (i) => {
    const w = words[i];
    if (!w) return;
    if (w.audioUrl) {
      const a = new Audio(w.audioUrl);
      a.play().catch(() => {});
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(w.arabic);
      utter.lang = 'ar-SA';
      utter.rate = 0.75;
      window.speechSynthesis.speak(utter);
    }
  };

  const correctCount = results.filter(r => r?.correct === true).length;
  const totalCount = results.filter(r => r !== undefined).length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const wrongCount = results.filter(r => r?.correct === false).length;
  const onlineUrls = verseKey ? getOnlineVerifyUrls(verseKey) : null;

  if (!words?.length) {
    return <p className="text-center text-sm text-muted-foreground py-4" dir="rtl">الفاظ دستیاب نہیں۔</p>;
  }

  return (
    <div>
      {/* Word display */}
      <div className="rounded-xl bg-card/50 border border-primary/40 p-4 mb-3">
        <p className="text-center text-[10px] text-muted-foreground mb-3" dir="rtl">
          استاد پڑھائے گا، آپ دہرائیں — غلطی پر آن لائن جانچ کا آپشن بھی ہے
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {words.map((w, i) => {
            const isCurrent = active && currentIdx === i;
            const res = results[i];
            let stateClass = 'border-transparent text-foreground hover:border-primary/40 hover:bg-secondary/60/50';
            if (res) {
              if (res.correct === true) stateClass = 'border-emerald-400 bg-emerald-500/10 text-emerald-400';
              else if (res.correct === false) stateClass = 'border-red-400 bg-red-500/10 text-red-400';
              else stateClass = 'border-amber-300 bg-amber-500/10 text-amber-400';
            }
            if (isCurrent) stateClass = 'border-primary bg-primary/10 text-primary scale-105';
            return (
              <button key={i} onClick={() => replayWord(i)} className={`group flex flex-col items-center px-2 py-1.5 rounded-lg border transition-all active:scale-95 ${stateClass}`}>
                <p className="font-arabic text-xl" dir="rtl" style={{ wordSpacing: '0.2em', lineHeight: '2.4' }}>{w.arabic}</p>
                <span className="flex items-center gap-0.5 mt-0.5 h-4">
                  {res?.correct === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {res?.correct === false && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  {isCurrent && phase === 'playing' && <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
                  {isCurrent && phase === 'listening' && <Mic className="w-3.5 h-3.5 animate-pulse" />}
                  {isCurrent && phase === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {!res && !isCurrent && <Volume2 className="w-3 h-3 text-muted-foreground/40" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase indicator */}
      {active && phase !== 'done' && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-center mb-3">
          {phase === 'playing' && <p className="text-xs font-urdu text-primary flex items-center justify-center gap-1.5" dir="rtl"><Volume2 className="w-4 h-4 animate-pulse" /> استاد پڑھ رہا ہے — غور سے سنیں</p>}
          {phase === 'listening' && <p className="text-xs font-urdu text-primary flex items-center justify-center gap-1.5" dir="rtl"><Mic className="w-4 h-4 animate-pulse" /> آپ کی باری — لفظ دہرائیں</p>}
          {phase === 'checking' && <p className="text-xs font-urdu text-accent-foreground flex items-center justify-center gap-1.5" dir="rtl"><Loader2 className="w-4 h-4 animate-spin" /> جانچ ہو رہی ہے…</p>}
          {phase === 'idle' && <p className="text-xs text-muted-foreground" dir="rtl">اگلا لفظ…</p>}
        </div>
      )}

      {/* Results summary */}
      {active && phase === 'done' && (
        <div className="rounded-xl bg-gradient-to-b from-secondary/80 to-[#e8d4b0] border border-primary/40 p-4 text-center mb-3">
          <p className="text-3xl font-bold text-primary mb-1">{score}%</p>
          <p className="text-sm font-urdu text-foreground/80" dir="rtl">{correctCount} از {totalCount} الفاظ درست پڑھے</p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {results.map((r, i) => (
              <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${r?.correct === true ? 'bg-emerald-500/15 text-emerald-400' : r?.correct === false ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {r?.correct === true ? '✓' : r?.correct === false ? '✗' : '—'}
              </span>
            ))}
          </div>
          {score === 100 ? (
            <p className="text-sm font-urdu text-emerald-400 mt-3" dir="rtl">ماشاءاللہ! تمام الفاظ درست پڑھے۔</p>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              {wrongCount > 0 && onlineUrls && (
                <>
                  <button
                    onClick={() => window.open(onlineUrls.quranCom, '_blank')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                    dir="rtl"
                  >
                    <Globe className="w-3.5 h-3.5" /> آن لائن سن کر جانچیں
                  </button>
                  <button
                    onClick={() => window.open(onlineUrls.youtube, '_blank')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold"
                    dir="rtl"
                  >
                    <Globe className="w-3.5 h-3.5" /> یوٹیوب
                  </button>
                </>
              )}
              <button onClick={startGuided} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] text-xs font-semibold">
                <RotateCcw className="w-3.5 h-3.5" /> دوبارہ مشق
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {phase !== 'done' && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {!active ? (
            <button onClick={startGuided} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] text-sm font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5">
              <Play className="w-4 h-4" /> قائد موڈ شروع کریں
            </button>
          ) : (
            <button onClick={stopGuided} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold">
              <Square className="w-4 h-4" /> رکائیں
            </button>
          )}
        </div>
      )}

      {!recognitionSupported && (
        <p className="text-[10px] text-center text-amber-400 font-urdu mt-2" dir="rtl">
          آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں — قائد موڈ آڈیو سن کر دہرانے کے لیے استعمال کریں۔
        </p>
      )}
    </div>
  );
}

// ───────── components/quran/PracticeFeedback.jsx ─────────
const scoreColor = (s) => (s >= 80 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-primary');
const scoreBg = (s) => (s >= 80 ? 'border-emerald-300 bg-emerald-500/10' : s >= 50 ? 'border-amber-300 bg-amber-500/10' : 'border-primary/30 bg-primary/5');

const tajweedCategoryLabels = {
  makharij: 'مخارج',
  sifat: 'صفات',
  noon_sakinah: 'نون ساکنہ',
  meem_sakinah: 'میم ساکنہ',
  madd: 'مد',
  qalqalah: 'قلقلہ',
  idgham: 'إدغام',
  waqf: 'وقف',
  tafkheem: 'تفخیم/ترقیق',
  other: 'تجوید',
};

export function PracticeFeedback({
  feedback,
  words,
  verseKey,
  speakingIdx,
  speakingAll,
  onSpeakTip,
  onSpeakAll,
  onPlayWordCorrect,
  onPlaySlow,
  needsSlowAvailable,
  onRepeatProblem,
  onRepeatFull,
  userAudioUrl,
  onPlayUserAudio,
  onSpeakSaid,
  speakingSaid,
}) {
  if (!feedback) return null;

  const accuracy = feedback.verseAccuracy || {};
  const mistakes = feedback.mistakes || [];
  const hasAccuracyIssues =
    (accuracy.missingWords && accuracy.missingWords.length > 0) ||
    (accuracy.extraWords && accuracy.extraWords.length > 0) ||
    (accuracy.mispronouncedWords && accuracy.mispronouncedWords.length > 0);
  const hasMistakes = hasAccuracyIssues || mistakes.length > 0;

  return (
    <div className="mt-4 space-y-3">
      {/* Score + Summary */}
      <div className="flex items-center gap-3">
        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 ${scoreBg(feedback.overallScore || 0)}`}>
          <span className={`text-lg font-bold ${scoreColor(feedback.overallScore || 0)}`}>{feedback.overallScore || 0}</span>
        </div>
        <p className="text-sm text-foreground/90 flex-1 font-urdu leading-relaxed" dir="rtl">{feedback.summary || '—'}</p>
      </div>

      {feedback.isBrowserBased && (
        <div className="rounded-lg bg-accent/10 border border-accent/25 px-3 py-2">
          <p className="text-[11px] text-accent-foreground font-urdu leading-relaxed" dir="rtl">
            یہ تجزیہ براؤزر پر مبنی ہے — آیت کے الفاظ کی درستگی چیک ہوئی ہے۔ تفصیلی تجوید اور مخارج کی اصلاح AI سہولیات بحال ہونے پر خودکار دستیاب ہو جائے گی۔
          </p>
        </div>
      )}

      {/* Speak all — prominent replay button for teacher's correction */}
      <button onClick={onSpeakAll} disabled={speakingAll} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground bg-primary border border-primary rounded-full py-2.5 disabled:opacity-60 transition-colors hover:bg-primary/90">
        <Repeat className={`w-4 h-4 ${speakingAll ? 'animate-spin' : ''}`} /> {speakingAll ? 'بولا جا رہا ہے…' : 'استاد کی رہنمائی سنیں — دوبارہ سنیں'}
      </button>

      {/* User audio playback — hear your own voice */}
      {userAudioUrl && onPlayUserAudio && (
        <button onClick={onPlayUserAudio} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-accent-foreground border border-accent/30 rounded-full py-2">
          <Volume2 className="w-4 h-4" /> اپنی آواز سنائیں — جو آپ نے پڑھا
        </button>
      )}

      {/* Verse Accuracy Section */}
      <div className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden">
        <div className="px-3 py-2 bg-gradient-to-b from-secondary/80 to-[#e8d4b0] border-b border-primary/30 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground" dir="rtl">آیت کی درستگی</span>
          {accuracy.isComplete && !hasAccuracyIssues && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-400 font-medium" dir="rtl">
              <CheckCircle2 className="w-3.5 h-3.5" /> مکمل اور درست
            </span>
          )}
        </div>
        <div className="p-3 space-y-2">
          {accuracy.missingWords && accuracy.missingWords.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-destructive" dir="rtl">الفاظ چھوڑ دیے:</p>
                <p className="font-arabic text-lg text-foreground mt-1" dir="rtl">{accuracy.missingWords.join(' • ')}</p>
              </div>
            </div>
          )}
          {accuracy.extraWords && accuracy.extraWords.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-200 p-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800" dir="rtl">اضافی الفاظ کہے:</p>
                <p className="font-arabic text-lg text-foreground mt-1" dir="rtl">{accuracy.extraWords.join(' • ')}</p>
              </div>
            </div>
          )}
          {accuracy.mispronouncedWords && accuracy.mispronouncedWords.length > 0 && (
            <div className="space-y-1.5">
              {accuracy.mispronouncedWords.map((mw, i) => (
                <div key={i} className="rounded-lg bg-accent/10 border border-accent/25 p-2">
                  <div className="text-xs font-urdu mb-2" dir="rtl">
                    <span className="text-destructive font-semibold">کہا: {mw.said}</span>
                    <span className="text-muted-foreground mx-1">—</span>
                    <span className="text-emerald-400 font-semibold">درست: {mw.expected}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {onSpeakSaid && (
                      <button onClick={() => onSpeakSaid(mw.said, mw.expected, i)} disabled={speakingSaid === i} className="flex items-center gap-1 text-[11px] text-primary border border-primary/30 rounded-full px-2 py-1 disabled:opacity-60" dir="rtl">
                        <Volume2 className={`w-3 h-3 ${speakingSaid === i ? 'animate-pulse' : ''}`} /> {speakingSaid === i ? 'بولا جا رہا…' : 'تم نے یہ پڑھا'}
                      </button>
                    )}
                    {onPlayWordCorrect && mw.wordIndex >= 1 && words[mw.wordIndex - 1] && (
                      <button onClick={() => onPlayWordCorrect(mw.wordIndex)} className="flex items-center gap-1 text-[11px] text-emerald-400 border border-emerald-400/30 rounded-full px-2 py-1" dir="rtl">
                        <Volume2 className="w-3 h-3" /> درست سنائیں
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!hasAccuracyIssues && accuracy.isComplete && (
            <p className="text-xs text-emerald-400 font-urdu text-center" dir="rtl">آپ نے تمام الفاظ مکمل اور درست پڑھے ہیں۔</p>
          )}
        </div>
      </div>

      {/* Slow playback */}
      {needsSlowAvailable && feedback.needsSlow && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-200 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-amber-800 font-urdu" dir="rtl">آپ تیزی سے پڑھ رہے ہیں — پہلے آہستہ سنیں اور ساتھ ساتھ پڑھیں۔</span>
          <button onClick={onPlaySlow} className="flex items-center gap-1 text-xs font-medium text-amber-800 shrink-0">
            <Turtle className="w-4 h-4" /> آہستہ سنائیں
          </button>
        </div>
      )}

      {/* Tajweed Mistakes */}
      {mistakes.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground" dir="rtl">تجوید کی اصلاح ({mistakes.length})</span>
          </div>
          {mistakes.map((m, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/50 p-3">
              <div className="flex items-start gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  {m.wordIndex >= 1 && words[m.wordIndex - 1] && (
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-arabic text-xl text-foreground" dir="rtl">{words[m.wordIndex - 1].arabic}</p>
                      {m.tajweedCategory && tajweedCategoryLabels[m.tajweedCategory] && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground border border-accent/30 font-urdu" dir="rtl">{tajweedCategoryLabels[m.tajweedCategory]}</span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-destructive font-urdu" dir="rtl"><span className="font-semibold">غلطی:</span> {m.issue}</p>
                  <p className="text-xs text-foreground/80 font-urdu mt-0.5" dir="rtl"><span className="font-semibold">درست:</span> {m.correction}</p>
                  <p className="text-xs text-primary font-urdu mt-0.5" dir="rtl"><span className="font-semibold">طریقہ:</span> {m.tip}</p>
                  {m.makhraj && <p className="text-xs text-accent-foreground font-urdu mt-0.5" dir="rtl"><span className="font-semibold">مخرج:</span> {m.makhraj}</p>}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button onClick={() => onSpeakTip(`غلطی: ${m.issue}. درست: ${m.correction}. طریقہ: ${m.tip}. مخرج: ${m.makhraj || ''}`, i)} className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-full px-2 py-1">
                      <Volume2 className="w-3 h-3" />{speakingIdx === i ? '…' : 'سنائیں'}
                    </button>
                    {m.wordIndex >= 1 && words[m.wordIndex - 1] && (
                      <button onClick={() => onPlayWordCorrect(m.wordIndex)} className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-full px-2 py-1">
                        <Volume2 className="w-3 h-3" /> درست تلاوت
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-emerald-400 font-urdu" dir="rtl">ماشاءاللہ! تجوید کے تمام احکام درست ادا کیے۔</p>
      )}

      {/* Online verify on mistakes */}
      {hasMistakes && verseKey && (() => { const urls = getOnlineVerifyUrls(verseKey); return (
        <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5 flex items-center justify-between gap-2">
          <span className="text-xs text-primary font-urdu" dir="rtl">غلطیوں کی اصلاح کے لیے آن لائن تلاوت سنیں</span>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => window.open(urls.quranCom, '_blank')} className="flex items-center gap-1 text-xs font-medium text-primary border border-primary/30 rounded-full px-2.5 py-1">
              <Globe className="w-3 h-3" /> Quran.com
            </button>
            <button onClick={() => window.open(urls.youtube, '_blank')} className="flex items-center gap-1 text-xs font-medium text-destructive border border-destructive/30 rounded-full px-2.5 py-1">
              <Globe className="w-3 h-3" /> YouTube
            </button>
          </div>
        </div>
      ); })()}

      {/* Repeat practice: specific problem words or the full verse */}
      {hasMistakes && (onRepeatProblem || onRepeatFull) && (() => {
        const problemIndices = new Set();
        (accuracy.mispronouncedWords || []).forEach((mw) => { if (mw.wordIndex >= 1) problemIndices.add(mw.wordIndex); });
        mistakes.forEach((m) => { if (m.wordIndex >= 1) problemIndices.add(m.wordIndex); });
        const problemCount = problemIndices.size;
        return (
          <div className="rounded-xl border-2 border-primary/30 bg-card p-3">
            <p className="text-xs font-semibold text-foreground mb-2 text-center" dir="rtl">دوبارہ مشق کریں</p>
            <div className="flex gap-2">
              {onRepeatProblem && problemCount > 0 && (
                <button onClick={onRepeatProblem} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold" dir="rtl">
                  <Focus className="w-3.5 h-3.5" /> صرف غلط الفاظ ({problemCount})
                </button>
              )}
              {onRepeatFull && (
                <button onClick={onRepeatFull} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] text-xs font-semibold" dir="rtl">
                  <Repeat className="w-3.5 h-3.5" /> پوری آیت دہرائیں
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Slow practice */}
      {needsSlowAvailable && (
        <button onClick={onPlaySlow} className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
          <Turtle className="w-4 h-4" /> مثال کی تلاوت آہستہ سن کر ساتھ پڑھیں
        </button>
      )}
    </div>
  );
}

// ───────── components/quran/PracticeModal.jsx ─────────
const feedbackSchema = {
  type: 'object',
  properties: {
    overallScore: { type: 'number' },
    summary: { type: 'string' },
    needsSlow: { type: 'boolean' },
    verseAccuracy: {
      type: 'object',
      properties: {
        isComplete: { type: 'boolean' },
        missingWords: { type: 'array', items: { type: 'string' } },
        extraWords: { type: 'array', items: { type: 'string' } },
        mispronouncedWords: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              wordIndex: { type: 'number' },
              expected: { type: 'string' },
              said: { type: 'string' }
            },
            required: ['wordIndex', 'expected', 'said']
          }
        }
      },
      required: ['isComplete', 'missingWords', 'extraWords', 'mispronouncedWords']
    },
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          wordIndex: { type: 'number' },
          issue: { type: 'string' },
          correction: { type: 'string' },
          tip: { type: 'string' },
          makhraj: { type: 'string' },
          tajweedCategory: { type: 'string', enum: ['makharij', 'sifat', 'noon_sakinah', 'meem_sakinah', 'madd', 'qalqalah', 'idgham', 'waqf', 'tafkheem', 'other'] }
        },
        required: ['wordIndex', 'issue', 'correction', 'tip', 'makhraj', 'tajweedCategory']
      }
    }
  },
  required: ['overallScore', 'summary', 'needsSlow', 'verseAccuracy', 'mistakes']
};

export function PracticeModal({ open, onOpenChange, verseKey, verseText, words, referenceAudioUrl }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [speakingAll, setSpeakingAll] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [prevMistakes, setPrevMistakes] = useState([]);
  const [practiceMode, setPracticeMode] = useState('ai'); // 'ai' | 'guided'
  const [guidedWords, setGuidedWords] = useState(null); // subset of words for focused repeat
  const [userAudioUrl, setUserAudioUrl] = useState(null);
  const [speakingSaid, setSpeakingSaid] = useState(null);
  const userAudioRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const slowRef = useRef(null);
  const autoSpeakRef = useRef(false);
  const recognitionRef = useRef(null);
  const browserTranscriptRef = useRef('');
  const recognitionSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!open) {
      setRecording(false); setFeedback(null); setError(''); setBusy(false);
      setAttemptCount(0); setPrevMistakes([]); setSpeakingIdx(null); setSpeakingAll(false);
      setGuidedWords(null);
      if (userAudioRef.current) { URL.revokeObjectURL(userAudioRef.current); userAudioRef.current = null; }
      setUserAudioUrl(null);
      setSpeakingSaid(null);
      autoSpeakRef.current = false;
    }
  }, [open]);

  const buildPrompt = (transcript) => {
    const list = words.map((w, i) => `${i + 1}. ${w.arabic}`).join('\n');
    let prev = '';
    if (prevMistakes.length > 0) {
      prev = `\n\nاہم: یہ صارف کی ${attemptCount}وی کوشش ہے۔ پچھلی کوششوں میں انہی غلطیوں کو دہرایا ہے:\n${prevMistakes.map(m => `- لفظ ${m.wordIndex} (${words[m.wordIndex-1]?.arabic || ''}): ${m.issue}`).join('\n')}\nچونکہ صارف وہی غلطی دہرا رہا ہے، اب مزید خاص رہنمائی دیں — بالکل وہ جگہ بتائیں جہاں سے آواز نکالنی ہے۔\n`;
    }
    return `آپ ایک شفیق، نرم خو اور ماہر استاد ہیں جو سامنے بیٹھ کر تجوید اور تلاوت سکھا رہے ہیں۔ آپ کا اندازِ بیان دوستانہ، حوصلہ افزا اور مرحلہ وار ہے۔

آیت ${verseKey} کا اصل عربی متن:\n${verseText}\n\nالفاظ ترتیب وار (انڈیکس: عربی):\n${list}\n\nشاگرد نے یہ آیت تلاوت کی؛ اسپیچ-ٹو-ٹیکسٹ انجن نے اس کی تلاوت کو یوں ٹرانسکرائب کیا ہے:\n${transcript}\n${prev}

آپ کو دو بنیادی کام کرنا ہیں:

=== پہلا: آیت کی درستگی کی جانچ (verseAccuracy) ===
شاگرد کی تلاوت کو اصل آیت سے موازن کریں اور چیک کریں:
1. کیا شاگرد نے کوئی لفظ چھوڑ دیا ہے؟ (missingWords) — ان الفاظ کی عربی شکل درج کریں
2. کیا شاگرد نے کوئی اضافی لفظ کہہ دیا جو آیت میں نہیں ہے؟ (extraWords) — ان الفاظ کی عربی شکل درج کریں
3. کیا کسی لفظ کا تلفظ غلط ہو گیا؟ (mispronouncedWords) — ہر ایسے لفظ کے لیے wordIndex، expected (اصل لفظ)، اور said (جو شاگرد نے کہا) درج کریں
4. isComplete: اگر تمام الفاظ درست اور مکمل پڑھے گئے ہیں تو true، ورنہ false

=== دوسرا: تجوید کی جانچ (mistakes) ===
ہر غلطی کے لیے tajweedCategory میں سے مناسب منتخب کریں:
- makharij: مخرج کی غلطی (حلق، زبان، ہونٹ، نکسہ)
- sifat: صفاتِ حروف کی غلطی (شدت/نرمی، إطباق/انفتاح، استعلاء/استفال)
- noon_sakinah: نون ساکنہ یا تنوین کے احکام (إظهار، إدغام، إقلاب، إخفاء)
- meem_sakinah: میم ساکنہ کے احکام
- madd: مدّ کے احکام (طبعی، متصل، منفصل، عارض، لازم) — مد کم یا زیادہ ہو
- qalqalah: قلقلہ کے حروف (ق ط ب ج د) — قلقلہ نہ ہو یا غلط
- idgham: إدغام کی غلطی
- waqf: وقف کی غلطی — غلط جگہ رکنا
- tafkheem: تفخیم/ترقیق کی غلطی — موٹے حرف کو باریک یا باریک کو موٹا پڑھنا
  تفخیم والے حروف: ق، ط، ض، ص، ظ، غ، خ (موٹے)
  ترقیق والے حروف: باقی سب (باریک)، خاص طور پر ک، ت، د، س، ل، ر (غیر مفتوح)
- other: کوئی اور تجویدی غلطی

ہر غلطی کے لیے یہ فراہم کریں:
- wordIndex (1-بیسڈ): کس لفظ پر غلطی ہوئی
- issue (اردو): استاد کے انداز میں، کیا غلط ہوا (مثلاً "آپ نے 'ق' کو باریک پڑھ دیا، اسے موٹا ادا کرنا تھا")
- correction (اردو): درست تلفظ
- tip (اردو): بالکل کیسے آواز نکالیں، استاد کے انداز میں (مثلاً "ذرا میرے ساتھ دہرائیں — حلق کے پچھلے حصے سے موٹا ادا کریں، زبان کے وسط کو تالو سے دبائیں")
- makhraj (اردو): مخصوص مخرج، مثلاً "حلق کا پچھلا حصہ"، "زبان کی نوک"، "ہونٹ"، "نکسہ"
- tajweedCategory: اوپر دی گئی فہرست سے مناسب قسم

summary میں ایک استاد کی طرح بات کریں — پہلے حوصلہ افزائی کریں، پھر مختصراً بتائیں کہ کیا بہتری کی گنجائش ہے۔ اگر تلاوت درست ہے تو خالی mistakes array، overallScore 100، verseAccuracy.isComplete true، اور summary میں تعریف کریں۔ صرف JSON میں جواب دیں۔`;
  };

  const startRecording = async () => {
    setError(''); setFeedback(null);
    browserTranscriptRef.current = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (userAudioRef.current) URL.revokeObjectURL(userAudioRef.current);
        userAudioRef.current = URL.createObjectURL(blob);
        setUserAudioUrl(userAudioRef.current);
        processRecording();
      };
      mediaRef.current = mr;
      mr.start();

      // Start browser-based recognition in parallel (fallback when AI is unavailable).
      if (recognitionSupported) {
        const recognition = createRecognition('ar-SA');
        if (recognition) {
          recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                browserTranscriptRef.current += event.results[i][0].transcript + ' ';
              }
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        }
      }

      setRecording(true);
    } catch {
      setError('مائیکروفون تک رسائی نہیں ہوئی۔ براءز کی اجازت دیں۔');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    setRecording(false);
  };

  const processRecording = async () => {
    setBusy(true);
    try {
      // Speech-to-text runs in the browser (Web Speech API); the AI only reviews the transcript.
      const transcript = browserTranscriptRef.current.trim();
      if (!transcript) throw new Error('no-transcript');

      const res = await backend.ai.invoke({
        prompt: buildPrompt(transcript),
        response_json_schema: feedbackSchema
      });
      const a = res && res.mistakes ? res : res && res.output ? res.output : res;
      setFeedback(a);
      setAttemptCount((c) => c + 1);
      if (a && typeof a.overallScore === 'number') recordPractice(verseKey, a.overallScore);
      if (a && a.mistakes) setPrevMistakes((p) => [...p, ...a.mistakes]);
      saveLearningRecords(backend, verseKey, a);
      autoSpeakRef.current = true;
    } catch {
      // AI unavailable — fall back to browser-based speech analysis.
      const expectedWords = words.map(w => w.arabic);
      const transcript = browserTranscriptRef.current.trim();
      if (transcript) {
        const browserFeedback = analyzeRecitation(transcript, expectedWords);
        setFeedback(browserFeedback);
        setAttemptCount((c) => c + 1);
        recordPractice(verseKey, browserFeedback.overallScore);
        saveLearningRecords(backend, verseKey, browserFeedback);
        autoSpeakRef.current = true;
      } else {
        setError('تجزیہ ناکام ہو گیا۔ دوبارہ کوشش کریں۔');
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (feedback && autoSpeakRef.current) {
      autoSpeakRef.current = false;
      speakAllFeedback();
    }
  }, [feedback]);

  const speakAllFeedback = () => {
    if (!feedback) return;
    let text = feedback.summary || '';
    const acc = feedback.verseAccuracy;
    if (acc) {
      if (acc.missingWords && acc.missingWords.length) text += ` آپ نے یہ الفاظ چھوڑ دیے: ${acc.missingWords.join('، ')}.`;
      if (acc.extraWords && acc.extraWords.length) text += ` آپ نے یہ اضافی الفاظ کہہ دیے: ${acc.extraWords.join('، ')}.`;
    }
    if (feedback.mistakes && feedback.mistakes.length > 0) {
      feedback.mistakes.forEach((m, i) => {
        text += ` غلطی نمبر ${i + 1}: ${m.issue}. درست: ${m.correction}. طریقہ: ${m.tip}. مخرج: ${m.makhraj}.`;
      });
    } else if (acc && acc.isComplete) {
      text += ' تلاوت درست اور مکمل ہے۔';
    }
    setSpeakingAll(true);
    speakUrdu(text, () => setSpeakingAll(false));
  };

  const speakTip = (text, idx) => {
    setSpeakingIdx(idx);
    speakUrdu(text, () => setSpeakingIdx(null));
  };

  const playWordCorrect = (i) => {
    const w = words[i - 1];
    if (w && w.audioUrl) new Audio(w.audioUrl).play();
  };

  const playSlow = () => {
    if (!referenceAudioUrl) return;
    const a = slowRef.current || (slowRef.current = new Audio());
    a.src = referenceAudioUrl;
    a.playbackRate = 0.7;
    a.play().catch(() => {});
  };

  const playUserAudio = () => { if (userAudioUrl) { const a = new Audio(userAudioUrl); a.play().catch(() => {}); } };
  const speakSaid = (said, expected, idx) => { setSpeakingSaid(idx); speakSaidWord(said, expected, () => setSpeakingSaid(null)); };

  // Build a focused subset of only the problem words (mispronounced, missing,
  // or tajweed-flagged) so the user can repeat just those, or the full verse.
  const repeatProblemWords = () => {
    if (!feedback) return;
    const indices = new Set();
    const acc = feedback.verseAccuracy || {};
    (acc.mispronouncedWords || []).forEach((mw) => { if (mw.wordIndex >= 1) indices.add(mw.wordIndex - 1); });
    (feedback.mistakes || []).forEach((m) => { if (m.wordIndex >= 1) indices.add(m.wordIndex - 1); });
    (acc.missingWords || []).forEach((ar) => {
      const idx = words.findIndex((w) => w.arabic === ar);
      if (idx >= 0) indices.add(idx);
    });
    const subset = [...indices].sort((a, b) => a - b).map((i) => words[i]).filter(Boolean);
    if (subset.length) { setGuidedWords(subset); setPracticeMode('guided'); }
  };

  const repeatFullVerse = () => {
    setGuidedWords(null);
    setPracticeMode('guided');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">AI تلاوت پریکٹس</DialogTitle>
        <DialogDescription className="sr-only">آیت کی تلاوت ریکارڈ کر کے تجوید اور درستگی کی جانچ کریں</DialogDescription>
        <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-2 border-b border-border flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            <Gauge className="w-3.5 h-3.5" /> AI تلاوت پریکٹس
          </span>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-4 py-4">
          <div className="mb-4">
            <VerseBox arabic={verseText} ayahNumber={verseKey.split(':')[1]} words={words?.length ? words : null} />
          </div>
          {/* Mode toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPracticeMode('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${practiceMode === 'ai' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}
              dir="rtl"
            >
              <Mic className="w-3.5 h-3.5" /> AI تجزیہ
            </button>
            <button
              onClick={() => { setGuidedWords(null); setPracticeMode('guided'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${practiceMode === 'guided' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}
              dir="rtl"
            >
              <Headphones className="w-3.5 h-3.5" /> قائد موڈ
            </button>
          </div>

          {practiceMode === 'guided' ? (
            <GuidedPractice words={guidedWords || words} verseKey={verseKey} />
          ) : (
            <>
          <p className="text-xs text-muted-foreground mb-3 text-center" dir="rtl">
            نیچے بٹن دبائیں، آیت کی تلاوت کریں — AI سن کر آواز میں بتائے گا کہ کون سے الفاظ چھوڑ دیے، کیا تجویدی غلطی ہوئی، اور اسے کیسے درست کرنا ہے۔
          </p>

          {attemptCount > 0 && (
            <p className="text-center text-[10px] text-muted-foreground mb-2" dir="rtl">کوشش نمبر {attemptCount}</p>
          )}

          <div className="flex justify-center">
            {recording ? (
              <button onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 rounded-full bg-destructive text-destructive-foreground font-medium shadow-sm">
                <Square className="w-4 h-4 fill-current" /> رکائیں
              </button>
            ) : (
              <button onClick={startRecording} disabled={busy} className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-sm disabled:opacity-60">
                <Mic className="w-4 h-4" /> {feedback ? 'دوبارہ تلاوت کریں' : 'تلاوت ریکارڈ کریں'}
              </button>
            )}
          </div>

          {recording && <p className="text-center text-xs text-destructive mt-2 animate-pulse">ریکارڈ ہو رہا ہے…</p>}
          {busy && (
            <div className="flex flex-col items-center gap-1 mt-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground" dir="rtl">آواز کا تجزیہ ہو رہا ہے…</p>
            </div>
          )}
          {error && <p className="text-center text-xs text-destructive mt-2" dir="rtl">{error}</p>}

          {feedback && (
            <PracticeFeedback
              feedback={feedback}
              words={words}
              verseKey={verseKey}
              speakingIdx={speakingIdx}
              speakingAll={speakingAll}
              onSpeakTip={speakTip}
              onSpeakAll={speakAllFeedback}
              onPlayWordCorrect={playWordCorrect}
              onPlaySlow={playSlow}
              needsSlowAvailable={!!referenceAudioUrl}
              onRepeatProblem={repeatProblemWords}
              onRepeatFull={repeatFullVerse}
              userAudioUrl={userAudioUrl}
              onPlayUserAudio={playUserAudio}
              onSpeakSaid={speakSaid}
              speakingSaid={speakingSaid}
            />
          )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────── components/quran/VocabLesson.jsx ─────────
// Renders a single Quranic vocabulary lesson in the table/grid layout
// matching the "Aasan Quranic Arabic" reference pages.
// The focus particle is highlighted in red; each row shows:
// Word | Quranic Sentence | Translation (blank for self-practice).
export function VocabLesson({ lesson, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [revealed, setRevealed] = useState({});

  if (!lesson) return null;

  return (
    <div className="mb-4">
      {/* Collapsible header with the focus particle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-primary/40 bg-card hover:border-primary/70 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 text-right">
          <span className="font-quran text-2xl text-red-400 shrink-0" dir="rtl">{lesson.particle}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground font-urdu truncate" dir="rtl">{lesson.particleUr}</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <OrnateFrame className="mt-2 rounded-xl border-2 border-primary/50 bg-card">
          <div className="p-4">
            {/* Grammar rule */}
            <p className="text-sm font-urdu leading-relaxed text-foreground/80 mb-4 text-right" dir="rtl">
              {lesson.rule}
            </p>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-1 mb-2 border-b-2 border-primary/40 pb-2">
              <span className="col-span-3 text-center text-xs font-semibold text-foreground" dir="rtl">لفظ</span>
              <span className="col-span-5 text-center text-xs font-semibold text-foreground" dir="rtl">قرآنی جملہ</span>
              <span className="col-span-4 text-center text-xs font-semibold text-foreground" dir="rtl">ترجمہ</span>
            </div>

            {/* Example rows */}
            <div className="space-y-1">
              {lesson.examples.map((ex, i) => {
                const isRevealed = revealed[i];
                return (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-1 py-2 border-b border-primary/20 items-center hover:bg-secondary/50 rounded cursor-pointer"
                    onClick={() => setRevealed(prev => ({ ...prev, [i]: !prev[i] }))}
                  >
                    <span className="col-span-3 text-center font-quran text-lg text-foreground" dir="rtl">{ex.word}</span>
                    <span className="col-span-5 text-center font-quran text-lg" dir="rtl">
                      {/* Highlight the focus particle in red within the sentence */}
                      {ex.sentence.split(' ').map((w, j) => {
                        const isParticle = w === lesson.particle || w.replace(/^[وَفَبِ]/, '') === lesson.particle;
                        return (
                          <span key={j} className={isParticle ? 'text-red-400 font-semibold' : 'text-foreground'}>
                            {w}{' '}
                          </span>
                        );
                      })}
                    </span>
                    <span className="col-span-4 text-center text-sm font-urdu text-foreground/70" dir="rtl">
                      {isRevealed ? ex.translation : '———'}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground mt-3 text-center font-urdu" dir="rtl">
              ترجمہ دیکھنے کے لیے قطار پر کلک کریں
            </p>
          </div>
        </OrnateFrame>
      )}
    </div>
  );
}

// ───────── components/qaida/QaidaLesson.jsx ─────────
export function QaidaLesson({ lesson, onClose }) {
  const [activeWord, setActiveWord] = useState(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null); // { correct: boolean, said: string }
  const recognitionRef = useRef(null);
  const recognitionSupported = isSpeechRecognitionSupported();

  const playWord = (word) => {
    setActiveWord(word);
    speakArabic(word, () => setActiveWord(null));
  };

  const startPractice = () => {
    setResult(null);
    if (!recognitionSupported) return;
    const recognition = createRecognition('ar-SA');
    if (!recognition) return;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const said = event.results[i][0].transcript.trim();
          const expected = lesson.rows.flat().find(w => normalizeArabic(w) === normalizeArabic(said)) ||
                           lesson.rows.flat().find(w => normalizeArabic(w).includes(normalizeArabic(said)) || normalizeArabic(said).includes(normalizeArabic(w)));
          setResult({ correct: !!expected, said, expected: expected || '—' });
        }
      }
    };
    recognition.onerror = () => setResult({ correct: false, said: 'غلطی', error: true });
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  };

  const stopPractice = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    setRecording(false);
  };

  return (
    <div className="rounded-2xl border-2 border-primary/50 bg-gradient-to-b from-secondary/80 to-card/60 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            سبق {lesson.id}
          </span>
          <span className="text-sm font-semibold text-foreground font-urdu" dir="rtl">{lesson.title}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
          واپس
        </button>
      </div>

      {/* Instruction */}
      <div className="px-4 pb-3">
        <p className="text-xs text-muted-foreground font-urdu text-center" dir="rtl">{lesson.instruction}</p>
      </div>

      {/* Quranic Word Meanings — professional reference table */}
      {lesson.meanings && lesson.meanings.length > 0 && (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-primary/40 bg-card/50 overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-b from-[#e8d4b0] to-[#d9bd8a] border-b border-primary/40">
              <BookOpen className="w-3.5 h-3.5 text-[#5a4427]" />
              <span className="text-xs font-semibold text-[#3e2a1d] font-urdu" dir="rtl">کلمات و معانی</span>
            </div>
            <div className="divide-y divide-[#a8855a]/20">
              {lesson.meanings.map((m, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2" dir="rtl">
                  <button
                    onClick={() => playWord(m.arabic)}
                    className="shrink-0 font-quran text-xl text-foreground hover:text-primary transition-colors leading-loose"
                    style={{ wordSpacing: '0.2em', lineHeight: '2.4' }}
                    title="سنیں"
                  >
                    {m.arabic}
                  </button>
                  <div className="flex-1 text-right min-w-0">
                    <p className="text-sm font-semibold text-foreground font-urdu leading-snug">{m.urdu}</p>
                    {m.extra && <p className="text-[11px] text-muted-foreground font-urdu leading-snug mt-0.5">{m.extra}</p>}
                  </div>
                  <Volume2 className="shrink-0 w-3.5 h-3.5 text-muted-foreground/60 mt-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Practice toggle */}
      <div className="px-4 pb-3 flex items-center justify-center gap-2">
        <button
          onClick={() => setPracticeMode(!practiceMode)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${practiceMode ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}
        >
          <Mic className="w-3.5 h-3.5" />
          {practiceMode ? 'پریکٹس موڈ آن' : 'پریکٹس موڈ'}
        </button>
      </div>

      {/* Practice controls */}
      {practiceMode && (
        <div className="px-4 pb-3 flex flex-col items-center gap-2">
          <p className="text-[10px] text-muted-foreground text-center font-urdu" dir="rtl">
            بٹن دبائیں اور سامنے والا لفظ بولیں — آپ کی آواز کی جانچ ہو گی۔
          </p>
          {recording ? (
            <button onClick={stopPractice} className="flex items-center gap-2 px-5 py-2 rounded-full bg-destructive text-destructive-foreground text-sm font-medium">
              <Square className="w-4 h-4 fill-current" /> رکائیں
            </button>
          ) : (
            <button onClick={startPractice} disabled={!recognitionSupported} className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              <Mic className="w-4 h-4" /> بولنا شروع
            </button>
          )}
          {!recognitionSupported && (
            <p className="text-[10px] text-destructive text-center font-urdu" dir="rtl">آپ کا براؤزر اسپیچ ریکگنیشن سپورٹ نہیں کرتا۔</p>
          )}
          {result && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${result.correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
              {result.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span dir="rtl">{result.correct ? 'درست! ✓' : `غلط — آپ نے کہا: ${result.said}`}</span>
            </div>
          )}
        </div>
      )}

      {/* Words grid */}
      <div className="px-4 pb-4 space-y-2">
        {lesson.rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-1.5" dir="rtl">
            {row.map((word, wi) => (
              <button
                key={`${ri}-${wi}`}
                onClick={() => playWord(word)}
                className={`flex items-center justify-center rounded-lg border p-2 transition-all active:scale-95 ${activeWord === word ? 'bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border-primary text-white shadow-md' : 'bg-card border-primary/30 text-foreground hover:border-primary/60'}`}
              >
                <span className="font-quran text-xl" dir="rtl" style={{ wordSpacing: '0.2em', lineHeight: '2.4' }}>{word}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Play all */}
      <div className="px-4 pb-4 flex justify-center">
        <button
          onClick={async () => {
            const allWords = lesson.rows.flat();
            for (const w of allWords) {
              setActiveWord(w);
              await new Promise(resolve => speakArabic(w, resolve));
            }
            setActiveWord(null);
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-xs font-semibold text-foreground"
        >
          <Volume2 className="w-3.5 h-3.5" /> سبق پورا سنائیں
        </button>
      </div>
    </div>
  );
}

// ───────── components/tajweed/FullAyahPractice.jsx ─────────
const circle = 'w-9 h-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground border border-border active:scale-95 transition-transform';

const PRESET_VERSES = [
  { label: 'الفاتحة — آیت ۱', surah: 1, ayah: 1 },
  { label: 'الفاتحة — آیت ۵', surah: 1, ayah: 5 },
  { label: 'الإخلاص', surah: 112, ayah: 1 },
  { label: 'الفلق — آیت ۱', surah: 113, ayah: 1 },
  { label: 'الناس — آیت ۱', surah: 114, ayah: 1 },
];

export function FullAyahPractice() {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [surahs, setSurahs] = useState([]);
  const [words, setWords] = useState([]);
  const [verseText, setVerseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [playingWrong, setPlayingWrong] = useState(false);
  const [activeWrongIdx, setActiveWrongIdx] = useState(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const recognitionSupported = isSpeechRecognitionSupported();
  const verseKey = `${surah}:${ayah}`;

  useEffect(() => {
    quranApi.getSurahs().then(data => setSurahs(data || [])).catch(() => {});
  }, []);

  const fetchVerse = useCallback(async () => {
    setLoading(true); setWords([]); setVerseText(''); setAnalysis(null); setRecording(false);
    try {
      const v = await quranComApi.getVerseWords(verseKey, 'text_uthmani,char_type_name,audio_url');
      const ws = (v.words || []).filter(w => w.char_type_name === 'word' && w.audio_url).map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url) }));
      setWords(ws); setVerseText(ws.map(w => w.arabic).join(' '));
    } catch {}
    setLoading(false);
  }, [verseKey]);

  useEffect(() => { fetchVerse(); }, [fetchVerse]);

  const stopRecognition = () => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; } };
  useEffect(() => () => { stopRecognition(); if (audioRef.current) audioRef.current.pause(); }, []);

  const startRecording = () => {
    if (!recognitionSupported || !words.length) return;
    stopRecognition(); if (audioRef.current) audioRef.current.pause();
    setRecording(true); setAnalysis(null);
    const recognition = createRecognition('ar-SA');
    if (!recognition) { setRecording(false); return; }
    let finalTranscript = '';
    recognition.onresult = (event) => { for (let i = event.resultIndex; i < event.results.length; i++) { if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' '; } };
    recognition.onerror = () => { stopRecognition(); setRecording(false); };
    recognition.onend = () => { stopRecognition(); setRecording(false); if (finalTranscript.trim()) { setAnalysis(analyzeRecitation(finalTranscript, words.map(w => w.arabic))); } };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setRecording(false); }
    setTimeout(() => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } }, 15000);
  };

  const stopRecording = () => stopRecognition();
  const playWord = (i) => { const w = words[i]; if (!w?.audioUrl) return; const a = audioRef.current || (audioRef.current = new Audio()); a.src = w.audioUrl; a.play().catch(() => {}); };

  const playWrongWords = async () => {
    if (!analysis) return;
    const wrongIndices = analysis.verseAccuracy.mispronouncedWords.map(m => m.wordIndex - 1);
    if (analysis.verseAccuracy.missingIndices) wrongIndices.push(...analysis.verseAccuracy.missingIndices);
    if (wrongIndices.length === 0) return;
    setPlayingWrong(true);
    for (const idx of wrongIndices) {
      if (words[idx]?.audioUrl) {
        setActiveWrongIdx(idx);
        await new Promise(resolve => { const a = new Audio(words[idx].audioUrl); a.onended = resolve; a.onerror = resolve; a.play().catch(resolve); });
      }
    }
    setActiveWrongIdx(null); setPlayingWrong(false);
  };

  const getWordStatus = (i) => {
    if (!analysis) return { status: 'pending' };
    const mispronounced = analysis.verseAccuracy.mispronouncedWords.find(m => m.wordIndex === i + 1);
    if (mispronounced) return { status: 'wrong', said: mispronounced.said, expected: mispronounced.expected };
    if (analysis.verseAccuracy.missingIndices?.includes(i)) return { status: 'missing' };
    return { status: 'correct' };
  };

  const wrongCount = analysis?.verseAccuracy?.mispronouncedWords?.length || 0;
  const missingCount = analysis?.verseAccuracy?.missingIndices?.length || 0;
  const correctCount = words.length - wrongCount - missingCount;
  const score = analysis?.overallScore || 0;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/90 to-card/82 overflow-hidden animate-rise">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"><Sparkles className="w-3.5 h-3.5" /> مکمل آیت پریکٹس</span>
        <span className="text-[10px] text-muted-foreground" dir="rtl">AI خودکار جانچ</span>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <select value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah(1); }} className="h-9 px-3 rounded-full bg-card border border-border text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-primary/40" dir="rtl">
            {surahs.map(s => <option key={s.number} value={s.number}>سورة {s.name} ({s.numberOfAyahs})</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => setAyah(a => Math.max(1, a - 1))} className={circle} aria-label="پچھلی آیت"><ChevronRight className="w-4 h-4" /></button>
            <input type="number" min="1" value={ayah} onChange={(e) => setAyah(Math.max(1, Number(e.target.value)))} className="w-14 h-9 px-2 rounded-full bg-card border border-border text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40" dir="rtl" />
            <button onClick={() => setAyah(a => a + 1)} className={circle} aria-label="اگلی آیت"><ChevronLeft className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_VERSES.map(v => <button key={`${v.surah}:${v.ayah}`} onClick={() => { setSurah(v.surah); setAyah(v.ayah); }} className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${surah === v.surah && ayah === v.ayah ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`} dir="rtl">{v.label}</button>)}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="rounded-xl bg-card/50 border border-border p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs text-muted-foreground" dir="rtl">آیت لوڈ ہو رہی ہے…</p></div>
          ) : verseText ? (
            <>
              <p className="font-arabic text-2xl text-center text-foreground leading-loose mb-3" dir="rtl" style={{ wordSpacing: '0.2em' }}>{verseText}</p>
              <p className="text-center text-[10px] text-muted-foreground mb-3" dir="rtl">لفظ پر کلک کریں — درست ادائیگی سنیں</p>
              <div className="flex flex-wrap justify-center gap-2">
                {words.map((w, i) => {
                  const st = getWordStatus(i);
                  let cls = 'border-transparent text-foreground hover:border-primary/40 hover:bg-secondary/50';
                  if (st.status === 'correct') cls = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
                  else if (st.status === 'wrong') cls = 'border-red-500/50 bg-red-500/10 text-red-400';
                  else if (st.status === 'missing') cls = 'border-amber-500/50 bg-amber-500/10 text-amber-400 opacity-60';
                  if (activeWrongIdx === i) cls = 'border-primary bg-primary/20 text-primary scale-105';
                  return (
                    <button key={i} onClick={() => playWord(i)} className={`group flex flex-col items-center px-2 py-1.5 rounded-lg border transition-all active:scale-95 ${cls}`}>
                      <p className="font-arabic text-xl" dir="rtl">{w.arabic}</p>
                      <span className="flex items-center gap-0.5 mt-0.5 h-4">
                        {st.status === 'correct' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {st.status === 'wrong' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        {st.status === 'missing' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                        {st.status === 'pending' && <Volume2 className="w-3 h-3 text-muted-foreground/40" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : <p className="text-center text-sm text-muted-foreground py-8" dir="rtl">آیت دستیاب نہیں۔</p>}
        </div>
      </div>
      {recording && (
        <div className="px-4 pb-2"><div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center"><p className="text-xs font-urdu text-red-400 flex items-center justify-center gap-1.5" dir="rtl"><Mic className="w-4 h-4 animate-pulse" /> سن رہا ہے… پوری آیت پڑھیں</p></div></div>
      )}
      {analysis && !recording && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-gradient-to-br from-secondary/80 to-card/60 border border-border p-4">
            <div className="text-center mb-3"><p className="text-3xl font-bold text-primary">{score}%</p><p className="text-sm font-urdu text-foreground/80 mt-1" dir="rtl">{correctCount} از {words.length} الفاظ درست</p></div>
            <div className="rounded-lg bg-accent/10 border border-accent/25 p-3 mb-3"><p className="text-sm font-urdu leading-relaxed text-foreground/90 text-center" dir="rtl">{analysis.summary}</p></div>
            {wrongCount > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5" dir="rtl"><XCircle className="w-3.5 h-3.5" /> غلط الفاظ — یوں پڑھیں:</p>
                <div className="space-y-2">
                  {analysis.verseAccuracy.mispronouncedWords.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <button onClick={() => playWord(m.wordIndex - 1)} className="flex items-center gap-1.5 flex-1 min-w-0" dir="rtl">
                        <Volume2 className="w-4 h-4 text-red-400 shrink-0" />
                        <div className="text-right"><p className="font-arabic text-base text-red-400">{m.expected}</p><p className="text-[10px] text-muted-foreground" dir="rtl">آپ نے کہا: {m.said}</p></div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {missingCount > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5" dir="rtl"><AlertCircle className="w-3.5 h-3.5" /> یاد نہ رہنے والے الفاظ:</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.verseAccuracy.missingIndices?.map(idx => (
                    <button key={idx} onClick={() => playWord(idx)} className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400" dir="rtl"><Volume2 className="w-3 h-3" /><span className="font-arabic text-sm">{words[idx]?.arabic}</span></button>
                  ))}
                </div>
              </div>
            )}
            {score === 100 && <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center mb-3"><p className="text-sm font-urdu text-emerald-400" dir="rtl">ماشاءاللہ! تمام الفاظ درست پڑھے۔</p></div>}
          </div>
        </div>
      )}
      {verseText && !loading && (
        <div className="px-4 pb-4 flex items-center justify-center gap-2 flex-wrap">
          {!recording ? (
            <button onClick={startRecording} disabled={!recognitionSupported} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"><Mic className="w-4 h-4" /> {analysis ? 'دوبارہ پڑھیں' : 'مکمل آیت پڑھیں'}</button>
          ) : (
            <button onClick={stopRecording} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold active:scale-95 transition-transform"><Square className="w-4 h-4" /> رکائیں</button>
          )}
          {analysis && (wrongCount > 0 || missingCount > 0) && !recording && (
            <button onClick={playWrongWords} disabled={playingWrong} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-secondary border border-border text-foreground text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50" dir="rtl">{playingWrong ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />} غلط الفاظ دہرائیں</button>
          )}
        </div>
      )}
      {!recognitionSupported && verseText && !loading && (
        <div className="px-4 pb-4"><p className="text-[10px] text-center text-amber-500 font-urdu" dir="rtl">آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں — آڈیو سن کر مشق کریں۔</p></div>
      )}
    </div>
  );
}

// ───────── components/tajweed/RecitationCheck.jsx ─────────
// Pronunciation detection for the Tajweed section: the user recites a verse,
// browser speech recognition transcribes it, and analyzeRecitation compares
// against the expected words. Wrong words are highlighted and each gets a
// "play correct recitation" suggestion using the word's reference audio.
export function RecitationCheck({ words, verseKey }) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const supported = isSpeechRecognitionSupported();

  useEffect(() => () => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } }, []);
  useEffect(() => { // reset when verse changes
    setResult(null); setError(''); setListening(false); setBusy(false); transcriptRef.current = '';
  }, [verseKey]);

  if (!words?.length) return null;

  const start = () => {
    setError(''); setResult(null); transcriptRef.current = '';
    if (!supported) { setError('آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں — Chrome استعمال کریں۔'); return; }
    const recognition = createRecognition('ar-SA');
    if (!recognition) { setError('اسپیک ریکگنیشن شروع نہیں ہوئی۔'); return; }
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcriptRef.current += event.results[i][0].transcript + ' ';
      }
    };
    recognition.onerror = () => {};
    recognition.onend = () => {
      setListening(false);
      const transcript = transcriptRef.current.trim();
      if (transcript) {
        setBusy(true);
        const res = analyzeRecitation(transcript, words.map((w) => w.arabic));
        setResult(res);
        setBusy(false);
      } else {
        setError('کوئی آواز سنائی نہیں دی — براہ کرم آیت پڑھیں۔');
      }
    };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { setError('اسپیک ریکگنیشن شروع نہیں ہوئی۔'); }
  };

  const stop = () => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } };

  const playCorrect = (i) => { const w = words[i]; if (w?.audioUrl) new Audio(w.audioUrl).play().catch(() => {}); };

  const reset = () => { setResult(null); setError(''); transcriptRef.current = ''; };

  // Indices of words that were mispronounced or skipped
  const wrongIndices = new Set();
  if (result) {
    (result.verseAccuracy?.missingIndices || []).forEach((i) => wrongIndices.add(i));
    (result.verseAccuracy?.mispronouncedWords || []).forEach((mw) => { if (mw.wordIndex >= 1) wrongIndices.add(mw.wordIndex - 1); });
  }
  const hasResult = !!result;
  const extraWords = result?.verseAccuracy?.extraWords || [];
  const allCorrect = hasResult && wrongIndices.size === 0 && extraWords.length === 0;

  return (
    <div className="rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-secondary/80 to-card/60 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          <Activity className="w-3.5 h-3.5" /> تلاوت کی خودکار جانچ
        </span>
        {hasResult && (
          <button onClick={reset} className="text-muted-foreground hover:text-foreground" aria-label="reset"><RotateCcw className="w-3.5 h-3.5" /></button>
        )}
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-center text-muted-foreground mb-3" dir="rtl">
          مائیکروفون بٹن دبائیں اور آیت تلاوت کریں — app آواز سن کر غلط الفاظ کو نمایاں کرے گا اور درست ادائیگی تجویز کرے گا۔
        </p>

        {/* Highlighted verse words */}
        <div className="rounded-xl bg-card/50 border border-primary/30 p-4 mb-3">
          <div className="flex flex-wrap justify-center gap-2" dir="rtl">
            {words.map((w, i) => {
              const isWrong = wrongIndices.has(i);
              const isCorrect = hasResult && !isWrong;
              let cls = 'border-transparent text-foreground';
              if (isWrong) cls = 'border-red-400 bg-red-500/10 text-red-400';
              else if (isCorrect) cls = 'border-emerald-400 bg-emerald-500/10 text-emerald-400';
              return (
                <button key={i} onClick={() => playCorrect(i)} className={`group flex flex-col items-center px-2 py-1.5 rounded-lg border transition-all active:scale-95 ${cls}`}>
                  <p className="font-arabic text-xl" dir="rtl">{w.arabic}</p>
                  <span className="flex items-center gap-0.5 mt-0.5 h-4">
                    {isWrong && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {!hasResult && <Volume2 className="w-3 h-3 text-muted-foreground/40" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mic control */}
        <div className="flex justify-center mb-2">
          {listening ? (
            <button onClick={stop} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold">
              <Square className="w-4 h-4 fill-current" /> رکائیں
            </button>
          ) : (
            <button onClick={start} disabled={busy} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
              <Mic className="w-4 h-4" /> {hasResult ? 'دوبارہ تلاوت کریں' : 'تلاوت ریکارڈ کریں'}
            </button>
          )}
        </div>
        {listening && <p className="text-center text-xs text-destructive animate-pulse" dir="rtl">سن رہا ہے… آیت پڑھیں</p>}
        {busy && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground" dir="rtl">جانچ ہو رہی ہے…</p>
          </div>
        )}
        {error && <p className="text-center text-xs text-destructive mt-2" dir="rtl">{error}</p>}

        {/* Result: score + per-word suggestions */}
        {hasResult && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card p-3">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 border-primary/40">
                <span className="text-base font-bold text-primary">{result.overallScore || 0}</span>
              </div>
              <p className="text-xs text-foreground/90 flex-1 font-urdu leading-relaxed" dir="rtl">{result.summary || '—'}</p>
            </div>

            {wrongIndices.size > 0 && (
              <div className="rounded-xl border-2 border-red-500/30 bg-card overflow-hidden">
                <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-semibold text-red-400" dir="rtl">غلط الفاظ اور اصلاح</span>
                </div>
                <div className="p-3 space-y-2">
                  {[...wrongIndices].sort((a, b) => a - b).map((i) => {
                    const w = words[i];
                    if (!w) return null;
                    const mw = (result.verseAccuracy?.mispronouncedWords || []).find((m) => m.wordIndex === i + 1);
                    return (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-arabic text-lg text-foreground" dir="rtl">{w.arabic}</p>
                            {mw && <p className="text-[11px] text-destructive font-urdu" dir="rtl">آپ نے کہا: {mw.said}</p>}
                          </div>
                          <p className="text-[11px] text-foreground/70 font-urdu" dir="rtl">
                            {mw ? 'تلفظ غلط ہے — درست ادائیگی سن کر دہرائیں۔' : 'یہ لفظ چھوڑ دیا — درست ادائیگی سن کر دہرائیں۔'}
                          </p>
                        </div>
                        <button onClick={() => playCorrect(i)} className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-full px-2.5 py-1 shrink-0" dir="rtl">
                          <Volume2 className="w-3 h-3" /> درست ادائیگی
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {extraWords.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-400" dir="rtl">اضافی الفاظ کہہ دیے:</p>
                  <p className="font-arabic text-base text-foreground mt-1" dir="rtl">{extraWords.join(' • ')}</p>
                </div>
              </div>
            )}

            {allCorrect && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-emerald-400 font-urdu" dir="rtl">ماشاءاللہ! تمام الفاظ درست پڑھے۔</p>
              </div>
            )}
          </div>
        )}

        {!supported && !hasResult && (
          <p className="text-[10px] text-center text-amber-400 font-urdu mt-2" dir="rtl">
            آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں — اس سہولت کے لیے Chrome استعمال کریں۔
          </p>
        )}
      </div>
    </div>
  );
}

// ───────── components/tajweed/TajweedPractice.jsx ─────────
const RECITERS = [
  { id: 'ar.alafasy', name: 'العفاسی' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط' },
  { id: 'ar.abdurrahmaansudais', name: 'السدیث' },
  { id: 'ar.mahermuaiqly', name: 'مہر المعیقلی' },
];

const circle_TajweedPractice = 'w-9 h-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground border border-border active:scale-95 transition-transform shrink-0';

export function TajweedPractice() {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [surahs, setSurahs] = useState([]);
  const [words, setWords] = useState([]);
  const [verseText, setVerseText] = useState('');
  const [fullAudioUrl, setFullAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);
  const [activeWrongIdx, setActiveWrongIdx] = useState(null);
  const [playingWrong, setPlayingWrong] = useState(false);
  const [reciter, setReciter] = useState('ar.alafasy');
  const [repeat, setRepeat] = useState(false);
  const [userAudioUrl, setUserAudioUrl] = useState(null);
  const [speakingSaid, setSpeakingSaid] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const userAudioRef = useRef(null);
  const recognitionSupported = isSpeechRecognitionSupported();
  const verseKey = `${surah}:${ayah}`;

  useEffect(() => {
    quranApi.getSurahs().then(data => setSurahs(data || [])).catch(() => {});
  }, []);

  const fetchVerse = useCallback(async () => {
    setLoading(true); setWords([]); setVerseText(''); setAnalysis(null); setRecording(false); setFullAudioUrl(''); setActiveIdx(null); setLiveTranscript(''); setError('');
    if (userAudioRef.current) { URL.revokeObjectURL(userAudioRef.current); userAudioRef.current = null; }
    setUserAudioUrl(null);
    try {
      const v = await quranComApi.getVerseWords(verseKey, 'text_uthmani,char_type_name,audio_url');
      const ws = (v.words || []).filter(w => w.char_type_name === 'word' && w.audio_url).map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url) }));
      setWords(ws); setVerseText(ws.map(w => w.arabic).join(' '));
      const fd = await quranApi.getAyahEdition(verseKey, reciter);
      if (fd?.audio) setFullAudioUrl(fd.audio);
    } catch {}
    setLoading(false);
  }, [verseKey, reciter]);

  useEffect(() => { fetchVerse(); }, [fetchVerse]);

  // Auto-speak first mispronounced word after analysis
  useEffect(() => {
    if (analysis && analysis.verseAccuracy?.mispronouncedWords?.length > 0) {
      const mwords = analysis.verseAccuracy.mispronouncedWords;
      setSpeakingSaid('all');
      speakMispronouncedSummary(mwords, () => setSpeakingSaid(null));
    }
  }, [analysis]);

  const stopRecognition = () => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; } };
  const stopMedia = () => { if (mediaRef.current && mediaRef.current.state !== 'inactive') { try { mediaRef.current.stop(); } catch {} } };
  useEffect(() => () => { stopRecognition(); stopMedia(); if (audioRef.current) audioRef.current.pause(); if (userAudioRef.current) URL.revokeObjectURL(userAudioRef.current); }, []);

  const playWord = (i) => {
    const w = words[i]; if (!w?.audioUrl) return;
    const a = audioRef.current || (audioRef.current = new Audio());
    a.onended = () => setActiveIdx(null);
    a.src = w.audioUrl; setActiveIdx(i); a.play().catch(() => {});
  };

  const playFull = (slow = false) => {
    if (!fullAudioUrl) return;
    const a = audioRef.current || (audioRef.current = new Audio());
    a.onended = () => { if (repeat) { a.playbackRate = slow ? 0.7 : 1; a.play().catch(() => {}); } else setActiveIdx(null); };
    a.src = fullAudioUrl; a.playbackRate = slow ? 0.7 : 1; setActiveIdx(null); a.play().catch(() => {});
  };

  const playUserAudio = () => {
    if (!userAudioUrl) return;
    const a = new Audio(userAudioUrl);
    a.play().catch(() => {});
  };

  const speakSaid = (said, expected, idx) => {
    setSpeakingSaid(idx);
    speakSaidWord(said, expected, () => setSpeakingSaid(null));
  };

  const startRecording = async () => {
    if (!words.length) return;
    stopRecognition(); stopMedia(); if (audioRef.current) audioRef.current.pause();
    setAnalysis(null); setRecording(true); setError(''); setLiveTranscript('');
    if (userAudioRef.current) { URL.revokeObjectURL(userAudioRef.current); userAudioRef.current = null; }
    setUserAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        userAudioRef.current = URL.createObjectURL(blob);
        setUserAudioUrl(userAudioRef.current);
      };
      mediaRef.current = mr;
      mr.start();
    } catch {}

    if (recognitionSupported) {
      const recognition = createRecognition('ar-EG');
      if (recognition) {
        let finalTranscript = '';
        let recError = '';
        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
            else interim += event.results[i][0].transcript;
          }
          setLiveTranscript((finalTranscript + interim).trim());
        };
        recognition.onerror = (e) => { recError = e.error || 'error'; };
        recognition.onend = () => {
          stopRecognition(); setRecording(false); stopMedia(); setLiveTranscript('');
          const trimmed = finalTranscript.trim();
          if (trimmed) { setError(''); setAnalysis(analyzeRecitation(trimmed, words.map(w => w.arabic))); }
          else if (recError === 'not-allowed') setError('مائیکروفون کی اجازت نہیں دی گئی۔ براہ کرم اجازت دیں۔');
          else if (recError === 'no-speech') setError('براؤزر عربی پہچان نہیں سکا — آپ کی ریکارڈنگ محفوظ ہے۔ نیچے "میری آواز" دبائیں، اپنی تلاوت سنیں، اور درست آڈیو سے موازنہ کریں۔');
          else if (recError === 'audio-capture') setError('مائیکروفون سے آواز نہیں مل سکی۔ براہ کرم مائیکروفون کنیکٹ کریں۔');
          else if (recError) setError('آواز پہچاننے میں مسئلہ — آپ کی ریکارڈنگ محفوظ ہے۔ "میری آواز" سنیں اور درست سے موازنہ کریں۔');
          else setError('براؤزر عربی پہچان نہیں سکا — آپ کی ریکارڈنگ محفوظ ہے۔ نیچے "میری آواز" دبائیں اور درست آڈیو سے موازنہ کریں۔');
        };
        recognitionRef.current = recognition;
        try { recognition.start(); } catch {}
        setTimeout(() => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } }, 20000);
      } else {
        setTimeout(() => { setRecording(false); stopMedia(); setError('آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں۔'); }, 15000);
      }
    } else {
      setTimeout(() => { setRecording(false); stopMedia(); setError('آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں۔'); }, 15000);
    }
  };

  const stopRecording = () => { stopRecognition(); stopMedia(); setRecording(false); };

  const playWrongWords = async () => {
    if (!analysis) return;
    const wrongIndices = analysis.verseAccuracy.mispronouncedWords.map(m => m.wordIndex - 1);
    if (analysis.verseAccuracy.missingIndices) wrongIndices.push(...analysis.verseAccuracy.missingIndices);
    if (wrongIndices.length === 0) return;
    setPlayingWrong(true);
    for (const idx of wrongIndices) {
      if (words[idx]?.audioUrl) {
        setActiveWrongIdx(idx);
        await new Promise(resolve => { const a = new Audio(words[idx].audioUrl); a.onended = resolve; a.onerror = resolve; a.play().catch(resolve); });
      }
    }
    setActiveWrongIdx(null); setPlayingWrong(false);
  };

  const getWordStatus = (i) => {
    if (!analysis) return { status: 'pending' };
    const mispronounced = analysis.verseAccuracy.mispronouncedWords.find(m => m.wordIndex === i + 1);
    if (mispronounced) return { status: 'wrong', said: mispronounced.said, expected: mispronounced.expected };
    if (analysis.verseAccuracy.missingIndices?.includes(i)) return { status: 'missing' };
    return { status: 'correct' };
  };

  const wrongCount = analysis?.verseAccuracy?.mispronouncedWords?.length || 0;
  const missingCount = analysis?.verseAccuracy?.missingIndices?.length || 0;
  const correctCount = words.length - wrongCount - missingCount;
  const score = analysis?.overallScore || 0;

  const nextAyah = () => setAyah(a => a + 1);
  const prevAyah = () => setAyah(a => Math.max(1, a - 1));

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/90 to-card/82 overflow-hidden animate-rise">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"><Sparkles className="w-3.5 h-3.5" /> تجوید پریکٹس</span>
        <select value={reciter} onChange={(e) => setReciter(e.target.value)} className="h-8 px-2 rounded-full bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-accent/40" dir="rtl">
          {RECITERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* TOP: Ayah selection */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <select value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah(1); }} className="h-9 px-3 rounded-full bg-card border border-border text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary/40" dir="rtl">
            {surahs.map(s => <option key={s.number} value={s.number}>سورة {s.name} ({s.numberOfAyahs})</option>)}
          </select>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevAyah} className={circle_TajweedPractice} aria-label="پچھلی آیت"><ChevronRight className="w-4 h-4" /></button>
            <input type="number" min="1" value={ayah} onChange={(e) => setAyah(Math.max(1, Number(e.target.value)))} className="w-14 h-9 px-2 rounded-full bg-card border border-border text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40" dir="rtl" />
            <button onClick={nextAyah} className={circle_TajweedPractice} aria-label="اگلی آیت"><ChevronLeft className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* MIDDLE: Verse display */}
      <div className="px-4 pb-3">
        <div className="rounded-xl bg-card/50 border border-border p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs text-muted-foreground" dir="rtl">آیت لوڈ ہو رہی ہے…</p></div>
          ) : verseText ? (
            <>
              <p className="font-arabic text-2xl text-center text-foreground leading-loose mb-3" dir="rtl" style={{ wordSpacing: '0.2em' }}>{verseText}</p>
              <p className="text-center text-[10px] text-muted-foreground mb-3" dir="rtl">لفظ پر کلک کریں — درست ادائیگی سنیں</p>
              <div className="flex flex-wrap justify-center gap-2">
                {words.map((w, i) => {
                  const st = getWordStatus(i);
                  let cls = 'border-transparent text-foreground hover:border-primary/40 hover:bg-secondary/50';
                  if (st.status === 'correct') cls = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
                  else if (st.status === 'wrong') cls = 'border-red-500/50 bg-red-500/10 text-red-400';
                  else if (st.status === 'missing') cls = 'border-amber-500/50 bg-amber-500/10 text-amber-400 opacity-60';
                  if (activeWrongIdx === i) cls = 'border-primary bg-primary/20 text-primary scale-105';
                  if (activeIdx === i) cls = 'border-primary bg-primary/10 text-primary scale-105';
                  return (
                    <button key={i} onClick={() => playWord(i)} className={`group flex flex-col items-center px-2 py-1.5 rounded-lg border transition-all active:scale-95 ${cls}`}>
                      <p className="font-arabic text-xl" dir="rtl">{w.arabic}</p>
                      <span className="flex items-center gap-0.5 mt-0.5 h-4">
                        {st.status === 'correct' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {st.status === 'wrong' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        {st.status === 'missing' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                        {st.status === 'pending' && <Volume2 className="w-3 h-3 text-muted-foreground/40" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : <p className="text-center text-sm text-muted-foreground py-8" dir="rtl">آیت دستیاب نہیں۔</p>}
        </div>
      </div>

      {/* Recording indicator + live transcript */}
      {recording && (
        <div className="px-4 pb-2 space-y-2">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center"><p className="text-xs font-urdu text-red-400 flex items-center justify-center gap-1.5" dir="rtl"><Mic className="w-4 h-4 animate-pulse" /> سن رہا ہے… پوری آیت پڑھیں</p></div>
          {liveTranscript && (
            <div className="rounded-lg bg-card/60 border border-border px-3 py-2"><p className="text-[10px] text-muted-foreground mb-1" dir="rtl">جوشی سن رہا ہے:</p><p className="font-arabic text-base text-foreground text-center" dir="rtl">{liveTranscript}</p></div>
          )}
        </div>
      )}
      {/* Error message + audio fallback */}
      {error && !recording && (
        <div className="px-4 pb-2 space-y-2">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-center"><p className="text-xs font-urdu text-amber-400 leading-relaxed" dir="rtl">{error}</p></div>
          {userAudioUrl && (
            <div className="rounded-lg bg-primary/10 border border-primary/25 p-3 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs font-urdu text-foreground/80 flex-1" dir="rtl">آپ کی ریکارڈنگ تیار ہے — اپنی آواز سنیں:</p>
              <button onClick={playUserAudio} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform shrink-0">
                <Volume2 className="w-3.5 h-3.5" /> چلائیں
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analysis results */}
      {analysis && !recording && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-gradient-to-br from-secondary/80 to-card/60 border border-border p-4">
            <div className="text-center mb-3"><p className="text-3xl font-bold text-primary">{score}%</p><p className="text-sm font-urdu text-foreground/80 mt-1" dir="rtl">{correctCount} از {words.length} الفاظ درست</p></div>
            <div className="rounded-lg bg-accent/10 border border-accent/25 p-3 mb-3"><p className="text-sm font-urdu leading-relaxed text-foreground/90 text-center" dir="rtl">{analysis.summary}</p></div>

            {/* Detected transcript — what the engine heard */}
            {analysis.transcript && (
              <div className="rounded-lg bg-card/60 border border-border p-3 mb-3">
                <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">جو آپ نے پڑھا (اسپیک ریکگنیشن نے سنا):</p>
                <p className="font-arabic text-base text-foreground/80 text-center leading-relaxed" dir="rtl">{analysis.transcript}</p>
              </div>
            )}

            {/* Per-word detailed analysis */}
            {analysis.wordDetails && analysis.wordDetails.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-foreground mb-2" dir="rtl">ہر لفظ کا تفصیلی تجزیہ:</p>
                <div className="space-y-1.5">
                  {analysis.wordDetails.map((wd, i) => {
                    const stCls = wd.status === 'correct' ? 'border-emerald-500/30 bg-emerald-500/5' : wd.status === 'mispronounced' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5';
                    const stColor = wd.status === 'correct' ? 'text-emerald-400' : wd.status === 'mispronounced' ? 'text-red-400' : 'text-amber-400';
                    const stLabel = wd.status === 'correct' ? 'درست' : wd.status === 'mispronounced' ? 'غلط تلفظ' : 'یاد رہا';
                    const simPct = Math.round((wd.similarity || 0) * 100);
                    return (
                      <div key={i} className={`flex items-center gap-2 rounded-lg border ${stCls} p-2`}>
                        <button onClick={() => playWord(wd.index)} className="font-arabic text-lg text-foreground shrink-0 hover:text-primary transition-colors" dir="rtl">{wd.expected}</button>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-semibold ${stColor}`} dir="rtl">{stLabel} {simPct > 0 && simPct < 100 ? `(${simPct}%)` : ''}</span>
                          {wd.said && wd.status === 'mispronounced' && <span className="text-[10px] text-muted-foreground block" dir="rtl">آپ نے کہا: {wd.said}</span>}
                          {wd.status === 'missing' && <span className="text-[10px] text-muted-foreground block" dir="rtl">یہ لفظ نہیں پڑھا</span>}
                        </div>
                        {wd.status !== 'correct' && (
                          <button onClick={() => playWord(wd.index)} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-semibold shrink-0 active:scale-95 transition-transform" dir="rtl">
                            <Volume2 className="w-3 h-3" /> درست سنائیں
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User audio playback — hear your own voice */}
            {userAudioUrl && (
              <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/25 p-2.5">
                <Headphones className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-urdu text-foreground/80" dir="rtl">اپنی آواز سنائیں — جو آپ نے پڑھا</p>
                <button onClick={playUserAudio} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform shrink-0">
                  <Volume2 className="w-3.5 h-3.5" /> چلائیں
                </button>
              </div>
            )}

            {wrongCount > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5" dir="rtl"><XCircle className="w-3.5 h-3.5" /> غلط الفاظ — یوں پڑھیں:</p>
                <div className="space-y-2">
                  {analysis.verseAccuracy.mispronouncedWords.map((m, i) => (
                    <div key={i} className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => playWord(m.wordIndex - 1)} className="flex items-center gap-1.5 flex-1 min-w-0" dir="rtl">
                          <Volume2 className="w-4 h-4 text-red-400 shrink-0" />
                          <div className="text-right">
                            <p className="font-arabic text-base text-red-400">{m.expected}</p>
                            <p className="text-[10px] text-muted-foreground" dir="rtl">آپ نے کہا: {m.said}</p>
                          </div>
                        </button>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => speakSaid(m.said, m.expected, i)} disabled={speakingSaid === i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[11px] font-semibold disabled:opacity-60 active:scale-95 transition-transform" dir="rtl">
                          <Volume2 className={`w-3 h-3 ${speakingSaid === i ? 'animate-pulse' : ''}`} /> {speakingSaid === i ? 'بولا جا رہا…' : 'تم نے یہ پڑھا'}
                        </button>
                        <button onClick={() => playWord(m.wordIndex - 1)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold active:scale-95 transition-transform" dir="rtl">
                          <Volume2 className="w-3 h-3" /> درست سنائیں
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {missingCount > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5" dir="rtl"><AlertCircle className="w-3.5 h-3.5" /> یاد نہ رہنے والے الفاظ:</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.verseAccuracy.missingIndices?.map(idx => (
                    <button key={idx} onClick={() => playWord(idx)} className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400" dir="rtl"><Volume2 className="w-3 h-3" /><span className="font-arabic text-sm">{words[idx]?.arabic}</span></button>
                  ))}
                </div>
              </div>
            )}
            {score === 100 && <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center mb-3"><p className="text-sm font-urdu text-emerald-400" dir="rtl">ماشاءاللہ! تمام الفاظ درست پڑھے۔</p></div>}
          </div>
        </div>
      )}

      {/* BOTTOM: Practice + audio + next — properly aligned */}
      {verseText && !loading && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/60">
          {/* Primary: practice / record */}
          {!recording ? (
            <button onClick={startRecording} className="w-full flex items-center justify-center gap-2 h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform">
              <Mic className="w-4 h-4" /> {analysis ? 'دوبارہ پڑھیں' : 'پریکٹس شروع کریں'}
            </button>
          ) : (
            <button onClick={stopRecording} className="w-full flex items-center justify-center gap-2 h-11 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold active:scale-95 transition-transform">
              <Square className="w-4 h-4" /> رکائیں
            </button>
          )}
          {/* Secondary row: audio + next */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => playFull(false)} disabled={!fullAudioUrl} className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] text-xs font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5 disabled:opacity-50">
              <Play className="w-3.5 h-3.5" /> مکمل
            </button>
            <button onClick={() => playFull(true)} disabled={!fullAudioUrl} className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] text-xs font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5 disabled:opacity-50">
              <Play className="w-3.5 h-3.5" /> آہستہ
            </button>
            <button onClick={nextAyah} className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-secondary border border-border text-foreground text-xs font-semibold active:scale-95 transition-transform">
              <ChevronLeft className="w-3.5 h-3.5" /> اگلی آیت
            </button>
          </div>
          {/* Tertiary row: user audio + repeat + wrong words */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={playUserAudio} disabled={!userAudioUrl} className="flex items-center justify-center gap-1.5 h-9 rounded-full bg-card border border-border text-foreground text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50" dir="rtl">
              <Headphones className="w-3.5 h-3.5" /> میری آواز
            </button>
            <button onClick={() => setRepeat(r => !r)} className={`flex items-center justify-center gap-1.5 h-9 rounded-full border text-xs font-semibold transition-colors ${repeat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>
              <Repeat className="w-3.5 h-3.5" /> {repeat ? 'دہرا رہا' : 'دہرائیں'}
            </button>
            {analysis && (wrongCount > 0 || missingCount > 0) && !recording ? (
              <button onClick={playWrongWords} disabled={playingWrong} className="flex items-center justify-center gap-1.5 h-9 rounded-full bg-card border border-border text-foreground text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50" dir="rtl">
                {playingWrong ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} غلط دہرائیں
              </button>
            ) : <div />}
          </div>
        </div>
      )}

      {!recognitionSupported && verseText && !loading && (
        <div className="px-4 pb-4"><p className="text-[10px] text-center text-amber-500 font-urdu" dir="rtl">آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں — آڈیو سن کر مشق کریں۔</p></div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

// ───────── components/tajweed/index.jsx ─────────
const circle_index = 'w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5 transition-transform';

// ─── TajweedRuleCard ───
export function TajweedRuleCard({ rule }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-card overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-primary/20">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          <BookQuillIcon className="w-3.5 h-3.5" />
          <span dir="rtl" className="font-urdu">{rule.name}</span>
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-urdu leading-relaxed text-foreground whitespace-pre-line" dir="rtl">{rule.description}</p>
      </div>
      {rule.example && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-secondary/60 border border-primary/20 p-3">
            <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">مثال:</p>
            <p className="font-arabic text-lg text-foreground leading-loose text-right" dir="rtl">{rule.example}</p>
          </div>
        </div>
      )}
      {rule.note && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2 rounded-lg bg-accent/10 border border-accent/20 p-2.5">
            <span className="shrink-0 mt-0.5 text-accent-foreground text-xs font-bold" dir="rtl">نکتہ:</span>
            <p className="text-xs font-urdu leading-relaxed text-foreground/80" dir="rtl">{rule.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TajweedCategory ───
export function TajweedCategory({ category, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-b from-secondary/80 to-card/60 border-b border-primary/25">
        <div className="flex-1 text-right">
          <p className="font-arabic text-xl text-foreground" dir="rtl">{category.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{category.titleEn}</p>
        </div>
        <span className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 flex items-center justify-center text-[#3e2a1d] shadow-sm">
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="px-4 py-4">
          <div className="mb-4 rounded-xl bg-accent/10 border border-accent/25 p-3">
            <p className="text-sm font-urdu leading-relaxed text-foreground/90" dir="rtl">{category.intro}</p>
          </div>
          <div className="space-y-3">
            {category.rules.map((rule, i) => <TajweedRuleCard key={i} rule={rule} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TajweedTracker ───
const STORAGE_KEY = 'qaid_progress_v1';
function loadProgress() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
const accuracyColor = (acc) => acc >= 80 ? 'text-emerald-400' : acc >= 50 ? 'text-amber-400' : 'text-red-400';
const accuracyBg = (acc) => acc >= 80 ? 'bg-emerald-500/100' : acc >= 50 ? 'bg-amber-500/100' : 'bg-red-500/100';
const accuracyBorder = (acc) => acc >= 80 ? 'border-emerald-500/30' : acc >= 50 ? 'border-amber-500/30' : 'border-red-500/30';

export function TajweedTracker() {
  const [analysis, setAnalysis] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [stats, setStats] = useState(null);
  const [hasData, setHasData] = useState(false);

  const refresh = () => {
    const data = loadProgress();
    setAnalysis(analyzeMakharijErrors(data));
    setRecommendation(recommendFirstLesson(data));
    setStats(getOverallStats());
    setHasData(Object.keys(data).length > 0);
  };

  useEffect(() => { refresh(); }, []);

  if (!hasData) {
    return (
      <div className="rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-secondary/80 to-card/60 p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground" dir="rtl">خودکار تجوید ٹریکر</span>
        </div>
        <div className="flex flex-col items-center gap-2 py-4">
          <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground text-center font-urdu" dir="rtl">قائد موڈ میں پریکٹس شروع کریں — یہ ٹریکر خود بخود آپ کی کارکردگی کو دیکھ کر بتائے گا کہ کون سے مخارج کی دوبارہ پریکٹس کرنی چاہیے۔</p>
        </div>
      </div>
    );
  }

  const totalWrong = stats?.totalWrong || 0;
  const totalAttempts = stats?.totalAttempts || 1;
  const overallAccuracy = Math.round(((stats?.totalCorrect || 0) / totalAttempts) * 100);

  return (
    <div className="rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-secondary/80 to-card/60 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          <Target className="w-3.5 h-3.5" /> خودکار تجوید ٹریکر
        </span>
        <button onClick={refresh} className="text-muted-foreground hover:text-foreground" aria-label="refresh"><RotateCcw className="w-3.5 h-3.5" /></button>
      </div>
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-card border border-border p-2 text-center">
            <p className="text-lg font-bold text-primary">{overallAccuracy}%</p>
            <p className="text-[10px] text-muted-foreground" dir="rtl">کل درستگی</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-2 text-center">
            <p className="text-lg font-bold text-foreground">{totalAttempts}</p>
            <p className="text-[10px] text-muted-foreground" dir="rtl">کل کوششیں</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-2 text-center">
            <p className="text-lg font-bold text-red-400">{totalWrong}</p>
            <p className="text-[10px] text-muted-foreground" dir="rtl">کل غلطیاں</p>
          </div>
        </div>
      </div>
      {recommendation && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-accent/15 border border-accent/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-4 h-4 text-accent-foreground" />
              <span className="text-xs font-semibold text-foreground" dir="rtl">پہلے یہ سبق دہرائیں</span>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground font-urdu" dir="rtl">{recommendation.makhraj.name} — {recommendation.makhraj.description}</p>
                <p className="text-xs text-foreground/70 font-urdu mt-1" dir="rtl">اس مخرج میں {recommendation.wrongCount} غلطیاں ہوئی ہیں ({recommendation.accuracy}% درستگی)۔ یہ آپ کی کمزور جگہ ہے — پہلے اس کی مشق کریں۔</p>
                {recommendation.words.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {recommendation.words.slice(0, 6).map((w, i) => <span key={i} className="font-arabic text-base px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400" dir="rtl">{w}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground" dir="rtl">مخارج کی کارکردگی</span>
        </div>
        <div className="space-y-2">
          {analysis.filter(a => a.totalAttempts > 0).map((a) => (
            <div key={a.makhraj.id} className={`rounded-lg border ${accuracyBorder(a.accuracy)} bg-card p-2.5`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate font-urdu" dir="rtl">{a.makhraj.name}</span>
                  {a.wrongCount >= 3 && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                  {a.accuracy >= 80 && a.totalAttempts >= 3 && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                </div>
                <span className={`text-xs font-bold ${accuracyColor(a.accuracy)}`}>{a.accuracy}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${accuracyBg(a.accuracy)} transition-all`} style={{ width: `${a.accuracy}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground" dir="rtl">{a.correctCount} درست / {a.wrongCount} غلط</span>
                {a.words.length > 0 && <span className="text-[10px] text-muted-foreground" dir="rtl">{a.words.length} الفاظ</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TajweedAudioPractice ───
const PRESET_VERSES_AUDIO = [
  { label: 'الفاتحة — آیت ۱', surah: 1, ayah: 1 },
  { label: 'الفاتحة — آیت ۵', surah: 1, ayah: 5 },
  { label: 'البقرة — آیت الکرسی', surah: 2, ayah: 255 },
  { label: 'الإخلاص', surah: 112, ayah: 1 },
  { label: 'الفلق — آیت ۱', surah: 113, ayah: 1 },
  { label: 'الناس — آیت ۱', surah: 114, ayah: 1 },
];
const RECITERS_index = [
  { id: 'ar.alafasy', name: 'العرافسی' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط' },
  { id: 'ar.abdurrahmaansudais', name: 'السدیث' },
  { id: 'ar.mahermuaiqly', name: 'مہر المعیقلی' },
];

export function TajweedAudioPractice() {
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [surahs, setSurahs] = useState([]);
  const [words, setWords] = useState([]);
  const [verseText, setVerseText] = useState('');
  const [fullAudioUrl, setFullAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(null);
  const [reciter, setReciter] = useState('ar.alafasy');
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => { quranApi.getSurahs().then(data => setSurahs(data || [])).catch(() => {}); }, []);
  const verseKey = `${surah}:${ayah}`;

  useEffect(() => {
    setLoading(true); setWords([]); setVerseText(''); setFullAudioUrl(''); setActiveIdx(null);
    (async () => {
      try {
        const v = await quranComApi.getVerseWords(verseKey);
        const ws = (v.words || []).filter(w => w.char_type_name === 'word' && w.audio_url).map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url), transliteration: (w.transliteration && w.transliteration.text) || '' }));
        setWords(ws); setVerseText(ws.map(w => w.arabic).join(' '));
        const fd = await quranApi.getAyahEdition(verseKey, reciter);
        if (fd?.audio) setFullAudioUrl(fd.audio);
      } catch {}
      setLoading(false);
    })();
  }, [verseKey, reciter]);

  const playWord = (i) => { const w = words[i]; if (!w?.audioUrl) return; const a = audioRef.current || (audioRef.current = new Audio()); a.onended = () => setActiveIdx(null); a.src = w.audioUrl; setActiveIdx(i); a.play().catch(() => {}); };
  const playFull = (slow = false) => { if (!fullAudioUrl) return; const a = audioRef.current || (audioRef.current = new Audio()); a.onended = () => { if (repeat) { a.playbackRate = slow ? 0.7 : 1; a.play().catch(() => {}); } else setActiveIdx(null); }; a.src = fullAudioUrl; a.playbackRate = slow ? 0.7 : 1; setActiveIdx(null); a.play().catch(() => {}); };
  const playAllWords = async () => { for (let i = 0; i < words.length; i++) { setActiveIdx(i); await new Promise((resolve) => { const a = new Audio(words[i].audioUrl); a.onended = resolve; a.onerror = resolve; a.play().catch(resolve); }); } setActiveIdx(null); };

  return (
    <div className="rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-secondary/80 to-card/60 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"><Gauge className="w-3.5 h-3.5" /> آڈیو تجوید نمونے</span>
        <select value={reciter} onChange={(e) => setReciter(e.target.value)} className="h-8 px-2 rounded-full bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-accent/40" dir="rtl">
          {RECITERS_index.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <select value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah(1); }} className="h-9 px-3 rounded-full bg-card border border-border text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-accent/40" dir="rtl">
            {surahs.map(s => <option key={s.number} value={s.number}>سورة {s.name} ({s.numberOfAyahs})</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => setAyah(a => Math.max(1, a - 1))} className={circle_index} aria-label="پچھلی آیت"><ChevronRight className="w-4 h-4" /></button>
            <input type="number" min="1" value={ayah} onChange={(e) => setAyah(Math.max(1, Number(e.target.value)))} className="w-14 h-9 px-2 rounded-full bg-card border border-border text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40" dir="rtl" />
            <button onClick={() => setAyah(a => a + 1)} className={circle_index} aria-label="اگلی آیت"><ChevronLeft className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_VERSES_AUDIO.map(v => <button key={`${v.surah}:${v.ayah}`} onClick={() => { setSurah(v.surah); setAyah(v.ayah); }} className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${surah === v.surah && ayah === v.ayah ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border text-foreground/70'}`} dir="rtl">{v.label}</button>)}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="rounded-xl bg-card/50 border border-primary/30 p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs text-muted-foreground" dir="rtl">آیت لوڈ ہو رہی ہے…</p></div>
          ) : verseText ? (
            <>
              <p className="font-arabic text-2xl text-center text-foreground leading-loose mb-3" dir="rtl" style={{ wordSpacing: '0.15em' }}>{verseText}</p>
              <p className="text-center text-[10px] text-muted-foreground mb-3" dir="rtl">کسی بھی لفظ پر کلک کریں — درست ادائیگی اور تجوید سنیں</p>
              <div className="flex flex-wrap justify-center gap-2">
                {words.map((w, i) => { const active = activeIdx === i; return (
                  <button key={i} onClick={() => playWord(i)} className={`group flex flex-col items-center px-2 py-1.5 rounded-lg border transition-all ${active ? 'border-primary bg-primary/10 scale-105' : 'border-transparent hover:border-primary/30 hover:bg-secondary/40'}`}>
                    <p className={`font-arabic text-xl transition-colors ${active ? 'text-primary' : 'text-foreground'}`} dir="rtl">{w.arabic}</p>
                    <span className="flex items-center gap-0.5 mt-0.5"><Volume2 className={`w-3 h-3 ${active ? 'text-primary' : 'text-muted-foreground/60'}`} fill={active ? 'currentColor' : 'none'} /></span>
                  </button>
                ); })}
              </div>
            </>
          ) : <p className="text-center text-sm text-muted-foreground py-8" dir="rtl">آیت دستیاب نہیں۔</p>}
        </div>
      </div>
      {verseText && !loading && (
        <div className="px-4 pb-4 flex items-center justify-center gap-2 flex-wrap">
          <button onClick={() => playFull(false)} className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] text-xs font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5"><Play className="w-3.5 h-3.5" /> مکمل آیت</button>
          <button onClick={() => playFull(true)} className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] text-xs font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5"><Play className="w-3.5 h-3.5" /> آہستہ</button>
          <button onClick={playAllWords} className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] text-xs font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5"><Volume2 className="w-3.5 h-3.5" /> لفظ بہ لفظ</button>
          <button onClick={() => setRepeat(r => !r)} className={`flex items-center gap-1.5 px-4 h-9 rounded-full border text-xs font-semibold transition-colors ${repeat ? 'bg-primary text-white border-primary' : 'bg-card border-border text-foreground'}`}><Repeat className="w-3.5 h-3.5" /> دہرائیں</button>
        </div>
      )}
      {verseText && !loading && words.length > 0 && (
        <div className="px-4 pb-4">
          <RecitationCheck words={words} verseKey={verseKey} />
        </div>
      )}
      <audio ref={audioRef} />
    </div>
  );
}

// ─── QaidMode ───
const PRESET_VERSES_QAID = [
  { label: 'الفاتحة — آیت ۱', surah: 1, ayah: 1 },
  { label: 'الفاتحة — آیت ۵', surah: 1, ayah: 5 },
  { label: 'الإخلاص', surah: 112, ayah: 1 },
  { label: 'الفلق — آیت ۱', surah: 113, ayah: 1 },
  { label: 'الناس — آیت ۱', surah: 114, ayah: 1 },
];

export function QaidMode() {
  const [mode, setMode] = useState('quran');
  const [basicsCategory, setBasicsCategory] = useState('letters');
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [surahs, setSurahs] = useState([]);
  const [quranWords, setQuranWords] = useState([]);
  const [verseText, setVerseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [results, setResults] = useState([]);
  const [spokenText, setSpokenText] = useState('');
  const [advice, setAdvice] = useState({ hasData: false, text: '', wrongWords: [], dueWords: [] });
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionSupported = isSpeechRecognitionSupported();
  const verseKey = `${surah}:${ayah}`;
  const words = mode === 'quran' ? quranWords : (arabicBasics[basicsCategory]?.words || []).map(w => ({ arabic: w, audioUrl: null, isBasic: true }));

  useEffect(() => { quranApi.getSurahs().then(data => setSurahs(data || [])).catch(() => {}); }, []);
  const refreshAdvice = useCallback(() => { setAdvice(getAdvice()); }, []);
  useEffect(() => { refreshAdvice(); }, []);

  const fetchVerse = useCallback(async () => {
    if (mode !== 'quran') return;
    setLoading(true); setQuranWords([]); setVerseText(''); setActive(false);
    try {
      const v = await quranComApi.getVerseWords(verseKey, 'text_uthmani,char_type_name,audio_url');
      const ws = (v.words || []).filter(w => w.char_type_name === 'word' && w.audio_url).map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url) }));
      setQuranWords(ws); setVerseText(ws.map(w => w.arabic).join(' '));
    } catch {}
    setLoading(false);
  }, [verseKey, mode]);

  useEffect(() => { if (mode === 'quran') fetchVerse(); }, [fetchVerse]);
  useEffect(() => { if (mode === 'basics') { setActive(false); setResults([]); } }, [mode, basicsCategory]);

  const stopRecognition = () => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; } };
  const stopAll = () => { if (audioRef.current) { audioRef.current.pause(); } if ('speechSynthesis' in window) window.speechSynthesis.cancel(); stopRecognition(); };
  useEffect(() => () => stopAll(), []);

  const playGuide = useCallback((w) => new Promise((resolve) => { if (w.isBasic || !w.audioUrl) { speakArabic(w.arabic, resolve); } else { const a = new Audio(w.audioUrl); audioRef.current = a; a.onended = resolve; a.onerror = resolve; a.play().catch(resolve); } }), []);

  const guideAndListen = useCallback(async (idx) => {
    if (idx >= words.length) { setPhase('done'); refreshAdvice(); return; }
    const w = words[idx]; if (!w?.arabic) return;
    setPhase('playing'); await playGuide(w); await new Promise(r => setTimeout(r, 400));
    if (!recognitionSupported) {
      setPhase('listening'); await new Promise(r => setTimeout(r, 1500));
      const wKey = mode === 'quran' ? `${verseKey}:${idx}` : `basic:${w.arabic}`;
      recordWordAttempt(wKey, w.arabic, null); setResults(prev => [...prev, { correct: null, spoken: 'غیر دستیاب' }]); setPhase('idle'); setCurrentIdx(idx + 1); guideAndListen(idx + 1); return;
    }
    setSpokenText(''); setPhase('listening');
    const recognition = createRecognition('ar-SA');
    if (!recognition) { const wKey = mode === 'quran' ? `${verseKey}:${idx}` : `basic:${w.arabic}`; recordWordAttempt(wKey, w.arabic, null); setResults(prev => [...prev, { correct: null, spoken: 'غیر دستیاب' }]); setPhase('idle'); setCurrentIdx(idx + 1); guideAndListen(idx + 1); return; }
    let resolved = false; let finalTranscript = '';
    recognition.onresult = (event) => { for (let i = event.resultIndex; i < event.results.length; i++) { if (event.results[i].isFinal) { finalTranscript += event.results[i][0].transcript + ' '; } } };
    recognition.onerror = () => { if (resolved) return; resolved = true; stopRecognition(); const wKey = mode === 'quran' ? `${verseKey}:${idx}` : `basic:${w.arabic}`; recordWordAttempt(wKey, w.arabic, null); setResults(prev => [...prev, { correct: null, spoken: '' }]); setPhase('idle'); setCurrentIdx(idx + 1); setTimeout(() => guideAndListen(idx + 1), 300); };
    recognition.onend = () => { if (resolved) return; resolved = true; stopRecognition(); setPhase('checking'); const spoken = finalTranscript.trim(); setSpokenText(spoken); const correct = checkWord(spoken, w.arabic); const wKey = mode === 'quran' ? `${verseKey}:${idx}` : `basic:${w.arabic}`; recordWordAttempt(wKey, w.arabic, correct); setResults(prev => [...prev, { correct, spoken }]); setTimeout(() => { setPhase('idle'); setCurrentIdx(idx + 1); guideAndListen(idx + 1); }, 1200); };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { if (!resolved) { resolved = true; const wKey = mode === 'quran' ? `${verseKey}:${idx}` : `basic:${w.arabic}`; recordWordAttempt(wKey, w.arabic, null); setResults(prev => [...prev, { correct: null, spoken: '' }]); setPhase('idle'); setCurrentIdx(idx + 1); guideAndListen(idx + 1); } }
    setTimeout(() => { if (!resolved && recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } }, 5000);
  }, [words, recognitionSupported, mode, verseKey, playGuide, refreshAdvice]);

  const startGuided = () => { if (!words.length) return; stopAll(); setCurrentIdx(0); setResults([]); setPhase('idle'); setActive(true); setTimeout(() => guideAndListen(0), 200); };
  const stopGuided = () => { stopAll(); setActive(false); setPhase('idle'); setCurrentIdx(0); };
  const replayWord = (i) => { const w = words[i]; if (!w) return; if (w.isBasic || !w.audioUrl) { speakArabic(w.arabic); } else { const a = new Audio(w.audioUrl); a.play().catch(() => {}); } };
  const correctCount = results.filter(r => r.correct === true).length;
  const totalCount = results.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const displayText = mode === 'quran' ? verseText : (arabicBasics[basicsCategory]?.words || []).join(' ');

  return (
    <div className="rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-secondary/80 to-card/60 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"><GraduationCap className="w-3.5 h-3.5" /> قائد موڈ</span>
        <span className="text-[10px] text-muted-foreground" dir="rtl">استاد پڑھائے گا، آپ دہرائیں</span>
      </div>
      <div className="px-4 pb-3">
        <div className="flex gap-2">
          <button onClick={() => setMode('quran')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${mode === 'quran' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`} dir="rtl"><BookOpen className="w-3.5 h-3.5" /> قرآنی آیات</button>
          <button onClick={() => setMode('basics')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${mode === 'basics' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`} dir="rtl"><Type className="w-3.5 h-3.5" /> بنیادی عربی الفاظ</button>
        </div>
      </div>
      {advice.hasData && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-accent/10 border border-accent/30 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-4 h-4 text-accent-foreground" />
              <span className="text-xs font-semibold text-foreground" dir="rtl">مشورہ — آپ کی کارکردگی</span>
              <button onClick={() => { clearProgress(); refreshAdvice(); }} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="پریکٹس ڈیٹا صاف کریں"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-xs font-urdu leading-relaxed text-foreground/80 whitespace-pre-line" dir="rtl">{advice.text}</p>
            {advice.wrongWords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {advice.wrongWords.slice(0, 5).map(w => <button key={w.key} onClick={() => speakArabic(w.word)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-[11px] text-destructive font-arabic" dir="rtl">{w.word} <span className="text-[9px]">({w.wrongCount}×)</span></button>)}
              </div>
            )}
          </div>
        </div>
      )}
      {mode === 'basics' && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(arabicBasics).map(([key, cat]) => <button key={key} onClick={() => setBasicsCategory(key)} className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${basicsCategory === key ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border text-foreground/70'}`} dir="rtl">{cat.title}</button>)}
          </div>
        </div>
      )}
      {mode === 'quran' && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <select value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah(1); }} className="h-9 px-3 rounded-full bg-card border border-border text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-accent/40" dir="rtl">{surahs.map(s => <option key={s.number} value={s.number}>سورة {s.name} ({s.numberOfAyahs})</option>)}</select>
            <div className="flex items-center gap-1">
              <button onClick={() => setAyah(a => Math.max(1, a - 1))} className={circle_index} aria-label="پچھلی آیت"><ChevronRight className="w-4 h-4" /></button>
              <input type="number" min="1" value={ayah} onChange={(e) => setAyah(Math.max(1, Number(e.target.value)))} className="w-14 h-9 px-2 rounded-full bg-card border border-border text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40" dir="rtl" />
              <button onClick={() => setAyah(a => a + 1)} className={circle_index} aria-label="اگلی آیت"><ChevronLeft className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_VERSES_QAID.map(v => <button key={`${v.surah}:${v.ayah}`} onClick={() => { setSurah(v.surah); setAyah(v.ayah); }} className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${surah === v.surah && ayah === v.ayah ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border text-foreground/70'}`} dir="rtl">{v.label}</button>)}
          </div>
        </div>
      )}
      <div className="px-4 pb-3">
        <div className="rounded-xl bg-card/50 border border-primary/30 p-4">
          {mode === 'quran' && loading ? (
            <div className="flex flex-col items-center gap-2 py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs text-muted-foreground" dir="rtl">آیت لوڈ ہو رہی ہے…</p></div>
          ) : displayText ? (
            <>
              {mode === 'quran' && <p className="font-arabic text-2xl text-center text-foreground mb-3" dir="rtl" style={{ wordSpacing: '0.2em', lineHeight: '2.4' }}>{displayText}</p>}
              <p className="text-center text-[10px] text-muted-foreground mb-3" dir="rtl">{mode === 'quran' ? 'کسی بھی لفظ پر کلک کریں — درست ادائیگی سنیں' : 'کسی بھی لفظ پر کلک کریں — استاد کی آواز سنیں'}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {words.map((w, i) => {
                  const isCurrent = active && currentIdx === i; const res = results[i];
                  let stateClass = 'border-transparent text-foreground hover:border-primary/30 hover:bg-secondary/40';
                  if (res) { if (res.correct === true) { stateClass = 'border-emerald-400 bg-emerald-500/10 text-emerald-400'; } else if (res.correct === false) { stateClass = 'border-red-400 bg-red-500/10 text-red-400'; } else { stateClass = 'border-amber-500/30 bg-amber-500/10 text-amber-400'; } }
                  if (isCurrent) { stateClass = 'border-primary bg-primary/10 text-primary scale-105'; }
                  return (
                    <button key={i} onClick={() => replayWord(i)} className={`group flex flex-col items-center px-2 py-1.5 rounded-lg border transition-all active:scale-95 ${stateClass}`}>
                      <p className="font-arabic text-xl" dir="rtl" style={{ wordSpacing: '0.2em', lineHeight: '2.4' }}>{w.arabic}</p>
                      <span className="flex items-center gap-0.5 mt-0.5 h-4">
                        {res?.correct === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {res?.correct === false && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        {isCurrent && phase === 'playing' && <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
                        {isCurrent && phase === 'listening' && <Mic className="w-3.5 h-3.5 animate-pulse" />}
                        {isCurrent && phase === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {!res && !isCurrent && <Volume2 className="w-3 h-3 text-muted-foreground/40" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : <p className="text-center text-sm text-muted-foreground py-8" dir="rtl">کوئی ڈیٹا دستیاب نہیں۔</p>}
        </div>
      </div>
      {active && phase !== 'done' && (
        <div className="px-4 pb-2">
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-center">
            {phase === 'playing' && <p className="text-xs font-urdu text-primary flex items-center justify-center gap-1.5" dir="rtl"><Volume2 className="w-4 h-4 animate-pulse" /> استاد پڑھ رہا ہے — غور سے سنیں</p>}
            {phase === 'listening' && <p className="text-xs font-urdu text-primary flex items-center justify-center gap-1.5" dir="rtl"><Mic className="w-4 h-4 animate-pulse" /> آپ کی باری — لفظ دہرائیں</p>}
            {phase === 'checking' && <p className="text-xs font-urdu text-accent-foreground flex items-center justify-center gap-1.5" dir="rtl"><Loader2 className="w-4 h-4 animate-spin" /> جانچ ہو رہی ہے…</p>}
            {phase === 'idle' && <p className="text-xs text-muted-foreground" dir="rtl">اگلا لفظ…</p>}
          </div>
        </div>
      )}
      {active && phase === 'done' && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-gradient-to-b from-secondary/80 to-card/60 border border-primary/30 p-4 text-center">
            <p className="text-3xl font-bold text-primary mb-1">{score}%</p>
            <p className="text-sm font-urdu text-foreground/80" dir="rtl">{correctCount} از {totalCount} الفاظ درست پڑھے</p>
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              {results.map((r, i) => <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${r.correct === true ? 'bg-emerald-500/15 text-emerald-400' : r.correct === false ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>{r.correct === true ? '✓' : r.correct === false ? '✗' : '—'}</span>)}
            </div>
            {score === 100 && <p className="text-sm font-urdu text-emerald-400 mt-3" dir="rtl">ماشاءاللہ! تمام الفاظ درست پڑھے۔</p>}
            {score < 100 && mode === 'quran' && (
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <button onClick={() => window.open(getOnlineVerifyUrls(verseKey).quranCom, '_blank')} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold" dir="rtl"><Globe className="w-3.5 h-3.5" /> آن لائن سن کر جانچیں</button>
                <button onClick={() => window.open(getOnlineVerifyUrls(verseKey).youtube, '_blank')} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold" dir="rtl"><Globe className="w-3.5 h-3.5" /> یوٹیوب</button>
              </div>
            )}
          </div>
        </div>
      )}
      {displayText && !(mode === 'quran' && loading) && (
        <div className="px-4 pb-4 flex items-center justify-center gap-2 flex-wrap">
          {!active ? (
            <button onClick={startGuided} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] text-sm font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5"><Play className="w-4 h-4" /> قائد موڈ شروع کریں</button>
          ) : (
            <>
              <button onClick={stopGuided} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold"><Square className="w-4 h-4" /> رکائیں</button>
              {phase === 'done' && <button onClick={startGuided} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/35 text-[#3e2a1d] text-sm font-semibold shadow-[0_3px_5px_rgba(62,42,29,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] active:translate-y-0.5"><RotateCcw className="w-4 h-4" /> دوبارہ</button>}
            </>
          )}
        </div>
      )}
      {!recognitionSupported && displayText && !(mode === 'quran' && loading) && (
        <div className="px-4 pb-4"><p className="text-[10px] text-center text-amber-400 font-urdu" dir="rtl">آپ کے براؤزر میں اسپیک ریکگنیشن دستیاب نہیں — قائد موڈ آڈیو سن کر دہرانے کے لیے استعمال کریں۔</p></div>
      )}
    </div>
  );
}

// ───────── components/tajweed/TajweedRulesNav.jsx ─────────
export function TajweedRulesNav() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-2">
      {tajweedCategories.map((cat, i) => (
        <div key={cat.id}>
          <button
            onClick={() => setOpenId(openId === cat.id ? null : cat.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-gradient-to-br from-secondary/90 to-card/82 transition-all hover:border-primary animate-rise"
            style={{ animationDelay: `${i * 0.03}s` }}
            dir="rtl"
          >
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15 text-primary text-xs font-bold shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0 text-right">
              <p className="font-arabic text-lg text-foreground truncate">{cat.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{cat.titleEn}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${openId === cat.id ? 'rotate-180' : ''}`} />
          </button>
          {openId === cat.id && (
            <div className="mt-2 px-1 animate-rise">
              <div className="mb-3 rounded-lg bg-accent/10 border border-accent/25 p-3">
                <p className="text-sm font-urdu leading-relaxed text-foreground/90" dir="rtl">{cat.intro}</p>
              </div>
              <div className="space-y-3">
                {cat.rules.map((rule, ri) => <TajweedRuleCard key={ri} rule={rule} />)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
