import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FlaskConical,
  HelpCircle,
  ListPlus,
  Plus,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useEncounter } from '../EncounterContext';
import { Button } from '../../../components/ui/Button';
import { Disclaimer } from '../../../components/ui/Page';
import { useToast } from '../../../components/ui/Overlays';
import { ScoreCard } from '../../../components/clinical/ScoreCard';
import { RedFlagCard } from '../../../components/clinical/Banners';
import { ReferenceList } from '../../../components/clinical/References';
import { applicableScores, computeScore } from '../../../clinical/scores';
import { caseTextForAI, hashString } from '../../../clinical/narrative';
import { useAi } from '../../../lib/ai';
import { useOnline, usePrefs } from '../../../lib/settings';
import { formatDateTime, formatNumber } from '../../../lib/format';
import { CLINICAL_DISCLAIMER } from '../../../config/app';
import type { HypothesesResult } from '../../../../shared/ai/schemas';

const LIKELIHOOD_TONE = { alta: 'red', moderada: 'orange', baixa: undefined } as const;

/** Etapa 12 — Hipóteses diagnósticas (IA) + escores + "não pode passar". */
export function HipotesesStep() {
  const { enc, patient, update, ctx, redFlags, medAlerts } = useEncounter();
  const { prefs } = usePrefs();
  const online = useOnline();
  const toast = useToast();
  const ai = useAi('hypotheses');
  const [newHd, setNewHd] = useState('');

  const aiScoreKey = (enc.hypotheses?.result.hypotheses.flatMap((h) => h.scores.map((s) => s.id)) ?? []).join(',');
  const scores = useMemo(
    () => applicableScores(ctx, aiScoreKey ? aiScoreKey.split(',') : []).map((def) => computeScore(def, ctx)),
    [ctx, aiScoreKey],
  );
  const aiReasons = Object.fromEntries((enc.hypotheses?.result.hypotheses ?? []).flatMap((h) => h.scores.map((s) => [s.id, s.reason])));

  const caseText = useMemo(
    () =>
      caseTextForAI(enc, patient, {
        redFlags: redFlags.map((f) => `${f.title} (${f.criteria.join(', ')})`),
        scores: scores.map((s) => `${s.def.name}: ${formatNumber(s.total, 1)} — ${s.interpretation.text}${s.missing.length ? ` (faltam: ${s.missing.join(', ')})` : ''}`),
        medAlerts: medAlerts.map((a) => `${a.title}: ${a.detail}`),
      }),
    [enc, patient, redFlags, scores, medAlerts],
  );
  const hash = hashString(caseText);
  const stale = enc.hypotheses && enc.hypotheses.inputHash !== hash;

  async function analyze() {
    const result = await ai.run({ caseText, setting: enc.config.setting, profile: enc.config.profile }, enc.config.mode);
    if (result) {
      update((d) => void (d.hypotheses = { result, at: Date.now(), inputHash: hash }));
      toast('Hipóteses geradas', 'success');
    }
  }

  function addHd(text: string) {
    const t = text.trim();
    if (!t) return;
    update((d) => {
      if (!d.manualHypotheses.includes(t)) d.manualHypotheses.push(t);
    });
  }

  const r = enc.hypotheses?.result;

  return (
    <div className="stack gap-4">
      {/* --------- Gerar --------- */}
      <section className="page-pad">
        <div className="card stack gap-3">
          <div className="row gap-2">
            <Brain size={22} className="c-accent" aria-hidden="true" />
            <strong className="t-headline grow">Raciocínio diagnóstico (IA)</strong>
          </div>
          <p className="t-footnote c-secondary">
            A IA recebe só os dados coletados (anonimizados), as red flags e os escores calculados aqui. Ela não inventa achados: o que não foi perguntado vira
            “o que falta”.
          </p>
          {prefs.aiEnabled ? (
            <Button variant="primary" size="lg" icon={r ? RefreshCw : Brain} loading={ai.loading} disabled={!online} onClick={analyze}>
              {r ? 'Analisar de novo' : 'Gerar hipóteses'}
            </Button>
          ) : (
            <p className="t-footnote">IA desligada em Ajustes. Os escores e red flags abaixo continuam funcionando.</p>
          )}
          {ai.loading && <p className="t-footnote c-secondary">Analisando… pode levar até 1 minuto.</p>}
          {!online && (
            <p className="row gap-2 t-footnote c-secondary">
              <WifiOff size={16} aria-hidden="true" /> Sem internet: escores, red flags e alertas seguem funcionando offline.
            </p>
          )}
          {ai.error && (
            <p className="t-footnote c-red" role="alert">
              {ai.error}
            </p>
          )}
          {stale && !ai.loading && (
            <p className="row gap-2 t-footnote c-orange">
              <AlertTriangle size={16} aria-hidden="true" /> Os dados mudaram desde a última análise ({formatDateTime(enc.hypotheses!.at)}).
            </p>
          )}
        </div>
      </section>

      {ai.loading && !r && <HypothesesSkeleton />}

      {r && <HypothesesView r={r} student={enc.config.mode === 'estudante'} onAdd={addHd} onUseConduct={(lines) => update((d) => void (d.conduct = [d.conduct, ...lines.map((l) => `- ${l}`)].filter(Boolean).join('\n')))} />}

      {/* --------- Escores --------- */}
      {scores.length > 0 && (
        <section className="qsection">
          <h2 className="qsection-title">Escores aplicáveis</h2>
          <p className="section-sub">Calculados no aparelho com os dados do atendimento. Toque para completar os itens que faltam.</p>
          <div className="page-pad stack gap-3">
            {scores.map((s) => (
              <ScoreCard
                key={s.def.id}
                result={s}
                reason={aiReasons[s.def.id]}
                onSet={(itemId, value) =>
                  update((d) => {
                    const cur = { ...(d.scoreInputs[s.def.id] ?? {}) };
                    if (value === undefined) delete cur[itemId];
                    else cur[itemId] = value;
                    d.scoreInputs[s.def.id] = cur;
                  })
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* --------- Red flags --------- */}
      {redFlags.length > 0 && (
        <section className="qsection">
          <h2 className="qsection-title">Red flags detectadas</h2>
          <div className="page-pad stack gap-3">
            {redFlags.map((f) => (
              <RedFlagCard key={f.id} flag={f} />
            ))}
          </div>
        </section>
      )}

      {/* --------- HD do prontuário --------- */}
      <section className="qsection">
        <h2 className="qsection-title">Hipóteses para o prontuário</h2>
        <p className="section-sub">É esta lista que entra no campo HD do texto final. Adicione das sugestões da IA ou escreva a sua.</p>
        <div className="qsection-card stack gap-3">
          {enc.manualHypotheses.length > 0 && (
            <ol className="hd-list">
              {enc.manualHypotheses.map((h, i) => (
                <li key={h} className="row gap-2">
                  <span className="hd-index">{i + 1}</span>
                  <span className="grow">{h}</span>
                  <Button
                    variant="plain"
                    iconOnly
                    size="sm"
                    icon={Trash2}
                    aria-label={`Remover ${h}`}
                    onClick={() => update((d) => void (d.manualHypotheses = d.manualHypotheses.filter((x) => x !== h)))}
                  />
                </li>
              ))}
            </ol>
          )}
          <form
            className="row gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addHd(newHd);
              setNewHd('');
            }}
          >
            <input className="input grow" value={newHd} onChange={(e) => setNewHd(e.target.value)} placeholder="Ex.: Síndrome coronariana aguda" aria-label="Nova hipótese" />
            <Button type="submit" variant="tinted" iconOnly icon={Plus} aria-label="Adicionar hipótese" />
          </form>
        </div>
      </section>

      <Disclaimer icon={ShieldAlert}>{CLINICAL_DISCLAIMER}</Disclaimer>
    </div>
  );
}

function HypothesesSkeleton() {
  return (
    <div className="page-pad stack gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card stack gap-2">
          <div className="skeleton" style={{ width: '60%', height: 20 }} />
          <div className="skeleton" style={{ width: '90%' }} />
          <div className="skeleton" style={{ width: '75%' }} />
        </div>
      ))}
    </div>
  );
}

