/**
 * Cloudflare Workers (alternativa à Vercel).
 *
 * - /api/ai → handler de IA (chave: `npx wrangler secret put LLM_KEY` — pode ser a mesma
 *   chave da Groq do invictus.med)
 * - todo o resto → arquivos estáticos do app (pasta dist), com fallback de SPA
 *
 * Veja wrangler.jsonc e docs/PUBLICAR.md.
 */
import { handleAiRequest, type AiEnv } from '../server/aiHandler.js';

interface Env extends AiEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/ai') return handleAiRequest(request, env);
    return env.ASSETS.fetch(request);
  },
};
