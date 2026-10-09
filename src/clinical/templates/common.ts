import type { BodyMapValue, Option, Question, QuestionContext, QuestionSection } from '../types';
import { describeRegions } from '../bodyRegions';
import { joinPt, lowerFirst } from '../../lib/format';
import { symptomOptions } from '../symptoms';

/* ==========================================================================
   PERGUNTAS REUTILIZÁVEIS DA HDA (semiologia)
   --------------------------------------------------------------------------
   Os templates de queixa montam suas seções com estas peças. Cada função
   devolve uma Question pronta, com o "por que perguntar?" e a frase para o
   prontuário.
   ========================================================================== */

/** Atalho: lista de rótulos das opções escolhidas, em minúsculas. */
export function labelsOf(options: Option[] | undefined, value: unknown): string[] {
  const vals = Array.isArray(value) ? value : value ? [value] : [];
  return vals.map((v) => {
    const o = options?.find((x) => x.value === v);
    return o?.text ?? lowerFirst(o?.label ?? String(v));
  });
}

/** Atalho para opções: opt('subito', 'Súbito') ; opt('x', 'Rótulo', 'red', 'texto no prontuário') */
export const opt = (value: string, label: string, flag?: 'red' | 'orange', text?: string): Option => ({
  value,
  label,
  flag,
  text,
});

export function onsetQ(options?: Option[]): Question {
  const opts = options ?? [opt('subito', 'Súbito', undefined, 'súbito'), opt('insidioso', 'Gradual / insidioso', undefined, 'insidioso')];
  return {
    id: 'inicio',
    label: 'Como começou?',
    type: 'single',
    options: opts,
    short: 'Início',
    narrative: (v) => `de início ${labelsOf(opts, v)[0]}`,
    why: {
      reason:
        'O modo de instalação aponta o mecanismo: início súbito (segundos a minutos) sugere evento vascular (oclusão, ruptura, dissecção), embolia, perfuração de víscera ou arritmia; início insidioso sugere processo inflamatório, infeccioso, degenerativo ou neoplásico.',
      impact:
        'Súbito → priorize afastar causas ameaçadoras à vida (SCA, dissecção de aorta, TEP, pneumotórax, HSA). Insidioso → amplie o diferencial para causas inflamatórias e infecciosas.',
      refs: ['porto-semiologia', 'bates'],
    },
  };
}

export function locationQ(view: 'full' | 'head' = 'full'): Question {
  return {
    id: 'localizacao',
    label: 'Onde dói? E para onde irradia?',
    hint: 'Toque no corpo. Use “Irradiação” para marcar para onde a dor se espalha.',
    type: 'bodymap',
    bodyView: view,
    short: 'Localização',
    narrative: (v) => {
      const b = v as BodyMapValue;
      const parts: string[] = [];
      if (b.location?.length) parts.push(`localizada em ${joinPt(describeRegions(b.location))}`);
      if (b.radiation?.length) parts.push(`com irradiação para ${joinPt(describeRegions(b.radiation))}`);
      else if (b.noRadiation) parts.push('sem irradiação');
      return parts.join(', ') || null;
    },
    why: {
      reason:
        'A topografia indica o órgão de origem. Dor visceral é mal localizada e tende à linha média; dor somática/parietal é bem localizada. A irradiação segue os dermátomos que compartilham inervação com a víscera.',
      impact:
        'Ex.: retroesternal irradiando para membro superior esquerdo/mandíbula → isquemia miocárdica; dorso interescapular → dissecção de aorta; ombro direito → irritação diafragmática ou vesícula; em faixa para o dorso → pâncreas; flanco irradiando para região inguinal → cólica nefrética.',
      refs: ['porto-semiologia'],
    },
  };
}

