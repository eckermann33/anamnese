import type { Antibiotic, CarriedField, Device, Encounter, Evolution, FluidBalance, Patient, Vitals } from '../db/types';
import type { ChipOption } from '../components/ui/Chip';
import type { SbarResult } from '../../shared/ai/schemas';
import { capitalize, daysBetween, formatDate, formatNumber, formatShortDate, joinPt, lowerFirst, sentence, toISODate } from '../lib/format';
import { vitalsText, type VitalKey } from './vitals';
import { labsLine } from './labs';
import { comorbidities, idText } from './narrative';

/* ==========================================================================
   EVOLUÇÃO DIÁRIA (SOAP) — regras e textos
   --------------------------------------------------------------------------
   Tudo aqui é local (offline) e testável: contagem de dias (internação,
   dispositivos, antimicrobianos), balanço hídrico e débito urinário,
   "evoluir a partir de ontem", séries para os gráficos, texto da evolução
   e passagem de plantão (SBAR) sem IA.
   Convenção de dias: D1 = o próprio dia (da internação, da inserção do
   dispositivo, da 1ª dose do antimicrobiano).
   ========================================================================== */

/* ---------- Subjetivo ---------- */

export const SUBJECTIVE_CHIPS: ChipOption[] = [
  { value: 'sem_queixas', label: 'Sem queixas' },
  { value: 'dor_controlada', label: 'Dor controlada' },
  { value: 'dor', label: 'Com dor', flag: 'orange' },
  { value: 'aceita_dieta', label: 'Aceitando dieta' },
  { value: 'baixa_aceitacao', label: 'Baixa aceitação da dieta', flag: 'orange' },
  { value: 'dieta_zero', label: 'Em dieta zero' },
  { value: 'nauseas', label: 'Náuseas/vômitos', flag: 'orange' },
  { value: 'diurese_ok', label: 'Diurese presente' },
  { value: 'evacuou', label: 'Evacuações presentes' },
  { value: 'sem_evacuar', label: 'Sem evacuar', flag: 'orange' },
  { value: 'febre', label: 'Febre', flag: 'orange' },
  { value: 'dispneia', label: 'Dispneia', flag: 'orange' },
  { value: 'sono_ok', label: 'Sono preservado' },
  { value: 'insonia', label: 'Insônia' },
  { value: 'deambula', label: 'Deambulando' },
  { value: 'acamado', label: 'Restrito ao leito' },
  { value: 'sem_relato', label: 'Sedado / sem relato' },
];

const SUBJECTIVE_PHRASE: Record<string, string> = {
  sem_queixas: 'sem queixas',
  dor: 'refere dor',
  febre: 'refere febre',
  dispneia: 'refere dispneia',
  aceita_dieta: 'aceitando bem a dieta',
  sem_relato: 'sedado, sem relato de queixas',
};

export function subjectiveText(evo: Pick<Evolution, 'subjective' | 'subjectiveChips'>): string {
  const phrases = evo.subjectiveChips
    .map((v) => SUBJECTIVE_PHRASE[v] ?? lowerFirst(SUBJECTIVE_CHIPS.find((c) => c.value === v)?.label ?? ''))
    .filter(Boolean);
  const chips = phrases.length ? sentence(capitalize(joinPt(phrases))) : '';
  return [chips, sentence(evo.subjective)].filter(Boolean).join(' ');
}

/* ---------- Contagem de dias ---------- */

/** D1 = dia de início. Antes do início → undefined. Após o fim, conta até o fim. */
export function dayCount(start: string, date: string, end?: string): number | undefined {
  const until = end && end < date ? end : date;
  const n = daysBetween(start, until) + 1;
  return n >= 1 ? n : undefined;
}

export function hospitalDay(patient: Pick<Patient, 'admissionDate'>, date: string): number | undefined {
  return patient.admissionDate ? dayCount(patient.admissionDate, date) : undefined;
}

