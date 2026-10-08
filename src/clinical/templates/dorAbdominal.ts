import type { ComplaintTemplate, QuestionContext } from '../types';
import {
  ANTITHROMBOTIC_OPTIONS,
  associatedQ,
  betterQ,
  characterQ,
  evolutionQ,
  finalSection,
  frequencyQ,
  intensityQ,
  labelsOf,
  locationQ,
  onsetQ,
  opt,
  worseQ,
} from './common';
import { joinPt } from '../../lib/format';

const reasonFrom = (items: Array<[boolean, string]>) =>
  `Aberto porque: ${joinPt(items.filter(([ok]) => ok).map(([, t]) => t))}.`;

const fertileWoman = (c: QuestionContext) =>
  c.sex === 'F' && (c.ageYears === undefined || (c.ageYears >= 10 && c.ageYears <= 55));

const isBiliary = (c: QuestionContext) =>
  c.body('abd_hipocondrio_d', 'location') ||
  c.sym('ictericia') === 'sim' ||
  c.sym('coluria') === 'sim' ||
  c.sym('acolia') === 'sim' ||
  c.has('piora', 'gordura');

const isPancreatic = (c: QuestionContext) =>
  c.has('carater', 'faixa') || (c.body('abd_epigastrio', 'location') && (c.body('dorso', 'radiation') || c.body('lombar', 'radiation')));

const isObstruction = (c: QuestionContext) =>
  c.sym('parada_eliminacao') === 'sim' || c.sym('distensao') === 'sim' || (c.sym('vomitos') === 'sim' && c.has('carater', 'colica'));

const isUrinary = (c: QuestionContext) =>
  c.sym('disuria') === 'sim' ||
  c.sym('hematuria') === 'sim' ||
  c.sym('dor_lombar') === 'sim' ||
  c.body('lombar') ||
  c.body('abd_flanco');

const isGIBleed = (c: QuestionContext) =>
  c.sym('hematemese') === 'sim' || c.sym('melena') === 'sim' || c.sym('hematoquezia') === 'sim';

const isVascular = (c: QuestionContext) =>
  (c.ageYears ?? 0) >= 50 && (c.has('inicio', 'subito') || (c.num('intensidade') ?? 0) >= 8);

