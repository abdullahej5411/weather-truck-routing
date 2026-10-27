export const COLORS = ["#2e9e5b", "#e8c230", "#ef8a2b", "#d9392b", "#6b1d1d"];
export const NAMES = ["Low", "Moderate", "High", "Severe", "No Travel"];
export const ROUTE_COLORS = ["#2563eb", "#9333ea", "#0891b2"];
export const API = import.meta.env.VITE_API_URL || "";

export const localInput = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export const fmtDur = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}h ${m % 60}m`; };
export const fmtTime = (x) => new Date(x).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
