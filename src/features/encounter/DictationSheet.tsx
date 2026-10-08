import { useMemo, useState } from 'react';
import { produce } from 'immer';
import { CheckCircle2, Circle, Mic, Sparkles, Square, WifiOff } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { TextArea } from '../../components/ui/TextField';
import { useToast } from '../../components/ui/Overlays';
import { useEncounter } from './EncounterContext';
import { buildDictationSpecs, selectDictationFields, type DictationSpec } from './dictation';
import { useAi } from '../../lib/ai';
import { useOnline } from '../../lib/settings';
import { useSpeechRecognition } from '../../lib/useSpeech';

/* ==========================================================================
   DITADO POR VOZ
   1. Dite (ou cole/digite) o caso de uma vez.
   2. A IA distribui nos campos — SÓ o que foi dito.
   3. Você revisa item por item e aplica. Nada entra sem revisão.
   ========================================================================== */

interface Item {
  spec: DictationSpec;
  value: string;
  excerpt: string;
  checked: boolean;
}

export function DictationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enc, ctx, update } = useEncounter();
  const ai = useAi('dictation');
  const online = useOnline();
  const toast = useToast();
  const [text, setText] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [unassigned, setUnassigned] = useState('');
  const [keepUnassigned, setKeepUnassigned] = useState(true);
  const speech = useSpeechRecognition((t) => setText((prev) => (prev ? `${prev.trimEnd()} ${t}` : t)));
  const specs = useMemo(() => buildDictationSpecs(ctx), [ctx]);

  function reset() {
    speech.stop();
    ai.cancel();
    setText('');
    setItems(null);
    setUnassigned('');
  }

  function close() {
    speech.stop();
    onClose();
  }

  async function distribute() {
    speech.stop();
    const fields = selectDictationFields(specs, text);
    const r = await ai.run({ transcript: text.trim(), fields }, enc.config.mode);
    if (!r) return;
    const byId = new Map(specs.map((s) => [s.field.id, s]));
    const list: Item[] = [];
    for (const a of r.assignments) {
      const spec = byId.get(a.fieldId);
      if (!spec) continue;
      // ensaio: só entra na revisão o que for um valor válido para o campo
      let ok = false;
      produce(enc, (d) => void (ok = spec.apply(d, a.value)));
      if (ok) list.push({ spec, value: a.value, excerpt: a.excerpt, checked: true });
    }
    setItems(list);
    setUnassigned(r.unassigned.trim());
  }

  function apply() {
    if (!items) return;
    const chosen = items.filter((i) => i.checked);
    update((d) => {
      for (const it of chosen) it.spec.apply(d, it.value);
      if (keepUnassigned && unassigned) {
        const cur = typeof d.answers.hda_obs === 'string' ? d.answers.hda_obs : '';
        d.answers.hda_obs = cur ? `${cur}\n${unassigned}` : unassigned;
      }
    });
    toast(`${chosen.length} campo(s) preenchido(s) pelo ditado`, 'success');
    reset();
    onClose();
  }

  const groups = items ? [...new Set(items.map((i) => i.spec.group))] : [];

  return (
    <Sheet open={open} onClose={close} title="Ditar o caso" subtitle={items ? 'Revise antes de aplicar' : 'Fale tudo de uma vez; a IA distribui nos campos'}>
      {!items ? (
        <div className="stack gap-3">
          {speech.supported ? (
            <div className="dictation-rec">
              <button
                type="button"
                className="dictation-mic"
                data-on={speech.listening || undefined}
                onClick={speech.listening ? speech.stop : speech.start}
                aria-label={speech.listening ? 'Parar de gravar' : 'Começar a gravar'}
              >
                {speech.listening ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
              </button>
              <span className="t-subhead c-secondary">{speech.listening ? 'Ouvindo… toque para parar' : 'Toque para ditar'}</span>
            </div>
          ) : (
            <p className="t-footnote c-secondary">Este navegador não reconhece voz aqui. Use o microfone do teclado (no iPhone, o 🎤 ao lado da barra de espaço) dentro do campo abaixo.</p>
          )}
          {speech.error && (
            <p className="t-footnote c-red" role="alert">
              {speech.error}
            </p>
          )}
          <TextArea
            value={text}
            onChange={setText}
            rows={6}
            aria-label="Texto ditado"
            placeholder="Ex.: Dor no peito em aperto há 2 horas, irradia para o braço esquerdo, com suor frio. Nega febre. Hipertenso, usa losartana 50 mg duas vezes ao dia. Alergia a dipirona. PA 150 por 90, FC 98."
          />
          {speech.interim && <p className="t-footnote c-secondary dictation-interim">{speech.interim}…</p>}
          <Button variant="primary" size="lg" icon={Sparkles} loading={ai.loading} disabled={!text.trim() || !online} onClick={() => void distribute()}>
            Distribuir nos campos (IA)
          </Button>
          {!online && (
            <p className="row gap-2 t-footnote c-secondary">
              <WifiOff size={16} aria-hidden="true" /> Sem internet: preencha direto nos campos (o microfone do teclado funciona offline em muitos aparelhos).
            </p>
          )}
          {ai.error && (
            <p className="t-footnote c-red" role="alert">
              {ai.error}
            </p>
          )}
          <p className="t-caption c-secondary">O texto vai para a IA sem iniciais e sem leito. Evite falar nomes, documentos ou endereços.</p>
        </div>
      ) : (
        <div className="stack gap-3">
          {!items.length && <p className="t-subhead c-secondary">A IA não encontrou nada para preencher nos campos.</p>}
          {groups.map((g) => (
            <section key={g} className="stack gap-1">
              <h3 className="t-footnote c-secondary dictation-group">{g}</h3>
              <ul className="list-group">
                {items
                  .map((it, i) => ({ it, i }))
                  .filter(({ it }) => it.spec.group === g)
                  .map(({ it, i }) => (
                    <li key={i}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={it.checked}
                        className="list-row dictation-item"
                        onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))}
                      >
                        {it.checked ? <CheckCircle2 size={22} className="c-accent" aria-hidden="true" /> : <Circle size={22} className="c-secondary" aria-hidden="true" />}
                        <span className="list-row-body">
                          <span className="list-row-subtitle">{it.spec.field.label.replace(/\s*\(formato:.*\)$/, '')}</span>
                          <span className="list-row-title">{it.spec.display(it.value)}</span>
                          {it.excerpt && <span className="dictation-excerpt">“{it.excerpt}”</span>}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          {unassigned && (
            <div className="card stack gap-2">
              <strong className="t-subhead">Não coube em nenhum campo</strong>
              <p className="t-footnote">{unassigned}</p>
              <button type="button" role="checkbox" aria-checked={keepUnassigned} className="row gap-2 t-footnote" onClick={() => setKeepUnassigned((v) => !v)}>
                {keepUnassigned ? <CheckCircle2 size={20} className="c-accent" aria-hidden="true" /> : <Circle size={20} className="c-secondary" aria-hidden="true" />}
                Guardar em “Outras informações da história”
              </button>
            </div>
          )}
          <Button variant="primary" size="lg" disabled={!items.some((i) => i.checked) && !(keepUnassigned && unassigned)} onClick={apply}>
            Aplicar {items.filter((i) => i.checked).length} campo(s)
          </Button>
          <Button variant="plain" onClick={() => setItems(null)}>
            Voltar ao texto
          </Button>
        </div>
      )}
    </Sheet>
  );
}
