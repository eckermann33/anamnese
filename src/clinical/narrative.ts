import type { Encounter, Patient } from '../db/types';
import type { AnswerValue, BodyMapValue, Question, QuestionSection, TriMap } from './types';
import { buildContext, isAnswered, isSectionVisible, type ClinicalContext } from './context';
import { labelsOf } from './templates/common';
import { symptomsOfGroup, symptomText } from './symptoms';
import { ISDA_GROUP_LABEL, ISDA_ORDER } from './systems';
import {
  DISEASE_OPTIONS,
  ELDERLY_SECTION,
  FAMILY_SECTION,
  GYNECO_SECTION,
  HABITS_SECTION,
  PEDIATRIC_SECTION,
  PRENATAL_SECTION,
  SOCIAL_SECTION,
  VACCINE_SECTION,
} from './historySections';
import { EXAM_SYSTEMS, type ExamSystemDef } from './exam';
import { bmi, bmiClass, vitalsText } from './vitals';
import { capitalize, formatDateTime, formatNumber, joinPt, lowerFirst, sentence } from '../lib/format';
import { examSystemsToShow } from './context';

/* ==========================================================================
   GERADOR DO TEXTO DO PRONTUÁRIO
   --------------------------------------------------------------------------
   Converte as respostas em prosa médica formal, na ordem:
   ID, QP, HDA, ISDA, AP, AF, HV, CSE, EF, HD, Conduta.
   Só entra no texto o que foi efetivamente perguntado/examinado.
   ========================================================================== */

const SETTING_LABEL = { ps: 'Pronto-socorro', ambulatorio: 'Ambulatório', enfermaria: 'Enfermaria', uti: 'UTI' } as const;
const SEX_LABEL = { F: 'sexo feminino', M: 'sexo masculino', O: 'sexo não informado' } as const;

/* ---------- Resposta → fragmento de texto ---------- */

export function answerFragment(q: Question, value: AnswerValue, ctx: ClinicalContext): string | null {
  if (q.narrative) {
    try {
      return q.narrative(value, ctx, q) ?? null;
    } catch {
      return null;
    }
  }
  const short = q.short ?? q.label.replace(/\?$/, '');
  switch (q.type) {
    case 'single':
      return `${short}: ${labelsOf(q.options, value)[0]}`;
    case 'multi':
      return `${short}: ${joinPt(labelsOf(q.options, value))}`;
    case 'yesno':
      if (value === 'sim') return q.yesText ?? `${short}: sim`;
      if (value === 'nao') return q.noText ?? `${short}: não`;
      return null;
    case 'number':
    case 'scale':
      return `${short}: ${typeof value === 'number' ? formatNumber(value) : value}${q.unit ? ` ${q.unit}` : ''}`;
    case 'text':
      return `${short}: ${String(value)}`;
    case 'date':
      return `${short}: ${String(value)}`;
    case 'duration': {
      const d = value as { value?: number; unit: string };
      return d.value !== undefined ? `${short}: ${d.value} ${d.unit}` : null;
    }
    case 'bodymap': {
      const b = value as BodyMapValue;
      return b.location?.length ? `${short}: ${b.location.join(', ')}` : null;
    }
    case 'tri': {
      const map = value as TriMap;
      const yes = Object.entries(map).filter(([, s]) => s === 'sim').map(([k]) => k);
      const no = Object.entries(map).filter(([, s]) => s === 'nao').map(([k]) => k);
      const parts: string[] = [];
      if (yes.length) parts.push(`presentes: ${joinPt(labelsOf(q.options, yes))}`);
      if (no.length) parts.push(`ausentes: ${joinPt(labelsOf(q.options, no))}`);
      return parts.length ? `${short} — ${parts.join('; ')}` : null;
    }
    default:
      return null;
  }
}

/** Valor efetivo de uma pergunta (yesno ligado a sintoma lê o mapa global). */
export function questionValue(q: Question, enc: Encounter): AnswerValue | undefined {
  if (q.type === 'yesno' && q.symptom) return enc.symptoms[q.symptom];
  return enc.answers[q.id];
}

interface SectionText {
  sentences: string[];
  positives: string[];
  negatives: string[];
}

