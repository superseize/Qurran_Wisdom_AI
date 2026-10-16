import { getMakharijForWord } from '@/lib/data';

// ───────── lib/tutor.js ─────────
// ════════════════════════════════════════════════════════════════════
// Tajweed word analyzer — deterministic, rule-based (no AI, no guessing).
// Input: a Uthmani word (with its next/previous word for cross-word rules).
// Output: per-letter makhraj + sifat, and the tajweed rules that apply, in Urdu.
// This follows the standard Hafs 'an 'Asim rules taught in mainstream tajweed texts;
// it is a study aid — nothing replaces listening to a qualified teacher (qari).
// ════════════════════════════════════════════════════════════════════

const M = { FATHA: '\u064E', DAMMA: '\u064F', KASRA: '\u0650', SHADDA: '\u0651', SUKUN: '\u0652', MADDAH: '\u0653', DAGGER: '\u0670' };
const SUKUN_MARKS = ['\u0652', '\u06E1'];
const TANWEEN = { '\u064B': 'an', '\u08F0': 'an', '\u064C': 'un', '\u08F1': 'un', '\u064D': 'in', '\u08F2': 'in' };
const HAMZA_LETTERS = new Set(['ء', 'أ', 'إ', 'ؤ', 'ئ']);

const BASE_RE = /[\u0621-\u063A\u0641-\u064A\u0671\u066E\u066F\u06A9\u06CC]/;
const MARK_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08F2]/;

// ─── Letter data ───
export const HEAVY = new Set(['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ']);
export const QALQALAH = new Set(['ق', 'ط', 'ب', 'ج', 'د']);
const HALQI = new Set(['ء', 'ه', 'ع', 'ح', 'غ', 'خ']);
const IKHFA = new Set(['ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك']);
const IDGHAM_GHUNNAH = new Set(['ي', 'ن', 'م', 'و']);
const IDGHAM_NO_GHUNNAH = new Set(['ل', 'ر']);
const SHAMSI = new Set(['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن']);

const NAMES = {
  'ء': 'ہمزہ', 'ا': 'الف', 'ب': 'با', 'ت': 'تا', 'ث': 'ثا', 'ج': 'جیم', 'ح': 'حا', 'خ': 'خا', 'د': 'دال', 'ذ': 'ذال', 'ر': 'را', 'ز': 'زا',
  'س': 'سین', 'ش': 'شین', 'ص': 'صاد', 'ض': 'ضاد', 'ط': 'طا', 'ظ': 'ظا', 'ع': 'عین', 'غ': 'غین', 'ف': 'فا', 'ق': 'قاف', 'ك': 'کاف',
  'ل': 'لام', 'م': 'میم', 'ن': 'نون', 'ه': 'ہا', 'و': 'واؤ', 'ي': 'یا',
};

const MAKHRAJ = {
  'ء': ['اقصیٰ حلق', 'گلے کا سب سے نچلا حصہ، سینے کے قریب'],
  'ه': ['اقصیٰ حلق', 'گلے کا سب سے نچلا حصہ، سینے کے قریب'],
  'ع': ['وسطِ حلق', 'گلے کا درمیانی حصہ'],
  'ح': ['وسطِ حلق', 'گلے کا درمیانی حصہ'],
  'غ': ['ادنیٰ حلق', 'گلے کا اوپری حصہ، منہ کے قریب'],
  'خ': ['ادنیٰ حلق', 'گلے کا اوپری حصہ، منہ کے قریب'],
  'ق': ['لہات', 'زبان کی جڑ اور اس کے سامنے نرم تالو'],
  'ك': ['لہات', 'زبان کی جڑ (قاف سے ذرا آگے) اور اس کے سامنے تالو'],
  'ج': ['وسطِ زبان', 'زبان کا درمیانی حصہ اور اس کے سامنے سخت تالو'],
  'ش': ['وسطِ زبان', 'زبان کا درمیانی حصہ اور اس کے سامنے سخت تالو'],
  'ي': ['وسطِ زبان', 'زبان کا درمیانی حصہ اور اس کے سامنے سخت تالو'],
  'ض': ['کنارۂ زبان', 'زبان کا کنارہ (عموماً بائیں طرف) اوپر کی داڑھوں سے'],
  'ل': ['کنارۂ زبان', 'زبان کا کنارہ اوپر کے اگلے دانتوں کی جڑ سے'],
  'ن': ['نوکِ زبان', 'زبان کی نوک اوپر کے اگلے دو دانتوں کی جڑ سے (لام سے ذرا نیچے)'],
  'ر': ['نوکِ زبان', 'زبان کی نوک، نون سے ذرا پیچھے اور اوپر کی طرف'],
  'ط': ['نوکِ زبان (نطعی)', 'زبان کی نوک اوپر کے اگلے دو دانتوں کی جڑ سے'],
  'د': ['نوکِ زبان (نطعی)', 'زبان کی نوک اوپر کے اگلے دو دانتوں کی جڑ سے'],
  'ت': ['نوکِ زبان (نطعی)', 'زبان کی نوک اوپر کے اگلے دو دانتوں کی جڑ سے'],
  'ص': ['صفیری', 'زبان کی نوک نیچے کے اگلے دانتوں کے کناروں کے قریب'],
  'س': ['صفیری', 'زبان کی نوک نیچے کے اگلے دانتوں کے کناروں کے قریب'],
  'ز': ['صفیری', 'زبان کی نوک نیچے کے اگلے دانتوں کے کناروں کے قریب'],
  'ظ': ['لثوی', 'زبان کی نوک اوپر کے اگلے دانتوں کے کناروں سے'],
  'ذ': ['لثوی', 'زبان کی نوک اوپر کے اگلے دانتوں کے کناروں سے'],
  'ث': ['لثوی', 'زبان کی نوک اوپر کے اگلے دانتوں کے کناروں سے'],
  'ف': ['شفوی', 'نیچے ہونٹ کا اندرونی کنارہ اور اوپر کے اگلے دو دانتوں کے کنارے'],
  'ب': ['شفوی', 'دونوں ہونٹوں کا ملنا'],
  'م': ['شفوی', 'دونوں ہونٹوں کا ملنا (غنہ ناک میں)'],
  'و': ['شفوی', 'دونوں ہونٹ گول کر کے'],
  'ا': ['جوف', 'منہ اور حلق کا اندرونی خلا — حرفِ مد، مخرج مقدّر'],
};

