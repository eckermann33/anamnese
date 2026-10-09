import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { AppDB } from '../src/db';
import { newPatient } from '../src/db/factories';
import { createFakeDriver } from '../src/cloud/fakeDriver';
import { copyRecords, SyncEngine, type SyncStatus } from '../src/cloud/sync';

/* Dois "aparelhos" (bancos diferentes) na mesma conta, com a nuvem falsa. */

let n = 0;
async function setup() {
  const cloud = createFakeDriver();
  const user = await cloud.signUp(`teste${++n}@ex.com`, 'segredo1', 'Teste');
  const device = (name: string) => {
    const db = new AppDB(`${name}-${n}`);
    const statuses: SyncStatus[] = [];
    const engine = new SyncEngine(db, cloud, user.uid, (s) => statuses.push(s));
    return { db, engine, statuses };
  };
  return { cloud, user, a: device('celular'), b: device('mac') };
}

const later = (ms = 5) => new Promise((r) => setTimeout(r, ms));

describe('sincronização entre aparelhos', () => {
  it('o que é criado em um aparelho aparece no outro', async () => {
    const { a, b } = await setup();
    const p = { ...newPatient(), initials: 'J.S.', age: 58 };
    await a.db.patients.put(p);
    await a.engine.start({ watch: false });
    expect(a.engine.status.state).toBe('sincronizado');

    await b.engine.start({ watch: false });
    expect((await b.db.patients.get(p.id))?.initials).toBe('J.S.');
    // nada a reenviar depois de baixar
    expect(await b.engine.pendingCount()).toBe(0);
  });

  it('alterações chegam em tempo real e a versão mais nova vence', async () => {
    const { a, b } = await setup();
    const p = { ...newPatient(), initials: 'M.A.' };
    await a.db.patients.put(p);
    await a.engine.start({ watch: false });
    await b.engine.start({ watch: false });

    await b.db.patients.put({ ...p, bed: '12', updatedAt: p.updatedAt + 1000 });
    await b.engine.push();
    await later();
    expect((await a.db.patients.get(p.id))?.bed).toBe('12');

    // versão mais velha vinda de outro aparelho não sobrescreve
    await a.engine.applyRemote([{ table: 'patients', id: p.id, updatedAt: p.updatedAt, data: JSON.stringify(p) }]);
    expect((await a.db.patients.get(p.id))?.bed).toBe('12');
  });

  it('apagar em um aparelho apaga no outro (lápide)', async () => {
    const { a, b } = await setup();
    const p = newPatient();
    await a.db.patients.put(p);
    await a.engine.start({ watch: false });
    await b.engine.start({ watch: false });
    expect(await b.db.patients.get(p.id)).toBeDefined();

    await a.db.patients.delete(p.id);
    await a.engine.push();
    await later();
    expect(await b.db.patients.get(p.id)).toBeUndefined();
    expect(await a.engine.pendingCount()).toBe(0);
  });

  it('sem conexão fica pendente e envia quando volta', async () => {
    const { a, b, cloud } = await setup();
    await a.engine.start({ watch: false });
    cloud.online = false;
    const p = newPatient();
    await a.db.patients.put(p);
    await a.engine.push();
    expect(a.engine.status.state).toBe('erro');
    expect(a.engine.status.pending).toBe(1);

    cloud.online = true;
    await a.engine.push();
    expect(a.engine.status.state).toBe('sincronizado');
    await b.engine.start({ watch: false });
    expect(await b.db.patients.get(p.id)).toBeDefined();
  });

  it('copia os pacientes do modo sem conta para a conta', async () => {
    const local = new AppDB(`local-${++n}`);
    const account = new AppDB(`conta-${n}`);
    const p1 = newPatient();
    const p2 = newPatient();
    await local.patients.bulkPut([p1, p2]);
    await account.patients.put({ ...p2, initials: 'mais novo', updatedAt: p2.updatedAt + 10 });
    expect(await copyRecords(local, account)).toBe(1);
    expect((await account.patients.get(p2.id))?.initials).toBe('mais novo');
    expect(await account.patients.count()).toBe(2);
  });
});
