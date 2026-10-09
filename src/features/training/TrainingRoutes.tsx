import { Route, Routes } from 'react-router-dom';
import { TrainingHome } from './TrainingHome';
import { TrainingSessionPage } from './TrainingSession';

/** Rotas da aba Treino: /treino e /treino/sessao/:id */
export function TrainingRoutes() {
  return (
    <Routes>
      <Route index element={<TrainingHome />} />
      <Route path="sessao/:id" element={<TrainingSessionPage />} />
    </Routes>
  );
}
