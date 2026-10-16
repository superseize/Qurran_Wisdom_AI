import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Notebook as NotebookIcon, Trash2, Download, FileJson, FileText, FileType, FileDown, BookOpen, ScrollText, Sparkles, Search, Tag, X, Check, Loader2, Folder, StickyNote, Edit3 } from 'lucide-react';
import { exportJSON, exportMarkdown, exportText, exportPDF } from '@/lib/stores';
import { THEOLOGICAL_TAGS, TAG_MAP, parseTags, joinTags } from '@/lib/stores';
import { getCollections, createCollection, deleteCollection } from '@/lib/stores';
import { listNotes, updateNote, deleteNote } from '@/lib/stores';
import { CollectionBar, COLOR_MAP } from '@/components/ai';

const TYPE_META = {
  verse:   { icon: BookOpen,    label: 'آیت',       color: 'text-primary border-primary/40 bg-primary/10' },
  hadith:  { icon: ScrollText,  label: 'حدیث',      color: 'text-secondary-foreground border-secondary bg-secondary/40' },
  insight: { icon: Sparkles,    label: 'AI تجزیہ', color: 'text-accent border-accent/40 bg-accent/10' },
};

export default function Notebook() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(null);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [filter, setFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [editingTags, setEditingTags] = useState(null);
  const [editingNote, setEditingNote] = useState(null); // note id being edited for personal note
  const [noteDraft, setNoteDraft] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await listNotes();
      setNotes(rows || []);
    } catch {
      setNotes([]);
    }
  }, []);

  const loadCollections = useCallback(async () => {
    try {
      const rows = await getCollections();
      setCollections(rows || []);
    } catch {
      setCollections([]);
    }
  }, []);

  useEffect(() => { load(); loadCollections(); }, [load, loadCollections]);

  const remove = async (id) => {
    try {
      await deleteNote(id);
      setNotes(n => (n || []).filter(x => x.id !== id));
    } catch {}
  };

  const updateTags = async (id, tagIds) => {
    try {
      await updateNote(id, { tags: joinTags(tagIds) });
      setNotes(n => (n || []).map(x => x.id === id ? { ...x, tags: joinTags(tagIds) } : x));
      setEditingTags(null);
    } catch {}
  };

  const saveNote = async (id) => {
    try {
      await updateNote(id, { notes: noteDraft.trim() });
      setNotes(n => (n || []).map(x => x.id === id ? { ...x, notes: noteDraft.trim() } : x));
      setEditingNote(null);
    } catch {}
  };

  const handleCreateCollection = async (data) => {
    try {
      await createCollection(data);
      await loadCollections();
    } catch {}
  };

  const handleDeleteCollection = async (id) => {
    try {
      await deleteCollection(id);
      setActiveCollection(null);
      await loadCollections();
    } catch {}
  };

  const moveNote = async (id, collectionId) => {
    try {
      await updateNote(id, { collection_id: collectionId || '' });
      setNotes(n => (n || []).map(x => x.id === id ? { ...x, collection_id: collectionId || '' } : x));
    } catch {}
  };

  const filtered = (notes || []).filter(n => {
    if (activeCollection && n.collection_id !== activeCollection) return false;
    if (filter !== 'all' && n.item_type !== filter) return false;
    if (tagFilter && !parseTags(n.tags).includes(tagFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (n.citation || '').toLowerCase().includes(q)
        || (n.content || '').toLowerCase().includes(q)
        || (n.tags || '').toLowerCase().includes(q)
        || (n.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Count notes per tag
  const tagCounts = {};
  for (const n of (notes || [])) {
    for (const t of parseTags(n.tags)) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  const usedTags = THEOLOGICAL_TAGS.filter(t => tagCounts[t.id]);

  // Count notes per collection
  const collectionNoteCounts = { all: (notes || []).length };
  for (const n of (notes || [])) {
    if (n.collection_id) {
      collectionNoteCounts[n.collection_id] = (collectionNoteCounts[n.collection_id] || 0) + 1;
    }
  }

  const counts = {
    all: (notes || []).length,
    verse: (notes || []).filter(n => n.item_type === 'verse').length,
    hadith: (notes || []).filter(n => n.item_type === 'hadith').length,
    insight: (notes || []).filter(n => n.item_type === 'insight').length,
  };

  const collectionName = (id) => (collections.find(c => c.id === id) || {}).name || '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-heading text-xl font-semibold flex items-center gap-2">
            <NotebookIcon className="w-5 h-5 text-primary" /> تحقیقی نوٹ بک
          </h1>
        </div>
        {notes && notes.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExport(s => !s)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> <span dir="rtl">برآمد کریں</span>
            </button>
            {showExport && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                <button onClick={() => { exportJSON(filtered); setShowExport(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent/15 text-right" dir="rtl">
                  <FileJson className="w-3.5 h-3.5" /> JSON فارمیٹ
                </button>
                <button onClick={() => { exportMarkdown(filtered); setShowExport(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent/15 text-right" dir="rtl">
                  <FileType className="w-3.5 h-3.5" /> Markdown فارمیٹ
                </button>
                <button onClick={() => { exportText(filtered); setShowExport(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent/15 text-right" dir="rtl">
                  <FileText className="w-3.5 h-3.5" /> متن (Text) فارمیٹ
                </button>
                <button
                  onClick={async () => {
                    setPdfLoading(true);
                    try { await exportPDF(filtered); } finally { setPdfLoading(false); }
                    setShowExport(false);
                  }}
                  disabled={pdfLoading}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent/15 text-right disabled:opacity-50"
                  dir="rtl"
                >
                  {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF فارمیٹ
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collections / Folders */}
      <CollectionBar
        collections={collections}
        activeCollection={activeCollection}
        onSelect={setActiveCollection}
        onCreate={handleCreateCollection}
        onDelete={handleDeleteCollection}
        noteCounts={collectionNoteCounts}
      />

      {/* Search */}
      {notes && notes.length > 0 && (
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="تلاش کریں…"
            dir="rtl"
            className="w-full pr-10 pl-4 py-2.5 rounded-full bg-card border border-border focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
          />
        </div>
      )}

      {/* Filter tabs */}
      {notes && notes.length > 0 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'تمام', count: counts.all },
            { id: 'verse', label: 'آیات', count: counts.verse },
            { id: 'hadith', label: 'احادیث', count: counts.hadith },
            { id: 'insight', label: 'AI تجزیہ', count: counts.insight },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span dir="rtl">{f.label}</span>
              <span className="tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tag filter row */}
      {notes && notes.length > 0 && usedTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
            <Tag className="w-3 h-3" />
          </span>
          {usedTags.map(t => (
            <button
              key={t.id}
              onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)}
              className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                tagFilter === t.id
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
              }`}
              dir="rtl"
            >
              {t.label}
              <span className="tabular-nums opacity-60">{tagCounts[t.id]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {notes === null ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <NotebookIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground" dir="rtl">
            آپ کی نوٹ بک خالی ہے۔ قرآنی آیات، احادیث یا AI تجزیہ محفوظ کرنے کے لیے "نوٹ بک میں محفوظ کریں" بٹن استعمال کریں۔
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12" dir="rtl">اس فلٹر میں کوئی نوٹ نہیں۔</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const meta = TYPE_META[n.item_type] || TYPE_META.insight;
            const Icon = meta.icon;
            const col = n.collection_id ? collections.find(c => c.id === n.collection_id) : null;
            const colColor = col ? (COLOR_MAP[col.color] || COLOR_MAP.gold) : null;
            return (
              <div key={n.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.color}`}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </span>
                    {col && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colColor.active}`} dir="rtl">
                        <Folder className="w-2.5 h-2.5" /> {col.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => remove(n.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5" dir="auto">{n.citation}</h3>
                <p className="text-sm leading-relaxed text-foreground/80" dir="auto">{n.content}</p>

                {/* Personal note */}
                {editingNote === n.id ? (
                  <div className="mt-2.5 space-y-2 rounded-lg border border-border bg-secondary/30 p-2.5">
                    <textarea
                      value={noteDraft}
                      onChange={e => setNoteDraft(e.target.value)}
                      placeholder="اپنا نوٹ لکھیں…"
                      dir="rtl"
                      rows={2}
                      className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingNote(null)} className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground" dir="rtl">
                        <X className="w-3 h-3 inline ml-1" /> منسوخ
                      </button>
                      <button onClick={() => saveNote(n.id)} className="text-[11px] px-2.5 py-1 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-1" dir="rtl">
                        <Check className="w-3 h-3" /> محفوظ
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingNote(n.id); setNoteDraft(n.notes || ''); }}
                    className="mt-2 w-full text-right rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    dir="rtl"
                  >
                    {n.notes ? (
                      <span className="flex items-start gap-1.5">
                        <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        <span className="font-urdu leading-relaxed text-foreground/80">{n.notes}</span>
                        <Edit3 className="w-3 h-3 mt-0.5 shrink-0 opacity-50" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <StickyNote className="w-3 h-3" /> نوٹ لکھیں…
                      </span>
                    )}
                  </button>
                )}

                {/* Move to collection dropdown */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground" dir="rtl">فولڈر:</span>
                  <select
                    value={n.collection_id || ''}
                    onChange={e => moveNote(n.id, e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-secondary/40 border border-border focus:outline-none focus:ring-1 focus:ring-accent/50"
                    dir="rtl"
                  >
                    <option value="">— بغیر فولڈر —</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                {editingTags === n.id ? (
                  <div className="mt-2.5 space-y-2 rounded-lg border border-border bg-secondary/30 p-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {THEOLOGICAL_TAGS.map(t => {
                        const active = parseTags(n.tags).includes(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={async () => {
                              const current = parseTags(n.tags);
                              const next = active ? current.filter(x => x !== t.id) : [...current, t.id];
                              await updateTags(n.id, next);
                            }}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                              active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                            }`}
                            dir="rtl"
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setEditingTags(null)} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1" dir="rtl">
                      <X className="w-3 h-3" /> بند کریں
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {parseTags(n.tags).map((t, i) => {
                      const tagMeta = TAG_MAP[t];
                      return (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/12 text-accent border border-accent/20" dir="rtl">
                          {tagMeta ? tagMeta.label : t}
                        </span>
                      );
                    })}
                    <button
                      onClick={() => setEditingTags(n.id)}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 inline-flex items-center gap-1 transition-colors"
                      dir="rtl"
                    >
                      <Tag className="w-2.5 h-2.5" /> موضوع
                    </button>
                  </div>
                )}
                {n.created_date && (
                  <p className="text-[10px] text-muted-foreground/60 mt-2">{new Date(n.created_date).toLocaleString('ur-PK')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}