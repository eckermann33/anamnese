import { memo, useState } from 'react';
import { CircleHelp, PencilLine } from 'lucide-react';
import type { AnswerValue, BodyMapValue, DurationValue, Question, QuestionContext, TriMap } from '../../clinical/types';
import { Chip, ChipSelect, TriStateChips } from '../ui/Chip';
import { NumberField, TextArea } from '../ui/TextField';
import { ScaleSlider } from '../ui/Slider';
import { Button } from '../ui/Button';
import { BodyMap } from './BodyMap';
import { WhySheet } from './WhySheet';

/* ==========================================================================
   UMA PERGUNTA DA ANAMNESE
   Todo tipo aceita seleção rápida E texto livre (botão "Observação").
   ========================================================================== */

const DURATION_UNITS: DurationValue['unit'][] = ['minutos', 'horas', 'dias', 'semanas', 'meses', 'anos'];

interface QuestionViewProps {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue | undefined) => void;
  note?: string;
  onNote: (text: string) => void;
  /** Para perguntas do tipo "symptoms": mapa global de sintomas. */
  symptoms?: TriMap;
  onSymptoms?: (patch: Record<string, 'sim' | 'nao' | undefined>) => void;
  student: boolean;
  ctx: QuestionContext;
}

function QuestionViewImpl({ q, value, onChange, note, onNote, symptoms, onSymptoms, student, ctx }: QuestionViewProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!note);
  const computed = q.computed?.(ctx) ?? null;

  let control: React.ReactNode = null;
  switch (q.type) {
    case 'single':
    case 'multi':
      control = (
        <ChipSelect
          ariaLabel={q.label}
          options={q.options ?? []}
          value={value as string | string[] | undefined}
          multiple={q.type === 'multi'}
          onChange={(v) => onChange(v as AnswerValue | undefined)}
        />
      );
      break;
    case 'yesno':
      control = (
        <div className="chip-group" role="group" aria-label={q.label}>
          <Chip selected={value === 'sim'} onClick={() => onChange(value === 'sim' ? undefined : 'sim')}>
            Sim
          </Chip>
          <Chip selected={value === 'nao'} onClick={() => onChange(value === 'nao' ? undefined : 'nao')}>
            Não
          </Chip>
        </div>
      );
      break;
    case 'tri':
      control = <TriStateChips ariaLabel={q.label} options={q.options ?? []} value={value as TriMap | undefined} onChange={(v) => onChange(v)} />;
      break;
    case 'symptoms': {
      const opts = q.options ?? [];
      const sub: TriMap = {};
      for (const o of opts) if (symptoms?.[o.value]) sub[o.value] = symptoms[o.value];
      const unset = opts.filter((o) => !symptoms?.[o.value]);
      control = (
        <div className="stack gap-3">
          <TriStateChips
            ariaLabel={q.label}
            options={opts}
            value={sub}
            onChange={(next) => {
              const patch: Record<string, 'sim' | 'nao' | undefined> = {};
              for (const o of opts) patch[o.value] = next?.[o.value];
              onSymptoms?.(patch);
            }}
          />
          {unset.length > 0 && (
            <div>
              <Button
                variant="gray"
                size="sm"
                onClick={() => onSymptoms?.(Object.fromEntries(unset.map((o) => [o.value, 'nao' as const])))}
              >
                Nega os demais ({unset.length})
              </Button>
            </div>
          )}
        </div>
      );
      break;
    }
    case 'scale':
      control = <ScaleSlider value={value as number | undefined} onChange={(v) => onChange(v)} min={q.min ?? 0} max={q.max ?? 10} label={q.label} />;
      break;
    case 'number':
      control = (
        <NumberField
          value={value as number | undefined}
          onChange={(v) => onChange(v)}
          unit={q.unit}
          min={q.min}
          max={q.max}
          ariaLabel={q.label}
          className="field-narrow"
        />
      );
      break;
    case 'text':
      control = <TextArea value={value as string | undefined} onChange={(v) => onChange(v || undefined)} placeholder={q.placeholder ?? 'Digite…'} rows={2} aria-label={q.label} />;
      break;
    case 'date':
      control = (
        <input
          type="date"
          className="input field-narrow"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          aria-label={q.label}
        />
      );
      break;
    case 'duration': {
      const d = (value as DurationValue | undefined) ?? { unit: 'dias' as const };
      control = (
        <div className="stack gap-2">
          <NumberField value={d.value} onChange={(n) => onChange(n === undefined ? undefined : { ...d, value: n })} ariaLabel={q.label} className="field-narrow" />
          <ChipSelect
            small
            options={DURATION_UNITS.map((u) => ({ value: u, label: u }))}
            value={d.unit}
            onChange={(u) => onChange({ ...d, unit: (u as DurationValue['unit']) ?? 'dias' })}
          />
        </div>
      );
      break;
    }
    case 'bodymap':
      control = <BodyMap value={value as BodyMapValue | undefined} onChange={(v) => onChange(v)} view={q.bodyView} />;
      break;
  }

  return (
    <div className="question" id={`q-${q.id}`} data-question={q.id}>
      <div className="question-head">
        <div className="question-label">
          {q.label}
          {q.hint && <div className="question-hint">{q.hint}</div>}
        </div>
        {student && q.why && (
          <button type="button" className="why-button" aria-label={`Por que perguntar: ${q.label}`} onClick={() => setWhyOpen(true)}>
            <CircleHelp size={22} strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}
      </div>
      {control}
      {computed && (
        <div className="computed" data-tone={computed.tone ?? 'accent'} role="status">
          {computed.text}
        </div>
      )}
      {q.type !== 'text' &&
        (noteOpen ? (
          <TextArea
            className="question-note-toggle"
            value={note}
            onChange={onNote}
            placeholder="Observação em texto livre…"
            rows={1}
            aria-label={`Observação: ${q.label}`}
          />
        ) : (
          <button type="button" className="btn btn-plain btn-sm question-note-toggle" onClick={() => setNoteOpen(true)}>
            <PencilLine size={16} aria-hidden="true" /> Observação
          </button>
        ))}
      {student && q.why && <WhySheet open={whyOpen} onClose={() => setWhyOpen(false)} question={q.label} why={q.why} />}
    </div>
  );
}

export const QuestionView = memo(QuestionViewImpl);
