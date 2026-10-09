import type { ComplaintTemplate } from '../types';
import {
  associatedQ,
  betterQ,
  characterQ,
  episodeDurationQ,
  evolutionQ,
  finalSection,
  frequencyQ,
  intensityQ,
  locationQ,
  onsetQ,
  opt,
  worseQ,
} from './common';

/**
 * Template genérico ("Outra queixa"): semiologia universal.
 * Se a queixa envolve dor, abre a semiologia completa da dor.
 */
export const outra: ComplaintTemplate = {
  id: 'outra',
  name: 'Outra queixa (genérico)',
  subject: 'Quadro',
  description: 'Semiologia universal para qualquer queixa — com ramo de dor quando aplicável.',
  keywords: [],
  systems: [],
  isPain: false,
  sections: [
    {
      id: 'tipo',
      questions: [
        {
          id: 'envolve_dor',
          label: 'A queixa envolve dor?',
          type: 'yesno',
          yesText: '',
          noText: '',
          narrative: () => null,
        },
      ],
    },
    {
      id: 'semiologia_dor',
      title: 'Semiologia da dor',
      prose: 'list',
      showIf: (c) => c.has('envolve_dor', 'sim'),
      questions: [
        onsetQ(),
        locationQ('full'),
        characterQ([
          opt('aperto', 'Aperto/peso', undefined, 'em aperto'),
          opt('queimacao', 'Queimação', undefined, 'em queimação'),
          opt('pontada', 'Pontada', undefined, 'em pontada'),
          opt('colica', 'Cólica', undefined, 'tipo cólica'),
          opt('latejante', 'Latejante', undefined, 'latejante'),
          opt('choque', 'Choque', undefined, 'em choque'),
        ]),
        intensityQ(),
        episodeDurationQ(),
        frequencyQ(),
        worseQ([
          opt('movimento', 'Movimento', undefined, 'à movimentação'),
          opt('esforco', 'Esforço', undefined, 'aos esforços'),
          opt('alimentacao', 'Alimentação', undefined, 'à alimentação'),
          opt('palpacao', 'Palpação', undefined, 'à palpação'),
          opt('noite', 'À noite', undefined, 'no período noturno'),
        ]),
        betterQ([
          opt('repouso', 'Repouso', undefined, 'ao repouso'),
          opt('analgesico', 'Analgésico', undefined, 'com analgésico'),
          opt('posicao', 'Mudança de posição', undefined, 'com mudança de posição'),
          opt('nada', 'Nada melhora', undefined, 'nada'),
        ]),
        evolutionQ(),
      ],
    },
    {
      id: 'semiologia_geral',
      title: 'Caracterização',
      prose: 'list',
      showIf: (c) => c.has('envolve_dor', 'nao'),
      questions: [
        onsetQ(),
        frequencyQ(),
        worseQ([
          opt('esforco', 'Esforço', undefined, 'aos esforços'),
          opt('alimentacao', 'Alimentação', undefined, 'à alimentação'),
          opt('noite', 'À noite', undefined, 'no período noturno'),
          opt('estresse', 'Estresse', undefined, 'ao estresse'),
        ]),
        betterQ([
          opt('repouso', 'Repouso', undefined, 'ao repouso'),
          opt('medicacao', 'Medicação', undefined, 'com medicação'),
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
          'febre',
          'astenia',
          'perda_peso',
          'nauseas',
          'vomitos',
          'dispneia',
          'tosse',
          'dor_toracica',
          'palpitacoes',
          'cefaleia',
          'tontura',
          'dor_abdominal',
          'diarreia',
          'disuria',
          'exantema',
        ]),
      ],
    },
    finalSection(),
  ],
};
