import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/ui/TabBar';
import { OverlayProvider } from './components/ui/Overlays';
import { PrefsProvider } from './lib/settings';
import { UpdatePrompt } from './components/UpdatePrompt';
import { AtenderHome } from './features/atender/AtenderHome';
import { PatientsList } from './features/patients/PatientsList';

// Cada tela carrega sob demanda: a abertura do app fica rápida e, depois da
// primeira visita, tudo já está no cache do aparelho (funciona offline).
const EncounterRoute = lazy(() => import('./features/encounter/EncounterFlow').then((m) => ({ default: m.EncounterRoute })));
const PatientDetail = lazy(() => import('./features/patients/PatientDetail').then((m) => ({ default: m.PatientDetail })));
const EvolutionEditor = lazy(() => import('./features/evolution/EvolutionEditor').then((m) => ({ default: m.EvolutionEditor })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TemplatesPage = lazy(() => import('./features/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const TrainingHome = lazy(() => import('./features/training/TrainingHome').then((m) => ({ default: m.TrainingHome })));

export default function App() {
  return (
    <PrefsProvider>
      <OverlayProvider>
        <BrowserRouter>
          <div className="app">
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Navigate to="/atender" replace />} />
                <Route path="/atender" element={<AtenderHome />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/atendimento/:id/:step?" element={<EncounterRoute />} />
                <Route path="/pacientes" element={<PatientsList />} />
                <Route path="/pacientes/:id" element={<PatientDetail />} />
                <Route path="/evolucao/:patientId/:evoId" element={<EvolutionEditor />} />
                <Route path="/treino/*" element={<TrainingHome />} />
                <Route path="/ajustes" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/atender" replace />} />
              </Routes>
            </Suspense>
            <TabBar />
            <UpdatePrompt />
          </div>
        </BrowserRouter>
      </OverlayProvider>
    </PrefsProvider>
  );
}
