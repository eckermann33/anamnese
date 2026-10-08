import { useEffect, useState, type ReactNode } from 'react';
import { Cable, CheckCircle2, Circle, Download, ListChecks, Pill, Plus, type LucideIcon } from 'lucide-react';
import type { Antibiotic, Device, Encounter, Patient, Problem } from '../../db/types';
import { uid } from '../../db';
import { mutatePatient } from '../../db/mutations';
import { ListSection, ListRow } from '../../components/ui/List';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { NumberField, TextArea, TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useConfirm, useToast } from '../../components/ui/Overlays';
import { antibioticActive, antibioticDue, dayCount, deviceActive } from '../../clinical/evolution';
import { formatShortDate, toISODate } from '../../lib/format';

/* ==========================================================================
   LISTAS DO PACIENTE (valem para todos os dias da internação)
   Problemas · Dispositivos · Antimicrobianos
   Cada item abre um sheet de edição; as gravações leem a versão mais nova
   do banco (mutatePatient), então a tela do paciente e a da evolução podem
   editar as mesmas listas sem sobrescrever uma à outra.
   ========================================================================== */

/** Linha com área principal (abre edição) + botão lateral (ação rápida). */
function SplitRow(props: { icon: LucideIcon; iconTone?: 'red' | 'orange' | 'green' | 'gray'; title: ReactNode; subtitle?: ReactNode; onOpen: () => void; side?: ReactNode; dim?: boolean }) {
  const Icon = props.icon;
  return (
    <div className="list-row list-row-split" data-dim={props.dim || undefined}>
      <button type="button" className="list-row-main" onClick={props.onOpen}>
        <span className="list-row-icon" data-tone={props.iconTone} aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className="list-row-body">
          <span className="list-row-title">{props.title}</span>
          {props.subtitle && <span className="list-row-subtitle">{props.subtitle}</span>}
        </span>
      </button>
      {props.side}
    </div>
  );
}

function DateField({ label, value, onChange, max }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void; max?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="date" className="input" value={value ?? ''} max={max} onChange={(e) => onChange(e.target.value || undefined)} />
    </label>
  );
}

function SheetActions({ onSave, onDelete, canSave }: { onSave: () => void; onDelete?: () => void; canSave: boolean }) {
  return (
    <div className="stack gap-2 mt-4">
      <Button variant="primary" size="lg" block disabled={!canSave} onClick={onSave}>
        Salvar
      </Button>
      {onDelete && (
        <Button variant="destructive" block onClick={onDelete}>
          Excluir
        </Button>
      )}
    </div>
  );
}

/** Estado do formulário do sheet: copia o item ao abrir. */
function useDraft<T>(item: T | null) {
  const [draft, setDraft] = useState<T | null>(item);
  useEffect(() => setDraft(item), [item]);
  return [draft, setDraft] as const;
}

/* ---------------- Problemas ---------------- */

