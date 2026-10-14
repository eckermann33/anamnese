import { describe, expect, it } from 'vitest';
import { maskIdentity, scrubNotice, scrubPII } from '../src/lib/scrubPII';

describe('limpeza de identificação (LGPD)', () => {
  const laudo = [
    'HOSPITAL MUNICIPAL — LABORATÓRIO',
    'Paciente: JOAO ANTONIO DA SILVA    Idade: 58a',
    'Prontuário: 1234567',
    'Data de nasc.: 01/02/1968',
    'CPF: 123.456.789-09',
    'Mãe: MARIA DA SILVA',
    'Médico solicitante: Dr. Fulano CRM 12345',
    'Coleta: 14/10/2026 06:00',
    'Hemoglobina 9,6 g/dL (12,0 - 16,0)',
    'Plaquetas 150.000 /mm³',
    'Troponina 0.012 ng/mL',
    'Creatinina 1,8 mg/dL',
    'Contato 11987654321',
  ].join('\n');

  it('remove linhas com rótulo de identificação e mantém os valores de exame', () => {
    const r = scrubPII(laudo);
    expect(r.text).not.toMatch(/JOAO|MARIA|1234567|123\.456|1968|Fulano|11987654321/);
    expect(r.text).toMatch(/Hemoglobina 9,6 g\/dL \(12,0 - 16,0\)/);
    expect(r.text).toMatch(/Plaquetas 150\.000/);
    expect(r.text).toMatch(/Troponina 0\.012/);
    expect(r.text).toMatch(/Coleta: 14\/10\/2026/);
    expect(r.removedLines).toBe(6);
    expect(r.masked).toBe(1);
    expect(scrubNotice(r)).toMatch(/6 linhas.*1 número/);
  });

  it('em texto livre (labels: false) só mascara números de documento/telefone', () => {
    const r = scrubPII('Paciente: refere dor há 2 dias. CPF 123.456.789-09. Tel (11) 98765-4321.', { labels: false });
    expect(r.text).toBe('Paciente: refere dor há 2 dias. CPF [removido]. Tel [removido].');
    expect(scrubNotice({ removedLines: 0, masked: 0 })).toBeNull();
  });

  it('mascara iniciais e leito para a IA e restaura na resposta', () => {
    const note = 'ID: JAS, 58 anos, sexo masculino. Leito 12B.\nHDA: jas refere dor.';
    const m = maskIdentity(note, { initials: 'JAS', bed: '12B' });
    expect(m.text).toBe('ID: [INICIAIS], 58 anos, sexo masculino. Leito [LEITO].\nHDA: [INICIAIS] refere dor.');
    expect(m.restore('ID: [INICIAIS]. Leito [LEITO].')).toBe('ID: JAS. Leito 12B.');
    expect(m.intact('ID: [INICIAIS]. Leito [LEITO].')).toBe(true);
    expect(m.intact('ID: paciente.')).toBe(false);
  });
});
