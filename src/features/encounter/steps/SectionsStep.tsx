import { useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { useEncounter } from '../EncounterContext';
import { QuestionSectionView } from '../../../components/clinical/QuestionSectionView';
import { Button } from '../../../components/ui/Button';
import { defaultShowExtra, isSectionVisible } from '../../../clinical/context';
import type { QuestionSection } from '../../../clinical/types';
import {
  ELDERLY_SECTION,
  FAMILY_SECTION,
  GYNECO_SECTION,
  HABITS_SECTION,
  PEDIATRIC_SECTION,
  PRENATAL_SECTION,
  SOCIAL_SECTION,
} from '../../../clinical/historySections';

/** Etapa genérica que só renderiza seções de perguntas. */
function SectionsStep({ sections, empty }: { sections: QuestionSection[]; empty?: string }) {
  const { enc, ctx } = useEncounter();
  const [showExtra, setShowExtra] = useState(() => defaultShowExtra(enc));
  const visible = sections.filter((s) => isSectionVisible(s, ctx));
  const hasExtra = visible.some((s) => s.questions.some((q) => q.extra));

  if (!visible.length) {
    return (
      <div className="page-pad">
        <div className="banner banner-neutral">
          <Info size={18} aria-hidden="true" />
          <span className="banner-body">{empty ?? 'Nada a preencher nesta etapa para este perfil.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stack gap-4">
      {visible.map((s) => (
        <QuestionSectionView key={s.id} section={s} showExtra={showExtra} />
      ))}
      {hasExtra && (
        <div className="page-pad">
          <Button variant="gray" size="sm" icon={showExtra ? EyeOff : Eye} onClick={() => setShowExtra((v) => !v)}>
            {showExtra ? 'Ocultar perguntas complementares' : 'Mostrar perguntas complementares'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function PerfilStep() {
  return (
    <SectionsStep
      sections={[GYNECO_SECTION, PRENATAL_SECTION, PEDIATRIC_SECTION, ELDERLY_SECTION]}
      empty="Sem seções específicas para este perfil. Ajuste o perfil em Configuração ou o sexo/idade em Identificação."
    />
  );
}

export function FamiliaStep() {
  return <SectionsStep sections={[FAMILY_SECTION]} />;
}

export function HabitosStep() {
  return <SectionsStep sections={[HABITS_SECTION, SOCIAL_SECTION]} />;
}
