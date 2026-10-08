import type { ComplaintTemplate, QuestionContext } from '../types';
import { associatedQ, finalSection, labelsOf, opt } from './common';
import { joinPt } from '../../lib/format';

const reasonFrom = (items: Array<[boolean, string]>) =>
  `Aberto porque: ${joinPt(items.filter(([ok]) => ok).map(([, t]) => t))}.`;

const isCardiac = (c: QuestionContext) =>
  c.has('sin_circunstancia', 'esforco', 'deitado') ||
  c.has('sin_prodromo', 'palpitacoes', 'dor_toracica', 'nenhum') ||
  c.sym('palpitacoes') === 'sim' ||
  c.sym('dor_toracica') === 'sim';

const isSeizure = (c: QuestionContext) =>
  c.has('sin_testemunha', 'tonico_clonico') || c.has('sin_recuperacao', 'confusao') || c.has('sin_lingua', 'sim');

export const sincope: ComplaintTemplate = {
  id: 'sincope',
  name: 'Síncope',
  subject: 'Episódio',
  description: 'Reflexa × ortostática × cardíaca (alto risco da ESC), diferencial com crise convulsiva.',
  keywords: ['desmai', 'sincope', 'síncope', 'apag', 'perdeu os sentidos', 'perda de consciência', 'caiu'],
  systems: ['cardiovascular', 'neurologico'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'O episódio',
      prose: 'list',
      questions: [
        {
          id: 'sin_circunstancia',
          label: 'O que estava fazendo?',
          type: 'multi',
          options: [
            opt('em_pe', 'Em pé por muito tempo / calor', undefined, 'após ortostatismo prolongado/ambiente quente'),
            opt('levantar', 'Ao se levantar', undefined, 'ao se levantar'),
            opt('emocao', 'Dor, medo ou emoção forte', undefined, 'desencadeado por dor/emoção'),
            opt('situacional', 'Ao urinar, evacuar ou tossir', undefined, 'situacional (micção/evacuação/tosse)'),
            opt('esforco', 'Durante esforço físico', 'red', 'durante esforço físico'),
            opt('deitado', 'Deitado / em repouso', 'red', 'em decúbito'),
            opt('cabeca', 'Ao girar a cabeça / barbear', undefined, 'à rotação cervical'),
            opt('sem_relacao', 'Sem relação aparente', undefined, 'sem desencadeante aparente'),
          ],
          short: 'Circunstância',
          narrative: (v, _c, q) => `ocorrido ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason:
              'A circunstância é o dado mais útil da síncope: ortostatismo prolongado/calor/emoção sugere síncope reflexa (vasovagal); ao levantar, hipotensão ortostática; durante esforço ou deitado, causa cardíaca (arritmia, estenose aórtica).',
            impact: 'Síncope ao esforço ou em decúbito = característica de ALTO RISCO pela ESC → monitorização e investigação cardiológica.',
            refs: ['esc-sincope-2018'],
          },
        },
        {
          id: 'sin_prodromo',
          label: 'O que sentiu antes?',
          type: 'multi',
          options: [
            opt('calor', 'Calor, suor', undefined, 'calor e sudorese'),
            opt('nausea', 'Náusea', undefined, 'náusea'),
            opt('escurecimento', 'Visão escurecendo', undefined, 'escurecimento visual'),
            opt('palpitacoes', 'Palpitações', 'red', 'palpitações'),
            opt('dor_toracica', 'Dor no peito', 'red', 'dor torácica'),
            opt('dispneia', 'Falta de ar', 'orange', 'dispneia'),
            opt('cefaleia', 'Dor de cabeça súbita', 'red', 'cefaleia súbita'),
            opt('nenhum', 'Nada — sem aviso', 'red', 'nenhum pródromo'),
          ],
          short: 'Pródromos',
          narrative: (v, _c, q) =>
            (v as string[]).includes('nenhum') ? 'sem pródromos' : `precedido por ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Pródromos autonômicos (calor, náusea, sudorese, escurecimento visual) favorecem síncope reflexa. Palpitação antes do desmaio ou ausência de pródromo favorecem arritmia.',
            impact: 'Palpitação precedendo a síncope ou síncope sem pródromo → alto risco.',
            refs: ['esc-sincope-2018'],
          },
        },
        {
          id: 'sin_duracao',
          label: 'Quanto tempo ficou desacordado?',
          type: 'single',
          options: [
            opt('segundos', 'Segundos (< 1 min)', undefined, 'perda de consciência de segundos'),
            opt('1_5', '1 a 5 minutos', undefined, 'perda de consciência de 1 a 5 minutos'),
            opt('mais5', 'Mais de 5 minutos', 'orange', 'perda de consciência superior a 5 minutos'),
          ],
          short: 'Duração',
          narrative: (v, _c, q) => `com ${labelsOf(q.options, v)[0]}`,
        },
        {
          id: 'sin_testemunha',
          label: 'O que a testemunha viu?',
          type: 'multi',
          options: [
            opt('palidez', 'Palidez', undefined, 'palidez'),
            opt('abalos_breves', 'Abalos breves (< 15 s)', undefined, 'abalos breves'),
            opt('tonico_clonico', 'Movimentos tônico-clônicos prolongados', 'orange', 'movimentos tônico-clônicos prolongados'),
            opt('cianose', 'Cianose', undefined, 'cianose'),
            opt('urina', 'Perdeu urina', undefined, 'liberação esfincteriana'),
            opt('sem_testemunha', 'Ninguém viu', undefined, 'episódio não presenciado'),
          ],
          short: 'Relato de testemunha',
          narrative: (v, _c, q) =>
            (v as string[]).includes('sem_testemunha') ? 'episódio não presenciado' : `testemunha relata ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Abalos breves (mioclonias) são comuns na síncope e não indicam convulsão. Movimentos tônico-clônicos prolongados, mordedura lateral de língua e confusão pós-ictal sugerem crise epiléptica.',
            impact: 'Muda o eixo da investigação: cardiológico × neurológico.',
            refs: ['esc-sincope-2018'],
          },
        },
        {
          id: 'sin_recuperacao',
          label: 'Como foi a recuperação?',
          type: 'single',
          options: [
            opt('rapida', 'Rápida e completa', undefined, 'recuperação rápida e completa'),
            opt('confusao', 'Confusão por > 5 minutos', 'orange', 'confusão pós-evento prolongada'),
            opt('deficit', 'Ficou com fraqueza/alteração da fala', 'red', 'déficit neurológico persistente'),
          ],
          short: 'Recuperação',
          narrative: (v, _c, q) => `com ${labelsOf(q.options, v)[0]}`,
        },
        {
          id: 'sin_lingua',
          label: 'Mordeu a lateral da língua?',
          type: 'yesno',
          yesText: 'com mordedura lateral de língua',
          noText: 'sem mordedura de língua',
          extra: true,
        },
        {
          id: 'sin_trauma',
          label: 'Se machucou na queda?',
          type: 'yesno',
          yesText: 'com trauma na queda',
          noText: 'sem trauma associado',
        },
        {
          id: 'sin_previos',
          label: 'Quantos episódios antes deste?',
          type: 'number',
          unit: 'episódios',
          min: 0,
          max: 100,
          short: 'Episódios prévios',
          narrative: (v) => (Number(v) === 0 ? 'primeiro episódio' : `${v} episódio(s) prévio(s)`),
          extra: true,
        },
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ([
          'palpitacoes',
          'dor_toracica',
          'dispneia',
          'cefaleia',
          'deficit_motor',
          'alteracao_fala',
          'melena',
          'hematoquezia',
          'vomitos',
          'diarreia',
          'febre',
        ]),
      ],
    },
    {
      id: 'ramo_cardiaco',
      title: 'Ramo cardíaco (alto risco)',
      showIf: isCardiac,
      branch: {
        tone: 'red',
        reason: (c) =>
          reasonFrom([
            [c.has('sin_circunstancia', 'esforco'), 'síncope ao esforço'],
            [c.has('sin_circunstancia', 'deitado'), 'síncope em decúbito'],
            [c.has('sin_prodromo', 'palpitacoes') || c.sym('palpitacoes') === 'sim', 'palpitações'],
            [c.has('sin_prodromo', 'dor_toracica') || c.sym('dor_toracica') === 'sim', 'dor torácica'],
            [c.has('sin_prodromo', 'nenhum'), 'ausência de pródromos'],
          ]),
      },
      questions: [
        {
          id: 'car_cardiopatia',
          label: 'Tem alguma doença do coração?',
          type: 'multi',
          options: [
            opt('ic', 'Insuficiência cardíaca/FE reduzida', 'red', 'insuficiência cardíaca'),
            opt('dac', 'Infarto prévio/doença coronariana', 'red', 'doença coronariana'),
            opt('estenose', 'Valvopatia (estenose aórtica)', 'red', 'valvopatia'),
            opt('cmh', 'Cardiomiopatia hipertrófica', 'red', 'cardiomiopatia hipertrófica'),
            opt('arritmia', 'Arritmia/marca-passo/CDI', 'orange', 'arritmia conhecida/dispositivo'),
            opt('nenhuma', 'Nenhuma'),
          ],
          short: 'Cardiopatia',
          narrative: (v, _c, q) =>
            (v as string[]).includes('nenhuma') ? 'Nega cardiopatia conhecida' : `Cardiopatia conhecida: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Cardiopatia estrutural é o principal preditor de síncope arrítmica e morte súbita.',
            impact: 'Sim → alto risco: ECG, monitorização, ecocardiograma; considerar internação.',
            refs: ['esc-sincope-2018', 'sfsr-2004'],
          },
        },
        {
          id: 'car_hf_morte',
          label: 'Alguém da família morreu de repente antes dos 40 anos?',
          type: 'yesno',
          yesText: 'História familiar de morte súbita precoce',
          noText: 'Nega história familiar de morte súbita',
          why: {
            reason: 'Sugere canalopatias hereditárias (QT longo, Brugada) ou cardiomiopatia.',
            impact: 'Sim → olhar o ECG com atenção para QT, padrão de Brugada, pré-excitação.',
            refs: ['esc-sincope-2018'],
          },
        },
        {
          id: 'car_meds',
          label: 'Medicações que podem causar síncope',
          type: 'multi',
          extra: true,
          options: [
            opt('antihipertensivos', 'Anti-hipertensivos'),
            opt('diureticos', 'Diuréticos'),
            opt('antiarritmicos', 'Antiarrítmicos'),
            opt('qt', 'Remédios que prolongam QT'),
            opt('vasodilatadores', 'Nitrato/alfa-bloqueador'),
            opt('psicotropicos', 'Antidepressivo/antipsicótico'),
          ],
          short: 'Medicações relacionadas',
          narrative: (v, _c, q) => `Em uso de ${joinPt(labelsOf(q.options, v))}`,
        },
      ],
    },
    {
      id: 'ramo_ortostatico',
      title: 'Ramo ortostático / volume',
      showIf: (c) =>
        c.has('sin_circunstancia', 'levantar') || c.sym('melena') === 'sim' || c.sym('vomitos') === 'sim' || c.sym('diarreia') === 'sim',
      branch: { tone: 'orange', reason: () => 'Aberto porque: síncope ao levantar ou perdas volêmicas.' },
      questions: [
        {
          id: 'ort_volume',
          label: 'Causas de hipovolemia ou disautonomia',
          type: 'multi',
          options: [
            opt('gi', 'Vômitos/diarreia'),
            opt('sangramento', 'Sangramento', 'red'),
            opt('ingesta', 'Bebeu pouca água'),
            opt('diuretico', 'Diurético recente'),
            opt('disautonomia', 'Diabetes/Parkinson (disautonomia)'),
          ],
          short: 'Causas de hipotensão ortostática',
          narrative: (v, _c, q) => `Possíveis causas de hipotensão ortostática: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Hipotensão ortostática decorre de hipovolemia (perdas, sangramento oculto), drogas ou disautonomia.',
            impact: 'Medir PA deitado e em pé (queda ≥ 20/10 mmHg em 3 min). Sangramento oculto (melena) muda tudo.',
            refs: ['esc-sincope-2018'],
          },
        },
      ],
    },
    {
      id: 'ramo_convulsao',
      title: 'Ramo crise convulsiva',
      showIf: isSeizure,
      branch: { tone: 'orange', reason: () => 'Aberto porque: características sugestivas de crise epiléptica.' },
      questions: [
        {
          id: 'conv_epilepsia',
          label: 'Tem epilepsia ou usa anticonvulsivante?',
          type: 'yesno',
          yesText: 'Epilepsia conhecida/uso de anticonvulsivante',
          noText: 'Nega epilepsia',
        },
        {
          id: 'conv_aura',
          label: 'Sensação estranha antes (déjà-vu, cheiro estranho)?',
          type: 'yesno',
          yesText: 'Refere aura antes do evento',
          noText: 'Nega aura',
          extra: true,
        },
      ],
    },
    finalSection(),
  ],
};
