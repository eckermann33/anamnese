import type { ComplaintTemplate, QuestionContext } from '../types';
import {
  associatedQ,
  betterQ,
  characterQ,
  episodeDurationQ,
  evolutionQ,
  finalSection,
  frequencyQ,
  intensityQ,
  labelsOf,
  locationQ,
  onsetQ,
  opt,
  tevRiskQ,
  worseQ,
} from './common';
import { joinPt } from '../../lib/format';

const CARATER = [
  opt('aperto', 'Aperto / opressão', undefined, 'em aperto'),
  opt('peso', 'Peso', undefined, 'em peso'),
  opt('queimacao', 'Queimação', undefined, 'em queimação'),
  opt('pontada', 'Pontada / facada', undefined, 'em pontada'),
  opt('rasgando', 'Rasgando / lacerante', 'red', 'lancinante (“rasgando”)'),
  opt('mal_definida', 'Difusa, mal definida', undefined, 'difusa e mal definida'),
];

const PIORA = [
  opt('esforco', 'Esforço físico', undefined, 'aos esforços'),
  opt('estresse', 'Estresse emocional', undefined, 'ao estresse emocional'),
  opt('inspiracao', 'Respirar fundo / tossir', undefined, 'à inspiração profunda e à tosse'),
  opt('decubito', 'Deitar de costas', undefined, 'ao decúbito dorsal'),
  opt('movimento', 'Mexer o tronco/braços', undefined, 'à movimentação do tronco'),
  opt('palpacao', 'Apertar o local', undefined, 'à palpação local'),
  opt('alimentacao', 'Comer', undefined, 'após alimentação'),
  opt('degluticao', 'Engolir', undefined, 'à deglutição'),
];

const MELHORA = [
  opt('repouso', 'Repouso', undefined, 'ao repouso'),
  opt('nitrato', 'Nitrato sublingual', undefined, 'com nitrato sublingual'),
  opt('inclinar', 'Sentar inclinado para frente', undefined, 'ao sentar com o tronco inclinado para frente'),
  opt('antiacido', 'Antiácido', undefined, 'com antiácido'),
  opt('analgesico', 'Analgésico', undefined, 'com analgésico'),
  opt('nada', 'Nada melhora', undefined, 'nada'),
];

const isAnginal = (c: QuestionContext) =>
  c.has('carater', 'aperto', 'peso') || c.has('piora', 'esforco', 'estresse') || c.has('melhora', 'repouso', 'nitrato');

const isPleuritic = (c: QuestionContext) =>
  c.has('piora', 'inspiracao') || c.has('carater', 'pontada') || c.sym('dor_pleuritica') === 'sim' || c.sym('hemoptise') === 'sim';

const isAortic = (c: QuestionContext) =>
  c.has('carater', 'rasgando') ||
  (c.has('inicio', 'subito') && (c.body('dorso', 'radiation') || c.body('dorso', 'location') || c.body('lombar')));

const isEsophageal = (c: QuestionContext) =>
  c.sym('pirose') === 'sim' ||
  c.sym('regurgitacao') === 'sim' ||
  c.sym('disfagia') === 'sim' ||
  c.has('piora', 'alimentacao', 'degluticao') ||
  c.has('melhora', 'antiacido');

const reasonFrom = (items: Array<[boolean, string]>) =>
  `Aberto porque: ${joinPt(items.filter(([ok]) => ok).map(([, t]) => t))}.`;