/** Converte uma seção de perguntas em frases. */
export function sectionText(section: QuestionSection, ctx: ClinicalContext, subject?: string): SectionText {
  const out: SectionText = { sentences: [], positives: [], negatives: [] };
  if (!isSectionVisible(section, ctx)) return out;
  const fragments: string[] = [];
  const notes: string[] = [];

  for (const q of section.questions) {
    if (q.showIf && !q.showIf(ctx)) continue;
    const value = questionValue(q, ctx.enc);
    const note = ctx.enc.notes[q.id]?.trim();
    if (q.type === 'symptoms') {
      const map = ctx.enc.symptoms;
      for (const o of q.options ?? []) {
        if (map[o.value] === 'sim') out.positives.push(symptomText(o.value));
        if (map[o.value] === 'nao') out.negatives.push(symptomText(o.value));
      }
      if (note) notes.push(note);
      continue;
    }
    if (!isAnswered(value)) {
      if (note) notes.push(`${q.short ?? q.label.replace(/\?$/, '')}: ${note}`);
      continue;
    }
    const frag = answerFragment(q, value!, ctx);
    if (frag) fragments.push(note ? `${frag} (${note})` : frag);
    else if (note) notes.push(note);
  }

  if (section.prose === 'list' && fragments.length) {
    out.sentences.push(sentence(`${subject ?? ''} ${fragments.join(', ')}`.trim()));
  } else {
    fragments.forEach((f) => out.sentences.push(sentence(f)));
  }
  notes.forEach((n) => out.sentences.push(sentence(n)));
  return out;
}

/* ---------- Seções do prontuário ---------- */

function idText(enc: Encounter, p: Patient | undefined, anonymize: boolean): string {
  if (!p) return 'Não informada.';
  const parts: string[] = [];
  if (!anonymize && p.initials) parts.push(p.initials.toUpperCase());
  if (p.age !== undefined) parts.push(`${p.age} ${p.ageUnit}`);
  if (p.sex) parts.push(SEX_LABEL[p.sex]);
  if (p.maritalStatus) parts.push(lowerFirst(p.maritalStatus));
  if (p.occupation) parts.push(lowerFirst(p.occupation));
  if (p.origin) parts.push(`procedente de ${p.origin}`);
  let s = parts.join(', ');
  if (!anonymize && p.bed) s += `. Leito ${p.bed}`;
  const profile = enc.config.profile === 'gestante' ? 'Gestante' : '';
  return sentence([s, profile].filter(Boolean).join('. ')) || 'Não informada.';
}

function durationText(enc: Encounter): string {
  const { duration, durationUnit } = enc.complaint;
  if (duration === undefined) return '';
  const unit = duration === 1 ? durationUnit.replace(/s$/, '').replace(/ê$/, 'ês').replace('mese', 'mês') : durationUnit;
  return `há ${formatNumber(duration)} ${unit}`;
}

function qpText(enc: Encounter): string {
  const t = enc.complaint.text.trim();
  if (!t) return 'Não informada.';
  const d = durationText(enc);
  return sentence(`${capitalize(t.replace(/[.\s]+$/, ''))}${d && !/\bhá\b/i.test(t) ? ` ${d}` : ''}`);
}

function hdaText(ctx: ClinicalContext): { text: string; mentioned: Set<string> } {
  const enc = ctx.enc;
  const t = ctx.template;
  const mentioned = new Set<string>();
  const out: string[] = [];
  const qp = enc.complaint.text.trim().replace(/[.\s]+$/, '');
  if (qp) {
    const d = durationText(enc);
    out.push(sentence(`Paciente refere ${lowerFirst(qp)}${d && !/\bhá\b/i.test(qp) ? ` ${d}` : ''}`));
  }
  const positives: string[] = [];
  const negatives: string[] = [];
  for (const section of t.sections) {
    const st = sectionText(section, ctx, t.subject);
    out.push(...st.sentences);
    positives.push(...st.positives);
    negatives.push(...st.negatives);
    section.questions.filter((q) => q.type === 'symptoms').forEach((q) => q.options?.forEach((o) => mentioned.add(o.value)));
  }
  if (positives.length) out.push(sentence(`Associa-se a ${joinPt(positives)}`));
  if (negatives.length) out.push(sentence(`Nega ${joinPt(negatives)}`));

  // Linha do tempo
  const events = [...enc.timeline].filter((e) => e.label.trim());
  if (events.length) {
    const toDays = (v?: number, u?: string) =>
      v === undefined ? 0 : v * ({ minutos: 1 / 1440, horas: 1 / 24, dias: 1, semanas: 7, meses: 30, anos: 365 } as Record<string, number>)[u ?? 'dias'];
    events.sort((a, b) => toDays(b.ago, b.agoUnit) - toDays(a.ago, a.agoUnit));
    out.push(
      sentence(
        `Cronologia: ${events
          .map((e) => (e.ago === undefined ? e.label : `há ${formatNumber(e.ago)} ${e.agoUnit}, ${lowerFirst(e.label)}`))
          .join('; ')}`,
      ),
    );
  }
  return { text: out.join(' ') || 'Não descrita.', mentioned };
}

