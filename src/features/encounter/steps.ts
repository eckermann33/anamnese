import {
  Activity,
  Brain,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  ListChecks,
  MessageSquareQuote,
  Navigation,
  Settings2,
  Stethoscope,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Encounter, Patient, StepId } from '../../db/types';
import { ageInYears } from '../../clinical/context';

export interface StepDef {
  id: StepId;
  title: string;
  short: string;
  icon: LucideIcon;
  /** Etapa só aparece se fizer sentido para o perfil. */
  visible?: (enc: Encounter, p: Patient) => boolean;
}

/** Fluxo do atendimento, na ordem. Navegação livre entre etapas. */
export const STEPS: StepDef[] = [
  { id: 'config', title: 'Configuração', short: 'Config.', icon: Settings2 },
  { id: 'id', title: 'Identificação', short: 'ID', icon: UserRound },
  { id: 'qp', title: 'Queixa principal', short: 'QP', icon: MessageSquareQuote },
  { id: 'sistemas', title: 'Direcionamento', short: 'Sistemas', icon: Navigation },
  { id: 'hda', title: 'História da doença atual', short: 'HDA', icon: Activity },
  { id: 'isda', title: 'Interrogatório dos sistemas', short: 'ISDA', icon: ListChecks },
  { id: 'ap', title: 'Antecedentes pessoais', short: 'AP', icon: ClipboardList },
  {
    id: 'perfil',
    title: 'Perfil específico',
    short: 'Perfil',
    icon: HeartPulse,
    visible: (enc, p) => {
      const age = ageInYears(p.age, p.ageUnit) ?? 20;
      return enc.config.profile !== 'adulto' || (p.sex === 'F' && age >= 10);
    },
  },
  { id: 'familia', title: 'Antecedentes familiares', short: 'AF', icon: Users },
  { id: 'habitos', title: 'Hábitos e condições de vida', short: 'HV/CSE', icon: Home },
  { id: 'exame', title: 'Exame físico', short: 'EF', icon: Stethoscope },
  { id: 'hipoteses', title: 'Hipóteses diagnósticas', short: 'HD', icon: Brain },
  { id: 'prontuario', title: 'Texto do prontuário', short: 'Prontuário', icon: FileText },
];

export function visibleSteps(enc: Encounter, p: Patient): StepDef[] {
  return STEPS.filter((s) => !s.visible || s.visible(enc, p));
}

export function perfilTitle(enc: Encounter, p: Patient): string {
  switch (enc.config.profile) {
    case 'gestante':
      return 'Gineco-obstétrico e pré-natal';
    case 'pediatria':
      return 'Antecedentes pediátricos';
    case 'idoso':
      return p.sex === 'F' ? 'Idoso e gineco-obstétrico' : 'Avaliação do idoso';
    default:
      return 'Antecedentes gineco-obstétricos';
  }
}
