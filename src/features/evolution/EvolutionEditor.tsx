import { useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';
import { Check, CheckCircle2, Circle, CloudOff, Copy, FileDown, FileQuestion, Handshake, Loader2, Plus, Stethoscope, X } from 'lucide-react';
import type { CarriedField, Evolution, Todo } from '../../db/types';
import { db, uid } from '../../db';
import { useAutosave } from '../../lib/useAutosave';
import { Page, EmptyState, Disclaimer } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { ChipSelect } from '../../components/ui/Chip';
import { NumberField, TextArea } from '../../components/ui/TextField';
import { useToast } from '../../components/ui/Overlays';
import { AllergyBanner } from '../../components/clinical/Banners';
import { VitalsForm } from '../../components/clinical/VitalsForm';
import { ReferenceList } from '../../components/clinical/References';
import { DAILY_CHECKLIST, evolutionText, hospitalDay, lastWeight, SUBJECTIVE_CHIPS } from '../../clinical/evolution';
import { examSummary } from '../../clinical/narrative';
import { ageInYears } from '../../clinical/context';
import { usePrefs } from '../../lib/settings';
import { copyText, exportTextPdf } from '../../lib/share';
import { formatDate, formatShortDate } from '../../lib/format';
import { APP_NAME, CLINICAL_DISCLAIMER } from '../../config/app';
import { patientTitle } from '../patients/PatientsList';
import { useEvolutions } from './PatientFollowUp';
import { FluidBalanceCard } from './FluidBalanceCard';
import { AntibioticsSection, DevicesSection, ProblemsSection } from './PatientLists';
import { LabsSection } from './LabsSection';
import { SbarSheet } from './SbarSheet';

/* ==========================================================================
   EVOLUÇÃO DIÁRIA (SOAP) — /evolucao/:patientId/:evoId
   - Tudo salva sozinho (IndexedDB) a cada alteração.
   - Campos copiados da evolução anterior ficam em LARANJA até serem
     editados ou marcados como "Revisado".
   - Problemas, dispositivos, antimicrobianos e exames são do paciente
     (valem para todos os dias); o resto é deste dia.
   ========================================================================== */

const NORMAL_EXAM =
  'BEG, lúcido e orientado, corado, hidratado, acianótico, anictérico, afebril ao toque.\nAR: MV presente bilateralmente, sem ruídos adventícios.\nACV: RCR em 2T, BNF, sem sopros.\nABD: plano, flácido, RHA presentes, indolor à palpação, sem visceromegalias.\nMMII: sem edemas, panturrilhas livres.';

const JUMPS = [
  { id: 'evo-s', label: 'S' },
  { id: 'evo-o', label: 'O' },
  { id: 'evo-a', label: 'A' },
  { id: 'evo-p', label: 'P' },
  { id: 'evo-texto', label: 'Texto' },
];

export function EvolutionEditor() {
  const { patientId = '', evoId } = useParams();
  const { record: evo, update, saveState } = useAutosave(db.evolutions, evoId);
  const patient = useLiveQuery(async () => (await db.patients.get(patientId)) ?? null, [patientId]);
  const baseQuery = useLiveQuery(async () => {
    const encs = (await db.encounters.where('patientId').equals(patientId).toArray()).sort((a, b) => b.createdAt - a.createdAt);
    return { enc: encs.find((e) => e.status === 'concluido') ?? encs[0] };
  }, [patientId]);
  const evolutions = useEvolutions(patientId);
  const { prefs } = usePrefs();
  const toast = useToast();
  const [sbarOpen, setSbarOpen] = useState(false);

  const base = baseQuery?.enc;
  const text = useMemo(
    () => (evo && patient ? evolutionText({ evo, patient, base, evolutions: evolutions ?? [] }) : ''),
    [evo, patient, base, evolutions],
  );

  if (evo === undefined || patient === undefined || baseQuery === undefined || evolutions === undefined) return null;
  if (evo === null || patient === null || evo.patientId !== patient.id) {
    return (
      <Page title="Evolução" back={{ to: patientId ? `/pacientes/${patientId}` : '/pacientes', label: 'Paciente' }}>
        <EmptyState icon={FileQuestion} title="Evolução não encontrada" />
      </Page>
    );
  }

  const day = hospitalDay(patient, evo.date);
  const previous = evolutions.find((e) => e.id !== evo.id && (e.date < evo.date || (e.date === evo.date && e.createdAt < evo.createdAt)));
  const weightFallback = lastWeight(evolutions.filter((e) => e.id !== evo.id), evo.date, base);
  const weight = evo.weight ?? weightFallback;
  const mode = base?.config.mode ?? prefs.defaultMode;
  const profile = base?.config.profile ?? 'adulto';

  /** Altera um campo de texto e tira o destaque "copiado de ontem". */
  const setField = <K extends 'subjective' | 'examText' | 'objectiveNotes' | 'assessment' | 'plan'>(k: K, v: Evolution[K]) =>
    update((d) => {
      d[k] = v;
      d.carriedOver = d.carriedOver.filter((f) => f !== k);
    });
  const reviewed = (f: CarriedField) => update((d) => void (d.carriedOver = d.carriedOver.filter((x) => x !== f)));
  const setTodos = (todos: Todo[]) =>
    update((d) => {
      d.todos = todos;
      d.carriedOver = d.carriedOver.filter((f) => f !== 'todos');
    });

  function jump(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const nav = document.querySelector('.navbar')?.getBoundingClientRect().height ?? 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || prefs.reduceMotion;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - nav - 8, behavior: reduce ? 'auto' : 'smooth' });
  }

  async function copy() {
    const ok = await copyText(text);
    toast(ok ? 'Evolução copiada' : 'Não foi possível copiar', ok ? 'success' : 'error');
  }

  async function pdf() {
    try {
      await exportTextPdf({
        title: `Evolução — ${patient!.initials || 'paciente'}`,
        subtitle: `${formatDate(evo!.date)} · gerado no ${APP_NAME}`,
        text,
        footer: `${CLINICAL_DISCLAIMER} Documento gerado a partir de dados registrados pelo profissional; revise antes de usar.`,
        filename: `evolucao-${(patient!.initials || 'paciente').replace(/\W+/g, '')}-${evo!.date}.pdf`,
      });
    } catch {
      toast('Não foi possível gerar o PDF', 'error');
    }
  }

  const carriedFrom = previous ? formatShortDate(previous.date) : 'a evolução anterior';
  const carry = (f: CarriedField, children: ReactNode) => (
    <Carried carried={evo.carriedOver.includes(f)} from={carriedFrom} onReviewed={() => reviewed(f)}>
      {children}
    </Carried>
  );

  return (
    <>
      <Page
        title={`Evolução ${formatShortDate(evo.date)}`}
        compact
        toolbar
        back={{ to: `/pacientes/${patient.id}`, label: patientTitle(patient), iconOnly: true }}
        actions={
          <span className="save-state" aria-live="polite" data-state={saveState}>
            {saveState === 'salvando' ? (
              <Loader2 size={16} className="spin" aria-label="Salvando" />
            ) : saveState === 'erro' ? (
              <CloudOff size={16} aria-label="Erro ao salvar" />
            ) : (
              <Check size={16} aria-label="Salvo no aparelho" />
            )}
          </span>
        }
        sticky={
          <div className="sticky-stack">
            <AllergyBanner allergies={base?.history.allergies ?? []} noKnown={false} />
            <nav className="jump-bar" aria-label="Ir para a seção">
              {JUMPS.map((j) => (
                <button key={j.id} type="button" className="chip chip-sm" onClick={() => jump(j.id)}>
                  {j.label}
                </button>
              ))}
            </nav>
          </div>
        }
      >
        {/* ---------- Cabeçalho ---------- */}
        <div className="page-pad">
          <div className="card evo-head">
            <div className="stack">
              <span className="t-footnote c-secondary">{patientTitle(patient)}{patient.bed ? ` · leito ${patient.bed}` : ''}</span>
              <strong className="t-title3">{day ? `D${day} de internação` : 'Evolução'}</strong>
            </div>
            <label className="field evo-date">
              <span className="field-label">Data</span>
              <input type="date" className="input" value={evo.date} onChange={(e) => {
                  const v = e.target.value; // lido já: o updater roda depois
                  if (v) update((d) => void (d.date = v));
                }} />
            </label>
          </div>
        </div>

        {evo.carriedOver.length > 0 && (
          <div className="page-pad mt-3">
            <div className="banner banner-warning" role="note">
              <div className="banner-body">
                <span className="banner-title">Copiado de {carriedFrom}</span>
                <span className="banner-text">Os campos em laranja vieram da evolução anterior. Edite ou toque em “Revisado”.</span>
              </div>
              <Button variant="plain" size="sm" onClick={() => update((d) => void (d.carriedOver = []))}>
                Revisar tudo
              </Button>
            </div>
          </div>
        )}

        {/* ---------- S ---------- */}
        <section id="evo-s" className="section" aria-labelledby="evo-s-t">
          <h2 id="evo-s-t" className="section-title">
            S · Subjetivo
          </h2>
          <div className="page-pad">
            {carry(
              'subjective',
              <div className="card stack gap-3">
                <ChipSelect
                  multiple
                  small
                  ariaLabel="Relato rápido"
                  options={SUBJECTIVE_CHIPS}
                  value={evo.subjectiveChips}
                  onChange={(v) =>
                    update((d) => {
                      d.subjectiveChips = (v as string[] | undefined) ?? [];
                      d.carriedOver = d.carriedOver.filter((f) => f !== 'subjective');
                    })
                  }
                />
                <TextArea value={evo.subjective} onChange={(t) => setField('subjective', t)} rows={2} placeholder="Queixas e intercorrências nas últimas 24 h (paciente, família, enfermagem)" aria-label="Subjetivo" />
              </div>,
            )}
          </div>
        </section>

        {/* ---------- O ---------- */}
        <section id="evo-o" className="section" aria-labelledby="evo-o-t">
          <h2 id="evo-o-t" className="section-title">
            O · Objetivo
          </h2>
          <div className="page-pad stack gap-3">
            <VitalsForm value={evo.vitals} onChange={(v) => update((d) => void (d.vitals = v))} ageYears={ageInYears(patient.age, patient.ageUnit)} profile={profile} previous={previous?.vitals} />
            <div className="card">
              <NumberField
                label="Peso do dia"
                unit="kg"
                decimals={1}
                value={evo.weight}
                placeholder={weightFallback ? `último: ${String(weightFallback).replace('.', ',')}` : undefined}
                onChange={(n) => update((d) => void (d.weight = n))}
              />
            </div>
            <FluidBalanceCard value={evo.fluid} weight={weight} onChange={(f) => update((d) => void (d.fluid = f))} />
            {carry(
              'examText',
              <div className="card stack gap-2">
                <strong className="t-headline">Exame físico</strong>
                <TextArea value={evo.examText} onChange={(t) => setField('examText', t)} rows={4} placeholder="Ex.: BEG, LOTE… AR: … ACV: … ABD: … MMII: …" aria-label="Exame físico" />
                {!evo.examText.trim() && (
                  <div className="row gap-2 wrap">
                    {base && examSummary(base, patient) && (
                      <Button variant="tinted" size="sm" icon={Stethoscope} onClick={() => setField('examText', examSummary(base, patient))}>
                        Usar o da anamnese
                      </Button>
                    )}
                    <Button variant="gray" size="sm" onClick={() => setField('examText', NORMAL_EXAM)}>
                      Modelo normal
                    </Button>
                  </div>
                )}
                {evo.examText === NORMAL_EXAM && <p className="t-footnote c-orange">Modelo inserido: altere o que estiver diferente no exame de hoje.</p>}
              </div>,
            )}
            {carry(
              'objectiveNotes',
              <TextArea
                label="Outros dados objetivos"
                value={evo.objectiveNotes}
                onChange={(t) => setField('objectiveNotes', t)}
                rows={2}
                placeholder="Drogas vasoativas, sedação, ventilação (modo, FiO₂, PEEP), culturas, imagem…"
              />,
            )}
          </div>
          <DevicesSection patient={patient} date={evo.date} />
          <AntibioticsSection patient={patient} date={evo.date} />
          <LabsSection patient={patient} mode={mode} date={evo.date} maxCols={3} />
        </section>

        {/* ---------- A ---------- */}
        <section id="evo-a" className="section" aria-labelledby="evo-a-t">
          <h2 id="evo-a-t" className="section-title">
            A · Avaliação
          </h2>
          <div className="page-pad">
            {carry(
              'assessment',
              <TextArea value={evo.assessment} onChange={(t) => setField('assessment', t)} rows={3} placeholder="Impressão do dia: evolução, resposta ao tratamento, novos problemas" aria-label="Avaliação" />,
            )}
          </div>
          <ProblemsSection patient={patient} base={base} />
        </section>

        {/* ---------- P ---------- */}
        <section id="evo-p" className="section" aria-labelledby="evo-p-t">
          <h2 id="evo-p-t" className="section-title">
            P · Plano
          </h2>
          <div className="page-pad stack gap-3">
            {carry(
              'plan',
              <div className="stack gap-1">
                <TextArea value={evo.plan} onChange={(t) => setField('plan', t)} rows={4} placeholder="Condutas: manter, ajustar, suspender, solicitar…" aria-label="Plano" />
                <p className="t-caption c-secondary">Doses: conferir função renal/hepática, alergias e interações antes de prescrever.</p>
              </div>,
            )}
            {carry('todos', <TodoList todos={evo.todos} onChange={setTodos} />)}
            <DailyChecklist
              value={evo.checklist ?? {}}
              defaultOpen={base?.config.setting === 'uti'}
              onToggle={(id) => update((d) => void (d.checklist = { ...(d.checklist ?? {}), [id]: !d.checklist?.[id] }))}
            />
          </div>
        </section>

        {/* ---------- Texto ---------- */}
        <section id="evo-texto" className="section" aria-labelledby="evo-texto-t">
          <h2 id="evo-texto-t" className="section-title">
            Texto da evolução
          </h2>
          <div className="page-pad stack gap-3">
            <pre className="evo-text" aria-label="Texto da evolução">
              {text}
            </pre>
            <div className="note-actions">
              <Button variant="primary" size="lg" icon={Copy} onClick={() => void copy()}>
                Copiar
              </Button>
              <Button variant="tinted" size="lg" icon={FileDown} onClick={() => void pdf()}>
                PDF
              </Button>
            </div>
          </div>
        </section>

        <Disclaimer>{CLINICAL_DISCLAIMER}</Disclaimer>
      </Page>

      <nav className="bottom-toolbar glass" aria-label="Ações da evolução">
        <Button variant="glass" iconOnly icon={Handshake} aria-label="Passagem de plantão (SBAR)" onClick={() => setSbarOpen(true)} />
        <button type="button" className="bottom-toolbar-center" onClick={() => jump('evo-texto')}>
          <strong>Evolução</strong>
          <span className="c-secondary">{day ? `D${day}` : formatShortDate(evo.date)}</span>
        </button>
        <Button variant="primary" icon={Copy} onClick={() => void copy()}>
          Copiar
        </Button>
      </nav>

      <SbarSheet open={sbarOpen} onClose={() => setSbarOpen(false)} patient={patient} base={base} evolutions={evolutions} mode={mode} />
    </>
  );
}

