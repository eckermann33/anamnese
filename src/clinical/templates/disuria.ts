import type { ComplaintTemplate } from '../types';
import { associatedQ, evolutionQ, finalSection, labelsOf, onsetQ, opt } from './common';
import { joinPt } from '../../lib/format';

export const disuria: ComplaintTemplate = {
  id: 'disuria',
  name: 'Disúria / sintomas urinários',
  subject: 'Disúria',
  description: 'Cistite × pielonefrite, ITU complicada (homem, gestante, sonda, imunossupressão), vaginite/IST como diferencial e sintomas prostáticos.',
  keywords: ['ardência para urinar', 'ardencia', 'ardor ao urinar', 'dor ao urinar', 'disúria', 'disuria', 'infecção urinária', 'infeccao urinaria', 'itu', 'xixi', 'urinando muito', 'urina com sangue'],
  systems: ['geniturinario', 'ginecologico'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Características',
      prose: 'list',
      questions: [
        onsetQ(),
        {
          id: 'uri_quadro',
          label: 'O que sente ao urinar?',
          hint: 'Marque também em “Sintomas associados” abaixo.',
          type: 'multi',
          options: [
            opt('ardor', 'Ardência/dor', undefined, 'ardência miccional'),
            opt('frequencia', 'Vai muitas vezes, pouco volume', undefined, 'polaciúria'),
            opt('urgencia', 'Urgência (não consegue segurar)', undefined, 'urgência miccional'),
            opt('final', 'Dor no fim da micção / no pé da barriga', undefined, 'dor suprapúbica'),
            opt('sangue', 'Sangue na urina', 'orange', 'hematúria'),
            opt('turva', 'Urina turva/mau cheiro', undefined, 'urina turva/fétida'),
          ],
          short: 'Quadro',
          narrative: (v, _c, q) => joinPt(labelsOf(q.options, v)),
          why: {
            reason: 'Disúria + polaciúria + urgência, sem corrimento vaginal, têm alta probabilidade de cistite em mulheres — muitas vezes o diagnóstico é clínico.',
            impact: 'Cistite não complicada em mulher não gestante → tratamento empírico curto, sem necessidade obrigatória de urocultura.',
            refs: ['idsa-itu-2011'],
          },
        },
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ(['febre', 'calafrios', 'dor_lombar', 'nauseas', 'vomitos', 'hematuria', 'corrimento_vaginal', 'corrimento_uretral', 'lesao_genital', 'dor_pelvica', 'dispareunia', 'retencao', 'jato_fraco', 'nocturia']),
      ],
    },
    {
      id: 'red_flags',
      title: 'ITU complicada / pielonefrite',
      branch: { tone: 'red', reason: () => 'Definem se é cistite simples ou infecção complicada/alta.' },
      questions: [
        {
          id: 'uri_complicada',
          label: 'Sinais de pielonefrite ou ITU complicada',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('febre', 'Febre ou calafrios', 'red', 'febre/calafrios'),
            opt('lombar', 'Dor nas costas/flanco', 'red', 'dor lombar/em flanco'),
            opt('vomitos', 'Vômitos / não consegue tomar remédio', 'red', 'vômitos (intolerância à via oral)'),
            opt('gestante', 'Gestante', 'red', 'gestação'),
            opt('homem', 'Sexo masculino', 'orange', 'sexo masculino'),
            opt('sonda', 'Sonda vesical / procedimento urológico recente', 'orange', 'sonda/procedimento urológico'),
            opt('imuno', 'Diabetes descompensado ou imunossupressão', 'orange', 'diabetes descompensado/imunossupressão'),
            opt('recorrente', 'Infecções repetidas / antibiótico recente', 'orange', 'ITU recorrente/antibiótico recente'),
            opt('calculo', 'Cálculo renal ou alteração do trato urinário', 'orange', 'litíase/alteração anatômica'),
          ],
          short: 'Sinais de complicação',
          why: {
            reason:
              'Febre, dor lombar e vômitos sugerem pielonefrite. Gestação, sexo masculino, sonda, obstrução, imunossupressão e infecções de repetição definem ITU complicada.',
            impact: 'Pielonefrite/complicada → urocultura com antibiograma antes do antibiótico, tratamento mais longo; sinais de sepse ou vômitos → internação. Na gestante, também tratar bacteriúria assintomática.',
            refs: ['idsa-itu-2011'],
          },
        },
      ],
    },
    {
      id: 'ramo_feminino',
      title: 'Ramo feminino',
      showIf: (c) => c.sex === 'F',
      branch: { tone: 'accent', reason: () => 'Aberto porque: sexo feminino.' },
      questions: [
        {
          id: 'uf_vaginal',
          label: 'Corrimento ou coceira vaginal?',
          type: 'yesno',
          yesText: 'Refere corrimento/prurido vaginal',
          noText: 'Nega corrimento ou prurido vaginal',
          why: {
            reason: 'Corrimento ou prurido vaginal diminuem a probabilidade de cistite e sugerem vaginite ou cervicite (IST) como causa da disúria.',
            impact: 'Presente → exame especular e pesquisa de IST em vez de tratar só como ITU.',
            refs: ['idsa-itu-2011'],
          },
        },
        {
          id: 'uf_gestacao',
          label: 'Pode estar grávida? (atraso menstrual)',
          type: 'yesno',
          yesText: 'Possibilidade de gestação',
          noText: 'Sem possibilidade de gestação',
          why: {
            reason: 'Na gestação, a ITU é sempre tratada como complicada e vários antibióticos são contraindicados.',
            impact: 'Dúvida → beta-hCG; escolher antibiótico seguro na gestação.',
          },
        },
      ],
    },
    {
      id: 'ramo_masculino',
      title: 'Ramo masculino',
      showIf: (c) => c.sex === 'M',
      branch: { tone: 'accent', reason: () => 'Aberto porque: sexo masculino — ITU no homem é considerada complicada.' },
      questions: [
        {
          id: 'um_quadro',
          label: 'Pistas',
          type: 'multi',
          options: [
            opt('jato', 'Jato fraco, esforço para urinar, acorda à noite (próstata)'),
            opt('perineal', 'Dor no períneo/reto, febre (prostatite)', 'orange'),
            opt('corrimento', 'Secreção pelo pênis (IST)', 'orange'),
            opt('parceria', 'Parceria sexual nova / sem preservativo'),
            opt('testiculo', 'Dor ou inchaço no testículo', 'orange'),
          ],
          short: 'Pistas no homem',
          narrative: (v, _c, q) => `Refere: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'No homem, disúria pode ser uretrite (IST), prostatite, epididimite ou ITU associada a obstrução prostática.',
            impact: 'Corrimento uretral → tratar uretrite e parcerias; prostatite → tratamento prolongado; dor testicular aguda → excluir torção.',
          },
        },
      ],
    },
    finalSection(),
  ],
};
