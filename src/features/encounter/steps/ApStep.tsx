import { useEncounter } from '../EncounterContext';
import { ChipSelect, Chip } from '../../../components/ui/Chip';
import { TextField } from '../../../components/ui/TextField';
import { Toggle } from '../../../components/ui/Toggle';
import { ItemListEditor } from '../../../components/clinical/ItemListEditor';
import { MedAlertList } from '../../../components/clinical/MedAlerts';
import { QuestionSectionView } from '../../../components/clinical/QuestionSectionView';
import { DISEASE_OPTIONS, VACCINE_SECTION } from '../../../clinical/historySections';
import { DRUGS } from '../../../clinical/drugs';
import { uid } from '../../../db';
import type { Allergy, HistoryItem, Medication } from '../../../db/types';

/** Etapa 7 — Antecedentes pessoais. */
export function ApStep() {
  const { enc, update, medAlerts } = useEncounter();
  const h = enc.history;

  return (
    <div className="stack gap-4">
      {/* Sugestões de medicamentos para o autocompletar */}
      <datalist id="drug-names">
        {DRUGS.map((d) => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>

      <section className="qsection" id="ap-doencas">
        <h2 className="qsection-title">Doenças prévias</h2>
        <div className="qsection-card stack gap-3">
          <ChipSelect
            ariaLabel="Doenças prévias"
            multiple
            options={DISEASE_OPTIONS}
            value={h.diseases}
            onChange={(v) => update((d) => void (d.history.diseases = (v as string[]) ?? []))}
          />
          <TextField
            value={h.diseasesOther}
            onChange={(v) => update((d) => void (d.history.diseasesOther = v))}
            placeholder="Outras (texto livre)"
            aria-label="Outras doenças"
          />
        </div>
      </section>

      <section className="qsection" id="ap-alergias">
        <h2 className="qsection-title">Alergias</h2>
        <div className="qsection-card stack gap-3">
          <label className="row between gap-3">
            <span className="t-body">Nega alergias conhecidas</span>
            <Toggle
              checked={h.noKnownAllergies}
              onChange={(c) =>
                update((d) => {
                  d.history.noKnownAllergies = c;
                  if (c) d.history.allergies = [];
                })
              }
              ariaLabel="Nega alergias conhecidas"
            />
          </label>
          {!h.noKnownAllergies && (
            <ItemListEditor<Allergy>
              ariaLabel="Alergias"
              items={h.allergies}
              onChange={(items) => update((d) => void (d.history.allergies = items))}
              create={() => ({ id: uid(), substance: '' })}
              addLabel="Adicionar alergia"
              fields={[
                { key: 'substance', placeholder: 'Substância (ex.: dipirona)', list: 'drug-names' },
                { key: 'reaction', placeholder: 'Reação' },
              ]}
              renderExtra={(it, patch) => (
                <div className="chip-group">
                  {(['leve', 'moderada', 'grave'] as const).map((s) => (
                    <Chip key={s} small selected={it.severity === s} flag={s === 'grave' ? 'red' : undefined} onClick={() => patch({ severity: it.severity === s ? undefined : s })}>
                      {s}
                    </Chip>
                  ))}
                </div>
              )}
            />
          )}
        </div>
      </section>

      <section className="qsection" id="ap-medicacoes">
        <h2 className="qsection-title">Medicações em uso</h2>
        <div className="qsection-card stack gap-3">
          <label className="row between gap-3">
            <span className="t-body">Não usa medicações contínuas</span>
            <Toggle
              checked={h.noMedications}
              onChange={(c) =>
                update((d) => {
                  d.history.noMedications = c;
                  if (c) d.history.medications = [];
                })
              }
              ariaLabel="Não usa medicações"
            />
          </label>
          {!h.noMedications && (
            <ItemListEditor<Medication>
              ariaLabel="Medicações"
              items={h.medications}
              onChange={(items) => update((d) => void (d.history.medications = items))}
              create={() => ({ id: uid(), name: '' })}
              addLabel="Adicionar medicação"
              fields={[
                { key: 'name', placeholder: 'Nome (genérico ou comercial)', list: 'drug-names' },
                { key: 'dose', placeholder: 'Dose' },
                { key: 'posology', placeholder: 'Posologia' },
              ]}
            />
          )}
          {medAlerts.length > 0 && (
            <div className="stack gap-2">
              <strong className="t-subhead">Alertas de medicação</strong>
              <MedAlertList alerts={medAlerts} />
            </div>
          )}
        </div>
      </section>

      <section className="qsection" id="ap-cirurgias">
        <h2 className="qsection-title">Cirurgias e internações</h2>
        <div className="qsection-card stack gap-4">
          <ItemListEditor<HistoryItem>
            ariaLabel="Cirurgias prévias"
            items={h.surgeries}
            onChange={(items) => update((d) => void (d.history.surgeries = items))}
            create={() => ({ id: uid(), name: '' })}
            addLabel="Adicionar cirurgia"
            fields={[
              { key: 'name', placeholder: 'Cirurgia' },
              { key: 'year', placeholder: 'Ano', width: '76px', inputMode: 'numeric' },
            ]}
          />
          <ItemListEditor<HistoryItem>
            ariaLabel="Internações prévias"
            items={h.hospitalizations}
            onChange={(items) => update((d) => void (d.history.hospitalizations = items))}
            create={() => ({ id: uid(), name: '' })}
            addLabel="Adicionar internação"
            fields={[
              { key: 'name', placeholder: 'Motivo da internação' },
              { key: 'year', placeholder: 'Ano', width: '76px', inputMode: 'numeric' },
            ]}
          />
        </div>
      </section>

      <QuestionSectionView section={VACCINE_SECTION} showExtra />
    </div>
  );
}
