import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/* ==========================================================================
   LOGIN NA FUNÇÃO DE IA (opcional)
   Com FIREBASE_PROJECT_ID definido, a IA só responde a quem mandar o token
   de login do Firebase (o app manda sozinho quando você está na sua conta).
   A verificação é a padrão do Firebase: assinatura RS256 com as chaves
   públicas do Google, emissor securetoken.google.com/<projeto> e audiência
   = <projeto>. Não precisa de chave secreta nenhuma.
   ========================================================================== */

const GOOGLE_KEYS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let keys: JWTVerifyGetKey | null = null;

/** Só para os testes automáticos (chaves geradas localmente). */
export function setFirebaseKeysForTests(k: JWTVerifyGetKey | null) {
  keys = k;
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<{ uid: string } | null> {
  keys ??= createRemoteJWKSet(new URL(GOOGLE_KEYS));
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    return payload.sub ? { uid: payload.sub } : null;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const h = request.headers.get('authorization');
  return h && /^Bearer\s+/i.test(h) ? h.replace(/^Bearer\s+/i, '').trim() : null;
}
