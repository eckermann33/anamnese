import { describe, expect, it } from 'vitest';
import { makeCase } from './helpers';
import { newEvolution } from '../src/db/factories';
import type { LabPanel } from '../src/db/types';
import { parseLabsLocal, buildLabTable, labsLine, findDate, localFlag, analyteKey } from '../src/clinical/labs';
import {
  antibioticDue,
  antibioticLabel,
  dayCount,
  deviceLabel,
  evolveFrom,
  evolutionText,
  fluidSummary,
  hospitalDay,
  sbarLocal,
  sbarCaseText,
  vitalSeries,
} from '../src/clinical/evolution';

const value = (list: ReturnType<typeof parseLabsLocal>, name: string) => list.find((v) => v.analyte === name)?.value;

describe('exames: leitor local', () => {
  it('lê o formato "sigla valor" com milhar, vírgula decimal e "mil"', () => {
    const r = parseLabsLocal('Hb 10,2 / Ht 31 / Leuco 12.300 (bast 2%) / Plaq 210 mil / Ur 45 / Cr 1,4 / Na 138 / K 4,2', 'M');
    expect(value(r, 'Hemoglobina')).toBe(10.2);
    expect(value(r, 'Hematócrito')).toBe(31);
    expect(value(r, 'Leucócitos')).toBe(12300);
    expect(value(r, 'Bastões')).toBe(2);
    expect(value(r, 'Plaquetas')).toBe(210000);
    expect(value(r, 'Creatinina')).toBe(1.4);
    expect(value(r, 'Sódio')).toBe(138);
    expect(value(r, 'Potássio')).toBe(4.2);
  });

  it('aceita nomes por extenso, acentos e separadores', () => {
    const r = parseLabsLocal('Hemoglobina: 9.8 g/dL\nCreatinina = 2,10 mg/dL\nPotássio..... 6,8 mEq/L\nCálcio iônico 1,05\npH 7,28 pCO2 30 HCO3 14 BE -9,5');
    expect(value(r, 'Hemoglobina')).toBe(9.8);
    expect(value(r, 'Creatinina')).toBe(2.1);
    expect(value(r, 'Potássio')).toBe(6.8);
    expect(value(r, 'Cálcio iônico')).toBe(1.05);
    expect(value(r, 'Cálcio total')).toBeUndefined();
    expect(value(r, 'pH')).toBe(7.28);
    expect(value(r, 'Excesso de bases')).toBe(-9.5);
    expect(r.find((v) => v.analyte === 'Potássio')?.flag).toBe('critico');
  });

  it('leucócitos "em mil" e marcações do laudo', () => {
    const r = parseLabsLocal('Leuco 18,5 ↑  PCR 12 (H)  Plaq 15');
    expect(value(r, 'Leucócitos')).toBe(18500);
    expect(r.find((v) => v.analyte === 'Leucócitos')?.flag).toBe('alto');
    expect(r.find((v) => v.analyte === 'PCR')?.flag).toBe('alto');
    expect(value(r, 'Plaquetas')).toBe(15000);
    expect(r.find((v) => v.analyte === 'Plaquetas')?.flag).toBe('critico');
  });

  it('não confunde palavras comuns com exames', () => {
    const r = parseLabsLocal('coletado na 2ª amostra; Na 141');
    expect(value(r, 'Sódio')).toBe(141);
    expect(parseLabsLocal('pressão alta, paciente bem').length).toBe(0);
  });

  it('faixa por sexo e data no texto', () => {
    expect(localFlag('Hemoglobina', 12.5, 'F')).toBeNull();
    expect(localFlag('Hemoglobina', 12.5, 'M')).toBe('baixo');
    expect(findDate('Exames de 07/10/2026: Hb 10')).toBe('2026-10-07');
    expect(findDate('coleta 3/9', '2026-10-08')).toBe('2026-09-03');
    expect(findDate('sem data', '2026-10-08')).toBe('2026-10-08');
    expect(analyteKey('Creatinina sérica')).toBe('cr');
  });
});

