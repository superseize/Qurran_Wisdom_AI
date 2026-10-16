import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Newspaper, ExternalLink, Loader2, BookOpen, Calendar } from 'lucide-react';
import { backend } from '@/api/backend';

export const CATEGORIES = [
  { id: 'science', label: 'سائنس اور قرآن' },
  { id: 'tafsir', label: 'تفسیری مطالعہ' },
  { id: 'history', label: 'تاریخ و آثار' },
  { id: 'other', label: 'دیگر' },
];
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('ur-PK') : '');
const refLabel = (r) => (r.to ? `${r.surah}:${r.ayah}-${r.to}` : `${r.surah}:${r.ayah}`);

export default function Articles() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    backend.entities.Article.filter({ status: 'published' }, '-published_at', 200).then(setRows).catch(() => setRows([]));
  }, []);

  const shown = (rows || []).filter((a) => cat === 'all' || a.category === cat);
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-lg font-semibold flex items-center gap-2"><Newspaper className="w-5 h-5 text-primary" /> تحقیقی مضامین</h1>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4" dir="rtl">قرآنی آیات سے متعلق سائنسی، تفسیری اور تاریخی تحقیق۔ یہ مضامین انسانی تحقیق ہیں، نصِ شرعی نہیں؛ AI انہیں قرآن و حدیث کے ساتھ الگ سے بطور معاون حوالہ استعمال کرتا ہے۔</p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" dir="rtl">
        {[{ id: 'all', label: 'سب' }, ...CATEGORIES].map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${cat === c.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground'}`}>{c.label}</button>
        ))}
      </div>

      {rows === null && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
      {rows && shown.length === 0 && <p className="text-center text-sm text-muted-foreground py-10" dir="rtl">ابھی کوئی مضمون شائع نہیں ہوا۔</p>}
      <div className="space-y-3">
        {shown.map((a) => (
          <Link key={a.id} to={`/articles/${a.id}`} className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary" dir="rtl">{catLabel(a.category)}</span>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{fmt(a.published_at || a.created_date)}</span>
            </div>
            <h2 className="text-base font-semibold text-foreground leading-snug" dir="auto">{a.title}</h2>
            {a.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-3 leading-relaxed" dir="auto">{a.summary}</p>}
            {a.ayah_refs?.length > 0 && <p className="text-[11px] text-primary mt-2 tabular-nums" dir="ltr">{a.ayah_refs.slice(0, 5).map(refLabel).join(' · ')}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [a, setA] = useState(undefined);
  const [verses, setVerses] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const art = await backend.entities.Article.get(id);
        if (cancelled) return;
        setA(art);
        const out = [];
        for (const r of art.ayah_refs || []) {
          const to = Number(r.to || r.ayah);
          for (let n = Number(r.ayah); n <= to && n - Number(r.ayah) < 10; n++) {
            const [ay, tr] = await Promise.all([
              backend.entities.Ayah.filter({ surah: Number(r.surah), ayah: n }, null, 1),
              backend.entities.Translation.filter({ surah: Number(r.surah), ayah: n, language: 'ur' }, null, 1),
            ]);
            if (ay[0]) out.push({ surah: Number(r.surah), ayah: n, arabic: ay[0].text_uthmani, urdu: tr[0]?.text || '' });
          }
        }
        if (!cancelled) setVerses(out);
      } catch { if (!cancelled) setA(null); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (a === undefined) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (a === null) return <p className="text-center text-sm text-muted-foreground py-20" dir="rtl">مضمون نہیں ملا۔</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      <button onClick={() => navigate('/articles')} className="p-2 -ml-2 text-foreground mb-2"><ArrowLeft className="w-5 h-5" /></button>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary" dir="rtl">{catLabel(a.category)}</span>
      <h1 className="text-xl font-bold text-foreground leading-snug mt-2" dir="auto">{a.title}</h1>
      <p className="text-[11px] text-muted-foreground mt-1">{a.author_name ? `${a.author_name} · ` : ''}{fmt(a.published_at || a.created_date)}{a.status === 'draft' ? ' · مسودہ' : ''}</p>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 mt-3 text-[11px] text-foreground/80" dir="rtl">یہ مضمون انسانی تحقیق ہے، نصِ شرعی نہیں۔ قرآن و حدیث کا فیصلہ ہر حال میں مقدم ہے۔</div>

      {verses.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5" dir="rtl"><BookOpen className="w-3.5 h-3.5" /> متعلقہ آیات</p>
          {verses.map((v) => (
            <Link key={`${v.surah}:${v.ayah}`} to={`/reader/${v.surah}?ayah=${v.ayah}`} className="block rounded-xl border border-primary/30 bg-card p-3">
              <p className="font-quran text-2xl text-right leading-[2]" dir="rtl">{v.arabic}</p>
              {v.urdu && <p className="text-sm font-urdu text-foreground/80 text-right leading-relaxed mt-1" dir="rtl">{v.urdu}</p>}
              <p className="text-[11px] text-primary mt-1 tabular-nums" dir="ltr">{v.surah}:{v.ayah}</p>
            </Link>
          ))}
        </div>
      )}

      <article dir="auto" className="prose prose-sm prose-invert max-w-none mt-5 text-foreground/90 leading-relaxed space-y-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_blockquote]:border-s-2 [&_blockquote]:border-primary/40 [&_blockquote]:ps-3">
        <ReactMarkdown>{a.body}</ReactMarkdown>
      </article>

      {a.source_links?.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold mb-2" dir="rtl">ماخذ اور روابط</p>
          <ul className="space-y-1.5">
            {a.source_links.map((l, i) => (
              <li key={i}><a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary underline"><ExternalLink className="w-3.5 h-3.5" /> {l.title || l.url}</a></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
