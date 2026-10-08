import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Dexie from 'dexie';
import { AppDB, db, switchDatabase } from '../db';
import { setAuthTokenProvider } from '../lib/authToken';
import { CLOUD_DRIVER, CLOUD_ENABLED } from './config';
import { accountDbName, LOCAL_DB_NAME, readSession, writeSession, type Session } from './session';
import { copyRecords, SyncEngine, type SyncStatus } from './sync';
import type { CloudDriver, CloudUser, RemoteDoc } from './types';
import { AuthScreen } from '../features/account/AuthScreen';

/* ==========================================================================
   CONTAS E SINCRONIZAÇÃO (contexto React)
   - Sem sessão + nuvem configurada → tela de login (Entrar / Criar conta /
     Usar sem conta neste aparelho).
   - Com conta: abre o banco da conta no aparelho e liga a sincronização.
   - Trocar de conta/modo troca o banco e remonta o app (key={dbName}).
   ========================================================================== */

interface CloudCtx {
  enabled: boolean;
  session: Session | null;
  user: CloudUser | null;
  status: SyncStatus | null;
  /** Pacientes do modo sem conta (neste aparelho) que ainda não estão na conta. */
  localOnly: number;
  openAuth: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  continueWithoutAccount: () => void;
  signOut: (opts?: { wipeLocal?: boolean }) => Promise<void>;
  syncNow: () => Promise<void>;
  migrateLocal: () => Promise<number>;
  deleteCloudData: () => Promise<void>;
}

const Ctx = createContext<CloudCtx | null>(null);

export function useCloud(): CloudCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('CloudProvider ausente');
  return c;
}

async function loadDriver(): Promise<CloudDriver> {
  if (CLOUD_DRIVER === 'fake') return (await import('./fakeDriver')).createFakeDriver({ persistKey: 'anamnese:fake-cloud', latencyMs: 150 });
  return (await import('./firebaseDriver')).firebaseDriver;
}

