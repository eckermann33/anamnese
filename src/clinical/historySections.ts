import type { Option, QuestionContext, QuestionSection } from './types';
import { labelsOf, opt } from './templates/common';
import { formatDate, formatNumber, joinPt, toDate } from '../lib/format';

/* ==========================================================================
   SEÇÕES DE ANTECEDENTES, PERFIS, FAMÍLIA, HÁBITOS E CONDIÇÕES SOCIAIS
   (todas renderizadas pelo mesmo componente de perguntas da HDA)
   ========================================================================== */

/** Doenças prévias (chips) — os IDs são usados pelas red flags e pelos escores. */
export const DISEASE_OPTIONS: Option[] = [
  opt('has', 'Hipertensão', undefined, 'HAS'),
  opt('dm2', 'Diabetes tipo 2', undefined, 'DM2'),
  opt('dm1', 'Diabetes tipo 1', undefined, 'DM1'),
  opt('dislipidemia', 'Dislipidemia'),
  opt('dac', 'Doença coronariana/IAM', undefined, 'DAC'),
  opt('ic', 'Insuficiência cardíaca', undefined, 'IC'),
  opt('fa', 'Fibrilação atrial', undefined, 'FA'),
  opt('avc', 'AVC/AIT prévio', undefined, 'AVC/AIT prévio'),
  opt('dap', 'Doença arterial periférica', undefined, 'DAP'),
  opt('tev', 'TVP/TEP prévio', undefined, 'TEV prévio'),
  opt('dpoc', 'DPOC'),
  opt('asma', 'Asma'),
  opt('drc', 'Doença renal crônica', undefined, 'DRC'),
  opt('hepatopatia', 'Hepatopatia/cirrose', undefined, 'hepatopatia'),
  opt('hipotireoidismo', 'Hipotireoidismo'),
  opt('hipertireoidismo', 'Hipertireoidismo'),
  opt('hiv', 'HIV'),
  opt('cancer', 'Câncer', undefined, 'neoplasia'),
  opt('depressao', 'Depressão/ansiedade', undefined, 'transtorno depressivo/ansioso'),
  opt('epilepsia', 'Epilepsia'),
  opt('tb', 'Tuberculose prévia', undefined, 'tuberculose prévia'),
  opt('reumato', 'Doença reumatológica', undefined, 'doença reumatológica'),
  opt('obesidade', 'Obesidade'),
  opt('sangramento', 'Sangramento maior prévio', undefined, 'sangramento maior prévio'),
];

export const VACCINE_SECTION: QuestionSection = {
  id: 'vacinas',
  title: 'Vacinação',
  questions: [
    {
      id: 'ap_vacinas_situacao',
      label: 'Cartão vacinal',
      type: 'single',
      options: [
        opt('em_dia', 'Em dia', undefined, 'em dia'),
        opt('atrasado', 'Atrasado/incompleto', 'orange', 'incompleto'),
        opt('nao_sabe', 'Não sabe informar', undefined, 'não sabe informar'),
      ],
      short: 'Cartão vacinal',
      narrative: (v, _c, q) => `Cartão vacinal ${labelsOf(q.options, v)[0]}`,
    },
    {
      id: 'ap_vacinas',
      label: 'Vacinas confirmadas',
      type: 'multi',
      extra: true,
      options: [
        opt('influenza', 'Influenza (último ano)', undefined, 'influenza'),
        opt('covid', 'COVID-19', undefined, 'COVID-19'),
        opt('pneumo', 'Pneumocócica', undefined, 'pneumocócica'),
        opt('hepb', 'Hepatite B', undefined, 'hepatite B'),
        opt('dt', 'dT/dTpa', undefined, 'dT/dTpa'),
        opt('fa', 'Febre amarela', undefined, 'febre amarela'),
        opt('hpv', 'HPV', undefined, 'HPV'),
        opt('zoster', 'Herpes-zóster', undefined, 'herpes-zóster'),
      ],
      short: 'Vacinas',
      narrative: (v, _c, q) => `Vacinas confirmadas: ${joinPt(labelsOf(q.options, v))}`,
      why: {
        reason: 'O status vacinal muda o diferencial (ex.: febre amarela, sarampo, coqueluche) e é oportunidade de prevenção.',
        impact: 'dT atrasada + ferimento → profilaxia antitetânica.',
      },
    },
  ],
};

/* ---------------- Gineco-obstétricos ---------------- */

