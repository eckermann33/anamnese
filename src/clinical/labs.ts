import type { LabPanel, LabValue } from '../db/types';
import type { Sex } from './types';
import { formatNumber, normalize, toISODate } from '../lib/format';

/* ==========================================================================
   EXAMES LABORATORIAIS
   --------------------------------------------------------------------------
   - Catálogo dos exames mais pedidos na enfermaria/UTI, com apelidos usados
     nos laudos e sistemas hospitalares ("Hb", "Leuco", "Cr", "K"…).
   - Leitor LOCAL (offline) de texto colado: funciona sem IA para o formato
     "sigla valor" (ex.: "Hb 10,2 / Leuco 12.300 / Cr 1,4 / K 4,2").
     Com internet, a IA organiza textos mais bagunçados (task parse_labs).
   - Faixas de referência: só para os exames em que a faixa usual de adulto é
     estável entre laboratórios. Enzimas, PCR, lactato, troponina etc. variam
     com o método/unidade → sem faixa local (vale a marcação do próprio laudo).
   ========================================================================== */

type Range = [number, number];

export interface AnalyteDef {
  id: string;
  name: string;
  short: string;
  unit?: string;
  aliases: string[];
  ref?: Range | { M: Range; F: Range };
  /** Abaixo/acima disso = crítico. */
  critical?: Range;
  /** Fora disso não é um resultado desse exame (ex.: "na 2ª coleta" ≠ sódio 2). */
  plausible?: Range;
  /** "12.300" = doze mil e trezentos (ponto de milhar). */
  thousands?: boolean;
  /** Valores menores que isso vieram "em mil" (ex.: Leuco 12,3 → 12.300). */
  scaleBelow?: number;
  decimals: number;
}

