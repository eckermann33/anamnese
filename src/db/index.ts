import Dexie, { type EntityTable } from 'dexie';
import type { Encounter, Evolution, Patient, SettingsRecord, TrainingSession } from './types';
import { APP_NAME } from '../config/app';
import { dbNameFor, readSession } from '../cloud/session';

/* ==========================================================================
   BANCO DE DADOS LOCAL (IndexedDB, via Dexie)
   --------------------------------------------------------------------------
   - Sem conta: banco "anamnese-db", só neste aparelho.
   - Com conta: um banco por conta ("anamnese-u-<uid>") — quem divide o
     aparelho não vê os pacientes do outro. Esse banco é a cópia de
     trabalho (funciona offline) e é sincronizado com a nuvem em segundo
     plano (src/cloud/sync.ts).
   Para mudar a estrutura: aumente o número da versão e descreva os índices.
   ========================================================================== */

/** Tabelas que vão para a nuvem (as preferências ficam por aparelho). */
export const SYNC_TABLES = ['patients', 'encounters', 'evolutions', 'training'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

/** Última versão (updatedAt) de cada registro que já está igual na nuvem. */
export interface SyncMeta {
  key: string; // "tabela:id"
  updatedAt: number;
  deleted?: boolean;
}

export class AppDB extends Dexie {
  patients!: EntityTable<Patient, 'id'>;
  encounters!: EntityTable<Encounter, 'id'>;
  evolutions!: EntityTable<Evolution, 'id'>;
  training!: EntityTable<TrainingSession, 'id'>;
  settings!: EntityTable<SettingsRecord, 'key'>;
  syncMeta!: EntityTable<SyncMeta, 'key'>;

  constructor(name: string) {
    super(name);
    // Só os campos usados em buscas/ordenação precisam aparecer aqui.
    this.version(1).stores({
      patients: 'id, updatedAt, status',
      encounters: 'id, patientId, updatedAt, status',
      evolutions: 'id, patientId, date, updatedAt',
      training: 'id, updatedAt, status',
      settings: 'key',
    });
    this.version(2).stores({ syncMeta: 'key' });
  }
}

/**
 * Banco aberto no momento. É `let` de propósito: ao entrar/sair de uma
 * conta, `switchDatabase` troca a instância e o app é remontado — todos os
 * módulos que importam `db` passam a enxergar o banco novo.
 */
export let db = new AppDB(dbNameFor(readSession()));

export function switchDatabase(name: string): AppDB {
  if (db.name === name) return db;
  db.close();
  db = new AppDB(name);
  return db;
}

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

/** Apaga TUDO do aparelho (bancos de todas as contas + preferências + cache do app). */
export async function wipeAllData(): Promise<void> {
  await db.delete();
  try {
    const names = await Dexie.getDatabaseNames();
    await Promise.all(names.filter((n) => n.startsWith('anamnese')).map((n) => Dexie.delete(n)));
  } catch {
    /* navegador sem listagem de bancos: o banco aberto já foi apagado */
  }
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
