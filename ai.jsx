import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ScrollText, FileText, Sparkles, Link2, ChevronLeft, Newspaper, ExternalLink, Network, X, BookmarkPlus, Check, Loader2, Tag, Folder, FolderPlus, StickyNote, ShieldCheck, ShieldAlert, Ban, HeartHandshake, Trash2 } from 'lucide-react';
import { getSurahVerses, TOPICS, detectTopics } from '@/lib/quran';
import { CONCEPT_RELATIONS } from '@/lib/data';
import { THEOLOGICAL_TAGS, parseTags, joinTags, getCollections, createCollection, createNote } from '@/lib/stores';
import ReactMarkdown from 'react-markdown';

// ───────── components/ai/UnifiedEvidence.jsx ─────────
function parseRef(ref) {
  const m = String(ref || '').match(/^(\d+):(\d+)/);
  return m ? { surah: parseInt(m[1]), ayah: parseInt(m[2]) } : null;
}

function refKey(r) {
  const p = parseRef(r);
  return p ? `${p.surah}:${p.ayah}` : null;
}

// One Quran cluster: Arabic verse + Urdu + English + connection links
function QuranCluster({ item, verse: fetched }) {
  const ref = item.reference || '';
  // Evidence verified against our database already carries the verse text; the API lookup is only a fallback.
  const verse = item.arabic ? { arabic: item.arabic, urdu: item.text, english: item.english } : fetched;
  const p = parseRef(ref);
  const to = p ? `/reader/${p.surah}?ayah=${p.ayah}` : null;

  return (
    <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-br from-[rgba(25,62,47,0.55)] to-card/70 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-primary/12 border-b border-primary/25">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
          <BookOpen className="w-3.5 h-3.5" /> قرآن
        </span>
        {to ? (
          <Link to={to} className="inline-flex items-center gap-0.5 text-[11px] font-mono text-primary hover:underline tabular-nums" dir="ltr">
            {ref} <ChevronLeft className="w-3 h-3" />
          </Link>
        ) : (
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums" dir="ltr">{ref}</span>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Arabic verse */}
        {verse?.arabic && (
          <p className="font-quran text-[22px] leading-[2] text-right text-[#f3e8c8]" dir="rtl">
            {verse.arabic}
          </p>
        )}

        {/* Urdu translation */}
        {verse?.urdu && (
          <p className="font-urdu text-[15px] leading-[1.9] text-right text-foreground/85" dir="rtl">
            {verse.urdu}
          </p>
        )}

        {/* English / evidence text */}
        {(item.arabic ? item.english : item.text) && (
          <p dir="auto" className="text-[13px] leading-relaxed text-foreground/70 border-t border-border/50 pt-2.5">
            {item.arabic ? item.english : item.text}
          </p>
        )}

        {/* Connection link */}
        {(item.relevance || item.connection) && (
          <div className="flex items-start gap-1.5 pt-1">
            <Link2 className="w-3 h-3 text-accent mt-1 shrink-0" />
            <div className="space-y-0.5">
              {item.relevance && (
                <p dir="rtl" className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-accent/80 font-medium">وجہ تطابق: </span>{item.relevance}
                </p>
              )}
              {item.connection && (
                <p dir="rtl" className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-accent/80 font-medium">ربط: </span>{item.connection}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hadith card with connector
function HadithLinked({ item, index }) {
  return (
    <div className="relative rounded-xl border border-secondary/60 bg-card/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-secondary/15 border-b border-secondary/30">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-secondary-foreground">
          <ScrollText className="w-3.5 h-3.5" /> حدیث
        </span>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums" dir="auto">{item.reference || ''}{item.grade ? ` · ${item.grade}` : ''}</span>
      </div>
      <div className="px-3.5 py-3 space-y-2">
        <p dir="rtl" className="font-urdu text-[14px] leading-[1.85] text-right text-foreground/85">
          {item.text}
        </p>
        {(item.relevance || item.connection) && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-border/40">
            <Link2 className="w-3 h-3 text-accent mt-1 shrink-0" />
            <div className="space-y-0.5">
              {item.relevance && (
                <p dir="rtl" className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-accent/80 font-medium">وجہ تطابق: </span>{item.relevance}
                </p>
              )}
              {item.connection && (
                <p dir="rtl" className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-accent/80 font-medium">ربط: </span>{item.connection}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleLinked({ item }) {
  return (
    <div className="rounded-xl border border-sky-400/30 bg-sky-400/5 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-400"><Newspaper className="w-3.5 h-3.5" /> تحقیقی مضمون</span>
        <span className="text-[10px] text-muted-foreground" dir="rtl">انسانی تحقیق — نصِ شرعی نہیں</span>
      </div>
      <p dir="auto" className="text-sm font-semibold text-foreground mb-1">{item.reference}</p>
      <p dir="auto" className="text-[13px] leading-relaxed text-foreground/75">{item.text}</p>
      {(item.relevance || item.connection) && <p dir="rtl" className="text-[11px] text-muted-foreground mt-1.5">{item.relevance || item.connection}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {item.url && <Link to={item.url} className="text-[11px] text-sky-400 underline">مکمل مضمون پڑھیں</Link>}
        {(item.links || []).slice(0, 3).map((l, i) => (
          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline"><ExternalLink className="w-3 h-3" />{l.title || 'ماخذ'}</a>
        ))}
      </div>
    </div>
  );
}

function TafsirLinked({ item }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-bold text-muted-foreground">تفسیر · {item.reference || ''}</span>
      </div>
      <p dir="auto" className="text-[13px] leading-relaxed text-foreground/75">{item.text}</p>
    </div>
  );
}

function InsightLinked({ item }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/8 px-3.5 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] font-bold text-accent">AI تجزیہ</span>
      </div>
      <p dir="auto" className="text-[13px] leading-relaxed text-foreground/75">{item.text}</p>
    </div>
  );
}

export function UnifiedEvidence({ evidence }) {
  const [verseData, setVerseData] = useState({});
  const [loaded, setLoaded] = useState(false);

  const quranItems = evidence.filter(e => e.type === 'quran');
  const hadithItems = evidence.filter(e => e.type === 'hadith');
  const tafsirItems = evidence.filter(e => e.type === 'tafsir');
  const articleItems = evidence.filter(e => e.type === 'article');
  const insightItems = evidence.filter(e => e.type === 'ai_insight');

  useEffect(() => {
    let active = true;
    (async () => {
      const surahs = new Set();
      for (const e of quranItems.filter((x) => !x.arabic)) {
        const p = parseRef(e.reference);
        if (p) surahs.add(p.surah);
      }
      const map = {};
      await Promise.all([...surahs].map(async (s) => {
        try {
          const verses = await getSurahVerses(s);
          for (const v of verses) {
            map[`${v.surah}:${v.ayah}`] = {
              arabic: v.text_uthmani,
              urdu: v.translation_urdu,
              english: v.translation_english,
            };
          }
        } catch {}
      }));
      if (active) {
        setVerseData(map);
        setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [evidence]);

  if (evidence.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Topic header */}
      <div className="flex items-center gap-2 pb-1">
        <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/70">متعلقہ دلائل</span>
        <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
      </div>

      {/* Quran clusters — Arabic + Urdu + English */}
      {quranItems.length > 0 && (
        <div className="space-y-3">
          {quranItems.map((item, i) => (
            <QuranCluster
              key={`q-${i}`}
              item={item}
              verse={verseData[refKey(item.reference)] || null}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Connector between Quran and Hadith */}
      {quranItems.length > 0 && hadithItems.length > 0 && (
        <div className="flex justify-center py-1">
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-4 bg-primary/30" />
            <Link2 className="w-3.5 h-3.5 text-primary/50" />
            <div className="w-px h-4 bg-primary/30" />
          </div>
        </div>
      )}

      {/* Hadith section */}
      {hadithItems.length > 0 && (
        <div className="space-y-2">
          {hadithItems.map((item, i) => (
            <HadithLinked key={`h-${i}`} item={item} index={i} />
          ))}
        </div>
      )}

      {/* Tafsir section */}
      {tafsirItems.length > 0 && (
        <div className="space-y-2 pt-1">
          {tafsirItems.map((item, i) => (
            <TafsirLinked key={`t-${i}`} item={item} />
          ))}
        </div>
      )}

      {/* Research articles (human work, shown separately from scripture) */}
      {articleItems.length > 0 && (
        <div className="space-y-2 pt-1">
          {articleItems.map((item, i) => (
            <ArticleLinked key={`ar-${i}`} item={item} />
          ))}
        </div>
      )}

      {/* AI insight section */}
      {insightItems.length > 0 && (
        <div className="space-y-2 pt-1">
          {insightItems.map((item, i) => (
            <InsightLinked key={`a-${i}`} item={item} />
          ))}
        </div>
      )}

      {/* Loading indicator for verse data */}
      {!loaded && quranItems.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground py-1" dir="rtl">آیات کا عربی متن لوڈ ہو رہا ہے…</p>
      )}
    </div>
  );
}

// ───────── components/ai/ConceptMap.jsx ─────────
const TYPE_STYLE = {
  quran:      { icon: BookOpen,   label: 'قرآن',   color: '#d4af37', cls: 'border-primary/45 bg-primary/12 text-primary' },
  hadith:     { icon: ScrollText, label: 'حدیث',   color: '#6aa88a', cls: 'border-secondary/50 bg-secondary/25 text-secondary-foreground' },
  tafsir:     { icon: FileText,   label: 'تفسیر',  color: '#9aaaa0', cls: 'border-border bg-muted/30 text-muted-foreground' },
  ai_insight: { icon: Sparkles,   label: 'AI',     color: '#c5a059', cls: 'border-accent/40 bg-accent/12 text-accent' },
};

function shortRef(ref, type) {
  const r = String(ref || '');
  if (type === 'quran') return r;
  return r.length > 22 ? r.slice(0, 22) + '…' : r;
}

function parseQuranRefForLink(ref) {
  const m = String(ref || '').match(/^(\d+):(\d+)/);
  return m ? { surah: parseInt(m[1]), ayah: parseInt(m[2]) } : null;
}

// Extract Quran refs (e.g. "24:30") mentioned inside free-text connection fields
function extractQuranRefs(text) {
  const matches = String(text || '').match(/\b(\d{1,3}):(\d{1,3})\b/g);
  return matches ? matches.map(m => m.replace(/\s+/g, '')) : [];
}

export function ConceptMap({ question, evidence }) {
  const containerRef = useRef(null);
  const conceptRef = useRef(null);
  const nodeRefs = useRef([]);
  const [edges, setEdges] = useState([]);       // concept → evidence
  const [crossEdges, setCrossEdges] = useState([]); // evidence ↔ evidence
  const [selected, setSelected] = useState(null);
  const [tick, setTick] = useState(0);

  const items = useMemo(
    () => (evidence || []).filter(e => e && e.type && e.reference).slice(0, 8),
    [evidence]
  );

  // Detect cross-links: non-Quran evidence whose connection mentions a Quran ref that's also in evidence
  const crossLinks = useMemo(() => {
    const links = [];
    const quranNodes = items.map((it, i) => ({ i, ref: it.reference })).filter(n => n.ref);
    items.forEach((item, i) => {
      if (item.type === 'quran') return;
      for (const ref of extractQuranRefs(item.connection || '')) {
        const match = quranNodes.find(q => q.ref === ref);
        if (match && match.i !== i) links.push({ from: i, to: match.i });
      }
    });
    return links;
  }, [items]);

  useEffect(() => {
    const onResize = () => setTick(t => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const concept = conceptRef.current;
    if (!container || !concept || items.length === 0) {
      setEdges([]);
      setCrossEdges([]);
      return;
    }
    const cRect = container.getBoundingClientRect();
    const kRect = concept.getBoundingClientRect();
    const cx = kRect.left + kRect.width / 2 - cRect.left;
    const cy = kRect.bottom - cRect.top;

    // concept → evidence edges
    const next = [];
    items.forEach((item, i) => {
      const el = nodeRefs.current[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = r.left + r.width / 2 - cRect.left;
      const ny = r.top - cRect.top;
      const midY = (cy + ny) / 2;
      next.push({
        d: `M ${cx} ${cy} C ${cx} ${midY}, ${nx} ${midY}, ${nx} ${ny}`,
        color: TYPE_STYLE[item.type]?.color || '#d4af37',
      });
    });
    setEdges(next);

    // cross edges between evidence nodes
    const xPaths = [];
    crossLinks.forEach(({ from, to }) => {
      const elA = nodeRefs.current[from];
      const elB = nodeRefs.current[to];
      if (!elA || !elB) return;
      const rA = elA.getBoundingClientRect();
      const rB = elB.getBoundingClientRect();
      const ax = rA.left + rA.width / 2 - cRect.left;
      const ay = rA.top + rA.height / 2 - cRect.top;
      const bx = rB.left + rB.width / 2 - cRect.left;
      const by = rB.top + rB.height / 2 - cRect.top;
      xPaths.push({
        d: `M ${ax} ${ay} Q ${(ax + bx) / 2} ${Math.min(ay, by) - 18}, ${bx} ${by}`,
        from, to,
      });
    });
    setCrossEdges(xPaths);
  }, [items.length, crossLinks.length, tick, question]);

  if (items.length < 2) return null;

  const conceptLabel = question
    ? (question.length > 60 ? question.slice(0, 60) + '…' : question)
    : 'موضوع';

  const selItem = selected !== null ? items[selected] : null;
  const selStyle = selItem ? (TYPE_STYLE[selItem.type] || TYPE_STYLE.ai_insight) : null;
  const SelIcon = selStyle?.icon;
  const selQuranLink = selItem?.type === 'quran' ? parseQuranRefForLink(selItem.reference) : null;
  const isEdgeActive = (idx) => selected === null || selected === idx;
  const isCrossActive = (ce) => selected === null || selected === ce.from || selected === ce.to;

  return (
    <div className="my-3 animate-rise">
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70" dir="rtl">تصوراتی نقشہ</span>
      </div>
      <div ref={containerRef} className="relative rounded-2xl border border-border bg-gradient-to-b from-card/60 to-secondary/20 p-4 overflow-hidden">
        {/* SVG edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {edges.map((e, i) => (
            <path
              key={`e-${i}`}
              d={e.d}
              fill="none"
              stroke={e.color}
              strokeWidth={isEdgeActive(i) ? 2 : 1}
              strokeOpacity={isEdgeActive(i) ? 0.6 : 0.12}
              strokeDasharray={isEdgeActive(i) ? 'none' : '4 3'}
            />
          ))}
          {crossEdges.map((ce, i) => (
            <path
              key={`x-${i}`}
              d={ce.d}
              fill="none"
              stroke="#d4af37"
              strokeWidth={1.2}
              strokeOpacity={isCrossActive(ce) ? 0.45 : 0.08}
              strokeDasharray="2 3"
            />
          ))}
        </svg>

        {/* Concept node */}
        <div className="relative flex justify-center" style={{ zIndex: 1 }}>
          <div
            ref={conceptRef}
            className="max-w-[88%] px-4 py-2.5 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-center shadow-lg"
          >
            <span className="text-xs font-bold leading-snug" dir="auto">{conceptLabel}</span>
          </div>
        </div>

        {/* Evidence nodes */}
        <div className="relative flex flex-wrap gap-2 justify-center mt-7" style={{ zIndex: 1 }}>
          {items.map((item, i) => {
            const s = TYPE_STYLE[item.type] || TYPE_STYLE.ai_insight;
            const Icon = s.icon;
            const isSel = selected === i;
            return (
              <button
                key={i}
                ref={el => { nodeRefs.current[i] = el; }}
                onClick={() => setSelected(isSel ? null : i)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${s.cls} ${
                  isSel ? 'scale-105 shadow-md ring-1 ring-accent/40' : 'opacity-85 hover:opacity-100'
                }`}
                dir="ltr"
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="tabular-nums">{shortRef(item.reference, item.type)}</span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="relative flex flex-wrap gap-x-3 gap-y-1 justify-center mt-3 pt-2 border-t border-border/40" style={{ zIndex: 1 }}>
          {Object.values(TYPE_STYLE).filter(s => items.some(it => (TYPE_STYLE[it.type]?.label) === s.label)).map(s => {
            const Icon = s.icon;
            return (
              <span key={s.label} className="inline-flex items-center gap-1 text-[9px] text-muted-foreground" dir="rtl">
                <Icon className="w-2.5 h-2.5" style={{ color: s.color }} />
                {s.label}
              </span>
            );
          })}
          {crossEdges.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground" dir="rtl">
              <span className="w-3 h-px border-t border-dashed border-primary/50" /> باہمی ربط
            </span>
          )}
        </div>

        {/* Detail panel for selected node */}
        {selItem && SelIcon && (
          <div className="relative mt-3 rounded-xl border border-accent/30 bg-accent/8 p-3" style={{ zIndex: 1 }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <SelIcon className="w-3.5 h-3.5" style={{ color: selStyle.color }} />
              <span className="text-[11px] font-bold" style={{ color: selStyle.color }} dir="rtl">
                {selStyle.label} · {selItem.reference}
              </span>
              <button onClick={() => setSelected(null)} className="ml-auto text-muted-foreground hover:text-foreground p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
            {selItem.relevance && (
              <p className="text-[11px] text-foreground/75 leading-relaxed mb-1" dir="rtl">
                <span className="text-accent/80 font-medium">وجہ تطابق: </span>{selItem.relevance}
              </p>
            )}
            {selItem.connection && (
              <p className="text-[11px] text-foreground/75 leading-relaxed" dir="rtl">
                <span className="text-accent/80 font-medium">ربط: </span>{selItem.connection}
              </p>
            )}
            {selQuranLink && (
              <Link
                to={`/reader/${selQuranLink.surah}?ayah=${selQuranLink.ayah}`}
                className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline mt-1.5"
                dir="rtl"
              >
                Reader میں دیکھیں <ChevronLeft className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── components/ai/ConceptRelationMap.jsx ─────────
export function ConceptRelationMap({ question }) {
  const mainTopic = useMemo(() => {
    if (!question) return null;
    const detected = detectTopics(question, question, 1);
    return detected[0] || null;
  }, [question]);

  const related = useMemo(() => {
    if (!mainTopic) return [];
    const rels = CONCEPT_RELATIONS[mainTopic.id] || [];
    return rels.map(r => {
      const topic = TOPICS.find(t => t.id === r.id);
      return { ...r, topicLabel: topic?.label || r.id };
    }).filter(r => r.topicLabel);
  }, [mainTopic]);

  if (!mainTopic || related.length < 2) return null;

  // Radial layout — main concept at center, related concepts around it
  const centerX = 50;
  const centerY = 50;
  const radiusX = 37;
  const radiusY = 35;
  const positions = related.map((r, i) => {
    const angle = (i * 2 * Math.PI) / related.length - Math.PI / 2;
    return {
      ...r,
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle),
    };
  });

  const labelColor = (label) => {
    if (label === 'ضد') return '#e0685a';
    if (label === 'بنیاد') return '#d4af37';
    if (label === 'نتیجہ') return '#6aa88a';
    return '#8a9a8e';
  };

  return (
    <div className="my-3 animate-rise">
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70" dir="rtl">تصورات کا باہمی ربط</span>
      </div>
      <div className="relative w-full rounded-2xl border border-border bg-gradient-to-b from-card/60 to-secondary/20 overflow-hidden" style={{ height: '260px' }}>
        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          {positions.map((p, i) => (
            <line
              key={i}
              x1="50%" y1="50%"
              x2={`${p.x}%`} y2={`${p.y}%`}
              stroke={labelColor(p.label)}
              strokeWidth="1.5"
              strokeOpacity="0.4"
              strokeDasharray={p.label === 'ضد' ? '2 3' : '5 3'}
            />
          ))}
        </svg>

        {/* Center node — main concept */}
        <div
          className="absolute"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}
        >
          <div className="px-4 py-2.5 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-center shadow-lg whitespace-nowrap">
            <span className="text-xs font-bold" dir="rtl">{mainTopic.label}</span>
          </div>
        </div>

        {/* Related concept nodes */}
        {positions.map((p, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)', zIndex: 2 }}
          >
            <div className="px-2.5 py-1.5 rounded-xl border bg-card text-center shadow-sm min-w-[68px]" style={{ borderColor: labelColor(p.label) + '55' }}>
              <span className="text-[11px] font-medium text-foreground block" dir="rtl">{p.topicLabel}</span>
              <span className="text-[9px] font-semibold" dir="rtl" style={{ color: labelColor(p.label) }}>{p.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1.5 px-2">
        {[
          { label: 'بنیاد', color: '#d4af37' },
          { label: 'نتیجہ', color: '#6aa88a' },
          { label: 'متعلق', color: '#8a9a8e' },
          { label: 'ضد', color: '#e0685a' },
        ].map(l => (
          <span key={l.label} className="inline-flex items-center gap-1 text-[9px] text-muted-foreground" dir="rtl">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────── components/notebook/SaveToNotebook.jsx ─────────
// Reusable "Save to Notebook" button with collection picker, tag picker, and notes.
// Props: itemType ('verse'|'hadith'|'insight'), citation, content, sourceRef, tags (optional), defaultTags (optional array)
export function SaveToNotebook({ itemType, citation, content, sourceRef, tags, defaultTags, className = '', label }) {
  const [state, setState] = useState('idle'); // idle | saving | saved | error
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTags, setSelectedTags] = useState(defaultTags || []);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [noteText, setNoteText] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Load collections when picker opens
  useEffect(() => {
    if (showPicker) {
      getCollections()
        .then(rows => setCollections(rows || []))
        .catch(() => setCollections([]));
    }
  }, [showPicker]);

  const toggleTag = (id) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || creatingCollection) return;
    setCreatingCollection(true);
    try {
      const c = await createCollection({ name: newCollectionName.trim(), color: 'gold' });
      setCollections(prev => [...prev, c]);
      setSelectedCollection(c.id);
      setNewCollectionName('');
    } catch {} finally {
      setCreatingCollection(false);
    }
  };

  const save = async () => {
    if (state === 'saving') return;
    setState('saving');
    try {
      const existing = parseTags(tags);
      const allTags = [...new Set([...existing, ...selectedTags])];
      await createNote({
        item_type: itemType,
        citation,
        content,
        source_ref: sourceRef || '',
        tags: joinTags(allTags),
        notes: noteText.trim(),
        collection_id: selectedCollection || '',
      });
      setState('saved');
      setShowPicker(false);
      setTimeout(() => { setState('idle'); setSelectedTags(defaultTags || []); setNoteText(''); setSelectedCollection(''); }, 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  const icon = state === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
    : state === 'saved' ? <Check className="w-3.5 h-3.5" />
    : <BookmarkPlus className="w-3.5 h-3.5" />;

  const text = label || (state === 'saving' ? 'محفوظ ہو رہا ہے…'
    : state === 'saved' ? 'محفوظ ہو گیا'
    : state === 'error' ? 'ناکام — دوبارہ کوشش'
    : 'نوٹ بک میں محفوظ کریں');

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => state === 'idle' && setShowPicker(s => !s)}
        disabled={state === 'saving'}
        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all active:translate-y-0.5 disabled:opacity-60 ${
          state === 'saved'
            ? 'border-primary/50 bg-primary/15 text-primary'
            : state === 'error'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:border-primary/40'
        }`}
      >
        {icon}
        <span dir="rtl">{text}</span>
      </button>

      {/* Picker popover */}
      {showPicker && state !== 'saved' && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute z-50 mt-2 right-0 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl p-3 space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                <BookmarkPlus className="w-3 h-3" /> نوٹ بک میں محفوظ کریں
              </span>
              <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collection selector */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground" dir="rtl">
                <Folder className="w-3 h-3" /> فولڈر منتخب کریں
              </span>
              <select
                value={selectedCollection}
                onChange={e => setSelectedCollection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                dir="rtl"
              >
                <option value="">— بغیر فولڈر —</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {/* Quick create new collection */}
              <div className="flex gap-1.5">
                <input
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  placeholder="نیا فولڈر بنائیں…"
                  dir="rtl"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || creatingCollection}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 disabled:opacity-50"
                  dir="rtl"
                >
                  {creatingCollection ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderPlus className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Personal note */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground" dir="rtl">
                <StickyNote className="w-3 h-3" /> آپ کا نوٹ
              </span>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="یہاں اپنا نوٹ لکھیں…"
                dir="rtl"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground" dir="rtl">
                <Tag className="w-3 h-3" /> نظریاتی موضوعات
              </span>
              <div className="flex flex-wrap gap-1.5">
                {THEOLOGICAL_TAGS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      selectedTags.includes(t.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40'
                    }`}
                    dir="rtl"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={save}
              disabled={state === 'saving'}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {state === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              <span dir="rtl">{state === 'saving' ? 'محفوظ ہو رہا ہے…' : 'محفوظ کریں'}</span>
            </button>
            {state === 'error' && (
              <p className="text-[10px] text-destructive text-center" dir="rtl">ناکام — دوبارہ کوشش کریں</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ───────── components/ai/AnswerView.jsx ─────────
// Plain-text version of an answer (used for Copy and Listen).
export function answerToText(answer) {
  if (!answer) return '';
  const lines = [answer.summary || ''];
  const ev = Array.isArray(answer.evidence) ? answer.evidence : [];
  if (ev.length) lines.push('', 'حوالہ جات:', ...ev.map((e) => `• ${e.reference || ''}${e.text ? ` — ${e.text}` : ''}`));
  if (answer.call_to_action) lines.push('', answer.call_to_action);
  return lines.join('\n').trim();
}

export function AnswerView({ answer, question, onFollowup }) {
  if (!answer) return null;
  const verified = answer.verified !== false;
  const evidence = Array.isArray(answer.evidence) ? answer.evidence : [];
  const followups = Array.isArray(answer.suggested_followups) ? answer.suggested_followups : [];
  const terms = Array.isArray(answer.terms) ? answer.terms : [];
  const plain = answer.kind === 'refusal' || answer.kind === 'greeting';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {answer.kind === 'refusal' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Ban className="w-3.5 h-3.5" /> دائرہ کار سے باہر سوال</span>
        ) : answer.kind === 'greeting' ? <span /> : verified ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><ShieldCheck className="w-3.5 h-3.5" /> تصدیق شدہ جواب — صرف حاصل شدہ حوالوں پر مبنی</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive"><ShieldAlert className="w-3.5 h-3.5" /> تصدیق نہیں ہو سکا</span>
        )}
        {!plain && <SaveToNotebook itemType="insight" citation="Quran Wisdom AI — تجزیہ" content={answerToText(answer)} sourceRef="ai-insight" />}
      </div>

      {!plain && answer.stats && (
        <p className="text-[11px] text-muted-foreground" dir="rtl">
          تلاش کے نتائج: {answer.stats.quran} آیات · {answer.stats.hadith} احادیث · {answer.stats.tafsir} تفسیری اقتباسات{answer.stats.articles ? ` · ${answer.stats.articles} تحقیقی مضامین` : ''}
        </p>
      )}

      <div dir="auto" className="text-sm leading-relaxed text-foreground/90 space-y-2">
        <ReactMarkdown>{answer.summary || ''}</ReactMarkdown>
      </div>

      {terms.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground" dir="rtl">قرآن میں اس موضوع کے متعلقہ الفاظ اور ان کے حوالے</p>
          <div className="space-y-1.5">
            {terms.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-quran text-lg text-primary">{t.ar}</span>
                {t.ur && <span className="font-urdu text-xs text-foreground/70">({t.ur})</span>}
                <span className="flex flex-wrap gap-1" dir="ltr">
                  {t.refs.map((r, j) => (
                    <Link key={j} to={`/reader/${r.surah}?ayah=${r.ayah}`} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary tabular-nums">{r.surah}:{r.ayah}</Link>
                  ))}
                  {t.total > t.refs.length && <span className="text-[10px] text-muted-foreground">+{t.total - t.refs.length}{t.capped ? '+' : ''}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!plain && <ConceptRelationMap question={question} />}
      {!plain && <ConceptMap question={question} evidence={evidence} />}

      {evidence.length > 0 && <UnifiedEvidence evidence={evidence} />}

      {answer.call_to_action && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex gap-2.5">
          <HeartHandshake className="w-4 h-4 text-primary shrink-0 mt-1" />
          <div className="space-y-2">
            <p dir="rtl" className="text-sm leading-relaxed text-foreground/90 font-urdu">{answer.call_to_action}</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/words" className="text-[11px] px-2.5 py-1 rounded-full bg-primary text-primary-foreground">روزانہ قرآنی الفاظ سیکھیں</Link>
              <Link to="/tutor" className="text-[11px] px-2.5 py-1 rounded-full border border-primary/40 text-primary">آواز والا استاد</Link>
            </div>
          </div>
        </div>
      )}

      {followups.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {followups.map((f, i) => (
            <button key={i} onClick={() => onFollowup?.(f)} dir="auto" className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">{f}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── components/ai/EvidenceCard.jsx ─────────
const STYLES = {
  quran: { border: 'border-primary/50', label: 'bg-primary text-primary-foreground', icon: BookOpen, labelTxt: 'قرآن · Quran' },
  hadith: { border: 'border-secondary', label: 'bg-secondary text-secondary-foreground', icon: ScrollText, labelTxt: 'حدیث · Hadith' },
  tafsir: { border: 'border-border', label: 'bg-muted text-muted-foreground', icon: FileText, labelTxt: 'تفسیر · Tafsir' },
  ai_insight: { border: 'border-accent/40', label: 'bg-accent/15 text-accent', icon: Sparkles, labelTxt: 'AI تجزیہ · Insight' },
};

export function EvidenceCard({ evidence }) {
  const s = STYLES[evidence.type] || STYLES.ai_insight;
  const Icon = s.icon;
  const ref = evidence.reference || '';

  let to = null;
  if (evidence.type === 'quran' && ref) {
    const surah = String(ref).split(':')[0];
    if (surah && /^\d+$/.test(surah)) to = `/reader/${surah}`;
  } else if (evidence.type === 'hadith') {
    to = '/hadith';
  }

  return (
    <div className={`rounded-xl border ${s.border} bg-card/60 p-3`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.label}`}>
          <Icon className="w-3 h-3" /> {s.labelTxt}
        </span>
        {ref && (
          to
            ? <Link to={to} className="text-[11px] font-mono text-primary underline-offset-2 hover:underline shrink-0">{ref}</Link>
            : <span className="text-[11px] font-mono text-muted-foreground shrink-0">{ref}</span>
        )}
      </div>
      <p dir="auto" className="text-sm leading-relaxed text-foreground/90 mb-2">{evidence.text}</p>
      {evidence.relevance && (
        <p dir="rtl" className="text-xs text-muted-foreground mb-1">
          <span className="text-foreground/70 font-medium">وجہ تطابق: </span>{evidence.relevance}
        </p>
      )}
      {evidence.connection && (
        <p dir="rtl" className="text-xs text-muted-foreground">
          <span className="text-foreground/70 font-medium">ربط: </span>{evidence.connection}
        </p>
      )}
    </div>
  );
}

// ───────── components/notebook/CollectionBar.jsx ─────────
// Color styles — literal Tailwind classes so they survive purge
export const COLLECTION_COLORS = [
  { id: 'gold',   label: 'سنہری',  dot: 'bg-primary',       active: 'border-primary bg-primary/15 text-primary' },
  { id: 'green',  label: 'سبز',    dot: 'bg-secondary',     active: 'border-secondary bg-secondary/30 text-secondary-foreground' },
  { id: 'teal',   label: 'نیلا',   dot: 'bg-emerald-500',  active: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' },
  { id: 'rose',   label: 'گلابی',  dot: 'bg-rose-500',      active: 'border-rose-500/50 bg-rose-500/15 text-rose-400' },
  { id: 'blue',   label: 'آسمانی', dot: 'bg-sky-500',       active: 'border-sky-500/50 bg-sky-500/15 text-sky-400' },
  { id: 'purple', label: 'بنفشی',  dot: 'bg-violet-500',    active: 'border-violet-500/50 bg-violet-500/15 text-violet-400' },
];

export const COLOR_MAP = Object.fromEntries(COLLECTION_COLORS.map(c => [c.id, c]));

export function CollectionBar({ collections, activeCollection, onSelect, onCreate, onDelete, noteCounts }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('gold');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim(), color });
      setName('');
      setDescription('');
      setColor('gold');
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (onDelete) await onDelete(id);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1" dir="rtl">
          <Folder className="w-3 h-3" /> مجموعے
        </span>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          dir="rtl"
        >
          <FolderPlus className="w-3 h-3" /> نیا فولڈر
        </button>
      </div>

      {showCreate && (
        <div className="mb-3 rounded-xl border border-border bg-card p-3 space-y-2.5 animate-rise">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="فولڈر کا نام…"
            dir="rtl"
            className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="تفصیل (اختیاری)…"
            dir="rtl"
            className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <div className="flex flex-wrap gap-2">
            {COLLECTION_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${c.dot} ${color === c.id ? 'border-foreground scale-110' : 'border-transparent'}`}
                aria-label={c.label}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || saving}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              dir="rtl"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
              {saving ? 'بن رہا ہے…' : 'فولڈر بنائیں'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Folder chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors ${
            activeCollection === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
          }`}
          dir="rtl"
        >
          <Folder className="w-3.5 h-3.5" /> تمام
          <span className="tabular-nums opacity-70">{noteCounts.all || 0}</span>
        </button>
        {collections.map(c => {
          const cm = COLOR_MAP[c.color] || COLOR_MAP.gold;
          const active = activeCollection === c.id;
          return (
            <div key={c.id} className="relative shrink-0">
              <button
                onClick={() => onSelect(active ? null : c.id)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 pr-7 rounded-xl border transition-colors ${
                  active ? cm.active : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
                dir="rtl"
              >
                <span className={`w-2 h-2 rounded-full ${cm.dot}`} />
                {c.name}
                <span className="tabular-nums opacity-70">{noteCounts[c.id] || 0}</span>
              </button>
              {active && (
                <button
                  onClick={(e) => handleDelete(e, c.id)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center hover:bg-destructive"
                  aria-label="Delete folder"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
