import { GraduationCap } from 'lucide-react';
import { Page, EmptyState } from '../../components/ui/Page';

/** Aba "Treino" (OSCE) — implementada na Fase 3. */
export function TrainingHome() {
  return (
    <Page title="Treino" subtitle="Simulação de paciente (OSCE)">
      <EmptyState icon={GraduationCap} title="Em breve">
        Paciente simulado por IA, anamnese por chat ou voz e feedback por domínio.
      </EmptyState>
    </Page>
  );
}