/** Idade gestacional a partir da DUM (regra de Naegele para DPP). */
export function gestationalAge(dumIso: string, today = new Date()): { weeks: number; days: number; dpp: Date } | null {
  const dum = toDate(dumIso);
  if (Number.isNaN(dum.getTime())) return null;
  const diff = Math.floor((today.getTime() - dum.getTime()) / 86_400_000);
  if (diff < 0 || diff > 45 * 7) return null;
  const dpp = new Date(dum.getTime() + 280 * 86_400_000);
  return { weeks: Math.floor(diff / 7), days: diff % 7, dpp };
}

export const GYNECO_SECTION: QuestionSection = {
  id: 'gineco',
  title: 'Antecedentes gineco-obstétricos',
  showIf: (c) => c.sex === 'F' && (c.profile === 'gestante' || (c.ageYears ?? 20) >= 10),
  questions: [
    {
      id: 'go_dum',
      label: 'Data da última menstruação (DUM)',
      type: 'date',
      short: 'DUM',
      narrative: (v) => `DUM: ${formatDate(String(v))}`,
      computed: (c) => {
        const dum = c.a('go_dum');
        if (typeof dum !== 'string') return null;
        const ga = gestationalAge(dum);
        if (!ga) return null;
        if (c.profile === 'gestante') {
          return { text: `IG pela DUM: ${ga.weeks} semanas e ${ga.days} dia(s) · DPP ${formatDate(ga.dpp)}`, tone: 'accent' };
        }
        const days = ga.weeks * 7 + ga.days;
        return days > 35 ? { text: `${days} dias desde a DUM — considere β-hCG`, tone: 'orange' } : null;
      },
      why: {
        reason: 'A DUM data a gestação (IG e DPP pela regra de Naegele) e, fora da gestação, alerta para atraso menstrual.',
        impact: 'Atraso menstrual + dor abdominal ou sangramento → β-hCG antes de qualquer conduta.',
      },
    },
    {
      id: 'go_gpa',
      label: 'Gestações, partos e abortos (G P A)',
      hint: 'Ex.: G3 P2 (1 normal, 1 cesárea) A1',
      type: 'text',
      placeholder: 'G_ P_ (N_ C_) A_',
      short: 'Paridade',
      narrative: (v) => String(v),
      why: {
        reason: 'A paridade e o tipo de parto orientam riscos obstétricos (cesáreas prévias, abortos de repetição) e ginecológicos.',
        impact: 'Cesárea prévia muda a via de parto e o risco de acretismo; abortos de repetição exigem investigação.',
      },
    },
    {
      id: 'go_contracepcao',
      label: 'Método contraceptivo',
      type: 'single',
      showIf: (c) => c.profile !== 'gestante',
      options: [
        opt('nenhum', 'Nenhum', undefined, 'nenhum método'),
        opt('aco', 'Anticoncepcional combinado', undefined, 'anticoncepcional oral combinado'),
        opt('progestageno', 'Só progestágeno', undefined, 'progestágeno isolado'),
        opt('diu_cobre', 'DIU de cobre', undefined, 'DIU de cobre'),
        opt('diu_hormonal', 'DIU hormonal', undefined, 'DIU hormonal'),
        opt('implante', 'Implante', undefined, 'implante subdérmico'),
        opt('injetavel', 'Injetável', undefined, 'contraceptivo injetável'),
        opt('preservativo', 'Preservativo', undefined, 'preservativo'),
        opt('laqueadura', 'Laqueadura', undefined, 'laqueadura tubária'),
      ],
      short: 'Contracepção',
      narrative: (v, _c, q) => `Método contraceptivo: ${labelsOf(q.options, v)[0]}`,
      why: {
        reason: 'Contraceptivo com estrogênio aumenta risco de TEV e interage com indutores enzimáticos; a ausência de método mantém a possibilidade de gestação.',
        impact: 'Entra nos fatores de risco para TEP/TVP e nos alertas de medicação.',
      },
    },
    {
      id: 'go_menopausa',
      label: 'Menopausa?',
      type: 'yesno',
      extra: true,
      showIf: (c) => (c.ageYears ?? 0) >= 40,
      yesText: 'Menopausada',
      noText: 'Não menopausada',
    },
    {
      id: 'go_preventivos',
      label: 'Último preventivo (citologia) / mamografia',
      type: 'text',
      extra: true,
      showIf: (c) => c.profile !== 'gestante' && (c.ageYears ?? 0) >= 25,
      short: 'Rastreamentos',
    },
  ],
};

