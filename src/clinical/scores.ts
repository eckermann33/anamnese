import type { ClinicalContext } from './context';
import type { SCORE_IDS } from '../../shared/ai/schemas';

/* ==========================================================================
   ESCORES CLÍNICOS
   --------------------------------------------------------------------------
   Calculados no próprio aparelho (offline). Cada item tenta se preencher
   sozinho com os dados do atendimento (`auto`). Quando o dado não existe,
   o item fica "faltando" e o usuário pode marcar manualmente.
   A IA apenas indica QUAIS escores se aplicam — a conta é feita aqui.
   ========================================================================== */

export type ScoreId = (typeof SCORE_IDS)[number];

export interface ScoreOption {
  label: string;
  points: number;
}

export interface ScoreItem {
  id: string;
  label: string;
  hint?: string;
  /** Item sim/não: pontos se "sim". */
  points?: number;
  /** Item com faixas. */
  options?: ScoreOption[];
  /** Preenchimento automático: devolve os pontos ou undefined (dado ausente). */
  auto?: (c: ClinicalContext) => number | undefined;
}

export interface ScoreDef {
  id: ScoreId;
  name: string;
  description: string;
  items: ScoreItem[];
  interpret: (total: number, missing: number, values: Record<string, number | undefined>) => { text: string; tone: 'green' | 'orange' | 'red' | 'accent' };
  applicable: (c: ClinicalContext) => boolean;
  refs: string[];
  /** Pontuação máxima (para exibir "x/max"). */
  max?: number;
}

const yesSym = (c: ClinicalContext, id: string) => c.sym(id) === 'sim';
/** Booleano → pontos; indefinido continua indefinido. */
const pts = (cond: boolean | undefined, p: number) => (cond === undefined ? undefined : cond ? p : 0);
const known = <T>(v: T | undefined) => v !== undefined;

function riskFactorCount(c: ClinicalContext): number | undefined {
  const fr = new Set<string>();
  const list = c.a('fr_cv');
  if (Array.isArray(list)) list.forEach((x) => fr.add(x));
  if (c.disease('has')) fr.add('has');
  if (c.disease('dm2') || c.disease('dm1')) fr.add('dm');
  if (c.disease('dislipidemia')) fr.add('dlp');
  if (c.disease('obesidade')) fr.add('obesidade');
  if (c.has('hv_tabagismo', 'atual')) fr.add('tabagismo');
  if (c.has('af_condicoes', 'dac_precoce')) fr.add('hf_dac');
  const athero = fr.has('dac_previa') || fr.has('aterosclerose') || c.disease('dac') || c.disease('avc') || c.disease('dap');
  if (athero) return 99;
  const answered = Array.isArray(list) || c.enc.history.diseases.length > 0 || c.a('hv_tabagismo') !== undefined;
  return answered ? fr.size : undefined;
}

const mentalStatus = (c: ClinicalContext): boolean | undefined => {
  if (c.gcs !== undefined) return c.gcs < 15;
  const row = c.examRow('geral', 'consciencia');
  if (row) return row !== 'lote';
  if (c.sym('confusao') === 'sim') return true;
  if (c.sym('confusao') === 'nao') return false;
  return undefined;
};

