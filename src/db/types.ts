import type {
  AgeUnit,
  AnswerValue,
  DurationUnit,
  IsdaGroupId,
  Mode,
  Profile,
  Setting,
  Sex,
  SystemId,
  TriMap,
} from '../clinical/types';
import type { HypothesesResult, OsceCaseData, OsceFeedbackResult } from '../../shared/ai/schemas';

/* ==========================================================================
   MODELO DE DADOS (o que fica salvo no IndexedDB do aparelho)
   --------------------------------------------------------------------------
   LGPD: nada de nome completo, CPF ou endereço. Só iniciais.
   ========================================================================== */

export type StepId =
  | 'config'
  | 'id'
  | 'qp'
  | 'sistemas'
  | 'hda'
  | 'isda'
  | 'ap'
  | 'perfil'
  | 'familia'
  | 'habitos'
  | 'exame'
  | 'hipoteses'
  | 'prontuario';

export interface Patient {
  id: string;
  createdAt: number;
  updatedAt: number;
  initials: string;
  age?: number;
  ageUnit: AgeUnit;
  sex?: Sex;
  occupation?: string;
  origin?: string;
  maritalStatus?: string;
  bed?: string;
  status: 'ativo' | 'alta' | 'arquivado';
  /** Data de internação (enfermaria/UTI) — base para D1, D2… */
  admissionDate?: string;
  // ---- Acompanhamento (Fase 2) ----
  problems: Problem[];
  devices: Device[];
  antibiotics: Antibiotic[];
  labs: LabPanel[];
}

export interface Allergy {
  id: string;
  substance: string;
  reaction?: string;
  severity?: 'leve' | 'moderada' | 'grave';
}

export interface Medication {
  id: string;
  name: string;
  dose?: string;
  posology?: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  year?: string;
}

export interface History {
  diseases: string[];
  diseasesOther: string;
  surgeries: HistoryItem[];
  hospitalizations: HistoryItem[];
  allergies: Allergy[];
  noKnownAllergies: boolean;
  medications: Medication[];
  noMedications: boolean;
}

export interface Vitals {
  pas?: number;
  pad?: number;
  fc?: number;
  fr?: number;
  temp?: number;
  spo2?: number;
  /** Em oxigênio suplementar? */
  o2?: boolean;
  o2Flow?: number;
  glicemia?: number;
  dor?: number;
}

export type ExamSectionId = 'geral' | SystemId;

export interface ExamSystemState {
  /** Examinado e normal (botão "Normal"). */
  normal?: boolean;
  findings: string[];
  notes?: string;
  /** Valores de linhas estruturadas (ectoscopia, estado mental). */
  rows?: Record<string, string>;
}

export interface Glasgow {
  o?: number;
  v?: number;
  m?: number;
  /** Resposta pupilar (GCS-P): 0 ambas reagem, 1 uma não reage, 2 nenhuma reage. */
  p?: number;
}

export interface Exam {
  vitals: Vitals;
  weight?: number;
  height?: number;
  systems: Partial<Record<ExamSectionId, ExamSystemState>>;
  glasgow?: Glasgow;
}

export interface TimelineEvent {
  id: string;
  /** Quanto tempo antes do atendimento. */
  ago?: number;
  agoUnit: DurationUnit;
  label: string;
}

export interface HypothesesState {
  result: HypothesesResult;
  at: number;
  /** Hash dos dados usados — mostra "dados mudaram desde a análise". */
  inputHash: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  createdAt: number;
  updatedAt: number;
  status: 'em_andamento' | 'concluido';
  step: StepId;
  config: { setting: Setting; mode: Mode; profile: Profile };
  complaint: { text: string; duration?: number; durationUnit: DurationUnit };
  templateId?: string;
  systems: SystemId[];
  systemSuggestions?: {
    source: 'ia' | 'local';
    at: number;
    items: Array<{ system: SystemId; justification: string }>;
  };
  /** Respostas das perguntas (HDA, ramos, perfis, hábitos…), por ID. */
  answers: Record<string, AnswerValue>;
  /** Texto livre complementar de cada pergunta. */
  notes: Record<string, string>;
  /** Mapa global de sintomas (HDA + ISDA). */
  symptoms: TriMap;
  isdaNotes: Partial<Record<IsdaGroupId, string>>;
  timeline: TimelineEvent[];
  history: History;
  exam: Exam;
  hypotheses?: HypothesesState;
  /** Hipóteses digitadas pelo usuário (HD do prontuário). */
  manualHypotheses: string[];
  conduct: string;
  note?: { text: string; generatedAt: number; edited: boolean };
  /** Alertas que o usuário já viu e recolheu. */
  dismissedAlerts: string[];
  /** Itens de escores marcados manualmente (quando faltam dados). */
  scoreInputs: Record<string, Record<string, number>>;
}

// ---------------- Fase 2: evolução ----------------

export interface Problem {
  id: string;
  title: string;
  status: 'ativo' | 'resolvido';
  since?: string;
  notes?: string;
}

export interface Device {
  id: string;
  type: string;
  site?: string;
  insertedAt: string; // AAAA-MM-DD
  removedAt?: string;
}

export interface Antibiotic {
  id: string;
  name: string;
  startedAt: string; // AAAA-MM-DD
  plannedDays?: number;
  stoppedAt?: string;
  indication?: string;
}

export interface LabValue {
  analyte: string;
  value: number | null;
  raw: string;
  unit?: string;
  ref?: string;
  flag?: 'alto' | 'baixo' | 'critico' | null;
}

export interface LabPanel {
  id: string;
  date: string; // AAAA-MM-DD
  values: LabValue[];
  source: 'ia' | 'local' | 'manual';
  rawText?: string;
}

export interface FluidBalance {
  intake: { oral?: number; venosa?: number; outros?: number };
  output: { diurese?: number; drenos?: number; vomitos?: number; evacuacoes?: number; outros?: number };
  hours: number;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface Evolution {
  id: string;
  patientId: string;
  date: string; // AAAA-MM-DD
  createdAt: number;
  updatedAt: number;
  subjective: string;
  subjectiveChips: string[];
  vitals: Vitals;
  examText: string;
  objectiveNotes: string;
  fluid?: FluidBalance;
  /** Peso do dia (kg) — base do débito urinário em mL/kg/h. */
  weight?: number;
  assessment: string;
  plan: string;
  todos: Todo[];
  /** Checklist diário do leito (FAST HUGS BID): item → revisado. */
  checklist?: Record<string, boolean>;
  /** Campos copiados de ontem que ainda não foram revisados. */
  carriedOver: CarriedField[];
  text?: string;
}

export type CarriedField = 'subjective' | 'examText' | 'objectiveNotes' | 'assessment' | 'plan' | 'todos';

// ---------------- Fase 3: treino ----------------

export interface TrainingSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  caseMeta: { system?: string; difficulty: 'facil' | 'medio' | 'dificil'; title: string };
  /** De onde veio o caso: biblioteca curada (offline) ou gerado pela IA. */
  source: 'biblioteca' | 'ia';
  /** Caso completo (oculto do estudante até o fim). */
  caseData: OsceCaseData;
  messages: Array<{ role: 'student' | 'patient' | 'exam'; text: string; at: number }>;
  /** Tempo da estação em minutos (0 = sem cronômetro). */
  timeLimitMin: number;
  startedAt: number;
  endedAt?: number;
  studentDiagnosis?: string;
  feedback?: OsceFeedbackResult;
  status: 'em_andamento' | 'finalizado';
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}
