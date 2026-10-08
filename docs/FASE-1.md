# Fase 1 — como rodar no seu Mac e publicar

Guia passo a passo, do zero até o app instalado no celular.

---

## O que ficou pronto nesta fase

- **Design system “Liquid Glass”**: vidro só nos controles (tab bar flutuante, barra de cima, botões principais, sheets, alertas). O conteúdo clínico fica em superfícies sólidas. Modo escuro automático, “Reduzir transparência”/“Reduzir movimento” respeitados e contraste WCAG AA conferido por script (`npm run check:contrast`).
- **Atendimento completo (parte 2)**: Configuração → Identificação (LGPD) → QP → Direcionamento por sistemas (com IA) → HDA ramificada (mapa corporal, escala de dor, linha do tempo) → ISDA → Antecedentes (alergias sempre em destaque, medicações, vacinas) → seções do perfil (gestante, pediatria, idoso) → Família → Hábitos → Exame físico → Hipóteses (IA) → Texto do prontuário (copiar e PDF).
- **Red flags em tempo real** (banner vermelho com conduta inicial), **alertas de alergia/interação** (nomes comerciais brasileiros, Beers, gestação), **15 escores** calculados no próprio app (HEART, Wells, CURB-65, qSOFA etc.) mostrando o que falta preencher.
- **IA (parte 5)** num servidor seu, no mesmo esquema do invictus.med: provedor compatível com a API da OpenAI (Groq `openai/gpt-oss-120b`, com reserva `qwen/qwen3-32b`). Respostas em JSON validado, só com os dados informados, citando as referências curadas (ABNT).
- **Offline**: tudo funciona sem internet, menos a IA. Os dados ficam só no aparelho (IndexedDB), com exportar backup e apagar tudo em Ajustes.

---

## 1. Instalar as ferramentas (uma vez só)

1. **Node.js**: entre em <https://nodejs.org>, baixe o instalador **LTS** para macOS (arquivo `.pkg`) e instale normalmente. O projeto precisa do Node 20.19+ ou 22.12+.
2. Abra o **Terminal** (⌘ + espaço → digite “Terminal”).
3. Confira se instalou:

   ```bash
   node -v
   ```

   Tem que aparecer algo como `v22.x` ou `v24.x`.
4. **Git**: digite `git --version`. Se o Mac pedir para instalar as “Ferramentas de Linha de Comando do Xcode”, clique em **Instalar** e espere terminar.

## 2. Baixar o projeto

```bash
cd ~/Documents
git clone https://github.com/eckermann33/anamnese.git
cd anamnese
npm install
```

> Enquanto o pull request não for aceito, o código novo fica no branch `claude/plataforma-anamnese-pwa`. Para usar ele antes do merge: `git checkout claude/plataforma-anamnese-pwa` e depois `npm install` de novo.

## 3. Colocar a chave da IA (só no seu computador)

1. Pegue uma chave da Groq em <https://console.groq.com/keys> → **Create API Key**. Pode ser a **mesma do invictus.med**.
2. No Terminal, dentro da pasta do projeto:

   ```bash
   cp .env.example .env.local
   open -e .env.local
   ```

3. No arquivo que abriu, preencha a linha `LLM_KEY=` com a sua chave (sem espaços nem aspas) e salve (⌘ + S).

O arquivo `.env.local` **não vai para o GitHub** (está no `.gitignore`). A chave fica só no servidor local; o navegador nunca vê ela.

## 4. Rodar no seu computador

```bash
npm run dev
```

Abra <http://localhost:5173> no Safari ou no Chrome. Para parar, volte ao Terminal e aperte `Ctrl + C`.

Em **Ajustes › Inteligência artificial › Testar conexão** tem que aparecer “Conectado · modelo openai/gpt-oss-120b”.

**Ver no iPhone (mesmo Wi-Fi):**

```bash
npm run dev -- --host
ipconfig getifaddr en0
```

O segundo comando mostra o IP do Mac (ex.: `192.168.0.12`). No iPhone, abra `http://192.168.0.12:5173`. Dá para testar as telas, mas **instalar como app e o microfone só funcionam com HTTPS**, ou seja, depois de publicar (passo 6).

## 5. Conferir antes de publicar

```bash
npm test                 # testes automáticos (motor clínico e servidor da IA)
npm run typecheck        # checagem de tipos do TypeScript
npm run check:contrast   # contraste das cores (WCAG AA)
npm run build            # gera a versão final na pasta dist/
npm run preview          # roda a versão final em http://localhost:4173
```

