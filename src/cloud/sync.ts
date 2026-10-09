import { liveQuery } from 'dexie';
import { SYNC_TABLES, type AppDB, type SyncMeta, type SyncTable } from '../db';
import type { CloudDriver, RemoteDoc } from './types';

/* ==========================================================================
   SINCRONIZAÇÃO (banco do aparelho ⇄ nuvem)
   --------------------------------------------------------------------------
   O app SEMPRE lê e grava no banco do aparelho (rápido e offline). Este
   motor, em segundo plano:
   1. ao entrar: baixa tudo da nuvem e mescla;
   2. a cada mudança local (≈1,5 s depois): envia o que mudou;
   3. em tempo real: recebe o que outro aparelho mudou.
   Regra de conflito: vence a versão com `updatedAt` mais recente (por
   registro). Apagar vira uma "lápide" na nuvem, para os outros aparelhos
   apagarem também.
   `syncMeta` guarda, por registro, a última versão que já está igual na
   nuvem — é assim que o motor sabe o que falta enviar (sem precisar
   interceptar cada gravação do app).
   ========================================================================== */

export type SyncState = 'iniciando' | 'sincronizando' | 'sincronizado' | 'pendente' | 'erro';

export interface SyncStatus {
  state: SyncState;
  /** Registros ainda não enviados. */
  pending: number;
  lastSync?: number;
  error?: string;
}

interface Row {
  id: string;
  updatedAt: number;
}

