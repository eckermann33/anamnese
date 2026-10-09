/**
 * Configuração central do aplicativo.
 *
 * Quer trocar o nome do app? Mude APP_NAME aqui — ele é usado no título
 * da página, no manifesto do PWA (nome na tela inicial do celular) e nos
 * textos gerados (prontuário, PDF).
 */
export const APP_NAME = 'Anamnese';

/** Nome curto (aparece embaixo do ícone na tela inicial). Máx. ~12 caracteres. */
export const APP_SHORT_NAME = 'Anamnese';

export const APP_DESCRIPTION =
  'Apoio à anamnese, exame físico, raciocínio diagnóstico e evolução clínica — feito para usar à beira do leito.';

/** Cor da barra do navegador / tela de abertura do PWA. */
export const THEME_COLOR_LIGHT = '#F2F2F7';
export const THEME_COLOR_DARK = '#000000';

/** Aviso fixo exibido em toda saída de IA e no rodapé dos documentos. */
export const CLINICAL_DISCLAIMER =
  'Ferramenta de apoio ao raciocínio clínico e ao ensino. Não substitui o julgamento médico.';

/** Endpoint padrão da função serverless de IA (mesma origem do app). */
export const DEFAULT_AI_ENDPOINT = '/api/ai';
