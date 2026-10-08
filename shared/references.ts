/* ==========================================================================
   REFERÊNCIAS (formato ABNT NBR 6023:2018)
   --------------------------------------------------------------------------
   Lista curada usada no "Por que perguntar?", nas red flags, nos escores e
   enviada à IA como base preferencial de citação. Os dados bibliográficos
   dos artigos foram conferidos no PubMed (volume, páginas e DOI).

   Arquivo compartilhado entre o app (src) e o servidor de IA (server).
   O nome do periódico/obra vai entre **asteriscos** = negrito na tela.
   ========================================================================== */

export interface Reference {
  id: string;
  /** Rótulo curto, para chips e citações no texto. */
  short: string;
  abnt: string;
  url?: string;
  topics: string[];
}

export const REFERENCES: Reference[] = [
  // ---------------- Cardiologia ----------------
  {
    id: 'sbc-has-2025',
    short: 'SBC — Diretriz Brasileira de Hipertensão Arterial 2025',
    abnt: 'BRANDÃO, A. A. et al. Diretriz Brasileira de Hipertensão Arterial – 2025. **Arquivos Brasileiros de Cardiologia**, v. 122, n. 9, e20250624, 2025. DOI: https://doi.org/10.36660/abc.20250624.',
    url: 'https://doi.org/10.36660/abc.20250624',
    topics: ['hipertensão', 'pressão arterial', 'crise hipertensiva'],
  },
  {
    id: 'sbc-sca-2021',
    short: 'SBC — Diretriz de Angina Instável e IAM sem supra 2021',
    abnt: 'NICOLAU, J. C. et al. Diretrizes da Sociedade Brasileira de Cardiologia sobre Angina Instável e Infarto Agudo do Miocárdio sem Supradesnível do Segmento ST – 2021. **Arquivos Brasileiros de Cardiologia**, v. 117, n. 1, p. 181-264, 2021. DOI: https://doi.org/10.36660/abc.20210180.',
    url: 'https://doi.org/10.36660/abc.20210180',
    topics: ['dor torácica', 'síndrome coronariana aguda', 'infarto'],
  },
  {
    id: 'acc-aha-sca-2025',
    short: 'ACC/AHA — Síndromes coronarianas agudas 2025',
    abnt: 'RAO, S. V. et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes. **Circulation**, v. 151, n. 13, p. e771-e862, 2025. DOI: https://doi.org/10.1161/CIR.0000000000001309.',
    url: 'https://doi.org/10.1161/CIR.0000000000001309',
    topics: ['dor torácica', 'síndrome coronariana aguda'],
  },
  {
    id: 'esc-sca-2023',
    short: 'ESC — Síndromes coronarianas agudas 2023',
    abnt: 'BYRNE, R. A. et al. 2023 ESC Guidelines for the management of acute coronary syndromes. **European Heart Journal**, v. 44, n. 38, p. 3720-3826, 2023. DOI: https://doi.org/10.1093/eurheartj/ehad191.',
    url: 'https://doi.org/10.1093/eurheartj/ehad191',
    topics: ['dor torácica', 'síndrome coronariana aguda'],
  },
  {
    id: 'aha-dor-toracica-2021',
    short: 'AHA/ACC — Avaliação da dor torácica 2021',
    abnt: 'GULATI, M. et al. 2021 AHA/ACC/ASE/CHEST/SAEM/SCCT/SCMR Guideline for the Evaluation and Diagnosis of Chest Pain. **Journal of Cardiovascular Computed Tomography**, v. 16, n. 1, p. 54-122, 2022. DOI: https://doi.org/10.1016/j.jcct.2021.11.009.',
    url: 'https://doi.org/10.1016/j.jcct.2021.11.009',
    topics: ['dor torácica'],
  },
  {
    id: 'aha-tep-2026',
    short: 'AHA/ACC — Tromboembolismo pulmonar agudo 2026',
    abnt: 'CREAGER, M. A. et al. 2026 AHA/ACC/ACCP/ACEP/CHEST/SCAI/SHM/SIR/SVM/SVN Guideline for the Evaluation and Management of Acute Pulmonary Embolism in Adults. **Circulation**, v. 153, n. 12, p. e977-e1051, 2026. DOI: https://doi.org/10.1161/CIR.0000000000001415.',
    url: 'https://doi.org/10.1161/CIR.0000000000001415',
    topics: ['tromboembolismo pulmonar', 'dispneia', 'dor pleurítica'],
  },
  {
    id: 'esc-sincope-2018',
    short: 'ESC — Síncope 2018 (instruções práticas)',
    abnt: 'BRIGNOLE, M. et al. Practical Instructions for the 2018 ESC Guidelines for the diagnosis and management of syncope. **European Heart Journal**, v. 39, n. 21, p. e43-e80, 2018. DOI: https://doi.org/10.1093/eurheartj/ehy071.',
    url: 'https://doi.org/10.1093/eurheartj/ehy071',
    topics: ['síncope'],
  },
  {
    id: 'esc-fa-2024',
    short: 'ESC — Fibrilação atrial 2024',
    abnt: 'VAN GELDER, I. C. et al. 2024 ESC Guidelines for the management of atrial fibrillation developed in collaboration with the European Association for Cardio-Thoracic Surgery (EACTS). **European Heart Journal**, v. 45, n. 36, p. 3314-3414, 2024. DOI: https://doi.org/10.1093/eurheartj/ehae176.',
    url: 'https://doi.org/10.1093/eurheartj/ehae176',
    topics: ['fibrilação atrial', 'palpitações', 'anticoagulação'],
  },
  {
    id: 'sbc-ic-2018',
    short: 'SBC — Diretriz Brasileira de Insuficiência Cardíaca 2018',
    abnt: 'ROHDE, L. E. P. et al. Diretriz Brasileira de Insuficiência Cardíaca Crônica e Aguda. **Arquivos Brasileiros de Cardiologia**, v. 111, n. 3, p. 436-539, 2018. DOI: https://doi.org/10.5935/abc.20180190.',
    url: 'https://doi.org/10.5935/abc.20180190',
    topics: ['insuficiência cardíaca', 'dispneia', 'edema'],
  },
  {
    id: 'sbc-ic-2021',
    short: 'SBC — Atualização em Insuficiência Cardíaca 2021',
    abnt: 'MARCONDES-BRAGA, F. G. et al. Atualização de Tópicos Emergentes da Diretriz Brasileira de Insuficiência Cardíaca – 2021. **Arquivos Brasileiros de Cardiologia**, v. 116, n. 6, p. 1174-1212, 2021. DOI: https://doi.org/10.36660/abc.20210367.',
    url: 'https://doi.org/10.36660/abc.20210367',
    topics: ['insuficiência cardíaca'],
  },

  // ---------------- Infecção / sepse ----------------
  {
    id: 'ssc-2026',
    short: 'Surviving Sepsis Campaign 2026',
    abnt: 'PRESCOTT, H. C. et al. Surviving Sepsis Campaign: international guidelines for management of sepsis and septic shock 2026. **Intensive Care Medicine**, v. 52, n. 5, p. 863-936, 2026. DOI: https://doi.org/10.1007/s00134-026-08361-1.',
    url: 'https://doi.org/10.1007/s00134-026-08361-1',
    topics: ['sepse', 'choque séptico', 'febre'],
  },
  {
    id: 'ssc-ped-2026',
    short: 'Surviving Sepsis Campaign Pediátrica 2026',
    abnt: 'WEISS, S. L. et al. Surviving Sepsis Campaign International Guidelines for the Management of Sepsis and Septic Shock in Children 2026. **Intensive Care Medicine**, v. 52, n. 5, p. 937-983, 2026. DOI: https://doi.org/10.1007/s00134-026-08360-2.',
    url: 'https://doi.org/10.1007/s00134-026-08360-2',
    topics: ['sepse', 'pediatria'],
  },
  {
    id: 'sepsis3-2016',
    short: 'Sepsis-3 (JAMA 2016)',
    abnt: 'SINGER, M. et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). **JAMA**, v. 315, n. 8, p. 801-810, 2016. DOI: https://doi.org/10.1001/jama.2016.0287.',
    url: 'https://doi.org/10.1001/jama.2016.0287',
    topics: ['sepse', 'qSOFA'],
  },
  {
    id: 'qsofa-2016',
    short: 'Seymour et al. — qSOFA (JAMA 2016)',
    abnt: 'SEYMOUR, C. W. et al. Assessment of Clinical Criteria for Sepsis: For the Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). **JAMA**, v. 315, n. 8, p. 762-774, 2016. DOI: https://doi.org/10.1001/jama.2016.0288.',
    url: 'https://doi.org/10.1001/jama.2016.0288',
    topics: ['sepse', 'qSOFA'],
  },
  {
    id: 'sbpt-pac-2018',
    short: 'SBPT — Pneumonia adquirida na comunidade 2018',
    abnt: 'CORRÊA, R. A. et al. 2018 recommendations for the management of community acquired pneumonia. **Jornal Brasileiro de Pneumologia**, v. 44, n. 5, p. 405-423, 2018. DOI: https://doi.org/10.1590/S1806-37562018000000130.',
    url: 'https://doi.org/10.1590/S1806-37562018000000130',
    topics: ['pneumonia', 'tosse', 'febre', 'CURB-65'],
  },
  {
    id: 'idsa-neutropenia-2011',
    short: 'IDSA — Neutropenia febril',
    abnt: 'FREIFELD, A. G. et al. Clinical practice guideline for the use of antimicrobial agents in neutropenic patients with cancer: 2010 update by the Infectious Diseases Society of America. **Clinical Infectious Diseases**, v. 52, n. 4, p. e56-e93, 2011. DOI: https://doi.org/10.1093/cid/cir073.',
    url: 'https://doi.org/10.1093/cid/cir073',
    topics: ['febre', 'neutropenia febril', 'quimioterapia'],
  },
  {
    id: 'ms-dengue-2024',
    short: 'Ministério da Saúde — Dengue: diagnóstico e manejo clínico (6. ed., 2024)',
    abnt: 'BRASIL. Ministério da Saúde. Secretaria de Vigilância em Saúde e Ambiente. **Dengue**: diagnóstico e manejo clínico: adulto e criança. 6. ed. Brasília, DF: Ministério da Saúde, 2024.',
    topics: ['dengue', 'febre', 'arbovirose'],
  },

  // ---------------- Pneumologia ----------------
  {
    id: 'sbpt-asma-2020',
    short: 'SBPT — Recomendações para o manejo da asma 2020',
    abnt: 'PIZZICHINI, M. M. M. et al. 2020 Brazilian Thoracic Association recommendations for the management of asthma. **Jornal Brasileiro de Pneumologia**, v. 46, n. 1, e20190307, 2020. DOI: https://doi.org/10.1590/1806-3713/e20190307.',
    url: 'https://doi.org/10.1590/1806-3713/e20190307',
    topics: ['asma', 'sibilância', 'dispneia'],
  },

  // ---------------- Neurologia ----------------
  {
    id: 'aha-avc-2026',
    short: 'AHA/ASA — AVC isquêmico agudo 2026',
    abnt: 'PRABHAKARAN, S. et al. 2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke: A Guideline From the American Heart Association/American Stroke Association. **Stroke**, v. 57, n. 8, p. e316-e436, 2026. DOI: https://doi.org/10.1161/STR.0000000000000513.',
    url: 'https://doi.org/10.1161/STR.0000000000000513',
    topics: ['AVC', 'déficit neurológico'],
  },
  {
    id: 'snnoop10-2019',
    short: 'SNNOOP10 — sinais de alarme nas cefaleias',
    abnt: 'DO, T. P. et al. Red and orange flags for secondary headaches in clinical practice: SNNOOP10 list. **Neurology**, v. 92, n. 3, p. 134-144, 2019. DOI: https://doi.org/10.1212/WNL.0000000000006697.',
    url: 'https://doi.org/10.1212/WNL.0000000000006697',
    topics: ['cefaleia'],
  },
  {
    id: 'ottawa-hsa-2013',
    short: 'Regra de Ottawa para HSA (JAMA 2013)',
    abnt: 'PERRY, J. J. et al. Clinical decision rules to rule out subarachnoid hemorrhage for acute headache. **JAMA**, v. 310, n. 12, p. 1248-1255, 2013. DOI: https://doi.org/10.1001/jama.2013.278018.',
    url: 'https://doi.org/10.1001/jama.2013.278018',
    topics: ['cefaleia', 'hemorragia subaracnóidea'],
  },
  {
    id: 'ichd3-2018',
    short: 'ICHD-3 — Classificação internacional das cefaleias',
    abnt: 'HEADACHE CLASSIFICATION COMMITTEE OF THE INTERNATIONAL HEADACHE SOCIETY. The International Classification of Headache Disorders, 3rd edition. **Cephalalgia**, v. 38, n. 1, p. 1-211, 2018.',
    topics: ['cefaleia', 'migrânea'],
  },
  {
    id: 'glasgow-1974',
    short: 'Escala de Coma de Glasgow (Lancet 1974)',
    abnt: 'TEASDALE, G.; JENNETT, B. Assessment of coma and impaired consciousness: a practical scale. **The Lancet**, v. 2, n. 7872, p. 81-84, 1974. DOI: https://doi.org/10.1016/s0140-6736(74)91639-0.',
    url: 'https://doi.org/10.1016/s0140-6736(74)91639-0',
    topics: ['Glasgow', 'nível de consciência'],
  },

  // ---------------- Escores ----------------
  {
    id: 'heart-2008',
    short: 'HEART score (Six et al., 2008)',
    abnt: 'SIX, A. J.; BACKUS, B. E.; KELDER, J. C. Chest pain in the emergency room: value of the HEART score. **Netherlands Heart Journal**, v. 16, n. 6, p. 191-196, 2008.',
    topics: ['dor torácica', 'HEART'],
  },
  {
    id: 'wells-tep-2000',
    short: 'Escore de Wells para TEP (2000)',
    abnt: 'WELLS, P. S. et al. Derivation of a simple clinical model to categorize patients probability of pulmonary embolism: increasing the models utility with the SimpliRED D-dimer. **Thrombosis and Haemostasis**, v. 83, n. 3, p. 416-420, 2000.',
    topics: ['tromboembolismo pulmonar', 'Wells'],
  },
  {
    id: 'wells-tvp-2003',
    short: 'Escore de Wells para TVP (NEJM 2003)',
    abnt: 'WELLS, P. S. et al. Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis. **The New England Journal of Medicine**, v. 349, n. 13, p. 1227-1235, 2003. DOI: https://doi.org/10.1056/NEJMoa023153.',
    url: 'https://doi.org/10.1056/NEJMoa023153',
    topics: ['trombose venosa profunda', 'Wells'],
  },
  {
    id: 'perc-2004',
    short: 'Regra PERC (Kline et al., 2004)',
    abnt: 'KLINE, J. A. et al. Clinical criteria to prevent unnecessary diagnostic testing in emergency department patients with suspected pulmonary embolism. **Journal of Thrombosis and Haemostasis**, v. 2, n. 8, p. 1247-1255, 2004.',
    topics: ['tromboembolismo pulmonar', 'PERC'],
  },
  {
    id: 'curb65-2003',
    short: 'CURB-65 (Lim et al., Thorax 2003)',
    abnt: 'LIM, W. S. et al. Defining community acquired pneumonia severity on presentation to hospital: an international derivation and validation study. **Thorax**, v. 58, n. 5, p. 377-382, 2003. DOI: https://doi.org/10.1136/thorax.58.5.377.',
    url: 'https://doi.org/10.1136/thorax.58.5.377',
    topics: ['pneumonia', 'CURB-65'],
  },
  {
    id: 'cha2ds2vasc-2010',
    short: 'CHA₂DS₂-VASc (Lip et al., Chest 2010)',
    abnt: 'LIP, G. Y. H. et al. Refining clinical risk stratification for predicting stroke and thromboembolism in atrial fibrillation using a novel risk factor-based approach: the Euro Heart Survey on Atrial Fibrillation. **Chest**, v. 137, n. 2, p. 263-272, 2010. DOI: https://doi.org/10.1378/chest.09-1584.',
    url: 'https://doi.org/10.1378/chest.09-1584',
    topics: ['fibrilação atrial', 'CHA2DS2-VASc'],
  },
  {
    id: 'hasbled-2010',
    short: 'HAS-BLED (Pisters et al., Chest 2010)',
    abnt: 'PISTERS, R. et al. A novel user-friendly score (HAS-BLED) to assess 1-year risk of major bleeding in patients with atrial fibrillation: the Euro Heart Survey. **Chest**, v. 138, n. 5, p. 1093-1100, 2010. DOI: https://doi.org/10.1378/chest.10-0134.',
    url: 'https://doi.org/10.1378/chest.10-0134',
    topics: ['fibrilação atrial', 'HAS-BLED', 'sangramento'],
  },
  {
    id: 'alvarado-1986',
    short: 'Escore de Alvarado (1986)',
    abnt: 'ALVARADO, A. A practical score for the early diagnosis of acute appendicitis. **Annals of Emergency Medicine**, v. 15, n. 5, p. 557-564, 1986. DOI: https://doi.org/10.1016/s0196-0644(86)80993-3.',
    url: 'https://doi.org/10.1016/s0196-0644(86)80993-3',
    topics: ['dor abdominal', 'apendicite'],
  },
  {
    id: 'mcisaac-1998',
    short: 'Escore de Centor modificado (McIsaac, 1998)',
    abnt: 'McISAAC, W. J. et al. A clinical score to reduce unnecessary antibiotic use in patients with sore throat. **Canadian Medical Association Journal**, v. 158, n. 1, p. 75-83, 1998.',
    topics: ['faringite', 'dor de garganta'],
  },
  {
    id: 'blatchford-2000',
    short: 'Glasgow-Blatchford (Lancet 2000)',
    abnt: 'BLATCHFORD, O.; MURRAY, W. R.; BLATCHFORD, M. A risk score to predict need for treatment for upper-gastrointestinal haemorrhage. **The Lancet**, v. 356, n. 9238, p. 1318-1321, 2000. DOI: https://doi.org/10.1016/S0140-6736(00)02816-6.',
    url: 'https://doi.org/10.1016/S0140-6736(00)02816-6',
    topics: ['hemorragia digestiva'],
  },
  {
    id: 'addrs-2011',
    short: 'ADD-RS — dissecção de aorta (Circulation 2011)',
    abnt: 'ROGERS, A. M. et al. Sensitivity of the aortic dissection detection risk score, a novel guideline-based tool for identification of acute aortic dissection at initial presentation. **Circulation**, v. 123, n. 20, p. 2213-2218, 2011. DOI: https://doi.org/10.1161/CIRCULATIONAHA.110.988568.',
    url: 'https://doi.org/10.1161/CIRCULATIONAHA.110.988568',
    topics: ['dissecção de aorta', 'dor torácica'],
  },
  {
    id: 'sfsr-2004',
    short: 'San Francisco Syncope Rule (2004)',
    abnt: 'QUINN, J. V. et al. Derivation of the San Francisco Syncope Rule to predict patients with short-term serious outcomes. **Annals of Emergency Medicine**, v. 43, n. 2, p. 224-232, 2004. DOI: https://doi.org/10.1016/s0196-0644(03)00823-0.',
    url: 'https://doi.org/10.1016/s0196-0644(03)00823-0',
    topics: ['síncope'],
  },

  // ---------------- Populações especiais ----------------
  {
    id: 'beers-2023',
    short: 'Critérios de Beers 2023 (AGS)',
    abnt: 'AMERICAN GERIATRICS SOCIETY BEERS CRITERIA UPDATE EXPERT PANEL. American Geriatrics Society 2023 updated AGS Beers Criteria® for potentially inappropriate medication use in older adults. **Journal of the American Geriatrics Society**, v. 71, n. 7, p. 2052-2081, 2023. DOI: https://doi.org/10.1111/jgs.18372.',
    url: 'https://doi.org/10.1111/jgs.18372',
    topics: ['idoso', 'polifarmácia', 'medicamentos inapropriados'],
  },
  {
    id: 'febrasgo-pe-2024',
    short: 'FEBRASGO/RBGO — Pré-eclâmpsia: regra dos 4P (2024)',
    abnt: 'KORKES, H. A. et al. How can we reduce maternal mortality due to preeclampsia? The 4P rule. **Revista Brasileira de Ginecologia e Obstetrícia**, v. 46, e-rbgo43, 2024. DOI: https://doi.org/10.61622/rbgo/2024rbgo43.',
    url: 'https://doi.org/10.61622/rbgo/2024rbgo43',
    topics: ['gestante', 'pré-eclâmpsia'],
  },
  {
    id: 'pals-2020',
    short: 'AHA — Suporte de vida pediátrico 2020 (PALS)',
    abnt: 'TOPJIAN, A. A. et al. Part 4: Pediatric Basic and Advanced Life Support: 2020 American Heart Association Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care. **Circulation**, v. 142, n. 16, suppl. 2, p. S469-S523, 2020.',
    topics: ['pediatria', 'sinais vitais'],
  },
  {
    id: 'nice-lombalgia',
    short: 'NICE NG59 — Lombalgia e ciatalgia',
    abnt: 'NATIONAL INSTITUTE FOR HEALTH AND CARE EXCELLENCE. **Low back pain and sciatica in over 16s**: assessment and management. London: NICE, 2016. (NICE guideline NG59). Atualizado em 2020.',
    url: 'https://www.nice.org.uk/guidance/ng59',
    topics: ['lombalgia'],
  },

  // ---------------- Semiologia (livros-texto) ----------------
  {
    id: 'porto-semiologia',
    short: 'Porto — Semiologia Médica',
    abnt: 'PORTO, C. C.; PORTO, A. L. **Semiologia médica**. 8. ed. Rio de Janeiro: Guanabara Koogan, 2019.',
    topics: ['semiologia', 'anamnese', 'exame físico'],
  },
  {
    id: 'bates',
    short: 'Bates — Propedêutica médica',
    abnt: 'BICKLEY, L. S.; SZILAGYI, P. G.; HOFFMAN, R. M.; SORIANO, R. P. **Bates’ guide to physical examination and history taking**. 13. ed. Philadelphia: Wolters Kluwer, 2021.',
    topics: ['semiologia', 'anamnese', 'exame físico'],
  },
];

export const REFERENCE_BY_ID: Record<string, Reference> = Object.fromEntries(REFERENCES.map((r) => [r.id, r]));

/** Remove os ** de negrito (para copiar a referência como texto puro). */
export function plainAbnt(ref: Reference): string {
  return ref.abnt.replace(/\*\*/g, '');
}
