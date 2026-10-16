-- ============================================================
-- Quran Wisdom AI — Supabase schema (auth + data, no third-party platform)
-- Run once in the Supabase SQL Editor, then run `npm run seed`.
-- Safe to re-run.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ───────── Reference data (public read, written only by the seeder) ─────────
CREATE TABLE IF NOT EXISTS ayahs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  surah integer NOT NULL, ayah integer NOT NULL, ayah_global integer NOT NULL,
  surah_name_arabic text, surah_name_english text, text_uthmani text NOT NULL, text_skeleton text,
  juz integer, page integer, ruku integer, manzil integer, hizb integer,
  sajdah boolean DEFAULT false, description text,
  text_clean text
);
ALTER TABLE ayahs ADD COLUMN IF NOT EXISTS text_clean text;
CREATE INDEX IF NOT EXISTS idx_ayahs_surah_ayah ON ayahs (surah, ayah);
CREATE INDEX IF NOT EXISTS idx_ayahs_ayah_global ON ayahs (ayah_global);
CREATE INDEX IF NOT EXISTS idx_ayahs_skeleton_trgm ON ayahs USING gin (text_skeleton gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ayahs_clean_trgm ON ayahs USING gin (text_clean gin_trgm_ops);
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  surah integer NOT NULL, ayah integer NOT NULL, ayah_global integer NOT NULL,
  language text NOT NULL, translator text, edition text NOT NULL, text text NOT NULL,
  source text, license text, version text
);
CREATE INDEX IF NOT EXISTS idx_trans_surah_ayah_lang ON translations (surah, ayah, language);
CREATE INDEX IF NOT EXISTS idx_trans_global ON translations (ayah_global, language);
CREATE INDEX IF NOT EXISTS idx_trans_text_trgm ON translations USING gin (text gin_trgm_ops);
CREATE TABLE IF NOT EXISTS tafsirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  surah integer NOT NULL, ayah integer NOT NULL, ayah_global integer NOT NULL,
  language text NOT NULL, author text, edition text, text text NOT NULL,
  source text, license text, version text
);
CREATE INDEX IF NOT EXISTS idx_tafsir_surah_ayah ON tafsirs (surah, ayah);
CREATE INDEX IF NOT EXISTS idx_tafsir_edition ON tafsirs (edition);
CREATE TABLE IF NOT EXISTS hadiths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  collection text NOT NULL, hadith_number integer NOT NULL, book integer, chapter text,
  language text NOT NULL, text text NOT NULL, grade text, narrator text, reference text,
  source text, edition text, license text, version text, status text
);
CREATE INDEX IF NOT EXISTS idx_hadiths_coll_lang_book ON hadiths (collection, language, book);
CREATE INDEX IF NOT EXISTS idx_hadiths_coll_num_lang ON hadiths (collection, hadith_number, language);
CREATE INDEX IF NOT EXISTS idx_hadiths_text_trgm ON hadiths USING gin (text gin_trgm_ops);
CREATE TABLE IF NOT EXISTS hadith_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  collection text NOT NULL, language text NOT NULL, book integer NOT NULL, chapter_name text NOT NULL,
  hadith_first integer, hadith_last integer, description text
);
CREATE INDEX IF NOT EXISTS idx_hc_coll_lang ON hadith_chapters (collection, language);
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  name_ar text, name_ur text, name_en text NOT NULL, description text, keywords text,
  synonyms text, parent_id text, status text
);

CREATE TABLE IF NOT EXISTS quran_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  serial_no integer, arabic_word text, urdu_meaning text, english_meaning text,
  occurrence_count integer, frequency_category text, arabic_letter text, description text
);
CREATE INDEX IF NOT EXISTS idx_qd_arabic_word ON quran_dictionary (arabic_word);
CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  dataset text, source text, records_imported integer, records_failed integer, version text,
  status text, started_at timestamptz, finished_at timestamptz, notes text
);

CREATE TABLE IF NOT EXISTS ayah_tafsir_rels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  ayah_global integer, tafsir_id text, relationship_type text, source text, verification_status text, description text
);

CREATE TABLE IF NOT EXISTS ayah_topic_rels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  ayah_global integer, topic_id text, relationship_type text, source text, verification_status text, description text
);

CREATE TABLE IF NOT EXISTS ayah_hadith_rels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  ayah_global integer, hadith_collection text, hadith_number integer, relationship_type text, source text, verification_status text, description text
);

CREATE TABLE IF NOT EXISTS hadith_tafsir_rels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  hadith_collection text, hadith_number integer, tafsir_id text, relationship_type text, source text, verification_status text, description text
);

CREATE TABLE IF NOT EXISTS hadith_topic_rels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  hadith_collection text, hadith_number integer, topic_id text, relationship_type text, source text, verification_status text, description text
);

