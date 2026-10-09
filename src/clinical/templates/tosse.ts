import type { ComplaintTemplate } from '../types';
import { associatedQ, evolutionQ, finalSection, imunoQ, labelsOf, onsetQ, opt } from './common';
import { joinPt } from '../../lib/format';

/** Classificação por duração (CHEST): aguda < 3 sem · subaguda 3–8 · crônica > 8. */
function coughClass(days?: number) {
  if (days === undefined) return null;
  if (days < 21) return { label: 'aguda (< 3 semanas)', tone: 'green' as const };
  if (days <= 56) return { label: 'subaguda (3 a 8 semanas)', tone: 'orange' as const };
  return { label: 'crônica (> 8 semanas)', tone: 'orange' as const };
}

export const tosse: ComplaintTemplate = {
  id: 'tosse',
  name: 'Tosse',
  subject: 'Tosse',
  description: 'Aguda × subaguda × crônica, expectoração e hemoptise, pneumonia, tuberculose (sintomático respiratório) e causas crônicas (IECA, refluxo, asma, gotejamento).',
  keywords: ['tosse', 'tossindo', 'catarro', 'pigarro', 'expectoração', 'expectoracao', 'escarro'],
  systems: ['respiratorio', 'otorrino', 'digestorio', 'cardiovascular'],
  isPain: false,
  sections: [
    {
      id: 'semiologia',
      title: 'Características da tosse',
      prose: 'list',
      questions: [
        onsetQ(),
        {
          id: 'tos_tipo',
          label: 'Seca ou com catarro?',
          type: 'single',
          options: [opt('seca', 'Seca', undefined, 'seca'), opt('produtiva', 'Com catarro (produtiva)', undefined, 'produtiva')],
          short: 'Tipo',
          narrative: (v, _c, q) => labelsOf(q.options, v)[0],
          // classificação pela duração da queixa principal (CHEST)
          computed: (c) => {
            const k = coughClass(c.complaintDays);
            return k ? { text: `Pela duração: tosse ${k.label}`, tone: k.tone } : null;
          },
          why: {
            reason:
              'A duração organiza o raciocínio. Aguda (< 3 semanas): infecção viral de vias aéreas, pneumonia, exacerbação de asma/DPOC, TEP. Subaguda (3–8 semanas): pós-infecciosa. Crônica (> 8 semanas): gotejamento pós-nasal, asma, refluxo, bronquite eosinofílica, IECA — e tuberculose/câncer no nosso meio. Seca × produtiva separa irritação de vias aéreas de doença com secreção (infecção, bronquiectasia).',
            impact: 'Tosse ≥ 3 semanas = sintomático respiratório: pesquisar tuberculose (baciloscopia ou teste rápido molecular).',
            refs: ['chest-tosse-2018', 'ms-tb-2019'],
          },
        },
        {
          id: 'tos_escarro',
          label: 'Como é o catarro?',
          type: 'multi',
          showIf: (c) => c.has('tos_tipo', 'produtiva'),
          options: [
            opt('claro', 'Claro/mucoide', undefined, 'mucoide'),
            opt('purulento', 'Amarelado/esverdeado', 'orange', 'purulenta'),
            opt('sangue', 'Com raias de sangue', 'red', 'hemoptoica'),
            opt('rosea', 'Espumoso rosado', 'red', 'espumosa rósea'),
            opt('fetido', 'Mau cheiro', 'orange', 'fétida'),
            opt('volumoso', 'Muito volume (copos/dia)', 'orange', 'volumosa'),
          ],
          short: 'Expectoração',
          narrative: (v, _c, q) => `com expectoração ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason:
              'Purulenta sugere infecção bacteriana (pneumonia, bronquiectasia); fétida, abscesso/anaeróbios; espumosa rósea, edema agudo de pulmão; raias de sangue, bronquite, tuberculose, câncer ou TEP.',
            impact: 'Sangue no escarro abre a investigação de hemoptise (volume, tuberculose, câncer, TEP).',
          },
        },
        {
          id: 'tos_padrao',
          label: 'Quando é pior?',
          type: 'multi',
          options: [
            opt('noturna', 'À noite', undefined, 'à noite'),
            opt('deitar', 'Ao deitar', undefined, 'ao deitar'),
            opt('refeicoes', 'Após refeições', undefined, 'após as refeições'),
            opt('exercicio', 'Com exercício', undefined, 'aos exercícios'),
            opt('frio', 'Frio, poeira, cheiro forte', undefined, 'com frio/poeira/odores'),
            opt('matinal', 'Ao acordar', undefined, 'ao acordar'),
          ],
          short: 'Piora',
          narrative: (v, _c, q) => `com piora ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Noturna e com frio/exercício sugere asma; ao deitar e após refeições, refluxo ou gotejamento pós-nasal; ao acordar com escarro, bronquite crônica (tabagista).',
            impact: 'Direciona o tratamento empírico na tosse crônica.',
            refs: ['chest-tosse-2018'],
          },
        },
        evolutionQ(),
      ],
    },
    {
      id: 'associados',
      title: 'Sintomas associados',
      questions: [
        associatedQ([
          'febre',
          'dispneia',
          'dor_pleuritica',
          'hemoptise',
          'sibilancia',
          'coriza',
          'obstrucao_nasal',
          'dor_garganta',
          'rouquidao',
          'pirose',
          'regurgitacao',
          'perda_peso',
          'sudorese_noturna',
          'ortopneia',
          'edema_mmii',
        ]),
      ],
    },
    {
      id: 'red_flags',
      title: 'Sinais de alarme',
      branch: { tone: 'red', reason: () => 'Sempre investigar na tosse: hemoptise, insuficiência respiratória, tuberculose e câncer.' },
      questions: [
        {
          id: 'tos_alarme',
          label: 'Sinais de alarme',
          hint: '1 toque = presente · 2 toques = ausente',
          type: 'tri',
          options: [
            opt('hemoptise_volume', 'Sangue vivo em quantidade (mais que raias)', 'red', 'hemoptise volumosa'),
            opt('dispneia_repouso', 'Falta de ar em repouso', 'red', 'dispneia em repouso'),
            opt('perda_peso', 'Perda de peso sem explicação', 'red', 'perda de peso inexplicada'),
            opt('sudorese', 'Suor noturno / febre vespertina', 'orange', 'sudorese noturna/febre vespertina'),
            opt('tabagista', 'Tabagista > 40 anos com tosse que mudou', 'orange', 'tabagista > 40 anos com mudança no padrão da tosse'),
            opt('rouquidao', 'Rouquidão persistente (> 3 semanas)', 'orange', 'rouquidão persistente'),
            opt('disfagia', 'Engasgos/dificuldade para engolir', 'orange', 'disfagia/engasgos'),
          ],
          short: 'Sinais de alarme',
          why: {
            reason:
              'Hemoptise volumosa e dispneia em repouso são emergências. Perda de peso, sudorese noturna e tosse prolongada sugerem tuberculose ou neoplasia. Tabagista com mudança no padrão da tosse ou rouquidão persistente: considerar câncer de pulmão/laringe. Engasgos: aspiração.',
            impact: 'Presença de qualquer um → radiografia de tórax e investigação dirigida; hemoptise volumosa/dispneia em repouso → estabilização imediata.',
            refs: ['chest-tosse-2018'],
          },
        },
      ],
    },
    {
      id: 'ramo_tb',
      title: 'Ramo tuberculose',
      showIf: (c) => (c.complaintDays ?? 0) >= 21 || c.sym('sudorese_noturna') === 'sim' || c.sym('hemoptise') === 'sim' || c.has('tos_escarro', 'sangue'),
      branch: { tone: 'orange', reason: () => 'Aberto porque: tosse ≥ 3 semanas, suor noturno ou sangue no escarro.' },
      note: 'Sintomático respiratório: tosse por 3 semanas ou mais. Em populações vulneráveis (privados de liberdade, situação de rua, PVHIV, indígenas, contatos), investigar com qualquer duração.',
      questions: [
        {
          id: 'tb_contato',
          label: 'Contato com alguém com tuberculose?',
          type: 'yesno',
          yesText: 'Refere contato com caso de tuberculose',
          noText: 'Nega contato com tuberculose',
        },
        {
          id: 'tb_risco',
          label: 'Situações de maior risco',
          type: 'multi',
          options: [
            opt('prisional', 'Privação de liberdade (atual/prévia)'),
            opt('rua', 'Situação de rua'),
            opt('hiv', 'HIV'),
            opt('saude', 'Profissional de saúde'),
            opt('indigena', 'Indígena'),
            opt('drogas', 'Uso de álcool/drogas'),
            opt('dm', 'Diabetes'),
            opt('tb_previa', 'Tuberculose tratada antes'),
          ],
          short: 'Risco para tuberculose',
          narrative: (v, _c, q) => `Fatores de risco para tuberculose: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Esses grupos têm incidência muito maior de tuberculose no Brasil, e a busca ativa é recomendada mesmo com tosse de menor duração.',
            impact: 'Solicitar baciloscopia/teste rápido molecular (TRM-TB) do escarro e radiografia de tórax.',
            refs: ['ms-tb-2019'],
          },
        },
      ],
    },
    {
      id: 'ramo_cronica',
      title: 'Ramo tosse crônica',
      showIf: (c) => (c.complaintDays ?? 0) > 56,
      branch: { tone: 'accent', reason: () => 'Aberto porque: tosse há mais de 8 semanas.' },
      questions: [
        {
          id: 'tc_ieca',
          label: 'Usa remédio da pressão do tipo captopril/enalapril (IECA)?',
          type: 'yesno',
          yesText: 'Em uso de IECA',
          noText: 'Nega uso de IECA',
          why: {
            reason: 'Tosse seca é efeito adverso comum dos IECA (captopril, enalapril, ramipril…), pode surgir semanas a meses após o início e melhora após a suspensão.',
            impact: 'Em uso → considerar trocar por BRA (losartana) e reavaliar em algumas semanas.',
            refs: ['chest-tosse-2018'],
          },
        },
        {
          id: 'tc_causas',
          label: 'Pistas das causas mais comuns',
          type: 'multi',
          options: [
            opt('gotejamento', 'Secreção escorrendo na garganta / pigarro'),
            opt('rinite', 'Rinite/sinusite'),
            opt('asma', 'Chiado ou asma conhecida'),
            opt('refluxo', 'Azia/refluxo'),
            opt('tabagismo', 'Tabagismo atual'),
            opt('ocupacional', 'Exposição ocupacional (poeira, fumaça)'),
          ],
          short: 'Pistas para tosse crônica',
          narrative: (v, _c, q) => `Na tosse crônica, refere: ${joinPt(labelsOf(q.options, v))}`,
        },
      ],
    },
    {
      id: 'ramo_pneumonia',
      title: 'Ramo pneumonia',
      showIf: (c) => c.sym('febre') === 'sim' || c.sym('dor_pleuritica') === 'sim' || c.has('tos_escarro', 'purulento'),
      branch: { tone: 'accent', reason: () => 'Aberto porque: febre, dor pleurítica ou escarro purulento.' },
      note: 'Na suspeita de pneumonia, calcule o CURB-65 (Escores) para decidir o local de tratamento.',
      questions: [
        {
          id: 'pac_risco',
          label: 'Fatores que mudam o tratamento',
          type: 'multi',
          options: [
            opt('atb_recente', 'Antibiótico nos últimos 3 meses', 'orange'),
            opt('internacao', 'Internação nos últimos 3 meses', 'orange'),
            opt('aspiracao', 'Risco de aspiração (engasgos, etilismo, rebaixamento)', 'orange'),
            opt('dpoc', 'DPOC/bronquiectasia'),
            opt('instituicao', 'Mora em instituição de longa permanência'),
          ],
          short: 'Fatores de risco para pneumonia',
          narrative: (v, _c, q) => `Fatores relevantes para pneumonia: ${joinPt(labelsOf(q.options, v))}`,
          why: {
            reason: 'Antibiótico ou internação recente aumentam o risco de germes resistentes; aspiração sugere anaeróbios e pneumonia de lobos inferiores/posteriores.',
            impact: 'Modifica a escolha do antibiótico empírico e o limiar para internação.',
            refs: ['sbpt-pac-2018'],
          },
        },
        imunoQ(),
      ],
    },
    finalSection(),
  ],
};