export const PRENATAL_SECTION: QuestionSection = {
  id: 'prenatal',
  title: 'Pré-natal',
  showIf: (c) => c.profile === 'gestante',
  questions: [
    {
      id: 'pn_consultas',
      label: 'Consultas de pré-natal realizadas',
      type: 'number',
      unit: 'consultas',
      min: 0,
      max: 40,
      short: 'Consultas de pré-natal',
      narrative: (v) => `${v} consulta(s) de pré-natal`,
    },
    {
      id: 'pn_intercorrencias',
      label: 'Intercorrências nesta gestação',
      type: 'multi',
      options: [
        opt('dmg', 'Diabetes gestacional', 'orange', 'diabetes gestacional'),
        opt('hipertensao', 'Hipertensão/pré-eclâmpsia', 'red', 'síndrome hipertensiva'),
        opt('itu', 'Infecção urinária', undefined, 'ITU'),
        opt('anemia', 'Anemia', undefined, 'anemia'),
        opt('sangramento', 'Sangramento', 'orange', 'sangramento'),
        opt('nenhuma', 'Nenhuma'),
      ],
      short: 'Intercorrências',
      narrative: (v, _c, q) =>
        (v as string[]).includes('nenhuma') ? 'Sem intercorrências na gestação atual' : `Intercorrências: ${joinPt(labelsOf(q.options, v))}`,
    },
    {
      id: 'pn_tipagem',
      label: 'Tipo sanguíneo / Rh',
      type: 'single',
      extra: true,
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => opt(t, t, t.endsWith('-') ? 'orange' : undefined)),
      short: 'Tipagem',
      narrative: (v) => `Tipagem sanguínea ${v}`,
      why: {
        reason: 'Gestante Rh negativo precisa de profilaxia com imunoglobulina anti-D em sangramentos e no pós-parto (se RN Rh+).',
        impact: 'Rh− com sangramento → avaliar imunoglobulina anti-D.',
      },
    },
    {
      id: 'pn_sorologias',
      label: 'Sorologias e exames do pré-natal',
      type: 'text',
      extra: true,
      placeholder: 'HIV, sífilis, hepatites, toxoplasmose…',
      short: 'Sorologias',
    },
  ],
};

/* ---------------- Pediatria ---------------- */

export const PEDIATRIC_SECTION: QuestionSection = {
  id: 'pediatria',
  title: 'Antecedentes pediátricos',
  showIf: (c) => c.profile === 'pediatria',
  questions: [
    {
      id: 'ped_informante',
      label: 'Informante',
      type: 'single',
      options: [opt('mae', 'Mãe'), opt('pai', 'Pai'), opt('avos', 'Avós'), opt('outro', 'Outro responsável'), opt('proprio', 'O próprio paciente')],
      short: 'Informante',
      narrative: (v, _c, q) => `Informante: ${labelsOf(q.options, v)[0]}`,
    },
    {
      id: 'ped_gestacao',
      label: 'Gestação',
      type: 'single',
      options: [
        opt('sem', 'Sem intercorrências', undefined, 'sem intercorrências'),
        opt('com', 'Com intercorrências', 'orange', 'com intercorrências'),
      ],
      short: 'Gestação',
      narrative: (v, _c, q) => `Gestação ${labelsOf(q.options, v)[0]}`,
    },
    {
      id: 'ped_ig_nascer',
      label: 'Idade gestacional ao nascer',
      type: 'number',
      unit: 'semanas',
      min: 22,
      max: 44,
      short: 'IG ao nascer',
      narrative: (v) => `Nascido com ${v} semanas${Number(v) < 37 ? ' (pré-termo)' : ''}`,
      why: {
        reason: 'Prematuridade muda as curvas de crescimento (idade corrigida até 2 anos), o risco de infecções e o desenvolvimento.',
        impact: 'Pré-termo → usar idade corrigida para avaliar DNPM e crescimento.',
      },
    },
    {
      id: 'ped_parto',
      label: 'Tipo de parto',
      type: 'single',
      options: [opt('normal', 'Normal', undefined, 'parto normal'), opt('cesarea', 'Cesárea', undefined, 'cesárea'), opt('forceps', 'Fórceps', undefined, 'parto fórceps')],
      short: 'Parto',
      narrative: (v, _c, q) => labelsOf(q.options, v)[0].replace(/^./, (m) => m.toUpperCase()),
    },
    {
      id: 'ped_peso_nascer',
      label: 'Peso ao nascer',
      type: 'number',
      unit: 'g',
      min: 300,
      max: 6000,
      short: 'Peso ao nascer',
      narrative: (v) => `peso ao nascer de ${v} g`,
    },
    {
      id: 'ped_neonatal',
      label: 'Intercorrências neonatais',
      type: 'multi',
      options: [
        opt('ictericia', 'Icterícia com fototerapia'),
        opt('uti', 'UTI neonatal', 'orange'),
        opt('hipoxia', 'Hipóxia/reanimação', 'orange'),
        opt('infeccao', 'Infecção'),
        opt('nenhuma', 'Nenhuma'),
      ],
      short: 'Intercorrências neonatais',
      narrative: (v, _c, q) =>
        (v as string[]).includes('nenhuma') ? 'Sem intercorrências neonatais' : `Intercorrências neonatais: ${joinPt(labelsOf(q.options, v))}`,
    },
    {
      id: 'ped_dnpm',
      label: 'Desenvolvimento neuropsicomotor (DNPM)',
      type: 'single',
      options: [
        opt('adequado', 'Adequado para a idade', undefined, 'adequado para a idade'),
        opt('atraso', 'Com atraso', 'orange', 'com atraso'),
        opt('nao_sabe', 'Não sabe informar', undefined, 'não informado'),
      ],
      short: 'DNPM',
      narrative: (v, _c, q) => `DNPM ${labelsOf(q.options, v)[0]}`,
      why: {
        reason: 'Marcos do desenvolvimento (sustentar a cabeça ~3 m, sentar ~6 m, andar ~12–15 m, frases ~2 anos) avaliam a integridade neurológica.',
        impact: 'Atraso ou regressão de marcos → avaliação neurológica/do desenvolvimento.',
      },
    },
    {
      id: 'ped_aleitamento',
      label: 'Aleitamento',
      type: 'single',
      options: [
        opt('exclusivo', 'Materno exclusivo', undefined, 'aleitamento materno exclusivo'),
        opt('misto', 'Misto', undefined, 'aleitamento misto'),
        opt('formula', 'Fórmula', undefined, 'fórmula infantil'),
        opt('desmamado', 'Já desmamou', undefined, 'desmamado'),
      ],
      short: 'Aleitamento',
      narrative: (v, _c, q) => labelsOf(q.options, v)[0].replace(/^./, (m) => m.toUpperCase()),
      why: {
        reason: 'Aleitamento materno exclusivo até 6 meses protege contra infecções; a alimentação orienta a avaliação de crescimento e anemia.',
        impact: 'Desmame precoce e alimentação inadequada aumentam risco de anemia ferropriva e infecções.',
      },
    },
    {
      id: 'ped_vacinas',
      label: 'Vacinas (caderneta)',
      type: 'single',
      options: [
        opt('em_dia', 'Em dia', undefined, 'vacinação em dia conforme caderneta'),
        opt('atrasadas', 'Atrasadas', 'orange', 'vacinação atrasada'),
        opt('nao_sabe', 'Caderneta não disponível', undefined, 'caderneta não disponível'),
      ],
      short: 'Vacinação',
      narrative: (v, _c, q) => labelsOf(q.options, v)[0].replace(/^./, (m) => m.toUpperCase()),
    },
  ],
};