## 6. Publicar na Cloudflare (recomendado, plano gratuito)

O site e a função da IA vão juntos num único Worker.

1. Crie uma conta grátis em <https://dash.cloudflare.com/sign-up>.
2. No Terminal, dentro da pasta do projeto, faça login (abre o navegador para você autorizar):

   ```bash
   npx wrangler@4 login
   ```

3. Publique:

   ```bash
   npm run deploy
   ```

   No final aparece o endereço, algo como `https://anamnese.SEU-USUARIO.workers.dev`. Guarde ele.
4. Coloque a chave da IA **no servidor** (o comando pede para você colar o valor):

   ```bash
   npx wrangler@4 secret put LLM_KEY
   ```

5. Recomendado: proteja a sua cota.

   ```bash
   npx wrangler@4 secret put ACCESS_CODE        # invente uma senha
   npx wrangler@4 secret put ALLOWED_ORIGINS    # cole o endereço do passo 3
   ```

   Opcional: `LLM_KEY_2` (chave reserva), `LLM_MODEL`, `GATEWAY_URL` (veja as explicações no `.env.example`).
6. Teste: abra `https://anamnese.SEU-USUARIO.workers.dev/api/ai`. Tem que aparecer `"configured":true`.
7. No app publicado, vá em **Ajustes › Inteligência artificial**, digite o **Código de acesso** (o mesmo do `ACCESS_CODE`) e toque em **Testar conexão** (tem que aparecer “Conectado”).

**Para atualizar depois** de mudar o código: `npm run deploy` de novo. Os segredos continuam lá.

## 6b. Alternativa: publicar na Vercel

1. Entre em <https://vercel.com/new> com a sua conta do GitHub e importe o repositório `eckermann33/anamnese`.
2. A Vercel detecta o Vite sozinha. Antes de clicar em **Deploy**, abra **Environment Variables** e adicione `LLM_KEY` (e, se quiser, `ACCESS_CODE`, `ALLOWED_ORIGINS`, `LLM_KEY_2`).
3. Clique em **Deploy**. Cada `git push` no branch principal publica de novo sozinho.
4. Teste em `https://SEU-PROJETO.vercel.app/api/ai`.

Se mudar alguma variável depois, faça um **Redeploy** no painel para ela valer.

## 7. Instalar como app

- **iPhone/iPad (Safari)**: abra o endereço publicado → botão **Compartilhar** → **Adicionar à Tela de Início**.
- **Mac (Safari)**: menu **Arquivo › Adicionar ao Dock**. **Chrome**: ícone de instalar na barra de endereço.

Depois de aberto uma vez, o app funciona offline. Quando sair versão nova aparece “Nova versão disponível”: toque em **Atualizar** quando não estiver no meio de um atendimento (os dados ficam salvos de qualquer jeito).

## 8. Deu erro?

| Mensagem / sintoma | O que fazer |
| --- | --- |
| “A IA não está configurada no servidor (falta LLM_KEY)” | Faltou o passo 4 da Cloudflare (ou a variável na Vercel). Local: confira o `.env.local` e reinicie o `npm run dev`. |
| “Código de acesso da IA inválido” | O código em Ajustes tem que ser igual ao `ACCESS_CODE` do servidor. |
| “Origem não autorizada” | O `ALLOWED_ORIGINS` tem que ter o endereço exato do site, com `https://` e sem `/` no final. |
| “Cota da IA esgotada” | Limite do plano grátis da Groq. Espere um pouco ou configure `LLM_KEY_2` com outra chave/provedor. |
| `npm: command not found` | O Node não foi instalado. Volte ao passo 1 e feche/abra o Terminal. |
| Mudou o código e o celular mostra a versão antiga | Feche e abra o app, ou toque em **Atualizar** no aviso de nova versão. |

## Privacidade (LGPD)

- O app só pede **iniciais**, idade, sexo, ocupação, procedência, estado civil e leito (opcional). Nunca nome completo, CPF ou endereço.
- Tudo fica **só no aparelho**. Faça backup em **Ajustes › Dados › Exportar backup**.
- Para a IA vai apenas o texto clínico, **sem iniciais e sem leito**. Mesmo assim, não escreva dados que identifiquem o paciente nos campos de texto livre.