function isdaText(ctx: ClinicalContext, mentioned: Set<string>): string {
  const enc = ctx.enc;
  const lines: string[] = [];
  for (const group of ISDA_ORDER) {
    const syms = symptomsOfGroup(group).filter((s) => !mentioned.has(s.value));
    const yes = syms.filter((s) => enc.symptoms[s.value] === 'sim').map((s) => symptomText(s.value));
    const no = syms.filter((s) => enc.symptoms[s.value] === 'nao').map((s) => symptomText(s.value));
    const note = enc.isdaNotes[group]?.trim();
    if (!yes.length && !no.length && !note) continue;
    const allNegated = !yes.length && no.length === syms.length;
    const parts: string[] = [];
    if (yes.length) parts.push(`refere ${joinPt(yes)}`);
    if (allNegated) parts.push('sem queixas');
    else if (no.length) parts.push(no.length > 4 ? 'nega demais sintomas' : `nega ${joinPt(no)}`);
    if (note) parts.push(note);
    lines.push(`${ISDA_GROUP_LABEL[group]}: ${parts.join('; ')}.`);
  }
  return lines.join('\n') || 'Não realizado.';
}

function sectionsText(sections: QuestionSection[], ctx: ClinicalContext): string[] {
  return sections.flatMap((s) => sectionText(s, ctx).sentences);
}

function apText(ctx: ClinicalContext): string {
  const h = ctx.enc.history;
  const lines: string[] = [];
  const diseases = labelsOf(DISEASE_OPTIONS, h.diseases);
  if (h.diseasesOther.trim()) diseases.push(h.diseasesOther.trim());
  if (diseases.length) lines.push(sentence(`Comorbidades: ${joinPt(diseases)}`));
  if (h.surgeries.length)
    lines.push(sentence(`Cirurgias prévias: ${h.surgeries.map((s) => `${s.name}${s.year ? ` (${s.year})` : ''}`).join('; ')}`));
  if (h.hospitalizations.length)
    lines.push(sentence(`Internações prévias: ${h.hospitalizations.map((s) => `${s.name}${s.year ? ` (${s.year})` : ''}`).join('; ')}`));
  if (h.allergies.length)
    lines.push(
      sentence(
        `Alergias: ${h.allergies
          .map((a) => `${a.substance}${a.reaction ? ` (${a.reaction}${a.severity ? `, ${a.severity}` : ''})` : ''}`)
          .join('; ')}`,
      ),
    );
  else if (h.noKnownAllergies) lines.push('Nega alergias conhecidas.');
  if (h.medications.length)
    lines.push(sentence(`Medicações em uso: ${h.medications.map((m) => [m.name, m.dose, m.posology].filter(Boolean).join(' ')).join('; ')}`));
  else if (h.noMedications) lines.push('Nega uso de medicações contínuas.');
  lines.push(...sectionsText([VACCINE_SECTION], ctx));
  const go = sectionsText([GYNECO_SECTION, PRENATAL_SECTION], ctx);
  if (go.length) lines.push(`Gineco-obstétricos: ${go.join(' ')}`);
  const ped = sectionsText([PEDIATRIC_SECTION], ctx);
  if (ped.length) lines.push(`Antecedentes pediátricos: ${ped.join(' ')}`);
  const old = sectionsText([ELDERLY_SECTION], ctx);
  if (old.length) lines.push(`Avaliação funcional: ${old.join(' ')}`);
  return lines.join('\n') || 'Não informados.';
}

/** Texto de um sistema do exame físico. */
export function examSystemText(def: ExamSystemDef, enc: Encounter): string | null {
  const st = enc.exam.systems[def.id];
  if (!st) return null;
  if (def.rows) {
    const rows = def.rows
      .map((r) => {
        const v = st.rows?.[r.id] ?? (st.normal ? r.options[0].value : undefined);
        const o = r.options.find((x) => x.value === v);
        return o ? (o.text ?? lowerFirst(o.label)) : null;
      })
      .filter(Boolean) as string[];
    const txt = [rows.join(', '), st.notes?.trim()].filter(Boolean).join('. ');
    return txt ? sentence(txt) : null;
  }
  const examined = st.normal || st.findings.length > 0;
  if (!examined && !st.notes?.trim()) return null;
  const selected = def.findings.filter((f) => st.findings.includes(f.id));
  const parts: string[] = [];
  for (const part of def.normal) {
    const repl = selected.filter((f) => f.replaces === part.key);
    if (repl.length) parts.push(...repl.map((f) => f.text));
    else if (examined) parts.push(part.text);
  }
  parts.push(...selected.filter((f) => !f.replaces).map((f) => f.text));
  const txt = [parts.join(', '), st.notes?.trim()].filter(Boolean).join('. ');
  return txt ? sentence(txt) : null;
}

