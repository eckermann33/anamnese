import { describe, expect, it } from 'vitest';
import { makeCase } from './helpers';
import { OsceCase } from '../shared/ai/schemas';
import { CASE_LIBRARY } from '../src/features/training/cases';
import { averageScore } from '../src/features/training/common';
import { buildContext } from '../src/clinical/context';
import { buildSearchIndex, searchEntries } from '../src/features/encounter/search';
import { STEPS } from '../src/features/encounter/steps';

describe('Treino OSCE', () => {
  it('casos da biblioteca seguem o mesmo formato do caso gerado pela IA', () => {
    for (const c of CASE_LIBRARY) {
      const r = OsceCase.safeParse(c.data);
      expect(r.success, `${c.id}: ${r.success ? '' : r.error.issues[0]?.message}`).toBe(true);
      // o título não pode entregar o diagnóstico
      expect(c.data.title.toLowerCase()).not.toContain(c.data.diagnosis.split(/[ —(]/)[0].toLowerCase());
    }
    expect(new Set(CASE_LIBRARY.map((c) => c.id)).size).toBe(CASE_LIBRARY.length);
  });

  it('nota média dos 5 domínios (limitada a 0–10)', () => {
    const fb = { domainScores: { hda: 8, isda: 6, antecedentes: 7, exameFisico: 5, raciocinio: 14 } };
    expect(averageScore({ feedback: fb as never })).toBeCloseTo(7.2);
    expect(averageScore({})).toBeUndefined();
  });
});

describe('busca rápida no atendimento', () => {
  const steps = STEPS.map((s) => s.id);

  it('acha perguntas de outras etapas pelo nome', () => {
    const { enc, patient } = makeCase((e) => (e.templateId = 'dor_toracica'));
    const index = buildSearchIndex(enc, buildContext(enc, patient), steps);
    const tab = searchEntries(index, 'tabagismo');
    expect(tab[0]?.step).toBe('habitos');
    expect(searchEntries(index, 'alergia')[0]).toMatchObject({ step: 'ap', anchor: 'ap-alergias' });
    expect(searchEntries(index, 'irradiação').some((r) => r.step === 'hda')).toBe(true);
    expect(searchEntries(index, 'ausculta').some((r) => r.step === 'exame')).toBe(true);
    expect(searchEntries(index, 'xyzabc')).toEqual([]);
  });

  it('respeita as etapas visíveis', () => {
    const { enc, patient } = makeCase(() => {});
    const index = buildSearchIndex(enc, buildContext(enc, patient), ['hda', 'isda']);
    expect(index.every((e) => e.step === 'hda' || e.step === 'isda')).toBe(true);
  });
});