// Normalise a base letter for table lookups.
function norm(ch) {
  if (HAMZA_LETTERS.has(ch)) return 'ء';
  if (ch === 'ة') return 'ه';
  if (ch === 'ى') return 'ي';
  if (ch === 'ٱ') return 'ا';
  if (ch === 'ک') return 'ك';
  if (ch === 'ی') return 'ي';
  return ch;
}

// ─── Parsing ───
export function parseWord(word = '') {
  const letters = [];
  for (const ch of String(word).normalize('NFC')) {
    if (ch === 'ـ') continue;
    if (ch === 'آ') {
      // alif-madda: at word start = hamza (fatha) + madd alif; elsewhere = madd alif
      if (!letters.length) letters.push({ ch: 'أ', base: 'ء', marks: [M.FATHA] });
      letters.push({ ch: 'ا', base: 'ا', marks: [M.MADDAH] });
    } else if (BASE_RE.test(ch)) letters.push({ ch, base: norm(ch), marks: [] });
    else if (MARK_RE.test(ch) && letters.length) letters[letters.length - 1].marks.push(ch);
  }
  for (const l of letters) {
    l.glyph = l.ch + l.marks.join('');
    const m = l.marks;
    l.shadda = m.includes(M.SHADDA);
    l.sukun = m.some((x) => SUKUN_MARKS.includes(x));
    l.fatha = m.includes(M.FATHA);
    l.damma = m.includes(M.DAMMA);
    l.kasra = m.includes(M.KASRA);
    l.tanween = m.map((x) => TANWEEN[x]).find(Boolean) || null;
    l.dagger = m.includes(M.DAGGER);
    l.maddah = m.includes(M.MADDAH);
    l.silent = m.includes('\u06DF') || m.includes('\u06E0');
    l.iqlabMeem = m.includes('\u06E2');
    l.hasVowel = l.fatha || l.damma || l.kasra || !!l.tanween;
    // "bare" = no explicit vowel/sukun/shadda (assimilated or silent in Uthmani print)
    l.bare = !l.hasVowel && !l.sukun && !l.shadda && !l.dagger;
    l.isSakin = l.sukun || (l.bare && !l.silent);
  }
  return letters;
}

// First letter actually pronounced when this word follows another (skips hamzat-wasl alif).
function firstSounded(letters) {
  if (!letters.length) return null;
  return letters[0].ch === 'ٱ' && letters.length > 1 ? letters[1] : letters[0];
}

const vowelOf = (l) => (l.fatha ? 'fatha' : l.damma ? 'damma' : l.kasra ? 'kasra' : l.tanween ? `tanween-${l.tanween}` : l.sukun ? 'sukun' : l.shadda ? 'shadda' : 'none');
const VOWEL_UR = {
  fatha: 'زبر (اَ) — منہ کھول کر',
  damma: 'پیش (اُ) — ہونٹ گول کر کے',
  kasra: 'زیر (اِ) — ہونٹ پھیلا کر، نیچے کی طرف',
  'tanween-an': 'دو زبر (ـً) — آخر میں "ان" کی آواز',
  'tanween-un': 'دو پیش (ـٌ) — آخر میں "ون" کی آواز',
  'tanween-in': 'دو زیر (ـٍ) — آخر میں "ین" کی آواز',
  sukun: 'جزم (ساکن) — بغیر حرکت، رک کر',
  shadda: 'تشدید',
  none: '',
};

function sifatLines(letter, l) {
  const b = letter;
  const out = [];
  if (HEAVY.has(b)) {
    out.push(
      b === 'ق' || b === 'ط' || b === 'خ' || b === 'غ' || b === 'ص' || b === 'ض' || b === 'ظ'
        ? `موٹا (تفخیم / استعلاء): زبان کی پشت تالو کی طرف اٹھائیں، آواز بھری ہوئی۔${l.kasra ? ' زیر پر موٹاپا کم مگر برقرار۔' : ' زبر/پیش پر پورا موٹا۔'}`
        : ''
    );
  } else if (b !== 'ا') {
    out.push('باریک (ترقیق): زبان نیچے رہے، آواز ہلکی اور صاف');
  }
  if (QALQALAH.has(b)) out.push('قلقلہ: ساکن ہونے پر مخرج سے ہلکی سی دھڑکن/اچھال');
  if (['ص', 'ز', 'س'].includes(b)) out.push('صفیر: سیٹی جیسی باریک آواز');
  if (b === 'ش') out.push('تفشّی: ہوا منہ میں پھیلتی ہے');
  if (b === 'ض') out.push('استطالت: آواز زبان کے کنارے پر لمبی کھنچتی ہے، ظ سے فرق رکھیں');
  if (b === 'ر') out.push('تکریر نہ کریں: زبان کو لرزائیں نہیں، ایک ہی ہلکی ضرب');
  if (b === 'ن' || b === 'م') out.push('غنہ: ناک کی گونج (مشدّد پر 2 حرکت)');
  if (b === 'ع') out.push('عین: گلا سکیڑ کر آواز نکالیں — ہمزہ یا "ا" نہ بنائیں');
  if (b === 'ح') out.push('حا: گلے سے ہوا کی ہلکی رگڑ، ہا سے زیادہ سخت اور باریک');
  if (b === 'ء') out.push('ہمزہ: گلے کی گہرائی سے ایک ہلکا جھٹکا');
  if (b === 'ث' || b === 'ذ' || b === 'ظ') out.push('زبان کی نوک دانتوں کے کناروں سے ہلکی سی باہر لگے');
  return out.filter(Boolean);
}

