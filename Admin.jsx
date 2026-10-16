import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ShieldCheck, Inbox, Newspaper, Trash2, Pencil, Plus, Eye, EyeOff, Loader2, ExternalLink, Save, X } from 'lucide-react';
import { backend } from '@/api/backend';
import { useAuth } from '@/lib/app';
import { SURAHS } from '@/lib/data';
import { CATEGORIES } from '@/pages/Articles';

const STATUSES = [{ id: 'new', label: 'نیا' }, { id: 'seen', label: 'دیکھ لیا' }, { id: 'resolved', label: 'حل شدہ' }];
const TYPE_LABEL = { general: 'عام رائے / سوال', error: 'آیت یا ترجمے میں غلطی', suggestion: 'تجویز', other: 'دیگر' };
const fmt = (d) => (d ? new Date(d).toLocaleString('ur-PK') : '');

// "2:255, 112:1-4" → [{surah:2,ayah:255},{surah:112,ayah:1,to:4}]
export function parseAyahRefs(text) {
  const out = [];
  for (const part of String(text || '').split(/[,،\n]+/).map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^(\d{1,3})\s*:\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);
    if (!m) throw new Error(`غلط حوالہ: «${part}» — مثال: 2:255 یا 112:1-4`);
    const surah = Number(m[1]), ayah = Number(m[2]), to = m[3] ? Number(m[3]) : null;
    const meta = SURAHS[surah - 1];
    if (!meta || ayah < 1 || ayah > meta.ayahCount || (to && (to < ayah || to > meta.ayahCount))) throw new Error(`آیت موجود نہیں: ${part}`);
    out.push(to ? { surah, ayah, to } : { surah, ayah });
  }
  return out;
}
const refsToText = (refs) => (refs || []).map((r) => (r.to ? `${r.surah}:${r.ayah}-${r.to}` : `${r.surah}:${r.ayah}`)).join(', ');

function parseLinks(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const [a, b] = line.includes('|') ? line.split('|').map((x) => x.trim()) : ['', line];
    const url = b;
    if (!/^https?:\/\//i.test(url)) throw new Error(`لنک http:// یا https:// سے شروع ہونا چاہیے: ${line}`);
    return { title: a, url };
  });
}
const linksToText = (links) => (links || []).map((l) => `${l.title || ''} | ${l.url}`).join('\n');

