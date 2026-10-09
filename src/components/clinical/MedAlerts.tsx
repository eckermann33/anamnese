import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import type { MedAlert } from '../../clinical/drugs';
import { ReferenceList } from './References';

const KIND_LABEL: Record<MedAlert['kind'], string> = {
  alergia: 'Alergia',
  interacao: 'Interação',
  gestacao: 'Gestação',
  idoso: 'Idoso',
  duplicidade: 'Duplicidade',
};

/** Lista de alertas de medicação (alergia cruzada, interações, Beers, gestação). */
export function MedAlertList({ alerts }: { alerts: MedAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="stack gap-2">
      {alerts.map((a) => {
        const Icon = a.severity === 'grave' ? AlertOctagon : a.severity === 'moderada' ? AlertTriangle : Info;
        return (
          <article key={a.id} className="med-alert" data-severity={a.severity}>
            <Icon size={20} aria-hidden="true" className="med-alert-icon" />
            <div className="grow">
              <div className="row gap-2 wrap">
                <span className="tag" data-tone={a.severity === 'grave' ? 'red' : a.severity === 'moderada' ? 'orange' : undefined}>
                  {KIND_LABEL[a.kind]}
                </span>
                <strong className="t-subhead">{a.title}</strong>
              </div>
              <p className="t-footnote mt-2">{a.detail}</p>
              {a.conduct && (
                <p className="t-footnote mt-2">
                  <strong>Conduta:</strong> {a.conduct}
                </p>
              )}
              {a.refs?.length ? (
                <div className="mt-2 t-footnote">
                  <ReferenceList ids={a.refs} />
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
      <p className="t-caption c-secondary">
        Base local com as interações mais frequentes e graves — não substitui a consulta a bulário/protocolo.
      </p>
    </div>
  );
}