// ─── Main analysis ───
// opts: { next: string, prev: string, stop: boolean }  (stop = word ends the ayah / is a pause)
export function analyzeWord(word, opts = {}) {
  const letters = parseWord(word);
  const nextLetters = parseWord(opts.next || '');
  const prevLetters = parseWord(opts.prev || '');
  const nextFirst = firstSounded(nextLetters);
  const stop = !!opts.stop || !opts.next;
  const rules = [];
  const sounded = []; // [{ letter, index }] letters that are actually pronounced (excludes silent alif etc.)

  letters.forEach((l, i) => {
    const info = {
      ch: l.ch,
      glyph: l.glyph,
      index: i,
      name: l.ch === 'ٱ' ? 'ہمزۂ وصلی' : l.ch === 'ة' ? 'تائے مربوطہ' : l.ch === 'ى' ? 'الف مقصورہ' : NAMES[l.base] || '',
      vowel: VOWEL_UR[vowelOf(l)] || '',
      makhraj: null,
      sifat: [],
      heavy: HEAVY.has(l.base) && l.base !== 'ا',
      qalqalah: false,
      flags: new Set(),
    };
    if (l.silent) info.flags.add('silent');
    if (l.ch !== 'ٱ' && !l.silent) {
      const mk = MAKHRAJ[l.base];
      if (mk) info.makhraj = { name: mk[0], where: mk[1] };
      info.sifat = sifatLines(l.base, l);
    }
    letters[i].info = info;
    sounded.push(info);
  });

  const at = (i) => letters[i];
  const isLast = (i) => i === letters.length - 1;

  letters.forEach((l, i) => {
    const info = l.info;
    const nextInWord = at(i + 1);
    const following = nextInWord ? (nextInWord.ch === 'ٱ' ? at(i + 2) : nextInWord) : (!stop ? nextFirst : null);

    // 1) hamzat wasl
    if (l.ch === 'ٱ' && i === 0) {
      info.flags.add('wasl');
      rules.push({ type: 'wasl', letterIdx: i, title: 'ہمزۂ وصلی', how: 'پچھلے لفظ سے ملا کر پڑھتے وقت یہ الف نہیں پڑھا جاتا۔ اگر یہیں سے شروع کریں تو الف پر عموماً زبر، اور تیسرے حرف پر پیش ہو تو الف پر پیش، ورنہ زیر کے ساتھ شروع کریں۔' });
    }

    // 2) lam of definite article
    if (i === 1 && letters[0].ch === 'ٱ' && l.base === 'ل' && at(2) && !l.shadda) {
      const nxt = at(2);
      if (nxt.shadda && SHAMSI.has(nxt.base)) {
        info.flags.add('silent-lam');
        rules.push({ type: 'lam', letterIdx: i, title: 'لامِ شمسی', how: `لام نہیں پڑھا جاتا؛ اگلا حرف (${NAMES[nxt.base]}) مشدّد ہو کر دوہرا پڑھا جاتا ہے۔` });
      } else if (!nxt.shadda) {
        rules.push({ type: 'lam', letterIdx: i, title: 'لامِ قمری', how: 'لام صاف اور واضح پڑھا جاتا ہے۔' });
      }
    }

    // 4) heavy letters
    if (info.heavy && !l.silent) {
      info.flags.add('heavy');
    }

    // 5) ra
    if (l.base === 'ر' && !l.silent) {
      if (l.fatha || l.damma || l.tanween === 'an' || l.tanween === 'un') {
        info.flags.add('heavy');
        rules.push({ type: 'ra', letterIdx: i, title: 'را — تفخیم', how: 'زبر/پیش کی وجہ سے را موٹی پڑھی جاتی ہے۔' });
      } else if (l.kasra || l.tanween === 'in') {
        rules.push({ type: 'ra', letterIdx: i, title: 'را — ترقیق', how: 'زیر کی وجہ سے را باریک پڑھی جاتی ہے۔' });
      } else if (l.isSakin) {
        const prev = at(i - 1);
        if (prev && prev.kasra && !(following && HEAVY.has(following.base))) {
          rules.push({ type: 'ra', letterIdx: i, title: 'ساکن را — ترقیق', how: 'اس سے پہلے زیر ہے اور بعد میں حرفِ استعلاء نہیں، اس لیے را باریک۔' });
        } else {
          info.flags.add('heavy');
          rules.push({ type: 'ra', letterIdx: i, title: 'ساکن را — تفخیم', how: 'اس سے پہلے زبر/پیش (یا بعد میں حرفِ استعلاء) ہے، اس لیے را موٹی۔' });
        }
      }
    }

    // 6) shadda
    if (l.shadda && !l.silent) {
      if (l.base === 'ن' || l.base === 'م') {
        info.flags.add('ghunna');
        rules.push({ type: 'ghunna', letterIdx: i, title: `غنہ مشدّد (${NAMES[l.base]})`, how: 'تشدید والے نون/میم میں ناک کی گونج پوری 2 حرکت تک کریں۔', beats: '2' });
      } else {
        info.flags.add('shadda');
        rules.push({ type: 'shadda', letterIdx: i, title: `تشدید (${NAMES[l.base] || l.ch})`, how: 'حرف کو دو بار پڑھا جاتا ہے: پہلا ساکن (زبان/ہونٹ مخرج پر رکتے ہیں)، دوسرا متحرک۔ درمیان میں رکیں نہیں، ایک مضبوط ضرب لگائیں۔' });
      }
    }

    // 7) qalqalah
    if (QALQALAH.has(l.base) && !l.silent && (l.sukun || (stop && isLast(i)))) {
      info.qalqalah = true;
      info.flags.add('qalqalah');
      const big = stop && isLast(i);
      rules.push({
        type: 'qalqalah', letterIdx: i,
        title: big ? `قلقلۂ کبریٰ (${NAMES[l.base]})` : `قلقلۂ صغریٰ (${NAMES[l.base]})`,
        how: `${big ? 'وقف کی حالت میں' : 'لفظ کے درمیان'} ساکن ${NAMES[l.base]} پر آواز مخرج سے ہلکا سا اچھلتی ہے۔ ${HEAVY.has(l.base) ? 'قاف/طا میں یہ اچھال موٹی آواز میں' : 'یہاں اچھال باریک آواز میں'} ہو۔${big ? ' وقف پر قلقلہ سب سے زیادہ ظاہر ہوتا ہے۔' : ''}`,
      });
    }

    // 8) noon sakinah & tanween
    const isNoonSakin = l.base === 'ن' && l.isSakin && !l.silent;
    const hasTanween = !!l.tanween && isLast(i);
    if ((isNoonSakin || hasTanween) && !(hasTanween && stop)) {
      const label = hasTanween ? 'تنوین' : 'نون ساکنہ';
      let target = following;
      if (target) {
        const t = target.base;
        const sameWord = !!nextInWord;
        if (isNoonSakin && sameWord && (t === 'ي' || t === 'و')) {
          info.flags.add('izhar');
          rules.push({ type: 'noon', letterIdx: i, title: 'اظہارِ مطلق', how: `ایک ہی لفظ میں نون ساکن کے بعد ${NAMES[t]} آنے پر ادغام نہیں ہوتا (دُنْیَا، صِنْوَانٌ، قِنْوَانٌ، بُنْیَانٌ)؛ نون صاف پڑھیں۔` });
        } else if (HALQI.has(t)) {
          info.flags.add('izhar');
          rules.push({ type: 'noon', letterIdx: i, title: `اظہارِ حلقی (${label})`, how: `${label} کے بعد حلقی حرف (${NAMES[t]}) ہے: نون کو صاف، بغیر غنے اور بغیر رکاوٹ کے پڑھیں۔` });
        } else if (IDGHAM_GHUNNAH.has(t) && !sameWord) {
          info.flags.add('idgham');
          rules.push({ type: 'noon', letterIdx: i, title: `ادغام بغنہ (${label})`, how: `${label} کے بعد ${NAMES[t]} ہے: نون اگلے حرف میں مل جاتا ہے اور 2 حرکت غنہ کے ساتھ اگلا حرف مشدّد پڑھا جاتا ہے۔`, beats: '2' });
        } else if (IDGHAM_NO_GHUNNAH.has(t)) {
          info.flags.add('idgham');
          rules.push({ type: 'noon', letterIdx: i, title: `ادغام بلا غنہ (${label})`, how: `${label} کے بعد ${NAMES[t]} ہے: نون بغیر غنے کے اگلے حرف میں مکمل مل جاتا ہے (آواز میں نون نہیں رہتا)۔` });
        } else if (t === 'ب') {
          info.flags.add('iqlab');
          rules.push({ type: 'noon', letterIdx: i, title: `اقلاب (${label})`, how: `${label} کے بعد با ہے: نون کو میم میں بدل دیں، ہونٹوں کو ہلکا سا ملائیں اور 2 حرکت غنہ کریں، پھر با پڑھیں۔`, beats: '2' });
        } else if (IKHFA.has(t)) {
          info.flags.add('ikhfa');
          const heavyT = HEAVY.has(t);
          rules.push({ type: 'noon', letterIdx: i, title: `اخفاء (${label})`, how: `${label} کے بعد ${NAMES[t]} ہے: نون کو مخرج پر ٹکائے بغیر چھپا کر، ناک سے 2 حرکت غنہ کے ساتھ پڑھیں؛ زبان اگلے حرف کے مخرج کی طرف تیار رکھیں۔${heavyT ? ' چونکہ اگلا حرف موٹا ہے، غنہ بھی موٹی آواز میں ہو۔' : ' اگلا حرف باریک ہے، غنہ بھی باریک رہے۔'}`, beats: '2' });
        }
      }
    }

    // 9) meem sakinah
    if (l.base === 'م' && l.isSakin && !l.shadda && !l.silent) {
      const t = following ? following.base : null;
      if (t === 'ب') rules.push({ type: 'meem', letterIdx: i, title: 'اخفاءِ شفوی', how: 'میم ساکن کے بعد با ہے: ہونٹ ہلکے سے ملا کر 2 حرکت غنہ، پھر با پڑھیں۔', beats: '2' });
      else if (t === 'م') rules.push({ type: 'meem', letterIdx: i, title: 'ادغامِ شفوی (مثلین صغیر)', how: 'میم ساکن کے بعد میم ہے: دونوں مل کر ایک مشدّد میم، 2 حرکت غنہ کے ساتھ۔', beats: '2' });
      else if (t) rules.push({ type: 'meem', letterIdx: i, title: 'اظہارِ شفوی', how: `میم ساکن کے بعد ${NAMES[t] || 'حرف'} ہے: میم صاف پڑھیں۔${t === 'و' || t === 'ف' ? ' و اور ف سے پہلے ہونٹ پوری طرح ملا کر میم ادا کریں، اخفاء کا شبہ نہ ہو۔' : ''}`, beats: '' });
      if (t) info.flags.add('meem');
    }

    // 10) madd
    const prev = at(i - 1);
    const isMaddAlif = l.ch === 'ا' && i > 0 && prev && prev.fatha && !l.hasVowel && !l.silent;
    const isMaddWaw = l.base === 'و' && i > 0 && prev && prev.damma && l.isSakin && !l.shadda;
    const isMaddYa = l.base === 'ي' && i > 0 && prev && prev.kasra && l.isSakin && !l.shadda;
    const isDagger = l.dagger;
    if (isMaddAlif || isMaddWaw || isMaddYa || isDagger) {
      info.flags.add('madd');
      const nextLetter = at(i + 1);
      let kind = 'madd-asli';
      let title = 'مدِّ طبعی (اصلی)';
      let beats = '2';
      let how = 'حرفِ مد کو بغیر کمی بیشی کے پورے 2 حرکت (ایک الف کے برابر) کھینچیں۔';
      const nextHamza = nextLetter && HAMZA_LETTERS.has(nextLetter.ch);
      const nextHeavySukun = nextLetter && (nextLetter.shadda || (nextLetter.sukun && !nextLetter.silent));
      if (nextHamza) { kind = 'madd-muttasil'; title = 'مدِّ متصل (واجب)'; beats = '4–5'; how = 'مد کے حرف کے فوراً بعد اسی لفظ میں ہمزہ ہے: 4 یا 5 حرکت کھینچیں (قاری کی ایک ہی مقدار پوری تلاوت میں رکھیں)۔'; }
      else if (nextHeavySukun) { kind = 'madd-lazim'; title = 'مدِّ لازم'; beats = '6'; how = 'مد کے بعد مستقل ساکن/مشدّد حرف ہے: پورے 6 حرکت کھینچیں۔'; }
      else if (!nextLetter && !stop && nextFirst && HAMZA_LETTERS.has(nextFirst.ch)) { kind = 'madd-munfasil'; title = 'مدِّ منفصل (جائز)'; beats = '4–5'; how = 'مد کے حرف کے بعد اگلے لفظ کی ابتدا میں ہمزہ ہے: 4 یا 5 حرکت کھینچیں۔'; }
      else if (nextLetter && isLast(i + 1) && stop) { kind = 'madd-arid'; title = 'مدِّ عارض للسکون'; beats = '2 / 4 / 6'; how = 'وقف کی وجہ سے آخری حرف ساکن ہوگا، لہٰذا مد 2، 4 یا 6 حرکت میں سے کوئی ایک مقدار رکھیں۔'; }
      else if (l.maddah) { kind = 'madd-extra'; title = 'مد کی علامت'; beats = '4–6'; how = 'یہاں مد کی علامت (~) ہے: قاعدے کے مطابق زیادہ کھینچیں (عموماً 4 سے 6 حرکت)۔'; }
      rules.push({ type: kind, letterIdx: i, title, how: `${how} (ایک حرکت ≈ انگلی بند کر کے کھولنے جتنا وقت)`, beats });
    }
    // madd leen on stop: و/ي sakin after fatha at the last letter
    if (stop && isLast(i) && (l.base === 'و' || l.base === 'ي') && l.isSakin && prev && prev.fatha) {
      rules.push({ type: 'madd-leen', letterIdx: i, title: 'مدِّ لین', how: 'وقف پر زبر کے بعد ساکن و/ی ہے: 2، 4 یا 6 حرکت نرمی سے کھینچ سکتے ہیں۔', beats: '2 / 4 / 6' });
    }

    // 11) hamza
    if (HAMZA_LETTERS.has(l.ch) && !l.silent) {
      info.flags.add('hamza');
    }
  });

  // Lafz al-Jalalah
  const text = letters.map((l) => l.base).join('');
  if (/^لله$|^ا?لله$/.test(text.replace(/ٱ/g, '')) || text.endsWith('لله')) {
    const pv = prevLetters[prevLetters.length - 1];
    const heavyAfter = !pv || pv.fatha || pv.damma || !!pv.tanween && pv.tanween !== 'in';
    rules.push({ type: 'lam', letterIdx: Math.max(0, letters.findIndex((l) => l.base === 'ل')), title: heavyAfter ? 'لفظِ جلالہ — تفخیم' : 'لفظِ جلالہ — ترقیق', how: heavyAfter ? 'پہلے زبر/پیش (یا ابتدا) ہے، اس لیے "اللّٰه" کا لام موٹا پڑھیں۔' : 'پہلے زیر ہے، اس لیے "اللّٰه" کا لام باریک پڑھیں۔' });
  }

  // Stopping on this word
  if (stop && letters.length) {
    const last = letters[letters.length - 1];
    let how = '';
    if (last.tanween === 'an') how = 'وقف پر دو زبر کی جگہ لمبا الف (اَا) پڑھا جاتا ہے۔';
    else if (last.tanween) how = 'وقف پر تنوین ختم ہو کر آخری حرف ساکن ہو جاتا ہے۔';
    else if (last.ch === 'ة') how = 'تائے مربوطہ پر وقف ہو تو "ہ" کی آواز آتی ہے۔';
    else if (last.fatha || last.damma || last.kasra) how = 'وقف پر آخری حرف کی حرکت ختم ہو کر اسے ساکن پڑھیں۔';
    if (how) rules.push({ type: 'waqf', letterIdx: letters.length - 1, title: 'وقف', how });
  }

  // Order rules left-to-right, then build output.
  rules.sort((a, b) => a.letterIdx - b.letterIdx);
  const out = letters.map((l) => ({ ...l.info, flags: [...l.info.flags] }));
  return { word, letters: out, rules, script: buildScript(word, out, rules) };
}

