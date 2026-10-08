import { z } from 'zod';

/* ==========================================================================
   CONTRATO DA IA (compartilhado entre o app e a função serverless)
   --------------------------------------------------------------------------
   - Pedido: { task, mode, input }
   - Resposta: { ok: true, task, data } | { ok: false, error }
   Cada tarefa tem um schema de entrada (validado no servidor) e um schema de
   saída: ele vira o "formato da resposta" mandado ao modelo (modo JSON) e é
   usado para validar a resposta no servidor e de novo no app antes de mostrar.
   ========================================================================== */

export const ModeSchema = z.enum(['estudante', 'plantao']);
export type AiMode = z.infer<typeof ModeSchema>;

export const SYSTEM_IDS = [
  'cardiovascular',
  'respiratorio',
  'digestorio',
  'geniturinario',
  'neurologico',
  'musculoesqueletico',
  'endocrino',
  'hematologico',
  'dermatologico',
  'psiquiatrico',
  'ginecologico',
  'otorrino',
  'oftalmologico',
] as const;

export const TEMPLATE_IDS = ['dor_toracica', 'dispneia', 'dor_abdominal', 'cefaleia', 'febre', 'sincope', 'lombalgia', 'tosse', 'diarreia', 'palpitacoes', 'tontura', 'edema', 'disuria', 'deficit_neurologico', 'outra'] as const;

export const SCORE_IDS = [
  'glasgow',
  'qsofa',
  'curb65',
  'heart',
  'wells_tep',
  'perc',
  'wells_tvp',
  'cha2ds2vasc',
  'hasbled',
  'alvarado',
  'centor',
  'ottawa_hsa',
  'addrs',
  'sfsr',
  'gbs',
] as const;

const Confidence = z.enum(['alta', 'moderada', 'baixa']).describe('Nível de confiança');

/* ---------------- 1. Sugerir sistemas ---------------- */

export const SuggestSystemsInput = z.object({
  complaint: z.string().min(1).max(2000),
  duration: z.string().max(100).optional(),
  profile: z.string().max(40).optional(),
  sex: z.string().max(20).optional(),
  age: z.string().max(40).optional(),
});

export const SuggestSystemsOutput = z.object({
  systems: z
    .array(
      z.object({
        system: z.enum(SYSTEM_IDS),
        justification: z.string().describe('Uma linha explicando por que este sistema é prioritário para esta queixa.'),
      }),
    )
    .describe('Sistemas em ordem de prioridade (o mais relevante primeiro). Entre 2 e 5.'),
  template: z.enum(TEMPLATE_IDS).describe('Template de anamnese mais adequado à queixa ("outra" se nenhum se aplica).'),
  confidence: Confidence,
});
export type SuggestSystemsResult = z.infer<typeof SuggestSystemsOutput>;

/* ---------------- 2. Hipóteses diagnósticas ---------------- */

export const HypothesesInput = z.object({
  caseText: z.string().min(1).max(60000).describe('Resumo estruturado do caso, gerado pelo app.'),
  setting: z.string().max(40),
  profile: z.string().max(40),
});

const Hypothesis = z.object({
  name: z.string().describe('Nome do diagnóstico (síndrome ou doença), em português.'),
  kind: z.enum(['principal', 'diferencial']),
  likelihood: Confidence.describe('Probabilidade relativa com os dados disponíveis.'),
  supporting: z.array(z.string()).describe('Achados COLETADOS que pesam a favor (apenas dados informados).'),
  against: z.array(z.string()).describe('Achados COLETADOS que pesam contra, ou achados esperados que estão ausentes.'),
  missingQuestions: z.array(z.string()).describe('Perguntas da anamnese que faltam para aproximar ou afastar.'),
  missingManeuvers: z.array(z.string()).describe('Manobras/achados de exame físico que faltam.'),
  tests: z
    .array(z.object({ test: z.string(), rationale: z.string() }))
    .describe('Exames complementares sugeridos, com o que cada um responde.'),
  scores: z
    .array(z.object({ id: z.enum(SCORE_IDS), reason: z.string() }))
    .describe('Escores aplicáveis (somente IDs da lista). O app calcula com os dados.'),
  referenceIds: z.array(z.string()).describe('IDs da lista de referências fornecida que embasam esta hipótese.'),
  teaching: z.string().describe('Modo Estudante: explicação didática curta do raciocínio. Modo Plantão: string vazia.'),
});

