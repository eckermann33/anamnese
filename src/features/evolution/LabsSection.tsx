import { useMemo, useState } from 'react';
import { ClipboardPaste, FlaskConical, Sparkles, Trash2, WifiOff } from 'lucide-react';
import type { LabPanel, LabValue, Patient } from '../../db/types';
import type { AiMode } from '../../../shared/ai/schemas';
import { uid } from '../../db';
import { mutatePatient } from '../../db/mutations';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { TextArea } from '../../components/ui/TextField';
import { useConfirm, useToast } from '../../components/ui/Overlays';
import { buildLabTable, findDate, formatLabValue, localFlag, parseLabsLocal, TREND_ARROW, type LabRow } from '../../clinical/labs';
import { useAi } from '../../lib/ai';
import { usePrefs, useOnline } from '../../lib/settings';
import { formatShortDate, toISODate } from '../../lib/format';

/* ==========================================================================
   EXAMES LABORATORIAIS DO PACIENTE
   Tabela (colunas = datas, mais recente à esquerda) com seta em relação ao
   resultado anterior do mesmo exame. Cor: vermelho = crítico, laranja =
   fora da faixa (do laudo ou faixa usual de adulto).
   ========================================================================== */

const FLAG_TONE = { critico: 'red', alto: 'orange', baixo: 'orange' } as const;
const FLAG_LABEL = { critico: 'crítico', alto: 'alto', baixo: 'baixo' } as const;

interface Props {
  patient: Patient;
  mode: AiMode;
  /** Data padrão do painel novo (dia da evolução). */
  date?: string;
  maxCols?: number;
}

