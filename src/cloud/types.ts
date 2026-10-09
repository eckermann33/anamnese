import type { SyncTable } from '../db';

/* Contrato de um "driver" de nuvem — mesmo espírito do objeto DB do DPOC:
   trocar Firebase por outro serviço = escrever outro driver. */

export interface CloudUser {
  uid: string;
  email: string;
  name: string;
}

/** Um registro como fica na nuvem. `data` = JSON do registro inteiro. */
export interface RemoteDoc {
  table: SyncTable;
  id: string;
  updatedAt: number;
  /** Apagado (lápide): avisa os outros aparelhos para apagarem também. */
  deleted?: boolean;
  data?: string;
}

export interface CloudDriver {
  readonly kind: 'firebase' | 'fake';
  /** Chama `cb` com o usuário atual e a cada login/logout. Retorna o "desligar". */
  onAuth(cb: (u: CloudUser | null) => void): () => void;
  signUp(email: string, password: string, name: string): Promise<CloudUser>;
  signIn(email: string, password: string): Promise<CloudUser>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Token do login (enviado à função de IA para provar que é você). */
  idToken(): Promise<string | null>;

  pullAll(uid: string): Promise<RemoteDoc[]>;
  pushMany(uid: string, docs: RemoteDoc[]): Promise<void>;
  /** Mudanças vindas de outros aparelhos, em tempo real. */
  subscribe(uid: string, onDocs: (docs: RemoteDoc[]) => void, onError: (e: Error) => void): () => void;
}
