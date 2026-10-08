import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, UploadCloud, UserRound, UserX } from 'lucide-react';
import { useCloud } from '../../cloud/CloudProvider';
import { ListRow, ListSection } from '../../components/ui/List';
import { useConfirm, useToast } from '../../components/ui/Overlays';
import { relativeTime } from '../../lib/format';

/* Seção "Conta" de Ajustes: quem está logado, estado da sincronização e saída. */

export function AccountSection() {
  const cloud = useCloud();
  const confirm = useConfirm();
  const toast = useToast();
  if (!cloud.enabled) return null;

  if (cloud.session?.mode !== 'cloud') {
    return (
      <ListSection header="Conta" icons footer="Sem conta, os pacientes ficam só neste aparelho. Com conta, aparecem no celular e no computador.">
        <ListRow icon={LogIn} title="Entrar ou criar conta" subtitle="Sincroniza seus pacientes entre aparelhos" accent onClick={cloud.openAuth} chevron />
      </ListSection>
    );
  }

  const s = cloud.status;
  const syncRow = (() => {
    if (!s || s.state === 'iniciando') return { icon: RefreshCw, tone: undefined, title: 'Conectando…', sub: undefined };
    if (s.state === 'sincronizando') return { icon: RefreshCw, tone: undefined, title: 'Sincronizando…', sub: s.pending ? `${s.pending} alteração(ões)` : undefined };
    if (s.state === 'sincronizado') return { icon: Cloud, tone: 'green' as const, title: 'Sincronizado', sub: s.lastSync ? `Última vez ${relativeTime(s.lastSync)}` : undefined };
    if (s.state === 'pendente') return { icon: CloudOff, tone: 'orange' as const, title: `${s.pending} alteração(ões) aguardando internet`, sub: 'Ficam salvas no aparelho e sobem sozinhas quando a conexão voltar' };
    return { icon: CloudOff, tone: 'red' as const, title: 'Erro ao sincronizar', sub: s.error };
  })();

  async function syncNow() {
    try {
      await cloud.syncNow();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function migrate() {
    const n = await cloud.migrateLocal();
    toast(`${n} paciente(s) enviados para a sua conta`, 'success');
  }

  async function signOut(wipeLocal: boolean) {
    const ok = await confirm(
      wipeLocal
        ? {
            title: 'Sair e apagar deste aparelho?',
            message: 'Os pacientes continuam na sua conta (nuvem). Este aparelho fica sem nenhuma cópia — bom para aparelho emprestado ou compartilhado.',
            confirmLabel: 'Sair e apagar',
            destructive: true,
          }
        : { title: 'Sair da conta?', message: 'Os pacientes continuam na sua conta. Para vê-los de novo, entre com o mesmo e-mail.', confirmLabel: 'Sair' },
    );
    if (!ok) return;
    if (s && s.pending > 0 && !navigator.onLine) {
      const sure = await confirm({
        title: 'Há alterações não enviadas',
        message: `${s.pending} alteração(ões) ainda não subiram (sem internet). ${wipeLocal ? 'Se apagar agora, elas se perdem.' : 'Elas ficam guardadas neste aparelho e sobem no próximo login.'}`,
        confirmLabel: 'Sair mesmo assim',
        destructive: wipeLocal,
      });
      if (!sure) return;
    }
    await cloud.signOut({ wipeLocal });
  }

  const name = cloud.session.name || cloud.session.email;
  return (
    <ListSection header="Conta" icons footer="Pacientes salvos na sua conta (Firebase) e sincronizados entre aparelhos. O que vai para a IA continua anonimizado.">
      <ListRow icon={UserRound} title={name} subtitle={cloud.session.email !== name ? cloud.session.email : undefined} />
      <ListRow icon={syncRow.icon} iconTone={syncRow.tone} title={syncRow.title} subtitle={syncRow.sub} onClick={() => void syncNow()} ariaLabel={`${syncRow.title}. Toque para sincronizar agora.`} />
      {cloud.localOnly > 0 && (
        <ListRow
          icon={UploadCloud}
          title={`Enviar ${cloud.localOnly} paciente(s) deste aparelho`}
          subtitle="Salvos aqui antes de você entrar na conta (a cópia local não é apagada)"
          accent
          onClick={() => void migrate()}
        />
      )}
      <ListRow icon={LogOut} title="Sair" onClick={() => void signOut(false)} />
      <ListRow icon={UserX} iconTone="red" title="Sair e apagar deste aparelho" destructive onClick={() => void signOut(true)} />
    </ListSection>
  );
}
