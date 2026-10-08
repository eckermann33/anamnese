import type { ComplaintTemplate } from '../types';
import {
  associatedQ,
  betterQ,
  characterQ,
  evolutionQ,
  finalSection,
  intensityQ,
  labelsOf,
  locationQ,
  onsetQ,
  opt,
  worseQ,
} from './common';
import { joinPt } from '../../lib/format';

export const lombalgia: ComplaintTemplate = {
  id: 'lombalgia',
  name: 'Lombalgia',
  subject: 'Dor',
  description: 'Mecânica × inflamatória, ciatalgia, red flags (câncer, infecção, fratura, cauda equina) e causas viscerais.',
  keywords: ['lombar', 'costas', 'coluna', 'lombalgia', 'ciático', 'ciatico', 'dor nas costas'],
  systems: ['musculoesqueletico', 'neurologico', 'geniturinario'],
  isPain: true,
  sections: [
    {
      id: 'semiologia',
      title: 'Semiologia da dor',
      prose: 'list',
      questions: [
        onsetQ([
          opt('subito', 'Súbito (após esforço/movimento)', undefined, 'súbito'),
          opt('insidioso', 'Gradual', undefined, 'insidioso'),
        ]),
        locationQ('full'),
        {
          id: 'lom_abaixo_joelho',
          label: 'A dor desce abaixo do joelho?',
          type: 'yesno',
          yesText: 'com irradiação abaixo do joelho (ciatalgia)',
          noText: 'sem irradiação abaixo do joelho',
          why: {
            reason: 'Dor irradiada abaixo do joelho em trajeto dermatomérico (L5/S1) sugere radiculopatia (ciatalgia), geralmente por hérnia discal.',
            impact: 'Examinar Lasègue, força (dorsiflexão do hálux/pé), sensibilidade e reflexos aquileu/patelar.',
            refs: ['nice-lombalgia'],
          },
        },
        {
          id: 'lom_ritmo',
          label: 'Ritmo da dor',
          type: 'single',
          options: [
            opt('mecanico', 'Mecânico: piora com movimento, melhora com repouso', undefined, 'de ritmo mecânico'),
            opt('inflamatorio', 'Inflamatório: rigidez matinal, melhora com movimento', 'orange', 'de ritmo inflamatório'),
            opt('continuo', 'Contínuo: não alivia com nada, inclusive à noite', 'red', 'contínua, sem alívio com repouso, inclusive noturna'),
          ],
          short: 'Ritmo',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason:
              'Dor mecânica é a regra na lombalgia inespecífica. Ritmo inflamatório (rigidez matinal > 30 min, melhora com exercício, despertar noturno, idade < 40) sugere espondiloartrite. Dor contínua noturna que não alivia sugere tumor ou infecção.',
            impact: 'Ritmo inflamatório → avaliar espondiloartrite (HLA-B27, imagem de sacroilíacas). Contínua → investigar causas graves.',
          },
        },
        characterQ([
          opt('peso', 'Peso/pressão', undefined, 'em peso'),
          opt('queimacao', 'Queimação', undefined, 'em queimação'),
          opt('choque', 'Choque', undefined, 'em choque'),
          opt('pontada', 'Pontada', undefined, 'em pontada'),
          opt('colica', 'Cólica', undefined, 'tipo cólica'),
        ]),
        intensityQ(),
        worseQ([
          opt('esforco', 'Carregar peso/esforço', undefined, 'aos esforços'),
          opt('flexao', 'Curvar o tronco', undefined, 'à flexão do tronco'),
          opt('sentado', 'Ficar sentado', undefined, 'na posição sentada'),
          opt('valsalva', 'Tossir/espirrar', undefined, 'à tosse e ao espirro'),
          opt('repouso', 'Repouso', undefined, 'ao repouso'),
          opt('noite', 'À noite', 'orange', 'no período noturno'),
        ]),
        betterQ([
          opt('repouso', 'Repouso', undefined, 'ao repouso'),
          opt('movimento', 'Movimento/exercício', undefined, 'com movimento'),
          opt('analgesico', 'Analgésico', undefined, 'com analgésico'),
          opt('calor', 'Calor local', undefined, 'com calor local'),
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
          'perda_peso',
          'disuria',
          'hematuria',
          'dor_abdominal',
          'parestesia',
          'deficit_motor',
          'retencao',
          'incontinencia',
          'rigidez_matinal',
          'artrite',
          'trauma',
        ]),
      ],
    },
    {
      id: 'red_flags',
      title: 'Sinais de alarme',
      branch: { tone: 'red', reason: () => 'Sempre investigar na lombalgia: câncer, infecção, fratura e síndrome da cauda equina.' },
      questions: [
        {
          id: 'lom_red_flags',
          label: 'Red flags da lombalgia',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('cancer', 'Câncer prévio', 'red', 'história de câncer'),
            opt('perda_peso', 'Perda de peso inexplicada', 'red', 'perda de peso inexplicada'),
            opt('febre', 'Febre ou infecção recente', 'red', 'febre/infecção recente'),
            opt('udi_imuno', 'Drogas injetáveis ou imunossupressão', 'red', 'uso de drogas injetáveis/imunossupressão'),
            opt('trauma', 'Trauma importante (ou leve em idoso/osteoporose)', 'red', 'trauma significativo'),
            opt('corticoide', 'Uso crônico de corticoide', 'orange', 'uso crônico de corticoide'),
            opt('noturna', 'Dor noturna/em repouso que não melhora', 'orange', 'dor noturna/em repouso'),
            opt('sela', 'Dormência na região genital/anal (“em sela”)', 'red', 'anestesia em sela'),
            opt('esfincter', 'Retenção ou incontinência urinária/fecal', 'red', 'disfunção esfincteriana'),
            opt('deficit', 'Fraqueza progressiva nas pernas', 'red', 'déficit motor progressivo'),
          ],
          short: 'Sinais de alarme',
          why: {
            reason:
              'Mais de 90% das lombalgias são inespecíficas, mas os sinais de alarme identificam a minoria com causa grave: neoplasia, infecção (espondilodiscite), fratura e compressão da cauda equina.',
            impact: 'Anestesia em sela, disfunção esfincteriana ou déficit progressivo → RM de urgência (síndrome da cauda equina). Outros sinais → investigação dirigida.',
            refs: ['nice-lombalgia'],
          },
        },
      ],
    },
    {
      id: 'ramo_espondiloartrite',
      title: 'Ramo espondiloartrite',
      showIf: (c) => c.has('lom_ritmo', 'inflamatorio') || c.sym('rigidez_matinal') === 'sim',
      branch: { tone: 'accent', reason: () => 'Aberto porque: ritmo inflamatório ou rigidez matinal.' },
      questions: [
        {
          id: 'espa_extra',
          label: 'Manifestações associadas',
          type: 'multi',
          options: [
            opt('uveite', 'Olho vermelho e doloroso prévio (uveíte)'),
            opt('psoriase', 'Psoríase'),
            opt('dii', 'Doença inflamatória intestinal'),
            opt('entesite', 'Dor no calcanhar (entesite)'),
            opt('hf', 'Familiar com espondiloartrite'),
          ],
          short: 'Manifestações de espondiloartrite',
          narrative: (v, _c, q) => `Manifestações associadas: ${joinPt(labelsOf(q.options, v))}`,
        },
      ],
    },
    {
      id: 'ramo_renal',
      title: 'Ramo renal',
      showIf: (c) => c.sym('disuria') === 'sim' || c.sym('hematuria') === 'sim' || c.has('carater', 'colica'),
      branch: { tone: 'accent', reason: () => 'Aberto porque: sintomas urinários ou dor em cólica.' },
      questions: [
        {
          id: 'uri_colica',
          label: 'Cólica que irradia para virilha/genitais?',
          type: 'yesno',
          yesText: 'Dor em cólica com irradiação para região inguinal/genital',
          noText: 'Sem irradiação para região inguinal/genital',
        },
        {
          id: 'uri_calculo',
          label: 'Já teve cálculo renal?',
          type: 'yesno',
          yesText: 'Refere litíase renal prévia',
          noText: 'Nega litíase renal prévia',
        },
      ],
    },
    {
      id: 'ramo_aneurisma',
      title: 'Ramo aneurisma de aorta abdominal',
      showIf: (c) => (c.ageYears ?? 0) >= 60 && (c.sym('dor_abdominal') === 'sim' || c.has('inicio', 'subito')),
      branch: { tone: 'red', reason: () => 'Aberto porque: idade ≥ 60 anos com dor súbita ou dor abdominal.' },
      questions: [
        {
          id: 'vas_aneurisma',
          label: 'Aneurisma de aorta conhecido ou massa pulsátil?',
          type: 'yesno',
          yesText: 'Aneurisma de aorta conhecido/massa pulsátil',
          noText: 'Nega aneurisma de aorta conhecido',
          why: {
            reason: 'Ruptura de aneurisma de aorta abdominal pode se apresentar como dor lombar súbita, principalmente em idosos, homens e tabagistas.',
            impact: 'Hipotensão + dor lombar/abdominal + massa pulsátil → cirurgia vascular imediata.',
          },
        },
      ],
    },
    finalSection(),
  ],
};