const metaKey = (t: SyncTable, id: string) => `${t}:${id}`;
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export class SyncEngine {
  private offs: Array<() => void> = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;
  private dirty = false;
  private stopped = false;
  status: SyncStatus = { state: 'iniciando', pending: 0 };

  constructor(
    private readonly db: AppDB,
    private readonly driver: CloudDriver,
    private readonly uid: string,
    private readonly onStatus: (s: SyncStatus) => void = () => {},
  ) {}

  /** `watch: false` nos testes: sem observar o banco nem a rede. */
  async start({ watch = true } = {}): Promise<void> {
    try {
      if (!isOffline()) await this.pull();
    } catch (e) {
      this.fail(e);
    }
    if (this.stopped) return;
    await this.push();
    this.offs.push(
      this.driver.subscribe(
        this.uid,
        (docs) => void this.applyRemote(docs).catch((e) => this.fail(e)),
        (e) => this.fail(e),
      ),
    );
    if (!watch) return;
    // qualquer gravação nas tabelas sincronizadas → agenda um envio
    const sub = liveQuery(() => Promise.all(SYNC_TABLES.map((t) => this.db.table(t).toArray()))).subscribe({
      next: () => this.schedule(),
      error: (e) => this.fail(e),
    });
    this.offs.push(() => sub.unsubscribe());
    const onOnline = () => {
      void this.pull()
        .then(() => this.push())
        .catch((e) => this.fail(e));
    };
    window.addEventListener('online', onOnline);
    this.offs.push(() => window.removeEventListener('online', onOnline));
    const retry = setInterval(() => {
      if (this.status.state === 'pendente' || this.status.state === 'erro') this.schedule(0);
    }, 60_000);
    this.offs.push(() => clearInterval(retry));
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.offs.forEach((off) => off());
    this.offs = [];
  }

  schedule(delay = 1500) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.push(), delay);
  }

  async pull(): Promise<void> {
    this.set({ state: 'sincronizando' });
    const docs = await this.driver.pullAll(this.uid);
    await this.applyRemote(docs);
  }

  /** Aplica no aparelho o que veio da nuvem (só se for mais novo). */
  async applyRemote(docs: RemoteDoc[]): Promise<void> {
    for (const t of SYNC_TABLES) {
      const group = docs.filter((d) => d.table === t);
      if (!group.length) continue;
      const table = this.db.table<Row, string>(t);
      await this.db.transaction('rw', table, this.db.syncMeta, async () => {
        for (const d of group) {
          const key = metaKey(t, d.id);
          const local = await table.get(d.id);
          if (d.deleted) {
            if (!local || local.updatedAt <= d.updatedAt) {
              if (local) await table.delete(d.id);
              await this.db.syncMeta.put({ key, updatedAt: d.updatedAt, deleted: true });
            }
            continue;
          }
          if (!local || local.updatedAt < d.updatedAt) {
            let rec: Row;
            try {
              rec = JSON.parse(d.data ?? '') as Row;
            } catch {
              continue; // documento corrompido: ignora
            }
            await table.put(rec);
            await this.db.syncMeta.put({ key, updatedAt: d.updatedAt });
          } else if (local.updatedAt === d.updatedAt) {
            await this.db.syncMeta.put({ key, updatedAt: d.updatedAt });
          }
          // local mais novo: fica o do aparelho; o próximo envio manda para a nuvem
        }
      });
    }
  }

  /** O que mudou no aparelho desde a última sincronização. */
  async diff(): Promise<RemoteDoc[]> {
    const metas = new Map<string, SyncMeta>((await this.db.syncMeta.toArray()).map((m) => [m.key, m]));
    const out: RemoteDoc[] = [];
    for (const t of SYNC_TABLES) {
      const rows = await this.db.table<Row, string>(t).toArray();
      const present = new Set<string>();
      for (const r of rows) {
        present.add(r.id);
        const m = metas.get(metaKey(t, r.id));
        if (!m || m.deleted || m.updatedAt < r.updatedAt) out.push({ table: t, id: r.id, updatedAt: r.updatedAt, data: JSON.stringify(r) });
      }
      // registro que estava na nuvem e sumiu daqui = foi apagado neste aparelho
      for (const m of metas.values()) {
        if (m.deleted || !m.key.startsWith(`${t}:`)) continue;
        const id = m.key.slice(t.length + 1);
        if (!present.has(id)) out.push({ table: t, id, updatedAt: Math.max(Date.now(), m.updatedAt + 1), deleted: true });
      }
    }
    return out;
  }

  /** Envia as mudanças. Chamadas simultâneas viram uma só (com repetição). */
  push(): Promise<void> {
    if (this.running) {
      this.dirty = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.dirty = false;
        const changes = await this.diff();
        if (!changes.length) {
          this.set({ state: 'sincronizado', pending: 0, lastSync: Date.now(), error: undefined });
          continue;
        }
        if (isOffline()) {
          this.set({ state: 'pendente', pending: changes.length });
          break;
        }
        this.set({ state: 'sincronizando', pending: changes.length });
        try {
          await this.driver.pushMany(this.uid, changes);
          // grava a versão ENVIADA (se o usuário editou durante o envio, o próximo ciclo manda de novo)
          await this.db.syncMeta.bulkPut(changes.map((c) => ({ key: metaKey(c.table, c.id), updatedAt: c.updatedAt, deleted: c.deleted })));
          this.set({ state: 'sincronizado', pending: 0, lastSync: Date.now(), error: undefined });
        } catch (e) {
          this.fail(e, changes.length);
          break;
        }
      } while (this.dirty && !this.stopped);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  async pendingCount(): Promise<number> {
    return (await this.diff()).length;
  }

  private fail(e: unknown, pending = this.status.pending) {
    const msg = (e as Error)?.message || 'Erro ao sincronizar.';
    this.set(isOffline() ? { state: 'pendente', pending } : { state: 'erro', pending, error: msg });
  }

  private set(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    this.onStatus(this.status);
  }
}

/** Copia os registros de um banco para outro (ex.: do modo sem conta para a conta). */
export async function copyRecords(from: AppDB, to: AppDB): Promise<number> {
  let copied = 0;
  for (const t of SYNC_TABLES) {
    const rows = await from.table<Row, string>(t).toArray();
    if (!rows.length) continue;
    const target = to.table<Row, string>(t);
    await to.transaction('rw', target, async () => {
      for (const r of rows) {
        const existing = await target.get(r.id);
        if (!existing || existing.updatedAt < r.updatedAt) {
          await target.put(r);
          if (t === 'patients') copied++;
        }
      }
    });
  }
  return copied;
}
