import { HERO_IMG } from '@/lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, ArrowRight, Bookmark, Headphones, BookOpen, Landmark, ChevronLeft, ChevronRight, SpellCheck } from 'lucide-react';
import { getCachedEdition, setCachedEdition, getCachedWords, setCachedWords, getCachedAnalysis, setCachedAnalysis, getCachedPage, setCachedPage, getCachedAyah, setCachedAyah, getCachedSurahs, setCachedSurahs } from '@/lib/quran';
import { getOfflineAnalysis, preloadVerse } from '@/lib/quran';
import { getRelatedHadiths } from '@/lib/quran';
import { isFatihah, getFatihahWords } from '@/lib/data';
import { TafsirSources } from '@/components/quran';
import { WordByWord } from '@/components/quran';
import { HadithCard } from '@/components/quran';
import { PracticeModal } from '@/components/practice';
import { RelatedAyahs } from '@/components/quran';
import { DisplayModeMenu } from '@/components/quran';
import { ReciterMenu } from '@/components/quran';
import { ExpandableText } from '@/components/quran';
import { getWordTextColor } from '@/lib/data';
import { SaveToNotebook } from '@/components/ai';
import { quranApi, quranComApi, wordAudioUrl } from '@/lib/quran';
import { recordVisit } from '@/lib/stores';
import { isSurahDownloaded, downloadSurah } from '@/lib/quran';