export const dorAbdominal: ComplaintTemplate = {
  id: 'dor_abdominal',
  name: 'Dor abdominal',
  subject: 'Dor',
  description: 'Mapa das 9 regiões, ramos biliar, pancreático, obstrutivo, apendicite, urinário, ginecológico e vascular.',
  keywords: ['barriga', 'abdom', 'estômago', 'estomago', 'epigástr', 'epigastr', 'cólica', 'colica', 'pé da barriga', 'umbigo'],
  systems: ['digestorio', 'geniturinario', 'ginecologico'],
  isPain: true,
  sections: [
    {
      id: 'semiologia',
      title: 'Semiologia da dor',
      prose: 'list',
      questions: [
        onsetQ(),
        locationQ('full'),
        {
          id: 'migracao',
          label: 'Começou ao redor do umbigo e migrou para o lado direito, embaixo?',
          type: 'yesno',
          yesText: 'com migração da região periumbilical para a fossa ilíaca direita',
          noText: 'sem migração',
          why: {
            reason: 'A migração da dor periumbilical (visceral) para a fossa ilíaca direita (parietal) é clássica de apendicite e pontua no escore de Alvarado.',
            impact: 'Sim → examinar Blumberg, Rovsing, psoas e obturador; calcular Alvarado.',
            refs: ['alvarado-1986'],
          },
        },
        characterQ([
          opt('colica', 'Cólica (vai e volta)', undefined, 'tipo cólica'),
          opt('continua', 'Contínua, em peso', undefined, 'em peso, contínua'),
          opt('queimacao', 'Queimação', undefined, 'em queimação'),
          opt('pontada', 'Pontada', undefined, 'em pontada'),
          opt('faixa', 'Em faixa', 'orange', 'em faixa'),
        ]),
        intensityQ(),
        frequencyQ(),
        worseQ([
          opt('alimentacao', 'Comer', undefined, 'à alimentação'),
          opt('gordura', 'Comida gordurosa', undefined, 'após alimentos gordurosos'),
          opt('jejum', 'Jejum', undefined, 'em jejum'),
          opt('movimento', 'Andar, tossir, sacolejar', 'orange', 'à movimentação e à tosse'),
          opt('decubito', 'Deitar', undefined, 'ao decúbito'),
          opt('evacuar', 'Evacuar', undefined, 'à evacuação'),
          opt('urinar', 'Urinar', undefined, 'à micção'),
        ]),
        betterQ([
          opt('alimentacao', 'Comer', undefined, 'com alimentação'),
          opt('antiacido', 'Antiácido', undefined, 'com antiácido'),
          opt('vomitar', 'Vomitar', undefined, 'após vômitos'),
          opt('fletir', 'Ficar encolhido/inclinado', undefined, 'em posição antálgica (flexão do tronco)'),
          opt('evacuar', 'Evacuar/eliminar gases', undefined, 'após evacuação/eliminação de flatos'),
          opt('analgesico', 'Analgésico', undefined, 'com analgésico'),
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
          'nauseas',
          'vomitos',
          'hiporexia',
          'febre',
          'diarreia',
          'constipacao',
          'parada_eliminacao',
          'distensao',
          'hematemese',
          'melena',
          'hematoquezia',
          'ictericia',
          'coluria',
          'acolia',
          'disuria',
          'hematuria',
          'dor_lombar',
          'sangramento_vaginal',
          'corrimento_vaginal',
          'atraso_menstrual',
          'dor_testicular',
        ]),
        {
          id: 'vomitos_aspecto',
          label: 'Aspecto dos vômitos',
          type: 'single',
          showIf: (c) => c.sym('vomitos') === 'sim',
          options: [
            opt('alimentar', 'Alimentar', undefined, 'alimentares'),
            opt('bilioso', 'Bilioso (verde/amarelo)', undefined, 'biliosos'),
            opt('fecaloide', 'Fecaloide', 'red', 'fecaloides'),
            opt('borra', 'Borra de café', 'red', 'em borra de café'),
            opt('sangue', 'Sangue vivo', 'red', 'com sangue vivo'),
          ],
          short: 'Aspecto dos vômitos',
          narrative: (v, _c, q) => `Vômitos ${labelsOf(q.options, v)[0]}`,
          why: {
            reason: 'Vômito fecaloide indica obstrução intestinal baixa/avançada; borra de café ou sangue vivo indicam hemorragia digestiva alta.',
            impact: 'Fecaloide → imagem e avaliação cirúrgica. Borra/sangue → ramo de hemorragia digestiva.',
          },
        },
      ],
    },
    {
      id: 'ramo_gestacao',
      title: 'Possibilidade de gestação',
      showIf: fertileWoman,
      branch: { tone: 'orange', reason: () => 'Aberto porque: mulher em idade fértil com dor abdominal.' },
      note: 'Toda mulher em idade fértil com dor abdominal deve ter gestação considerada (β-hCG). Gravidez ectópica rota é causa de choque hemorrágico.',
      questions: [
        {
          id: 'go_dum',
          label: 'Data da última menstruação (DUM)',
          type: 'date',
          short: 'DUM',
          narrative: (v) => `DUM: ${formatIsoBr(String(v))}`,
          why: {
            reason: 'Atraso menstrual + dor abdominal + sangramento é a tríade da gravidez ectópica.',
            impact: 'Atraso → β-hCG; positivo + dor → ultrassonografia transvaginal com urgência.',
          },
        },
        {
          id: 'go_gestacao_possivel',
          label: 'Existe possibilidade de gestação?',
          type: 'single',
          options: [opt('sim', 'Sim'), opt('nao', 'Não'), opt('nao_sabe', 'Não sabe')],
          short: 'Possibilidade de gestação',
          narrative: (v) =>
            v === 'sim' ? 'Refere possibilidade de gestação' : v === 'nao' ? 'Nega possibilidade de gestação' : 'Não sabe informar sobre possibilidade de gestação',
        },
      ],
    },
    {
      id: 'ramo_biliar',
      title: 'Ramo biliar',
      showIf: isBiliary,
      branch: {
        tone: 'orange',
        reason: (c) =>
          reasonFrom([
            [c.body('abd_hipocondrio_d', 'location'), 'dor em hipocôndrio direito'],
            [c.sym('ictericia') === 'sim', 'icterícia'],
            [c.sym('coluria') === 'sim', 'colúria'],
            [c.sym('acolia') === 'sim', 'acolia'],
            [c.has('piora', 'gordura'), 'piora com alimentos gordurosos'],
          ]),
      },
      note: 'Febre + icterícia + dor em hipocôndrio direito = tríade de Charcot (colangite). Com hipotensão e confusão = pêntade de Reynolds.',
      questions: [
        {
          id: 'bil_previos',
          label: 'Teve crises parecidas antes?',
          type: 'yesno',
          yesText: 'Refere crises semelhantes prévias',
          noText: 'Primeiro episódio',
        },
        {
          id: 'bil_litiase',
          label: 'Tem pedra na vesícula conhecida?',
          type: 'yesno',
          yesText: 'Colelitíase conhecida',
          noText: 'Nega colelitíase conhecida',
          why: {
            reason: 'Colelitíase é a principal causa de cólica biliar, colecistite, coledocolitíase, colangite e pancreatite aguda.',
            impact: 'Direciona para ultrassonografia de abdome superior e enzimas canaliculares.',
          },
        },
      ],
    },
    {
      id: 'ramo_pancreatico',
      title: 'Ramo pancreático',
      showIf: isPancreatic,
      branch: { tone: 'orange', reason: () => 'Aberto porque: dor epigástrica em faixa ou irradiada para o dorso.' },
      questions: [
        {
          id: 'pan_etilismo',
          label: 'Bebeu bastante álcool recentemente?',
          type: 'yesno',
          yesText: 'Refere ingestão alcoólica importante recente',
          noText: 'Nega ingestão alcoólica recente',
          why: {
            reason: 'Álcool e litíase biliar respondem pela maioria das pancreatites agudas.',
            impact: 'Solicitar lipase; investigar a etiologia para evitar recorrência.',
          },
        },
        {
          id: 'pan_tg',
          label: 'Triglicerídeos muito altos conhecidos?',
          type: 'yesno',
          yesText: 'Hipertrigliceridemia conhecida',
          noText: 'Nega hipertrigliceridemia conhecida',
          extra: true,
        },
      ],
    },
    {
      id: 'ramo_obstrucao',
      title: 'Ramo obstrução intestinal',
      showIf: isObstruction,
      branch: {
        tone: 'red',
        reason: (c) =>
          reasonFrom([
            [c.sym('parada_eliminacao') === 'sim', 'parada de eliminação de gases e fezes'],
            [c.sym('distensao') === 'sim', 'distensão'],
            [c.sym('vomitos') === 'sim' && c.has('carater', 'colica'), 'vômitos com dor em cólica'],
          ]),
      },
      questions: [
        {
          id: 'obs_cirurgia',
          label: 'Já fez cirurgia abdominal?',
          type: 'yesno',
          yesText: 'Refere cirurgia abdominal prévia',
          noText: 'Nega cirurgias abdominais prévias',
          why: {
            reason: 'Bridas (aderências) pós-operatórias são a principal causa de obstrução de delgado; hérnias são a segunda.',
            impact: 'Examinar cicatrizes e orifícios herniários; avaliação cirúrgica precoce.',
          },
        },
        {
          id: 'obs_hernia',
          label: 'Tem hérnia (umbigo, virilha)?',
          type: 'yesno',
          yesText: 'Refere hérnia conhecida',
          noText: 'Nega hérnias',
        },
        {
          id: 'obs_ultima',
          label: 'Quando evacuou / eliminou gases pela última vez?',
          type: 'text',
          short: 'Última evacuação/flatos',
        },
        {
          id: 'obs_neoplasia',
          label: 'Mudança do hábito intestinal, sangue nas fezes ou perda de peso?',
          type: 'yesno',
          yesText: 'Refere alteração do hábito intestinal/sangue nas fezes/perda de peso (investigar neoplasia)',
          noText: 'Nega alteração prévia do hábito intestinal',
          extra: true,
        },
      ],
    },
    {
      id: 'ramo_apendicite',
      title: 'Ramo apendicite',
      showIf: (c) => c.body('abd_fid', 'location') || c.has('migracao', 'sim'),
      branch: { tone: 'orange', reason: () => 'Aberto porque: dor em fossa ilíaca direita ou migração periumbilical.' },
      note: 'Calcule o escore de Alvarado na etapa de hipóteses (usa anorexia, náuseas, febre, Blumberg e leucograma).',
      questions: [
        {
          id: 'apx_sacolejo',
          label: 'A dor piora ao andar, pular ou com o sacolejo do carro?',
          type: 'yesno',
          yesText: 'Dor piora com movimentação/sacolejo (sinal de irritação peritoneal)',
          noText: 'Sem piora com movimentação',
          why: {
            reason: 'Dor que piora com movimento indica irritação peritoneal (o peritônio parietal inflamado dói quando sacudido).',
            impact: 'Sinal de peritonite localizada: aumenta a chance de abdome agudo cirúrgico.',
          },
        },
      ],
    },
    {
      id: 'ramo_urinario',
      title: 'Ramo urinário',
      showIf: isUrinary,
      branch: { tone: 'accent', reason: () => 'Aberto porque: sintomas urinários ou dor em flanco/lombar.' },
      questions: [
        {
          id: 'uri_colica',
          label: 'Cólica lombar que irradia para virilha/genitais?',
          type: 'yesno',
          yesText: 'Dor em cólica lombar irradiando para região inguinal/genital',
          noText: 'Sem irradiação para região inguinal/genital',
          why: {
            reason: 'É a apresentação clássica da cólica nefrética (cálculo no ureter).',
            impact: 'Febre + obstrução urinária = emergência urológica (desobstrução).',
          },
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
      id: 'ramo_hd',
      title: 'Ramo hemorragia digestiva',
      showIf: isGIBleed,
      branch: { tone: 'red', reason: () => 'Aberto porque: hematêmese, melena ou hematoquezia.' },
      questions: [
        {
          id: 'antitromboticos',
          label: 'Usa algum destes?',
          type: 'multi',
          options: ANTITHROMBOTIC_OPTIONS,
          short: 'Uso de antitrombóticos/AINE',
          narrative: (v, _c, q) =>
            (v as string[]).includes('nenhum')
              ? 'Nega uso de anticoagulantes, antiagregantes ou AINE'
              : `Em uso de ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'AINE/AAS causam úlcera péptica; anticoagulantes e antiagregantes aumentam a gravidade do sangramento.',
            impact: 'Muda a conduta (suspensão, reversão de anticoagulação) e o risco (Glasgow-Blatchford).',
            refs: ['blatchford-2000'],
          },
        },
        {
          id: 'hd_hepatopatia',
          label: 'Cirrose, hepatopatia ou etilismo crônico?',
          type: 'yesno',
          yesText: 'Hepatopatia/etilismo crônico (risco de varizes esofágicas)',
          noText: 'Nega hepatopatia ou etilismo crônico',
          why: {
            reason: 'Hepatopata com HDA = hemorragia varicosa até prova em contrário: muda o tratamento inicial (vasoativo, antibiótico profilático, endoscopia precoce).',
            impact: 'Sim → acionar endoscopia com urgência e iniciar terapia específica (conferir doses).',
          },
        },
      ],
    },
    {
      id: 'ramo_vascular',
      title: 'Ramo vascular (isquemia mesentérica / aneurisma)',
      showIf: isVascular,
      branch: { tone: 'red', reason: () => 'Aberto porque: idade ≥ 50 anos com dor súbita ou muito intensa.' },
      questions: [
        {
          id: 'vas_fa',
          label: 'Tem fibrilação atrial, infarto recente ou doença vascular?',
          type: 'yesno',
          yesText: 'Refere FA/IAM recente/doença vascular (fonte embólica)',
          noText: 'Nega FA ou doença vascular conhecida',
          why: {
            reason: 'Embolia de artéria mesentérica superior a partir de FA é a causa clássica de isquemia mesentérica aguda.',
            impact: 'Dor desproporcional ao exame + FA → angiotomografia de abdome urgente.',
          },
        },
        {
          id: 'vas_desproporcional',
          label: 'A dor é muito mais intensa do que o exame do abdome sugere?',
          type: 'yesno',
          yesText: 'Dor desproporcional ao exame físico',
          noText: 'Dor compatível com o exame físico',
        },
        {
          id: 'vas_aneurisma',
          label: 'Aneurisma de aorta conhecido ou massa pulsátil?',
          type: 'yesno',
          yesText: 'Aneurisma de aorta conhecido/massa pulsátil',
          noText: 'Nega aneurisma de aorta conhecido',
        },
      ],
    },
    {
      id: 'ramo_testicular',
      title: 'Ramo testicular',
      showIf: (c) => c.sex === 'M' && (c.sym('dor_testicular') === 'sim' || c.body('genital') || c.body('inguinal')),
      branch: { tone: 'red', reason: () => 'Aberto porque: dor em região inguinal/genital em paciente masculino.' },
      questions: [
        {
          id: 'torcao',
          label: 'Dor testicular de início súbito?',
          type: 'yesno',
          yesText: 'Dor testicular de início súbito (suspeita de torção testicular)',
          noText: 'Dor testicular de início gradual',
          why: {
            reason: 'Torção testicular é emergência: a viabilidade do testículo cai muito após 6 horas.',
            impact: 'Suspeita → avaliação urológica imediata; não atrasar por exames.',
          },
        },
      ],
    },
    finalSection(),
  ],
};

function formatIsoBr(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
