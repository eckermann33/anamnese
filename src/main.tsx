import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/glass.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/clinical.css';
import './styles/evolution.css';
import './styles/account.css';
import './styles/training.css';
import './styles/x-encounter.css';
import './styles/x-evolution.css';
import './styles/x-training.css';
import './styles/x-features.css';

// Pede ao navegador para não apagar o banco local quando faltar espaço.
if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
