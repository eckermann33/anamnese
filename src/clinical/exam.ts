import type { ExamSectionId } from '../db/types';
import type { Option } from './types';
import { opt } from './templates/common';

/* ==========================================================================
   EXAME FÍSICO GUIADO
   --------------------------------------------------------------------------
   Cada sistema tem:
   - `normal`: partes do texto normal (com chave), na ordem do prontuário
   - `findings`: achados alterados selecionáveis. `replaces` = qual parte do
     texto normal o achado substitui; `exclusive` = grupo de achados
     mutuamente exclusivos (ex.: graus de edema).
   - `rows` (opcional): linhas estruturadas (ectoscopia, estado mental), cada
     uma com a 1ª opção = normal.
   ========================================================================== */

export interface ExamFinding {
  id: string;
  label: string;
  text: string;
  replaces?: string;
  exclusive?: string;
  flag?: 'red' | 'orange';
}

export interface ExamRow {
  id: string;
  label: string;
  options: Option[]; // options[0] = normal
}

export interface ExamSystemDef {
  id: ExamSectionId;
  label: string;
  abbr: string;
  normal: Array<{ key: string; text: string }>;
  findings: ExamFinding[];
  rows?: ExamRow[];
  /** Exibir mesmo sem o sistema estar selecionado no direcionamento. */
  always?: boolean;
}

const f = (id: string, label: string, text: string, extra: Partial<ExamFinding> = {}): ExamFinding => ({ id, label, text, ...extra });

