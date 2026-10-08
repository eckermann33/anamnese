import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { produce, type Draft } from 'immer';
import { db } from '../../db';
import type { Encounter, Patient } from '../../db/types';
import { buildContext, type ClinicalContext } from '../../clinical/context';
import { evaluateRedFlags, type RedFlag } from '../../clinical/redFlags';
import { medicationAlerts, type MedAlert } from '../../clinical/drugs';

/* ==========================================================================
   ESTADO DO ATENDIMENTO + SALVAMENTO AUTOMÁTICO
   --------------------------------------------------------------------------
   - Carrega o atendimento e o paciente do IndexedDB.
   - Toda alteração é aplicada na hora (tela responsiva) e salva no banco
     ~400 ms depois (debounce). Ao sair/ocultar o app, salva imediatamente.
   - Calcula, a cada mudança, o contexto clínico, as red flags e os alertas
     de medicação.
   ========================================================================== */

type SaveState = 'salvo' | 'salvando' | 'erro';

interface EncounterCtx {
  enc: Encounter;
  patient: Patient;
  update: (fn: (draft: Draft<Encounter>) => void) => void;
  updatePatient: (fn: (draft: Draft<Patient>) => void) => void;
  ctx: ClinicalContext;
  redFlags: RedFlag[];
  medAlerts: MedAlert[];
  saveState: SaveState;
  flush: () => Promise<void>;
}

const Ctx = createContext<EncounterCtx | null>(null);

export function useEncounter() {
  const c = useContext(Ctx);
  if (!c) throw new Error('EncounterProvider ausente');
  return c;
}

export function EncounterProvider({ encounterId, children, fallback }: { encounterId: string; children: ReactNode; fallback: ReactNode }) {
  const [enc, setEnc] = useState<Encounter | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [missing, setMissing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('salvo');

  const pending = useRef<{ enc?: Encounter; patient?: Patient }>({});
  const timer = useRef<number | undefined>(undefined);

  // Carregamento inicial
  useEffect(() => {
    let alive = true;
    (async () => {
      const e = await db.encounters.get(encounterId);
      const p = e ? await db.patients.get(e.patientId) : undefined;
      if (!alive) return;
      if (!e || !p) {
        setMissing(true);
        return;
      }
      setEnc(e);
      setPatient(p);
    })();
    return () => {
      alive = false;
    };
  }, [encounterId]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const { enc: e, patient: p } = pending.current;
    pending.current = {};
    if (!e && !p) return;
    setSaveState('salvando');
    try {
      await db.transaction('rw', db.encounters, db.patients, async () => {
        if (e) await db.encounters.put(e);
        if (p) await db.patients.put(p);
      });
      setSaveState('salvo');
    } catch {
      setSaveState('erro');
    }
  }, []);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    setSaveState('salvando');
    timer.current = window.setTimeout(() => void flush(), 400);
  }, [flush]);

  const update = useCallback(
    (fn: (draft: Draft<Encounter>) => void) => {
      setEnc((current) => {
        if (!current) return current;
        const next = produce(current, (d) => {
          fn(d);
          d.updatedAt = Date.now();
        });
        pending.current.enc = next;
        return next;
      });
      schedule();
    },
    [schedule],
  );

  const updatePatient = useCallback(
    (fn: (draft: Draft<Patient>) => void) => {
      setPatient((current) => {
        if (!current) return current;
        const next = produce(current, (d) => {
          fn(d);
          d.updatedAt = Date.now();
        });
        pending.current.patient = next;
        return next;
      });
      schedule();
    },
    [schedule],
  );

  // Salva imediatamente ao sair da tela / ocultar o app / desmontar.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  const derived = useMemo(() => {
    if (!enc || !patient) return null;
    const ctx = buildContext(enc, patient);
    return {
      ctx,
      redFlags: evaluateRedFlags(ctx),
      medAlerts: medicationAlerts({
        medications: enc.history.medications,
        allergies: enc.history.allergies,
        profile: enc.config.profile,
        ageYears: ctx.ageYears,
        alcohol: ctx.has('hv_etilismo', 'regular', 'abuso', 'social'),
      }),
    };
  }, [enc, patient]);

  if (missing) return <>{fallback}</>;
  if (!enc || !patient || !derived) return null;

  return (
    <Ctx.Provider value={{ enc, patient, update, updatePatient, ...derived, saveState, flush }}>{children}</Ctx.Provider>
  );
}
