import { ShieldCheck } from 'lucide-react';
import { ListFieldRow, ListSection } from '../../../components/ui/List';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ChipSelect } from '../../../components/ui/Chip';
import { useEncounter } from '../EncounterContext';
import { parseNumber } from '../../../lib/format';
import type { AgeUnit, Sex } from '../../../clinical/types';

const MARITAL = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'];

/** Etapa 2 — Identificação. LGPD: só iniciais (nunca nome completo, CPF ou endereço). */
export function IdStep() {
  const { patient, updatePatient } = useEncounter();

  return (
    <div className="stack">
      <ListSection header="Paciente" footer="Use só as iniciais. Nunca registre nome completo, CPF ou endereço (LGPD).">
        <ListFieldRow
          label="Iniciais"
          value={patient.initials}
          placeholder="Ex.: J.S."
          maxLength={8}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(v) => updatePatient((d) => void (d.initials = v.toUpperCase().replace(/[^A-ZÀ-Ú. ]/g, '')))}
        />
        <ListFieldRow
          label="Idade"
          value={patient.age ?? ''}
          placeholder="0"
          inputMode="numeric"
          suffix={patient.ageUnit}
          onChange={(v) => updatePatient((d) => void (d.age = parseNumber(v)))}
        />
        <div className="list-row">
          <div className="grow">
            <SegmentedControl<AgeUnit>
              ariaLabel="Unidade da idade"
              value={patient.ageUnit}
              onChange={(u) => updatePatient((d) => void (d.ageUnit = u))}
              options={[
                { value: 'anos', label: 'anos' },
                { value: 'meses', label: 'meses' },
                { value: 'dias', label: 'dias' },
              ]}
            />
          </div>
        </div>
        <div className="list-row">
          <span className="list-row-title" style={{ flex: 'none' }}>
            Sexo
          </span>
          <div className="grow">
            <SegmentedControl<Sex>
              ariaLabel="Sexo"
              value={patient.sex}
              onChange={(s) => updatePatient((d) => void (d.sex = s))}
              options={[
                { value: 'F', label: 'Feminino' },
                { value: 'M', label: 'Masculino' },
                { value: 'O', label: 'Outro' },
              ]}
            />
          </div>
        </div>
      </ListSection>

      <ListSection header="Dados sociais">
        <ListFieldRow label="Ocupação" value={patient.occupation} placeholder="Ex.: motorista" onChange={(v) => updatePatient((d) => void (d.occupation = v))} />
        <ListFieldRow label="Procedência" value={patient.origin} placeholder="Cidade-UF" onChange={(v) => updatePatient((d) => void (d.origin = v))} />
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <span className="list-row-title">Estado civil</span>
          <ChipSelect
            small
            options={MARITAL.map((m) => ({ value: m, label: m }))}
            value={patient.maritalStatus}
            onChange={(v) => updatePatient((d) => void (d.maritalStatus = (v as string) ?? undefined))}
          />
        </div>
      </ListSection>

      <ListSection header="Internação (opcional)">
        <ListFieldRow label="Leito" value={patient.bed} placeholder="Ex.: 12B" onChange={(v) => updatePatient((d) => void (d.bed = v))} />
        <div className="list-row">
          <label htmlFor="adm" className="list-row-title" style={{ flex: 'none' }}>
            Internação
          </label>
          <input
            id="adm"
            type="date"
            className="list-row-field"
            value={patient.admissionDate ?? ''}
            onChange={(e) => {
              const v = e.target.value || undefined; // lido já: o updater roda depois
              updatePatient((d) => void (d.admissionDate = v));
            }}
          />
        </div>
      </ListSection>

      <div className="lgpd-note page-pad">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>Os dados ficam só neste aparelho. O que vai para a IA é anonimizado (sem iniciais e sem leito).</span>
      </div>
    </div>
  );
}
