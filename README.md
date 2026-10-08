# Anamnese

PWA (site instalável, funciona offline) de apoio à **anamnese, exame físico, raciocínio diagnóstico e evolução clínica**, feito para estudantes de medicina e médicos no Brasil, para uso no celular à beira do leito.

> Ferramenta de apoio ao raciocínio clínico e ao ensino. Não substitui o julgamento médico.

## Status

| Fase | Conteúdo | Situação |
| --- | --- | --- |
| 1 | Design system “Liquid Glass”, atendimento completo (anamnese ramificada, exame físico, hipóteses com IA, texto do prontuário), red flags, alertas de medicação, escores, IA no servidor | ✅ pronta — [como rodar e publicar](docs/FASE-1.md) |
| 2 | Evolução diária (SOAP), sinais vitais, balanço hídrico, dispositivos, antibióticos, exames, problemas, passagem de plantão | 🚧 |
| 3 | Treino OSCE com paciente simulado, ditado por voz, mais templates, busca rápida | ⏳ |

A IA segue o **mesmo esquema do invictus.med**: provedores compatíveis com a API da OpenAI (Groq `openai/gpt-oss-120b` + reserva `qwen/qwen3-32b`), cascata automática e resposta em JSON validada. A chave fica só no servidor (Cloudflare Workers ou Vercel), nunca no navegador.

## Começo rápido

```bash
npm install
cp .env.example .env.local   # preencha LLM_KEY (pode ser a chave Groq do invictus.med)
npm run dev                  # http://localhost:5173
```

Passo a passo completo (instalar o Node no Mac, publicar na Cloudflare/Vercel, instalar no iPhone): **[docs/FASE-1.md](docs/FASE-1.md)**.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento (com `/api/ai` local) |
| `npm test` | testes automáticos |
| `npm run typecheck` | checagem do TypeScript |
| `npm run check:contrast` | confere o contraste das cores (WCAG AA) |
| `npm run build` / `npm run preview` | gera e roda a versão final |
| `npm run deploy` | publica na Cloudflare Workers |

## Estrutura

```
src/clinical/   conhecimento clínico (templates, sintomas, exame, red flags, escores, medicações, texto do prontuário)
src/components/ design system (ui/) e componentes clínicos (clinical/)
src/db/         banco local (IndexedDB) — dados só no aparelho
server/         função de IA (regras e prompts) — roda no servidor
shared/         contratos da IA e referências (usados pelo app e pelo servidor)
api/ai.ts       adaptador Vercel     ·     worker/index.ts   adaptador Cloudflare Workers
tests/          testes automatizados
docs/           guias de cada fase (rodar localmente e publicar)
```
