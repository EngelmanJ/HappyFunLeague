// src/lib/colors.js
// No imports from /public; fetch at runtime instead.

const DIV_PALETTE = [
  "#8b5cf6","#f59e0b","#10b981","#3b82f6",
  "#ef4444","#ec4899","#14b8a6","#84cc16",
  "#f97316","#06b6d4"
];

let staticMap = null;
if (typeof window !== "undefined") {
  try {
    fetch("/assets/division-colors.json", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : {}))
      .then(m => { staticMap = m || {}; })
      .catch(() => { staticMap = {}; });
  } catch {
    staticMap = {};
  }
}

export function hashColor(name){
  if(!name) return undefined;
  const s = String(name);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return DIV_PALETTE[h % DIV_PALETTE.length];
}

export function getDivisionColor(name){
  if(!name) return undefined;
  const s = String(name);
  const m = staticMap || {};
  if (m[s]) return m[s];
  const k = Object.keys(m).find(k => k.toLowerCase() === s.toLowerCase());
  if (k) return m[k];
  return hashColor(s);
}

export function alphaBg(hex, a = 0.15){
  if(!hex) return undefined;
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

export function divisionPillStyle(name){
  const c = getDivisionColor(name);
  if(!c) return undefined;
  return { color: c, borderColor: c, backgroundColor: alphaBg(c) };
}

export function divisionBandStyle(name){
  const c = getDivisionColor(name);
  if(!c) return undefined;
  return { boxShadow: `inset 0 3px 0 0 ${c}` };
}