export const ANALYTES: AnalyteDef[] = [
  // Hemograma
  { id: 'hb', name: 'Hemoglobina', short: 'Hb', unit: 'g/dL', aliases: ['hemoglobina', 'hb', 'hgb'], ref: { M: [13, 17.5], F: [12, 15.5] }, critical: [7, 20], plausible: [2, 25], decimals: 1 },
  { id: 'ht', name: 'Hematócrito', short: 'Ht', unit: '%', aliases: ['hematocrito', 'ht', 'hto', 'hct'], ref: { M: [39, 50], F: [35, 46] }, plausible: [5, 75], decimals: 1 },
  { id: 'leuco', name: 'Leucócitos', short: 'Leuco', unit: '/mm³', aliases: ['leucocitos', 'leuco', 'leucs', 'leuc', 'gb', 'wbc'], ref: [4000, 11000], thousands: true, scaleBelow: 200, plausible: [50, 500000], decimals: 0 },
  { id: 'bast', name: 'Bastões', short: 'Bast', unit: '%', aliases: ['bastonetes', 'bastoes', 'bast'], plausible: [0, 100], decimals: 0 },
  { id: 'neut', name: 'Neutrófilos', short: 'Neut', aliases: ['neutrofilos', 'segmentados', 'neut', 'seg'], thousands: true, decimals: 0 },
  { id: 'linf', name: 'Linfócitos', short: 'Linf', aliases: ['linfocitos', 'linf'], thousands: true, decimals: 0 },
  { id: 'plaq', name: 'Plaquetas', short: 'Plaq', unit: '/mm³', aliases: ['plaquetas', 'plaq', 'plt', 'pqt'], ref: [150000, 450000], critical: [20000, 1000000], thousands: true, scaleBelow: 1500, plausible: [1000, 3000000], decimals: 0 },
  // Função renal e eletrólitos
  { id: 'ur', name: 'Ureia', short: 'Ur', unit: 'mg/dL', aliases: ['ureia', 'ur'], ref: [10, 50], plausible: [2, 500], decimals: 0 },
  { id: 'cr', name: 'Creatinina', short: 'Cr', unit: 'mg/dL', aliases: ['creatinina', 'creat', 'cr'], ref: { M: [0.7, 1.3], F: [0.5, 1.1] }, plausible: [0.1, 30], decimals: 2 },
  { id: 'na', name: 'Sódio', short: 'Na', unit: 'mEq/L', aliases: ['sodio', 'na'], ref: [135, 145], critical: [120, 160], plausible: [90, 200], decimals: 0 },
  { id: 'k', name: 'Potássio', short: 'K', unit: 'mEq/L', aliases: ['potassio', 'k'], ref: [3.5, 5.1], critical: [2.5, 6.5], plausible: [1, 10], decimals: 1 },
  { id: 'cl', name: 'Cloro', short: 'Cl', unit: 'mEq/L', aliases: ['cloreto', 'cloro', 'cl'], ref: [98, 107], plausible: [60, 150], decimals: 0 },
  { id: 'mg', name: 'Magnésio', short: 'Mg', unit: 'mg/dL', aliases: ['magnesio', 'mg'], ref: [1.6, 2.4], plausible: [0.3, 10], decimals: 1 },
  { id: 'cai', name: 'Cálcio iônico', short: 'Ca iônico', aliases: ['calcio ionico', 'ca ionico', 'ca++', 'cai', 'ica'], decimals: 2 },
  { id: 'ca', name: 'Cálcio total', short: 'Ca', unit: 'mg/dL', aliases: ['calcio total', 'calcio', 'ca'], ref: [8.5, 10.5], plausible: [3, 20], decimals: 1 },
  { id: 'p', name: 'Fósforo', short: 'P', unit: 'mg/dL', aliases: ['fosforo', 'p'], ref: [2.5, 4.5], plausible: [0.3, 20], decimals: 1 },
  // Gasometria
  { id: 'ph', name: 'pH', short: 'pH', aliases: ['ph'], ref: [7.35, 7.45], critical: [7.2, 7.6], plausible: [6.5, 8], decimals: 2 },
  { id: 'pco2', name: 'pCO₂', short: 'pCO₂', unit: 'mmHg', aliases: ['paco2', 'pco2', 'pco₂'], ref: [35, 45], plausible: [5, 200], decimals: 0 },
  { id: 'po2', name: 'pO₂', short: 'pO₂', unit: 'mmHg', aliases: ['pao2', 'po2', 'po₂'], plausible: [10, 700], decimals: 0 },
  { id: 'hco3', name: 'Bicarbonato', short: 'HCO₃', unit: 'mEq/L', aliases: ['bicarbonato', 'hco3', 'hco₃', 'bic'], ref: [22, 26], plausible: [2, 60], decimals: 1 },
  { id: 'be', name: 'Excesso de bases', short: 'BE', unit: 'mEq/L', aliases: ['excesso de bases', 'base excess', 'be'], ref: [-2, 2], plausible: [-40, 40], decimals: 1 },
  { id: 'lactato', name: 'Lactato', short: 'Lac', aliases: ['lactato', 'lact', 'lac'], decimals: 1 },
  // Hepático / pancreático
  { id: 'tgo', name: 'TGO (AST)', short: 'TGO', unit: 'U/L', aliases: ['tgo', 'ast'], decimals: 0 },
  { id: 'tgp', name: 'TGP (ALT)', short: 'TGP', unit: 'U/L', aliases: ['tgp', 'alt'], decimals: 0 },
  { id: 'fa', name: 'Fosfatase alcalina', short: 'FA', unit: 'U/L', aliases: ['fosfatase alcalina', 'falc', 'fa'], decimals: 0 },
  { id: 'ggt', name: 'GGT', short: 'GGT', unit: 'U/L', aliases: ['gama gt', 'gama-gt', 'ggt'], decimals: 0 },
  { id: 'bt', name: 'Bilirrubina total', short: 'BT', unit: 'mg/dL', aliases: ['bilirrubina total', 'bil total', 'bt'], ref: [0.2, 1.2], plausible: [0, 60], decimals: 2 },
  { id: 'bd', name: 'Bilirrubina direta', short: 'BD', unit: 'mg/dL', aliases: ['bilirrubina direta', 'bil direta', 'bd'], ref: [0, 0.4], plausible: [0, 50], decimals: 2 },
  { id: 'alb', name: 'Albumina', short: 'Alb', unit: 'g/dL', aliases: ['albumina', 'alb'], ref: [3.5, 5.2], plausible: [0.5, 7], decimals: 1 },
  { id: 'lipase', name: 'Lipase', short: 'Lipase', unit: 'U/L', aliases: ['lipase'], decimals: 0 },
  { id: 'amilase', name: 'Amilase', short: 'Amilase', unit: 'U/L', aliases: ['amilase'], decimals: 0 },
  // Coagulação
  { id: 'inr', name: 'INR', short: 'INR', aliases: ['inr', 'rni'], ref: [0.8, 1.2], plausible: [0.5, 20], decimals: 2 },
  { id: 'ttpa', name: 'TTPa', short: 'TTPa', aliases: ['ttpa'], decimals: 2 },
  { id: 'fibrinogenio', name: 'Fibrinogênio', short: 'Fibrinogênio', unit: 'mg/dL', aliases: ['fibrinogenio'], decimals: 0 },
  // Inflamatórios / cardíacos / outros
  { id: 'pcr', name: 'PCR', short: 'PCR', aliases: ['proteina c reativa', 'pcr'], decimals: 1 },
  { id: 'pct', name: 'Procalcitonina', short: 'PCT', unit: 'ng/mL', aliases: ['procalcitonina', 'pct'], decimals: 2 },
  { id: 'trop', name: 'Troponina', short: 'Trop', aliases: ['troponina', 'trop', 'tnt', 'tni'], thousands: true, decimals: 2 },
  { id: 'ckmb', name: 'CK-MB', short: 'CK-MB', aliases: ['ck-mb', 'ckmb'], decimals: 1 },
  { id: 'cpk', name: 'CPK', short: 'CPK', unit: 'U/L', aliases: ['cpk', 'ck'], thousands: true, decimals: 0 },
  { id: 'ntprobnp', name: 'NT-proBNP', short: 'NT-proBNP', unit: 'pg/mL', aliases: ['nt-probnp', 'nt probnp', 'ntprobnp'], thousands: true, decimals: 0 },
  { id: 'bnp', name: 'BNP', short: 'BNP', unit: 'pg/mL', aliases: ['bnp'], thousands: true, decimals: 0 },
  { id: 'ddimero', name: 'D-dímero', short: 'D-dímero', aliases: ['d-dimero', 'd dimero', 'ddimero'], thousands: true, decimals: 0 },
  { id: 'glicose', name: 'Glicose', short: 'Glic', unit: 'mg/dL', aliases: ['glicemia', 'glicose', 'glic'], decimals: 0 },
];