export function LabsSection({ patient, mode, date = toISODate(), maxCols = 4 }: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [panelMenu, setPanelMenu] = useState<LabPanel | null>(null);
  const { columns, rows } = useMemo(() => buildLabTable(patient.labs, maxCols), [patient.labs, maxCols]);
  const older = patient.labs.length - columns.length;

  return (
    <section className="section" aria-labelledby="labs-title">
      <div className="row between page-pad">
        <h2 id="labs-title" className="section-title" style={{ padding: 0 }}>
          Exames
        </h2>
        <Button variant="tinted" size="sm" icon={ClipboardPaste} onClick={() => setPasteOpen(true)}>
          Colar exames
        </Button>
      </div>
      {rows.length ? (
        <div className="page-pad mt-3">
          <div className="lab-table-wrap card card-tight">
            <table className="lab-table">
              <caption className="visually-hidden">Exames laboratoriais por data</caption>
              <thead>
                <tr>
                  <th scope="col">Exame</th>
                  {columns.map((c) => (
                    <th key={c.id} scope="col">
                      <button type="button" className="lab-col-btn" onClick={() => setPanelMenu(c)} aria-label={`Opções dos exames de ${formatShortDate(c.date)}`}>
                        {formatShortDate(c.date)}
                        {c.source === 'ia' && <span className="lab-src">IA</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <LabTableRow key={r.key} row={r} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="t-caption c-secondary mt-2">
            Setas comparam com o resultado anterior do mesmo exame. Cores pela marcação do laudo ou pela faixa usual de adulto — confira a referência do seu laboratório.
            {older > 0 && ` ${older} coleta(s) mais antiga(s) fora da tabela.`}
          </p>
        </div>
      ) : (
        <p className="section-sub mt-2">Cole o resultado do sistema do hospital ou digite no formato “Hb 10,2 Leuco 12.300 Cr 1,4 K 4,2”.</p>
      )}

      <PasteLabsSheet open={pasteOpen} onClose={() => setPasteOpen(false)} patient={patient} mode={mode} defaultDate={date} />
      <PanelSheet panel={panelMenu} onClose={() => setPanelMenu(null)} patientId={patient.id} />
    </section>
  );
}

function LabTableRow({ row }: { row: LabRow }) {
  return (
    <tr>
      <th scope="row">
        {row.name}
        {row.unit && <span className="lab-unit">{row.unit}</span>}
      </th>
      {row.cells.map((c, i) => (
        <td key={i} data-tone={c?.value.flag ? FLAG_TONE[c.value.flag] : undefined}>
          {c ? (
            <>
              <span className="lab-value">{formatLabValue(c.value)}</span>
              {c.trend && c.trend !== 'same' && (
                <span className="lab-arrow" aria-label={c.trend === 'up' ? 'subiu' : 'caiu'}>
                  {TREND_ARROW[c.trend]}
                </span>
              )}
              {c.value.flag && <span className="visually-hidden"> ({FLAG_LABEL[c.value.flag]})</span>}
            </>
          ) : (
            <span className="c-secondary" aria-label="não coletado">
              –
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}

function PanelSheet({ panel, onClose, patientId }: { panel: LabPanel | null; onClose: () => void; patientId: string }) {
  const confirm = useConfirm();
  async function setDate(v: string) {
    if (!panel || !v) return;
    await mutatePatient(patientId, (p) => {
      const it = p.labs.find((x) => x.id === panel.id);
      if (it) it.date = v;
    });
    onClose();
  }
  async function remove() {
    if (!panel || !(await confirm({ title: 'Apagar estes exames?', message: `Coleta de ${formatShortDate(panel.date)} (${panel.values.length} resultados).`, confirmLabel: 'Apagar', destructive: true }))) return;
    await mutatePatient(patientId, (p) => void (p.labs = p.labs.filter((x) => x.id !== panel.id)));
    onClose();
  }
  return (
    <Sheet open={!!panel} onClose={onClose} title={panel ? `Exames de ${formatShortDate(panel.date)}` : ''} subtitle={panel?.source === 'ia' ? 'Organizados pela IA' : panel?.source === 'local' ? 'Lidos no aparelho' : undefined}>
      {panel && (
        <div className="stack gap-3">
          <label className="field">
            <span className="field-label">Data da coleta</span>
            <input type="date" className="input" defaultValue={panel.date} onChange={(e) => void setDate(e.target.value)} />
          </label>
          {panel.rawText && (
            <details className="disclosure">
              <summary>Texto original</summary>
              <pre className="lab-raw">{panel.rawText}</pre>
            </details>
          )}
          <Button variant="destructive" icon={Trash2} block onClick={() => void remove()}>
            Apagar esta coleta
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Colar exames: IA (se online) ou leitor local ---------- */

function PasteLabsSheet({ open, onClose, patient, mode, defaultDate }: { open: boolean; onClose: () => void; patient: Patient; mode: AiMode; defaultDate: string }) {
  const [text, setText] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [dateTouched, setDateTouched] = useState(false);
  const [preview, setPreview] = useState<{ values: LabValue[]; source: LabPanel['source'] } | null>(null);
  const ai = useAi('parse_labs');
  const { prefs } = usePrefs();
  const online = useOnline();
  const toast = useToast();
  const sex = patient.sex === 'F' || patient.sex === 'M' ? patient.sex : undefined;
  const canAi = prefs.aiEnabled && online;

  function reset() {
    setText('');
    setPreview(null);
    setDateTouched(false);
    setDate(defaultDate);
    ai.cancel();
  }

  function close() {
    reset();
    onClose();
  }

  function readLocal() {
    const values = parseLabsLocal(text, sex);
    if (!dateTouched) setDate(findDate(text, defaultDate));
    setPreview({ values, source: 'local' });
    if (!values.length) toast('Nenhum exame reconhecido. Use o formato “Hb 10,2 Cr 1,4”.', 'error');
  }

  async function readAi() {
    const r = await ai.run({ text, date: dateTouched ? date : undefined }, mode);
    if (!r) return;
    if (!dateTouched && r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) setDate(r.date);
    setPreview({
      source: 'ia',
      values: r.values.map((v) => ({
        analyte: v.analyte,
        value: v.value,
        raw: v.raw,
        unit: v.unit ?? undefined,
        ref: v.ref ?? undefined,
        flag: v.flag ?? localFlag(v.analyte, v.value, sex),
      })),
    });
  }

  async function save() {
    if (!preview?.values.length) return;
    const panel: LabPanel = { id: uid(), date, values: preview.values, source: preview.source, rawText: text.trim() };
    await mutatePatient(patient.id, (p) => void p.labs.push(panel));
    toast(`${preview.values.length} resultados salvos`, 'success');
    close();
  }

  return (
    <Sheet open={open} onClose={close} title="Colar exames" subtitle="Do sistema do hospital, do laudo ou digitados">
      <div className="stack gap-3">
        <TextArea value={text} onChange={(t) => (setText(t), setPreview(null))} rows={5} placeholder={'Ex.: Hb 10,2 Ht 31 Leuco 12.300 (bast 2%) Plaq 210 mil\nUr 45 Cr 1,4 Na 138 K 4,2'} aria-label="Texto dos exames" />
        <label className="field">
          <span className="field-label">Data da coleta</span>
          <input type="date" className="input" value={date} onChange={(e) => (setDate(e.target.value), setDateTouched(true))} />
        </label>

        {!preview && (
          <div className="stack gap-2">
            {prefs.aiEnabled && (
              <Button variant="primary" size="lg" icon={Sparkles} loading={ai.loading} disabled={!text.trim() || !online} onClick={() => void readAi()}>
                Organizar com IA
              </Button>
            )}
            <Button variant={canAi ? 'gray' : 'primary'} size={canAi ? 'md' : 'lg'} icon={FlaskConical} disabled={!text.trim()} onClick={readLocal}>
              Ler sem IA (offline)
            </Button>
            {!online && (
              <p className="row gap-2 t-footnote c-secondary">
                <WifiOff size={16} aria-hidden="true" /> Sem internet: o leitor local entende o formato “sigla valor”.
              </p>
            )}
            {ai.error && (
              <p className="t-footnote c-red" role="alert">
                {ai.error} Você pode usar o leitor sem IA.
              </p>
            )}
          </div>
        )}

        {preview && (
          <div className="stack gap-3">
            <div className="lab-preview card card-tight">
              {preview.values.length ? (
                <dl className="kv">
                  {preview.values.map((v, i) => (
                    <div key={i} className="contents">
                      <dt>{v.analyte}</dt>
                      <dd className="row gap-2">
                        <span data-tone={v.flag ? FLAG_TONE[v.flag] : undefined} className="lab-value">
                          {formatLabValue(v)} {v.unit ?? ''}
                        </span>
                        {v.flag && (
                          <span className="tag" data-tone={FLAG_TONE[v.flag]}>
                            {FLAG_LABEL[v.flag]}
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn btn-plain btn-sm btn-icon"
                          aria-label={`Remover ${v.analyte}`}
                          onClick={() => setPreview({ ...preview, values: preview.values.filter((_, j) => j !== i) })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="t-subhead c-secondary">Nada reconhecido.</p>
              )}
            </div>
            <p className="t-caption c-secondary">
              {preview.source === 'ia' ? 'Organizado pela IA a partir do texto colado — confira os valores.' : 'Lido no próprio aparelho — confira os valores.'}
            </p>
            <Button variant="primary" size="lg" disabled={!preview.values.length} onClick={() => void save()}>
              Salvar {preview.values.length} resultado(s) de {formatShortDate(date)}
            </Button>
            <Button variant="plain" onClick={() => setPreview(null)}>
              Voltar ao texto
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
