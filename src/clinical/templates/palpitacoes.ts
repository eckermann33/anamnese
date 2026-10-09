import type { ComplaintTemplate } from '../types';
import { ANTITHROMBOTIC_OPTIONS, associatedQ, episodeDurationQ, evolutionQ, finalSection, frequencyQ, labelsOf, opt } from './common';
import { joinPt } from '../../lib/format';

export const palpitacoes: ComplaintTemplate = {
  id: 'palpitacoes',
  name: 'Palpitações',
  subject: 'Palpitações',
  description: 'Ritmo e modo de início/término, gatilhos, substâncias, sinais de alto risco (síncope, esforço, cardiopatia, morte súbita na família) e ramo de fibrilação atrial.',
  keywords: ['palpitação', 'palpitações', 'palpitacao', 'coração acelerado', 'coracao acelerado', 'batedeira', 'taquicardia', 'coração disparado', 'falhas no coração', 'arritmia'],
  systems: ['cardiovascular', 'endocrino', 'psiquiatrico'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Características',
      prose: 'list',
      questions: [
        {
          id: 'pal_ritmo',
          label: 'Como o coração bate na crise?',
          hint: 'Peça para o paciente bater o ritmo com a mão na mesa.',
          type: 'single',
          options: [
            opt('regular_rapido', 'Rápido e regular', undefined, 'taquicardia regular'),
            opt('irregular', 'Rápido e irregular (descompassado)', 'orange', 'ritmo irregular'),
            opt('falhas', 'Falhas ou “soco” isolado', undefined, 'sensação de falhas/batimentos isolados'),
            opt('forte_normal', 'Forte, mas não rápido', undefined, 'percepção de batimentos fortes sem taquicardia'),
          ],
          short: 'Padrão',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason:
              'Regular e rápida sugere taquicardia supraventricular (ou sinusal); irregular, fibrilação atrial; falhas isoladas, extrassístoles (geralmente benignas); batimentos fortes sem taquicardia, ansiedade ou estados hiperdinâmicos.',
            impact: 'O padrão relatado orienta o ECG e o Holter; irregular → pensar em FA e calcular o risco de AVC.',
            refs: ['ehra-palpitacoes-2011'],
          },
        },
        {
          id: 'pal_inicio',
          label: 'Começa e termina de repente?',
          type: 'single',
          options: [
            opt('subito', 'Começa e para de repente', undefined, 'de início e término súbitos'),
            opt('gradual', 'Acelera e desacelera aos poucos', undefined, 'de início e término graduais'),
          ],
          short: 'Início e término',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason: 'Início e término súbitos (“como um interruptor”) sugerem taquicardia paroxística por reentrada; aceleração e desaceleração graduais sugerem taquicardia sinusal (ansiedade, febre, anemia, hipertireoidismo).',
            impact: 'Súbita e regular → investigar TPSV; gradual → buscar a causa da taquicardia sinusal.',
            refs: ['ehra-palpitacoes-2011'],
          },
        },
        episodeDurationQ([opt('segundos', 'Segundos'), opt('minutos', 'Minutos'), opt('horas', 'Horas', 'orange'), opt('continua', 'Contínua', 'orange')]),
        frequencyQ(),
        {
          id: 'pal_gatilho',
          label: 'O que desencadeia?',
          type: 'multi',
          options: [
            opt('esforco', 'Durante exercício', 'red', 'durante o esforço'),
            opt('repouso', 'Em repouso', undefined, 'em repouso'),
            opt('deitar', 'Ao deitar', undefined, 'ao deitar'),
            opt('postural', 'Ao se abaixar/levantar', undefined, 'com mudanças de posição'),
            opt('estresse', 'Estresse/ansiedade', undefined, 'com estresse'),
            opt('cafeina', 'Café/energético', undefined, 'após cafeína/energéticos'),
            opt('alcool', 'Álcool', undefined, 'após álcool'),
          ],
          short: 'Gatilhos',
          narrative: (v, _c, q) => `desencadeadas ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Palpitação DURANTE o esforço é sinal de alarme (arritmia ventricular, cardiopatia estrutural, canalopatias). Ao se abaixar e levantar sugere TPSV; após álcool, FA (“holiday heart”).',
            impact: 'Durante esforço → ECG, ecocardiograma e avaliação especializada antes de liberar atividade física.',
            refs: ['ehra-palpitacoes-2011'],
          },
        },
        {
          id: 'pal_vagal',
          label: 'Para com manobras (prender a respiração, fazer força, água gelada)?',
          type: 'yesno',
          yesText: 'Cessa com manobras vagais',
          noText: 'Não cessa com manobras vagais',
          extra: true,
          why: {
            reason: 'Interrupção com manobra vagal é típica de taquicardias que dependem do nó AV (reentrada nodal ou por via acessória).',
            impact: 'Reforça TPSV; ensinar manobra vagal modificada é parte do tratamento.',
          },
        },
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ(['sincope', 'pre_sincope', 'dor_toracica', 'dispneia', 'sudorese', 'tremor_fino', 'intolerancia_calor', 'perda_peso', 'ansiedade', 'palidez', 'astenia', 'poliuria']),
      ],
    },
    {
      id: 'red_flags',
      title: 'Sinais de alto risco',
      branch: { tone: 'red', reason: () => 'Identificam arritmia potencialmente grave.' },
      questions: [
        {
          id: 'pal_alarme',
          label: 'Sinais de alto risco',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('sincope', 'Desmaio durante a palpitação', 'red', 'síncope associada'),
            opt('esforco', 'Palpitação durante exercício', 'red', 'palpitação ao esforço'),
            opt('dor_dispneia', 'Dor no peito ou falta de ar junto', 'red', 'dor torácica/dispneia associadas'),
            opt('cardiopatia', 'Doença do coração conhecida (infarto, IC, valvopatia)', 'red', 'cardiopatia estrutural conhecida'),
            opt('morte_subita', 'Morte súbita na família antes dos 40 anos', 'red', 'história familiar de morte súbita precoce'),
            opt('drogas', 'Cocaína/anfetaminas', 'orange', 'uso de estimulantes'),
          ],
          short: 'Sinais de alto risco',
          why: {
            reason:
              'Síncope, palpitação ao esforço, cardiopatia estrutural e morte súbita familiar sugerem arritmia ventricular ou síndromes arrítmicas hereditárias (QT longo, Brugada, cardiomiopatia hipertrófica).',
            impact: 'Qualquer um presente → ECG imediato, monitorização e avaliação cardiológica; não liberar sem investigação.',
            refs: ['ehra-palpitacoes-2011'],
          },
        },
        {
          id: 'pal_substancias',
          label: 'Remédios e substâncias',
          type: 'multi',
          options: [
            opt('cafeina', 'Muita cafeína/energético'),
            opt('descongestionante', 'Descongestionante nasal/antigripal'),
            opt('broncodilatador', 'Bombinha (salbutamol/fenoterol)'),
            opt('levotiroxina', 'Levotiroxina'),
            opt('antidepressivo', 'Antidepressivo/antipsicótico', 'orange'),
            opt('emagrecedor', 'Remédio para emagrecer'),
            opt('nenhum', 'Nenhum'),
          ],
          short: 'Substâncias',
          narrative: (v, _c, q) => {
            const vals = v as string[];
            if (vals.includes('nenhum')) return 'Nega uso de substâncias/medicações que causem palpitações';
            return `Uso de: ${joinPt(labelsOf(q.options, vals))}`;
          },
          why: {
            reason: 'Estimulantes, simpaticomiméticos e excesso de levotiroxina causam taquicardia; antidepressivos e antipsicóticos podem prolongar o QT.',
            impact: 'Ajustar/suspender o agente; medir o QT no ECG quando houver droga que o prolonga.',
          },
        },
      ],
    },
    {
      id: 'ramo_fa',
      title: 'Ramo fibrilação atrial',
      showIf: (c) => c.has('pal_ritmo', 'irregular'),
      branch: { tone: 'accent', reason: () => 'Aberto porque: palpitação irregular.' },
      note: 'Na suspeita de FA, calcule CHA₂DS₂-VASc e HAS-BLED em Escores para decidir anticoagulação.',
      questions: [
        {
          id: 'fa_conhecida',
          label: 'Já teve fibrilação atrial diagnosticada?',
          type: 'yesno',
          yesText: 'FA previamente diagnosticada',
          noText: 'Sem diagnóstico prévio de FA',
        },
        {
          id: 'fa_antitrombotico',
          label: 'Usa anticoagulante ou antiagregante?',
          type: 'multi',
          options: ANTITHROMBOTIC_OPTIONS,
          short: 'Antitrombóticos',
          narrative: (v) => {
            const vals = v as string[];
            if (vals.includes('nenhum')) return 'Não usa antitrombóticos';
            return `Em uso de ${joinPt(labelsOf(ANTITHROMBOTIC_OPTIONS, vals).map((l) => l.toLowerCase()))}`;
          },
          why: {
            reason: 'A FA aumenta o risco de AVC cardioembólico; a anticoagulação é decidida pelo CHA₂DS₂-VASc, ponderando o risco de sangramento.',
            impact: 'FA > 48 h (ou duração desconhecida) sem anticoagulação → não cardioverter sem avaliação (risco de embolia).',
            refs: ['esc-fa-2024'],
          },
        },
      ],
    },
    finalSection(),
  ],
};