const BY_ID: Record<string, AnalyteDef> = Object.fromEntries(ANALYTES.map((a) => [a.id, a]));
const ORDER: Record<string, number> = Object.fromEntries(ANALYTES.map((a, i) => [a.id, i]));

/** Nome qualquer ("Hemoglobina", "hb", "Creatinina sérica") → id do catálogo, se houver. */
export function analyteId(name: string): string | undefined {
  const n = normalize(name).replace(/\s+/g, ' ');
  for (const a of ANALYTES) {
    if (normalize(a.name) === n || a.aliases.includes(n) || normalize(a.short) === n) return a.id;
  }
  // "Creatinina sérica", "Sódio (Na)": começa com o nome do catálogo
  for (const a of ANALYTES) if (n.startsWith(`${normalize(a.name)} `)) return a.id;
  return undefined;
}

/** Chave para comparar o mesmo exame entre dias diferentes. */
export function analyteKey(name: string): string {
  return analyteId(name) ?? normalize(name);
}

export function analyteDef(name: string): AnalyteDef | undefined {
  const id = analyteId(name);
  return id ? BY_ID[id] : undefined;
}

function rangeFor(def: AnalyteDef, sex?: Sex): Range | undefined {
  if (!def.ref) return undefined;
  if (Array.isArray(def.ref)) return def.ref;
  if (sex === 'F') return def.ref.F;
  if (sex === 'M') return def.ref.M;
  // sexo desconhecido: faixa mais ampla
  return [Math.min(def.ref.M[0], def.ref.F[0]), Math.max(def.ref.M[1], def.ref.F[1])];
}

