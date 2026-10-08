import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { SYNC_TABLES, type SyncTable } from '../db';
import { FIREBASE_CONFIG, REMOTE_COLLECTION } from './config';
import type { CloudDriver, CloudUser, RemoteDoc } from './types';

/* ==========================================================================
   DRIVER FIREBASE (Authentication + Firestore)
   O SDK só é baixado quando alguém usa a conta (import dinâmico); depois
   fica no cache do PWA e funciona offline (o login fica salvo no aparelho).
   ========================================================================== */

type AuthMod = typeof import('firebase/auth');
type StoreMod = typeof import('firebase/firestore');
interface FB {
  A: AuthMod;
  F: StoreMod;
  auth: Auth;
  db: Firestore;
}

let loading: Promise<FB> | null = null;
function load(): Promise<FB> {
  loading ??= Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]).then(([appMod, A, F]) => {
    const app = appMod.initializeApp(FIREBASE_CONFIG, 'anamnese');
    // Firestore não aceita `undefined`; os registros vão como JSON de qualquer forma.
    const db = F.initializeFirestore(app, { ignoreUndefinedProperties: true });
    return { A, F, auth: A.getAuth(app), db };
  });
  return loading;
}

/* Mesmas mensagens do DPOC Clínico. */
const ERRORS: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-email': 'Informe o e-mail.',
  'auth/user-not-found': 'Não existe conta com esse e-mail.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use “Entrar”.',
  'auth/weak-password': 'A senha precisa ter ao menos 6 caracteres.',
  'auth/missing-password': 'Informe a senha.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique a internet.',
  'auth/operation-not-allowed': 'O login por e-mail e senha não está habilitado no projeto Firebase (Authentication → Sign-in method).',
  'auth/unauthorized-domain': 'Este endereço não está na lista de domínios autorizados do projeto Firebase (Authentication → Configurações → Domínios autorizados).',
  'permission-denied': 'Sem permissão para acessar estes dados. Confira as regras do Firestore.',
  unavailable: 'Não foi possível falar com o banco de dados. Verifique a conexão.',
};

export function friendlyError(e: unknown): Error {
  const code = String((e as { code?: string })?.code ?? (e as Error)?.message ?? '');
  if (ERRORS[code]) return new Error(ERRORS[code]);
  for (const k of Object.keys(ERRORS)) if (code.includes(k)) return new Error(ERRORS[k]);
  return new Error((e as Error)?.message || 'Erro inesperado ao falar com o servidor.');
}

const toUser = (u: { uid: string; email: string | null; displayName: string | null }): CloudUser => ({
  uid: u.uid,
  email: u.email ?? '',
  name: u.displayName || u.email || 'Usuário',
});

const TABLE_BY_COLLECTION = Object.fromEntries(Object.entries(REMOTE_COLLECTION).map(([t, c]) => [c, t])) as Record<string, SyncTable>;

interface StoredDoc {
  updatedAt: number;
  deleted: boolean;
  data: string | null;
  v: 1;
}

function fromStored(table: SyncTable, id: string, d: StoredDoc): RemoteDoc {
  return { table, id, updatedAt: d.updatedAt, deleted: d.deleted || undefined, data: d.data ?? undefined };
}

export const firebaseDriver: CloudDriver = {
  kind: 'firebase',

  onAuth(cb) {
    let off: (() => void) | null = null;
    let cancelled = false;
    void load().then(({ A, auth }) => {
      if (cancelled) return;
      off = A.onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
    });
    return () => {
      cancelled = true;
      off?.();
    };
  },

  async signUp(email, password, name) {
    const { A, auth } = await load();
    try {
      const cred = await A.createUserWithEmailAndPassword(auth, email.trim(), password);
      const n = name.trim() || cred.user.email || '';
      await A.updateProfile(cred.user, { displayName: n });
      return { uid: cred.user.uid, email: cred.user.email ?? '', name: n };
    } catch (e) {
      throw friendlyError(e);
    }
  },

  async signIn(email, password) {
    const { A, auth } = await load();
    try {
      return toUser((await A.signInWithEmailAndPassword(auth, email.trim(), password)).user);
    } catch (e) {
      throw friendlyError(e);
    }
  },

  async resetPassword(email) {
    const { A, auth } = await load();
    try {
      await A.sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      throw friendlyError(e);
    }
  },

  async signOut() {
    const { A, auth } = await load();
    await A.signOut(auth);
  },

  async idToken() {
    const { auth } = await load();
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  },

  async pullAll(uid) {
    const { F, db } = await load();
    try {
      const snaps = await Promise.all(SYNC_TABLES.map((t) => F.getDocs(F.collection(db, 'usuarios', uid, REMOTE_COLLECTION[t]))));
      return snaps.flatMap((snap, i) => snap.docs.map((d) => fromStored(SYNC_TABLES[i], d.id, d.data() as StoredDoc)));
    } catch (e) {
      throw friendlyError(e);
    }
  },

  async pushMany(uid, docs) {
    const { F, db } = await load();
    try {
      // lotes de até 400 gravações (limite do Firestore: 500)
      for (let i = 0; i < docs.length; i += 400) {
        const batch = F.writeBatch(db);
        for (const d of docs.slice(i, i + 400)) {
          const stored: StoredDoc = { updatedAt: d.updatedAt, deleted: !!d.deleted, data: d.deleted ? null : (d.data ?? null), v: 1 };
          batch.set(F.doc(db, 'usuarios', uid, REMOTE_COLLECTION[d.table], d.id), stored);
        }
        await batch.commit();
      }
    } catch (e) {
      throw friendlyError(e);
    }
  },

  subscribe(uid, onDocs, onError) {
    const offs: Array<() => void> = [];
    let cancelled = false;
    void load().then(({ F, db }) => {
      if (cancelled) return;
      for (const t of SYNC_TABLES) {
        offs.push(
          F.onSnapshot(
            F.collection(db, 'usuarios', uid, REMOTE_COLLECTION[t]),
            (snap) => {
              const docs = snap
                .docChanges()
                // ignora o "eco" das gravações feitas por este aparelho
                .filter((c) => c.type !== 'removed' && !c.doc.metadata.hasPendingWrites)
                .map((c) => fromStored(TABLE_BY_COLLECTION[c.doc.ref.parent.id] ?? t, c.doc.id, c.doc.data() as StoredDoc));
              if (docs.length) onDocs(docs);
            },
            (e) => onError(friendlyError(e)),
          ),
        );
      }
    });
    return () => {
      cancelled = true;
      offs.forEach((off) => off());
    };
  },
};
