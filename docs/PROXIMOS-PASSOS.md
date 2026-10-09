# O que falta você fazer

O código está pronto e já está na `main`. Falta só o que depende das **suas** contas: chave da IA, hospedagem e Firebase. O roteiro abaixo usa só o navegador, sem terminal, e leva uns 15 minutos.

---

## O que já foi conferido

- **Login real no Firebase** (projeto `dpoc-clinico`), testado com uma conta descartável que foi apagada no fim:
  - a conta foi criada pelo app;
  - o paciente sincronizou;
  - um segundo aparelho entrou e baixou o paciente;
  - ler a pasta de **outro** usuário foi **bloqueado** (403) pelas regras.
- **IA protegida pelo login:** o servidor da IA aceitou o token real do Firebase e recusou pedidos sem token ou com token adulterado (401).
- **CI no GitHub:** a cada push rodam os tipos, os 69 testes, o contraste e o build (aba **Actions**).

**Não deu para testar daqui:** a IA da Groq de verdade, porque precisa da sua chave.

---

## 1. Pegar a chave da IA (Groq, grátis)

Se você já usa a Groq no invictus.med, pode usar a mesma chave. Se quiser separar a cota, crie uma nova.

1. Abra <https://console.groq.com/keys> e entre.
2. Toque em **Create API Key**, dê o nome `anamnese` e copie a chave (começa com `gsk_`).
3. Guarde a chave num lugar seguro, porque ela só aparece uma vez.

## 2. Publicar na Vercel

1. Abra <https://vercel.com/new> e entre com o GitHub.
2. Em **Import Git Repository**, escolha **eckermann33/anamnese** e toque em **Import**. Se ele não aparecer, toque em *Adjust GitHub App Permissions* e libere o repositório.
3. Antes de clicar em **Deploy**, abra **Environment Variables** e adicione:

   | Name | Value |
   |---|---|
   | `LLM_KEY` | a chave `gsk_...` do passo 1 |
   | `FIREBASE_PROJECT_ID` | `dpoc-clinico` |

4. Toque em **Deploy** e espere uns 2 minutos.
5. Copie o endereço que a Vercel mostrar (algo como `anamnese-xxxx.vercel.app`).

Daqui em diante, todo push na `main` publica sozinho.

> Prefere a Cloudflare? O passo a passo está em [FASE-1.md, seção 6](FASE-1.md). Ela usa o terminal: `npx wrangler@4 login`, depois `secret put LLM_KEY` e por fim `npm run deploy`.

## 3. Autorizar o endereço no Firebase

Sem isso, o login não funciona no site publicado.

1. Abra <https://console.firebase.google.com> e entre no projeto **dpoc-clinico**.
2. Vá em **Authentication → Configurações → Domínios autorizados → Adicionar domínio**.
3. Cole **só o domínio**, sem `https://` e sem `/`. Exemplo: `anamnese-xxxx.vercel.app`.

## 4. Testar no celular

1. Abra o endereço no Safari do iPhone.
2. Entre com o **mesmo e-mail e senha do DPOC Clínico**.
3. Vá em **Ajustes › Inteligência artificial** e toque em **Testar conexão**. Tem que aparecer “Conectado”.
4. Para instalar como app, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.

## 5. Opcional (recomendado)

- **Fechar a IA para o seu site:** na Vercel, vá em **Settings → Environment Variables**, adicione `ALLOWED_ORIGINS` = `https://anamnese-xxxx.vercel.app` (sem `/` no final) e faça **Redeploy**.
- **Chave reserva:** se a cota grátis da Groq acabar, adicione `LLM_KEY_2` com outra chave.

---

Deu algum erro? Veja a tabela em [FASE-1.md, seção 8](FASE-1.md) e em [CONTAS.md](CONTAS.md).
