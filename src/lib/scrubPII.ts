/* ==========================================================================
   LIMPEZA DE IDENTIFICAÇÃO (LGPD)
   --------------------------------------------------------------------------
   Laudos e textos colados do sistema do hospital costumam trazer nome
   completo, CPF, CNS, prontuário, data de nascimento, endereço e telefone.
   O app só guarda iniciais — então tudo isso sai ANTES de salvar e antes de
   mandar para a IA.

   - scrubPII(texto): remove linhas com rótulo de identificação e mascara
     CPF, CNS e telefones soltos. Não mexe em valores de exame.
   - maskIdentity(texto, {initials, bed}): troca iniciais e leito por
     marcadores ([INICIAIS], [LEITO]) para enviar à IA e devolve uma função
     que restaura os marcadores na resposta.
   ========================================================================== */

export interface ScrubResult {
  text: string;
  /** Linhas inteiras removidas (rótulo de identificação). */
  removedLines: number;
  /** Trechos mascarados (CPF, CNS, telefone). */
  masked: number;
}

/** Rótulos que identificam a pessoa (no começo da linha ou no meio, seguidos de ":"). */
const ID_LABEL =
  /(^|[\s|;,(])(nome(\s+(do|da)\s+paciente)?|paciente|m[ãa]e|pai|respons[áa]vel|cpf|rg|cns|cart[ãa]o\s+(do\s+)?sus|prontu[áa]rio|n[ºo°.]?\s*(do\s+)?prontu[áa]rio|registro|n[ºo°.]?\s*(do\s+)?atendimento|atendimento|data\s+de\s+nasc\w*|dt\.?\s*(de\s*)?nasc\w*|nascimento|d\.?\s?n\.?|endere[çc]o|logradouro|bairro|cep|telefone|tel\.?|celular|e-?mail|conv[êe]nio|matr[íi]cula|m[ée]dico(\s+solicitante)?|solicitante|crm)\.?\s*[:：]/i;

const CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
const CPF_RAW = /(?<![\d.,])\d{11}(?![\d.,])/g;
const CNS = /(?<![\d.,])\d{3}\s?\d{4}\s?\d{4}\s?\d{4}(?![\d.,])/g;
const PHONE = /\(?\b\d{2}\)?\s?9?\d{4}-\d{4}\b/g;

/**
 * @param opts.labels  remove linhas com rótulo ("Nome:", "CPF:", "Prontuário:"…).
 *   Use em laudos/exames colados. Em ditado/texto livre use `labels: false`
 *   (só mascara números), porque "Paciente: refere dor…" é conteúdo clínico.
 */
export function scrubPII(input: string, opts: { labels?: boolean } = {}): ScrubResult {
  const labels = opts.labels ?? true;
  let removedLines = 0;
  let masked = 0;
  const kept: string[] = [];
  for (const line of input.split(/\r?\n/)) {
    if (labels && ID_LABEL.test(line)) {
      removedLines++;
      continue;
    }
    let l = line;
    for (const re of [CPF, CNS, CPF_RAW, PHONE]) {
      l = l.replace(re, () => {
        masked++;
        return '[removido]';
      });
    }
    kept.push(l);
  }
  return { text: kept.join('\n'), removedLines, masked };
}

/** Texto curto para avisar o usuário do que foi removido (ou null se nada). */
export function scrubNotice(r: Pick<ScrubResult, 'removedLines' | 'masked'>): string | null {
  const parts: string[] = [];
  if (r.removedLines) parts.push(`${r.removedLines} ${r.removedLines === 1 ? 'linha' : 'linhas'} com identificação`);
  if (r.masked) parts.push(`${r.masked} ${r.masked === 1 ? 'número' : 'números'} de documento/telefone`);
  return parts.length ? `Removemos ${parts.join(' e ')} (LGPD).` : null;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Troca iniciais e leito por marcadores antes de enviar à IA.
 * `restore` devolve os valores reais no texto que a IA respondeu.
 */
export function maskIdentity(text: string, ids: { initials?: string; bed?: string }) {
  let out = text;
  const initials = ids.initials?.trim();
  const bed = ids.bed?.trim();
  if (bed) out = out.replace(new RegExp(`(leito\\s*)${escapeRe(bed)}\\b`, 'gi'), '$1[LEITO]');
  if (initials && initials.length >= 2) {
    // "J.A.S." ou "JAS": só como palavra inteira, sem diferenciar maiúsculas
    out = out.replace(new RegExp(`(^|[^\\p{L}])${escapeRe(initials)}(?![\\p{L}])`, 'giu'), '$1[INICIAIS]');
  }
  const restore = (s: string) =>
    s.replace(/\[INICIAIS\]/g, initials ?? '').replace(/\[LEITO\]/g, bed ?? '');
  /** true se a resposta manteve todos os marcadores que foram enviados. */
  const intact = (s: string) =>
    (!out.includes('[INICIAIS]') || s.includes('[INICIAIS]')) && (!out.includes('[LEITO]') || s.includes('[LEITO]'));
  return { text: out, restore, intact };
}
