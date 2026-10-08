import type { Draft } from 'immer';
import type { Allergy, Encounter, Medication } from '../../db/types';
import type { DurationUnit, Option, Question, QuestionSection } from '../../clinical/types';
import type { ClinicalContext } from '../../clinical/context';
import { examSystemsToShow, isSectionVisible } from '../../clinical/context';
import { SYMPTOMS } from '../../clinical/symptoms';
import { EXAM_SYSTEMS } from '../../clinical/exam';
import { VITAL_META, type VitalKey } from '../../clinical/vitals';
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
} from '../../clinical/historySections';
import { formatNumber, parseNumber } from '../../lib/format';
import { uid } from '../../db';

/* ==========================================================================
   DITADO → CAMPOS
   Monta a lista de campos que a IA pode preencher (id, rótulo, tipo,
   opções) e, para cada um, como APLICAR o valor devolvido com segurança:
   valores fora das opções, números fora da faixa e campos desconhecidos são
   descartados. Nada é aplicado sem o usuário revisar.
   ========================================================================== */

export interface DictationField {
  id: string;
  label: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
}

export interface DictationSpec {
  field: DictationField;
  group: string;
  /** Aplica no rascunho; false = valor inválido (ignorado). */
  apply: (d: Draft<Encounter>, value: string) => boolean;
  /** Valor legível para a tela de revisão. */
  display: (value: string) => string;
}

const opts = (options: Option[] | undefined) => (options ?? []).map((o) => ({ value: o.value, label: o.label }));
const labelOf = (options: Option[] | undefined, v: string) => options?.find((o) => o.value === v)?.label ?? v;
const splitMulti = (v: string) =>
  v
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);

function questionSpec(q: Question, group: string, sectionTitle?: string): DictationSpec | null {
  const label = sectionTitle && sectionTitle !== q.label ? `${sectionTitle} › ${q.label}` : q.label;
  const valid = new Set((q.options ?? []).map((o) => o.value));
  switch (q.type) {
    case 'single':
      return {
        field: { id: q.id, label, type: 'escolha', options: opts(q.options) },
        group,
        apply: (d, v) => (valid.has(v) ? ((d.answers[q.id] = v), true) : false),
        display: (v) => labelOf(q.options, v),
      };
    case 'multi':
      return {
        field: { id: q.id, label, type: 'multipla', options: opts(q.options) },
        group,
        apply: (d, v) => {
          const vals = splitMulti(v).filter((x) => valid.has(x));
          if (!vals.length) return false;
          const cur = Array.isArray(d.answers[q.id]) ? (d.answers[q.id] as string[]) : [];
          d.answers[q.id] = [...new Set([...cur, ...vals])];
          return true;
        },
        display: (v) => splitMulti(v).map((x) => labelOf(q.options, x)).join(', '),
      };
    case 'yesno':
      return {
        field: { id: q.id, label, type: q.symptom ? 'symptom' : 'simnao', options: [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }] },
        group,
        apply: (d, v) => {
          if (v !== 'sim' && v !== 'nao') return false;
          if (q.symptom) d.symptoms[q.symptom] = v;
          else d.answers[q.id] = v;
          return true;
        },
        display: (v) => (v === 'sim' ? 'Sim' : 'Não'),
      };
    case 'tri':
      return {
        field: { id: q.id, label: `${label} (formato: valor:sim|valor:nao)`, type: 'tri', options: opts(q.options) },
        group,
        apply: (d, v) => {
          const pairs = splitMulti(v)
            .map((x) => x.split(':').map((y) => y.trim()))
            .filter(([k, s]) => valid.has(k) && (s === 'sim' || s === 'nao'));
          if (!pairs.length) return false;
          const cur = (d.answers[q.id] && typeof d.answers[q.id] === 'object' && !Array.isArray(d.answers[q.id]) ? d.answers[q.id] : {}) as Record<string, string>;
          d.answers[q.id] = { ...cur, ...Object.fromEntries(pairs) } as never;
          return true;
        },
        display: (v) =>
          splitMulti(v)
            .map((x) => {
              const [k, s] = x.split(':');
              return `${labelOf(q.options, k?.trim())}: ${s?.trim() === 'sim' ? 'presente' : 'ausente'}`;
            })
            .join('; '),
      };
    case 'scale':
    case 'number':
      return {
        field: { id: q.id, label: `${label}${q.unit ? ` (${q.unit})` : ''}`, type: 'numero' },
        group,
        apply: (d, v) => {
          const n = parseNumber(v);
          if (n === undefined || (q.min !== undefined && n < q.min) || (q.max !== undefined && n > q.max)) return false;
          d.answers[q.id] = n;
          return true;
        },
        display: (v) => `${v}${q.unit ? ` ${q.unit}` : ''}`,
      };
    case 'text':
      return {
        field: { id: q.id, label, type: 'texto' },
        group,
        apply: (d, v) => {
          const t = v.trim();
          if (!t) return false;
          const cur = typeof d.answers[q.id] === 'string' ? (d.answers[q.id] as string) : '';
          d.answers[q.id] = cur && !cur.includes(t) ? `${cur}; ${t}` : t;
          return true;
        },
        display: (v) => v,
      };
    default:
      return null; // mapa corporal, datas e listas de sintomas (estes vão pelos campos de sintoma)
  }
}