export const SCORES: ScoreDef[] = [
  {
    id: 'glasgow',
    name: 'Escala de Coma de Glasgow',
    description: 'Nível de consciência (abertura ocular, resposta verbal e motora).',
    max: 15,
    items: [
      {
        id: 'o',
        label: 'Abertura ocular',
        options: [
          { label: 'Espontânea', points: 4 },
          { label: 'Ao som', points: 3 },
          { label: 'À pressão', points: 2 },
          { label: 'Ausente', points: 1 },
        ],
        auto: (c) => c.enc.exam.glasgow?.o,
      },
      {
        id: 'v',
        label: 'Resposta verbal',
        options: [
          { label: 'Orientada', points: 5 },
          { label: 'Confusa', points: 4 },
          { label: 'Palavras', points: 3 },
          { label: 'Sons', points: 2 },
          { label: 'Ausente', points: 1 },
        ],
        auto: (c) => c.enc.exam.glasgow?.v,
      },
      {
        id: 'm',
        label: 'Resposta motora',
        options: [
          { label: 'Obedece comandos', points: 6 },
          { label: 'Localiza', points: 5 },
          { label: 'Flexão normal', points: 4 },
          { label: 'Flexão anormal', points: 3 },
          { label: 'Extensão', points: 2 },
          { label: 'Ausente', points: 1 },
        ],
        auto: (c) => c.enc.exam.glasgow?.m,
      },
    ],
    interpret: (t, missing) => {
      if (missing) return { text: 'Preencha os 3 componentes', tone: 'accent' };
      if (t <= 8) return { text: 'TCE/coma grave (≤ 8): proteger via aérea', tone: 'red' };
      if (t <= 12) return { text: 'Moderado (9–12)', tone: 'orange' };
      if (t <= 14) return { text: 'Leve (13–14)', tone: 'orange' };
      return { text: 'Normal (15)', tone: 'green' };
    },
    applicable: (c) => c.enc.systems.includes('neurologico') || mentalStatus(c) === true || c.has('sin_recuperacao', 'confusao'),
    refs: ['glasgow-1974'],
  },
  {
    id: 'qsofa',
    name: 'qSOFA',
    description: 'Triagem de risco em suspeita de infecção (fora da UTI).',
    max: 3,
    items: [
      { id: 'fr', label: 'FR ≥ 22 irpm', points: 1, auto: (c) => (known(c.vitals.fr) ? pts(c.vitals.fr! >= 22, 1) : undefined) },
      { id: 'pas', label: 'PAS ≤ 100 mmHg', points: 1, auto: (c) => (known(c.vitals.pas) ? pts(c.vitals.pas! <= 100, 1) : undefined) },
      { id: 'mental', label: 'Alteração do estado mental (Glasgow < 15)', points: 1, auto: (c) => pts(mentalStatus(c), 1) },
    ],
    interpret: (t, missing) =>
      t >= 2
        ? { text: 'qSOFA ≥ 2: alto risco de mau desfecho — investigar disfunção orgânica', tone: 'red' }
        : missing
          ? { text: `${t} ponto(s) até agora — complete os dados`, tone: 'accent' }
          : { text: 'qSOFA < 2: não exclui sepse (baixa sensibilidade)', tone: 'orange' },
    applicable: (c) => c.sym('febre') === 'sim' || c.template.id === 'febre' || (c.vitals.temp ?? 0) >= 37.8,
    refs: ['qsofa-2016', 'sepsis3-2016', 'ssc-2026'],
  },
  {
    id: 'curb65',
    name: 'CURB-65',
    description: 'Gravidade da pneumonia adquirida na comunidade.',
    max: 5,
    items: [
      { id: 'c', label: 'Confusão mental', points: 1, auto: (c) => pts(mentalStatus(c), 1) },
      { id: 'u', label: 'Ureia > 7 mmol/L (≈ 42 mg/dL)', hint: 'Exame laboratorial', points: 1 },
      { id: 'r', label: 'FR ≥ 30 irpm', points: 1, auto: (c) => (known(c.vitals.fr) ? pts(c.vitals.fr! >= 30, 1) : undefined) },
      {
        id: 'b',
        label: 'PAS < 90 ou PAD ≤ 60 mmHg',
        points: 1,
        auto: (c) => (known(c.vitals.pas) || known(c.vitals.pad) ? pts((c.vitals.pas ?? 999) < 90 || (c.vitals.pad ?? 999) <= 60, 1) : undefined),
      },
      { id: 'age', label: 'Idade ≥ 65 anos', points: 1, auto: (c) => (known(c.ageYears) ? pts(c.ageYears! >= 65, 1) : undefined) },
    ],
    interpret: (t, _m, v) => {
      if (v.u === undefined) {
        // CRB-65 (sem ureia)
        if (t === 0) return { text: `CRB-65 = 0: baixo risco — tratamento ambulatorial geralmente possível`, tone: 'green' };
        if (t <= 2) return { text: `CRB-65 = ${t}: avaliar internação`, tone: 'orange' };
        return { text: `CRB-65 = ${t}: alto risco — internação urgente`, tone: 'red' };
      }
      if (t <= 1) return { text: 'Baixo risco: tratamento ambulatorial', tone: 'green' };
      if (t === 2) return { text: 'Risco intermediário: considerar internação', tone: 'orange' };
      return { text: 'Pneumonia grave: internação (avaliar UTI se 4–5)', tone: 'red' };
    },
    applicable: (c) =>
      (c.sym('tosse') === 'sim' || c.template.id === 'dispneia') && (c.sym('febre') === 'sim' || c.sym('expectoracao') === 'sim' || c.finding('crepitacoes')),
    refs: ['curb65-2003', 'sbpt-pac-2018'],
  },
  {
    id: 'heart',
    name: 'HEART',
    description: 'Risco de evento cardíaco maior em 6 semanas na dor torácica.',
    max: 10,
    items: [
      {
        id: 'h',
        label: 'História',
        options: [
          { label: 'Pouco suspeita', points: 0 },
          { label: 'Moderadamente suspeita', points: 1 },
          { label: 'Altamente suspeita', points: 2 },
        ],
        auto: (c) => {
          const v = c.a('dt_tipica');
          if (!Array.isArray(v)) return undefined;
          return v.length >= 3 ? 2 : v.length === 2 ? 1 : 0;
        },
      },
      {
        id: 'e',
        label: 'ECG',
        options: [
          { label: 'Normal', points: 0 },
          { label: 'Alteração de repolarização inespecífica/BRE/HVE', points: 1 },
          { label: 'Desvio de ST significativo', points: 2 },
        ],
      },
      {
        id: 'a',
        label: 'Idade',
        options: [
          { label: '< 45 anos', points: 0 },
          { label: '45–64 anos', points: 1 },
          { label: '≥ 65 anos', points: 2 },
        ],
        auto: (c) => (known(c.ageYears) ? (c.ageYears! >= 65 ? 2 : c.ageYears! >= 45 ? 1 : 0) : undefined),
      },
      {
        id: 'r',
        label: 'Fatores de risco',
        hint: 'HAS, DM, dislipidemia, tabagismo, obesidade, história familiar',
        options: [
          { label: 'Nenhum', points: 0 },
          { label: '1–2 fatores', points: 1 },
          { label: '≥ 3 fatores ou aterosclerose conhecida', points: 2 },
        ],
        auto: (c) => {
          const n = riskFactorCount(c);
          if (n === undefined) return undefined;
          return n >= 3 ? 2 : n >= 1 ? 1 : 0;
        },
      },
      {
        id: 't',
        label: 'Troponina',
        options: [
          { label: '≤ limite normal', points: 0 },
          { label: '1–3× o limite', points: 1 },
          { label: '> 3× o limite', points: 2 },
        ],
      },
    ],
    interpret: (t, missing) => {
      const prefix = missing ? `${t} ponto(s) parcial — ` : '';
      if (t >= 7) return { text: `${prefix}Alto risco (7–10): estratégia invasiva precoce`, tone: 'red' };
      if (t >= 4) return { text: `${prefix}Risco intermediário (4–6): internar/observar e investigar`, tone: 'orange' };
      return missing
        ? { text: `${t} ponto(s) parcial — faltam ECG/troponina`, tone: 'accent' }
        : { text: 'Baixo risco (0–3): alta precoce possível com seguimento', tone: 'green' };
    },
    applicable: (c) => c.template.id === 'dor_toracica' || c.sym('dor_toracica') === 'sim',
    refs: ['heart-2008', 'sbc-sca-2021'],
  },
  {
    id: 'wells_tep',
    name: 'Wells para TEP',
    description: 'Probabilidade clínica de tromboembolismo pulmonar.',
    max: 12.5,
    items: [
      {
        id: 'tvp',
        label: 'Sinais clínicos de TVP',
        points: 3,
        auto: (c) => (yesSym(c, 'edema_unilateral') || c.finding('edema_unilateral') || c.finding('empastamento') ? 3 : c.sym('edema_unilateral') === 'nao' ? 0 : undefined),
      },
      {
        id: 'mais_provavel',
        label: 'TEP é o diagnóstico mais provável',
        points: 3,
        auto: (c) => (c.has('tep_alternativo', 'nao') ? 3 : c.has('tep_alternativo', 'sim') ? 0 : undefined),
      },
      { id: 'fc', label: 'FC > 100 bpm', points: 1.5, auto: (c) => (known(c.vitals.fc) ? pts(c.vitals.fc! > 100, 1.5) : undefined) },
      {
        id: 'imob',
        label: 'Imobilização ≥ 3 dias ou cirurgia nas últimas 4 semanas',
        points: 1.5,
        auto: (c) => (Array.isArray(c.a('tev_fr')) ? pts(c.has('tev_fr', 'cirurgia_imob'), 1.5) : undefined),
      },
      {
        id: 'previo',
        label: 'TVP/TEP prévio',
        points: 1.5,
        auto: (c) => (c.disease('tev') || c.has('tev_fr', 'tev_previo') ? 1.5 : Array.isArray(c.a('tev_fr')) ? 0 : undefined),
      },
      { id: 'hemoptise', label: 'Hemoptise', points: 1, auto: (c) => (c.sym('hemoptise') ? pts(yesSym(c, 'hemoptise'), 1) : undefined) },
      {
        id: 'cancer',
        label: 'Câncer ativo',
        points: 1,
        auto: (c) => (c.has('tev_fr', 'cancer') || c.disease('cancer') ? 1 : Array.isArray(c.a('tev_fr')) ? 0 : undefined),
      },
    ],
    interpret: (t, missing) => {
      const p = missing ? ' (parcial)' : '';
      if (t > 6) return { text: `Probabilidade alta${p} — TEP provável (> 4): angiotomografia`, tone: 'red' };
      if (t > 4) return { text: `TEP provável${p} (> 4): angiotomografia de tórax`, tone: 'red' };
      if (t >= 2) return { text: `TEP improvável${p} (≤ 4), probabilidade intermediária: D-dímero`, tone: 'orange' };
      return { text: `Probabilidade baixa${p} (< 2): aplicar PERC; se positivo, D-dímero`, tone: 'green' };
    },
    applicable: (c) =>
      c.template.id === 'dispneia' || c.sym('dor_pleuritica') === 'sim' || c.sym('hemoptise') === 'sim' || Array.isArray(c.a('tev_fr')),
    refs: ['wells-tep-2000', 'aha-tep-2026'],
  },
  {
    id: 'perc',
    name: 'PERC',
    description: 'Só para baixa probabilidade clínica: se todos negativos, TEP afastado sem exames.',
    max: 8,
    items: [
      { id: 'idade', label: 'Idade ≥ 50 anos', points: 1, auto: (c) => (known(c.ageYears) ? pts(c.ageYears! >= 50, 1) : undefined) },
      { id: 'fc', label: 'FC ≥ 100 bpm', points: 1, auto: (c) => (known(c.vitals.fc) ? pts(c.vitals.fc! >= 100, 1) : undefined) },
      {
        id: 'sat',
        label: 'SpO₂ < 95% em ar ambiente',
        points: 1,
        auto: (c) => (known(c.vitals.spo2) ? pts(c.vitals.spo2! < 95 || !!c.vitals.o2, 1) : undefined),
      },
      {
        id: 'edema',
        label: 'Edema unilateral de membro inferior',
        points: 1,
        auto: (c) => (yesSym(c, 'edema_unilateral') || c.finding('edema_unilateral') ? 1 : c.sym('edema_unilateral') === 'nao' ? 0 : undefined),
      },
      { id: 'hemoptise', label: 'Hemoptise', points: 1, auto: (c) => (c.sym('hemoptise') ? pts(yesSym(c, 'hemoptise'), 1) : undefined) },
      {
        id: 'cirurgia',
        label: 'Cirurgia ou trauma com internação nas últimas 4 semanas',
        points: 1,
        auto: (c) => (Array.isArray(c.a('tev_fr')) ? pts(c.has('tev_fr', 'cirurgia_imob'), 1) : undefined),
      },
      {
        id: 'previo',
        label: 'TVP/TEP prévio',
        points: 1,
        auto: (c) => (c.disease('tev') || c.has('tev_fr', 'tev_previo') ? 1 : Array.isArray(c.a('tev_fr')) ? 0 : undefined),
      },
      {
        id: 'hormonio',
        label: 'Uso de estrogênio',
        points: 1,
        auto: (c) =>
          c.has('tev_fr', 'estrogenio') || c.has('go_contracepcao', 'aco') ? 1 : Array.isArray(c.a('tev_fr')) ? 0 : undefined,
      },
    ],
    interpret: (t, missing) =>
      t > 0
        ? { text: 'PERC positivo: não exclui TEP — seguir com D-dímero/imagem', tone: 'orange' }
        : missing
          ? { text: 'Nenhum critério até agora — complete todos os itens', tone: 'accent' }
          : { text: 'PERC negativo: com baixa probabilidade clínica, TEP afastado', tone: 'green' },
    applicable: (c) => c.template.id === 'dispneia' || c.sym('dor_pleuritica') === 'sim' || Array.isArray(c.a('tev_fr')),
    refs: ['perc-2004', 'aha-tep-2026'],
  },
  {
    id: 'wells_tvp',
    name: 'Wells para TVP',
    description: 'Probabilidade clínica de trombose venosa profunda.',
    items: [
      { id: 'cancer', label: 'Câncer ativo', points: 1, auto: (c) => (c.disease('cancer') || c.has('tev_fr', 'cancer') ? 1 : undefined) },
      { id: 'paresia', label: 'Paralisia, paresia ou imobilização gessada recente do membro', points: 1 },
      { id: 'acamado', label: 'Acamado ≥ 3 dias ou cirurgia maior nas últimas 12 semanas', points: 1, auto: (c) => (c.has('tev_fr', 'cirurgia_imob') ? 1 : undefined) },
      { id: 'dor_trajeto', label: 'Dor à palpação do trajeto venoso profundo', points: 1 },
      { id: 'edema_membro', label: 'Edema de todo o membro', points: 1 },
      { id: 'panturrilha', label: 'Panturrilha ≥ 3 cm maior que a contralateral', points: 1, auto: (c) => (c.finding('empastamento') ? 1 : undefined) },
      { id: 'cacifo', label: 'Edema com cacifo restrito ao membro sintomático', points: 1, auto: (c) => (c.finding('edema_unilateral') ? 1 : undefined) },
      { id: 'colaterais', label: 'Veias superficiais colaterais (não varicosas)', points: 1 },
      { id: 'previa', label: 'TVP prévia', points: 1, auto: (c) => (c.disease('tev') || c.has('tev_fr', 'tev_previo') ? 1 : undefined) },
      { id: 'alternativo', label: 'Diagnóstico alternativo tão ou mais provável', points: -2 },
    ],
    interpret: (t, missing) =>
      t >= 2
        ? { text: 'TVP provável (≥ 2): ultrassonografia Doppler', tone: 'red' }
        : { text: `TVP improvável (< 2)${missing ? ' — parcial' : ''}: D-dímero; se positivo, Doppler`, tone: 'orange' },
    applicable: (c) => c.sym('edema_unilateral') === 'sim' || c.finding('edema_unilateral') || c.finding('empastamento'),
    refs: ['wells-tvp-2003'],
  },
  {
    id: 'cha2ds2vasc',
    name: 'CHA₂DS₂-VASc',
    description: 'Risco de AVC na fibrilação atrial (a ESC 2024 usa o CHA₂DS₂-VA, sem o item sexo).',
    max: 9,
    items: [
      { id: 'ic', label: 'Insuficiência cardíaca', points: 1, auto: (c) => pts(c.disease('ic') || c.has('ic_previa', 'fer', 'fep', 'desconhecida'), 1) },
      { id: 'has', label: 'Hipertensão', points: 1, auto: (c) => pts(c.disease('has'), 1) },
      { id: 'idade75', label: 'Idade ≥ 75 anos', points: 2, auto: (c) => (known(c.ageYears) ? pts(c.ageYears! >= 75, 2) : undefined) },
      { id: 'dm', label: 'Diabetes', points: 1, auto: (c) => pts(c.disease('dm2') || c.disease('dm1'), 1) },
      { id: 'avc', label: 'AVC/AIT/tromboembolismo prévio', points: 2, auto: (c) => pts(c.disease('avc'), 2) },
      { id: 'vascular', label: 'Doença vascular (IAM, DAP, placa aórtica)', points: 1, auto: (c) => pts(c.disease('dac') || c.disease('dap'), 1) },
      {
        id: 'idade65',
        label: 'Idade 65–74 anos',
        points: 1,
        auto: (c) => (known(c.ageYears) ? pts(c.ageYears! >= 65 && c.ageYears! < 75, 1) : undefined),
      },
      { id: 'sexo', label: 'Sexo feminino', points: 1, auto: (c) => (c.sex ? pts(c.sex === 'F', 1) : undefined) },
    ],
    interpret: (t, _m, v) => {
      const va = t - (v.sexo ?? 0);
      if (va >= 2) return { text: `VASc ${t} · VA ${va}: anticoagulação oral recomendada (sem contraindicação)`, tone: 'red' };
      if (va === 1) return { text: `VASc ${t} · VA ${va}: considerar anticoagulação`, tone: 'orange' };
      return { text: `VASc ${t} · VA 0: baixo risco — anticoagulação não indicada`, tone: 'green' };
    },
    applicable: (c) => c.disease('fa') || c.has('palp_ritmo', 'irregular') || c.finding('ritmo_irregular'),
    refs: ['cha2ds2vasc-2010', 'esc-fa-2024'],
  },
  {
    id: 'hasbled',
    name: 'HAS-BLED',
    description: 'Risco de sangramento em anticoagulados com FA. Escore alto = corrigir fatores, não contraindica.',
    max: 9,
    items: [
      { id: 'h', label: 'Hipertensão não controlada (PAS > 160)', points: 1, auto: (c) => (known(c.vitals.pas) ? pts(c.vitals.pas! > 160, 1) : undefined) },
      { id: 'renal', label: 'Função renal alterada (diálise, transplante, Cr ≥ 2,26 mg/dL)', points: 1 },
      { id: 'hepatica', label: 'Função hepática alterada (cirrose; bilirrubina > 2× ou TGO/TGP > 3×)', points: 1, auto: (c) => (c.disease('hepatopatia') ? 1 : undefined) },
      { id: 'avc', label: 'AVC prévio', points: 1, auto: (c) => pts(c.disease('avc'), 1) },
      { id: 'sangramento', label: 'Sangramento prévio ou predisposição', points: 1, auto: (c) => (c.disease('sangramento') ? 1 : undefined) },
      { id: 'inr', label: 'INR lábil (se em varfarina)', points: 1 },
      { id: 'idoso', label: 'Idade > 65 anos', points: 1, auto: (c) => (known(c.ageYears) ? pts(c.ageYears! > 65, 1) : undefined) },
      { id: 'drogas', label: 'Antiplaquetário ou AINE', points: 1, auto: (c) => (c.has('antitromboticos', 'aas', 'antiagregante', 'aine') ? 1 : undefined) },
      { id: 'alcool', label: 'Álcool (≥ 8 doses/semana)', points: 1, auto: (c) => (known(c.num('hv_doses_semana')) ? pts(c.num('hv_doses_semana')! >= 8, 1) : undefined) },
    ],
    interpret: (t) =>
      t >= 3
        ? { text: 'Alto risco de sangramento (≥ 3): corrigir fatores modificáveis e acompanhar de perto', tone: 'orange' }
        : { text: 'Risco de sangramento baixo a moderado', tone: 'green' },
    applicable: (c) => c.disease('fa'),
    refs: ['hasbled-2010', 'esc-fa-2024'],
  },
  {
    id: 'alvarado',
    name: 'Alvarado',
    description: 'Probabilidade de apendicite aguda.',
    max: 10,
    items: [
      { id: 'migracao', label: 'Migração da dor para a FID', points: 1, auto: (c) => (c.a('migracao') ? pts(c.has('migracao', 'sim'), 1) : undefined) },
      { id: 'anorexia', label: 'Anorexia', points: 1, auto: (c) => (c.sym('hiporexia') ? pts(yesSym(c, 'hiporexia'), 1) : undefined) },
      {
        id: 'nausea',
        label: 'Náuseas ou vômitos',
        points: 1,
        auto: (c) => (c.sym('nauseas') || c.sym('vomitos') ? pts(yesSym(c, 'nauseas') || yesSym(c, 'vomitos'), 1) : undefined),
      },
      { id: 'dor_fid', label: 'Dor (defesa) em fossa ilíaca direita', points: 2, auto: (c) => (c.body('abd_fid', 'location') ? 2 : undefined) },
      { id: 'descompressao', label: 'Dor à descompressão (Blumberg)', points: 1, auto: (c) => (c.finding('blumberg') ? 1 : undefined) },
      { id: 'febre', label: 'Temperatura ≥ 37,3 °C', points: 1, auto: (c) => (known(c.vitals.temp) ? pts(c.vitals.temp! >= 37.3, 1) : undefined) },
      { id: 'leucocitose', label: 'Leucocitose > 10.000', points: 2 },
      { id: 'desvio', label: 'Desvio à esquerda', points: 1 },
    ],
    interpret: (t, missing) => {
      const p = missing ? ' (parcial)' : '';
      if (t >= 7) return { text: `Alta probabilidade${p} (≥ 7): avaliação cirúrgica`, tone: 'red' };
      if (t >= 5) return { text: `Probabilidade intermediária${p} (5–6): imagem (USG/TC)`, tone: 'orange' };
      return { text: `Baixa probabilidade${p} (≤ 4)`, tone: 'green' };
    },
    applicable: (c) => c.body('abd_fid') || c.has('migracao', 'sim'),
    refs: ['alvarado-1986'],
  },
  {
    id: 'centor',
    name: 'Centor modificado (McIsaac)',
    description: 'Probabilidade de faringite estreptocócica.',
    items: [
      { id: 'febre', label: 'Temperatura > 38 °C', points: 1, auto: (c) => (known(c.vitals.temp) ? pts(c.vitals.temp! > 38, 1) : undefined) },
      { id: 'sem_tosse', label: 'Ausência de tosse', points: 1, auto: (c) => (c.sym('tosse') ? pts(c.sym('tosse') === 'nao', 1) : undefined) },
      { id: 'linfonodos', label: 'Linfonodos cervicais anteriores dolorosos', points: 1, auto: (c) => (c.finding('linfonodomegalia') ? 1 : undefined) },
      { id: 'exsudato', label: 'Exsudato ou edema amigdaliano', points: 1, auto: (c) => (c.finding('exsudato') ? 1 : undefined) },
      {
        id: 'idade',
        label: 'Idade',
        options: [
          { label: '3–14 anos', points: 1 },
          { label: '15–44 anos', points: 0 },
          { label: '≥ 45 anos', points: -1 },
        ],
        auto: (c) => (known(c.ageYears) ? (c.ageYears! < 15 ? 1 : c.ageYears! < 45 ? 0 : -1) : undefined),
      },
    ],
    interpret: (t) => {
      if (t >= 4) return { text: '≥ 4: alta probabilidade — teste rápido/cultura ou antibiótico conforme protocolo', tone: 'orange' };
      if (t >= 2) return { text: '2–3: teste rápido/cultura; tratar se positivo', tone: 'accent' };
      return { text: '≤ 1: baixa probabilidade — sem teste nem antibiótico', tone: 'green' };
    },
    applicable: (c) => c.sym('dor_garganta') === 'sim',
    refs: ['mcisaac-1998'],
  },
  {
    id: 'ottawa_hsa',
    name: 'Regra de Ottawa para HSA',
    description: 'Cefaleia aguda não traumática, paciente alerta ≥ 15 anos: qualquer item → investigar.',
    items: [
      { id: 'idade', label: 'Idade ≥ 40 anos', points: 1, auto: (c) => (known(c.ageYears) ? pts(c.ageYears! >= 40, 1) : undefined) },
      { id: 'pescoco', label: 'Dor ou rigidez cervical', points: 1, auto: (c) => (c.sym('rigidez_nuca') ? pts(yesSym(c, 'rigidez_nuca'), 1) : undefined) },
      { id: 'pc', label: 'Perda de consciência presenciada', points: 1, auto: (c) => (c.a('hsa_pc') ? pts(c.has('hsa_pc', 'sim'), 1) : undefined) },
      { id: 'esforco', label: 'Início durante esforço', points: 1, auto: (c) => (c.a('hsa_esforco') ? pts(c.has('hsa_esforco', 'sim'), 1) : undefined) },
      { id: 'thunderclap', label: 'Pico instantâneo (“em trovoada”)', points: 1, auto: (c) => (c.a('inicio') ? pts(c.has('inicio', 'thunderclap'), 1) : undefined) },
      { id: 'flexao', label: 'Limitação da flexão cervical ao exame', points: 1, auto: (c) => (c.finding('flexao_cervical_limitada') ? 1 : undefined) },
    ],
    interpret: (t, missing) =>
      t > 0
        ? { text: 'Regra positiva: HSA não pode ser excluída — TC (± punção lombar)', tone: 'red' }
        : missing
          ? { text: 'Nenhum critério até agora — complete os itens', tone: 'accent' }
          : { text: 'Regra negativa: HSA muito improvável', tone: 'green' },
    applicable: (c) => c.template.id === 'cefaleia' && (c.has('inicio', 'thunderclap', 'subito') || c.has('hsa_pior', 'sim')),
    refs: ['ottawa-hsa-2013'],
  },
  {
    id: 'addrs',
    name: 'ADD-RS (dissecção de aorta)',
    description: 'Uma categoria = 1 ponto.',
    max: 3,
    items: [
      {
        id: 'condicoes',
        label: 'Condição de alto risco (Marfan, história familiar, valvopatia, manipulação, aneurisma)',
        points: 1,
        auto: (c) => (Array.isArray(c.a('ao_condicoes')) ? pts((c.a('ao_condicoes') as string[]).length > 0, 1) : undefined),
      },
      {
        id: 'dor',
        label: 'Dor de alto risco (abrupta, intensa, lancinante/rasgando)',
        points: 1,
        auto: (c) => (c.has('carater', 'rasgando') || c.has('ao_max_inicio', 'sim') ? 1 : c.a('carater') ? 0 : undefined),
      },
      {
        id: 'exame',
        label: 'Exame de alto risco (déficit de pulso/PA, déficit focal, sopro de IAo novo, hipotensão)',
        points: 1,
        auto: (c) =>
          c.finding('pulso_assimetrico') || c.finding('sopro_diastolico') || (c.vitals.pas ?? 999) < 90 || c.has('ao_neuro', 'sim')
            ? 1
            : c.enc.exam.systems.cardiovascular
              ? 0
              : undefined,
      },
    ],
    interpret: (t) =>
      t >= 2
        ? { text: 'Alto risco (≥ 2): angiotomografia de aorta', tone: 'red' }
        : t === 1
          ? { text: 'Risco intermediário (1): D-dímero/imagem conforme protocolo', tone: 'orange' }
          : { text: 'Baixo risco (0)', tone: 'green' },
    applicable: (c) => c.template.id === 'dor_toracica' && (c.has('carater', 'rasgando') || c.has('inicio', 'subito') || c.body('dorso')),
    refs: ['addrs-2011'],
  },
  {
    id: 'sfsr',
    name: 'San Francisco Syncope Rule (CHESS)',
    description: 'Qualquer item positivo = alto risco de desfecho grave em 7 dias.',
    items: [
      { id: 'c', label: 'Insuficiência cardíaca (história)', points: 1, auto: (c) => pts(c.disease('ic') || c.has('car_cardiopatia', 'ic'), 1) },
      { id: 'h', label: 'Hematócrito < 30%', points: 1 },
      { id: 'e', label: 'ECG anormal (novo ou não sinusal)', points: 1 },
      { id: 's1', label: 'Dispneia', points: 1, auto: (c) => (c.sym('dispneia') ? pts(yesSym(c, 'dispneia'), 1) : undefined) },
      { id: 's2', label: 'PAS < 90 mmHg na triagem', points: 1, auto: (c) => (known(c.vitals.pas) ? pts(c.vitals.pas! < 90, 1) : undefined) },
    ],
    interpret: (t, missing) =>
      t > 0
        ? { text: 'Alto risco: investigar e considerar internação', tone: 'red' }
        : missing
          ? { text: 'Nenhum critério até agora — faltam ECG e hematócrito', tone: 'accent' }
          : { text: 'Baixo risco pela regra', tone: 'green' },
    applicable: (c) => c.template.id === 'sincope' || c.sym('sincope') === 'sim',
    refs: ['sfsr-2004', 'esc-sincope-2018'],
  },
  {
    id: 'gbs',
    name: 'Glasgow-Blatchford',
    description: 'Hemorragia digestiva alta: necessidade de intervenção.',
    items: [
      {
        id: 'ureia',
        label: 'Ureia (mg/dL)',
        options: [
          { label: '< 39', points: 0 },
          { label: '39–47', points: 2 },
          { label: '48–59', points: 3 },
          { label: '60–149', points: 4 },
          { label: '≥ 150', points: 6 },
        ],
      },
      {
        id: 'hb',
        label: 'Hemoglobina (g/dL)',
        hint: 'Homens: 12–13 = 1; 10–12 = 3; < 10 = 6. Mulheres: 10–12 = 1; < 10 = 6',
        options: [
          { label: 'Normal (H ≥ 13 / M ≥ 12)', points: 0 },
          { label: 'H 12–13 ou M 10–12', points: 1 },
          { label: 'H 10–12', points: 3 },
          { label: '< 10', points: 6 },
        ],
      },
      {
        id: 'pas',
        label: 'PAS (mmHg)',
        options: [
          { label: '≥ 110', points: 0 },
          { label: '100–109', points: 1 },
          { label: '90–99', points: 2 },
          { label: '< 90', points: 3 },
        ],
        auto: (c) => {
          const p = c.vitals.pas;
          if (p === undefined) return undefined;
          return p >= 110 ? 0 : p >= 100 ? 1 : p >= 90 ? 2 : 3;
        },
      },
      { id: 'fc', label: 'FC ≥ 100 bpm', points: 1, auto: (c) => (known(c.vitals.fc) ? pts(c.vitals.fc! >= 100, 1) : undefined) },
      { id: 'melena', label: 'Melena', points: 1, auto: (c) => (c.sym('melena') ? pts(yesSym(c, 'melena'), 1) : undefined) },
      { id: 'sincope', label: 'Síncope', points: 2, auto: (c) => (c.sym('sincope') ? pts(yesSym(c, 'sincope'), 2) : undefined) },
      { id: 'hepatopatia', label: 'Hepatopatia', points: 2, auto: (c) => pts(c.disease('hepatopatia') || c.has('hd_hepatopatia', 'sim'), 2) },
      { id: 'ic', label: 'Insuficiência cardíaca', points: 2, auto: (c) => pts(c.disease('ic'), 2) },
    ],
    interpret: (t, missing) =>
      t === 0 && !missing
        ? { text: '0: muito baixo risco — avaliar manejo ambulatorial', tone: 'green' }
        : t >= 7
          ? { text: `${t}${missing ? ' (parcial)' : ''}: alto risco — endoscopia precoce e internação`, tone: 'red' }
          : { text: `${t}${missing ? ' (parcial)' : ''}: requer avaliação hospitalar/endoscopia`, tone: 'orange' },
    applicable: (c) => c.sym('hematemese') === 'sim' || c.sym('melena') === 'sim',
    refs: ['blatchford-2000'],
  },
];

