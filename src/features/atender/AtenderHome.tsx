import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Stethoscope, Clock3, Sparkles, BookOpenCheck, Zap, ShieldAlert } from 'lucide-react';
import { db } from '../../db';
import { newEncounter, newPatient } from '../../db/factories';
import { Page, Disclaimer } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { ListRow, ListSection } from '../../components/ui/List';
import { usePrefs } from '../../lib/settings';
import { relativeTime } from '../../lib/format';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { STEPS } from '../encounter/steps';
import { TEMPLATE_BY_ID } from '../../clinical/templates';
import { CLINICAL_DISCLAIMER } from '../../config/app';
import type { Mode } from '../../clinical/types';

/** Aba "Atender": iniciar um novo atendimento e retomar os em andamento. */
export function AtenderHome() {
  const navigate = useNavigate();
  const { prefs, setPrefs } = usePrefs();

  const inProgress = useLiveQuery(async () => {
    const encs = await db.encounters.where('status').equals('em_andamento').reverse().sortBy('updatedAt');
    const patients = await db.patients.bulkGet(encs.map((e) => e.patientId));
    return encs.map((e, i) => ({ enc: e, patient: patients[i] }));
  }, []);

  async function start() {
    const p = newPatient();
    const e = newEncounter(p.id, { setting: prefs.defaultSetting, mode: prefs.defaultMode });
    await db.transaction('rw', db.patients, db.encounters, async () => {
      await db.patients.add(p);
      await db.encounters.add(e);
    });
    navigate(`/atendimento/${e.id}/config`);
  }

  return (
    <Page title="Atender" subtitle="Anamnese guiada à beira do leito">
      <div className="page-pad stack gap-4">
        <div className="hero-card">
          <div className="hero-icon" aria-hidden="true">
            <Stethoscope size={28} strokeWidth={1.75} />
          </div>
          <div className="stack gap-1">
            <strong className="t-title3">Novo atendimento</strong>
            <span className="t-subhead c-secondary">Configuração → queixa → anamnese ramificada → exame → hipóteses → prontuário</span>
          </div>
          <Button variant="primary" size="lg" block icon={Plus} onClick={start}>
            Começar
          </Button>
          <SegmentedControl<Mode>
            ariaLabel="Modo padrão"
            value={prefs.defaultMode}
            onChange={(m) => setPrefs({ defaultMode: m })}
            options={[
              { value: 'estudante', label: <><BookOpenCheck size={16} aria-hidden="true" /> Estudante</> },
              { value: 'plantao', label: <><Zap size={16} aria-hidden="true" /> Plantão</> },
            ]}
          />
        </div>
      </div>

      {inProgress && inProgress.length > 0 && (
        <ListSection header="Em andamento" icons>
          {inProgress.map(({ enc, patient }) => {
            const step = STEPS.find((s) => s.id === enc.step);
            const tpl = enc.templateId ? TEMPLATE_BY_ID[enc.templateId]?.name : undefined;
            return (
              <ListRow
                key={enc.id}
                icon={Clock3}
                title={`${patient?.initials || 'Sem iniciais'}${patient?.age !== undefined ? ` · ${patient.age} ${patient.ageUnit}` : ''}`}
                subtitle={[enc.complaint.text || tpl || 'Queixa não informada', step?.title, relativeTime(enc.updatedAt)].filter(Boolean).join(' · ')}
                to={`/atendimento/${enc.id}/${enc.step}`}
              />
            );
          })}
        </ListSection>
      )}

      <ListSection header="Atalhos" icons>
        <ListRow icon={Sparkles} title="Templates por queixa" subtitle="Dor torácica, dispneia, dor abdominal, cefaleia, febre, síncope, lombalgia…" to="/templates" />
      </ListSection>

      <Disclaimer icon={ShieldAlert}>{CLINICAL_DISCLAIMER}</Disclaimer>
    </Page>
  );
}
