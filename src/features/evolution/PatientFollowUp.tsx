import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { BedDouble, CalendarDays, Copy, FilePlus2, FileText, Handshake } from 'lucide-react';
import type { Encounter, Evolution, Patient } from '../../db/types';
import { db, uid } from '../../db';
import { newEvolution } from '../../db/factories';
import { mutatePatient } from '../../db/mutations';
import { ListRow, ListSection } from '../../components/ui/List';
import { Button } from '../../components/ui/Button';
import { evolveFrom, hospitalDay } from '../../clinical/evolution';
import { usePrefs } from '../../lib/settings';
import { formatDate, formatShortDate, toISODate } from '../../lib/format';
import { AntibioticsSection, DevicesSection, ProblemsSection } from './PatientLists';
import { LabsSection } from './LabsSection';
import { TrendsCard } from './TrendsCard';
import { SbarSheet } from './SbarSheet';

/* ==========================================================================
   ACOMPANHAMENTO DO PACIENTE (prontuário contínuo)
   Internação · Evoluções diárias · Sinais vitais · Problemas · Dispositivos
   · Antimicrobianos · Exames · Passagem de plantão
   ========================================================================== */

export function useEvolutions(patientId: string): Evolution[] | undefined {
  return useLiveQuery(
    async () => (await db.evolutions.where('patientId').equals(patientId).toArray()).sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)),
    [patientId],
  );
}

export function PatientFollowUp({ patient, base }: { patient: Patient; base: Encounter }) {
  const navigate = useNavigate();
  const { prefs } = usePrefs();
  const evolutions = useEvolutions(patient.id);
  const [sbarOpen, setSbarOpen] = useState(false);
  const today = toISODate();
  const mode = base.config.mode ?? prefs.defaultMode;

  if (!evolutions) return null;
  const todays = evolutions.filter((e) => e.date === today);
  const previous = evolutions.find((e) => e.date < today);

  async function start(fromPrevious: boolean) {
    const blank = newEvolution(patient.id, today);
    const evo = fromPrevious && previous ? evolveFrom(previous, blank, uid) : blank;
    await db.evolutions.add(evo);
    navigate(`/evolucao/${patient.id}/${evo.id}`);
  }

  return (
    <>
      <ListSection header="Internação" icons>
        <div className="list-row">
          <span className="list-row-icon" aria-hidden="true">
            <CalendarDays size={18} />
          </span>
          <label htmlFor="admission" className="list-row-title grow">
            Data da internação
          </label>
          <input
            id="admission"
            type="date"
            className="list-row-field"
            style={{ flex: 'none', width: 'auto' }}
            value={patient.admissionDate ?? ''}
            max={today}
            onChange={(e) => {
              // lê o valor AGORA: a gravação é assíncrona e o React já terá restaurado o campo
              const v = e.target.value || undefined;
              void mutatePatient(patient.id, (d) => void (d.admissionDate = v));
            }}
          />
        </div>
        <BedRow patient={patient} />
      </ListSection>

      <ListSection
        header={`Evolução diária${patient.admissionDate ? ` · hoje é D${hospitalDay(patient, today)}` : ''}`}
        icons
        footer={previous && !todays.length ? `“Evoluir a partir de ${formatShortDate(previous.date)}” copia os textos e as pendências abertas e destaca o que precisa ser revisado. Sinais vitais e balanço são sempre do dia.` : undefined}
      >
        {todays.map((e) => (
          <ListRow key={e.id} icon={FileText} title="Evolução de hoje" subtitle={summaryOf(e)} to={`/evolucao/${patient.id}/${e.id}`} />
        ))}
        {!todays.length && previous && <ListRow icon={Copy} title={`Evoluir a partir de ${formatShortDate(previous.date)}`} accent onClick={() => void start(true)} />}
        <ListRow icon={FilePlus2} title={todays.length ? 'Outra evolução hoje' : 'Nova evolução em branco'} accent={!previous || !!todays.length} onClick={() => void start(false)} />
        {evolutions
          .filter((e) => e.date !== today)
          .slice(0, 30)
          .map((e) => {
            const day = hospitalDay(patient, e.date);
            return <ListRow key={e.id} icon={FileText} iconTone="gray" title={`${formatDate(e.date)}${day ? ` · D${day}` : ''}`} subtitle={summaryOf(e)} to={`/evolucao/${patient.id}/${e.id}`} />;
          })}
      </ListSection>

      <div className="page-pad mt-4">
        <Button variant="tinted" block icon={Handshake} onClick={() => setSbarOpen(true)}>
          Passagem de plantão (SBAR)
        </Button>
      </div>

      <TrendsCard evolutions={evolutions} base={base} patient={patient} />
      <ProblemsSection patient={patient} base={base} />
      <DevicesSection patient={patient} date={today} />
      <AntibioticsSection patient={patient} date={today} />
      <LabsSection patient={patient} mode={mode} date={today} />

      <SbarSheet open={sbarOpen} onClose={() => setSbarOpen(false)} patient={patient} base={base} evolutions={evolutions} mode={mode} />
    </>
  );
}

function summaryOf(e: Evolution): string | undefined {
  const t = (e.assessment || e.plan || e.subjective).trim().split('\n')[0];
  const pending = e.todos.filter((x) => !x.done).length;
  return [t && (t.length > 80 ? `${t.slice(0, 80)}…` : t), pending && `${pending} pendência(s)`].filter(Boolean).join(' · ') || undefined;
}

/** Leito: edita localmente e grava ao sair do campo (evita salvar a cada letra). */
function BedRow({ patient }: { patient: Patient }) {
  const [bed, setBed] = useState(patient.bed ?? '');
  useEffect(() => setBed(patient.bed ?? ''), [patient.bed]);
  const save = () => {
    const v = bed.trim() || undefined;
    if (v !== patient.bed) void mutatePatient(patient.id, (d) => void (d.bed = v));
  };
  return (
    <div className="list-row">
      <span className="list-row-icon" aria-hidden="true">
        <BedDouble size={18} />
      </span>
      <label htmlFor="bed" className="list-row-title" style={{ flex: 'none' }}>
        Leito
      </label>
      <input id="bed" className="list-row-field" value={bed} placeholder="opcional" onChange={(e) => setBed(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
    </div>
  );
}
