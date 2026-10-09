import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractJson, handleAiRequest } from '../server/aiHandler';
import { buildSystemPrompt } from '../server/prompts';

/* Testa a função de IA com um provedor FALSO (sem chave real, sem internet). */

const okSuggestion = {
  systems: [
    { system: 'cardiovascular', justification: 'Dor torácica: afastar SCA.' },
    { system: 'respiratorio', justification: 'TEP e pneumotórax.' },
  ],
  template: 'dor_toracica',
  confidence: 'alta',
};

function providerResponse(content: string, status = 200, finish = 'stop') {
  return new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: finish }] }), { status });
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const request = { task: 'suggest_systems', mode: 'plantao', input: { complaint: 'dor no peito' } };

afterEach(() => vi.unstubAllGlobals());

describe('função de IA (compatível com OpenAI)', () => {
  it('extrai JSON mesmo com <think> e crases', () => {
    expect(extractJson('<think>pensando {x}</think>```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('lixo')).toBeNull();
  });

  it('responde com os dados validados e usa o endpoint/modelo padrão (Groq + gpt-oss)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse(JSON.stringify(okSuggestion)));
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleAiRequest(post(request), { LLM_KEY: 'k' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.systems[0].system).toBe('cardiovascular');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe('openai/gpt-oss-120b');
    expect(sent.response_format).toEqual({ type: 'json_object' });
    expect(sent.reasoning_effort).toBe('low');
    expect(init.headers.authorization).toBe('Bearer k');
  });

  it('cai para o provedor reserva quando o principal falha ou devolve JSON fora do formato', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(providerResponse('{"systems":"errado"}')) // schema inválido
      .mockResolvedValueOnce(providerResponse(JSON.stringify(okSuggestion)));
    vi.stubGlobal('fetch', fetchMock);
    const res = await handleAiRequest(post(request), { LLM_KEY: 'k1', LLM_KEY_2: 'k2' });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.model).toBe('qwen/qwen3-32b');
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.reasoning_effort).toBeUndefined(); // qwen não recebe reasoning_effort
  });

  it('cota esgotada em todos → 429 com mensagem amigável', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => providerResponse('{}', 429)));
    const res = await handleAiRequest(post(request), { LLM_KEY: 'k1', LLM_KEY_2: 'k2' });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/Cota/);
  });

  it('chave recusada (401) → explica e mostra o código; chave com espaço/quebra de linha é aparada', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => providerResponse('{"error":"invalid_api_key"}', 401));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await handleAiRequest(post(request), { LLM_KEY: ' gsk_abc\n' });
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toMatch(/chave da IA foi recusada/);
    expect(body.error).toMatch(/LLM1:401 LLM2:401/);
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer gsk_abc');
  });

  it('exige código de acesso quando configurado e valida o pedido', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const denied = await handleAiRequest(post(request), { LLM_KEY: 'k', ACCESS_CODE: 'segredo' });
    expect(denied.status).toBe(401);
    const bad = await handleAiRequest(post({ task: 'xyz' }, { 'x-access-code': 'segredo' }), { LLM_KEY: 'k', ACCESS_CODE: 'segredo' });
    expect(bad.status).toBe(400);
    const none = await handleAiRequest(post(request), {});
    expect(none.status).toBe(503);
  });

  it('o prompt leva as regras de segurança, o formato JSON e (só nas hipóteses) as referências', () => {
    const hyp = buildSystemPrompt('hypotheses', 'estudante');
    expect(hyp).toMatch(/Nunca invente/);
    expect(hyp).toMatch(/conferir dose/);
    expect(hyp).toMatch(/FORMATO DA RESPOSTA/);
    expect(hyp).toMatch(/sbc-sca-2021/);
    expect(hyp).toMatch(/MODO ESTUDANTE/);
    expect(buildSystemPrompt('suggest_systems', 'plantao')).not.toMatch(/sbc-sca-2021/);
    // tamanho razoável para cotas gratuitas (≈ 4 caracteres por token)
    expect(hyp.length / 4).toBeLessThan(6000);
  });
});

describe('login obrigatório para a IA (FIREBASE_PROJECT_ID)', () => {
  const env = { LLM_KEY: 'k', FIREBASE_PROJECT_ID: 'meu-projeto' };

  async function setupKeys() {
    const { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } = await import('jose');
    const { setFirebaseKeysForTests } = await import('../server/firebaseAuth');
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
    setFirebaseKeysForTests(createLocalJWKSet({ keys: [jwk] }));
    const sign = (aud: string, sub = 'uid-1') =>
      new SignJWT({})
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer(`https://securetoken.google.com/${aud}`)
        .setAudience(aud)
        .setSubject(sub)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);
    return { sign };
  }

  it('sem token: 401 pedindo login', async () => {
    await setupKeys();
    vi.stubGlobal('fetch', vi.fn());
    const res = await handleAiRequest(post(request), env);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('login');
  });

  it('token válido do projeto: passa', async () => {
    const { sign } = await setupKeys();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify(okSuggestion))));
    const res = await handleAiRequest(post(request, { authorization: `Bearer ${await sign('meu-projeto')}` }), env);
    expect(res.status).toBe(200);
  });

  it('token de outro projeto: 401', async () => {
    const { sign } = await setupKeys();
    vi.stubGlobal('fetch', vi.fn());
    const res = await handleAiRequest(post(request, { authorization: `Bearer ${await sign('outro-projeto')}` }), env);
    expect(res.status).toBe(401);
  });

  it('o código de acesso continua valendo como alternativa', async () => {
    await setupKeys();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify(okSuggestion))));
    const res = await handleAiRequest(post(request, { 'x-access-code': 'abc' }), { ...env, ACCESS_CODE: 'abc' });
    expect(res.status).toBe(200);
    const info = await (await handleAiRequest(new Request('http://localhost/api/ai'), env)).json();
    expect(info.loginRequired).toBe(true);
  });
});