/* ---------- Campo copiado da evolução anterior ---------- */

function Carried({ carried, from, onReviewed, children }: { carried: boolean; from: string; onReviewed: () => void; children: ReactNode }) {
  if (!carried) return <>{children}</>;
  return (
    <div className="carried">
      <div className="carried-head">
        <span className="tag" data-tone="orange">
          Copiado de {from}
        </span>
        <Button variant="plain" size="sm" icon={Check} onClick={onReviewed}>
          Revisado
        </Button>
      </div>
      {children}
    </div>
  );
}

/* ---------- Pendências do dia ---------- */

function TodoList({ todos, onChange }: { todos: Todo[]; onChange: (t: Todo[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...todos, { id: uid(), text: t, done: false }]);
    setDraft('');
  };
  const patch = (id: string, p: Partial<Todo>) => onChange(todos.map((t) => (t.id === id ? { ...t, ...p } : t)));
  return (
    <div className="card stack gap-2">
      <strong className="t-headline">Pendências</strong>
      <ul className="todo-list">
        {todos.map((t) => (
          <li key={t.id} className="todo-row" data-done={t.done || undefined}>
            <button type="button" role="checkbox" aria-checked={t.done} aria-label={t.done ? 'Desmarcar' : 'Marcar como feito'} className="todo-check" onClick={() => patch(t.id, { done: !t.done })}>
              {t.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
            </button>
            <input className="todo-input" value={t.text} onChange={(e) => patch(t.id, { text: e.target.value })} aria-label="Pendência" />
            <button type="button" className="btn btn-plain btn-sm btn-icon" aria-label={`Remover “${t.text}”`} onClick={() => onChange(todos.filter((x) => x.id !== t.id))}>
              <X size={18} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="input grow" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ex.: ver resultado da hemocultura" aria-label="Nova pendência" />
        <Button type="submit" variant="tinted" iconOnly icon={Plus} aria-label="Adicionar pendência" />
      </form>
    </div>
  );
}

/* ---------- Checklist diário do leito (FAST HUGS BID) ---------- */

function DailyChecklist({ value, onToggle, defaultOpen }: { value: Record<string, boolean>; onToggle: (id: string) => void; defaultOpen: boolean }) {
  const done = DAILY_CHECKLIST.filter((c) => value[c.id]).length;
  return (
    <details className="card checklist" open={defaultOpen || done > 0}>
      <summary className="checklist-summary">
        <span className="stack grow">
          <strong className="t-headline">Checklist do leito</strong>
          <span className="t-footnote c-secondary">FAST HUGS BID · {done}/{DAILY_CHECKLIST.length} revisados</span>
        </span>
      </summary>
      <ul className="checklist-list">
        {DAILY_CHECKLIST.map((c) => (
          <li key={c.id}>
            <button type="button" role="checkbox" aria-checked={!!value[c.id]} className="checklist-row" onClick={() => onToggle(c.id)}>
              <span className="checklist-letter" aria-hidden="true">
                {c.letter}
              </span>
              <span className="stack grow">
                <span className="t-subhead">{c.label}</span>
                <span className="t-caption c-secondary">{c.hint}</span>
              </span>
              {value[c.id] ? <CheckCircle2 size={24} className="c-green" /> : <Circle size={24} className="c-secondary" />}
            </button>
          </li>
        ))}
      </ul>
      <ReferenceList ids={['fast-hug-2005', 'fast-hugs-bid-2009']} />
    </details>
  );
}
