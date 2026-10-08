import { z } from 'zod';
import { AiRequestSchema, OUTPUT_SCHEMAS, type AiRequest, type AiTask } from '../shared/ai/schemas.js';
import { buildSystemPrompt, buildUserPrompt, TASK_CONFIG } from './prompts.js';

/* ==========================================================================
   FUNÇÃO DE IA (servidor) — provedores compatíveis com a API da OpenAI
   --------------------------------------------------------------------------
   Mesmo esquema do invictus.med: o navegador só conversa com esta função;
   a chave fica no servidor e a função faz uma CASCATA de provedores (se o
   primeiro falhar — cota, modelo fora do ar, JSON inválido — tenta o próximo).

   Funciona com qualquer endpoint no formato OpenAI "chat/completions":
   Groq (padrão), OpenAI, Cerebras, OpenRouter, Cloudflare AI Gateway…

   Variáveis (Cloudflare: Settings › Variables and Secrets | Vercel: Environment Variables):
     LLM_KEY        → chave principal (secreta)            [obrigatória]
     LLM_KEY_2      → chave reserva (secreta)              [opcional]
     GATEWAY_URL    → endpoint principal (padrão: Groq)    [opcional]
     GATEWAY_URL_2  → endpoint da reserva (padrão: o mesmo) [opcional]
     LLM_MODEL      → modelo principal (padrão: openai/gpt-oss-120b)
     LLM_MODEL_2    → modelo reserva   (padrão: qwen/qwen3-32b)
     ACCESS_CODE    → código de acesso exigido pelo app    [recomendado]
     ALLOWED_ORIGINS→ origens permitidas, separadas por vírgula [recomendado]
   ========================================================================== */

export interface AiEnv {
  LLM_KEY?: string;
  LLM_KEY_2?: string;
  GATEWAY_URL?: string;
  GATEWAY_URL_2?: string;
  LLM_MODEL?: string;
  LLM_MODEL_2?: string;
  ACCESS_CODE?: string;
  ALLOWED_ORIGINS?: string;
}

const DEFAULT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_MODEL_2 = 'qwen/qwen3-32b';

const MAX_BODY_CHARS = 250_000;
const PROVIDER_TIMEOUT_MS = 90_000;
const RATE_LIMIT = { windowMs: 5 * 60_000, max: 40 };
const hits = new Map<string, number[]>();

interface Provider {
  tag: string;
  url: string;
  key: string;
  model: string;
}

/** Monta a cascata. Use modelos DIFERENTES nos níveis (se o modelo cair, a reserva salva). */
function providers(env: AiEnv): Provider[] {
  const list: Provider[] = [];
  const url1 = env.GATEWAY_URL || DEFAULT_URL;
  if (env.LLM_KEY) list.push({ tag: 'LLM1', url: url1, key: env.LLM_KEY, model: env.LLM_MODEL || DEFAULT_MODEL });
  const key2 = env.LLM_KEY_2 || env.LLM_KEY;
  if (key2) list.push({ tag: 'LLM2', url: env.GATEWAY_URL_2 || url1, key: key2, model: env.LLM_MODEL_2 || DEFAULT_MODEL_2 });
  return list;
}

/* ---------- HTTP utilitários ---------- */

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function allowedOrigins(env: AiEnv): string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null, env: AiEnv): Record<string, string> {
  const list = allowedOrigins(env);
  if (origin && list.includes(origin)) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, GET, OPTIONS',
      'access-control-allow-headers': 'content-type, x-access-code',
      vary: 'origin',
    };
  }
  return {};
}

function originAllowed(request: Request, env: AiEnv): boolean {
  const list = allowedOrigins(env);
  if (!list.length) return true;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return list.includes(origin);
}

function rateLimited(request: Request): boolean {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local';
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE_LIMIT.max;
}

/* ---------- JSON da resposta ---------- */

