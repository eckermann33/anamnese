import type { Allergy, Medication } from '../db/types';
import type { Profile } from './types';
import { normalize } from '../lib/format';

/* ==========================================================================
   ALERTAS DE MEDICAÇÃO (funciona offline)
   --------------------------------------------------------------------------
   1. Reconhece o fármaco pelo nome genérico ou comercial (Brasil).
   2. Cruza com as alergias informadas (inclusive reatividade cruzada).
   3. Procura interações clinicamente relevantes entre os medicamentos.
   4. Alertas de perfil: gestante (contraindicados) e idoso (Beers 2023).

   Não é uma base completa de interações — cobre as combinações mais
   frequentes e graves da prática. Sempre confira em fonte oficial.
   ========================================================================== */

export type DrugClass =
  | 'penicilina'
  | 'cefalosporina'
  | 'carbapenem'
  | 'sulfonamida_atb'
  | 'macrolideo'
  | 'quinolona'
  | 'tetraciclina'
  | 'aine'
  | 'aas'
  | 'pirazolona'
  | 'opioide'
  | 'ieca'
  | 'bra'
  | 'arni'
  | 'betabloqueador'
  | 'bcc_ndhp'
  | 'bcc_dhp'
  | 'tiazidico'
  | 'diuretico_alca'
  | 'poupador_k'
  | 'potassio'
  | 'varfarina'
  | 'doac'
  | 'heparina'
  | 'antiagregante'
  | 'isrs'
  | 'irsn'
  | 'triciclico'
  | 'imao'
  | 'triptano'
  | 'benzodiazepinico'
  | 'z_droga'
  | 'antipsicotico'
  | 'estatina'
  | 'estatina_cyp3a4'
  | 'nitrato'
  | 'ipde5'
  | 'digoxina'
  | 'amiodarona'
  | 'qt'
  | 'litio'
  | 'metformina'
  | 'insulina'
  | 'sulfonilureia'
  | 'sglt2'
  | 'levotiroxina'
  | 'ibp'
  | 'ibp_cyp2c19'
  | 'corticoide'
  | 'indutor_enzimatico'
  | 'inibidor_cyp3a4'
  | 'fluconazol'
  | 'metronidazol'
  | 'smx_tmp'
  | 'metotrexato'
  | 'alopurinol'
  | 'azatioprina'
  | 'colchicina'
  | 'anticolinergico'
  | 'tramadol'
  | 'linezolida'
  | 'valproato'
  | 'contraceptivo_estrogenio'
  | 'teofilina'
  | 'antidopaminergico'
  | 'misoprostol'
  | 'isotretinoina'
  | 'clopidogrel';

export interface Drug {
  id: string;
  name: string;
  synonyms: string[];
  classes: DrugClass[];
}

const D = (id: string, name: string, classes: DrugClass[], synonyms: string[] = []): Drug => ({ id, name, classes, synonyms });

