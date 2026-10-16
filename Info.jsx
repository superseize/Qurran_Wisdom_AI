import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Mail, BookOpen, BookText, MessageCircle, AudioLines, Sparkles, Heart, Shield, Database, Send, Check, X, Image as ImageIcon, Loader2, AlertCircle, Copy, Bot, MessageSquare, Code, Settings2, RefreshCw, Hand, Scroll, Clock, FileText } from 'lucide-react';
import { supabase } from '@/api/backend';

// ───────── pages/AboutContact.jsx ─────────
const features = [
  { icon: BookOpen, title: 'قرآن پڑھیں', desc: 'عربی متن، اردو اور انگریزی ترجمے کے ساتھ' },
  { icon: AudioLines, title: 'تجوید سیکھیں', desc: 'نورانی اور مدانی قاعدہ، مخرج اور تجوید کے اصول' },
  { icon: BookText, title: 'احادیث', desc: 'صحاح ستہ اور دیگر مستند حدیث کتب' },
  { icon: MessageCircle, title: 'AI سوال جواب', desc: 'قرآن اور احادیث پر مبنی جوابات' },
  { icon: Database, title: 'قرآن ڈکشنری', desc: '3600+ قرآنی الفاظ کے معنی اور تعدد' },
  { icon: Sparkles, title: 'آڈیو تلاوت', desc: 'مشہور قارئین کی صوتی تلاوت' },
];

const sources = [
  'alquran.cloud — قرآنی متن، ترجمے اور آڈیو',
  'quran.com API — تفسیر اور لفظی تجزیہ',
  'fawazahmed0/hadith-api — احادیث کا متن',
  'Quranic Arabic Corpus — گرامر اور ڈکشنری',
];

const FEEDBACK_TYPES = [
  { id: 'general', label: 'عام رائے / سوال' },
  { id: 'error', label: 'آیت یا ترجمے میں غلطی' },
  { id: 'suggestion', label: 'تجویز' },
  { id: 'other', label: 'دیگر' },
];

