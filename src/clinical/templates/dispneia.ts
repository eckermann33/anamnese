import type { ComplaintTemplate, QuestionContext } from '../types';
import { associatedQ, betterQ, evolutionQ, finalSection, imunoQ, labelsOf, onsetQ, opt, tevRiskQ, worseQ } from './common';
import { joinPt } from '../../lib/format';

const reasonFrom = (items: Array<[boolean, string]>) =>
  `Aberto porque: ${joinPt(items.filter(([ok]) => ok).map(([, t]) => t))}.`;

const isHeartFailure = (c: QuestionContext) =>
  c.sym('ortopneia') === 'sim' || c.sym('dpn') === 'sim' || c.sym('edema_mmii') === 'sim' || c.has('piora', 'decubito');

const isInfectious = (c: QuestionContext) =>
  c.sym('febre') === 'sim' || c.sym('expectoracao') === 'sim' || c.sym('tosse') === 'sim';

const isPE = (c: QuestionContext) =>
  c.has('inicio', 'subito') || c.sym('dor_pleuritica') === 'sim' || c.sym('hemoptise') === 'sim' || c.sym('edema_unilateral') === 'sim';

export const dispneia: ComplaintTemplate = {
  id: 'dispneia',
  name: 'Dispneia',
  subject: 'Dispneia',
  description: 'Separa causas cardíacas, infecciosas, broncoespasmo, TEP e via aérea alta.',
  keywords: ['falta de ar', 'dispneia', 'dispnéia', 'cansaço para respirar', 'sufoc', 'fôlego', 'folego', 'respirar'],
  systems: ['respiratorio', 'cardiovascular'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Caracterização',
      prose: 'list',
      questions: [
        onsetQ([
          opt('subito', 'Súbita (minutos)', 'orange', 'súbito'),
          opt('progressivo', 'Progressiva (horas a dias)', undefined, 'progressivo, em horas a dias'),
          opt('cronico', 'Crônica (semanas a meses)', undefined, 'insidioso, ao longo de semanas a meses'),
        ]),
        {
          id: 'dp_esforco',
          label: 'Com quanto esforço aparece?',
          type: 'single',
          options: [
            opt('grandes', 'Grandes esforços', undefined, 'aos grandes esforços'),
            opt('medios', 'Médios esforços', undefined, 'aos médios esforços'),
            opt('pequenos', 'Pequenos esforços', 'orange', 'aos pequenos esforços'),
            opt('repouso', 'Em repouso', 'red', 'em repouso'),
          ],
          short: 'Limiar de esforço',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason:
              'O limiar de esforço quantifica a gravidade e permite acompanhar a evolução (classe funcional NYHA na IC; mMRC na DPOC).',
            impact: 'Dispneia em repouso é critério de gravidade: avaliar SpO₂, trabalho respiratório e necessidade de suporte imediato.',
            refs: ['sbc-ic-2018'],
          },
        },
        {
          id: 'mmrc',
          label: 'Escala mMRC (dispneia crônica)',
          type: 'single',
          extra: true,
          showIf: (c) => c.has('inicio', 'cronico'),
          options: [
            opt('0', '0 — só com exercício intenso'),
            opt('1', '1 — ao subir ladeira ou andar rápido'),
            opt('2', '2 — anda mais devagar que pessoas da mesma idade'),
            opt('3', '3 — para após ~100 m no plano'),
            opt('4', '4 — não sai de casa / ao se vestir'),
          ],
          short: 'mMRC',
          narrative: (v) => `mMRC ${v}`,
        },
        worseQ([
          opt('decubito', 'Deitar', undefined, 'ao decúbito'),
          opt('esforco', 'Esforço', undefined, 'aos esforços'),
          opt('alergeno', 'Poeira/alérgenos/frio', undefined, 'à exposição a alérgenos/poeira/frio'),
          opt('noite', 'À noite/madrugada', undefined, 'à noite'),
          opt('infeccao', 'Após resfriado', undefined, 'após infecção de vias aéreas'),
        ]),
        betterQ([
          opt('repouso', 'Repouso', undefined, 'ao repouso'),
          opt('sentar', 'Sentar/elevar cabeceira', undefined, 'ao sentar'),
          opt('broncodilatador', 'Broncodilatador (“bombinha”)', undefined, 'com broncodilatador'),
          opt('diuretico', 'Diurético', undefined, 'com diurético'),
          opt('nada', 'Nada melhora', undefined, 'nada'),
        ]),
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ([
          'tosse',
          'expectoracao',
          'febre',
          'sibilancia',
          'dor_pleuritica',
          'dor_toracica',
          'hemoptise',
          'ortopneia',
          'dpn',
          'edema_mmii',
          'edema_unilateral',
          'palpitacoes',
          'ganho_peso',
          'sincope',
          'rouquidao',
          'urticaria',
        ]),
      ],
    },
    {
      id: 'ramo_ic',
      title: 'Ramo cardíaco (congestão)',
      showIf: isHeartFailure,
      branch: {
        tone: 'orange',
        reason: (c) =>
          reasonFrom([
            [c.sym('ortopneia') === 'sim', 'ortopneia'],
            [c.sym('dpn') === 'sim', 'dispneia paroxística noturna'],
            [c.sym('edema_mmii') === 'sim', 'edema de membros inferiores'],
            [c.has('piora', 'decubito'), 'piora ao deitar'],
          ]),
      },
      questions: [
        {
          id: 'ic_travesseiros',
          label: 'Quantos travesseiros usa para dormir?',
          type: 'number',
          unit: 'travesseiros',
          min: 0,
          max: 6,
          short: 'Travesseiros',
          narrative: (v) => `Dorme com ${v} travesseiro${Number(v) === 1 ? '' : 's'}`,
          why: {
            reason: 'Quantificar a ortopneia (nº de travesseiros) ajuda a acompanhar a congestão pulmonar ao longo dos dias.',
            impact: 'Aumento recente do nº de travesseiros sugere descompensação de IC.',
          },
        },
        {
          id: 'ic_previa',
          label: 'Tem insuficiência cardíaca conhecida?',
          type: 'single',
          options: [
            opt('nao', 'Não'),
            opt('fer', 'Sim — FE reduzida', undefined, 'IC com fração de ejeção reduzida'),
            opt('fep', 'Sim — FE preservada', undefined, 'IC com fração de ejeção preservada'),
            opt('desconhecida', 'Sim — FE desconhecida', undefined, 'IC com fração de ejeção desconhecida'),
          ],
          short: 'IC prévia',
          narrative: (v, _c, q) => (v === 'nao' ? 'Nega diagnóstico prévio de IC' : `Diagnóstico prévio de ${labelsOf(q.options, v)[0]}`),
        },
        {
          id: 'ic_precipitantes',
          label: 'Possíveis fatores de descompensação',
          type: 'multi',
          options: [
            opt('adesao', 'Má adesão às medicações'),
            opt('sal', 'Excesso de sal/líquidos'),
            opt('infeccao', 'Infecção'),
            opt('arritmia', 'Arritmia/palpitações'),
            opt('isquemia', 'Dor torácica (isquemia)'),
            opt('pa', 'PA descontrolada'),
            opt('aine', 'Uso de AINE/corticoide'),
            opt('renal', 'Piora da função renal'),
          ],
          short: 'Fatores de descompensação',
          narrative: (v, _c, q) => `Possíveis fatores de descompensação: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Toda IC descompensada tem um gatilho. Os mais comuns: má adesão, excesso de sal, infecção, arritmia (FA), isquemia, hipertensão e drogas (AINE).',
            impact: 'Identificar e tratar o fator precipitante é parte obrigatória da conduta.',
            refs: ['sbc-ic-2018'],
          },
        },
        {
          id: 'ic_nyha',
          label: 'Classe funcional (NYHA) antes desta piora',
          type: 'single',
          extra: true,
          options: [
            opt('I', 'I — sem limitação'),
            opt('II', 'II — limitação aos esforços habituais'),
            opt('III', 'III — limitação a esforços menores que os habituais'),
            opt('IV', 'IV — sintomas em repouso'),
          ],
          short: 'NYHA basal',
          narrative: (v) => `Classe funcional NYHA ${v} basal`,
        },
      ],
    },
    {
      id: 'ramo_infeccioso',
      title: 'Ramo infeccioso',
      showIf: isInfectious,
      branch: {
        tone: 'orange',
        reason: (c) =>
          reasonFrom([
            [c.sym('febre') === 'sim', 'febre'],
            [c.sym('tosse') === 'sim', 'tosse'],
            [c.sym('expectoracao') === 'sim', 'expectoração'],
          ]),
      },
      questions: [
        {
          id: 'escarro',
          label: 'Aspecto do escarro',
          type: 'single',
          showIf: (c) => c.sym('expectoracao') !== 'nao',
          options: [
            opt('mucoide', 'Claro/mucoide', undefined, 'mucoide'),
            opt('purulento', 'Amarelo/esverdeado', undefined, 'purulenta'),
            opt('hemoptoico', 'Com raias de sangue', 'orange', 'hemoptoica'),
            opt('ferruginoso', 'Cor de ferrugem', undefined, 'ferruginosa'),
          ],
          short: 'Aspecto da expectoração',
          narrative: (v, _c, q) => `Expectoração ${labelsOf(q.options, v)[0]}`,
          why: {
            reason: 'Expectoração purulenta sugere infecção bacteriana; ferruginosa é clássica de pneumococo; hemoptoica exige pensar em TB, neoplasia e TEP.',
            impact: 'Ajuda a decidir entre quadro viral e pneumonia bacteriana e a solicitar baciloscopia.',
            refs: ['sbpt-pac-2018'],
          },
        },
        {
          id: 'atb_recente',
          label: 'Usou antibiótico ou foi internado nos últimos 90 dias?',
          type: 'yesno',
          yesText: 'Uso de antibiótico/internação nos últimos 90 dias',
          noText: 'Nega antibiótico ou internação nos últimos 90 dias',
          why: {
            reason: 'Antibiótico ou internação recentes aumentam o risco de germes resistentes.',
            impact: 'Muda a escolha do antibiótico empírico.',
            refs: ['sbpt-pac-2018'],
          },
        },
        {
          id: 'aspiracao',
          label: 'Risco de broncoaspiração?',
          hint: 'Rebaixamento, disfagia, convulsão, etilismo, vômitos',
          type: 'yesno',
          yesText: 'Apresenta fatores de risco para broncoaspiração',
          noText: 'Sem fatores de risco para broncoaspiração',
          extra: true,
        },
        {
          id: 'tb_sintomas',
          label: 'Tosse há ≥ 3 semanas, sudorese noturna ou perda de peso?',
          type: 'yesno',
          yesText: 'Tosse crônica e/ou sintomas constitucionais (investigar tuberculose)',
          noText: 'Sem sintomas sugestivos de tuberculose',
          why: {
            reason: 'No Brasil, todo sintomático respiratório (tosse ≥ 3 semanas) deve ser investigado para tuberculose.',
            impact: 'Sim → baciloscopia/teste rápido molecular e isolamento respiratório se internado.',
          },
        },
        imunoQ(),
      ],
    },
    {
      id: 'ramo_broncoespasmo',
      title: 'Ramo broncoespasmo',
      showIf: (c) => c.sym('sibilancia') === 'sim',
      branch: { tone: 'orange', reason: () => 'Aberto porque: sibilância.' },
      questions: [
        {
          id: 'bro_base',
          label: 'Doença de base',
          type: 'single',
          options: [opt('asma', 'Asma', undefined, 'asma'), opt('dpoc', 'DPOC', undefined, 'DPOC'), opt('nenhuma', 'Nenhuma conhecida')],
          short: 'Doença de base',
          narrative: (v, _c, q) => (v === 'nenhuma' ? 'Sem doença pulmonar obstrutiva conhecida' : `Portador de ${labelsOf(q.options, v)[0]}`),
        },
        {
          id: 'bro_fala',
          label: 'Consegue falar…',
          type: 'single',
          options: [
            opt('frases', 'Frases completas', undefined, 'frases completas'),
            opt('palavras', 'Frases curtas ou palavras', 'orange', 'apenas frases curtas/palavras'),
            opt('nao', 'Não consegue falar', 'red', 'não consegue falar'),
          ],
          short: 'Fala',
          narrative: (v, _c, q) => `Fala: ${labelsOf(q.options, v)[0]}`,
          why: {
            reason: 'A capacidade de falar é um marcador rápido de gravidade da crise de asma/DPOC.',
            impact: 'Fala em palavras → crise grave; não fala/sonolência → risco de parada respiratória (crise muito grave).',
            refs: ['sbpt-asma-2020'],
          },
        },
        {
          id: 'bro_resgate',
          label: 'Jatos de broncodilatador nas últimas 24 h',
          type: 'number',
          unit: 'jatos',
          min: 0,
          max: 100,
          short: 'Uso de resgate (24 h)',
          narrative: (v) => `Usou ${v} jatos de broncodilatador de resgate nas últimas 24 h`,
        },
        {
          id: 'bro_gatilhos',
          label: 'Gatilhos',
          type: 'multi',
          extra: true,
          options: [
            opt('viral', 'Infecção viral'),
            opt('alergenos', 'Alérgenos/poeira/mofo'),
            opt('frio', 'Frio'),
            opt('exercicio', 'Exercício'),
            opt('fumaca', 'Fumaça'),
            opt('aine', 'AAS/AINE'),
            opt('betabloqueador', 'Betabloqueador'),
            opt('suspensao', 'Parou o tratamento'),
          ],
          short: 'Gatilhos',
          narrative: (v, _c, q) => `Gatilhos: ${joinPt(labelsOf(q.options, v))}`,
        },
        {
          id: 'bro_iot',
          label: 'Já precisou de UTI ou intubação por crise?',
          type: 'yesno',
          yesText: 'Refere internação em UTI/intubação prévia por crise',
          noText: 'Nega UTI/intubação prévia por crise',
          why: {
            reason: 'Intubação ou UTI prévia por asma é o principal fator de risco para crise fatal.',
            impact: 'Sim → menor limiar para internação e observação prolongada.',
            refs: ['sbpt-asma-2020'],
          },
        },
      ],
    },
    {
      id: 'ramo_tep',
      title: 'Ramo tromboembolismo pulmonar',
      showIf: isPE,
      branch: {
        tone: 'red',
        reason: (c) =>
          reasonFrom([
            [c.has('inicio', 'subito'), 'início súbito'],
            [c.sym('dor_pleuritica') === 'sim', 'dor pleurítica'],
            [c.sym('hemoptise') === 'sim', 'hemoptise'],
            [c.sym('edema_unilateral') === 'sim', 'dor/edema unilateral de panturrilha'],
          ]),
      },
      questions: [
        tevRiskQ(),
        {
          id: 'tep_alternativo',
          label: 'Outro diagnóstico é mais provável que TEP?',
          type: 'yesno',
          yesText: 'Diagnóstico alternativo mais provável que TEP',
          noText: 'TEP é o diagnóstico mais provável ou igualmente provável',
          why: {
            reason: '“TEP como diagnóstico mais provável” vale 3 pontos no escore de Wells — é o item de maior peso.',
            impact: 'Se nenhum outro diagnóstico explica melhor o quadro, a probabilidade pré-teste sobe bastante.',
            refs: ['wells-tep-2000'],
          },
        },
      ],
    },
    {
      id: 'ramo_via_aerea',
      title: 'Ramo via aérea alta / anafilaxia',
      showIf: (c) => c.sym('urticaria') === 'sim' || c.sym('rouquidao') === 'sim' || c.has('piora', 'alergeno'),
      branch: { tone: 'red', reason: () => 'Aberto porque: urticária, rouquidão ou exposição a alérgeno.' },
      questions: [
        {
          id: 'ana_exposicao',
          label: 'Exposição recente a alérgeno (alimento, remédio, picada)?',
          type: 'yesno',
          yesText: 'Refere exposição recente a possível alérgeno',
          noText: 'Nega exposição a alérgenos',
        },
        {
          id: 'ana_edema',
          label: 'Inchaço de lábios, língua ou garganta?',
          type: 'yesno',
          yesText: 'Refere edema de lábios/língua/orofaringe',
          noText: 'Nega edema de lábios, língua ou orofaringe',
          why: {
            reason: 'Angioedema com dispneia/estridor após exposição a alérgeno = anafilaxia até prova em contrário.',
            impact: 'Adrenalina IM imediata é o tratamento de primeira linha (conferir dose).',
          },
        },
        {
          id: 'corpo_estranho',
          label: 'Engasgo ou aspiração de corpo estranho?',
          type: 'yesno',
          yesText: 'Refere engasgo/possível aspiração de corpo estranho',
          noText: 'Nega engasgo',
          extra: true,
        },
      ],
    },
    finalSection(),
  ],
};
