import { describe, expect, it } from 'vitest';
import { makeCase } from './helpers';
import { buildContext } from '../src/clinical/context';
import { evaluateRedFlags } from '../src/clinical/redFlags';
import { computeScore, SCORE_BY_ID, applicableScores } from '../src/clinical/scores';
import { medicationAlerts, identifyDrug } from '../src/clinical/drugs';
import { classifyVital, bmi, bmiClass } from '../src/clinical/vitals';
import { packYears, gestationalAge } from '../src/clinical/historySections';
import { generateNote } from '../src/clinical/narrative';
import { suggestTemplate } from '../src/clinical/templates';
import { suggestSystemsLocally } from '../src/clinical/systems';
import { parseNumber } from '../src/lib/format';
import { TEMPLATES } from '../src/clinical/templates';
import { symptomOptions } from '../src/clinical/symptoms';

describe('cálculos básicos', () => {
  it('anos-maço', () => {
    expect(packYears(20, 30)).toBe(30);
    expect(packYears(10, 20)).toBe(10);
    expect(packYears(undefined, 20)).toBeUndefined();
  });

  it('idade gestacional pela DUM (Naegele)', () => {
    const ga = gestationalAge('2026-01-01', new Date(2026, 2, 12)); // 70 dias
    expect(ga?.weeks).toBe(10);
    expect(ga?.days).toBe(0);
    expect(ga?.dpp.getMonth()).toBe(9); // outubro
  });

  it('IMC aceita altura em m ou cm', () => {
    expect(bmi(80, 1.75)).toBeCloseTo(26.1, 1);
    expect(bmi(80, 175)).toBeCloseTo(26.1, 1);
    expect(bmiClass(26.1, 40).label).toBe('sobrepeso');
    expect(bmiClass(21, 70).label).toBe('baixo peso (idoso)');
  });

  it('números no padrão brasileiro', () => {
    expect(parseNumber('36,8')).toBe(36.8);
    expect(parseNumber('12.300')).toBe(12300);
    expect(parseNumber('1.75')).toBe(1.75);
    expect(parseNumber('')).toBeUndefined();
  });
});

describe('sinais vitais', () => {
  const adult = { ageYears: 40, profile: 'adulto' as const };
  it('classifica adulto', () => {
    expect(classifyVital('pas', 85, adult)?.tone).toBe('red');
    expect(classifyVital('pas', 120, adult)?.tone).toBe('green');
    expect(classifyVital('fr', 24, adult)?.tone).toBe('orange');
    expect(classifyVital('spo2', 88, adult)?.tone).toBe('red');
    expect(classifyVital('glicemia', 60, adult)?.tone).toBe('red');
    expect(classifyVital('temp', 38.2, adult)?.tone).toBe('orange');
  });
  it('usa faixas pediátricas', () => {
    const baby = { ageYears: 0.5, profile: 'pediatria' as const };
    expect(classifyVital('fc', 150, baby)?.tone).toBe('green');
    expect(classifyVital('fr', 45, baby)?.tone).toBe('green');
    expect(classifyVital('fc', 150, adult)?.tone).toBe('red');
  });
});

describe('templates', () => {
  it('sugere template pela queixa', () => {
    expect(suggestTemplate('dor no peito há 2 horas')?.id).toBe('dor_toracica');
    expect(suggestTemplate('Falta de ar')?.id).toBe('dispneia');
    expect(suggestTemplate('dor de cabeça forte')?.id).toBe('cefaleia');
    expect(suggestTemplate('desmaiou no trabalho')?.id).toBe('sincope');
  });
  it('sugere sistemas offline', () => {
    expect(suggestSystemsLocally('dor no peito e falta de ar')[0]).toBe('cardiovascular');
  });
  it('todos os sintomas dos templates existem no catálogo e IDs são únicos por seção', () => {
    for (const t of TEMPLATES) {
      const ids = new Set<string>();
      for (const s of t.sections) {
        for (const q of s.questions) {
          if (q.type === 'symptoms') expect(() => symptomOptions((q.options ?? []).map((o) => o.value))).not.toThrow();
          const key = `${s.id}:${q.id}`;
          expect(ids.has(key)).toBe(false);
          ids.add(key);
        }
      }
    }
  });
});

