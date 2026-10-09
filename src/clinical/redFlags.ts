import type { ClinicalContext } from './context';
import { shockIndex } from './vitals';

/* ==========================================================================
   RED FLAGS EM TEMPO REAL
   --------------------------------------------------------------------------
   Cada regra olha o atendimento inteiro (HDA, sintomas, sinais vitais,
   exame) e, se a combinação de gravidade estiver presente, devolve:
   - os critérios que dispararam (para o usuário entender o porquê)
   - a conduta inicial sugerida
   Regras são deliberadamente sensíveis: melhor alertar a mais.
   ========================================================================== */

export type RedFlagSeverity = 'critico' | 'alerta';

export interface RedFlag {
  id: string;
  title: string;
  severity: RedFlagSeverity;
  criteria: string[];
  conduct: string[];
  refs?: string[];
}

type Rule = (c: ClinicalContext) => RedFlag | null;

const yes = (c: ClinicalContext, s: string) => c.sym(s) === 'sim';

/** Monta a lista de critérios presentes. */
function hits(items: Array<[boolean, string]>): string[] {
  return items.filter(([ok]) => ok).map(([, t]) => t);
}

const hypotension = (c: ClinicalContext) => c.vitals.pas !== undefined && c.vitals.pas < 90;

const alteredMental = (c: ClinicalContext) =>
  (c.gcs !== undefined && c.gcs < 15) ||
  yes(c, 'confusao') ||
  ['desorientado', 'sonolento', 'torporoso', 'coma'].includes(c.examRow('geral', 'consciencia') ?? '') ||
  c.finding('confuso') ||
  c.finding('rebaixamento');

const feverPresent = (c: ClinicalContext) =>
  yes(c, 'febre') || (c.vitals.temp !== undefined && c.vitals.temp >= 37.8) || c.template.id === 'febre' || c.examRow('geral', 'temperatura') === 'febril';

const chestPain = (c: ClinicalContext) => c.template.id === 'dor_toracica' || yes(c, 'dor_toracica');

/* ---------------- Regras ---------------- */

const sca: Rule = (c) => {
  if (!chestPain(c)) return null;
  const tipica = Array.isArray(c.a('dt_tipica')) ? (c.a('dt_tipica') as string[]).length : 0;
  const criteria = hits([
    [tipica >= 2, `características anginosas (${tipica}/3 critérios)`],
    [c.has('dt_padrao', 'repouso'), 'dor em repouso > 20 min'],
    [c.has('dt_padrao', 'crescendo', 'recente'), 'angina em crescendo ou de início recente'],
    [c.has('carater', 'aperto', 'peso'), 'dor em aperto/peso'],
    [c.body('mse') || c.body('mandibula') || c.body('ombro_e'), 'irradiação para membro superior/mandíbula'],
    [yes(c, 'sudorese'), 'sudorese'],
    [c.has('piora', 'esforco'), 'piora aos esforços'],
    [c.has('duracao_episodio', 'min_longos'), 'episódio > 20 minutos'],
  ]);
  const strong = tipica >= 2 || c.has('dt_padrao', 'repouso', 'crescendo') || criteria.length >= 2;
  if (!strong) return null;
  return {
    id: 'sca',
    title: 'Suspeita de síndrome coronariana aguda',
    severity: 'critico',
    criteria,
    conduct: [
      'ECG de 12 derivações em até 10 minutos da chegada.',
      'Monitorização cardíaca, acesso venoso, oximetria; O₂ apenas se SpO₂ < 90%.',
      'Troponina (preferencialmente ultrassensível) seriada conforme protocolo.',
      'AAS mastigável se não houver contraindicação (conferir dose, alergias e sangramento ativo).',
      'Supradesnivelamento de ST → acionar estratégia de reperfusão imediatamente.',
      'Estratificar o risco (HEART/GRACE) — veja Escores.',
    ],
    refs: ['sbc-sca-2021', 'acc-aha-sca-2025', 'esc-sca-2023'],
  };
};

const aortic: Rule = (c) => {
  const pain = chestPain(c) || c.template.id === 'dor_abdominal' || c.template.id === 'lombalgia';
  if (!pain) return null;
  const cat1 = Array.isArray(c.a('ao_condicoes')) && (c.a('ao_condicoes') as string[]).length > 0;
  const cat2 = c.has('carater', 'rasgando') || c.has('ao_max_inicio', 'sim') || c.has('ao_migracao', 'sim');
  const cat3 = c.finding('pulso_assimetrico') || hypotension(c) || c.has('ao_neuro', 'sim') || c.finding('sopro_diastolico');
  const n = [cat1, cat2, cat3].filter(Boolean).length;
  if (n === 0 || (!cat2 && !c.finding('pulso_assimetrico'))) return null;
  return {
    id: 'aorta',
    title: 'Suspeita de síndrome aórtica aguda (dissecção)',
    severity: 'critico',
    criteria: hits([
      [cat1, 'condição de alto risco (Marfan, valvopatia aórtica, aneurisma…)'],
      [cat2, 'dor abrupta/lancinante ou migratória'],
      [c.finding('pulso_assimetrico'), 'assimetria de pulsos/PA'],
      [hypotension(c), 'hipotensão'],
      [c.has('ao_neuro', 'sim'), 'déficit neurológico/síncope com a dor'],
      [true, `ADD-RS ${n}/3`],
    ]),
    conduct: [
      'NÃO administrar antitrombóticos, anticoagulantes ou trombolítico até afastar dissecção.',
      'Aferir PA nos dois braços; analgesia adequada.',
      'Controle de FC e PA conforme protocolo (metas usuais: FC ≤ 60 bpm e PAS < 120 mmHg — conferir).',
      'Angiotomografia de aorta com urgência (ecocardiograma à beira-leito se instável).',
      'Acionar cirurgia cardiovascular/vascular.',
    ],
    refs: ['addrs-2011'],
  };
};

