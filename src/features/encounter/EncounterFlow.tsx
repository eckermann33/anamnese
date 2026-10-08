import { useEffect, useState, type ComponentType } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, CloudOff, List, Loader2, Mic } from 'lucide-react';
import { EncounterProvider, useEncounter } from './EncounterContext';
import { STEPS, perfilTitle, visibleSteps } from './steps';
import { Page, EmptyState } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { AllergyBanner, RedFlagBanner } from '../../components/clinical/Banners';
import type { StepId } from '../../db/types';
import { ConfigStep } from './steps/ConfigStep';
import { IdStep } from './steps/IdStep';
import { QpStep } from './steps/QpStep';
import { SistemasStep } from './steps/SistemasStep';
import { HdaStep } from './steps/HdaStep';
import { IsdaStep } from './steps/IsdaStep';
import { ApStep } from './steps/ApStep';
import { FamiliaStep, HabitosStep, PerfilStep } from './steps/SectionsStep';
import { ExameStep } from './steps/ExameStep';
import { HipotesesStep } from './steps/HipotesesStep';
import { ProntuarioStep } from './steps/ProntuarioStep';
import { FileQuestion } from 'lucide-react';
import { StepSearch } from './SearchSheet';
import { DictationSheet } from './DictationSheet';
import { usePrefs } from '../../lib/settings';
import type { SearchEntry } from './search';

const STEP_COMPONENT: Record<StepId, ComponentType> = {
  config: ConfigStep,
  id: IdStep,
  qp: QpStep,
  sistemas: SistemasStep,
  hda: HdaStep,
  isda: IsdaStep,
  ap: ApStep,
  perfil: PerfilStep,
  familia: FamiliaStep,
  habitos: HabitosStep,
  exame: ExameStep,
  hipoteses: HipotesesStep,
  prontuario: ProntuarioStep,
};

/** Rota /atendimento/:id/:step */
export function EncounterRoute() {
  const { id } = useParams();
  if (!id) return <Navigate to="/atender" replace />;
  return (
    <EncounterProvider
      encounterId={id}
      fallback={
        <Page title="Atendimento" back={{ to: '/atender', label: 'Atender' }}>
          <EmptyState icon={FileQuestion} title="Atendimento não encontrado">
            Ele pode ter sido apagado neste aparelho.
          </EmptyState>
        </Page>
      }
    >
      <EncounterFlow />
    </EncounterProvider>
  );
}

