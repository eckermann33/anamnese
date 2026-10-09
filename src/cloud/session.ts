/* ==========================================================================
   SESSÃO (qual banco abrir ao iniciar o app)
   --------------------------------------------------------------------------
   Guardada no localStorage para o app abrir na hora (inclusive offline) no
   banco certo, sem esperar o Firebase carregar:
     { mode: 'local' }                       → usar sem conta (só no aparelho)
     { mode: 'cloud', uid, email, name }     → conta: banco local da conta +
                                               sincronização com a nuvem
   Sem sessão (null) e com nuvem configurada → tela de login.
   Este arquivo não importa o Firebase (fica no pacote inicial, que é leve).
   ========================================================================== */

export type Session = { mode: 'local' } | { mode: 'cloud'; uid: string; email: string; name: string };

const KEY = 'anamnese:session';

export const LOCAL_DB_NAME = 'anamnese-db';
export const accountDbName = (uid: string) => `anamnese-u-${uid}`;

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.mode === 'local' || (s.mode === 'cloud' && s.uid)) return s;
  } catch {
    /* storage indisponível ou corrompido */
  }
  return null;
}

export function writeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage indisponível */
  }
}

export function dbNameFor(s: Session | null): string {
  return s?.mode === 'cloud' ? accountDbName(s.uid) : LOCAL_DB_NAME;
}
