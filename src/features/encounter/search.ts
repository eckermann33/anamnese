import type { Encounter, StepId } from '../../db/types';
import type { ClinicalContext } from '../../clinical/context';
import type { QuestionSection } from '../../clinical/types';
import { isAnswered, isQuestionVisible, isSectionVisible } from '../../clinical/context';
import { SYMPTOMS } from '../../clinical/symptoms';
import { SYSTEMS } from '../../clinical/systems';
import { EXAM_SYSTEMS } from '../../clinical/exam';
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
import { normalize } from '../../lib/format';

/* ==========================================================================
   BUSCA RÁPIDA NO ATENDIMENTO
   "onde pergunto sobre tabagismo?" → Hábitos › Tabagismo (toque e vai).
   Indexa perguntas da HDA (do template escolhido), sintomas do ISDA,
   blocos de antecedentes, seções de perfil/família/hábitos, exame físico e
   os campos de identificação/QP.
   ========================================================================== */

export interface SearchEntry {
  step: StepId;
  /** id do elemento na tela para rolar até ele (sem "#"). */
  anchor?: string;
  title: string;
  context: string;
  /** Texto extra pesquisável (opções, dicas). */
  keywords: string;
  answered?: boolean;
}

const STEP_LABEL: Record<StepId, string> = {
  config: 'Configuração',
  id: 'Identificação',
  qp: 'Queixa principal',
  sistemas: 'Direcionamento',
  hda: 'HDA',
  isda: 'ISDA',
  ap: 'Antecedentes',
  perfil: 'Perfil',
  familia: 'Antecedentes familiares',
  habitos: 'Hábitos',
  exame: 'Exame físico',
  hipoteses: 'Hipóteses',
  prontuario: 'Prontuário',
};

function fromSections(step: StepId, sections: QuestionSection[], enc: Encounter, ctx: ClinicalContext): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const sec of sections) {
    if (!isSectionVisible(sec, ctx)) continue;
    for (const q of sec.questions) {
      if (!isQuestionVisible(q, ctx, true)) continue;
      const value = q.type === 'yesno' && q.symptom ? enc.symptoms[q.symptom] : enc.answers[q.id];
      out.push({
        step,
        anchor: `q-${q.id}`,
        title: q.label,
        context: [STEP_LABEL[step], sec.title].filter(Boolean).join(' › '),
        keywords: [q.hint, q.short, ...(q.options ?? []).map((o) => o.label)].filter(Boolean).join(' '),
        answered: isAnswered(value as never),
      });
    }
  }
  return out;
}

/** Termos que a gente procura mas que não aparecem nos achados (ex.: "ausculta"). */
const EXAM_HINTS: Record<string, string> = {
  geral: 'ectoscopia estado geral consciencia corado hidratado ictericia cianose facies',
  cardiovascular: 'ausculta cardiaca coracao bulhas sopro ritmo pulsos jugular perfusao',
  respiratorio: 'ausculta pulmonar pulmao murmurio crepitantes sibilos roncos percussao fremito expansibilidade',
  digestorio: 'abdome palpacao ruidos hidroaereos blumberg murphy descompressao figado bao ascite',
  neurologico: 'forca reflexos glasgow pupilas marcha coordenacao meningismo rigidez de nuca pares cranianos',
  musculoesqueletico: 'articulacoes coluna membros edema panturrilha',
  geniturinario: 'giordano punho-percussao bexiga testiculo',
  ginecologico: 'mamas especular toque vaginal altura uterina bcf',
  endocrino: 'tireoide palpacao',
  hematologico: 'linfonodos ganglios',
  dermatologico: 'pele lesoes',
  otorrino: 'orofaringe otoscopia nariz garganta ouvido',
  oftalmologico: 'olhos fundo de olho acuidade',
  psiquiatrico: 'humor afeto pensamento juizo',
};