export function characterQ(options: Option[], id = 'carater'): Question {
  return {
    id,
    label: 'Como é a dor? (caráter)',
    type: 'multi',
    options,
    short: 'Caráter',
    // Use `text` nas opções com a frase pronta: 'em aperto', 'tipo cólica', 'lancinante'…
    narrative: (v) => joinPt(labelsOf(options, v)),
    why: {
      reason:
        'O tipo de dor reflete o mecanismo: aperto/peso (isquemia visceral), queimação (agressão ácida, neuropática), pontada (pleura/parede), cólica (víscera oca obstruída), latejante (vascular), rasgando (dissecção).',
      impact: 'Cada caráter abre um ramo diferente de investigação nesta anamnese.',
      refs: ['porto-semiologia'],
    },
  };
}

export function intensityQ(): Question {
  return {
    id: 'intensidade',
    label: 'Intensidade (0 a 10)',
    type: 'scale',
    min: 0,
    max: 10,
    short: 'Intensidade',
    narrative: (v) => `de intensidade ${v}/10`,
    why: {
      reason:
        'Quantifica a dor e permite comparar a resposta à analgesia. Dor desproporcional ao exame físico é sinal de alarme (isquemia mesentérica, síndrome compartimental).',
      impact:
        'Dor ≥ 7/10 → analgesia prioritária e reavaliação. A intensidade isolada não descarta nem confirma gravidade.',
    },
  };
}

export function episodeDurationQ(options?: Option[]): Question {
  const opts = options ?? [
    opt('segundos', 'Segundos'),
    opt('min_curtos', 'Até 20 minutos'),
    opt('min_longos', 'Mais de 20 minutos', 'orange'),
    opt('horas', 'Horas'),
    opt('continua', 'Contínua'),
  ];
  return {
    id: 'duracao_episodio',
    label: 'Quanto dura cada episódio?',
    type: 'single',
    options: opts,
    short: 'Duração dos episódios',
    narrative: (v) => {
      const l = labelsOf(opts, v)[0];
      return v === 'continua' ? 'contínua' : `com episódios de duração de ${l}`;
    },
    why: {
      reason:
        'A duração diferencia síndromes: angina estável dura tipicamente de 2 a 10 minutos; dor isquêmica em repouso por mais de 20 minutos sugere síndrome coronariana aguda; dor de segundos sugere causa musculoesquelética ou neuropática.',
      impact: 'Episódio > 20 min em repouso → tratar como possível SCA até prova em contrário.',
      refs: ['sbc-sca-2021'],
    },
  };
}

export function frequencyQ(): Question {
  const opts = [
    opt('unico', 'Episódio único'),
    opt('intermitente', 'Vai e volta (intermitente)'),
    opt('continua', 'Contínua'),
  ];
  return {
    id: 'frequencia',
    label: 'Frequência',
    type: 'single',
    options: opts,
    short: 'Frequência',
    extra: true,
    narrative: (v) => (v === 'unico' ? 'em episódio único' : v === 'continua' ? 'de padrão contínuo' : 'de padrão intermitente'),
  };
}

export function worseQ(options: Option[]): Question {
  return {
    id: 'piora',
    label: 'O que piora?',
    type: 'multi',
    options,
    short: 'Fatores de piora',
    narrative: (v) => `com piora ${joinPt(labelsOf(options, v).map(prepAo))}`,
    why: {
      reason:
        'Fatores de piora revelam o mecanismo: esforço (isquemia), inspiração profunda (pleura/pericárdio), decúbito (refluxo, pericardite, congestão), alimentação (úlcera, vesícula), movimento ou palpação (parede torácica/musculoesquelético).',
      impact: 'Algumas respostas abrem ramos específicos logo abaixo.',
    },
  };
}