export const EXAM_SYSTEMS: ExamSystemDef[] = [
  {
    id: 'geral',
    label: 'Ectoscopia / estado geral',
    abbr: 'Ectoscopia',
    always: true,
    normal: [],
    findings: [],
    rows: [
      {
        id: 'estado',
        label: 'Estado geral',
        options: [opt('beg', 'BEG', undefined, 'bom estado geral'), opt('reg', 'REG', 'orange', 'regular estado geral'), opt('meg', 'MEG', 'red', 'mau estado geral')],
      },
      {
        id: 'consciencia',
        label: 'Consciência',
        options: [
          opt('lote', 'Lúcido e orientado', undefined, 'lúcido e orientado em tempo e espaço'),
          opt('desorientado', 'Desorientado', 'orange', 'desorientado'),
          opt('sonolento', 'Sonolento', 'orange', 'sonolento'),
          opt('torporoso', 'Torporoso', 'red', 'torporoso'),
          opt('coma', 'Comatoso', 'red', 'comatoso'),
        ],
      },
      {
        id: 'coloracao',
        label: 'Coloração',
        options: [
          opt('corado', 'Corado', undefined, 'corado'),
          opt('hipo1', 'Hipocorado 1+/4+', undefined, 'hipocorado (1+/4+)'),
          opt('hipo2', 'Hipocorado 2+/4+', 'orange', 'hipocorado (2+/4+)'),
          opt('hipo3', 'Hipocorado 3–4+/4+', 'red', 'hipocorado (3+ a 4+/4+)'),
        ],
      },
      {
        id: 'hidratacao',
        label: 'Hidratação',
        options: [
          opt('hidratado', 'Hidratado', undefined, 'hidratado'),
          opt('desid1', 'Desidratado 1+/4+', undefined, 'desidratado (1+/4+)'),
          opt('desid2', 'Desidratado 2+/4+', 'orange', 'desidratado (2+/4+)'),
          opt('desid3', 'Desidratado 3–4+/4+', 'red', 'desidratado (3+ a 4+/4+)'),
        ],
      },
      {
        id: 'ictericia',
        label: 'Icterícia',
        options: [opt('anicterico', 'Anictérico', undefined, 'anictérico'), opt('icterico', 'Ictérico', 'orange', 'ictérico')],
      },
      {
        id: 'cianose',
        label: 'Cianose',
        options: [
          opt('acianotico', 'Acianótico', undefined, 'acianótico'),
          opt('periferica', 'Cianose periférica', 'orange', 'com cianose periférica'),
          opt('central', 'Cianose central', 'red', 'com cianose central'),
        ],
      },
      {
        id: 'temperatura',
        label: 'Temperatura ao toque',
        options: [opt('afebril', 'Afebril ao toque', undefined, 'afebril ao toque'), opt('febril', 'Febril ao toque', 'orange', 'febril ao toque')],
      },
      {
        id: 'respiracao',
        label: 'Padrão respiratório',
        options: [
          opt('eupneico', 'Eupneico', undefined, 'eupneico em ar ambiente'),
          opt('taquipneico', 'Taquipneico', 'orange', 'taquipneico'),
          opt('esforco', 'Esforço respiratório', 'red', 'com sinais de esforço respiratório'),
        ],
      },
      {
        id: 'perfusao',
        label: 'Perfusão periférica',
        options: [
          opt('tec_normal', 'TEC < 3 s', undefined, 'perfusão periférica preservada (TEC < 3 s)'),
          opt('tec_lento', 'TEC ≥ 3 s', 'red', 'perfusão periférica lentificada (TEC ≥ 3 s)'),
          opt('moteado', 'Pele moteada', 'red', 'pele moteada'),
        ],
      },
      {
        id: 'facies',
        label: 'Fácies',
        options: [
          opt('atipica', 'Atípica', undefined, 'fácies atípica'),
          opt('dor', 'De dor', undefined, 'fácies de dor'),
          opt('toxemiada', 'Toxemiada', 'red', 'fácies toxemiada'),
        ],
      },
    ],
  },
  {
    id: 'cardiovascular',
    label: 'Cardiovascular',
    abbr: 'ACV',
    normal: [
      { key: 'ritmo', text: 'ritmo cardíaco regular em 2 tempos' },
      { key: 'bulhas', text: 'bulhas normofonéticas' },
      { key: 'sopros', text: 'sem sopros' },
      { key: 'jugular', text: 'sem turgência jugular' },
      { key: 'pulsos', text: 'pulsos periféricos palpáveis e simétricos' },
      { key: 'edema', text: 'sem edema de membros inferiores' },
    ],
    findings: [
      f('ritmo_irregular', 'Ritmo irregular', 'ritmo cardíaco irregular', { replaces: 'ritmo', flag: 'orange' }),
      f('taquicardico', 'Taquicárdico', 'ritmo taquicárdico', { replaces: 'ritmo' }),
      f('b3', 'B3', 'presença de B3', { replaces: 'ritmo', flag: 'orange' }),
      f('b4', 'B4', 'presença de B4', { replaces: 'ritmo' }),
      f('hipofoneticas', 'Bulhas hipofonéticas', 'bulhas hipofonéticas', { replaces: 'bulhas', flag: 'orange' }),
      f('sopro_sistolico', 'Sopro sistólico', 'sopro sistólico (descrever foco e intensidade)', { replaces: 'sopros' }),
      f('sopro_diastolico', 'Sopro diastólico', 'sopro diastólico (descrever foco e intensidade)', { replaces: 'sopros', flag: 'orange' }),
      f('atrito', 'Atrito pericárdico', 'atrito pericárdico', { replaces: 'sopros', flag: 'orange' }),
      f('tjp', 'Turgência jugular', 'turgência jugular patológica a 45°', { replaces: 'jugular', flag: 'orange' }),
      f('rhj', 'Refluxo hepatojugular', 'refluxo hepatojugular presente', { replaces: 'jugular' }),
      f('pulso_assimetrico', 'Pulsos/PA assimétricos', 'pulsos assimétricos entre os membros', { replaces: 'pulsos', flag: 'red' }),
      f('pulsos_reduzidos', 'Pulsos diminuídos', 'pulsos periféricos diminuídos', { replaces: 'pulsos', flag: 'orange' }),
      f('edema1', 'Edema 1+/4+', 'edema de membros inferiores 1+/4+, com cacifo', { replaces: 'edema', exclusive: 'edema' }),
      f('edema2', 'Edema 2+/4+', 'edema de membros inferiores 2+/4+, com cacifo', { replaces: 'edema', exclusive: 'edema' }),
      f('edema3', 'Edema 3–4+/4+', 'edema de membros inferiores 3+ a 4+/4+, com cacifo', { replaces: 'edema', exclusive: 'edema', flag: 'orange' }),
      f('edema_unilateral', 'Edema unilateral/empastamento de panturrilha', 'edema unilateral com empastamento de panturrilha', {
        replaces: 'edema',
        flag: 'red',
      }),
    ],
  },
  {
    id: 'respiratorio',
    label: 'Respiratório',
    abbr: 'AR',
    normal: [
      { key: 'inspecao', text: 'tórax atípico, expansibilidade preservada e simétrica' },
      { key: 'ftv', text: 'frêmito toracovocal preservado' },
      { key: 'percussao', text: 'som claro pulmonar à percussão' },
      { key: 'mv', text: 'murmúrio vesicular presente bilateralmente' },
      { key: 'ruidos', text: 'sem ruídos adventícios' },
    ],
    findings: [
      f('tiragem', 'Tiragem / musculatura acessória', 'uso de musculatura acessória e tiragem', { replaces: 'inspecao', flag: 'red' }),
      f('expansibilidade_reduzida', 'Expansibilidade reduzida', 'expansibilidade reduzida', { replaces: 'inspecao' }),
      f('ftv_aumentado', 'FTV aumentado', 'frêmito toracovocal aumentado (consolidação?)', { replaces: 'ftv' }),
      f('ftv_reduzido', 'FTV diminuído', 'frêmito toracovocal diminuído', { replaces: 'ftv' }),
      f('macicez', 'Macicez/submacicez', 'macicez à percussão', { replaces: 'percussao', flag: 'orange' }),
      f('hipertimpanismo', 'Hipertimpanismo', 'hipertimpanismo à percussão', { replaces: 'percussao', flag: 'red' }),
      f('mv_reduzido', 'MV diminuído', 'murmúrio vesicular diminuído (descrever local)', { replaces: 'mv', flag: 'orange' }),
      f('mv_abolido', 'MV abolido', 'murmúrio vesicular abolido (descrever local)', { replaces: 'mv', flag: 'red' }),
      f('crepitacoes', 'Crepitações', 'estertores crepitantes (descrever local)', { replaces: 'ruidos', flag: 'orange' }),
      f('crepitacoes_bases', 'Crepitações em bases', 'estertores crepitantes em bases', { replaces: 'ruidos', flag: 'orange' }),
      f('sibilos', 'Sibilos', 'sibilos difusos', { replaces: 'ruidos', flag: 'orange' }),
      f('roncos', 'Roncos', 'roncos esparsos', { replaces: 'ruidos' }),
      f('estridor', 'Estridor', 'estridor', { replaces: 'ruidos', flag: 'red' }),
      f('atrito_pleural', 'Atrito pleural', 'atrito pleural', { replaces: 'ruidos' }),
      f('egofonia', 'Egofonia/broncofonia', 'egofonia', { replaces: 'ruidos' }),
    ],
  },
  {
    id: 'digestorio',
    label: 'Abdome',
    abbr: 'ABD',
    normal: [
      { key: 'inspecao', text: 'abdome plano' },
      { key: 'rha', text: 'ruídos hidroaéreos presentes e normoativos' },
      { key: 'palpacao', text: 'flácido, indolor à palpação superficial e profunda' },
      { key: 'visceras', text: 'sem visceromegalias ou massas palpáveis' },
      { key: 'percussao', text: 'timpânico à percussão' },
      { key: 'peritonio', text: 'sem sinais de irritação peritoneal' },
    ],
    findings: [
      f('globoso', 'Globoso', 'abdome globoso', { replaces: 'inspecao' }),
      f('distendido', 'Distendido', 'abdome distendido', { replaces: 'inspecao', flag: 'orange' }),
      f('circulacao_colateral', 'Circulação colateral', 'circulação colateral visível', { replaces: 'inspecao' }),
      f('rha_aumentados', 'RHA aumentados', 'ruídos hidroaéreos aumentados', { replaces: 'rha' }),
      f('rha_diminuidos', 'RHA diminuídos', 'ruídos hidroaéreos diminuídos', { replaces: 'rha', flag: 'orange' }),
      f('rha_ausentes', 'RHA ausentes', 'ruídos hidroaéreos ausentes', { replaces: 'rha', flag: 'red' }),
      f('dor_palpacao', 'Dor à palpação', 'doloroso à palpação (descrever região)', { replaces: 'palpacao', flag: 'orange' }),
      f('defesa', 'Defesa/rigidez', 'defesa abdominal/rigidez', { replaces: 'palpacao', flag: 'red' }),
      f('hepatomegalia', 'Hepatomegalia', 'hepatomegalia (descrever cm do RCD)', { replaces: 'visceras' }),
      f('esplenomegalia', 'Esplenomegalia', 'esplenomegalia', { replaces: 'visceras' }),
      f('massa', 'Massa palpável', 'massa palpável (descrever)', { replaces: 'visceras', flag: 'orange' }),
      f('massa_pulsatil', 'Massa pulsátil', 'massa pulsátil', { replaces: 'visceras', flag: 'red' }),
      f('ascite', 'Ascite (macicez móvel)', 'macicez móvel de decúbito (ascite)', { replaces: 'percussao' }),
      f('blumberg', 'Blumberg +', 'sinal de Blumberg positivo', { replaces: 'peritonio', flag: 'red' }),
      f('murphy', 'Murphy +', 'sinal de Murphy positivo', { replaces: 'peritonio', flag: 'orange' }),
      f('rovsing', 'Rovsing +', 'sinal de Rovsing positivo', { replaces: 'peritonio', flag: 'orange' }),
      f('psoas', 'Psoas +', 'sinal do psoas positivo', { replaces: 'peritonio', flag: 'orange' }),
      f('obturador', 'Obturador +', 'sinal do obturador positivo', { replaces: 'peritonio', flag: 'orange' }),
      f('giordano', 'Giordano +', 'sinal de Giordano positivo', { replaces: 'peritonio', flag: 'orange' }),
      f('hernia', 'Hérnia', 'hérnia (descrever local; redutível?)', {}),
      f('cullen', 'Cullen / Grey Turner', 'equimose periumbilical/em flancos (Cullen/Grey Turner)', { flag: 'red' }),
    ],
  },
  {
    id: 'neurologico',
    label: 'Neurológico',
    abbr: 'Neuro',
    normal: [
      { key: 'consciencia', text: 'vigil, orientado' },
      { key: 'pupilas', text: 'pupilas isocóricas e fotorreagentes' },
      { key: 'pares', text: 'pares cranianos sem alterações' },
      { key: 'forca', text: 'força grau V globalmente, sem déficits motores focais' },
      { key: 'sensibilidade', text: 'sensibilidade preservada' },
      { key: 'reflexos', text: 'reflexos profundos normoativos e simétricos' },
      { key: 'coordenacao', text: 'coordenação e marcha preservadas' },
      { key: 'meningeos', text: 'sem sinais meníngeos' },
    ],
    findings: [
      f('confuso', 'Confuso/desorientado', 'confuso e desorientado', { replaces: 'consciencia', flag: 'red' }),
      f('rebaixamento', 'Rebaixamento de consciência', 'rebaixamento do nível de consciência', { replaces: 'consciencia', flag: 'red' }),
      f('anisocoria', 'Anisocoria', 'anisocoria', { replaces: 'pupilas', flag: 'red' }),
      f('paresia_facial', 'Paresia facial', 'paresia facial (central/periférica — descrever)', { replaces: 'pares', flag: 'red' }),
      f('disartria', 'Disartria', 'disartria', { replaces: 'pares', flag: 'red' }),
      f('afasia', 'Afasia', 'afasia', { replaces: 'pares', flag: 'red' }),
      f('nistagmo', 'Nistagmo', 'nistagmo', { replaces: 'pares', flag: 'orange' }),
      f('hemiparesia_d', 'Hemiparesia D', 'hemiparesia à direita', { replaces: 'forca', flag: 'red' }),
      f('hemiparesia_e', 'Hemiparesia E', 'hemiparesia à esquerda', { replaces: 'forca', flag: 'red' }),
      f('paraparesia', 'Paraparesia', 'paraparesia', { replaces: 'forca', flag: 'red' }),
      f('hipoestesia', 'Hipoestesia', 'hipoestesia (descrever território)', { replaces: 'sensibilidade', flag: 'orange' }),
      f('nivel_sensitivo', 'Nível sensitivo', 'nível sensitivo (descrever)', { replaces: 'sensibilidade', flag: 'red' }),
      f('hiperreflexia', 'Hiper-reflexia', 'hiper-reflexia', { replaces: 'reflexos' }),
      f('arreflexia', 'Hipo/arreflexia', 'hiporreflexia', { replaces: 'reflexos' }),
      f('babinski', 'Babinski +', 'sinal de Babinski presente', { replaces: 'reflexos', flag: 'red' }),
      f('ataxia', 'Ataxia/dismetria', 'ataxia/dismetria', { replaces: 'coordenacao', flag: 'orange' }),
      f('rigidez_nuca', 'Rigidez de nuca', 'rigidez de nuca', { replaces: 'meningeos', flag: 'red' }),
      f('kernig_brudzinski', 'Kernig/Brudzinski +', 'sinais de Kernig e/ou Brudzinski positivos', { replaces: 'meningeos', flag: 'red' }),
      f('lasegue', 'Lasègue +', 'sinal de Lasègue positivo', { flag: 'orange' }),
      f('flexao_cervical_limitada', 'Flexão cervical limitada', 'limitação da flexão cervical', { replaces: 'meningeos', flag: 'red' }),
    ],
  },
  {
    id: 'musculoesqueletico',
    label: 'Musculoesquelético / extremidades',
    abbr: 'Extremidades/ME',
    normal: [
      { key: 'deformidades', text: 'sem deformidades' },
      { key: 'articulacoes', text: 'articulações sem sinais flogísticos, com amplitude de movimento preservada' },
      { key: 'coluna', text: 'coluna sem dor à palpação' },
      { key: 'panturrilhas', text: 'panturrilhas livres' },
    ],
    findings: [
      f('deformidade', 'Deformidade', 'deformidade (descrever)', { replaces: 'deformidades', flag: 'orange' }),
      f('artrite', 'Sinais flogísticos articulares', 'sinais flogísticos articulares (descrever articulações)', { replaces: 'articulacoes', flag: 'orange' }),
      f('limitacao_adm', 'Limitação de ADM', 'limitação de amplitude de movimento', { replaces: 'articulacoes' }),
      f('dor_coluna', 'Dor à palpação de coluna', 'dor à palpação da coluna (descrever nível)', { replaces: 'coluna', flag: 'orange' }),
      f('dor_paravertebral', 'Dor paravertebral', 'dor à palpação da musculatura paravertebral', { replaces: 'coluna' }),
      f('empastamento', 'Empastamento de panturrilha', 'empastamento de panturrilha', { replaces: 'panturrilhas', flag: 'red' }),
      f('homans', 'Homans/Bandeira +', 'sinais de Homans e/ou da Bandeira positivos', { replaces: 'panturrilhas', flag: 'orange' }),
    ],
  },
  {
    id: 'geniturinario',
    label: 'Geniturinário',
    abbr: 'GU',
    normal: [
      { key: 'giordano', text: 'Giordano negativo bilateralmente' },
      { key: 'bexiga', text: 'sem globo vesical palpável' },
    ],
    findings: [
      f('giordano_d', 'Giordano + à D', 'Giordano positivo à direita', { replaces: 'giordano', flag: 'orange' }),
      f('giordano_e', 'Giordano + à E', 'Giordano positivo à esquerda', { replaces: 'giordano', flag: 'orange' }),
      f('globo_vesical', 'Globo vesical', 'globo vesical palpável', { replaces: 'bexiga', flag: 'red' }),
      f('dor_suprapubica', 'Dor suprapúbica', 'dor à palpação suprapúbica', { replaces: 'bexiga' }),
      f('lesao_genital_ex', 'Lesão genital', 'lesão genital (descrever)', { flag: 'orange' }),
      f('testiculo_doloroso', 'Testículo doloroso/elevado', 'testículo doloroso e elevado, reflexo cremastérico ausente', { flag: 'red' }),
    ],
  },
  {
    id: 'ginecologico',
    label: 'Gineco-obstétrico',
    abbr: 'GO',
    normal: [
      { key: 'au', text: 'altura uterina compatível com a idade gestacional' },
      { key: 'bcf', text: 'BCF presentes e rítmicos' },
      { key: 'tonus', text: 'tônus uterino normal, sem dinâmica uterina' },
      { key: 'perdas', text: 'sem perdas vaginais' },
    ],
    findings: [
      f('au_discordante', 'AU discordante', 'altura uterina discordante da IG', { replaces: 'au', flag: 'orange' }),
      f('bcf_alterado', 'BCF alterado', 'BCF alterados (descrever frequência)', { replaces: 'bcf', flag: 'red' }),
      f('bcf_ausente', 'BCF não detectados', 'BCF não detectados', { replaces: 'bcf', flag: 'red' }),
      f('dinamica', 'Dinâmica uterina presente', 'dinâmica uterina presente (descrever contrações/10 min)', { replaces: 'tonus', flag: 'orange' }),
      f('hipertonia', 'Hipertonia uterina', 'hipertonia uterina', { replaces: 'tonus', flag: 'red' }),
      f('sangramento_ex', 'Sangramento vaginal', 'sangramento vaginal (descrever quantidade)', { replaces: 'perdas', flag: 'red' }),
      f('liquido', 'Perda de líquido', 'perda de líquido amniótico', { replaces: 'perdas', flag: 'orange' }),
      f('mobilizacao_colo', 'Dor à mobilização do colo', 'dor à mobilização do colo uterino', { flag: 'orange' }),
    ],
  },
  {
    id: 'endocrino',
    label: 'Endócrino / tireoide',
    abbr: 'Tireoide',
    normal: [{ key: 'tireoide', text: 'tireoide de volume normal, fibroelástica, sem nódulos palpáveis' }],
    findings: [
      f('bocio', 'Bócio', 'tireoide aumentada difusamente', { replaces: 'tireoide' }),
      f('nodulo_tireoide', 'Nódulo tireoidiano', 'nódulo tireoidiano palpável (descrever)', { replaces: 'tireoide', flag: 'orange' }),
      f('exoftalmia', 'Exoftalmia', 'exoftalmia' ),
      f('acantose', 'Acantose nigricans', 'acantose nigricans'),
      f('estrias', 'Estrias violáceas/giba', 'estrias violáceas e giba dorsal'),
      f('halito_cetonico', 'Hálito cetônico', 'hálito cetônico', { flag: 'red' }),
    ],
  },
  {
    id: 'hematologico',
    label: 'Linfonodos / hematológico',
    abbr: 'Linfonodos',
    normal: [
      { key: 'linfonodos', text: 'sem linfonodomegalias palpáveis em cadeias cervicais, axilares e inguinais' },
      { key: 'sangramentos', text: 'sem petéquias ou equimoses' },
    ],
    findings: [
      f('linfonodomegalia', 'Linfonodomegalia', 'linfonodomegalia (descrever cadeia, tamanho, consistência, mobilidade)', {
        replaces: 'linfonodos',
        flag: 'orange',
      }),
      f('petequias', 'Petéquias', 'petéquias', { replaces: 'sangramentos', flag: 'red' }),
      f('equimoses', 'Equimoses', 'equimoses', { replaces: 'sangramentos', flag: 'orange' }),
      f('purpura', 'Púrpura', 'púrpura', { replaces: 'sangramentos', flag: 'red' }),
    ],
  },
  {
    id: 'dermatologico',
    label: 'Pele e fâneros',
    abbr: 'Pele',
    normal: [{ key: 'pele', text: 'pele íntegra, sem lesões, turgor e elasticidade preservados' }],
    findings: [
      f('exantema', 'Exantema', 'exantema (descrever: maculopapular, distribuição)', { replaces: 'pele', flag: 'orange' }),
      f('urticas', 'Urticas', 'lesões urticariformes', { replaces: 'pele' }),
      f('celulite', 'Eritema/calor/edema (celulite)', 'área de eritema, calor e edema (celulite — delimitar)', { replaces: 'pele', flag: 'orange' }),
      f('ulcera', 'Úlcera/lesão por pressão', 'úlcera/lesão por pressão (descrever local e estágio)', { replaces: 'pele', flag: 'orange' }),
      f('vesiculas', 'Vesículas', 'lesões vesiculares (descrever distribuição)', { replaces: 'pele' }),
      f('turgor', 'Turgor diminuído', 'turgor diminuído', { replaces: 'pele' }),
      f('lesao_suspeita', 'Lesão pigmentada suspeita', 'lesão pigmentada com critérios ABCDE (descrever)', { replaces: 'pele', flag: 'orange' }),
    ],
  },
  {
    id: 'otorrino',
    label: 'Otorrinolaringológico',
    abbr: 'ORL',
    normal: [
      { key: 'oroscopia', text: 'oroscopia sem alterações' },
      { key: 'otoscopia', text: 'otoscopia com membranas timpânicas íntegras e translúcidas' },
      { key: 'rinoscopia', text: 'rinoscopia sem alterações' },
    ],
    findings: [
      f('orofaringe_hiperemiada', 'Orofaringe hiperemiada', 'orofaringe hiperemiada', { replaces: 'oroscopia' }),
      f('exsudato', 'Exsudato amigdaliano', 'amígdalas hipertrofiadas com exsudato', { replaces: 'oroscopia', flag: 'orange' }),
      f('abaulamento_palato', 'Abaulamento de palato/desvio de úvula', 'abaulamento de palato com desvio de úvula', { replaces: 'oroscopia', flag: 'red' }),
      f('mt_abaulada', 'MT abaulada/hiperemiada', 'membrana timpânica hiperemiada e abaulada', { replaces: 'otoscopia', flag: 'orange' }),
      f('otorreia_ex', 'Otorreia', 'otorreia', { replaces: 'otoscopia' }),
      f('secrecao_nasal', 'Secreção nasal', 'secreção nasal (descrever)', { replaces: 'rinoscopia' }),
      f('cornetos', 'Cornetos hipertrofiados', 'cornetos hipertrofiados e pálidos', { replaces: 'rinoscopia' }),
    ],
  },
  {
    id: 'oftalmologico',
    label: 'Oftalmológico',
    abbr: 'Oftalmo',
    normal: [
      { key: 'conjuntivas', text: 'conjuntivas sem hiperemia ou secreção' },
      { key: 'moe', text: 'motricidade ocular extrínseca preservada' },
      { key: 'acuidade', text: 'acuidade visual grosseira preservada' },
    ],
    findings: [
      f('hiperemia_conjuntival', 'Hiperemia conjuntival', 'hiperemia conjuntival', { replaces: 'conjuntivas' }),
      f('secrecao_ocular', 'Secreção ocular', 'secreção ocular', { replaces: 'conjuntivas' }),
      f('sufusao', 'Sufusão conjuntival', 'sufusão conjuntival', { replaces: 'conjuntivas', flag: 'orange' }),
      f('olho_vermelho_doloroso', 'Olho vermelho doloroso', 'olho vermelho doloroso com baixa visual', { replaces: 'conjuntivas', flag: 'red' }),
      f('ptose', 'Ptose', 'ptose palpebral', { replaces: 'moe', flag: 'orange' }),
      f('diplopia_ex', 'Limitação da MOE/diplopia', 'limitação da motricidade ocular com diplopia', { replaces: 'moe', flag: 'red' }),
      f('baixa_visual', 'Baixa acuidade', 'baixa da acuidade visual', { replaces: 'acuidade', flag: 'orange' }),
      f('papiledema', 'Papiledema (fundoscopia)', 'papiledema à fundoscopia', { flag: 'red' }),
    ],
  },
  {
    id: 'psiquiatrico',
    label: 'Exame do estado mental',
    abbr: 'EEM',
    normal: [],
    findings: [],
    rows: [
      {
        id: 'aparencia',
        label: 'Aparência',
        options: [opt('adequada', 'Adequada', undefined, 'aparência e higiene adequadas'), opt('descuidada', 'Descuidada', undefined, 'aparência descuidada')],
      },
      {
        id: 'atitude',
        label: 'Atitude',
        options: [
          opt('cooperativa', 'Cooperativa', undefined, 'atitude cooperativa'),
          opt('desconfiada', 'Desconfiada', undefined, 'atitude desconfiada'),
          opt('hostil', 'Hostil', 'orange', 'atitude hostil'),
        ],
      },
      {
        id: 'consciencia',
        label: 'Consciência e orientação',
        options: [
          opt('vigil', 'Vigil, orientado', undefined, 'vigil, orientado auto e alopsiquicamente'),
          opt('desorientado', 'Desorientado', 'red', 'desorientado'),
          opt('rebaixado', 'Rebaixado', 'red', 'nível de consciência rebaixado'),
        ],
      },
      {
        id: 'atencao_memoria',
        label: 'Atenção e memória',
        options: [opt('preservadas', 'Preservadas', undefined, 'atenção e memória preservadas'), opt('alteradas', 'Alteradas', 'orange', 'déficit de atenção/memória')],
      },
      {
        id: 'sensopercepcao',
        label: 'Sensopercepção',
        options: [
          opt('normal', 'Sem alterações', undefined, 'sem alterações de sensopercepção'),
          opt('auditivas', 'Alucinações auditivas', 'orange', 'alucinações auditivas'),
          opt('visuais', 'Alucinações visuais', 'red', 'alucinações visuais'),
        ],
      },
      {
        id: 'pensamento',
        label: 'Pensamento',
        options: [
          opt('normal', 'Curso, forma e conteúdo normais', undefined, 'pensamento de curso, forma e conteúdo normais'),
          opt('acelerado', 'Acelerado', undefined, 'pensamento acelerado'),
          opt('lentificado', 'Lentificado', undefined, 'pensamento lentificado'),
          opt('desagregado', 'Desagregado', 'orange', 'pensamento desagregado'),
          opt('delirante', 'Conteúdo delirante', 'orange', 'conteúdo delirante'),
        ],
      },
      {
        id: 'humor',
        label: 'Humor e afeto',
        options: [
          opt('eutimico', 'Eutímico, afeto congruente', undefined, 'humor eutímico, afeto congruente'),
          opt('deprimido', 'Deprimido', 'orange', 'humor deprimido'),
          opt('ansioso', 'Ansioso', undefined, 'humor ansioso'),
          opt('euforico', 'Eufórico/expansivo', 'orange', 'humor eufórico'),
          opt('embotado', 'Afeto embotado', undefined, 'afeto embotado'),
        ],
      },
      {
        id: 'psicomotricidade',
        label: 'Psicomotricidade',
        options: [
          opt('normal', 'Normal', undefined, 'psicomotricidade normal'),
          opt('agitacao', 'Agitação', 'orange', 'agitação psicomotora'),
          opt('lentificacao', 'Lentificação', undefined, 'lentificação psicomotora'),
        ],
      },
      {
        id: 'juizo',
        label: 'Juízo crítico',
        options: [opt('preservado', 'Preservado', undefined, 'juízo crítico preservado'), opt('prejudicado', 'Prejudicado', 'orange', 'juízo crítico prejudicado')],
      },
      {
        id: 'suicidio',
        label: 'Ideação suicida',
        options: [
          opt('nega', 'Nega', undefined, 'nega ideação suicida'),
          opt('passiva', 'Ideação passiva', 'orange', 'ideação suicida passiva'),
          opt('plano', 'Com plano/intenção', 'red', 'ideação suicida com plano'),
        ],
      },
    ],
  },
];

export const EXAM_BY_ID = Object.fromEntries(EXAM_SYSTEMS.map((s) => [s.id, s])) as Record<ExamSectionId, ExamSystemDef>;

/** Glasgow — rótulos (adulto). */
export const GLASGOW = {
  o: [
    { v: 4, label: 'Espontânea' },
    { v: 3, label: 'Ao som' },
    { v: 2, label: 'À pressão' },
    { v: 1, label: 'Ausente' },
  ],
  v: [
    { v: 5, label: 'Orientado' },
    { v: 4, label: 'Confuso' },
    { v: 3, label: 'Palavras' },
    { v: 2, label: 'Sons' },
    { v: 1, label: 'Ausente' },
  ],
  m: [
    { v: 6, label: 'Obedece comandos' },
    { v: 5, label: 'Localiza' },
    { v: 4, label: 'Flexão normal' },
    { v: 3, label: 'Flexão anormal' },
    { v: 2, label: 'Extensão' },
    { v: 1, label: 'Ausente' },
  ],
};