function efText(ctx: ClinicalContext): string {
  const enc = ctx.enc;
  const lines: string[] = [];
  const sv = vitalsText(enc.exam.vitals);
  if (sv) lines.push(`Sinais vitais: ${sv}.`);
  const { weight, height } = enc.exam;
  if (weight || height) {
    const b = bmi(weight, height);
    const parts = [
      weight ? `peso ${formatNumber(weight, 1)} kg` : '',
      height ? `altura ${formatNumber(height > 3 ? height / 100 : height, 2)} m` : '',
      b ? `IMC ${formatNumber(b, 1)} kg/m² (${bmiClass(b, ctx.ageYears).label})` : '',
    ].filter(Boolean);
    lines.push(sentence(`Antropometria: ${parts.join(', ')}`));
  }
  for (const def of examSystemsToShow(enc)) {
    const t = examSystemText(def, enc);
    if (t) lines.push(`${def.abbr}: ${t}`);
  }
  const g = enc.exam.glasgow;
  if (g?.o && g?.v && g?.m) {
    const pupils = g.p !== undefined ? ` · GCS-P ${g.o + g.v + g.m - g.p}` : '';
    lines.push(`Glasgow ${g.o + g.v + g.m} (O${g.o} V${g.v} M${g.m})${pupils}.`);
  }
  // Sistemas examinados que não estão na lista padrão (ex.: examinado e depois desmarcado)
  for (const def of EXAM_SYSTEMS) {
    if (examSystemsToShow(enc).some((d) => d.id === def.id)) continue;
    const t = examSystemText(def, enc);
    if (t) lines.push(`${def.abbr}: ${t}`);
  }
  return lines.join('\n') || 'Não realizado.';
}

function hdText(enc: Encounter): string {
  const list = enc.manualHypotheses.filter((h) => h.trim());
  if (list.length) return list.map((h, i) => `${i + 1}. ${h}`).join('\n');
  const ai = enc.hypotheses?.result.hypotheses;
  if (ai?.length) return ai.map((h, i) => `${i + 1}. ${h.name}${h.kind === 'principal' ? ' (principal)' : ''}`).join('\n');
  return 'A definir.';
}

/* ---------- Texto completo ---------- */

export interface NoteOptions {
  /** Remove iniciais e leito (para enviar à IA — LGPD). */
  anonymize?: boolean;
  /** Inclui HD e Conduta. */
  includePlan?: boolean;
  /** Inclui cabeçalho com cenário e data. */
  header?: boolean;
}

export function generateNote(enc: Encounter, patient?: Patient, opts: NoteOptions = {}): string {
  const { anonymize = false, includePlan = true, header = true } = opts;
  const ctx = buildContext(enc, patient);
  const hda = hdaText(ctx);
  const blocks: Array<[string, string]> = [
    ['ID', idText(enc, patient, anonymize)],
    ['QP', qpText(enc)],
    ['HDA', hda.text],
    ['ISDA', isdaText(ctx, hda.mentioned)],
    ['AP', apText(ctx)],
    ['AF', sectionsText([FAMILY_SECTION], ctx).join(' ') || 'Não informados.'],
    ['HV', sectionsText([HABITS_SECTION], ctx).join(' ') || 'Não informados.'],
    ['CSE', sectionsText([SOCIAL_SECTION], ctx).join(' ') || 'Não informadas.'],
    ['EF', efText(ctx)],
  ];
  if (includePlan) {
    blocks.push(['HD', hdText(enc)]);
    blocks.push(['Conduta', enc.conduct.trim() || 'A definir.']);
  }
  const head = header ? `ANAMNESE — ${SETTING_LABEL[enc.config.setting]} — ${formatDateTime(enc.createdAt)}\n\n` : '';
  return head + blocks.map(([k, v]) => (v.includes('\n') ? `${k}:\n${v}` : `${k}: ${v}`)).join('\n\n');
}

/** Texto enviado à IA: anonimizado + alertas e escores calculados localmente. */
export function caseTextForAI(enc: Encounter, patient: Patient | undefined, extras: { redFlags: string[]; scores: string[]; medAlerts: string[] }): string {
  const note = generateNote(enc, patient, { anonymize: true, includePlan: false, header: false });
  const parts = [
    `Cenário: ${SETTING_LABEL[enc.config.setting]}. Perfil: ${enc.config.profile}.`,
    `Sistemas priorizados: ${enc.systems.join(', ') || 'não definidos'}.`,
    note,
  ];
  if (extras.redFlags.length) parts.push(`RED FLAGS detectadas pelo app (regras locais):\n- ${extras.redFlags.join('\n- ')}`);
  if (extras.scores.length) parts.push(`ESCORES calculados pelo app:\n- ${extras.scores.join('\n- ')}`);
  if (extras.medAlerts.length) parts.push(`ALERTAS DE MEDICAÇÃO:\n- ${extras.medAlerts.join('\n- ')}`);
  if (enc.manualHypotheses.length) parts.push(`Hipóteses do usuário: ${enc.manualHypotheses.join('; ')}`);
  return parts.join('\n\n');
}

/** Usado para saber se os dados mudaram desde a última análise da IA. */
export function hashString(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
