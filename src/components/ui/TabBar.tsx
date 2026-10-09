import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Settings2, Stethoscope, Users, type LucideIcon } from 'lucide-react';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const TABS: Tab[] = [
  { to: '/atender', label: 'Atender', icon: Stethoscope },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/treino', label: 'Treino', icon: GraduationCap },
  { to: '/ajustes', label: 'Ajustes', icon: Settings2 },
];

/** Rotas de tela cheia (fluxo do atendimento, evolução): escondem a tab bar. */
const FULLSCREEN = [/^\/atendimento\//, /^\/evolucao\//, /^\/treino\/sessao/];

/** Tab bar flutuante de vidro, com "lente" que desliza até a aba ativa. */
export function TabBar() {
  const { pathname } = useLocation();
  const index = Math.max(
    0,
    TABS.findIndex((t) => pathname.startsWith(t.to)),
  );
  const hidden = FULLSCREEN.some((r) => r.test(pathname));

  return (
    <nav
      className="tabbar glass"
      aria-label="Navegação principal"
      data-hidden={hidden || undefined}
      style={{ ['--count' as string]: TABS.length, ['--index' as string]: index }}
    >
      <span className="tabbar-lens" aria-hidden="true" />
      {TABS.map((tab, i) => {
        const Icon = tab.icon;
        const active = i === index;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="tabbar-item"
            aria-current={active ? 'page' : undefined}
            tabIndex={hidden ? -1 : undefined}
          >
            <Icon size={24} strokeWidth={active ? 2.1 : 1.75} aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