export function buildSearchIndex(enc: Encounter, ctx: ClinicalContext, visibleSteps: StepId[]): SearchEntry[] {
  const fields: SearchEntry[] = [
    { step: 'config', title: 'Cenário (PS, ambulatório, enfermaria, UTI)', context: STEP_LABEL.config, keywords: 'pronto-socorro ambulatorio enfermaria uti' },
    { step: 'config', title: 'Modo estudante / plantão', context: STEP_LABEL.config, keywords: 'modo estudante plantao' },
    { step: 'config', title: 'Perfil (adulto, pediatria, gestante, idoso)', context: STEP_LABEL.config, keywords: 'perfil pediatria crianca gestante gravida idoso' },
    { step: 'id', title: 'Iniciais', context: STEP_LABEL.id, keywords: 'nome' },
    { step: 'id', title: 'Idade', context: STEP_LABEL.id, keywords: 'anos meses' },
    { step: 'id', title: 'Sexo', context: STEP_LABEL.id, keywords: 'masculino feminino' },
    { step: 'id', title: 'Ocupação', context: STEP_LABEL.id, keywords: 'profissao trabalho emprego' },
    { step: 'id', title: 'Procedência', context: STEP_LABEL.id, keywords: 'cidade naturalidade origem' },
    { step: 'id', title: 'Estado civil', context: STEP_LABEL.id, keywords: 'casado solteiro' },
    { step: 'id', title: 'Leito e data de internação', context: STEP_LABEL.id, keywords: 'leito internacao' },
    { step: 'qp', title: 'Queixa principal e duração', context: STEP_LABEL.qp, keywords: 'qp queixa duracao tempo template' },
    { step: 'sistemas', title: 'Sistemas prioritários (sugestão da IA)', context: STEP_LABEL.sistemas, keywords: 'direcionamento sistemas ia' },
    { step: 'ap', anchor: 'ap-doencas', title: 'Doenças prévias (comorbidades)', context: STEP_LABEL.ap, keywords: DISEASE_OPTIONS.map((o) => o.label).join(' ') },
    { step: 'ap', anchor: 'ap-alergias', title: 'Alergias', context: STEP_LABEL.ap, keywords: 'alergia reacao medicamento' },
    { step: 'ap', anchor: 'ap-medicacoes', title: 'Medicações em uso', context: STEP_LABEL.ap, keywords: 'remedios dose posologia uso continuo' },
    { step: 'ap', anchor: 'ap-cirurgias', title: 'Cirurgias e internações prévias', context: STEP_LABEL.ap, keywords: 'cirurgia operacao internacao hospitalizacao' },
    { step: 'exame', anchor: 'exame-vitais', title: 'Sinais vitais', context: STEP_LABEL.exame, keywords: 'pa pressao fc fr temperatura saturacao spo2 glicemia hgt dor' },
    { step: 'exame', anchor: 'exame-antropometria', title: 'Peso, altura e IMC', context: STEP_LABEL.exame, keywords: 'peso altura imc antropometria' },
    { step: 'hipoteses', title: 'Hipóteses diagnósticas e escores', context: STEP_LABEL.hipoteses, keywords: 'hd diagnostico diferencial escore score ia' },
    { step: 'prontuario', title: 'Texto do prontuário e conduta', context: STEP_LABEL.prontuario, keywords: 'texto copiar pdf conduta' },
  ];

  const hda = fromSections('hda', ctx.template.sections, enc, ctx);
  const isda: SearchEntry[] = SYMPTOMS.map((s) => ({
    step: 'isda' as const,
    anchor: `isda-${s.group}`,
    title: s.label,
    context: `${STEP_LABEL.isda} › ${s.group === 'geral' ? 'Geral' : (SYSTEMS.find((x) => x.id === s.group)?.label ?? s.group)}`,
    keywords: s.text ?? '',
    answered: !!enc.symptoms[s.value],
  }));
  const ap = fromSections('ap', [VACCINE_SECTION], enc, ctx);
  const perfil = fromSections('perfil', [GYNECO_SECTION, PRENATAL_SECTION, PEDIATRIC_SECTION, ELDERLY_SECTION], enc, ctx);
  const familia = fromSections('familia', [FAMILY_SECTION], enc, ctx);
  const habitos = fromSections('habitos', [HABITS_SECTION, SOCIAL_SECTION], enc, ctx);
  const exame: SearchEntry[] = EXAM_SYSTEMS.map((d) => ({
    step: 'exame' as const,
    anchor: `exam-${d.id}`,
    title: d.label,
    context: STEP_LABEL.exame,
    keywords: [d.abbr, EXAM_HINTS[d.id] ?? '', ...d.findings.map((f) => f.label), ...(d.rows ?? []).map((r) => r.label)].join(' '),
    answered: !!enc.exam.systems[d.id],
  }));

  return [...fields, ...hda, ...isda, ...ap, ...perfil, ...familia, ...habitos, ...exame].filter((e) => visibleSteps.includes(e.step));
}

/** Todas as palavras precisam aparecer; título vale mais que contexto/opções. */
export function searchEntries(index: SearchEntry[], query: string, limit = 30): SearchEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: Array<{ e: SearchEntry; score: number }> = [];
  for (const e of index) {
    const title = normalize(e.title);
    const hay = `${title} ${normalize(e.context)} ${normalize(e.keywords)}`;
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    for (const w of words) {
      if (title.startsWith(w)) score += 6;
      else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) score += 4;
      else if (title.includes(w)) score += 2;
      else score += 1;
    }
    scored.push({ e, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}
