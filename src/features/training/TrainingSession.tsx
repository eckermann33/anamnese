import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Draft } from 'immer';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Flag, FileQuestion, Mic, RotateCcw, Send, Square, Stethoscope, Timer, Volume2, VolumeX, XCircle } from 'lucide-react';
import type { TrainingSession as Session } from '../../db/types';
import { db } from '../../db';
import { useAutosave } from '../../lib/useAutosave';
import { useAi } from '../../lib/ai';
import { useOnline } from '../../lib/settings';
import { speak, stopSpeaking, useSpeechRecognition } from '../../lib/useSpeech';
import { Page, EmptyState, Disclaimer } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { TextArea } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useToast } from '../../components/ui/Overlays';
import { CLINICAL_DISCLAIMER } from '../../config/app';
import { DOMAINS, QUICK_MANEUVERS, averageScore, readVoicePref, writeVoicePref } from './common';
import { DIFFICULTY_LABEL } from './TrainingHome';

/* ==========================================================================
   ESTAÇÃO DE OSCE — /treino/sessao/:id
   Pergunte ao paciente (texto ou voz), peça manobras de exame, encerre com
   a sua hipótese e receba o feedback por domínio. Tudo fica salvo.
   ========================================================================== */

type Kind = 'pergunta' | 'manobra';

export function TrainingSessionPage() {
  const { id } = useParams();
  const { record: s, update } = useAutosave(db.training, id);
  if (s === undefined) return null;
  if (s === null) {
    return (
      <Page title="Estação" back={{ to: '/treino', label: 'Treino' }}>
        <EmptyState icon={FileQuestion} title="Estação não encontrada" />
      </Page>
    );
  }
  return <Station s={s} update={update} />;
}

