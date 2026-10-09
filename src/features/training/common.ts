import type { TrainingSession } from '../../db/types';

/* Utilidades do Treino (sem dependências pesadas). */

const VOICE_KEY = 'anamnese:osce-voz';

export function readVoicePref(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeVoicePref(on: boolean) {
  try {
    localStorage.setItem(VOICE_KEY, on ? '1' : '0');
  } catch {
    /* storage indisponível */
  }
}

export const DOMAINS = [
  { key: 'hda', label: 'HDA' },
  { key: 'isda', label: 'ISDA' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'exameFisico', label: 'Exame físico' },
  { key: 'raciocinio', label: 'Raciocínio' },
] as const;

/** Média das notas dos 5 domínios (0–10). */
export function averageScore(s: Pick<TrainingSession, 'feedback'>): number | undefined {
  const d = s.feedback?.domainScores;
  if (!d) return undefined;
  const vals = DOMAINS.map((x) => Math.max(0, Math.min(10, d[x.key])));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Manobras rápidas sugeridas no modo "Examinar". */
export const QUICK_MANEUVERS = [
  'Sinais vitais',
  'Ectoscopia',
  'Ausculta cardíaca',
  'Ausculta pulmonar',
  'Palpação abdominal',
  'Descompressão brusca',
  'Murphy',
  'Giordano',
  'Pulsos periféricos',
  'Membros inferiores',
  'Exame neurológico',
  'Rigidez de nuca',
  'Orofaringe',
  'Linfonodos',
];