describe('red flags', () => {
  it('dor torácica típica → SCA', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'dor_toracica';
      e.answers.carater = ['aperto'];
      e.answers.piora = ['esforco'];
      e.answers.dt_tipica = ['retroesternal', 'esforco', 'alivio'];
      e.symptoms.sudorese = 'sim';
    });
    const flags = evaluateRedFlags(buildContext(enc, patient));
    expect(flags.map((f) => f.id)).toContain('sca');
    expect(flags.find((f) => f.id === 'sca')?.severity).toBe('critico');
  });

  it('déficit neurológico súbito → AVC', () => {
    const { enc, patient } = makeCase((e) => {
      e.symptoms.deficit_motor = 'sim';
    });
    expect(evaluateRedFlags(buildContext(enc, patient)).map((f) => f.id)).toContain('avc');
  });

  it('febre + qSOFA ≥ 2 → sepse', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'febre';
      e.symptoms.febre = 'sim';
      e.exam.vitals = { fr: 26, pas: 95, temp: 38.9 };
    });
    const ids = evaluateRedFlags(buildContext(enc, patient)).map((f) => f.id);
    expect(ids).toContain('sepse');
  });

  it('cefaleia em trovoada → HSA', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'cefaleia';
      e.answers.inicio = 'thunderclap';
    });
    expect(evaluateRedFlags(buildContext(enc, patient)).map((f) => f.id)).toContain('hsa');
  });

  it('hipoglicemia', () => {
    const { enc, patient } = makeCase((e) => {
      e.exam.vitals.glicemia = 52;
    });
    expect(evaluateRedFlags(buildContext(enc, patient))[0].id).toBe('hipoglicemia');
  });

  it('caso sem alterações não dispara alertas', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'lombalgia';
      e.answers.lom_ritmo = 'mecanico';
      e.exam.vitals = { pas: 120, pad: 80, fc: 76, fr: 16, temp: 36.5, spo2: 98 };
    });
    expect(evaluateRedFlags(buildContext(enc, patient))).toHaveLength(0);
  });
});

describe('escores', () => {
  it('CURB-65 com preenchimento automático (CRB-65 sem ureia)', () => {
    const { enc, patient } = makeCase(
      (e) => {
        e.exam.vitals = { fr: 32, pas: 85, pad: 50 };
        e.symptoms.confusao = 'sim';
      },
      { age: 70 },
    );
    const r = computeScore(SCORE_BY_ID.curb65, buildContext(enc, patient));
    expect(r.total).toBe(4);
    expect(r.missing).toHaveLength(1); // ureia
    expect(r.interpretation.text).toMatch(/CRB-65 = 4/);
  });

  it('Wells TEP soma itens e respeita entrada manual', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'dispneia';
      e.answers.tev_fr = ['cirurgia_imob'];
      e.answers.tep_alternativo = 'nao';
      e.exam.vitals.fc = 110;
      e.symptoms.hemoptise = 'nao';
      e.symptoms.edema_unilateral = 'nao';
      e.scoreInputs.wells_tep = { cancer: 1 };
    });
    const r = computeScore(SCORE_BY_ID.wells_tep, buildContext(enc, patient));
    expect(r.total).toBe(3 + 1.5 + 1.5 + 1);
    expect(r.interpretation.tone).toBe('red');
  });

  it('HEART parcial a partir da anamnese', () => {
    const { enc, patient } = makeCase(
      (e) => {
        e.templateId = 'dor_toracica';
        e.answers.dt_tipica = ['retroesternal', 'esforco', 'alivio'];
        e.answers.fr_cv = ['has', 'dm', 'tabagismo'];
      },
      { age: 66 },
    );
    const ctx = buildContext(enc, patient);
    const r = computeScore(SCORE_BY_ID.heart, ctx);
    expect(r.total).toBe(6);
    expect(r.missing).toEqual(['ECG', 'Troponina']);
    expect(applicableScores(ctx).map((s) => s.id)).toContain('heart');
  });

  it('CHA2DS2-VASc e VA', () => {
    const { enc, patient } = makeCase(
      (e) => {
        e.history.diseases = ['fa', 'has', 'dm2'];
      },
      { age: 70, sex: 'F' },
    );
    const r = computeScore(SCORE_BY_ID.cha2ds2vasc, buildContext(enc, patient));
    expect(r.total).toBe(4); // HAS + DM + 65–74 + sexo
    expect(r.interpretation.text).toMatch(/VA 3/);
  });
});

