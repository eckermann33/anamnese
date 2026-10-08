import type { ComplaintTemplate, QuestionContext } from '../types';
import {
  ANTITHROMBOTIC_OPTIONS,
  associatedQ,
  betterQ,
  characterQ,
  episodeDurationQ,
  evolutionQ,
  finalSection,
  frequencyQ,
  imunoQ,
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

const isThunderclap = (c: QuestionContext) => c.has('inicio', 'thunderclap') || (c.has('inicio', 'subito') && (c.num('intensidade') ?? 0) >= 7);

const isMeningitis = (c: QuestionContext) => c.sym('febre') === 'sim' || c.sym('rigidez_nuca') === 'sim';

const isNewPattern = (c: QuestionContext) => c.has('cef_padrao', 'primeiro', 'diferente', 'progressiva');

const isMigraine = (c: QuestionContext) =>
  c.has('carater', 'pulsatil') && (c.sym('nauseas') === 'sim' || c.sym('fotofobia') === 'sim' || c.sym('fonofobia') === 'sim');

const isICH = (c: QuestionContext) =>
  c.has('piora', 'valsalva', 'deitar', 'acordar') || c.has('cef_padrao', 'progressiva') || c.sym('diplopia') === 'sim';

export const cefaleia: ComplaintTemplate = {
  id: 'cefaleia',
  name: 'Cefaleia',
  subject: 'Cefaleia',
  description: 'SNNOOP10, HSA (regra de Ottawa), meningite, arterite temporal, migrânea, salvas e hipertensão intracraniana.',
  keywords: ['cabeça', 'cabeca', 'cefal', 'enxaqueca', 'migr', 'dor na nuca'],
  systems: ['neurologico', 'oftalmologico', 'otorrino'],
  isPain: true,
  sections: [
    {
      id: 'semiologia',
      title: 'Semiologia da cefaleia',
      prose: 'list',
      questions: [
        onsetQ([
          opt('thunderclap', 'Súbita — máxima em < 1 minuto', 'red', 'súbito, com pico de intensidade em menos de 1 minuto (em trovoada)'),
          opt('subito', 'Súbita (minutos)', 'orange', 'súbito'),
          opt('insidioso', 'Gradual', undefined, 'gradual'),
        ]),
        {
          id: 'cef_padrao',
          label: 'Padrão em relação a dores anteriores',
          type: 'single',
          options: [
            opt('primeiro', 'Primeira vez na vida', 'orange', 'primeiro episódio'),
            opt('igual', 'Recorrente, igual às anteriores', undefined, 'recorrente, semelhante às crises habituais'),
            opt('diferente', 'Recorrente, mas diferente do habitual', 'orange', 'com mudança do padrão habitual'),
            opt('progressiva', 'Progressiva (piora dia a dia)', 'orange', 'progressiva'),
          ],
          short: 'Padrão',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason:
              'Cefaleia nova, com mudança de padrão ou progressiva são sinais de alarme (SNNOOP10) para cefaleia secundária. Cefaleia recorrente e igual às anteriores favorece cefaleia primária.',
            impact: 'Padrão novo/diferente/progressivo → considerar neuroimagem.',
            refs: ['snnoop10-2019'],
          },
        },
        locationQ('head'),
        {
          id: 'cef_lado',
          label: 'Lateralidade',
          type: 'single',
          options: [
            opt('unilateral_fixo', 'Unilateral, sempre o mesmo lado', 'orange', 'unilateral, sempre do mesmo lado'),
            opt('unilateral_alterna', 'Unilateral, alterna o lado', undefined, 'unilateral, alternando o lado'),
            opt('bilateral', 'Bilateral', undefined, 'bilateral'),
            opt('holocraniana', 'Holocraniana (cabeça toda)', undefined, 'holocraniana'),
          ],
          short: 'Lateralidade',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          why: {
            reason: 'Dor sempre do mesmo lado sugere lesão estrutural; migrânea costuma alternar o lado; cefaleia tensional é tipicamente bilateral.',
            impact: 'Unilateral fixa e recente → menor limiar para neuroimagem.',
          },
        },
        characterQ([
          opt('pulsatil', 'Pulsátil / latejante', undefined, 'pulsátil'),
          opt('pressao', 'Pressão / aperto', undefined, 'em pressão'),
          opt('pontada', 'Pontada / facada', undefined, 'em pontada'),
          opt('choque', 'Choque', undefined, 'em choque'),
        ]),
        intensityQ(),
        episodeDurationQ([
          opt('segundos', 'Segundos a 2 minutos', undefined, 'segundos'),
          opt('15_180', '15 a 180 minutos', undefined, '15 a 180 minutos'),
          opt('4_72', '4 a 72 horas', undefined, '4 a 72 horas'),
          opt('continua', 'Contínua / dias', 'orange', 'contínua'),
        ]),
        frequencyQ(),
        worseQ([
          opt('atividade', 'Atividade física rotineira', undefined, 'à atividade física rotineira'),
          opt('luz', 'Luz', undefined, 'à luz'),
          opt('barulho', 'Barulho', undefined, 'ao barulho'),
          opt('valsalva', 'Tosse/espirro/esforço', 'orange', 'à manobra de Valsalva (tosse, espirro, esforço)'),
          opt('deitar', 'Deitar', 'orange', 'ao deitar'),
          opt('em_pe', 'Ficar em pé', undefined, 'em ortostatismo'),
          opt('acordar', 'Ao acordar', 'orange', 'ao despertar'),
        ]),
        betterQ([
          opt('escuro', 'Repouso no escuro', undefined, 'com repouso em ambiente escuro'),
          opt('analgesico', 'Analgésico', undefined, 'com analgésico'),
          opt('sono', 'Dormir', undefined, 'com o sono'),
          opt('deitar', 'Deitar', undefined, 'ao deitar'),
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
          'fotofobia',
          'fonofobia',
          'febre',
          'rigidez_nuca',
          'deficit_motor',
          'alteracao_fala',
          'desvio_rima',
          'parestesia',
          'confusao',
          'convulsao',
          'diplopia',
          'baixa_acuidade',
          'perda_visual_subita',
          'escotomas',
          'tontura',
          'vertigem',
        ]),
      ],
    },
    {
      id: 'ramo_hsa',
      title: 'Ramo hemorragia subaracnóidea',
      showIf: isThunderclap,
      branch: { tone: 'red', reason: () => 'Aberto porque: cefaleia de início súbito e intensa.' },
      note: 'Regra de Ottawa para HSA (pacientes alertas, ≥ 15 anos, cefaleia não traumática com pico em 1 h): qualquer critério positivo → investigar (TC sem contraste ± punção lombar).',
      questions: [
        {
          id: 'hsa_pior',
          label: 'É a pior dor de cabeça da vida?',
          type: 'yesno',
          yesText: 'Refere a pior cefaleia da vida',
          noText: 'Não é a pior cefaleia da vida',
          why: {
            reason: '“Pior dor da vida” de início súbito é a apresentação clássica da HSA por ruptura de aneurisma.',
            impact: 'TC de crânio sem contraste imediata; se negativa e alta suspeita, punção lombar/angio-TC conforme protocolo.',
            refs: ['ottawa-hsa-2013', 'snnoop10-2019'],
          },
        },
        {
          id: 'hsa_esforco',
          label: 'Começou durante esforço ou relação sexual?',
          type: 'yesno',
          yesText: 'Início durante esforço físico/relação sexual',
          noText: 'Sem relação com esforço',
          why: {
            reason: 'Início durante esforço é critério da regra de Ottawa para HSA.',
            impact: 'Critério positivo → não se pode excluir HSA clinicamente.',
            refs: ['ottawa-hsa-2013'],
          },
        },
        {
          id: 'hsa_pc',
          label: 'Houve perda de consciência presenciada?',
          type: 'yesno',
          yesText: 'Perda de consciência presenciada',
          noText: 'Nega perda de consciência',
        },
        {
          id: 'hsa_pescoco',
          label: 'Dor ou rigidez no pescoço?',
          type: 'yesno',
          symptom: 'rigidez_nuca',
          yesText: 'Refere dor/rigidez cervical',
          noText: 'Nega dor ou rigidez cervical',
        },
      ],
    },
    {
      id: 'ramo_meningite',
      title: 'Ramo meningite / infecção do SNC',
      showIf: isMeningitis,
      branch: {
        tone: 'red',
        reason: (c) =>
          reasonFrom([
            [c.sym('febre') === 'sim', 'febre'],
            [c.sym('rigidez_nuca') === 'sim', 'rigidez de nuca'],
          ]),
      },
      questions: [
        {
          id: 'men_peteq',
          label: 'Manchas vermelhas/arroxeadas que não somem ao apertar?',
          type: 'yesno',
          symptom: 'petequias',
          yesText: 'Refere lesões petequiais/purpúricas',
          noText: 'Nega petéquias',
          why: {
            reason: 'Febre + petéquias/púrpura = meningococcemia até prova em contrário — evolui em horas.',
            impact: 'Antibiótico imediato (não esperar exames), isolamento e notificação.',
          },
        },
        imunoQ(),
        {
          id: 'men_contato',
          label: 'Contato com caso de meningite?',
          type: 'yesno',
          yesText: 'Contato com caso de meningite',
          noText: 'Nega contato com casos de meningite',
          extra: true,
        },
        {
          id: 'men_foco',
          label: 'Sinusite/otite recente, trauma de crânio ou neurocirurgia?',
          type: 'yesno',
          yesText: 'Refere sinusite/otite recente, TCE ou neurocirurgia',
          noText: 'Nega focos parameníngeos, TCE ou neurocirurgia',
          extra: true,
        },
      ],
    },
    {
      id: 'ramo_arterite',
      title: 'Ramo arterite de células gigantes',
      showIf: (c) => (c.ageYears ?? 0) >= 50 && isNewPattern(c),
      branch: { tone: 'red', reason: () => 'Aberto porque: cefaleia nova/diferente em paciente com 50 anos ou mais.' },
      questions: [
        {
          id: 'acg_claudicacao',
          label: 'Dor na mandíbula ao mastigar?',
          type: 'yesno',
          yesText: 'Refere claudicação mandibular',
          noText: 'Nega claudicação mandibular',
          why: {
            reason: 'Claudicação mandibular é o sintoma mais específico de arterite de células gigantes (temporal).',
            impact: 'Suspeita → VHS/PCR e corticoide precoce para evitar cegueira irreversível (conferir dose).',
          },
        },
        {
          id: 'acg_visual',
          label: 'Perdeu a visão de um olho por alguns minutos?',
          type: 'yesno',
          yesText: 'Refere amaurose transitória',
          noText: 'Nega alterações visuais transitórias',
        },
        {
          id: 'acg_pmr',
          label: 'Dor e rigidez nos ombros e quadris?',
          type: 'yesno',
          yesText: 'Refere dor e rigidez em cinturas escapular e pélvica',
          noText: 'Nega sintomas de polimialgia',
          extra: true,
        },
      ],
    },
    {
      id: 'ramo_migranea',
      title: 'Ramo migrânea',
      showIf: isMigraine,
      branch: { tone: 'accent', reason: () => 'Aberto porque: dor pulsátil com náusea, fotofobia ou fonofobia.' },
      questions: [
        {
          id: 'mig_crises',
          label: 'Já teve 5 ou mais crises parecidas?',
          type: 'yesno',
          yesText: 'Refere 5 ou mais crises semelhantes',
          noText: 'Menos de 5 crises semelhantes',
          why: {
            reason: 'O diagnóstico de migrânea sem aura (ICHD-3) exige ≥ 5 crises de 4–72 h com características típicas.',
            impact: 'Primeira crise “típica” ainda exige afastar causas secundárias.',
            refs: ['ichd3-2018'],
          },
        },
        {
          id: 'mig_aura',
          label: 'Aura antes da dor?',
          type: 'multi',
          options: [
            opt('visual', 'Visual (luzes, zigue-zague)', undefined, 'visual'),
            opt('sensitiva', 'Sensitiva (formigamento)', undefined, 'sensitiva'),
            opt('fala', 'Alteração da fala', undefined, 'de linguagem'),
            opt('nenhuma', 'Nenhuma'),
          ],
          short: 'Aura',
          narrative: (v, _c, q) =>
            (v as string[]).includes('nenhuma') ? 'Nega aura' : `Aura ${joinPt(labelsOf(q.options, v))} precedendo a dor`,
          why: {
            reason: 'Aura típica é reversível, dura 5–60 min e se instala gradualmente. Aura motora, súbita ou que não reverte não é típica.',
            impact: 'Déficit súbito/persistente → tratar como AVC/AIT, não como migrânea.',
            refs: ['ichd3-2018'],
          },
        },
        {
          id: 'mig_dias_analgesico',
          label: 'Em quantos dias por mês usa analgésico?',
          type: 'number',
          unit: 'dias/mês',
          min: 0,
          max: 31,
          short: 'Dias de analgésico por mês',
          narrative: (v) => `Uso de analgésicos em ${v} dias por mês`,
          computed: (c) => {
            const d = c.num('mig_dias_analgesico');
            if (d === undefined) return null;
            if (d >= 15) return { text: 'Risco de cefaleia por uso excessivo de medicamentos (≥ 15 dias/mês)', tone: 'orange' };
            if (d >= 10) return { text: 'Atenção: ≥ 10 dias/mês (limite para triptanos/combinações)', tone: 'orange' };
            return { text: 'Uso de analgésicos dentro do limite', tone: 'green' };
          },
          why: {
            reason: 'Uso de analgésicos simples ≥ 15 dias/mês (ou triptanos/combinações ≥ 10 dias/mês) por > 3 meses define cefaleia por uso excessivo de medicamentos.',
            impact: 'Muda o tratamento: retirada do analgésico e profilaxia.',
            refs: ['ichd3-2018'],
          },
        },
      ],
    },
    {
      id: 'ramo_trigeminoautonomica',
      title: 'Ramo cefaleia em salvas',
      showIf: (c) => c.has('cef_lado', 'unilateral_fixo', 'unilateral_alterna') && (c.body('cabeca_periorbitaria') || c.body('cabeca_temporal')),
      branch: { tone: 'accent', reason: () => 'Aberto porque: dor unilateral periorbitária/temporal.' },
      questions: [
        {
          id: 'tac_autonomicos',
          label: 'Do mesmo lado da dor, durante a crise:',
          type: 'multi',
          options: [
            opt('lacrimejamento', 'Lacrimejamento'),
            opt('hiperemia', 'Olho vermelho'),
            opt('rinorreia', 'Nariz entupido/escorrendo'),
            opt('ptose', 'Pálpebra caída/pupila menor'),
            opt('sudorese', 'Suor na face'),
            opt('inquietacao', 'Inquietação/agitação'),
          ],
          short: 'Sinais autonômicos ipsilaterais',
          narrative: (v, _c, q) => `Sinais autonômicos ipsilaterais: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Dor orbitária unilateral intensa (15–180 min) com sinais autonômicos ipsilaterais e inquietação caracteriza a cefaleia em salvas.',
            impact: 'Muda o tratamento agudo (oxigênio a 100%, triptano) — conferir doses.',
            refs: ['ichd3-2018'],
          },
        },
      ],
    },
    {
      id: 'ramo_hic',
      title: 'Ramo hipertensão intracraniana / lesão expansiva',
      showIf: isICH,
      branch: {
        tone: 'red',
        reason: (c) =>
          reasonFrom([
            [c.has('piora', 'valsalva'), 'piora com Valsalva'],
            [c.has('piora', 'deitar', 'acordar'), 'piora ao deitar/ao acordar'],
            [c.has('cef_padrao', 'progressiva'), 'padrão progressivo'],
            [c.sym('diplopia') === 'sim', 'diplopia'],
          ]),
      },
      questions: [
        {
          id: 'hic_vomito_jato',
          label: 'Vômitos em jato?',
          type: 'yesno',
          yesText: 'Refere vômitos em jato',
          noText: 'Nega vômitos em jato',
        },
        {
          id: 'hic_visual',
          label: 'Visão turva passageira?',
          type: 'yesno',
          yesText: 'Refere obscurecimentos visuais transitórios',
          noText: 'Nega obscurecimentos visuais',
          why: {
            reason: 'Obscurecimentos visuais transitórios e diplopia (VI nervo) sugerem hipertensão intracraniana com papiledema.',
            impact: 'Fundoscopia obrigatória; neuroimagem antes de punção lombar.',
          },
        },
        {
          id: 'hic_cancer',
          label: 'Câncer prévio?',
          type: 'yesno',
          yesText: 'História de neoplasia',
          noText: 'Nega neoplasia',
          why: {
            reason: 'Cefaleia nova em paciente com câncer sugere metástase cerebral (SNNOOP10: “N — neoplasia”).',
            impact: 'Neuroimagem com contraste.',
            refs: ['snnoop10-2019'],
          },
        },
        {
          id: 'antitromboticos',
          label: 'Usa algum destes?',
          type: 'multi',
          options: ANTITHROMBOTIC_OPTIONS,
          short: 'Uso de antitrombóticos/AINE',
          narrative: (v, _c, q) =>
            (v as string[]).includes('nenhum') ? 'Nega uso de anticoagulantes ou antiagregantes' : `Em uso de ${joinPt(labelsOf(q.options, v))}`,
        },
        {
          id: 'tce_recente',
          label: 'Bateu a cabeça recentemente?',
          type: 'yesno',
          yesText: 'Refere TCE recente',
          noText: 'Nega trauma cranioencefálico',
        },
      ],
    },
    {
      id: 'ramo_gestante',
      title: 'Gestante / puérpera',
      showIf: (c) => c.profile === 'gestante',
      branch: { tone: 'red', reason: () => 'Aberto porque: perfil gestante.' },
      note: 'Cefaleia na gestação/puerpério: afastar pré-eclâmpsia com sinais de gravidade e trombose venosa cerebral.',
      questions: [
        {
          id: 'pe_sintomas',
          label: 'Sintomas de pré-eclâmpsia grave',
          type: 'multi',
          options: [
            opt('visuais', 'Visão turva/escotomas', 'red', 'escotomas/visão turva'),
            opt('epigastralgia', 'Dor epigástrica/hipocôndrio direito', 'red', 'dor epigástrica ou em hipocôndrio direito'),
            opt('edema', 'Inchaço súbito de face/mãos', 'orange', 'edema súbito de face e mãos'),
          ],
          short: 'Sintomas de iminência de eclâmpsia',
          narrative: (v, _c, q) => `Refere ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Cefaleia, alterações visuais e epigastralgia em gestante com PA elevada são sinais de gravidade da pré-eclâmpsia (iminência de eclâmpsia).',
            impact: 'Aferir PA imediatamente; se ≥ 140/90 com sintomas → sulfato de magnésio e anti-hipertensivo conforme protocolo (conferir doses).',
            refs: ['febrasgo-pe-2024'],
          },
        },
      ],
    },
    finalSection(),
  ],
};
