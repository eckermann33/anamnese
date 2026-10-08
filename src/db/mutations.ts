import { produce, type Draft } from 'immer';
import { db } from './index';
import type { Patient } from './types';

/**
 * Altera um paciente lendo a versão mais recente DENTRO da transação.
 * Usado pelas listas do acompanhamento (problemas, dispositivos,
 * antimicrobianos, exames), que podem ser editadas tanto na tela do
 * paciente quanto na evolução — assim uma tela não sobrescreve a outra.
 */
export async function mutatePatient(id: string, fn: (draft: Draft<Patient>) => void): Promise<void> {
  await db.transaction('rw', db.patients, async () => {
    const current = await db.patients.get(id);
    if (!current) return;
    await db.patients.put(
      produce(current, (d) => {
        fn(d);
        d.updatedAt = Date.now();
      }),
    );
  });
}
