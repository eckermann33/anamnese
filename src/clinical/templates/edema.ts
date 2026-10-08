import type { ComplaintTemplate } from '../types';
import { associatedQ, evolutionQ, finalSection, labelsOf, onsetQ, opt, tevRiskQ } from './common';
import { joinPt } from '../../lib/format';

export const edema: ComplaintTemplate = {
  id: 'edema',
  name: 'Edema (inchaço)',
  subject: 'Edema',
  description: 'Localizado × generalizado, unilateral (TVP, celulite), cardíaco, renal, hepático, medicamentoso e angioedema.',
  keywords: ['inchaço', 'inchaco', 'inchado', 'inchada', 'edema', 'pernas inchadas', 'pés inchados', 'anasarca', 'rosto inchado'],
  systems: ['cardiovascular', 'geniturinario', 'digestorio', 'endocrino'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Características',
      prose: 'list',
      questions: [
        onsetQ([opt('subito', 'Súbito (horas)', 'orange', 'súbito'), opt('insidioso', 'Gradual (dias a semanas)', undefined, 'gradual')]),
        {
          id: 'ede_local',
          label: 'Onde incha?',
          type: 'multi',
          options: [
            opt('mmii', 'Pernas/pés (os dois lados)', undefined, 'em membros inferiores bilateralmente'),
            opt('face', 'Rosto/pálpebras', undefined, 'em face/pálpebras'),
            opt('labios_lingua', 'Lábios/língua/garganta', 'red', 'em lábios/língua'),
            opt('abdome', 'Barriga (aumento do volume)', 'orange', 'abdominal (aumento de volume)'),
            opt('generalizado', 'Corpo todo', 'orange', 'generalizado (anasarca)'),
            opt('mmss', 'Braço(s)', undefined, 'em membro superior'),
          ],
          short: 'Localização',
          narrative: (v, _c, q) => joinPt(labelsOf(q.options, v)),
          why: {
            reason:
              'Bilateral em pernas: insuficiência cardíaca, venosa, renal, hepática, hipoalbuminemia ou medicamentos. Face/pálpebras ao acordar: renal (síndrome nefrótica/nefrítica). Lábios/língua de instalação rápida: angioedema. Abdome: ascite (hepatopatia, IC direita).',
            impact: 'Edema de lábios/língua/garganta → avaliar via aérea imediatamente (angioedema/anafilaxia).',
            refs: ['porto-semiologia'],
          },
        },
        {
          id: 'ede_unilateral',
          label: 'Inchaço de uma perna só?',
          type: 'yesno',
          symptom: 'edema_unilateral',
          yesText: 'edema unilateral de membro inferior',
          noText: 'sem edema unilateral',
          why: {
            reason: 'Edema unilateral sugere causa local: trombose venosa profunda, celulite, cisto de Baker roto, linfedema ou compressão.',
            impact: 'Calcular Wells para TVP (Escores) antes de pedir D-dímero ou Doppler.',
            refs: ['wells-tvp-2003'],
          },
        },
        {
          id: 'ede_horario',
          label: 'Quando é pior?',
          type: 'single',
          options: [
            opt('tarde', 'No fim do dia (melhora ao acordar)', undefined, 'com piora vespertina e melhora ao repouso'),
            opt('manha', 'Ao acordar (rosto/pálpebras)', undefined, 'com predomínio matinal'),
            opt('constante', 'O tempo todo', undefined, 'constante'),
          ],
          short: 'Horário',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          extra: true,
        },
        {
          id: 'ede_dor',
          label: 'Dor, vermelhidão ou calor no local?',
          type: 'yesno',
          yesText: 'com dor, eritema e calor local',
          noText: 'sem sinais flogísticos',
          why: {
            reason: 'Sinais inflamatórios locais sugerem TVP ou celulite/erisipela; edema indolor e frio, causas sistêmicas ou linfedema.',
            impact: 'Febre + eritema bem delimitado → erisipela/celulite; dor na panturrilha → TVP.',
          },
        },
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ(['dispneia_esforco', 'ortopneia', 'dpn', 'ganho_peso', 'oliguria', 'hematuria', 'nocturia', 'ictericia', 'distensao', 'astenia', 'intolerancia_frio', 'febre', 'dor_toracica', 'urticaria']),
      ],
    },
    {
      id: 'red_flags',
      title: 'Sinais de alarme',
      branch: { tone: 'red', reason: () => 'Excluir angioedema, TEP/TVP, insuficiência cardíaca descompensada e lesão renal.' },
      questions: [
        {
          id: 'ede_alarme',
          label: 'Sinais de alarme',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('via_aerea', 'Inchaço de língua/garganta, voz abafada, falta de ar', 'red', 'edema de via aérea'),
            opt('dispneia_repouso', 'Falta de ar em repouso / não consegue deitar', 'red', 'dispneia em repouso/ortopneia'),
            opt('dor_toracica', 'Dor no peito', 'red', 'dor torácica'),
            opt('urina_pouca', 'Urina muito pouca', 'red', 'oligúria'),
            opt('urina_espuma', 'Urina com muita espuma ou escura (“coca-cola”)', 'orange', 'urina espumosa/escura'),
            opt('perna_dor', 'Uma perna inchada e dolorida de repente', 'orange', 'edema unilateral doloroso agudo'),
          ],
          short: 'Sinais de alarme',
          why: {
            reason:
              'Edema de via aérea pode obstruir em minutos. Dispneia em repouso/ortopneia sugere IC descompensada ou TEP. Oligúria e urina espumosa/escura apontam para doença renal (síndrome nefrótica ou nefrítica).',
            impact: 'Via aérea → adrenalina e preparo para via aérea avançada se anafilaxia; IECA → angioedema bradicinérgico (suspender IECA). Oligúria → função renal e urina tipo 1.',
          },
        },
      ],
    },
    {
      id: 'ramo_medicamentos',
      title: 'Medicamentos que causam edema',
      questions: [
        {
          id: 'ede_meds',
          label: 'Usa algum destes?',
          type: 'multi',
          options: [
            opt('bcc', 'Anlodipino/nifedipino'),
            opt('aine', 'Anti-inflamatório'),
            opt('corticoide', 'Corticoide'),
            opt('glitazona', 'Pioglitazona'),
            opt('gabapentinoide', 'Gabapentina/pregabalina'),
            opt('estrogenio', 'Estrogênio/anticoncepcional'),
            opt('ieca', 'IECA (captopril, enalapril) — angioedema', 'orange'),
            opt('nenhum', 'Nenhum'),
          ],
          short: 'Medicamentos',
          narrative: (v, _c, q) => {
            const vals = v as string[];
            if (vals.includes('nenhum')) return 'Nega medicamentos associados a edema';
            return `Em uso de medicamentos associados a edema: ${joinPt(labelsOf(q.options, vals))}`;
          },
          why: {
            reason: 'Bloqueadores de canal de cálcio di-hidropiridínicos são a causa medicamentosa mais comum de edema de membros inferiores; AINE e corticoide retêm sódio; IECA pode causar angioedema mesmo após anos de uso.',
            impact: 'Considerar trocar ou suspender o medicamento antes de investigação extensa.',
          },
        },
      ],
    },
    {
      id: 'ramo_tvp',
      title: 'Ramo trombose venosa',
      showIf: (c) => c.sym('edema_unilateral') === 'sim',
      branch: { tone: 'orange', reason: () => 'Aberto porque: edema unilateral.' },
      note: 'Calcule o Wells para TVP em Escores: improvável → D-dímero; provável → Doppler venoso.',
      questions: [tevRiskQ()],
    },
    {
      id: 'ramo_cardiaco',
      title: 'Ramo insuficiência cardíaca',
      showIf: (c) => ['dispneia_esforco', 'ortopneia', 'dpn'].some((s) => c.sym(s) === 'sim'),
      branch: { tone: 'accent', reason: () => 'Aberto porque: dispneia aos esforços, ortopneia ou dispneia paroxística noturna.' },
      questions: [
        {
          id: 'ic_contexto',
          label: 'Contexto cardíaco',
          type: 'multi',
          options: [
            opt('ic_conhecida', 'Insuficiência cardíaca conhecida'),
            opt('iam_previo', 'Infarto prévio'),
            opt('diuretico', 'Usa diurético (furosemida)'),
            opt('baixa_adesao', 'Parou/esqueceu remédios', 'orange'),
            opt('sal', 'Exagerou no sal/líquidos', 'orange'),
            opt('chagas', 'Doença de Chagas / morou em casa de pau a pique'),
          ],
          short: 'Contexto cardíaco',
          narrative: (v, _c, q) => `Contexto cardíaco: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Baixa adesão, excesso de sal/líquido, infecção, isquemia e arritmia são os principais gatilhos de descompensação da IC. No Brasil, a cardiopatia chagásica é causa importante.',
            impact: 'Identificar o fator precipitante é parte do tratamento da IC descompensada.',
            refs: ['sbc-ic-2021'],
          },
        },
      ],
    },
    finalSection(),
  ],
};