function sectionSpecs(sections: QuestionSection[], group: string, ctx?: ClinicalContext): DictationSpec[] {
  return sections
    .filter((s) => !ctx || isSectionVisible(s, ctx))
    .flatMap((s) => s.questions.map((q) => questionSpec(q, group, s.title)).filter((x): x is DictationSpec => !!x));
}

const DURATION_UNITS: DurationUnit[] = ['minutos', 'horas', 'dias', 'semanas', 'meses', 'anos'];

/** O ditado fala de exame físico? (só então os campos de exame vão para a IA) */
const EXAM_WORDS = /exame|ectoscop|ausculta|murm|bulha|sopro|ritmo|abdome|abd[oô]m|pulm|crepit|sibil|ru[ií]do|edema|pupil|glasgow|lucid|orientad|corad|hidratad|ict[eé]ric|cian[oó]|perfus|pulso|reflexo|for[cç]a|palpa|dor [àa] palpa|defesa|blumberg|murphy|giordano|lasegue|rigidez/i;

/** Campos enviados à IA para este ditado (lista enxuta). */
export function selectDictationFields(specs: DictationSpec[], transcript: string): DictationField[] {
  const withExam = EXAM_WORDS.test(transcript);
  return specs.filter((s) => withExam || s.group !== 'Exame físico').map((s) => ({ ...s.field, label: s.field.label.slice(0, 200) }));
}

