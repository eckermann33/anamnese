import { Lightbulb, Target } from 'lucide-react';
import type { Why } from '../../clinical/types';
import { Sheet } from '../ui/Sheet';
import { ReferenceList } from './References';

/** Sheet "Por que perguntar?" (Modo Estudante). */
export function WhySheet({ open, onClose, question, why }: { open: boolean; onClose: () => void; question: string; why?: Why }) {
  return (
    <Sheet open={open} onClose={onClose} title="Por que perguntar?" subtitle={question}>
      {why && (
        <div className="stack gap-3">
          <div className="card">
            <div className="row gap-2 card-title">
              <Lightbulb size={18} className="c-accent" aria-hidden="true" /> Raciocínio
            </div>
            <p className="t-body mt-2">{why.reason}</p>
          </div>
          <div className="card">
            <div className="row gap-2 card-title">
              <Target size={18} className="c-accent" aria-hidden="true" /> O que a resposta muda
            </div>
            <p className="t-body mt-2">{why.impact}</p>
          </div>
          {why.refs?.length ? (
            <div className="card">
              <div className="card-title">Referências</div>
              <div className="mt-2">
                <ReferenceList ids={why.refs} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