export function isActiveOn(item: { start: string; end?: string }, date: string): boolean {
  return item.start <= date && (!item.end || item.end > date);
}

export function deviceActive(d: Device, date: string) {
  return isActiveOn({ start: d.insertedAt, end: d.removedAt }, date);
}
export function antibioticActive(a: Antibiotic, date: string) {
  return isActiveOn({ start: a.startedAt, end: a.stoppedAt }, date);
}

export function deviceLabel(d: Device, date: string): string {
  const n = dayCount(d.insertedAt, date, d.removedAt);
  const name = `${d.type}${d.site ? ` (${d.site})` : ''}`;
  if (d.removedAt && d.removedAt <= date) return `${name} — retirado em ${formatShortDate(d.removedAt)}`;
  return n ? `${name} — D${n}` : name;
}

export function antibioticLabel(a: Antibiotic, date: string): string {
  const n = dayCount(a.startedAt, date, a.stoppedAt);
  const days = n ? ` D${n}${a.plannedDays ? `/${a.plannedDays}` : ''}` : '';
  const ind = a.indication ? ` (${a.indication})` : '';
  if (a.stoppedAt && a.stoppedAt <= date) return `${a.name}${ind} — suspenso em ${formatShortDate(a.stoppedAt)}${n ? ` (D${n})` : ''}`;
  return `${a.name}${days}${ind}`;
}

/** Último dia previsto chegou/passou → lembrar de reavaliar. */
export function antibioticDue(a: Antibiotic, date: string): boolean {
  const n = dayCount(a.startedAt, date, a.stoppedAt);
  return !!(a.plannedDays && n && n >= a.plannedDays && antibioticActive(a, date));
}

/* ---------- Balanço hídrico e débito urinário ---------- */

export const INTAKE_FIELDS = [
  { key: 'oral', label: 'Via oral / enteral', short: 'VO' },
  { key: 'venosa', label: 'Endovenosa', short: 'EV' },
  { key: 'outros', label: 'Outras entradas', short: 'outras' },
] as const;

export const OUTPUT_FIELDS = [
  { key: 'diurese', label: 'Diurese', short: 'diurese' },
  { key: 'drenos', label: 'Drenos', short: 'drenos' },
  { key: 'vomitos', label: 'Vômitos / SNG', short: 'vômitos/SNG' },
  { key: 'evacuacoes', label: 'Evacuações', short: 'evacuações' },
  { key: 'outros', label: 'Outras perdas', short: 'outras' },
] as const;

export interface FluidSummary {
  intake: number;
  output: number;
  balance: number;
  hours: number;
  /** mL/kg/h */
  urineRate?: number;
  /** < 0,5 mL/kg/h — critério de débito urinário do KDIGO. */
  oliguria: boolean;
}

const sum = (o: Record<string, number | undefined>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);

export function fluidSummary(f: FluidBalance | undefined, weight?: number): FluidSummary | null {
  if (!f) return null;
  const hasAny = Object.values(f.intake).some((v) => v !== undefined) || Object.values(f.output).some((v) => v !== undefined);
  if (!hasAny) return null;
  const intake = sum(f.intake);
  const output = sum(f.output);
  const hours = f.hours || 24;
  const urineRate = f.output.diurese !== undefined && weight ? f.output.diurese / weight / hours : undefined;
  return { intake, output, balance: intake - output, hours, urineRate, oliguria: urineRate !== undefined && urineRate < 0.5 };
}

