import type { Encounter, Evolution, Patient } from '../../db/types';
import { vitalSeries } from '../../clinical/evolution';
import { classifyVital, VITAL_META, type VitalKey } from '../../clinical/vitals';
import { ageInYears } from '../../clinical/context';
import { Sparkline } from '../../components/clinical/Sparkline';
import { formatNumber, formatShortDate } from '../../lib/format';

/* Tendência dos sinais vitais ao longo da internação (anamnese + evoluções). */

const KEYS: VitalKey[] = ['pas', 'fc', 'fr', 'temp', 'spo2', 'glicemia'];

export function TrendsCard({ evolutions, base, patient }: { evolutions: Evolution[]; base?: Encounter; patient: Patient }) {
  const series = vitalSeries(evolutions, base);
  const keys = KEYS.filter((k) => series[k]?.length);
  if (!keys.length) return null;
  const ctx = { ageYears: ageInYears(patient.age, patient.ageUnit), profile: base?.config.profile ?? 'adulto' };

  return (
    <section className="section" aria-labelledby="trends-title">
      <h2 id="trends-title" className="section-title">
        Sinais vitais
      </h2>
      <div className="page-pad trend-grid">
        {keys.map((k) => {
          const pts = series[k]!;
          const last = pts[pts.length - 1];
          const meta = VITAL_META[k];
          const tone = classifyVital(k, last.value, ctx)?.tone;
          const label = `${meta.short}: ${pts.map((p) => `${formatShortDate(p.date)} ${formatNumber(p.value, meta.decimals)}`).join('; ')}`;
          return (
            <div key={k} className="trend-tile" data-tone={tone}>
              <div className="row between">
                <span className="trend-label">{meta.short}</span>
                <span className="dot" data-tone={tone} aria-hidden="true" />
              </div>
              <div className="trend-value">
                {formatNumber(last.value, meta.decimals)}
                <span className="trend-unit">{meta.unit}</span>
              </div>
              <Sparkline values={pts.map((p) => p.value)} tone={tone} label={label} />
              <span className="trend-date">
                {pts.length > 1 ? `${pts.length} registros · último ${formatShortDate(last.date)}` : formatShortDate(last.date)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