export const dorToracica: ComplaintTemplate = {
  id: 'dor_toracica',
  name: 'Dor torácica',
  subject: 'Dor',
  description: 'Diferencia isquêmica, pleurítica/pericárdica, aórtica, esofágica e de parede.',
  keywords: ['peito', 'torac', 'torác', 'precord', 'aperto no peito', 'dor no coração', 'retroestern'],
  systems: ['cardiovascular', 'respiratorio', 'digestorio', 'musculoesqueletico'],
  isPain: true,
  sections: [
    {
      id: 'semiologia',
      title: 'Semiologia da dor',
      prose: 'list',
      questions: [
        onsetQ(),
        locationQ('full'),
        characterQ(CARATER),
        intensityQ(),
        episodeDurationQ(),
        frequencyQ(),
        worseQ(PIORA),
        betterQ(MELHORA),
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ([
          'sudorese',
          'nauseas',
          'vomitos',
          'dispneia',
          'palpitacoes',
          'sincope',
          'pre_sincope',
          'tosse',
          'febre',
          'hemoptise',
          'edema_unilateral',
          'pirose',
          'regurgitacao',
          'disfagia',
        ]),
      ],
    },
    {
      id: 'ramo_anginoso',
      title: 'Ramo anginoso (isquêmico)',
      showIf: isAnginal,
      branch: {
        tone: 'red',
        reason: (c) =>
          reasonFrom([
            [c.has('carater', 'aperto', 'peso'), 'dor em aperto/peso'],
            [c.has('piora', 'esforco', 'estresse'), 'piora aos esforços/estresse'],
            [c.has('melhora', 'repouso', 'nitrato'), 'melhora com repouso/nitrato'],
          ]),
      },
      note: 'A diretriz AHA/ACC 2021 prefere “cardíaca / possivelmente cardíaca / não cardíaca” ao termo “atípica”, mas a classificação de Diamond-Forrester continua útil para estimar probabilidade pré-teste.',
      questions: [
        {
          id: 'dt_tipica',
          label: 'Quais características estão presentes?',
          type: 'multi',
          options: [
            opt('retroesternal', 'Desconforto retroesternal com caráter e duração típicos'),
            opt('esforco', 'Desencadeada por esforço ou estresse emocional'),
            opt('alivio', 'Aliviada por repouso ou nitrato em minutos'),
          ],
          short: 'Critérios de angina',
          computed: (c) => {
            const v = c.a('dt_tipica');
            if (!Array.isArray(v)) return null;
            const n = v.length;
            if (n === 3) return { text: 'Angina típica (3/3 critérios)', tone: 'red' };
            if (n === 2) return { text: 'Angina atípica (2/3 critérios)', tone: 'orange' };
            return { text: `Dor não anginosa (${n}/3 critérios)`, tone: 'accent' };
          },
          narrative: (v) => {
            const n = (v as string[]).length;
            const cls = n === 3 ? 'angina típica' : n === 2 ? 'angina atípica' : 'dor torácica não anginosa';
            return `Dor classificada como ${cls} (${n} de 3 critérios de Diamond-Forrester)`;
          },
          why: {
            reason:
              'Os 3 critérios clássicos (retroesternal típica, desencadeada por esforço/estresse, aliviada por repouso/nitrato) estimam a probabilidade pré-teste de doença coronariana junto com idade e sexo.',
            impact:
              '3 critérios = típica; 2 = atípica; ≤ 1 = não anginosa. Mas em SCA a apresentação pode ser atípica (idosos, mulheres, diabéticos) — o ECG em até 10 minutos é obrigatório de qualquer forma.',
            refs: ['sbc-sca-2021', 'aha-dor-toracica-2021'],
          },
        },
        {
          id: 'dt_padrao',
          label: 'Padrão temporal',
          type: 'single',
          options: [
            opt('estavel', 'Estável (mesmo padrão há > 2 meses)', undefined, 'padrão estável há mais de 2 meses'),
            opt('recente', 'Início recente (< 2 meses)', 'orange', 'início recente (menos de 2 meses)'),
            opt('crescendo', 'Em crescendo (mais frequente/intensa)', 'red', 'padrão em crescendo'),
            opt('repouso', 'Em repouso, > 20 minutos', 'red', 'dor em repouso com duração superior a 20 minutos'),
          ],
          short: 'Padrão',
          narrative: (v, _c, q) => `Apresenta ${labelsOf(q.options, v)[0]}`,
          why: {
            reason:
              'Angina instável = angina em repouso, de início recente ou em crescendo. É a forma de apresentação que separa doença coronariana crônica de síndrome coronariana aguda.',
            impact: 'Qualquer padrão instável → protocolo de dor torácica: ECG, troponina seriada e estratificação (HEART/GRACE).',
            refs: ['sbc-sca-2021', 'acc-aha-sca-2025'],
          },
        },
        {
          id: 'fr_cv',
          label: 'Fatores de risco cardiovascular',
          type: 'multi',
          options: [
            opt('has', 'Hipertensão', undefined, 'HAS'),
            opt('dm', 'Diabetes', undefined, 'DM'),
            opt('dlp', 'Dislipidemia'),
            opt('tabagismo', 'Tabagismo'),
            opt('obesidade', 'Obesidade'),
            opt('hf_dac', 'História familiar de DAC precoce', undefined, 'história familiar de DAC precoce'),
            opt('dac_previa', 'DAC prévia (IAM, stent, revascularização)', 'orange', 'DAC prévia'),
            opt('aterosclerose', 'AVC ou doença arterial periférica', undefined, 'doença aterosclerótica extracoronariana'),
            opt('drc', 'Doença renal crônica', undefined, 'DRC'),
          ],
          short: 'Fatores de risco cardiovascular',
          narrative: (v, _c, q) => `Fatores de risco cardiovascular: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason:
              'Fatores de risco aumentam a probabilidade pré-teste de doença coronariana e entram no escore HEART (componente “Risk factors”). Aterosclerose conhecida já pontua o máximo.',
            impact: 'HEART ≥ 4 → não é baixo risco: manter investigação. Muitos fatores de risco não substituem ECG/troponina.',
            refs: ['heart-2008', 'sbc-sca-2021'],
          },
        },
        {
          id: 'cocaina',
          label: 'Usou cocaína ou outro estimulante recentemente?',
          type: 'yesno',
          yesText: 'Refere uso recente de cocaína/estimulantes',
          noText: 'Nega uso de cocaína ou estimulantes',
          why: {
            reason: 'Cocaína causa vasoespasmo coronariano, trombose e dissecção de aorta, mesmo em jovens sem fatores de risco.',
            impact: 'Muda a conduta: evitar betabloqueador na fase aguda; benzodiazepínico para sintomas adrenérgicos.',
            refs: ['acc-aha-sca-2025'],
          },
        },
      ],
    },
    {
      id: 'ramo_pleuritico',
      title: 'Ramo pleurítico / pericárdico',
      showIf: isPleuritic,
      branch: {
        tone: 'orange',
        reason: (c) =>
          reasonFrom([
            [c.has('piora', 'inspiracao'), 'piora com inspiração/tosse'],
            [c.has('carater', 'pontada'), 'dor em pontada'],
            [c.sym('dor_pleuritica') === 'sim', 'dor ventilatório-dependente'],
            [c.sym('hemoptise') === 'sim', 'hemoptise'],
          ]),
      },
      questions: [
        {
          id: 'pericardite_posicao',
          label: 'Melhora ao sentar e inclinar o tronco para frente?',
          type: 'yesno',
          yesText: 'Refere melhora ao sentar com o tronco inclinado para frente',
          noText: 'Sem melhora com a posição sentada inclinada',
          why: {
            reason: 'Dor que melhora inclinando para frente e piora deitado é característica de pericardite.',
            impact: 'Sim → procurar atrito pericárdico no exame e supra de ST difuso com infra de PR no ECG.',
            refs: ['porto-semiologia'],
          },
        },
        {
          id: 'viral_recente',
          label: 'Teve gripe/infecção viral nas últimas semanas?',
          type: 'yesno',
          yesText: 'Refere quadro viral recente',
          noText: 'Nega quadro viral recente',
          extra: true,
        },
        tevRiskQ(),
        {
          id: 'trauma_toracico',
          label: 'Trauma no tórax recentemente?',
          type: 'yesno',
          yesText: 'Refere trauma torácico recente',
          noText: 'Nega trauma torácico',
        },
        {
          id: 'ptx_fr',
          label: 'Fatores para pneumotórax',
          type: 'multi',
          extra: true,
          options: [
            opt('tabagismo', 'Tabagismo'),
            opt('dpoc', 'DPOC/enfisema'),
            opt('longilineo', 'Jovem longilíneo'),
            opt('ptx_previo', 'Pneumotórax prévio'),
            opt('procedimento', 'Procedimento torácico recente'),
          ],
          short: 'Fatores para pneumotórax',
          why: {
            reason: 'Pneumotórax espontâneo primário ocorre em jovens longilíneos e tabagistas; o secundário, em DPOC. Procedimentos (acesso central, punção) causam pneumotórax iatrogênico.',
            impact: 'Procure MV abolido e hipertimpanismo; instabilidade + desvio de traqueia = pneumotórax hipertensivo (descompressão imediata).',
          },
        },
      ],
    },
    {
      id: 'ramo_aortico',
      title: 'Ramo aórtico (dissecção)',
      showIf: isAortic,
      branch: {
        tone: 'red',
        reason: (c) =>
          reasonFrom([
            [c.has('carater', 'rasgando'), 'dor lancinante (“rasgando”)'],
            [c.has('inicio', 'subito') && (c.body('dorso') || c.body('lombar')), 'início súbito com dor/irradiação para o dorso'],
          ]),
      },
      note: 'O ADD-RS (escore de detecção de dissecção) soma 3 categorias: condições de alto risco, características da dor e achados de exame.',
      questions: [
        {
          id: 'ao_max_inicio',
          label: 'A dor já começou na intensidade máxima?',
          type: 'yesno',
          yesText: 'Dor de intensidade máxima desde o início',
          noText: 'Dor sem pico máximo no início',
          why: {
            reason: 'Dor abrupta, de intensidade máxima no início, lancinante e migratória é a “característica de dor de alto risco” do ADD-RS.',
            impact: 'Com 1 categoria do ADD-RS presente, a dissecção precisa ser ativamente afastada (D-dímero/angiotomografia conforme risco).',
            refs: ['addrs-2011'],
          },
        },
        {
          id: 'ao_migracao',
          label: 'A dor migrou (tórax → dorso → abdome)?',
          type: 'yesno',
          yesText: 'Refere migração da dor',
          noText: 'Nega migração da dor',
        },
        {
          id: 'ao_condicoes',
          label: 'Condições de alto risco',
          type: 'multi',
          options: [
            opt('marfan', 'Marfan/doença do tecido conjuntivo', 'red'),
            opt('hf_aorta', 'História familiar de doença aórtica', 'red'),
            opt('valvopatia', 'Valvopatia aórtica conhecida', 'red'),
            opt('manipulacao', 'Cirurgia/manipulação aórtica recente', 'red'),
            opt('aneurisma', 'Aneurisma de aorta torácica conhecido', 'red'),
          ],
          short: 'Condições de alto risco para dissecção',
          why: {
            reason: 'Condições de alto risco formam a 1ª categoria do ADD-RS: doença do tecido conjuntivo, história familiar, valvopatia aórtica, manipulação recente ou aneurisma conhecido.',
            impact: 'Cada categoria presente soma 1 ponto no ADD-RS; ≥ 2 → angiotomografia de aorta.',
            refs: ['addrs-2011'],
          },
        },
        {
          id: 'ao_neuro',
          label: 'Teve déficit neurológico ou desmaio junto com a dor?',
          type: 'yesno',
          yesText: 'Refere déficit neurológico/síncope associados à dor',
          noText: 'Nega déficit neurológico ou síncope associados',
        },
      ],
    },
    {
      id: 'ramo_esofagico',
      title: 'Ramo esofágico / digestivo',
      showIf: isEsophageal,
      branch: {
        tone: 'accent',
        reason: (c) =>
          reasonFrom([
            [c.sym('pirose') === 'sim', 'pirose'],
            [c.sym('regurgitacao') === 'sim', 'regurgitação'],
            [c.sym('disfagia') === 'sim', 'disfagia'],
            [c.has('piora', 'alimentacao', 'degluticao'), 'relação com alimentação/deglutição'],
            [c.has('melhora', 'antiacido'), 'melhora com antiácido'],
          ]),
      },
      questions: [
        {
          id: 'es_relacao',
          label: 'Relação com a alimentação',
          type: 'single',
          options: [
            opt('durante', 'Durante a refeição', undefined, 'durante as refeições'),
            opt('apos', 'Logo após comer', undefined, 'logo após as refeições'),
            opt('jejum', 'Em jejum', undefined, 'em jejum'),
            opt('sem_relacao', 'Sem relação', undefined, 'sem relação com alimentação'),
          ],
          short: 'Relação com alimentação',
          narrative: (v) => `Dor ${({ durante: 'durante as refeições', apos: 'logo após as refeições', jejum: 'em jejum', sem_relacao: 'sem relação com a alimentação' } as Record<string, string>)[String(v)]}`,
        },
        {
          id: 'boerhaave',
          label: 'Vômitos intensos antes da dor?',
          type: 'yesno',
          yesText: 'Dor iniciada após vômitos intensos',
          noText: 'Nega vômitos intensos precedendo a dor',
          why: {
            reason: 'Dor torácica intensa após vômitos vigorosos sugere ruptura esofágica (síndrome de Boerhaave), com alta mortalidade se não tratada.',
            impact: 'Procurar enfisema subcutâneo; solicitar imagem com urgência.',
          },
        },
        {
          id: 'odinofagia',
          label: 'Dor para engolir (odinofagia)?',
          type: 'yesno',
          yesText: 'Refere odinofagia',
          noText: 'Nega odinofagia',
          extra: true,
        },
      ],
    },
    {
      id: 'ramo_parede',
      title: 'Ramo de parede torácica',
      showIf: (c) => c.has('piora', 'movimento', 'palpacao'),
      branch: {
        tone: 'accent',
        reason: () => 'Aberto porque: dor reproduzida por movimento ou palpação.',
      },
      note: 'Dor reproduzível à palpação reduz — mas não exclui — a chance de SCA.',
      questions: [
        {
          id: 'mu_esforco',
          label: 'Esforço físico incomum ou trauma recente?',
          type: 'yesno',
          yesText: 'Refere esforço físico/trauma recente',
          noText: 'Nega esforço físico incomum ou trauma',
        },
        {
          id: 'zoster',
          label: 'Lesões em faixa com bolhas no tórax?',
          type: 'yesno',
          yesText: 'Refere lesões vesiculares em faixa (sugestivo de herpes-zóster)',
          noText: 'Nega lesões cutâneas no tórax',
          extra: true,
        },
      ],
    },
    {
      id: 'ramo_palpitacoes',
      title: 'Ramo das palpitações',
      showIf: (c) => c.sym('palpitacoes') === 'sim',
      branch: { tone: 'orange', reason: () => 'Aberto porque: palpitações associadas.' },
      questions: [
        {
          id: 'palp_ritmo',
          label: 'As batidas eram regulares ou irregulares?',
          type: 'single',
          options: [opt('regular', 'Regulares'), opt('irregular', 'Irregulares'), opt('nao_sabe', 'Não sabe')],
          short: 'Ritmo das palpitações',
          why: {
            reason: 'Palpitações irregulares sugerem fibrilação atrial; regulares, de início e fim súbitos, sugerem taquicardia paroxística supraventricular.',
            impact: 'FA → avaliar CHA₂DS₂-VASc e anticoagulação. Taquicardia + dor torácica/síncope → monitorização e ECG imediato.',
            refs: ['esc-fa-2024'],
          },
        },
        {
          id: 'palp_inicio',
          label: 'Começam e terminam de repente?',
          type: 'yesno',
          yesText: 'Palpitações de início e término súbitos',
          noText: 'Palpitações de início e término graduais',
        },
      ],
    },
    finalSection(),
  ],
};
