import { useMemo } from 'react';
import { CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { useEncounter } from './EncounterContext';
import { buildSearchIndex, searchEntries, type SearchEntry } from './search';
import type { StepId } from '../../db/types';

const SUGGESTIONS = ['tabagismo', 'alergia', 'febre', 'vacina', 'irradiação', 'medicações', 'pressão', 'família'];

/**
 * Busca rápida dentro do menu de etapas: digite e toque no resultado para
 * ir direto à pergunta. Com o campo vazio, o menu mostra as etapas.
 */
export function StepSearch({ q, setQ, steps, onGo }: { q: string; setQ: (q: string) => void; steps: StepId[]; onGo: (e: SearchEntry) => void }) {
  const { enc, ctx } = useEncounter();
  const index = useMemo(() => buildSearchIndex(enc, ctx, steps), [enc, ctx, steps]);
  const results = useMemo(() => searchEntries(index, q), [index, q]);

  return (
    <div className="stack gap-3">
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pergunta (ex.: tabagismo, vacina)" aria-label="Buscar pergunta no atendimento" enterKeyHint="search" />
      </label>

      {!q.trim() && (
        <div className="chip-group" aria-label="Sugestões de busca">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip chip-sm" onClick={() => setQ(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {q.trim() && !results.length && <p className="t-subhead c-secondary">Nada encontrado para “{q}”.</p>}

      {results.length > 0 && (
        <ul className="list-group search-results" aria-label="Resultados da busca">
          {results.map((r, i) => (
            <li key={`${r.step}-${r.anchor ?? r.title}-${i}`}>
              <button type="button" className="list-row" onClick={() => onGo(r)}>
                <span className="list-row-body">
                  <span className="list-row-title">{r.title}</span>
                  <span className="list-row-subtitle">{r.context}</span>
                </span>
                {r.answered && <CheckCircle2 size={18} className="c-green" aria-label="já respondida" />}
                <ChevronRight size={18} className="list-row-chevron" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