export const HypothesesOutput = z.object({
  summary: z.string().describe('Síntese do caso em 1–3 frases (síndrome principal).'),
  confidence: Confidence,
  dataToImprove: z.array(z.string()).describe('Dados que aumentariam a precisão diagnóstica.'),
  hypotheses: z.array(Hypothesis).describe('Exatamente 3: 1 principal + 2 diferenciais, em ordem de probabilidade.'),
  cannotMiss: z
    .array(
      z.object({
        diagnosis: z.string(),
        why: z.string().describe('Por que precisa ser considerado mesmo sendo menos provável.'),
        howToRuleOut: z.string().describe('Como afastar de forma objetiva.'),
      }),
    )
    .describe('Diagnósticos graves que não podem passar.'),
  completenessChecklist: z.array(z.string()).describe('O que de importante não foi perguntado ou examinado.'),
  initialManagement: z
    .array(z.string())
    .describe('Conduta inicial sugerida. Doses só com o aviso de conferência.'),
  otherReferences: z
    .array(z.string())
    .describe('Outras diretrizes citadas em formato ABNT, apenas se tiver certeza dos dados (sem inventar DOI/páginas).'),
});
export type HypothesesResult = z.infer<typeof HypothesesOutput>;

/* ---------------- 3. Revisar texto do prontuário ---------------- */

export const PolishNoteInput = z.object({ text: z.string().min(1).max(30000) });
export const PolishNoteOutput = z.object({
  text: z.string().describe('Texto revisado, mesma estrutura de seções, sem acrescentar informação nova.'),
  changes: z.array(z.string()).describe('Lista curta das mudanças feitas.'),
});
export type PolishNoteResult = z.infer<typeof PolishNoteOutput>;

/* ---------------- 4. Organizar exames laboratoriais (Fase 2) ---------------- */

export const ParseLabsInput = z.object({ text: z.string().min(1).max(20000), date: z.string().max(20).optional() });
export const ParseLabsOutput = z.object({
  date: z.string().nullable().describe('Data da coleta se presente no texto (AAAA-MM-DD), senão null.'),
  values: z.array(
    z.object({
      analyte: z.string().describe('Nome padronizado em português (ex.: Hemoglobina, Leucócitos, Creatinina, Sódio).'),
      value: z.number().nullable().describe('Valor numérico (ponto decimal). null se não numérico.'),
      raw: z.string().describe('Como apareceu no texto.'),
      unit: z.string().nullable(),
      ref: z.string().nullable().describe('Valor de referência, se presente no texto.'),
      flag: z.enum(['alto', 'baixo', 'critico']).nullable().describe('Somente se o texto ou a referência permitirem afirmar.'),
    }),
  ),
});
export type ParseLabsResult = z.infer<typeof ParseLabsOutput>;

/* ---------------- 5. Passagem de plantão SBAR (Fase 2) ---------------- */

export const SbarInput = z.object({ caseText: z.string().min(1).max(40000) });
export const SbarOutput = z.object({
  situation: z.string(),
  background: z.string(),
  assessment: z.string(),
  recommendation: z.string(),
});
export type SbarResult = z.infer<typeof SbarOutput>;

/* ---------------- 6. Treino OSCE (Fase 3) ---------------- */

export const OsceCaseInput = z.object({
  system: z.string().max(40).optional(),
  difficulty: z.enum(['facil', 'medio', 'dificil']),
  seed: z.string().max(40).optional(),
});

export const OsceCase = z.object({
  title: z.string().describe('Título neutro, sem revelar o diagnóstico (ex.: "Homem de 58 anos com dor no peito").'),
  setting: z.string(),
  patient: z.object({
    initials: z.string(),
    age: z.number(),
    sex: z.enum(['F', 'M']),
    occupation: z.string(),
    personality: z.string().describe('Como o paciente fala e se comporta.'),
  }),
  chiefComplaint: z.string().describe('Queixa nas palavras do paciente.'),
  openingLine: z.string().describe('Primeira fala do paciente.'),
  history: z.object({
    hpi: z.array(z.string()).describe('Fatos da HDA que o paciente revela SE perguntado.'),
    ros: z.array(z.string()),
    pastHistory: z.array(z.string()),
    medications: z.array(z.string()),
    allergies: z.array(z.string()),
    family: z.array(z.string()),
    social: z.array(z.string()),
  }),
  vitals: z.object({ pa: z.string(), fc: z.string(), fr: z.string(), temp: z.string(), spo2: z.string() }),
  exam: z.array(z.object({ maneuver: z.string(), finding: z.string() })).describe('Achados por manobra/sistema.'),
  diagnosis: z.string(),
  differentials: z.array(z.string()),
  keyQuestions: z.array(z.string()).describe('Perguntas essenciais que o estudante deveria fazer.'),
  redFlags: z.array(z.string()).describe('Red flags que deveriam ser investigadas.'),
  keyManeuvers: z.array(z.string()),
});
export type OsceCaseData = z.infer<typeof OsceCase>;

