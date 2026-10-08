import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Users, AlertTriangle, UserRound } from 'lucide-react';
import { db } from '../../db';
import { Page, EmptyState } from '../../components/ui/Page';
import { ListRow, ListSection } from '../../components/ui/List';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { daysBetween, normalize, relativeTime } from '../../lib/format';
import type { Encounter, Patient } from '../../db/types';

type Filter = 'ativo' | 'alta' | 'todos';

/** Aba "Pacientes": prontuários salvos no aparelho. */
export function PatientsList() {
  const [filter, setFilter] = useState<Filter>('ativo');
  const [q, setQ] = useState('');

  const data = useLiveQuery(async () => {
    const [patients, encounters] = await Promise.all([db.patients.toArray(), db.encounters.toArray()]);
    const byPatient = new Map<string, Encounter[]>();
    for (const e of encounters) byPatient.set(e.patientId, [...(byPatient.get(e.patientId) ?? []), e]);
    return patients
      .map((p) => {
        const encs = (byPatient.get(p.id) ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
        return { p, last: encs[0] as Encounter | undefined, updated: Math.max(p.updatedAt, encs[0]?.updatedAt ?? 0) };
      })
      .sort((a, b) => b.updated - a.updated);
  }, []);

  const list = useMemo(() => {
    const term = normalize(q);
    return (data ?? []).filter(({ p, last }) => {
      if (filter !== 'todos' && (filter === 'ativo' ? p.status !== 'ativo' : p.status === 'ativo')) return false;
      if (!term) return true;
      return normalize(`${p.initials} ${p.bed ?? ''} ${last?.complaint.text ?? ''}`).includes(term);
    });
  }, [data, filter, q]);

  return (
    <Page title="Pacientes" subtitle="Salvos só neste aparelho">
      <div className="page-pad stack gap-3">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por iniciais, leito ou queixa" aria-label="Buscar paciente" />
        </label>
        <SegmentedControl<Filter>
          ariaLabel="Filtro"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ativo', label: 'Ativos' },
            { value: 'alta', label: 'Alta/arquivo' },
            { value: 'todos', label: 'Todos' },
          ]}
        />
      </div>

      {data && list.length === 0 ? (
        <EmptyState icon={Users} title={data.length ? 'Nenhum paciente encontrado' : 'Nenhum paciente ainda'}>
          {data.length ? 'Ajuste a busca ou o filtro.' : 'Comece um atendimento na aba Atender.'}
        </EmptyState>
      ) : (
        <ListSection icons>
          {list.map(({ p, last, updated }) => (
            <ListRow
              key={p.id}
              icon={hasAllergy(last) ? AlertTriangle : UserRound}
              iconTone={hasAllergy(last) ? 'red' : 'accent'}
              title={patientTitle(p)}
              subtitle={[inpatientDay(p, last), last?.complaint.text, p.bed && `Leito ${p.bed}`, relativeTime(updated)].filter(Boolean).join(' · ')}
              to={`/pacientes/${p.id}`}
            />
          ))}
        </ListSection>
      )}
    </Page>
  );
}

/** "D5" só para internados (enfermaria/UTI) ainda ativos. */
function inpatientDay(p: Patient, last?: Encounter) {
  if (p.status !== 'ativo' || !last || (last.config.setting !== 'enfermaria' && last.config.setting !== 'uti')) return undefined;
  // conta inline (D1 = dia da internação) para não carregar o motor clínico na lista
  if (!p.admissionDate) return undefined;
  const d = daysBetween(p.admissionDate) + 1;
  return d >= 1 ? `D${d}` : undefined;
}

function hasAllergy(e?: Encounter) {
  return !!e?.history.allergies.length;
}

export function patientTitle(p: Patient) {
  const sex = p.sex === 'F' ? 'F' : p.sex === 'M' ? 'M' : '';
  return [p.initials || 'Sem iniciais', p.age !== undefined ? `${p.age} ${p.ageUnit === 'anos' ? 'a' : p.ageUnit}` : '', sex].filter(Boolean).join(' · ');
}
