import type { IsdaGroupId, SystemId, SystemInfo } from './types';
import { normalize } from '../lib/format';

/* Os 13 sistemas do direcionamento, na ordem padrão de exibição. */
export const SYSTEMS: SystemInfo[] = [
  {
    id: 'cardiovascular',
    label: 'Cardiovascular',
    short: 'CV',
    examAbbr: 'ACV',
    keywords: ['peito', 'torac', 'precord', 'palpita', 'coração', 'coracao', 'pressão', 'pressao', 'inchaço', 'edema', 'desmaio', 'sincope', 'síncope', 'falta de ar'],
  },
  {
    id: 'respiratorio',
    label: 'Respiratório',
    short: 'Resp',
    examAbbr: 'AR',
    keywords: ['falta de ar', 'dispneia', 'cansaço', 'tosse', 'catarro', 'chiado', 'pulm', 'escarro', 'sangue na tosse', 'hemoptise'],
  },
  {
    id: 'digestorio',
    label: 'Digestório',
    short: 'GI',
    examAbbr: 'ABD',
    keywords: ['barriga', 'abdom', 'estômago', 'estomago', 'vômito', 'vomito', 'náusea', 'nausea', 'enjoo', 'diarreia', 'diarréia', 'intestino', 'fezes', 'azia', 'queimação', 'amarel', 'icter'],
  },
  {
    id: 'geniturinario',
    label: 'Geniturinário',
    short: 'GU',
    examAbbr: 'GU',
    keywords: ['urina', 'xixi', 'ardência', 'ardencia', 'disúria', 'disuria', 'rim', 'lombar', 'testículo', 'testiculo', 'pênis', 'penis', 'sangue na urina'],
  },
  {
    id: 'neurologico',
    label: 'Neurológico',
    short: 'Neuro',
    examAbbr: 'Neuro',
    keywords: ['cabeça', 'cabeca', 'cefaleia', 'tontura', 'vertigem', 'fraqueza', 'formigamento', 'convuls', 'desmaio', 'fala', 'boca torta', 'confus', 'esquec'],
  },
  {
    id: 'musculoesqueletico',
    label: 'Musculoesquelético',
    short: 'ME',
    examAbbr: 'ME',
    keywords: ['costas', 'coluna', 'lombar', 'junta', 'articula', 'joelho', 'ombro', 'músculo', 'musculo', 'queda', 'trauma', 'fratura'],
  },
  {
    id: 'endocrino',
    label: 'Endócrino',
    short: 'Endo',
    examAbbr: 'Endo',
    keywords: ['açúcar', 'acucar', 'diabetes', 'glicose', 'tireoide', 'tireóide', 'sede', 'emagreci', 'engord'],
  },
  {
    id: 'hematologico',
    label: 'Hematológico',
    short: 'Hemato',
    examAbbr: 'Linf/Hemato',
    keywords: ['anemia', 'sangramento', 'roxo', 'manchas roxas', 'íngua', 'ingua', 'gânglio', 'ganglio', 'palidez'],
  },
  {
    id: 'dermatologico',
    label: 'Dermatológico',
    short: 'Derm',
    examAbbr: 'Pele',
    keywords: ['pele', 'mancha', 'coceira', 'prurido', 'ferida', 'alergia', 'urticária', 'urticaria', 'vermelhid', 'bolha'],
  },
  {
    id: 'psiquiatrico',
    label: 'Psiquiátrico',
    short: 'Psiq',
    examAbbr: 'EEM',
    keywords: ['ansiedade', 'triste', 'depress', 'insônia', 'insonia', 'nervos', 'pânico', 'panico', 'vozes', 'suicíd', 'suicid', 'agitad'],
  },
  {
    id: 'ginecologico',
    label: 'Ginecológico/Obstétrico',
    short: 'GO',
    examAbbr: 'GO',
    keywords: ['menstru', 'gravid', 'gestante', 'grávida', 'gravida', 'sangramento vaginal', 'corrimento', 'pélvic', 'pelvic', 'mama', 'contração', 'contracao', 'bolsa'],
  },
  {
    id: 'otorrino',
    label: 'Otorrinolaringológico',
    short: 'ORL',
    examAbbr: 'ORL',
    keywords: ['ouvido', 'garganta', 'nariz', 'coriza', 'sinus', 'rouquid', 'zumbido', 'surdez', 'amígdala', 'amigdala'],
  },
  {
    id: 'oftalmologico',
    label: 'Oftalmológico',
    short: 'Oftalmo',
    examAbbr: 'Oftalmo',
    keywords: ['olho', 'visão', 'visao', 'enxerg', 'vista', 'conjuntiv', 'diplopia'],
  },
];

export const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, SystemInfo>;

export const ISDA_GROUP_LABEL: Record<IsdaGroupId, string> = {
  geral: 'Geral',
  ...(Object.fromEntries(SYSTEMS.map((s) => [s.id, s.label])) as Record<SystemId, string>),
};

/** Ordem tradicional do ISDA (geral primeiro). */
export const ISDA_ORDER: IsdaGroupId[] = [
  'geral',
  'dermatologico',
  'oftalmologico',
  'otorrino',
  'cardiovascular',
  'respiratorio',
  'digestorio',
  'geniturinario',
  'ginecologico',
  'endocrino',
  'hematologico',
  'musculoesqueletico',
  'neurologico',
  'psiquiatrico',
];

/**
 * Sugestão OFFLINE de sistemas a partir da queixa (palavras-chave).
 * A IA faz melhor, mas isso garante uma sugestão instantânea sem internet.
 */
export function suggestSystemsLocally(complaint: string): SystemId[] {
  const text = normalize(complaint);
  if (!text) return [];
  const scored = SYSTEMS.map((s) => ({
    id: s.id,
    score: s.keywords.reduce((acc, k) => (text.includes(normalize(k)) ? acc + 1 : acc), 0),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((s) => s.id);
}
