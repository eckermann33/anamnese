import { CheckCircle2 } from 'lucide-react';
import type { ExamSystemDef } from '../../clinical/exam';
import { GLASGOW } from '../../clinical/exam';
import type { ExamSystemState, Glasgow } from '../../db/types';
import { examSystemText } from '../../clinical/narrative';
import { Chip } from '../ui/Chip';
import { TextArea } from '../ui/TextField';
import { Button } from '../ui/Button';
import type { Encounter } from '../../db/types';

/* ==========================================================================
   UM SISTEMA DO EXAME FÍSICO
   - "Normal" insere o texto padrão do sistema
   - achados alterados selecionáveis (substituem a parte correspondente)
   - linhas estruturadas (ectoscopia, estado mental) com a 1ª opção = normal
   ========================================================================== */

interface Props {
  def: ExamSystemDef;
  state: ExamSystemState | undefined;
  onChange: (s: ExamSystemState | undefined) => void;
  enc: Encounter;
  glasgow?: Glasgow;
  onGlasgow?: (g: Glasgow | undefined) => void;
}

export function ExamSystemCard({ def, state, onChange, enc, glasgow, onGlasgow }: Props) {
  const st: ExamSystemState = state ?? { findings: [] };
  const examined = !!state && (state.normal || state.findings.length > 0 || Object.keys(state.rows ?? {}).length > 0);
  const preview = examSystemText(def, enc);

  function setNormal() {
    if (def.rows) {
      onChange({ ...st, normal: true, findings: [], rows: Object.fromEntries(def.rows.map((r) => [r.id, r.options[0].value])) });
    } else {
      onChange({ ...st, normal: true, findings: [] });
    }
  }

  function toggleFinding(id: string) {
    const f = def.findings.find((x) => x.id === id)!;
    let findings = st.findings.includes(id) ? st.findings.filter((x) => x !== id) : [...st.findings, id];
    if (!st.findings.includes(id) && f.exclusive) {
      const group = def.findings.filter((x) => x.exclusive === f.exclusive && x.id !== id).map((x) => x.id);
      findings = findings.filter((x) => !group.includes(x));
    }
    // marcar um achado significa que o sistema foi examinado
    onChange({ ...st, findings, normal: findings.length ? true : st.normal });
  }

  function setRow(rowId: string, value: string) {
    const rows = { ...(st.rows ?? {}), [rowId]: value };
    onChange({ ...st, rows, normal: true });
  }

  return (
    <section className="exam-card" id={`exam-${def.id}`} data-examined={examined || undefined} aria-label={def.label}>
      <header className="exam-card-head">
        <div className="stack">
          <h3 className="exam-card-title">{def.label}</h3>
          {!def.label.startsWith(def.abbr) && <span className="t-footnote c-secondary">{def.abbr}</span>}
        </div>
        <div className="row gap-2">
          {examined && (
            <Button variant="plain" size="sm" onClick={() => onChange(undefined)}>
              Limpar
            </Button>
          )}
          <Button variant={examined && !st.findings.length ? 'primary' : 'tinted'} size="sm" icon={CheckCircle2} onClick={setNormal}>
            Normal
          </Button>
        </div>
      </header>

      {def.rows ? (
        <div className="exam-rows">
          {def.rows.map((r) => {
            const current = st.rows?.[r.id] ?? (st.normal ? r.options[0].value : undefined);
            return (
              <div key={r.id} className="exam-row">
                <span className="exam-row-label">{r.label}</span>
                <div className="chip-group">
                  {r.options.map((o) => (
                    <Chip key={o.value} small selected={current === o.value} flag={o.flag} onClick={() => setRow(r.id, o.value)}>
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chip-group" role="group" aria-label={`Achados alterados — ${def.label}`}>
          {def.findings.map((f) => (
            <Chip key={f.id} small selected={st.findings.includes(f.id)} flag={f.flag} onClick={() => toggleFinding(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
      )}

      {def.id === 'neurologico' && onGlasgow && <GlasgowPicker value={glasgow} onChange={onGlasgow} />}

      <TextArea
        value={st.notes}
        onChange={(t) => onChange({ ...st, notes: t || undefined })}
        placeholder="Descrever achados (local, intensidade…) ou texto livre"
        rows={1}
        aria-label={`Observações — ${def.label}`}
      />

      {preview && (
        <p className="exam-preview">
          <span className="c-secondary">{def.abbr}: </span>
          {preview}
        </p>
      )}
    </section>
  );
}

function GlasgowPicker({ value, onChange }: { value?: Glasgow; onChange: (g: Glasgow | undefined) => void }) {
  const g = value ?? {};
  const total = g.o && g.v && g.m ? g.o + g.v + g.m : undefined;
  const set = (k: 'o' | 'v' | 'm', v: number) => onChange({ ...g, [k]: g[k] === v ? undefined : v });
  const rows: Array<['o' | 'v' | 'm', string]> = [
    ['o', 'Abertura ocular'],
    ['v', 'Resposta verbal'],
    ['m', 'Resposta motora'],
  ];
  return (
    <div className="glasgow">
      <div className="row between">
        <strong className="t-subhead">Escala de Glasgow</strong>
        <span className="tag" data-tone={total === undefined ? undefined : total <= 8 ? 'red' : total < 15 ? 'orange' : 'green'}>
          {total === undefined ? 'incompleta' : `Total ${total}`}
        </span>
      </div>
      {rows.map(([k, label]) => (
        <div key={k} className="exam-row">
          <span className="exam-row-label">{label}</span>
          <div className="chip-group">
            {GLASGOW[k].map((o) => (
              <Chip key={o.v} small selected={g[k] === o.v} onClick={() => set(k, o.v)}>
                {o.v} · {o.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      <div className="exam-row">
        <span className="exam-row-label">Pupilas (GCS-P)</span>
        <div className="chip-group">
          {[
            { v: 0, l: 'Ambas reagem' },
            { v: 1, l: 'Uma não reage' },
            { v: 2, l: 'Nenhuma reage' },
          ].map((o) => (
            <Chip key={o.v} small selected={g.p === o.v} onClick={() => onChange({ ...g, p: g.p === o.v ? undefined : o.v })}>
              {o.l}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
