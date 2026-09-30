const DIV_MAP = {
  "0": { full: "Pandas",   short: "P" },
  "1": { full: "Shibas",   short: "S" },
  "2": { full: "Unicorns", short: "U" },
};
export const toDivFull = (x) => {
  const k = String(x ?? "").trim();
  if (DIV_MAP[k]) return DIV_MAP[k].full;
  const hit = Object.values(DIV_MAP).find(v =>
    v.full.toLowerCase() === k.toLowerCase() || v.short.toLowerCase() === k.toLowerCase()
  );
  return hit ? hit.full : k;
};
export const toDivShort = (x) => {
  const k = String(x ?? "").trim();
  if (DIV_MAP[k]) return DIV_MAP[k].short;
  const hit = Object.values(DIV_MAP).find(v =>
    v.full.toLowerCase() === k.toLowerCase() || v.short.toLowerCase() === k.toLowerCase()
  );
  return hit ? hit.short : (k ? k[0].toUpperCase() : "");
};
