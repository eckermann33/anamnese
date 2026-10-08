import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { makeCase } from './helpers';
import { buildContext } from '../src/clinical/context';
import { buildDictationSpecs, selectDictationFields } from '../src/features/encounter/dictation';
import { DictationInput } from '../shared/ai/schemas';
import { buildSystemPrompt, buildUserPrompt } from '../server/prompts';

function setup() {
  const { enc, patient } = makeCase((e) => {
    e.templateId = 'dor_toracica';
    e.complaint = { text: 'Dor no peito', duration: 2, durationUnit: 'horas' };
  });
  return { enc, patient, specs: buildDictationSpecs(buildContext(enc, patient)) };
}

describe('ditado → campos', () => {
  it('lista de campos válida, sem IDs repetidos e enxuta (cabe na cota gratuita da Groq)', () => {
    const { specs } = setup();
    const ids = specs.map((s) => s.field.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const transcript of ['dor no peito em aperto há 2 horas, irradia para o braço, nega febre', 'ao exame: lúcido, corado, ausculta com crepitantes em base direita, abdome flácido']) {
      const fields = selectDictationFields(specs, transcript);
      const req = { task: 'dictation' as const, mode: 'plantao' as const, input: { transcript, fields } };
      expect(DictationInput.safeParse(req.input).success).toBe(true);
      const chars = buildSystemPrompt('dictation', 'plantao').length + buildUserPrompt(req).length;
      // ~3,5 caracteres por token em português → < 7.000 tokens
      expect(chars, `pedido com ${fields.length} campos`).toBeLessThan(24_500);
    }
    // sem palavras de exame, os campos de exame não vão
    expect(selectDictationFields(specs, 'dor no peito há 2 horas').some((f) => f.id.startsWith('ef_geral'))).toBe(false);
  });

  it('aplica só valores válidos', () => {
    const { enc, specs } = setup();
    const byId = Object.fromEntries(specs.map((s) => [s.field.id, s]));
    const results: boolean[] = [];
    const next = produce(enc, (d) => {
      results.push(byId.sintomas.apply(d, 'dispneia:sim|febre:nao|inventado:sim'));
      results.push(byId.carater.apply(d, 'aperto|nao_existe'));
      results.push(byId.sv_pas.apply(d, '150'));
      results.push(byId.sv_fc.apply(d, '900')); // fora da faixa → ignorado
      results.push(byId.ap_medicacoes.apply(d, 'Losartana, 50 mg, 12/12h; AAS, 100 mg, 1x ao dia'));
      results.push(byId.ap_alergias.apply(d, 'Dipirona - urticária'));
      results.push(byId.qp_unidade.apply(d, 'decadas'));
    });
    expect(results).toEqual([true, true, true, false, true, true, false]);
    expect(next.symptoms).toMatchObject({ dispneia: 'sim', febre: 'nao' });
    expect(next.symptoms.inventado).toBeUndefined();
    expect(next.answers.carater).toEqual(['aperto']);
    expect(next.exam.vitals.pas).toBe(150);
    expect(next.exam.vitals.fc).toBeUndefined();
    expect(next.history.medications.map((m) => [m.name, m.dose, m.posology])).toEqual([
      ['Losartana', '50 mg', '12/12h'],
      ['AAS', '100 mg', '1x ao dia'],
    ]);
    expect(next.history.allergies[0]).toMatchObject({ substance: 'Dipirona', reaction: 'urticária' });
    expect(byId.sintomas.display('dispneia:sim|febre:nao')).toBe('Falta de ar: presente; Febre: nega');
  });
});