// Analyse every word of an ayah (each with its neighbours).
export function analyzeAyah(words) {
  return words.map((w, i) => analyzeWord(w, { next: words[i + 1] || '', prev: words[i - 1] || '', stop: i === words.length - 1 }));
}

// Spoken/readable Urdu lesson for one analysed word.
function buildScript(word, letters, rules) {
  const parts = [`لفظ: ${word}۔`];
  const named = letters.filter((l) => l.makhraj && l.ch !== 'ٱ');
  const heavy = named.filter((l) => l.heavy).map((l) => l.name);
  if (heavy.length) parts.push(`موٹا پڑھنے والے حروف: ${heavy.join('، ')}۔ ان میں زبان کی پشت اوپر اٹھائیں۔`);
  named.forEach((l) => parts.push(`${l.name}: ${l.makhraj.name} سے — ${l.makhraj.where}۔`));
  rules.forEach((r) => parts.push(`${r.title}: ${r.how}`));
  return parts.join(' ');
}

// Pick one display class for a letter from its flags (most specific rule first).
export function letterClass(flags = []) {
  for (const f of ['madd', 'qalqalah', 'ghunna', 'idgham', 'ikhfa', 'iqlab', 'heavy', 'silent', 'silent-lam', 'wasl']) {
    if (flags.includes(f)) return RULE_COLORS[f === 'madd' ? 'madd' : f] || '';
  }
  return '';
}

