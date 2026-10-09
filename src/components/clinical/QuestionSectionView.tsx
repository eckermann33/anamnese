import { useCallback } from 'react';
import { CornerDownRight, Info } from 'lucide-react';
import type { AnswerValue, QuestionSection } from '../../clinical/types';
import { isQuestionVisible, isSectionVisible } from '../../clinical/context';
import { useEncounter } from '../../features/encounter/EncounterContext';
import { QuestionView } from './QuestionView';

/* Renderiza uma seção de perguntas (ou um RAMO aberto por uma resposta). */

interface Props {
  section: QuestionSection;
  showExtra: boolean;
  /** Título exibido como cabeçalho de lista (seções não-ramo). */
  showTitle?: boolean;
}

export function QuestionSectionView({ section, showExtra, showTitle = true }: Props) {
  const { enc, update, ctx } = useEncounter();
  const student = enc.config.mode === 'estudante';

  const setAnswer = useCallback(
    (id: string, v: AnswerValue | undefined, symptom?: string) =>
      update((d) => {
        if (symptom) {
          if (v === undefined) delete d.symptoms[symptom];
          else d.symptoms[symptom] = v as 'sim' | 'nao';
          return;
        }
        if (v === undefined) delete d.answers[id];
        else d.answers[id] = v as never;
      }),
    [update],
  );

  const setNote = useCallback(
    (id: string, text: string) =>
      update((d) => {
        if (text) d.notes[id] = text;
        else delete d.notes[id];
      }),
    [update],
  );

  const setSymptoms = useCallback(
    (patch: Record<string, 'sim' | 'nao' | undefined>) =>
      update((d) => {
        for (const [k, v] of Object.entries(patch)) {
          if (v) d.symptoms[k] = v;
          else delete d.symptoms[k];
        }
      }),
    [update],
  );

  if (!isSectionVisible(section, ctx)) return null;
  const questions = section.questions.filter((q) => isQuestionVisible(q, ctx, showExtra));
  if (!questions.length) return null;

  const body = (
    <>
      {student && section.note && (
        <div className="branch-note">
          <Info size={16} aria-hidden="true" />
          <span>{section.note}</span>
        </div>
      )}
      {questions.map((q) => (
        <QuestionView
          key={q.id}
          q={q}
          value={q.type === 'yesno' && q.symptom ? enc.symptoms[q.symptom] : enc.answers[q.id]}
          onChange={(v) => setAnswer(q.id, v, q.type === 'yesno' ? q.symptom : undefined)}
          note={enc.notes[q.id]}
          onNote={(t) => setNote(q.id, t)}
          symptoms={enc.symptoms}
          onSymptoms={setSymptoms}
          student={student}
          ctx={ctx}
        />
      ))}
    </>
  );

  if (section.branch) {
    return (
      <section className="branch" data-tone={section.branch.tone ?? 'accent'} aria-label={section.title}>
        <div className="branch-head">
          <CornerDownRight size={18} aria-hidden="true" className="branch-icon" />
          <div className="stack">
            <span className="branch-title">{section.title}</span>
            <span className="branch-reason">{section.branch.reason(ctx)}</span>
          </div>
        </div>
        {body}
      </section>
    );
  }

  return (
    <section className="qsection" aria-label={section.title}>
      {showTitle && section.title && !(questions.length === 1 && questions[0].label === section.title) && (
        <h2 className="qsection-title">{section.title}</h2>
      )}
      <div className="qsection-card">{body}</div>
    </section>
  );
}
