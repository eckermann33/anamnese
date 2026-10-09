import type { Encounter, Patient, Vitals } from '../db/types';
import type {
  AnswerValue,
  BodyMapValue,
  ComplaintTemplate,
  DurationUnit,
  Question,
  QuestionContext,
  QuestionSection,
  Tri,
  TriMap,
} from './types';
import { getTemplate } from './templates';
import { EXAM_SYSTEMS } from './exam';

/* ==========================================================================
   CONTEXTO CLÍNICO
   --------------------------------------------------------------------------
   Transforma o atendimento salvo em funções simples de consulta, usadas por:
   - ramificações da anamnese (showIf)
   - red flags, escores, alertas e texto do prontuário
   ========================================================================== */

export function ageInYears(age?: number, unit: Patient['ageUnit'] = 'anos'): number | undefined {
  if (age === undefined || age === null || Number.isNaN(age)) return undefined;
  if (unit === 'meses') return age / 12;
  if (unit === 'dias') return age / 365;
  return age;
}

export function durationToDays(value?: number, unit: DurationUnit = 'dias'): number | undefined {
  if (value === undefined) return undefined;
  const factor: Record<DurationUnit, number> = { minutos: 1 / 1440, horas: 1 / 24, dias: 1, semanas: 7, meses: 30, anos: 365 };
  return value * factor[unit];
}

function isTriMap(v: AnswerValue | undefined): v is TriMap {
  return !!v && typeof v === 'object' && !Array.isArray(v) && !('location' in v) && !('unit' in v);
}

export interface ClinicalContext extends QuestionContext {
  enc: Encounter;
  patient?: Patient;
  template: ComplaintTemplate;
  vitals: Vitals;
  /** Achado de exame físico marcado (qualquer sistema). */
  finding: (id: string) => boolean;
  /** Valor de uma linha estruturada do exame (ectoscopia/EEM). */
  examRow: (system: 'geral' | 'psiquiatrico', row: string) => string | undefined;
  /** Doença prévia marcada nos antecedentes. */
  disease: (id: string) => boolean;
  /** Glasgow total, se preenchido. */
  gcs?: number;
  /** Algum item de uma pergunta 'tri' está presente? */
  triHas: (questionId: string, ...items: string[]) => boolean;
}

export function buildContext(enc: Encounter, patient?: Patient): ClinicalContext {
  const template = getTemplate(enc.templateId);
  const answers = enc.answers;

  const a = (id: string) => answers[id];

  const has = (id: string, ...values: string[]) => {
    const v = answers[id];
    if (v === undefined || v === null || v === '') return false;
    if (values.length === 0) {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'string') return v !== 'nao';
      return true;
    }
    if (Array.isArray(v)) return v.some((x) => values.includes(x));
    if (typeof v === 'string') return values.includes(v);
    if (isTriMap(v)) return values.some((x) => v[x] === 'sim');
    return false;
  };

  const sym = (id: string): Tri | undefined => enc.symptoms[id];

  const body = (prefix: string, kind?: 'location' | 'radiation') => {
    const v = answers['localizacao'] as BodyMapValue | undefined;
    if (!v) return false;
    const lists = kind ? [v[kind] ?? []] : [v.location ?? [], v.radiation ?? []];
    return lists.some((l) => l.some((r) => r.startsWith(prefix)));
  };

  const num = (id: string) => {
    const v = answers[id];
    return typeof v === 'number' ? v : undefined;
  };

  const finding = (id: string) => Object.values(enc.exam.systems).some((s) => s?.findings?.includes(id));

  const examRow = (system: 'geral' | 'psiquiatrico', row: string) => enc.exam.systems[system]?.rows?.[row];

  const disease = (id: string) => enc.history.diseases.includes(id);

  const g = enc.exam.glasgow;
  const gcs = g?.o && g?.v && g?.m ? g.o + g.v + g.m : undefined;

  const triHas = (questionId: string, ...items: string[]) => {
    const v = answers[questionId];
    if (!isTriMap(v)) return false;
    return items.length ? items.some((i) => v[i] === 'sim') : Object.values(v).includes('sim');
  };

  return {
    a,
    has,
    sym,
    body,
    num,
    complaintDays: durationToDays(enc.complaint.duration, enc.complaint.durationUnit),
    ageYears: ageInYears(patient?.age, patient?.ageUnit),
    sex: patient?.sex,
    profile: enc.config.profile,
    setting: enc.config.setting,
    enc,
    patient,
    template,
    vitals: enc.exam.vitals,
    finding,
    examRow,
    disease,
    gcs,
    triHas,
  };
}

/* ---------- Visibilidade de perguntas/seções ---------- */

export function isSectionVisible(section: QuestionSection, ctx: QuestionContext): boolean {
  return !section.showIf || section.showIf(ctx);
}

export function isQuestionVisible(q: Question, ctx: QuestionContext, showExtra: boolean): boolean {
  if (q.showIf && !q.showIf(ctx)) return false;
  if (q.extra && !showExtra) return false;
  return true;
}

/** PS e UTI começam no modo "essencial" (perguntas complementares recolhidas). */
export function defaultShowExtra(enc: Encounter): boolean {
  return enc.config.setting === 'ambulatorio' || enc.config.setting === 'enfermaria';
}

/** A resposta está preenchida? */
export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') {
    if ('location' in v) return (v.location?.length ?? 0) + (v.radiation?.length ?? 0) > 0;
    if ('unit' in v) return v.value !== undefined;
    return Object.keys(v).length > 0;
  }
  return true;
}

/** Sistemas do exame a mostrar: sempre os "always" + os selecionados + os já examinados. */
export function examSystemsToShow(enc: Encounter) {
  const chosen = new Set<string>(enc.systems);
  if (enc.config.profile === 'gestante') chosen.add('ginecologico');
  return EXAM_SYSTEMS.filter(
    (s) => s.always || chosen.has(s.id) || (enc.exam.systems[s.id] && (enc.exam.systems[s.id]!.normal || enc.exam.systems[s.id]!.findings.length)),
  );
}
