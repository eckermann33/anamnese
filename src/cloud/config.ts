/* ==========================================================================
   CONFIGURAÇÃO DA NUVEM (Firebase Authentication + Firestore)
   --------------------------------------------------------------------------
   Por padrão usa o MESMO projeto do DPOC Clínico ("dpoc-clinico"): a mesma
   conta (e-mail e senha) funciona nos dois apps. Os dados do Anamnese ficam
   em coleções próprias dentro da pasta de cada usuário:
     usuarios/{uid}/anamnese_pacientes/{id}
     usuarios/{uid}/anamnese_atendimentos/{id}
     usuarios/{uid}/anamnese_evolucoes/{id}
     usuarios/{uid}/anamnese_treinos/{id}
   — então não se misturam com usuarios/{uid}/pacientes do DPOC, e a regra
   do Firestore que já existe (cada uid só lê/escreve a própria pasta)
   protege também estes dados. Ver docs/CONTAS.md.

   Estas chaves são PÚBLICAS por definição no Firebase para web: quem
   protege os dados são o login e as regras do Firestore.

   Para usar outro projeto, defina VITE_FIREBASE_* no .env.local (ou na
   Vercel) — ou troque os valores abaixo. Para desligar a nuvem e usar só o
   modo local, defina VITE_FIREBASE_DISABLED=1.
   ========================================================================== */

const env = import.meta.env;

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAFANiD-mkJ4mcfIRfp63C52J-gk5LpcZw',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'dpoc-clinico.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'dpoc-clinico',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'dpoc-clinico.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '97102209662',
  appId: env.VITE_FIREBASE_APP_ID || '1:97102209662:web:20fc7d9286e9f13cf92e2f',
};

/** Driver de testes (sem rede): VITE_CLOUD_DRIVER=fake. */
export const CLOUD_DRIVER: 'firebase' | 'fake' = env.VITE_CLOUD_DRIVER === 'fake' ? 'fake' : 'firebase';

export const CLOUD_ENABLED = env.VITE_FIREBASE_DISABLED !== '1' && !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;

/** Mostra "use a mesma conta do DPOC Clínico" na tela de login. */
export const SHARED_WITH_DPOC = FIREBASE_CONFIG.projectId === 'dpoc-clinico';

/** Nome de cada tabela local na nuvem. */
export const REMOTE_COLLECTION = {
  patients: 'anamnese_pacientes',
  encounters: 'anamnese_atendimentos',
  evolutions: 'anamnese_evolucoes',
  training: 'anamnese_treinos',
} as const;