/** Quantos pacientes do modo sem conta ainda não estão no banco da conta. */
async function countLocalOnly(): Promise<number> {
  if (!(await Dexie.exists(LOCAL_DB_NAME))) return 0;
  const local = new AppDB(LOCAL_DB_NAME);
  try {
    const ids = (await local.patients.toCollection().primaryKeys()) as string[];
    if (!ids.length) return 0;
    const found = await db.patients.bulkGet(ids);
    return found.filter((p) => !p).length;
  } finally {
    local.close();
  }
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => (CLOUD_ENABLED ? readSession() : { mode: 'local' }));
  const [authOpen, setAuthOpen] = useState(false);
  const [dbName, setDbName] = useState(() => db.name);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [localOnly, setLocalOnly] = useState(0);
  const driverRef = useRef<CloudDriver | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);

  const getDriver = useCallback(async () => (driverRef.current ??= await loadDriver()), []);

  const openDb = useCallback((name: string) => {
    switchDatabase(name);
    setDbName(name);
  }, []);

  const enterAccount = useCallback(
    (u: CloudUser) => {
      const s: Session = { mode: 'cloud', uid: u.uid, email: u.email, name: u.name };
      writeSession(s);
      openDb(accountDbName(u.uid));
      setSession(s);
      setAuthOpen(false);
    },
    [openDb],
  );

  const cloudUid = session?.mode === 'cloud' ? session.uid : null;

  // Conta ativa: confirma o login com o Firebase e liga a sincronização.
  useEffect(() => {
    if (!cloudUid) return;
    let cancelled = false;
    let engine: SyncEngine | null = null;
    let off = () => {};
    void getDriver().then((driver) => {
      if (cancelled) return;
      setAuthTokenProvider(() => driver.idToken());
      off = driver.onAuth((u) => {
        if (cancelled) return;
        if (!u) {
          // saiu em outro lugar ou o login expirou → volta para a tela de login
          engine?.stop();
          engine = null;
          writeSession(null);
          setSession(null);
          setUser(null);
          return;
        }
        if (u.uid !== cloudUid) {
          enterAccount(u);
          return;
        }
        setUser(u);
        if (!engine) {
          engine = new SyncEngine(db, driver, u.uid, (s) => !cancelled && setStatus({ ...s }));
          engineRef.current = engine;
          void engine.start();
          void countLocalOnly().then((n) => !cancelled && setLocalOnly(n));
        }
      });
    });
    return () => {
      cancelled = true;
      off();
      engine?.stop();
      engineRef.current = null;
      setAuthTokenProvider(null);
      setStatus(null);
    };
  }, [cloudUid, getDriver, enterAccount]);

  const signIn = useCallback(async (email: string, password: string) => enterAccount(await (await getDriver()).signIn(email, password)), [getDriver, enterAccount]);
  const signUp = useCallback(
    async (email: string, password: string, name: string) => enterAccount(await (await getDriver()).signUp(email, password, name)),
    [getDriver, enterAccount],
  );
  const resetPassword = useCallback(async (email: string) => (await getDriver()).resetPassword(email), [getDriver]);

  const continueWithoutAccount = useCallback(() => {
    const s: Session = { mode: 'local' };
    writeSession(s);
    openDb(LOCAL_DB_NAME);
    setSession(s);
    setAuthOpen(false);
  }, [openDb]);

  const signOut = useCallback(
    async ({ wipeLocal = false }: { wipeLocal?: boolean } = {}) => {
      const engine = engineRef.current;
      // tenta enviar o que falta antes de sair (até 8 s)
      if (engine && navigator.onLine) await Promise.race([engine.push(), new Promise((r) => setTimeout(r, 8000))]);
      engine?.stop();
      await (await getDriver()).signOut();
      const accountDb = db.name;
      openDb(LOCAL_DB_NAME);
      if (wipeLocal) await Dexie.delete(accountDb);
      writeSession(null);
      setUser(null);
      setSession(null);
    },
    [getDriver, openDb],
  );

  const syncNow = useCallback(async () => {
    const e = engineRef.current;
    if (!e) return;
    await e.pull();
    await e.push();
  }, []);

  const migrateLocal = useCallback(async () => {
    const local = new AppDB(LOCAL_DB_NAME);
    try {
      const n = await copyRecords(local, db);
      setLocalOnly(0);
      engineRef.current?.schedule(0);
      return n;
    } finally {
      local.close();
    }
  }, []);

  /** Apaga os dados da conta: lápides na nuvem (os outros aparelhos apagam também) + este aparelho. */
  const deleteCloudData = useCallback(async () => {
    if (!cloudUid) return;
    const driver = await getDriver();
    engineRef.current?.stop();
    const remote = await driver.pullAll(cloudUid);
    const now = Date.now();
    const seen = new Set(remote.map((d) => `${d.table}:${d.id}`));
    const tombs: RemoteDoc[] = remote.filter((d) => !d.deleted).map((d) => ({ table: d.table, id: d.id, updatedAt: Math.max(now, d.updatedAt + 1), deleted: true }));
    for (const t of ['patients', 'encounters', 'evolutions', 'training'] as const) {
      for (const id of (await db.table(t).toCollection().primaryKeys()) as string[]) {
        if (!seen.has(`${t}:${id}`)) tombs.push({ table: t, id, updatedAt: now, deleted: true });
      }
    }
    if (tombs.length) await driver.pushMany(cloudUid, tombs);
    await signOut({ wipeLocal: true });
  }, [cloudUid, getDriver, signOut]);

  const value = useMemo<CloudCtx>(
    () => ({
      enabled: CLOUD_ENABLED,
      session,
      user,
      status,
      localOnly,
      openAuth: () => setAuthOpen(true),
      signIn,
      signUp,
      resetPassword,
      continueWithoutAccount,
      signOut,
      syncNow,
      migrateLocal,
      deleteCloudData,
    }),
    [session, user, status, localOnly, signIn, signUp, resetPassword, continueWithoutAccount, signOut, syncNow, migrateLocal, deleteCloudData],
  );

  const gate = CLOUD_ENABLED && (session === null || authOpen);
  return (
    <Ctx.Provider value={value}>
      {gate ? <AuthScreen onCancel={session ? () => setAuthOpen(false) : undefined} /> : <Fragment key={dbName}>{children}</Fragment>}
    </Ctx.Provider>
  );
}
