import { Toaster } from '@/components/ui';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/app';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '@/lib/app';

import { Layout, PageNotFound } from '@/components/layout';

// Lazy-loaded pages for code splitting — improves startup speed
const Home = lazy(() => import('@/pages/Home'));
const Quran = lazy(() => import('@/pages/Library').then((m) => ({ default: m.Quran })));
const Reader = lazy(() => import('@/pages/Reader'));
const WordDetail = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.WordDetail })));
const VerseGrammar = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.VerseGrammar })));
const Hadith = lazy(() => import('@/pages/Library').then((m) => ({ default: m.Hadith })));
const Search = lazy(() => import('@/pages/Library').then((m) => ({ default: m.SearchPage })));
const AiChat = lazy(() => import('@/pages/AiChat'));
const Settings = lazy(() => import('@/pages/Settings'));
const Essentials = lazy(() => import('@/pages/Info').then((m) => ({ default: m.Essentials })));
const Tasbih = lazy(() => import('@/pages/Library').then((m) => ({ default: m.Tasbih })));
const Progress = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.Progress })));
const Tajweed = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.Tajweed })));
const QuranicArabic = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.QuranicArabic })));
const QuranDictionary = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.QuranDictionary })));
const Legal = lazy(() => import('@/pages/Info').then((m) => ({ default: m.Legal })));
const AboutContact = lazy(() => import('@/pages/Info').then((m) => ({ default: m.AboutContact })));
const Connect = lazy(() => import('@/pages/Info').then((m) => ({ default: m.Connect })));
const Notebook = lazy(() => import('@/pages/Notebook'));
const Topics = lazy(() => import('@/pages/Library').then((m) => ({ default: m.Topics })));
const QuranDataStatus = lazy(() => import('@/pages/Library').then((m) => ({ default: m.QuranDataStatus })));
const ReadingHistory = lazy(() => import('@/pages/Library').then((m) => ({ default: m.ReadingHistory })));
const Tutor = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.Tutor })));
const Words = lazy(() => import('@/pages/Learn').then((m) => ({ default: m.Words })));
const Articles = lazy(() => import('@/pages/Articles'));
const ArticleDetail = lazy(() => import('@/pages/Articles').then((m) => ({ default: m.ArticleDetail })));
const Admin = lazy(() => import('@/pages/Admin'));
const Login = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.ResetPassword })));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-[#e0b97a] border-t-[#9c6b3a] rounded-full animate-spin"></div>
  </div>
);

const AppRoutes = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/quran" element={<Quran />} />
          <Route path="/reader/:surahNumber/word/:ayah/:wordIndex" element={<WordDetail />} />
          <Route path="/reader/:surahNumber/grammar/:ayah" element={<VerseGrammar />} />
          <Route path="/reader/:surahNumber" element={<Reader />} />
          <Route path="/hadith" element={<Hadith />} />
          <Route path="/search" element={<Search />} />
          <Route path="/ai-chat" element={<AiChat />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/duas" element={<Essentials section="duas" />} />
          <Route path="/tasbih" element={<Tasbih />} />
          <Route path="/namaz" element={<Essentials section="namaz" />} />
          <Route path="/kalimas" element={<Essentials section="kalimas" />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/tajweed" element={<Tajweed />} />
          <Route path="/quranic-arabic" element={<QuranicArabic />} />
          <Route path="/quran-dictionary" element={<QuranDictionary />} />
          <Route path="/privacy-policy" element={<Legal section="privacy" />} />
          <Route path="/terms" element={<Legal section="terms" />} />
          <Route path="/about" element={<AboutContact section="about" />} />
          <Route path="/contact" element={<AboutContact section="contact" />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/quran-data" element={<QuranDataStatus />} />
          <Route path="/reading-history" element={<ReadingHistory />} />
          <Route path="/agent-chat" element={<Navigate to="/ai-chat" replace />} />
          <Route path="/tutor" element={<Tutor />} />
          <Route path="/words" element={<Words />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>

          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App