export function betterQ(options: Option[]): Question {
  return {
    id: 'melhora',
    label: 'O que melhora?',
    type: 'multi',
    options,
    short: 'Fatores de melhora',
    narrative: (v) => {
      const labels = labelsOf(options, v);
      if (labels.length === 1 && /nada/.test(labels[0])) return 'sem fatores de melhora';
      return `com melhora ${joinPt(labels.filter((l) => !/nada/.test(l)).map(prepAo))}`;
    },
    why: {
      reason:
        'Fatores de alívio ajudam no diagnóstico, mas com cautela: melhora com nitrato não confirma isquemia (também alivia espasmo esofágico) e melhora com antiácido não descarta SCA.',
      impact: 'Use em conjunto com os demais achados, nunca de forma isolada.',
      refs: ['aha-dor-toracica-2021'],
    },
  };
}

/** "esforço" → "aos esforços"? Mantém simples: "com X". */
function prepAo(label: string): string {
  if (/^(ao|à|aos|às|com|em|no|na|durante|após|pela|pelo|sem)\b/.test(label)) return label;
  return `com ${label}`;
}

export function evolutionQ(): Question {
  const opts = [
    opt('piorando', 'Piorando'),
    opt('estavel', 'Estável'),
    opt('melhorando', 'Melhorando'),
    opt('flutuante', 'Flutuante'),
  ];
  return {
    id: 'evolucao',
    label: 'Como evoluiu desde o início?',
    type: 'single',
    options: opts,
    short: 'Evolução',
    narrative: (v) =>
      ({ piorando: 'com piora progressiva', estavel: 'de evolução estável', melhorando: 'em melhora', flutuante: 'de evolução flutuante' })[
        String(v)
      ],
    why: {
      reason: 'Piora progressiva pesa a favor de causa orgânica e potencialmente grave; padrão flutuante sugere causas funcionais ou recorrentes.',
      impact: 'Piora progressiva → menor limiar para exames e observação.',
    },
  };
}

export function associatedQ(symptomIds: string[], label = 'Sintomas associados'): Question {
  return {
    id: 'associados',
    label,
    hint: '1 toque = presente · 2 toques = nega · 3 toques = limpa',
    type: 'symptoms',
    options: symptomOptions(symptomIds),
    short: 'Sintomas associados',
    why: {
      reason:
        'Os sintomas que acompanham a queixa montam a síndrome clínica e revelam sinais de gravidade. Registrar os negativos pertinentes (“nega dispneia”) é tão importante quanto os positivos.',
      impact: 'Sintomas marcados aqui também aparecem no ISDA e alimentam as red flags e os escores.',
      refs: ['porto-semiologia'],
    },
  };
}

/** Seção final comum: tratamentos já tentados, episódios prévios, observações. */
export function finalSection(): QuestionSection {
  const resp = [opt('melhora', 'Melhorou'), opt('parcial', 'Melhora parcial'), opt('sem_melhora', 'Sem melhora')];
  return {
    id: 'tratamentos',
    title: 'Tratamentos e histórico',
    questions: [
      {
        id: 'tratamentos',
        label: 'Já usou alguma medicação ou tratamento para isso?',
        type: 'text',
        placeholder: 'Ex.: dipirona 1 g há 2 h',
        short: 'Tratamentos realizados',
        narrative: (v, c) => {
          const r = c.a('resposta_tratamento');
          const resp = r === 'melhora' ? ', com melhora' : r === 'parcial' ? ', com melhora parcial' : r === 'sem_melhora' ? ', sem melhora' : '';
          return `Fez uso de ${lowerFirst(String(v).replace(/[.\s]+$/, ''))}${resp}`;
        },
        why: {
          reason:
            'O que já foi tentado — e a resposta — orienta o diagnóstico e evita repetir medicações, superdosagem (ex.: paracetamol) ou interações.',
          impact: 'Falha de tratamento adequado prévio é sinal para reavaliar a hipótese.',
        },
      },
      {
        id: 'resposta_tratamento',
        label: 'Resposta ao tratamento',
        type: 'single',
        options: resp,
        short: 'Resposta',
        showIf: (c: QuestionContext) => !!c.a('tratamentos'),
        // a resposta entra na mesma frase de "tratamentos"
        narrative: () => null,
      },
      {
        id: 'episodios_previos',
        label: 'Já teve episódios semelhantes antes?',
        type: 'yesno',
        short: 'Episódios prévios',
        yesText: 'Refere episódios semelhantes prévios',
        noText: 'Nega episódios semelhantes prévios',
        extra: true,
      },
      {
        id: 'hda_obs',
        label: 'Outras informações da história',
        type: 'text',
        placeholder: 'Contexto, cronologia, impacto nas atividades…',
        narrative: (v) => String(v),
        extra: true,
      },
    ],
  };
}

