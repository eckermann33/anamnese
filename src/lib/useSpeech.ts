import { useCallback, useEffect, useRef, useState } from 'react';

/* ==========================================================================
   VOZ (Web Speech API)
   - Reconhecimento (fala → texto) em pt-BR. No Chrome/Android depende de
     internet; no iPhone funciona no Safari (no app instalado pode variar —
     aí use o microfone do teclado, que funciona em qualquer campo).
   - Síntese (texto → fala) para o paciente simulado do Treino.
   ========================================================================== */

interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SRConstructor = new () => SRInstance;

function getRecognition(): SRConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Permita o uso do microfone para este site nas configurações do navegador.',
  'service-not-allowed': 'O navegador bloqueou o reconhecimento de voz. Use o microfone do teclado.',
  'no-speech': 'Não ouvi nada. Tente de novo, mais perto do microfone.',
  'audio-capture': 'Nenhum microfone encontrado.',
  network: 'O reconhecimento de voz deste navegador precisa de internet.',
};

/** Fala → texto. `onFinal` recebe cada trecho reconhecido em definitivo. */
export function useSpeechRecognition(onFinal: (text: string) => void, lang = 'pt-BR') {
  const Recognition = getRecognition();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SRInstance | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!Recognition) return;
    setError(null);
    recRef.current?.abort();
    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current(r[0].transcript.trim());
        else partial += r[0].transcript;
      }
      setInterim(partial);
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] ?? 'Não foi possível usar o reconhecimento de voz.');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError('Não foi possível iniciar o microfone.');
    }
  }, [Recognition, lang]);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported: !!Recognition, listening, interim, error, start, stop };
}

/** Texto → fala (voz em português, se o aparelho tiver). */
export function speak(text: string, opts: { rate?: number; pitch?: number } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('pt-br')) ?? synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('pt'));
  if (voice) u.voice = voice;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