/* ---------------- Idoso ---------------- */

export const ELDERLY_SECTION: QuestionSection = {
  id: 'idoso',
  title: 'Avaliação do idoso',
  showIf: (c) => c.profile === 'idoso',
  questions: [
    {
      id: 'id_avd',
      label: 'Precisa de ajuda para (AVDs básicas — Katz):',
      type: 'multi',
      options: [
        opt('banho', 'Tomar banho'),
        opt('vestir', 'Vestir-se'),
        opt('toalete', 'Usar o banheiro'),
        opt('transferencia', 'Levantar da cama/cadeira'),
        opt('continencia', 'Controlar urina/fezes'),
        opt('alimentar', 'Alimentar-se'),
        opt('independente', 'Independente para todas', undefined, 'independente'),
      ],
      short: 'AVDs básicas',
      computed: (c) => {
        const v = c.a('id_avd');
        if (!Array.isArray(v)) return null;
        if (v.includes('independente')) return { text: 'Katz: independente para AVDs básicas', tone: 'green' };
        return { text: `Katz: dependente em ${v.length} de 6 AVDs`, tone: v.length >= 3 ? 'red' : 'orange' };
      },
      narrative: (v, _c, q) =>
        (v as string[]).includes('independente')
          ? 'Independente para atividades básicas de vida diária'
          : `Dependente para ${joinPt(labelsOf(q.options, v))} (Katz)`,
      why: {
        reason: 'Funcionalidade é o “sinal vital” do idoso: declínio funcional agudo pode ser a única manifestação de infecção, delirium ou descompensação.',
        impact: 'Perda funcional recente → investigar causa aguda; planejar alta e cuidados.',
      },
    },
    {
      id: 'id_aivd',
      label: 'Precisa de ajuda para (AIVDs — Lawton):',
      type: 'multi',
      extra: true,
      options: [
        opt('telefone', 'Usar telefone'),
        opt('compras', 'Fazer compras'),
        opt('refeicoes', 'Preparar refeições'),
        opt('casa', 'Tarefas domésticas'),
        opt('transporte', 'Usar transporte'),
        opt('medicacoes', 'Tomar medicações'),
        opt('financas', 'Controlar dinheiro'),
        opt('independente', 'Independente para todas', undefined, 'independente'),
      ],
      short: 'AIVDs',
      narrative: (v, _c, q) =>
        (v as string[]).includes('independente')
          ? 'Independente para atividades instrumentais'
          : `Necessita de auxílio para ${joinPt(labelsOf(q.options, v))} (Lawton)`,
    },
    {
      id: 'id_quedas',
      label: 'Quedas nos últimos 12 meses',
      type: 'number',
      unit: 'quedas',
      min: 0,
      max: 50,
      short: 'Quedas',
      computed: (c) => {
        const n = c.num('id_quedas');
        if (n === undefined) return null;
        return n >= 2 ? { text: 'Quedas recorrentes: avaliar risco e causas', tone: 'orange' } : null;
      },
      narrative: (v) => (Number(v) === 0 ? 'Nega quedas no último ano' : `${v} queda(s) no último ano`),
      why: {
        reason: 'Quedas são marcadores de fragilidade e têm causas múltiplas (medicações, hipotensão ortostática, déficit visual, sarcopenia, cognição).',
        impact: '≥ 2 quedas ou queda com lesão → avaliação multifatorial; atenção a anticoagulados (TC de crânio após TCE).',
      },
    },
    {
      id: 'id_marcha',
      label: 'Dispositivo de marcha',
      type: 'single',
      extra: true,
      options: [
        opt('nenhum', 'Nenhum', undefined, 'deambula sem auxílio'),
        opt('bengala', 'Bengala', undefined, 'deambula com bengala'),
        opt('andador', 'Andador', undefined, 'deambula com andador'),
        opt('cadeira', 'Cadeira de rodas', undefined, 'cadeirante'),
        opt('acamado', 'Acamado', 'orange', 'acamado'),
      ],
      short: 'Marcha',
      narrative: (v, _c, q) => labelsOf(q.options, v)[0].replace(/^./, (m) => m.toUpperCase()),
    },
    {
      id: 'id_cognicao',
      label: 'Cognição',
      type: 'single',
      options: [
        opt('preservada', 'Sem queixas', undefined, 'sem queixas cognitivas'),
        opt('queixa', 'Queixa de memória', 'orange', 'queixa de memória'),
        opt('demencia', 'Demência diagnosticada', 'orange', 'síndrome demencial diagnosticada'),
        opt('delirium', 'Confusão aguda (delirium?)', 'red', 'alteração cognitiva aguda (suspeita de delirium)'),
      ],
      short: 'Cognição',
      narrative: (v, _c, q) => labelsOf(q.options, v)[0].replace(/^./, (m) => m.toUpperCase()),
      why: {
        reason: 'Delirium (início agudo, flutuação, desatenção) é emergência médica no idoso e frequentemente a apresentação de infecção, distúrbio metabólico ou efeito de medicação.',
        impact: 'Confusão aguda → procurar causa orgânica e revisar medicações (Beers).',
        refs: ['beers-2023'],
      },
    },
    {
      id: 'id_cuidador',
      label: 'Mora com / cuidador',
      type: 'text',
      extra: true,
      short: 'Suporte',
    },
  ],
};

