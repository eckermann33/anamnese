import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { TextArea, NumberField } from '../../../components/ui/TextField';
import { ChipSelect } from '../../../components/ui/Chip';
import { useEncounter } from '../EncounterContext';
import { suggestTemplate, TEMPLATES } from '../../../clinical/templates';
import type { DurationUnit } from '../../../clinical/types';

const UNITS: DurationUnit[] = ['minutos', 'horas', 'dias', 'semanas', 'meses', 'anos'];

/** Etapa 3 — Queixa principal (nas palavras do paciente) + duração. */
export function QpStep() {
  const { enc, update } = useEncounter();
  const suggestion = useMemo(() => suggestTemplate(enc.complaint.text), [enc.complaint.text]);

  return (
    <div className="stack gap-6 page-pad">
      <section className="card stack gap-4">
        <TextArea
          label="Queixa principal — nas palavras do paciente"
          value={enc.complaint.text}
          onChange={(v) => update((d) => void (d.complaint.text = v))}
          placeholder="Ex.: “dor no peito”"
          rows={2}
          autoFocus={!enc.complaint.text}
        />
        <div className="field">
          <span className="field-label">Há quanto tempo?</span>
          <div className="stack gap-2">
            <NumberField
              value={enc.complaint.duration}
              onChange={(n) => update((d) => void (d.complaint.duration = n))}
              ariaLabel="Duração da queixa"
              decimals={1}
              placeholder="0"
              className="field-narrow"
            />
            <ChipSelect
              small
              ariaLabel="Unidade de tempo"
              options={UNITS.map((u) => ({ value: u, label: u }))}
              value={enc.complaint.durationUnit}
              onChange={(u) => update((d) => void (d.complaint.durationUnit = (u as DurationUnit) ?? 'dias'))}
            />
          </div>
        </div>
      </section>

      {suggestion && suggestion.id !== enc.templateId && (
        <button type="button" className="suggest-card" onClick={() => update((d) => void (d.templateId = suggestion.id))}>
          <Sparkles size={20} aria-hidden="true" />
          <span className="grow">
            <strong>Usar o template “{suggestion.name}”</strong>
            <span className="t-footnote c-secondary" style={{ display: 'block' }}>
              {suggestion.description}
            </span>
          </span>
        </button>
      )}

      <section>
        <h2 className="step-subtitle">Template de anamnese</h2>
        <p className="step-help">Define as perguntas e ramificações da HDA. Pode trocar a qualquer momento.</p>
        <ChipSelect
          ariaLabel="Template"
          options={TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
          value={enc.templateId}
          onChange={(v) => update((d) => void (d.templateId = (v as string) ?? undefined))}
        />
      </section>
    </div>
  );
}
