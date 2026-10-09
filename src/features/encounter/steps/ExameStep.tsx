import { ChevronRight } from 'lucide-react';
import { useEncounter } from '../EncounterContext';
import { VitalsForm } from '../../../components/clinical/VitalsForm';
import { ExamSystemCard } from '../../../components/clinical/ExamSystemCard';
import { NumberField } from '../../../components/ui/TextField';
import { EXAM_BY_ID, EXAM_SYSTEMS } from '../../../clinical/exam';
import { bmi, bmiClass } from '../../../clinical/vitals';
import { formatNumber } from '../../../lib/format';
import type { ExamSectionId } from '../../../db/types';

/** Etapa 11 — Exame físico guiado. */
export function ExameStep() {
  const { enc, update, ctx } = useEncounter();
  const exam = enc.exam;
  const b = bmi(exam.weight, exam.height);
  const bc = b ? bmiClass(b, ctx.ageYears) : undefined;

  // Ordem: ectoscopia → sistemas priorizados → (gestante: GO) → psiquiátrico se escolhido.
  const prioritized: ExamSectionId[] = ['geral', ...enc.systems];
  if (enc.config.profile === 'gestante' && !prioritized.includes('ginecologico')) prioritized.push('ginecologico');
  const main = prioritized.map((id) => EXAM_BY_ID[id]).filter(Boolean);
  const others = EXAM_SYSTEMS.filter((s) => !prioritized.includes(s.id));

  const card = (id: ExamSectionId) => (
    <ExamSystemCard
      key={id}
      def={EXAM_BY_ID[id]}
      enc={enc}
      state={exam.systems[id]}
      onChange={(s) =>
        update((d) => {
          if (s) d.exam.systems[id] = s;
          else delete d.exam.systems[id];
        })
      }
      glasgow={exam.glasgow}
      onGlasgow={(g) => update((d) => void (d.exam.glasgow = g))}
    />
  );

  return (
    <div className="stack gap-4">
      <section className="qsection" id="exame-vitais">
        <h2 className="qsection-title">Sinais vitais</h2>
        <div className="page-pad">
          <VitalsForm
            value={exam.vitals}
            onChange={(v) => update((d) => void (d.exam.vitals = v))}
            ageYears={ctx.ageYears}
            profile={enc.config.profile}
          />
        </div>
      </section>

      <section className="qsection" id="exame-antropometria">
        <h2 className="qsection-title">Antropometria</h2>
        <div className="qsection-card">
          <div className="row gap-3 wrap">
            <NumberField label="Peso" unit="kg" value={exam.weight} onChange={(n) => update((d) => void (d.exam.weight = n))} className="grow" />
            <NumberField label="Altura" unit="m" decimals={2} value={exam.height} onChange={(n) => update((d) => void (d.exam.height = n))} className="grow" />
          </div>
          {b && bc && (
            <div className="computed mt-3" data-tone={bc.tone}>
              IMC {formatNumber(b, 1)} kg/m² — {bc.label}
            </div>
          )}
        </div>
      </section>

      <section className="qsection">
        <h2 className="qsection-title">Exame por sistema</h2>
        <div className="page-pad stack gap-3">{main.map((s) => card(s.id))}</div>
      </section>

      <details className="disclosure page-pad">
        <summary>
          <ChevronRight size={18} className="disclosure-chevron" aria-hidden="true" /> Outros sistemas ({others.length})
        </summary>
        <div className="stack gap-3 mt-2">{others.map((s) => card(s.id))}</div>
      </details>
    </div>
  );
}
