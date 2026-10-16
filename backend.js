// ════════════════════════════════════════════════════════════════
// The app's single backend facade (Supabase):
//   backend.auth / entities / ai / learning / articles / admin / state
// ════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(url && anonKey);
if (!isSupabaseConfigured) console.warn('[Quran Wisdom] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — copy .env.example to .env.local.');

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'anon-key-not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ─── Auth ───
const toUser = (u) => (u ? { id: u.id, email: u.email, full_name: u.user_metadata?.full_name || u.user_metadata?.name || '' } : null);

const auth = {
  async me() {
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user) { const err = new Error('Not authenticated'); err.status = 401; throw err; }
    return toUser(data.session.user);
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return toUser(data.user);
  },
  /** Returns { needsVerification } — true when the project requires an email code/link first. */
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
    return { needsVerification: !data.session };
  },
  async verifyOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) throw error;
    return toUser(data.user);
  },
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw error;
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw error;
  },
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
  async signOut() { await supabase.auth.signOut(); },
  onChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  },
  /** True when the signed-in user is listed in the `admins` table. */
  async isAdmin() {
    if (!isSupabaseConfigured) return false;
    const { data: s } = await supabase.auth.getSession();
    if (!s?.session?.user) return false;
    const { data } = await supabase.from('admins').select('user_id').eq('user_id', s.session.user.id).maybeSingle();
    return !!data;
  },
};

// ─── Edge Function ───
async function callApi(body) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('api', { body });
  if (error) {
    let detail = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) detail = j.error; } catch { /* keep generic message */ }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const ai = {
  /** invoke({ prompt, response_json_schema? }) → parsed object when a schema is given, else text. */
  async invoke({ prompt, response_json_schema, max_tokens }) {
    const data = await callApi({ action: 'invoke', prompt, response_json_schema, max_tokens });
    return data.result;
  },
};

const learning = { refreshBestMethods: () => callApi({ action: 'learning' }) };

// ─── Per-user synced state (small JSON blobs, e.g. learned words) ───
const state = {
  async get(key) {
    const { data: s } = await supabase.auth.getSession();
    if (!s?.session?.user) return null;
    const { data } = await supabase.from('user_state').select('value').eq('key', key).maybeSingle();
    return data?.value ?? null;
  },
  async set(key, value) {
    const { data: s } = await supabase.auth.getSession();
    if (!s?.session?.user) return;
    await supabase.from('user_state').upsert({ user_id: s.session.user.id, key, value, updated_date: new Date().toISOString() });
  },
};

// ─── Entities (uniform CRUD over the tables; reference tables are public-read, user tables are RLS-protected) ───
const TABLE_MAP = {
  Ayah: 'ayahs',
  Hadith: 'hadiths',
  HadithChapter: 'hadith_chapters',
  Translation: 'translations',
  Tafsir: 'tafsirs',
  LearningRecord: 'learning_records',
  LearningMethod: 'learning_methods',
  UserMark: 'user_marks',
  ReadingHistory: 'reading_history',
  Topic: 'topics',
  AyahTopicRel: 'ayah_topic_rels',
  HadithTopicRel: 'hadith_topic_rels',
  AyahTafsirRel: 'ayah_tafsir_rels',
  HadithTafsirRel: 'hadith_tafsir_rels',
  AyahHadithRel: 'ayah_hadith_rels',
  ImportLog: 'import_logs',
  QuranDictionary: 'quran_dictionary',
  ResearchNote: 'research_notes',
  Collection: 'collections',
  Article: 'articles',
  Feedback: 'feedback',
};

// Tables whose rows belong to one signed-in user.
const USER_SCOPED = new Set(['LearningRecord', 'UserMark', 'ReadingHistory', 'ResearchNote', 'Collection']);

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

function parseSort(sort) {
  if (!sort) return null;
  if (sort === 'created_date' || sort === '-created_date') return { column: sort.replace('-', ''), ascending: !sort.startsWith('-') };
  return sort.startsWith('-') ? { column: sort.slice(1), ascending: false } : { column: sort, ascending: true };
}

// MongoDB-style filter object → PostgREST builder calls.
function applyQuery(builder, query) {
  if (!query) return builder;
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.$regex !== undefined) {
        // Escape LIKE wildcards so user text is matched literally.
        const safe = String(value.$regex).replace(/[\\%_]/g, (m) => `\\${m}`);
        builder = builder.ilike(key, `%${safe}%`);
      } else if (value.$gte !== undefined) builder = builder.gte(key, value.$gte);
      else if (value.$lte !== undefined) builder = builder.lte(key, value.$lte);
      else if (value.$gt !== undefined) builder = builder.gt(key, value.$gt);
      else if (value.$lt !== undefined) builder = builder.lt(key, value.$lt);
      else if (value.$ne !== undefined) builder = builder.neq(key, value.$ne);
      else if (value.$in !== undefined) builder = builder.in(key, value.$in);
    } else {
      builder = builder.eq(key, value);
    }
  }
  return builder;
}

function createEntity(entityName) {
  const table = TABLE_MAP[entityName];
  const userScoped = USER_SCOPED.has(entityName);

  const requireUser = async () => {
    const uid = await currentUserId();
    if (!uid) throw new Error('Sign in required');
    return uid;
  };

  const run = async (query, sort, limit) => {
    if (!isSupabaseConfigured) return [];
    if (userScoped && !(await currentUserId())) return [];
    let q = query(supabase.from(table).select('*'));
    const s = parseSort(sort);
    if (s) q = q.order(s.column, { ascending: s.ascending });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };

  return {
    list: (sort, limit) => run((q) => q, sort, limit),
    filter: (query, sort, limit) => run((q) => applyQuery(q, query), sort, limit),

    async get(id) {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(data) {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured');
      const record = { ...data };
      if (userScoped) record.created_by_id = await requireUser();
      const { data: row, error } = await supabase.from(table).insert(record).select('*').single();
      if (error) throw error;
      return row;
    },

    async bulkCreate(items) {
      if (!isSupabaseConfigured || !items?.length) return [];
      let records = items;
      if (userScoped) {
        const uid = await requireUser();
        records = items.map((i) => ({ ...i, created_by_id: uid }));
      }
      const { data, error } = await supabase.from(table).insert(records).select('*');
      if (error) throw error;
      return data || [];
    },

    async update(id, data) {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured');
      const { data: row, error } = await supabase.from(table).update(data).eq('id', id).select('*').single();
      if (error) throw error;
      return row;
    },

    async delete(id) {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },

    async deleteMany(query) {
      if (!isSupabaseConfigured) return;
      const { error } = await applyQuery(supabase.from(table).delete(), query);
      if (error) throw error;
    },
  };
}

const entities = Object.fromEntries(Object.keys(TABLE_MAP).map((n) => [n, createEntity(n)]));

export const backend = { auth, entities, ai, learning, state };
