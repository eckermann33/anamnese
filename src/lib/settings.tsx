import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Mode, Setting } from '../clinical/types';
import { DEFAULT_AI_ENDPOINT } from '../config/app';

/* ==========================================================================
   PREFERÊNCIAS DO APARELHO (Ajustes)
   Guardadas no localStorage: são pequenas e precisam carregar instantaneamente.
   ========================================================================== */

export interface Prefs {
  defaultMode: Mode;
  defaultSetting: Setting;
  theme: 'auto' | 'light' | 'dark';
  reduceTransparency: boolean;
  reduceMotion: boolean;
  aiEnabled: boolean;
  aiEndpoint: string;
  aiAccessCode: string;
  /** Leu e aceitou o aviso de uso. */
  acceptedDisclaimer: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  defaultMode: 'estudante',
  defaultSetting: 'ps',
  theme: 'auto',
  reduceTransparency: false,
  reduceMotion: false,
  aiEnabled: true,
  aiEndpoint: DEFAULT_AI_ENDPOINT,
  aiAccessCode: '',
  acceptedDisclaimer: false,
};

const KEY = 'anamnese:prefs';

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Lê as preferências fora do React (ex.: cliente da IA). */
export function readPrefs(): Prefs {
  return load();
}

interface Ctx {
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
}

const PrefsContext = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Prefs>(load);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setState((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* armazenamento indisponível: segue só na memória */
      }
      return next;
    });
  }, []);

  // Aplica tema e acessibilidade no <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);
    if (prefs.reduceTransparency) root.setAttribute('data-transparency', 'reduced');
    else root.removeAttribute('data-transparency');
    if (prefs.reduceMotion) root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
  }, [prefs.theme, prefs.reduceTransparency, prefs.reduceMotion]);

  return <PrefsContext.Provider value={{ prefs, setPrefs }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('PrefsProvider ausente');
  return ctx;
}

/** true quando o navegador está online. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
