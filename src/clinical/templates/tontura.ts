import type { ComplaintTemplate } from '../types';
import { associatedQ, evolutionQ, finalSection, labelsOf, opt } from './common';
import { joinPt } from '../../lib/format';

export const tontura: ComplaintTemplate = {
  id: 'tontura',
  name: 'Tontura / vertigem',
  subject: 'Tontura',
  description: 'Tipo (vertigem, pré-síncope, desequilíbrio), padrão temporal e gatilhos (VPPB, neurite, Ménière), sinais centrais e HINTS na síndrome vestibular aguda.',
  keywords: ['tontura', 'tonto', 'tonta', 'vertigem', 'labirintite', 'labirinto', 'zonzeira', 'cabeça rodando', 'tudo girando', 'desequilíbrio'],
  systems: ['neurologico', 'otorrino', 'cardiovascular'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Tipo e padrão',
      prose: 'list',
      questions: [
        {
          id: 'ton_tipo',
          label: 'Como é a tontura? (nas palavras do paciente)',
          type: 'single',
          options: [
            opt('vertigem', 'Tudo gira / sensação de movimento', undefined, 'rotatória (vertigem)'),
            opt('pre_sincope', 'Vai desmaiar / escurece a vista', 'orange', 'tipo pré-síncope'),
            opt('desequilibrio', 'Desequilíbrio ao andar', 'orange', 'tipo desequilíbrio'),
            opt('vaga', 'Cabeça leve / sensação vaga', undefined, 'inespecífica (cabeça leve)'),
          ],
          short: 'Tipo',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason:
              'O tipo ajuda, mas pacientes descrevem mal a tontura. Por isso, o padrão temporal e os gatilhos (abordagem TiTrATE) são mais confiáveis que a palavra usada.',
            impact: 'Pré-síncope → causas cardiovasculares (arritmia, hipotensão ortostática, sangramento). Vertigem → vestibular periférica ou central.',
            refs: ['hints-2009'],
          },
        },
        {
          id: 'ton_padrao',
          label: 'Padrão no tempo',
          type: 'single',
          options: [
            opt('posicional', 'Crises de segundos ao mudar a posição da cabeça', undefined, 'em crises de segundos desencadeadas pela posição da cabeça'),
            opt('episodica', 'Crises espontâneas de minutos a horas', undefined, 'em crises espontâneas de minutos a horas'),
            opt('aguda_continua', 'Começou de repente e está contínua há horas/dias', 'red', 'contínua, de início agudo'),
            opt('cronica', 'Persistente há semanas/meses', undefined, 'persistente'),
          ],
          short: 'Padrão',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason:
              'Crises de segundos com a posição → VPPB. Crises espontâneas de minutos/horas → migrânea vestibular, Ménière ou AIT. Contínua de início agudo (síndrome vestibular aguda) → neurite vestibular OU AVC de circulação posterior — a diferença é o exame HINTS. Crônica → causas multifatoriais, medicamentos, ansiedade.',
            impact: 'Síndrome vestibular aguda com fatores de risco vascular exige excluir AVC; RM precoce pode ser falsamente negativa nas primeiras 48 h.',
            refs: ['hints-2009'],
          },
        },
        {
          id: 'ton_gatilho',
          label: 'Gatilhos',
          type: 'multi',
          options: [
            opt('virar_cama', 'Virar na cama / olhar para cima', undefined, 'ao virar na cama ou olhar para cima'),
            opt('levantar', 'Ao levantar rápido', undefined, 'ao se levantar'),
            opt('espontaneo', 'Sem gatilho', undefined, 'espontânea'),
            opt('esforco', 'Durante esforço', 'red', 'aos esforços'),
            opt('ruido', 'Barulho alto / pressão no ouvido', undefined, 'com ruídos/pressão'),
          ],
          short: 'Gatilhos',
          narrative: (v, _c, q) => `desencadeada ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Ao virar na cama/olhar para cima → VPPB (confirmar com Dix-Hallpike). Ao levantar → hipotensão ortostática. Durante esforço → causa cardíaca (arritmia, estenose aórtica).',
            impact: 'Tontura ao esforço → ECG e ecocardiograma; ortostática → medir PA deitado e em pé.',
          },
        },
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ(['nauseas', 'vomitos', 'hipoacusia', 'zumbido', 'otalgia', 'cefaleia', 'diplopia', 'alteracao_fala', 'deficit_motor', 'parestesia', 'desequilibrio', 'sincope', 'palpitacoes', 'dor_toracica']),
      ],
    },
    {
      id: 'red_flags',
      title: 'Sinais de causa central',
      branch: { tone: 'red', reason: () => 'Sempre pesquisar: AVC de fossa posterior se apresenta como “labirintite”.' },
      questions: [
        {
          id: 'ton_central',
          label: 'Sinais de alarme (causa central)',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('cefaleia_subita', 'Dor de cabeça forte e súbita / na nuca', 'red', 'cefaleia súbita/occipital intensa'),
            opt('diplopia', 'Visão dupla', 'red', 'diplopia'),
            opt('fala_degluticao', 'Fala enrolada ou engasgos', 'red', 'disartria/disfagia'),
            opt('fraqueza_dormencia', 'Fraqueza ou dormência de um lado', 'red', 'déficit focal'),
            opt('nao_anda', 'Não consegue andar sem apoio', 'red', 'incapacidade de deambular sem apoio'),
            opt('surdez_subita', 'Perda súbita de audição de um lado', 'orange', 'hipoacusia súbita unilateral'),
          ],
          short: 'Sinais de causa central',
          why: {
            reason:
              'Os “5 D” (diplopia, disartria, disfagia, déficit e “dismetria”/ataxia) e a cefaleia súbita indicam lesão central. Muitos AVCs de fossa posterior, porém, se apresentam só com vertigem — daí o HINTS.',
            impact: 'Qualquer sinal central → protocolo de AVC e neuroimagem; não dar alta como “labirintite”.',
            refs: ['hints-2009', 'aha-avc-2026'],
          },
        },
      ],
    },
    {
      id: 'ramo_sva',
      title: 'Ramo síndrome vestibular aguda',
      showIf: (c) => c.has('ton_padrao', 'aguda_continua'),
      branch: { tone: 'red', reason: () => 'Aberto porque: tontura contínua de início agudo.' },
      note: 'No exame, faça o HINTS (Head Impulse, Nystagmus, Test of Skew): impulso cefálico NORMAL, nistagmo que muda de direção ou skew presente sugerem AVC — mais sensível que a RM precoce.',
      questions: [
        {
          id: 'sva_fr',
          label: 'Fatores de risco vascular',
          type: 'multi',
          options: [
            opt('has', 'Hipertensão'),
            opt('dm', 'Diabetes'),
            opt('tabagismo', 'Tabagismo'),
            opt('fa', 'Fibrilação atrial/arritmia', 'orange'),
            opt('avc_previo', 'AVC/AIT prévio', 'orange'),
            opt('dislipidemia', 'Colesterol alto'),
            opt('nenhum', 'Nenhum'),
          ],
          short: 'Fatores de risco vascular',
          narrative: (v, _c, q) => {
            const vals = v as string[];
            if (vals.includes('nenhum')) return 'Sem fatores de risco vascular';
            return `Fatores de risco vascular: ${joinPt(labelsOf(q.options, vals))}`;
          },
          why: {
            reason: 'No estudo do HINTS, pacientes com síndrome vestibular aguda e ao menos 1 fator de risco vascular tinham AVC na maioria dos casos.',
            impact: 'Fatores presentes + HINTS sugestivo → neuroimagem e avaliação neurológica urgentes.',
            refs: ['hints-2009'],
          },
        },
      ],
    },
    {
      id: 'ramo_presincope',
      title: 'Ramo pré-síncope',
      showIf: (c) => c.has('ton_tipo', 'pre_sincope') || c.has('ton_gatilho', 'levantar'),
      branch: { tone: 'accent', reason: () => 'Aberto porque: tontura tipo pré-síncope ou ao levantar.' },
      note: 'Meça a PA deitado e após 3 minutos em pé (queda ≥ 20/10 mmHg = hipotensão ortostática).',
      questions: [
        {
          id: 'ps_causas',
          label: 'Possíveis causas',
          type: 'multi',
          options: [
            opt('anti_hipertensivo', 'Remédio de pressão/diurético novo ou dose aumentada'),
            opt('desidratacao', 'Pouca ingestão / vômitos / diarreia'),
            opt('sangramento', 'Sangramento ou fezes escuras', 'red'),
            opt('jejum', 'Jejum / diabetes em insulina', 'orange'),
            opt('palpitacao', 'Palpitação junto', 'orange'),
          ],
          short: 'Causas de pré-síncope',
          narrative: (v, _c, q) => `Associada a: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Pré-síncope tem as mesmas causas da síncope: ortostase (medicações, hipovolemia, sangramento), arritmia e hipoglicemia.',
            impact: 'Fezes escuras/sangramento → hemograma e toque retal; palpitação → ECG e monitorização.',
            refs: ['esc-sincope-2018'],
          },
        },
      ],
    },
    finalSection(),
  ],
};