/* ---------------- Antecedentes familiares ---------------- */

export const FAMILY_SECTION: QuestionSection = {
  id: 'familia',
  title: 'Antecedentes familiares',
  questions: [
    {
      id: 'af_condicoes',
      label: 'Doenças na família (pais, irmãos, filhos)',
      type: 'multi',
      options: [
        opt('has', 'Hipertensão', undefined, 'HAS'),
        opt('dm', 'Diabetes', undefined, 'DM'),
        opt('dac_precoce', 'Infarto precoce (H < 55, M < 65)', 'orange', 'DAC precoce'),
        opt('avc', 'AVC', undefined, 'AVC'),
        opt('cancer', 'Câncer', undefined, 'neoplasia'),
        opt('morte_subita', 'Morte súbita', 'orange', 'morte súbita'),
        opt('trombose', 'Trombose', undefined, 'trombose'),
        opt('psiquiatrica', 'Doença psiquiátrica', undefined, 'doença psiquiátrica'),
        opt('renal', 'Doença renal', undefined, 'doença renal'),
        opt('tireoide', 'Doença da tireoide', undefined, 'tireoidopatia'),
        opt('asma_alergia', 'Asma/alergias', undefined, 'asma/atopia'),
        opt('nenhuma', 'Nada digno de nota'),
      ],
      short: 'Antecedentes familiares',
      narrative: (v, _c, q) =>
        (v as string[]).includes('nenhuma') ? 'Nada digno de nota' : `Familiares com ${joinPt(labelsOf(q.options, v))}`,
      why: {
        reason: 'Doenças com componente hereditário (DAC precoce, câncer, morte súbita, trombofilias) mudam a probabilidade pré-teste e o rastreamento.',
        impact: 'DAC precoce entra no HEART; morte súbita familiar é critério de alto risco na síncope.',
        refs: ['esc-sincope-2018', 'heart-2008'],
      },
    },
    {
      id: 'af_detalhes',
      label: 'Quem e com que idade? Pais vivos?',
      type: 'text',
      placeholder: 'Ex.: pai IAM aos 50 anos; mãe viva, DM2',
      short: 'Detalhes',
      narrative: (v) => String(v),
    },
  ],
};

