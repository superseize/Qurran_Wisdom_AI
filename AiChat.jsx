import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Loader2, Sparkles, Plus, History, Trash2, X, Copy, Check, Pencil, Volume2, VolumeX, Mic, MicOff, Square } from 'lucide-react';
import { askEngine } from '@/lib/engine';
import { AnswerView, answerToText } from '@/components/ai';
import { getOrCreateCurrentChat, saveChat, getAllChats, deleteChat, createNewChat, setCurrentChatId } from '@/lib/engine';
import { speak, stopSpeaking, listen, ttsSupported, sttSupported } from '@/lib/tajweed';

const STAGE_LABELS = {
  translating: 'اردو الفاظ کا عربی ترجمہ…',
  understanding: 'سوال سمجھا جا رہا ہے…',
  searching: 'قرآن، احادیث، تفاسیر اور مضامین میں تلاش…',
  deep_searching: 'ڈیٹا بیس میں نہیں ملا — عربی میں گہری تلاش…',
  outlining: 'جواب کا خاکہ تیار ہو رہا ہے…',
  verifying: 'تجزیہ…',
  checking: 'ہر حوالے کی ڈیٹا بیس سے تصدیق…',
};

const WELCOME_MSG = { id: 'welcome', role: 'assistant', text: 'السلام علیکم! میں Quran Wisdom AI ہوں — قرآن، صحیح احادیث، تفاسیر اور تحقیقی مضامین میں مفہوم کے اعتبار سے تلاش کرتا ہوں اور صرف تصدیق شدہ مآخذ سے حوالہ دیتا ہوں۔ میں صرف اسلامی سوالات کا جواب دیتا ہوں۔ اپنا سوال لکھیں یا مائیک دبا کر بولیں۔' };

const uid = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const withIds = (msgs) => (msgs || []).map((m) => (m.id ? m : { ...m, id: uid() }));

function errorText(e) {
  const msg = String(e?.message || '');
  if (/ANTHROPIC_API_KEY|not configured|Supabase|Failed to send|FunctionsFetch|non-2xx/i.test(msg)) return 'AI سروس ابھی سیٹ اپ نہیں ہے۔ README کے مطابق Supabase Edge Function ڈیپلوی کریں اور ANTHROPIC_API_KEY سیٹ کریں۔';
  if (/Too many/i.test(msg)) return 'بہت زیادہ درخواستیں — براہ کرم ایک منٹ بعد دوبارہ کوشش کریں۔';
  return 'معذرت، کچھ مسئلہ ہو گیا۔ براہ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔';
}

function MessageActions({ onCopy, copied, children }) {
  return (
    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
      <button onClick={onCopy} className="p-1.5 rounded-md hover:bg-secondary/60 hover:text-foreground" aria-label="کاپی" title="کاپی">
        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {children}
    </div>
  );
}