export const SCORE_BY_ID = Object.fromEntries(SCORES.map((s) => [s.id, s])) as Record<ScoreId, ScoreDef>;

export interface ScoreResult {
  def: ScoreDef;
  total: number;
  values: Record<string, number | undefined>;
  source: Record<string, 'auto' | 'manual' | 'faltando'>;
  missing: string[];
  interpretation: { text: string; tone: 'green' | 'orange' | 'red' | 'accent' };
}

export function computeScore(def: ScoreDef, ctx: ClinicalContext): ScoreResult {
  const manual = ctx.enc.scoreInputs[def.id] ?? {};
  const values: Record<string, number | undefined> = {};
  const source: Record<string, 'auto' | 'manual' | 'faltando'> = {};
  const missing: string[] = [];
  for (const item of def.items) {
    if (manual[item.id] !== undefined) {
      values[item.id] = manual[item.id];
      source[item.id] = 'manual';
      continue;
    }
    let v: number | undefined;
    try {
      v = item.auto?.(ctx);
    } catch {
      v = undefined;
    }
    if (v !== undefined) {
      values[item.id] = v;
      source[item.id] = 'auto';
    } else {
      source[item.id] = 'faltando';
      missing.push(item.label);
    }
  }
  const total = Object.values(values).reduce<number>((acc, v) => acc + (v ?? 0), 0);
  return { def, total, values, source, missing, interpretation: def.interpret(total, missing.length, values) };
}

/** Escores aplicáveis ao caso (pelas regras locais) + os sugeridos pela IA. */
export function applicableScores(ctx: ClinicalContext, extraIds: string[] = []): ScoreDef[] {
  const ids = new Set<string>(extraIds);
  for (const s of SCORES) {
    try {
      if (s.applicable(ctx)) ids.add(s.id);
    } catch {
      /* ignora */
    }
  }
  return SCORES.filter((s) => ids.has(s.id));
}