/* ---------------- Hábitos de vida ---------------- */

/** Anos-maço = (cigarros por dia ÷ 20) × anos fumando. */
export function packYears(cigsPerDay?: number, years?: number): number | undefined {
  if (!cigsPerDay || !years) return undefined;
  return (cigsPerDay / 20) * years;
}

const isSmoker = (c: QuestionContext) => c.has('hv_tabagismo', 'atual', 'ex');

export const HABITS_SECTION: QuestionSection = {
  id: 'habitos',
  title: 'Hábitos de vida',
  questions: [
    {
      id: 'hv_tabagismo',
      label: 'Tabagismo',
      type: 'single',
      options: [
        opt('nunca', 'Nunca fumou', undefined, 'nunca fumou'),
        opt('atual', 'Fuma atualmente', 'orange', 'tabagista ativo'),
        opt('ex', 'Ex-tabagista', undefined, 'ex-tabagista'),
      ],
      short: 'Tabagismo',
      narrative: (v, c) => {
        if (v === 'nunca') return 'Nega tabagismo';
        const cpd = c.num('hv_cigarros_dia');
        const yrs = c.num('hv_anos_fumando');
        const py = packYears(cpd, yrs);
        const base = v === 'atual' ? 'Tabagista ativo' : 'Ex-tabagista';
        const det = cpd && yrs ? `, ${cpd} cigarros/dia por ${yrs} anos (${formatNumber(py!, 1)} anos-maço)` : '';
        const quit = v === 'ex' && c.num('hv_parou_ha') !== undefined ? `, cessou há ${c.num('hv_parou_ha')} anos` : '';
        return `${base}${det}${quit}`;
      },
      why: {
        reason: 'Tabagismo é fator de risco para DAC, DPOC, câncer de pulmão/bexiga, doença vascular e úlcera. A carga tabágica (anos-maço) estima o risco.',
        impact: '≥ 20 anos-maço entre 50 e 80 anos → elegível para rastreamento de câncer de pulmão com TC de baixa dose (conforme diretrizes vigentes).',
      },
    },
    {
      id: 'hv_cigarros_dia',
      label: 'Cigarros por dia',
      type: 'number',
      unit: 'cig/dia',
      min: 0,
      max: 200,
      showIf: isSmoker,
      narrative: () => null,
    },
    {
      id: 'hv_anos_fumando',
      label: 'Por quantos anos fumou?',
      type: 'number',
      unit: 'anos',
      min: 0,
      max: 90,
      showIf: isSmoker,
      narrative: () => null,
      computed: (c) => {
        const py = packYears(c.num('hv_cigarros_dia'), c.num('hv_anos_fumando'));
        if (py === undefined) return null;
        return { text: `Carga tabágica: ${formatNumber(py, 1)} anos-maço`, tone: py >= 20 ? 'orange' : 'accent' };
      },
    },
    {
      id: 'hv_parou_ha',
      label: 'Parou há quantos anos?',
      type: 'number',
      unit: 'anos',
      min: 0,
      max: 90,
      showIf: (c) => c.has('hv_tabagismo', 'ex'),
      narrative: () => null,
    },
    {
      id: 'hv_etilismo',
      label: 'Álcool',
      type: 'single',
      options: [
        opt('nao', 'Não bebe', undefined, 'nega etilismo'),
        opt('social', 'Social/ocasional', undefined, 'etilismo social'),
        opt('regular', 'Regular (semanal)', 'orange', 'etilismo regular'),
        opt('abuso', 'Abuso/dependência', 'red', 'etilismo pesado'),
        opt('ex', 'Ex-etilista', undefined, 'ex-etilista'),
      ],
      short: 'Etilismo',
      narrative: (v, c, q) => {
        const base = labelsOf(q.options, v)[0];
        const doses = c.num('hv_doses_semana');
        return `${base.replace(/^./, (m) => m.toUpperCase())}${doses !== undefined && v !== 'nao' ? ` (${doses} doses/semana)` : ''}`;
      },
      why: {
        reason: 'Álcool causa hepatopatia, pancreatite, cardiomiopatia, neuropatia, quedas e interações (ex.: metronidazol). Abstinência pode causar convulsão e delirium em internados.',
        impact: 'Etilismo pesado internado → vigiar abstinência e repor tiamina antes de glicose (conferir dose).',
      },
    },
    {
      id: 'hv_doses_semana',
      label: 'Doses por semana',
      hint: '1 dose ≈ 1 lata de cerveja, 1 taça de vinho ou 1 dose de destilado',
      type: 'number',
      unit: 'doses',
      min: 0,
      max: 300,
      showIf: (c) => c.has('hv_etilismo', 'social', 'regular', 'abuso'),
      narrative: () => null,
    },
    {
      id: 'hv_cage',
      label: 'CAGE',
      type: 'multi',
      extra: true,
      showIf: (c) => c.has('hv_etilismo', 'social', 'regular', 'abuso'),
      options: [
        opt('c', 'Já sentiu que deveria diminuir (Cut down)?'),
        opt('a', 'Já se irritou com críticas ao seu beber (Annoyed)?'),
        opt('g', 'Já se sentiu culpado por beber (Guilty)?'),
        opt('e', 'Já bebeu pela manhã para “curar” ressaca (Eye-opener)?'),
      ],
      short: 'CAGE',
      computed: (c) => {
        const v = c.a('hv_cage');
        const n = Array.isArray(v) ? v.length : 0;
        return { text: `CAGE ${n}/4${n >= 2 ? ' — sugestivo de uso problemático' : ''}`, tone: n >= 2 ? 'orange' : 'accent' };
      },
      narrative: (v) => `CAGE ${(v as string[]).length}/4`,
    },
    {
      id: 'hv_drogas',
      label: 'Outras substâncias',
      type: 'multi',
      options: [
        opt('nega', 'Nega', undefined, 'nega'),
        opt('maconha', 'Maconha', undefined, 'maconha'),
        opt('cocaina', 'Cocaína/crack', 'orange', 'cocaína/crack'),
        opt('injetaveis', 'Drogas injetáveis', 'orange', 'drogas injetáveis'),
        opt('outras', 'Outras', undefined, 'outras substâncias'),
      ],
      short: 'Drogas',
      narrative: (v, _c, q) =>
        (v as string[]).includes('nega') ? 'Nega uso de drogas ilícitas' : `Uso de ${joinPt(labelsOf(q.options, v))}`,
    },
    {
      id: 'hv_atividade',
      label: 'Atividade física',
      type: 'single',
      options: [
        opt('sedentario', 'Sedentário', undefined, 'sedentário'),
        opt('insuficiente', 'Menos de 150 min/semana', undefined, 'atividade física insuficiente (< 150 min/semana)'),
        opt('ativo', '150 min/semana ou mais', undefined, 'fisicamente ativo (≥ 150 min/semana)'),
      ],
      short: 'Atividade física',
      narrative: (v, _c, q) => labelsOf(q.options, v)[0].replace(/^./, (m) => m.toUpperCase()),
    },
    {
      id: 'hv_alimentacao',
      label: 'Alimentação',
      type: 'text',
      extra: true,
      placeholder: 'Ex.: rica em ultraprocessados, pouca fruta/verdura',
      short: 'Alimentação',
      narrative: (v) => `Alimentação: ${String(v)}`,
    },
    {
      id: 'hv_sono',
      label: 'Sono',
      type: 'single',
      extra: true,
      options: [
        opt('adequado', 'Adequado', undefined, 'sono adequado'),
        opt('insonia', 'Insônia', undefined, 'insônia'),
        opt('sonolencia', 'Sonolência diurna/roncos', undefined, 'sonolência diurna e roncos'),
      ],
      short: 'Sono',
      narrative: (v, _c, q) => labelsOf(q.options, v)[0].replace(/^./, (m) => m.toUpperCase()),
    },
  ],
};