function AboutContent() {
  return (
    <div className="space-y-4 animate-rise" style={{ animationDelay: '0.16s' }}>
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-[rgba(102,78,31,0.25)] to-[rgba(25,53,42,0.65)] p-5 text-center">
        <p className="font-arabic text-3xl text-[#f4e7c2] mb-2" dir="rtl">إِنَّا أَنزَلْنَاهُ قُرْآنًا عَرَبِيًّا</p>
        <p className="text-xs text-muted-foreground" dir="rtl">"بے شک ہم نے اسے عربی قرآن نازل کیا ہے" — (یوسف: ۲)</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm leading-relaxed" dir="rtl">
        <p>قرآن اے آئی ایک مفت، آف لائن صلاحیت رکھنے والا اسلامی تعلیمی پلیٹ فارم ہے جو قرآن پاک کی تلاوت، ترجمے، تفسیر، اور تجوید سیکھنے کی سہولت فراہم کرتا ہے۔</p>
        <p>ہمارا مقصد ہے کہ مسلمان بھائیوں اور بہنوں کو قرآن پاک کو سمجھنے اور درست تلاوت کرنے میں آسان اور جدید ذرائع فراہم کریں۔</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium mb-3" dir="rtl">کلیدی خصوصیات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><f.icon className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" dir="rtl">{f.title}</p>
                <p className="text-xs text-muted-foreground" dir="rtl">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium mb-3" dir="rtl">ڈیٹا کے ذرائع</h2>
        <ul className="space-y-2 text-sm" dir="rtl">
          {sources.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span className="text-foreground/90">{s}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3" dir="rtl">تمام قرآنی متن اور احادیث مستند عوامی ذرائع سے حاصل کی جاتی ہیں۔ دینی احکامات کے لیے مستند عالم دین سے رجوع کریں۔</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-primary" />
          <h2 className="font-medium" dir="rtl">ہماری قیمت</h2>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed" dir="rtl">ہم اللہ کی رضا کے لیے بلا معاوضہ خدمت کرتے ہیں۔ آپ کی دعاؤں سے ہمیں مزید بہتری کی تلقین ملتی ہے۔</p>
        <div className="mt-3 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground" dir="rtl">آپ کی پرائیسی ہماری ترجیح ہے — تمام ڈیٹا آپ کے ڈیوائس پر محفوظ ہے۔</p>
        </div>
      </div>
    </div>
  );
}

function ContactContent() {
  const fileInputRef = useRef(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState('general');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleScreenshotSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('براہ کرم صرف تصویر منتخب کریں۔'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('تصویر کا سائز 5MB سے کم ہونا چاہیے۔'); return; }
    setError(''); setScreenshot(file); setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true); setError('');
    try {
      let fileUrl = '';
      if (screenshot) {
        try {
          const ext = (screenshot.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
          const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage.from('feedback-screenshots').upload(path, screenshot, { contentType: screenshot.type });
          if (!upErr) fileUrl = supabase.storage.from('feedback-screenshots').getPublicUrl(path).data.publicUrl;
        } catch { fileUrl = ''; }
      }
      const { error: fbErr } = await supabase.from('feedback').insert({ name, email, type: feedbackType, message, screenshot_url: fileUrl || null });
      if (fbErr) throw fbErr;
      setSent(true); setName(''); setEmail(''); setMessage(''); setFeedbackType('general'); removeScreenshot();
      setTimeout(() => setSent(false), 3000);
    } catch { setError('پیغام بھیجتے وقت مسئلہ پیش آیا۔ براہ کرم دوبارہ کوشش کریں۔'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4 animate-rise" style={{ animationDelay: '0.16s' }}>
      <div className="rounded-xl border border-primary/35 bg-gradient-to-br from-[rgba(102,78,31,0.25)] to-[rgba(25,53,42,0.65)] p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm font-urdu leading-relaxed text-foreground/90" dir="rtl">
            ہماری کوشش ہے کہ قرآن کا متن اور ترجمہ ہر ممکن حد تک درست رہے۔ اگر آپ کو کوئی بھی آیت غلط، کوتاہی یا ترجمے میں خامی نظر آئے، تو براہ کرم ہماری ٹیم کو آگاہ کریں۔ جزاک اللہ خیر۔
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" dir="rtl">پیغام کی قسم</label>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setFeedbackType(t.id)}
                className={`p-2.5 rounded-lg border text-sm transition-colors text-right ${feedbackType === t.id ? 'border-primary bg-primary/15 text-foreground font-medium' : 'border-border bg-background hover:border-primary/40'}`} dir="rtl">{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" dir="rtl">نام</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="آپ کا نام" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" dir="rtl" required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" dir="rtl">ای میل</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" dir="ltr" required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" dir="rtl">پیغام</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={feedbackType === 'error' ? 'آیت کا نمبر، سورہ اور غلطی کی تفصیل لکھیں...' : 'اپنا پیغام یہاں لکھیں...'} rows={4} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" dir="rtl" required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" dir="rtl">اسکرین شاٹ (اختیاری)</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshotSelect} className="hidden" />
          {screenshotPreview ? (
            <div className="relative rounded-lg border-2 border-primary/40 overflow-hidden">
              <img src={screenshotPreview} alt="Screenshot preview" className="w-full max-h-48 object-contain bg-muted/30" />
              <button type="button" onClick={removeScreenshot} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center shadow-sm hover:bg-background" aria-label="Remove screenshot">
                <X className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-background">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-primary" /></div>
              <span className="text-sm text-muted-foreground" dir="rtl">اسکرین شاٹ اپلوڈ کریں (اختیاری)</span>
            </button>
          )}
        </div>
        {error && <p className="text-sm text-destructive text-center" dir="rtl">{error}</p>}
        <button type="submit" disabled={submitting || sent}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-br from-primary to-[#8c6b2d] border border-[#e4ca86] text-primary-foreground font-semibold text-sm shadow-[0_4px_10px_rgba(220,185,103,0.18)] active:translate-y-0.5 transition-transform disabled:opacity-60">
          {sent ? <><Check className="w-4 h-4" /> پیغام بھیج دیا گیا</> : submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> بھیجا جا رہا ہے...</> : <><Send className="w-4 h-4" /> پیغام بھیجیں</>}
        </button>
      </form>
    </div>
  );
}

export function AboutContact({ section }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(section || 'about');
  const isAbout = active === 'about';

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      <div className="flex items-center gap-3 mb-5 animate-rise">
        <button onClick={() => navigate(-1)} className="w-[34px] h-[34px] border border-border rounded-[11px] bg-secondary/72 text-muted-foreground grid place-items-center transition-all hover:bg-secondary hover:text-foreground hover:shadow-[0_5px_16px_rgba(0,0,0,0.25)]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-heading text-xl font-semibold flex items-center gap-2">
          {isAbout ? <Info className="w-5 h-5 text-primary" /> : <Mail className="w-5 h-5 text-primary" />}
          {isAbout ? 'ہمارے بارے میں' : 'ہم سے رابطہ'}
        </h1>
      </div>

      <div className="flex gap-2 mb-4 animate-rise" style={{ animationDelay: '0.08s' }}>
        <button onClick={() => setActive('about')} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${isAbout ? 'bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground border-[#e4ca86]' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`} dir="rtl">ہمارے بارے میں</button>
        <button onClick={() => setActive('contact')} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${!isAbout ? 'bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground border-[#e4ca86]' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`} dir="rtl">رابطہ</button>
      </div>

      {isAbout ? <AboutContent /> : <ContactContent />}
    </div>
  );
}

// ───────── pages/Connect.jsx ─────────
const circle = "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] shadow-[0_4px_7px_rgba(62,42,29,0.28),inset_0_1.5px_1px_rgba(255,255,255,0.7)] active:translate-y-0.5 transition-transform";

const TABS = [
  { id: 'claude', label: 'Claude', icon: Bot },
  { id: 'chatgpt', label: 'ChatGPT', icon: MessageSquare },
  { id: 'cursor', label: 'Cursor', icon: Code },
  { id: 'custom', label: 'Custom', icon: Settings2 },
];

export function Connect() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('claude');
  const [copied, setCopied] = useState(false);

  const serverUrl = useMemo(() => new URL('/api/mcp', window.location.origin).toString(), []);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className={circle} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            <Bot className="w-4 h-4" />
            <span>Connect AI Assistant</span>
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">Link ChatGPT, Claude, Cursor & more</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Intro banner */}
      <div className="mb-5 rounded-2xl border border-primary/30 bg-gradient-to-br from-[rgba(102,78,31,0.25)] to-[rgba(25,53,42,0.65)] p-4">
        <p className="text-sm font-urdu leading-relaxed text-foreground/80 text-center" dir="rtl">
          اپنے AI اسسٹنٹ (ChatGPT، Claude، Cursor) کو اس ایپ سے جوڑیں۔ اس ایپ کا قرآنی ڈیٹا، احادیث، اور ڈکشنری آپ کے اسسٹنٹ کو دستیاب ہو جائے گی۔
        </p>
      </div>

      {/* Server URL card */}
      <div className="mb-5 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">MCP Server URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2.5 rounded-lg bg-muted/60 text-xs text-foreground break-all font-mono select-all" dir="ltr">{serverUrl}</code>
          <button onClick={copyUrl} className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-[#8c6b2d] border border-[#e4ca86] text-primary-foreground flex items-center justify-center shadow-[0_4px_10px_rgba(220,185,103,0.18)] active:translate-y-0.5" aria-label="Copy URL">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center" dir="rtl">
          {copied ? 'کاپی ہو گیا!' : 'یہ URL کوپی کریں اور نیچے دیے گئے اسسٹنٹ کے مطابق استعمال کریں۔'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-accent/50'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Instructions per tab */}
      <div className="rounded-2xl border border-border bg-card p-5 animate-rise" style={{ animationDelay: '0.16s' }}>
        {activeTab === 'claude' && (
          <ol className="space-y-3 text-sm text-foreground" dir="ltr">
            <Step n={1}>Open <strong>Claude</strong> and click your <strong>profile menu</strong> (top-left avatar).</Step>
            <Step n={2}>Go to <strong>Settings → Connectors</strong>.</Step>
            <Step n={3}>Click <strong>"Add custom connector"</strong>.</Step>
            <Step n={4}>Give it a name (e.g. "Quran Wisdom AI") and paste the server URL above.</Step>
            <Step n={5}>Click <strong>Add</strong>. The connector is now available in your chats.</Step>
          </ol>
        )}
        {activeTab === 'chatgpt' && (
          <ol className="space-y-3 text-sm text-foreground" dir="ltr">
            <Step n={1}>Open <strong>ChatGPT</strong> and go to <strong>Apps</strong>.</Step>
            <Step n={2}>Enable <strong>Developer mode</strong> (confirm the risk warning ChatGPT shows).</Step>
            <Step n={3}>Click <strong>"Create app"</strong>, name it, and paste the server URL above.</Step>
            <Step n={4}>Click <strong>Create</strong>, then <strong>enable the app</strong> from the chat composer before prompting it.</Step>
          </ol>
        )}
        {activeTab === 'cursor' && (
          <ol className="space-y-3 text-sm text-foreground" dir="ltr">
            <Step n={1}>Open <strong>Cursor</strong> and go to <strong>Settings → Tools & Integrations</strong>.</Step>
            <Step n={2}>Click <strong>"New MCP Server"</strong> — this opens <code className="text-xs bg-muted/60 px-1 rounded">mcp.json</code>.</Step>
            <Step n={3}>Add an entry with <code className="text-xs bg-muted/60 px-1 rounded">"url"</code> set to the server URL above.</Step>
            <Step n={4}>Save the file and <strong>toggle the server on</strong>.</Step>
          </ol>
        )}
        {activeTab === 'custom' && (
          <div className="space-y-3 text-sm text-foreground" dir="ltr">
            <p>Copy the server URL and add it as a <strong>streamable HTTP MCP server</strong> in any MCP-compatible client.</p>
            <p className="text-muted-foreground">A name and the URL is all most clients need. Reload the client after adding.</p>
          </div>
        )}
      </div>

      {/* Refresh note */}
      <div className="mt-4 rounded-xl border border-primary/30 bg-gradient-to-br from-[rgba(102,78,31,0.25)] to-[rgba(25,53,42,0.65)] p-4 flex items-start gap-2">
        <RefreshCw className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs font-urdu leading-relaxed text-foreground/80" dir="rtl">
          جب ہم ایپ میں تبدیلیاں کریں تو آپ کا اسسٹنٹ ٹولز کی فہرست کیش (cache) کر لیتا ہے۔ تبدیلیوں کے بعد اپنے کنیکٹر کو ریفریش کریں تاکہ نئے ٹولز دستیاب ہوں۔
        </p>
      </div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] text-xs font-bold flex items-center justify-center tabular-nums">{n}</span>
      <span className="pt-0.5 leading-relaxed">{children}</span>
    </li>
  );
}

// ───────── pages/Essentials.jsx ─────────
const DUAS = [
  { title: 'کھانے سے پہلے', arabic: 'بِسْمِ اللَّٰهِ وَعَلَىٰ بَرَكَةِ اللَّٰهِ', urdu: 'اللہ کے نام سے اور اللہ کی برکت پر' },
  { title: 'کھانے کے بعد', arabic: 'ٱلْحَمْدُ لِلَّٰهِ ٱلَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', urdu: 'تمام تعریفیں اللہ کے لیے جس نے ہمیں کھلایا، پلایا اور مسلمان بنایا' },
  { title: 'سونے سے پہلے', arabic: 'بِاسْمِكَ ٱللَّٰهُمَّ أَمُوتُ وَأَحْيَا', urdu: 'اے اللہ! تیرے نام سے میں مرتا اور جیتا ہوں' },
  { title: 'جاگنے پر', arabic: 'ٱلْحَمْدُ لِلَّٰهِ ٱلَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ ٱلنُّشُورُ', urdu: 'تمام تعریفیں اللہ کے لیے جس نے ہمیں موت کے بعد زندہ کیا اور اسی کی طرف اٹھنا ہے' },
  { title: 'بیت الخلا میں داخل ہوتے', arabic: 'ٱللَّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ ٱلْخُبُثِ وَٱلْخَبَائِثِ', urdu: 'اے اللہ! میں برائیوں اور برے لوگوں سے تیری پناہ مانگتا ہوں' },
  { title: 'مسجد میں داخل ہوتے', arabic: 'ٱللَّٰهُمَّ ٱفْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', urdu: 'اے اللہ! مجھے اپنی رحمت کے دروازے کھول دے' },
  { title: 'سفر پر', arabic: 'سُبْحَانَ ٱلَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنْقَلِبُونَ', urdu: 'پاک ہے وہ جس نے ہمارے لیے یہ مسخر کر دیا اور ہم اسے پورا نہ کر سکتے تھے اور ہم اپنے رب کی طرف لوٹنے والے ہیں' },
  { title: 'علم کے لیے', arabic: 'رَبِّ زِدْنِي عِلْمًا', urdu: 'اے میرے رب! میرے علم میں اضافہ فرما' },
  { title: 'بخشش کے لیے', arabic: 'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ ٱلْخَاسِرِينَ', urdu: 'اے ہمارے رب! ہم نے اپنے نفس پر ظلم کیا اور اگر تو ہمیں نہ بخشے اور رحم نہ کرے تو ہم نقصان اٹھانے والوں میں ہوں گے' },
  { title: 'والدین کے لیے', arabic: 'رَبِّ ٱغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَٱلْمُؤْمِنَاتِ', urdu: 'اے میرے رب! مجھے، میرے والدین کو، اور جو میرے گھر میں مومن ہو کر آئے، اور مومن مردوں اور عورتوں کو بخش دے' },
  { title: 'مشکل پر', arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ ٱلظَّالِمِينَ', urdu: 'تیرے سوا کوئی معبود نہیں، تو پاک ہے، بے شک میں ظلم کرنے والوں میں سے تھا' },
  { title: 'بیماری پر', arabic: 'أَذْهِبِ ٱلْبَأْسَ رَبِّ ٱلنَّاسِ وَٱشْفِ أَنْتَ ٱلشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ', urdu: 'اے لوگوں کے رب! یہ تکلیف دور کر، اور شفا دے، تو ہی شفا دینے والا ہے، تیری شفا کے سوا کوئی شفا نہیں' },
];

const KALIMAS = [
  { num: '۱', name: 'کلمہ طیبہ', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ، مُحَمَّدٌ رَسُولُ اللَّهِ', urdu: 'اللہ کے سوا کوئی معبود نہیں، محمد ﷺ اللہ کے رسول ہیں۔' },
  { num: '۲', name: 'کلمہ شہادت', arabic: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ', urdu: 'میں گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اور میں گواہی دیتا ہوں کہ محمد ﷺ اس کے بندے اور رسول ہیں۔' },
  { num: '۳', name: 'کلمہ تمجید', arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ، وَلَا إِلَٰهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ', urdu: 'اللہ پاک ہے اور تمام تعریفیں اللہ کے لیے ہیں، اللہ کے سوا کوئی معبود نہیں، اللہ سب سے بڑا ہے۔' },
  { num: '۴', name: 'کلمہ توحید', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', urdu: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کے لیے بادشاہی اور تعریف ہے، اور وہ ہر چیز پر قادر ہے۔' },
  { num: '۵', name: 'کلمہ استغفار', arabic: 'أَسْتَغْفِرُ اللَّهَ رَبِّي مِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ', urdu: 'میں اپنے رب اللہ سے ہر گناہ کی بخشش مانگتا ہوں اور اس کی طرف رجوع کرتا ہوں۔' },
  { num: '۶', name: 'کلمہ رد کفر', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ أَنْ أُشْرِكَ بِكَ شَيْئًا وَأَنَا أَعْلَمُ، وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ', urdu: 'اے اللہ! میں تیری پناہ مانگتا ہوں اس بات سے کہ میں جان بوجھ کر تجھے کسی کا شریک ٹھہراوں۔' },
];

const PRAYERS = [
  { name: 'فجر', arabic: 'ٱلْفَجْر', rakats: '2 فرض', sunnah: '2 سنت', time: 'فجر سے طلوع آفتاب تک' },
  { name: 'ظہر', arabic: 'ٱلظُّهْر', rakats: '4 فرض', sunnah: '4 سنت، 2 سنت', time: 'ظہر سے عصر تک' },
  { name: 'عصر', arabic: 'ٱلْعَصْر', rakats: '4 فرض', sunnah: '—', time: 'عصر سے غروب تک' },
  { name: 'مغرب', arabic: 'ٱلْمَغْرِب', rakats: '3 فرض', sunnah: '—', time: 'غروب سے عشاء تک' },
  { name: 'عشاء', arabic: 'ٱلْعِشَاء', rakats: '4 فرض', sunnah: '2 سنت', time: 'عشاء سے فجر تک' },
];

const STEPS = [
  { step: '1', title: 'نیت', desc: 'دل میں نماز کی نیت کرے' },
  { step: '2', title: 'تکبیرِ تحریمہ', desc: 'اللہ أَكْبَر کہہ کر ہاتھ باندھے' },
  { step: '3', title: 'قیام', desc: 'سورہ فاتحہ اور کوئی سورہ پڑھے' },
  { step: '4', title: 'رکوع', desc: 'سُبْحَانَ رَبِّيَ ٱلْعَظِيم پڑھے' },
  { step: '5', title: 'سجود', desc: 'سُبْحَانَ رَبِّيَ ٱلْأَعْلَىٰ پڑھے' },
  { step: '6', title: 'تشہد و سلام', desc: 'تحیّات پڑھے اور دونوں طرف سلام پھیرے' },
];

const SECTIONS = {
  duas: { icon: Hand, title: 'دعائیں', subtitle: 'قرآن و سنت سے ماخوذ عام دعائیں' },
  kalimas: { icon: Scroll, title: 'چھ کلمے', subtitle: 'اسلام کے بنیادی چھ کلمے' },
  namaz: { icon: Clock, title: 'نماز', subtitle: 'پانچ نمازیں اور نماز کا طریقہ' },
};

const cardCls = 'rounded-2xl border border-border bg-gradient-to-br from-[rgba(20,51,42,0.88)] to-[rgba(10,29,25,0.94)] p-4 transition-all hover:border-primary/40';

export function Essentials({ section }) {
  const navigate = useNavigate();
  const config = SECTIONS[section] || SECTIONS.duas;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      <div className="flex items-center gap-3 mb-6 animate-rise">
        <button onClick={() => navigate(-1)} className="w-[34px] h-[34px] border border-border rounded-[11px] bg-secondary/72 text-muted-foreground grid place-items-center transition-all hover:bg-secondary hover:text-foreground hover:shadow-[0_5px_16px_rgba(0,0,0,0.25)]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-semibold flex items-center gap-2">
            <config.icon className="w-5 h-5 text-primary" /> {config.title}
          </h1>
          <p className="text-sm text-muted-foreground font-urdu" dir="rtl">{config.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 animate-rise" style={{ animationDelay: '0.08s' }}>
        {Object.entries(SECTIONS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => navigate(`/${key}`)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              section === key
                ? 'bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground border-[#e4ca86] shadow-[0_4px_10px_rgba(220,185,103,0.18)]'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            <val.icon className="w-4 h-4" />
            {val.title}
          </button>
        ))}
      </div>

      {section === 'duas' && (
        <div className="space-y-3 animate-rise" style={{ animationDelay: '0.16s' }}>
          {DUAS.map((d, i) => (
            <div key={i} className={cardCls}>
              <div className="mb-2">
                <span className="text-xs px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium" dir="rtl">{d.title}</span>
              </div>
              <p className="font-arabic text-2xl text-center text-foreground leading-loose" dir="rtl">{d.arabic}</p>
              <p className="text-sm text-center text-muted-foreground mt-2 font-urdu" dir="rtl">{d.urdu}</p>
            </div>
          ))}
        </div>
      )}

      {section === 'kalimas' && (
        <div className="space-y-3 animate-rise" style={{ animationDelay: '0.16s' }}>
          {KALIMAS.map((k, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground font-bold flex items-center justify-center font-arabic">{k.num}</span>
                <span className="text-sm font-semibold" dir="rtl">{k.name}</span>
              </div>
              <p className="font-arabic text-xl text-center text-foreground leading-loose" dir="rtl">{k.arabic}</p>
              <p className="text-sm text-center text-muted-foreground mt-2 font-urdu leading-relaxed" dir="rtl">{k.urdu}</p>
            </div>
          ))}
        </div>
      )}

      {section === 'namaz' && (
        <div className="animate-rise" style={{ animationDelay: '0.16s' }}>
          <div className="space-y-3 mb-6">
            {PRAYERS.map((p, i) => (
              <div key={i} className={cardCls}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground font-bold flex items-center justify-center">{i + 1}</span>
                    <div>
                      <p className="font-arabic text-xl text-foreground" dir="rtl">{p.arabic}</p>
                      <p className="text-xs text-muted-foreground font-urdu" dir="rtl">{p.time}</p>
                    </div>
                  </div>
                  <div className="text-left flex flex-col items-end gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30" dir="rtl">{p.rakats}</span>
                    {p.sunnah !== '—' && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground" dir="rtl">{p.sunnah}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold mb-3 text-center" dir="rtl">نماز کا طریقہ</p>
          <div className="space-y-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">{s.step}</span>
                <div>
                  <p className="font-medium text-sm" dir="rtl">{s.title}</p>
                  <p className="text-xs text-muted-foreground font-urdu" dir="rtl">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── pages/Legal.jsx ─────────
const PRIVACY_SECTIONS = [
  { h: '1. تعارف', p: 'قرآن اے آئی ایپ آپ کی پرائیسی کا احترام کرتی ہے۔ یہ پالیسی وضاحت کرتی ہے کہ ہم آپ کی کون سی معلومات اکٹھا کرتے ہیں اور انہیں کیسے استعمال کرتے ہیں۔' },
  { h: '2. جمع شدہ معلومات', p: 'ہم آپ سے ذاتی معلومات نہیں مانگتے۔ ایپ درج ذیل معلومات کو صرف آپ کے ڈیوائس پر محفوظ کرتی ہے: پڑھنے کی تاریخ اور بک مارکس (localStorage)، منتخب قاری اور ترجیحات، کیشے شدہ قرآنی متن اور آڈیو آف لائن استعمال کے لیے، تسبیح اور پیش رفت کا ریکارڈ۔' },
  { h: '3. نیٹ ورک استعمال', p: 'قرآنی متن، ترجمے، تفسیر، اور احادیث عوامی APIs (alquran.cloud، quran.com) سے حاصل کی جاتی ہیں۔ آپ کا ڈیوائس ان سرورز سے براہ راست رابطہ کرتا ہے۔ ہم اس ٹریفک کو اپنے سرور پر نہیں رکھتے۔' },
  { h: '4. اکاؤنٹ', p: 'اگر آپ اکاؤنٹ بناتے ہیں تو صرف آپ کا ای میل اور پاس ورڈ محفوظ ہوتا ہے۔ ہم پاس ورڈز کو انکرپٹڈ شکل میں محفوظ کرتے ہیں۔' },
  { h: '5. تیسرے فریق سروسز', p: 'ایپ alquran.cloud (قرآنی متن اور آڈیو)، quran.com API (تفسیر اور لفظی تجزیہ)، fawazahmed0/hadith-api (احادیث کا متن) استعمال کرتی ہے۔ ان سروسز کی اپنی پرائیویسی پالیسیاں ہیں۔' },
  { h: '6. بچوں کی پرائیسی', p: 'یہ ایپ تعلیمی مقاصد کے لیے ہے اور کسی بھی عمر کے صارفین کے لیے موزوں ہے۔ ہم بچوں سے جان بوجھ کر معلومات نہیں اکٹھا کرتے۔' },
  { h: '7. ڈیٹا حذف کرنا', p: 'آپ کی تمام معلومات آپ کے ڈیوائس پر محفوظ ہیں۔ سیٹنگز میں "کیشے صاف کریں" سے تمام مقامی ڈیٹا حذف ہو جاتی ہے۔' },
  { h: '8. پالیسی میں تبدیلی', p: 'ہم اس پالیسی کو وقتاً فوقتاً اپڈیٹ کر سکتے ہیں۔ اہم تبدیلیوں کی صورت میں ایپ کے اندر مطلع کیا جائے گا۔' },
];

const TERMS_SECTIONS = [
  { h: '1. تعارف', p: 'قرآن اے آئی ایپ کا استعمال کرنے سے آپ ان شرائط کو تسلیم کرتے ہیں۔ اگر آپ متفق نہیں ہیں تو ایپ کا استعمال نہ کریں۔' },
  { h: '2. ایپ کا استعمال', p: 'یہ ایپ ذاتی اور تعلیمی استعمال کے لیے مفت ہے۔ آپ اسے تجارتی مقاصد کے لیے فروخت نہیں کر سکتے۔' },
  { h: '3. مواد کی درستگی', p: 'قرآنی متن اور احادیث مستند ذرائع سے حاصل کی جاتی ہیں، تاہم ہم مکمل درستگی کی ضمانت نہیں دیتے۔ دینی احکامات کے لیے مستند عالم دین سے رجوع کریں۔' },
  { h: '4. آف لائن استعمال', p: 'ایپ کا زیادہ تر مواد آف لائن دستیاب ہے جب تک کہ پہلے سے کیشے نہ ہو۔ کچھ خصوصیات کے لیے انٹرنیٹ کنکشن ضروری ہے۔' },
  { h: '5. آڈیو اور میڈیا', p: 'قرآنی تلاوت کے آڈیو کلپس تیسرے فریق سرورز سے حاصل کیے جاتے ہیں۔ ان کا استعمال صرف ذاتی سننے کے لیے ہے۔' },
  { h: '6. صارف کی ذمہ داری', p: 'آپ ایپ کا استعمال قانونی اور اخلاقی حدود میں رہتے ہوئے کریں۔ کسی بھی غیر قانونی سرگرمی کے لیے ایپ کا استعمال نہ کریں۔' },
  { h: '7. ذمہ داری سے انکار', p: 'ایپ "جیسا ہے" فراہم کی جاتی ہے۔ ہم کسی بھی نقصان یا ڈیٹا کے ضیاع کے ذمہ دار نہیں۔ آپ اپنی ذمہ داری پر اہم ڈیٹا کا بیک اپ رکھیں۔' },
  { h: '8. شرائط میں تبدیلی', p: 'ہم ان شرائط کو وقتاً فوقتاً اپڈیٹ کر سکتے ہیں۔ جاری رکھنے کا مطلب ہے نئی شرائط سے اتفاق۔' },
];

export function Legal({ section }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(section || 'privacy');
  const isPrivacy = active === 'privacy';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      <div className="flex items-center gap-3 mb-5 animate-rise">
        <button onClick={() => navigate(-1)} className="w-[34px] h-[34px] border border-border rounded-[11px] bg-secondary/72 text-muted-foreground grid place-items-center transition-all hover:bg-secondary hover:text-foreground hover:shadow-[0_5px_16px_rgba(0,0,0,0.25)]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-heading text-xl font-semibold flex items-center gap-2">
          {isPrivacy ? <Shield className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
          {isPrivacy ? 'پرائیویسی پالیسی' : 'شرائط و ضوابط'}
        </h1>
      </div>

      <div className="flex gap-2 mb-4 animate-rise" style={{ animationDelay: '0.08s' }}>
        <button onClick={() => setActive('privacy')} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${isPrivacy ? 'bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground border-[#e4ca86]' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`} dir="rtl">پرائیویسی</button>
        <button onClick={() => setActive('terms')} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${!isPrivacy ? 'bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground border-[#e4ca86]' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`} dir="rtl">شرائط</button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4 text-sm leading-relaxed animate-rise" style={{ animationDelay: '0.16s' }} dir="rtl">
        <p className="text-muted-foreground">آخری اپڈیٹ: 7 اگست 2026</p>
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-semibold mb-2">{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
