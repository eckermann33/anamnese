/**
 * Função serverless da Vercel: POST /api/ai
 *
 * A Vercel transforma cada arquivo da pasta /api em um endpoint.
 * Aqui só repassamos o pedido para o handler compartilhado.
 * Configure LLM_KEY (e opcionais: LLM_KEY_2, GATEWAY_URL, LLM_MODEL, ACCESS_CODE)
 * em: Vercel › Project › Settings › Environment Variables.
 */
import { handleAiRequest } from '../server/aiHandler.js';

export async function POST(request: Request): Promise<Response> {
  return handleAiRequest(request, process.env);
}

export async function GET(request: Request): Promise<Response> {
  return handleAiRequest(request, process.env);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleAiRequest(request, process.env);
}
