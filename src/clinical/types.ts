/* ==========================================================================
   TIPOS DO DOMÍNIO CLÍNICO
   --------------------------------------------------------------------------
   Aqui ficam as "formas" dos dados. Se você for criar um template novo de
   queixa, os tipos Question / QuestionSection / ComplaintTemplate são os
   que importam.
   ========================================================================== */

export type Setting = 'ps' | 'ambulatorio' | 'enfermaria' | 'uti';
export type Mode = 'estudante' | 'plantao';
export type Profile = 'adulto' | 'pediatria' | 'gestante' | 'idoso';
export type Sex = 'F' | 'M' | 'O';
export type AgeUnit = 'anos' | 'meses' | 'dias';
export type DurationUnit = 'minutos' | 'horas' | 'dias' | 'semanas' | 'meses' | 'anos';

export type SystemId =
  | 'cardiovascular'
  | 'respiratorio'
  | 'digestorio'
  | 'geniturinario'
  | 'neurologico'
  | 'musculoesqueletico'
  | 'endocrino'
  | 'hematologico'
  | 'dermatologico'
  | 'psiquiatrico'
  | 'ginecologico'
  | 'otorrino'
  | 'oftalmologico';

/** Grupos do ISDA = os 13 sistemas + sintomas gerais. */
export type IsdaGroupId = SystemId | 'geral';

export type Tri = 'sim' | 'nao';
export type TriMap = Record<string, Tri>;

export interface DurationValue {
  value?: number;
  unit: DurationUnit;
}

export interface BodyMapValue {
  location: string[];
  radiation: string[];
  /** Marcado explicitamente "sem irradiação". */
  noRadiation?: boolean;
}

export type AnswerValue = string | string[] | number | boolean | TriMap | DurationValue | BodyMapValue;

export interface Option {
  value: string;
  label: string;
  /** Opção de gravidade: o chip fica vermelho/laranja quando marcado. */
  flag?: 'red' | 'orange';
  /** Texto usado no prontuário, se diferente do rótulo do chip. */
  text?: string;
}

/** Conteúdo do botão "Por que perguntar?" (Modo Estudante). */
export interface Why {
  /** O raciocínio clínico por trás da pergunta. */
  reason: string;
  /** O que a resposta muda no diagnóstico / conduta. */
  impact: string;
  /** IDs de referências (src/clinical/references.ts). */
  refs?: string[];
}

export type QuestionType =
  | 'single' // escolha única (chips)
  | 'multi' // múltipla escolha (chips)
  | 'symptoms' // sintomas com 3 estados (presente / nega / não perguntado) — ligados ao mapa global de sintomas
  | 'tri' // itens com 3 estados guardados só nesta pergunta (ex.: sinais de alarme)
  | 'yesno' // sim / não
  | 'scale' // 0–10
  | 'number'
  | 'text'
  | 'duration' // número + unidade de tempo
  | 'bodymap' // mapa corporal (localização + irradiação)
  | 'date';

/** O que as funções showIf/narrative recebem para decidir. */
export interface QuestionContext {
  /** Resposta crua de uma pergunta. */
  a: (id: string) => AnswerValue | undefined;
  /** A pergunta `id` tem algum dos valores? (single = igual; multi = contém; yesno = 'sim') */
  has: (id: string, ...values: string[]) => boolean;
  /** Estado de um sintoma (mapa global, alimentado pela HDA e pelo ISDA). */
  sym: (symptomId: string) => Tri | undefined;
  /** Alguma região marcada no mapa corporal (localização ou irradiação) começa com o prefixo? */
  body: (prefix: string, kind?: 'location' | 'radiation') => boolean;
  /** Resposta numérica (ou undefined). */
  num: (id: string) => number | undefined;
  /** Duração da queixa principal convertida em dias. */
  complaintDays?: number;
  ageYears?: number;
  sex?: Sex;
  profile: Profile;
  setting: Setting;
}

export interface Question {
  id: string;
  label: string;
  hint?: string;
  type: QuestionType;
  options?: Option[];
  unit?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  why?: Why;
  showIf?: (ctx: QuestionContext) => boolean;
  /** Pergunta complementar: no PS/UTI fica escondida em "mais perguntas". */
  extra?: boolean;
  /** Rótulo curto para o prontuário ("Fatores de piora"). */
  short?: string;
  /**
   * Frase para o prontuário a partir da resposta. Retorne null para omitir.
   * Sem esta função, o texto é montado automaticamente a partir de `short`.
   */
  narrative?: (value: AnswerValue, ctx: QuestionContext, q: Question) => string | null | undefined;
  /** Para 'yesno': quando "sim", vale como este sintoma no mapa global. */
  symptom?: string;
  /** Para 'yesno': rótulo do achado positivo/negativo no prontuário. */
  yesText?: string;
  noText?: string;
  /** Para 'bodymap': qual desenho mostrar. */
  bodyView?: 'full' | 'head';
  /** Resultado calculado exibido abaixo da pergunta (ex.: anos-maço, IG). */
  computed?: (ctx: QuestionContext) => Computed | null;
}

export interface Computed {
  text: string;
  tone?: 'accent' | 'green' | 'orange' | 'red';
}

export interface QuestionSection {
  id: string;
  title?: string;
  /** Seção que só aparece quando showIf é verdadeiro (ramificação). */
  showIf?: (ctx: QuestionContext) => boolean;
  /** Se for um ramo, explica por que abriu ("aberto porque: aperto aos esforços"). */
  branch?: {
    reason: (ctx: QuestionContext) => string;
    tone?: 'accent' | 'red' | 'orange';
  };
  /**
   * Como vira texto no prontuário:
   *  'list'      → fragmentos unidos numa frase ("Dor de início súbito, em aperto, …")
   *  'sentences' → cada resposta vira uma frase (padrão)
   */
  prose?: 'list' | 'sentences';
  /** Nota didática exibida no topo do ramo (Modo Estudante). */
  note?: string;
  questions: Question[];
}

export interface ComplaintTemplate {
  id: string;
  name: string;
  description: string;
  /** Palavras que, na queixa principal, sugerem este template. */
  keywords: string[];
  /** Sistemas relacionados (ordem de prioridade). */
  systems: SystemId[];
  /** É uma queixa de dor? (ativa mapa corporal, caráter, intensidade…) */
  isPain: boolean;
  /** Sujeito da frase de semiologia no prontuário ("Dor", "Cefaleia", "Dispneia"). */
  subject: string;
  sections: QuestionSection[];
}

export interface SystemInfo {
  id: SystemId;
  label: string;
  short: string;
  /** Abreviação usada no prontuário (ACV, AR, ABD…). */
  examAbbr: string;
  keywords: string[];
}
