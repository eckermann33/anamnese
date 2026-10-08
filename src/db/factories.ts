import type { Encounter, Evolution, Patient } from './types';
import type { Mode, Profile, Setting } from '../clinical/types';
import { uid } from './index';
import { toISODate } from '../lib/format';

/* Criação de registros vazios com valores padrão. */

export function newPatient(): Patient {
  const now = Date.now();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    initials: '',
    ageUnit: 'anos',
    status: 'ativo',
    admissionDate: toISODate(),
    problems: [],
    devices: [],
    antibiotics: [],
    labs: [],
  };
}

export function newEncounter(patientId: string, defaults: { setting: Setting; mode: Mode; profile?: Profile }): Encounter {
  const now = Date.now();
  return {
    id: uid(),
    patientId,
    createdAt: now,
    updatedAt: now,
    status: 'em_andamento',
    step: 'config',
    config: { setting: defaults.setting, mode: defaults.mode, profile: defaults.profile ?? 'adulto' },
    complaint: { text: '', durationUnit: 'dias' },
    systems: [],
    answers: {},
    notes: {},
    symptoms: {},
    isdaNotes: {},
    timeline: [],
    history: {
      diseases: [],
      diseasesOther: '',
      surgeries: [],
      hospitalizations: [],
      allergies: [],
      noKnownAllergies: false,
      medications: [],
      noMedications: false,
    },
    exam: { vitals: {}, systems: {} },
    manualHypotheses: [],
    conduct: '',
    dismissedAlerts: [],
    scoreInputs: {},
  };
}

export function newEvolution(patientId: string, date = toISODate()): Evolution {
  const now = Date.now();
  return {
    id: uid(),
    patientId,
    date,
    createdAt: now,
    updatedAt: now,
    subjective: '',
    subjectiveChips: [],
    vitals: {},
    examText: '',
    objectiveNotes: '',
    assessment: '',
    plan: '',
    todos: [],
    carriedOver: [],
  };
}