/** Fatores de risco para tromboembolismo venoso — compartilhado entre templates. */
export const TEV_RISK_OPTIONS: Option[] = [
  opt('cirurgia_imob', 'Cirurgia ou imobilização nas últimas 4 semanas', 'orange'),
  opt('viagem', 'Viagem longa recente (> 4 h)'),
  opt('cancer', 'Câncer ativo (tratamento nos últimos 6 meses)', 'orange'),
  opt('tev_previo', 'TVP/TEP prévio', 'orange'),
  opt('estrogenio', 'Uso de estrogênio (anticoncepcional/TRH)'),
  opt('gestacao', 'Gestação ou puerpério'),
  opt('trombofilia', 'Trombofilia conhecida'),
];

export function tevRiskQ(): Question {
  return {
    id: 'tev_fr',
    label: 'Fatores de risco para trombose (TEV)',
    type: 'multi',
    options: TEV_RISK_OPTIONS,
    short: 'Fatores de risco para TEV',
    why: {
      reason:
        'Probabilidade pré-teste é o centro da investigação de TEP: os escores de Wells e a regra PERC usam esses fatores. Sem eles, não dá para escolher entre D-dímero e angiotomografia.',
      impact:
        'Wells baixo + PERC negativo → TEP praticamente afastado sem exames. Probabilidade intermediária → D-dímero. Alta → angiotomografia.',
      refs: ['aha-tep-2026', 'wells-tep-2000', 'perc-2004'],
    },
  };
}

/** Imunossupressão — compartilhado (febre, cefaleia, dispneia…). */
export const IMUNO_OPTIONS: Option[] = [
  opt('quimio', 'Quimioterapia nas últimas 6 semanas', 'red'),
  opt('hiv', 'HIV'),
  opt('transplante', 'Transplante'),
  opt('corticoide', 'Corticoide crônico/imunossupressor'),
  opt('asplenia', 'Asplenia'),
  opt('dm_desc', 'Diabetes descompensado'),
  opt('nenhuma', 'Nenhuma'),
];

export function imunoQ(): Question {
  return {
    id: 'imuno',
    label: 'Alguma imunossupressão?',
    type: 'multi',
    options: IMUNO_OPTIONS,
    short: 'Imunossupressão',
    narrative: (v) => {
      const vals = v as string[];
      if (vals.includes('nenhuma')) return 'Nega imunossupressão';
      return `Imunossupressão: ${joinPt(labelsOf(IMUNO_OPTIONS, vals))}`;
    },
    why: {
      reason:
        'Imunossuprimidos têm apresentação atípica (febre pode ser o único sinal) e infecções oportunistas. Quimioterapia recente + febre = possível neutropenia febril, uma emergência.',
      impact: 'Muda o limiar para exames (hemograma, culturas, imagem do SNC) e a urgência do antibiótico.',
      refs: ['idsa-neutropenia-2011'],
    },
  };
}

/** Uso de anticoagulante/antiagregante — compartilhado. */
export const ANTITHROMBOTIC_OPTIONS: Option[] = [
  opt('anticoagulante', 'Anticoagulante', 'orange'),
  opt('aas', 'AAS'),
  opt('antiagregante', 'Outro antiagregante (clopidogrel…)'),
  opt('aine', 'Anti-inflamatório (AINE)'),
  opt('corticoide', 'Corticoide'),
  opt('nenhum', 'Nenhum'),
];