export const DRUGS: Drug[] = [
  // Analgésicos / AINE / opioides
  D('dipirona', 'Dipirona', ['pirazolona'], ['metamizol', 'novalgina', 'anador', 'dorflex']),
  D('paracetamol', 'Paracetamol', [], ['acetaminofeno', 'tylenol']),
  D('aas', 'Ácido acetilsalicílico', ['aas'], ['aas', 'aspirina', 'acido acetilsalicilico', 'somalgin', 'ecasil', 'buferin']),
  D('ibuprofeno', 'Ibuprofeno', ['aine'], ['alivium', 'advil', 'buscofem']),
  D('diclofenaco', 'Diclofenaco', ['aine'], ['voltaren', 'cataflam']),
  D('cetoprofeno', 'Cetoprofeno', ['aine'], ['profenid']),
  D('naproxeno', 'Naproxeno', ['aine'], ['flanax']),
  D('nimesulida', 'Nimesulida', ['aine'], ['nisulid']),
  D('meloxicam', 'Meloxicam', ['aine'], ['movatec']),
  D('celecoxibe', 'Celecoxibe', ['aine'], ['celebra']),
  D('cetorolaco', 'Cetorolaco', ['aine'], ['toragesic']),
  D('tramadol', 'Tramadol', ['opioide', 'tramadol'], ['tramal']),
  D('codeina', 'Codeína', ['opioide'], ['tylex']),
  D('morfina', 'Morfina', ['opioide'], ['dimorf']),
  D('oxicodona', 'Oxicodona', ['opioide'], ['oxycontin']),
  D('metadona', 'Metadona', ['opioide', 'qt'], ['mytedom']),
  D('fentanil', 'Fentanil', ['opioide'], []),

  // Antibióticos
  D('amoxicilina', 'Amoxicilina', ['penicilina'], ['amoxil']),
  D('amoxicilina_clavulanato', 'Amoxicilina + clavulanato', ['penicilina'], ['clavulin', 'amoxicilina clavulanato', 'amoxicilina + clavulanato']),
  D('ampicilina', 'Ampicilina', ['penicilina'], ['ampicilina sulbactam', 'unasyn']),
  D('benzilpenicilina', 'Penicilina G benzatina', ['penicilina'], ['benzetacil', 'penicilina']),
  D('oxacilina', 'Oxacilina', ['penicilina'], []),
  D('piperacilina', 'Piperacilina + tazobactam', ['penicilina'], ['tazocin', 'pipetazo', 'piperacilina tazobactam']),
  D('cefalexina', 'Cefalexina', ['cefalosporina'], ['keflex']),
  D('cefazolina', 'Cefazolina', ['cefalosporina'], ['kefazol']),
  D('ceftriaxona', 'Ceftriaxona', ['cefalosporina'], ['rocefin']),
  D('cefepime', 'Cefepima', ['cefalosporina'], ['cefepime', 'maxcef']),
  D('cefuroxima', 'Cefuroxima', ['cefalosporina'], ['zinnat']),
  D('meropenem', 'Meropeném', ['carbapenem'], ['meronem', 'meropenem']),
  D('imipenem', 'Imipeném', ['carbapenem'], ['imipenem']),
  D('ertapenem', 'Ertapeném', ['carbapenem'], ['ertapenem', 'invanz']),
  D('azitromicina', 'Azitromicina', ['macrolideo', 'qt'], ['zitromax', 'astro']),
  D('claritromicina', 'Claritromicina', ['macrolideo', 'qt', 'inibidor_cyp3a4'], ['klaricid']),
  D('eritromicina', 'Eritromicina', ['macrolideo', 'qt', 'inibidor_cyp3a4'], []),
  D('ciprofloxacino', 'Ciprofloxacino', ['quinolona', 'qt'], ['cipro', 'ciprofloxacina']),
  D('levofloxacino', 'Levofloxacino', ['quinolona', 'qt'], ['levaquin', 'levofloxacina', 'tavanic']),
  D('moxifloxacino', 'Moxifloxacino', ['quinolona', 'qt'], ['avalox', 'moxifloxacina']),
  D('smx_tmp', 'Sulfametoxazol + trimetoprima', ['sulfonamida_atb', 'smx_tmp'], ['bactrim', 'sulfametoxazol', 'trimetoprima', 'smx-tmp', 'smx tmp']),
  D('metronidazol', 'Metronidazol', ['metronidazol'], ['flagyl']),
  D('nitrofurantoina', 'Nitrofurantoína', [], ['macrodantina']),
  D('fosfomicina', 'Fosfomicina', [], ['monuril']),
  D('doxiciclina', 'Doxiciclina', ['tetraciclina'], ['vibramicina']),
  D('clindamicina', 'Clindamicina', [], ['dalacin']),
  D('vancomicina', 'Vancomicina', [], []),
  D('linezolida', 'Linezolida', ['linezolida'], ['zyvox']),
  D('rifampicina', 'Rifampicina', ['indutor_enzimatico'], ['rifampina', 'rhze']),
  D('fluconazol', 'Fluconazol', ['fluconazol', 'qt'], ['zoltec']),
  D('cetoconazol', 'Cetoconazol', ['inibidor_cyp3a4'], []),
  D('itraconazol', 'Itraconazol', ['inibidor_cyp3a4'], ['sporanox']),
  D('ritonavir', 'Ritonavir', ['inibidor_cyp3a4'], ['kaletra', 'paxlovid']),

  // Cardiovascular
  D('captopril', 'Captopril', ['ieca'], ['capoten']),
  D('enalapril', 'Enalapril', ['ieca'], ['renitec']),
  D('ramipril', 'Ramipril', ['ieca'], ['triatec']),
  D('perindopril', 'Perindopril', ['ieca'], ['coversyl']),
  D('losartana', 'Losartana', ['bra'], ['losartan', 'cozaar', 'aradois']),
  D('valsartana', 'Valsartana', ['bra'], ['diovan', 'valsartan']),
  D('olmesartana', 'Olmesartana', ['bra'], ['benicar', 'olmesartan']),
  D('candesartana', 'Candesartana', ['bra'], ['atacand']),
  D('telmisartana', 'Telmisartana', ['bra'], ['micardis']),
  D('sacubitril_valsartana', 'Sacubitril + valsartana', ['arni'], ['entresto', 'sacubitril']),
  D('atenolol', 'Atenolol', ['betabloqueador'], ['atenol']),
  D('propranolol', 'Propranolol', ['betabloqueador'], ['inderal']),
  D('metoprolol', 'Metoprolol', ['betabloqueador'], ['selozok', 'seloken']),
  D('carvedilol', 'Carvedilol', ['betabloqueador'], ['coreg', 'divelol']),
  D('bisoprolol', 'Bisoprolol', ['betabloqueador'], ['concor']),
  D('nebivolol', 'Nebivolol', ['betabloqueador'], ['nebilet']),
  D('anlodipino', 'Anlodipino', ['bcc_dhp'], ['amlodipina', 'norvasc', 'pressat']),
  D('nifedipino', 'Nifedipino', ['bcc_dhp'], ['adalat']),
  D('verapamil', 'Verapamil', ['bcc_ndhp'], ['dilacoron']),
  D('diltiazem', 'Diltiazem', ['bcc_ndhp'], ['cardizem', 'balcor']),
  D('hidroclorotiazida', 'Hidroclorotiazida', ['tiazidico'], ['hctz', 'clorana']),
  D('clortalidona', 'Clortalidona', ['tiazidico'], ['higroton']),
  D('indapamida', 'Indapamida', ['tiazidico'], ['natrilix']),
  D('furosemida', 'Furosemida', ['diuretico_alca'], ['lasix']),
  D('bumetanida', 'Bumetanida', ['diuretico_alca'], ['burinax']),
  D('espironolactona', 'Espironolactona', ['poupador_k'], ['aldactone']),
  D('amilorida', 'Amilorida', ['poupador_k'], ['moduretic']),
  D('cloreto_potassio', 'Cloreto de potássio', ['potassio'], ['kcl', 'slow k', 'xarope de kcl']),
  D('isossorbida', 'Mononitrato/dinitrato de isossorbida', ['nitrato'], ['monocordil', 'isordil', 'isossorbida', 'nitroglicerina', 'tridil']),
  D('sildenafila', 'Sildenafila', ['ipde5'], ['viagra', 'sildenafil']),
  D('tadalafila', 'Tadalafila', ['ipde5'], ['cialis', 'tadalafil']),
  D('digoxina', 'Digoxina', ['digoxina'], ['digoxin']),
  D('amiodarona', 'Amiodarona', ['amiodarona', 'qt'], ['ancoron', 'atlansil']),
  D('sotalol', 'Sotalol', ['betabloqueador', 'qt'], ['sotacor']),
  D('hidralazina', 'Hidralazina', [], ['apresolina']),
  D('metildopa', 'Metildopa', [], ['aldomet']),
  D('clonidina', 'Clonidina', [], ['atensina']),

  // Antitrombóticos
  D('varfarina', 'Varfarina', ['varfarina'], ['marevan', 'coumadin', 'warfarina']),
  D('rivaroxabana', 'Rivaroxabana', ['doac'], ['xarelto', 'rivaroxaban']),
  D('apixabana', 'Apixabana', ['doac'], ['eliquis', 'apixaban']),
  D('dabigatrana', 'Dabigatrana', ['doac'], ['pradaxa', 'dabigatran']),
  D('edoxabana', 'Edoxabana', ['doac'], ['lixiana']),
  D('enoxaparina', 'Enoxaparina', ['heparina'], ['clexane']),
  D('heparina', 'Heparina não fracionada', ['heparina'], ['hnf', 'heparina']),
  D('clopidogrel', 'Clopidogrel', ['antiagregante', 'clopidogrel'], ['plavix', 'iscover']),
  D('ticagrelor', 'Ticagrelor', ['antiagregante'], ['brilinta']),
  D('prasugrel', 'Prasugrel', ['antiagregante'], ['effient']),

  // Metabólico / endócrino
  D('estatina_sinva', 'Sinvastatina', ['estatina', 'estatina_cyp3a4'], ['sinvastatina', 'zocor']),
  D('atorvastatina', 'Atorvastatina', ['estatina', 'estatina_cyp3a4'], ['lipitor', 'citalor']),
  D('rosuvastatina', 'Rosuvastatina', ['estatina'], ['crestor']),
  D('pravastatina', 'Pravastatina', ['estatina'], []),
  D('metformina', 'Metformina', ['metformina'], ['glifage', 'glucoformin']),
  D('glibenclamida', 'Glibenclamida', ['sulfonilureia'], ['daonil']),
  D('gliclazida', 'Gliclazida', ['sulfonilureia'], ['diamicron']),
  D('glimepirida', 'Glimepirida', ['sulfonilureia'], ['amaryl']),
  D('insulina', 'Insulina', ['insulina'], ['insulina nph', 'insulina regular', 'glargina', 'lispro', 'asparte', 'degludeca', 'nph']),
  D('dapagliflozina', 'Dapagliflozina', ['sglt2'], ['forxiga']),
  D('empagliflozina', 'Empagliflozina', ['sglt2'], ['jardiance']),
  D('levotiroxina', 'Levotiroxina', ['levotiroxina'], ['puran', 'puran t4', 'synthroid', 'euthyrox', 't4']),
  D('prednisona', 'Prednisona', ['corticoide'], ['meticorten']),
  D('prednisolona', 'Prednisolona', ['corticoide'], ['predsim']),
  D('dexametasona', 'Dexametasona', ['corticoide'], ['decadron']),
  D('hidrocortisona', 'Hidrocortisona', ['corticoide'], ['solu-cortef']),
  D('metilprednisolona', 'Metilprednisolona', ['corticoide'], ['solu-medrol']),
  D('alopurinol', 'Alopurinol', ['alopurinol'], ['zyloric']),
  D('colchicina', 'Colchicina', ['colchicina'], []),

  // Gastro
  D('omeprazol', 'Omeprazol', ['ibp', 'ibp_cyp2c19'], ['losec']),
  D('esomeprazol', 'Esomeprazol', ['ibp', 'ibp_cyp2c19'], ['nexium']),
  D('pantoprazol', 'Pantoprazol', ['ibp'], ['pantozol']),
  D('ondansetrona', 'Ondansetrona', ['qt'], ['vonau', 'zofran']),
  D('metoclopramida', 'Metoclopramida', ['antidopaminergico'], ['plasil']),
  D('bromoprida', 'Bromoprida', ['antidopaminergico'], ['digesan']),
  D('domperidona', 'Domperidona', ['qt'], ['motilium']),
  D('misoprostol', 'Misoprostol', ['misoprostol'], ['cytotec']),
  D('escopolamina', 'Escopolamina', ['anticolinergico'], ['buscopan', 'hioscina']),

  // Neuro / psiquiatria
  D('fluoxetina', 'Fluoxetina', ['isrs'], ['prozac', 'daforin']),
  D('sertralina', 'Sertralina', ['isrs'], ['zoloft', 'tolrest']),
  D('escitalopram', 'Escitalopram', ['isrs', 'qt'], ['lexapro', 'reconter']),
  D('citalopram', 'Citalopram', ['isrs', 'qt'], ['cipramil']),
  D('paroxetina', 'Paroxetina', ['isrs', 'anticolinergico'], ['pondera', 'aropax']),
  D('venlafaxina', 'Venlafaxina', ['irsn'], ['efexor']),
  D('duloxetina', 'Duloxetina', ['irsn'], ['cymbalta']),
  D('amitriptilina', 'Amitriptilina', ['triciclico', 'anticolinergico', 'qt'], ['tryptanol', 'amytril']),
  D('nortriptilina', 'Nortriptilina', ['triciclico'], ['pamelor']),
  D('clonazepam', 'Clonazepam', ['benzodiazepinico'], ['rivotril']),
  D('diazepam', 'Diazepam', ['benzodiazepinico'], ['valium']),
  D('alprazolam', 'Alprazolam', ['benzodiazepinico'], ['frontal']),
  D('lorazepam', 'Lorazepam', ['benzodiazepinico'], ['lorax']),
  D('midazolam', 'Midazolam', ['benzodiazepinico'], ['dormonid']),
  D('zolpidem', 'Zolpidem', ['z_droga'], ['stilnox']),
  D('haloperidol', 'Haloperidol', ['antipsicotico', 'antidopaminergico', 'qt'], ['haldol']),
  D('quetiapina', 'Quetiapina', ['antipsicotico', 'qt'], ['seroquel']),
  D('risperidona', 'Risperidona', ['antipsicotico', 'antidopaminergico'], ['risperdal']),
  D('olanzapina', 'Olanzapina', ['antipsicotico'], ['zyprexa']),
  D('clorpromazina', 'Clorpromazina', ['antipsicotico', 'antidopaminergico', 'qt', 'anticolinergico'], ['amplictil']),
  D('litio', 'Carbonato de lítio', ['litio'], ['carbolitium', 'litio', 'lítio']),
  D('carbamazepina', 'Carbamazepina', ['indutor_enzimatico'], ['tegretol']),
  D('fenitoina', 'Fenitoína', ['indutor_enzimatico'], ['hidantal']),
  D('fenobarbital', 'Fenobarbital', ['indutor_enzimatico'], ['gardenal']),
  D('valproato', 'Ácido valproico', ['valproato'], ['depakote', 'depakene', 'valproato', 'divalproato']),
  D('sumatriptana', 'Sumatriptana', ['triptano'], ['sumax', 'imigran']),
  D('selegilina', 'Selegilina', ['imao'], ['jumexil']),
  D('prometazina', 'Prometazina', ['anticolinergico'], ['fenergan']),
  D('hidroxizina', 'Hidroxizina', ['anticolinergico'], ['hixizine']),
  D('difenidramina', 'Difenidramina', ['anticolinergico'], ['benadryl']),
  D('dexclorfeniramina', 'Dexclorfeniramina', ['anticolinergico'], ['polaramine']),
  D('oxibutinina', 'Oxibutinina', ['anticolinergico'], ['retemic']),

  // Outros
  D('metotrexato', 'Metotrexato', ['metotrexato'], ['mtx']),
  D('azatioprina', 'Azatioprina', ['azatioprina'], ['imuran']),
  D('hidroxicloroquina', 'Hidroxicloroquina', ['qt'], ['plaquinol']),
  D('teofilina', 'Teofilina', ['teofilina'], ['aminofilina']),
  D('anticoncepcional', 'Anticoncepcional com estrogênio', ['contraceptivo_estrogenio'], [
    'anticoncepcional',
    'etinilestradiol',
    'yasmin',
    'diane',
    'selene',
    'ciclo 21',
    'tamisa',
  ]),
  D('isotretinoina', 'Isotretinoína', ['isotretinoina'], ['roacutan']),
];

