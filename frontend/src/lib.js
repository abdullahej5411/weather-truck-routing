export const COLORS = ["#2e9e5b", "#e8c230", "#ef8a2b", "#d9392b", "#6b1d1d"];
export const NAMES = ["Low", "Moderate", "High", "Severe", "No Travel"];
export const ROUTE_COLORS = ["#2563eb", "#9333ea", "#0891b2"];
export const API = import.meta.env.VITE_API_URL || "";

export const localInput = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export const fmtDur = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}h ${m % 60}m`; };
export const fmtTime = (x) => new Date(x).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });

export function assessWeather(wind, rain, snow, weight = 40000) {
  const w = +wind || 0;
  const r = +rain || 0;
  const s = +snow || 0;
  let wl = (w >= 25) + (w >= 35) + (w >= 45) + (w >= 55);
  let note = "";
  if (w >= 45 && w < 55 && weight > 30000) {
    wl = 4;
    note = " (load > 30k lb)";
  } else if (w >= 35 && w < 45 && weight > 40000) {
    wl = 3;
    note = " (load > 40k lb)";
  }
  const rl = (r >= 0.10) + (r > 0.25) + (r > 0.50) + (r > 1.00);
  const sl = (s >= 0.5) + (s > 1.0) + (s > 2.0) + (s > 3.0);
  const lvl = Math.max(wl, rl, sl);
  const reasons = [];
  if (wl > 0) reasons.push(`Wind ${Math.round(w)} mph${note}: ${NAMES[wl]}`);
  if (rl > 0) reasons.push(`Rain ${r.toFixed(2)} in/h: ${NAMES[rl]}`);
  if (sl > 0) reasons.push(`Snow ${s.toFixed(2)} in/h: ${NAMES[sl]}`);
  return { lvl, lvlName: NAMES[lvl], color: COLORS[lvl], reasons };
}