export const OsceTurnInput = z.object({
  caseData: OsceCase,
  transcript: z
    .array(z.object({ role: z.enum(['student', 'patient', 'exam']), text: z.string().max(4000) }))
    .max(200),
  message: z.string().min(1).max(2000),
  kind: z.enum(['pergunta', 'manobra']),
});
export const OsceTurnOutput = z.object({
  reply: z.string().describe('Fala do paciente (pergunta) ou achado do examinador (manobra).'),
  outOfScope: z.boolean().describe('true se o pedido não faz sentido na consulta.'),
});
export type OsceTurnResult = z.infer<typeof OsceTurnOutput>;

export const OsceFeedbackInput = z.object({
  caseData: OsceCase,
  transcript: z.array(z.object({ role: z.enum(['student', 'patient', 'exam']), text: z.string().max(4000) })).max(300),
  studentDiagnosis: z.string().max(2000),
});
export const OsceFeedbackOutput = z.object({
  strengths: z.array(z.string()),
  missedQuestions: z.array(z.string()),
  missedRedFlags: z.array(z.string()),
  domainScores: z.object({
    hda: z.number().describe('0 a 10'),
    isda: z.number().describe('0 a 10'),
    antecedentes: z.number().describe('0 a 10'),
    exameFisico: z.number().describe('0 a 10'),
    raciocinio: z.number().describe('0 a 10'),
  }),
  correctDiagnosis: z.string(),
  diagnosisComment: z.string().describe('Comentário sobre a HD do estudante e o raciocínio esperado.'),
  tips: z.array(z.string()),
});
export type OsceFeedbackResult = z.infer<typeof OsceFeedbackOutput>;

/* ---------------- 7. Ditado por voz (Fase 3) ---------------- */

export const DictationField = z.object({
  id: z.string().max(80),
  label: z.string().max(200),
  type: z.string().max(20),
  options: z.array(z.object({ value: z.string().max(80), label: z.string().max(200) })).max(200).optional(),
});

export const DictationInput = z.object({
  transcript: z.string().min(1).max(10000),
  fields: z.array(DictationField).max(400),
});
export const DictationOutput = z.object({
  assignments: z.array(
    z.object({
      fieldId: z.string(),
      value: z.string().describe('Valor como texto. Para escolha: o "value" da opção. Para múltipla: valores separados por "|". Para sintomas: "sim" ou "nao". Números com ponto decimal.'),
      excerpt: z.string().describe('Trecho do ditado que justifica.'),
    }),
  ),
  unassigned: z.string().describe('O que foi dito e não coube em nenhum campo.'),
});
export type DictationResult = z.infer<typeof DictationOutput>;

/* ---------------- Pedido / resposta ---------------- */

export const AiRequestSchema = z.discriminatedUnion('task', [
  z.object({ task: z.literal('suggest_systems'), mode: ModeSchema, input: SuggestSystemsInput }),
  z.object({ task: z.literal('hypotheses'), mode: ModeSchema, input: HypothesesInput }),
  z.object({ task: z.literal('polish_note'), mode: ModeSchema, input: PolishNoteInput }),
  z.object({ task: z.literal('parse_labs'), mode: ModeSchema, input: ParseLabsInput }),
  z.object({ task: z.literal('sbar'), mode: ModeSchema, input: SbarInput }),
  z.object({ task: z.literal('osce_case'), mode: ModeSchema, input: OsceCaseInput }),
  z.object({ task: z.literal('osce_turn'), mode: ModeSchema, input: OsceTurnInput }),
  z.object({ task: z.literal('osce_feedback'), mode: ModeSchema, input: OsceFeedbackInput }),
  z.object({ task: z.literal('dictation'), mode: ModeSchema, input: DictationInput }),
]);
export type AiRequest = z.infer<typeof AiRequestSchema>;
export type AiTask = AiRequest['task'];

export const OUTPUT_SCHEMAS = {
  suggest_systems: SuggestSystemsOutput,
  hypotheses: HypothesesOutput,
  polish_note: PolishNoteOutput,
  parse_labs: ParseLabsOutput,
  sbar: SbarOutput,
  osce_case: OsceCase,
  osce_turn: OsceTurnOutput,
  osce_feedback: OsceFeedbackOutput,
  dictation: DictationOutput,
} as const;

export interface AiOutputs {
  suggest_systems: SuggestSystemsResult;
  hypotheses: HypothesesResult;
  polish_note: PolishNoteResult;
  parse_labs: ParseLabsResult;
  sbar: SbarResult;
  osce_case: OsceCaseData;
  osce_turn: OsceTurnResult;
  osce_feedback: OsceFeedbackResult;
  dictation: DictationResult;
}

export type AiResponse<T extends AiTask = AiTask> =
  | { ok: true; task: T; data: AiOutputs[T]; model?: string }
  | { ok: false; error: string; code?: string };