function Station({ s, update }: { s: Session; update: (fn: (d: Draft<Session>) => void) => void }) {
  const navigate = useNavigate();
  const online = useOnline();
  const toast = useToast();
  const turn = useAi('osce_turn');
  const feedbackAi = useAi('osce_feedback');
  const [kind, setKind] = useState<Kind>('pergunta');
  const [input, setInput] = useState('');
  const [voice, setVoice] = useState(readVoicePref);
  const [finishOpen, setFinishOpen] = useState(false);
  const [hd, setHd] = useState(s.studentDiagnosis ?? '');
  const endRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition((t) => setInput((prev) => (prev ? `${prev.trimEnd()} ${t}` : t)));
  const done = s.status === 'finalizado';

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [s.messages.length, turn.loading]);

  useEffect(() => () => stopSpeaking(), []);

  async function send(text: string, k: Kind) {
    const msg = text.trim();
    if (!msg || turn.loading || done) return;
    speech.stop();
    const transcript = s.messages.map((m) => ({ role: m.role, text: m.text }));
    const shown = k === 'manobra' ? `Exame: ${msg}` : msg;
    update((d) => void d.messages.push({ role: 'student', text: shown, at: Date.now() }));
    setInput('');
    const r = await turn.run({ caseData: s.caseData, transcript, message: msg, kind: k }, 'estudante');
    if (!r) return;
    const role = k === 'manobra' ? 'exam' : 'patient';
    const reply = r.outOfScope && k === 'manobra' ? `${r.reply} (pedido fora do escopo desta estação)` : r.reply;
    update((d) => void d.messages.push({ role, text: reply, at: Date.now() }));
    if (voice && role === 'patient') speak(r.reply, { rate: 1.02 });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input, kind);
  }

  async function finish() {
    const transcript = s.messages.map((m) => ({ role: m.role, text: m.text }));
    const fb = await feedbackAi.run({ caseData: s.caseData, transcript, studentDiagnosis: hd.trim() }, 'estudante');
    if (!fb) return;
    update((d) => {
      d.feedback = fb;
      d.studentDiagnosis = hd.trim();
      d.status = 'finalizado';
      d.endedAt = Date.now();
    });
    setFinishOpen(false);
    stopSpeaking();
    toast('Feedback pronto', 'success');
    window.scrollTo({ top: 0 });
  }

  const c = s.caseData;

  return (
    <>
      <Page
        title={done ? 'Feedback da estação' : 'Estação OSCE'}
        compact
        toolbar={!done}
        className={done ? undefined : 'osce-page'}
        back={{ to: '/treino', label: 'Treino', iconOnly: true }}
        actions={
          <>
            {!done && s.timeLimitMin > 0 && <StationTimer startedAt={s.startedAt} minutes={s.timeLimitMin} />}
            <Button
              variant="glass"
              iconOnly
              icon={voice ? Volume2 : VolumeX}
              aria-label={voice ? 'Desligar voz do paciente' : 'Ligar voz do paciente'}
              onClick={() => {
                setVoice(!voice);
                writeVoicePref(!voice);
                if (voice) stopSpeaking();
              }}
            />
          </>
        }
      >
        {/* Porta da estação */}
        <div className="page-pad">
          <div className="card osce-door">
            <span className="t-caption c-secondary">
              {c.setting} · {DIFFICULTY_LABEL[s.caseMeta.difficulty]} · {s.source === 'ia' ? 'caso gerado pela IA' : 'biblioteca'}
            </span>
            <strong className="t-title3">{c.title}</strong>
            <span className="t-subhead">
              {c.patient.initials}, {c.patient.age} anos, {c.patient.sex === 'F' ? 'feminino' : 'masculino'}, {c.patient.occupation.toLowerCase()}.
            </span>
            {!done && <p className="t-footnote c-secondary">Tarefa: anamnese e exame físico dirigidos; ao final, sua hipótese diagnóstica e diferenciais.</p>}
          </div>
        </div>

        {done && s.feedback ? <FeedbackView s={s} onNew={() => navigate('/treino')} /> : null}

        {/* Conversa */}
        <section className="osce-chat page-pad" aria-label="Conversa da estação" aria-live="polite">
          {s.messages.map((m, i) => (
            <div key={i} className="osce-msg" data-role={m.role}>
              {m.role === 'exam' && <Stethoscope size={16} aria-hidden="true" />}
              <span className="visually-hidden">{m.role === 'student' ? 'Você: ' : m.role === 'patient' ? 'Paciente: ' : 'Examinador: '}</span>
              <span>{m.text}</span>
            </div>
          ))}
          {turn.loading && (
            <div className="osce-msg" data-role={kind === 'manobra' ? 'exam' : 'patient'} aria-label="Respondendo">
              <span className="osce-typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
          {turn.error && (
            <div className="row gap-2 t-footnote c-red" role="alert">
              {turn.error}
              <Button
                variant="plain"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  // reenvia a última fala do estudante (que ficou sem resposta)
                  const i = s.messages.map((m) => m.role).lastIndexOf('student');
                  if (i < 0) return;
                  const last = s.messages[i].text;
                  update((d) => void d.messages.splice(i, 1));
                  void send(last.replace(/^Exame: /, ''), last.startsWith('Exame: ') ? 'manobra' : 'pergunta');
                }}
              >
                Tentar de novo
              </Button>
            </div>
          )}
          <div ref={endRef} className="osce-chat-end" />
        </section>

        {!done && (
          <div className="page-pad">
            <Button variant="tinted" block icon={Flag} onClick={() => setFinishOpen(true)}>
              Encerrar e receber feedback
            </Button>
          </div>
        )}
        <Disclaimer>{CLINICAL_DISCLAIMER}</Disclaimer>
      </Page>

      {!done && (
        <form className="osce-composer glass" onSubmit={submit}>
          <div className="row gap-2">
            <div className="grow">
              <SegmentedControl<Kind>
                ariaLabel="Tipo de ação"
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'pergunta', label: 'Perguntar' },
                  { value: 'manobra', label: 'Examinar' },
                ]}
              />
            </div>
          </div>
          {kind === 'manobra' && (
            <div className="osce-maneuvers" aria-label="Manobras rápidas">
              {QUICK_MANEUVERS.map((m) => (
                <button key={m} type="button" className="chip chip-sm" disabled={turn.loading} onClick={() => void send(m, 'manobra')}>
                  {m}
                </button>
              ))}
            </div>
          )}
          <div className="row gap-2">
            {speech.supported && (
              <Button
                type="button"
                variant={speech.listening ? 'destructive-fill' : 'glass'}
                iconOnly
                icon={speech.listening ? Square : Mic}
                aria-label={speech.listening ? 'Parar de ditar' : 'Falar a pergunta'}
                onClick={speech.listening ? speech.stop : speech.start}
              />
            )}
            <input
              className="input grow"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={speech.listening ? 'Ouvindo…' : kind === 'pergunta' ? 'Pergunte ao paciente…' : 'Qual manobra? (ex.: sinal de Murphy)'}
              aria-label={kind === 'pergunta' ? 'Pergunta ao paciente' : 'Manobra de exame'}
              enterKeyHint="send"
            />
            <Button type="submit" variant="primary" iconOnly icon={Send} aria-label="Enviar" disabled={!input.trim() || turn.loading || !online} />
          </div>
          {speech.interim && <span className="t-caption c-secondary">{speech.interim}…</span>}
          {speech.error && <span className="t-caption c-red">{speech.error}</span>}
          {!online && <span className="t-caption c-secondary">Sem internet: o paciente simulado precisa de conexão.</span>}
        </form>
      )}

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Encerrar a estação" subtitle="Qual é a sua hipótese?">
        <div className="stack gap-3">
          <TextArea
            value={hd}
            onChange={setHd}
            rows={4}
            aria-label="Hipótese diagnóstica"
            placeholder="Hipótese principal e diferenciais. Ex.: SCA sem supra; diferenciais: dissecção de aorta, TEP."
          />
          <Button variant="primary" size="lg" icon={CheckCircle2} loading={feedbackAi.loading} disabled={!online} onClick={() => void finish()}>
            Receber feedback
          </Button>
          {feedbackAi.loading && <p className="t-footnote c-secondary">Corrigindo a estação…</p>}
          {feedbackAi.error && (
            <p className="t-footnote c-red" role="alert">
              {feedbackAi.error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}

/* ---------- Cronômetro ---------- */

function StationTimer({ startedAt, minutes }: { startedAt: number; minutes: number }) {
  const [now, setNow] = useState(Date.now());
  const toast = useToast();
  const warned = useRef(false);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const left = Math.round((startedAt + minutes * 60_000 - now) / 1000);
  useEffect(() => {
    if (left <= 0 && !warned.current) {
      warned.current = true;
      toast('Tempo da estação esgotado — encerre e peça o feedback', 'info');
    }
  }, [left, toast]);
  const abs = Math.abs(left);
  const mm = String(Math.floor(abs / 60)).padStart(2, '0');
  const ss = String(abs % 60).padStart(2, '0');
  const tone = left <= 0 ? 'red' : left <= 60 ? 'orange' : undefined;
  return (
    <span className="tag osce-timer" data-tone={tone} role="timer" aria-label={left > 0 ? `Faltam ${mm} minutos e ${ss} segundos` : 'Tempo esgotado'}>
      <Timer size={14} aria-hidden="true" />
      {left < 0 ? '-' : ''}
      {mm}:{ss}
    </span>
  );
}

/* ---------- Feedback ---------- */

function FeedbackView({ s, onNew }: { s: Session; onNew: () => void }) {
  const f = s.feedback!;
  const avg = averageScore(s) ?? 0;
  const c = s.caseData;
  return (
    <div className="page-pad stack gap-3 osce-feedback">
      <div className="card stack gap-3">
        <div className="row between">
          <strong className="t-headline">Nota da estação</strong>
          <span className="osce-total" data-tone={avg >= 7 ? 'green' : avg >= 5 ? 'orange' : 'red'}>
            {avg.toFixed(1).replace('.', ',')}
          </span>
        </div>
        {DOMAINS.map((d) => {
          const v = Math.max(0, Math.min(10, f.domainScores[d.key]));
          return (
            <div key={d.key} className="osce-score">
              <span className="t-subhead">{d.label}</span>
              <span className="osce-bar" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={v} aria-label={`${d.label}: ${v} de 10`}>
                <span style={{ width: `${v * 10}%` }} data-tone={v >= 7 ? 'green' : v >= 5 ? 'orange' : 'red'} />
              </span>
              <span className="t-subhead tabular">{String(v).replace('.', ',')}</span>
            </div>
          );
        })}
      </div>

      <div className="card stack gap-2">
        <strong className="t-headline">Diagnóstico</strong>
        <p className="t-subhead">
          <span className="c-secondary">Sua hipótese: </span>
          {s.studentDiagnosis || 'não informada'}
        </p>
        <p className="t-subhead">
          <span className="c-secondary">Esperado: </span>
          <strong>{f.correctDiagnosis}</strong>
        </p>
        <p className="t-footnote">{f.diagnosisComment}</p>
      </div>

      <FeedbackList title="Pontos fortes" icon={CheckCircle2} tone="green" items={f.strengths} />
      <FeedbackList title="Perguntas que faltaram" icon={XCircle} tone="orange" items={f.missedQuestions} />
      <FeedbackList title="Red flags não investigadas" icon={Flag} tone="red" items={f.missedRedFlags} />
      <FeedbackList title="Dicas para a próxima" icon={CheckCircle2} tone="accent" items={f.tips} />

      <details className="card disclosure">
        <summary>Ver o roteiro completo do caso</summary>
        <div className="stack gap-2 mt-2 t-footnote">
          <p>
            <strong>Diagnóstico do roteiro:</strong> {c.diagnosis}
          </p>
          <p>
            <strong>Diferenciais:</strong> {c.differentials.join('; ')}
          </p>
          <p>
            <strong>Perguntas-chave:</strong> {c.keyQuestions.join('; ')}
          </p>
          <p>
            <strong>Red flags:</strong> {c.redFlags.join('; ')}
          </p>
          <p>
            <strong>Manobras-chave:</strong> {c.keyManeuvers.join('; ')}
          </p>
          <p>
            <strong>Sinais vitais:</strong> PA {c.vitals.pa}, FC {c.vitals.fc}, FR {c.vitals.fr}, Tax {c.vitals.temp}, SpO₂ {c.vitals.spo2}
          </p>
          <p>
            <strong>HDA (o que o paciente sabia):</strong> {c.history.hpi.join(' ')}
          </p>
          <p>
            <strong>Exame:</strong> {c.exam.map((e) => `${e.maneuver}: ${e.finding}`).join(' ')}
          </p>
        </div>
      </details>

      <Button variant="primary" size="lg" block onClick={onNew}>
        Nova estação
      </Button>
    </div>
  );
}

function FeedbackList({ title, icon: Icon, tone, items }: { title: string; icon: typeof CheckCircle2; tone: 'green' | 'orange' | 'red' | 'accent'; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="card stack gap-2">
      <strong className="t-headline">{title}</strong>
      <ul className="stack gap-2">
        {items.map((t, i) => (
          <li key={i} className="row gap-2 osce-fb-item">
            <Icon size={18} className={`c-${tone}`} aria-hidden="true" />
            <span className="t-subhead">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
