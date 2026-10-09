import { newEncounter, newPatient } from '../src/db/factories';
import type { Encounter, Patient } from '../src/db/types';

/** Cria paciente + atendimento de teste com sobrescritas. */
export function makeCase(
  patch: (enc: Encounter, p: Patient) => void,
  opts: { age?: number; sex?: 'F' | 'M'; setting?: Encounter['config']['setting'] } = {},
): { enc: Encounter; patient: Patient } {
  const patient = newPatient();
  patient.initials = 'J.S.';
  patient.age = opts.age ?? 58;
  patient.sex = opts.sex ?? 'M';
  const enc = newEncounter(patient.id, { setting: opts.setting ?? 'ps', mode: 'plantao' });
  patch(enc, patient);
  return { enc, patient };
}
