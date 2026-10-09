# Contas e sincronização (Firebase) — igual ao DPOC Clínico

Com conta, os pacientes aparecem no celular **e** no computador, e não somem se você trocar de aparelho. Sem conta, tudo continua funcionando como antes: só no aparelho.

---

## Como funciona

| | Sem conta | Com conta |
| --- | --- | --- |
| Login | nenhum | e-mail e senha (Firebase Authentication) |
| Onde ficam os pacientes | só neste aparelho | no aparelho **e** na sua conta (Firestore, São Paulo) |
| Offline | funciona | funciona (sincroniza quando a internet volta) |
| IA | precisa do código de acesso, se o servidor exigir | liberada pelo próprio login |

- **Mesma conta do DPOC Clínico.** O app usa o mesmo projeto Firebase (`dpoc-clinico`): entre com o mesmo e-mail e senha.
- **Os dados não se misturam.** Os do Anamnese ficam em `usuarios/{seu-uid}/anamnese_pacientes`, `anamnese_atendimentos`, `anamnese_evolucoes` e `anamnese_treinos`. Os do DPOC ficam em `usuarios/{seu-uid}/pacientes`.
- **Quem protege é a regra do Firestore** que você já publicou no DPOC (cada conta só lê e escreve a própria pasta). Ela cobre as pastas novas também. Cópia em [`firestore.rules`](../firestore.rules).
- **O app sempre grava primeiro no aparelho** (rápido e offline). Em segundo plano ele envia para a nuvem e recebe o que mudou nos outros aparelhos. Se o mesmo registro for alterado em dois aparelhos, vale a alteração mais recente.
- **Cada conta tem um banco separado no aparelho.** Quem divide o celular não vê os pacientes do outro.
- **Para a IA continua indo só o texto anonimizado** (sem iniciais e sem leito).

> **LGPD.** Com conta, os dados clínicos (anamnese, exames, evolução) ficam guardados no Firebase, em servidores do Google. Continue registrando só iniciais, nunca nome completo, CPF ou endereço. Evite também detalhes que identifiquem o paciente nos campos de texto livre.

---

## Passo a passo para ligar (uma vez só)

O projeto Firebase já existe (é o do DPOC). Falta só **autorizar o endereço do Anamnese**:

1. Entre em <https://console.firebase.google.com> e abra o projeto **dpoc-clinico**.
2. Menu **Criação → Authentication → aba Configurações → Domínios autorizados → Adicionar domínio**.
3. Adicione o endereço onde o Anamnese está publicado, **sem** `https://` e sem `/` no final. Por exemplo:
   - `anamnese.SEU-USUARIO.workers.dev` (Cloudflare)
   - `anamnese.vercel.app` (Vercel)
4. Pronto. `localhost` já vem autorizado, então no seu computador (`npm run dev`) funciona direto.

Se aparecer *“Este endereço não está na lista de domínios autorizados”*, é esse passo que faltou.

### IA só para quem está logado

No Cloudflare isso já vem ligado: o `wrangler.jsonc` tem `"FIREBASE_PROJECT_ID": "dpoc-clinico"`. Com isso a função `/api/ai` só responde a:

- quem está **logado** na conta (o app manda o token sozinho), ou
- quem informou o **código de acesso** (`ACCESS_CODE`), se você criou um. Serve para quem usa sem conta.

Na **Vercel**, adicione a variável `FIREBASE_PROJECT_ID` = `dpoc-clinico` em *Settings → Environment Variables* e faça um **Redeploy**.

Para liberar a IA sem login, apague a linha `FIREBASE_PROJECT_ID` do `wrangler.jsonc` e rode `npm run deploy` de novo.

---

## Usando

- **Primeiro acesso:** aparece a tela **Entrar / Criar conta**, com a opção **Usar sem conta neste aparelho**.
- **Já usou sem conta?** Em **Ajustes → Conta → Entrar ou criar conta**. Depois de entrar, a aba Pacientes mostra *“N paciente(s) só neste aparelho”*. Toque em **Enviar** para mandar para a conta (a cópia local não é apagada).
- **Ajustes → Conta** mostra se está **Sincronizado**, **Sincronizando…** ou **aguardando internet**. Toque para sincronizar agora.
- **Sair:** os pacientes continuam na conta e neste aparelho (abre mais rápido no próximo login).
- **Sair e apagar deste aparelho:** para aparelho emprestado ou do hospital.
- **Ajustes → Dados → Apagar meus dados da nuvem:** apaga os dados do Anamnese da conta. Os outros aparelhos apagam também na próxima sincronização. O login continua existindo (e o DPOC não é afetado).
- **Esqueci a senha:** na tela de login → *Esqueci minha senha* → chega um link no e-mail.

---

## Quer um projeto Firebase só do Anamnese?

Faça como no README do DPOC, em resumo:

1. <https://console.firebase.google.com> → **Criar projeto** (ex.: `anamnese`).
2. **Authentication → Vamos começar → E-mail/senha → Ativar.**
3. **Firestore Database → Criar banco de dados**, região `southamerica-east1`, **modo de produção**.
4. **Firestore → Regras:** cole o conteúdo de [`firestore.rules`](../firestore.rules) → **Publicar**.
5. **Visão geral do projeto → `</>` (Web)** → registre um app e copie os valores do `firebaseConfig`.
6. No `.env.local` (e na Vercel, se usar), preencha `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` e `VITE_FIREBASE_APP_ID`.
7. Troque `FIREBASE_PROJECT_ID` no `wrangler.jsonc` pelo ID do projeto novo.
8. `npm run deploy` e autorize o domínio (passo 2 do guia acima).

Para **desligar as contas** de vez (só modo local, sem tela de login): `VITE_FIREBASE_DISABLED=1` no `.env.local`.

---

## Para quem mexe no código

- `src/cloud/firebaseDriver.ts`: login e Firestore. O SDK é baixado só quando alguém usa a conta.
- `src/cloud/sync.ts`: motor de sincronização (testado em `tests/sync.test.ts` com dois “aparelhos” falsos).
- `src/cloud/CloudProvider.tsx`: sessão, troca de banco por conta, tela de login.
- `server/firebaseAuth.ts`: verificação do token na função de IA (chaves públicas do Google, sem segredo).
- Trocar Firebase por Supabase ou outro serviço: escreva outro driver com a interface de `src/cloud/types.ts`. Nenhuma tela muda (mesma ideia do objeto `DB` do DPOC).