export default function AiChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [currentChatId, setCurrentChatIdState] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [voiceMode, setVoiceMode] = useState(() => localStorage.getItem('quran-ai-voice-mode') === '1');
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const endRef = useRef(null);
  const voiceModeRef = useRef(voiceMode);
  voiceModeRef.current = voiceMode;

  useEffect(() => {
    const chat = getOrCreateCurrentChat();
    setCurrentChatIdState(chat.id);
    if (chat.messages?.length) setMessages(withIds(chat.messages));
    setChatList(getAllChats());
    return () => { stopSpeaking(); recRef.current?.stop(); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy, stage]);

  const persistMessages = useCallback((msgs, chatId) => {
    const id = chatId || currentChatId;
    if (!id) return;
    const first = msgs.find((m) => m.role === 'user');
    saveChat({ id, title: first ? first.text.slice(0, 50) : '', messages: msgs, updatedAt: Date.now() });
    setChatList(getAllChats());
  }, [currentChatId]);

  const playAnswer = (m) => {
    if (speakingId === m.id) { stopSpeaking(); setSpeakingId(null); return; }
    const text = m.answer ? [m.answer.summary, m.answer.call_to_action].filter(Boolean).join('۔ ') : m.text;
    setSpeakingId(m.id);
    speak(text, { lang: 'ur', onEnd: () => setSpeakingId((s) => (s === m.id ? null : s)) });
  };

  // Ask the engine for `text`, appending to `base` (the conversation before this question).
  const runAsk = async (base, text) => {
    const withQuestion = [...base, { id: uid(), role: 'user', text }];
    setMessages(withQuestion);
    persistMessages(withQuestion);
    setBusy(true);
    setStage('understanding');
    let reply;
    try {
      const history = base.slice(-6).map((m) => ({ role: m.role, text: m.text || m.answer?.summary || '' }));
      const { answer } = await askEngine(text, history, setStage);
      reply = { id: uid(), role: 'assistant', answer: answer || { verified: false, summary: 'معذرت، جواب حاصل نہیں ہو سکا۔', evidence: [] } };
    } catch (e) {
      reply = { id: uid(), role: 'assistant', text: errorText(e), isError: true };
    }
    const done = [...withQuestion, reply];
    setMessages(done);
    persistMessages(done);
    setBusy(false);
    setStage(null);
    if (voiceModeRef.current && reply.answer) playAnswer(reply);
  };

  const ask = (question) => {
    const text = (question || '').trim();
    if (!text || busy) return;
    setInput('');
    runAsk(messages, text);
  };

  const onSubmit = (e) => { e.preventDefault(); ask(input); };

  // ── message actions ──
  const copy = async (id, text) => {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard blocked */ }
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  };

  const startEdit = (m) => { setEditingId(m.id); setEditText(m.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  const saveEdit = () => {
    const text = editText.trim();
    if (!text || busy) return;
    const idx = messages.findIndex((m) => m.id === editingId);
    cancelEdit();
    if (idx < 0) return;
    // Editing a question re-asks it; everything after it (including the old reply) is replaced.
    runAsk(messages.slice(0, idx), text);
  };

  const deleteUserMessage = (m) => {
    if (busy) return;
    if (!window.confirm('یہ پیغام اور اس کا جواب حذف کر دیں؟')) return;
    const idx = messages.findIndex((x) => x.id === m.id);
    const next = messages.filter((_, i) => i !== idx && !(i === idx + 1 && messages[i].role === 'assistant'));
    setMessages(next.length ? next : [WELCOME_MSG]);
    persistMessages(next);
  };

  // ── voice ──
  const toggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    localStorage.setItem('quran-ai-voice-mode', next ? '1' : '0');
    if (!next) { stopSpeaking(); setSpeakingId(null); }
  };

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    stopSpeaking();
    setSpeakingId(null);
    setListening(true);
    recRef.current = listen({
      lang: 'ur-PK',
      onResult: (finalText, interim) => setInput(`${finalText} ${interim}`.trim()),
      onError: () => setListening(false),
      onEnd: (finalText) => {
        setListening(false);
        if (finalText) ask(finalText);
      },
    });
    if (!recRef.current) setListening(false);
  };

  // ── chats ──
  const handleNewChat = () => {
    const chat = createNewChat();
    setCurrentChatIdState(chat.id);
    setMessages([WELCOME_MSG]);
    setShowHistory(false);
    setChatList(getAllChats());
    stopSpeaking();
  };
  const handleLoadChat = (id) => {
    const chat = getAllChats().find((c) => c.id === id);
    if (chat) {
      setCurrentChatId(id);
      setCurrentChatIdState(id);
      setMessages(chat.messages.length > 0 ? withIds(chat.messages) : [WELCOME_MSG]);
      setShowHistory(false);
    }
  };
  const handleDeleteChat = (e, id) => {
    e.stopPropagation();
    deleteChat(id);
    setChatList(getAllChats());
    if (id === currentChatId) handleNewChat();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20 flex flex-col" style={{ minHeight: 'calc(100vh - 60px)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground shrink-0"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-heading text-lg font-semibold flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <span className="truncate">Quran Wisdom AI</span>
        </h1>
        {ttsSupported() && (
          <button onClick={toggleVoiceMode} className={`p-2 shrink-0 transition-colors ${voiceMode ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} aria-label="آواز میں جواب" title={voiceMode ? 'آواز میں جواب: آن' : 'آواز میں جواب: آف'}>
            {voiceMode ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        )}
        <button onClick={() => setShowHistory((s) => !s)} className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 relative" aria-label="Chat History">
          <History className="w-5 h-5" />
          {chatList.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />}
        </button>
        <button onClick={handleNewChat} className="p-2 text-muted-foreground hover:text-primary transition-colors shrink-0" aria-label="New Chat"><Plus className="w-5 h-5" /></button>
      </div>

      {showHistory && (
        <div className="mb-4 rounded-xl border border-border bg-card p-2 max-h-72 overflow-y-auto animate-rise">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-semibold text-muted-foreground" dir="rtl">چٹ ہسٹری</span>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          {chatList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6" dir="rtl">کوئی پچھلی چٹ نہیں</p>
          ) : (
            <div className="space-y-1">
              {chatList.map((c) => (
                <div key={c.id} onClick={() => handleLoadChat(c.id)} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${c.id === currentChatId ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/50'}`}>
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate" dir="auto">{c.title || 'نئی چٹ'}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(c.updatedAt || c.createdAt).toLocaleDateString('ur-PK')} • {(c.messages || []).length} پیغامات</p>
                  </div>
                  <button onClick={(e) => handleDeleteChat(e, c.id)} className="text-muted-foreground hover:text-destructive shrink-0 p-1" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            {m.role === 'user' ? (
              editingId === m.id ? (
                <div className="w-full max-w-[92%] rounded-2xl border border-primary/40 bg-card p-2">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} dir="auto" rows={3} autoFocus className="w-full bg-transparent text-sm p-2 focus:outline-none resize-none" />
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground">منسوخ</button>
                    <button onClick={saveEdit} disabled={!editText.trim()} className="px-3 py-1.5 text-xs rounded-full bg-primary text-primary-foreground disabled:opacity-50">محفوظ کر کے دوبارہ پوچھیں</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{m.text}</div>
                  <MessageActions onCopy={() => copy(m.id, m.text)} copied={copiedId === m.id}>
                    <button onClick={() => startEdit(m)} disabled={busy} className="p-1.5 rounded-md hover:bg-secondary/60 hover:text-foreground disabled:opacity-40" aria-label="ایڈٹ" title="ایڈٹ"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteUserMessage(m)} disabled={busy} className="p-1.5 rounded-md hover:bg-secondary/60 hover:text-destructive disabled:opacity-40" aria-label="حذف" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                  </MessageActions>
                </>
              )
            ) : (
              <>
                <div className="max-w-[92%] px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-sm select-text">
                  {m.answer ? <AnswerView answer={m.answer} question={messages[i - 1]?.text} onFollowup={ask} /> : (
                    <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap" dir="auto">{m.text}</div>
                  )}
                </div>
                {/* AI replies can only be copied or listened to — never edited */}
                <MessageActions onCopy={() => copy(m.id, m.answer ? answerToText(m.answer) : m.text)} copied={copiedId === m.id}>
                  {ttsSupported() && !m.isError && m.id !== 'welcome' && (
                    <button onClick={() => playAnswer(m)} className="p-1.5 rounded-md hover:bg-secondary/60 hover:text-foreground" aria-label="سنیں" title={speakingId === m.id ? 'روکیں' : 'جواب سنیں'}>
                      {speakingId === m.id ? <Square className="w-3.5 h-3.5 text-primary" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </MessageActions>
              </>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-card border border-border flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span className="text-xs text-muted-foreground" dir="rtl">{STAGE_LABELS[stage] || '…'}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 pt-2">
        {sttSupported() && (
          <button type="button" onClick={toggleMic} disabled={busy} className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-colors disabled:opacity-60 ${listening ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse' : 'bg-card border-border text-foreground'}`} aria-label="بول کر پوچھیں" title="بول کر پوچھیں">
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? 'سن رہا ہوں…' : 'اپنا سوال لکھیں…'}
          dir="rtl"
          className="flex-1 px-4 py-3 rounded-full bg-card border border-border focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
        />
        <button type="submit" disabled={busy || !input.trim()} className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-60 shrink-0">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