function List({ items, icon: Icon, tone }: { items: string[]; icon: typeof ThumbsUp; tone?: string }) {
  if (!items.length) return <p className="t-footnote c-secondary">—</p>;
  return (
    <ul className="hyp-list" data-tone={tone}>
      {items.map((t, i) => (
        <li key={i}>
          <Icon size={15} aria-hidden="true" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function HypothesesView({
  r,
  student,
  onAdd,
  onUseConduct,
}: {
  r: HypothesesResult;
  student: boolean;
  onAdd: (name: string) => void;
  onUseConduct: (lines: string[]) => void;
}) {
  const allRefs = r.hypotheses.flatMap((h) => h.referenceIds);
  return (
    <>
      <section className="page-pad">
        <div className="card stack gap-2">
          <div className="row between gap-2">
            <strong className="t-headline">Síntese</strong>
            <span className="tag" data-tone={r.confidence === 'alta' ? 'green' : r.confidence === 'moderada' ? 'orange' : 'red'}>
              Confiança {r.confidence}
            </span>
          </div>
          <p className="t-body">{r.summary}</p>
          {r.dataToImprove.length > 0 && (
            <details className="disclosure">
              <summary>
                <ChevronRight size={16} className="disclosure-chevron" aria-hidden="true" /> Dados que aumentariam a precisão
              </summary>
              <List items={r.dataToImprove} icon={HelpCircle} />
            </details>
          )}
        </div>
      </section>

      <section className="page-pad stack gap-3">
        {r.hypotheses.map((h, i) => (
          <article key={i} className="hyp-card" data-kind={h.kind}>
            <header className="row between gap-2 wrap">
              <div className="stack">
                <span className="t-caption c-secondary">{h.kind === 'principal' ? 'Hipótese principal' : `Diferencial ${i}`}</span>
                <h3 className="t-title3">{h.name}</h3>
              </div>
              <span className="tag" data-tone={LIKELIHOOD_TONE[h.likelihood]}>
                Probabilidade {h.likelihood}
              </span>
            </header>
            {student && h.teaching && <p className="hyp-teaching">{h.teaching}</p>}
            <div className="hyp-grid">
              <div>
                <h4 className="hyp-sub c-green">A favor</h4>
                <List items={h.supporting} icon={ThumbsUp} tone="green" />
              </div>
              <div>
                <h4 className="hyp-sub c-orange">Contra</h4>
                <List items={h.against} icon={ThumbsDown} tone="orange" />
              </div>
            </div>
            <details className="disclosure">
              <summary>
                <ChevronRight size={16} className="disclosure-chevron" aria-hidden="true" /> O que falta para aproximar ou afastar
              </summary>
              <h4 className="hyp-sub">Perguntas</h4>
              <List items={h.missingQuestions} icon={HelpCircle} />
              <h4 className="hyp-sub">Manobras de exame</h4>
              <List items={h.missingManeuvers} icon={Stethoscope} />
            </details>
            <details className="disclosure">
              <summary>
                <ChevronRight size={16} className="disclosure-chevron" aria-hidden="true" /> Exames complementares ({h.tests.length})
              </summary>
              <ul className="hyp-list">
                {h.tests.map((t, k) => (
                  <li key={k}>
                    <FlaskConical size={15} aria-hidden="true" />
                    <span>
                      <strong>{t.test}</strong> — {t.rationale}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
            {h.referenceIds.length > 0 && (
              <details className="disclosure">
                <summary>
                  <ChevronRight size={16} className="disclosure-chevron" aria-hidden="true" /> Referências
                </summary>
                <ReferenceList ids={h.referenceIds} />
              </details>
            )}
            <Button variant="tinted" size="sm" icon={ListPlus} onClick={() => onAdd(h.name)}>
              Adicionar à HD
            </Button>
          </article>
        ))}
      </section>

      {r.cannotMiss.length > 0 && (
        <section className="qsection">
          <h2 className="qsection-title c-red">Não pode passar</h2>
          <div className="page-pad stack gap-2">
            {r.cannotMiss.map((c, i) => (
              <article key={i} className="cannot-miss">
                <div className="row gap-2">
                  <ShieldAlert size={18} aria-hidden="true" />
                  <strong>{c.diagnosis}</strong>
                </div>
                <p className="t-footnote mt-2">{c.why}</p>
                <p className="t-footnote mt-2">
                  <strong>Como afastar:</strong> {c.howToRuleOut}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {r.completenessChecklist.length > 0 && (
        <section className="qsection">
          <h2 className="qsection-title">Checklist de completude</h2>
          <p className="section-sub">O que de importante ainda não foi perguntado ou examinado.</p>
          <div className="qsection-card">
            <List items={r.completenessChecklist} icon={ClipboardCheck} />
          </div>
        </section>
      )}

      {r.initialManagement.length > 0 && (
        <section className="qsection">
          <h2 className="qsection-title">Conduta inicial sugerida</h2>
          <div className="qsection-card stack gap-3">
            <List items={r.initialManagement} icon={CheckCircle2} />
            <div>
              <Button variant="gray" size="sm" onClick={() => onUseConduct(r.initialManagement)}>
                Copiar para o campo Conduta
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="qsection">
        <h2 className="qsection-title">Referências</h2>
        <div className="qsection-card">
          <ReferenceList ids={allRefs} extra={r.otherReferences} />
          {r.otherReferences.length > 0 && (
            <p className="t-caption c-secondary mt-2">Referências fora da lista curada vieram da IA: confira no PubMed/SciELO antes de citar.</p>
          )}
        </div>
      </section>
    </>
  );
}