export function ProblemsSection({ patient, base, header = 'Lista de problemas' }: { patient: Patient; base?: Encounter; header?: string }) {
  const [editing, setEditing] = useState<{ item: Problem; isNew: boolean } | null>(null);
  const toast = useToast();
  const active = patient.problems.filter((p) => p.status === 'ativo');
  const resolved = patient.problems.filter((p) => p.status === 'resolvido');
  const fromAnamnese = base
    ? base.manualHypotheses.filter((h) => h.trim()).length
      ? base.manualHypotheses.filter((h) => h.trim())
      : (base.hypotheses?.result.hypotheses.filter((h) => h.kind === 'principal').map((h) => h.name) ?? [])
    : [];

  const toggle = (p: Problem) =>
    mutatePatient(patient.id, (d) => {
      const it = d.problems.find((x) => x.id === p.id);
      if (it) it.status = it.status === 'ativo' ? 'resolvido' : 'ativo';
    });

  async function importHd() {
    await mutatePatient(patient.id, (d) => {
      for (const title of fromAnamnese) {
        if (!d.problems.some((p) => p.title.toLowerCase() === title.toLowerCase())) {
          d.problems.push({ id: uid(), title, status: 'ativo', since: d.admissionDate });
        }
      }
    });
    toast('Hipóteses da anamnese adicionadas', 'success');
  }

  const row = (p: Problem) => (
    <SplitRow
      key={p.id}
      icon={ListChecks}
      iconTone={p.status === 'resolvido' ? 'gray' : undefined}
      dim={p.status === 'resolvido'}
      title={p.title}
      subtitle={[p.since && `desde ${formatShortDate(p.since)}`, p.notes].filter(Boolean).join(' · ') || undefined}
      onOpen={() => setEditing({ item: p, isNew: false })}
      side={
        <button
          type="button"
          className="list-row-side"
          aria-pressed={p.status === 'resolvido'}
          aria-label={p.status === 'ativo' ? `Marcar “${p.title}” como resolvido` : `Reabrir “${p.title}”`}
          onClick={() => void toggle(p)}
        >
          {p.status === 'resolvido' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
        </button>
      }
    />
  );

  return (
    <>
      <ListSection header={header} icons footer={patient.problems.length ? 'Toque no círculo para marcar como resolvido.' : undefined}>
        {active.map(row)}
        {resolved.map(row)}
        {!patient.problems.length && fromAnamnese.length > 0 && (
          <ListRow icon={Download} title="Importar hipóteses da anamnese" subtitle={fromAnamnese.join('; ')} accent onClick={() => void importHd()} />
        )}
        <ListRow icon={Plus} title="Adicionar problema" accent onClick={() => setEditing({ item: { id: uid(), title: '', status: 'ativo', since: toISODate() }, isNew: true })} />
      </ListSection>
      <ProblemSheet editing={editing} onClose={() => setEditing(null)} patientId={patient.id} />
    </>
  );
}

function ProblemSheet({ editing, onClose, patientId }: { editing: { item: Problem; isNew: boolean } | null; onClose: () => void; patientId: string }) {
  const [d, setD] = useDraft(editing?.item ?? null);
  const confirm = useConfirm();
  async function save() {
    if (!d) return;
    await mutatePatient(patientId, (p) => {
      const i = p.problems.findIndex((x) => x.id === d.id);
      const clean = { ...d, title: d.title.trim(), notes: d.notes?.trim() || undefined };
      if (i >= 0) p.problems[i] = clean;
      else p.problems.push(clean);
    });
    onClose();
  }
  async function remove() {
    if (!d || !(await confirm({ title: 'Excluir problema?', confirmLabel: 'Excluir', destructive: true }))) return;
    await mutatePatient(patientId, (p) => void (p.problems = p.problems.filter((x) => x.id !== d.id)));
    onClose();
  }
  return (
    <Sheet open={!!editing} onClose={onClose} title={editing?.isNew ? 'Novo problema' : 'Editar problema'}>
      {d && (
        <div className="stack gap-3">
          <TextField label="Problema" value={d.title} onChange={(t) => setD({ ...d, title: t })} placeholder="Ex.: Pneumonia adquirida na comunidade" />
          <SegmentedControl
            ariaLabel="Situação do problema"
            value={d.status}
            onChange={(s) => setD({ ...d, status: s })}
            options={[
              { value: 'ativo', label: 'Ativo' },
              { value: 'resolvido', label: 'Resolvido' },
            ]}
          />
          <DateField label="Desde" value={d.since} onChange={(v) => setD({ ...d, since: v })} />
          <TextArea label="Observações" value={d.notes} onChange={(t) => setD({ ...d, notes: t })} rows={2} placeholder="Ex.: em desmame de O₂" />
          <SheetActions canSave={!!d.title.trim()} onSave={() => void save()} onDelete={editing?.isNew ? undefined : () => void remove()} />
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- Dispositivos ---------------- */

const DEVICE_TYPES = ['AVP', 'CVC', 'PICC', 'Cateter de hemodiálise', 'PAI', 'SVD', 'SNE', 'SNG', 'TOT', 'TQT', 'Dreno de tórax', 'Dreno abdominal'];

export function DevicesSection({ patient, date = toISODate() }: { patient: Patient; date?: string }) {
  const [editing, setEditing] = useState<{ item: Device; isNew: boolean } | null>(null);
  const active = patient.devices.filter((d) => deviceActive(d, date));
  const removed = patient.devices.filter((d) => !deviceActive(d, date));
  return (
    <>
      <ListSection header="Dispositivos" icons footer="D1 = dia da inserção. Reavalie todo dia se cada dispositivo ainda é necessário.">
        {active.map((d) => {
          const n = dayCount(d.insertedAt, date);
          return (
            <ListRow
              key={d.id}
              icon={Cable}
              title={d.type}
              subtitle={[d.site, `inserido em ${formatShortDate(d.insertedAt)}`].filter(Boolean).join(' · ')}
              trailing={n ? <span className="tag" data-tone="accent">D{n}</span> : undefined}
              onClick={() => setEditing({ item: d, isNew: false })}
            />
          );
        })}
        {removed.length > 0 && (
          <details className="list-row-details">
            <summary className="list-row">
              <span className="list-row-title c-secondary">Retirados ({removed.length})</span>
            </summary>
            {removed.map((d) => (
              <ListRow
                key={d.id}
                icon={Cable}
                iconTone="gray"
                title={d.type}
                subtitle={`${d.site ? `${d.site} · ` : ''}${formatShortDate(d.insertedAt)} → ${d.removedAt ? formatShortDate(d.removedAt) : '—'}`}
                onClick={() => setEditing({ item: d, isNew: false })}
              />
            ))}
          </details>
        )}
        <ListRow icon={Plus} title="Adicionar dispositivo" accent onClick={() => setEditing({ item: { id: uid(), type: '', insertedAt: date }, isNew: true })} />
      </ListSection>
      <DeviceSheet editing={editing} onClose={() => setEditing(null)} patientId={patient.id} today={date} />
    </>
  );
}

function DeviceSheet({ editing, onClose, patientId, today }: { editing: { item: Device; isNew: boolean } | null; onClose: () => void; patientId: string; today: string }) {
  const [d, setD] = useDraft(editing?.item ?? null);
  const confirm = useConfirm();
  async function save() {
    if (!d) return;
    await mutatePatient(patientId, (p) => {
      const clean = { ...d, type: d.type.trim(), site: d.site?.trim() || undefined };
      const i = p.devices.findIndex((x) => x.id === d.id);
      if (i >= 0) p.devices[i] = clean;
      else p.devices.push(clean);
    });
    onClose();
  }
  async function remove() {
    if (!d || !(await confirm({ title: 'Excluir dispositivo?', message: 'Para registrar a retirada, use a data de retirada.', confirmLabel: 'Excluir', destructive: true }))) return;
    await mutatePatient(patientId, (p) => void (p.devices = p.devices.filter((x) => x.id !== d.id)));
    onClose();
  }
  return (
    <Sheet open={!!editing} onClose={onClose} title={editing?.isNew ? 'Novo dispositivo' : 'Dispositivo'}>
      {d && (
        <div className="stack gap-3">
          <div className="chip-group" role="group" aria-label="Tipos comuns">
            {DEVICE_TYPES.map((t) => (
              <Chip key={t} small selected={d.type === t} onClick={() => setD({ ...d, type: t })}>
                {t}
              </Chip>
            ))}
          </div>
          <TextField label="Tipo" value={d.type} onChange={(t) => setD({ ...d, type: t })} placeholder="Ex.: CVC" />
          <TextField label="Local" value={d.site} onChange={(t) => setD({ ...d, site: t })} placeholder="Ex.: jugular interna direita" />
          <DateField label="Inserção" value={d.insertedAt} max={today} onChange={(v) => setD({ ...d, insertedAt: v ?? today })} />
          <DateField label="Retirada" value={d.removedAt} onChange={(v) => setD({ ...d, removedAt: v })} />
          {!d.removedAt && !editing?.isNew && (
            <Button variant="tinted" onClick={() => setD({ ...d, removedAt: today })}>
              Retirado hoje
            </Button>
          )}
          <SheetActions canSave={!!d.type.trim() && !!d.insertedAt} onSave={() => void save()} onDelete={editing?.isNew ? undefined : () => void remove()} />
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- Antimicrobianos ---------------- */

const ATB_COMMON = [
  'Ceftriaxona',
  'Piperacilina-tazobactam',
  'Cefepime',
  'Meropenem',
  'Vancomicina',
  'Amoxicilina-clavulanato',
  'Azitromicina',
  'Ciprofloxacino',
  'Metronidazol',
  'Oxacilina',
  'Clindamicina',
  'Sulfametoxazol-trimetoprima',
  'Fluconazol',
];

export function AntibioticsSection({ patient, date = toISODate() }: { patient: Patient; date?: string }) {
  const [editing, setEditing] = useState<{ item: Antibiotic; isNew: boolean } | null>(null);
  const active = patient.antibiotics.filter((a) => antibioticActive(a, date));
  const stopped = patient.antibiotics.filter((a) => !antibioticActive(a, date));
  return (
    <>
      <ListSection header="Antimicrobianos" icons footer="D1 = dia da 1ª dose. Em laranja: chegou ao tempo previsto — reavaliar.">
        {active.map((a) => {
          const n = dayCount(a.startedAt, date);
          const due = antibioticDue(a, date);
          return (
            <ListRow
              key={a.id}
              icon={Pill}
              iconTone={due ? 'orange' : undefined}
              title={a.name}
              subtitle={[a.indication, `início ${formatShortDate(a.startedAt)}`].filter(Boolean).join(' · ')}
              trailing={
                n ? (
                  <span className="tag" data-tone={due ? 'orange' : 'accent'}>
                    D{n}
                    {a.plannedDays ? `/${a.plannedDays}` : ''}
                  </span>
                ) : undefined
              }
              onClick={() => setEditing({ item: a, isNew: false })}
            />
          );
        })}
        {stopped.length > 0 && (
          <details className="list-row-details">
            <summary className="list-row">
              <span className="list-row-title c-secondary">Suspensos ({stopped.length})</span>
            </summary>
            {stopped.map((a) => (
              <ListRow
                key={a.id}
                icon={Pill}
                iconTone="gray"
                title={a.name}
                subtitle={`${formatShortDate(a.startedAt)} → ${a.stoppedAt ? formatShortDate(a.stoppedAt) : '—'}${a.stoppedAt ? ` · ${dayCount(a.startedAt, a.stoppedAt)} dias` : ''}`}
                onClick={() => setEditing({ item: a, isNew: false })}
              />
            ))}
          </details>
        )}
        <ListRow icon={Plus} title="Adicionar antimicrobiano" accent onClick={() => setEditing({ item: { id: uid(), name: '', startedAt: date }, isNew: true })} />
      </ListSection>
      <AntibioticSheet editing={editing} onClose={() => setEditing(null)} patientId={patient.id} today={date} />
    </>
  );
}

function AntibioticSheet({ editing, onClose, patientId, today }: { editing: { item: Antibiotic; isNew: boolean } | null; onClose: () => void; patientId: string; today: string }) {
  const [d, setD] = useDraft(editing?.item ?? null);
  const confirm = useConfirm();
  async function save() {
    if (!d) return;
    await mutatePatient(patientId, (p) => {
      const clean = { ...d, name: d.name.trim(), indication: d.indication?.trim() || undefined };
      const i = p.antibiotics.findIndex((x) => x.id === d.id);
      if (i >= 0) p.antibiotics[i] = clean;
      else p.antibiotics.push(clean);
    });
    onClose();
  }
  async function remove() {
    if (!d || !(await confirm({ title: 'Excluir antimicrobiano?', message: 'Para registrar a suspensão, use a data de suspensão.', confirmLabel: 'Excluir', destructive: true }))) return;
    await mutatePatient(patientId, (p) => void (p.antibiotics = p.antibiotics.filter((x) => x.id !== d.id)));
    onClose();
  }
  return (
    <Sheet open={!!editing} onClose={onClose} title={editing?.isNew ? 'Novo antimicrobiano' : 'Antimicrobiano'}>
      {d && (
        <div className="stack gap-3">
          <div className="chip-group" role="group" aria-label="Antimicrobianos comuns">
            {ATB_COMMON.map((t) => (
              <Chip key={t} small selected={d.name === t} onClick={() => setD({ ...d, name: t })}>
                {t}
              </Chip>
            ))}
          </div>
          <TextField label="Nome" value={d.name} onChange={(t) => setD({ ...d, name: t })} placeholder="Ex.: Ceftriaxona" />
          <TextField label="Indicação" value={d.indication} onChange={(t) => setD({ ...d, indication: t })} placeholder="Ex.: PAC, ITU, pele e partes moles" />
          <DateField label="1ª dose" value={d.startedAt} max={today} onChange={(v) => setD({ ...d, startedAt: v ?? today })} />
          <NumberField label="Tempo previsto" unit="dias" decimals={0} value={d.plannedDays} onChange={(n) => setD({ ...d, plannedDays: n })} placeholder="Ex.: 7" />
          <DateField label="Suspensão" value={d.stoppedAt} onChange={(v) => setD({ ...d, stoppedAt: v })} />
          {!d.stoppedAt && !editing?.isNew && (
            <Button variant="tinted" onClick={() => setD({ ...d, stoppedAt: today })}>
              Suspenso hoje
            </Button>
          )}
          <p className="t-footnote c-secondary">Dose e posologia: confira função renal/hepática, alergias e interações antes de prescrever.</p>
          <SheetActions canSave={!!d.name.trim() && !!d.startedAt} onSave={() => void save()} onDelete={editing?.isNew ? undefined : () => void remove()} />
        </div>
      )}
    </Sheet>
  );
}
