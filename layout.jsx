import React, { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigationType, Link, Navigate } from 'react-router-dom';
import { Home as HomeIcon, GraduationCap, BookOpen, BookText, MessageCircle, Settings, Languages, MoreHorizontal, History, Notebook, Database, Download, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage, LanguageProvider, useAuth } from '@/lib/app';
import { initReminderScheduler } from '@/lib/stores';
import { isDownloaded, getVerseCount, downloadFullQuran, isHadithDownloaded, downloadHadithCollections } from '@/lib/quran';

// ───────── components/BottomNav.jsx ─────────
export function BottomNav() {
  const { t } = useLanguage();
  const items = [
    { to: '/', label: t('nav_home'), icon: HomeIcon },
    { to: '/tajweed', label: t('nav_qaida'), icon: GraduationCap },
    { to: '/quran', label: t('nav_quran'), icon: BookOpen },
    { to: '/hadith', label: t('nav_hadith'), icon: BookText },
    { to: '/ai-chat', label: t('nav_aichat'), icon: MessageCircle },
    { to: '/settings', label: t('nav_settings'), icon: Settings },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 w-full h-[62px] grid grid-cols-6 items-center px-1 py-[6px] border-t border-[rgba(86,126,108,0.48)] rounded-t-[16px] bg-[rgba(10,29,25,0.95)] backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.3)] z-40 animate-rise"
      style={{ animationDelay: '0.7s' }}
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className="flex flex-col items-center gap-1 text-foreground/40 text-[9px] font-semibold tracking-[0.04em] transition-colors hover:text-[#f0d58e] active:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] focus-visible:rounded-md"
        >
          {({ isActive }) => (
            <>
              <span
                className={`w-[29px] h-[29px] rounded-[10px] grid place-items-center border transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-primary to-[#8c6b2d] text-primary-foreground border-[#e4ca86] shadow-[0_4px_12px_rgba(220,185,103,0.3)]'
                    : 'border-border bg-secondary/50 text-foreground/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className={isActive ? 'text-primary font-bold' : ''}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// ───────── components/LanguageToggle.jsx ─────────
// Floating language switch button — visible across all pages.
// One click toggles between Urdu (اردو) and English (EN).
// Persists choice via LanguageContext (localStorage).
export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const isUr = lang === 'ur';

  return (
    <button
      onClick={() => setLang(isUr ? 'en' : 'ur')}
      className="fixed top-3 right-3 z-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 bg-card/90 backdrop-blur-sm text-xs font-semibold text-foreground shadow-lg hover:bg-primary/15 hover:border-primary/60 transition-all active:scale-95"
      aria-label={isUr ? 'Switch to English' : 'اردو میں بدلیں'}
      title={isUr ? 'Switch to English' : 'اردو میں بدلیں'}
    >
      <Languages className="w-3.5 h-3.5 text-primary" />
      <span className="text-muted-foreground/60 text-[10px]">⇄</span>
      <span className={isUr ? '' : 'font-urdu'} dir={isUr ? 'ltr' : 'rtl'}>
        {isUr ? 'EN' : 'اردو'}
      </span>
    </button>
  );
}

// ───────── components/Layout.jsx ─────────
const getHashId = (hash) => {
  const rawId = hash.slice(1);
  try { return decodeURIComponent(rawId); } catch { return rawId; }
};

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType === "POP") return;
    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }, 50);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);
  return null;
}

export function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-muted-foreground/30">404</h1>
            <div className="h-0.5 w-16 bg-border mx-auto" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-medium text-foreground">Page Not Found</h2>
            <p className="text-muted-foreground leading-relaxed">The page <span className="font-medium text-foreground">"{pageName}"</span> could not be found in this application.</p>
          </div>
          <div className="pt-6">
            <button onClick={() => window.location.href = '/'} className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-secondary hover:border-primary/40 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout() {
  useEffect(() => { initReminderScheduler(); }, []);
  return (
    <LanguageProvider>
    <div className="relative min-h-screen bg-background overflow-hidden">
      <div className="fixed -top-[90px] -right-[80px] w-[230px] h-[230px] border border-primary/18 rounded-full shadow-[0_0_0_18px_rgba(193,156,78,0.04),0_0_0_36px_rgba(193,156,78,0.025)] animate-orb pointer-events-none -z-10" />
      <ScrollToTop />
      <LanguageToggle />
      <Outlet />
      <BottomNav />
    </div>
    </LanguageProvider>
  );
}

// ───────── components/HomeCornerMenu.jsx ─────────
export function HomeCornerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const items = [
    { to: '/reading-history', label: 'پڑھنے کی ہسٹری', icon: History },
    { to: '/notebook', label: 'نوٹ بک', icon: Notebook },
    { to: '/quran-data', label: 'ڈیٹا اسٹیٹس', icon: Database },
    { to: '/settings', label: 'سیٹنگز', icon: Settings },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menu"
        className="w-[34px] h-[34px] border border-border rounded-[11px] bg-secondary/72 text-muted-foreground grid place-items-center transition-all hover:bg-secondary hover:text-foreground hover:shadow-[0_5px_16px_rgba(0,0,0,0.25)] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute top-[40px] left-0 z-50 w-44 rounded-xl border border-border bg-popover shadow-[0_12px_32px_rgba(0,0,0,0.4)] overflow-hidden animate-rise">
          {items.map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground/90 hover:bg-secondary/60 transition-colors ${i > 0 ? 'border-t border-border/50' : ''}`}
              dir="rtl"
            >
              <item.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="font-urdu">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── components/AuthLayout.jsx ─────────
export function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}

// ───────── components/ProtectedRoute.jsx ─────────
const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

// Wrap routes that require a signed-in user.
export function ProtectedRoute({ redirectTo = '/login' }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <Spinner />;
  return isAuthenticated ? <Outlet /> : <Navigate to={redirectTo} replace />;
}

// ───────── components/OfflineDownloader.jsx ─────────
export function OfflineDownloader() {
  const [status, setStatus] = useState('checking'); // checking | idle | downloading | done | error
  const [progress, setProgress] = useState({ percent: 0, stage: '' });
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const qDone = await isDownloaded();
        const hDone = await isHadithDownloaded();
        if (qDone && hDone) {
          setStatus('done');
          setCount(await getVerseCount());
        } else {
          setStatus('idle');
        }
      } catch { setStatus('idle'); }
    })();
  }, []);

  const start = async () => {
    if (started.current) return;
    started.current = true;
    setStatus('downloading');
    try {
      const qDone = await isDownloaded();
      if (!qDone) {
        await downloadFullQuran((p) => setProgress({ ...p, stage: p.stage, percent: Math.round(p.percent * 0.6) }));
      }
      const hDone = await isHadithDownloaded();
      if (!hDone) {
        await downloadHadithCollections((p) => setProgress({ stage: p.stage, percent: 60 + Math.round(p.percent * 0.4) }));
      }
      setCount(await getVerseCount());
      setStatus('done');
    } catch {
      setStatus('error');
      started.current = false;
    }
  };

  // Auto-start on first visit (after a brief delay so the page renders first)
  useEffect(() => {
    if (status === 'idle' && !localStorage.getItem('quran-offline-dismissed')) {
      const t = setTimeout(() => start(), 1500);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (status === 'checking' || status === 'done') return null;

  if (status === 'downloading') {
    return (
      <div className="mt-4 animate-rise" style={{ animationDelay: '0.12s' }}>
        <div className="relative overflow-hidden border border-primary/40 rounded-2xl bg-gradient-to-br from-secondary/90 to-card/82 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-xl grid place-items-center bg-primary/15 border border-primary/30 text-primary shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground" dir="rtl">قرآن و احادیث آف لائن ڈاؤن لوڈ ہو رہی ہیں</p>
              <p className="text-[11px] text-muted-foreground" dir="rtl">{progress.stage}</p>
            </div>
            <span className="text-sm font-bold text-primary tabular-nums">{progress.percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center" dir="rtl">یہ ایک بار ہوگا — اس کے بعد آپ آف لائن بھی قرآن پڑھ سکیں گے</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mt-4 animate-rise">
        <div className="flex items-center gap-3 p-3.5 border border-destructive/40 rounded-2xl bg-destructive/10">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-xs text-foreground/80 flex-1" dir="rtl">ڈاؤن لوڈ ناکام ہوا۔ بعد میں دوبارہ کوشش کریں۔</p>
          <button onClick={start} className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10" dir="rtl">دوبارہ</button>
        </div>
      </div>
    );
  }

  // idle — manual download button (shown if auto-start was dismissed)
  return (
    <div className="mt-4 animate-rise" style={{ animationDelay: '0.12s' }}>
      <button
        onClick={start}
        className="w-full flex items-center gap-3 p-3.5 border border-primary/35 rounded-2xl bg-gradient-to-br from-[rgba(102,78,31,0.25)] to-[rgba(25,53,42,0.65)] transition-all hover:border-primary hover:shadow-[0_8px_22px_rgba(0,0,0,0.2)] active:translate-y-0.5"
      >
        <span className="w-9 h-9 rounded-xl grid place-items-center bg-primary/15 border border-primary/30 text-primary shrink-0">
          <Download className="w-4 h-4" />
        </span>
        <div className="flex-1 text-right">
          <p className="text-sm font-bold text-foreground" dir="rtl">قرآن و احادیث آف لائن ڈاؤن لوڈ کریں</p>
          <p className="text-[11px] text-muted-foreground" dir="rtl">قرآن + ۶ کتب حدیث — بغیر انٹرنیٹ تلاش کریں</p>
        </div>
      </button>
    </div>
  );
}
