# Quran Wisdom AI

React + Vite app on **Supabase** (Auth, Postgres, one Edge Function). No Base44 or other hosted-platform dependency.

**Features:** Quran reader (word-by-word, Urdu meanings, tafsir, related ayahs/hadith) · Hadith library · AI Q&A (Islamic questions only, every reference verified against the database) · **voice** (speak questions, listen to answers) · **Voice Tutor** (per-word makhraj, thick/thin letters, madd, ghunnah, qalqalah + recitation check) · **Daily Words** (5/10/50 words with Urdu meaning, frequency in the Quran, coverage %) · Research Articles (admin-published, linked to ayahs, used by the AI as clearly-labelled human research) · Admin panel (feedback inbox + article publishing) · Tajweed, Qaida, Tasbih, Notebook, offline downloads.

## 1. Supabase setup (once)

1. Create a project at supabase.com.
2. SQL Editor → run `supabase/schema.sql` (safe to re-run).
3. Authentication → Providers: Email is on by default. For the 6-digit code on the Register page put `{{ .Token }}` in the *Confirm signup* email template (or turn "Confirm email" off). Google is optional.
4. Authentication → URL Configuration: add your site URL and `<site>/reset-password` to the redirect list.

## 2. Environment

```bash
cp .env.example .env.local     # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
```
(Windows CMD: `copy .env.example .env.local`)

## 3. Load the authentic data

```bash
export SUPABASE_URL=https://YOUR-PROJECT.supabase.co        # Windows CMD: set SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...                        # Project Settings → API (keep secret)
npm run seed                                                # ~5–10 min; safe to re-run
npm run seed:dry                                            # download + validate only
```

| Data | Source | Size |
|---|---|---|
| Quran text (KFGQPC Uthmani Hafs; juz/page/ruku/manzil/hizb/sajdah) + searchable Arabic skeleton | fawazahmed0/quran-api | 6,236 ayahs |
| Urdu (Fateh Muhammad Jalandhry), English (Saheeh International) | fawazahmed0/quran-api (Tanzil) | 6,236 each |
| Tafsir: Ibn Kathir (Urdu + English), Maarif-ul-Quran, Bayan-ul-Quran, Muyassar | spa5k/tafsir_api | 6,236 each |
| Hadith (Urdu + English): Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Malik + 40-hadith sets, with chapters and grades | fawazahmed0/hadith-api | ~90k |
| Quran dictionary (1,634 words with frequency) | `src/lib/dictionary.js` | 1,634 |
| Topic taxonomy (names only) | built-in | 30 |

Every row stores `source`, `edition`, `license`, `version`; each run is logged in `import_logs`. Hadith with no text in the Urdu source are skipped, never invented. Topic↔verse relations are not auto-generated.

## 4. AI + voice (Edge Function)

```bash
npm i -g supabase && supabase login && supabase link --project-ref YOUR-REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set AI_MODEL=claude-sonnet-5-5      # optional
supabase functions deploy api
```

`supabase/functions/api` (one function) has two actions: `invoke` (guard-railed AI — refuses non-Islamic tasks even if called directly) and `learning` (shared learning analytics). The API key never reaches the browser.

**How answers stay trustworthy:** the AI first decides whether the question is Islamic (otherwise it politely refuses); expands it into Quranic Arabic / Urdu / English terms (e.g. قیامت → القيامة، الساعة، يوم الدين، الحاقة، القارعة…); searches the database (translations, Arabic text, hadith, tafsir, articles); writes a draft; then **every cited ayah/hadith/tafsir/article is re-checked against what was retrieved** — anything unmatched is dropped and the stored database text replaces the model's wording.

Voice uses the browser (Web Speech API; Chrome/Edge/Safari). Urdu/Arabic speech needs a system voice installed on the device.

## 5. Admin (feedback + articles)

Sign up in the app, then run once in the SQL Editor:
```sql
INSERT INTO admins (user_id) SELECT id FROM auth.users WHERE email = 'you@example.com';
```
Settings → Account now shows **ایڈمن پینل**. There you can read all feedback (who sent it, status new/seen/resolved, reply by email) and write/publish articles (Markdown, linked ayahs like `2:255, 112:1-4`, source links). Published articles appear under Articles, under the linked ayah in the Reader, and in AI answers as a separate "research article" section.

## 6. Run

```bash
npm run dev      # development
npm run build    # production build → dist/
```

## Project layout (kept small on purpose)

```
src/api/backend.js        Supabase client, auth, tables, AI, synced state
src/lib/                  data · dictionary · quran (APIs/offline) · engine (AI) · tajweed (tutor, speech) · stores · app (auth/language) · utils
src/components/           ui · layout · ai · quran · practice
src/pages/                Home Reader AiChat Settings Notebook Articles Admin + Auth Info Learn Library (grouped pages)
supabase/                 schema.sql · config.toml · functions/api/index.ts
scripts/seed.mjs          authentic-data seeder
```