export default function Reader() {
  const { surahNumber } = useParams();
  const navigate = useNavigate();
  const [surahs, setSurahs] = useState([]);
  const [edition, setEdition] = useState(null);
  const [searchParams] = useSearchParams();
  const [selectedAyah, setSelectedAyah] = useState(Math.max(0, (Number(searchParams.get('ayah')) || 1) - 1));
  const [quranWords, setQuranWords] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [hadiths, setHadiths] = useState([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [pageNumber, setPageNumber] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [reciter, setReciter] = useState(localStorage.getItem('quran-reciter') || 'ar.alafasy');
  const [mode, setMode] = useState('full');
  const [practiceOpen, setPracticeOpen] = useState(false);
  const audioRef = useRef(null);
  const [wordDataStatus, setWordDataStatus] = useState('idle');

  useEffect(() => {
    if (!surahNumber) return;
    const sn = Number(surahNumber);
    isSurahDownloaded(sn).then(d => {
      if (!d) {
        setWordDataStatus('downloading');
        downloadSurah(sn).then(() => setWordDataStatus('done')).catch(() => setWordDataStatus('error'));
      }
    });
  }, [surahNumber]);

  useEffect(() => {
    const cachedSurahs = getCachedSurahs();
    if (cachedSurahs) setSurahs(cachedSurahs);
    quranApi.getSurahs().then(data => { setSurahs(data); setCachedSurahs(data); }).catch(() => {});
    const sp = new URLSearchParams(window.location.search);
    const ayahParam = sp.get('ayah');
    if (ayahParam) {
      const a = Math.max(0, Number(ayahParam) - 1);
      setSelectedAyah(a); setCachedAyah(surahNumber, a);
      const surahInfo0 = getCachedSurahs()?.find(s => s.number === Number(surahNumber));
      if (surahInfo0) recordVisit(surahNumber, a + 1, surahInfo0.englishName, surahInfo0.name);
    }
    else { const cachedAyah = getCachedAyah(surahNumber); setSelectedAyah(cachedAyah != null ? cachedAyah : 0); }
    const cached = getCachedEdition(surahNumber);
    if (cached) {
      setEdition(cached);
      if (!cached.urdu || cached.urdu?.edition?.identifier !== 'ur.jalandhry') {
        quranApi.getSurahEditions(surahNumber, 'ur.jalandhry')
          .then(data => {
            setEdition(prev => {
              if (!prev) return prev;
              const updated = { ...prev, urdu: data };
              setCachedEdition(surahNumber, updated);
              return updated;
            });
          })
          .catch(() => {});
      }
      return;
    }
    setEdition(null);
    quranApi.getSurahEditions(surahNumber, `quran-uthmani,${reciter}`)
      .then(data => {
        const ed = { arabic: data[0], audio: data[1] };
        setEdition(ed);
        setCachedEdition(surahNumber, ed);
        quranApi.getSurahEditions(surahNumber, 'en.asad,ur.jalandhry')
          .then(data2 => {
            setEdition(prev => {
              if (!prev) return prev;
              const updated = { ...prev, english: data2[0], urdu: data2[1] };
              setCachedEdition(surahNumber, updated);
              return updated;
            });
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [surahNumber]);

  const changeReciter = (id) => {
    setReciter(id);
    localStorage.setItem('quran-reciter', id);
    setEdition(prev => prev ? { ...prev, audio: null } : null);
    quranApi.getSurahEditions(surahNumber, `quran-uthmani,${id}`)
      .then(data => {
        setEdition(prev => {
          const updated = { ...prev, arabic: data[0], audio: data[1] };
          setCachedEdition(surahNumber, updated);
          return updated;
        });
      })
      .catch(() => {});
  };

  const goAyah = (n) => {
    setSelectedAyah(n);
    setCachedAyah(surahNumber, n);
    const surahInfo = surahs.find(s => s.number === Number(surahNumber));
    if (surahInfo) recordVisit(surahNumber, n + 1, surahInfo.englishName, surahInfo.name);
  };

  useEffect(() => {
    if (!edition?.arabic) return;
    const verseKey = `${surahNumber}:${selectedAyah + 1}`;
    // Record this verse visit for reading history
    recordVisit(surahNumber, selectedAyah + 1, edition.arabic.englishName, edition.arabic.name);
    setActiveIndex(null);
    setAnalysisError(false);
    const cWords = getCachedWords(verseKey);
    const cAna = getCachedAnalysis(verseKey);
    const cPage = getCachedPage(verseKey);
    if (cPage) setPageNumber(cPage);
    if (cWords) setQuranWords(cWords); else setQuranWords([]);
    if (cAna) setAnalysis(cAna); else setAnalysis(null);
    if (cWords && cAna) {
      setAnalysisLoading(false);
      const nextAyah = selectedAyah + 2;
      if (nextAyah <= edition.arabic.numberOfAyahs) preloadVerse(surahNumber, nextAyah);
      return;
    }
    setAnalysisLoading(true);
    (async () => {
      try {
        let ws = cWords;
        if (!ws) {
          // Static words for Surah Al-Fatihah — instant, complete, offline
          if (isFatihah(surahNumber)) {
            const staticWs = getFatihahWords(selectedAyah + 1);
            if (staticWs) {
              ws = staticWs;
              setQuranWords(ws);
              setCachedWords(verseKey, ws);
            }
          }
        }
        if (!ws) {
          const v = await quranComApi.getVerseWords(verseKey);
          ws = (v.words || [])
            .filter(w => w.char_type_name === 'word' && w.audio_url)
            .map(w => ({ arabic: w.text_uthmani, audioUrl: wordAudioUrl(w.audio_url), transliteration: (w.transliteration && w.transliteration.text) || '' }));
          setQuranWords(ws);
          setCachedWords(verseKey, ws);
          if (v.page_number) { setPageNumber(v.page_number); setCachedPage(verseKey, v.page_number); }
        }
        if (!cAna) {
          try {
            const offline = await getOfflineAnalysis(verseKey, surahNumber, selectedAyah + 1);
            if (offline) {
              setAnalysis(offline);
              setCachedAnalysis(verseKey, offline);
            }
          } catch {}
        }
      } catch {}
      setAnalysisLoading(false);
      const nextAyah = selectedAyah + 2;
      if (nextAyah <= edition.arabic.numberOfAyahs) preloadVerse(surahNumber, nextAyah);
    })();
  }, [edition, selectedAyah, surahNumber]);

  useEffect(() => {
    if (!edition?.english?.ayahs) return;
    const verseKey = `${surahNumber}:${selectedAyah + 1}`;
    const engText = edition.english.ayahs[selectedAyah]?.text || '';
    const urText = edition.urdu?.ayahs?.[selectedAyah]?.text || '';
    if (!engText && !urText) return;
    setHadiths([]);
    getRelatedHadiths(verseKey, engText, urText)
      .then(hs => { if (hs && hs.length) setHadiths(hs); })
      .catch(() => {});
  }, [edition?.english, selectedAyah, surahNumber]);

  const bkKey = `quran-bm-${surahNumber}-${selectedAyah}`;
  useEffect(() => { setBookmarked(localStorage.getItem(bkKey) === '1'); }, [bkKey]);
  const toggleBookmark = () => {
    setBookmarked(b => {
      const n = !b;
      if (n) localStorage.setItem(bkKey, '1'); else localStorage.removeItem(bkKey);
      return n;
    });
  };

  const playVerse = () => {
    if (!edition?.audio) return;
    const a = audioRef.current || (audioRef.current = new Audio());
    a.onended = () => setActiveIndex(null);
    a.src = edition.audio.ayahs[selectedAyah].audio;
    setActiveIndex(null);
    a.play().catch(() => {});
  };
  const playWord = (i) => {
    const w = words[i];
    if (!w || !w.audioUrl) return;
    const a = audioRef.current || (audioRef.current = new Audio());
    a.onended = () => setActiveIndex(null);
    a.src = w.audioUrl;
    setActiveIndex(i);
    a.play().catch(() => {});
  };

  if (!edition?.arabic) {
    return <div className="min-h-screen flex justify-center items-center" style={{ background: '#081914' }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#d6bd78' }} /></div>;
  }

  const verse = edition.arabic.ayahs[selectedAyah];
  const eng = edition.english?.ayahs?.[selectedAyah]?.text || '…';
  const meta = analysis?.wordMeta || [];
  const words = quranWords.map((w, i) => ({ ...w, ...(meta[i] || {}) }));
  const currentSurah = surahs.find(s => s.number === Number(surahNumber));

  const show = {
    translation: ['translation', 'study', 'full'].includes(mode),
    words: ['wordMeanings', 'study', 'full'].includes(mode),
    tafseer: ['study', 'full'].includes(mode),
    hadith: mode === 'full',
  };

  return (
    <div className="q-reader">
      <div className="ambient" />

      <section className="hero">
        <img src={HERO_IMG} alt="" />
        <div className="hero-content">
          <div className="topbar">
            <div className="cluster">
              <button onClick={() => navigate('/')} className="icon-btn" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
              <button onClick={toggleBookmark} className="icon-btn" aria-label="Bookmark"><Bookmark className="w-5 h-5" fill={bookmarked ? 'currentColor' : 'none'} /></button>
              <DisplayModeMenu mode={mode} onChange={setMode} />
            </div>
            <div className="page-badge">
              <small>صفحہ</small>
              <span className="page-number">{pageNumber || '—'}</span>
            </div>
            <div className="cluster">
              <ReciterMenu value={reciter} onChange={changeReciter} />
              <button onClick={() => goAyah(Math.min(edition.arabic.numberOfAyahs - 1, selectedAyah + 1))} className="icon-btn" aria-label="Next"><ArrowRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="hero-bottom">
            <div className="hero-title">{currentSurah ? `سورة ${currentSurah.name}` : '…'}</div>
            <div className="hero-tools">
              <button onClick={playVerse} className="gold-btn"><Headphones className="w-4 h-4" /><span>Listen</span></button>
              <button onClick={() => setPracticeOpen(true)} className="pill"><BookOpen className="w-4 h-4" /><span>Practice</span></button>
              <button onClick={() => document.getElementById('shan-nuzool')?.scrollIntoView({ behavior: 'smooth' })} className="pill"><Landmark className="w-4 h-4" /><span>Revelation</span></button>
              <button onClick={() => navigate(`/reader/${surahNumber}/grammar/${selectedAyah + 1}`)} className="pill"><SpellCheck className="w-4 h-4" /><span>Grammar</span></button>
              <SaveToNotebook
                itemType="verse"
                citation={`سورة ${currentSurah?.name || ''} — ${surahNumber}:${selectedAyah + 1}`}
                content={`${verse?.text || ''}\n\nترجمہ: ${analysis?.translationUrdu || edition?.urdu?.ayahs?.[selectedAyah]?.text || ''}`}
                sourceRef={`${surahNumber}:${selectedAyah + 1}`}
                label="نوٹ بک"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="content">
        <div className="nav-row">
          <select value={surahNumber} onChange={e => navigate(`/reader/${e.target.value}`)} className="select" dir="rtl">
            {surahs.map(s => <option key={s.number} value={s.number}>سورة {s.name}</option>)}
          </select>
          <span className="count">{edition.arabic.numberOfAyahs}</span>
          <button onClick={() => goAyah(Math.max(0, selectedAyah - 1))} className="icon-btn" aria-label="Prev ayah"><ChevronRight className="w-4 h-4" /></button>
          <select value={selectedAyah} onChange={e => goAyah(Number(e.target.value))} className="select" dir="rtl">
            {Array.from({ length: edition.arabic.numberOfAyahs }, (_, i) => <option key={i} value={i}>آیت {i + 1}</option>)}
          </select>
          <button onClick={() => goAyah(Math.min(edition.arabic.numberOfAyahs - 1, selectedAyah + 1))} className="icon-btn" aria-label="Next ayah"><ChevronLeft className="w-4 h-4" /></button>
        </div>
        {wordDataStatus === 'downloading' && (
          <div className="text-center text-[11px] text-muted-foreground py-1 animate-pulse" dir="rtl">
            لفاظ کا تفصیلی ڈیٹا ڈاؤن لوڈ ہو رہا ہے…
          </div>
        )}

        {selectedAyah === 0 && Number(surahNumber) !== 1 && Number(surahNumber) !== 9 && (
          <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        )}

        <article className="verse">
          <div className="arabic">
            {words.length > 0
              ? words.map((w, i) => <span key={i} style={{ color: getWordTextColor(w.category) }}>{w.arabic}{' '}</span>)
              : verse.text}
          </div>
          <span className="verse-ref">آیت {selectedAyah + 1}</span>
        </article>

        {show.words && (analysisLoading || !quranWords.length ? (
          <div className="state">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#d6bd78' }} />
            <p className="muted" dir="rtl">تجزیہ تیار ہو رہا ہے…</p>
          </div>
        ) : words.length ? (
          <section className="section">
            <div className="section-head">
              <h2 className="section-title">الفاظ بہ الفاظ</h2>
              <span className="verse-ref">{surahNumber} : {selectedAyah + 1}</span>
            </div>
            <WordByWord arabicText={verse.text} words={words} onWordPlay={playWord} onWordClick={(i) => navigate(`/reader/${surahNumber}/word/${selectedAyah + 1}/${i}`)} activeIndex={activeIndex} verseKey={`${surahNumber}:${selectedAyah + 1}`} />
          </section>
        ) : null)}

        {show.translation && (
          <section className="section">
            <div className="section-head"><h2 className="section-title">ترجمہ</h2></div>
            <p className="urdu">{analysis?.translationUrdu || edition.urdu?.ayahs?.[selectedAyah]?.text || '…'}</p>
            <p className="english">{analysis?.translationEnglish || eng}</p>
          </section>
        )}

        {show.tafseer && (
          <section className="section" id="tafseer">
            <div className="section-head"><h2 className="section-title">تفسیر</h2></div>
            {analysis?.tafsirUrdu ? (
              <>
                <div className="copy"><ExpandableText text={analysis.tafsirUrdu} /></div>
                {analysis?.tafsirSource && <p className="muted" dir="rtl">– {analysis.tafsirSource} –</p>}
              </>
            ) : analysisLoading ? (
              <p className="muted" dir="rtl">تفسیر تیار ہو رہی ہے…</p>
            ) : (
              <p className="muted" dir="rtl">تفسیر فی الحال دستیاب نہیں۔</p>
            )}
            <TafsirSources sources={analysis?.tafsirSources || []} excludeAuthor={analysis?.tafsirSource} />
          </section>
        )}

        {show.tafseer && (
          <section className="section" id="shan-nuzool">
            <div className="section-head"><h2 className="section-title">شان نزول</h2></div>
            {analysis?.shanNuzool ? (
              <div className="copy"><ExpandableText text={analysis.shanNuzool} /></div>
            ) : analysisLoading ? (
              <p className="muted" dir="rtl">شان نزول تیار ہو رہا ہے…</p>
            ) : currentSurah?.revelationType ? (
              <p className="copy" dir="rtl">
                یہ سورہ {currentSurah.revelationType === 'Meccan' ? 'مکی' : 'مدنی'} ہے —
                {currentSurah.revelationType === 'Meccan'
                  ? ' اس کی نزول مکہ مکرمہ میں ہوئی، نبوت کے ابتدائی دور میں۔'
                  : ' اس کی نزول مدینہ منورہ میں ہوئی، ہجرت کے بعد۔'}
              </p>
            ) : (
              <p className="muted" dir="rtl">شان نزول فی الحال دستیاب نہیں۔</p>
            )}
          </section>
        )}

        {show.hadith && (
          <section className="section">
            <div className="section-head"><h2 className="section-title">متعلقہ احادیث</h2></div>
            <HadithCard hadiths={hadiths} loading={analysisLoading && !hadiths.length} />
          </section>
        )}

        <section className="section">
          <div className="section-head"><h2 className="section-title">متعلقہ آیات</h2></div>
          <RelatedAyahs
            verseKey={`${surahNumber}:${selectedAyah + 1}`}
            verseText={verse.text}
            translationUrdu={analysis?.translationUrdu || edition.urdu?.ayahs?.[selectedAyah]?.text}
            translationEnglish={eng}
          />
        </section>
      </main>

      <PracticeModal
        open={practiceOpen}
        onOpenChange={setPracticeOpen}
        verseKey={`${surahNumber}:${selectedAyah + 1}`}
        verseText={verse.text}
        words={words}
        referenceAudioUrl={edition.audio?.ayahs?.[selectedAyah]?.audio}
      />

      <audio ref={audioRef} />
    </div>
  );
}