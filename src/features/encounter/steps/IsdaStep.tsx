import { useMemo } from 'react';
import { CheckCheck } from 'lucide-react';
import { useEncounter } from '../EncounterContext';
import { TriStateChips } from '../../../components/ui/Chip';
import { TextArea } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import { ISDA_GROUP_LABEL, ISDA_ORDER } from '../../../clinical/systems';
import { symptomsOfGroup } from '../../../clinical/symptoms';
import type { IsdaGroupId, TriMap } from '../../../clinical/types';

/** Etapa 6 — ISDA por sistema, com "Nega demais sintomas deste sistema". */
export function IsdaStep() {
  const { enc, update } = useEncounter();

  // Sistemas priorizados primeiro, depois a ordem tradicional.
  const order = useMemo<IsdaGroupId[]>(() => {
    const first: IsdaGroupId[] = ['geral', ...enc.systems];
    const rest = ISDA_ORDER.filter((g) => !first.includes(g));
    const profileHidesGo = enc.config.profile === 'pediatria';
    return [...first, ...rest].filter((g) => !(profileHidesGo && g === 'ginecologico'));
  }, [enc.systems, enc.config.profile]);

  return (
    <div className="stack gap-4 page-pad">
      <p className="step-help">1 toque = presente · 2 toques = nega · 3 toques = limpa. Sintomas marcados na HDA já aparecem aqui.</p>
      {order.map((group) => {
        const syms = symptomsOfGroup(group);
        const sub: TriMap = {};
        for (const s of syms) if (enc.symptoms[s.value]) sub[s.value] = enc.symptoms[s.value];
        const unset = syms.filter((s) => !enc.symptoms[s.value]);
        const positives = syms.filter((s) => enc.symptoms[s.value] === 'sim').length;
        const done = unset.length === 0;
        return (
          <section key={group} className="isda-card" data-done={done || undefined} data-positive={positives > 0 || undefined} id={`isda-${group}`}>
            <header className="row between gap-2">
              <h3 className="exam-card-title">{ISDA_GROUP_LABEL[group]}</h3>
              {positives > 0 && <span className="tag" data-tone="accent">{positives} presente(s)</span>}
            </header>
            <TriStateChips
              ariaLabel={`Sintomas — ${ISDA_GROUP_LABEL[group]}`}
              options={syms}
              value={sub}
              onChange={(next) =>
                update((d) => {
                  for (const s of syms) {
                    const v = next?.[s.value];
                    if (v) d.symptoms[s.value] = v;
                    else delete d.symptoms[s.value];
                  }
                })
              }
            />
            <div className="row gap-2 wrap">
              <Button
                variant={done ? 'gray' : 'tinted'}
                size="sm"
                icon={CheckCheck}
                disabled={done}
                onClick={() =>
                  update((d) => {
                    for (const s of unset) d.symptoms[s.value] = 'nao';
                  })
                }
              >
                Nega demais sintomas deste sistema
              </Button>
            </div>
            <TextArea
              value={enc.isdaNotes[group]}
              onChange={(t) =>
                update((d) => {
                  if (t) d.isdaNotes[group] = t;
                  else delete d.isdaNotes[group];
                })
              }
              placeholder="Observação (texto livre)"
              rows={1}
              aria-label={`Observação — ${ISDA_GROUP_LABEL[group]}`}
            />
          </section>
        );
      })}
    </div>
  );
}
