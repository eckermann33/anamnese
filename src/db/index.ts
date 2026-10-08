import Dexie, { type EntityTable } from 'dexie';
import type { Encounter, Evolution, Patient, SettingsRecord, TrainingSession } from './types';
import { APP_NAME } from '../config/app';

/* ==========================================================================
   BANCO DE DADOS LOCAL (IndexedDB, via Dexie)
   --------------------------------------------------------------------------
   Tudo fica salvo SOMENTE no aparelho. Nada vai para servidor, exceto o que
   você mandar explicitamente para a IA (anonimizado).
   Para mudar a estrutura: aumente o número da versão e descreva os índices.
   ========================================================================== */

export class AppDB extends Dexie {
  patients!: EntityTable<Patient, 'id'>;
  encounters!: EntityTable<Encounter, 'id'>;
  evolutions!: EntityTable<Evolution, 'id'>;
  training!: EntityTable<TrainingSession, 'id'>;
  settings!: EntityTable<SettingsRecord, 'key'>;

  constructor() {
    super('anamnese-db');
    // Só os campos usados em buscas/ordenação precisam aparecer aqui.
    this.version(1).stores({
      patients: 'id, updatedAt, status',
      encounters: 'id, patientId, updatedAt, status',
      evolutions: 'id, patientId, date, updatedAt',
      training: 'id, updatedAt, status',
      settings: 'key',
    });
  }
}

export const db = new AppDB();

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------- Backup ---------- */

export interface BackupFile {
  app: string;
  format: 'anamnese-backup';
  version: 1;
  exportedAt: string;
  data: {
    patients: Patient[];
    encounters: Encounter[];
    evolutions: Evolution[];
    training: TrainingSession[];
    settings: SettingsRecord[];
  };
}

export async function exportBackup(): Promise<BackupFile> {
  const [patients, encounters, evolutions, training, settings] = await Promise.all([
    db.patients.toArray(),
    db.encounters.toArray(),
    db.evolutions.toArray(),
    db.training.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: APP_NAME,
    format: 'anamnese-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { patients, encounters, evolutions, training, settings },
  };
}

/** Importa um backup. mode 'merge' mantém o que já existe (o backup sobrescreve IDs iguais). */
export async function importBackup(file: unknown, mode: 'merge' | 'replace'): Promise<{ patients: number; encounters: number }> {
  const b = file as BackupFile;
  if (!b || b.format !== 'anamnese-backup' || !b.data) throw new Error('Arquivo não é um backup válido deste app.');
  await db.transaction('rw', [db.patients, db.encounters, db.evolutions, db.training, db.settings], async () => {
    if (mode === 'replace') {
      await Promise.all([db.patients.clear(), db.encounters.clear(), db.evolutions.clear(), db.training.clear()]);
    }
    await db.patients.bulkPut(b.data.patients ?? []);
    await db.encounters.bulkPut(b.data.encounters ?? []);
    await db.evolutions.bulkPut(b.data.evolutions ?? []);
    await db.training.bulkPut(b.data.training ?? []);
    if (b.data.settings?.length) await db.settings.bulkPut(b.data.settings);
  });
  return { patients: b.data.patients?.length ?? 0, encounters: b.data.encounters?.length ?? 0 };
}

/** Apaga TUDO do aparelho (banco + preferências + cache do app). */
export async function wipeAllData(): Promise<void> {
  await db.delete();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* sem acesso ao storage */
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

/** Apaga um paciente e tudo ligado a ele. */
export async function deletePatient(patientId: string): Promise<void> {
  await db.transaction('rw', [db.patients, db.encounters, db.evolutions], async () => {
    await db.encounters.where('patientId').equals(patientId).delete();
    await db.evolutions.where('patientId').equals(patientId).delete();
    await db.patients.delete(patientId);
  });
}