describe('exames: comparação entre dias', () => {
  const panels: LabPanel[] = [
    { id: 'a', date: '2026-10-05', source: 'local', values: [{ analyte: 'Creatinina', value: 1.1, raw: 'Cr 1,1' }, { analyte: 'Hemoglobina', value: 11, raw: 'Hb 11' }] },
    { id: 'b', date: '2026-10-07', source: 'ia', values: [{ analyte: 'Creatinina', value: 1.4, raw: 'Cr 1,4' }, { analyte: 'Hemoglobina', value: 10.2, raw: 'Hb 10,2' }, { analyte: 'Sódio', value: 138, raw: 'Na 138' }] },
  ];

  it('tabela com setas em relação ao resultado anterior', () => {
    const t = buildLabTable(panels);
    expect(t.columns.map((c) => c.id)).toEqual(['b', 'a']);
    const cr = t.rows.find((r) => r.key === 'cr')!;
    expect(cr.cells[0]?.trend).toBe('up');
    expect(cr.cells[1]?.trend).toBeUndefined();
    expect(t.rows.find((r) => r.key === 'hb')!.cells[0]?.trend).toBe('down');
    // ordem do catálogo: hemograma antes de função renal
    expect(t.rows[0].key).toBe('hb');
  });

  it('linha resumida para a evolução', () => {
    const l = labsLine(panels, '2026-10-08')!;
    expect(l.date).toBe('2026-10-07');
    expect(l.text).toContain('Cr 1,4 (1,1 ↑)');
    expect(l.text).toContain('Hb 10,2 (11 ↓)');
    expect(labsLine(panels, '2026-10-06')!.date).toBe('2026-10-05');
  });
});

describe('evolução: contagem de dias e balanço', () => {
  it('D1 = dia de início', () => {
    expect(dayCount('2026-10-01', '2026-10-01')).toBe(1);
    expect(dayCount('2026-10-01', '2026-10-05')).toBe(5);
    expect(dayCount('2026-10-01', '2026-09-30')).toBeUndefined();
    expect(dayCount('2026-10-01', '2026-10-10', '2026-10-07')).toBe(7);
    expect(hospitalDay({ admissionDate: '2026-10-04' }, '2026-10-08')).toBe(5);
  });

  it('rótulos de dispositivo e antimicrobiano', () => {
    expect(deviceLabel({ id: '1', type: 'CVC', site: 'jugular interna D', insertedAt: '2026-10-06' }, '2026-10-08')).toBe('CVC (jugular interna D) — D3');
    expect(antibioticLabel({ id: '1', name: 'Ceftriaxona', startedAt: '2026-10-05', plannedDays: 7, indication: 'PAC' }, '2026-10-08')).toBe('Ceftriaxona D4/7 (PAC)');
    expect(antibioticDue({ id: '1', name: 'Ceftriaxona', startedAt: '2026-10-02', plannedDays: 7 }, '2026-10-08')).toBe(true);
    expect(antibioticDue({ id: '1', name: 'Ceftriaxona', startedAt: '2026-10-05', plannedDays: 7 }, '2026-10-08')).toBe(false);
  });

  it('balanço hídrico e débito urinário (KDIGO < 0,5 mL/kg/h)', () => {
    const s = fluidSummary({ intake: { oral: 1000, venosa: 1000 }, output: { diurese: 600, drenos: 100 }, hours: 24 }, 70)!;
    expect(s.intake).toBe(2000);
    expect(s.output).toBe(700);
    expect(s.balance).toBe(1300);
    expect(s.urineRate).toBeCloseTo(0.357, 2);
    expect(s.oliguria).toBe(true);
    expect(fluidSummary({ intake: {}, output: {}, hours: 24 }, 70)).toBeNull();
  });
});

