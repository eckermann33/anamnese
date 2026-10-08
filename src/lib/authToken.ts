/* Token do login (conta) enviado junto com as chamadas de IA.
   Módulo à parte, sem dependências, para o pacote inicial continuar leve. */

let provider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(fn: (() => Promise<string | null>) | null) {
  provider = fn;
}

export async function currentAuthToken(): Promise<string | null> {
  try {
    return (await provider?.()) ?? null;
  } catch {
    return null;
  }
}
