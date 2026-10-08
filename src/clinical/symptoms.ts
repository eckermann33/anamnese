import type { IsdaGroupId, Option } from './types';

/* ==========================================================================
   CATÁLOGO DE SINTOMAS
   --------------------------------------------------------------------------
   Cada sintoma tem um ID único. O MESMO ID é usado na HDA (sintomas
   associados), no ISDA e nas regras de red flags — então marcar "febre" na
   HDA já aparece marcado no ISDA, e vice-versa.

   `flag: 'red'` = sintoma de alarme (o chip fica vermelho quando presente).
   ========================================================================== */

export interface Symptom extends Option {
  group: IsdaGroupId;
  /** Texto para o prontuário, se diferente do rótulo. */
  text?: string;
}

const S = (group: IsdaGroupId, value: string, label: string, extra: Partial<Symptom> = {}): Symptom => ({
  group,
  value,
  label,
  ...extra,
});

export const SYMPTOMS: Symptom[] = [
  // Geral
  S('geral', 'febre', 'Febre'),
  S('geral', 'calafrios', 'Calafrios'),
  S('geral', 'sudorese_noturna', 'Sudorese noturna'),
  S('geral', 'perda_peso', 'Perda de peso', { text: 'perda ponderal' }),
  S('geral', 'ganho_peso', 'Ganho de peso', { text: 'ganho ponderal' }),
  S('geral', 'astenia', 'Cansaço/astenia', { text: 'astenia' }),
  S('geral', 'hiporexia', 'Falta de apetite', { text: 'hiporexia' }),

  // Pele
  S('dermatologico', 'prurido', 'Coceira', { text: 'prurido' }),
  S('dermatologico', 'exantema', 'Manchas/exantema', { text: 'exantema' }),
  S('dermatologico', 'urticaria', 'Urticária'),
  S('dermatologico', 'lesao_pele', 'Lesões de pele', { text: 'lesões cutâneas' }),
  S('dermatologico', 'feridas', 'Feridas que não cicatrizam', { text: 'feridas de difícil cicatrização' }),
  S('dermatologico', 'alopecia', 'Queda de cabelo', { text: 'alopecia' }),
  S('dermatologico', 'alteracao_nevo', 'Mudança em pinta', { text: 'alteração de nevo' }),

  // Olhos
  S('oftalmologico', 'baixa_acuidade', 'Baixa da visão', { text: 'baixa de acuidade visual' }),
  S('oftalmologico', 'perda_visual_subita', 'Perda visual súbita', { flag: 'red', text: 'perda visual súbita' }),
  S('oftalmologico', 'diplopia', 'Visão dupla', { text: 'diplopia' }),
  S('oftalmologico', 'olho_vermelho', 'Olho vermelho', { text: 'hiperemia ocular' }),
  S('oftalmologico', 'dor_ocular', 'Dor ocular'),
  S('oftalmologico', 'fotofobia', 'Fotofobia'),
  S('oftalmologico', 'escotomas', 'Escotomas/“pontos brilhantes”', { text: 'escotomas' }),

  // ORL
  S('otorrino', 'otalgia', 'Dor de ouvido', { text: 'otalgia' }),
  S('otorrino', 'otorreia', 'Secreção no ouvido', { text: 'otorreia' }),
  S('otorrino', 'hipoacusia', 'Diminuição da audição', { text: 'hipoacusia' }),
  S('otorrino', 'zumbido', 'Zumbido'),
  S('otorrino', 'dor_garganta', 'Dor de garganta', { text: 'odinofagia' }),
  S('otorrino', 'coriza', 'Coriza'),
  S('otorrino', 'obstrucao_nasal', 'Obstrução nasal'),
  S('otorrino', 'epistaxe', 'Sangramento nasal', { text: 'epistaxe' }),
  S('otorrino', 'rouquidao', 'Rouquidão'),

  // Cardiovascular
  S('cardiovascular', 'dor_toracica', 'Dor torácica'),
  S('cardiovascular', 'palpitacoes', 'Palpitações'),
  S('cardiovascular', 'dispneia_esforco', 'Falta de ar aos esforços', { text: 'dispneia aos esforços' }),
  S('cardiovascular', 'ortopneia', 'Ortopneia'),
  S('cardiovascular', 'dpn', 'Dispneia paroxística noturna'),
  S('cardiovascular', 'edema_mmii', 'Inchaço nas pernas', { text: 'edema de membros inferiores' }),
  S('cardiovascular', 'edema_unilateral', 'Dor/inchaço em uma panturrilha', { flag: 'orange', text: 'dor e edema unilateral de panturrilha' }),
  S('cardiovascular', 'sincope', 'Síncope', { flag: 'red' }),
  S('cardiovascular', 'pre_sincope', 'Pré-síncope/lipotimia', { text: 'pré-síncope' }),
  S('cardiovascular', 'sudorese', 'Sudorese (suor frio)', { text: 'sudorese' }),
  S('cardiovascular', 'claudicacao', 'Dor nas pernas ao caminhar', { text: 'claudicação intermitente' }),

  // Respiratório
  S('respiratorio', 'dispneia', 'Falta de ar', { text: 'dispneia' }),
  S('respiratorio', 'tosse', 'Tosse'),
  S('respiratorio', 'expectoracao', 'Catarro', { text: 'expectoração' }),
  S('respiratorio', 'hemoptise', 'Sangue na tosse', { flag: 'red', text: 'hemoptise' }),
  S('respiratorio', 'sibilancia', 'Chiado', { text: 'sibilância' }),
  S('respiratorio', 'dor_pleuritica', 'Dor ao respirar fundo', { text: 'dor ventilatório-dependente' }),
  S('respiratorio', 'roncos_apneia', 'Roncos/pausas no sono', { text: 'roncos e apneias noturnas' }),

  // Digestório
  S('digestorio', 'nauseas', 'Náuseas'),
  S('digestorio', 'vomitos', 'Vômitos'),
  S('digestorio', 'dor_abdominal', 'Dor abdominal'),
  S('digestorio', 'pirose', 'Azia/queimação', { text: 'pirose' }),
  S('digestorio', 'regurgitacao', 'Regurgitação'),
  S('digestorio', 'disfagia', 'Dificuldade para engolir', { text: 'disfagia' }),
  S('digestorio', 'diarreia', 'Diarreia'),
  S('digestorio', 'constipacao', 'Constipação'),
  S('digestorio', 'distensao', 'Distensão abdominal'),
  S('digestorio', 'parada_eliminacao', 'Parada de gases e fezes', { flag: 'red', text: 'parada de eliminação de flatos e fezes' }),
  S('digestorio', 'hematemese', 'Vômito com sangue', { flag: 'red', text: 'hematêmese' }),
  S('digestorio', 'melena', 'Fezes pretas', { flag: 'red', text: 'melena' }),
  S('digestorio', 'hematoquezia', 'Sangue vivo nas fezes', { flag: 'red', text: 'hematoquezia' }),
  S('digestorio', 'ictericia', 'Pele/olhos amarelos', { text: 'icterícia' }),
  S('digestorio', 'coluria', 'Urina escura', { text: 'colúria' }),
  S('digestorio', 'acolia', 'Fezes claras', { text: 'acolia fecal' }),

  // Geniturinário
  S('geniturinario', 'disuria', 'Ardência ao urinar', { text: 'disúria' }),
  S('geniturinario', 'polaciuria', 'Urinar muitas vezes', { text: 'polaciúria' }),
  S('geniturinario', 'urgencia', 'Urgência miccional'),
  S('geniturinario', 'hematuria', 'Sangue na urina', { text: 'hematúria' }),
  S('geniturinario', 'oliguria', 'Pouca urina', { text: 'oligúria' }),
  S('geniturinario', 'nocturia', 'Acordar para urinar', { text: 'noctúria' }),
  S('geniturinario', 'jato_fraco', 'Jato fraco/hesitação', { text: 'jato urinário fraco' }),
  S('geniturinario', 'retencao', 'Não consegue urinar', { flag: 'red', text: 'retenção urinária' }),
  S('geniturinario', 'incontinencia', 'Incontinência urinária'),
  S('geniturinario', 'dor_lombar', 'Dor lombar/flanco', { text: 'dor lombar' }),
  S('geniturinario', 'corrimento_uretral', 'Corrimento uretral'),
  S('geniturinario', 'lesao_genital', 'Lesão genital'),
  S('geniturinario', 'dor_testicular', 'Dor testicular', { flag: 'orange' }),

  // Ginecológico / obstétrico
  S('ginecologico', 'atraso_menstrual', 'Atraso menstrual'),
  S('ginecologico', 'sangramento_vaginal', 'Sangramento vaginal', { flag: 'orange' }),
  S('ginecologico', 'corrimento_vaginal', 'Corrimento vaginal'),
  S('ginecologico', 'dor_pelvica', 'Dor pélvica'),
  S('ginecologico', 'dismenorreia', 'Cólica menstrual', { text: 'dismenorreia' }),
  S('ginecologico', 'dispareunia', 'Dor na relação', { text: 'dispareunia' }),
  S('ginecologico', 'fogachos', 'Ondas de calor', { text: 'fogachos' }),
  S('ginecologico', 'nodulo_mamario', 'Nódulo na mama', { text: 'nódulo mamário' }),
  S('ginecologico', 'perda_liquido', 'Perda de líquido', { flag: 'orange', text: 'perda de líquido via vaginal' }),
  S('ginecologico', 'contracoes', 'Contrações'),
  S('ginecologico', 'mov_fetais_reduzidos', 'Bebê mexendo menos', { flag: 'red', text: 'redução de movimentos fetais' }),

  // Endócrino
  S('endocrino', 'poliuria', 'Urinar muito volume', { text: 'poliúria' }),
  S('endocrino', 'polidipsia', 'Muita sede', { text: 'polidipsia' }),
  S('endocrino', 'polifagia', 'Muita fome', { text: 'polifagia' }),
  S('endocrino', 'intolerancia_calor', 'Intolerância ao calor'),
  S('endocrino', 'intolerancia_frio', 'Intolerância ao frio'),
  S('endocrino', 'tremor_fino', 'Tremor fino'),

  // Hematológico
  S('hematologico', 'equimoses', 'Manchas roxas fáceis', { text: 'equimoses espontâneas' }),
  S('hematologico', 'gengivorragia', 'Sangramento na gengiva', { text: 'gengivorragia' }),
  S('hematologico', 'petequias', 'Pontinhos vermelhos na pele', { flag: 'orange', text: 'petéquias' }),
  S('hematologico', 'linfonodomegalia', 'Ínguas', { text: 'linfonodomegalias' }),
  S('hematologico', 'palidez', 'Palidez'),
  S('hematologico', 'infeccoes_recorrentes', 'Infecções de repetição'),

  // Musculoesquelético
  S('musculoesqueletico', 'artralgia', 'Dor nas articulações', { text: 'artralgia' }),
  S('musculoesqueletico', 'artrite', 'Inchaço articular', { text: 'edema articular' }),
  S('musculoesqueletico', 'rigidez_matinal', 'Rigidez matinal'),
  S('musculoesqueletico', 'mialgia', 'Dor muscular', { text: 'mialgia' }),
  S('musculoesqueletico', 'lombalgia', 'Dor nas costas', { text: 'lombalgia' }),
  S('musculoesqueletico', 'cervicalgia', 'Dor no pescoço', { text: 'cervicalgia' }),
  S('musculoesqueletico', 'trauma', 'Trauma/queda recente', { text: 'trauma recente' }),

  // Neurológico
  S('neurologico', 'cefaleia', 'Dor de cabeça', { text: 'cefaleia' }),
  S('neurologico', 'tontura', 'Tontura'),
  S('neurologico', 'vertigem', 'Vertigem (tudo girando)', { text: 'vertigem' }),
  S('neurologico', 'deficit_motor', 'Fraqueza em braço/perna', { flag: 'red', text: 'déficit motor' }),
  S('neurologico', 'alteracao_fala', 'Alteração da fala', { flag: 'red', text: 'alteração da fala' }),
  S('neurologico', 'desvio_rima', 'Boca torta', { flag: 'red', text: 'desvio de rima labial' }),
  S('neurologico', 'parestesia', 'Formigamento/dormência', { text: 'parestesias' }),
  S('neurologico', 'convulsao', 'Convulsão', { flag: 'red' }),
  S('neurologico', 'confusao', 'Confusão mental', { flag: 'red', text: 'confusão mental' }),
  S('neurologico', 'rigidez_nuca', 'Rigidez na nuca', { flag: 'red', text: 'rigidez de nuca' }),
  S('neurologico', 'desequilibrio', 'Desequilíbrio/marcha', { text: 'desequilíbrio' }),
  S('neurologico', 'tremor', 'Tremor'),
  S('neurologico', 'esquecimento', 'Esquecimento', { text: 'queixa de memória' }),
  S('neurologico', 'fonofobia', 'Incômodo com barulho', { text: 'fonofobia' }),

  // Psiquiátrico
  S('psiquiatrico', 'humor_deprimido', 'Tristeza/humor deprimido', { text: 'humor deprimido' }),
  S('psiquiatrico', 'anedonia', 'Perda de prazer', { text: 'anedonia' }),
  S('psiquiatrico', 'ansiedade', 'Ansiedade'),
  S('psiquiatrico', 'insonia', 'Insônia'),
  S('psiquiatrico', 'irritabilidade', 'Irritabilidade'),
  S('psiquiatrico', 'alucinacoes', 'Alucinações'),
  S('psiquiatrico', 'ideacao_suicida', 'Ideação suicida', { flag: 'red' }),
];

export const SYMPTOM_BY_ID: Record<string, Symptom> = Object.fromEntries(SYMPTOMS.map((s) => [s.value, s]));

export function symptomsOfGroup(group: IsdaGroupId): Symptom[] {
  return SYMPTOMS.filter((s) => s.group === group);
}

/** Texto do sintoma para o prontuário (minúsculo, técnico). */
export function symptomText(id: string): string {
  const s = SYMPTOM_BY_ID[id];
  if (!s) return id.replace(/_/g, ' ');
  return s.text ?? s.label.toLowerCase();
}

/** Monta opções de chips a partir de uma lista de IDs. */
export function symptomOptions(ids: string[]): Option[] {
  return ids.map((id) => {
    const s = SYMPTOM_BY_ID[id];
    if (!s) throw new Error(`Sintoma desconhecido: ${id}`);
    return { value: s.value, label: s.label, flag: s.flag };
  });
}
