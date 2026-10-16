import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 



// Consonant "skeleton" of Arabic text: no diacritics, unified hamza/ya/ta-marbuta forms and
// no weak letters (ا و ي). Lets "صلاة" match Uthmani "ٱلصَّلَوٰةَ", and is what `ayahs.text_skeleton` stores.
export function arabicSkeleton(text = '') {
  return String(text)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[اوي]/g, '')
    .replace(/[^\u0621-\u064A ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Local hero artwork (geometric star pattern) — no external image hosting.
const HERO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='520' viewBox='0 0 800 520'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#0d3328'/><stop offset='1' stop-color='#071611'/></linearGradient><pattern id='p' width='80' height='80' patternUnits='userSpaceOnUse'><path d='M40 4l9 21 21-9-9 21 21 9-21 9 9 21-21-9-9 21-9-21-21 9 9-21-21-9 21-9-9-21 21 9z' fill='none' stroke='#d6bd78' stroke-opacity='.22' stroke-width='1.2'/></pattern></defs><rect width='800' height='520' fill='url(#g)'/><rect width='800' height='520' fill='url(#p)'/><circle cx='640' cy='100' r='84' fill='#d6bd78' fill-opacity='.09'/></svg>`;
export const HERO_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(HERO_SVG)}`;
