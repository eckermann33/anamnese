import { useMemo, useState } from 'react';
import { Copy, Sparkles, WifiOff } from 'lucide-react';
import type { Encounter, Evolution, Patient } from '../../db/types';
import type { AiMode, SbarResult } from '../../../shared/ai/schemas';
import { sbarCaseText, sbarLocal } from '../../clinical/evolution';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useToast } from '../../components/ui/Overlays';
import { useAi } from '../../lib/ai';
import { copyText } from '../../lib/share';
import { useOnline, usePrefs } from '../../lib/settings';
import { toISODate } from '../../lib/format';

/* ==========================================================================
   PASSAGEM DE PLANTÃO (SBAR)
   - Versão local na hora (offline), só com o que foi registrado.
   - "Melhorar com IA": manda o caso ANONIMIZADO (sem iniciais/leito) e
     recebe um SBAR mais fluido, com critérios para acionar a equipe.
   - Ao copiar, a identificação (iniciais/leito) é colocada aqui no
     aparelho — ela nunca vai para a IA.
   ========================================================================== */

const LETTERS: Array<[keyof SbarResult, string, string]> = [
  ['situation', 'S', 'Situação'],
  ['background', 'B', 'Breve histórico'],
  ['assessment', 'A', 'Avaliação'],
  ['recommendation', 'R', 'Recomendação'],
];

interface Props {
  open: boolean;
  onClose: () => void;
  patient: Patient;
  base?: Encounter;
  evolutions: Evolution[];
  mode: AiMode;
}

export function SbarSheet({ open, onClose, patient, base, evolutions, mode }: Props) {
  const [aiResult, setAiResult] = useState<SbarResult | null>(null);
  const [view, setView] = useState<'local' | 'ia'>('local');
  const ai = useAi('sbar');
  const { prefs } = usePrefs();
  const online = useOnline();
  const toast = useToast();
  const date = toISODate();

  const local = useMemo(() => sbarLocal({ patient, base, evolutions, date }), [patient, base, evolutions, date]);
  const shown = view === 'ia' && aiResult ? aiResult : local;

  async function improve() {
    const r = await ai.run({ caseText: sbarCaseText({ patient, base, evolutions, date }) }, mode);
    if (r) {
      setAiResult(r);
      setView('ia');
    }
  }

  async function copy() {
    const id = [patient.initials.toUpperCase(), patient.bed && `leito ${patient.bed}`].filter(Boolean).join(', ');
    const text = [`PASSAGEM DE PLANTÃO${id ? ` — ${id}` : ''}`, ...LETTERS.map(([k, l, name]) => `${l} (${name}): ${shown[k]}`)].join('\n');
    const ok = await copyText(text);
    toast(ok ? 'SBAR copiado' : 'Não foi possível copiar', ok ? 'success' : 'error');
  }

  return (
    <Sheet open={open} onClose={onClose} title="Passagem de plantão" subtitle="SBAR — para ler em até 1 minuto">
      <div className="stack gap-3">
        {aiResult && (
          <SegmentedControl
            ariaLabel="Versão do SBAR"
            value={view}
            onChange={setView}
            options={[
              { value: 'local', label: 'Dos registros' },
              { value: 'ia', label: 'Revisado pela IA' },
            ]}
          />
        )}
        <ol className="sbar-list">
          {LETTERS.map(([k, letter, name]) => (
            <li key={k} className="sbar-item">
              <span className="sbar-letter" aria-hidden="true">
                {letter}
              </span>
              <div className="stack gap-1">
                <strong className="t-subhead">{name}</strong>
                <p className="sbar-text">{shown[k]}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="primary" size="lg" icon={Copy} onClick={() => void copy()}>
          Copiar SBAR
        </Button>
        {prefs.aiEnabled && (
          <Button variant="tinted" icon={Sparkles} loading={ai.loading} disabled={!online} onClick={() => void improve()}>
            {aiResult ? 'Gerar de novo com IA' : 'Melhorar com IA'}
          </Button>
        )}
        {!online && (
          <p className="row gap-2 t-footnote c-secondary">
            <WifiOff size={16} aria-hidden="true" /> Sem internet: a versão dos registros funciona offline.
          </p>
        )}
        {ai.error && (
          <p className="t-footnote c-red" role="alert">
            {ai.error}
          </p>
        )}
        <p className="t-caption c-secondary">A IA recebe o caso sem iniciais e sem leito. Confira tudo antes de passar o plantão.</p>
      </div>
    </Sheet>
  );
}
