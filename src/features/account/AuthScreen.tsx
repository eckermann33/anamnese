import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Cloud, Smartphone } from 'lucide-react';
import { useCloud } from '../../cloud/CloudProvider';
import { SHARED_WITH_DPOC } from '../../cloud/config';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { TextField } from '../../components/ui/TextField';
import { APP_NAME, CLINICAL_DISCLAIMER } from '../../config/app';
import { useOnline } from '../../lib/settings';

/* ==========================================================================
   TELA DE LOGIN
   Entrar / Criar conta / Redefinir senha — ou usar sem conta (os pacientes
   ficam só neste aparelho). Com conta, os pacientes sincronizam entre
   celular e computador.
   ========================================================================== */

type Mode = 'entrar' | 'criar' | 'senha';

export function AuthScreen({ onCancel }: { onCancel?: () => void }) {
  const cloud = useCloud();
  const online = useOnline();
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${APP_NAME} — entrar`;
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'entrar') await cloud.signIn(email, password);
      else if (mode === 'criar') await cloud.signUp(email, password, name);
      else {
        await cloud.resetPassword(email);
        setInfo('Se houver uma conta com esse e-mail, chegou um link para criar uma senha nova. Confira também o spam.');
        setMode('entrar');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'criar' ? 'Criar conta' : mode === 'senha' ? 'Redefinir senha' : 'Entrar';

  return (
    <main className="auth-screen">
      <div className="auth-inner">
        {onCancel && (
          <button type="button" className="nav-back glass auth-back" onClick={onCancel} aria-label="Voltar ao app">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        )}
        <header className="auth-head">
          <img src="/favicon.svg" alt="" width={72} height={72} className="auth-logo" />
          <h1 className="t-large-title">{APP_NAME}</h1>
          <p className="t-subhead c-secondary">Anamnese, exame físico e evolução — no celular, à beira do leito.</p>
        </header>

        {mode !== 'senha' && (
          <SegmentedControl<Mode>
            ariaLabel="Entrar ou criar conta"
            value={mode}
            onChange={(m) => (setMode(m), setError(null), setInfo(null))}
            options={[
              { value: 'entrar', label: 'Entrar' },
              { value: 'criar', label: 'Criar conta' },
            ]}
          />
        )}

        <form className="card stack gap-3 auth-card" onSubmit={(e) => void submit(e)} noValidate>
          <h2 className="t-headline">{title}</h2>
          {mode === 'criar' && <TextField label="Nome" value={name} onChange={setName} autoComplete="name" placeholder="Como quer ser chamado" />}
          <TextField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} required />
          {mode !== 'senha' && (
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
              placeholder={mode === 'criar' ? 'Mínimo de 6 caracteres' : undefined}
              required
            />
          )}
          {error && (
            <p className="t-footnote c-red" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="t-footnote c-green" role="status">
              {info}
            </p>
          )}
          {!online && <p className="t-footnote c-secondary">Sem internet: para entrar pela primeira vez neste aparelho é preciso conexão.</p>}
          <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!email.trim() || (mode !== 'senha' && !password) || !online}>
            {mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar conta' : 'Enviar link'}
          </Button>
          {mode === 'entrar' && (
            <Button type="button" variant="plain" onClick={() => (setMode('senha'), setError(null))}>
              Esqueci minha senha
            </Button>
          )}
          {mode === 'senha' && (
            <Button type="button" variant="plain" onClick={() => setMode('entrar')}>
              Voltar
            </Button>
          )}
          {SHARED_WITH_DPOC && mode !== 'senha' && <p className="t-footnote c-secondary">Já usa o DPOC Clínico? É a mesma conta: entre com o mesmo e-mail e senha.</p>}
        </form>

        <ul className="auth-benefits">
          <li>
            <Cloud size={18} aria-hidden="true" />
            <span>
              <strong>Com conta:</strong> seus pacientes aparecem no celular e no computador, e não somem se você trocar de aparelho.
            </span>
          </li>
          <li>
            <Smartphone size={18} aria-hidden="true" />
            <span>
              <strong>Sem conta:</strong> tudo fica só neste aparelho (dá para exportar backup em Ajustes).
            </span>
          </li>
        </ul>

        {!onCancel && (
          <Button variant="gray" block onClick={cloud.continueWithoutAccount}>
            Usar sem conta neste aparelho
          </Button>
        )}

        <p className="t-caption c-secondary auth-legal">
          Registre só iniciais — nada de nome completo, CPF ou endereço (LGPD). {CLINICAL_DISCLAIMER}
        </p>
      </div>
    </main>
  );
}
