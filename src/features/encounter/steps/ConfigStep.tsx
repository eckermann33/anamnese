import { Ambulance, Baby, BedDouble, BookOpenCheck, Building2, HeartPulse, PersonStanding, Stethoscope, UserRound, Zap } from 'lucide-react';
import { OptionCards } from '../../../components/ui/OptionCards';
import { useEncounter } from '../EncounterContext';
import type { Mode, Profile, Setting } from '../../../clinical/types';

/** Etapa 1 — Configuração do atendimento: cenário, modo e perfil. */
export function ConfigStep() {
  const { enc, update } = useEncounter();
  return (
    <div className="stack gap-6 page-pad">
      <section>
        <h2 className="step-subtitle">Cenário</h2>
        <p className="step-help">Muda a profundidade: no PS e na UTI a anamnese é mais objetiva e focada em gravidade.</p>
        <OptionCards<Setting>
          ariaLabel="Cenário"
          value={enc.config.setting}
          onChange={(v) => update((d) => void (d.config.setting = v))}
          options={[
            { value: 'ps', title: 'Pronto-socorro', description: 'Objetivo, foco em gravidade', icon: Ambulance },
            { value: 'ambulatorio', title: 'Ambulatório', description: 'Completo e detalhado', icon: Building2 },
            { value: 'enfermaria', title: 'Enfermaria', description: 'Completo + evolução diária', icon: BedDouble },
            { value: 'uti', title: 'UTI', description: 'Objetivo, dispositivos e escores', icon: HeartPulse },
          ]}
        />
      </section>

      <section>
        <h2 className="step-subtitle">Modo</h2>
        <OptionCards<Mode>
          ariaLabel="Modo"
          value={enc.config.mode}
          onChange={(v) => update((d) => void (d.config.mode = v))}
          options={[
            {
              value: 'estudante',
              title: 'Estudante',
              description: 'Cada pergunta tem “por que perguntar?” e a IA explica o raciocínio',
              icon: BookOpenCheck,
            },
            { value: 'plantao', title: 'Plantão', description: 'Só os campos — velocidade máxima, linguagem técnica', icon: Zap },
          ]}
        />
      </section>

      <section>
        <h2 className="step-subtitle">Perfil do paciente</h2>
        <p className="step-help">Ativa as seções específicas (gineco-obstétrica, pediátrica, idoso) e as faixas de sinais vitais.</p>
        <OptionCards<Profile>
          ariaLabel="Perfil"
          value={enc.config.profile}
          onChange={(v) => update((d) => void (d.config.profile = v))}
          options={[
            { value: 'adulto', title: 'Adulto', icon: UserRound },
            { value: 'pediatria', title: 'Pediatria', icon: Baby },
            { value: 'gestante', title: 'Gestante', icon: Stethoscope },
            { value: 'idoso', title: 'Idoso', icon: PersonStanding },
          ]}
        />
      </section>
    </div>
  );
}
