// src/lib/colors.js
import staticMap from '/assets/division-colors.json';

const DIV_PALETTE = ["#8b5cf6","#f59e0b","#10b981","#3b82f6","#ef4444","#ec4899","#14b8a6","#84cc16","#f97316","#06b6d4"];

export function hashColor(name){
  if(!name) return undefined;
  let h = 0;
  for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return DIV_PALETTE[h % DIV_PALETTE.length];
}

export function getDivisionColor(name){
  if(!name) return undefined;
  const exact = staticMap?.[name];
  if (exact) return exact;
  const lowerKey = Object.keys(staticMap||{}).find(k => k.toLowerCase() === String(name).toLowerCase());
  if (lowerKey) return staticMap[lowerKey];
  return hashColor(String(name));
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
