import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { Archive, FileText, Plus, RotateCcw, Trash2, UserX } from 'lucide-react';
import { db, deletePatient } from '../../db';
import { newEncounter } from '../../db/factories';
import { Page, EmptyState } from '../../components/ui/Page';
import { ListRow, ListSection } from '../../components/ui/List';
import { Button } from '../../components/ui/Button';
import { AllergyBanner } from '../../components/clinical/Banners';
import { useConfirm, useToast } from '../../components/ui/Overlays';
import { usePrefs } from '../../lib/settings';
import { daysBetween, formatDate, relativeTime } from '../../lib/format';
import { TEMPLATE_BY_ID } from '../../clinical/templates';
import { patientTitle } from './PatientsList';
import { PatientFollowUp } from '../evolution/PatientFollowUp';

/** Prontuário do paciente: anamnese(s) + acompanhamento. */
export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { prefs } = usePrefs();

  const data = useLiveQuery(async () => {
    if (!id) return null;
    const p = await db.patients.get(id);
    if (!p) return null;
    const encs = (await db.encounters.where('patientId').equals(id).toArray()).sort((a, b) => b.createdAt - a.createdAt);
    return { p, encs };
  }, [id]);

  if (data === undefined) return null;
  if (data === null)
    return (
      <Page title="Paciente" back={{ to: '/pacientes', label: 'Pacientes' }}>
        <EmptyState icon={UserX} title="Paciente não encontrado" />
      </Page>
    );

  const { p, encs } = data;
  const base = encs.find((e) => e.status === 'concluido') ?? encs[0];
  const hospitalDay = p.admissionDate ? daysBetween(p.admissionDate) + 1 : undefined;

  async function newVisit() {
    const e = newEncounter(p.id, { setting: base?.config.setting ?? prefs.defaultSetting, mode: prefs.defaultMode, profile: base?.config.profile });
    if (base) e.history = structuredClone(base.history); // antecedentes já conhecidos
    await db.encounters.add(e);
    navigate(`/atendimento/${e.id}/qp`);
  }

  async function toggleStatus() {
    await db.patients.update(p.id, { status: p.status === 'ativo' ? 'alta' : 'ativo', updatedAt: Date.now() });
    toast(p.status === 'ativo' ? 'Paciente movido para alta/arquivo' : 'Paciente reativado', 'success');
  }

  async function remove() {
    if (!(await confirm({ title: 'Apagar paciente?', message: 'Remove a anamnese, as evoluções e todos os dados deste paciente do aparelho.', confirmLabel: 'Apagar', destructive: true })))
      return;
    await deletePatient(p.id);
    toast('Paciente apagado', 'success');
    navigate('/pacientes', { replace: true });
  }

  return (
    <Page
      title={patientTitle(p)}
      subtitle={[p.bed && `Leito ${p.bed}`, hospitalDay && `D${hospitalDay} de internação`, base?.complaint.text].filter(Boolean).join(' · ')}
      back={{ to: '/pacientes', label: 'Pacientes' }}
      sticky={
        base?.history.allergies.length ? (
          <div className="sticky-stack">
            <AllergyBanner allergies={base.history.allergies} noKnown={false} />
          </div>
        ) : undefined
      }
    >
      <ListSection header="Anamnese" icons>
        {encs.map((e) => (
          <ListRow
            key={e.id}
            icon={FileText}
            title={e.complaint.text || (e.templateId ? TEMPLATE_BY_ID[e.templateId]?.name : 'Atendimento')}
            subtitle={`${formatDate(e.createdAt)} · ${e.status === 'concluido' ? 'concluído' : 'em andamento'} · ${relativeTime(e.updatedAt)}`}
            to={`/atendimento/${e.id}/${e.status === 'concluido' ? 'prontuario' : e.step}`}
          />
        ))}
        <ListRow icon={Plus} title="Novo atendimento (reconsulta)" accent onClick={newVisit} />
      </ListSection>

      {base && <PatientFollowUp patient={p} base={base} />}

      <div className="page-pad stack gap-2 mt-6">
        <Button variant="gray" block icon={p.status === 'ativo' ? Archive : RotateCcw} onClick={toggleStatus}>
          {p.status === 'ativo' ? 'Dar alta / arquivar' : 'Reativar paciente'}
        </Button>
        <Button variant="destructive" block icon={Trash2} onClick={remove}>
          Apagar paciente
        </Button>
      </div>
    </Page>
  );
}
