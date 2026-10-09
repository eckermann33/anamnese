import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Dices, GraduationCap, Library, Sparkles, Volume2, WifiOff } from 'lucide-react';
import type { TrainingSession } from '../../db/types';
import { db, uid } from '../../db';
import { Page, Disclaimer } from '../../components/ui/Page';
import { ListRow, ListSection } from '../../components/ui/List';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Toggle } from '../../components/ui/Toggle';
import { SYSTEMS } from '../../clinical/systems';
import { useAi } from '../../lib/ai';
import { useOnline, usePrefs } from '../../lib/settings';
import { formatDate } from '../../lib/format';
import { CLINICAL_DISCLAIMER } from '../../config/app';
import { CASE_LIBRARY, type LibraryCase } from './cases';
import { averageScore, readVoicePref, writeVoicePref } from './common';

/* ==========================================================================
   TREINO OSCE — escolha da estação + histórico
   ========================================================================== */

type Source = 'biblioteca' | 'ia';
type Difficulty = 'facil' | 'medio' | 'dificil';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
const systemLabel = (id?: string) => SYSTEMS.find((s) => s.id === id)?.label ?? 'Livre';

export function TrainingHome() {
  const navigate = useNavigate();
  const { prefs } = usePrefs();
  const online = useOnline();
  const ai = useAi('osce_case');
  const [source, setSource] = useState<Source>('biblioteca');
  const [picked, setPicked] = useState<string | null>(null);
  const [system, setSystem] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<Difficulty>('medio');
  const [minutes, setMinutes] = useState<'0' | '8' | '10' | '15'>('10');
  const [voice, setVoice] = useState(readVoicePref);

  const sessions = useLiveQuery(async () => (await db.training.toArray()).sort((a, b) => b.createdAt - a.createdAt), []);

  async function start() {
    let lib: LibraryCase | undefined;
    let data;
    if (source === 'biblioteca') {
      lib = CASE_LIBRARY.find((c) => c.id === picked) ?? CASE_LIBRARY[Math.floor(Math.random() * CASE_LIBRARY.length)];
      data = lib.data;
    } else {
      data = await ai.run({ system, difficulty, seed: Math.random().toString(36).slice(2, 10) }, 'estudante');
      if (!data) return;
    }
    const now = Date.now();
    const s: TrainingSession = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      source,
      caseMeta: { system: lib?.system ?? system, difficulty: lib?.difficulty ?? difficulty, title: data.title },
      caseData: data,
      messages: [{ role: 'patient', text: data.openingLine, at: now }],
      timeLimitMin: Number(minutes),
      startedAt: now,
      status: 'em_andamento',
    };
    await db.training.add(s);
    navigate(`/treino/sessao/${s.id}`);
  }

  return (
    <Page title="Treino" subtitle="Estação de OSCE com paciente simulado">
      <div className="page-pad stack gap-3">
        <div className="card stack gap-3">
          <div className="row gap-2">
            <GraduationCap size={22} className="c-accent" aria-hidden="true" />
            <strong className="t-headline grow">Nova estação</strong>
          </div>
          <p className="t-footnote c-secondary">
            Converse com o paciente (por texto ou voz), peça manobras de exame físico e, no fim, dê sua hipótese. A correção vem por domínio: HDA, ISDA,
            antecedentes, exame físico e raciocínio.
          </p>

          <SegmentedControl<Source>
            ariaLabel="Origem do caso"
            value={source}
            onChange={setSource}
            options={[
              { value: 'biblioteca', label: 'Biblioteca' },
              { value: 'ia', label: 'Gerar com IA' },
            ]}
          />

          {source === 'biblioteca' ? (
            <div className="osce-cases" role="radiogroup" aria-label="Casos da biblioteca">
              {CASE_LIBRARY.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === c.id}
                  className="osce-case"
                  onClick={() => setPicked(picked === c.id ? null : c.id)}
                >
                  <Library size={18} aria-hidden="true" />
                  <span className="stack grow">
                    <span className="t-subhead">{c.data.title}</span>
                    <span className="t-caption c-secondary">{systemLabel(c.system)}</span>
                  </span>
                  <span className="tag" data-tone={c.difficulty === 'dificil' ? 'red' : c.difficulty === 'medio' ? 'orange' : 'green'}>
                    {DIFFICULTY_LABEL[c.difficulty]}
                  </span>
                </button>
              ))}
              {!picked && (
                <p className="row gap-2 t-caption c-secondary">
                  <Dices size={14} aria-hidden="true" /> Sem escolher, o caso é sorteado.
                </p>
              )}
            </div>
          ) : (
            <div className="stack gap-3">
              <div className="stack gap-1">
                <span className="field-label">Sistema</span>
                <div className="chip-group">
                  <Chip small selected={!system} onClick={() => setSystem(undefined)}>
                    Livre
                  </Chip>
                  {SYSTEMS.map((s) => (
                    <Chip key={s.id} small selected={system === s.id} onClick={() => setSystem(s.id)}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="stack gap-1">
                <span className="field-label">Dificuldade</span>
                <SegmentedControl<Difficulty>
                  ariaLabel="Dificuldade"
                  value={difficulty}
                  onChange={setDifficulty}
                  options={[
                    { value: 'facil', label: 'Fácil' },
                    { value: 'medio', label: 'Médio' },
                    { value: 'dificil', label: 'Difícil' },
                  ]}
                />
              </div>
            </div>
          )}

          <div className="stack gap-1">
            <span className="field-label">Tempo da estação</span>
            <SegmentedControl
              ariaLabel="Tempo da estação"
              value={minutes}
              onChange={setMinutes}
              options={[
                { value: '0', label: 'Livre' },
                { value: '8', label: '8 min' },
                { value: '10', label: '10 min' },
                { value: '15', label: '15 min' },
              ]}
            />
          </div>
          <div className="row gap-3">
            <Volume2 size={18} className="c-accent" aria-hidden="true" />
            <span className="grow t-subhead">Paciente fala em voz alta</span>
            <Toggle
              checked={voice}
              onChange={(c) => {
                setVoice(c);
                writeVoicePref(c);
              }}
              ariaLabel="Paciente fala em voz alta"
            />
          </div>

          <Button variant="primary" size="lg" icon={source === 'ia' ? Sparkles : GraduationCap} loading={ai.loading} disabled={!online || !prefs.aiEnabled} onClick={() => void start()}>
            {source === 'ia' ? 'Gerar caso e começar' : 'Começar estação'}
          </Button>
          {ai.loading && <p className="t-footnote c-secondary">Criando o caso… pode levar até 1 minuto.</p>}
          {(!online || !prefs.aiEnabled) && (
            <p className="row gap-2 t-footnote c-secondary">
              <WifiOff size={16} aria-hidden="true" /> {prefs.aiEnabled ? 'O paciente simulado precisa de internet.' : 'Ligue a IA em Ajustes para usar o Treino.'}
            </p>
          )}
          {ai.error && (
            <p className="t-footnote c-red" role="alert">
              {ai.error}
            </p>
          )}
        </div>
      </div>

      {!!sessions?.length && (
        <ListSection header="Estações anteriores" icons>
          {sessions.slice(0, 30).map((s) => {
            const avg = averageScore(s);
            return (
              <ListRow
                key={s.id}
                icon={GraduationCap}
                iconTone={s.status === 'finalizado' ? 'green' : 'orange'}
                title={s.caseMeta.title}
                subtitle={`${formatDate(s.createdAt)} · ${DIFFICULTY_LABEL[s.caseMeta.difficulty]} · ${s.status === 'finalizado' ? (avg !== undefined ? `nota ${avg.toFixed(1).replace('.', ',')}` : 'finalizada') : 'em andamento'}`}
                to={`/treino/sessao/${s.id}`}
              />
            );
          })}
        </ListSection>
      )}

      <Disclaimer>{CLINICAL_DISCLAIMER}</Disclaimer>
    </Page>
  );
}