describe('evolução: texto, evoluir de ontem e SBAR', () => {
  function setup() {
    const { enc, patient } = makeCase((e, p) => {
      e.status = 'concluido';
      e.complaint.text = 'Febre e tosse';
      e.manualHypotheses = ['Pneumonia adquirida na comunidade'];
      e.history.diseases = ['has'];
      e.history.allergies = [{ id: 'a', substance: 'Dipirona', reaction: 'urticária' }];
      e.exam.weight = 70;
      p.bed = '12';
      p.admissionDate = '2026-10-04';
      p.problems = [
        { id: 'p1', title: 'PAC', status: 'ativo', since: '2026-10-04' },
        { id: 'p2', title: 'Hipocalemia', status: 'resolvido' },
      ];
      p.devices = [{ id: 'd1', type: 'AVP', site: 'MSE', insertedAt: '2026-10-06' }];
      p.antibiotics = [{ id: 'x1', name: 'Ceftriaxona', startedAt: '2026-10-04', plannedDays: 7, indication: 'PAC' }];
      p.labs = [{ id: 'l1', date: '2026-10-07', source: 'local', values: [{ analyte: 'Leucócitos', value: 12300, raw: 'Leuco 12.300' }] }];
    });
    const yesterday = newEvolution(patient.id, '2026-10-07');
    yesterday.subjectiveChips = ['aceita_dieta'];
    yesterday.subjective = 'Tosse menos frequente';
    yesterday.vitals = { pas: 120, pad: 80, fc: 88, temp: 37.8 };
    yesterday.examText = 'MV presente com crepitantes em base direita';
    yesterday.assessment = 'Melhora clínica';
    yesterday.plan = 'Manter ceftriaxona';
    yesterday.todos = [
      { id: 't1', text: 'Ver hemocultura', done: false },
      { id: 't2', text: 'Raio X', done: true },
    ];
    return { enc, patient, yesterday };
  }

  it('evoluir a partir de ontem copia textos e pendências abertas, não os vitais', () => {
    const { patient, yesterday } = setup();
    let n = 0;
    const today = evolveFrom(yesterday, newEvolution(patient.id, '2026-10-08'), () => `novo-${++n}`);
    expect(today.examText).toBe(yesterday.examText);
    expect(today.vitals).toEqual({});
    expect(today.todos.map((t) => t.text)).toEqual(['Ver hemocultura']);
    expect(today.todos[0].id).toBe('novo-1');
    expect(today.carriedOver).toEqual(['subjective', 'examText', 'assessment', 'plan', 'todos']);
  });

  it('texto SOAP com dias, alergia, dispositivos, antimicrobianos e exames', () => {
    const { enc, patient, yesterday } = setup();
    const evo = { ...yesterday, date: '2026-10-08', fluid: { intake: { venosa: 1500 }, output: { diurese: 1680 }, hours: 24 } };
    const t = evolutionText({ evo, patient, base: enc, evolutions: [] });
    expect(t).toContain('EVOLUÇÃO — 08/10/2026 — D5 de internação');
    expect(t).toContain('J.S.');
    expect(t).toContain('Leito 12');
    expect(t).toContain('ALERGIAS: Dipirona (urticária).');
    expect(t).toContain('S: Aceitando bem a dieta. Tosse menos frequente.');
    expect(t).toContain('PA 120x80 mmHg');
    expect(t).toContain('Débito urinário 1 mL/kg/h');
    expect(t).toContain('AVP (MSE) — D3');
    expect(t).toContain('Ceftriaxona D5/7 (PAC)');
    expect(t).toContain('Exames (07/10): Leuco 12.300');
    expect(t).toContain('1. PAC (desde 04/10)');
    expect(t).toContain('Resolvidos: Hipocalemia.');
    expect(t).toContain('- [ ] Ver hemocultura');
    const anon = evolutionText({ evo, patient, base: enc, anonymize: true });
    expect(anon).not.toContain('J.S.');
    expect(anon).not.toContain('Leito 12');
  });

  it('SBAR local e texto anonimizado para a IA', () => {
    const { enc, patient, yesterday } = setup();
    const sbar = sbarLocal({ patient, base: enc, evolutions: [yesterday], date: '2026-10-08' });
    expect(sbar.situation).toContain('D5 de internação');
    expect(sbar.situation).toContain('pneumonia adquirida na comunidade');
    expect(sbar.background).toContain('Comorbidades: HAS');
    expect(sbar.background).toContain('Dipirona');
    expect(sbar.assessment).toContain('FC 88 bpm');
    expect(sbar.recommendation).toContain('Ver hemocultura');
    const ai = sbarCaseText({ patient, base: enc, evolutions: [yesterday], date: '2026-10-08' });
    expect(ai).not.toContain('J.S.');
    expect(ai).not.toMatch(/leito 12/i);
  });

  it('séries de sinais vitais para os gráficos', () => {
    const { enc, patient, yesterday } = setup();
    enc.exam.vitals = { fc: 110 };
    const today = { ...newEvolution(patient.id, '2026-10-08'), vitals: { fc: 80 } };
    const s = vitalSeries([today, yesterday], enc);
    expect(s.fc?.map((p) => p.value)).toEqual([110, 88, 80]);
    expect(s.spo2).toBeUndefined();
  });
});