export const RULE_COLORS = {
  heavy: 'text-amber-500 font-bold',
  qalqalah: 'underline decoration-dotted decoration-2 underline-offset-8 text-sky-400',
  ghunna: 'text-emerald-400',
  izhar: 'text-foreground',
  idgham: 'text-emerald-400',
  ikhfa: 'text-emerald-400',
  iqlab: 'text-emerald-400',
  madd: 'text-rose-400',
  silent: 'opacity-40',
  'silent-lam': 'opacity-40',
  wasl: 'opacity-50',
};

export const TUTOR_LEGEND = [
  { cls: 'text-amber-500 font-bold', text: 'موٹا (تفخیم) — حرفِ استعلاء' },
  { cls: 'text-sky-400 underline decoration-dotted decoration-2 underline-offset-8', text: 'قلقلہ — اچھال' },
  { cls: 'text-emerald-400', text: 'غنہ / ادغام / اخفاء / اقلاب' },
  { cls: 'text-rose-400', text: 'مد — کھینچ کر' },
  { cls: 'opacity-50', text: 'نہ پڑھا جانے والا حرف' },
];

// ───────── lib/tajweedDetect.js ─────────
// Lightweight Tajweed indicator detection from Arabic diacritics.
// Used by the Verse Grammar page to surface per-word tajweed hints.
// Diacritic code points: fatha U+064E, damma U+064F, kasra U+0650,
// shadda U+0651, sukun U+0652, fathatan U+064B, dammatan U+064C, kasratan U+064D.



