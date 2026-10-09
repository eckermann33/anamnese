import { useState } from 'react';
import { ChevronRight, GitBranch } from 'lucide-react';
import { Page } from '../../components/ui/Page';
import { TEMPLATES } from '../../clinical/templates';
import { SYSTEM_BY_ID } from '../../clinical/systems';
import { Sheet } from '../../components/ui/Sheet';
import type { ComplaintTemplate } from '../../clinical/types';

/** Biblioteca de templates por queixa (consulta). */
export function TemplatesPage() {
  const [open, setOpen] = useState<ComplaintTemplate | null>(null);
  return (
    <Page title="Templates" subtitle="Anamnese ramificada por queixa" back={{ to: '/atender', label: 'Atender' }}>
      <div className="page-pad stack gap-3">
        {TEMPLATES.map((t) => {
          const branches = t.sections.filter((s) => s.branch);
          return (
            <button key={t.id} type="button" className="template-card" onClick={() => setOpen(t)}>
              <div className="stack gap-1 grow">
                <strong className="t-headline">{t.name}</strong>
                <span className="t-footnote c-secondary">{t.description}</span>
                <div className="chip-group mt-2">
                  {t.systems.slice(0, 4).map((s) => (
                    <span key={s} className="tag">
                      {SYSTEM_BY_ID[s].short}
                    </span>
                  ))}
                  {branches.length > 0 && (
                    <span className="tag" data-tone="accent">
                      <GitBranch size={12} aria-hidden="true" /> {branches.length} ramos
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="c-secondary" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name} subtitle={open?.description}>
        {open && (
          <div className="stack gap-3">
            {open.sections.map((s) => (
              <div key={s.id} className="card">
                <div className="row gap-2">
                  {s.branch && <GitBranch size={16} className="c-accent" aria-hidden="true" />}
                  <strong>{s.title ?? 'Perguntas'}</strong>
                </div>
                <ul className="template-qs">
                  {s.questions.map((q) => (
                    <li key={q.id}>{q.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </Page>
  );
}