/* ---------------- Condições socioeconômicas e psicossociais ---------------- */

export const SOCIAL_SECTION: QuestionSection = {
  id: 'social',
  title: 'Condições socioeconômicas e psicossociais',
  questions: [
    {
      id: 'cse_moradia',
      label: 'Moradia',
      type: 'single',
      options: [
        opt('alvenaria', 'Casa de alvenaria', undefined, 'casa de alvenaria'),
        opt('madeira', 'Casa de madeira/taipa', undefined, 'casa de madeira/taipa'),
        opt('apartamento', 'Apartamento', undefined, 'apartamento'),
        opt('rua', 'Situação de rua', 'orange', 'situação de rua'),
        opt('instituicao', 'Instituição/ILPI', undefined, 'instituição de longa permanência'),
      ],
      short: 'Moradia',
      narrative: (v, c, q) => {
        const pessoas = c.num('cse_pessoas');
        const base = v === 'rua' ? 'Em situação de rua' : `Reside em ${labelsOf(q.options, v)[0]}`;
        return pessoas ? `${base}, com ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}` : base;
      },
    },
    {
      id: 'cse_pessoas',
      label: 'Quantas pessoas moram na casa?',
      type: 'number',
      unit: 'pessoas',
      min: 1,
      max: 30,
      showIf: (c) => !c.has('cse_moradia', 'rua'),
      narrative: () => null,
    },
    {
      id: 'cse_saneamento',
      label: 'Saneamento',
      type: 'multi',
      options: [
        opt('agua', 'Água tratada', undefined, 'água tratada'),
        opt('esgoto', 'Rede de esgoto', undefined, 'rede de esgoto'),
        opt('lixo', 'Coleta de lixo', undefined, 'coleta de lixo'),
        opt('energia', 'Energia elétrica', undefined, 'energia elétrica'),
      ],
      short: 'Saneamento',
      narrative: (v, _c, q) => `Saneamento: ${joinPt(labelsOf(q.options, v))}`,
      why: {
        reason: 'Condições sanitárias mudam o diferencial infeccioso (parasitoses, hepatite A, leptospirose) e a capacidade de seguir o tratamento.',
        impact: 'Ajuda a decidir sobre tratamento domiciliar × internação e orientações de alta.',
      },
    },
    {
      id: 'cse_renda',
      label: 'Renda familiar',
      type: 'single',
      extra: true,
      options: [
        opt('ate1', 'Até 1 salário mínimo', undefined, 'até 1 salário mínimo'),
        opt('1a3', '1 a 3 salários', undefined, '1 a 3 salários mínimos'),
        opt('3a5', '3 a 5 salários', undefined, '3 a 5 salários mínimos'),
        opt('mais5', 'Mais de 5 salários', undefined, 'mais de 5 salários mínimos'),
      ],
      short: 'Renda',
      narrative: (v, _c, q) => `Renda familiar de ${labelsOf(q.options, v)[0]}`,
    },
    {
      id: 'cse_escolaridade',
      label: 'Escolaridade',
      type: 'single',
      extra: true,
      options: [
        opt('analfabeto', 'Não alfabetizado', undefined, 'não alfabetizado'),
        opt('fund_inc', 'Fundamental incompleto', undefined, 'ensino fundamental incompleto'),
        opt('fund', 'Fundamental completo', undefined, 'ensino fundamental completo'),
        opt('medio', 'Médio', undefined, 'ensino médio'),
        opt('superior', 'Superior', undefined, 'ensino superior'),
      ],
      short: 'Escolaridade',
      narrative: (v, _c, q) => `Escolaridade: ${labelsOf(q.options, v)[0]}`,
      why: {
        reason: 'Escolaridade orienta a linguagem das orientações e a interpretação de testes cognitivos.',
        impact: 'Ajuste pontos de corte de rastreios cognitivos e use orientações por escrito simplificadas.',
      },
    },
    {
      id: 'cse_psico',
      label: 'Fatores psicossociais',
      type: 'multi',
      options: [
        opt('estresse', 'Estresse importante', undefined, 'estresse importante'),
        opt('luto', 'Luto recente', undefined, 'luto recente'),
        opt('desemprego', 'Desemprego', undefined, 'desemprego'),
        opt('isolamento', 'Isolamento social', undefined, 'isolamento social'),
        opt('violencia', 'Situação de violência', 'red', 'situação de violência'),
        opt('nenhum', 'Nenhum relatado', undefined, 'nenhum'),
      ],
      short: 'Fatores psicossociais',
      narrative: (v, _c, q) =>
        (v as string[]).includes('nenhum') ? 'Sem estressores psicossociais relatados' : `Fatores psicossociais: ${joinPt(labelsOf(q.options, v))}`,
      why: {
        reason: 'Estressores psicossociais influenciam sintomas, adesão e prognóstico. Violência é condição de notificação e exige rede de proteção.',
        impact: 'Violência → acolhimento, notificação compulsória e acionar serviço social/rede.',
      },
    },
    {
      id: 'cse_obs',
      label: 'Outras informações (religião, animais, acesso à UBS…)',
      type: 'text',
      extra: true,
      narrative: (v) => String(v),
    },
  ],
};
