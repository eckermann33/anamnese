import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, FileDown, RotateCcw, ShieldAlert, Wand2 } from 'lucide-react';
import { useEncounter } from '../EncounterContext';
import { Button } from '../../../components/ui/Button';
import { TextArea } from '../../../components/ui/TextField';
import { Disclaimer } from '../../../components/ui/Page';
import { useConfirm, useToast } from '../../../components/ui/Overlays';
import { generateNote } from '../../../clinical/narrative';
import { copyText, exportTextPdf } from '../../../lib/share';
import { useAi } from '../../../lib/ai';
import { useOnline, usePrefs } from '../../../lib/settings';
import { APP_NAME, CLINICAL_DISCLAIMER } from '../../../config/app';
import { formatDate } from '../../../lib/format';

/** Etapa 13 — Texto do prontuário: gerado automaticamente, editável, copiar/PDF. */
export function ProntuarioStep() {
  const { enc, patient, update, flush } = useEncounter();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { prefs } = usePrefs();
  const online = useOnline();
  const polish = useAi('polish_note');

  const generated = useMemo(() => generateNote(enc, patient), [enc, patient]);
  const edited = !!enc.note?.edited;
  const text = edited ? enc.note!.text : generated;

  async function copy() {
    const ok = await copyText(text);
    toast(ok ? 'Texto copiado' : 'Não foi possível copiar', ok ? 'success' : 'error');
  }

  async function pdf() {
    try {
      await exportTextPdf({
        title: `Anamnese — ${patient.initials || 'paciente'}`,
        subtitle: `${formatDate(enc.createdAt)} · gerado no ${APP_NAME}`,
        text,
        footer: `${CLINICAL_DISCLAIMER} Documento gerado a partir de dados registrados pelo profissional; revise antes de usar.`,
        filename: `anamnese-${(patient.initials || 'paciente').replace(/\W+/g, '')}-${new Date(enc.createdAt).toISOString().slice(0, 10)}.pdf`,
      });
    } catch {
      toast('Não foi possível gerar o PDF', 'error');
    }
  }

  async function regenerate() {
    if (edited && !(await confirm({ title: 'Regenerar o texto?', message: 'Suas edições manuais serão substituídas pelo texto gerado a partir dos dados.', confirmLabel: 'Regenerar', destructive: true })))
      return;
    update((d) => void delete d.note);
  }

  async function review() {
    const before = text;
    const r = await polish.run({ text }, enc.config.mode);
    if (!r) return;
    update((d) => void (d.note = { text: r.text, generatedAt: Date.now(), edited: true }));
    toast('Texto revisado pela IA', 'success', {
      label: 'Desfazer',
      onClick: () => update((d) => void (d.note = { text: before, generatedAt: Date.now(), edited: edited })),
    });
  }

  async function finish() {
    update((d) => void (d.status = 'concluido'));
    await flush();
    toast('Atendimento concluído', 'success');
    navigate(`/pacientes/${patient.id}`);
  }

  return (
    <div className="stack gap-4">
      <section className="qsection">
        <h2 className="qsection-title">Conduta</h2>
        <div className="qsection-card">
          <TextArea
            value={enc.conduct}
            onChange={(v) => update((d) => void (d.conduct = v))}
            placeholder="Exames, medicações (conferir doses), orientações, reavaliação…"
            rows={3}
            aria-label="Conduta"
          />
        </div>
      </section>

      <section className="qsection">
        <div className="row between page-pad" style={{ paddingBottom: 8 }}>
          <h2 className="qsection-title" style={{ padding: 0 }}>
            Texto do prontuário
          </h2>
          {edited && <span className="tag" data-tone="orange">Editado</span>}
        </div>
        <div className="page-pad">
          <textarea
            className="textarea note-editor"
            value={text}
            aria-label="Texto do prontuário (editável)"
            onChange={(e) => {
              const text = e.target.value; // lido já: o updater roda depois
              update((d) => void (d.note = { text, generatedAt: Date.now(), edited: true }));
            }}
            spellCheck
          />
        </div>
        <p className="section-sub mt-2">O texto é gerado só com o que foi perguntado/examinado. Edite à vontade antes de copiar.</p>
      </section>

      <div className="page-pad note-actions">
        <Button variant="primary" size="lg" icon={Copy} onClick={copy}>
          Copiar
        </Button>
        <Button variant="tinted" size="lg" icon={FileDown} onClick={pdf}>
          Exportar PDF
        </Button>
        {prefs.aiEnabled && (
          <Button variant="gray" icon={Wand2} loading={polish.loading} disabled={!online} onClick={review} aria-label="Revisar redação com IA">
            Revisar (IA)
          </Button>
        )}
        <Button variant="gray" icon={RotateCcw} onClick={regenerate} aria-label="Regenerar o texto a partir dos dados">
          Regenerar
        </Button>
        {polish.error && (
          <p className="t-footnote c-red" role="alert">
            {polish.error}
          </p>
        )}
      </div>

      <div className="page-pad">
        <Button variant="tinted" block icon={CheckCircle2} onClick={finish}>
          {enc.status === 'concluido' ? 'Ir para o paciente' : 'Concluir atendimento'}
        </Button>
      </div>

      <Disclaimer icon={ShieldAlert}>{CLINICAL_DISCLAIMER}</Disclaimer>
    </div>
  );
}