// Tanween — double vowel marks at word end.
export function hasTanween(word) {
  return /[\u064B\u064C\u064D]/.test(word || '');
}

// Noon sakinah (نْ) or shadda on noon (نّ) — both carry ghunnah.
export function hasNoonSakinah(word) {
  return /\u0646[\u0652\u0651]/.test(word || '');
}

// Meem sakinah (مْ).
export function hasMeemSakinah(word) {
  return /\u0645\u0652/.test(word || '');
}

// Madd letters — alef after fatha, waw after damma, yaa after kasra (shadda optional between).
export function hasMadd(word) {
  return /\u064E[\u0651]?\u0627/.test(word || '')
    || /\u064F[\u0651]?\u0648/.test(word || '')
    || /\u0650[\u0651]?\u064A/.test(word || '');
}

// Qalqalah letters (ق ط ب ج د) when sakin or mushaddad.
export function hasQalqalah(word) {
  return /[\u0642\u0637\u0628\u062C\u062D\u062F][\u0652\u0651]/.test(word || '');
}

// Collect all detected tajweed indicators for a word, with Urdu labels + descriptions.
export function detectTajweedIndicators(word) {
  if (!word) return [];
  const indicators = [];
  const makharij = getMakharijForWord(word);
  if (makharij.length) {
    indicators.push({
      type: 'makhraj',
      label: 'مخرج',
      value: makharij.map(g => g.name).join('، '),
      desc: makharij.map(g => g.description).join('؛ '),
    });
  }
  if (hasTanween(word)) indicators.push({ type: 'tanween', label: 'تنوین', value: 'غنّہ', desc: 'تنوین پر ناک سے غنّہ کی آواز آتی ہے۔' });
  if (hasNoonSakinah(word)) indicators.push({ type: 'noon_sakinah', label: 'نون ساکنہ', value: 'غنّہ', desc: 'نون ساکنہ یا مشددہ پر ناک سے غنّہ کی آواز آتی ہے۔' });
  if (hasMeemSakinah(word)) indicators.push({ type: 'meem_sakinah', label: 'میم ساکنہ', value: 'غنّہ', desc: 'میم ساکنہ پر ناک سے غنّہ کی آواز آتی ہے۔' });
  if (hasMadd(word)) indicators.push({ type: 'madd', label: 'مد', value: '۲ حرکت', desc: 'مدّ کے حرف پر آواز کو کش دیں۔' });
  if (hasQalqalah(word)) indicators.push({ type: 'qalqalah', label: 'قلقلہ', value: 'باؤنڈ', desc: 'ساکن حرف پر ہلکی باؤنڈ نما آواز نکالیں۔' });
  return indicators;
}