export function buildDictationSpecs(ctx: ClinicalContext): DictationSpec[] {
  const specs: DictationSpec[] = [];

  // Queixa principal
  specs.push(
    {
      field: { id: 'qp_texto', label: 'Queixa principal (nas palavras do paciente)', type: 'texto' },
      group: 'Queixa principal',
      apply: (d, v) => (v.trim() ? ((d.complaint.text = v.trim()), true) : false),
      display: (v) => v,
    },
    {
      field: { id: 'qp_duracao', label: 'Duração da queixa (número)', type: 'numero' },
      group: 'Queixa principal',
      apply: (d, v) => {
        const n = parseNumber(v);
        return n !== undefined && n >= 0 ? ((d.complaint.duration = n), true) : false;
      },
      display: (v) => v,
    },
    {
      field: { id: 'qp_unidade', label: 'Unidade da duração', type: 'escolha', options: DURATION_UNITS.map((u) => ({ value: u, label: u })) },
      group: 'Queixa principal',
      apply: (d, v) => (DURATION_UNITS.includes(v as DurationUnit) ? ((d.complaint.durationUnit = v as DurationUnit), true) : false),
      display: (v) => v,
    },
  );

  // HDA do template escolhido (todas as seções: um ramo pode abrir com o próprio ditado)
  specs.push(...sectionSpecs(ctx.template.sections, 'HDA'));

  // Sintomas (mapa global HDA ↔ ISDA) — um campo só, para o pedido à IA ficar enxuto
  const symIds = new Set(SYMPTOMS.map((x) => x.value));
  const symLabel = (id: string) => SYMPTOMS.find((x) => x.value === id)?.label ?? id;
  specs.push({
    field: {
      id: 'sintomas',
      label: 'Sintomas presentes ou negados (formato: valor:sim|valor:nao)',
      type: 'sintomas',
      options: SYMPTOMS.map((x) => ({ value: x.value, label: x.label })),
    },
    group: 'Sintomas (HDA/ISDA)',
    apply: (d, v) => {
      const pairs = splitMulti(v)
        .map((x) => x.split(':').map((y) => y.trim()))
        .filter(([k, st]) => symIds.has(k) && (st === 'sim' || st === 'nao'));
      if (!pairs.length) return false;
      for (const [k, st] of pairs) d.symptoms[k] = st as 'sim' | 'nao';
      return true;
    },
    display: (v) =>
      splitMulti(v)
        .map((x) => {
          const [k, st] = x.split(':').map((y) => y.trim());
          return `${symLabel(k)}: ${st === 'sim' ? 'presente' : 'nega'}`;
        })
        .join('; '),
  });

  // Antecedentes
  specs.push(
    {
      field: { id: 'ap_doencas', label: 'Doenças prévias', type: 'multipla', options: opts(DISEASE_OPTIONS) },
      group: 'Antecedentes',
      apply: (d, v) => {
        const vals = splitMulti(v).filter((x) => DISEASE_OPTIONS.some((o) => o.value === x));
        if (!vals.length) return false;
        d.history.diseases = [...new Set([...d.history.diseases, ...vals])];
        return true;
      },
      display: (v) => splitMulti(v).map((x) => labelOf(DISEASE_OPTIONS, x)).join(', '),
    },
    {
      field: { id: 'ap_alergias', label: 'Alergias (itens separados por ";", formato: substância - reação)', type: 'lista' },
      group: 'Antecedentes',
      apply: (d, v) => {
        const items = v
          .split(';')
          .map((x) => x.trim())
          .filter(Boolean);
        if (!items.length) return false;
        for (const it of items) {
          const [substance, reaction] = it.split(/\s+-\s+/).map((x) => x.trim());
          if (!substance || d.history.allergies.some((a) => a.substance.toLowerCase() === substance.toLowerCase())) continue;
          const a: Allergy = { id: uid(), substance, reaction: reaction || undefined };
          d.history.allergies.push(a);
        }
        d.history.noKnownAllergies = false;
        return true;
      },
      display: (v) => v,
    },
    {
      field: { id: 'ap_nega_alergias', label: 'Nega alergias conhecidas', type: 'simnao', options: [{ value: 'sim', label: 'Sim' }] },
      group: 'Antecedentes',
      apply: (d, v) => (v === 'sim' && !d.history.allergies.length ? ((d.history.noKnownAllergies = true), true) : false),
      display: () => 'Nega alergias',
    },
    {
      field: { id: 'ap_medicacoes', label: 'Medicações em uso (itens separados por ";", formato: nome, dose, posologia)', type: 'lista' },
      group: 'Antecedentes',
      apply: (d, v) => {
        const items = v
          .split(';')
          .map((x) => x.trim())
          .filter(Boolean);
        if (!items.length) return false;
        for (const it of items) {
          const [name, dose, posology] = it.split(',').map((x) => x.trim());
          if (!name || d.history.medications.some((m) => m.name.toLowerCase() === name.toLowerCase())) continue;
          const m: Medication = { id: uid(), name, dose: dose || undefined, posology: posology || undefined };
          d.history.medications.push(m);
        }
        d.history.noMedications = false;
        return true;
      },
      display: (v) => v,
    },
  );
  specs.push(...sectionSpecs([VACCINE_SECTION], 'Antecedentes'));
  specs.push(...sectionSpecs([GYNECO_SECTION, PRENATAL_SECTION, PEDIATRIC_SECTION, ELDERLY_SECTION], 'Perfil', ctx));
  specs.push(...sectionSpecs([FAMILY_SECTION], 'Antecedentes familiares'));
  specs.push(...sectionSpecs([HABITS_SECTION, SOCIAL_SECTION], 'Hábitos e condições de vida'));

  // Sinais vitais e antropometria
  for (const k of Object.keys(VITAL_META) as VitalKey[]) {
    const m = VITAL_META[k];
    specs.push({
      field: { id: `sv_${k}`, label: `${m.label} (${m.unit})`, type: 'numero' },
      group: 'Sinais vitais',
      apply: (d, v) => {
        const n = parseNumber(v);
        if (n === undefined || n < m.min || n > m.max) return false;
        d.exam.vitals[k] = n;
        return true;
      },
      display: (v) => `${m.short} ${formatNumber(parseNumber(v) ?? 0, m.decimals)} ${m.unit}`,
    });
  }
  specs.push(
    {
      field: { id: 'ef_peso', label: 'Peso (kg)', type: 'numero' },
      group: 'Sinais vitais',
      apply: (d, v) => {
        const n = parseNumber(v);
        return n !== undefined && n > 0.3 && n < 400 ? ((d.exam.weight = n), true) : false;
      },
      display: (v) => `${v} kg`,
    },
    {
      field: { id: 'ef_altura', label: 'Altura (m)', type: 'numero' },
      group: 'Sinais vitais',
      apply: (d, v) => {
        const n = parseNumber(v);
        return n !== undefined && n > 0.3 && n < 250 ? ((d.exam.height = n), true) : false;
      },
      display: (v) => `${v} m`,
    },
  );

  // Exame físico: só os sistemas que aparecem neste atendimento (geral + priorizados)
  const shownExam = new Set(examSystemsToShow(ctx.enc).map((d) => d.id));
  for (const def of EXAM_SYSTEMS.filter((d) => shownExam.has(d.id))) {
    if (def.rows) {
      for (const r of def.rows) {
        const valid = new Set(r.options.map((o) => o.value));
        specs.push({
          field: { id: `ef_${def.id}_${r.id}`, label: `Exame ${def.label} › ${r.label}`, type: 'escolha', options: r.options.map((o) => ({ value: o.value, label: o.label })) },
          group: 'Exame físico',
          apply: (d, v) => {
            if (!valid.has(v)) return false;
            const st = (d.exam.systems[def.id] ??= { findings: [] });
            st.rows = { ...(st.rows ?? {}), [r.id]: v };
            st.normal = true;
            return true;
          },
          display: (v) => `${r.label}: ${r.options.find((o) => o.value === v)?.label ?? v}`,
        });
      }
    }
    if (def.findings.length) {
      const valid = new Set(def.findings.map((f) => f.id));
      specs.push({
        field: {
          id: `ef_${def.id}`,
          label: `Exame ${def.label} (use "normal" se descrito como normal)`,
          type: 'multipla',
          options: [{ value: 'normal', label: 'Normal' }, ...def.findings.map((f) => ({ value: f.id, label: f.label }))],
        },
        group: 'Exame físico',
        apply: (d, v) => {
          const vals = splitMulti(v);
          const st = (d.exam.systems[def.id] ??= { findings: [] });
          let ok = false;
          if (vals.includes('normal')) {
            st.normal = true;
            ok = true;
          }
          for (const id of vals.filter((x) => valid.has(x))) {
            const f = def.findings.find((x) => x.id === id)!;
            if (f.exclusive) st.findings = st.findings.filter((x) => def.findings.find((y) => y.id === x)?.exclusive !== f.exclusive);
            if (!st.findings.includes(id)) st.findings.push(id);
            st.normal = true;
            ok = true;
          }
          return ok;
        },
        display: (v) => splitMulti(v).map((x) => (x === 'normal' ? 'Normal' : (def.findings.find((f) => f.id === x)?.label ?? x))).join(', '),
      });
    }
  }

  // Observações livres do exame: um campo só ("sistema: texto")
  const obsTargets = EXAM_SYSTEMS.filter((d) => shownExam.has(d.id));
  specs.push({
    field: {
      id: 'ef_obs',
      label: 'Exame físico › observações livres (formato: sistema: texto; separe sistemas com "|")',
      type: 'texto',
      options: obsTargets.map((d) => ({ value: d.id, label: d.label })),
    },
    group: 'Exame físico',
    apply: (d, v) => {
      let ok = false;
      for (const part of splitMulti(v)) {
        const m = part.match(/^([a-z_]+)\s*:\s*(.+)$/i);
        const def = m && obsTargets.find((x) => x.id === m[1].trim());
        if (!def || !m) continue;
        const st = (d.exam.systems[def.id] ??= { findings: [] });
        st.notes = st.notes ? `${st.notes}; ${m[2].trim()}` : m[2].trim();
        st.normal = st.normal ?? true;
        ok = true;
      }
      return ok;
    },
    display: (v) =>
      splitMulti(v)
        .map((p) => {
          const [k, ...rest] = p.split(':');
          return `${obsTargets.find((x) => x.id === k.trim())?.label ?? k}: ${rest.join(':').trim()}`;
        })
        .join('; '),
  });

  return specs;
}