describe('medicações', () => {
  it('reconhece nomes comerciais', () => {
    expect(identifyDrug('Xarelto 20mg')?.id).toBe('rivaroxabana');
    expect(identifyDrug('puran t4 50mcg')?.id).toBe('levotiroxina');
    expect(identifyDrug('AAS 100mg')?.id).toBe('aas');
  });

  it('alergia a penicilina + amoxicilina = grave; + cefalexina = cruzada', () => {
    const alerts = medicationAlerts({
      medications: [
        { id: '1', name: 'Amoxicilina 500mg' },
        { id: '2', name: 'Cefalexina' },
      ],
      allergies: [{ id: 'a', substance: 'Penicilina', reaction: 'urticária' }],
      profile: 'adulto',
    });
    expect(alerts.some((a) => a.kind === 'alergia' && a.severity === 'grave' && a.drugs.includes('Amoxicilina'))).toBe(true);
    expect(alerts.some((a) => a.title.includes('penicilina × cefalosporina'))).toBe(true);
  });

  it('interações graves', () => {
    const alerts = medicationAlerts({
      medications: [
        { id: '1', name: 'Isordil' },
        { id: '2', name: 'Viagra' },
        { id: '3', name: 'Marevan' },
        { id: '4', name: 'Ibuprofeno' },
      ],
      allergies: [],
      profile: 'adulto',
    });
    const titles = alerts.map((a) => a.title);
    expect(titles).toContain('Nitrato + inibidor da PDE-5');
    expect(titles).toContain('Anticoagulante + AINE/AAS');
  });

  it('QT, Beers e gestação', () => {
    const qt = medicationAlerts({
      medications: [
        { id: '1', name: 'Azitromicina' },
        { id: '2', name: 'Ondansetrona' },
        { id: '3', name: 'Clonazepam' },
      ],
      allergies: [],
      profile: 'idoso',
      ageYears: 80,
    });
    expect(qt.some((a) => a.title === 'Prolongamento do intervalo QT')).toBe(true);
    expect(qt.some((a) => a.kind === 'idoso')).toBe(true);
    const preg = medicationAlerts({ medications: [{ id: '1', name: 'Losartana 50mg' }], allergies: [], profile: 'gestante' });
    expect(preg[0].kind).toBe('gestacao');
  });
});

describe('texto do prontuário', () => {
  it('monta HDA em prosa e ISDA sem repetir sintomas', () => {
    const { enc, patient } = makeCase((e, p) => {
      p.occupation = 'Motorista';
      e.complaint = { text: 'Dor no peito', duration: 2, durationUnit: 'horas' };
      e.templateId = 'dor_toracica';
      e.answers.inicio = 'subito';
      e.answers.localizacao = { location: ['torax_retroesternal'], radiation: ['mse_braco', 'mandibula'] };
      e.answers.carater = ['aperto'];
      e.answers.intensidade = 8;
      e.symptoms.sudorese = 'sim';
      e.symptoms.dispneia = 'nao';
      e.symptoms.febre = 'nao';
      e.exam.vitals = { pas: 150, pad: 90, fc: 98 };
      e.exam.systems.cardiovascular = { normal: true, findings: [] };
    });
    const note = generateNote(enc, patient);
    expect(note).toContain('QP: Dor no peito há 2 horas.');
    expect(note).toContain('Dor de início súbito, localizada em região retroesternal, com irradiação para braço esquerdo e mandíbula, em aperto, de intensidade 8/10.');
    expect(note).toContain('Associa-se a sudorese.');
    expect(note).toMatch(/Nega dispneia/);
    expect(note).toContain('ACV: Ritmo cardíaco regular em 2 tempos');
    expect(note).toContain('PA 150x90 mmHg');
    // anonimizado para a IA
    expect(generateNote(enc, patient, { anonymize: true })).not.toContain('J.S.');
  });
});