// ───────── lib/speechVerify.js ─────────
// Browser-based speech utilities + online verification — work without integration credits.

export function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u0652\u0670\u0640\u0653\u0654\u0655]/g, '')
    .replace(/[إأآٱا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\u200d/g, '')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .trim();
}

export function checkWord(spoken, expected) {
  const ns = normalizeArabic(spoken);
  const ne = normalizeArabic(expected);
  if (!ns || !ne) return false;
  if (ns === ne) return true;
  if (ns.length >= 1 && ne.length >= 1) {
    const freq = {};
    for (const ch of ns) freq[ch] = (freq[ch] || 0) + 1;
    let count = 0;
    for (const ch of ne) { if (freq[ch] > 0) { count++; freq[ch]--; } }
    const minLen = Math.min(ns.length, ne.length);
    return count >= minLen * 0.7;
  }
  return false;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n; if (n === 0) return m;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export function analyzeRecitation(transcript, expectedWords) {
  const normTranscript = normalizeArabic(transcript).split(/\s+/).filter(Boolean);
  const normExpected = expectedWords.map(w => normalizeArabic(w));
  const wordDetails = [];
  const mispronouncedWords = [];
  const missingWords = [];
  const matchedIndices = new Set();
  const transcriptUsed = new Set();
  let tIdx = 0;

  for (let i = 0; i < normExpected.length; i++) {
    const expected = normExpected[i];
    const expectedOriginal = expectedWords[i];
    let bestSim = 0, bestJ = -1;

    // Search a small window ahead to handle slight misordering
    for (let j = tIdx; j < Math.min(tIdx + 3, normTranscript.length); j++) {
      if (transcriptUsed.has(j)) continue;
      const sim = similarity(expected, normTranscript[j]);
      if (sim > bestSim) { bestSim = sim; bestJ = j; }
    }

    if (bestSim >= 0.75) {
      // Correct (or very close)
      matchedIndices.add(i);
      if (bestJ >= 0) { transcriptUsed.add(bestJ); tIdx = bestJ + 1; }
      wordDetails.push({ index: i, expected: expectedOriginal, said: bestJ >= 0 ? normTranscript[bestJ] : '', status: 'correct', similarity: bestSim });
    } else if (bestSim >= 0.4) {
      // Mispronounced — detected but wrong
      matchedIndices.add(i);
      if (bestJ >= 0) { transcriptUsed.add(bestJ); tIdx = bestJ + 1; }
      const saidOriginal = bestJ >= 0 ? normTranscript[bestJ] : '';
      mispronouncedWords.push({ wordIndex: i + 1, expected: expectedOriginal, said: saidOriginal, similarity: bestSim });
      wordDetails.push({ index: i, expected: expectedOriginal, said: saidOriginal, status: 'mispronounced', similarity: bestSim });
    } else {
      // Missing — not detected
      missingWords.push(expectedOriginal);
      wordDetails.push({ index: i, expected: expectedOriginal, said: null, status: 'missing', similarity: 0 });
    }
  }

  // Extra words (said but not expected)
  const extraWords = [];
  for (let j = 0; j < normTranscript.length; j++) { if (!transcriptUsed.has(j)) extraWords.push(normTranscript[j]); }

  const matchedCount = matchedIndices.size;
  const totalCount = normExpected.length;
  const score = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
  const isComplete = missingWords.length === 0 && extraWords.length === 0 && mispronouncedWords.length === 0;

  let summary;
  if (isComplete) summary = 'ماشاءاللہ! آپ نے آیت مکمل اور درست پڑھی ہے۔ اللہ آپ کو مزید قبول فرمائے۔';
  else if (score >= 80) summary = `بہت اچھی کوشش! آپ نے ${matchedCount} از ${totalCount} الفاظ درست پڑھے۔ ${mispronouncedWords.length} الفاظ میں تلفظ کی غلطی، ${missingWords.length} الفاظ یاد رہے۔`;
  else if (score >= 50) summary = `آپ نے ${matchedCount} از ${totalCount} الفاظ پڑھے۔ ${mispronouncedWords.length} غلط تلفظ، ${missingWords.length} الفاظ یاد رہے۔ آہستہ اور واضح پڑھیں۔`;
  else summary = `کوشش جاری رکھیں۔ صرف ${matchedCount} از ${totalCount} الفاظ سنائے دیے۔ حوالہ آڈیو سن کر دوبارہ کوشش کریں۔`;

  const missingIndices = [];
  for (let i = 0; i < normExpected.length; i++) { if (!matchedIndices.has(i)) missingIndices.push(i); }

  return {
    overallScore: score,
    summary,
    needsSlow: score < 60,
    transcript: normTranscript.join(' '),
    verseAccuracy: { isComplete, missingWords, extraWords, mispronouncedWords, missingIndices },
    wordDetails,
    mistakes: [],
    isBrowserBased: true,
  };
}

export function createRecognition(lang = 'ar-EG') {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const recognition = new SR();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function speakUrdu(text, onEnd) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  let spoken = false;
  const doSpeak = () => {
    if (spoken) return;
    spoken = true;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ur'; utter.rate = 0.85; utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const urduVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ur')) || voices.find(v => v.lang?.toLowerCase().startsWith('hi')) || voices.find(v => v.lang?.toLowerCase().includes('ar'));
    if (urduVoice) utter.voice = urduVoice;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    setTimeout(doSpeak, 300);
  } else {
    doSpeak();
  }
}