CREATE TABLE IF NOT EXISTS learning_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  tajweed_category text, best_sequence text, effectiveness_score numeric,
  avg_time_to_mastery_minutes integer, users_who_benefited integer, description text
);
CREATE INDEX IF NOT EXISTS idx_lm_category ON learning_methods (tajweed_category);
-- ───────── User data (each row visible only to its owner) ─────────
CREATE TABLE IF NOT EXISTS learning_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  verse_key text, word_index integer, attempt_count integer, error_type text,
  accuracy_score numeric, mastered boolean DEFAULT false, description text
);
CREATE INDEX IF NOT EXISTS idx_lr_owner ON learning_records (created_by_id);
CREATE INDEX IF NOT EXISTS idx_lr_error_type ON learning_records (error_type);
CREATE TABLE IF NOT EXISTS user_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  kind text, content_type text, ref text, title text, note text, description text
);
CREATE INDEX IF NOT EXISTS idx_um_owner ON user_marks (created_by_id);
CREATE TABLE IF NOT EXISTS reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  content_type text, ref text, title text, visited_at timestamptz DEFAULT now(), description text
);
CREATE INDEX IF NOT EXISTS idx_rh_owner ON reading_history (created_by_id);
CREATE TABLE IF NOT EXISTS research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  item_type text CHECK (item_type IN ('verse','hadith','insight')), citation text NOT NULL,
  content text NOT NULL, source_ref text, notes text, tags text, collection_id text
);
CREATE INDEX IF NOT EXISTS idx_rn_owner ON research_notes (created_by_id);
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  name text NOT NULL, description text, color text DEFAULT 'gold'
);
CREATE INDEX IF NOT EXISTS idx_col_owner ON collections (created_by_id);
-- ───────── Feedback + agent conversations ─────────
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  name text, email text, type text, message text NOT NULL, screenshot_url text,
  status text NOT NULL DEFAULT 'new'
);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_date timestamptz DEFAULT now();

-- ───────── Admins + articles + synced user state ─────────
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_date timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
  $$ SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) $$;

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  title text NOT NULL,
  summary text,
  body text NOT NULL,
  category text DEFAULT 'science',
  ayah_refs jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{"surah":2,"ayah":255}]
  keywords text,
  source_links jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{"title":"Nature 2020","url":"https://…"}]
  author_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_text_trgm ON articles USING gin ((coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(keywords,'') || ' ' || body) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS user_state (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_date timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_note text;

-- Admins / developers (add yourself with the INSERT shown at the bottom of this file)
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_date timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS
$$ SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()); $$;

-- Articles written by admins (e.g. scientific research linked to an ayah). Read by readers AND by the AI.
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  updated_date timestamptz DEFAULT now(),
  created_by_id text DEFAULT (auth.uid())::text,
  title text NOT NULL,
  summary text,
  body text NOT NULL,
  category text DEFAULT 'science',
  ayah_refs text,        -- e.g. "23:12,23:13,41:53" or ranges "23:12-14"
  hadith_refs text,
  keywords text,
  source_name text,
  source_url text,
  author_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status, published_at DESC);


-- ───────── Row Level Security ─────────
DO $$
DECLARE tbl text;
  ref_tables text[] := ARRAY['ayahs','hadiths','hadith_chapters','translations','tafsirs','topics','ayah_tafsir_rels','ayah_topic_rels','ayah_hadith_rels','hadith_tafsir_rels','hadith_topic_rels','import_logs','quran_dictionary','learning_methods'];
  user_tables text[] := ARRAY['learning_records','user_marks','reading_history','research_notes','collections'];
BEGIN
  FOREACH tbl IN ARRAY ref_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS public_read ON %I', tbl);
    EXECUTE format('CREATE POLICY public_read ON %I FOR SELECT TO anon, authenticated USING (true)', tbl);
  END LOOP;
  FOREACH tbl IN ARRAY user_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I', tbl);
    EXECUTE format('CREATE POLICY owner_all ON %I FOR ALL TO authenticated USING (created_by_id = (auth.uid())::text) WITH CHECK (created_by_id = (auth.uid())::text)', tbl);
  END LOOP;
END $$;

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feedback_insert ON feedback;
CREATE POLICY feedback_insert ON feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS feedback_admin_all ON feedback;
CREATE POLICY feedback_admin_all ON feedback FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS feedback_own_read ON feedback;
CREATE POLICY feedback_own_read ON feedback FOR SELECT TO authenticated USING (created_by_id = (auth.uid())::text);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_self ON admins;
CREATE POLICY admins_self ON admins FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS articles_read_published ON articles;
CREATE POLICY articles_read_published ON articles FOR SELECT TO anon, authenticated USING (status = 'published' OR is_admin());
DROP POLICY IF EXISTS articles_admin_write ON articles;
CREATE POLICY articles_admin_write ON articles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_state_owner ON user_state;
CREATE POLICY user_state_owner ON user_state FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS feedback_admin_all ON feedback;
CREATE POLICY feedback_admin_all ON feedback FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_self ON admins;
CREATE POLICY admins_self ON admins FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS articles_public_read ON articles;
CREATE POLICY articles_public_read ON articles FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS articles_admin_all ON articles;
CREATE POLICY articles_admin_all ON articles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ───────── updated_date trigger ─────────
CREATE OR REPLACE FUNCTION update_updated_date() RETURNS trigger AS $$
BEGIN NEW.updated_date = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
DECLARE tbl text;
  tables text[] := ARRAY['feedback','articles','ayahs','hadiths','hadith_chapters','translations','tafsirs','topics','ayah_tafsir_rels','ayah_topic_rels','ayah_hadith_rels','hadith_tafsir_rels','hadith_topic_rels','import_logs','quran_dictionary','learning_methods','learning_records','user_marks','reading_history','research_notes','collections'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_date()', tbl, tbl);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_articles_updated ON articles;
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_date();

-- ───────── Storage: optional feedback screenshots ─────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feedback-screenshots', 'feedback-screenshots', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS feedback_screenshots_insert ON storage.objects;
CREATE POLICY feedback_screenshots_insert ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'feedback-screenshots');

-- ───────── Make yourself an admin (run once, after signing up in the app) ─────────
-- INSERT INTO admins (user_id, email) SELECT id, email FROM auth.users WHERE email = 'you@example.com' ON CONFLICT DO NOTHING;

-- ───────── Make yourself an admin (run once, with YOUR email) ─────────
-- INSERT INTO admins (user_id) SELECT id FROM auth.users WHERE email = 'you@example.com';
