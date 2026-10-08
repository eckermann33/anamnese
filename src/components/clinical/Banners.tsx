import { useState } from 'react';
import { AlertTriangle, ChevronRight, Pill, Siren } from 'lucide-react';
import type { RedFlag } from '../../clinical/redFlags';
import type { Allergy } from '../../db/types';
import { Sheet } from '../ui/Sheet';
import { ReferenceList } from './References';

/** Banner vermelho FIXO no topo quando há red flags. Toque abre a conduta. */
export function RedFlagBanner({ flags }: { flags: RedFlag[] }) {
  const [open, setOpen] = useState(false);
  if (!flags.length) return null;
  const top = flags[0];
  const critical = top.severity === 'critico';
  return (
    <>
      <button
        type="button"
        className={`banner ${critical ? 'banner-redflag' : 'banner-attention'}`}
        onClick={() => setOpen(true)}
        aria-label={`Red flag: ${top.title}. Toque para ver a conduta inicial.`}
      >
        <Siren size={22} aria-hidden="true" />
        <span className="banner-body">
          <span className="banner-title">{top.title}</span>
          <span className="banner-text" style={{ display: 'block' }}>
            {flags.length > 1 ? `+${flags.length - 1} alerta(s) · ` : ''}Toque para ver a conduta inicial
          </span>
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Red flags" subtitle="Conduta inicial sugerida — confirme com o protocolo local">
        <div className="stack gap-3">
          {flags.map((f) => (
            <RedFlagCard key={f.id} flag={f} />
          ))}
        </div>
      </Sheet>
    </>
  );
}

export function RedFlagCard({ flag }: { flag: RedFlag }) {
  return (
    <article className="card redflag-card" data-severity={flag.severity}>
      <div className="row gap-2">
        <span className="tag" data-tone={flag.severity === 'critico' ? 'red' : 'orange'}>
          {flag.severity === 'critico' ? 'Crítico' : 'Atenção'}
        </span>
      </div>
      <h3 className="card-title mt-2">{flag.title}</h3>
      {flag.criteria.length > 0 && (
        <p className="t-subhead c-secondary mt-2">
          <strong>Por quê:</strong> {flag.criteria.join(' · ')}
        </p>
      )}
      <ol className="conduct-list mt-3">
        {flag.conduct.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ol>
      {flag.refs?.length ? (
        <details className="disclosure mt-2">
          <summary>
            <ChevronRight size={16} className="disclosure-chevron" aria-hidden="true" /> Referências
          </summary>
          <ReferenceList ids={flag.refs} />
        </details>
      ) : null}
    </article>
  );
}

/** Destaque permanente das alergias no topo do paciente. */
export function AllergyBanner({ allergies, noKnown }: { allergies: Allergy[]; noKnown: boolean }) {
  if (!allergies.length) {
    if (!noKnown) return null;
    return (
      <div className="banner banner-neutral allergy-none" role="note">
        <Pill size={16} aria-hidden="true" />
        <span className="banner-body t-footnote">Nega alergias conhecidas</span>
      </div>
    );
  }
  return (
    <div className="banner banner-allergy" role="note" aria-label="Alergias">
      <AlertTriangle size={18} aria-hidden="true" />
      <span className="banner-body">
        Alergia: {allergies.map((a) => a.substance + (a.severity === 'grave' ? ' (grave)' : '')).join(', ')}
      </span>
    </div>
  );
}