function EncounterFlow() {
  const { step: stepParam, id } = useParams();
  const navigate = useNavigate();
  const { enc, patient, update, redFlags, saveState } = useEncounter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const [dictOpen, setDictOpen] = useState(false);
  const { prefs } = usePrefs();

  const steps = visibleSteps(enc, patient);
  const step = (STEPS.some((s) => s.id === stepParam) ? stepParam : enc.step) as StepId;
  const index = Math.max(0, steps.findIndex((s) => s.id === step));
  const current = steps[index] ?? steps[0];
  const Comp = STEP_COMPONENT[current.id];
  const title = current.id === 'perfil' ? perfilTitle(enc, patient) : current.title;

  // Guarda a etapa atual (para "continuar de onde parou") e volta ao topo.
  useEffect(() => {
    if (enc.step !== current.id) update((d) => void (d.step = current.id));
    window.scrollTo({ top: 0 });
  }, [current.id]);

  const go = (i: number) => {
    const s = steps[Math.min(steps.length - 1, Math.max(0, i))];
    navigate(`/atendimento/${id}/${s.id}`);
  };

  const visibleFlags = redFlags.filter((f) => !enc.dismissedAlerts.includes(f.id));

  // Busca: vai para a etapa e, depois que ela renderizar, rola até a pergunta e destaca.
  useEffect(() => {
    if (!pendingAnchor) return;
    let tries = 0;
    let timer = 0;
    const tick = () => {
      const el = document.getElementById(pendingAnchor);
      if (el) {
        const nav = document.querySelector('.navbar')?.getBoundingClientRect().height ?? 0;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - nav - 12, behavior: reduce ? 'auto' : 'smooth' });
        el.classList.add('search-hit');
        window.setTimeout(() => el.classList.remove('search-hit'), 1800);
        setPendingAnchor(null);
      } else if (++tries < 20) timer = window.setTimeout(tick, 60);
      else setPendingAnchor(null);
    };
    timer = window.setTimeout(tick, 80); // depois do "volta ao topo" da troca de etapa
    return () => window.clearTimeout(timer);
  }, [pendingAnchor, current.id]);

  function goToResult(r: SearchEntry) {
    setMenuOpen(false);
    setQuery('');
    if (r.step !== current.id) navigate(`/atendimento/${id}/${r.step}`);
    setPendingAnchor(r.anchor ?? null);
  }

  return (
    <>
      <Page
        title={title}
        compact
        toolbar
        back={{ to: '/atender', label: 'Atender', iconOnly: true }}
        actions={
          <>
            <span className="save-state" aria-live="polite" data-state={saveState}>
              {saveState === 'salvando' ? (
                <Loader2 size={16} className="spin" aria-label="Salvando" />
              ) : saveState === 'erro' ? (
                <CloudOff size={16} aria-label="Erro ao salvar" />
              ) : (
                <Check size={16} aria-label="Salvo no aparelho" />
              )}
            </span>
            {prefs.aiEnabled && <Button variant="glass" iconOnly icon={Mic} aria-label="Ditar o caso" onClick={() => setDictOpen(true)} />}
            <Button variant="glass" iconOnly icon={List} aria-label="Etapas e busca" onClick={() => setMenuOpen(true)} />
          </>
        }
        sticky={
          <div className="sticky-stack">
            <AllergyBanner allergies={enc.history.allergies} noKnown={false} />
            <RedFlagBanner flags={visibleFlags} />
            <button type="button" className="step-progress" onClick={() => setMenuOpen(true)} aria-label={`Etapa ${index + 1} de ${steps.length}: ${title}. Toque para navegar.`}>
              {steps.map((s, i) => (
                <span key={s.id} className="step-progress-seg" data-state={i < index ? 'done' : i === index ? 'current' : undefined} />
              ))}
            </button>
          </div>
        }
      >
        <div className="step-head page-pad">
          <span className="t-footnote c-secondary">
            Etapa {index + 1} de {steps.length}
          </span>
          <h1 className="t-title2">{title}</h1>
        </div>
        <Comp />
      </Page>

      <nav className="bottom-toolbar glass" aria-label="Navegação entre etapas">
        <Button variant="glass" iconOnly icon={ChevronLeft} aria-label="Etapa anterior" disabled={index === 0} onClick={() => go(index - 1)} />
        <button type="button" className="bottom-toolbar-center" onClick={() => setMenuOpen(true)}>
          <strong>{current.short}</strong>
          <span className="c-secondary">
            {index + 1}/{steps.length}
          </span>
        </button>
        {index < steps.length - 1 ? (
          <Button variant="primary" icon={ChevronRight} onClick={() => go(index + 1)} className="btn-next">
            {steps[index + 1].short}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate(`/pacientes/${patient.id}`)}>
            Paciente
          </Button>
        )}
      </nav>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Etapas do atendimento" subtitle="Navegação livre — tudo é salvo automaticamente">
        <StepSearch q={query} setQ={setQuery} steps={steps.map((s) => s.id)} onGo={goToResult} />
        {!query.trim() && (
          <ol className="list-group step-menu mt-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="list-row"
                    aria-current={i === index ? 'step' : undefined}
                    onClick={() => {
                      setMenuOpen(false);
                      go(i);
                    }}
                  >
                    <span className="list-row-icon" data-tone={i === index ? undefined : 'gray'} aria-hidden="true">
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="list-row-body">
                      <span className="list-row-title">{s.id === 'perfil' ? perfilTitle(enc, patient) : s.title}</span>
                    </span>
                    <span className="list-row-value tabular">{i + 1}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Sheet>

      <DictationSheet open={dictOpen} onClose={() => setDictOpen(false)} />
    </>
  );
}
