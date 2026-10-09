import { useState } from 'react';
import { Eye, EyeOff, LayoutList } from 'lucide-react';
import { useEncounter } from '../EncounterContext';
import { QuestionSectionView } from '../../../components/clinical/QuestionSectionView';
import { Timeline } from '../../../components/clinical/Timeline';
import { Button } from '../../../components/ui/Button';
import { defaultShowExtra } from '../../../clinical/context';
import { symptomText } from '../../../clinical/symptoms';
import { capitalize } from '../../../lib/format';
import { Link, useParams } from 'react-router-dom';

/** Etapa 5 — HDA guiada e ramificada pelo template da queixa. */
export function HdaStep() {
  const { enc, update, ctx } = useEncounter();
  const { id } = useParams();
  const [showExtra, setShowExtra] = useState(() => defaultShowExtra(enc));
  const t = ctx.template;
  const presentSymptoms = Object.entries(enc.symptoms)
    .filter(([, s]) => s === 'sim')
    .map(([k]) => capitalize(symptomText(k)));

  return (
    <div className="stack gap-4">
      <div className="page-pad row between gap-2">
        <div className="stack">
          <span className="t-footnote c-secondary">Template</span>
          <strong className="t-headline">{t.name}</strong>
        </div>
        <Link to={`/atendimento/${id}/qp`} className="btn btn-plain btn-sm">
          <LayoutList size={16} aria-hidden="true" /> Trocar
        </Link>
      </div>

      {t.sections.map((s) => (
        <div key={s.id} className={s.branch ? 'page-pad' : undefined}>
          <QuestionSectionView section={s} showExtra={showExtra} />
        </div>
      ))}

      <div className="page-pad">
        <Button variant="gray" size="sm" icon={showExtra ? EyeOff : Eye} onClick={() => setShowExtra((v) => !v)}>
          {showExtra ? 'Ocultar perguntas complementares' : 'Mostrar perguntas complementares'}
        </Button>
      </div>

      <section className="qsection">
        <h2 className="qsection-title">Linha do tempo</h2>
        <div className="qsection-card">
          <Timeline
            events={enc.timeline}
            onChange={(events) => update((d) => void (d.timeline = events))}
            complaint={enc.complaint}
            suggestions={presentSymptoms}
          />
        </div>
      </section>
    </div>
  );
}