const pe: Rule = (c) => {
  const suggestive = (yes(c, 'dispneia') || c.template.id === 'dispneia' || yes(c, 'dor_pleuritica') || c.has('piora', 'inspiracao'));
  if (!suggestive) return null;
  const tevRisk = Array.isArray(c.a('tev_fr')) && (c.a('tev_fr') as string[]).length > 0;
  const criteria = hits([
    [c.has('inicio', 'subito'), 'início súbito'],
    [tevRisk, 'fatores de risco para TEV'],
    [yes(c, 'edema_unilateral') || c.finding('edema_unilateral') || c.finding('empastamento'), 'sinais de TVP'],
    [yes(c, 'hemoptise'), 'hemoptise'],
    [c.vitals.fc !== undefined && c.vitals.fc > 100, 'taquicardia'],
    [c.vitals.spo2 !== undefined && c.vitals.spo2 < 94, 'SpO₂ < 94%'],
    [c.disease('tev'), 'TEV prévio'],
  ]);
  if (criteria.length < 2) return null;
  const unstable = hypotension(c) || (c.vitals.spo2 !== undefined && c.vitals.spo2 < 90);
  return {
    id: 'tep',
    title: 'Possível tromboembolismo pulmonar',
    severity: unstable ? 'critico' : 'alerta',
    criteria,
    conduct: [
      'Calcular Wells e PERC (veja Escores) para a probabilidade pré-teste.',
      'Baixa probabilidade + PERC negativo → TEP afastado sem exames.',
      'Probabilidade improvável/intermediária → D-dímero; provável/alta → angiotomografia de tórax.',
      'Instabilidade hemodinâmica → ecocardiograma à beira-leito e considerar reperfusão.',
      'Alta suspeita sem contraindicação → anticoagular enquanto investiga (conferir dose e função renal).',
    ],
    refs: ['aha-tep-2026', 'wells-tep-2000', 'perc-2004'],
  };
};