// ───────────────────────── Feedback ─────────────────────────
function FeedbackTab() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');

  const load = useCallback(() => backend.entities.Feedback.list('-created_date', 500).then(setRows).catch((e) => { setErr(e.message); setRows([]); }), []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (r, status) => {
    await backend.entities.Feedback.update(r.id, { status });
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status } : x)));
  };
  const remove = async (r) => {
    if (!window.confirm('یہ فیڈ بیک حذف کریں؟')) return;
    await backend.entities.Feedback.delete(r.id);
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  };

  if (rows === null) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  const counts = Object.fromEntries(STATUSES.map((s) => [s.id, rows.filter((r) => (r.status || 'new') === s.id).length]));
  const shown = rows.filter((r) => filter === 'all' || (r.status || 'new') === filter);

  return (
    <div className="space-y-3">
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2 overflow-x-auto" dir="rtl">
        {[{ id: 'all', label: `سب (${rows.length})` }, ...STATUSES.map((s) => ({ id: s.id, label: `${s.label} (${counts[s.id]})` }))].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${filter === f.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>{f.label}</button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-center text-sm text-muted-foreground py-8" dir="rtl">کوئی فیڈ بیک نہیں۔</p>}
      {shown.map((r) => (
        <div key={r.id} className={`rounded-xl border p-3 space-y-2 ${(r.status || 'new') === 'new' ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate" dir="auto">{r.name || 'نام نہیں'}{r.email ? <span className="font-normal text-muted-foreground"> · {r.email}</span> : null}</p>
              <p className="text-[11px] text-muted-foreground">{fmt(r.created_date)} · {TYPE_LABEL[r.type] || r.type || '—'}{r.created_by_id ? ' · لاگ اِن صارف' : ' · مہمان'}</p>
            </div>
            <button onClick={() => remove(r)} className="p-1.5 text-muted-foreground hover:text-destructive shrink-0" aria-label="حذف"><Trash2 className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed" dir="auto">{r.message}</p>
          {r.screenshot_url && <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline"><ExternalLink className="w-3 h-3" /> اسکرین شاٹ</a>}
          <div className="flex gap-1.5 pt-1" dir="rtl">
            {STATUSES.map((s) => (
              <button key={s.id} onClick={() => setStatus(r, s.id)} className={`px-2.5 py-1 rounded-full text-[11px] border ${(r.status || 'new') === s.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>{s.label}</button>
            ))}
            {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent('Quran Wisdom AI — آپ کا فیڈ بیک')}`} className="px-2.5 py-1 rounded-full text-[11px] border border-border text-muted-foreground">جواب بھیجیں</a>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Articles ─────────────────────────
const EMPTY = { id: null, title: '', summary: '', category: 'science', author_name: '', body: '', refs: '', keywords: '', links: '', status: 'draft', published_at: null };

function ArticleEditor({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async (status) => {
    setErr('');
    if (!f.title.trim() || !f.body.trim()) { setErr('عنوان اور مضمون لازمی ہیں۔'); return; }
    let ayah_refs, source_links;
    try { ayah_refs = parseAyahRefs(f.refs); source_links = parseLinks(f.links); } catch (e) { setErr(e.message); return; }
    setBusy(true);
    try {
      const payload = {
        title: f.title.trim(), summary: f.summary.trim() || null, category: f.category, author_name: f.author_name.trim() || null,
        body: f.body, ayah_refs, keywords: f.keywords.trim() || null, source_links, status,
        published_at: status === 'published' ? (f.published_at || new Date().toISOString()) : f.published_at,
      };
      if (f.id) await backend.entities.Article.update(f.id, payload);
      else await backend.entities.Article.create(payload);
      onSaved();
    } catch (e) { setErr(e.message || 'محفوظ نہیں ہو سکا'); }
    setBusy(false);
  };

  const input = 'w-full px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm" dir="rtl">{f.id ? 'مضمون میں ترمیم' : 'نیا مضمون'}</h3>
        <button onClick={onClose} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <input className={input} placeholder="عنوان *" value={f.title} onChange={set('title')} dir="auto" />
      <textarea className={input} rows={2} placeholder="مختصر خلاصہ (AI اور فہرست میں دکھایا جاتا ہے)" value={f.summary} onChange={set('summary')} dir="auto" />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={f.category} onChange={set('category')} dir="rtl">{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <input className={input} placeholder="مصنف / محقق" value={f.author_name} onChange={set('author_name')} dir="auto" />
      </div>
      <input className={input} placeholder="متعلقہ آیات: 2:255, 112:1-4" value={f.refs} onChange={set('refs')} dir="ltr" />
      <input className={input} placeholder="کلیدی الفاظ (کوما سے الگ) — AI کی تلاش کے لیے" value={f.keywords} onChange={set('keywords')} dir="auto" />
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground" dir="rtl">مضمون (Markdown) *</span>
          <button onClick={() => setPreview((p) => !p)} className="text-xs text-primary inline-flex items-center gap-1">{preview ? <><Pencil className="w-3 h-3" /> ایڈٹ</> : <><Eye className="w-3 h-3" /> پریویو</>}</button>
        </div>
        {preview ? (
          <article dir="auto" className="rounded-lg border border-border p-3 text-sm space-y-2 min-h-[200px] [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:ps-5"><ReactMarkdown>{f.body}</ReactMarkdown></article>
        ) : (
          <textarea className={`${input} font-mono`} rows={12} value={f.body} onChange={set('body')} dir="auto" placeholder={'## عنوان\nمضمون یہاں لکھیں…'} />
        )}
      </div>
      <textarea className={input} rows={3} placeholder={'ماخذ لنکس — ہر سطر میں: عنوان | https://link\nمثال: Nature 2019 | https://doi.org/…'} value={f.links} onChange={set('links')} dir="ltr" />
      {err && <p className="text-xs text-destructive" dir="rtl">{err}</p>}
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => save('draft')} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm disabled:opacity-50"><Save className="w-4 h-4" /> مسودہ محفوظ</button>
        <button disabled={busy} onClick={() => save('published')} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} شائع کریں</button>
      </div>
    </div>
  );
}

function ArticlesTab() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => backend.entities.Article.list('-created_date', 300).then(setRows).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (a) => {
    const status = a.status === 'published' ? 'draft' : 'published';
    await backend.entities.Article.update(a.id, { status, published_at: status === 'published' ? (a.published_at || new Date().toISOString()) : a.published_at });
    load();
  };
  const remove = async (a) => {
    if (!window.confirm(`«${a.title}» حذف کریں؟`)) return;
    await backend.entities.Article.delete(a.id);
    load();
  };
  const edit = (a) => setEditing({ ...EMPTY, ...a, summary: a.summary || '', author_name: a.author_name || '', keywords: a.keywords || '', refs: refsToText(a.ayah_refs), links: linksToText(a.source_links) });

  if (editing) return <ArticleEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />;
  if (rows === null) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  return (
    <div className="space-y-3">
      <button onClick={() => setEditing({ ...EMPTY })} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium"><Plus className="w-4 h-4" /> نیا مضمون لکھیں</button>
      {rows.length === 0 && <p className="text-center text-sm text-muted-foreground py-8" dir="rtl">ابھی کوئی مضمون نہیں۔</p>}
      {rows.map((a) => (
        <div key={a.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" dir="auto">{a.title}</p>
              <p className="text-[11px] text-muted-foreground" dir="rtl">{CATEGORIES.find((c) => c.id === a.category)?.label} · {a.ayah_refs?.length || 0} آیات · {fmt(a.updated_date)}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${a.status === 'published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>{a.status === 'published' ? 'شائع شدہ' : 'مسودہ'}</span>
          </div>
          <div className="flex gap-1.5 mt-2" dir="rtl">
            <button onClick={() => edit(a)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-border"><Pencil className="w-3 h-3" /> ایڈٹ</button>
            <button onClick={() => toggle(a)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-border">{a.status === 'published' ? <><EyeOff className="w-3 h-3" /> غیر شائع</> : <><Eye className="w-3 h-3" /> شائع</>}</button>
            <Link to={`/articles/${a.id}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-border">دیکھیں</Link>
            <button onClick={() => remove(a)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-border text-destructive"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────
export default function Admin() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [admin, setAdmin] = useState(null);
  const [tab, setTab] = useState('feedback');

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) { setAdmin(false); return; }
    backend.auth.isAdmin().then(setAdmin).catch(() => setAdmin(false));
  }, [isAuthenticated, isLoadingAuth]);

  const header = (
    <div className="flex items-center gap-2 mb-4">
      <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
      <h1 className="font-heading text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> ایڈمن پینل</h1>
    </div>
  );

  if (admin === null) return <div className="max-w-2xl mx-auto px-4 py-4">{header}<div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></div>;
  if (!admin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4">
        {header}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-sm" dir="rtl">
          {!isAuthenticated ? (
            <><p>یہ صفحہ صرف ایڈمن / ڈیولپر کے لیے ہے۔ پہلے لاگ اِن کریں۔</p><Link to="/login" className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs">لاگ اِن</Link></>
          ) : (
            <>
              <p>آپ ({user?.email}) ایڈمن نہیں ہیں۔ ایڈمن بنانے کے لیے Supabase SQL Editor میں یہ ایک بار چلائیں:</p>
              <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto" dir="ltr">{`INSERT INTO admins (user_id)\nSELECT id FROM auth.users\nWHERE email = '${user?.email}';`}</pre>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      {header}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setTab('feedback')} className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border ${tab === 'feedback' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}><Inbox className="w-4 h-4" /> فیڈ بیک</button>
        <button onClick={() => setTab('articles')} className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border ${tab === 'articles' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}><Newspaper className="w-4 h-4" /> مضامین</button>
      </div>
      {tab === 'feedback' ? <FeedbackTab /> : <ArticlesTab />}
    </div>
  );
}
