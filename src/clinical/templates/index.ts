import type { ComplaintTemplate } from '../types';
import { normalize } from '../../lib/format';
import { dorToracica } from './dorToracica';
import { dispneia } from './dispneia';
import { dorAbdominal } from './dorAbdominal';
import { cefaleia } from './cefaleia';
import { febre } from './febre';
import { sincope } from './sincope';
import { lombalgia } from './lombalgia';
import { tosse } from './tosse';
import { diarreia } from './diarreia';
import { palpitacoes } from './palpitacoes';
import { tontura } from './tontura';
import { edema } from './edema';
import { disuria } from './disuria';
import { deficitNeurologico } from './deficitNeurologico';
import { outra } from './outra';

/* ==========================================================================
   BIBLIOTECA DE TEMPLATES POR QUEIXA
   Para criar um template novo: copie um arquivo desta pasta, ajuste e
   adicione aqui na lista TEMPLATES.
   ========================================================================== */

export const TEMPLATES: ComplaintTemplate[] = [
  dorToracica,
  dispneia,
  dorAbdominal,
  cefaleia,
  febre,
  sincope,
  lombalgia,
  tosse,
  diarreia,
  palpitacoes,
  tontura,
  edema,
  disuria,
  deficitNeurologico,
  outra,
];

export const TEMPLATE_BY_ID: Record<string, ComplaintTemplate> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

export const GENERIC_TEMPLATE_ID = 'outra';

/** Sugere o template a partir do texto da queixa (offline, por palavras-chave). */
export function suggestTemplate(complaint: string): ComplaintTemplate | undefined {
  const text = normalize(complaint);
  if (!text) return undefined;
  let best: { t: ComplaintTemplate; score: number } | undefined;
  for (const t of TEMPLATES) {
    const score = t.keywords.reduce((acc, k) => (text.includes(normalize(k)) ? acc + normalize(k).length : acc), 0);
    if (score > 0 && (!best || score > best.score)) best = { t, score };
  }
  return best?.t;
}

export function getTemplate(id: string | undefined): ComplaintTemplate {
  return (id && TEMPLATE_BY_ID[id]) || TEMPLATE_BY_ID[GENERIC_TEMPLATE_ID];
}
