import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, Trash2, Check, Shield, FileText, Info, Mail, Send, MessageSquare, Bell, Clock, Languages, LogIn, LogOut, User } from 'lucide-react';
import { useLanguage } from '@/lib/app';
import { useAuth } from '@/lib/app';
import { backend } from '@/api/backend';
import { getReminderSettings, saveReminderSettings, getPermission, requestPermission, notificationSupported } from '@/lib/stores';

const RECITERS = [
  { id: 'ar.alafasy', name: 'مشارى راشد العفاسی' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد (مرتل)' },
  { id: 'ar.husary', name: 'محمود خلیل الحصری' },
  { id: 'ar.minshawi', name: 'محمد صدیق المنشاوی' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [reciter, setReciter] = useState(localStorage.getItem('quran-reciter') || 'ar.alafasy');
  const [cleared, setCleared] = useState(false);
  const [reminder, setReminder] = useState(getReminderSettings);
  const [permission, setPermission] = useState(getPermission);
  const { t, lang, setLang } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  React.useEffect(() => { if (isAuthenticated) backend.auth.isAdmin().then(setIsAdmin).catch(() => {}); else setIsAdmin(false); }, [isAuthenticated]);

  const toggleReminder = async () => {
    const next = { ...reminder, enabled: !reminder.enabled };
    setReminder(next);
    saveReminderSettings(next);
    if (next.enabled && getPermission() !== 'granted') {
      setPermission(await requestPermission());
    }
  };

  const changeTime = (time) => {
    const next = { ...reminder, time };
    setReminder(next);
    saveReminderSettings(next);
  };

  const enableAndAsk = async () => {
    const result = await requestPermission();
    setPermission(result);
    if (result === 'granted' && !reminder.enabled) {
      const next = { ...reminder, enabled: true };
      setReminder(next);
      saveReminderSettings(next);
    }
  };

  const saveReciter = (id) => { setReciter(id); localStorage.setItem('quran-reciter', id); };

  const clearCache = () => {
    Object.keys(localStorage).filter(k => k.startsWith('quran-')).forEach(k => localStorage.removeItem(k));
    setCleared(true);
    setTimeout(() => setCleared(false), 1800);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-xl font-semibold flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-primary" /> {t('settings_title')}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-medium">{lang === 'ur' ? 'اکاؤنٹ' : 'Account'}</h2>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate" dir="ltr">{user?.email}</p>
              {isAdmin && <Link to="/admin" className="text-xs text-primary underline">ایڈمن پینل (فیڈ بیک اور مضامین)</Link>}
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm shrink-0">
              <LogOut className="w-4 h-4" /> {lang === 'ur' ? 'لاگ آؤٹ' : 'Log out'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
              {lang === 'ur' ? 'لاگ اِن کریں تاکہ آپ کی پراگریس اور نوٹس محفوظ رہیں۔' : 'Sign in to keep your progress and notes saved to your account.'}
            </p>
            <Link to="/login" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm shrink-0">
              <LogIn className="w-4 h-4" /> {lang === 'ur' ? 'لاگ اِن' : 'Log in'}
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Languages className="w-4 h-4 text-primary" />
          <h2 className="font-medium" dir="rtl">{t('settings_language')}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3" dir="rtl">{t('settings_language_desc')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setLang('ur')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${lang === 'ur' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/50 border-border'}`}
            dir="rtl"
          >
            {t('settings_lang_urdu')}
          </button>
          <button
            onClick={() => setLang('en')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${lang === 'en' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/50 border-border'}`}
          >
            {t('settings_lang_english')}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <h2 className="font-medium mb-3" dir="rtl">قاری منتخب کریں</h2>
        <div className="space-y-2">
          {RECITERS.map(r => (
            <button key={r.id} onClick={() => saveReciter(r.id)} className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/50 text-left transition-colors">
              <span className="font-urdu text-sm" dir="rtl">{r.name}</span>
              {reciter === r.id && <Check className="w-4 h-4 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <button onClick={clearCache} className="w-full flex items-center gap-2 text-destructive font-medium">
          <Trash2 className="w-4 h-4" /> <span dir="rtl">{cleared ? 'کیشے صاف ہو گیا' : 'کیشے صاف کریں'}</span>
        </button>
        <p className="text-xs text-muted-foreground mt-2" dir="rtl">محفوظ شدہ سورتیں اور تجزیہ ڈیلیٹ ہو جائے گا۔</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="font-medium" dir="rtl">روزانہ یاد دہانی</h2>
        </div>
        <p className="text-sm font-urdu leading-relaxed text-foreground/90 mb-3" dir="rtl">
          ہر روز مقررہ وقت پر تلاوت کی پریکٹس کا تذکرہ۔
        </p>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-sm" dir="rtl">یاد دہانی فعال کریں</span>
          <button
            onClick={toggleReminder}
            role="switch"
            aria-checked={reminder.enabled}
            className={`relative w-12 h-7 rounded-full transition-colors ${reminder.enabled ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${reminder.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" dir="rtl">وقت منتخب کریں</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <input
              type="time"
              value={reminder.time}
              onChange={(e) => changeTime(e.target.value)}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/60"
              dir="ltr"
            />
          </div>
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-destructive mt-3" dir="rtl">نوٹیفکیشن کی اجازت بند ہے — براؤزر سیٹنگز سے اجازت دیں۔</p>
        )}
        {permission === 'default' && reminder.enabled && (
          <button onClick={enableAndAsk} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-primary/30 bg-primary/5 text-primary font-semibold text-sm hover:bg-primary/10 transition-colors">
            <Bell className="w-4 h-4" /> <span dir="rtl">نوٹیفیکیشن کی اجازت دیں</span>
          </button>
        )}
        {!notificationSupported() && (
          <p className="text-xs text-muted-foreground mt-3" dir="rtl">آپ کا براؤزر نوٹیفکیشنز کی حمایت نہیں کرتا۔</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed" dir="rtl">
          یاد دہانی اس وقت بھیجی جائے گی جب ایپ کھلی ہو۔ بہترین نتائج کے لیے ایپ کو کھلا رکھیں۔
        </p>
      </div>

      <div className="rounded-xl border-2 border-accent/40 bg-accent/10 p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-accent" />
          <h2 className="font-medium" dir="rtl">ہیلپ اور سپورٹ</h2>
        </div>
        <p className="text-sm font-urdu leading-relaxed text-foreground/90 mb-3" dir="rtl">
          ہماری کوشش ہے کہ قرآن کا متن اور ترجمہ ہر ممکن حد تک درست رہے۔ اگر آپ کو کوئی بھی آیت غلط، کوتاہی یا ترجمے میں خامی نظر آئے، تو براہ کرم ہماری ٹیم کو آگاہ کریں، تاکہ ہم اس کی فوری درستی کر سکیں۔ جزاک اللہ خیر۔
        </p>
        <Link to="/contact" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-b from-[#e0b97a] to-[#9c6b3a] border border-primary/50 text-[#3e2a1d] font-semibold text-sm shadow-[0_4px_7px_rgba(62,42,29,0.28),inset_0_1.5px_1px_rgba(255,255,255,0.7)] active:translate-y-0.5 transition-transform">
          <Send className="w-4 h-4" /> <span dir="rtl">غلطی کی نشاندہی کریں</span>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="font-medium" dir="rtl">فیڈبیک</h2>
        </div>
        <p className="text-sm font-urdu leading-relaxed text-foreground/90 mb-3" dir="rtl">
          آپ کی رائے ہمارے لیے قیمتی ہے۔ اپنی تجاویز اور خیالات ہمارے ساتھ شیئر کریں۔
        </p>
        <Link to="/contact" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary/30 bg-primary/5 text-primary font-semibold text-sm hover:bg-primary/10 transition-colors">
          <MessageSquare className="w-4 h-4" /> <span dir="rtl">فیڈبیک بھیجیں</span>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <h2 className="font-medium mb-3" dir="rtl">قانونی</h2>
        <div className="space-y-2">
          <Link to="/privacy-policy" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm" dir="rtl">پرائیویسی پالیسی</span>
          </Link>
          <Link to="/terms" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm" dir="rtl">شرائط و ضوابط</span>
          </Link>
          <Link to="/about" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm" dir="rtl">ہمارے بارے میں</span>
          </Link>
          <Link to="/contact" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <Mail className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm" dir="rtl">ہم سے رابطہ</span>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center" dir="rtl">قرآن اے آئی — قرآن، ترجمہ، تفسیر، احادیث اور AI سہولیات۔</p>
        </div>
        <p className="text-xs text-muted-foreground text-center" dir="rtl">ورژن 1.0.0</p>
      </div>
    </div>
  );
}