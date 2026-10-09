import { describe, expect, it } from 'vitest';
import { makeCase } from './helpers';
import { TEMPLATES, suggestTemplate } from '../src/clinical/templates';
import { TEMPLATE_IDS } from '../shared/ai/schemas';
import { SYMPTOMS } from '../src/clinical/symptoms';
import { buildContext } from '../src/clinical/context';
import { evaluateRedFlags } from '../src/clinical/redFlags';
import { generateNote } from '../src/clinical/narrative';
import { REFERENCE_BY_ID } from '../shared/references';

const flagIds = (patch: Parameters<typeof makeCase>[0], opts?: Parameters<typeof makeCase>[1]) => {
  const { enc, patient } = makeCase(patch, opts);
  return evaluateRedFlags(buildContext(enc, patient)).map((f) => f.id);
};

describe('biblioteca de templates', () => {
  it('cobre todas as queixas do contrato da IA', () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it('IDs de pergunta únicos em cada template, sintomas e referências existentes', () => {
    const symptomIds = new Set(SYMPTOMS.map((s) => s.value));
    for (const t of TEMPLATES) {
      // Seções condicionais mutuamente exclusivas podem reutilizar IDs (ex.: "outra": com/sem dor);
      // o que não pode é repetir dentro da mesma seção ou colidir com uma seção sempre visível.
      const always = t.sections.filter((s) => !s.showIf).flatMap((s) => s.questions.map((q) => q.id));
      expect(new Set(always).size, `IDs repetidos em ${t.id}`).toBe(always.length);
      for (const sec of t.sections.filter((s) => s.showIf)) {
        const ids = sec.questions.map((q) => q.id);
        expect(new Set(ids).size, `IDs repetidos em ${t.id}/${sec.id}`).toBe(ids.length);
        ids.forEach((id) => expect(always.includes(id), `${t.id}/${sec.id}: ${id} colide com seção fixa`).toBe(false));
      }
      for (const q of t.sections.flatMap((s) => s.questions)) {
        if (q.type === 'symptoms') q.options?.forEach((o) => expect(symptomIds.has(o.value), `${t.id}: sintoma ${o.value}`).toBe(true));
        if (q.symptom) expect(symptomIds.has(q.symptom), `${t.id}: ${q.symptom}`).toBe(true);
        q.why?.refs?.forEach((r) => expect(REFERENCE_BY_ID[r], `${t.id}/${q.id}: referência ${r}`).toBeDefined());
      }
    }
  });

  it('sugere o template certo pela queixa', () => {
    expect(suggestTemplate('Tosse com catarro há 1 mês')?.id).toBe('tosse');
    expect(suggestTemplate('diarreia com sangue')?.id).toBe('diarreia');
    expect(suggestTemplate('coração disparado')?.id).toBe('palpitacoes');
    expect(suggestTemplate('tontura, tudo gira')?.id).toBe('tontura');
    expect(suggestTemplate('pernas inchadas')?.id).toBe('edema');
    expect(suggestTemplate('ardência para urinar')?.id).toBe('disuria');
    expect(suggestTemplate('boca torta e fala enrolada')?.id).toBe('deficit_neurologico');
  });
});

describe('red flags das queixas novas', () => {
  it('tontura com diplopia → possível AVC de fossa posterior (crítico)', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'tontura';
      e.answers.ton_central = { diplopia: 'sim' };
    });
    const f = evaluateRedFlags(buildContext(enc, patient)).find((x) => x.id === 'vertigem_central');
    expect(f?.severity).toBe('critico');
  });

  it('síndrome vestibular aguda sem sinais centrais → lembrar do HINTS', () => {
    expect(flagIds((e) => ((e.templateId = 'tontura'), (e.answers.ton_padrao = 'aguda_continua')))).toContain('vertigem_central');
  });

  it('tosse ≥ 3 semanas → investigar tuberculose', () => {
    expect(
      flagIds((e) => {
        e.templateId = 'tosse';
        e.complaint = { text: 'Tosse', duration: 4, durationUnit: 'semanas' };
      }),
    ).toContain('tuberculose');
  });

  it('disúria com febre → pielonefrite; palpitação ao esforço → alto risco', () => {
    expect(flagIds((e) => ((e.templateId = 'disuria'), (e.symptoms.febre = 'sim')))).toContain('pielonefrite');
    expect(flagIds((e) => ((e.templateId = 'palpitacoes'), (e.answers.pal_gatilho = ['esforco'])))).toContain('arritmia');
  });

  it('diarreia sem conseguir beber → desidratação grave; edema de lábios → angioedema', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'diarreia';
      e.answers.dia_desidratacao = { nao_bebe: 'sim' };
    });
    expect(evaluateRedFlags(buildContext(enc, patient)).find((x) => x.id === 'diarreia_grave')?.severity).toBe('critico');
    expect(flagIds((e) => ((e.templateId = 'edema'), (e.answers.ede_local = ['labios_lingua'])))).toContain('angioedema');
  });

  it('déficit neurológico sem horário → pede a última vez visto bem', () => {
    expect(flagIds((e) => ((e.templateId = 'deficit_neurologico'), (e.symptoms.deficit_motor = 'sim')))).toEqual(expect.arrayContaining(['avc', 'avc_tempo']));
    expect(flagIds((e) => ((e.templateId = 'deficit_neurologico'), (e.answers.dn_lkw = 'hoje 07h30')))).not.toContain('avc_tempo');
  });
});

describe('texto do prontuário com os templates novos', () => {
  it('gera a HDA com as respostas dos ramos', () => {
    const { enc, patient } = makeCase((e) => {
      e.templateId = 'tosse';
      e.complaint = { text: 'Tosse', duration: 10, durationUnit: 'semanas' };
      e.answers.tos_tipo = 'produtiva';
      e.answers.tos_escarro = ['purulento'];
      e.answers.tc_ieca = 'sim';
    });
    const note = generateNote(enc, patient);
    expect(note).toContain('produtiva');
    expect(note).toContain('purulenta');
    expect(note).toContain('Em uso de IECA');
  });
});