export function speakArabic(text, onEnd) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ar-SA'; utter.rate = 0.75; utter.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ar')) || voices.find(v => v.lang?.toLowerCase().includes('ar'));
  if (arabicVoice) utter.voice = arabicVoice;
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}

export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported() {
  return 'speechSynthesis' in window;
}

// Online verification URLs for Quranic verses
export function getOnlineVerifyUrls(verseKey) {
  const parts = verseKey.split(':');
  const surah = parts[0];
  const ayah = parts[1];
  return {
    quranCom: `https://quran.com/${surah}/${ayah}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`Quran ${verseKey} recitation`)}`,
  };
}

// TTS: speaks what the user actually said vs the correct word.
export function speakSaidWord(said, expected, onEnd) {
  const text = `تم نے یہ پڑھا ہے: ${said}۔ درست لفظ: ${expected}۔`;
  speakUrdu(text, onEnd);
}

// Auto-speak a full analysis summary of all mispronounced words.
export function speakMispronouncedSummary(mispronouncedWords, onEnd) {
  if (!mispronouncedWords || mispronouncedWords.length === 0) { onEnd?.(); return; }
  let text = 'آپ نے کچھ الفاظ غلط پڑھے ہیں۔ ';
  mispronouncedWords.forEach((mw, i) => {
    text += `لفظ ${i + 1}: تم نے ${mw.said} پڑھا، درست ${mw.expected} ہے۔ `;
  });
  speakUrdu(text, onEnd);
}

// ───────── lib/voice.js ─────────
// ════════════════════════════════════════════════════════════════════
// Browser voice helpers (no server, no API key):
//   speak()  — text-to-speech (Urdu / Arabic / English) with sentence chunking
//   listen() — speech-to-text (Web Speech API; Chrome, Edge, Safari)
// Voice availability depends on the device: install an Urdu/Arabic system voice for best results.
// ════════════════════════════════════════════════════════════════════

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const sttSupported = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

const FALLBACKS = { ur: ['ur', 'hi', 'ar'], ar: ['ar'], en: ['en'] };

function loadVoices() {
  return new Promise((resolve) => {
    const have = window.speechSynthesis.getVoices();
    if (have.length) return resolve(have);
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 600);
  });
}

function pickVoice(voices, lang) {
  for (const prefix of FALLBACKS[lang] || [lang]) {
    const v = voices.find((x) => x.lang?.toLowerCase().startsWith(prefix));
    if (v) return v;
  }
  return null;
}

// Strip markdown/markup so it is not read aloud.
export function cleanForSpeech(text = '') {
  return String(text)
    .replace(/[*_`#>~|]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Chrome stops long utterances; speak in short sentence-sized chunks.
function chunk(text, max = 170) {
  const parts = cleanForSpeech(text).split(/(?<=[۔.!؟?\n])\s*/).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.length <= max) { out.push(p); continue; }
    for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max));
  }
  return out;
}

let currentToken = 0;
export function stopSpeaking() {
  currentToken++;
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** speak(text, { lang: 'ur'|'ar'|'en', rate, onStart, onEnd }) → { cancel } */
export function speak(text, { lang = 'ur', rate, onStart, onEnd } = {}) {
  if (!ttsSupported() || !text) { onEnd?.(); return { cancel() {} }; }
  window.speechSynthesis.cancel();
  const token = ++currentToken;
  const parts = chunk(text);
  const tag = lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'ur-PK';
  const baseRate = rate || (lang === 'ar' ? 0.75 : 0.9);
  (async () => {
    const voices = await loadVoices();
    if (token !== currentToken) return;
    const voice = pickVoice(voices, lang);
    onStart?.();
    let i = 0;
    const next = () => {
      if (token !== currentToken) return;
      if (i >= parts.length) { onEnd?.(); return; }
      const u = new SpeechSynthesisUtterance(parts[i++]);
      u.lang = voice?.lang || tag;
      if (voice) u.voice = voice;
      u.rate = baseRate;
      u.onend = next;
      u.onerror = () => { if (token === currentToken) onEnd?.(); };
      window.speechSynthesis.speak(u);
    };
    next();
  })();
  return { cancel: stopSpeaking };
}

/** listen({ lang, continuous, onResult(finalText, interimText), onEnd, onError }) → { stop } | null */
export function listen({ lang = 'ur-PK', continuous = false, onResult, onEnd, onError } = {}) {
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) { onError?.('unsupported'); return null; }
  const rec = new SR();
  rec.lang = lang;
  rec.continuous = continuous;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += `${r[0].transcript} `;
      else interim += r[0].transcript;
    }
    onResult?.(finalText.trim(), interim);
  };
  rec.onerror = (e) => onError?.(e.error || 'error');
  rec.onend = () => onEnd?.(finalText.trim());
  try { rec.start(); } catch { onError?.('start-failed'); return null; }
  return { stop: () => { try { rec.stop(); } catch { /* already stopped */ } } };
}
