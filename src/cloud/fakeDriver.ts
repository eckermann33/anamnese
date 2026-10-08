import type { CloudDriver, CloudUser, RemoteDoc } from './types';

/* ==========================================================================
   DRIVER FALSO (sem rede) — só para testes automáticos.
   Guarda contas e documentos num objeto em memória (ou no localStorage,
   para sobreviver a recarregamentos no teste do navegador).
   Ativado no build com VITE_CLOUD_DRIVER=fake. NÃO tem segurança nenhuma.
   ========================================================================== */

interface Store {
  users: Record<string, { uid: string; email: string; password: string; name: string }>;
  docs: Record<string, Record<string, RemoteDoc>>; // uid → "tabela:id" → doc
  current: string | null;
}

export function createFakeDriver(opts: { persistKey?: string; latencyMs?: number } = {}): CloudDriver & { online: boolean; store: Store } {
  const empty = (): Store => ({ users: {}, docs: {}, current: null });
  const load = (): Store => {
    if (!opts.persistKey) return mem;
    try {
      return JSON.parse(localStorage.getItem(opts.persistKey) ?? 'null') ?? empty();
    } catch {
      return empty();
    }
  };
  const save = (s: Store) => {
    if (opts.persistKey) localStorage.setItem(opts.persistKey, JSON.stringify(s));
    else mem = s;
  };
  let mem = empty();
  const authListeners = new Set<(u: CloudUser | null) => void>();
  const docListeners = new Set<{ uid: string; cb: (d: RemoteDoc[]) => void }>();
  const wait = () => new Promise((r) => setTimeout(r, opts.latencyMs ?? 0));
  const userOf = (s: Store): CloudUser | null => {
    const u = s.current ? Object.values(s.users).find((x) => x.uid === s.current) : undefined;
    return u ? { uid: u.uid, email: u.email, name: u.name } : null;
  };
  const emitAuth = () => authListeners.forEach((cb) => cb(userOf(load())));
  const check = () => {
    if (!driver.online) throw new Error('Sem conexão com o servidor. Verifique a internet.');
  };

  const driver = {
    kind: 'fake' as const,
    online: true,
    get store() {
      return load();
    },

    onAuth(cb: (u: CloudUser | null) => void) {
      authListeners.add(cb);
      setTimeout(() => cb(userOf(load())), 0);
      return () => void authListeners.delete(cb);
    },
    async signUp(email: string, password: string, name: string) {
      await wait();
      check();
      const s = load();
      const key = email.trim().toLowerCase();
      if (s.users[key]) throw new Error('Já existe uma conta com esse e-mail. Use “Entrar”.');
      if (password.length < 6) throw new Error('A senha precisa ter ao menos 6 caracteres.');
      const uid = `u${Object.keys(s.users).length + 1}`;
      s.users[key] = { uid, email: key, password, name: name.trim() || key };
      s.current = uid;
      save(s);
      emitAuth();
      return { uid, email: key, name: s.users[key].name };
    },
    async signIn(email: string, password: string) {
      await wait();
      check();
      const s = load();
      const u = s.users[email.trim().toLowerCase()];
      if (!u || u.password !== password) throw new Error('E-mail ou senha incorretos.');
      s.current = u.uid;
      save(s);
      emitAuth();
      return { uid: u.uid, email: u.email, name: u.name };
    },
    async resetPassword() {
      await wait();
      check();
    },
    async signOut() {
      const s = load();
      s.current = null;
      save(s);
      emitAuth();
    },
    async idToken() {
      const s = load();
      return s.current ? `fake-token-${s.current}` : null;
    },
    async pullAll(uid: string) {
      await wait();
      check();
      return Object.values(load().docs[uid] ?? {});
    },
    async pushMany(uid: string, docs: RemoteDoc[]) {
      await wait();
      check();
      const s = load();
      s.docs[uid] ??= {};
      for (const d of docs) s.docs[uid][`${d.table}:${d.id}`] = { ...d, data: d.deleted ? undefined : d.data };
      save(s);
      // outros "aparelhos" inscritos recebem a mudança
      docListeners.forEach((l) => l.uid === uid && l.cb(docs));
    },
    subscribe(uid: string, onDocs: (d: RemoteDoc[]) => void) {
      const l = { uid, cb: onDocs };
      docListeners.add(l);
      return () => void docListeners.delete(l);
    },
  };
  return driver;
}