const ml = (n: number) => `${formatNumber(n, 0)} mL`;
export const signedMl = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatNumber(Math.abs(n), 0)} mL`;

export function fluidText(f: FluidBalance | undefined, weight?: number): string | null {
  const s = fluidSummary(f, weight);
  if (!s || !f) return null;
  const detail = (fields: ReadonlyArray<{ key: string; short: string }>, o: Record<string, number | undefined>) =>
    fields
      .filter((x) => o[x.key] !== undefined)
      .map((x) => `${x.short} ${formatNumber(o[x.key]!, 0)}`)
      .join(', ');
  const inD = detail(INTAKE_FIELDS, f.intake);
  const outD = detail(OUTPUT_FIELDS, f.output);
  let t = `BH (${s.hours} h): entradas ${ml(s.intake)}${inD ? ` (${inD})` : ''}; saídas ${ml(s.output)}${outD ? ` (${outD})` : ''}; balanço ${signedMl(s.balance)}.`;
  if (s.urineRate !== undefined) t += ` Débito urinário ${formatNumber(s.urineRate, 2)} mL/kg/h${s.oliguria ? ' (oligúria)' : ''}.`;
  return t;
}

/** Peso mais recente até a data (evoluções → anamnese). */
export function lastWeight(evolutions: Evolution[], date: string, base?: Encounter): number | undefined {
  const sorted = [...evolutions].filter((e) => e.date <= date && e.weight).sort((a, b) => (a.date < b.date ? 1 : -1));
  return sorted[0]?.weight ?? base?.exam.weight;
}

/* ---------- Evoluir a partir de ontem ---------- */

/**
 * Copia os textos da evolução anterior e marca cada campo copiado em
 * `carriedOver` (aparece em laranja até ser revisado ou editado).
 * Sinais vitais e balanço NÃO são copiados: precisam ser do dia.
 * Pendências: só as não concluídas.
 */
export function evolveFrom(prev: Evolution, blank: Evolution, newId: () => string): Evolution {
  const next: Evolution = { ...blank, carriedOver: [] };
  const carry = (field: CarriedField, has: boolean, apply: () => void) => {
    if (!has) return;
    apply();
    next.carriedOver.push(field);
  };
  carry('subjective', !!prev.subjective.trim() || prev.subjectiveChips.length > 0, () => {
    next.subjective = prev.subjective;
    next.subjectiveChips = [...prev.subjectiveChips];
  });
  carry('examText', !!prev.examText.trim(), () => (next.examText = prev.examText));
  carry('objectiveNotes', !!prev.objectiveNotes.trim(), () => (next.objectiveNotes = prev.objectiveNotes));
  carry('assessment', !!prev.assessment.trim(), () => (next.assessment = prev.assessment));
  carry('plan', !!prev.plan.trim(), () => (next.plan = prev.plan));
  const pending = prev.todos.filter((t) => !t.done);
  carry('todos', pending.length > 0, () => (next.todos = pending.map((t) => ({ ...t, id: newId() }))));
  if (prev.fluid) next.fluid = { intake: {}, output: {}, hours: prev.fluid.hours };
  return next;
}

/* ---------- Checklist diário do leito (FAST HUGS BID) ---------- */

export const DAILY_CHECKLIST = [
  { id: 'feeding', letter: 'F', label: 'Dieta', hint: 'Via, meta calórica, jejum desnecessário?' },
  { id: 'analgesia', letter: 'A', label: 'Analgesia', hint: 'Dor controlada? Escala registrada?' },
  { id: 'sedation', letter: 'S', label: 'Sedação', hint: 'Alvo definido (ex.: RASS)? Dá para reduzir/despertar?' },
  { id: 'thrombo', letter: 'T', label: 'Profilaxia de TEV', hint: 'Indicada? Farmacológica ou mecânica? Contraindicação?' },
  { id: 'head', letter: 'H', label: 'Cabeceira elevada', hint: '30–45° se ventilação mecânica ou risco de aspiração' },
  { id: 'ulcer', letter: 'U', label: 'Profilaxia de úlcera de estresse', hint: 'Ainda indicada? Suspender se não houver indicação' },
  { id: 'glucose', letter: 'G', label: 'Controle glicêmico', hint: 'Glicemias no alvo? Hipoglicemias?' },
  { id: 'sbt', letter: 'S', label: 'Teste de respiração espontânea', hint: 'Critérios para desmame da ventilação?' },
  { id: 'bowel', letter: 'B', label: 'Hábito intestinal', hint: 'Evacuações? Constipação ou diarreia?' },
  { id: 'catheters', letter: 'I', label: 'Dispositivos invasivos', hint: 'Cada cateter/sonda ainda é necessário hoje?' },
  { id: 'deescalation', letter: 'D', label: 'Descalonar antimicrobianos', hint: 'Culturas? Dá para estreitar, trocar para VO ou suspender?' },
] as const;

/* ---------- Séries para gráficos ---------- */

export interface VitalPoint {
  date: string;
  value: number;
}

const SERIES_KEYS: VitalKey[] = ['pas', 'fc', 'fr', 'temp', 'spo2', 'glicemia'];

export function vitalSeries(evolutions: Evolution[], base?: Encounter): Partial<Record<VitalKey, VitalPoint[]>> {
  const points: Array<{ date: string; vitals: Vitals }> = [];
  if (base) points.push({ date: toISODate(new Date(base.createdAt)), vitals: base.exam.vitals });
  for (const e of [...evolutions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))) {
    points.push({ date: e.date, vitals: e.vitals });
  }
  const out: Partial<Record<VitalKey, VitalPoint[]>> = {};
  for (const k of SERIES_KEYS) {
    const series = points.filter((p) => typeof p.vitals[k] === 'number').map((p) => ({ date: p.date, value: p.vitals[k] as number }));
    if (series.length) out[k] = series;
  }
  return out;
}

/* ---------- Texto da evolução ---------- */

export interface EvolutionContext {
  evo: Evolution;
  patient: Patient;
  /** Anamnese de referência (ID, alergias, comorbidades, peso). */
  base?: Encounter;
  /** Todas as evoluções do paciente (para o peso mais recente). */
  evolutions?: Evolution[];
  /** Sem iniciais e leito (para enviar à IA). */
  anonymize?: boolean;
}

function allergyLine(base?: Encounter): string | null {
  const h = base?.history;
  if (!h) return null;
  if (h.allergies.length) return `ALERGIAS: ${h.allergies.map((a) => `${a.substance}${a.reaction ? ` (${a.reaction})` : ''}`).join('; ')}.`;
  if (h.noKnownAllergies) return 'Nega alergias conhecidas.';
  return null;
}

function idLine(patient: Patient, base: Encounter | undefined, anonymize: boolean): string {
  if (base) return idText(base, patient, anonymize);
  const parts = [!anonymize && patient.initials ? patient.initials.toUpperCase() : '', patient.age !== undefined ? `${patient.age} ${patient.ageUnit}` : ''].filter(Boolean);
  return sentence(`${parts.join(', ')}${!anonymize && patient.bed ? `. Leito ${patient.bed}` : ''}`) || 'Não informada.';
}

export function evolutionText({ evo, patient, base, evolutions = [], anonymize = false }: EvolutionContext): string {
  const date = evo.date;
  const day = hospitalDay(patient, date);
  const weight = evo.weight ?? lastWeight(evolutions.filter((e) => e.id !== evo.id), date, base);
  const lines: string[] = [];

  lines.push(`EVOLUÇÃO — ${formatDate(date)}${day ? ` — D${day} de internação` : ''}`);
  lines.push(`ID: ${idLine(patient, base, anonymize)}`);
  const allergy = allergyLine(base);
  if (allergy) lines.push(allergy);

  // S
  lines.push('', `S: ${subjectiveText(evo) || 'Não registrado.'}`);

  // O
  const o: string[] = [];
  const sv = vitalsText(evo.vitals);
  if (sv) o.push(sentence(sv));
  if (evo.weight) o.push(`Peso ${formatNumber(evo.weight, 1)} kg.`);
  const bh = fluidText(evo.fluid, weight);
  if (bh) o.push(bh);
  if (evo.examText.trim()) o.push(`Exame físico: ${sentence(evo.examText)}`);
  if (evo.objectiveNotes.trim()) o.push(sentence(evo.objectiveNotes));
  const devices = patient.devices.filter((d) => d.insertedAt <= date && (!d.removedAt || d.removedAt >= date));
  if (devices.length) o.push(`Dispositivos: ${devices.map((d) => deviceLabel(d, date)).join('; ')}.`);
  const atbs = patient.antibiotics.filter((a) => a.startedAt <= date && (!a.stoppedAt || a.stoppedAt >= date));
  if (atbs.length) o.push(`Antimicrobianos: ${atbs.map((a) => antibioticLabel(a, date)).join('; ')}.`);
  const labs = labsLine(patient.labs, date);
  if (labs) o.push(`Exames (${formatShortDate(labs.date)}): ${labs.text}.`);
  lines.push(o.length ? `O: ${o.join('\n')}` : 'O: Não registrado.');

  // A
  const a: string[] = [];
  if (evo.assessment.trim()) a.push(sentence(evo.assessment));
  const active = patient.problems.filter((p) => p.status === 'ativo');
  if (active.length) a.push(`Problemas ativos:\n${active.map((p, i) => `${i + 1}. ${p.title}${p.since ? ` (desde ${formatShortDate(p.since)})` : ''}${p.notes ? ` — ${p.notes}` : ''}`).join('\n')}`);
  const resolved = patient.problems.filter((p) => p.status === 'resolvido');
  if (resolved.length) a.push(`Resolvidos: ${resolved.map((p) => p.title).join('; ')}.`);
  lines.push('', a.length ? `A: ${a.join('\n')}` : 'A: Não registrado.');

  // P
  const p: string[] = [];
  if (evo.plan.trim()) p.push(evo.plan.trim());
  const todos = evo.todos.filter((t) => t.text.trim());
  if (todos.length) p.push(`Pendências:\n${todos.map((t) => `- [${t.done ? 'x' : ' '}] ${t.text.trim()}`).join('\n')}`);
  lines.push('', p.length ? `P: ${p.join('\n')}` : 'P: Não registrado.');

  const checked = DAILY_CHECKLIST.filter((c) => evo.checklist?.[c.id]);
  if (checked.length) {
    const missing = DAILY_CHECKLIST.filter((c) => !evo.checklist?.[c.id]).map((c) => lowerFirst(c.label));
    lines.push('', `Checklist FAST HUGS BID: ${missing.length ? `revisados ${checked.length}/${DAILY_CHECKLIST.length}; faltam ${joinPt(missing)}.` : 'todos os itens revisados.'}`);
  }
  return lines.join('\n');
}

/* ---------- Passagem de plantão (SBAR) ---------- */

export interface SbarContext {
  patient: Patient;
  base?: Encounter;
  evolutions: Evolution[];
  date?: string;
  anonymize?: boolean;
}

function mainReason(base?: Encounter): string | undefined {
  if (!base) return undefined;
  return base.manualHypotheses.find((h) => h.trim()) ?? base.hypotheses?.result.hypotheses.find((h) => h.kind === 'principal')?.name ?? (base.complaint.text.trim() || undefined);
}

function latestEvolution(evolutions: Evolution[], date: string): Evolution | undefined {
  return [...evolutions].filter((e) => e.date <= date).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))[0];
}

/** SBAR montado só com os dados registrados (funciona offline). */
export function sbarLocal({ patient, base, evolutions, date = toISODate(), anonymize = false }: SbarContext): SbarResult {
  const day = hospitalDay(patient, date);
  const last = latestEvolution(evolutions, date);
  const who = anonymize
    ? [patient.age !== undefined ? `${patient.age} ${patient.ageUnit}` : '', patient.sex === 'F' ? 'feminino' : patient.sex === 'M' ? 'masculino' : ''].filter(Boolean).join(', ')
    : [patient.initials.toUpperCase(), patient.age !== undefined ? `${patient.age} ${patient.ageUnit}` : '', patient.bed ? `leito ${patient.bed}` : ''].filter(Boolean).join(', ');
  const reason = mainReason(base);
  // o motivo da internação já aparece em "Motivo" — não repetir na lista
  const active = patient.problems.filter((p) => p.status === 'ativo' && p.title.trim().toLowerCase() !== reason?.trim().toLowerCase()).map((p) => p.title);

  const s = [
    sentence(`${who || 'Paciente'}${day ? `, D${day} de internação` : ''}${reason ? `. Motivo: ${lowerFirst(reason)}` : ''}`),
    active.length ? `Problemas ativos: ${active.join('; ')}.` : '',
  ].filter(Boolean);

  const b: string[] = [];
  const comorb = base ? comorbidities(base.history) : [];
  if (comorb.length) b.push(`Comorbidades: ${joinPt(comorb)}.`);
  const allergy = allergyLine(base);
  if (allergy) b.push(allergy);
  const devices = patient.devices.filter((d) => deviceActive(d, date));
  if (devices.length) b.push(`Dispositivos: ${devices.map((d) => deviceLabel(d, date)).join('; ')}.`);
  const atbs = patient.antibiotics.filter((x) => antibioticActive(x, date));
  if (atbs.length) b.push(`Antimicrobianos: ${atbs.map((x) => antibioticLabel(x, date)).join('; ')}.`);
  const labs = labsLine(patient.labs, date);
  if (labs) b.push(`Exames (${formatShortDate(labs.date)}): ${labs.text}.`);

  const a: string[] = [];
  if (last) {
    const sv = vitalsText(last.vitals);
    if (sv) a.push(`Sinais vitais (${formatShortDate(last.date)}): ${sv}.`);
    const bh = fluidText(last.fluid, last.weight ?? lastWeight(evolutions, date, base));
    if (bh) a.push(bh);
    if (last.assessment.trim()) a.push(sentence(last.assessment));
  }

  const r: string[] = [];
  const pending = last?.todos.filter((t) => !t.done && t.text.trim()) ?? [];
  if (pending.length) r.push(`Pendências: ${pending.map((t) => t.text.trim()).join('; ')}.`);
  const due = patient.antibiotics.filter((x) => antibioticDue(x, date));
  if (due.length) r.push(`Reavaliar tempo de antimicrobiano: ${due.map((x) => antibioticLabel(x, date)).join('; ')}.`);
  if (last?.plan.trim()) {
    const items = last.plan
      .split('\n')
      .map((l) => l.trim().replace(/^[-•*]\s*/, '').replace(/[.;]+$/, ''))
      .filter(Boolean);
    r.push(`Plano: ${items.join('; ')}.`);
  }

  return {
    situation: s.join(' ') || 'Sem dados de identificação.',
    background: b.join(' ') || 'Sem antecedentes registrados.',
    assessment: a.join(' ') || 'Sem evolução registrada.',
    recommendation: r.join(' ') || 'Sem pendências registradas.',
  };
}

/** Texto anonimizado enviado à IA para montar o SBAR. */
export function sbarCaseText(c: SbarContext): string {
  const date = c.date ?? toISODate();
  const last = latestEvolution(c.evolutions, date);
  const local = sbarLocal({ ...c, anonymize: true });
  const parts = [
    `Data de hoje: ${formatDate(date)}.`,
    `RESUMO ESTRUTURADO:\nS: ${local.situation}\nB: ${local.background}\nA: ${local.assessment}\nR: ${local.recommendation}`,
  ];
  if (last) parts.push(`ÚLTIMA EVOLUÇÃO:\n${evolutionText({ evo: last, patient: c.patient, base: c.base, evolutions: c.evolutions, anonymize: true })}`);
  const trend = [...c.evolutions]
    .filter((e) => e.date <= date && vitalsText(e.vitals))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4)
    .map((e) => `${formatShortDate(e.date)}: ${vitalsText(e.vitals)}`);
  if (trend.length > 1) parts.push(`TENDÊNCIA DOS SINAIS VITAIS:\n${trend.join('\n')}`);
  return parts.join('\n\n');
}
