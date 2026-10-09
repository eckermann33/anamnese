/* Formatação no padrão brasileiro (vírgula decimal, datas dd/mm/aaaa). */

const numberFormatters = new Map<number, Intl.NumberFormat>();

/** 36.8 → "36,8" */
export function formatNumber(value: number, decimals = 1): string {
  let f = numberFormatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
    numberFormatters.set(decimals, f);
  }
  return f.format(value);
}

/** "36,8" ou "36.8" → 36.8 ; "12.300" (milhar) → 12300 ; vazio → undefined */
export function parseNumber(raw: string | undefined | null): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  let s = String(raw).trim();
  if (!s) return undefined;
  // "12.300" com 3 dígitos após o ponto e sem vírgula = separador de milhar
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (s === '-' || s === '.' || s.endsWith('.')) s = s.replace(/\.$/, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const shortDateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function formatDate(ts: number | string | Date): string {
  return dateFmt.format(toDate(ts));
}
export function formatDateTime(ts: number | string | Date): string {
  return dateTimeFmt.format(toDate(ts));
}
export function formatShortDate(ts: number | string | Date): string {
  return shortDateFmt.format(toDate(ts));
}
export function formatTime(ts: number | string | Date): string {
  return timeFmt.format(toDate(ts));
}

/** "2026-10-08" (input date) → Date local (sem problema de fuso). */
export function toDate(v: number | string | Date): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(v);
}

/** Date → "2026-10-08" para <input type="date"> */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Diferença em dias inteiros entre duas datas (ignora horário). */
export function daysBetween(from: number | string | Date, to: number | string | Date = new Date()): number {
  const a = toDate(from);
  const b = toDate(to);
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/** "há 5 min", "ontem", "há 3 dias" */
export function relativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = daysBetween(ts, now);
  if (d === 1) return 'ontem';
  if (d < 30) return `há ${d} dias`;
  return formatDate(ts);
}

/** Junta itens em português: ["a","b","c"] → "a, b e c" */
export function joinPt(items: string[], conj = 'e'): string {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] ?? '';
  return `${list.slice(0, -1).join(', ')} ${conj} ${list[list.length - 1]}`;
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function lowerFirst(s: string): string {
  if (!s) return s;
  // mantém siglas (ex.: "HAS", "IAM") em maiúsculas
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Garante ponto final. */
export function sentence(s: string): string {
  const t = s.trim();
  if (!t) return '';
  return /[.!?:]$/.test(t) ? capitalize(t) : `${capitalize(t)}.`;
}

/** Remove acentos e baixa caixa — para buscas. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
