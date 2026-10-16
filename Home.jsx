import { HERO_IMG } from '@/lib/utils';
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BookText, Search, MessageCircle, Settings, Hand, Repeat, Clock, Scroll, Award, AudioLines, Languages, Bot, Notebook, GraduationCap, BookOpenCheck, Newspaper, Sparkles, Database } from 'lucide-react';
import { HomeCornerMenu } from '@/components/layout';
import { OfflineDownloader } from '@/components/layout';
import { useLanguage } from '@/lib/app';


export default function Home() {
  const { t } = useLanguage();

  const cards = [
    { to: '/quran', label: t('card_read_quran'), icon: BookOpen },
    { to: '/hadith', label: t('card_hadith'), icon: BookText },
    { to: '/search', label: t('card_search'), icon: Search },
    { to: '/topics', label: t('card_topics'), icon: Sparkles },
    { to: '/ai-chat', label: t('card_ai_chat'), icon: MessageCircle },
    { to: '/tutor', label: t('card_tutor'), icon: GraduationCap },
    { to: '/words', label: t('card_words'), icon: BookOpenCheck },
    { to: '/articles', label: t('card_articles'), icon: Newspaper },
    { to: '/settings', label: t('card_settings'), icon: Settings },
    { to: '/duas', label: t('card_duas'), icon: Hand },
    { to: '/tasbih', label: t('card_tasbih'), icon: Repeat },
    { to: '/namaz', label: t('card_namaz'), icon: Clock },
    { to: '/kalimas', label: t('card_kalimas'), icon: Scroll },
    { to: '/progress', label: t('card_progress'), icon: Award },
    { to: '/tajweed', label: t('card_tajweed'), icon: AudioLines },
    { to: '/quran-dictionary', label: t('card_dictionary'), icon: BookOpen },
    { to: '/quranic-arabic', label: t('card_quranic_arabic'), icon: Languages },
    { to: '/connect', label: t('card_connect'), icon: Bot },
    { to: '/notebook', label: t('card_notebook'), icon: Notebook },
    { to: '/quran-data', label: t('card_quran_data'), icon: Database },
  ];

  return (
    <div className="relative min-h-screen px-3.5 pt-4 pb-[102px] overflow-hidden">
      {/* Top bar */}
      <div className="relative z-50 flex items-center justify-between mb-6 animate-rise">
        <span className="inline-flex items-center gap-[7px] text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary))]" />
          Quran AI
        </span>
        <HomeCornerMenu />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden border border-border rounded-3xl min-h-[236px] px-[18px] py-[22px] flex flex-col justify-end shadow-[0_18px_35px_rgba(0,0,0,0.25)] animate-rise"
        style={{ animationDelay: '0.08s' }}
      >
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover -z-[2]" />
        <div className="absolute inset-0 -z-[1] bg-gradient-to-b from-[rgba(5,18,14,0.12)] to-[rgba(5,16,13,0.92)]" />
        <p className="font-quran text-[29px] leading-[1.25] text-right text-[#f4e7c2] mb-[5px]" dir="rtl">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
        <p className="text-xs text-[#c1cdc7] text-right m-0">
          In the name of Allah, the Most Gracious, the Most Merciful
        </p>
      </section>

      <OfflineDownloader />

      {/* Cards grid */}
      <section className="mt-6">
        <div className="grid grid-cols-2 gap-[9px]">
          {cards.map((c, i) => (
            <Link
              key={c.to}
              to={c.to}
              className="min-h-[106px] p-[13px_12px] rounded-[17px] border border-border bg-gradient-to-br from-[rgba(20,51,42,0.88)] to-[rgba(10,29,25,0.94)] flex flex-col items-end justify-between gap-2.5 transition-all hover:border-[#a98a49] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(0,0,0,0.22)] active:bg-secondary active:translate-y-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 animate-rise"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="w-8 h-8 rounded-[10px] self-start grid place-items-center bg-primary/13 border border-primary/28 text-primary">
                <c.icon className="w-4 h-4" />
              </span>
              <span className="text-sm leading-[1.35] text-right text-foreground" dir="rtl">{c.label}</span>
            </Link>
          ))}
        </div>

        {/* Tip */}
        <div
          className="mt-3.5 p-3.5 rounded-[17px] border border-primary/35 bg-gradient-to-br from-[rgba(102,78,31,0.25)] to-[rgba(25,53,42,0.65)] text-[#dfdfc9] font-urdu text-[13px] leading-[1.9] text-right animate-rise"
          style={{ animationDelay: '0.62s' }}
          dir="auto"
        >
          {t('home_tip')}
        </div>
      </section>
    </div>
  );
}