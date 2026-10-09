import { Copy, ExternalLink } from 'lucide-react';
import { Fragment } from 'react';
import { REFERENCE_BY_ID, plainAbnt, type Reference } from '../../../shared/references';
import { copyText } from '../../lib/share';
import { useToast } from '../ui/Overlays';

/** Renderiza o texto ABNT com o título do periódico em negrito (**…**). */
export function AbntText({ text }: { text: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

/** Lista de referências (ABNT) com botão de copiar. */
export function ReferenceList({ ids, extra = [] }: { ids: string[]; extra?: string[] }) {
  const toast = useToast();
  const refs = [...new Set(ids)].map((id) => REFERENCE_BY_ID[id]).filter((r): r is Reference => !!r);
  if (!refs.length && !extra.length) return null;
  const all = [...refs.map(plainAbnt), ...extra];
  return (
    <div className="refs">
      <ol className="refs-list">
        {refs.map((r) => (
          <li key={r.id}>
            <AbntText text={r.abnt} />
            {r.url && (
              <a href={r.url} target="_blank" rel="noreferrer" className="refs-link" aria-label={`Abrir ${r.short}`}>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
        {extra.map((e, i) => (
          <li key={`x${i}`}>{e}</li>
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-plain btn-sm"
        onClick={async () => {
          const ok = await copyText(all.join('\n\n'));
          toast(ok ? 'Referências copiadas (ABNT)' : 'Não foi possível copiar', ok ? 'success' : 'error');
        }}
      >
        <Copy size={16} aria-hidden="true" /> Copiar em ABNT
      </button>
    </div>
  );
}