/** Tolerante a crases, "<think>…</think>" e texto em volta do JSON. */
export function extractJson(text: string): unknown {
  let t = String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json|```/gi, '')
    .trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a !== -1 && b !== -1) t = t.slice(a, b + 1);
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** Modelos de raciocínio aceitam reasoning_effort; outros dão erro se receberem. */
function supportsReasoningEffort(model: string) {
  return /gpt-oss|(^|\/)o\d|gpt-5/i.test(model);
}
/** Alguns modelos (o-series, gpt-5) só aceitam a temperatura padrão. */
function supportsTemperature(model: string) {
  return !/(^|\/)o\d|gpt-5/i.test(model);
}

type CallResult = { ok: true; data: unknown; model: string } | { ok: false; code: string };

async function callProvider(p: Provider, req: AiRequest): Promise<CallResult> {
  const cfg = TASK_CONFIG[req.task];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(p.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: 'system', content: buildSystemPrompt(req.task, req.mode) },
          { role: 'user', content: buildUserPrompt(req) },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: cfg.maxTokens,
        ...(supportsTemperature(p.model) ? { temperature: cfg.temperature } : {}),
        ...(supportsReasoningEffort(p.model) ? { reasoning_effort: cfg.effort } : {}),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, code: (e as Error).name === 'AbortError' ? 'timeout' : 'rede' };
  }
  clearTimeout(timer);

  let txt = '';
  try {
    txt = await res.text();
  } catch {
    return { ok: false, code: 'rede' };
  }
  if (!res.ok) return { ok: false, code: String(res.status) };

  let content = '';
  let finish = '';
  try {
    const body = JSON.parse(txt);
    content = body?.choices?.[0]?.message?.content ?? '';
    finish = body?.choices?.[0]?.finish_reason ?? '';
  } catch {
    return { ok: false, code: 'resp' };
  }
  if (finish === 'length') return { ok: false, code: 'cortado' };

  const raw = extractJson(content);
  if (!raw) return { ok: false, code: 'json' };

  // Valida o formato antes de devolver ao app — resposta de modelo é conteúdo não confiável.
  const schema = OUTPUT_SCHEMAS[req.task] as z.ZodType;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: 'schema' };
  return { ok: true, data: parsed.data, model: p.model };
}

/* ---------- Handler ---------- */

export async function handleAiRequest(request: Request, env: AiEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'), env);
  const list = providers(env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  // GET = status (Ajustes › Testar conexão)
  if (request.method === 'GET') {
    return json(
      { ok: true, status: 'online', configured: list.length > 0, accessCodeRequired: !!env.ACCESS_CODE, model: list[0]?.model ?? null },
      200,
      cors,
    );
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405, cors);

  if (!originAllowed(request, env)) return json({ ok: false, code: 'origin', error: 'Origem não autorizada.' }, 403, cors);
  if (env.ACCESS_CODE && request.headers.get('x-access-code') !== env.ACCESS_CODE) {
    return json({ ok: false, code: 'access_code', error: 'Código de acesso da IA inválido. Confira em Ajustes › Inteligência artificial.' }, 401, cors);
  }
  if (!list.length) {
    return json({ ok: false, code: 'not_configured', error: 'A IA não está configurada no servidor (falta LLM_KEY).' }, 503, cors);
  }
  if (rateLimited(request)) {
    return json({ ok: false, code: 'rate_limit', error: 'Muitas solicitações em pouco tempo. Aguarde alguns minutos.' }, 429, cors);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return json({ ok: false, error: 'Pedido grande demais.' }, 413, cors);

  let parsed: AiRequest;
  try {
    const result = AiRequestSchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      const first = result.error.issues[0];
      return json({ ok: false, code: 'invalid', error: `Pedido inválido: ${first?.path.join('.')} ${first?.message}` }, 400, cors);
    }
    parsed = result.data;
  } catch {
    return json({ ok: false, code: 'invalid', error: 'JSON inválido.' }, 400, cors);
  }

  // Cascata: tenta cada provedor; guarda o último código para diagnóstico.
  const codes: string[] = [];
  for (const p of list) {
    const r = await callProvider(p, parsed);
    if (r.ok) return json({ ok: true, task: parsed.task as AiTask, data: r.data, model: r.model }, 200, cors);
    codes.push(`${p.tag}:${r.code}`);
  }
  const last = codes[codes.length - 1] ?? '';
  const quota = codes.every((c) => /:(429|413)$/.test(c));
  return json(
    {
      ok: false,
      code: codes.join(' '),
      error: quota
        ? 'Cota da IA esgotada no momento. Tente de novo em alguns minutos.'
        : /timeout/.test(last)
          ? 'A IA demorou demais para responder. Tente de novo.'
          : 'A IA não conseguiu responder agora. Tente de novo.',
    },
    quota ? 429 : 503,
    cors,
  );
}