/** Classifica pelo catálogo (faixa usual de adulto). */
export function localFlag(name: string, value: number | null, sex?: Sex): LabValue['flag'] {
  if (value === null) return null;
  const def = analyteDef(name);
  if (!def) return null;
  if (def.critical && (value < def.critical[0] || value > def.critical[1])) return 'critico';
  const r = rangeFor(def, sex);
  if (!r) return null;
  if (value < r[0]) return 'baixo';
  if (value > r[1]) return 'alto';
  return null;
}

/* ---------- Leitor local de texto colado ---------- */

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Apelidos do maior para o menor ("calcio ionico" antes de "calcio" antes de "ca").
const ALIAS_LIST = ANALYTES.flatMap((a) => a.aliases.map((alias) => ({ alias, id: a.id }))).sort((x, y) => y.alias.length - x.alias.length);
const ALIAS_TO_ID = new Map(ALIAS_LIST.map((x) => [x.alias, x.id]));
// apelido + separadores (": = - .") + número (com sinal, milhar e vírgula decimal)
const LAB_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${ALIAS_LIST.map((x) => escapeRe(x.alias)).join('|')})(?![\\p{L}\\p{N}])[\\s:=.\\-–]{0,12}?([-−+]?\\d+(?:[.,]\\d+)*)`,
  'gu',
);

function toNumber(raw: string, def: AnalyteDef): number | null {
  let s = raw.replace('−', '-').replace(/^\+/, '');
  if (def.thousands && /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Procura uma data no texto ("07/10/2026", "07/10/26" ou "07/10"). */
export function findDate(text: string, fallback = toISODate()): string {
  const m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!m) return fallback;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return fallback;
  let y = m[3] ? Number(m[3]) : Number(fallback.slice(0, 4));
  if (y < 100) y += 2000;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Lê "Hb 10,2 Ht 31 Leuco 12.300 (bast 2%) Plaq 210 mil Cr 1,4 Na 138 K 4,2 ↑".
 * Pega a primeira ocorrência de cada exame. Marcações do laudo (↑ ↓ H L) têm
 * prioridade; sem marcação, usa a faixa usual de adulto.
 */
export function parseLabsLocal(text: string, sex?: Sex): LabValue[] {
  const src = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const out: LabValue[] = [];
  const seen = new Set<string>();
  for (const m of src.matchAll(LAB_RE)) {
    const id = ALIAS_TO_ID.get(m[1]);
    if (!id || seen.has(id)) continue;
    const def = BY_ID[id];
    let value = toNumber(m[2], def);
    if (value === null) continue;
    const after = src.slice(m.index! + m[0].length, m.index! + m[0].length + 24);
    if (/^\s*mil\b/.test(after)) value *= 1000;
    else if (def.scaleBelow && value > 0 && value < def.scaleBelow) value = Math.round(value * 1000);
    if (def.plausible && (value < def.plausible[0] || value > def.plausible[1])) continue;
    // marcação do laudo logo depois do valor/unidade
    const mark = after.match(/^\s*(?:[a-zµ%/³²]+\s*)?(↑|↓|\((?:h|a|alto)\)|\((?:l|b|baixo)\))/);
    let flag: LabValue['flag'] = localFlag(def.name, value, sex);
    if (mark) {
      const up = mark[1] === '↑' || /\((h|a|alto)\)/.test(mark[1]);
      if (flag !== 'critico') flag = up ? 'alto' : 'baixo';
    }
    seen.add(id);
    out.push({ analyte: def.name, value, raw: m[0].trim(), unit: def.unit, flag });
  }
  return out.sort((a, b) => (ORDER[analyteId(a.analyte) ?? ''] ?? 999) - (ORDER[analyteId(b.analyte) ?? ''] ?? 999));
}

/* ---------- Formatação e comparação entre dias ---------- */

export function formatLabValue(v: Pick<LabValue, 'analyte' | 'value' | 'raw'>): string {
  if (v.value === null) return v.raw;
  const def = analyteDef(v.analyte);
  return formatNumber(v.value, def?.decimals ?? 2);
}

export type Trend = 'up' | 'down' | 'same';

export function trendOf(current: number | null, previous: number | null | undefined): Trend | undefined {
  if (current === null || previous === null || previous === undefined) return undefined;
  if (current === previous) return 'same';
  const base = Math.abs(previous) || 1;
  if (Math.abs(current - previous) / base < 0.03) return 'same';
  return current > previous ? 'up' : 'down';
}

export const TREND_ARROW: Record<Trend, string> = { up: '↑', down: '↓', same: '→' };

/** Painéis do mais recente para o mais antigo (mesma data: o último colado primeiro). */
export function sortPanels(panels: LabPanel[]): LabPanel[] {
  return panels
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date === b.p.date ? b.i - a.i : a.p.date < b.p.date ? 1 : -1))
    .map((x) => x.p);
}

export interface LabCell {
  value: LabValue;
  previous?: LabValue;
  trend?: Trend;
}

export interface LabRow {
  key: string;
  name: string;
  unit?: string;
  cells: Array<LabCell | undefined>;
}

/**
 * Tabela para a tela: colunas = últimos `maxCols` painéis; linhas = exames.
 * A seta compara com o resultado anterior do MESMO exame (mesmo que esteja
 * num painel mais antigo, fora das colunas visíveis).
 */
export function buildLabTable(panels: LabPanel[], maxCols = 4): { columns: LabPanel[]; rows: LabRow[] } {
  const sorted = sortPanels(panels);
  const columns = sorted.slice(0, maxCols);
  const rows = new Map<string, LabRow>();
  columns.forEach((panel, col) => {
    for (const v of panel.values) {
      const key = analyteKey(v.analyte);
      let row = rows.get(key);
      if (!row) {
        const def = analyteDef(v.analyte);
        row = { key, name: def?.short ?? v.analyte, unit: v.unit ?? def?.unit, cells: new Array(columns.length).fill(undefined) };
        rows.set(key, row);
      }
      if (row.cells[col]) continue;
      const previous = previousValue(sorted, sorted.indexOf(panel), key);
      row.cells[col] = { value: v, previous, trend: trendOf(v.value, previous?.value) };
    }
  });
  const ordered = [...rows.values()].sort((a, b) => (ORDER[a.key] ?? 999) - (ORDER[b.key] ?? 999) || a.name.localeCompare(b.name));
  return { columns, rows: ordered };
}

function previousValue(sorted: LabPanel[], fromIndex: number, key: string): LabValue | undefined {
  for (let i = fromIndex + 1; i < sorted.length; i++) {
    const found = sorted[i].values.find((v) => analyteKey(v.analyte) === key);
    if (found) return found;
  }
  return undefined;
}

/** "Hb 10,2 (11,0 ↓) · Leuco 12.300 (15.000 ↓)" — para a evolução e o SBAR. */
export function labsLine(panels: LabPanel[], upTo?: string): { date: string; text: string } | null {
  const sorted = sortPanels(panels).filter((p) => !upTo || p.date <= upTo);
  const latest = sorted[0];
  if (!latest || !latest.values.length) return null;
  const parts = latest.values.map((v) => {
    const key = analyteKey(v.analyte);
    const def = analyteDef(v.analyte);
    const prev = previousValue(sorted, 0, key);
    const t = trendOf(v.value, prev?.value);
    const flag = v.flag === 'critico' ? ' (!)' : '';
    const cmp = prev && t ? ` (${formatLabValue(prev)} ${TREND_ARROW[t]})` : '';
    return `${def?.short ?? v.analyte} ${formatLabValue(v)}${flag}${cmp}`;
  });
  return { date: latest.date, text: parts.join(' · ') };
}