const stroke: Rule = (c) => {
  const criteria = hits([
    [yes(c, 'deficit_motor'), 'déficit motor'],
    [yes(c, 'alteracao_fala'), 'alteração da fala'],
    [yes(c, 'desvio_rima'), 'desvio de rima'],
    [yes(c, 'perda_visual_subita'), 'perda visual súbita'],
    [c.finding('hemiparesia_d') || c.finding('hemiparesia_e'), 'hemiparesia ao exame'],
    [c.finding('afasia'), 'afasia'],
    [c.finding('disartria'), 'disartria'],
    [c.finding('paresia_facial'), 'paresia facial'],
    [c.has('sin_recuperacao', 'deficit'), 'déficit persistente após o evento'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'avc',
    title: 'Déficit neurológico agudo — possível AVC',
    severity: 'critico',
    criteria,
    conduct: [
      'Acionar o protocolo de AVC (código AVC) imediatamente.',
      'Registrar a última vez em que foi visto bem (início dos sintomas).',
      'Glicemia capilar imediata (hipoglicemia simula AVC).',
      'TC de crânio sem contraste (± angiotomografia) sem atrasos.',
      'Avaliar elegibilidade para trombólise/trombectomia — o tempo é crítico.',
      'Evitar reduzir a PA agressivamente antes da definição (seguir metas do protocolo).',
    ],
    refs: ['aha-avc-2026'],
  };
};

const sah: Rule = (c) => {
  const isHeadache = c.template.id === 'cefaleia' || yes(c, 'cefaleia');
  if (!isHeadache) return null;
  const criteria = hits([
    [c.has('inicio', 'thunderclap'), 'pico de intensidade em < 1 minuto'],
    [c.has('hsa_pior', 'sim'), 'pior cefaleia da vida'],
    [c.has('hsa_esforco', 'sim'), 'início durante esforço'],
    [c.has('hsa_pc', 'sim'), 'perda de consciência'],
    [c.has('inicio', 'subito') && (c.num('intensidade') ?? 0) >= 7, 'início súbito e intensa'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'hsa',
    title: 'Cefaleia súbita intensa — afastar hemorragia subaracnóidea',
    severity: 'critico',
    criteria,
    conduct: [
      'TC de crânio sem contraste imediata.',
      'TC negativa com suspeita mantida → punção lombar ou angiotomografia conforme protocolo.',
      'Analgesia, antiemético e controle pressórico; acionar neurocirurgia se confirmada.',
    ],
    refs: ['ottawa-hsa-2013', 'snnoop10-2019'],
  };
};

const meningitis: Rule = (c) => {
  if (!feverPresent(c)) return null;
  const criteria = hits([
    [yes(c, 'rigidez_nuca') || c.finding('rigidez_nuca') || c.finding('kernig_brudzinski'), 'sinais meníngeos'],
    [yes(c, 'petequias') || c.finding('petequias') || c.finding('purpura'), 'petéquias/púrpura'],
    [alteredMental(c), 'alteração do estado mental'],
    [yes(c, 'cefaleia') && yes(c, 'vomitos'), 'cefaleia com vômitos'],
  ]);
  const enough = criteria.some((t) => /meníngeos|petéquias/.test(t)) || criteria.length >= 2;
  if (!enough) return null;
  return {
    id: 'meningite',
    title: 'Febre com sinais de meningite/meningococcemia',
    severity: 'critico',
    criteria: ['febre', ...criteria],
    conduct: [
      'Não atrasar o antibiótico: hemoculturas e antibiótico empírico imediatamente, com corticoide conforme protocolo (conferir doses).',
      'TC antes da punção lombar só se déficit focal, convulsão, rebaixamento, papiledema ou imunossupressão.',
      'Precaução para gotículas até afastar meningococo; notificar.',
    ],
  };
};

const sepsis: Rule = (c) => {
  const infection = feverPresent(c) || (c.vitals.temp !== undefined && c.vitals.temp < 36);
  if (!infection) return null;
  const fr = c.vitals.fr !== undefined && c.vitals.fr >= 22;
  const pas = c.vitals.pas !== undefined && c.vitals.pas <= 100;
  const mental = alteredMental(c);
  const qsofa = [fr, pas, mental].filter(Boolean).length;
  const perf = ['tec_lento', 'moteado'].includes(c.examRow('geral', 'perfusao') ?? '');
  const si = shockIndex(c.vitals);
  if (qsofa < 2 && !hypotension(c) && !perf && !(si !== undefined && si >= 1)) return null;
  return {
    id: 'sepse',
    title: hypotension(c) || perf ? 'Suspeita de sepse com hipoperfusão/choque' : 'Suspeita de sepse',
    severity: 'critico',
    criteria: hits([
      [true, 'suspeita de infecção'],
      [fr, 'FR ≥ 22'],
      [pas, 'PAS ≤ 100'],
      [mental, 'alteração do estado mental'],
      [hypotension(c), 'hipotensão'],
      [perf, 'má perfusão periférica'],
      [si !== undefined && si >= 1, `índice de choque ${si?.toFixed(1)}`],
    ]),
    conduct: [
      'Abrir o protocolo de sepse da instituição.',
      'Lactato e hemoculturas (antes do antibiótico, sem atrasá-lo).',
      'Antibiótico de amplo espectro o mais cedo possível — idealmente na 1ª hora se choque ou alta probabilidade.',
      'Hipotensão/hipoperfusão → cristaloide com reavaliação frequente da resposta.',
      'Hipotensão persistente → noradrenalina para PAM ≥ 65 mmHg.',
      'Controle do foco infeccioso.',
    ],
    refs: ['ssc-2026', 'sepsis3-2016', 'qsofa-2016'],
  };
};

const neutropenia: Rule = (c) => {
  if (!feverPresent(c) || !c.has('imuno', 'quimio')) return null;
  return {
    id: 'neutropenia',
    title: 'Possível neutropenia febril',
    severity: 'critico',
    criteria: ['febre', 'quimioterapia nas últimas 6 semanas'],
    conduct: [
      'Hemograma, culturas (periférica e do cateter) e função renal/hepática.',
      'Antibiótico de amplo espectro com atividade antipseudomonas em até 1 hora (conferir dose).',
      'Isolamento protetor e avaliação de risco (MASCC).',
    ],
    refs: ['idsa-neutropenia-2011'],
  };
};

const bleeding: Rule = (c) => {
  const criteria = hits([
    [yes(c, 'hematemese'), 'hematêmese'],
    [yes(c, 'melena'), 'melena'],
    [yes(c, 'hematoquezia'), 'hematoquezia'],
    [yes(c, 'hemoptise') && c.template.id !== 'dispneia', 'hemoptise'],
    [c.finding('sangramento_ex'), 'sangramento vaginal ao exame'],
    [c.has('vomitos_aspecto', 'borra', 'sangue'), 'vômitos com sangue/borra de café'],
  ]);
  if (!criteria.length) return null;
  const unstable = hypotension(c) || (shockIndex(c.vitals) ?? 0) >= 1 || yes(c, 'sincope');
  return {
    id: 'sangramento',
    title: unstable ? 'Sangramento ativo com instabilidade' : 'Sangramento ativo',
    severity: unstable ? 'critico' : 'alerta',
    criteria: [...criteria, ...(unstable ? ['sinais de instabilidade'] : [])],
    conduct: [
      'Dois acessos venosos calibrosos; tipagem, prova cruzada, hemograma e coagulograma.',
      'Ressuscitação guiada pela hemodinâmica; transfusão se indicada.',
      'Rever/suspender anticoagulantes e antiagregantes.',
      'HDA: IBP endovenoso e endoscopia; suspeita de varizes → vasoativo e antibiótico profilático (conferir doses).',
      'Estratificar com Glasgow-Blatchford (veja Escores).',
    ],
    refs: ['blatchford-2000'],
  };
};

const shock: Rule = (c) => {
  const perf = ['tec_lento', 'moteado'].includes(c.examRow('geral', 'perfusao') ?? '');
  const si = shockIndex(c.vitals);
  const criteria = hits([
    [hypotension(c), `PAS ${c.vitals.pas} mmHg`],
    [si !== undefined && si >= 1, `índice de choque ${si?.toFixed(1)}`],
    [perf, 'má perfusão periférica'],
  ]);
  if (!criteria.length || (criteria.length === 1 && !hypotension(c) && !perf)) return null;
  return {
    id: 'choque',
    title: 'Sinais de choque/hipoperfusão',
    severity: 'critico',
    criteria,
    conduct: [
      'Monitorização, O₂ se necessário, dois acessos venosos, lactato.',
      'Identificar o tipo: hipovolêmico, distributivo, cardiogênico ou obstrutivo (ultrassom à beira-leito ajuda).',
      'Volume guiado pela resposta (cautela se congestão); vasopressor se hipotensão persistente.',
    ],
  };
};

const respiratory: Rule = (c) => {
  const criteria = hits([
    [c.vitals.spo2 !== undefined && c.vitals.spo2 < 90, `SpO₂ ${c.vitals.spo2}%`],
    [c.vitals.fr !== undefined && c.vitals.fr > 30, `FR ${c.vitals.fr} irpm`],
    [c.examRow('geral', 'respiracao') === 'esforco' || c.finding('tiragem'), 'esforço respiratório'],
    [c.finding('estridor'), 'estridor'],
    [c.has('bro_fala', 'nao', 'palavras'), 'não consegue completar frases'],
    [c.has('dp_esforco', 'repouso'), 'dispneia em repouso'],
  ]);
  if (!criteria.length || (criteria.length === 1 && criteria[0] === 'dispneia em repouso')) return null;
  return {
    id: 'respiratorio',
    title: 'Insuficiência respiratória',
    severity: 'critico',
    criteria,
    conduct: [
      'O₂ titulado (alvo SpO₂ 92–96%; 88–92% em retentores de CO₂).',
      'Cabeceira elevada, monitorização e gasometria arterial.',
      'Avaliar VNI/cateter nasal de alto fluxo ou intubação conforme gravidade.',
      'Tratar a causa (broncoespasmo, congestão, pneumonia, TEP, pneumotórax).',
    ],
  };
};

const glucose: Rule = (c) => {
  const g = c.vitals.glicemia;
  if (g === undefined) return null;
  if (g < 70)
    return {
      id: 'hipoglicemia',
      title: 'Hipoglicemia',
      severity: 'critico',
      criteria: [`HGT ${g} mg/dL`],
      conduct: [
        'Corrigir imediatamente: glicose via oral se consciente e deglutindo; endovenosa se rebaixado (conferir dose).',
        'Repetir HGT em 15 minutos; investigar causa (insulina, sulfonilureia, sepse, hepatopatia, etilismo).',
        'Etilistas/desnutridos: tiamina antes ou junto da glicose.',
      ],
    };
  if (g >= 300 && (yes(c, 'vomitos') || yes(c, 'dor_abdominal') || (c.vitals.fr ?? 0) > 22 || alteredMental(c)))
    return {
      id: 'hiperglicemia',
      title: 'Hiperglicemia grave — afastar cetoacidose/estado hiperosmolar',
      severity: 'critico',
      criteria: hits([
        [true, `HGT ${g} mg/dL`],
        [yes(c, 'vomitos'), 'vômitos'],
        [yes(c, 'dor_abdominal'), 'dor abdominal'],
        [(c.vitals.fr ?? 0) > 22, 'taquipneia'],
        [alteredMental(c), 'alteração do estado mental'],
      ]),
      conduct: [
        'Gasometria, cetonemia/cetonúria, eletrólitos (K⁺ antes da insulina), função renal e osmolaridade.',
        'Hidratação venosa e insulina conforme protocolo (conferir doses).',
        'Buscar fator precipitante (infecção, IAM, má adesão).',
      ],
    };
  return null;
};

const consciousness: Rule = (c) => {
  if (c.gcs === undefined) return null;
  if (c.gcs <= 8)
    return {
      id: 'glasgow',
      title: `Rebaixamento grave do nível de consciência (Glasgow ${c.gcs})`,
      severity: 'critico',
      criteria: [`Glasgow ${c.gcs}`],
      conduct: [
        'Proteção de via aérea (Glasgow ≤ 8: considerar intubação).',
        'Glicemia capilar, sinais vitais, pupilas.',
        'Investigar causa estrutural (TC) e metabólica/tóxica.',
      ],
      refs: ['glasgow-1974'],
    };
  if (c.gcs <= 13)
    return {
      id: 'glasgow',
      title: `Alteração do nível de consciência (Glasgow ${c.gcs})`,
      severity: 'alerta',
      criteria: [`Glasgow ${c.gcs}`],
      conduct: ['Glicemia capilar, reavaliação neurológica seriada, investigar causa.'],
      refs: ['glasgow-1974'],
    };
  return null;
};

const anaphylaxis: Rule = (c) => {
  const criteria = hits([
    [c.has('ana_edema', 'sim'), 'angioedema de lábios/língua/orofaringe'],
    [yes(c, 'urticaria') && (yes(c, 'dispneia') || yes(c, 'sibilancia') || hypotension(c)), 'urticária com comprometimento respiratório/hemodinâmico'],
    [c.finding('estridor') && c.has('ana_exposicao', 'sim'), 'estridor após exposição a alérgeno'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'anafilaxia',
    title: 'Possível anafilaxia',
    severity: 'critico',
    criteria,
    conduct: [
      'Adrenalina intramuscular imediata na face anterolateral da coxa (conferir dose; repetir se necessário).',
      'Decúbito (pernas elevadas), O₂, acesso venoso e cristaloide se hipotensão.',
      'Anti-histamínico e corticoide são adjuvantes — não substituem a adrenalina.',
      'Observação por risco de reação bifásica.',
    ],
  };
};

const acuteAbdomen: Rule = (c) => {
  const criteria = hits([
    [c.finding('defesa'), 'defesa/rigidez abdominal'],
    [c.finding('blumberg'), 'Blumberg positivo'],
    [c.finding('rha_ausentes'), 'RHA ausentes'],
    [yes(c, 'parada_eliminacao'), 'parada de eliminação de gases e fezes'],
    [c.has('vomitos_aspecto', 'fecaloide'), 'vômitos fecaloides'],
    [c.finding('massa_pulsatil'), 'massa pulsátil'],
    [c.has('vas_desproporcional', 'sim'), 'dor desproporcional ao exame'],
    [c.finding('cullen'), 'sinais de Cullen/Grey Turner'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'abdome_agudo',
    title: 'Sinais de abdome agudo',
    severity: 'critico',
    criteria,
    conduct: [
      'Jejum, acesso venoso, analgesia (não atrapalha o diagnóstico) e antiemético.',
      'Exames: hemograma, eletrólitos, função renal, lipase, lactato; β-hCG se mulher em idade fértil.',
      'Imagem conforme suspeita (TC de abdome na maioria dos casos).',
      'Avaliação cirúrgica precoce.',
    ],
  };
};

const ectopic: Rule = (c) => {
  if (c.sex !== 'F' || c.profile === 'pediatria' || c.profile === 'idoso') return null;
  const pain = c.template.id === 'dor_abdominal' || yes(c, 'dor_abdominal') || yes(c, 'dor_pelvica');
  const pregnancy = yes(c, 'atraso_menstrual') || c.has('go_gestacao_possivel', 'sim', 'nao_sabe');
  if (!pain || !pregnancy) return null;
  const bleed = yes(c, 'sangramento_vaginal');
  return {
    id: 'ectopica',
    title: 'Dor abdominal com possível gestação — afastar gravidez ectópica',
    severity: bleed || hypotension(c) ? 'critico' : 'alerta',
    criteria: hits([
      [true, 'dor abdominal/pélvica'],
      [yes(c, 'atraso_menstrual'), 'atraso menstrual'],
      [c.has('go_gestacao_possivel', 'sim', 'nao_sabe'), 'possibilidade de gestação'],
      [bleed, 'sangramento vaginal'],
      [hypotension(c), 'hipotensão'],
    ]),
    conduct: [
      'β-hCG imediato.',
      'β-hCG positivo → ultrassonografia transvaginal com urgência.',
      'Instabilidade → acesso calibroso, tipagem (Rh) e ginecologia imediatamente.',
    ],
  };
};

const caudaEquina: Rule = (c) => {
  const criteria = hits([
    [c.triHas('lom_red_flags', 'sela'), 'anestesia em sela'],
    [c.triHas('lom_red_flags', 'esfincter') || yes(c, 'retencao'), 'disfunção esfincteriana'],
    [c.triHas('lom_red_flags', 'deficit'), 'déficit motor progressivo'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'cauda_equina',
    title: 'Suspeita de síndrome da cauda equina',
    severity: 'critico',
    criteria,
    conduct: ['Ressonância magnética de urgência.', 'Avaliação neurocirúrgica/ortopédica imediata (descompressão precoce).', 'Avaliar resíduo pós-miccional.'],
    refs: ['nice-lombalgia'],
  };
};

const lowBackSerious: Rule = (c) => {
  if (c.template.id !== 'lombalgia') return null;
  const criteria = hits([
    [c.triHas('lom_red_flags', 'cancer'), 'câncer prévio'],
    [c.triHas('lom_red_flags', 'perda_peso'), 'perda de peso'],
    [c.triHas('lom_red_flags', 'febre'), 'febre/infecção'],
    [c.triHas('lom_red_flags', 'udi_imuno'), 'drogas injetáveis/imunossupressão'],
    [c.triHas('lom_red_flags', 'trauma'), 'trauma significativo'],
    [c.triHas('lom_red_flags', 'corticoide'), 'corticoide crônico'],
    [c.triHas('lom_red_flags', 'noturna'), 'dor noturna/em repouso'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'lombalgia_grave',
    title: 'Lombalgia com sinais de alarme',
    severity: 'alerta',
    criteria,
    conduct: [
      'Investigar causa específica: neoplasia, infecção (espondilodiscite) ou fratura.',
      'Exames (hemograma, VHS/PCR) e imagem dirigida — RM é o exame de escolha na suspeita de infecção/neoplasia.',
    ],
    refs: ['nice-lombalgia'],
  };
};

const dengue: Rule = (c) => {
  if (!c.triHas('den_alarme')) return null;
  return {
    id: 'dengue',
    title: 'Dengue com sinais de alarme',
    severity: 'critico',
    criteria: ['sinal(is) de alarme presente(s)'],
    conduct: [
      'Grupo C (sinais de alarme) → hidratação venosa imediata e internação.',
      'Choque/sangramento grave/disfunção orgânica → grupo D (UTI).',
      'Hematócrito, plaquetas e reavaliação clínica seriada.',
      'Evitar AAS e AINE.',
    ],
    refs: ['ms-dengue-2024'],
  };
};

const syncopeHighRisk: Rule = (c) => {
  if (c.template.id !== 'sincope' && !yes(c, 'sincope')) return null;
  const criteria = hits([
    [c.has('sin_circunstancia', 'esforco'), 'síncope ao esforço'],
    [c.has('sin_circunstancia', 'deitado'), 'síncope em decúbito'],
    [c.has('sin_prodromo', 'palpitacoes'), 'palpitações antes da síncope'],
    [c.has('sin_prodromo', 'nenhum'), 'sem pródromo'],
    [c.has('sin_prodromo', 'dor_toracica') || yes(c, 'dor_toracica'), 'dor torácica'],
    [Array.isArray(c.a('car_cardiopatia')) && !c.has('car_cardiopatia', 'nenhuma'), 'cardiopatia estrutural'],
    [c.has('car_hf_morte', 'sim'), 'morte súbita familiar precoce'],
    [hypotension(c), 'hipotensão'],
    [c.disease('ic'), 'insuficiência cardíaca'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'sincope',
    title: 'Síncope com características de alto risco',
    severity: criteria.length >= 2 ? 'critico' : 'alerta',
    criteria,
    conduct: [
      'ECG de 12 derivações imediato e monitorização cardíaca.',
      'Investigar arritmia, cardiopatia estrutural (ecocardiograma), TEP, sangramento e HSA conforme o contexto.',
      'Alto risco → observação/internação para investigação.',
    ],
    refs: ['esc-sincope-2018', 'sfsr-2004'],
  };
};

const hypertension: Rule = (c) => {
  const { pas, pad } = c.vitals;
  if (c.profile === 'gestante') return null; // tratado na regra de pré-eclâmpsia
  if (!((pas ?? 0) >= 180 || (pad ?? 0) >= 120)) return null;
  const organ = hits([
    [chestPain(c), 'dor torácica'],
    [yes(c, 'dispneia'), 'dispneia'],
    [yes(c, 'deficit_motor') || yes(c, 'alteracao_fala'), 'déficit neurológico'],
    [alteredMental(c), 'alteração do estado mental'],
    [yes(c, 'perda_visual_subita') || yes(c, 'baixa_acuidade'), 'alteração visual'],
    [c.finding('papiledema'), 'papiledema'],
  ]);
  return {
    id: 'crise_hipertensiva',
    title: organ.length ? 'Provável emergência hipertensiva' : 'PA muito elevada',
    severity: organ.length ? 'critico' : 'alerta',
    criteria: [`PA ${pas ?? '?'}x${pad ?? '?'} mmHg`, ...organ],
    conduct: organ.length
      ? [
          'Emergência hipertensiva: lesão aguda de órgão-alvo → anti-hipertensivo endovenoso titulável em ambiente monitorizado.',
          'Metas de redução dependem do órgão acometido (ex.: dissecção e AVC têm metas próprias).',
          'ECG, troponina, função renal, urina I, fundoscopia e imagem conforme o caso.',
        ]
      : [
          'Sem lesão aguda de órgão-alvo: não reduzir a PA de forma abrupta.',
          'Repetir a medida após repouso, tratar dor/ansiedade e ajustar anti-hipertensivo oral com seguimento.',
        ],
    refs: ['sbc-has-2025'],
  };
};

const preeclampsia: Rule = (c) => {
  if (c.profile !== 'gestante') return null;
  const { pas, pad } = c.vitals;
  const high = (pas ?? 0) >= 140 || (pad ?? 0) >= 90;
  const severe = (pas ?? 0) >= 160 || (pad ?? 0) >= 110;
  const symptoms = hits([
    [Array.isArray(c.a('pe_sintomas')) && (c.a('pe_sintomas') as string[]).length > 0, 'sintomas de iminência de eclâmpsia'],
    [yes(c, 'cefaleia'), 'cefaleia'],
    [yes(c, 'escotomas'), 'escotomas'],
    [yes(c, 'dor_abdominal'), 'dor epigástrica/abdominal'],
    [yes(c, 'convulsao'), 'convulsão'],
  ]);
  if (!high && !(symptoms.length && yes(c, 'convulsao'))) return null;
  return {
    id: 'preeclampsia',
    title: severe || symptoms.length ? 'Pré-eclâmpsia com sinais de gravidade (suspeita)' : 'Hipertensão na gestação',
    severity: severe || symptoms.length ? 'critico' : 'alerta',
    criteria: [`PA ${pas ?? '?'}x${pad ?? '?'} mmHg`, ...symptoms],
    conduct: [
      'Confirmar a PA (repouso, manguito adequado).',
      'Exames: proteinúria, hemograma/plaquetas, TGO/TGP, creatinina, LDH.',
      'Sinais de gravidade → sulfato de magnésio para prevenir eclâmpsia e anti-hipertensivo de ação rápida se PA ≥ 160/110 (conferir doses).',
      'Avaliar vitalidade fetal e momento/via do parto com a obstetrícia.',
    ],
    refs: ['febrasgo-pe-2024'],
  };
};

const pregnancyBleed: Rule = (c) => {
  if (c.profile !== 'gestante') return null;
  const criteria = hits([
    [yes(c, 'sangramento_vaginal') || c.finding('sangramento_ex'), 'sangramento vaginal'],
    [yes(c, 'perda_liquido') || c.finding('liquido'), 'perda de líquido'],
    [yes(c, 'mov_fetais_reduzidos'), 'redução dos movimentos fetais'],
    [c.finding('bcf_ausente') || c.finding('bcf_alterado'), 'BCF alterados/ausentes'],
    [c.finding('hipertonia'), 'hipertonia uterina'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'obstetrico',
    title: 'Sinal de alarme obstétrico',
    severity: 'critico',
    criteria,
    conduct: [
      'Avaliação obstétrica imediata; BCF e cardiotocografia conforme a IG.',
      'Sangramento → não realizar toque vaginal antes de excluir placenta prévia (USG); tipagem e Rh.',
      'Hipertonia + sangramento → suspeitar de descolamento prematuro de placenta.',
    ],
  };
};

const pediatric: Rule = (c) => {
  if (c.profile !== 'pediatria') return null;
  const ageMonths = c.ageYears !== undefined ? c.ageYears * 12 : undefined;
  const criteria = hits([
    [c.triHas('aidpi_perigo'), 'sinal geral de perigo (AIDPI)'],
    [ageMonths !== undefined && ageMonths < 3 && feverPresent(c), 'febre em lactente < 3 meses'],
    [c.finding('tiragem'), 'tiragem'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'pediatria',
    title: 'Criança com sinal de gravidade',
    severity: 'critico',
    criteria,
    conduct: [
      'Classificar como grave: estabilizar e encaminhar/internar com urgência.',
      'Lactente < 3 meses febril: investigação completa para infecção bacteriana grave.',
      'Avaliar hidratação, glicemia e via aérea.',
    ],
    refs: ['ssc-ped-2026', 'pals-2020'],
  };
};

const suicide: Rule = (c) => {
  const row = c.examRow('psiquiatrico', 'suicidio');
  const criteria = hits([
    [yes(c, 'ideacao_suicida'), 'ideação suicida referida'],
    [row === 'plano', 'ideação com plano/intenção'],
    [row === 'passiva', 'ideação passiva'],
  ]);
  if (!criteria.length) return null;
  return {
    id: 'suicidio',
    title: 'Risco de suicídio',
    severity: row === 'plano' ? 'critico' : 'alerta',
    criteria,
    conduct: [
      'Não deixar o paciente sozinho; remover meios letais do ambiente.',
      'Avaliação psiquiátrica de urgência e acionar a rede de apoio.',
      'Abordar sem julgamento; CVV (188) como apoio adicional.',
    ],
  };
};

const fallAnticoag: Rule = (c) => {
  const fall = (c.num('id_quedas') ?? 0) > 0 || yes(c, 'trauma') || c.has('sin_trauma', 'sim') || c.has('tce_recente', 'sim');
  const anticoag = c.has('antitromboticos', 'anticoagulante') || c.enc.history.medications.some((m) => /xarelto|rivaroxab|apixab|eliquis|dabigat|pradaxa|varfarin|marevan|edoxab|enoxaparin/i.test(m.name));
  if (!fall || !anticoag) return null;
  return {
    id: 'queda_anticoag',
    title: 'Trauma/queda em uso de anticoagulante',
    severity: 'alerta',
    criteria: ['queda/trauma', 'uso de anticoagulante'],
    conduct: ['Baixo limiar para TC de crânio (mesmo com TCE leve).', 'Avaliar reversão da anticoagulação se sangramento.'],
  };
};

const testicular: Rule = (c) => {
  if (!(c.has('torcao', 'sim') || c.finding('testiculo_doloroso'))) return null;
  return {
    id: 'torcao',
    title: 'Suspeita de torção testicular',
    severity: 'critico',
    criteria: ['dor testicular súbita/achado de exame'],
    conduct: ['Avaliação urológica imediata (viabilidade cai após ~6 h).', 'USG Doppler apenas se não atrasar a exploração cirúrgica.'],
  };
};

const dvt: Rule = (c) => {
  if (!(yes(c, 'edema_unilateral') || c.finding('edema_unilateral') || c.finding('empastamento'))) return null;
  return {
    id: 'tvp',
    title: 'Suspeita de trombose venosa profunda',
    severity: 'alerta',
    criteria: ['dor/edema unilateral de membro inferior'],
    conduct: ['Calcular Wells para TVP (veja Escores).', 'Improvável → D-dímero; provável → ultrassonografia Doppler venosa.', 'Avaliar sintomas de TEP associado.'],
    refs: ['wells-tvp-2003'],
  };
};


/* ---------------- Queixas da Fase 3 ---------------- */

const vestibularCentral: Rule = (c) => {
  const isDizzy = c.template.id === 'tontura' || yes(c, 'vertigem') || yes(c, 'tontura');
  if (!isDizzy) return null;
  const criteria = hits([
    [c.triHas('ton_central', 'cefaleia_subita'), 'cefaleia súbita/occipital'],
    [c.triHas('ton_central', 'diplopia') || yes(c, 'diplopia'), 'diplopia'],
    [c.triHas('ton_central', 'fala_degluticao'), 'disartria/disfagia'],
    [c.triHas('ton_central', 'fraqueza_dormencia'), 'déficit focal'],
    [c.triHas('ton_central', 'nao_anda'), 'incapaz de andar sem apoio'],
  ]);
  if (criteria.length) {
    return {
      id: 'vertigem_central',
      title: 'Tontura com sinais centrais — possível AVC de fossa posterior',
      severity: 'critico',
      criteria,
      conduct: [
        'Acionar o protocolo de AVC; registrar a última vez em que foi visto bem.',
        'Glicemia capilar; exame neurológico com marcha e coordenação.',
        'Neuroimagem urgente (RM com difusão é a mais sensível; TC exclui hemorragia).',
        'Não dar alta com diagnóstico de “labirintite”.',
      ],
      refs: ['hints-2009', 'aha-avc-2026'],
    };
  }
  if (!c.has('ton_padrao', 'aguda_continua')) return null;
  return {
    id: 'vertigem_central',
    title: 'Síndrome vestibular aguda — excluir AVC (HINTS)',
    severity: 'alerta',
    criteria: ['tontura contínua de início agudo'],
    conduct: [
      'Fazer o HINTS: impulso cefálico, nistagmo e teste de skew.',
      'Impulso cefálico normal, nistagmo que muda de direção ou skew presente → tratar como AVC até prova em contrário.',
      'RM precoce pode ser falsamente negativa nas primeiras 48 h.',
    ],
    refs: ['hints-2009'],
  };
};

const palpitationHighRisk: Rule = (c) => {
  if (!(c.template.id === 'palpitacoes' || yes(c, 'palpitacoes'))) return null;
  const criteria = hits([
    [c.triHas('pal_alarme', 'sincope') || yes(c, 'sincope'), 'síncope associada'],
    [c.triHas('pal_alarme', 'esforco') || c.has('pal_gatilho', 'esforco'), 'palpitação durante o esforço'],
    [c.triHas('pal_alarme', 'dor_dispneia'), 'dor torácica/dispneia associadas'],
    [c.triHas('pal_alarme', 'cardiopatia'), 'cardiopatia estrutural'],
    [c.triHas('pal_alarme', 'morte_subita'), 'morte súbita precoce na família'],
    [hypotension(c), 'hipotensão'],
    [c.vitals.fc !== undefined && c.vitals.fc >= 150, `FC ${c.vitals.fc} bpm`],
  ]);
  if (!criteria.length) return null;
  const unstable = hypotension(c) || alteredMental(c);
  return {
    id: 'arritmia',
    title: unstable ? 'Taquiarritmia com instabilidade' : 'Palpitação de alto risco',
    severity: unstable ? 'critico' : 'alerta',
    criteria,
    conduct: unstable
      ? ['Monitorização, acesso venoso, O₂ se necessário.', 'ECG de 12 derivações imediato.', 'Instabilidade por taquiarritmia → cardioversão elétrica sincronizada conforme protocolo.']
      : ['ECG de 12 derivações (procure pré-excitação, QT longo, Brugada, bloqueios).', 'Monitorização e eletrólitos (K, Mg).', 'Ecocardiograma e avaliação cardiológica antes da alta.'],
    refs: ['ehra-palpitacoes-2011'],
  };
};

const pyelonephritis: Rule = (c) => {
  if (!(c.template.id === 'disuria' || yes(c, 'disuria'))) return null;
  const criteria = hits([
    [c.triHas('uri_complicada', 'febre') || feverPresent(c), 'febre'],
    [c.triHas('uri_complicada', 'lombar') || yes(c, 'dor_lombar'), 'dor lombar/flanco'],
    [c.triHas('uri_complicada', 'vomitos') || yes(c, 'vomitos'), 'vômitos'],
    [c.triHas('uri_complicada', 'gestante') || c.profile === 'gestante', 'gestação'],
    [c.triHas('uri_complicada', 'sonda'), 'sonda/procedimento urológico'],
    [c.triHas('uri_complicada', 'imuno'), 'imunossupressão/DM descompensado'],
  ]);
  if (!criteria.length) return null;
  const upper = criteria.some((x) => /febre|lombar/.test(x));
  return {
    id: 'pielonefrite',
    title: upper ? 'Possível pielonefrite (ITU alta)' : 'ITU complicada',
    severity: 'alerta',
    criteria,
    conduct: [
      'Urocultura com antibiograma ANTES do antibiótico.',
      'Avaliar critérios de sepse (qSOFA) e hidratação; vômitos ou instabilidade → internação.',
      'Antibiótico conforme perfil local de resistência; na gestante, escolher fármaco seguro.',
      'Considerar imagem se não melhorar em 48–72 h, obstrução ou cálculo.',
    ],
    refs: ['idsa-itu-2011'],
  };
};

const severeDiarrhea: Rule = (c) => {
  if (!(c.template.id === 'diarreia' || yes(c, 'diarreia'))) return null;
  const criteria = hits([
    [c.triHas('dia_desidratacao', 'nao_bebe'), 'incapaz de manter hidratação oral'],
    [c.triHas('dia_desidratacao', 'letargia'), 'letargia/confusão'],
    [c.triHas('dia_alarme', 'sangue') || c.has('dia_aspecto', 'sangue') || yes(c, 'hematoquezia'), 'sangue nas fezes'],
    [c.triHas('dia_alarme', 'dor_intensa'), 'dor abdominal intensa'],
    [c.triHas('dia_alarme', 'idoso_imuno'), 'grupo de risco'],
    [c.has('dia_epi', 'atb', 'internacao'), 'antibiótico/internação recente (C. difficile?)'],
  ]);
  if (!criteria.length) return null;
  const severe = c.triHas('dia_desidratacao', 'nao_bebe', 'letargia') || hypotension(c);
  return {
    id: 'diarreia_grave',
    title: severe ? 'Diarreia com desidratação grave' : 'Diarreia com sinais de alarme',
    severity: severe ? 'critico' : 'alerta',
    criteria,
    conduct: [
      severe ? 'Hidratação venosa imediata (cristaloide em bolus), monitorizar diurese.' : 'Reidratação oral; reavaliar sinais de desidratação.',
      'Eletrólitos e função renal se desidratação moderada/grave.',
      'Disenteria com febre → coprocultura; antibiótico/internação recente → pesquisar C. difficile.',
      'Dor desproporcional → excluir isquemia mesentérica e outras causas de abdome agudo.',
    ],
    refs: ['idsa-diarreia-2017'],
  };
};

const hemoptysis: Rule = (c) => {
  if (!c.triHas('tos_alarme', 'hemoptise_volume')) return null;
  return {
    id: 'hemoptise',
    title: 'Hemoptise volumosa',
    severity: 'critico',
    criteria: ['sangue vivo em quantidade'],
    conduct: [
      'Proteger a via aérea; decúbito sobre o lado que sangra, se conhecido.',
      'Acesso venoso, hemograma, coagulograma, tipagem.',
      'Radiografia/angiotomografia de tórax; acionar broncoscopia/radiologia intervencionista.',
      'Suspender anticoagulantes/antiagregantes conforme o caso.',
    ],
  };
};

const tuberculosis: Rule = (c) => {
  const cough = c.template.id === 'tosse' || yes(c, 'tosse');
  if (!cough) return null;
  const longCough = c.template.id === 'tosse' && (c.complaintDays ?? 0) >= 21;
  const constitutional = yes(c, 'sudorese_noturna') && (yes(c, 'perda_peso') || feverPresent(c));
  if (!longCough && !constitutional) return null;
  return {
    id: 'tuberculose',
    title: 'Sintomático respiratório — investigar tuberculose',
    severity: 'alerta',
    criteria: hits([
      [longCough, 'tosse há 3 semanas ou mais'],
      [yes(c, 'sudorese_noturna'), 'sudorese noturna'],
      [yes(c, 'perda_peso'), 'perda de peso'],
      [yes(c, 'hemoptise'), 'hemoptise'],
    ]),
    conduct: [
      'Máscara cirúrgica no paciente e ambiente ventilado (precaução para aerossóis).',
      'Escarro: teste rápido molecular (TRM-TB) e/ou baciloscopia + cultura.',
      'Radiografia de tórax; oferecer teste de HIV.',
      'Notificar caso confirmado e avaliar contatos.',
    ],
    refs: ['ms-tb-2019'],
  };
};

const angioedema: Rule = (c) => {
  if (!(c.has('ede_local', 'labios_lingua') || c.triHas('ede_alarme', 'via_aerea'))) return null;
  return {
    id: 'angioedema',
    title: 'Angioedema — risco de obstrução da via aérea',
    severity: 'critico',
    criteria: hits([
      [c.has('ede_local', 'labios_lingua'), 'edema de lábios/língua'],
      [c.triHas('ede_alarme', 'via_aerea'), 'sinais de via aérea (voz abafada, dispneia)'],
      [c.has('ede_meds', 'ieca'), 'uso de IECA (angioedema bradicinérgico)'],
    ]),
    conduct: [
      'Avaliar via aérea imediatamente; preparar via aérea difícil.',
      'Urticária/hipotensão/broncoespasmo (anafilaxia) → adrenalina IM 0,5 mg (adulto) (conferir dose, função renal/hepática, alergias e interações antes de prescrever).',
      'Em uso de IECA → suspender (a resposta à adrenalina/anti-histamínico pode ser pobre).',
    ],
  };
};

const strokeWindow: Rule = (c) => {
  if (c.template.id !== 'deficit_neurologico') return null;
  if (!c.has('dn_lkw') && !c.has('dn_acordou')) {
    return {
      id: 'avc_tempo',
      title: 'Registre a hora: última vez visto bem',
      severity: 'alerta',
      criteria: ['déficit neurológico agudo sem horário registrado'],
      conduct: ['Pergunte a familiares/testemunhas a última vez em que o paciente estava normal.', 'Acione o protocolo de AVC sem esperar a confirmação do horário.'],
      refs: ['aha-avc-2026'],
    };
  }
  return null;
};

export const RED_FLAG_RULES: Rule[] = [
  shock,
  respiratory,
  consciousness,
  sca,
  aortic,
  stroke,
  sah,
  meningitis,
  sepsis,
  neutropenia,
  pe,
  bleeding,
  anaphylaxis,
  acuteAbdomen,
  ectopic,
  preeclampsia,
  pregnancyBleed,
  pediatric,
  glucose,
  caudaEquina,
  dengue,
  syncopeHighRisk,
  hypertension,
  suicide,
  testicular,
  lowBackSerious,
  fallAnticoag,
  dvt,
  vestibularCentral,
  palpitationHighRisk,
  pyelonephritis,
  severeDiarrhea,
  hemoptysis,
  tuberculosis,
  angioedema,
  strokeWindow,
];

/** Avalia todas as regras. Críticos primeiro. */
export function evaluateRedFlags(ctx: ClinicalContext): RedFlag[] {
  const out: RedFlag[] = [];
  for (const rule of RED_FLAG_RULES) {
    try {
      const r = rule(ctx);
      if (r && !out.some((x) => x.id === r.id)) out.push(r);
    } catch {
      // uma regra com dado inesperado nunca deve derrubar a tela
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critico' ? -1 : 1));
}