/* ---------- Reconhecimento do fármaco ---------- */

const INDEX: Array<{ key: string; drug: Drug }> = DRUGS.flatMap((d) =>
  [d.name, d.id.replace(/_/g, ' '), ...d.synonyms].map((k) => ({ key: normalize(k), drug: d })),
).sort((a, b) => b.key.length - a.key.length); // mais específico primeiro

/** Encontra o fármaco a partir do texto digitado ("losartana 50mg" → Losartana). */
export function identifyDrug(text: string): Drug | undefined {
  const t = normalize(text);
  if (!t) return undefined;
  return INDEX.find(({ key }) => key.length >= 3 && new RegExp(`(^|[^a-z])${escapeRe(key)}([^a-z]|$)`).test(t))?.drug;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Sugestões para autocompletar o nome do medicamento. */
export function searchDrugs(query: string, limit = 6): Drug[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const seen = new Set<string>();
  const out: Drug[] = [];
  for (const { key, drug } of INDEX) {
    if (key.startsWith(q) && !seen.has(drug.id)) {
      seen.add(drug.id);
      out.push(drug);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/* ---------- Alergias ---------- */

/** Classes de alergia reconhecidas a partir do texto. */
const ALLERGY_KEYWORDS: Array<{ keys: string[]; classes: DrugClass[]; label: string }> = [
  { keys: ['penicilin', 'amoxicilin', 'ampicilin', 'benzetacil', 'oxacilin', 'betalact', 'beta-lact'], classes: ['penicilina'], label: 'penicilinas' },
  { keys: ['cefalospor', 'cefalexin', 'ceftriax', 'cefazolin', 'cefepim', 'cefurox'], classes: ['cefalosporina'], label: 'cefalosporinas' },
  { keys: ['sulfa', 'sulfametox', 'bactrim'], classes: ['sulfonamida_atb'], label: 'sulfonamidas' },
  { keys: ['dipirona', 'metamizol', 'novalgina'], classes: ['pirazolona'], label: 'dipirona' },
  { keys: ['aine', 'anti-inflamat', 'antiinflamat', 'ibuprofen', 'diclofenac', 'cetoprofen', 'nimesulid', 'naproxen'], classes: ['aine'], label: 'AINE' },
  { keys: ['aas', 'aspirina', 'acido acetilsalic'], classes: ['aas'], label: 'AAS' },
  { keys: ['quinolon', 'ciproflox', 'levoflox'], classes: ['quinolona'], label: 'quinolonas' },
  { keys: ['macrolid', 'azitromic', 'claritromic', 'eritromic'], classes: ['macrolideo'], label: 'macrolídeos' },
  { keys: ['morfin', 'codein', 'opioid', 'tramadol'], classes: ['opioide'], label: 'opioides' },
];

export function allergyClasses(allergy: Allergy): { classes: DrugClass[]; drug?: Drug } {
  const t = normalize(allergy.substance);
  const classes = new Set<DrugClass>();
  for (const k of ALLERGY_KEYWORDS) if (k.keys.some((key) => t.includes(key))) k.classes.forEach((c) => classes.add(c));
  const drug = identifyDrug(allergy.substance);
  drug?.classes.forEach((c) => {
    if (['penicilina', 'cefalosporina', 'sulfonamida_atb', 'pirazolona', 'aine', 'aas', 'quinolona', 'macrolideo', 'opioide', 'carbapenem'].includes(c))
      classes.add(c);
  });
  return { classes: [...classes], drug };
}

/* ---------- Tipos de alerta ---------- */

export type AlertSeverity = 'grave' | 'moderada' | 'leve';

export interface MedAlert {
  id: string;
  kind: 'alergia' | 'interacao' | 'gestacao' | 'idoso' | 'duplicidade';
  severity: AlertSeverity;
  title: string;
  detail: string;
  conduct?: string;
  drugs: string[];
  refs?: string[];
}

/* ---------- Interações ---------- */

interface InteractionRule {
  id: string;
  a: DrugClass[];
  b: DrugClass[];
  severity: AlertSeverity;
  title: string;
  detail: string;
  conduct: string;
}

const RULES: InteractionRule[] = [
  {
    id: 'nitrato_ipde5',
    a: ['nitrato'],
    b: ['ipde5'],
    severity: 'grave',
    title: 'Nitrato + inibidor da PDE-5',
    detail: 'Hipotensão grave e potencialmente fatal.',
    conduct: 'Contraindicado: não usar nitrato até 24 h após sildenafila (48 h após tadalafila).',
  },
  {
    id: 'arni_ieca',
    a: ['arni'],
    b: ['ieca'],
    severity: 'grave',
    title: 'Sacubitril-valsartana + IECA',
    detail: 'Risco de angioedema.',
    conduct: 'Contraindicado: intervalo mínimo de 36 h entre suspender o IECA e iniciar o ARNI.',
  },
  {
    id: 'ieca_bra',
    a: ['ieca', 'arni'],
    b: ['bra'],
    severity: 'grave',
    title: 'Duplo bloqueio do SRAA',
    detail: 'IECA/ARNI + BRA: hipercalemia, hipotensão e lesão renal aguda sem benefício clínico.',
    conduct: 'Evitar a associação; manter apenas um bloqueador do SRAA.',
  },
  {
    id: 'sraa_k',
    a: ['ieca', 'bra', 'arni'],
    b: ['poupador_k', 'potassio', 'smx_tmp'],
    severity: 'moderada',
    title: 'Risco de hipercalemia',
    detail: 'Bloqueador do SRAA + poupador de potássio/KCl/trimetoprima.',
    conduct: 'Monitorar potássio e função renal; atenção em DRC e idosos.',
  },
  {
    id: 'triple_whammy',
    a: ['ieca', 'bra', 'arni'],
    b: ['aine'],
    severity: 'moderada',
    title: 'Bloqueador do SRAA + AINE',
    detail: 'Reduz a filtração glomerular (risco de lesão renal aguda), sobretudo se associado a diurético (“triple whammy”).',
    conduct: 'Evitar AINE; se inevitável, menor tempo possível com controle de creatinina e potássio.',
  },
  {
    id: 'varfarina_aine',
    a: ['varfarina', 'doac', 'heparina'],
    b: ['aine', 'aas'],
    severity: 'grave',
    title: 'Anticoagulante + AINE/AAS',
    detail: 'Aumento importante do risco de sangramento (sobretudo digestivo).',
    conduct: 'Evitar AINE; preferir paracetamol/dipirona. AAS só com indicação formal; considerar IBP.',
  },
  {
    id: 'anticoag_antiagregante',
    a: ['varfarina', 'doac'],
    b: ['antiagregante'],
    severity: 'moderada',
    title: 'Anticoagulante + antiagregante',
    detail: 'Terapia antitrombótica combinada aumenta o risco de sangramento.',
    conduct: 'Confirmar indicação e duração; considerar IBP e reavaliar periodicamente.',
  },
  {
    id: 'varfarina_potencializadores',
    a: ['varfarina'],
    b: ['amiodarona', 'smx_tmp', 'metronidazol', 'fluconazol', 'quinolona', 'macrolideo'],
    severity: 'grave',
    title: 'Varfarina + inibidor do metabolismo',
    detail: 'Aumento do INR e do risco de sangramento.',
    conduct: 'Preferir alternativa; se usar, controlar INR em 3–5 dias e ajustar dose.',
  },
  {
    id: 'anticoag_indutores',
    a: ['varfarina', 'doac'],
    b: ['indutor_enzimatico'],
    severity: 'grave',
    title: 'Anticoagulante + indutor enzimático',
    detail: 'Rifampicina, carbamazepina, fenitoína e fenobarbital reduzem muito o efeito anticoagulante.',
    conduct: 'Evitar com DOAC; com varfarina, controle rigoroso de INR.',
  },
  {
    id: 'doac_inibidores',
    a: ['doac'],
    b: ['inibidor_cyp3a4'],
    severity: 'moderada',
    title: 'DOAC + inibidor potente do CYP3A4/P-gp',
    detail: 'Aumento dos níveis do anticoagulante e do risco de sangramento.',
    conduct: 'Verificar bula/diretriz para ajuste ou troca.',
  },
  {
    id: 'serotoninergica',
    a: ['isrs', 'irsn', 'triciclico'],
    b: ['tramadol', 'linezolida', 'triptano', 'imao'],
    severity: 'grave',
    title: 'Risco de síndrome serotoninérgica',
    detail: 'Antidepressivo serotoninérgico + tramadol/linezolida/triptano/IMAO.',
    conduct: 'Evitar (IMAO: contraindicado). Se necessário, monitorar agitação, hipertermia, clônus.',
  },
  {
    id: 'isrs_sangramento',
    a: ['isrs', 'irsn'],
    b: ['aine', 'aas', 'varfarina', 'doac'],
    severity: 'moderada',
    title: 'ISRS/IRSN + AINE/anticoagulante',
    detail: 'Aumento do risco de sangramento digestivo.',
    conduct: 'Considerar IBP e evitar AINE.',
  },
  {
    id: 'clopidogrel_ibp',
    a: ['clopidogrel'],
    b: ['ibp_cyp2c19'],
    severity: 'moderada',
    title: 'Clopidogrel + omeprazol/esomeprazol',
    detail: 'Reduzem a ativação do clopidogrel (CYP2C19).',
    conduct: 'Preferir pantoprazol se houver indicação de IBP.',
  },
  {
    id: 'estatina_inibidores',
    a: ['estatina_cyp3a4'],
    b: ['inibidor_cyp3a4', 'amiodarona'],
    severity: 'grave',
    title: 'Sinvastatina/atorvastatina + inibidor do CYP3A4',
    detail: 'Risco de miopatia e rabdomiólise.',
    conduct: 'Suspender a estatina durante o macrolídeo/azólico ou trocar por rosuvastatina/pravastatina; com amiodarona, limitar a dose de sinvastatina.',
  },
  {
    id: 'digoxina',
    a: ['digoxina'],
    b: ['amiodarona', 'bcc_ndhp', 'macrolideo'],
    severity: 'grave',
    title: 'Digoxina + amiodarona/verapamil/diltiazem/macrolídeo',
    detail: 'Aumento do nível sérico de digoxina (intoxicação digitálica).',
    conduct: 'Reduzir a dose da digoxina e monitorar nível sérico, ECG e potássio.',
  },
  {
    id: 'digoxina_diureticos',
    a: ['digoxina'],
    b: ['diuretico_alca', 'tiazidico'],
    severity: 'moderada',
    title: 'Digoxina + diurético',
    detail: 'Hipocalemia/hipomagnesemia potencializam a toxicidade digitálica.',
    conduct: 'Monitorar potássio e magnésio.',
  },
  {
    id: 'bb_ndhp',
    a: ['betabloqueador'],
    b: ['bcc_ndhp'],
    severity: 'grave',
    title: 'Betabloqueador + verapamil/diltiazem',
    detail: 'Bradicardia grave, bloqueio AV e insuficiência cardíaca.',
    conduct: 'Evitar a associação, sobretudo com disfunção ventricular.',
  },
  {
    id: 'benzo_opioide',
    a: ['benzodiazepinico', 'z_droga'],
    b: ['opioide'],
    severity: 'grave',
    title: 'Benzodiazepínico + opioide',
    detail: 'Depressão respiratória e sedação excessiva.',
    conduct: 'Evitar; se necessário, menores doses e monitorização.',
  },
  {
    id: 'litio',
    a: ['litio'],
    b: ['ieca', 'bra', 'tiazidico', 'aine'],
    severity: 'grave',
    title: 'Lítio + IECA/BRA/tiazídico/AINE',
    detail: 'Reduzem a excreção do lítio (intoxicação).',
    conduct: 'Evitar; se necessário, dosar litemia e ajustar.',
  },
  {
    id: 'indutor_contraceptivo',
    a: ['indutor_enzimatico'],
    b: ['contraceptivo_estrogenio'],
    severity: 'moderada',
    title: 'Indutor enzimático + anticoncepcional',
    detail: 'Falha contraceptiva.',
    conduct: 'Orientar método adicional/alternativo (DIU, por exemplo).',
  },
  {
    id: 'mtx_smx',
    a: ['metotrexato'],
    b: ['smx_tmp', 'aine'],
    severity: 'grave',
    title: 'Metotrexato + SMX-TMP/AINE',
    detail: 'Toxicidade medular e renal.',
    conduct: 'Evitar SMX-TMP; com AINE, cautela e monitorização.',
  },
  {
    id: 'alopurinol_aza',
    a: ['alopurinol'],
    b: ['azatioprina'],
    severity: 'grave',
    title: 'Alopurinol + azatioprina',
    detail: 'Mielotoxicidade grave (inibição da xantina oxidase).',
    conduct: 'Evitar ou reduzir muito a dose de azatioprina com hemograma seriado.',
  },
  {
    id: 'colchicina_inibidores',
    a: ['colchicina'],
    b: ['inibidor_cyp3a4'],
    severity: 'grave',
    title: 'Colchicina + inibidor do CYP3A4/P-gp',
    detail: 'Toxicidade da colchicina (miopatia, mielossupressão).',
    conduct: 'Evitar, sobretudo em DRC/hepatopatia.',
  },
  {
    id: 'sulfonilureia_fluconazol',
    a: ['sulfonilureia'],
    b: ['fluconazol', 'smx_tmp'],
    severity: 'moderada',
    title: 'Sulfonilureia + fluconazol/SMX-TMP',
    detail: 'Risco de hipoglicemia.',
    conduct: 'Monitorar glicemia; considerar reduzir a sulfonilureia.',
  },
  {
    id: 'antidopa',
    a: ['antidopaminergico'],
    b: ['antipsicotico'],
    severity: 'moderada',
    title: 'Metoclopramida/bromoprida + antipsicótico',
    detail: 'Sintomas extrapiramidais e síndrome neuroléptica maligna.',
    conduct: 'Preferir ondansetrona como antiemético (atenção ao QT).',
  },
  {
    id: 'quinolona_corticoide',
    a: ['quinolona'],
    b: ['corticoide'],
    severity: 'moderada',
    title: 'Quinolona + corticoide',
    detail: 'Risco de tendinopatia e ruptura de tendão (maior em idosos).',
    conduct: 'Preferir outra classe; orientar suspensão se dor em tendão.',
  },
  {
    id: 'teofilina',
    a: ['teofilina'],
    b: ['quinolona', 'macrolideo'],
    severity: 'moderada',
    title: 'Teofilina + ciprofloxacino/macrolídeo',
    detail: 'Aumento do nível de teofilina (convulsões, arritmias).',
    conduct: 'Evitar ou dosar nível sérico.',
  },
  {
    id: 'valproato_carbapenem',
    a: ['valproato'],
    b: ['carbapenem'],
    severity: 'grave',
    title: 'Ácido valproico + carbapeném',
    detail: 'Queda abrupta do nível de valproato (risco de crise convulsiva).',
    conduct: 'Evitar; trocar o antibiótico ou o anticonvulsivante.',
  },
];

/** Combinações de fármacos que prolongam o QT (2 ou mais). */
function qtAlert(drugs: Drug[]): MedAlert | null {
  const qt = drugs.filter((d) => d.classes.includes('qt'));
  if (qt.length < 2) return null;
  return {
    id: `qt-${qt.map((d) => d.id).join('-')}`,
    kind: 'interacao',
    severity: 'moderada',
    title: 'Prolongamento do intervalo QT',
    detail: `${qt.map((d) => d.name).join(', ')} prolongam o QT — risco de torsades de pointes.`,
    conduct: 'ECG com QTc; corrigir potássio e magnésio; evitar associar se QTc > 500 ms.',
    drugs: qt.map((d) => d.name),
  };
}

/* ---------- Perfil: gestante ---------- */

const PREGNANCY: Array<{ classes: DrugClass[]; text: string; severity: AlertSeverity }> = [
  { classes: ['ieca', 'bra', 'arni'], text: 'IECA/BRA são contraindicados na gestação (toxicidade renal fetal).', severity: 'grave' },
  { classes: ['varfarina'], text: 'Varfarina é teratogênica (sobretudo 6–12 semanas); preferir heparina.', severity: 'grave' },
  { classes: ['estatina'], text: 'Estatinas devem ser suspensas na gestação.', severity: 'moderada' },
  { classes: ['metotrexato', 'misoprostol', 'isotretinoina'], text: 'Teratogênico/abortivo — contraindicado na gestação.', severity: 'grave' },
  { classes: ['tetraciclina'], text: 'Tetraciclinas: evitar na gestação (dentes/ossos fetais).', severity: 'moderada' },
  { classes: ['valproato'], text: 'Ácido valproico: alto risco de malformações e efeitos no neurodesenvolvimento.', severity: 'grave' },
  { classes: ['aine'], text: 'AINE: evitar a partir de 20 semanas (oligoâmnio, fechamento do canal arterial).', severity: 'moderada' },
  { classes: ['quinolona'], text: 'Quinolonas: evitar na gestação, se houver alternativa.', severity: 'leve' },
  { classes: ['litio'], text: 'Lítio: risco de malformação cardíaca (Ebstein) — avaliar risco-benefício.', severity: 'moderada' },
];

/* ---------- Perfil: idoso (Beers 2023 — principais) ---------- */

const BEERS: Array<{ classes: DrugClass[]; text: string; drugIds?: string[] }> = [
  { classes: ['benzodiazepinico', 'z_droga'], text: 'Benzodiazepínicos/“drogas Z”: quedas, fraturas, delirium — evitar.' },
  { classes: ['anticolinergico'], text: 'Anticolinérgico forte: confusão, constipação, retenção urinária — evitar.' },
  { classes: ['sulfonilureia'], text: 'Sulfonilureias (sobretudo glibenclamida): hipoglicemia prolongada — evitar.' },
  { classes: ['aine'], text: 'AINE de uso crônico: sangramento digestivo e lesão renal — evitar.' },
  { classes: ['antipsicotico'], text: 'Antipsicóticos: risco de AVC e mortalidade em demência — evitar, exceto indicação específica.' },
  { classes: ['ibp'], text: 'IBP por > 8 semanas: risco de C. difficile e perda óssea — reavaliar indicação.' },
  { classes: [], drugIds: ['digoxina'], text: 'Digoxina como 1ª linha para FA/IC — evitar; se usar, doses baixas (risco de toxicidade).' },
  { classes: [], drugIds: ['metoclopramida'], text: 'Metoclopramida: sintomas extrapiramidais — evitar.' },
  { classes: [], drugIds: ['aas'], text: 'AAS para prevenção primária: evitar iniciar em idosos (sangramento).' },
];

/* ---------- Função principal ---------- */

export interface MedContext {
  medications: Medication[];
  allergies: Allergy[];
  profile: Profile;
  ageYears?: number;
  /** Etilismo ativo (interação com metronidazol). */
  alcohol?: boolean;
}

export function medicationAlerts(ctx: MedContext): MedAlert[] {
  const alerts: MedAlert[] = [];
  const drugs = ctx.medications
    .map((m) => identifyDrug(m.name))
    .filter((d): d is Drug => !!d)
    .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);

  // 1) Alergias
  for (const allergy of ctx.allergies) {
    const { classes, drug: allergyDrug } = allergyClasses(allergy);
    for (const d of drugs) {
      const direct = allergyDrug?.id === d.id || d.classes.some((c) => classes.includes(c) && c !== 'qt');
      if (direct) {
        alerts.push({
          id: `alergia-${allergy.id}-${d.id}`,
          kind: 'alergia',
          severity: 'grave',
          title: `Alergia a ${allergy.substance}`,
          detail: `${d.name} pertence ao mesmo grupo da alergia informada${allergy.reaction ? ` (reação: ${allergy.reaction})` : ''}.`,
          conduct: 'Suspender/não administrar e escolher alternativa de outra classe.',
          drugs: [d.name],
        });
        continue;
      }
      if (classes.includes('penicilina') && d.classes.includes('cefalosporina')) {
        alerts.push({
          id: `cruzada-${allergy.id}-${d.id}`,
          kind: 'alergia',
          severity: 'moderada',
          title: 'Reatividade cruzada: penicilina × cefalosporina',
          detail: `Alergia a penicilina e prescrição de ${d.name}. A reatividade cruzada é baixa (maior com cefalosporinas de cadeia lateral semelhante, como cefalexina).`,
          conduct: 'Se a reação foi anafilaxia ou grave, evitar; caso contrário, usar com cautela e observação.',
          drugs: [d.name],
        });
      }
      if (classes.includes('penicilina') && d.classes.includes('carbapenem')) {
        alerts.push({
          id: `cruzada-carb-${allergy.id}-${d.id}`,
          kind: 'alergia',
          severity: 'leve',
          title: 'Reatividade cruzada: penicilina × carbapeném',
          detail: `Reatividade cruzada muito baixa (< 1%) com ${d.name}.`,
          conduct: 'Geralmente pode ser usado com observação.',
          drugs: [d.name],
        });
      }
      if (classes.includes('cefalosporina') && d.classes.includes('penicilina')) {
        alerts.push({
          id: `cruzada-cef-${allergy.id}-${d.id}`,
          kind: 'alergia',
          severity: 'moderada',
          title: 'Reatividade cruzada: cefalosporina × penicilina',
          detail: `Alergia a cefalosporina e uso de ${d.name}.`,
          conduct: 'Avaliar gravidade da reação prévia antes de administrar.',
          drugs: [d.name],
        });
      }
      if ((classes.includes('aine') || classes.includes('aas')) && (d.classes.includes('aine') || d.classes.includes('aas'))) {
        alerts.push({
          id: `cruzada-aine-${allergy.id}-${d.id}`,
          kind: 'alergia',
          severity: 'moderada',
          title: 'Hipersensibilidade a AINE',
          detail: `Reações a AINE/AAS costumam ser cruzadas entre inibidores da COX-1 (${d.name}).`,
          conduct: 'Evitar; inibidores seletivos da COX-2 costumam ser tolerados, sob observação.',
          drugs: [d.name],
        });
      }
    }
  }

  // 2) Interações entre fármacos
  for (const rule of RULES) {
    const as = drugs.filter((d) => d.classes.some((c) => rule.a.includes(c)));
    const bs = drugs.filter((d) => d.classes.some((c) => rule.b.includes(c)));
    const pairs = as.flatMap((a) => bs.filter((b) => b.id !== a.id).map((b) => [a, b] as const));
    if (pairs.length) {
      const names = [...new Set(pairs.flat().map((d) => d.name))];
      alerts.push({
        id: `int-${rule.id}-${names.join('-')}`,
        kind: 'interacao',
        severity: rule.severity,
        title: rule.title,
        detail: `${names.join(' + ')}: ${rule.detail}`,
        conduct: rule.conduct,
        drugs: names,
      });
    }
  }
  const qt = qtAlert(drugs);
  if (qt) alerts.push(qt);

  // Duplicidade terapêutica
  const dupClasses: Array<[DrugClass, string]> = [
    ['aine', 'Dois AINEs'],
    ['benzodiazepinico', 'Dois benzodiazepínicos'],
    ['isrs', 'Dois ISRS'],
    ['ibp', 'Dois IBPs'],
  ];
  for (const [cls, title] of dupClasses) {
    const same = drugs.filter((d) => d.classes.includes(cls));
    if (same.length >= 2)
      alerts.push({
        id: `dup-${cls}`,
        kind: 'duplicidade',
        severity: 'moderada',
        title: `Duplicidade terapêutica: ${title}`,
        detail: same.map((d) => d.name).join(' + '),
        conduct: 'Manter apenas um fármaco da classe.',
        drugs: same.map((d) => d.name),
      });
  }
  const anticoags = drugs.filter((d) => d.classes.some((c) => ['varfarina', 'doac', 'heparina'].includes(c)));
  if (anticoags.length >= 2)
    alerts.push({
      id: 'dup-anticoag',
      kind: 'duplicidade',
      severity: 'grave',
      title: 'Dois anticoagulantes',
      detail: anticoags.map((d) => d.name).join(' + '),
      conduct: 'Confirmar se é transição (ponte) planejada; caso contrário, manter apenas um.',
      drugs: anticoags.map((d) => d.name),
    });

  // 3) Álcool × metronidazol
  if (ctx.alcohol) {
    const met = drugs.find((d) => d.classes.includes('metronidazol'));
    if (met)
      alerts.push({
        id: 'alcool-metronidazol',
        kind: 'interacao',
        severity: 'moderada',
        title: 'Metronidazol + álcool',
        detail: 'Reação tipo dissulfiram (náuseas, vômitos, rubor, taquicardia).',
        conduct: 'Orientar abstinência de álcool durante e até 72 h após o tratamento.',
        drugs: [met.name],
      });
  }

  // 4) Perfil
  if (ctx.profile === 'gestante') {
    for (const p of PREGNANCY) {
      const hit = drugs.filter((d) => d.classes.some((c) => p.classes.includes(c)));
      if (hit.length)
        alerts.push({
          id: `gest-${p.classes.join('-')}`,
          kind: 'gestacao',
          severity: p.severity,
          title: `Gestação: ${hit.map((d) => d.name).join(', ')}`,
          detail: p.text,
          conduct: 'Rever a prescrição com o obstetra.',
          drugs: hit.map((d) => d.name),
        });
    }
  }
  if (ctx.profile === 'idoso' || (ctx.ageYears ?? 0) >= 65) {
    for (const b of BEERS) {
      const hit = drugs.filter((d) => d.classes.some((c) => b.classes.includes(c)) || b.drugIds?.includes(d.id));
      if (hit.length)
        alerts.push({
          id: `beers-${hit.map((d) => d.id).join('-')}`,
          kind: 'idoso',
          severity: 'leve',
          title: `Critérios de Beers: ${hit.map((d) => d.name).join(', ')}`,
          detail: b.text,
          conduct: 'Avaliar desprescrição ou alternativa mais segura.',
          drugs: hit.map((d) => d.name),
          refs: ['beers-2023'],
        });
    }
    if (ctx.medications.length >= 5)
      alerts.push({
        id: 'polifarmacia',
        kind: 'idoso',
        severity: 'leve',
        title: `Polifarmácia (${ctx.medications.length} medicamentos)`,
        detail: '5 ou mais medicamentos aumentam o risco de interações, quedas e eventos adversos.',
        conduct: 'Revisar indicação de cada medicamento (desprescrição).',
        drugs: [],
        refs: ['beers-2023'],
      });
  }

  // Ordena por gravidade
  const order: Record<AlertSeverity, number> = { grave: 0, moderada: 1, leve: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
