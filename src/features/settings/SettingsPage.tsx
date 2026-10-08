import { useRef, useState } from 'react';
import {
  BookMarked,
  Download,
  Eye,
  Info,
  KeyRound,
  Link2,
  Moon,
  PlugZap,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { Page } from '../../components/ui/Page';
import { ListRow, ListSection } from '../../components/ui/List';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Toggle } from '../../components/ui/Toggle';
import { Sheet } from '../../components/ui/Sheet';
import { useConfirm, useToast } from '../../components/ui/Overlays';
import { ReferenceList } from '../../components/clinical/References';
import { usePrefs } from '../../lib/settings';
import { checkAiServer } from '../../lib/ai';
import { exportBackup, importBackup, wipeAllData } from '../../db';
import { shareOrDownload } from '../../lib/share';
import { APP_NAME, CLINICAL_DISCLAIMER, DEFAULT_AI_ENDPOINT } from '../../config/app';
import { REFERENCES } from '../../../shared/references';
import type { Mode, Setting } from '../../clinical/types';

/** Aba "Ajustes". */
export function SettingsPage() {
  const { prefs, setPrefs } = usePrefs();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [refsOpen, setRefsOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  async function testAi() {
    setTesting(true);
    const s = await checkAiServer();
    setTesting(false);
    if (!s.online) setAiStatus('Servidor de IA indisponível.');
    else if (!s.configured) setAiStatus('Servidor no ar, mas sem chave configurada (LLM_KEY).');
    else setAiStatus(`Conectado · modelo ${s.model ?? '—'}${s.accessCodeRequired ? ' · exige código de acesso' : ''}`);
  }

  async function doExport() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await shareOrDownload(blob, `backup-${APP_NAME.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`, `Backup ${APP_NAME}`);
  }

  async function doImport(file: File) {
    try {
      const json = JSON.parse(await file.text());
      const replace = await confirm({
        title: 'Como importar?',
        message: 'Mesclar mantém os dados atuais (o backup sobrescreve registros iguais). Substituir apaga os dados atuais antes.',
        confirmLabel: 'Substituir',
        cancelLabel: 'Mesclar',
        destructive: true,
      });
      const r = await importBackup(json, replace ? 'replace' : 'merge');
      toast(`Backup importado: ${r.patients} paciente(s)`, 'success');
    } catch (e) {
      toast((e as Error).message || 'Arquivo inválido', 'error');
    }
  }

  async function wipe() {
    const ok = await confirm({
      title: 'Apagar TODOS os dados?',
      message: 'Pacientes, atendimentos, evoluções, treinos e preferências serão apagados deste aparelho. Não há como desfazer. Exporte um backup antes, se precisar.',
      confirmLabel: 'Apagar tudo',
      destructive: true,
    });
    if (!ok) return;
    await wipeAllData();
    window.location.replace('/');
  }

  return (
    <Page title="Ajustes">
      <ListSection header="Atendimento" footer="Padrões para novos atendimentos (dá para mudar em cada um).">
        <div className="list-row">
          <span className="list-row-title" style={{ flex: 'none' }}>
            Modo
          </span>
          <div className="grow">
            <SegmentedControl<Mode>
              ariaLabel="Modo padrão"
              value={prefs.defaultMode}
              onChange={(m) => setPrefs({ defaultMode: m })}
              options={[
                { value: 'estudante', label: 'Estudante' },
                { value: 'plantao', label: 'Plantão' },
              ]}
            />
          </div>
        </div>
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <span className="list-row-title">Cenário</span>
          <SegmentedControl<Setting>
            ariaLabel="Cenário padrão"
            value={prefs.defaultSetting}
            onChange={(s) => setPrefs({ defaultSetting: s })}
            options={[
              { value: 'ps', label: 'PS' },
              { value: 'ambulatorio', label: 'Ambul.' },
              { value: 'enfermaria', label: 'Enferm.' },
              { value: 'uti', label: 'UTI' },
            ]}
          />
        </div>
      </ListSection>

      <ListSection header="Aparência" icons>
        <div className="list-row">
          <span className="list-row-icon" aria-hidden="true">
            <Moon size={18} />
          </span>
          <span className="list-row-title" style={{ flex: 'none' }}>
            Tema
          </span>
          <div className="grow">
            <SegmentedControl
              ariaLabel="Tema"
              value={prefs.theme}
              onChange={(t) => setPrefs({ theme: t })}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Escuro' },
              ]}
            />
          </div>
        </div>
        <ListRow
          icon={Eye}
          title="Reduzir transparência"
          trailing={<Toggle checked={prefs.reduceTransparency} onChange={(c) => setPrefs({ reduceTransparency: c })} ariaLabel="Reduzir transparência" />}
        />
        <ListRow
          icon={Wand2}
          title="Reduzir movimento"
          trailing={<Toggle checked={prefs.reduceMotion} onChange={(c) => setPrefs({ reduceMotion: c })} ariaLabel="Reduzir movimento" />}
        />
      </ListSection>

      <ListSection
        header="Inteligência artificial"
        icons
        footer="A IA roda num servidor seu (Cloudflare Workers ou Vercel). A chave fica lá, nunca no app. O que é enviado é anonimizado: sem iniciais e sem leito."
      >
        <ListRow
          icon={Sparkles}
          title="Usar IA"
          trailing={<Toggle checked={prefs.aiEnabled} onChange={(c) => setPrefs({ aiEnabled: c })} ariaLabel="Usar IA" />}
        />
        <div className="list-row">
          <span className="list-row-icon" aria-hidden="true">
            <Link2 size={18} />
          </span>
          <label htmlFor="ai-endpoint" className="list-row-title" style={{ flex: 'none' }}>
            Endereço
          </label>
          <input
            id="ai-endpoint"
            className="list-row-field"
            value={prefs.aiEndpoint}
            placeholder={DEFAULT_AI_ENDPOINT}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setPrefs({ aiEndpoint: e.target.value.trim() || DEFAULT_AI_ENDPOINT })}
          />
        </div>
        <div className="list-row">
          <span className="list-row-icon" aria-hidden="true">
            <KeyRound size={18} />
          </span>
          <label htmlFor="ai-code" className="list-row-title" style={{ flex: 'none' }}>
            Código de acesso
          </label>
          <input
            id="ai-code"
            type="password"
            className="list-row-field"
            value={prefs.aiAccessCode}
            placeholder="se o servidor exigir"
            autoComplete="off"
            onChange={(e) => setPrefs({ aiAccessCode: e.target.value })}
          />
        </div>
        <ListRow icon={PlugZap} title={testing ? 'Testando…' : 'Testar conexão'} subtitle={aiStatus ?? undefined} accent onClick={testAi} />
      </ListSection>

      <ListSection header="Dados" icons footer="Tudo fica salvo apenas neste aparelho (IndexedDB). Faça backup regularmente.">
        <ListRow icon={Download} title="Exportar backup" subtitle="Arquivo .json com todos os dados" onClick={doExport} chevron />
        <ListRow icon={Upload} title="Importar backup" onClick={() => fileRef.current?.click()} chevron />
        <ListRow icon={Trash2} iconTone="red" title="Apagar tudo" destructive onClick={wipe} />
      </ListSection>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
          e.target.value = '';
        }}
      />

      <ListSection header="Sobre" icons>
        <ListRow icon={Smartphone} title="Instalar no celular" onClick={() => setInstallOpen(true)} chevron />
        <ListRow icon={BookMarked} title="Referências (ABNT)" subtitle={`${REFERENCES.length} diretrizes e artigos`} onClick={() => setRefsOpen(true)} chevron />
        <ListRow icon={ShieldCheck} title="Privacidade (LGPD)" subtitle="Só iniciais; nada de nome completo, CPF ou endereço" />
        <ListRow icon={Info} title={APP_NAME} subtitle={CLINICAL_DISCLAIMER} />
      </ListSection>

      <Sheet open={refsOpen} onClose={() => setRefsOpen(false)} title="Referências" subtitle="Formato ABNT NBR 6023 — conferidas no PubMed">
        <ReferenceList ids={REFERENCES.map((r) => r.id)} />
      </Sheet>

      <Sheet open={installOpen} onClose={() => setInstallOpen(false)} title="Instalar no celular">
        <div className="stack gap-3">
          <div className="card">
            <strong>iPhone (Safari)</strong>
            <ol className="conduct-list mt-2">
              <li>Abra o site no Safari.</li>
              <li>Toque em Compartilhar (quadrado com seta para cima).</li>
              <li>Escolha “Adicionar à Tela de Início”.</li>
            </ol>
          </div>
          <div className="card">
            <strong>Android (Chrome)</strong>
            <ol className="conduct-list mt-2">
              <li>Abra o site no Chrome.</li>
              <li>Toque no menu ⋮ → “Instalar app”.</li>
            </ol>
          </div>
          <p className="t-footnote c-secondary">Depois de instalado, o app abre em tela cheia e funciona sem internet (exceto a IA).</p>
        </div>
      </Sheet>
    </Page>
  );
}
