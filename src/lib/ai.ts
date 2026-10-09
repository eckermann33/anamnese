import { useCallback, useRef, useState } from 'react';
import { OUTPUT_SCHEMAS, type AiMode, type AiOutputs, type AiRequest, type AiTask } from '../../shared/ai/schemas';
import { readPrefs } from './settings';
import { currentAuthToken } from './authToken';

/* ==========================================================================
   CLIENTE DA IA (navegador)
   --------------------------------------------------------------------------
   Fala SOMENTE com a nossa função serverless (/api/ai). A chave da IA nunca
   passa por aqui. Os dados enviados são anonimizados (sem iniciais e leito).
   ========================================================================== */

export class AiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type InputOf<T extends AiTask> = Extract<AiRequest, { task: T }>['input'];


export async function callAI<T extends AiTask>(task: T, input: InputOf<T>, mode: AiMode, signal?: AbortSignal): Promise<AiOutputs[T]> {
  const prefs = readPrefs();
  if (!prefs.aiEnabled) throw new AiError('disabled', 'As funções de IA estão desligadas em Ajustes.');
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new AiError('offline', 'Sem internet. O app funciona offline, mas as funções de IA precisam de conexão.');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 125_000);
  signal?.addEventListener('abort', () => controller.abort());

  // com conta: o token do login vai junto (o servidor pode exigir login para a IA)
  const token = await currentAuthToken();

  let res: Response;
  try {
    res = await fetch(prefs.aiEndpoint || '/api/ai', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(prefs.aiAccessCode ? { 'x-access-code': prefs.aiAccessCode } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ task, mode, input }),
      signal: controller.signal,
    });
  } catch (e) {
    window.clearTimeout(timeout);
    if ((e as Error).name === 'AbortError') {
      throw new AiError(signal?.aborted ? 'aborted' : 'timeout', signal?.aborted ? 'Cancelado.' : 'A IA demorou demais. Tente de novo.');
    }
    throw new AiError('network', 'Não foi possível falar com o servidor de IA. Verifique a conexão.');
  }
  window.clearTimeout(timeout);

  let body: { ok: boolean; data?: unknown; error?: string; code?: string };
  try {
    body = await res.json();
  } catch {
    throw new AiError(
      'server',
      res.status === 404
        ? 'Servidor de IA não encontrado. No desenvolvimento, confira o .env.local; em produção, a função /api/ai.'
        : `Resposta inválida do servidor (${res.status}).`,
    );
  }
  if (!body.ok) throw new AiError(body.code ?? 'error', body.error ?? 'Erro na IA.');

  // Valida de novo no app antes de mostrar (defesa em profundidade).
  const parsed = OUTPUT_SCHEMAS[task].safeParse(body.data);
  if (!parsed.success) throw new AiError('schema', 'A resposta da IA veio em formato inesperado.');
  return parsed.data as AiOutputs[T];
}

/** Hook com estados de carregamento/erro para uma chamada de IA. */
export function useAi<T extends AiTask>(task: T) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (input: InputOf<T>, mode: AiMode): Promise<AiOutputs[T] | null> => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        return await callAI(task, input, mode, ctrl.signal);
      } catch (e) {
        if ((e as AiError).code !== 'aborted') setError((e as Error).message);
        return null;
      } finally {
        if (abortRef.current === ctrl) setLoading(false);
      }
    },
    [task],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return { run, loading, error, setError, cancel };
}

/** Verifica se o servidor de IA está no ar (Ajustes). */
export async function checkAiServer(): Promise<{ online: boolean; configured?: boolean; accessCodeRequired?: boolean; loginRequired?: boolean; model?: string; error?: string }> {
  const prefs = readPrefs();
  try {
    const res = await fetch(prefs.aiEndpoint || '/api/ai', { method: 'GET' });
    const body = await res.json();
    return { online: !!body.ok, configured: body.configured, accessCodeRequired: body.accessCodeRequired, loginRequired: body.loginRequired, model: body.model };
  } catch {
    return { online: false, error: 'Servidor de IA indisponível.' };
  }
}
