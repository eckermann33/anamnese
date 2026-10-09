import { useMemo } from 'react';
import { Sparkles, WifiOff, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useEncounter } from '../EncounterContext';
import { SYSTEMS, SYSTEM_BY_ID, suggestSystemsLocally } from '../../../clinical/systems';
import { useAi } from '../../../lib/ai';
import { useOnline, usePrefs } from '../../../lib/settings';
import { useToast } from '../../../components/ui/Overlays';
import { TEMPLATE_BY_ID } from '../../../clinical/templates';
import type { SystemId } from '../../../clinical/types';

/** Etapa 4 — Direcionamento: quais sistemas investigar (IA ou escolha livre). */
export function SistemasStep() {
  const { enc, patient, update } = useEncounter();
  const { prefs } = usePrefs();
  const online = useOnline();
  const toast = useToast();
  const ai = useAi('suggest_systems');
  const local = useMemo(() => suggestSystemsLocally(enc.complaint.text), [enc.complaint.text]);
  const selected = enc.systems;

  function toggle(id: SystemId) {
    update((d) => {
      d.systems = d.systems.includes(id) ? d.systems.filter((s) => s !== id) : [...d.systems, id];
    });
  }

  async function suggest() {
    if (!enc.complaint.text.trim()) {
      toast('Preencha a queixa principal primeiro', 'info');
      return;
    }
    const r = await ai.run(
      {
        complaint: enc.complaint.text,
        duration: enc.complaint.duration !== undefined ? `${enc.complaint.duration} ${enc.complaint.durationUnit}` : undefined,
        profile: enc.config.profile,
        sex: patient.sex,
        age: patient.age !== undefined ? `${patient.age} ${patient.ageUnit}` : undefined,
      },
      enc.config.mode,
    );
    if (r) {
      update((d) => {
        d.systemSuggestions = { source: 'ia', at: Date.now(), items: r.systems };
        if (!d.systems.length) d.systems = r.systems.map((s) => s.system);
        if (!d.templateId && TEMPLATE_BY_ID[r.template]) d.templateId = r.template;
      });
    }
  }

  const suggestions = enc.systemSuggestions?.items;

  return (
    <div className="stack gap-6 page-pad">
      <section className="card stack gap-3">
        <div className="row gap-2">
          <Sparkles size={20} className="c-accent" aria-hidden="true" />
          <strong className="t-headline grow">Sugerir sistemas</strong>
        </div>
        <p className="t-footnote c-secondary">A IA lê a queixa e devolve os sistemas em ordem de prioridade, com uma linha de justificativa.</p>
        {prefs.aiEnabled && (
          <Button variant="primary" icon={Sparkles} loading={ai.loading} onClick={suggest} disabled={!online}>
            Sugerir sistemas (IA)
          </Button>
        )}
        {!online && (
          <p className="row gap-2 t-footnote c-secondary">
            <WifiOff size={16} aria-hidden="true" /> Sem internet — usando a sugestão offline abaixo.
          </p>
        )}
        {ai.error && <p className="t-footnote c-red" role="alert">{ai.error}</p>}

        {suggestions?.length ? (
          <ol className="suggest-list">
            {suggestions.map((s, i) => (
              <li key={s.system}>
                <button type="button" className="suggest-item" aria-pressed={selected.includes(s.system)} onClick={() => toggle(s.system)}>
                  <span className="suggest-rank">{i + 1}</span>
                  <span className="grow">
                    <strong>{SYSTEM_BY_ID[s.system]?.label}</strong>
                    <span className="t-footnote c-secondary" style={{ display: 'block' }}>
                      {s.justification}
                    </span>
                  </span>
                  {selected.includes(s.system) && <Check size={18} className="c-accent" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          local.length > 0 && (
            <div className="stack gap-2">
              <span className="t-footnote c-secondary">Sugestão offline (palavras-chave):</span>
              <div className="chip-group">
                {local.map((id) => (
                  <button key={id} type="button" className="chip chip-sm" aria-pressed={selected.includes(id)} onClick={() => toggle(id)}>
                    {SYSTEM_BY_ID[id].label}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </section>

      <section>
        <h2 className="step-subtitle">Escolha livre</h2>
        <p className="step-help">Toque na ordem de prioridade. Os sistemas escolhidos vêm primeiro no ISDA e no exame físico.</p>
        <div className="system-grid">
          {SYSTEMS.map((s) => {
            const idx = selected.indexOf(s.id);
            return (
              <button key={s.id} type="button" className="system-tile" aria-pressed={idx >= 0} onClick={() => toggle(s.id)}>
                <span className="system-tile-label">{s.label}</span>
                {idx >= 0 && <span className="system-tile-rank">{idx + 1}</span>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
